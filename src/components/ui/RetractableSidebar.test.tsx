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

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.style.removeProperty('--shell-sidebar-current-w');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RetractableSidebar', () => {
  it('AC-RS-04: expanded partner nav renders 4 nav links in FR order with active green-tint on Accueil', () => {
    const { container } = render(
      <RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />,
    );

    // 4 partner nav links in order
    const navUl = container.querySelector('#leasetic-sidebar-nav');
    expect(navUl).not.toBeNull();
    const navLinks = navUl!.querySelectorAll('a');
    expect(navLinks).toHaveLength(4);
    expect(navLinks[0].textContent).toContain('Accueil');
    expect(navLinks[1].textContent).toContain('Nouvelle proposition');
    expect(navLinks[2].textContent).toContain('Historique');
    expect(navLinks[3].textContent).toContain('Aide');

    // Active item (Accueil = home) has green-tint background
    const activeStyle = navLinks[0].getAttribute('style') ?? '';
    expect(activeStyle).toMatch(/rgba\(18,\s*150,\s*87/);
  });

  it('AC-RS-05: admin nav requires adminHrefs — renders 4 admin links with active Coefficients', () => {
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
    expect(navLinks).toHaveLength(4);
    expect(navLinks[0].textContent).toContain('Tableau de bord');
    expect(navLinks[1].textContent).toContain('Coefficients');
    expect(navLinks[2].textContent).toContain('Partenaires');
    expect(navLinks[3].textContent).toContain('Historique');

    // hrefs forwarded from adminHrefs prop
    expect(navLinks[0]).toHaveAttribute('href', '/x');
    expect(navLinks[1]).toHaveAttribute('href', '/x/coefficients');
    expect(navLinks[2]).toHaveAttribute('href', '/x/partners');
    expect(navLinks[3]).toHaveAttribute('href', '/x/history');

    // Coefficients is active (green tint)
    const activeStyle = navLinks[1].getAttribute('style') ?? '';
    expect(activeStyle).toMatch(/rgba\(18,\s*150,\s*87/);
  });

  it('AC-RS-04 (EN): partner nav renders English labels', () => {
    const { container } = render(
      <RetractableSidebar activeNav="home" isAdmin={false} lang="en" theme="light" />,
    );
    const navLinks = container.querySelectorAll('#leasetic-sidebar-nav a');
    expect(navLinks).toHaveLength(4);
    expect(navLinks[0].textContent).toContain('Home');
    expect(navLinks[1].textContent).toContain('New proposal');
    expect(navLinks[2].textContent).toContain('History');
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

  it('AC-RS-06: expanded state renders 2 role="radiogroup" elements (LocaleToggle + ThemeToggle, fullWidth)', () => {
    render(<RetractableSidebar activeNav="home" isAdmin={false} lang="fr" theme="light" />);
    const radiogroups = screen.getAllByRole('radiogroup');
    expect(radiogroups).toHaveLength(2);
    // First radiogroup is Language, second is Theme — both should be fullWidth (className contains 'flex' not 'inline-flex')
    expect(radiogroups[0].className).toContain('flex');
    expect(radiogroups[0].className).not.toContain('inline-flex');
    expect(radiogroups[1].className).toContain('flex');
    expect(radiogroups[1].className).not.toContain('inline-flex');
    // And width: 100% on the wrapper
    expect(radiogroups[0].getAttribute('style') ?? '').toMatch(/width:\s*100%/);
    expect(radiogroups[1].getAttribute('style') ?? '').toMatch(/width:\s*100%/);
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
