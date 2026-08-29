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
function renderSidebar(props: AppSidebarProps, { defaultOpen = true } = {}) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar {...props} />
    </SidebarProvider>,
  );
}

const ADMIN_HREFS = {
  home: '/x',
  coefficients: '/x/coefficients',
  partners: '/x/partners',
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

  it('AC-RS-04: partner nav renders exactly 4 items in FR order', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });

    const links = navLinksIn(container);
    expect(links).toHaveLength(4);
    expect(Array.from(links).map((l) => l.textContent)).toEqual([
      'Accueil',
      'Nouvelle proposition',
      'Propositions',
      'Aide',
    ]);
    // Active item is exposed via the primitive's data-active hook. base-ui
    // renders it as a present-but-empty boolean attribute, so assert presence
    // and, more usefully, that no other item claims to be active.
    expect(links[0]).toHaveAttribute('data-active');
    expect(Array.from(links).filter((l) => l.hasAttribute('data-active'))).toHaveLength(1);
  });

  it('Phase 18 D-27: admin nav renders exactly 6 items, correct hrefs, no Historique', () => {
    const { container } = renderSidebar({
      activeNav: 'admin-coefficients',
      isAdmin: true,
      lang: 'fr',
      theme: 'light',
      adminHrefs: { ...ADMIN_HREFS },
    });

    const links = navLinksIn(container);
    expect(links).toHaveLength(6);
    expect(Array.from(links).map((l) => l.textContent)).toEqual([
      'Accueil',
      'Nouvelle proposition',
      'Propositions',
      'Partenaires',
      'Coefficients',
      'Aide',
    ]);

    // Historique is deliberately absent from the admin sidebar (D-27).
    expect(Array.from(links).some((l) => (l.textContent ?? '').includes('Historique'))).toBe(false);

    // Admin home + partners + coefficients use the forwarded segment hrefs;
    // new / proposals / help stay on their canonical routes.
    expect(Array.from(links).map((l) => l.getAttribute('href'))).toEqual([
      '/x',
      '/proposals/new/parametres',
      '/proposals',
      '/x/partners',
      '/x/coefficients',
      '/aide',
    ]);

    expect(links[4]).toHaveAttribute('data-active');
    expect(Array.from(links).filter((l) => l.hasAttribute('data-active'))).toHaveLength(1);
  });

  it('AC-RS-04 (EN): partner nav renders English labels', () => {
    const { container } = renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'en', theme: 'light' });
    expect(Array.from(navLinksIn(container)).map((l) => l.textContent)).toEqual([
      'Home',
      'New proposal',
      'Proposals',
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
    expect(navLinksIn(container)).toHaveLength(4);
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

  it('AC-RS-06: the expanded footer renders the Language and Theme toggles full width', () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    const groups = screen.getAllByRole('radiogroup');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['Language', 'Theme']);
    for (const group of groups) {
      expect(group.className).toContain('w-full');
      expect(group.className).not.toContain('inline-flex');
    }
  });

  it('the footer toggles are not rendered in the collapsed rail', () => {
    renderSidebar(
      { activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' },
      { defaultOpen: false },
    );
    expect(screen.queryByRole('radiogroup', { name: 'Language' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).toBeNull();
  });

  // ── View toggle (Phase 24 Plan 02) ───────────────────────────────────────

  it('AC-RS-24-01: admin footer renders 3 radiogroups, ViewToggle first', () => {
    renderSidebar({
      activeNav: 'admin-home',
      isAdmin: true,
      lang: 'fr',
      theme: 'light',
      adminHrefs: { ...ADMIN_HREFS },
    });
    const radiogroups = screen.getAllByRole('radiogroup');
    expect(radiogroups).toHaveLength(3);
    expect(radiogroups[0]).toHaveAttribute('aria-label', 'Vue');
  });

  it('AC-RS-24-02 (C-03 gate): non-admins get no ViewToggle', () => {
    renderSidebar({ activeNav: 'home', isAdmin: false, lang: 'fr', theme: 'light' });
    expect(screen.queryByRole('radiogroup', { name: 'Vue' })).toBeNull();
  });

  it('AC-RS-24-03 (VIEW-02): the stored view selects the nav set', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container: agent } = renderSidebar({
      activeNav: 'home', isAdmin: true, lang: 'fr', theme: 'light', adminHomeHref: '/x',
    });
    expect(navLinksIn(agent)).toHaveLength(4);
    cleanup();

    window.sessionStorage.setItem('leasetic.view', 'admin');
    const { container: admin } = renderSidebar({
      activeNav: 'admin-home', isAdmin: true, lang: 'fr', theme: 'light',
      adminHomeHref: '/x', adminHrefs: { ...ADMIN_HREFS },
    });
    expect(navLinksIn(admin)).toHaveLength(6);
  });

  it('AC-RS-24-04 (D-02 auto-reconcile): adminSegment forces the admin nav', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container } = renderSidebar({
      activeNav: 'admin-home', isAdmin: true, lang: 'fr', theme: 'light',
      adminSegment: 'x', adminHrefs: { ...ADMIN_HREFS },
    });
    expect(navLinksIn(container)).toHaveLength(6);
  });
});
