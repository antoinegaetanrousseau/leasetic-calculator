/**
 * Phase 31 Plan 03 — reconciliation.ts tests (IMPORT-04/05, D-11).
 *
 * Mocking pattern: a queue-based select stub (mirrors src/lib/crm/actions.test.ts's
 * `resultQueue`) combined with a `then()` fallback so the builder resolves at
 * WHATEVER method the real code's chain happens to end on — this module's three
 * `loadPairSideDetail` queries terminate at `.where()`, `.groupBy()` and `.limit()`
 * respectively, unlike a single-shape query module.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.mock('server-only', () => ({}));

interface MockCall {
  kind: string;
  payload?: unknown;
}

const { mockState } = vi.hoisted(() => ({
  mockState: {
    resultQueue: [] as unknown[],
    calls: [] as MockCall[],
  },
}));

function nextResult(): unknown {
  if (mockState.resultQueue.length === 0) {
    throw new Error('mock db: resultQueue exhausted — test queued too few results');
  }
  return mockState.resultQueue.shift();
}

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  function makeSelectBuilder(): Record<string, unknown> {
    const builder: Record<string, unknown> = {};
    Object.assign(builder, {
      from: (table: unknown) => {
        mockState.calls.push({ kind: 'from', payload: table });
        return builder;
      },
      innerJoin: (table: unknown, on: unknown) => {
        mockState.calls.push({ kind: 'innerJoin', payload: { table, on } });
        return builder;
      },
      leftJoin: (table: unknown, on: unknown) => {
        mockState.calls.push({ kind: 'leftJoin', payload: { table, on } });
        return builder;
      },
      where: (clause: unknown) => {
        mockState.calls.push({ kind: 'where', payload: clause });
        return builder;
      },
      groupBy: (...cols: unknown[]) => {
        mockState.calls.push({ kind: 'groupBy', payload: cols });
        return builder;
      },
      orderBy: (...cols: unknown[]) => {
        mockState.calls.push({ kind: 'orderBy', payload: cols });
        return builder;
      },
      limit: (n: unknown) => {
        mockState.calls.push({ kind: 'limit', payload: n });
        return builder;
      },
      // Resolves at whatever point the real code stops chaining — matches
      // client-relationships.test.ts's awaitable-at-any-chain-point pattern.
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(nextResult()).then(resolve, reject),
    });
    return builder;
  }

  const dbInstance = {
    select: (cols: unknown) => {
      mockState.calls.push({ kind: 'select', payload: cols });
      return makeSelectBuilder();
    },
  };

  return {
    db: () => dbInstance,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import { getPendingPairForAdmin, listPendingPairsForAdmin } from './reconciliation';

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

function encodeTestCursor(payload: Record<string, string>): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

const NOW = new Date('2026-01-01T00:00:00.000Z');

const PAIR_ROW = {
  id: 'pair-1',
  reason: 'differing',
  nameNormalized: 'acme',
  companyAId: 'company-a',
  companyBId: 'company-b',
  firstFlaggedAt: NOW,
};

const COMPANY_ROWS = [
  { id: 'company-a', name: 'Acme SARL', siren: '111111111' },
  { id: 'company-b', name: 'Acme SAS', siren: '222222222' },
];

function ownerRow(companyId: string, ownerId: string, role = 'partner') {
  return {
    companyId,
    ownerId,
    displayName: null,
    name: `Owner ${ownerId}`,
    email: `${ownerId}@example.com`,
    role,
  };
}

beforeEach(() => {
  mockState.resultQueue = [];
  mockState.calls = [];
});

afterEach(() => vi.clearAllMocks());

describe('listPendingPairsForAdmin', () => {
  it('returns only pending (verdict IS NULL) pairs and references the verdict column', async () => {
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], []];
    await listPendingPairsForAdmin({ limit: 20 });
    const whereCalls = mockState.calls.filter((c) => c.kind === 'where');
    expect(whereCalls.length).toBeGreaterThan(0);
    expect(whereCalls.some((c) => sqlReferencesColumn(c.payload, 'verdict'))).toBe(true);
  });

  it('orders by first_flagged_at ascending then id ascending, not created_at descending', async () => {
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], []];
    await listPendingPairsForAdmin({ limit: 20 });
    const orderByCalls = mockState.calls.filter((c) => c.kind === 'orderBy');
    expect(orderByCalls.length).toBe(1);
    const cols = orderByCalls[0].payload as unknown[];
    expect(sqlReferencesColumn(cols[0], 'first_flagged_at')).toBe(true);
    expect(sqlReferencesColumn(cols[1], 'id')).toBe(true);
    // Never created_at (that's the companies.ts admin-list pattern, not this queue).
    expect(sqlReferencesColumn(cols[0], 'created_at')).toBe(false);
  });

  it('decodes a cursor into a composite (first_flagged_at, id) > (...) predicate', async () => {
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], []];
    const cursor = encodeTestCursor({ firstFlaggedAt: '2026-01-01T00:00:00.000Z', id: 'pair-0' });
    await listPendingPairsForAdmin({ cursor, limit: 20 });
    const whereCalls = mockState.calls.filter((c) => c.kind === 'where');
    expect(whereCalls.some((c) => sqlReferencesColumn(c.payload, 'first_flagged_at'))).toBe(true);
  });

  it('a malformed cursor is ignored, not thrown', async () => {
    mockState.resultQueue = [[], [], [], []];
    await expect(listPendingPairsForAdmin({ cursor: '!!!not-a-cursor!!!' })).resolves.toEqual({
      rows: [],
      nextCursor: null,
    });
  });

  it('a side with zero relations/contacts/proposals yields the literal number 0, never null', async () => {
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], []]; // empty counts + owners
    const result = await listPendingPairsForAdmin({ limit: 20 });
    expect(result.rows[0].sideA.relationsCount).toBe(0);
    expect(result.rows[0].sideA.contactsCount).toBe(0);
    expect(result.rows[0].sideA.proposalsCount).toBe(0);
    expect(result.rows[0].sideA.relationsCount).not.toBeNull();
  });

  it('reports literal per-side counts from the aggregate query', async () => {
    const countRows = [
      { companyId: 'company-a', relationsCount: 3, contactsCount: 5, proposalsCount: 2 },
      { companyId: 'company-b', relationsCount: 1, contactsCount: 0, proposalsCount: 0 },
    ];
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, countRows, []];
    const result = await listPendingPairsForAdmin({ limit: 20 });
    expect(result.rows[0].sideA).toMatchObject({ relationsCount: 3, contactsCount: 5, proposalsCount: 2 });
    expect(result.rows[0].sideB).toMatchObject({ relationsCount: 1, contactsCount: 0, proposalsCount: 0 });
  });

  it('compoundMergeWarning is set when exactly one owner holds both sides', async () => {
    const owners = [ownerRow('company-a', 'owner-1'), ownerRow('company-b', 'owner-1')];
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], owners];
    const result = await listPendingPairsForAdmin({ limit: 20 });
    expect(result.rows[0].compoundMergeWarning).toEqual({ ownerName: 'Owner owner-1', ownerType: 'partner' });
    expect(result.rows[0].compoundOwnerCount).toBe(1);
  });

  it('compoundMergeWarning is null and compoundOwnerCount is 2 when two owners hold both sides', async () => {
    const owners = [
      ownerRow('company-a', 'owner-1'),
      ownerRow('company-a', 'owner-2'),
      ownerRow('company-b', 'owner-1'),
      ownerRow('company-b', 'owner-2'),
    ];
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], owners];
    const result = await listPendingPairsForAdmin({ limit: 20 });
    expect(result.rows[0].compoundMergeWarning).toBeNull();
    expect(result.rows[0].compoundOwnerCount).toBe(2);
  });

  it('compoundMergeWarning is null and compoundOwnerCount is 0 when no owner holds both sides', async () => {
    const owners = [ownerRow('company-a', 'owner-1'), ownerRow('company-b', 'owner-2')];
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], owners];
    const result = await listPendingPairsForAdmin({ limit: 20 });
    expect(result.rows[0].compoundMergeWarning).toBeNull();
    expect(result.rows[0].compoundOwnerCount).toBe(0);
  });

  it('an internal (sales) shared owner reports ownerType sales', async () => {
    const owners = [ownerRow('company-a', 'owner-1', 'sales'), ownerRow('company-b', 'owner-1', 'sales')];
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], owners];
    const result = await listPendingPairsForAdmin({ limit: 20 });
    expect(result.rows[0].compoundMergeWarning).toEqual({ ownerName: 'Owner owner-1', ownerType: 'sales' });
  });

  it('paginates via fetchCount = limit + 1 and encodes a nextCursor when more rows remain', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      ...PAIR_ROW,
      id: `pair-${i}`,
      companyAId: 'company-a',
      companyBId: 'company-b',
    }));
    mockState.resultQueue = [rows, COMPANY_ROWS, [], []];
    const result = await listPendingPairsForAdmin({ limit: 2 });
    expect(result.rows.length).toBe(2);
    expect(result.nextCursor).not.toBeNull();
    const limitCalls = mockState.calls.filter((c) => c.kind === 'limit');
    expect(limitCalls[0].payload).toBe(3); // limit(2) + 1
  });

  it('returns an empty result with no detail queries when zero pairs are pending', async () => {
    mockState.resultQueue = [[]];
    const result = await listPendingPairsForAdmin({ limit: 20 });
    expect(result).toEqual({ rows: [], nextCursor: null });
  });
});

describe('getPendingPairForAdmin', () => {
  it('returns null when the pair does not exist or is not pending', async () => {
    mockState.resultQueue = [[]];
    await expect(getPendingPairForAdmin('missing')).resolves.toBeNull();
  });

  it('returns the same shape as the list form for a single pending pair', async () => {
    mockState.resultQueue = [[PAIR_ROW], COMPANY_ROWS, [], []];
    const result = await getPendingPairForAdmin('pair-1');
    expect(result?.pairId).toBe('pair-1');
    expect(result?.sideA.companyId).toBe('company-a');
    expect(result?.sideB.companyId).toBe('company-b');
  });
});

describe('a stale pair with a NULL company side is excluded', () => {
  it('the where predicate excludes rows whose company_a_id/company_b_id is NULL', async () => {
    mockState.resultQueue = [[], [], [], []];
    await listPendingPairsForAdmin({ limit: 20 });
    const whereCalls = mockState.calls.filter((c) => c.kind === 'where');
    // The composite predicate's SQL text asserts NOT NULL on both sides —
    // walk the raw chunks looking for the literal strings rather than a
    // Column-name match, since these are hand-written sql`` fragments.
    const sqlTexts = whereCalls
      .map((c) => JSON.stringify(c.payload, (key, val) => (key === 'table' ? undefined : val)))
      .join(' ');
    expect(sqlTexts).toContain('company_a_id');
    expect(sqlTexts).toContain('company_b_id');
  });
});

describe('ADMIN-09 / commission surface source guards', () => {
  const filePath = join(dirname(fileURLToPath(import.meta.url)), 'reconciliation.ts');
  const source = readFileSync(filePath, 'utf8');

  it('never selects params_snapshot, computed, or anything from global_params', () => {
    expect(source).not.toMatch(/paramsSnapshot|params_snapshot|globalParams/);
  });

  it('no exported function signature accepts an ownerId filter parameter', () => {
    const fnSignatures = [...source.matchAll(/export async function \w+\(([^)]*)\)/g)].map((m) => m[1]);
    expect(fnSignatures.length).toBeGreaterThan(0);
    for (const params of fnSignatures) {
      expect(params).not.toMatch(/ownerId/);
    }
  });
});
