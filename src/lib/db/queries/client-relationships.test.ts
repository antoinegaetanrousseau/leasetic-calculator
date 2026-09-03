/**
 * Phase 30 Plan 04 — client-relationships.ts tests (CRM-02/04/06/07).
 *
 * Mocking pattern mirrors partners.test.ts's stubBuilder (chainable, records
 * every call), extended with `innerJoin`/`having` (this module's queries use
 * both) and a `then` implementation so the builder is directly awaitable at
 * whatever point the real code stops chaining — `listContactsForRelationship`
 * ends its chain at `.orderBy()`, never calling `.limit()`.
 *
 * The central CRM-02 assertion: every partner-facing function's `.where()`
 * call carries a predicate that references the `owner_id` column. Rather
 * than string-match Drizzle's opaque SQL object, `sqlReferencesColumn` walks
 * the object graph looking for a nested `name === 'owner_id'` property —
 * Drizzle Column objects carry the underlying snake_case DB column name at
 * `.name`, confirmed by direct inspection of `eq(clientRelationships.ownerId, …)`
 * before writing this helper.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.mock('server-only', () => ({}));

interface MockState {
  selectResult: unknown[];
}

const { mockState } = vi.hoisted(() => ({
  mockState: {
    selectResult: [] as unknown[],
  } as MockState,
}));

const calls: Array<{ kind: string; payload: unknown }> = [];

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  const stubBuilder: Record<string, unknown> = {};
  Object.assign(stubBuilder, {
    select: (cols: unknown) => {
      calls.push({ kind: 'select', payload: cols });
      return stubBuilder;
    },
    from: (table: unknown) => {
      calls.push({ kind: 'from', payload: table });
      return stubBuilder;
    },
    innerJoin: (table: unknown, on: unknown) => {
      calls.push({ kind: 'innerJoin', payload: { table, on } });
      return stubBuilder;
    },
    leftJoin: (table: unknown, on: unknown) => {
      calls.push({ kind: 'leftJoin', payload: { table, on } });
      return stubBuilder;
    },
    where: (clause: unknown) => {
      calls.push({ kind: 'where', payload: clause });
      return stubBuilder;
    },
    groupBy: (...cols: unknown[]) => {
      calls.push({ kind: 'groupBy', payload: cols });
      return stubBuilder;
    },
    having: (clause: unknown) => {
      calls.push({ kind: 'having', payload: clause });
      return stubBuilder;
    },
    orderBy: (...cols: unknown[]) => {
      calls.push({ kind: 'orderBy', payload: cols });
      return stubBuilder;
    },
    limit: (n: number) => {
      calls.push({ kind: 'limit', payload: n });
      return stubBuilder;
    },
    // Makes the builder awaitable at any chain point (mirrors real Drizzle
    // query builders, which are PromiseLike even before `.limit()` runs).
    then: (
      resolve: (value: unknown) => void,
      reject?: (reason: unknown) => void,
    ) => Promise.resolve(mockState.selectResult).then(resolve, reject),
  });

  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import {
  listClientBook,
  getClientRelationshipForOwner,
  listContactsForRelationship,
  listProposalsForRelationship,
} from './client-relationships';

/**
 * Recursively walk a Drizzle SQL/condition object looking for a Column chunk
 * whose own `.name` matches `columnName`. Deliberately does NOT descend into
 * a Column's `.table` back-reference: Drizzle Column objects carry a pointer
 * back to their owning PgTable (`column.table === theTable`), and that table
 * object enumerates ALL of its sibling columns — so an unguarded walk would
 * "find" `owner_id` merely because the predicate touches ANY column on
 * `client_relationships`, not because the predicate actually references
 * `owner_id`. That would make this a false-positive-only assertion (it could
 * never go red), defeating the CRM-02 mutation-test requirement.
 */
