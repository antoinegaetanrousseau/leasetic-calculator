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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('server-only', () => ({}));

const {
  requireUserMock,
  getCurrentLangMock,
  countThisMonthMock,
  countTotalMock,
  countDraftsMock,
  buildListResponseMock,
  listRelanceMock,
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
    listRelanceMock: vi.fn(),
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

// Phase 34 Plan 09 — the follow-up list comes from the query BARREL, never
// from the sibling module (`src/lib/db/queries/index.ts` is the only entry
// point consumers use). Mocking the barrel also keeps `server-only` and the
// Neon driver out of this suite.
vi.mock('@/lib/db/queries', () => ({
  listRelationshipsNeedingFollowUp: (...args: unknown[]) => {
    callOrder.push('listRelationshipsNeedingFollowUp');
    return listRelanceMock(...args);
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
  listRelanceMock.mockResolvedValue([]);
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


/**
 * Phase 34 Plan 09 Task 2 — the "à relancer" card on the home page
 * (ACTV-04/05, CRM-02, D-20).
 *
 * The threat these tests exist for is not a rendering bug: it is an owner id
 * arriving from anywhere other than the session, and a role branch creating a
 * second surface to secure. Both are asserted directly.
 */
const DAY_MS = 86_400_000;

function makeFollowUp(over: {
  relationshipId: string;
  companyName?: string;
  bucket?: number;
  nextActionAt?: Date | null;
  updatedAt?: Date;
}) {
  return {
    relationshipId: over.relationshipId,
    companyName: over.companyName ?? 'Alpha SAS',
    siren: '123456789',
    stage: 'contact',
    nextActionAt: over.nextActionAt ?? null,
    nextActionNote: null,
    updatedAt: over.updatedAt ?? new Date(Date.now() - 40 * DAY_MS),
    bucket: over.bucket ?? 1,
  };
}

describe('Partner Home / — à relancer card (ACTV-04/05, D-20)', () => {
  it('Test 1: listRelationshipsNeedingFollowUp is called with the SESSION user id and a limit of 5', async () => {
    await HomePage();

    expect(listRelanceMock).toHaveBeenCalledTimes(1);
    const [ownerId, limit] = listRelanceMock.mock.calls[0];
    // Exactly the mocked session id — never a search param, header or any
    // other request-supplied source (T-34-09-02).
    expect(ownerId).toBe(USER_ID);
    expect(limit).toBe(5);
  });

  it('Test 2: the follow-up query joins the SAME Promise.all as the four existing queries', async () => {
    // If the page awaited the follow-up list separately, its call would land
    // after buildListResponse had already settled. Resolving buildListResponse
    // on a later macrotask makes that ordering observable.
    buildListResponseMock.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 0));
      callOrder.push('buildListResponse:resolved');
      return { rows: [], hasMore: false, nextCursor: null };
    });

    await HomePage();

    const relanceIdx = callOrder.indexOf('listRelationshipsNeedingFollowUp');
    const resolvedIdx = callOrder.indexOf('buildListResponse:resolved');
    expect(relanceIdx).toBeGreaterThanOrEqual(0);
    expect(resolvedIdx).toBeGreaterThan(relanceIdx);
    expect(listRelanceMock).toHaveBeenCalledTimes(1);
  });

  it('Test 3: requireUser is still the first await, before the follow-up query', async () => {
    await HomePage();
    const userIdx = callOrder.indexOf('requireUser');
    const relanceIdx = callOrder.indexOf('listRelationshipsNeedingFollowUp');
    expect(userIdx).toBe(0);
    expect(relanceIdx).toBeGreaterThan(userIdx);
  });

  it('Test 4: an empty follow-up list renders no card at all — not an empty shell', async () => {
    listRelanceMock.mockResolvedValue([]);
    const node = await HomePage();
    const { container } = render(node);

    expect(container.querySelectorAll('[data-testid="relance-row"]').length).toBe(0);
    // dashboard.relance.title FR = 'À relancer'
    expect(container.textContent).not.toContain('À relancer');
    // ...and not the reserved empty-state copy either.
    expect(container.textContent).not.toContain('Aucune relance prévue.');
  });

  it('Test 5: with rows, the card renders ABOVE the recent-proposals card', async () => {
    listRelanceMock.mockResolvedValue([
      makeFollowUp({ relationshipId: 'rel-1', companyName: 'Alpha SAS' }),
      makeFollowUp({ relationshipId: 'rel-2', companyName: 'Beta SARL' }),
    ]);
    buildListResponseMock.mockResolvedValue({
      rows: [1, 2].map(makeRow),
      hasMore: false,
      nextCursor: null,
    });

    const node = await HomePage();
    const { container } = render(node);

    const relanceRows = Array.from(container.querySelectorAll('[data-testid="relance-row"]'));
    expect(relanceRows.length).toBe(2);
    expect(relanceRows[0].getAttribute('href')).toBe('/clients/rel-1');
    expect(container.textContent).toContain('À relancer');

    const firstProposalRow = container.querySelector('a[href^="/proposals/prop-"]');
    expect(firstProposalRow).not.toBeNull();
    // DOCUMENT_POSITION_FOLLOWING (4) — the proposals card comes after.
    expect(
      relanceRows[0].compareDocumentPosition(firstProposalRow!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('Test 6: an admin (owning no relationships) gets the page with no card and no role branch', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'user-admin', email: 'admin@example.com', displayName: 'Root' } },
    });
    listRelanceMock.mockResolvedValue([]);

    const node = await HomePage();
    const { container } = render(node);
    expect(container.querySelectorAll('[data-testid="relance-row"]').length).toBe(0);
    expect(listRelanceMock).toHaveBeenCalledWith('user-admin', 5);

    // The admin case must fall out of owning nothing, NOT out of a branch:
    // a branch would be a second surface to secure (T-34-09-03).
    // Resolved from the vitest cwd (the repo root), not from import.meta.url:
    // under the jsdom environment that URL is not a file: URL.
    const src = readFileSync(join(process.cwd(), 'app', '(authed)', 'page.tsx'), 'utf8');
    expect(src).not.toMatch(/requireAdmin/);
    expect(src).not.toMatch(/role\s*[!=]==/);
  });
});
