/**
 * Phase 18 Plan 06 Task 4 — Aide article (Commencer ici) tests (RED → GREEN).
 *
 * Covers HELP-01 acceptance per <behavior> in 18-06-PLAN.md, ADAPTED for the
 * text-only deviation accepted on 2026-05-24:
 *   - Screenshots are DEFERRED to HELP-02 (see deferred-items.md item #4 —
 *     `seed-partner-launch.ts` companyName gap blocks wizard step 2 capture).
 *   - The 3 <Image> slots become styled <figure class="aide-figure-placeholder">
 *     elements with the i18n key `aide.commencer-ici.figure.placeholder`
 *     interpolated for each step.
 *
 * Test coverage (5 tests):
 *   1. Breadcrumb <Link href="/aide"> rendering `← Centre d'aide`
 *   2. H1 title from aide.commencer-ici.title
 *   3. 5 H2 section titles (overview, step1, step2, step3, next)
 *   4. 3 <figure> placeholders carrying the interpolated FR string
 *      "Aperçu de l'étape 1 — à venir", "...2...", "...3..."
 *   5. End-of-article CTA <Link href="/proposals/new/parametres" className="btn-green">
 *      with `Créer ma première proposition`
 *
 * Mocking pattern matches app/(authed)/aide/page.test.tsx (vi.hoisted + vi.mock
 * of next/navigation + @/lib/auth/require + @/lib/i18n).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { requireUserMock, getCurrentLangMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((p: string) => {
    throw new Error(`NEXT_REDIRECT:${p}`);
  }),
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

// Import AFTER mocks are in place.
import CommencerIciPage from './page';

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

describe('/aide/commencer-ici — HELP-01 starter article (D-24/26)', () => {
  it('Test 1: renders breadcrumb Link to /aide with "← Centre d\'aide" text', async () => {
    const node = await CommencerIciPage();
    const { container } = render(node);

    const breadcrumb = container.querySelector('a[href="/aide"]');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb?.textContent).toContain("← Centre d'aide");
  });

  it('Test 2: renders <h1> with the article title "Commencer ici"', async () => {
    const node = await CommencerIciPage();
    const { container } = render(node);

    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe('Commencer ici');
  });

  it('Test 3: renders 5 <h2> section headings (overview + step1 + step2 + step3 + next)', async () => {
    const node = await CommencerIciPage();
    const { container } = render(node);

    const h2s = Array.from(container.querySelectorAll('h2')).map((el) => el.textContent ?? '');
    expect(h2s.length).toBe(5);
    expect(h2s).toContain('Aperçu du tunnel');
    expect(h2s).toContain('Étape 1 — Paramètres');
    expect(h2s).toContain('Étape 2 — Calcul');
    expect(h2s).toContain('Étape 3 — Vérifier');
    expect(h2s).toContain('Et après ?');
  });

  it('Test 4: renders 3 <figure class="aide-figure-placeholder"> with interpolated step numbers', async () => {
    const node = await CommencerIciPage();
    const { container } = render(node);

    const figures = container.querySelectorAll('figure.aide-figure-placeholder');
    expect(figures.length).toBe(3);

    const text = Array.from(figures).map((el) => el.textContent ?? '');
    expect(text[0]).toContain("Aperçu de l'étape 1 — à venir");
    expect(text[1]).toContain("Aperçu de l'étape 2 — à venir");
    expect(text[2]).toContain("Aperçu de l'étape 3 — à venir");

    // No real <img> tags rendered yet (screenshots deferred to HELP-02)
    expect(container.querySelectorAll('img').length).toBe(0);
  });

  it('Test 5: renders end-of-article CTA <Link href="/proposals/new/parametres"> with btn-green class', async () => {
    const node = await CommencerIciPage();
    const { container } = render(node);

    const cta = container.querySelector('a[href="/proposals/new/parametres"]');
    expect(cta).not.toBeNull();
    expect(cta?.className).toContain('btn-green');
    expect(cta?.textContent).toContain('Créer ma première proposition');
  });

  it('Test 6: <main> has max-width 720px per UI-SPEC line 920', async () => {
    const node = await CommencerIciPage();
    const { container } = render(node);

    const main = container.querySelector('main') as HTMLElement;
    expect(main).not.toBeNull();
    const style = main.getAttribute('style') || '';
    expect(style).toMatch(/max-width:\s*720px/);
  });

  it('Test 7 (EN parity): figure placeholder interpolates "Step N preview — coming soon" when lang=en', async () => {
    getCurrentLangMock.mockResolvedValue('en');
    const node = await CommencerIciPage();
    const { container } = render(node);

    const figures = container.querySelectorAll('figure.aide-figure-placeholder');
    expect(figures.length).toBe(3);
    const text = Array.from(figures).map((el) => el.textContent ?? '');
    expect(text[0]).toContain('Step 1 preview — coming soon');
    expect(text[1]).toContain('Step 2 preview — coming soon');
    expect(text[2]).toContain('Step 3 preview — coming soon');
  });
});
