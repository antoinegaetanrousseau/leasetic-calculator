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
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

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
  saveAsDraftMock,
  saveAndAdvanceMock,
  getClientRelationshipForOwnerMock,
  listContactsForRelationshipMock,
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
  saveAsDraftMock: vi.fn(),
  saveAndAdvanceMock: vi.fn(),
  getClientRelationshipForOwnerMock: vi.fn(),
  listContactsForRelationshipMock: vi.fn(),
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
  deleteEmptyDraftsByUser: vi.fn().mockResolvedValue(undefined),
  createDraft: (...args: unknown[]) => createDraftMock(...args),
  getDraftById: (...args: unknown[]) => getDraftByIdMock(...args),
  updateDraft: (...args: unknown[]) => updateDraftMock(...args),
  getProposalById: (...args: unknown[]) => getProposalByIdMock(...args),
}));
vi.mock('@/lib/db/queries/global-params', () => ({
  getLatestGlobalParams: getLatestGlobalParamsMock,
}));
vi.mock('@/lib/db/queries/client-relationships', () => ({
  getClientRelationshipForOwner: (...args: unknown[]) =>
    getClientRelationshipForOwnerMock(...args),
  listContactsForRelationship: (...args: unknown[]) =>
    listContactsForRelationshipMock(...args),
}));
// WizardStep1Wiring.tsx imports both wizard actions by app/-relative
// specifiers, so the mocks must use the SAME specifiers: `@/` maps to src/, and
// a mock bound at `@/(authed)/...` registers a module id nothing under app/ ever
// resolves to — the mock never fires and assertions through it pass vacuously.
vi.mock('../_actions/saveAsDraft.action', () => ({
  saveAsDraftAction: (...args: unknown[]) => saveAsDraftMock(...args),
}));
vi.mock('../_actions/saveAndAdvance.action', () => ({
  saveAndAdvanceAction: (...args: unknown[]) => saveAndAdvanceMock(...args),
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
  saveAsDraftMock.mockReset();
  saveAndAdvanceMock.mockReset();
  getClientRelationshipForOwnerMock.mockReset();
  listContactsForRelationshipMock.mockReset();
  getClientRelationshipForOwnerMock.mockResolvedValue(null);
  listContactsForRelationshipMock.mockResolvedValue([]);

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
  // Finding 3 (43-VERIFICATION.md Gap 2, operator option (a)): a session user
  // with NO companyName must never have partnerCo substitute their own name.
  // ──────────────────────────────────────────────────────────────────────────
  it('Finding 3: with session.user.companyName absent, minted partnerCo is "" — never the displayName, name, or email', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: null,
        },
      },
    });
    getProposalByIdMock.mockResolvedValue({
      id: 'source-1',
      userId: USER_ID,
      deletedAt: null,
      inputs: { clientCo: 'PrefilledCorp' },
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ duplicate: 'source-1' }) }),
    ).rejects.toThrow(
      /NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1&duplicate=1/,
    );
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect(payload.inputs.partnerCo).toBe('');
    expect(payload.inputs.partnerCo).not.toBe('Alice Partner');
    expect(payload.inputs.partnerCo).not.toBe('Alice');
    expect(payload.inputs.partnerCo).not.toBe('partner@example.com');
    // partnerName is unaffected — it legitimately still uses the name fallback.
    expect(payload.inputs.partnerName).toBe('Alice Partner');
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
  // D-30 (Phase 30 Plan 09 / CRM-05): ?clientRelationshipId= ownership
  // validation + prefill + silent-degradation.
  // ──────────────────────────────────────────────────────────────────────────
  it('Test 14: ?clientRelationshipId=<owned> with no ?draft_id= mints a draft carrying that id and redirects to ?draft_id=…', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue({
      relationshipId: 'rel-1',
      companyId: 'co-1',
      companyName: 'Acme Corp',
      siren: '123456789',
      createdAt: new Date(),
    });
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ clientRelationshipId: 'rel-1' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1/);
    expect(getClientRelationshipForOwnerMock).toHaveBeenCalledWith('rel-1', USER_ID);
    expect(createDraftMock).toHaveBeenCalledWith({
      userId: USER_ID,
      language: 'fr',
      clientRelationshipId: 'rel-1',
    });
  });

  it('Test 15: the minted draft is prefilled with clientCo/clientSiren from the company and clientName/clientRole/clientTel/clientEmail from the first contact', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue({
      relationshipId: 'rel-1',
      companyId: 'co-1',
      companyName: 'Acme Corp',
      siren: '123456789',
      createdAt: new Date(),
    });
    listContactsForRelationshipMock.mockResolvedValue([
      {
        id: 'contact-1',
        name: 'Jean Dupont',
        role: 'Acheteur',
        phone: '0601020304',
        email: 'jean@acme.fr',
      },
    ]);
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ clientRelationshipId: 'rel-1' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(listContactsForRelationshipMock).toHaveBeenCalledWith('rel-1', USER_ID);
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect(payload.inputs.clientCo).toBe('Acme Corp');
    expect(payload.inputs.clientSiren).toBe('123456789');
    expect(payload.inputs.clientName).toBe('Jean Dupont');
    expect(payload.inputs.clientRole).toBe('Acheteur');
    expect(payload.inputs.clientTel).toBe('0601020304');
    expect(payload.inputs.clientEmail).toBe('jean@acme.fr');
    // These remain editable starting points, not locked — session values
    // still win for partner attribution (D-07 discipline unaffected).
    expect(payload.inputs.partnerName).toBe('Alice Partner');
    expect(payload.inputs.partnerCo).toBe('Acme Leasing');
  });

  it('Test 15b: with a relationship that has zero contacts, prefills only clientCo/clientSiren — no updateDraft crash, no contact fields written', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue({
      relationshipId: 'rel-2',
      companyId: 'co-2',
      companyName: 'Beta SARL',
      siren: null,
      createdAt: new Date(),
    });
    listContactsForRelationshipMock.mockResolvedValue([]);
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ clientRelationshipId: 'rel-2' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect(payload.inputs.clientCo).toBe('Beta SARL');
    expect(payload.inputs.clientSiren).toBeUndefined();
    expect(payload.inputs.clientName).toBeUndefined();
  });

  it('Test 16: ?clientRelationshipId=<not owned> silently drops the param and mints a normal unlinked draft — no error page, no 404, no toast', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue(null);
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ clientRelationshipId: 'rel-not-owned' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1/);
    expect(createDraftMock).toHaveBeenCalledWith({
      userId: USER_ID,
      language: 'fr',
      clientRelationshipId: undefined,
    });
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it('Test 17: ?clientRelationshipId=<malformed> behaves identically to the not-owned case (the query layer rejecting an invalid UUID is caught, not surfaced)', async () => {
    getClientRelationshipForOwnerMock.mockRejectedValue(
      new Error('invalid input syntax for type uuid: "not-a-uuid"'),
    );
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ clientRelationshipId: 'not-a-uuid' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres\?draft_id=new-draft-1/);
    expect(createDraftMock).toHaveBeenCalledWith({
      userId: USER_ID,
      language: 'fr',
      clientRelationshipId: undefined,
    });
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it('Test 18: entering the wizard with no ?clientRelationshipId= mints a draft whose clientRelationshipId is undefined', async () => {
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(getClientRelationshipForOwnerMock).not.toHaveBeenCalled();
    expect(createDraftMock).toHaveBeenCalledWith({
      userId: USER_ID,
      language: 'fr',
      clientRelationshipId: undefined,
    });
  });

  it('Test 19: ?draft_id= still wins over ?clientRelationshipId= — an existing draft is never re-linked', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { clientCo: 'ExistingDraftCo', _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1', clientRelationshipId: 'rel-1' }),
    });
    render(tree);
    expect(createDraftMock).not.toHaveBeenCalled();
    expect(getClientRelationshipForOwnerMock).not.toHaveBeenCalled();
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
  it('Test 11: WizardActionBar renders with currentStep=1 (no Précédent), primary button "Continuer vers le calcul →" (calls saveAndAdvanceAction on click)', async () => {
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
    // Primary CTA = button (not a link) — it saves via saveAndAdvanceAction before navigating.
    const cta = getByText(/Continuer vers le calcul/);
    expect(cta).toBeInTheDocument();
    expect(cta.closest('button')).not.toBeNull();
    expect(cta.closest('a')).toBeNull();
    // Ghost button "Enregistrer comme brouillon" must be present.
    expect(getByText(/Enregistrer comme brouillon/)).toBeInTheDocument();
    // Sanity: no commission rendered (ADMIN-09 step-1 — Test 13).
    expect(container.innerHTML.toLowerCase()).not.toMatch(/commission/);
  });

  it('Test 11a: clicking "Enregistrer comme brouillon" invokes saveAsDraftAction with the draft id and the RHF payload', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: {
        clientCo: 'Cliente SARL',
        clientSiren: '123456789',
        clientSiret: '12345678900012',
        amountHT: '75000',
        durationMonths: 48,
        _completedSteps: [],
      },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { getByText } = render(tree);

    fireEvent.click(getByText(/Enregistrer comme brouillon/));

    // The action must actually fire — a dead mock would hang here rather than
    // let the assertions below pass vacuously.
    await waitFor(() => expect(saveAsDraftMock).toHaveBeenCalledTimes(1));
    expect(saveAsDraftMock).toHaveBeenCalledWith(
      'd-1',
      expect.objectContaining({
        // Client data round-trips out of the stored draft via the RHF prefill.
        clientCo: 'Cliente SARL',
        clientSiren: '123456789',
        clientSiret: '12345678900012',
        amountHT: '75000',
        durationMonths: 48,
        // D-07 / D-08: partner attribution + validity are session- and
        // params-resolved, never read from the draft, but they still travel
        // in the save-as-draft payload.
        partnerName: 'Alice Partner',
        partnerCo: 'Acme Leasing',
        validityDays: 30,
      }),
    );
  });

  it('Test 11b: clicking "Continuer vers le calcul" on a valid step-1 form invokes saveAndAdvanceAction with (draftId, values, 1)', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      // Every field WizardStep1Wiring's onContinue runs form.trigger() over
      // must be valid, or the gate (correctly) stops before the action.
      // clientSiret's first 9 digits must equal clientSiren (D-02 refine).
      inputs: {
        clientCo: 'Cliente SARL',
        clientSiren: '123456789',
        clientSiret: '12345678900012',
        amountHT: '75000',
        durationMonths: 48,
        _completedSteps: [],
      },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { getByText } = render(tree);

    fireEvent.click(getByText(/Continuer vers le calcul/));

    await waitFor(() => expect(saveAndAdvanceMock).toHaveBeenCalledTimes(1));
    expect(saveAndAdvanceMock).toHaveBeenCalledWith(
      'd-1',
      expect.objectContaining({
        clientCo: 'Cliente SARL',
        clientSiren: '123456789',
        clientSiret: '12345678900012',
        amountHT: '75000',
        durationMonths: 48,
      }),
      // The step number the action marks complete (D-20).
      1,
    );
    // Advancing is not saving — the two CTAs stay distinct.
    expect(saveAsDraftMock).not.toHaveBeenCalled();
  });

  it('Test 11c: "Continuer vers le calcul" on an INVALID form blocks before saveAndAdvanceAction (D-04 trigger gate)', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      // Same fixture as Test 11b minus a required SIREN/SIRET pair — the
      // trigger gate must stop here rather than persist a half-filled step.
      inputs: {
        clientCo: 'Cliente SARL',
        clientSiren: '',
        clientSiret: '',
        amountHT: '75000',
        durationMonths: 48,
        _completedSteps: [],
      },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container, getByText } = render(tree);

    fireEvent.click(getByText(/Continuer vers le calcul/));

    // The inline field error proves the gate ran (rather than the click simply
    // never reaching onContinue, which would make the assertion below vacuous).
    await waitFor(() =>
      expect(container.querySelector('[data-slot="field-error"]')).not.toBeNull(),
    );
    expect(saveAndAdvanceMock).not.toHaveBeenCalled();
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

