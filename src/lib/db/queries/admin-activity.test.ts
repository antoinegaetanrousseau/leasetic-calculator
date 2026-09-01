/**
 * Phase 18 Plan 01 Task 2 — admin-activity.ts tests (RED → GREEN).
 *
 * D-05 (18-CONTEXT) — Admin Home Recent activity card data source is a
 * union of SQL queries at request time. No new audit table. Sources:
 *   (a) coefficient_history rows
 *   (b) partner status changes (users.updatedAt with status='inactive' or
 *       lastLoginAt transition from NULL → not-NULL).
 *   (c) invitations table — SKIPPED in current schema. The Leasétic schema
 *       has no `invitations` table; partner invites live in `password_resets`
 *       with `kind='invite'` and have NO `createdBy` actor reference. Per
 *       plan instructions: document and defer; Recent activity becomes a
 *       2-source union (a + b). See SUMMARY.md "Known Stubs" section.
 *
 * Each source bounded LIMIT 10, merged + sorted by timestamp DESC, sliced to
 * `limit` (default 5).
 *
 * D-07 — rows are READ-ONLY (no row-level links); shape is bounded to the
 * ActivityRow union to keep the projection commission-free (T-18-01-04).
 *
 * SECURITY (T-18-01-03/04): admin-only data — consumed ONLY by Admin Home
 * stat tile (requireAdmin gate). NO commission VALUES in sentenceArgs —
 * coefficient_history sentence references "modified coefficients" generically.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

vi.mock('server-only', () => ({}));

// Three mock states, one per source query — the helper performs 2-3 separate
// SELECTs (depending on which sources exist), merges, sorts DESC.
const { mockState } = vi.hoisted(() => ({
  mockState: {
    // Each entry mirrors a SELECT call's resolved rows. The stub returns
    // results in invocation order.
    selectResults: [] as Array<Array<Record<string, unknown>>>,
    invocationIndex: 0,
  },
}));

const calls: Array<{ kind: string; payload: unknown }> = [];

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');

  // The helper composes per-source builders that look like:
  //   db().select({...}).from(table).leftJoin(users, ...).where(...).orderBy(...).limit(10)
  // We model the chain with a terminal `.limit()` that resolves with the next
  // queued result (since orderBy/limit are typically the terminal awaited
  // operations on a Drizzle chain).
  const makeStub = () => {
    const stub: Record<string, unknown> = {};
    const chainable = (kind: string) => (payload: unknown) => {
      calls.push({ kind, payload });
      return stub;
    };
    stub.select = chainable('select');
    stub.from = chainable('from');
    stub.leftJoin = chainable('leftJoin');
    stub.innerJoin = chainable('innerJoin');
    stub.where = chainable('where');
    stub.orderBy = chainable('orderBy');
    stub.limit = (n: unknown) => {
      calls.push({ kind: 'limit', payload: n });
      const idx = mockState.invocationIndex++;
      return Promise.resolve(mockState.selectResults[idx] ?? []);
    };
    return stub;
  };

  return {
    db: () => makeStub(),
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import { getRecentAdminActivity, type ActivityRow } from './admin-activity';

beforeEach(() => {
  calls.length = 0;
  mockState.invocationIndex = 0;
  mockState.selectResults = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getRecentAdminActivity (D-05)', () => {
  it('Test 1: 2-source union — merges coefficient_history + partner status rows, sorts DESC, slices top 5 default', async () => {
    const t0 = new Date('2026-05-20T10:00:00Z');
    const t1 = new Date('2026-05-21T10:00:00Z');
    const t2 = new Date('2026-05-22T10:00:00Z');
    const t3 = new Date('2026-05-23T10:00:00Z');
    const t4 = new Date('2026-05-24T10:00:00Z');
    const t5 = new Date('2026-05-25T10:00:00Z');

    // Source (a): coefficient_history rows
    mockState.selectResults.push([
      { id: 'ch-1', changedAt: t0, actorName: 'Antoine', actorEmail: 'antoine@x.com' },
      { id: 'ch-2', changedAt: t5, actorName: 'Antoine', actorEmail: 'antoine@x.com' },
    ]);
    // Source (b): partner status rows
    mockState.selectResults.push([
      { id: 'u-1', updatedAt: t1, name: 'Marie', email: 'marie@x.com', deletedAt: t1, lastLoginAt: null },
      { id: 'u-2', updatedAt: t2, name: 'Pierre', email: 'pierre@x.com', deletedAt: null, lastLoginAt: t2 },
      { id: 'u-3', updatedAt: t3, name: 'Sophie', email: 'sophie@x.com', deletedAt: null, lastLoginAt: t3 },
      { id: 'u-4', updatedAt: t4, name: 'Luc', email: 'luc@x.com', deletedAt: t4, lastLoginAt: t1 },
    ]);

    const rows = await getRecentAdminActivity({ limit: 5 });
    expect(rows).toHaveLength(5);
    // Top 5 by timestamp DESC: t5, t4, t3, t2, t1
    expect(rows[0]!.timestamp.getTime()).toBe(t5.getTime());
    expect(rows[4]!.timestamp.getTime()).toBe(t1.getTime());
    // Sorted strictly DESC
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.timestamp.getTime()).toBeGreaterThanOrEqual(
        rows[i]!.timestamp.getTime(),
      );
    }
  });

  it('Test 2: each source LIMIT 10 — given 20 coefficient_history rows in source (a), the slice yields 5 of the most-recent', async () => {
    // Source (a): 10 rows (mock the LIMIT 10 boundary by only emitting 10).
    const aRows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 10; i++) {
      aRows.push({
        id: `ch-${i}`,
        changedAt: new Date(2026, 4, 10 + i, 10, 0, 0),
        actorName: 'Antoine',
        actorEmail: 'antoine@x.com',
      });
    }
    mockState.selectResults.push(aRows);
    // Source (b): empty
    mockState.selectResults.push([]);

    const rows = await getRecentAdminActivity({ limit: 5 });
    expect(rows).toHaveLength(5);
    // All should be source 'coefficient_history' (source b returned empty)
    expect(rows.every((r) => r.source === 'coefficient_history')).toBe(true);
    // Verify per-source LIMIT 10 was issued via .limit(10) on the chain.
    const limitCalls = calls.filter((c) => c.kind === 'limit');
    expect(limitCalls.length).toBeGreaterThanOrEqual(2);
    // At least one .limit(10) call — DoS mitigation T-18-01-06.
    expect(limitCalls.some((c) => c.payload === 10)).toBe(true);
  });

  it('Test 3: ActivityRow shape — each row matches { id, source, actorName, actorEmail?, sentenceKey, sentenceArgs, timestamp }', async () => {
    mockState.selectResults.push([
      { id: 'ch-1', changedAt: new Date('2026-05-20T10:00:00Z'), actorName: 'Antoine', actorEmail: 'antoine@x.com' },
    ]);
    mockState.selectResults.push([
      { id: 'u-1', updatedAt: new Date('2026-05-21T10:00:00Z'), name: 'Marie', email: 'marie@x.com', deletedAt: null, lastLoginAt: new Date('2026-05-21T10:00:00Z') },
    ]);

    const rows = await getRecentAdminActivity({ limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty('id');
      expect(typeof row.id).toBe('string');
      expect(['coefficient_history', 'partner_status', 'invitation']).toContain(row.source);
      expect(typeof row.actorName).toBe('string');
      expect(typeof row.sentenceKey).toBe('string');
      expect(Array.isArray(row.sentenceArgs)).toBe(true);
      expect(row.timestamp).toBeInstanceOf(Date);
    }
    // The coefficient_history row should reference the canonical sentence key.
    const coeffRow = rows.find((r) => r.source === 'coefficient_history');
    expect(coeffRow!.sentenceKey).toBe('admin.home.activity.sentence.coefficientModified');
    // ID prefix discipline — keeps merged IDs unique across sources.
    expect(coeffRow!.id.startsWith('ch-')).toBe(true);
    const partnerRow = rows.find((r) => r.source === 'partner_status');
    expect(partnerRow).toBeDefined();
    expect(partnerRow!.id.startsWith('ps-')).toBe(true);
  });

  it('Test 4: empty state — empty DB returns []', async () => {
    mockState.selectResults.push([]);
    mockState.selectResults.push([]);
    const rows = await getRecentAdminActivity({ limit: 5 });
    expect(rows).toEqual([]);
  });

  it('default limit is 5 when args omitted', async () => {
    const many: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 8; i++) {
      many.push({
        id: `ch-${i}`,
        changedAt: new Date(2026, 4, 10 + i, 10, 0, 0),
        actorName: 'A',
        actorEmail: 'a@x.com',
      });
    }
    mockState.selectResults.push(many);
    mockState.selectResults.push([]);
    const rows = await getRecentAdminActivity();
    expect(rows).toHaveLength(5);
  });

  it('T-18-01-04 — commission values are NOT included in sentenceArgs for coefficient_history rows', async () => {
    mockState.selectResults.push([
      { id: 'ch-99', changedAt: new Date('2026-05-22T10:00:00Z'), actorName: 'Antoine', actorEmail: 'antoine@x.com' },
    ]);
    mockState.selectResults.push([]);
    const rows = await getRecentAdminActivity({ limit: 5 });
    const coeffRow = rows.find((r) => r.source === 'coefficient_history')!;
    expect(coeffRow).toBeDefined();
    // sentenceArgs MUST NOT contain numeric commission values — the sentence
    // is generic ("X modified the coefficients"). T-18-01-04 mitigation.
    for (const arg of coeffRow.sentenceArgs) {
      expect(arg).not.toMatch(/^\d+(\.\d+)?$/);
      expect(arg.toLowerCase()).not.toContain('commission');
    }
  });

  it('Phase 30 Plan 03 (ROLE-03) — partner-status source rows for a "sales" user still surface in the merged feed', async () => {
    const t0 = new Date('2026-05-20T10:00:00Z');
    mockState.selectResults.push([]); // source (a): empty
    mockState.selectResults.push([
      { id: 'u-sales', updatedAt: t0, name: 'Sales Person', email: 'sales@x.com', deletedAt: null, lastLoginAt: t0 },
    ]);
    const rows = await getRecentAdminActivity({ limit: 5 });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.source).toBe('partner_status');
    expect(rows[0]!.sentenceArgs).toContain('Sales Person');
  });

  it('Phase 30 Plan 03 (ROLE-03) — the partner-status role predicate is widened to IN (partner, sales), never a plain equality on "partner"', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'admin-activity.ts'), 'utf8');
    expect(src).toContain("inArray(schema.users.role, ['partner', 'sales'])");
    expect(src).not.toContain("eq(schema.users.role, 'partner')");
    // ROLE-03 — 'admin' must never join the predicate.
    expect(src).not.toMatch(/inArray\(schema\.users\.role,\s*\[[^\]]*'admin'[^\]]*\]\)/);
  });

  it('exports ActivityRow type-shape compatibly (smoke test — TS compiles)', () => {
    const sample: ActivityRow = {
      id: 'x',
      source: 'coefficient_history',
      actorName: 'A',
      sentenceKey: 'admin.home.activity.sentence.coefficientModified',
      sentenceArgs: ['A'],
      timestamp: new Date(),
    };
    expect(sample.source).toBe('coefficient_history');
  });
});
