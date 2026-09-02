/**
 * Topbar tests — Phase 31.1 Plan 03.
 *
 * 31.1-PATTERNS.md flags no prior Topbar test exists; this file is the first.
 * `SidebarTrigger` calls `useSidebar()`, so every case renders `Topbar`
 * inside a `SidebarProvider` (the same idiom `AppSidebar.test.tsx` uses).
 * `TopbarBreadcrumb` calls `usePathname()`, so `next/navigation` is mocked
 * with a hoisted, per-test-configurable mock function.
 *
 * These cases are the load-bearing accessibility gate for Plan 31.1-06: that
 * plan deletes the in-sidebar chevron on the assumption that this header
 * control is already focusable and uniquely labelled. Case 3 in particular
 * must keep failing if a second control ever shares this accessible name.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Topbar } from './Topbar';
import { SidebarProvider } from './ui/sidebar';

const mockUsePathname = vi.hoisted(() => vi.fn(() => '/'));

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
}));

function renderTopbar(props: Parameters<typeof Topbar>[0]) {
  return render(
    <SidebarProvider defaultOpen>
      <Topbar {...props} />
    </SidebarProvider>,
  );
}

afterEach(() => {
  cleanup();
  mockUsePathname.mockReturnValue('/');
});

describe('Topbar — collapse control (D-07, UIC-10)', () => {
  it('announces the FR accessible name', () => {
    mockUsePathname.mockReturnValue('/');
    renderTopbar({ lang: 'fr' });
    expect(
      screen.getByRole('button', { name: 'Basculer la barre latérale' }),
    ).toBeInTheDocument();
  });

  it('announces the EN accessible name', () => {
    mockUsePathname.mockReturnValue('/');
    renderTopbar({ lang: 'en' });
    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument();
  });

  it('is the only control announcing this accessible name (ROADMAP criterion 2)', () => {
    mockUsePathname.mockReturnValue('/');
    renderTopbar({ lang: 'fr' });
    expect(
      screen.getAllByRole('button', { name: /basculer la barre latérale/i }),
    ).toHaveLength(1);
  });

  it('is a focusable button (tabIndex is not -1)', () => {
    mockUsePathname.mockReturnValue('/');
    renderTopbar({ lang: 'fr' });
    const toggle = screen.getByRole('button', { name: 'Basculer la barre latérale' });
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.tabIndex).not.toBe(-1);
  });
});

describe('Topbar — breadcrumb trail (D-04/D-06)', () => {
  it('renders a non-link current page and a linked parent on a 2-segment admin route', () => {
    mockUsePathname.mockReturnValue('/x/companies/review');
    renderTopbar({ lang: 'fr', adminSegment: 'x' });

    const currentPage = screen.getByText('Réconciliation');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
    expect(currentPage.tagName).not.toBe('A');

    const parentLink = screen.getByRole('link', { name: 'Sociétés' });
    expect(parentLink).toHaveAttribute('href', '/x/companies');
  });

  it('renders exactly one segment with no separator on a 1-segment route', () => {
    mockUsePathname.mockReturnValue('/proposals');
    renderTopbar({ lang: 'fr' });

    const currentPage = screen.getByText('Propositions');
    expect(currentPage).toHaveAttribute('aria-current', 'page');
    expect(currentPage.tagName).not.toBe('A');
    // BreadcrumbPage itself carries role="link" (aria-disabled, non-navigable)
    // per the primitive's own default — assert on real anchors instead.
    expect(currentPage.closest('nav')?.querySelectorAll('a')).toHaveLength(0);
    expect(currentPage.closest('nav')?.querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(0);
  });

  it('renders the EN labels on the same admin route (FR/EN parity)', () => {
    mockUsePathname.mockReturnValue('/x/companies/review');
    renderTopbar({ lang: 'en', adminSegment: 'x' });

    expect(screen.getByText('Reconciliation')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Companies' })).toHaveAttribute(
      'href',
      '/x/companies',
    );
  });
});

describe('Topbar — ADMIN badge (D-05)', () => {
  it('renders only when isAdmin is true, and is the last element in the header', () => {
    mockUsePathname.mockReturnValue('/');
    const { container: withoutAdmin } = renderTopbar({ lang: 'fr', isAdmin: false });
    expect(withoutAdmin.querySelector('header')?.textContent).not.toContain('ADMIN');
    cleanup();

    mockUsePathname.mockReturnValue('/');
    renderTopbar({ lang: 'fr', isAdmin: true });
    const header = screen.getByRole('button', { name: 'Basculer la barre latérale' }).closest(
      'header',
    );
    expect(header).not.toBeNull();
    const badge = screen.getByText('ADMIN');
    expect(header!.lastElementChild).toBe(badge);
  });
});
