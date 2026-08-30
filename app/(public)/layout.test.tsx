/**
 * Phase 15 — public-layout BrandLogo swap test (PUB-01, PUB-02).
 *
 * Tests the shared `(public)` layout server component after the v1.1 plain-text
 * "Leasétic" header is replaced by the Phase 11 `<BrandLogo>` SVG component.
 *
 * Implementation note (first-of-kind in this codebase):
 *   PublicLayout is an async React Server Component. Vitest + jsdom cannot
 *   simply `render(<PublicLayout />)` because the JSX expression resolves
 *   to a Promise. The pattern used here:
 *     1. Mock `@/lib/i18n` (server-only cookies()/headers() dependency).
 *     2. Await the layout function directly: `const ui = await PublicLayout({ children })`.
 *     3. Pass the resolved JSX to RTL's `render(ui)`.
 *   Future planners adding tests for `(authed)` or `(admin)` async server
 *   layouts can follow this same recipe.
 */
import type { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// Mock @/lib/i18n BEFORE importing PublicLayout — server-only cookies() runtime
// is not available in jsdom; stubs resolve synchronously enough for testing.
vi.mock('@/lib/i18n', () => ({
  getCurrentLang: async () => 'fr',
  getCurrentTheme: async () => 'light',
  t: (key: string) => {
    if (key === 'sidebar.brand') return 'Leasétic';
    if (key === 'shell.footer.copyright') return '© Leasétic 2026';
    if (key === 'shell.footer.privacy') return 'Mentions légales';
    return key;
  },
}));

// Mock the toggle components — they consume cookies/server context we do not
// need to exercise for the BrandLogo swap test.
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => (
    <button type="button" data-testid="theme-toggle">
      theme
    </button>
  ),
}));
vi.mock('@/components/LocaleToggle', () => ({
  LocaleToggle: () => (
    <button type="button" data-testid="locale-toggle">
      locale
    </button>
  ),
}));

import PublicLayout from './layout';

afterEach(() => cleanup());

async function renderPublicLayout(children: ReactNode = <div data-testid="child" />) {
  const ui = (await PublicLayout({ children })) as ReactElement;
  return render(ui);
}

describe('app/(public)/layout — Phase 15 BrandLogo swap (PUB-01, PUB-02)', () => {
  it('AC-15-BL-01: renders <BrandLogo> with .public-page-logo className in the public layout', async () => {
    const { container } = await renderPublicLayout();

    const brandWrapper = container.querySelector('span.brand-logo.public-page-logo');
    expect(brandWrapper).not.toBeNull();

    const imgs = brandWrapper?.querySelectorAll('img');
    expect(imgs).toHaveLength(2);

    const lightImg = brandWrapper?.querySelector('img.brand-logo-light');
    const darkImg = brandWrapper?.querySelector('img.brand-logo-dark');
    expect(lightImg).not.toBeNull();
    expect(darkImg).not.toBeNull();
    expect(lightImg).toHaveAttribute('src', '/logo-light.svg');
    expect(darkImg).toHaveAttribute('src', '/logo-dark.svg');
    expect(lightImg).toHaveAttribute('alt', 'Leasétic');
    expect(darkImg).toHaveAttribute('alt', 'Leasétic');
  });

  it('AC-15-BL-02: does NOT render the v1.1 plain-text Leasétic header (fontSize: 22 / fontWeight: 700 styled div)', async () => {
    const { container } = await renderPublicLayout();

    // The v1.1 plain-text header was a <div> styled with fontWeight: 700 +
    // fontSize: 22 + color: var(--navy). Verify no such div exists post-swap.
    const allDivs = Array.from(container.querySelectorAll('div'));
    const oldHeader = allDivs.find((d) => {
      const s = d.getAttribute('style') ?? '';
      return (
        (s.includes('font-size: 22') || s.includes('font-size:22')) &&
        (s.includes('font-weight: 700') || s.includes('font-weight:700'))
      );
    });
    expect(oldHeader).toBeUndefined();
  });

  it('AC-15-BL-03: preserves the top-right LocaleToggle + ThemeToggle cluster (position: absolute, top: 24, right: 24)', async () => {
    const { container, getByTestId } = await renderPublicLayout();

    // Find the absolute-positioned toggle wrapper.
    const allDivs = Array.from(container.querySelectorAll('div'));
    const toggleWrapper = allDivs.find((d) => {
      const s = d.getAttribute('style') ?? '';
      return (
        s.includes('position: absolute') &&
        (s.includes('top: 24') || s.includes('top:24')) &&
        (s.includes('right: 24') || s.includes('right:24'))
      );
    });
    expect(toggleWrapper).toBeDefined();

    // Both toggles render inside the wrapper.
    const locale = getByTestId('locale-toggle');
    const theme = getByTestId('theme-toggle');
    expect(toggleWrapper?.contains(locale)).toBe(true);
    expect(toggleWrapper?.contains(theme)).toBe(true);
  });

  it('T-15-01: rendered DOM contains no admin/commission segments (information-disclosure gate)', async () => {
    const { container } = await renderPublicLayout();
    const html = container.innerHTML;
    expect(html).not.toMatch(/commission/i);
    expect(html).not.toMatch(/\[adminSegment\]/);
    // The literal word "admin" should not appear; if a future href included it
    // we want to flag this — Phase 15 layout introduces NO admin URLs.
    expect(html).not.toMatch(/admin/i);
  });
});
