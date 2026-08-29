import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RetractableSidebar } from './RetractableSidebar';

// Mock the server actions invoked by inner LocaleToggle / ThemeToggle when the user
// interacts with sidebar bottom controls. We don't need them to do anything in jsdom.
vi.mock('@/lib/i18n/actions', () => ({
  setLang: vi.fn(async () => {}),
}));
vi.mock('@/lib/theme/actions', () => ({
  setTheme: vi.fn(async () => {}),
}));
// Mock next/navigation for ViewToggle (router.push calls on view switch)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.style.removeProperty('--shell-sidebar-current-w');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RetractableSidebar', () => {
  // ── Phase 18 D-27 — Per-role nav contract ──────────────────────────────────
  // Admin sidebar: 6 items [Accueil, Nouvelle proposition, Propositions,
  // Partenaires, Coefficients, Aide]. Historique REMOVED (moved to Admin
  // Home AdminNavCard + Recent activity "Voir tout" link).
  // Partner sidebar: 4 items [Accueil, Nouvelle proposition, Propositions,
  // Aide]. Partenaires + Coefficients NOT present.

  it('AC-RS-04 / Phase 18 D-27: partner nav renders exactly 4 items in FR order [Accueil, Nouvelle proposition, Propositions, Aide]', () => {
    const { container } = render(
      <RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />,
    );

    const navUl = container.querySelector('#leasetic-sidebar-nav');
    expect(navUl).not.toBeNull();
    const navLinks = navUl!.querySelectorAll('a');
    expect(navLinks).toHaveLength(4);
    expect(navLinks[0].textContent).toContain('Accueil');
    expect(navLinks[1].textContent).toContain('Nouvelle proposition');
    expect(navLinks[2].textContent).toContain('Propositions');
    expect(navLinks[3].textContent).toContain('Aide');

    // Active item (Accueil = home) has green-tint background
    const activeStyle = navLinks[0].getAttribute('style') ?? '';
    expect(activeStyle).toMatch(/rgba\(18,\s*150,\s*87/);
  });

  it('Phase 18 D-27: admin nav renders exactly 6 items in FR order [Accueil, Nouvelle proposition, Propositions, Partenaires, Coefficients, Aide] — Historique NOT in sidebar', () => {
    const { container } = render(
      <RetractableSidebar
        activeNav="admin-coefficients"
        isAdmin={true}
        lang="fr"
        theme="light"
        adminHrefs={{
          home: '/x',
          coefficients: '/x/coefficients',
          partners: '/x/partners',
          history: '/x/history',
        }}
      />,
    );

    const navUl = container.querySelector('#leasetic-sidebar-nav');
    const navLinks = navUl!.querySelectorAll('a');
    expect(navLinks).toHaveLength(6);
    expect(navLinks[0].textContent).toContain('Accueil');
    expect(navLinks[1].textContent).toContain('Nouvelle proposition');
    expect(navLinks[2].textContent).toContain('Propositions');
    expect(navLinks[3].textContent).toContain('Partenaires');
    expect(navLinks[4].textContent).toContain('Coefficients');
    expect(navLinks[5].textContent).toContain('Aide');

    // Historique is REMOVED from admin sidebar (D-27)
    const allLabels = Array.from(navLinks).map((l) => l.textContent ?? '');
    expect(allLabels.some((l) => l.includes('Historique'))).toBe(false);

    // hrefs forwarded — admin home uses adminHrefs.home; partners + coefficients
    // forwarded; new + proposals + help go to canonical routes (NOT adminSegment).
    expect(navLinks[0]).toHaveAttribute('href', '/x');
    expect(navLinks[1]).toHaveAttribute('href', '/proposals/new/parametres');
    expect(navLinks[2]).toHaveAttribute('href', '/proposals');
    expect(navLinks[3]).toHaveAttribute('href', '/x/partners');
    expect(navLinks[4]).toHaveAttribute('href', '/x/coefficients');
    expect(navLinks[5]).toHaveAttribute('href', '/aide');

    // Coefficients is active (green tint)
    const activeStyle = navLinks[4].getAttribute('style') ?? '';
    expect(activeStyle).toMatch(/rgba\(18,\s*150,\s*87/);
  });

  it('AC-RS-04 (EN) / Phase 18 D-27: partner nav renders English labels — 4 items', () => {
    const { container } = render(
      <RetractableSidebar activeNav="home" isAdmin={false} lang="en" theme="light" />,
    );
    const navLinks = container.querySelectorAll('#leasetic-sidebar-nav a');
    expect(navLinks).toHaveLength(4);
    expect(navLinks[0].textContent).toContain('Home');
    expect(navLinks[1].textContent).toContain('New proposal');
    expect(navLinks[2].textContent).toContain('Proposals');
    expect(navLinks[3].textContent).toContain('Help');
  });

  it('AC-RS-11: chevron button has aria-expanded="true" + FR collapse aria-label on initial expanded render', () => {
    render(<RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />);

    const chevron = screen.getByRole('button', { name: 'Réduire le menu' });
    expect(chevron).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-RS-11 (EN aria-label): chevron uses English collapse label when lang="en"', () => {
    render(<RetractableSidebar activeNav="home" isAdmin={false} lang="en" theme="light" />);

    const chevron = screen.getByRole('button', { name: 'Collapse menu' });
    expect(chevron).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-RS-06: expanded state renders the Language and Theme radiogroups, both full width', () => {
    render(<RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />);
    const radiogroups = screen.getAllByRole('radiogroup');
    expect(radiogroups).toHaveLength(2);
    expect(radiogroups.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Language',
      'Theme',
    ]);
    // Phase 2: fullWidth moved from an inline `width: 100%` to the `w-full`
    // utility when these toggles were migrated off inline styles. Assert the
    // full-width layout contract, not the mechanism that delivers it.
    for (const group of radiogroups) {
      expect(group.className).toContain('w-full');
      expect(group.className).toContain('flex');
      expect(group.className).not.toContain('inline-flex');
    }
  });

  it('AC-RS-12: outer <aside> has sticky positioning + height 100vh + var(--surface) + border-right', () => {
    const { container } = render(
      <RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />,
    );
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    const style = aside!.getAttribute('style') ?? '';
    expect(style).toMatch(/position:\s*sticky/);
    expect(style).toMatch(/top:\s*0/);
    expect(style).toMatch(/height:\s*100vh/);
    expect(style).toMatch(/background:\s*var\(--surface\)/);
    expect(style).toMatch(/border-right:\s*1px solid var\(--border\)/);
  });

  it('AC-RS-01/AC-RS-07: localStorage="collapsed" on mount → width 72px and labels hidden', async () => {
    window.localStorage.setItem('leasetic.sidebar.collapsed', 'collapsed');

    const { container } = render(
      <RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />,
    );

    // useEffect runs after mount — wait for collapsed state
    await waitFor(() => {
      const aside = container.querySelector('aside') as HTMLElement;
      expect(aside.getAttribute('style') ?? '').toMatch(/width:\s*72px/);
    });

    // Labels are not rendered in collapsed state
    expect(screen.queryByText('Accueil')).toBeNull();
    expect(screen.queryByText('Nouvelle proposition')).toBeNull();

    // documentElement CSS variable also set
    expect(document.documentElement.style.getPropertyValue('--shell-sidebar-current-w'))
      .toBe('72px');
  });

  // ── Phase 24 Plan 02 — View-toggle + effectiveView tests ─────────────────

  it('AC-RS-24-01: admin expanded footer renders 3 radiogroups (ViewToggle + Locale + Theme)', () => {
    render(
      <RetractableSidebar
        activeNav="admin-home"
        isAdmin={true}
        lang="fr"
        theme="light"
        adminHrefs={{ home: '/x', coefficients: '/x/coefficients', partners: '/x/partners', history: '/x/history' }}
      />,
    );
    const radiogroups = screen.getAllByRole('radiogroup');
    expect(radiogroups).toHaveLength(3);
    // First radiogroup is ViewToggle (aria-label="Vue")
    expect(radiogroups[0]).toHaveAttribute('aria-label', 'Vue');
  });

  it('AC-RS-24-02 (C-03 gate): isAdmin=false ⇒ no ViewToggle radiogroup ("Vue" absent)', () => {
    render(<RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />);
    expect(screen.queryByRole('radiogroup', { name: 'Vue' })).toBeNull();
  });

  it('AC-RS-24-03 (VIEW-02 agent view): stored view=agent ⇒ 4-item partner nav; stored view=admin ⇒ 6-item admin nav', () => {
    // Agent view: 4 items
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container: c1 } = render(
      <RetractableSidebar
        activeNav="home"
        isAdmin={true}
        lang="fr"
        theme="light"
        adminHomeHref="/x"
      />,
    );
    expect(c1.querySelectorAll('#leasetic-sidebar-nav a')).toHaveLength(4);
    cleanup();

    // Admin view: 6 items
    window.sessionStorage.setItem('leasetic.view', 'admin');
    const { container: c2 } = render(
      <RetractableSidebar
        activeNav="admin-home"
        isAdmin={true}
        lang="fr"
        theme="light"
        adminHomeHref="/x"
        adminHrefs={{ home: '/x', coefficients: '/x/coefficients', partners: '/x/partners', history: '/x/history' }}
      />,
    );
    expect(c2.querySelectorAll('#leasetic-sidebar-nav a')).toHaveLength(6);
  });

  it('AC-RS-24-04 (D-02 auto-reconcile): adminSegment present + stored view=agent ⇒ 6-item admin nav', () => {
    window.sessionStorage.setItem('leasetic.view', 'agent');
    const { container } = render(
      <RetractableSidebar
        activeNav="admin-home"
        isAdmin={true}
        lang="fr"
        theme="light"
        adminSegment="x"
        adminHrefs={{ home: '/x', coefficients: '/x/coefficients', partners: '/x/partners', history: '/x/history' }}
      />,
    );
    // adminSegment present ⇒ effectiveView='admin' ⇒ admin nav despite stored 'agent'
    expect(container.querySelectorAll('#leasetic-sidebar-nav a')).toHaveLength(6);
  });

  it('AC-RS-01/AC-RS-03: clicking chevron toggles width, writes localStorage, writes --shell-sidebar-current-w', async () => {
    const { container } = render(
      <RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />,
    );

    const aside = container.querySelector('aside') as HTMLElement;
    expect(aside.getAttribute('style') ?? '').toMatch(/width:\s*260px/);

    const chevron = screen.getByRole('button', { name: 'Réduire le menu' });
    await act(async () => {
      fireEvent.click(chevron);
    });

    // Now collapsed
    await waitFor(() => {
      expect(aside.getAttribute('style') ?? '').toMatch(/width:\s*72px/);
    });
    expect(window.localStorage.getItem('leasetic.sidebar.collapsed')).toBe('collapsed');
    expect(document.documentElement.style.getPropertyValue('--shell-sidebar-current-w'))
      .toBe('72px');

    // Click again (now finds "Déployer le menu" since collapsed)
    const expandBtn = screen.getByRole('button', { name: 'Déployer le menu' });
    await act(async () => {
      fireEvent.click(expandBtn);
    });
    await waitFor(() => {
      expect(aside.getAttribute('style') ?? '').toMatch(/width:\s*260px/);
    });
    expect(window.localStorage.getItem('leasetic.sidebar.collapsed')).toBe('expanded');
    expect(document.documentElement.style.getPropertyValue('--shell-sidebar-current-w'))
      .toBe('260px');
  });
});