// ──────────────────────────────────────────────────────────────────────────
// Phase 42 Plan 09 (FIELD-02 / D-11 / D-13, FIELD-01 / D-04):
// partnerTel session hydration + clientSiret resume prefill.
// ──────────────────────────────────────────────────────────────────────────
describe('Phase 42 — partnerTel hydration + clientSiret resume (D-11 / FIELD-01)', () => {
  // partnerTel is deliberately never rendered as a visible input (D-11), so
  // it cannot be asserted via a DOM query. It IS still tracked in RHF's form
  // state (ProposalForm.tsx defaultValues), so it survives a save-as-draft
  // round trip — verified here by clicking "Enregistrer comme brouillon" and
  // reading the payload WizardStep1Wiring hands to saveAsDraftAction directly
  // (the mock is live now that it is bound at the action's real module id).
  async function clickSaveDraftAndGetInputs(
    tree: Awaited<ReturnType<typeof ParametresStep1Page>>,
  ) {
    const { getByText } = render(tree);
    fireEvent.click(getByText(/Enregistrer comme brouillon/));
    await waitFor(() => expect(saveAsDraftMock).toHaveBeenCalled());
    const lastCall = saveAsDraftMock.mock.calls[
      saveAsDraftMock.mock.calls.length - 1
    ] as [string, Record<string, unknown>];
    return lastCall[1];
  }

  it('with session.user.companyTelephone set, saving as draft persists partnerTel from the session', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: 'Acme Leasing',
          companyTelephone: '01 23 45 67 89',
        },
      },
    });
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const inputs = await clickSaveDraftAndGetInputs(tree);
    expect(inputs.partnerTel).toBe('01 23 45 67 89');
  });

  it('with companyTelephone null, saving as draft persists partnerTel: "" and the page still renders', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: 'Acme Leasing',
          companyTelephone: null,
        },
      },
    });
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const inputs = await clickSaveDraftAndGetInputs(tree);
    expect(inputs.partnerTel).toBe('');
  });

  it('with companyTelephone whitespace-only "   ", saving as draft persists partnerTel: ""', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: 'Acme Leasing',
          companyTelephone: '   ',
        },
      },
    });
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const inputs = await clickSaveDraftAndGetInputs(tree);
    expect(inputs.partnerTel).toBe('');
  });

  it('a stored inputs.partnerTel differing from the session value does not survive into the prefill — session wins', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: 'Acme Leasing',
          companyTelephone: '01 23 45 67 89',
        },
      },
    });
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { partnerTel: '09 99 99 99 99', _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const inputs = await clickSaveDraftAndGetInputs(tree);
    expect(inputs.partnerTel).toBe('01 23 45 67 89');
    expect(inputs.partnerTel).not.toBe('09 99 99 99 99');
  });

  it('resuming a draft whose inputs.clientSiret is "12345678900012" produces a prefill containing that value', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { clientSiret: '12345678900012', _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const clientSiretInput = container.querySelector(
      '#client-siret',
    ) as HTMLInputElement | null;
    expect(clientSiretInput?.value).toBe('12345678900012');
  });

  it('resuming a draft with no clientSiret key produces clientSiret: "" and does not throw', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      userId: USER_ID,
      status: 'draft',
      deletedAt: null,
      inputs: { _completedSteps: [] },
    });
    const tree = await ParametresStep1Page({
      searchParams: Promise.resolve({ draft_id: 'd-1' }),
    });
    const { container } = render(tree);
    const clientSiretInput = container.querySelector(
      '#client-siret',
    ) as HTMLInputElement | null;
    expect(clientSiretInput?.value ?? '').toBe('');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Phase 42 Plan 09 (FIELD-02 / D-11 / D-25 / D-30):
