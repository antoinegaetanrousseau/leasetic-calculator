/**
 * Plan 13-02 Task 1 — saveAndAdvanceAction tests.
 *
 * Behavior tests 11-16 from PLAN.md + legacy-redirect test 23.
 *
 * Strategy: mock requireUser, getDraftById, updateDraft, and redirect via vi.mock.
 * Each test verifies the action's invocation of the underlying primitives + the
 * resulting redirect target (or absence thereof).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// server-only is mocked because we're running outside Next bundler.
vi.mock('server-only', () => ({}));

// Mock next/navigation's redirect — never actually navigate during tests.
const redirectMock = vi.fn((path: string) => {
  // mimic real redirect() behavior: it throws to halt execution
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

// Mock requireUser — return a synthetic session or throw on unauth.
const requireUserMock = vi.fn();
vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));

// Mock the draft helpers + getDraftById + updateDraft from proposals.ts.
const getDraftByIdMock = vi.fn();
const updateDraftMock = vi.fn();
vi.mock('@/lib/db/queries/proposals', () => ({
  getDraftById: (...args: unknown[]) => getDraftByIdMock(...args),
  updateDraft: (...args: unknown[]) => updateDraftMock(...args),
}));

import { saveAndAdvanceAction } from './saveAndAdvance.action';

const VALID_INPUTS = {
  partnerCo: 'Leasetic SAS',
  partnerName: 'Bob Partner',
  clientCo: 'Acme Corp',
  amountHT: '75000',
  durationMonths: 48 as const,
};

beforeEach(() => {
  redirectMock.mockClear();
  requireUserMock.mockReset();
  getDraftByIdMock.mockReset();
  updateDraftMock.mockReset();

  // Default happy path
  requireUserMock.mockResolvedValue({ session: { user: { id: 'u-1' } } });
  getDraftByIdMock.mockResolvedValue({ id: 'd-1', inputs: {} });
  updateDraftMock.mockResolvedValue({ id: 'd-1', inputs: VALID_INPUTS });
});

afterEach(() => vi.clearAllMocks());

describe('saveAndAdvanceAction (D-01, D-03, D-21)', () => {
  it('Test 11: requireUser throws → action surfaces no redirect from this layer (re-throws)', async () => {
    requireUserMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/login'));
    await expect(
      saveAndAdvanceAction('d-1', VALID_INPUTS, 1),
    ).rejects.toThrow(/NEXT_REDIRECT:\/login/);
    // updateDraft must NOT have been called (auth-first per PITFALLS §7.3)
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it('Test 12: invalid nextInputs (missing required field) → returns early; no updateDraft, no advance redirect', async () => {
    // Pass an object missing clientCo (required by proposalInputSchema).
    // The action MUST NOT call updateDraft and MUST NOT redirect to the next step.
    const bad = { partnerCo: 'X', partnerName: 'Y' };
    // The action throws ValidationFailed (caught by the client → toast).
    await expect(saveAndAdvanceAction('d-1', bad, 1)).rejects.toThrow(/ValidationFailed/);
    expect(updateDraftMock).not.toHaveBeenCalled();
    // No advance redirect occurred
    const advanceCalls = redirectMock.mock.calls.filter(
      (c) => typeof c[0] === 'string' && (c[0] as string).startsWith('/proposals/new/calcul'),
    );
    expect(advanceCalls).toHaveLength(0);
  });

  it('Test 13: happy path — updateDraft called with merged payload (inputs + _completedSteps + _uiAccordionOpen)', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      inputs: { _uiAccordionOpen: true, _completedSteps: [] },
    });
    updateDraftMock.mockResolvedValue({ id: 'd-1', inputs: { ...VALID_INPUTS } });

    await expect(saveAndAdvanceAction('d-1', VALID_INPUTS, 1))
      .rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/calcul/);

    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [draftIdArg, userIdArg, payloadArg] = updateDraftMock.mock.calls[0];
    expect(draftIdArg).toBe('d-1');
    expect(userIdArg).toBe('u-1');
    const merged = (payloadArg as { inputs: Record<string, unknown> }).inputs;
    expect(merged.clientCo).toBe('Acme Corp');
    expect(merged._uiAccordionOpen).toBe(true); // preserved from prev
    expect(merged._completedSteps).toEqual([1]); // markStepCompleted(deriveCompletedSteps(...), 1)
  });

  it('Test 14: fromStep=1 → redirects to /proposals/new/calcul?draft_id=<id>', async () => {
    await expect(saveAndAdvanceAction('d-1', VALID_INPUTS, 1))
      .rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/calcul\?draft_id=d-1/);
  });

  it('Test 15: fromStep=2 → redirects to /proposals/new/verification?draft_id=<id>', async () => {
    getDraftByIdMock.mockResolvedValue({
      id: 'd-1',
      inputs: { ...VALID_INPUTS, _completedSteps: [1] },
    });
    updateDraftMock.mockResolvedValue({ id: 'd-1', inputs: { ...VALID_INPUTS, _completedSteps: [1, 2] } });
    await expect(saveAndAdvanceAction('d-1', VALID_INPUTS, 2))
      .rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/verification\?draft_id=d-1/);
  });

  it('Test 16: updateDraft returns null → D-03 self-heal redirect to /proposals/new/parametres', async () => {
    updateDraftMock.mockResolvedValue(null);
    await expect(saveAndAdvanceAction('d-1', VALID_INPUTS, 1))
      .rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres/);
    // Final call must be the self-heal redirect
    const lastCall = redirectMock.mock.calls[redirectMock.mock.calls.length - 1];
    expect(lastCall[0]).toBe('/proposals/new/parametres');
  });

  it('Test 16b: getDraftById returns null (foreign / soft-deleted) → D-03 self-heal redirect', async () => {
    getDraftByIdMock.mockResolvedValue(null);
    await expect(saveAndAdvanceAction('d-1', VALID_INPUTS, 1))
      .rejects.toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres/);
    expect(updateDraftMock).not.toHaveBeenCalled();
  });
});

describe('legacy redirect route (D-04)', () => {
  it('Test 23: app/(authed)/proposals/new/page.tsx default export calls redirect("/proposals/new/parametres")', async () => {
    // We just import the legacy route module and invoke its default export.
    // It must call `redirect()` (which throws via our mock).
    redirectMock.mockClear();
    const mod = await import('../page');
    expect(typeof mod.default).toBe('function');
    expect(() => mod.default()).toThrow(/NEXT_REDIRECT:\/proposals\/new\/parametres/);
    expect(redirectMock).toHaveBeenCalledWith('/proposals/new/parametres');
  });
});
