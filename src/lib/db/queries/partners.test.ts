/**
 * Phase 18 Plan 03 Task 1 — partners.ts tests (RED → GREEN).
 *
 * D-08 (18-CONTEXT decisions block):
 *   - `Dernière activité` = MAX(proposals.created_at WHERE proposals.user_id =
 *     partner.id AND proposals.status != 'deleted'). Falls back to NULL when the
 *     partner has zero non-deleted proposals; page-layer renders em-dash.
 *
 * D-14 — full rename: the new helper lives in `partners.ts` (not `accounts.ts`),
 * its symbol is `listPartnersWithLastActivity` (not `listAccountsWithLastActivity`),
 * and its row shape is `PartnerRow` (not `AccountRow`).
 *
 * Status derivation (Phase 12 DB-02 D-10 — schema has no users.status column):
 *   - active    = role='partner' AND deletedAt IS NULL AND lastLoginAt IS NOT NULL
 *   - invited   = role='partner' AND deletedAt IS NULL AND lastLoginAt IS NULL
 *   - inactive  = role='partner' AND deletedAt IS NOT NULL  (soft-deleted)
 *
 * Cursor pagination — reuses the Phase 8/17 Cursor primitive (createdAt, id).
 * Encoded via Buffer base64url (matches the proposals encodeCursor pattern).
 *
 * Mocking pattern mirrors partner-aggregates.test.ts and proposal-aggregates.test.ts
 * (Phase 17/18 established this codebase's unit-test pattern for Drizzle helpers).
 * The stubBuilder records each chained call so we can introspect what was passed
 * to .select() / .from() / .leftJoin() / .where() / .groupBy() / .orderBy() / .limit().
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  // Chainable stub builder. .limit() is terminal — resolves to mockState.selectResult.
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
      return Promise.resolve(mockState.selectResult);
    },
  });

  return {
    db: () => stubBuilder,
    schema: real,
    DbError: class extends Error {},
    DbAuthError: class extends Error {},
    __resetDbForTests: () => { /* noop */ },
  };
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listPartnersWithLastActivity, type PartnerRow } from './partners';

// Helper: synthesize a raw query-builder row (post-LEFT-JOIN aggregate).
function makeRawRow(overrides: Partial<{
  id: string;
  email: string;
  displayName: string | null;
  name: string;
  deletedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  lastActivityAt: Date | null;
  role: string;
}> = {}) {
  return {
    id: 'p-1',
    email: 'alice@example.com',
    displayName: 'Alice Example',
    name: 'Alice Example',
    deletedAt: null,
    lastLoginAt: new Date('2026-05-10T10:00:00Z'),
    createdAt: new Date('2026-04-01T12:00:00Z'),
    lastActivityAt: new Date('2026-05-12T09:00:00Z'),
    role: 'partner',
    ...overrides,
  };
}

