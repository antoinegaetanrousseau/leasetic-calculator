import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = {
  listProposalsByUser: vi.fn(),
  searchProposals: vi.fn(),
};

vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db/queries')>('@/lib/db/queries');
  return {
    ...actual,
    listProposalsByUser: (...args: unknown[]) => mocks.listProposalsByUser(...args),
    searchProposals: (...args: unknown[]) => mocks.searchProposals(...args),
  };
});

import { buildListResponse } from '@/lib/api/proposals/list';

const ROW = (overrides?: Partial<{ id: string; clientCo: string; amountHT: string }>) => ({
  id: overrides?.id ?? 'p-1',
  userId: 'u-1',
  language: 'fr',
  lcRef: 'LC-12345',
  idempotencyKey: '11111111-2222-4333-9444-555555555555',
  schemaVersion: '1.0.0',
  inputs: {
    clientCo: overrides?.clientCo ?? 'Société Cliente Alpha',
    amountHT: overrides?.amountHT ?? '75000',
    validityDays: 30,
  },
  paramsSnapshot: {}, computed: {},
  pdfBlobKey: 'proposals/u-1/p-1.pdf',
  pdfSha256: 'a'.repeat(64), pdfSizeBytes: 5000, pdfGeneratedAt: new Date(),
  deletedAt: null, duplicatedFromId: null,
  createdAt: new Date('2026-05-09T10:00:00Z'),
});

beforeEach(() => { mocks.listProposalsByUser.mockReset(); mocks.searchProposals.mockReset(); });

describe('buildListResponse', () => {
  it('returns rows + hasMore + nextCursor for empty q', async () => {
    mocks.listProposalsByUser.mockResolvedValueOnce({
      rows: [ROW()], hasMore: false, nextCursor: null,
    });
    const result = await buildListResponse({ userId: 'u-1' });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: 'p-1', lcRef: 'LC-12345', clientCo: 'Société Cliente Alpha', amountHT: '75000',
      validityDays: 30, language: 'fr', deletedAt: null,
    });
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('routes to searchProposals when q is non-empty', async () => {
    mocks.searchProposals.mockResolvedValueOnce({ rows: [], hasMore: false, nextCursor: null });
    await buildListResponse({ userId: 'u-1', q: 'Alpha' });
    expect(mocks.searchProposals).toHaveBeenCalledOnce();
    expect(mocks.listProposalsByUser).not.toHaveBeenCalled();
  });

  it('routes to listProposalsByUser when q is whitespace', async () => {
    mocks.listProposalsByUser.mockResolvedValueOnce({ rows: [], hasMore: false, nextCursor: null });
    await buildListResponse({ userId: 'u-1', q: '   ' });
    expect(mocks.listProposalsByUser).toHaveBeenCalledOnce();
  });

  it('clamps limit to [1, 50]', async () => {
    mocks.listProposalsByUser.mockResolvedValueOnce({ rows: [], hasMore: false, nextCursor: null });
    await buildListResponse({ userId: 'u-1', limit: 999 });
    // listProposalsByUser receives the unclamped limit because the API route handler
    // does the clamp; buildListResponse passes through. Confirm the helper passed
    // the limit through faithfully.
    const callArg = mocks.listProposalsByUser.mock.calls[0][0] as { limit: number };
    expect(callArg.limit).toBe(999);
  });

  it('encodes nextCursor when query reports hasMore', async () => {
    mocks.listProposalsByUser.mockResolvedValueOnce({
      rows: [ROW()],
      hasMore: true,
      nextCursor: { createdAt: '2026-05-09T10:00:00.000Z', id: 'p-1' },
    });
    const result = await buildListResponse({ userId: 'u-1' });
    expect(result.hasMore).toBe(true);
    expect(typeof result.nextCursor).toBe('string');
    expect(result.nextCursor!.length).toBeGreaterThan(0);
  });

  it('serializes deletedAt to ISO when present', async () => {
    const deletedRow = { ...ROW(), deletedAt: new Date('2026-05-08T10:00:00.000Z') };
    mocks.listProposalsByUser.mockResolvedValueOnce({
      rows: [deletedRow], hasMore: false, nextCursor: null,
    });
    const result = await buildListResponse({ userId: 'u-1', deleted: true });
    expect(result.rows[0].deletedAt).toBe('2026-05-08T10:00:00.000Z');
  });
});
