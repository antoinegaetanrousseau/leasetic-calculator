/**
 * Phase 31 Plan 06 Task 2 — review/page.tsx tests.
 *
 * The page is a server component that fans out:
 *   - requireAdmin()  (auth gate, FIRST — AUTH-15 defense in depth, T-31-06-01)
 *   - listPendingPairsForAdmin({ cursor })
 *
 * and renders:
 *   - PageHero (title + subtitle, no `actions` prop — no page-level CTA)
 *   - PairReviewList (with rows + cursor props)
 *
 * Coverage:
 *   1. requireAdmin() is called before listPendingPairsForAdmin (T-31-06-01).
 *   2. PageHero renders with admin.reconciliation.page.title, no actions slot.
 *   3. searchParams.cursor is passed through to listPendingPairsForAdmin.
 *   4. force-dynamic is set (grep-checked at file level, not here).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(async () => ({ session: { user: { id: 'admin-1' } } })),
}));

vi.mock('@/lib/auth/require', () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock('@/lib/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/i18n')>();
  return {
    ...actual,
    getCurrentLang: vi.fn(async () => 'fr'),
  };
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

beforeEach(() => {
  requireAdminMock.mockClear();
  listPendingPairsForAdminMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('review/page.tsx — Task 2', () => {
  it('Test 1: requireAdmin() is called before listPendingPairsForAdmin (T-31-06-01)', async () => {
    await ReconciliationReviewPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    expect(requireAdminMock).toHaveBeenCalled();
    expect(listPendingPairsForAdminMock).toHaveBeenCalled();
    const requireOrder = requireAdminMock.mock.invocationCallOrder[0];
    const listOrder = listPendingPairsForAdminMock.mock.invocationCallOrder[0];
    expect(requireOrder).toBeLessThan(listOrder);
  });

  it('Test 2: renders PageHero with admin.reconciliation.page.title and no actions slot', async () => {
    const tree = await ReconciliationReviewPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    expect(html).toContain('File de réconciliation');
    expect(html).not.toContain('data-slot="page-hero-actions"');
  });

  it('Test 3: passes searchParams.cursor through to listPendingPairsForAdmin', async () => {
    await ReconciliationReviewPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({ cursor: 'abc123' }),
    });
    expect(listPendingPairsForAdminMock).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: 'abc123' }),
    );
  });

  it('Test 4: renders the empty/success state when zero pairs are pending', async () => {
    const tree = await ReconciliationReviewPage({
      params: Promise.resolve({ adminSegment: 'admin-secret' }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToString(tree);
    expect(html).toContain('Aucune paire à examiner.');
  });
});
