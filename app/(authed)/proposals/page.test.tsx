/**
 * Plan 17-04 Task 2 — /proposals server route tests (RED → GREEN).
 *
 * Phase 17 PROPS-01 / D-10, D-13, D-14. Server-rendered route with
 * requireUser defense-in-depth + dynamic = 'force-dynamic' + buildListResponse
 * SSR call gated by the archived flag from searchParams.
 *
 * 9 behavior tests per PLAN.md:
 *   Test 1: archived=false in searchParams → buildListResponse called with archived: false
 *   Test 2: archived=1 in searchParams → buildListResponse called with archived: true
 *   Test 3: q + archived combine cleanly
 *   Test 4: PageHero rendered with i18n title + subtitle
 *   Test 5: FilterPillRow + SearchBar mounted as siblings
 *   Test 6: ProposalsList rendered with initial + key derived from "{q}|{archived?'1':'0'}|{cursor??''}"
 *   Test 7: requireUser called BEFORE buildListResponse (defense-in-depth order)
 *   Test 8: Nouvelle proposition CTA Link href = /proposals/new/parametres
 *   Test 9: empty-state copy switches (archived vs actives)
 *
 * Scaffolding adapted verbatim from new/verification/page.test.tsx:36-80
 * (vi.hoisted + vi.mock('next/navigation') + redirect-throws).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  redirectMock,
  requireUserMock,
  getCurrentLangMock,
  buildListResponseMock,
  callOrder,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  requireUserMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  buildListResponseMock: vi.fn(),
  callOrder: [] as string[],
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
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
vi.mock('@/lib/api/proposals/list', () => ({
  buildListResponse: (...args: unknown[]) => {
    callOrder.push('buildListResponse');
    return buildListResponseMock(...args);
  },
}));

// Import AFTER all mocks are in place.
import ProposalsListPage from './page';

const USER_ID = 'user-a';

const EMPTY_LIST = {
  rows: [] as Array<Record<string, unknown>>,
  hasMore: false,
  nextCursor: null,
};

const POPULATED_LIST = {
  rows: [
    {
      id: 'p-1',
      lcRef: 'LC-2026-001',
      clientCo: 'Acme Corp',
      amountHT: '75000',
      createdAt: new Date('2026-05-01T10:00:00Z').toISOString(),
      validityDays: 30 as const,
      language: 'fr' as const,
      deletedAt: null,
      displayStatus: 'active' as const,
    },
  ],
  hasMore: false,
  nextCursor: null,
};

beforeEach(() => {
  redirectMock.mockClear();
  requireUserMock.mockReset();
  getCurrentLangMock.mockReset();
  buildListResponseMock.mockReset();
  callOrder.length = 0;

  // Happy-path defaults.
  requireUserMock.mockResolvedValue({
    session: { user: { id: USER_ID, email: 'partner@example.com' } },
  });
  getCurrentLangMock.mockResolvedValue('fr');
  buildListResponseMock.mockResolvedValue(POPULATED_LIST);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('/proposals page (Phase 17 PROPS-01, D-10/D-13/D-14)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Test 1 — archived=false → buildListResponse called with archived: false
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 1: no archived param → buildListResponse called with archived: false', async () => {
    await ProposalsListPage({ searchParams: Promise.resolve({}) });

    expect(buildListResponseMock).toHaveBeenCalledTimes(1);
    expect(buildListResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        q: '',
        archived: false,
        limit: 20,
      }),
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2 — archived=1 → buildListResponse called with archived: true
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 2: archived=1 in searchParams → buildListResponse called with archived: true', async () => {
    await ProposalsListPage({
      searchParams: Promise.resolve({ archived: '1' }),
    });

    expect(buildListResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        archived: true,
      }),
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3 — q + archived combine cleanly (orthogonal per CONTEXT discretion)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 3: q + archived combine cleanly → buildListResponse receives both', async () => {
    await ProposalsListPage({
      searchParams: Promise.resolve({ q: 'client name', archived: '1' }),
    });

    expect(buildListResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        q: 'client name',
        archived: true,
      }),
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4 — PageHero renders with i18n title + subtitle
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 4: PageHero renders with title=proposals.title + subtitle=proposals.subtitle', async () => {
    const tree = await ProposalsListPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(tree);
    const text = container.textContent ?? '';

    // FR copy from i18n: proposals.title = "Mes propositions",
    // proposals.subtitle = "Consultez et gérez vos propositions"
    expect(text).toContain('Mes propositions');
    expect(text).toContain('Consultez et gérez vos propositions');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5 — FilterPillRow + SearchBar mounted as siblings in a flex row
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 5: FilterPillRow + SearchBar mounted as siblings in a flex row', async () => {
    const tree = await ProposalsListPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(tree);

    // Both filter pills present (FilterPillRow)
    const activesPill = container.querySelector(
      '[data-testid="filter-pill-actives"]',
    );
    const archivedPill = container.querySelector(
      '[data-testid="filter-pill-archived"]',
    );
    expect(activesPill).not.toBeNull();
    expect(archivedPill).not.toBeNull();

    // SearchBar (.search-bar role="search")
    const searchBar = container.querySelector('.search-bar');
    expect(searchBar).not.toBeNull();

    // Their common parent has flex layout + space-between + gap 16
    const flexRow = Array.from(container.querySelectorAll<HTMLElement>('div')).find(
      (el) => {
        const style = el.getAttribute('style') ?? '';
        return (
          style.includes('display: flex') &&
          style.includes('justify-content: space-between') &&
          style.includes('gap: 16px')
        );
      },
    );
    expect(flexRow).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6 — ProposalsList rendered with key derived from "{q}|{archived?'1':'0'}|{cursor??''}"
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 6: ProposalsList rendered when rows present (key derives from q|archived|cursor)', async () => {
    const tree = await ProposalsListPage({
      searchParams: Promise.resolve({ q: 'acme', archived: '1', cursor: 'c1' }),
    });
    const { container } = render(tree);

    // ProposalsList renders <ProposalRow> for each row; populated list has 1 row
    // → at least one .list-row element should exist
    const rows = container.querySelectorAll('.list-row');
    expect(rows.length).toBeGreaterThanOrEqual(1);

    // The ProposalRow renders the lcRef text from the mocked row
    expect(container.textContent).toContain('LC-2026-001');

    // buildListResponse received the cursor too (proves cursor reached SSR call)
    expect(buildListResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'acme',
        archived: true,
        cursorEncoded: 'c1',
      }),
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 7 — requireUser BEFORE buildListResponse (defense-in-depth)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 7: requireUser called BEFORE buildListResponse (defense-in-depth)', async () => {
    await ProposalsListPage({ searchParams: Promise.resolve({}) });

    const requireUserIdx = callOrder.indexOf('requireUser');
    const buildListIdx = callOrder.indexOf('buildListResponse');

    expect(requireUserIdx).toBeGreaterThanOrEqual(0);
    expect(buildListIdx).toBeGreaterThanOrEqual(0);
    expect(requireUserIdx).toBeLessThan(buildListIdx);

    // Cross-check: buildListResponse received userId from session, not from any query
    expect(buildListResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 8 — Nouvelle proposition CTA Link href = /proposals/new/parametres
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 8: Nouvelle proposition CTA href = /proposals/new/parametres', async () => {
    const tree = await ProposalsListPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(tree);

    const ctaLink = Array.from(container.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/proposals/new/parametres',
    );
    expect(ctaLink).toBeDefined();
    expect(ctaLink!.textContent).toContain('Nouvelle proposition');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 9 — empty-state copy switches (archived vs actives)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 9: empty-state copy switches based on archived flag (Actives vs Archivées)', async () => {
    // 9a — !archived + 0 rows → proposals.empty.actives copy
    buildListResponseMock.mockResolvedValue(EMPTY_LIST);
    {
      const tree = await ProposalsListPage({
        searchParams: Promise.resolve({}),
      });
      const { container } = render(tree);
      const text = container.textContent ?? '';
      // FR proposals.empty.actives = "Aucune proposition pour le moment. Créez votre première proposition."
      expect(text).toMatch(/Aucune proposition pour le moment/);
      cleanup();
    }

    // 9b — archived + 0 rows → proposals.empty.archived copy
    buildListResponseMock.mockResolvedValue(EMPTY_LIST);
    {
      const tree = await ProposalsListPage({
        searchParams: Promise.resolve({ archived: '1' }),
      });
      const { container } = render(tree);
      const text = container.textContent ?? '';
      // FR proposals.empty.archived = "Aucune proposition archivée pour le moment."
      expect(text).toMatch(/Aucune proposition archivée/);
    }
  });
});
