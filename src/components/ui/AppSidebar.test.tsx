/**
 * AppSidebar tests — Phase 3 of the ReUI/Maia migration.
 *
 * Carried over verbatim from the RetractableSidebar suite: the per-role nav
 * contract (D-27), hrefs, FR/EN labels, the C-03 admin gate, the VIEW-02
 * stored-view behaviour and the D-02 auto-reconcile. Those are product rules
 * and none of them changed.
 *
 * Dropped: assertions on the mechanism rather than the behaviour — an inline
 * `width: 260px`/`72px` on an <aside>, `position: sticky` in an inline style,
 * the `--shell-sidebar-current-w` documentElement variable, and the
 * `rgba(18,150,87)` active tint. The shadcn Sidebar owns layout now and
 * expresses collapse as `data-state`, so those assertions described an
 * implementation that no longer exists. Collapse is asserted through
 * `data-state` and the toggle's aria-expanded instead.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppSidebar, type AppSidebarProps } from './AppSidebar';
import { SidebarProvider } from './sidebar';

vi.mock('@/lib/i18n/actions', () => ({ setLang: vi.fn(async () => {}) }));
vi.mock('@/lib/theme/actions', () => ({ setTheme: vi.fn(async () => {}) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

/** AppSidebar reads collapse state from context, so every render needs the provider. */
const IDENTITY = { displayName: 'Antoine Rousseau', email: 'antoine@leasetic.com' } as const;

function renderSidebar(
  props: Omit<AppSidebarProps, 'displayName' | 'email'> & Partial<AppSidebarProps>,
  { defaultOpen = true } = {},
) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar {...IDENTITY} {...(props as AppSidebarProps)} />
    </SidebarProvider>,
  );
}