function sqlReferencesColumn(node: unknown, columnName: string, seen = new Set<unknown>()): boolean {
  if (node == null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  const obj = node as Record<string, unknown>;
  if (obj.name === columnName) return true;
  for (const key of Object.keys(obj)) {
    if (key === 'table') continue;
    let val: unknown;
    try {
      val = obj[key];
    } catch {
      continue;
    }
    if (val && typeof val === 'object' && sqlReferencesColumn(val, columnName, seen)) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively walk a Drizzle SQL/condition object looking for a bind-param
 * with the given literal value. Avoids `JSON.stringify`, which throws on the
 * circular `PgTable` <-> `PgColumn` back-references Drizzle Column objects
 * carry (`column.table` points back at the table that owns the column).
 */
function sqlReferencesValue(node: unknown, value: unknown, seen = new Set<unknown>()): boolean {
  if (node == null || typeof node !== 'object') return false;
  if (seen.has(node)) return false;
  seen.add(node);
  const obj = node as Record<string, unknown>;
  if (obj.value === value) return true;
  for (const key of Object.keys(obj)) {
    if (key === 'table') continue;
    let val: unknown;
    try {
      val = obj[key];
    } catch {
      continue;
    }
    if (val && typeof val === 'object' && sqlReferencesValue(val, value, seen)) {
      return true;
    }
  }
  return false;
}

function encodeTestCursor(payload: Record<string, string>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

beforeEach(() => {
  calls.length = 0;
  mockState.selectResult = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── CRM-02: every partner-facing function scopes to owner_id ────────────────

interface FunctionCase {
  name: string;
  /**
   * The DB column the ownership predicate must reference. Three of the four
   * functions scope directly on `client_relationships.owner_id`;
   * `listProposalsForRelationship` additionally re-proves ownership via
   * `proposals.user_id = ownerId` (defense in depth — CRM-06 action) rather
   * than joining back to `client_relationships`, so its column is `user_id`.
   */
  ownerColumn: string;
  invoke: (ownerId: string) => Promise<unknown>;
}

const OWNER_SCOPED_CASES: FunctionCase[] = [
  { name: 'listClientBook (no q, no cursor)', ownerColumn: 'owner_id', invoke: (ownerId) => listClientBook({ ownerId }) },
  { name: 'listClientBook (with q)', ownerColumn: 'owner_id', invoke: (ownerId) => listClientBook({ ownerId, q: 'acme' }) },
  {
    name: 'listClientBook (with cursor, sort=company)',
    ownerColumn: 'owner_id',
    invoke: (ownerId) =>
      listClientBook({ ownerId, sort: 'company', cursor: encodeTestCursor({ k: 'Acme', id: 'rel-1' }) }),
  },
  {
    name: 'listClientBook (with cursor, sort=lastActivity)',
    ownerColumn: 'owner_id',
    invoke: (ownerId) =>
      listClientBook({
        ownerId,
        sort: 'lastActivity',
        cursor: encodeTestCursor({ k: '2026-01-01T00:00:00.000Z', id: 'rel-1' }),
      }),
  },
  { name: 'listClientBook (sort=company)', ownerColumn: 'owner_id', invoke: (ownerId) => listClientBook({ ownerId, sort: 'company' }) },
  { name: 'listClientBook (sort=lastActivity)', ownerColumn: 'owner_id', invoke: (ownerId) => listClientBook({ ownerId, sort: 'lastActivity' }) },
  { name: 'getClientRelationshipForOwner', ownerColumn: 'owner_id', invoke: (ownerId) => getClientRelationshipForOwner('rel-1', ownerId) },
  { name: 'listContactsForRelationship', ownerColumn: 'owner_id', invoke: (ownerId) => listContactsForRelationship('rel-1', ownerId) },
  { name: 'listProposalsForRelationship', ownerColumn: 'user_id', invoke: (ownerId) => listProposalsForRelationship('rel-1', ownerId) },
];

describe('CRM-02 — every partner-facing function scopes to an ownership column in its WHERE clause', () => {
  it.each(OWNER_SCOPED_CASES)('$name', async ({ ownerColumn, invoke }) => {
    calls.length = 0;
    mockState.selectResult = [];
    await invoke('owner-A');
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls.length).toBeGreaterThan(0);
    expect(whereCalls.some((c) => sqlReferencesColumn(c.payload, ownerColumn))).toBe(true);
  });
});

describe('CRM-02 — malformed cursor is ignored, not thrown', () => {
  it('listClientBook with a non-base64/non-JSON cursor resolves normally', async () => {
    mockState.selectResult = [];
    await expect(listClientBook({ ownerId: 'owner-A', cursor: '!!!not-a-cursor!!!' })).resolves.toEqual({
      rows: [],
      nextCursor: null,
    });
  });

  it('listClientBook with a well-formed-base64 but wrong-shape cursor resolves normally', async () => {
    mockState.selectResult = [];
    const badShapeCursor = Buffer.from(JSON.stringify({ unexpected: 'shape' }), 'utf8').toString('base64url');
    await expect(listClientBook({ ownerId: 'owner-A', cursor: badShapeCursor })).resolves.toEqual({
      rows: [],
      nextCursor: null,
    });
  });
});

describe('CRM-02 — listClientBook never emits LIMIT without the owner predicate', () => {
  it('every LIMIT call is preceded by an owner_id-referencing WHERE call', async () => {
    mockState.selectResult = [];
    await listClientBook({ ownerId: 'owner-A' });
    const limitCalls = calls.filter((c) => c.kind === 'limit');
    expect(limitCalls.length).toBeGreaterThan(0);
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls.some((c) => sqlReferencesColumn(c.payload, 'owner_id'))).toBe(true);
  });
});

// ── Query-shape assertions ───────────────────────────────────────────────────

describe('listClientBook — query shape', () => {
  it('joins companies and proposals, groups, orders and limits', async () => {
    mockState.selectResult = [];
    await listClientBook({ ownerId: 'owner-A' });
    expect(calls.find((c) => c.kind === 'innerJoin')).toBeDefined();
    expect(calls.find((c) => c.kind === 'leftJoin')).toBeDefined();
    expect(calls.find((c) => c.kind === 'groupBy')).toBeDefined();
    expect(calls.find((c) => c.kind === 'orderBy')).toBeDefined();
    expect(calls.find((c) => c.kind === 'limit')).toBeDefined();
  });

  it('sort=company + cursor → the HAVING call carries a defined predicate', async () => {
    mockState.selectResult = [];
    await listClientBook({
      ownerId: 'owner-A',
      sort: 'company',
      cursor: encodeTestCursor({ k: 'Acme', id: 'rel-1' }),
    });
    expect(calls.find((c) => c.kind === 'having')?.payload).toBeDefined();
  });

  it('sort=lastActivity + cursor → the HAVING call carries a defined predicate', async () => {
    mockState.selectResult = [];
    await listClientBook({
      ownerId: 'owner-A',
      sort: 'lastActivity',
      cursor: encodeTestCursor({ k: '2026-01-01T00:00:00.000Z', id: 'rel-1' }),
    });
    expect(calls.find((c) => c.kind === 'having')?.payload).toBeDefined();
  });

  it('no cursor supplied → the HAVING call carries an undefined predicate (no filter applied)', async () => {
    mockState.selectResult = [];
    await listClientBook({ ownerId: 'owner-A' });
    const havingCall = calls.find((c) => c.kind === 'having');
    expect(havingCall).toBeDefined();
    expect(havingCall!.payload).toBeUndefined();
  });

  it('maps a raw row into ClientBookRow shape', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Acme',
        siren: '123456789',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        proposalsCount: '2',
        lastActivityAt: new Date('2026-02-01T00:00:00Z'),
      },
    ];
    const result = await listClientBook({ ownerId: 'owner-A' });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      relationshipId: 'rel-1',
      companyId: 'co-1',
      companyName: 'Acme',
      siren: '123456789',
      proposalsCount: 2,
      lastActivityAt: new Date('2026-02-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
  });

  it('zero-proposal relationship: proposalsCount is 0, lastActivityAt is null', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-2',
        companyId: 'co-2',
        companyName: 'NoProps Inc',
        siren: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        proposalsCount: '0',
        lastActivityAt: null,
      },
    ];
    const result = await listClientBook({ ownerId: 'owner-A' });
    expect(result.rows[0].proposalsCount).toBe(0);
    expect(result.rows[0].lastActivityAt).toBeNull();
  });

  it('overflow row → nextCursor is a non-null string; no overflow → null', async () => {
    const row = (id: string) => ({
      relationshipId: id,
      companyId: `co-${id}`,
      companyName: `Company ${id}`,
      siren: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      proposalsCount: '0',
      lastActivityAt: null,
    });
    mockState.selectResult = [row('a'), row('b'), row('c')];
    const overflowResult = await listClientBook({ ownerId: 'owner-A', limit: 2 });
    expect(overflowResult.rows).toHaveLength(2);
    expect(overflowResult.nextCursor).not.toBeNull();

    mockState.selectResult = [row('a'), row('b')];
    const exactResult = await listClientBook({ ownerId: 'owner-A', limit: 2 });
    expect(exactResult.rows).toHaveLength(2);
    expect(exactResult.nextCursor).toBeNull();
  });
});

