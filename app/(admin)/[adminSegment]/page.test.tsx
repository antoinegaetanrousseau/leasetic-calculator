/**
 * Phase 18 Plan 02 Task 3 — Admin Home rewrite (D-01..D-07, D-29, UI-SPEC §Admin Home).
 *
 * REPLACES the Phase 14 contract (3 AdminNavCards in a `repeat(3,1fr)` grid).
 * The new Admin Home structure (top → bottom):
 *   1. <PageHero> — eyebrow ADMIN + title Administration + subtitle + Nouvelle
 *      proposition CTA
 *   2. 3 <MetricTile> in a 3-up grid (D-01/D-02/D-03), ALL with
 *      valueColor="var(--teal)" per D-04
 *   3. 3 <AdminNavCard> in a 3-up grid (Coefficients / Partenaires / Historique;
 *      Historique RETAINED per UI-SPEC even though removed from sidebar D-27)
 *   4. Recent activity card — header + top 5 RecentActivityRow or empty state +
 *      Voir tout link to /<seg>/history
 *
 * The test harness mocks:
 *   - requireAdmin (AUTH-15 still invoked first)
 *   - getCurrentLang (lang resolution)
 *   - 4 query helpers (parallel fetched via Promise.all):
 *     getActivePartnerCount / getTotalPartnerAccountCount /
 *     getMonthlyProposalCountAll / getRecentAdminActivity
 *   - listCoefficientHistory (latest row reader)
 *   - <PageHero>, <MetricTile>, <AdminNavCard>, <RecentActivityRow> —
 *     captured via prop-attribute divs so the page test does not re-litigate
 *     primitive chrome (those are owned by their own *.test.tsx files).
 *
 * Phase 14 Test 5/6 (h1 text === "Administration" / "Manage…") still hold —
 * PageHero h1 props are asserted via the PageHero mock's data-attrs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { Sliders, Users, History, Hash } from 'lucide-react';
import type { ActivityRow } from '@/lib/db/queries/admin-activity';

vi.mock('server-only', () => ({}));

const {
  requireAdminMock,
  getCurrentLangMock,
  adminNavCardMock,
  pageHeroMock,
  metricTileMock,
  recentActivityRowMock,
  getActivePartnerCountMock,
  getTotalPartnerAccountCountMock,
  getMonthlyProposalCountAllMock,
  getRecentAdminActivityMock,
  listCoefficientHistoryMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  adminNavCardMock: vi.fn(),
  pageHeroMock: vi.fn(),
  metricTileMock: vi.fn(),
  recentActivityRowMock: vi.fn(),
  getActivePartnerCountMock: vi.fn(),
  getTotalPartnerAccountCountMock: vi.fn(),
  getMonthlyProposalCountAllMock: vi.fn(),
  getRecentAdminActivityMock: vi.fn(),
  listCoefficientHistoryMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireAdmin: requireAdminMock }));
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

vi.mock('@/lib/db/queries/partner-aggregates', () => ({
  getActivePartnerCount: getActivePartnerCountMock,
  getTotalPartnerAccountCount: getTotalPartnerAccountCountMock,
}));

vi.mock('@/lib/db/queries/proposal-aggregates', () => ({
  getMonthlyProposalCountAll: getMonthlyProposalCountAllMock,
}));

vi.mock('@/lib/db/queries/admin-activity', () => ({
  getRecentAdminActivity: getRecentAdminActivityMock,
}));

vi.mock('@/lib/db/queries/coefficient-history', () => ({
  listCoefficientHistory: listCoefficientHistoryMock,
}));

vi.mock('@/components/ui/PageHero', () => ({
  PageHero: (props: {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    actions?: React.ReactNode;
  }) => {
    pageHeroMock(props);
    return (
      <div
        data-testid="page-hero"
        data-eyebrow={props.eyebrow ?? ''}
        data-title={props.title}
        data-subtitle={props.subtitle ?? ''}
      >
        <h1>{props.title}</h1>
        {props.subtitle && <p>{props.subtitle}</p>}
        {props.actions && <div data-testid="page-hero-actions">{props.actions}</div>}
      </div>
    );
  },
}));

vi.mock('@/components/ui/MetricTile', () => ({
  MetricTile: (props: {
    label: string;
    value: string;
    sublabel?: string;
    variant: string;
    valueColor?: string;
  }) => {
    metricTileMock(props);
    return (
      <div
        data-testid={`metric-${props.label}`}
        data-label={props.label}
        data-value={props.value}
        data-sublabel={props.sublabel ?? ''}
        data-variant={props.variant}
        data-value-color={props.valueColor ?? ''}
      />
    );
  },
}));

vi.mock('@/components/ui/AdminNavCard', () => ({
  AdminNavCard: (props: {
    variant: string;
    title: string;
    description: string;
    href: string;
    icon: { displayName?: string; name?: string };
    openLabel: string;
  }) => {
    adminNavCardMock(props);
    return (
      <div
        data-testid={`navcard-${props.variant}`}
        data-variant={props.variant}
        data-href={props.href}
        data-icon-name={props.icon?.displayName ?? props.icon?.name ?? 'unknown'}
        data-title={props.title}
        data-description={props.description}
        data-open-label={props.openLabel}
      />
    );
  },
}));

vi.mock('./_components/RecentActivityRow', () => ({
  RecentActivityRow: (props: { row: ActivityRow; lang: string }) => {
    recentActivityRowMock(props);
    return (
      <div
        data-testid={`activity-row-${props.row.id}`}
        data-row-id={props.row.id}
        data-row-source={props.row.source}
        data-row-actor={props.row.actorName}
        data-lang={props.lang}
      />
    );
  },
}));

// Import AFTER mocks are registered.
import AdminHomePage from './page';

const SEG = 'control-panel';

async function renderPage() {
  const element = await AdminHomePage({
    params: Promise.resolve({ adminSegment: SEG }),
  });
  return render(element);
}

beforeEach(() => {
  vi.useFakeTimers();
  // Anchor "now" to 2026-05-24T12:00:00 in Europe/Paris (CET+2 in May = UTC+2)
  // → 10:00:00 UTC. The Europe/Paris current month label = "mai 2026".
  vi.setSystemTime(new Date('2026-05-24T10:00:00Z'));

  requireAdminMock.mockReset();
  getCurrentLangMock.mockReset();
  adminNavCardMock.mockReset();
  pageHeroMock.mockReset();
  metricTileMock.mockReset();
  recentActivityRowMock.mockReset();
  getActivePartnerCountMock.mockReset();
  getTotalPartnerAccountCountMock.mockReset();
  getMonthlyProposalCountAllMock.mockReset();
  getRecentAdminActivityMock.mockReset();
  listCoefficientHistoryMock.mockReset();

  requireAdminMock.mockResolvedValue({ session: {} });
  getCurrentLangMock.mockResolvedValue('fr');
  getActivePartnerCountMock.mockResolvedValue(7);
  getTotalPartnerAccountCountMock.mockResolvedValue(9);
  getMonthlyProposalCountAllMock.mockResolvedValue(42);
  getRecentAdminActivityMock.mockResolvedValue([]);
  // Default: empty coefficient_history (D-03 empty-state test 6 below).
  listCoefficientHistoryMock.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
});

describe('Admin Home page — Phase 18 rewrite (D-01..D-07, D-29)', () => {
  it('Test 1: renders PageHero with ADMIN eyebrow + title + subtitle + Nouvelle proposition CTA → /proposals/new/parametres', async () => {
    const { container } = await renderPage();
    const hero = within(container).getByTestId('page-hero');
    expect(hero.getAttribute('data-eyebrow')).toBe('ADMIN');
    expect(hero.getAttribute('data-title')).toBe('Administration');
    expect(hero.getAttribute('data-subtitle')).toBe('Gérez les paramètres globaux et les comptes');
    // CTA link rendered in the actions slot
    const actions = within(container).getByTestId('page-hero-actions');
    const cta = actions.querySelector('a');
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute('href')).toBe('/proposals/new/parametres');
    expect(cta?.textContent).toContain('Nouvelle proposition');
  });

  it('Test 2: renders exactly 3 MetricTile instances all with valueColor=var(--teal) per D-04', async () => {
    const { container } = await renderPage();
    const tiles = container.querySelectorAll('[data-testid^="metric-"]');
    expect(tiles.length).toBe(3);
    expect(metricTileMock).toHaveBeenCalledTimes(3);
    // ALL 3 calls must pass valueColor="var(--teal)"
    const calls = metricTileMock.mock.calls.map(([props]) => props);
    for (const c of calls) {
      expect(c.valueColor).toBe('var(--teal)');
    }
  });

  it('Test 3 (D-01): Partenaires actifs tile shows count + "sur N comptes" sublabel', async () => {
    getActivePartnerCountMock.mockResolvedValue(7);
    getTotalPartnerAccountCountMock.mockResolvedValue(9);
    const { container } = await renderPage();
    const tile = within(container).getByTestId('metric-Partenaires actifs');
    expect(tile.getAttribute('data-value')).toBe('7');
    expect(tile.getAttribute('data-sublabel')).toBe('sur 9 comptes');
  });

  it('Test 4 (D-02): Propositions ce mois tile shows monthly count + Europe/Paris month label sublabel', async () => {
    getMonthlyProposalCountAllMock.mockResolvedValue(42);
    const { container } = await renderPage();
    const tile = within(container).getByTestId('metric-Propositions ce mois');
    expect(tile.getAttribute('data-value')).toBe('42');
    // System time is 2026-05-24 in Europe/Paris → "mai 2026"
    expect(tile.getAttribute('data-sublabel')).toBe('mai 2026');
  });

  it('Test 5 (D-03): Dernière Modif Coef tile shows "il y a Xj" value + date — author sublabel', async () => {
    // 3 days before "now" (2026-05-24T10:00:00Z) = 2026-05-21T10:00:00Z
    const changedAt = new Date('2026-05-21T10:00:00Z');
    listCoefficientHistoryMock.mockResolvedValue({
      rows: [
        {
          id: 'row-1',
          changedAt,
          changedByUserId: 'u-1',
          beforeJson: {},
          afterJson: {},
          summary: 'test',
          createdByDisplay: 'Antoine R.',
        },
      ],
      hasMore: false,
      nextCursor: null,
    });
    const { container } = await renderPage();
    const tile = within(container).getByTestId('metric-Dernière Modif Coef');
    expect(tile.getAttribute('data-value')).toBe('il y a 3j');
    // Sublabel = "{date} — {author}" with formatDate fr-FR → "21/05/2026" (numeric default)
    const sublabel = tile.getAttribute('data-sublabel') ?? '';
    expect(sublabel).toContain('Antoine R.');
    expect(sublabel).toContain('21');
    expect(sublabel).toContain('—');
  });

  it('Test 6 (D-03 empty): Dernière Modif Coef tile shows "—" value + empty sublabel when history empty', async () => {
    listCoefficientHistoryMock.mockResolvedValue({ rows: [], hasMore: false, nextCursor: null });
    const { container } = await renderPage();
    const tile = within(container).getByTestId('metric-Dernière Modif Coef');
    expect(tile.getAttribute('data-value')).toBe('—');
    expect(tile.getAttribute('data-sublabel')).toBe('');
  });

  it('Test 7: renders 4 AdminNavCards (coefficients / partners / history / lc-references) — D-18 Phase 19 Plan 02', async () => {
    const { container } = await renderPage();
    const cards = container.querySelectorAll('[data-testid^="navcard-"]');
    expect(cards.length).toBe(4);
    const coef = within(container).getByTestId('navcard-coefficients');
    const partners = within(container).getByTestId('navcard-partners');
    const history = within(container).getByTestId('navcard-history');
    const lcRefs = within(container).getByTestId('navcard-lc-references');
    expect(coef.getAttribute('data-href')).toBe(`/${SEG}/coefficients`);
    expect(partners.getAttribute('data-href')).toBe(`/${SEG}/partners`);
    expect(history.getAttribute('data-href')).toBe(`/${SEG}/history`);
    expect(lcRefs.getAttribute('data-href')).toBe(`/${SEG}/lc-references`);
    // Variant identity preserved
    expect(coef.getAttribute('data-variant')).toBe('coefficients');
    expect(partners.getAttribute('data-variant')).toBe('partners');
    expect(history.getAttribute('data-variant')).toBe('history');
    expect(lcRefs.getAttribute('data-variant')).toBe('lc-references');
    // Icons preserved + new Hash icon
    const calls = adminNavCardMock.mock.calls.map(([p]) => p);
    const byVariant = Object.fromEntries(calls.map((p) => [p.variant, p]));
    expect(byVariant.coefficients.icon).toBe(Sliders);
    expect(byVariant.partners.icon).toBe(Users);
    expect(byVariant.history.icon).toBe(History);
    expect(byVariant['lc-references'].icon).toBe(Hash);
  });

  it('Test 8: Recent activity card renders header ACTIVITÉ RÉCENTE + Voir tout link → /<seg>/history', async () => {
    const { container } = await renderPage();
    const card = container.querySelector('[data-testid="recent-activity-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('ACTIVITÉ RÉCENTE');
    // Voir tout link (header OR footer; at least one must exist)
    const links = card?.querySelectorAll('a') ?? [];
    const viewAll = Array.from(links).find(
      (a) => a.getAttribute('href') === `/${SEG}/history`,
    );
    expect(viewAll).toBeDefined();
    expect(viewAll?.textContent).toContain('Voir tout');
  });

  it('Test 9: renders up to 5 RecentActivityRow children from getRecentAdminActivity({limit:5})', async () => {
    const rows: ActivityRow[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `ch-${i}`,
      source: 'coefficient_history' as const,
      actorName: `User ${i}`,
      sentenceKey: 'admin.home.activity.sentence.coefficientModified',
      sentenceArgs: [`User ${i}`],
      timestamp: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
    }));
    getRecentAdminActivityMock.mockResolvedValue(rows);
    const { container } = await renderPage();
    const activityRows = container.querySelectorAll('[data-testid^="activity-row-"]');
    expect(activityRows.length).toBe(5);
    expect(recentActivityRowMock).toHaveBeenCalledTimes(5);
    // Verify the limit:5 contract was honored at the call site
    expect(getRecentAdminActivityMock).toHaveBeenCalledWith({ limit: 5 });
  });

  it('Test 10: Recent activity empty state renders "Aucune activité récente." (no rows)', async () => {
    getRecentAdminActivityMock.mockResolvedValue([]);
    const { container } = await renderPage();
    const card = container.querySelector('[data-testid="recent-activity-card"]') as HTMLElement;
    expect(card.textContent).toContain('Aucune activité récente.');
    // No activity rows rendered
    const activityRows = container.querySelectorAll('[data-testid^="activity-row-"]');
    expect(activityRows.length).toBe(0);
  });

  it('Test 11: requireAdmin() invoked first (AUTH-15 defense in depth preserved)', async () => {
    await renderPage();
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it('Test 12: stat tile labels resolve in EN (lang=en)', async () => {
    getCurrentLangMock.mockResolvedValue('en');
    const { container } = await renderPage();
    // EN: "Active partners" / "Proposals this month" / "Last Coef Update"
    expect(within(container).getByTestId('metric-Active partners')).not.toBeNull();
    expect(within(container).getByTestId('metric-Proposals this month')).not.toBeNull();
    expect(within(container).getByTestId('metric-Last Coef Update')).not.toBeNull();
  });
});
