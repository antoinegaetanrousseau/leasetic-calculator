/**
 * Plan 13-04 — calcul/page.tsx tests (RED → GREEN).
 *
 * 15 behavior tests per PLAN.md `<behavior>` block.
 *
 * Strategy: mirror plan-13-03's `parametres/page.test.tsx` shape — vi.mock
 * all server-side deps (requireUser, getDraftById, getLatestGlobalParams,
 * computeLoyer, redirect from next/navigation, saveAsDraftAction), then
 * invoke the page's default export with mocked searchParams. Happy paths
 * render the returned tree via @testing-library/react; redirect paths
 * assert the thrown error message (mocked redirect throws).
 *
 * Coverage:
 *   - Test 1: D-03 self-heal (no ?draft_id=)
 *   - Test 2: D-03 self-heal (cross-user / null draft)
 *   - Test 3: hero card renders loyer currency
 *   - Test 4: tranche chip renders "Tranche {N} · Coefficient {pct}%"
 *   - Test 5: Détail du calcul card renders 5 rows
 *   - Test 6: Commission row has sub-line "(non visible client)" (D-12 + RecapSection rowSublabels)
 *   - Test 7: Paramètres saisis recap has ← Modifier link to /parametres
 *   - Test 8: Stepper currentStep=2, completedSteps includes 1
 *   - Test 9: WizardActionBar primary link to /verification
 *   - Test 10: on-demand → hero renders 'Sur demande'
 *   - Test 11: missing coefficients → hero renders fallback + CTA replaced
 *   - Test 12: incomplete inputs → hero renders error + CTA replaced with ← Retour
 *   - Test 13: cross-user draft → silent redirect (ROUTE-01 SC5)
 *   - Test 14: ADMIN-09 D-12 — commission AMOUNT renders in Détail du calcul
 *   - Test 15: commission appears EXACTLY ONCE (no leak outside Détail card)
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
// Mock only `computeLoyer` from `@/lib/calc` — keep proposalInputSchema +
// parseNumeric real (the page exercises them server-side).
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
import CalculStep2Page from './page';

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
  _completedSteps: [1],
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

  // Default happy path: logged-in user, complete draft, global params seeded,
  // computeLoyer returns a successful 'computed' result.
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

describe('calcul/page.tsx (D-01 / D-03 / D-11 / D-12 / D-13 / D-22)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // D-03 self-heal — Test 1
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 1: GET with NO ?draft_id= → silent redirect to /proposals/new/parametres', async () => {
    await expect(
      CalculStep2Page({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
    expect(getDraftByIdMock).not.toHaveBeenCalled();
    expect(computeLoyerMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // D-03 self-heal — Test 2 (cross-user / missing)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 2: GET with cross-user ?draft_id= → silent redirect to /proposals/new/parametres', async () => {
    getDraftByIdMock.mockResolvedValue(null);
    await expect(
      CalculStep2Page({
        searchParams: Promise.resolve({ draft_id: 'someone-elses-draft-id' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Happy path — Test 3: hero card renders the loyer
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 3: GET with valid ?draft_id= + complete inputs → hero card renders the loyer (currency-formatted)', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // formatCurrency('fr', 1949.93) → '1 949,93 €' (NBSP separator). Use a
    // tolerant regex that matches any whitespace separator.
    expect(container.textContent).toMatch(/1\s*949[.,]\s*93\s*€/);
    // Hero label (existing 'wizard.step2.hero.label' key = "LOYER MENSUEL").
    expect(container.textContent).toContain('LOYER MENSUEL');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4 — tranche chip
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 4: hero card includes the tranche chip "Tranche 2 · Coefficient 2.55%"', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // tranche number is parsed from trancheKey 't2' → 2
    // coefficient is parseNumeric('2.5500').toFixed(2) = "2.55"
    expect(container.textContent).toMatch(/Tranche\s*2\s*·\s*Coefficient\s*2\.55\s*%/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5 — Détail du calcul renders 5 rows
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 5: Détail du calcul card renders 5 rows (Montant / Commission / Coefficient / Durée / Loyer)', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const html = container.textContent ?? '';
    expect(html).toContain('DÉTAIL DU CALCUL');
    expect(html).toContain('Montant HT du projet');
    expect(html).toContain('Commission apporteur');
    // coefficient row label uses tranche number (50 for t2: '50 001 € → 100 000 €')
    // UI-SPEC key: 'Coefficient appliqué (tranche {0}K€)' — '{0}' becomes the tranche upper bound
    expect(html).toMatch(/Coefficient appliqué \(tranche\s*\d+K€\)/);
    expect(html).toContain('Durée du contrat');
    expect(html).toContain('Loyer mensuel calculé');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6 — Commission row has "(non visible client)" sub-line (D-12)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 6: Commission row has the "(non visible client)" sub-line under the label (D-12)', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    expect(container.textContent).toContain('(non visible client)');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 7 — Paramètres saisis recap has ← Modifier link
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 7: Paramètres saisis recap card has ← Modifier link with href=/proposals/new/parametres?draft_id=<id>', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    expect(container.textContent).toContain('PARAMÈTRES SAISIS');
    // The recap card's ← Modifier link must point to /parametres
    const modifierLinks = Array.from(
      container.querySelectorAll('a'),
    ).filter((a) => (a.textContent ?? '').match(/Modifier/));
    expect(modifierLinks.length).toBeGreaterThanOrEqual(1);
    const recapLink = modifierLinks.find((a) =>
      (a.getAttribute('href') ?? '').includes('/proposals/new/parametres'),
    );
    expect(recapLink).toBeDefined();
    expect(recapLink!.getAttribute('href')).toBe(
      '/proposals/new/parametres?draft_id=d-1',
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 8 — Stepper currentStep=2, completedSteps includes 1
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 8: Stepper renders with currentStep=2 (aria-current="step" on step 2)', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const activeStep = container.querySelector('[aria-current="step"]');
    expect(activeStep).not.toBeNull();
    // FR default step-2 label = "Calcul"
    expect(activeStep!.textContent).toContain('Calcul');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 9 — WizardActionBar primary link to /verification
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 9: WizardActionBar renders with primary link "Continuer vers la vérification →" href=/proposals/new/verification?draft_id=<id>', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Find the link with "Continuer vers la vérification" label
    const continueLink = Array.from(
      container.querySelectorAll('a'),
    ).find((a) =>
      (a.textContent ?? '').match(/Continuer vers la vérification/),
    );
    expect(continueLink).toBeDefined();
    expect(continueLink!.getAttribute('href')).toBe(
      '/proposals/new/verification?draft_id=d-1',
    );
    // Step 2 has a ← Précédent link to /parametres
    const prevLink = Array.from(container.querySelectorAll('a')).find((a) =>
      (a.textContent ?? '').match(/Précédent/),
    );
    expect(prevLink).toBeDefined();
    expect(prevLink!.getAttribute('href')).toBe(
      '/proposals/new/parametres?draft_id=d-1',
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 10 — on-demand state
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 10: when computeLoyer returns state="on-demand", hero value renders "Sur demande" and tranche chip is hidden', async () => {
    computeLoyerMock.mockReturnValue({
      inputs: { amountHT: '750000', durationMonths: 48, validityDays: 30 },
      computed: { state: 'on-demand', trancheKey: 't4', isOnDemand: true },
    });
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { ...COMPLETE_INPUTS, amountHT: '750000' },
    });
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    expect(container.textContent).toContain('Sur demande');
    // Tranche chip hidden in on-demand state.
    expect(container.textContent).not.toMatch(/Tranche \d+ · Coefficient/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 11 — missing coefficients → soft-error fallback + CTA replaced
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 11: when computeLoyer returns state="missing", hero renders "Coefficients manquants pour cette tranche" and primary CTA replaced with ← Retour à l\'étape 1', async () => {
    computeLoyerMock.mockReturnValue({
      inputs: { amountHT: '40000', durationMonths: 48, validityDays: 30 },
      computed: { state: 'missing', trancheKey: 't1' },
    });
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { ...COMPLETE_INPUTS, amountHT: '40000' },
    });
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    expect(container.textContent).toContain(
      'Coefficients manquants pour cette tranche',
    );
    // Primary CTA must be ← Retour à l'étape 1 (the Continuer link is REPLACED).
    expect(container.textContent).not.toMatch(/Continuer vers la vérification/);
    const retourLink = Array.from(container.querySelectorAll('a')).find((a) =>
      (a.textContent ?? '').match(/Retour à l['’]étape 1/),
    );
    expect(retourLink).toBeDefined();
    expect(retourLink!.getAttribute('href')).toBe(
      '/proposals/new/parametres?draft_id=d-1',
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 12 — incomplete inputs → error fallback + CTA replaced
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 12: when draft.inputs fails proposalInputSchema validation → hero renders wizard.step2.error.incomplete + CTA replaced with ← Retour à l\'étape 1', async () => {
    // Missing required fields (no clientCo / no amountHT / no durationMonths).
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { _completedSteps: [] }, // incomplete
    });
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    expect(container.textContent).toContain('Données du projet incomplètes');
    // computeLoyer NOT called when validation fails.
    expect(computeLoyerMock).not.toHaveBeenCalled();
    // Continuer link replaced with ← Retour.
    expect(container.textContent).not.toMatch(/Continuer vers la vérification/);
    const retourLink = Array.from(container.querySelectorAll('a')).find((a) =>
      (a.textContent ?? '').match(/Retour à l['’]étape 1/),
    );
    expect(retourLink).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 13 — cross-user-draft security (ROUTE-01 SC5)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 13: Partner B hitting /calcul?draft_id=<A\'s id> → silent redirect to /parametres, NO data leak', async () => {
    // getDraftById returns null because of the userId predicate failure.
    getDraftByIdMock.mockResolvedValue(null);
    await expect(
      CalculStep2Page({
        searchParams: Promise.resolve({ draft_id: 'partner-A-draft' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
    // No computeLoyer call (no draft → no compute).
    expect(computeLoyerMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 14 — ADMIN-09 D-12 partial relaxation: commission visible on step 2
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 14: ADMIN-09 D-12 relaxation — commission AMOUNT (formatted) renders in Détail du calcul row', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Commission = amountHT × commissionPct / 100 = 75000 × 2 / 100 = 1500 €
    // formatCurrency('fr', 1500) → '1 500,00 €' (NBSP separators).
    expect(container.textContent).toMatch(/1\s*500[.,]\s*00\s*€/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 15 — commission appears EXACTLY ONCE (no other disclosure path)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 15: commission VALUE appears exactly once in rendered output (no leak in recap card / no hidden inputs / no data attributes)', async () => {
    const tree = await CalculStep2Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Match the commission amount string format: e.g. "1 500,00 €" or "1500,00 €"
    const matches = (container.textContent ?? '').match(/1\s*500[.,]\s*00\s*€/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
    // Also assert: no <input type="hidden" name="commission"> or similar.
    const hiddenInputs = container.querySelectorAll('input[type="hidden"]');
    for (const inp of hiddenInputs) {
      expect((inp.getAttribute('name') ?? '').toLowerCase()).not.toContain(
        'commission',
      );
      expect((inp.getAttribute('value') ?? '').toLowerCase()).not.toMatch(
        /1\s*500/,
      );
    }
    // No data-* attribute should carry the commission value.
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
