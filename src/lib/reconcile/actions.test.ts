/**
 * Phase 31 Plan 03 — actions.ts tests (D-11, D-12, T-31-03-01/02/03).
 *
 * Mocks `@/lib/auth/require`, `./merge` and `next/cache` — no DB mocking is
 * needed since this layer never touches `@/lib/db` directly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminMock, mergeCompanyPairMock, recordKeepSeparateMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  mergeCompanyPairMock: vi.fn(),
  recordKeepSeparateMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireAdmin: requireAdminMock }));
vi.mock('./merge', () => ({
  mergeCompanyPair: mergeCompanyPairMock,
  recordKeepSeparate: recordKeepSeparateMock,
}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

import { keepPairSeparateAction, mergeCompanyPairAction } from './actions';

const SESSION = { user: { id: 'admin-1', email: 'admin@example.com' } };
const PAIR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SURVIVOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LOSER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const BOUNDED_ERROR = 'admin.reconciliation.toast.error';

const OK_MERGE_RESULT = { ok: true, survivorCompanyId: SURVIVOR_ID, deletedCompanyId: LOSER_ID, mergedRelationshipIds: [] };
const OK_KEEP_SEPARATE_RESULT = { ok: true };

beforeEach(() => {
  requireAdminMock.mockReset();
  requireAdminMock.mockResolvedValue({ session: SESSION });
  mergeCompanyPairMock.mockReset();
  mergeCompanyPairMock.mockResolvedValue(OK_MERGE_RESULT);
  recordKeepSeparateMock.mockReset();
  recordKeepSeparateMock.mockResolvedValue(OK_KEEP_SEPARATE_RESULT);
  revalidatePathMock.mockReset();
  process.env.ADMIN_URL_SEGMENT = 'ops-secret';
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.ADMIN_URL_SEGMENT;
});

describe('mergeCompanyPairAction', () => {
  it('calls requireAdmin before mergeCompanyPair (call-order assertion, T-31-03-01)', async () => {
    const order: string[] = [];
    requireAdminMock.mockImplementation(async () => {
      order.push('requireAdmin');
      return { session: SESSION };
    });
    mergeCompanyPairMock.mockImplementation(async () => {
      order.push('mergeCompanyPair');
      return OK_MERGE_RESULT;
    });
    await mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID);
    expect(order).toEqual(['requireAdmin', 'mergeCompanyPair']);
  });

  it('passes session.user.id as actorId, never a caller-supplied value', async () => {
    await mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID);
    expect(mergeCompanyPairMock).toHaveBeenCalledWith({
      pairId: PAIR_ID,
      survivorCompanyId: SURVIVOR_ID,
      actorId: 'admin-1',
    });
  });

  it('revalidates the review route path on success', async () => {
    await mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith('/ops-secret/companies/review');
  });

  it('skips revalidation without throwing when ADMIN_URL_SEGMENT is unset', async () => {
    delete process.env.ADMIN_URL_SEGMENT;
    await expect(mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID)).resolves.toBeUndefined();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('does not convert a notFound() throw from requireAdmin into BOUNDED_ERROR (T-31-03-02)', async () => {
    class FakeNextNotFoundError extends Error {}
    requireAdminMock.mockRejectedValue(new FakeNextNotFoundError('NEXT_NOT_FOUND'));
    await expect(mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mergeCompanyPairMock).not.toHaveBeenCalled();
  });

  it('rejects invalid input (non-uuid pairId) with BOUNDED_ERROR before any merge-layer call', async () => {
    await expect(mergeCompanyPairAction('not-a-uuid', SURVIVOR_ID)).rejects.toThrow(BOUNDED_ERROR);
    expect(mergeCompanyPairMock).not.toHaveBeenCalled();
  });

  it.each(['already_resolved', 'survivor_not_in_pair', 'incomplete_repoint'] as const)(
    'collapses a %s result to BOUNDED_ERROR (T-31-03-03)',
    async (reason) => {
      mergeCompanyPairMock.mockResolvedValue({ ok: false, reason });
      await expect(mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID)).rejects.toThrow(BOUNDED_ERROR);
    },
  );

  it('never leaks a distinct error thrown by mergeCompanyPair verbatim to the caller', async () => {
    mergeCompanyPairMock.mockRejectedValue(new Error('db connection refused on host xyz.internal'));
    await expect(mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID)).rejects.toThrow(BOUNDED_ERROR);
    let caught: unknown;
    try {
      await mergeCompanyPairAction(PAIR_ID, SURVIVOR_ID);
    } catch (e) {
      caught = e;
    }
    expect((caught as Error).message).not.toContain('db connection refused');
  });
});

describe('keepPairSeparateAction', () => {
  it('calls requireAdmin before recordKeepSeparate (call-order assertion)', async () => {
    const order: string[] = [];
    requireAdminMock.mockImplementation(async () => {
      order.push('requireAdmin');
      return { session: SESSION };
    });
    recordKeepSeparateMock.mockImplementation(async () => {
      order.push('recordKeepSeparate');
      return OK_KEEP_SEPARATE_RESULT;
    });
    await keepPairSeparateAction(PAIR_ID);
    expect(order).toEqual(['requireAdmin', 'recordKeepSeparate']);
  });

  it('passes session.user.id as actorId', async () => {
    await keepPairSeparateAction(PAIR_ID);
    expect(recordKeepSeparateMock).toHaveBeenCalledWith({ pairId: PAIR_ID, actorId: 'admin-1' });
  });

  it('revalidates the review route path on success', async () => {
    await keepPairSeparateAction(PAIR_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith('/ops-secret/companies/review');
  });

  it('collapses an already_resolved result to BOUNDED_ERROR', async () => {
    recordKeepSeparateMock.mockResolvedValue({ ok: false, reason: 'already_resolved' });
    await expect(keepPairSeparateAction(PAIR_ID)).rejects.toThrow(BOUNDED_ERROR);
  });

  it('does not convert a notFound() throw from requireAdmin into BOUNDED_ERROR', async () => {
    requireAdminMock.mockRejectedValue(new Error('NEXT_NOT_FOUND'));
    await expect(keepPairSeparateAction(PAIR_ID)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(recordKeepSeparateMock).not.toHaveBeenCalled();
  });

  it('rejects invalid input (non-uuid pairId) with BOUNDED_ERROR before any merge-layer call', async () => {
    await expect(keepPairSeparateAction('not-a-uuid')).rejects.toThrow(BOUNDED_ERROR);
    expect(recordKeepSeparateMock).not.toHaveBeenCalled();
  });
});

describe('source guards', () => {
  const filePathPromise = (async () => {
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    return join(dirname(fileURLToPath(import.meta.url)), 'actions.ts');
  })();

  it('is a server action module (first line "use server";)', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(await filePathPromise, 'utf8');
    expect(source.split('\n')[0]).toBe("'use server';");
  });

  it('never imports requireRelationshipHolder', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(await filePathPromise, 'utf8');
    expect(source).not.toMatch(/requireRelationshipHolder/);
  });

  it('every `throw new Error(` call site throws BOUNDED_ERROR', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(await filePathPromise, 'utf8');
    const matches = [...source.matchAll(/throw new Error\(([^)]*)\)/g)].map((m) => m[1].trim());
    expect(matches.length).toBeGreaterThan(0);
    for (const arg of matches) {
      expect(arg).toBe('BOUNDED_ERROR');
    }
  });
});