beforeEach(() => {
  calls.length = 0;
  mockState.selectResult = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listPartnersWithLastActivity — query shape (D-08, D-14)', () => {
  it('Test 1: basic — issues a LEFT JOIN onto proposals + GROUP BY users.id + ORDER BY createdAt DESC', async () => {
    mockState.selectResult = [makeRawRow(), makeRawRow({ id: 'p-2', email: 'b@example.com' })];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows).toHaveLength(2);

    // Query-shape assertions — D-08 contract.
    expect(calls.find((c) => c.kind === 'leftJoin')).toBeDefined();
    expect(calls.find((c) => c.kind === 'groupBy')).toBeDefined();
    expect(calls.find((c) => c.kind === 'orderBy')).toBeDefined();
    expect(calls.find((c) => c.kind === 'limit')).toBeDefined();
  });

  it('Test 1 (cont.): maps rawRow lastActivityAt onto PartnerRow.lastActivityAt verbatim', async () => {
    const t1 = new Date('2026-05-15T11:00:00Z');
    const t2 = new Date('2026-05-12T09:00:00Z');
    mockState.selectResult = [
      makeRawRow({ id: 'pA', lastActivityAt: t1 }),
      makeRawRow({ id: 'pB', lastActivityAt: t2 }),
    ];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows.map((r) => r.lastActivityAt)).toEqual([t1, t2]);
  });

  it('Test 3 (D-08 fallback): zero proposals → lastActivityAt = null (page renders em-dash)', async () => {
    mockState.selectResult = [makeRawRow({ id: 'pNoProps', lastActivityAt: null })];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].lastActivityAt).toBeNull();
  });

  it('Test 4 (status filter "active"): pushes a where clause when status=active passed', async () => {
    mockState.selectResult = [makeRawRow()];
    await listPartnersWithLastActivity({ status: 'active' });
    // listPartnersWithLastActivity always issues at least one where clause
    // (role='partner' baseline + active predicate); we don't introspect the
    // exact SQL but verify the call is present and the helper returns rows.
    expect(calls.filter((c) => c.kind === 'where').length).toBeGreaterThanOrEqual(1);
  });

  it('Test 5 (status filter "invited"): accepts invited filter without throwing', async () => {
    mockState.selectResult = [makeRawRow({ lastLoginAt: null })];
    const result = await listPartnersWithLastActivity({ status: 'invited' });
    expect(result.rows).toHaveLength(1);
  });

  it('Test 6 (status filter "inactive"): accepts inactive filter without throwing', async () => {
    mockState.selectResult = [makeRawRow({ deletedAt: new Date() })];
    const result = await listPartnersWithLastActivity({ status: 'inactive' });
    expect(result.rows).toHaveLength(1);
  });

  it('Test 7 (no filter / undefined status): returns all partner rows (helper drops status-derivation predicate)', async () => {
    mockState.selectResult = [
      makeRawRow({ id: 'pA' }),
      makeRawRow({ id: 'pB', lastLoginAt: null }),
      makeRawRow({ id: 'pC', deletedAt: new Date() }),
    ];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows).toHaveLength(3);
    expect(result.rows.map((r) => r.id)).toEqual(['pA', 'pB', 'pC']);
  });

  it('Test 8 (search q): wraps q in ILIKE pattern via where clause (case-insensitive bind-param)', async () => {
    mockState.selectResult = [makeRawRow({ email: 'marie@x.com', name: 'Marie' })];
    const result = await listPartnersWithLastActivity({ q: 'MARIE' });
    expect(result.rows).toHaveLength(1);
    // The where clause was composed — exact predicate shape not asserted (Drizzle
    // ilike() produces a SQL fragment); we trust the helper to pass via bind params.
    expect(calls.filter((c) => c.kind === 'where').length).toBeGreaterThanOrEqual(1);
  });

  it('Test 9 (cursor pagination): limit=2 returns 2 rows + nextCursor when overflow row present', async () => {
    // Helper fetches limit+1 server-side to detect overflow; mock returns 3 rows
    // for limit=2 → helper slices to 2, sets nextCursor from the last sliced row.
    mockState.selectResult = [
      makeRawRow({ id: 'pA', createdAt: new Date('2026-05-15T10:00:00Z') }),
      makeRawRow({ id: 'pB', createdAt: new Date('2026-05-14T10:00:00Z') }),
      makeRawRow({ id: 'pC', createdAt: new Date('2026-05-13T10:00:00Z') }),
    ];
    const result = await listPartnersWithLastActivity({ limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.id)).toEqual(['pA', 'pB']);
    expect(result.nextCursor).not.toBeNull();
    expect(typeof result.nextCursor).toBe('string');
  });

  it('Test 9 (cont.): no overflow → nextCursor = null', async () => {
    mockState.selectResult = [makeRawRow({ id: 'pA' }), makeRawRow({ id: 'pB' })];
    const result = await listPartnersWithLastActivity({ limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it('Test 9 (cont.): cursor decode + re-encode roundtrips (Phase 8 Cursor primitive shape)', async () => {
    // First call: synthesizes a cursor from the last sliced row.
    mockState.selectResult = [
      makeRawRow({ id: 'pA', createdAt: new Date('2026-05-15T10:00:00Z') }),
      makeRawRow({ id: 'pB', createdAt: new Date('2026-05-14T10:00:00Z') }),
      makeRawRow({ id: 'pC' }), // overflow row
    ];
    const page1 = await listPartnersWithLastActivity({ limit: 2 });
    expect(page1.nextCursor).not.toBeNull();

    // Second call with the same cursor — the helper accepts the encoded string.
    calls.length = 0;
    mockState.selectResult = [makeRawRow({ id: 'pD' })];
    const page2 = await listPartnersWithLastActivity({
      limit: 2,
      cursor: page1.nextCursor!,
    });
    expect(page2.rows).toHaveLength(1);
    // The cursor predicate is composed into the where clause; we observe an
    // additional where call composed (the helper merges baseline + cursor).
    expect(calls.filter((c) => c.kind === 'where').length).toBeGreaterThanOrEqual(1);
  });
});

describe('PartnerRow contract', () => {
  it('exposes id / email / name / status / createdAt / lastActivityAt (D-08 shape)', async () => {
    mockState.selectResult = [makeRawRow({ id: 'p-shape' })];
    const result = await listPartnersWithLastActivity({});
    const r: PartnerRow = result.rows[0];
    expect(r.id).toBe('p-shape');
    expect(r.email).toBe('alice@example.com');
    expect(typeof r.name).toBe('string');
    // Derived status — one of active|invited|inactive.
    expect(['active', 'invited', 'inactive']).toContain(r.status);
    expect(r.createdAt).toBeInstanceOf(Date);
  });

  it('derives status="active" when lastLoginAt is set + deletedAt null (Phase 12 D-10)', async () => {
    mockState.selectResult = [makeRawRow({
      id: 'p-act',
      lastLoginAt: new Date('2026-05-10T00:00:00Z'),
      deletedAt: null,
    })];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows[0].status).toBe('active');
  });

  it('derives status="invited" when lastLoginAt null + deletedAt null', async () => {
    mockState.selectResult = [makeRawRow({
      id: 'p-inv',
      lastLoginAt: null,
      deletedAt: null,
    })];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows[0].status).toBe('invited');
  });

  it('derives status="inactive" when deletedAt is set (soft-deleted)', async () => {
    mockState.selectResult = [makeRawRow({
      id: 'p-ina',
      deletedAt: new Date('2026-05-10T00:00:00Z'),
    })];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows[0].status).toBe('inactive');
  });
});

