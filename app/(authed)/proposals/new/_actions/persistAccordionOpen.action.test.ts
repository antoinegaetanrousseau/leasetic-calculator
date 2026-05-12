/**
 * Plan 13-02 Task 1 — persistAccordionOpenAction tests (behavior 21-22 from PLAN.md).
 *
 * D-06: cosmetic-only persistence; fire-and-forget; failure is non-fatal.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const { requireUserMock, getDraftByIdMock, updateDraftMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getDraftByIdMock: vi.fn(),
  updateDraftMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/db/queries/proposals', () => ({
  getDraftById: (...args: unknown[]) => getDraftByIdMock(...args),
  updateDraft: (...args: unknown[]) => updateDraftMock(...args),
}));

import { persistAccordionOpenAction } from './persistAccordionOpen.action';

// Silence the D-06 console.warn intentionally emitted on swallowed failures
// (Test 22 / 22b / 22c exercise these paths).
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  requireUserMock.mockReset();
  getDraftByIdMock.mockReset();
  updateDraftMock.mockReset();
  requireUserMock.mockResolvedValue({ session: { user: { id: 'u-1' } } });
  getDraftByIdMock.mockResolvedValue({ id: 'd-1', inputs: { clientCo: 'Acme' } });
  updateDraftMock.mockResolvedValue({ id: 'd-1', inputs: {} });
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.clearAllMocks();
});

describe('persistAccordionOpenAction (D-06 — fire-and-forget cosmetic state)', () => {
  it('Test 21: happy path — calls updateDraft with merged { ...prev, _uiAccordionOpen: <bool> }', async () => {
    await persistAccordionOpenAction('d-1', true);
    expect(updateDraftMock).toHaveBeenCalledTimes(1);
    const [draftIdArg, userIdArg, payloadArg] = updateDraftMock.mock.calls[0];
    expect(draftIdArg).toBe('d-1');
    expect(userIdArg).toBe('u-1');
    expect((payloadArg as { inputs: Record<string, unknown> }).inputs).toEqual({
      clientCo: 'Acme',
      _uiAccordionOpen: true,
    });
  });

  it('Test 22: when updateDraft throws → action swallows the error (no toast, no redirect)', async () => {
    updateDraftMock.mockRejectedValue(new Error('DB unavailable'));
    // The promise must RESOLVE (no throw) — failure is purely cosmetic per D-06.
    await expect(persistAccordionOpenAction('d-1', true)).resolves.toBeUndefined();
  });

  it('Test 22b: when requireUser throws → action swallows the error (cosmetic-only)', async () => {
    requireUserMock.mockRejectedValue(new Error('NEXT_REDIRECT:/login'));
    await expect(persistAccordionOpenAction('d-1', true)).resolves.toBeUndefined();
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it('Test 22c: when getDraftById returns null (cross-user) → no updateDraft, no throw', async () => {
    getDraftByIdMock.mockResolvedValue(null);
    await expect(persistAccordionOpenAction('d-1', false)).resolves.toBeUndefined();
    expect(updateDraftMock).not.toHaveBeenCalled();
  });
});
