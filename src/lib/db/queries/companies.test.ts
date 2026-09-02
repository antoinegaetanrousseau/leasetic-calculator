/**
 * Phase 30 Plan 04 — companies.ts tests (CRM-03, ADMIN-09).
 *
 * Mocking pattern mirrors client-relationships.test.ts's stubBuilder.
 *
 * Unlike client-relationships.test.ts, the central assertion here is
 * negative: no function in this module ever filters on an owner column — the
 * whole point of the admin registry is to see every relationship on a
 * company regardless of who holds it (CRM-03).
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
    orderBy: (...cols: unknown[]) => {
      calls.push({ kind: 'orderBy', payload: cols });
      return stubBuilder;
    },
    limit: (n: number) => {
      calls.push({ kind: 'limit', payload: n });
      return stubBuilder;
    },
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
  listCompaniesForAdmin,
  getCompanyForAdmin,
  listRelationshipsForCompany,
  getRelationshipForAdmin,
  listContactsForRelationshipAdmin,
  listProposalsForRelationshipAdmin,
} from './companies';

/**
 * See the identical helper in client-relationships.test.ts for why the
 * `table` back-reference is deliberately excluded from the walk (it would
 * otherwise "find" every sibling column on the same table, defeating this
 * negative assertion).
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

beforeEach(() => {
  calls.length = 0;
  mockState.selectResult = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CRM-03 — no function in this module filters on an owner column', () => {
  it.each([
    ['listCompaniesForAdmin', () => listCompaniesForAdmin({})],
    ['listCompaniesForAdmin (with q)', () => listCompaniesForAdmin({ q: 'acme' })],
    ['getCompanyForAdmin', () => getCompanyForAdmin('co-1')],
    ['listRelationshipsForCompany', () => listRelationshipsForCompany('co-1')],
    ['getRelationshipForAdmin', () => getRelationshipForAdmin('rel-1')],
    ['listContactsForRelationshipAdmin', () => listContactsForRelationshipAdmin('rel-1')],
    ['listProposalsForRelationshipAdmin', () => listProposalsForRelationshipAdmin('rel-1')],
  ] as const)('%s', async (_name, invoke) => {
    calls.length = 0;
    mockState.selectResult = [];
    await invoke();
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls.every((c) => !sqlReferencesColumn(c.payload, 'owner_id'))).toBe(true);
  });

  it('source guard: no `args.ownerId` or `eq(schema.clientRelationships.ownerId` appears in companies.ts', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'companies.ts'), 'utf8');
    expect(src).not.toMatch(/args\.ownerId/);
    expect(src).not.toMatch(/eq\(schema\.clientRelationships\.ownerId/);
  });
});

describe('listCompaniesForAdmin — query shape', () => {
  it('left-joins client_relationships + proposals, groups, orders, limits', async () => {
    mockState.selectResult = [];
    await listCompaniesForAdmin({});
    const leftJoins = calls.filter((c) => c.kind === 'leftJoin');
    expect(leftJoins.length).toBeGreaterThanOrEqual(2);
    expect(calls.find((c) => c.kind === 'groupBy')).toBeDefined();
    expect(calls.find((c) => c.kind === 'orderBy')).toBeDefined();
    expect(calls.find((c) => c.kind === 'limit')).toBeDefined();
  });

  it('maps a raw row into AdminCompanyRow shape, including a real zero count', async () => {
    mockState.selectResult = [
      {
        companyId: 'co-1',
        name: 'Acme',
        siren: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        relationsCount: '0',
        lastActivityAt: null,
      },
    ];
    const result = await listCompaniesForAdmin({});
    expect(result.rows[0]).toEqual({
      companyId: 'co-1',
      name: 'Acme',
      siren: null,
      relationsCount: 0,
      lastActivityAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
  });

  it('overflow row → nextCursor non-null; exact page → nextCursor null', async () => {
    const row = (id: string) => ({
      companyId: id,
      name: `Company ${id}`,
      siren: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      relationsCount: '1',
      lastActivityAt: null,
    });
    mockState.selectResult = [row('a'), row('b'), row('c')];
    const overflow = await listCompaniesForAdmin({ limit: 2 });
    expect(overflow.rows).toHaveLength(2);
    expect(overflow.nextCursor).not.toBeNull();

    mockState.selectResult = [row('a'), row('b')];
    const exact = await listCompaniesForAdmin({ limit: 2 });
    expect(exact.nextCursor).toBeNull();
  });

  it('search predicate matches on company name and siren', async () => {
    mockState.selectResult = [];
    await listCompaniesForAdmin({ q: 'acme' });
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
  });
});

describe('getCompanyForAdmin', () => {
  it('returns null for an unknown id', async () => {
    mockState.selectResult = [];
    const result = await getCompanyForAdmin('nonexistent');
    expect(result).toBeNull();
  });

  it('returns the row when found', async () => {
    mockState.selectResult = [{ companyId: 'co-1', name: 'Acme', siren: '123456789' }];
    const result = await getCompanyForAdmin('co-1');
    expect(result).toEqual({ companyId: 'co-1', name: 'Acme', siren: '123456789' });
  });
});

describe('listRelationshipsForCompany — CRM-03', () => {
  it('derives ownerDisplayName from displayName ?? name ?? email fallback chain', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-1',
        ownerId: 'u-1',
        displayName: null,
        name: 'Jane Partner',
        email: 'jane@partner.fr',
        role: 'partner',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        proposalsCount: '3',
        contactsCount: '2',
      },
      {
        relationshipId: 'rel-2',
        ownerId: 'u-2',
        displayName: '  ',
        name: '  ',
        email: 'noname@sales.fr',
        role: 'sales',
        createdAt: new Date('2026-01-02T00:00:00Z'),
        proposalsCount: '0',
        contactsCount: '0',
      },
    ];
    const result = await listRelationshipsForCompany('co-1');
    expect(result).toHaveLength(2);
    const partnerRow = result.find((r) => r.relationshipId === 'rel-1')!;
    expect(partnerRow.ownerDisplayName).toBe('Jane Partner');
    expect(partnerRow.isInternal).toBe(false);
    expect(partnerRow.proposalsCount).toBe(3);

    const salesRow = result.find((r) => r.relationshipId === 'rel-2')!;
    expect(salesRow.ownerDisplayName).toBe('noname@sales.fr');
    expect(salesRow.isInternal).toBe(true);
    expect(salesRow.proposalsCount).toBe(0);
    expect(salesRow.contactsCount).toBe(0);
  });

  it('returns BOTH relationships on a shared company (admin breadth — CRM-03)', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-a',
        ownerId: 'partner-a',
        displayName: 'Partner A',
        name: null,
        email: 'a@x.fr',
        role: 'partner',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        proposalsCount: '1',
        contactsCount: '1',
      },
      {
        relationshipId: 'rel-b',
        ownerId: 'partner-b',
        displayName: 'Partner B',
        name: null,
        email: 'b@x.fr',
        role: 'partner',
        createdAt: new Date('2026-01-02T00:00:00Z'),
        proposalsCount: '0',
        contactsCount: '0',
      },
    ];
    const result = await listRelationshipsForCompany('co-shared');
    expect(result.map((r) => r.ownerId).sort()).toEqual(['partner-a', 'partner-b']);
  });
});

describe('getRelationshipForAdmin', () => {
  it('returns null for an unknown id, no owner filter applied', async () => {
    mockState.selectResult = [];
    const result = await getRelationshipForAdmin('nonexistent');
    expect(result).toBeNull();
  });

  it('returns the relationship with company + owner identity', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Acme',
        siren: null,
        ownerId: 'u-1',
        displayName: 'Jane',
        name: 'Jane Partner',
        email: 'jane@x.fr',
        role: 'partner',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ];
    const result = await getRelationshipForAdmin('rel-1');
    expect(result?.companyName).toBe('Acme');
    expect(result?.ownerDisplayName).toBe('Jane');
    expect(result?.isInternal).toBe(false);
  });
});

describe('listContactsForRelationshipAdmin', () => {
  it('returns contact rows with no owner filter', async () => {
    mockState.selectResult = [
      { id: 'c-1', name: 'Jane', role: 'Achats', phone: null, email: 'jane@acme.fr' },
    ];
    const result = await listContactsForRelationshipAdmin('rel-1');
    expect(result).toHaveLength(1);
  });
});

describe('listProposalsForRelationshipAdmin — ADMIN-09', () => {
  it('projects computedClientMonthly, never the whole computed object', async () => {
    mockState.selectResult = [
      {
        id: 'p-1',
        lcRef: 'LC-2026-001',
        status: 'active',
        language: 'fr',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        deletedAt: null,
        computed: { loyerHT: 999.99 },
      },
    ];
    const result = await listProposalsForRelationshipAdmin('rel-1');
    expect(result[0].computedClientMonthly).toBe(999.99);
    expect(result[0]).not.toHaveProperty('computed');
  });
});

describe('ADMIN-09 — no commission/params_snapshot/global_params in this module (source guard)', () => {
  it('the compiled module never selects proposals.params_snapshot or global_params', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'companies.ts'), 'utf8');
    expect(src).not.toMatch(/schema\.proposals\.paramsSnapshot/);
    expect(src).not.toMatch(/schema\.globalParams/);
  });
});