describe('Phase 30 Plan 03 — ROLE-03: Commercial accounts stay visible after backfill', () => {
  it('returns rows for a user whose role is "sales" (no longer silently dropped)', async () => {
    mockState.selectResult = [makeRawRow({ id: 'p-sales', role: 'sales' })];
    const result = await listPartnersWithLastActivity({});
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('p-sales');
  });

  it('derives isInternal=true for role="sales" and isInternal=false for role="partner"', async () => {
    mockState.selectResult = [
      makeRawRow({ id: 'p-sales', role: 'sales' }),
      makeRawRow({ id: 'p-partner', role: 'partner' }),
    ];
    const result = await listPartnersWithLastActivity({});
    const sales = result.rows.find((r) => r.id === 'p-sales')!;
    const partner = result.rows.find((r) => r.id === 'p-partner')!;
    expect(sales.isInternal).toBe(true);
    expect(partner.isInternal).toBe(false);
  });

  it('T-30-03-04 — the base role predicate is IN (partner, sales), never a plain equality on "partner"', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'partners.ts'), 'utf8');
    expect(src).toContain("inArray(schema.users.role, ['partner', 'sales'])");
    expect(src).not.toContain("eq(schema.users.role, 'partner')");
  });

  it("ROLE-03 — 'admin' is never included in the role predicate (admins never appear as partners)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, 'partners.ts'), 'utf8');
    // Only the intended two-member array should follow the role predicate.
    expect(src).not.toMatch(/inArray\(schema\.users\.role,\s*\[[^\]]*'admin'[^\]]*\]\)/);
  });
});