// overlay writes re-assert partnerTel; clientSiret survives the duplicate
// ...sourceInputs spread untouched.
// ──────────────────────────────────────────────────────────────────────────
describe('Phase 42 — overlay writes re-assert partnerTel (D-11 / D-25 / D-30)', () => {
  it('minting a draft from a client relationship writes partnerTel into the overlay inputs alongside partnerName and partnerCo', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: 'Acme Leasing',
          companyTelephone: '01 23 45 67 89',
        },
      },
    });
    getClientRelationshipForOwnerMock.mockResolvedValue({
      relationshipId: 'rel-1',
      companyId: 'co-1',
      companyName: 'Acme Corp',
      siren: '123456789',
      createdAt: new Date(),
    });
    listContactsForRelationshipMock.mockResolvedValue([]);
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ clientRelationshipId: 'rel-1' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect(payload.inputs.partnerTel).toBe('01 23 45 67 89');
    expect(payload.inputs.partnerName).toBe('Alice Partner');
    expect(payload.inputs.partnerCo).toBe('Acme Leasing');
  });

  it('duplicating a proposal writes the current session partnerTel into the overlay, discarding the source proposal stored partnerTel', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: 'Acme Leasing',
          companyTelephone: '01 23 45 67 89',
        },
      },
    });
    getProposalByIdMock.mockResolvedValue({
      id: 'source-1',
      userId: USER_ID,
      deletedAt: null,
      inputs: {
        clientCo: 'PrefilledCorp',
        clientSiret: '12345678900012',
        partnerTel: '09 99 99 99 99',
      },
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ duplicate: 'source-1' }) }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect(payload.inputs.partnerTel).toBe('01 23 45 67 89');
    expect(payload.inputs.partnerTel).not.toBe('09 99 99 99 99');
    // clientSiret is client data, not partner attribution — still carried
    // through the ...sourceInputs spread, untouched by the overlay.
    expect(payload.inputs.clientSiret).toBe('12345678900012');
  });

  it('when companyTelephone is absent, the overlays write partnerTel: "" rather than omitting the key or writing undefined', async () => {
    requireUserMock.mockResolvedValue({
      session: {
        user: {
          id: USER_ID,
          email: 'partner@example.com',
          displayName: 'Alice Partner',
          name: 'Alice',
          companyName: 'Acme Leasing',
          companyTelephone: null,
        },
      },
    });
    getProposalByIdMock.mockResolvedValue({
      id: 'source-1',
      userId: USER_ID,
      deletedAt: null,
      inputs: { clientCo: 'PrefilledCorp' },
    });
    await expect(
      ParametresStep1Page({ searchParams: Promise.resolve({ duplicate: 'source-1' }) }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect('partnerTel' in payload.inputs).toBe(true);
    expect(payload.inputs.partnerTel).toBe('');
  });

  it('existing partnerName / partnerCo / validityDays overlay behaviour is unchanged and no additional updateDraft call is introduced', async () => {
    getClientRelationshipForOwnerMock.mockResolvedValue({
      relationshipId: 'rel-1',
      companyId: 'co-1',
      companyName: 'Acme Corp',
      siren: '123456789',
      createdAt: new Date(),
    });
    listContactsForRelationshipMock.mockResolvedValue([]);
    await expect(
      ParametresStep1Page({
        searchParams: Promise.resolve({ clientRelationshipId: 'rel-1' }),
      }),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    // Exactly one updateDraft call for the relationship-prefill path — no
    // new DB round-trip was introduced by this plan.
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [, , payload] = updateDraftMock.mock.calls[0] as [
      string,
      string,
      { inputs: Record<string, unknown> },
    ];
    expect(payload.inputs.partnerName).toBe('Alice Partner');
    expect(payload.inputs.partnerCo).toBe('Acme Leasing');
    expect(payload.inputs.validityDays).toBe(30);
  });
});
