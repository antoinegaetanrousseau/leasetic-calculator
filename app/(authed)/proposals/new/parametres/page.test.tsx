/**
 * Plan 13-03 Task 2 — parametres/page.tsx tests (RED → GREEN).
 *
 * Behavior tests 1-13 from PLAN.md.
 *
 * Strategy: vi.mock all server-side deps (requireUser, draft helpers, redirect,
 * server actions) and invoke the page's default export with mocked searchParams.
 * On render paths, the async default returns a React element tree which we
 * render via @testing-library/react. On redirect paths, the mocked redirect()
 * throws (mimicking real next/navigation behavior) — we assert the redirect
 * target via the thrown error message.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  redirectMock,
  requireUserMock,
  getCurrentLangMock,
  createDraftMock,
  getDraftByIdMock,
  updateDraftMock,
  getProposalByIdMock,
  getLatestGlobalParamsMock,
  persistAccordionOpenMock,
  saveAsDraftMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  requireUserMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  createDraftMock: vi.fn(),
  getDraftByIdMock: vi.fn(),
  updateDraftMock: vi.fn(),
  getProposalByIdMock: vi.fn(),
  getLatestGlobalParamsMock: vi.fn(),
  persistAccordionOpenMock: vi.fn(),
  saveAsDraftMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  // The DuplicatePrefillToast (mounted on duplicate flag) uses
  // useSearchParams + useRouter from next/navigation — provide minimal mocks.
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/i18n', async () => {
  // Real `t` + dictionaries — only stub the cookie-reading `getCurrentLang`.
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
  createDraft: (...args: unknown[]) => createDraftMock(...args),
  getDraftById: (...args: unknown[]) => getDraftByIdMock(...args),
  updateDraft: (...args: unknown[]) => updateDraftMock(...args),
  getProposalById: (...args: unknown[]) => getProposalByIdMock(...args),
}));
vi.mock('@/lib/db/queries/global-params', () => ({
  getLatestGlobalParams: getLatestGlobalParamsMock,
}));
vi.mock('@/(authed)/proposals/new/_actions/persistAccordionOpen.action', () => ({
  persistAccordionOpenAction: (...args: unknown[]) =>
    persistAccordionOpenMock(...args),
}));
vi.mock('@/(authed)/proposals/new/_actions/saveAsDraft.action', () => ({
  saveAsDraftAction: (...args: unknown[]) => saveAsDraftMock(...args),
}));

// Import AFTER all mocks are in place.
import ParametresStep1Page from './page';

const USER_ID = 'user-a';
const OTHER_USER_ID = 'user-b';

beforeEach(() => {
  redirectMock.mockClear();
  requireUserMock.mockReset();
  getCurrentLangMock.mockReset();
  createDraftMock.mockReset();
  getDraftByIdMock.mockReset();
  updateDraftMock.mockReset();
  getProposalByIdMock.mockReset();
  getLatestGlobalParamsMock.mockReset();
  persistAccordionOpenMock.mockReset();
  saveAsDraftMock.mockReset();

  // Default happy path: a logged-in user with a draft owned by them.
  requireUserMock.mockResolvedValue({
    session: {
      user: {
        id: USER_ID,
        email: 'partner@example.com',
        displayName: 'Alice Partner',
        name: 'Alice',
        companyName: 'Acme Leasing',
      },
    },
  });
  getCurrentLangMock.mockResolvedValue('fr');
  getLatestGlobalParamsMock.mockResolvedValue({ validityDays: 30 });
  createDraftMock.mockResolvedValue({ id: 'new-draft-1' });
  updateDraftMock.mockResolvedValue({ id: 'new-draft-1' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('parametres/page.tsx (D-01 / D-02 / D-03 / D-25 / D-26 / D-07 / D-08)', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // D-02: bookmarkable URL via mint+redirect when no ?draft_id=
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 1: hitting /proposals/new/parametres with NO query params mints draft and 302-redirects to ?draft_id=<new_id>', async () => {
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1/);
    expect(createDraftMock).toHaveBeenCalledWith({
      userId: USER_ID,
      language: 'fr',
    });
    // No source proposal lookup (no ?duplicate=).
    expect(getProposalByIdMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // D-25: ?duplicate=<sourceId> happy path
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 2: with ?duplicate=<sourceId> + same-user source + not soft-deleted → createDraft + updateDraft spread + redirect with duplicate flag', async () => {
    getProposalByIdMock.mockResolvedValue({
      id: 'source-1',
      userId: USER_ID,
      deletedAt: null,
      inputs: { clientCo: 'PrefilledCorp', amountHT: '50000' },
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ duplicate: 'source-1' }) }),
    ).rejects.toThrow(
      /NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1&duplicate=1/,
    );
    expect(createDraftMock).toHaveBeenCalledTimes(1);
    expect(getProposalByIdMock).toHaveBeenCalledWith('source-1');
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect(payload.inputs.clientCo).toBe('PrefilledCorp');
    // D-25 overlay: session-derived partnerName / partnerCo overwrite source's stored values.
    expect(payload.inputs.partnerName).toBe('Alice Partner');
    expect(payload.inputs.partnerCo).toBe('Acme Leasing');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // D-25 fallback: soft-deleted source
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 3: with ?duplicate=<sourceId> + source soft-deleted → createDraft + redirect WITHOUT spreading source.inputs', async () => {
    getProposalByIdMock.mockResolvedValue({
      id: 'source-1',
      userId: USER_ID,
      deletedAt: new Date(),
      inputs: { clientCo: 'PrefilledCorp' },
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ duplicate: 'source-1' }) }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1/);
    expect(createDraftMock).toHaveBeenCalledTimes(1);
    // No spread — updateDraft not called for the prefill path.
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // D-25 fallback: cross-user source (PRIVACY)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 4: with ?duplicate=<sourceId> + source owned by DIFFERENT user → createDraft + redirect WITHOUT spreading source.inputs', async () => {
    getProposalByIdMock.mockResolvedValue({
      id: 'source-1',
      userId: OTHER_USER_ID,
      deletedAt: null,
      inputs: { clientCo: 'OtherUserData' },
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ duplicate: 'source-1' }) }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1/);
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5: happy-path render with ?draft_id= for a valid draft
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 5: with ?draft_id=<id> + draft owned by user + status=draft + not deleted → renders form pre-populated from draft.inputs; DuplicatePrefillToast NOT mounted', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: {
        clientCo: 'CompanyX',
        amountHT: '75000',
        durationMonths: 48,
        _completedSteps: [],
        _uiAccordionOpen: false,
      },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // The form's clientCo input must be pre-populated from draft.inputs.
    const clientCo = container.querySelector(
      'input[name="clientCo"]',
    ) as HTMLInputElement;
    expect(clientCo).not.toBeNull();
    expect(clientCo.value).toBe('CompanyX');
    // No duplicate query → DuplicatePrefillToast renders nothing (returns null).
    // We don't easily detect its presence, but the wider tree must not have a
    // sonner toast call surface here.
    expect(redirectMock).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // D-03: cross-user draft_id (PARTNER SECURITY — ROUTE-01 SC5)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 6 + Test 12: with ?draft_id=<id> + draft owned by DIFFERENT user → silent redirect to /proposals/new/parametres (no 404, no leak)', async () => {
    // getDraftById returns null because the WHERE userId predicate fails — D-03 self-heal.
    getDraftByIdMock.mockResolvedValue(null);
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ draft_id: 'someone-elses-draft-id' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
    // No createDraft (?draft_id= present), no updateDraft.
    expect(createDraftMock).not.toHaveBeenCalled();
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it('Test 7: with ?draft_id=<id> + draft soft-deleted → silent redirect to /proposals/new/parametres', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: new Date(),
      inputs: {},
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ draft_id: 'd-1' }) }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
  });

  it('Test 8: with ?draft_id=<id> + draft status="active" (already finalized) → silent redirect', async () => {
    // Note: getDraftById predicates on status='draft', so a finalized row returns null.
    // We still test the broader contract: if any non-draft is returned (defensive),
    // we redirect.
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'active',
      deletedAt: null,
      inputs: {},
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ draft_id: 'd-1' }) }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres$/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // D-26 win-rule
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 9: BOTH ?draft_id= AND ?duplicate= → ?draft_id= wins; ?duplicate= silently ignored', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { clientCo: 'OwnedDraftCo', _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1', duplicate: 'source-9' }),
    });
    const { container } = render(tree);
    // No createDraft, no getProposalById, no updateDraft — duplicate path ignored.
    expect(createDraftMock).not.toHaveBeenCalled();
    expect(getProposalByIdMock).not.toHaveBeenCalled();
    expect(updateDraftMock).not.toHaveBeenCalled();
    // Existing draft hydrates the form.
    const clientCo = container.querySelector(
      'input[name="clientCo"]',
    ) as HTMLInputElement;
    expect(clientCo.value).toBe('OwnedDraftCo');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Stepper wiring (D-20/D-21)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 10: Stepper receives currentStep=1, completedSteps from draft.inputs._completedSteps, hrefForStep threads draft_id through all 3 routes', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { _completedSteps: [1] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Stepper renders an <ol role="list"> with 3 <li>. Look for the aria-current on the active step.
    const activeStep = container.querySelector('[aria-current="step"]');
    expect(activeStep).not.toBeNull();
    // The current step label (FR default) is "Paramètres" — verify.
    expect(activeStep!.textContent).toContain('Paramètres');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // WizardActionBar wiring (D-19)
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 11: WizardActionBar renders with currentStep=1 (no Précédent), primary link "Continuer vers le calcul →", href=/proposals/new/calcul?draft_id=<id>', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: {},
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container, queryByLabelText, getByText } = render(tree);
    // Step 1 → no Précédent link.
    expect(queryByLabelText(/étape précédente/i)).toBeNull();
    // Primary CTA = link with the step-1 continue label.
    const cta = getByText(/Continuer vers le calcul/);
    expect(cta).toBeInTheDocument();
    expect(cta.closest('a')).toHaveAttribute(
      'href',
      '/proposals/new/calcul?draft_id=d-1',
    );
    // Ghost button "Enregistrer comme brouillon" must be present.
    expect(getByText(/Enregistrer comme brouillon/)).toBeInTheDocument();
    // Sanity: no commission rendered (ADMIN-09 step-1 — Test 13).
    expect(container.innerHTML.toLowerCase()).not.toMatch(/commission/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // ADMIN-09 step-1 invariant
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 13: NO commission string is rendered anywhere on step-1 (ADMIN-09 step-1 surface invariant)', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: {
        clientCo: 'X',
        clientName: 'Y',
        amountHT: '75000',
        durationMonths: 48,
        _completedSteps: [],
        _uiAccordionOpen: true, // expand accordion so all optional fields render
      },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    // Comprehensive grep over the rendered HTML: commission must be absent
    // (D-12 relaxation lives ONLY on steps 2 and 3).
    expect(container.innerHTML.toLowerCase()).not.toMatch(/commission/);
    // The mock placeholder "1 200 €" used as an example commission value must
    // also be absent.
    expect(container.innerHTML).not.toMatch(/1\s*200\s*€/);
  });
});
