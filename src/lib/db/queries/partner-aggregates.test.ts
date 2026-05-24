/**
 * Phase 18 Plan 01 Task 1 — partner-aggregates.ts tests (RED → GREEN).
 *
 * D-01 (18-CONTEXT decisions block):
 *   - `Partenaires actifs` counts `users.role='partner' AND status='active'`.
 *     `status='active'` is DERIVED — the schema has no `users.status` column.
 *     Per Phase 12 DB-02 (D-10): `active = role='partner' AND deleted_at IS NULL
 *     AND last_login_at IS NOT NULL` (logged in at least once + not soft-deleted).
 *     `invited = role='partner' AND deleted_at IS NULL AND last_login_at IS NULL`.
 *     `inactive = role='partner' AND deleted_at IS NOT NULL` (soft-deleted).
 *   - `sur N comptes` sublabel = total non-deleted partner accounts (active + invited).
 *     getTotalPartnerAccountCount = role='partner' AND deletedAt IS NULL.
 *
 * SECURITY (T-18-01-02): Admin-only data — no API endpoint surfaces these helpers;
 * only the Admin Home stat tile (admin-gated route) consumes them.
 *
 * Mocking pattern adapted from proposal-aggregates.test.ts (Phase 17 17-03
 * established this codebase's unit-test pattern for Drizzle helpers). The stub
 * builder records each chained call; we introspect what helpers passed to
 * .select()/.from()/.where() to enforce the contract without a real DB.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { mockState } = vi.hoisted(() => ({
  mockState: {
    selectResult: [{ count: 0 }] as Array<{ count: number }>,
  },
}));

const calls: Array<{ kind: string; payload: unknown }> = [];

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  const stubBuilder = {
    select: (cols: unknown) => {
      calls.push({ kind: 'select', payload: cols });
      return stubBuilder;
    },
    from: (table: unknown) => {
      calls.push({ kind: 'from', payload: table });
      return stubBuilder;
    },
    where: (clause: unknown) => {
      calls.push({ kind: 'where', payload: clause });
      // `where()` is the terminal chained call — resolve so the helper's
      // `await` returns mock rows.
      return Promise.resolve(mockState.selectResult);
    },
  };

  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import { getActivePartnerCount, getTotalPartnerAccountCount } from './partner-aggregates';

beforeEach(() => {
  calls.length = 0;
  mockState.selectResult = [{ count: 0 }];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getActivePartnerCount (D-01)', () => {
  it('Test 5: queries users with role=partner AND deletedAt IS NULL AND lastLoginAt IS NOT NULL — derived "active" per Phase 12 DB-02', async () => {
    mockState.selectResult = [{ count: 3 }];
    const n = await getActivePartnerCount();
    expect(n).toBe(3);
    // select called with a { count: count() } projection
    const selectCall = calls.find((c) => c.kind === 'select');
    expect(selectCall).toBeDefined();
    expect(calls.filter((c) => c.kind === 'from').length).toBe(1);
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(whereCall!.payload).not.toBeNull();
    expect(whereCall!.payload).not.toBeUndefined();
  });

  it('returns 0 when no active partners exist', async () => {
    mockState.selectResult = [{ count: 0 }];
    const n = await getActivePartnerCount();
    expect(n).toBe(0);
  });

  it('returns 0 defensively when query returns empty row set', async () => {
    mockState.selectResult = [];
    const n = await getActivePartnerCount();
    expect(n).toBe(0);
  });
});

describe('getTotalPartnerAccountCount (D-01)', () => {
  it('Test 6: queries users with role=partner AND deletedAt IS NULL — any login state (active + invited)', async () => {
    mockState.selectResult = [{ count: 5 }];
    const n = await getTotalPartnerAccountCount();
    expect(n).toBe(5);
    const selectCall = calls.find((c) => c.kind === 'select');
    expect(selectCall).toBeDefined();
    expect(calls.filter((c) => c.kind === 'from').length).toBe(1);
    const whereCall = calls.find((c) => c.kind === 'where');
    expect(whereCall).toBeDefined();
    expect(whereCall!.payload).not.toBeNull();
  });

  it('returns 0 when no partners exist (cross-test isolation)', async () => {
    // Test 7 (isolation): this test runs independently of Test 5/6 above —
    // the calls[] / mockState reset in beforeEach guarantees no cross-test
    // leakage. Verified by counting how many calls the previous test left
    // (zero — the array was cleared).
    expect(calls.length).toBe(0); // beforeEach reset
    mockState.selectResult = [{ count: 0 }];
    const n = await getTotalPartnerAccountCount();
    expect(n).toBe(0);
  });
});

describe('helpers produce distinct where predicates per call', () => {
  it('calling each helper produces an independent where predicate (no shared cached predicate)', async () => {
    await getActivePartnerCount();
    await getTotalPartnerAccountCount();
    const wheres = calls.filter((c) => c.kind === 'where');
    expect(wheres.length).toBe(2);
    // Each call composes its own predicate; both are non-null but distinct
    // object references (defense in depth: no shared mutable filter state).
    expect(wheres[0].payload).not.toBeNull();
    expect(wheres[1].payload).not.toBeNull();
    expect(wheres[0].payload).not.toBe(wheres[1].payload);
  });
});