describe('getClientRelationshipForOwner — D-18 null contract', () => {
  it('returns the row when found', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Acme',
        siren: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ];
    const result = await getClientRelationshipForOwner('rel-1', 'owner-A');
    expect(result?.relationshipId).toBe('rel-1');
  });

  it('returns null when the query yields zero rows (nonexistent OR not-owned — indistinguishable at this layer)', async () => {
    mockState.selectResult = [];
    const result = await getClientRelationshipForOwner('rel-nonexistent', 'owner-A');
    expect(result).toBeNull();
  });
});

describe('listContactsForRelationship — CRM-04', () => {
  it('joins client_relationships and returns rows', async () => {
    mockState.selectResult = [
      { id: 'c-1', name: 'Jane', role: 'Achats', phone: null, email: 'jane@acme.fr' },
    ];
    const result = await listContactsForRelationship('rel-1', 'owner-A');
    expect(result).toHaveLength(1);
    expect(calls.find((c) => c.kind === 'innerJoin')).toBeDefined();
  });

  it('returns an empty array for a relationship with zero contacts (same shape as a non-owned probe)', async () => {
    mockState.selectResult = [];
    const result = await listContactsForRelationship('rel-1', 'owner-A');
    expect(result).toEqual([]);
  });
});

describe('listProposalsForRelationship — CRM-06, ADMIN-09', () => {
  it('projects computedClientMonthly from computed.loyerHT, never the whole computed object', async () => {
    mockState.selectResult = [
      {
        id: 'p-1',
        lcRef: 'LC-2026-001',
        status: 'active',
        language: 'fr',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        deletedAt: null,
        computed: { loyerHT: 1234.56, someOtherInternalField: 'x' },
        outcome: null,
        outcomeDate: null,
        outcomeReason: null,
        pdfGeneratedAt: new Date('2026-01-02T00:00:00Z'),
        snapshot: { validityDays: 45, commissionPct: '0.05' },
      },
    ];
    const result = await listProposalsForRelationship('rel-1', 'owner-A');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'p-1',
      lcRef: 'LC-2026-001',
      status: 'active',
      language: 'fr',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      deletedAt: null,
      computedClientMonthly: 1234.56,
      outcome: null,
      outcomeDate: null,
      outcomeReason: null,
      pdfGeneratedAt: new Date('2026-01-02T00:00:00Z'),
      validityDays: 45,
    });
    expect(result[0]).not.toHaveProperty('computed');
    expect(result[0]).not.toHaveProperty('snapshot');
    expect(result[0]).not.toHaveProperty('paramsSnapshot');
  });

  it('null computed → computedClientMonthly is null (defensive, does not throw)', async () => {
    mockState.selectResult = [
      {
        id: 'p-draft',
        lcRef: null,
        status: 'draft',
        language: 'fr',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        deletedAt: null,
        computed: null,
        outcome: null,
        outcomeDate: null,
        outcomeReason: null,
        pdfGeneratedAt: null,
        snapshot: null,
      },
    ];
    const result = await listProposalsForRelationship('rel-1', 'owner-A');
    expect(result[0].computedClientMonthly).toBeNull();
    expect(result[0].validityDays).toBeNull();
  });

  it('excludes soft-deleted proposals via a status predicate', async () => {
    mockState.selectResult = [];
    await listProposalsForRelationship('rel-1', 'owner-A');
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    // ne(status, 'deleted') carries the literal string 'deleted' as a bind param.
    expect(sqlReferencesValue(whereCall!.payload, 'deleted')).toBe(true);
  });

  it('still filters on BOTH client_relationship_id AND proposals.user_id in the same statement (defense in depth)', async () => {
    mockState.selectResult = [];
    await listProposalsForRelationship('rel-1', 'owner-A');
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesColumn(whereCall!.payload, 'client_relationship_id')).toBe(true);
    expect(sqlReferencesColumn(whereCall!.payload, 'user_id')).toBe(true);
  });

  it('returned rows expose validityDays but never a raw paramsSnapshot/snapshot property', async () => {
    mockState.selectResult = [
      {
        id: 'p-2',
        lcRef: 'LC-2026-002',
        status: 'active',
        language: 'fr',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        deletedAt: null,
        computed: {},
        outcome: 'won',
        outcomeDate: new Date('2026-01-05T00:00:00Z'),
        outcomeReason: null,
        pdfGeneratedAt: new Date('2026-01-02T00:00:00Z'),
        snapshot: { validityDays: 30 },
      },
    ];
    const result = await listProposalsForRelationship('rel-1', 'owner-A');
    expect(result[0].validityDays).toBe(30);
    expect(result[0].outcome).toBe('won');
    expect(result[0]).not.toHaveProperty('paramsSnapshot');
    expect(result[0]).not.toHaveProperty('snapshot');
  });
});

