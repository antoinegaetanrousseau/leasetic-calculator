/**
 * Plan 13-02 Task 1 — saveAsDraftAction tests (behavior 17-20 from PLAN.md).
 *
 * D-17: redirects to '/' (partner home) on success — toast surfaced by WizardActionBar client.
 * D-22 navigate-preserves-state — Save does NOT modify _completedSteps.
 * D-03: null result (cross-user / soft-deleted / non-draft) → silent redirect to /proposals/new/parametres.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { redirectMock, requireUserMock, updateDraftMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  requireUserMock: vi.fn(),
  updateDraftMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/db/queries/proposals', () => ({
  updateDraft: (...args: unknown[]) => updateDraftMock(...args),
}));

import { saveAsDraftAction } from './saveAsDraft.action';

beforeEach(() => {
  redirectMock.mockClear();
  requireUserMock.mockReset();
  updateDraftMock.mockReset();
  requireUserMock.mockResolvedValue({ session: { user: { id: 'u-1' } } });
  updateDraftMock.mockResolvedValue({ id: 'd-1', inputs: {} });
});

afterEach(() => vi.clearAllMocks());

describe('saveAsDraftAction (D-17, D-22, D-03)', () => {
  it('Test 17: requireUser throws (no session) → action re-throws (auth gate)', async () => {
    requireUserMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/login'));
    await expect(saveAsDraftAction('d-1', {})).rejects.toThrow(/NEXT_REDIRECT:\/login/);
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it('Test 18: calls updateDraft({ inputs: nextInputs }) — does NOT modify _completedSteps (D-22)', async () => {
    const inputs = {
      clientCo: 'X',
      _completedSteps: [1],
      _uiAccordionOpen: true,
    };
    await expect(saveAsDraftAction('d-1', inputs)).rejects.toThrow(/NEXT_REDIRECT:\//);
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [draftIdArg, userIdArg, payloadArg] = updateDraftMock.mock.calls[0];
    expect(draftIdArg).toBe('d-1');
    expect(userIdArg).toBe('u-1');
    // Payload preserves _completedSteps EXACTLY as the client provided it (no recompute).
    expect((payloadArg as { inputs: Record<string, unknown> }).inputs._completedSteps).toEqual([1]);
    expect((payloadArg as { inputs: Record<string, unknown> }).inputs._uiAccordionOpen).toBe(true);
  });

  it('Test 19: redirects to / on success', async () => {
    await expect(saveAsDraftAction('d-1', { clientCo: 'X' })).rejects.toThrow(
      /NEXT_REDIRECT:\/$/,
    );
    const lastCall = redirectMock.mock.calls[redirectMock.mock.calls.length - 1];
    expect(lastCall[0]).toBe('/');
  });

  it('Test 20: updateDraft returns null → D-03 self-heal redirect to /proposals/new/parametres', async () => {
    updateDraftMock.mockResolvedValue(null);
    await expect(saveAsDraftAction('d-1', { clientCo: 'X' })).rejects.toThrow(
      /NEXT_REDIRECT:\/proposals\/new\/parametres/,
    );
  });
});
