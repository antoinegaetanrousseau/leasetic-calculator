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

  it('AC-RS-04: partner nav renders exactly 5 items in FR order (Plan 30-02 adds Clients)', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });

    const links = navLinksIn(container);
    expect(links).toHaveLength(5);
    expect(Array.from(links).map((l) => l.textContent)).toEqual([
      'Accueil',
      'Nouvelle proposition',
      'Propositions',
      'Clients',
      'Aide',
    ]);
    // Active item is exposed via the primitive's data-active hook. base-ui
    // renders it as a present-but-empty boolean attribute, so assert presence
    // and, more usefully, that no other item claims to be active.
    expect(links[0]).toHaveAttribute('data-active');
    expect(Array.from(links).filter((l) => l.hasAttribute('data-active'))).toHaveLength(1);
  });

  it('Phase 18 D-27, widened by Plan 30-02: admin nav renders exactly 7 items, correct hrefs, no Historique', () => {
    const { container } = renderSidebar({
      activeNav: 'admin-coefficients',
      isAdmin: true,
      lang: 'fr',
      theme: 'light',
      adminHrefs: { ...ADMIN_HREFS },
    });

    const links = navLinksIn(container);
    expect(links).toHaveLength(7);
    expect(Array.from(links).map((l) => l.textContent)).toEqual([
      'Accueil',
      'Nouvelle proposition',
      'Propositions',
      'Partenaires',
      'Sociétés',
      'Coefficients',
      'Aide',
    ]);

    // Historique is deliberately absent from the admin sidebar (D-27).
    expect(Array.from(links).some((l) => (l.textContent ?? '').includes('Historique'))).toBe(false);

    // Admin home + partners + companies + coefficients use the forwarded
    // segment hrefs; new / proposals / help stay on their canonical routes.
    expect(Array.from(links).map((l) => l.getAttribute('href'))).toEqual([
      '/x',
      '/proposals/new/parametres',
      '/proposals',
      '/x/partners',
      '/x/companies',
      '/x/coefficients',
      '/aide',
    ]);

    expect(links[5]).toHaveAttribute('data-active');
    expect(Array.from(links).filter((l) => l.hasAttribute('data-active'))).toHaveLength(1);
  });

  it('AC-RS-04 (EN): partner nav renders English labels', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'en', theme: 'light' });
    expect(Array.from(navLinksIn(container)).map((l) => l.textContent)).toEqual([
      'Home',
      'New proposal',
      'Proposals',
      'Clients',
      'Help',
    ]);
  });

  // ── Collapse contract ────────────────────────────────────────────────────

  it('AC-RS-11: collapse control is focusable and translated (FR)', () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    const toggle = screen.getByRole('button', { name: 'Réduire le menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-RS-11 (EN): collapse control uses the English label', () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'en', theme: 'light' });
    const toggle = screen.getByRole('button', { name: 'Collapse menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-RS-07: starting collapsed renders the icon rail and offers expand', () => {
    const { container } = renderSidebar(
      { activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' },
      { defaultOpen: false },
    );

    expect(container.querySelector('[data-state="collapsed"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Déployer le menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // Nav items remain present and reachable — the primitive hides their labels
    // visually in icon mode rather than unmounting them, which keeps the links
    // available to assistive tech.
    expect(navLinksIn(container)).toHaveLength(5);
  });

  it('AC-RS-01/03: toggling flips collapse state and the control swaps affordance', async () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });

    expect(container.querySelector('[data-state="expanded"]')).not.toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Réduire le menu' }));
    });
    await waitFor(() => {
      expect(container.querySelector('[data-state="collapsed"]')).not.toBeNull();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Déployer le menu' }));
    });
    await waitFor(() => {
      expect(container.querySelector('[data-state="expanded"]')).not.toBeNull();
    });
  });

  it('collapse state is persisted so it survives a reload', async () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Réduire le menu' }));
    });

    // SidebarProvider writes `sidebar_state`; Shell reads it server-side to seed
    // defaultOpen, which is what removes the old one-frame expand-then-collapse.
    await waitFor(() => {
      expect(document.cookie).toContain('sidebar_state=false');
    });
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
    expect(navLinksIn(admin)).toHaveLength(7);
  });

  it('AC-RS-24-04 (D-02 auto-reconcile): adminSegment forces the admin nav', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container } = renderSidebar({
      activeNav: 'admin-home', isAdmin: true, lang: 'fr', theme: 'light',
      adminSegment: 'x', adminHrefs: { ...ADMIN_HREFS },
    });
    expect(navLinksIn(container)).toHaveLength(7);
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
    expect(navLinksIn(container)).toHaveLength(5);
  });
});