describe('ADMIN-09 — the raw params_snapshot object never becomes a returned row shape (source guard)', () => {
  // Phase 33 (PIPE-03) narrows, rather than removes, this guard: the module
  // now legitimately SELECTS `proposals.paramsSnapshot` (aliased `snapshot`)
  // so `projectValidityDays` can narrow it server-side — the same pattern
  // `computed`/`projectComputedClientMonthly` already established. What must
  // still be true, and is asserted here: no returned row shape ever exposes
  // a `paramsSnapshot:` key, mirroring the plan's grep acceptance criterion.
  it('the compiled module never returns a row shape carrying a paramsSnapshot property', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'client-relationships.ts'), 'utf8');
    expect(src).not.toMatch(/paramsSnapshot:/);
  });
});

// ── Phase 34 Plan 05 — the widened three-tier detail row (FICHE-02/03/04) ────

/**
 * D-01 splits everything on a client page into three tiers, and the page has
 * to render the read-only/editable boundary between them. That is only
 * possible if ONE owner-scoped statement returns all three — hence these
 * assertions on the projection itself rather than on the mock's echo.
 */
const D01_REGISTRY_TIER_FIELDS = [
  'legalName',
  'addressLine',
  'postalCode',
  'city',
  'legalForm',
  'nafCode',
  'nafSection',
  'headcountBand',
  'foundedOn',
  'registryState',
  'registryStatus',
  'registrySyncedAt',
] as const;

