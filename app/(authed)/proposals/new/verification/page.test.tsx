/**
 * Plan 13-05 Task 2 — verification/page.tsx tests (RED → GREEN).
 *
 * 15 assertions per PLAN.md `<behavior>` block. Strategy mirrors plan 13-04's
 * calcul/page.test.tsx: vi.mock all server-side deps, invoke the page's
 * default export with mocked searchParams, render the returned JSX via
 * @testing-library/react. Redirect paths assert the mocked redirect throws.
 *
 * Coverage:
 *   - Test 1: D-03 self-heal — no ?draft_id= → redirect /parametres
 *   - Test 2: D-03 self-heal — cross-user / null draft → redirect /parametres
 *   - Test 3: D-03 self-heal — incomplete inputs (safeParse fail) → redirect
 *     /parametres BEFORE render (UI-SPEC §10.3 — no visual fallback on step 3)
 *   - Test 4: valid draft → renders title + subtitle + Stepper(currentStep=3)
 *   - Test 5: outer container max-width 1040px (D-14 / UI-SPEC §5.7)
 *   - Test 6: 2-column grid with grid-template-columns "minmax(0, 1fr) 360px"
 *     and gap 24px (UI-SPEC §5.7)
 *   - Test 7: left column renders 3 RecapSection cards in order
 *   - Test 8: ● CLIENT recap rows (clientCo / clientName / email / tel) +
 *     ← Modifier link to /parametres
 *   - Test 9: ● CLIENT recap INCLUDES clientRole and clientSiren ONLY when
 *     the accordion fields are filled (D-06 + D-25 hide-when-empty)
 *   - Test 10: ● PROJET recap rows (partnerRef / amountHT / durationMonths)
 *     + ← Modifier → /parametres
 *   - Test 11: ● CALCUL recap rows (coefficient / tranche / commission with
 *     "(non visible client)" sublabel) + ← Modifier → /calcul
 *   - Test 12: right column renders PdfPreviewMock with the literal
 *     LC-2026-XXX placeholder + validityDays + loyer display
 *   - Test 13: WizardActionBar mounted via FinalizeButton at the bottom,
 *     OUTSIDE the 2-column grid (the page footer)
 *   - Test 14: cross-user-draft security — Partner B → silent redirect
 *     (ROUTE-01 SC5)
 *   - Test 15: ADMIN-09 invariant — commission renders ONCE in ● CALCUL
 *     recap; does NOT appear in PdfPreviewMock
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  redirectMock,
  requireUserMock,
  getCurrentLangMock,
  getDraftByIdMock,
  getLatestGlobalParamsMock,
  computeLoyerMock,
  saveAsDraftMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  requireUserMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  getDraftByIdMock: vi.fn(),
  getLatestGlobalParamsMock: vi.fn(),
  computeLoyerMock: vi.fn(),
  saveAsDraftMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
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
vi.mock('@/lib/db/queries/proposals', () => ({
  getDraftById: (...args: unknown[]) => getDraftByIdMock(...args),
}));
vi.mock('@/lib/db/queries/global-params', () => ({
  getLatestGlobalParams: getLatestGlobalParamsMock,
}));
vi.mock('@/lib/calc', async () => {
  const real = await vi.importActual<typeof import('@/lib/calc')>('@/lib/calc');
  return {
    ...real,
    computeLoyer: (...args: unknown[]) => computeLoyerMock(...args),
  };
});
vi.mock('@/(authed)/proposals/new/_actions/saveAsDraft.action', () => ({
  saveAsDraftAction: (...args: unknown[]) => saveAsDraftMock(...args),
}));

// Import AFTER all mocks are in place.
import VerificationStep3Page from './page';

const USER_ID = 'user-a';

const COMPLETE_INPUTS = {
  partnerCo: 'Acme Leasing',
  partnerName: 'Alice Partner',
  clientCo: 'CompanyX',
  clientName: 'Bob Buyer',
  clientEmail: 'bob@companyx.example',
  clientTel: '01 23 45 67 89',
  partnerRef: 'PROJ-2026-01',
  amountHT: '75000',
  durationMonths: 48,
  validityDays: 30,
  _completedSteps: [1, 2],
};

const DEFAULT_PARAMS = {
  validityDays: 30,
  commissionPct: '2.0000',
  maxAmount: '500000.00',
  coefficients: {
    t1: { 36: '2.2500', 48: '2.5500', 60: '2.8500' },
    t2: { 36: '2.0500', 48: '2.3500', 60: '2.6500' },
    t3: { 36: '1.8500', 48: '2.1500', 60: '2.4500' },
    t4: { 36: '1.6500', 48: '1.9500', 60: '2.2500' },
  },
};

beforeEach(() => {
  redirectMock.mockClear();
  requireUserMock.mockReset();
  getCurrentLangMock.mockReset();
  getDraftByIdMock.mockReset();
  getLatestGlobalParamsMock.mockReset();
  computeLoyerMock.mockReset();
  saveAsDraftMock.mockReset();

  // Happy-path defaults.
  requireUserMock.mockResolvedValue({
    session: { user: { id: USER_ID, email: 'partner@example.com' } },
  });
  getCurrentLangMock.mockResolvedValue('fr');
  getDraftByIdMock.mockResolvedValue({
    id: 'd-1',
    userId: USER_ID,
    status: 'draft',
    deletedAt: null,
    inputs: COMPLETE_INPUTS,
  });
  getLatestGlobalParamsMock.mockResolvedValue(DEFAULT_PARAMS);
  computeLoyerMock.mockReturnValue({
    inputs: {
      amountHT: '75000',
      durationMonths: 48,
      validityDays: 30,
    },
    computed: {
      state: 'computed',
      trancheKey: 't2',
      loyerHT: '1949.93',
      coeff: '2.5500',
      isOnDemand: false,
      lcRef: '',
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('verification/page.tsx (D-01 / D-03 / D-14 / D-15 / D-16)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Test 1 — no ?draft_id= → redirect to /parametres
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 1: GET with NO ?draft_id= → silent redirect to /proposals/new/parametres', async () => {
    await expect(
      VerificationStep3Page({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
    expect(getDraftByIdMock).not.toHaveBeenCalled();
    expect(computeLoyerMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2 — cross-user / null draft → redirect to /parametres
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 2: GET with cross-user ?draft_id= → silent redirect to /proposals/new/parametres', async () => {
    getDraftByIdMock.mockResolvedValue(null);
    await expect(
      VerificationStep3Page({
        searchParams: Promise.resolve({ draft_id: 'partner-A-draft' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
    expect(computeLoyerMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3 — incomplete inputs → redirect to /parametres BEFORE render
  //  (UI-SPEC §10.3: step 3 has no visual fallback, unlike step 2)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 3: GET with incomplete inputs (safeParse fail) → silent redirect BEFORE render (UI-SPEC §10.3)', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { _completedSteps: [] }, // empty inputs → schema fails
    });
    await expect(
      VerificationStep3Page({
        searchParams: Promise.resolve({ draft_id: 'd-1' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
    expect(computeLoyerMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4 — happy path: title + subtitle + Stepper(currentStep=3)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 4: valid draft → renders title "Vérifier la proposition" + subtitle + Stepper currentStep=3', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    expect(container.textContent).toContain('Vérifier la proposition');
    expect(container.textContent).toContain(
      'Vérifiez tous les éléments puis confirmez',
    );
    const activeStep = container.querySelector('[aria-current="step"]');
    expect(activeStep).not.toBeNull();
    // FR default step-3 label = "Vérification"
    expect(activeStep!.textContent).toContain('Vérification');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5 — outer container max-width 1040px (UI-SPEC §5.7)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 5: outer container has max-width 1040px (D-14 / UI-SPEC §5.7)', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Find any element with maxWidth: 1040 (the outer page container).
    const outer = container.querySelector('[style*="max-width: 1040px"]');
    expect(outer).not.toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6 — 2-column grid layout (UI-SPEC §5.7)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 6: 2-column grid with grid-template-columns "minmax(0, 1fr) 360px" and gap 24px', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Look for the grid wrapper element by its inline style.
    const grid = Array.from(container.querySelectorAll<HTMLElement>('div')).find(
      (el) => {
        const style = el.getAttribute('style') ?? '';
        return (
          style.includes('grid-template-columns: minmax(0, 1fr) 360px') &&
          style.includes('gap: 24px')
        );
      },
    );
    expect(grid).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 7 — left column has 3 RecapSection cards in order
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 7: left column renders 3 RecapSection cards (CLIENT, PROJET, CALCUL) in order', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const text = container.textContent ?? '';
    expect(text).toContain('CLIENT');
    expect(text).toContain('PROJET');
    expect(text).toContain('CALCUL');
    // The 3 sections appear in this vertical order.
    const idxClient = text.indexOf('CLIENT');
    const idxProjet = text.indexOf('PROJET');
    const idxCalcul = text.indexOf('CALCUL');
    expect(idxClient).toBeLessThan(idxProjet);
    expect(idxProjet).toBeLessThan(idxCalcul);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 8 — ● CLIENT rows + ← Modifier link
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 8: ● CLIENT recap has clientCo / clientName / email / tel rows + ← Modifier link to /parametres', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const text = container.textContent ?? '';
    expect(text).toContain('CompanyX'); // clientCo
    expect(text).toContain('Bob Buyer'); // clientName
    expect(text).toContain('bob@companyx.example'); // clientEmail
    expect(text).toContain('01 23 45 67 89'); // clientTel

    // ← Modifier link to /parametres exists (at least one such link).
    const modifierLinks = Array.from(container.querySelectorAll('a')).filter(
      (a) =>
        (a.textContent ?? '').match(/Modifier/) &&
        (a.getAttribute('href') ?? '').includes('/proposals/new/parametres'),
    );
    expect(modifierLinks.length).toBeGreaterThanOrEqual(1);
    expect(modifierLinks[0]!.getAttribute('href')).toBe(
      '/proposals/new/parametres?draft_id=d-1',
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 9 — accordion fields appear only when filled
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 9: ● CLIENT recap includes clientRole + clientSiren ONLY when accordion fields are filled', async () => {
    // First sub-case: NOT filled → those labels absent.
    {
      const tree = await VerificationStep3Page({
        searchParams: Promise.resolve({ draft_id: 'd-1' }),
      });
      const { container } = render(tree);
      const text = container.textContent ?? '';
      expect(text).not.toContain('Qualité / Fonction');
      expect(text).not.toContain('SIREN');
      cleanup();
    }

    // Second sub-case: accordion fields filled → labels + values present.
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: {
        ...COMPLETE_INPUTS,
        clientRole: 'Directeur Achats',
        clientSiren: '123456789',
      },
    });
    const tree2 = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container: c2 } = render(tree2);
    const text2 = c2.textContent ?? '';
    expect(text2).toContain('Directeur Achats');
    expect(text2).toContain('123456789');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 10 — ● PROJET rows + ← Modifier link to /parametres
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 10: ● PROJET recap has partnerRef / amountHT / durationMonths rows + ← Modifier → /parametres', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const text = container.textContent ?? '';
    expect(text).toContain('PROJ-2026-01'); // partnerRef
    // amountHT 75000 → "75 000,00 €" (NBSP-tolerant regex)
    expect(text).toMatch(/75\s*000[.,]\s*00\s*€/);
    expect(text).toContain('48 mois'); // durationMonths

    // The /parametres ← Modifier link should be present (≥2 such links —
    // one for CLIENT and one for PROJET).
    const parametresModifierLinks = Array.from(
      container.querySelectorAll('a'),
    ).filter(
      (a) =>
        (a.textContent ?? '').match(/Modifier/) &&
        (a.getAttribute('href') ?? '').includes('/proposals/new/parametres'),
    );
    expect(parametresModifierLinks.length).toBeGreaterThanOrEqual(2);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 11 — ● CALCUL rows + commission sublabel + ← Modifier → /calcul
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 11: ● CALCUL recap has coefficient / tranche / commission rows with "(non visible client)" sublabel + ← Modifier → /calcul', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const text = container.textContent ?? '';
    // Commission sublabel from D-12.
    expect(text).toContain('(non visible client)');
    // Coefficient row label (i18n key wizard.step2.row.coefficient with K€)
    // OR section-specific phrasing — accept either "Coefficient appliqué".
    expect(text).toMatch(/Coefficient appliqué/);
    expect(text).toMatch(/Tranche/);
    expect(text).toContain('Commission apporteur');

    // ← Modifier link to /calcul exists.
    const calculModifierLink = Array.from(container.querySelectorAll('a')).find(
      (a) =>
        (a.textContent ?? '').match(/Modifier/) &&
        (a.getAttribute('href') ?? '').includes('/proposals/new/calcul'),
    );
    expect(calculModifierLink).toBeDefined();
    expect(calculModifierLink!.getAttribute('href')).toBe(
      '/proposals/new/calcul?draft_id=d-1',
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 12 — PdfPreviewMock in right column (D-15)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 12: right column renders PdfPreviewMock with literal LC-2026-XXX + validityDays + loyer', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const text = container.textContent ?? '';
    // D-15: literal LC-2026-XXX (the XXX is a literal placeholder).
    expect(text).toContain('LC-2026-XXX');
    // validityDays comes from getLatestGlobalParams → 30
    expect(text).toMatch(/30\s*jours de validité/);
    // PDF mock displays the loyer (1 949,93 €) — must appear at least once,
    // inside the PdfPreviewMock's role="img" wrapper.
    const pdfMock = container.querySelector('[role="img"]');
    expect(pdfMock).not.toBeNull();
    expect((pdfMock!.textContent ?? '')).toMatch(/1\s*949[.,]\s*93\s*€/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 13 — WizardActionBar at the bottom via FinalizeButton
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 13: FinalizeButton (WizardActionBar) mounted at the bottom — primary CTA Confirmer & Générer le PDF', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // The primary CTA button exists with the step-3 label.
    const confirmCta = Array.from(container.querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').match(/Confirmer & Générer le PDF/),
    );
    expect(confirmCta).toBeDefined();
    // ← Précédent link to /calcul (since step 3's prev is /calcul).
    const prevLink = Array.from(container.querySelectorAll('a')).find((a) =>
      (a.textContent ?? '').match(/Précédent/),
    );
    expect(prevLink).toBeDefined();
    expect(prevLink!.getAttribute('href')).toBe(
      '/proposals/new/calcul?draft_id=d-1',
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 14 — cross-user-draft security (ROUTE-01 SC5)
  // ──────────────────────────────────────────────────────────────────────────
  it("Test 14: Partner B hitting /verification?draft_id=<A's id> → silent redirect to /parametres, NO data leak (ROUTE-01 SC5)", async () => {
    // getDraftById returns null because of the userId predicate failure.
    getDraftByIdMock.mockResolvedValue(null);
    await expect(
      VerificationStep3Page({
        searchParams: Promise.resolve({ draft_id: 'partner-A-draft' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
    expect(computeLoyerMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 15 — ADMIN-09: commission appears in ● CALCUL only, not in PDF mock
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 15: ADMIN-09 invariant — commission amount renders inside ● CALCUL recap card; does NOT appear in PdfPreviewMock', async () => {
    const tree = await VerificationStep3Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Commission = 75000 × 2 / 100 = 1500 € → "1 500,00 €" (NBSP).
    const text = container.textContent ?? '';
    const matches = text.match(/1\s*500[.,]\s*00\s*€/g);
    expect(matches).not.toBeNull();
    // Commission appears EXACTLY ONCE in the rendered page (in ● CALCUL).
    expect(matches!.length).toBe(1);
    // The PdfPreviewMock (role="img") does NOT contain the commission value.
    const pdfMock = container.querySelector('[role="img"]');
    expect(pdfMock).not.toBeNull();
    expect((pdfMock!.textContent ?? '')).not.toMatch(/1\s*500[.,]\s*00\s*€/);
    // No hidden input or data-* attribute carries the commission value either.
    const allElements = container.querySelectorAll('*');
    for (const el of allElements) {
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-')) {
          expect(attr.value).not.toMatch(/1\s*500/);
        }
      }
    }
  });
});