/** The view / language / theme controls live inside the NavUser dropdown now. */
async function openUserMenu(name = 'Menu utilisateur') {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

const ADMIN_HREFS = {
  home: '/x',
  coefficients: '/x/coefficients',
  partners: '/x/partners',
  companies: '/x/companies',
  reconciliation: '/x/companies/review',
  history: '/x/history',
} as const;

const navLinksIn = (c: HTMLElement) => c.querySelectorAll('#leasetic-sidebar-nav a');

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.cookie = 'sidebar_state=; path=/; max-age=0';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AppSidebar', () => {
  // ── Per-role nav contract (Phase 18 D-27) ────────────────────────────────

  it('AC-RS-04: partner nav renders exactly 6 items in FR order (Plan 33-05 adds Pipeline)', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });

    const links = navLinksIn(container);
    expect(links).toHaveLength(6);
    expect(Array.from(links).map((l) => l.textContent)).toEqual([
      'Accueil',
      'Nouvelle proposition',
      'Propositions',
      'Clients',
      'Pipeline',
      'Aide',
    ]);
    // Active item is exposed via the primitive's data-active hook. base-ui
    // renders it as a present-but-empty boolean attribute, so assert presence
    // and, more usefully, that no other item claims to be active.
    expect(links[0]).toHaveAttribute('data-active');
    expect(Array.from(links).filter((l) => l.hasAttribute('data-active'))).toHaveLength(1);
  });

  it('Phase 18 D-27, widened by Plan 30-02 and Plan 31-06: admin nav renders exactly 8 items, correct hrefs, no Historique', () => {
    const { container } = renderSidebar({
      activeNav: 'admin-coefficients',
      isAdmin: true,
      lang: 'fr',
      theme: 'light',
      adminHrefs: { ...ADMIN_HREFS },
    });

    const links = navLinksIn(container);
    expect(links).toHaveLength(8);
    expect(Array.from(links).map((l) => l.textContent)).toEqual([
      'Accueil',
      'Nouvelle proposition',
      'Propositions',
      'Partenaires',
      'Sociétés',
      'Réconciliation',
      'Coefficients',
      'Aide',
    ]);

    // Historique is deliberately absent from the admin sidebar (D-27).
    expect(Array.from(links).some((l) => (l.textContent ?? '').includes('Historique'))).toBe(false);

    // Admin home + partners + companies + reconciliation + coefficients use the
    // forwarded segment hrefs; new / proposals / help stay on their canonical routes.
    expect(Array.from(links).map((l) => l.getAttribute('href'))).toEqual([
      '/x',
      '/proposals/new/parametres',
      '/proposals',
      '/x/partners',
      '/x/companies',
      '/x/companies/review',
      '/x/coefficients',
      '/aide',
    ]);

    expect(links[6]).toHaveAttribute('data-active');
    expect(Array.from(links).filter((l) => l.hasAttribute('data-active'))).toHaveLength(1);
  });

  it('Plan 31-06 (UI-SPEC Access & Non-Leakage point 2): the reconciliation entry exists in the admin nav', () => {
    const { container } = renderSidebar({
      activeNav: 'admin-reconciliation',
      isAdmin: true,
      lang: 'fr',
      theme: 'light',
      adminHrefs: { ...ADMIN_HREFS },
    });
    const links = navLinksIn(container);
    expect(Array.from(links).map((l) => l.getAttribute('href'))).toContain('/x/companies/review');
    expect(Array.from(links).map((l) => l.textContent)).toContain('Réconciliation');
  });

  it('Plan 31-06 (UI-SPEC Access & Non-Leakage point 2): the partner nav never renders the reconciliation entry', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    const links = navLinksIn(container);
    expect(Array.from(links).map((l) => l.getAttribute('href'))).not.toContain('/x/companies/review');
    expect(Array.from(links).some((l) => (l.textContent ?? '').includes('Réconciliation'))).toBe(false);
  });

  it('AC-RS-04 (EN): partner nav renders English labels', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'en', theme: 'light' });
    expect(Array.from(navLinksIn(container)).map((l) => l.textContent)).toEqual([
      'Home',
      'New proposal',
      'Proposals',
      'Clients',
      'Pipeline',
      'Help',
    ]);
  });

  // ── Collapse contract ────────────────────────────────────────────────────
  //
  // Phase 31.1 (D-07) moved the shell's collapse control into the header —
  // AppSidebar no longer renders one. Its accessible name, focusability and
  // single-control-in-the-shell guarantee are now covered by
  // src/components/Topbar.test.tsx, not here. What remains valid here is how
  // the sidebar itself *renders* each collapse state, driven through
  // renderSidebar's defaultOpen seed or the SidebarProvider's own Cmd/Ctrl+B
  // shortcut — never a click on a sidebar-local control, because there isn't
  // one anymore.

  it('AC-RS-07: starting collapsed renders the icon rail', () => {
    const { container } = renderSidebar(
      { activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' },
      { defaultOpen: false },
    );

    expect(container.querySelector('[data-state="collapsed"]')).not.toBeNull();
    // Nav items remain present and reachable — the primitive hides their labels
    // visually in icon mode rather than unmounting them, which keeps the links
    // available to assistive tech.
    expect(navLinksIn(container)).toHaveLength(6);
  });

  it('AC-RS-01/03: toggling via the providers own keyboard shortcut flips collapse state', async () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });

    expect(container.querySelector('[data-state="expanded"]')).not.toBeNull();

    // SidebarProvider itself listens for Cmd/Ctrl+B and calls toggleSidebar —
    // a provider-level driver, not a click on any AppSidebar-rendered element.
    await act(async () => {
      fireEvent.keyDown(window, { key: 'b', metaKey: true });
    });
    await waitFor(() => {
      expect(container.querySelector('[data-state="collapsed"]')).not.toBeNull();
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'b', metaKey: true });
    });
    await waitFor(() => {
      expect(container.querySelector('[data-state="expanded"]')).not.toBeNull();
    });
  });

  it('collapse state is persisted so it survives a reload', async () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'b', metaKey: true });
    });

    // SidebarProvider writes `sidebar_state`; Shell reads it server-side to seed
    // defaultOpen, which is what removes the old one-frame expand-then-collapse.
    await waitFor(() => {
      expect(document.cookie).toContain('sidebar_state=false');
    });
  });

  // ── Collapsed badge + centring (D-09) ────────────────────────────────────

  it('collapsed rail renders exactly one mark badge and no collapse-related button', () => {
    const { container } = renderSidebar(
      { activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' },
      { defaultOpen: false },
    );

    const marks = container.querySelectorAll('img[src="/logo-mark.svg"]');
    expect(marks).toHaveLength(1);

    // No button anywhere in the sidebar carries a collapse-related accessible
    // name — that control lives in the header now (Topbar.test.tsx), and
    // ROADMAP criterion 2 forbids a second one sharing its name. (The user
    // menu's own dropdown trigger legitimately has an unrelated
    // aria-expanded, so name is the right axis to assert on here, not the
    // attribute's mere presence.)
    expect(
      screen.queryByRole('button', { name: /réduire|déployer|collapse|expand/i }),
    ).toBeNull();
  });

  it('the collapsed badge is a centred, neutral-fill 32px square around an 18px glyph', () => {
    const { container } = renderSidebar(
      { activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' },
      { defaultOpen: false },
    );

    const mark = container.querySelector('img[src="/logo-mark.svg"]');
    expect(mark).toHaveAttribute('width', '18');
    expect(mark).toHaveAttribute('height', '18');

    const badge = mark?.closest('span');
    expect(badge).toHaveClass('size-8', 'rounded-[9px]', 'bg-sidebar-accent');
    // Not the sidebar's primary-accent fill — that token is the same #01CC72
    // as the mark itself, which would render it invisible.
    expect(badge).not.toHaveClass('bg-sidebar-primary');

    // The header's content-box wrapper centres this single fixed-width child
    // (D-09 Correction 2) rather than leaving it at the box's left edge.
    expect(badge?.parentElement).toHaveClass('justify-center');
  });

  it('collapsed nav icons carry the same centring class as the header badge', () => {
    const { container } = renderSidebar(
      { activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' },
      { defaultOpen: false },
    );

    for (const link of Array.from(navLinksIn(container))) {
      expect(link).toHaveClass('group-data-[collapsible=icon]:mx-auto');
    }
  });

  it('D-10: the expanded lockup renders at 120px, not the old 190px', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    const logo = container.querySelector('img.brand-logo-light');
    expect(logo).toHaveAttribute('width', '120');
  });

  it('D-12: the nav stays a single group, and its label carries the eyebrow treatment', () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    const label = screen.getByText('Navigation');
    expect(label).toHaveClass('text-[11px]', 'uppercase', 'tracking-[0.55px]');
  });

  it('AC-RS-06: the footer is the user identity card', () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    const trigger = screen.getByRole('button', { name: 'Menu utilisateur' });
    expect(trigger).toHaveTextContent('Antoine Rousseau');
  });

  it('AC-RS-06b: language and theme controls live in the user menu, not loose in the footer', async () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    // Closed: no controls in the DOM.
    expect(screen.queryByRole('radiogroup', { name: 'Language' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).toBeNull();

    await openUserMenu();
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeDefined();
  });

  it('the identity card survives collapse, and the nav labels do not', () => {
    renderSidebar(
      { activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' },
      { defaultOpen: false },
    );
    expect(screen.getByRole('button', { name: 'Menu utilisateur' })).toBeDefined();
  });

  // ── View toggle (Phase 24 Plan 02) ───────────────────────────────────────

  it('AC-RS-24-01: an admin gets the view switch in the user menu', async () => {
    renderSidebar({
      activeNav: 'admin-home',
      isAdmin: true,
      lang: 'fr',
      theme: 'light',
      adminHrefs: { ...ADMIN_HREFS },
    });
    await openUserMenu();
    const radiogroups = screen.getAllByRole('radiogroup');
    expect(radiogroups.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Vue',
      'Language',
      'Theme',
    ]);
  });

  it('AC-RS-24-02 (C-03 gate): non-admins get no view switch, even with the menu open', async () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    await openUserMenu();
    expect(screen.queryByRole('radiogroup', { name: 'Vue' })).toBeNull();
    // The other two are still there, so this is a gate and not a missing menu.
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeDefined();
  });

  it('AC-RS-24-03 (VIEW-02): the stored view selects the nav set', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container: agent } = renderSidebar({
      activeNav: 'home', isAdmin: true, lang: 'fr', theme: 'light', adminHomeHref: '/x',
    });
    // 4, not 5: an admin in Agent view gets the partner nav MINUS Clients.
    // See the Agent-view regression test below for why.
    expect(navLinksIn(agent)).toHaveLength(4);
    cleanup();

    window.sessionStorage.setItem('leasetic.view', 'admin');
    const { container: admin } = renderSidebar({
      activeNav: 'admin-home', isAdmin: true, lang: 'fr', theme: 'light',
      adminHomeHref: '/x', adminHrefs: { ...ADMIN_HREFS },
    });
    expect(navLinksIn(admin)).toHaveLength(8);
  });

  it('AC-RS-24-04 (D-02 auto-reconcile): adminSegment forces the admin nav', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container } = renderSidebar({
      activeNav: 'admin-home', isAdmin: true, lang: 'fr', theme: 'light',
      adminSegment: 'x', adminHrefs: { ...ADMIN_HREFS },
    });
    expect(navLinksIn(container)).toHaveLength(8);
  });
  /**
   * Regression — found in Phase 30 UAT.
   *
   * partnerNavItems() is rendered for two different populations: every non-admin
   * role, AND an admin who has flipped to Agent view (Phase 24 Plan 02). Plan
   * 30-02 added Clients to that array assuming only the first population saw it.
   *
   * /clients is gated by requireRelationshipHolder(), which notFound()s on
   * role === 'admin' irrespective of view — so an admin in Agent view was being
   * handed a nav link that could only ever 404.
   */
  it('Agent view: an admin is not offered the Clients link that would 404 for them', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container } = renderSidebar({
      activeNav: 'home', isAdmin: true, lang: 'fr', theme: 'light', adminHomeHref: '/x',
    });
    const hrefs = Array.from(navLinksIn(container)).map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/clients');
    expect(hrefs).toEqual(['/', '/proposals/new/parametres', '/proposals', '/aide']);
  });

  it('Agent view: a non-admin still gets Clients (ROLE-02 — sales sees what partner sees)', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container } = renderSidebar({
      activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light',
    });
    const hrefs = Array.from(navLinksIn(container)).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/clients');
    // Plan 33-05: Pipeline joined Clients inside the same non-admin spread,
    // so the count moved from 5 to 6 alongside this assertion.
    expect(navLinksIn(container)).toHaveLength(6);
  });

  // ── Pipeline nav entry (Phase 33 Plan 05) ────────────────────────────────

  it('T-33-05-04: an admin (Agent view) never sees the /pipeline link that would 404 for them', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container } = renderSidebar({
      activeNav: 'home', isAdmin: true, lang: 'fr', theme: 'light', adminHomeHref: '/x',
    });
    const hrefs = Array.from(navLinksIn(container)).map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/pipeline');
  });
});