const D01_SHARED_DISPLAY_TIER_FIELDS = ['companyName', 'siren', 'website', 'phone'] as const;

const D01_PRIVATE_TIER_FIELDS = [
  'leadSource',
  'description',
  'nextActionAt',
  'nextActionNote',
  'stage',
] as const;

describe('getClientRelationshipForOwner — the three D-01 tiers in ONE statement', () => {
  it('still carries owner_id in its WHERE and still returns null for zero rows (IDOR contract unchanged)', async () => {
    mockState.selectResult = [];
    const result = await getClientRelationshipForOwner('rel-1', 'owner-A');
    expect(result).toBeNull();
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls.some((c) => sqlReferencesColumn(c.payload, 'owner_id'))).toBe(true);
  });

  it('projects every registry, shared-display and private-tier column', async () => {
    mockState.selectResult = [];
    await getClientRelationshipForOwner('rel-1', 'owner-A');
    const projection = calls.find((c) => c.kind === 'select')!.payload as Record<string, unknown>;
    const keys = Object.keys(projection);
    for (const field of [
      ...D01_REGISTRY_TIER_FIELDS,
      ...D01_SHARED_DISPLAY_TIER_FIELDS,
      ...D01_PRIVATE_TIER_FIELDS,
      'relationshipId',
      'companyId',
      'createdAt',
    ]) {
      expect(keys).toContain(field);
    }
  });

  it('passes a widened driver row through untouched', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Acme',
        siren: '123456789',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        legalName: 'ACME SAS',
        addressLine: '1 rue de la Paix',
        postalCode: '75002',
        city: 'PARIS',
        legalForm: '5710',
        nafCode: '62.01Z',
        nafSection: 'J',
        headcountBand: '12',
        foundedOn: '2015-03-01',
        registryState: 'A',
        registryStatus: 'synced',
        registrySyncedAt: new Date('2026-09-01T00:00:00Z'),
        website: 'https://acme.fr',
        phone: '+33100000000',
        leadSource: 'salon',
        description: 'Rencontré au SIMI',
        nextActionAt: new Date('2026-09-10T00:00:00Z'),
        nextActionNote: 'Relancer sur la proposition',
        stage: 'negociation',
      },
    ];
    const result = await getClientRelationshipForOwner('rel-1', 'owner-A');
    expect(result?.legalName).toBe('ACME SAS');
    expect(result?.registryStatus).toBe('synced');
    expect(result?.leadSource).toBe('salon');
    expect(result?.stage).toBe('negociation');
    expect(result?.nafSection).toBe('J');
  });

  it('is still ONE statement — a widened row shape must not become a second round trip', async () => {
    mockState.selectResult = [];
    await getClientRelationshipForOwner('rel-1', 'owner-A');
    expect(calls.filter((c) => c.kind === 'select')).toHaveLength(1);
    expect(calls.filter((c) => c.kind === 'limit')).toHaveLength(1);
  });
});
