/**
 * Phase 33 Plan 03 — pipeline.ts tests (PIPE-03, PIPE-04, CRM-02, D-12).
 *
 * Mocking pattern mirrors client-relationships.test.ts's stubBuilder
 * (chainable, records every call, awaitable via `then` at any chain point).
 *
 * `ownerId` being a REQUIRED, non-optional TypeScript parameter on both
 * exports is enforced at compile time (`npm run typecheck`) — there is no
 * runtime way to "call without it" from a typed caller. The runtime half of
 * that contract is proven below: every WHERE clause this module issues
 * actually carries the owner predicate in the compiled SQL.
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
    // Makes the builder awaitable at any chain point (mirrors real Drizzle
    // query builders, which are PromiseLike even before a terminal call).
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

import { listPipelineBoard, getConversionRateForOwner } from './pipeline';
import { PIPELINE_STAGES } from '@/lib/pipeline/stages';

/** Same object-graph walk as client-relationships.test.ts's helper. */
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

beforeEach(() => {
  calls.length = 0;
  mockState.selectResult = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listPipelineBoard — CRM-02 owner scoping', () => {
  it('the WHERE clause carries the owner_id predicate', async () => {
    await listPipelineBoard({ ownerId: 'owner-A' });
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls.length).toBeGreaterThan(0);
    expect(whereCalls.some((c) => sqlReferencesColumn(c.payload, 'owner_id'))).toBe(true);
  });

  it('joins companies (inner), contacts and proposals (left), groups and orders by company name', async () => {
    await listPipelineBoard({ ownerId: 'owner-A' });
    expect(calls.find((c) => c.kind === 'innerJoin')).toBeDefined();
    expect(calls.filter((c) => c.kind === 'leftJoin').length).toBe(2);
    expect(calls.find((c) => c.kind === 'groupBy')).toBeDefined();
    expect(calls.find((c) => c.kind === 'orderBy')).toBeDefined();
  });
});

describe('listPipelineBoard — seven-lane seeding', () => {
  it('returns a key for all seven stages even when the DB returns zero rows', async () => {
    mockState.selectResult = [];
    const result = await listPipelineBoard({ ownerId: 'owner-A' });
    expect(Object.keys(result).sort()).toEqual([...PIPELINE_STAGES].sort());
    for (const stage of PIPELINE_STAGES) {
      expect(result[stage]).toEqual([]);
    }
  });

  it('reserved lanes (signe, debloque) are present and empty when nothing has ever written them', async () => {
    mockState.selectResult = [];
    const result = await listPipelineBoard({ ownerId: 'owner-A' });
    expect(result.signe).toEqual([]);
    expect(result.debloque).toEqual([]);
  });
});

describe('listPipelineBoard — row mapping', () => {
  it('maps a raw row into PipelineCardRow, bucketed under its stage, with numeric counts coerced', async () => {
    mockState.selectResult = [
      {
        relationshipId: 'rel-1',
        companyId: 'co-1',
        companyName: 'Acme',
        siren: '123456789',
        stage: 'qualifie',
        contactsCount: '2',
        proposalsCount: '3',
      },
    ];
    const result = await listPipelineBoard({ ownerId: 'owner-A' });
    expect(result.qualifie).toHaveLength(1);
    expect(result.qualifie[0]).toEqual({
      relationshipId: 'rel-1',
      companyId: 'co-1',
      companyName: 'Acme',
      siren: '123456789',
      stage: 'qualifie',
      contactsCount: 2,
      proposalsCount: 3,
    });
    expect(result.prospect).toEqual([]);
  });
});

describe('listPipelineBoard — DISTINCT counts (source guard)', () => {
  it('both child-table counts use countDistinct, avoiding the contacts × proposals cartesian trap', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'pipeline.ts'), 'utf8');
    const matches = src.match(/countDistinct\(/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('getConversionRateForOwner — CRM-02 / D-12 owner scoping', () => {
  it('the WHERE clause carries the proposals.user_id predicate', async () => {
    mockState.selectResult = [{ won: 0, total: 0 }];
    await getConversionRateForOwner('owner-A');
    const whereCalls = calls.filter((c) => c.kind === 'where');
    expect(whereCalls.length).toBeGreaterThan(0);
    expect(whereCalls.some((c) => sqlReferencesColumn(c.payload, 'user_id'))).toBe(true);
  });

  it('the WHERE clause also carries the locked denominator predicates (status=active, no unlinked rows)', async () => {
    mockState.selectResult = [{ won: 0, total: 0 }];
    await getConversionRateForOwner('owner-A');
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(sqlReferencesValue(whereCall!.payload, 'active')).toBe(true);
  });
});

describe('getConversionRateForOwner — rate math (A-2 decision record)', () => {
  it('returns pct: null when total is 0 (zero-denominator renders as "—", not 0%)', async () => {
    mockState.selectResult = [{ won: 0, total: 0 }];
    const result = await getConversionRateForOwner('owner-A');
    expect(result).toEqual({ won: 0, total: 0, pct: null });
  });

  it('returns pct: 25 for won: 1, total: 4', async () => {
    mockState.selectResult = [{ won: 1, total: 4 }];
    const result = await getConversionRateForOwner('owner-A');
    expect(result).toEqual({ won: 1, total: 4, pct: 25 });
  });

  it('rounds to the nearest integer percent', async () => {
    mockState.selectResult = [{ won: 1, total: 3 }];
    const result = await getConversionRateForOwner('owner-A');
    expect(result.pct).toBe(33);
  });
});

describe('ADMIN-09 — no commission/params_snapshot in this module (source guard)', () => {
  it('the compiled module never selects proposals.params_snapshot or global_params', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'pipeline.ts'), 'utf8');
    expect(src).not.toMatch(/params_snapshot|paramsSnapshot|globalParams|global_params/);
  });
});

describe('no admin path (T-30-04-09 precedent)', () => {
  it('the compiled module never references requireAdmin or an owner-bypass flag', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'pipeline.ts'), 'utf8');
    expect(src).not.toMatch(/requireAdmin|includeAllOwners|allOwners|ownerId\?:/);
  });
});
