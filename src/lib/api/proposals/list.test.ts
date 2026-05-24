/**
 * Plan 17-01 Task 2 — list.ts archived filter (PROPS-02 D-13).
 *
 * Coverage:
 *   - Test 1: archived=false (Actives default) preserves current behavior
 *   - Test 2: archived=true returns expired OR soft-deleted-within-30-days
 *   - Test 3: archived=true excludes soft-deleted BEYOND 30-day window
 *     (delegated to listProposalsByUser SQL filter — assertion verifies the
 *     archived arg is threaded through)
 *   - Test 4: userId scope holds in the archived branch (T-17-01-01 IDOR
 *     mitigation — the archived flag never overrides userId)
 *   - Test 5: q + archived combine cleanly (search + archived orthogonal)
 *
 * Mocking strategy: mock @/lib/db/queries at the helper level. The SQL
 * composition (candidate-set + deriveDisplayStatus) is unit-tested in
 * proposals.test.ts (DB-layer); here we verify that buildListResponse threads
 * the `archived` arg to the right helper and projects rows through the
 * existing ProposalRowDto.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = {
  listProposalsByUser: vi.fn(),
  searchProposals: vi.fn(),
  // deriveDisplayStatus + encodeCursor + decodeCursor: use the real implementations.
};

vi.mock('@/lib/db/queries', async () => {
  const real = await vi.importActual<typeof import('@/lib/db/queries')>('@/lib/db/queries');
  return {
    ...real,
    listProposalsByUser: (...args: unknown[]) => mocks.listProposalsByUser(...args),
    searchProposals: (...args: unknown[]) => mocks.searchProposals(...args),
  };
});

import { buildListResponse } from './list';

const ACTIVE_ROW = {
  id: 'p-active-1',
  userId: 'u-1',
  language: 'fr',
  status: 'active' as const,
  lcRef: 'LC-2026-001',
  idempotencyKey: 'k-1',
  schemaVersion: '1.0.0',
  inputs: { clientCo: 'Acme', amountHT: '75000', validityDays: 30 },
  paramsSnapshot: { commissionPct: '5.0000', validityDays: 30 } as never,
  computed: { loyer: '1000.00' },
  pdfBlobKey: 'k',
  pdfSha256: 's',
  pdfSizeBytes: 1,
  pdfGeneratedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago → active
  deletedAt: null,
  duplicatedFromId: null,
  createdAt: new Date('2026-05-12'),
};

const EXPIRED_ROW = {
  ...ACTIVE_ROW,
  id: 'p-expired-1',
  lcRef: 'LC-2026-002',
  pdfGeneratedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago → expired with 30-day validity
};

const DELETED_ROW = {
  ...ACTIVE_ROW,
  id: 'p-deleted-1',
  lcRef: 'LC-2026-003',
  status: 'deleted' as const,
  deletedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago → within 30-day window
};

beforeEach(() => {
  mocks.listProposalsByUser.mockReset();
  mocks.searchProposals.mockReset();
  // Default: empty result
  mocks.listProposalsByUser.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
  mocks.searchProposals.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
});

describe('buildListResponse (Phase 17 D-13 — archived filter)', () => {
  // ── Test 1 — Actives default behavior preserved ───────────────────────────

  it('Test 1: archived=false threads archived:false to listProposalsByUser (current Actives behavior preserved)', async () => {
    mocks.listProposalsByUser.mockResolvedValue({
      rows: [ACTIVE_ROW],
      hasMore: false,
      nextCursor: null,
    });
    const response = await buildListResponse({ userId: 'u-1', archived: false });
    expect(mocks.listProposalsByUser).toHaveBeenCalledTimes(1);
    const callArgs = mocks.listProposalsByUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs.userId).toBe('u-1');
    expect(callArgs.archived).toBe(false);
    // Phase 14 D-27 — projection still includes displayStatus.
    expect(response.rows).toHaveLength(1);
    expect(response.rows[0]!.displayStatus).toBe('active');
    expect(response.rows[0]!.lcRef).toBe('LC-2026-001');
  });

  it('Test 1b: omitting archived defaults to false (Actives view)', async () => {
    await buildListResponse({ userId: 'u-1' });
    expect(mocks.listProposalsByUser).toHaveBeenCalledTimes(1);
    const callArgs = mocks.listProposalsByUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs.archived).toBe(false);
  });

  // ── Test 2 — Archivées returns expired OR soft-deleted-within-30-days ────

  it('Test 2: archived=true threads archived:true to listProposalsByUser; returned rows include expired + recently-deleted', async () => {
    mocks.listProposalsByUser.mockResolvedValue({
      rows: [EXPIRED_ROW, DELETED_ROW],
      hasMore: false,
      nextCursor: null,
    });
    const response = await buildListResponse({ userId: 'u-1', archived: true });
    expect(mocks.listProposalsByUser).toHaveBeenCalledTimes(1);
    const callArgs = mocks.listProposalsByUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs.archived).toBe(true);
    expect(callArgs.userId).toBe('u-1');
    // displayStatus per row (derived via deriveDisplayStatus from the DB row state).
    expect(response.rows).toHaveLength(2);
    const statuses = response.rows.map((r) => r.displayStatus).sort();
    expect(statuses).toEqual(['deleted', 'expired']);
  });

  // ── Test 3 — archived branch boundary (delegated to DB layer SQL) ────────

  it('Test 3: archived=true with empty result threads archived:true (boundary > 30d filter lives in listProposalsByUser SQL)', async () => {
    // The boundary cutoff (deleted_at >= NOW() - INTERVAL '30 days') is enforced
    // in the SQL composition inside listProposalsByUser. From this layer's
    // perspective, we only need to assert the `archived` flag is forwarded.
    mocks.listProposalsByUser.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
    const response = await buildListResponse({ userId: 'u-1', archived: true });
    const callArgs = mocks.listProposalsByUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs.archived).toBe(true);
    expect(response.rows).toEqual([]);
  });

  // ── Test 4 — CRITICAL SECURITY: userId scope holds in archived branch ───

  it('Test 4: archived=true passes the caller userId verbatim — query never substitutes a different user (T-17-01-01 IDOR mitigation)', async () => {
    // Two distinct callers — each MUST trigger a query with their OWN userId.
    // The `archived` flag is independent of identity scope.
    await buildListResponse({ userId: 'user-alpha', archived: true });
    const firstCall = mocks.listProposalsByUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(firstCall.userId).toBe('user-alpha');
    expect(firstCall.archived).toBe(true);

    mocks.listProposalsByUser.mockClear();

    await buildListResponse({ userId: 'user-beta', archived: true });
    const secondCall = mocks.listProposalsByUser.mock.calls[0]![0] as Record<string, unknown>;
    expect(secondCall.userId).toBe('user-beta');
    expect(secondCall.archived).toBe(true);
  });

  // ── Test 5 — q + archived combine cleanly via searchProposals ────────────

  it('Test 5: archived=true + non-empty q routes to searchProposals and threads BOTH userId + archived (orthogonal per CONTEXT Claude\'s Discretion)', async () => {
    mocks.searchProposals.mockResolvedValue({
      rows: [EXPIRED_ROW],
      hasMore: false,
      nextCursor: null,
    });
    const response = await buildListResponse({
      userId: 'u-1',
      q: 'Acme',
      archived: true,
    });
    expect(mocks.searchProposals).toHaveBeenCalledTimes(1);
    expect(mocks.listProposalsByUser).not.toHaveBeenCalled();
    const callArgs = mocks.searchProposals.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs.userId).toBe('u-1');
    expect(callArgs.q).toBe('Acme');
    expect(callArgs.archived).toBe(true);
    expect(response.rows).toHaveLength(1);
  });

  // ── Sanity: projection commission-strip preserved (ADMIN-09) ─────────────

  it('preserves the Phase 14 D-27 displayStatus + commission-strip projection (paramsSnapshot.commissionPct never appears in row DTO)', async () => {
    mocks.listProposalsByUser.mockResolvedValue({
      rows: [ACTIVE_ROW],
      hasMore: false,
      nextCursor: null,
    });
    const response = await buildListResponse({ userId: 'u-1', archived: false });
    const rowJson = JSON.stringify(response.rows[0]);
    expect(rowJson.toLowerCase()).not.toContain('commission');
  });
});
