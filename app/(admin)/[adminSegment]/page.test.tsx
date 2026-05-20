/**
 * Plan 14-03 — Admin home page tests (RED → GREEN).
 *
 * Asserts the v1.2 design contract per D-13..D-16:
 *   - Exactly 3 <AdminNavCard> instances render in a 3-column grid.
 *   - Variants: 'coefficients', 'partners', 'history' (in that visual order).
 *   - Icons: Sliders, Users, History (lucide-react component references).
 *   - Hrefs: /<seg>/coefficients, /<seg>/partners, /<seg>/history.
 *   - h1 + subtitle resolved via admin.home.title / admin.home.subtitle.
 *   - requireAdmin() invoked at the top (AUTH-15 defense in depth).
 *
 * The test harness mocks <AdminNavCard> to capture props as DOM data-attributes,
 * which avoids re-running the Phase 11 variant-chrome assertions (those are owned
 * by AdminNavCard.test.tsx) and keeps assertions focused on the page's wiring.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { requireAdminMock, getCurrentLangMock, adminNavCardMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  adminNavCardMock: vi.fn(),
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

// Mock <AdminNavCard> so the page test does not re-litigate Phase 11 chrome.
// Capture every prop on a data-testid'd <div> so we can assert wiring.
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

// Import AFTER mocks are registered.
import AdminHomePage from './page';

beforeEach(() => {
  requireAdminMock.mockReset();
  getCurrentLangMock.mockReset();
  adminNavCardMock.mockReset();
  requireAdminMock.mockResolvedValue(undefined);
  getCurrentLangMock.mockResolvedValue('fr');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const SEG = 'control-panel';

async function renderPage() {
  const element = await AdminHomePage({
    params: Promise.resolve({ adminSegment: SEG }),
  });
  return render(element);
}

describe('Admin home page (D-13..D-16)', () => {
  it('Test 1: renders exactly 3 <AdminNavCard> instances', async () => {
    const { container } = await renderPage();
    const cards = container.querySelectorAll('[data-testid^="navcard-"]');
    expect(cards.length).toBe(3);
    expect(adminNavCardMock).toHaveBeenCalledTimes(3);
  });

  it('Test 2: each card has the correct href (/<seg>/coefficients, /partners, /history)', async () => {
    const { container } = await renderPage();
    const coef = within(container).getByTestId('navcard-coefficients');
    const partners = within(container).getByTestId('navcard-partners');
    const history = within(container).getByTestId('navcard-history');
    expect(coef.getAttribute('data-href')).toBe(`/${SEG}/coefficients`);
    expect(partners.getAttribute('data-href')).toBe(`/${SEG}/partners`);
    expect(history.getAttribute('data-href')).toBe(`/${SEG}/history`);
  });

  it('Test 3: each card has the correct variant prop (coefficients|partners|history)', async () => {
    const { container } = await renderPage();
    expect(within(container).getByTestId('navcard-coefficients').getAttribute('data-variant')).toBe(
      'coefficients',
    );
    expect(within(container).getByTestId('navcard-partners').getAttribute('data-variant')).toBe(
      'partners',
    );
    expect(within(container).getByTestId('navcard-history').getAttribute('data-variant')).toBe(
      'history',
    );
  });

  it('Test 4: each card has the correct lucide icon (Sliders|Users|History)', async () => {
    const { container } = await renderPage();
    expect(
      within(container).getByTestId('navcard-coefficients').getAttribute('data-icon-name'),
    ).toBe('Sliders');
    expect(within(container).getByTestId('navcard-partners').getAttribute('data-icon-name')).toBe(
      'Users',
    );
    expect(within(container).getByTestId('navcard-history').getAttribute('data-icon-name')).toBe(
      'History',
    );
  });

  it('Test 5: h1 + subtitle render admin.home.title / admin.home.subtitle (FR)', async () => {
    const { container } = await renderPage();
    const h1 = container.querySelector('h1');
    expect(h1?.textContent).toBe('Administration');
    // Subtitle directly follows h1; UI-SPEC §5.5 + §6.1 — FR copy
    const subtitle = container.querySelector('p');
    expect(subtitle?.textContent).toBe('Gérez les paramètres globaux et les comptes');
  });

  it('Test 6: subtitle resolves admin.home.subtitle in EN', async () => {
    getCurrentLangMock.mockResolvedValue('en');
    const { container } = await renderPage();
    const subtitle = container.querySelector('p');
    expect(subtitle?.textContent).toBe('Manage global parameters and accounts');
  });

  it('Test 7: openLabel === admin.nav.open ("Ouvrir →") in FR', async () => {
    const { container } = await renderPage();
    expect(
      within(container).getByTestId('navcard-coefficients').getAttribute('data-open-label'),
    ).toBe('Ouvrir →');
    expect(within(container).getByTestId('navcard-partners').getAttribute('data-open-label')).toBe(
      'Ouvrir →',
    );
    expect(within(container).getByTestId('navcard-history').getAttribute('data-open-label')).toBe(
      'Ouvrir →',
    );
  });

  it('Test 8: card titles + descriptions resolve from admin.nav.* (FR)', async () => {
    const { container } = await renderPage();
    const coef = within(container).getByTestId('navcard-coefficients');
    expect(coef.getAttribute('data-title')).toBe('Coefficients & commission');
    expect(coef.getAttribute('data-description')).toBe('Éditez les paramètres globaux');
    const partners = within(container).getByTestId('navcard-partners');
    expect(partners.getAttribute('data-title')).toBe('Partenaires');
    expect(partners.getAttribute('data-description')).toBe('Gérez les comptes partenaires');
    const history = within(container).getByTestId('navcard-history');
    expect(history.getAttribute('data-title')).toBe('Historique');
    expect(history.getAttribute('data-description')).toBe('Historique des coefficients');
  });

  it('Test 9: requireAdmin() invoked at the top (AUTH-15 defense in depth)', async () => {
    await renderPage();
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it('Test 10: 3-column grid wrapper has gridTemplateColumns repeat(3, 1fr) + maxWidth 1040', async () => {
    const { container } = await renderPage();
    // The grid wrapper is the immediate parent of the first navcard div.
    const firstCard = container.querySelector('[data-testid="navcard-coefficients"]');
    const grid = firstCard?.parentElement as HTMLDivElement;
    expect(grid).not.toBeNull();
    const style = grid.getAttribute('style') ?? '';
    expect(style).toMatch(/display:\s*grid/);
    expect(style).toMatch(/grid-template-columns:\s*repeat\(3,\s*1fr\)/);
    expect(style).toMatch(/max-width:\s*1040px/);
    expect(style).toMatch(/gap:\s*24px/);
  });
});
