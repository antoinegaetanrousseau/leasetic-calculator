/**
 * Phase 18 Plan 06 Task 2 — Aide landing tests (RED → GREEN).
 *
 * Covers HELP-01 acceptance from the plan's <behavior> block:
 *   1. PageHero renders title t('aide.landing.title') = "Centre d'aide" + subtitle
 *   2. Exactly 3 cards in a 3-col grid (repeat(3,1fr), gap:24)
 *   3. Card 1 — Commencer ici: title + body + <Link> to /aide/commencer-ici
 *      with a lucide icon colored var(--gd-text)
 *   4. Card 2 — Créer une proposition: title + body + Bientôt disponible
 *      badge (NOT a link, NOT clickable), card opacity 0.7
 *   5. Card 3 — Contact: title + body + <a href="mailto:{SUPPORT_EMAIL}">
 *      with the resolved SUPPORT_EMAIL string in the visible text
 *   6. <main> max-width 1040px per UI-SPEC line 915
 *   7. Card 2 disabled state — no href, no onClick, badge renders
 *      Bientôt disponible
 *
 * SUPPORT_EMAIL = antoine.rousseau@leasetic.com (user decision 2026-05-24,
 * matches the @leasetic.com launch-domain decision in STATE.md 2026-05-08).
 *
 * Mocking pattern: vi.hoisted + vi.mock of next/navigation +
 * @/lib/auth/require + @/lib/i18n. The (authed) layout owns the auth gate,
 * but we mock requireUser defensively in case the page calls it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  requireUserMock,
  getCurrentLangMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((p: string) => { throw new Error(`NEXT_REDIRECT:${p}`); }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/lib/auth/require', () => ({
  requireUser: (...args: unknown[]) => requireUserMock(...args),
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

// Import AFTER all mocks are in place.
import AidePage from './page';

const SUPPORT_EMAIL = 'antoine.rousseau@leasetic.com';

beforeEach(() => {
  requireUserMock.mockResolvedValue({
    session: { user: { id: 'user-jane', email: 'jane@example.com', displayName: 'Jane' } },
    role: 'partner',
  });
  getCurrentLangMock.mockResolvedValue('fr');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('/aide landing — HELP-01 (D-25)', () => {
  it('Test 1: renders PageHero with title "Centre d\'aide" and subtitle', async () => {
    const node = await AidePage();
    const { container } = render(node);

    const heading = container.querySelector('h1');
    expect(heading?.textContent).toBe("Centre d'aide");
    // Subtitle copy from aide.landing.subtitle (FR)
    expect(container.textContent).toContain('Tout pour démarrer et bien utiliser Leasétic');
  });

  it('Test 2: renders exactly 3 .card elements in a 3-col grid (gap:24)', async () => {
    const node = await AidePage();
    const { container } = render(node);

    const cards = container.querySelectorAll('.card');
    expect(cards.length).toBe(3);

    // Locate the grid wrapper that directly contains the cards
    const grid = cards[0].parentElement as HTMLElement;
    const inlineStyle = grid.getAttribute('style') || '';
    // Inline styles serialize as `display: grid;` etc.
    expect(inlineStyle).toMatch(/display:\s*grid/);
    expect(inlineStyle).toMatch(/grid-template-columns:\s*repeat\(3,\s*1fr\)/);
    expect(inlineStyle).toMatch(/gap:\s*24px/);
  });

  it('Test 3 — Card 1 (Commencer ici): title + body + Link to /aide/commencer-ici', async () => {
    const node = await AidePage();
    const { container } = render(node);

    // FR copy from aide.landing.card.commencerIci.*
    expect(container.textContent).toContain('Commencer ici');
    expect(container.textContent).toContain(
      'Premier guide pour créer une proposition en 3 étapes.',
    );

    // The CTA is a Next <Link> rendered as <a href="/aide/commencer-ici">
    const cta = container.querySelector('a[href="/aide/commencer-ici"]');
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toContain('Lire le guide');

    // The Card 1 icon should carry color var(--gd-text) — lucide renders an <svg>
    // with the color prop forwarded to the stroke attribute. We sample any svg
    // whose parent is the same .card as the CTA link.
    const card1 = cta!.closest('.card') as HTMLElement;
    const svg = card1.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('stroke')).toBe('var(--gd-text)');
  });

  it('Test 4 — Card 2 (Créer une proposition, disabled): title + body + Bientôt disponible badge, opacity 0.7', async () => {
    const node = await AidePage();
    const { container } = render(node);

    expect(container.textContent).toContain('Créer une proposition');
    expect(container.textContent).toContain(
      'Guide détaillé du tunnel de proposition étape par étape.',
    );

    // Badge text — find the span that holds "Bientôt disponible"
    const badge = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent === 'Bientôt disponible',
    );
    expect(badge).toBeDefined();

    // The badge's enclosing .card must carry opacity 0.7
    const card2 = badge!.closest('.card') as HTMLElement;
    expect(card2).not.toBeNull();
    const cardStyle = card2.getAttribute('style') || '';
    expect(cardStyle).toMatch(/opacity:\s*0\.7/);
  });

  it('Test 5 — Card 3 (Contact): body + mailto link with SUPPORT_EMAIL as both href and visible text', async () => {
    const node = await AidePage();
    const { container } = render(node);

    expect(container.textContent).toContain('Contact');
    expect(container.textContent).toContain(
      'Une question ? Écrivez-nous, nous vous répondons sous 24h ouvrées.',
    );

    const mailto = container.querySelector(`a[href="mailto:${SUPPORT_EMAIL}"]`);
    expect(mailto).not.toBeNull();
    expect(mailto?.textContent).toBe(SUPPORT_EMAIL);

    // Card 3 icon stroke also var(--gd-text)
    const card3 = mailto!.closest('.card') as HTMLElement;
    const svg = card3.querySelector('svg');
    expect(svg?.getAttribute('stroke')).toBe('var(--gd-text)');
  });

  it('Test 6: <main> has max-width 1040px', async () => {
    const node = await AidePage();
    const { container } = render(node);

    const main = container.querySelector('main') as HTMLElement;
    expect(main).not.toBeNull();
    const style = main.getAttribute('style') || '';
    expect(style).toMatch(/max-width:\s*1040px/);
  });

  it('Test 7: Card 2 is non-interactive — no <a> href, no <button>, only the badge <span>', async () => {
    const node = await AidePage();
    const { container } = render(node);

    // Find Card 2 via its title text
    const titles = Array.from(container.querySelectorAll('.card'));
    const card2 = titles.find((c) =>
      c.textContent?.includes('Créer une proposition'),
    ) as HTMLElement;
    expect(card2).toBeDefined();

    // No <a> elements (no link, no mailto, no nav) anywhere inside Card 2
    expect(card2.querySelectorAll('a').length).toBe(0);
    // No <button> elements either
    expect(card2.querySelectorAll('button').length).toBe(0);
    // Badge is present
    expect(card2.textContent).toContain('Bientôt disponible');
    // Card 2 icon should be muted (FileText with color var(--muted))
    const svg = card2.querySelector('svg');
    expect(svg?.getAttribute('stroke')).toBe('var(--muted)');
  });
});
