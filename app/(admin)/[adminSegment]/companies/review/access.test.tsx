/**
 * Phase 31 — access boundary for the reconciliation review queue (D-11 / CRM-02).
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM page.test.tsx
 * `page.test.tsx` mocks `requireAdmin` to always SUCCEED, so it can exercise
 * rendering. That leaves the refusal path — by far the more important one —
 * untested at this layer. Phase 31's verification could only record the
 * authenticated-non-admin case as *operator-attested*: a human logged in as a
 * partner, hit the route, and reported a 404. Nothing reproduced it in CI, so
 * the phase closed at `human_needed` rather than `passed`.
 *
 * This file makes that check reproducible.
 *
 * WHY IT IS WORTH TESTING AT ALL, given require.test.ts already covers requireAdmin
 * Two holes that isolated coverage cannot see:
 *
 *   1. COMPOSITION. `requireAdmin()` refusing is only half the property. What
 *      CRM-02 actually requires is that a non-admin never reaches the DATA —
 *      a flagged pair frequently has its two sides held by different partners,
 *      so listing one to the wrong viewer leaks that someone else is working
 *      the other company. Proving the gate is called says nothing about
 *      whether the query below it ran.
 *
 *   2. HALT SEMANTICS. require.test.ts mocks `notFound` as `vi.fn()` — a no-op
 *      that does NOT throw. Real `notFound()` throws. Those tests therefore
 *      prove notFound was *called*, not that execution *stopped*. A refactor
 *      that called notFound() down a path which then kept going would keep
 *      every existing test green while silently serving the data. Here
 *      `notFound` throws, exactly as it does in production.
 *
 * The roles under test are the real membership of `users.role`: 'partner',
 * 'sales', plus an unknown string for the fail-closed case.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { notFoundMock, roleRef } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new (class extends Error {
      digest = 'NEXT_HTTP_ERROR_FALLBACK;404';
    })('NEXT_NOT_FOUND');
  }),
  roleRef: { current: 'admin' as string },
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

/**
 * Stands in for the real requireAdmin with its actual control flow:
 * `if (role !== 'admin') notFound();` — and because notFound throws here, the
 * refusal genuinely halts, as it does in production.
 */
const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return { ...actual, getCurrentLang: vi.fn(async () => 'fr') };
});

const { listPendingPairsForAdminMock } = vi.hoisted(() => ({
  listPendingPairsForAdminMock: vi.fn(async () => ({ rows: [], nextCursor: null })),
}));

vi.mock('@/lib/db/queries', () => ({
  listPendingPairsForAdmin: listPendingPairsForAdminMock,
}));

vi.mock('@/lib/reconcile/actions', () => ({
  mergeCompanyPairAction: vi.fn(),
  keepPairSeparateAction: vi.fn(),
}));

import ReconciliationReviewPage from './page';

const callPage = () =>
  ReconciliationReviewPage({
    params: Promise.resolve({ adminSegment: 'admin-secret' }),
    searchParams: Promise.resolve({}),
  });

beforeEach(() => {
  notFoundMock.mockClear();
  listPendingPairsForAdminMock.mockClear();
  requireAdminMock.mockReset();
  // Re-establish the real requireAdmin control flow for each test.
  requireAdminMock.mockImplementation(async () => {
    const { notFound } = await import('next/navigation');
    if (roleRef.current !== 'admin') {
      notFound();
    }
    return { session: { user: { id: 'admin-1' } } };
  });
});

afterEach(() => {
  roleRef.current = 'admin';
});

describe('review queue access boundary (D-11 / CRM-02)', () => {
  // The roles that must be refused. 'sales' matters specifically: it is neither
  // admin nor partner, and CRM-02 does not grant it cross-partner visibility.
  for (const role of ['partner', 'sales', 'some-unknown-future-role']) {
    it(`refuses role "${role}" — and never reaches the pair data`, async () => {
      roleRef.current = role;

      await expect(callPage()).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      });

      expect(notFoundMock).toHaveBeenCalled();
      // THE security assertion. Refusing is not enough — a flagged pair often
      // spans two partners, so the query must never have run for a non-admin.
      expect(listPendingPairsForAdminMock).not.toHaveBeenCalled();
    });
  }

  it('admins are served, and the pair query does run', async () => {
    roleRef.current = 'admin';
    await expect(callPage()).resolves.toBeTruthy();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(listPendingPairsForAdminMock).toHaveBeenCalled();
  });

  it('the refusal HALTS — notFound throwing must abort, not merely be recorded', async () => {
    // Guards the hole in require.test.ts, where notFound is a non-throwing
    // vi.fn(): a gate that calls notFound() but keeps executing would satisfy
    // "was it called?" while still serving the data. Assert the throw escapes.
    roleRef.current = 'partner';
    let threw = false;
    try {
      await callPage();
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(listPendingPairsForAdminMock).not.toHaveBeenCalled();
  });

  it('is not a 403 — refusal carries the 404 fallback, so the route cannot be probed for existence', async () => {
    // 30-SECURITY.md treats status-code divergence as an inference channel: a
    // 403 would confirm the route exists to someone not allowed to know that.
    roleRef.current = 'partner';
    const err = await callPage().catch((e: unknown) => e);
    expect(err).toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    expect(String((err as Error).message)).not.toMatch(/403|forbidden/i);
  });
});
