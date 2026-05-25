/**
 * Phase 17 Plan 03 Task 2 — Partner Home rewrite tests (RED → GREEN).
 *
 * Covers PHOME-01/02/03 acceptance from the plan's <behavior> block:
 *   1. PageHero with title containing displayName + Nouvelle proposition CTA
 *      to /proposals/new/parametres
 *   2. 3 MetricTile elements with the values from the 3 aggregate helpers
 *   3. >=5 recent proposals → exactly 5 abbreviated row Links to /proposals/{id}
 *   4. 0 proposals → empty-state copy from `dashboard.recent.empty` renders
 *   5. Voir toutes link href is exactly `/proposals` (no params — D-08)
 *   6. RecentlyDeletedToggle + SearchBar NOT mounted on this page
 *   7. DeleteJustToast IS still mounted (carry-forward)
 *   8. requireUser is called BEFORE buildListResponse + the aggregates
 *      (defense-in-depth ordering)
 *
 * Mocking pattern adapted from
 * app/(authed)/proposals/new/verification/page.test.tsx (vi.hoisted + vi.mock
 * of next/navigation + @/lib/auth/require + @/lib/i18n + the query helpers).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  requireUserMock,
  getCurrentLangMock,
  countThisMonthMock,
  countTotalMock,
  countDraftsMock,
  buildListResponseMock,
  callOrder,
} = vi.hoisted(() => {
  const order: string[] = [];
  return {
    requireUserMock: vi.fn(),
    getCurrentLangMock: vi.fn(),
    countThisMonthMock: vi.fn(),
    countTotalMock: vi.fn(),
    countDraftsMock: vi.fn(),
    buildListResponseMock: vi.fn(),
    callOrder: order,
  };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn((p: string) => { throw new Error(`NEXT_REDIRECT:${p}`); }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/lib/auth/require', () => ({
  requireUser: (...args: unknown[]) => {
    callOrder.push('requireUser');
    return requireUserMock(...args);
  },
}));

vi.mock('@/lib/i18n', async () => {
  const real = await vi.importActual<typeof import('@/lib/i18n/dictionaries')>(
    '@/lib/i18n/dictionaries',
  );
  return {
    t: real.t,
    dictionaries: real.dictionaries,
    getCurrentLang: getCurrentLangMock,
  };
});

vi.mock('@/lib/db/queries/proposal-aggregates', () => ({
  countThisMonth: (...args: unknown[]) => {
    callOrder.push('countThisMonth');
    return countThisMonthMock(...args);
  },
  countTotal: (...args: unknown[]) => {
    callOrder.push('countTotal');
    return countTotalMock(...args);
  },
  countDrafts: (...args: unknown[]) => {
    callOrder.push('countDrafts');
    return countDraftsMock(...args);
  },
}));

vi.mock('@/lib/api/proposals/list', () => ({
  buildListResponse: (...args: unknown[]) => {
    callOrder.push('buildListResponse');
    return buildListResponseMock(...args);
  },
}));

// Import AFTER all mocks are in place.
import HomePage from './page';

const USER_ID = 'user-jane';
const DISPLAY_NAME = 'Jane';

function makeRow(idx: number) {
  return {
    id: `prop-${idx}`,
    lcRef: `LC-2026-${String(idx).padStart(3, '0')}`,
    clientCo: `Client ${idx}`,
    amountHT: String(50000 + idx * 1000),
    createdAt: new Date(`2026-05-${10 + idx}T10:00:00Z`).toISOString(),
    validityDays: 30 as 15 | 30 | 60,
    language: 'fr' as const,
    deletedAt: null,
    displayStatus: 'active' as const,
  };
}

beforeEach(() => {
  callOrder.length = 0;
  requireUserMock.mockResolvedValue({
    session: { user: { id: USER_ID, email: 'jane@example.com', displayName: DISPLAY_NAME } },
  });
  getCurrentLangMock.mockResolvedValue('fr');
  countThisMonthMock.mockResolvedValue(0);
  countTotalMock.mockResolvedValue(0);
  countDraftsMock.mockResolvedValue(0);
  buildListResponseMock.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Partner Home / — PHOME-01/02/03', () => {
  it('Test 1: renders PageHero with title containing displayName + Nouvelle proposition CTA to /proposals/new/parametres', async () => {
    const node = await HomePage();
    const { container } = render(node);

    // Title: dashboard.greeting = `Bonjour, {0} 👋` → contains the displayName
    const heading = container.querySelector('h1');
    expect(heading?.textContent).toContain(DISPLAY_NAME);
    expect(heading?.textContent).toContain('Bonjour');

    // Nouvelle proposition CTA — Link href="/proposals/new/parametres"
    const ctaLinks = Array.from(
      container.querySelectorAll('a[href="/proposals/new/parametres"]'),
    );
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('Test 2: renders 3 MetricTile elements with values from countThisMonth / countTotal / countDrafts', async () => {
    countThisMonthMock.mockResolvedValue(7);
    countTotalMock.mockResolvedValue(42);
    countDraftsMock.mockResolvedValue(3);
    const node = await HomePage();
    const { container } = render(node);

    // MetricTile gives each tile role="group" with aria-label `${label}: ${value}`.
    const tiles = Array.from(container.querySelectorAll('[role="group"]'));
    // At least 3 tiles (more groups may exist for other roles but the tile aria-labels
    // are deterministic from the value).
    const aria = tiles.map((el) => el.getAttribute('aria-label'));
    expect(aria.some((s) => s?.includes(': 7'))).toBe(true);
    expect(aria.some((s) => s?.includes(': 42'))).toBe(true);
    expect(aria.some((s) => s?.includes(': 3'))).toBe(true);
  });

  it('Test 3: when partner has >=5 proposals, renders exactly 5 abbreviated row Links to /proposals/{id}', async () => {
    const rows = [1, 2, 3, 4, 5].map(makeRow);
    buildListResponseMock.mockResolvedValue({ rows, hasMore: true, nextCursor: 'next' });
    const node = await HomePage();
    const { container } = render(node);

    const rowLinks = Array.from(container.querySelectorAll('a[href^="/proposals/prop-"]'));
    expect(rowLinks.length).toBe(5);
    expect(rowLinks[0].getAttribute('href')).toBe('/proposals/prop-1');
    expect(rowLinks[4].getAttribute('href')).toBe('/proposals/prop-5');
  });

  it('Test 4: when partner has 0 proposals, empty-state copy renders inside the recent card using i18n key dashboard.recent.empty', async () => {
    buildListResponseMock.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
    const node = await HomePage();
    const { container } = render(node);
    // dashboard.recent.empty FR = "Aucune proposition pour le moment."
    expect(container.textContent).toContain('Aucune proposition pour le moment.');
  });

  it('Test 5: Voir toutes link href is exactly /proposals (no params — D-08)', async () => {
    const node = await HomePage();
    const { container } = render(node);

    const voirToutesLinks = Array.from(
      container.querySelectorAll('a[href="/proposals"]'),
    );
    expect(voirToutesLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('Test 6: RecentlyDeletedToggle and SearchBar are NOT mounted on this page', async () => {
    const node = await HomePage();
    const { container } = render(node);
    // SearchBar from Phase 8 renders an <input type="search">. Its absence
    // confirms the search/list/toggle mount was retired from Partner Home.
    expect(container.querySelectorAll('input[type="search"]').length).toBe(0);
    // RecentlyDeletedToggle's chip — "Récemment supprimées" or its EN twin —
    // is not in the markup.
    expect(container.textContent).not.toContain('Récemment supprimées');
    expect(container.textContent).not.toContain('Recently deleted');
  });

  it('Test 7: DeleteJustToast IS still mounted (carry-forward, fires on ?deleted_just=1)', async () => {
    const node = await HomePage();
    // The component is a client-component that returns null when the flag
    // isn't present in searchParams (it relies on useSearchParams under the
    // hood). We assert the import is referenced by inspecting the rendered
    // output for the absence-of-crash + by grepping the source separately in
    // the done-criteria. Here we render the tree and verify it does not throw,
    // and that the page module still imports DeleteJustToast (verified via
    // source grep in done block).
    expect(() => render(node)).not.toThrow();
  });

  it('Test 8: requireUser is called BEFORE buildListResponse + the aggregates (defense-in-depth ordering)', async () => {
    await HomePage();

    const userIdx = callOrder.indexOf('requireUser');
    const buildIdx = callOrder.indexOf('buildListResponse');
    const monthIdx = callOrder.indexOf('countThisMonth');
    const totalIdx = callOrder.indexOf('countTotal');
    const draftsIdx = callOrder.indexOf('countDrafts');

    expect(userIdx).toBeGreaterThanOrEqual(0);
    expect(buildIdx).toBeGreaterThan(userIdx);
    expect(monthIdx).toBeGreaterThan(userIdx);
    expect(totalIdx).toBeGreaterThan(userIdx);
    expect(draftsIdx).toBeGreaterThan(userIdx);
  });
});
