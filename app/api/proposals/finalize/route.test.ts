/**
 * Plan 13-02 Task 2 — POST /api/proposals/finalize route tests
 * (behavior 12-16 from PLAN.md).
 *
 * Pattern mirrors app/api/proposals/route-list.test.ts: mock requireUser,
 * finalizeWizard, getCurrentLang; instantiate a NextRequest-ish object
 * and invoke POST().
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { requireUserMock, finalizeWizardMock, getCurrentLangMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  finalizeWizardMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
}));

vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/i18n', () => ({ getCurrentLang: getCurrentLangMock }));
vi.mock('@/lib/api/proposals/finalize-wizard', () => ({
  finalizeWizard: (...args: unknown[]) => finalizeWizardMock(...args),
}));

import { POST, runtime, dynamic } from './route';

function makeReq(body: unknown): { json: () => Promise<unknown> } {
  return {
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

beforeEach(() => {
  requireUserMock.mockReset();
  finalizeWizardMock.mockReset();
  getCurrentLangMock.mockReset();
  requireUserMock.mockResolvedValue({ session: { user: { id: 'u-1' } } });
  getCurrentLangMock.mockResolvedValue('fr');
  finalizeWizardMock.mockResolvedValue({ id: 'p-finalized-1' });
});

afterEach(() => vi.clearAllMocks());

describe('POST /api/proposals/finalize (D-16 atomic finalize)', () => {
  it('Test 12: route module exports runtime = "nodejs" and dynamic = "force-dynamic"', () => {
    expect(runtime).toBe('nodejs');
    expect(dynamic).toBe('force-dynamic');
  });

  it('Test 13: returns 401 JSON when requireUser throws (no session)', async () => {
    requireUserMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT:/login'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
    expect(finalizeWizardMock).not.toHaveBeenCalled();
  });

  it('Test 14: returns 200 + { id } when finalizeWizard resolves', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 'p-finalized-1' });
    expect(finalizeWizardMock).toHaveBeenCalledWith({
      userId: 'u-1',
      draftId: 'd-1',
      language: 'fr',
    });
  });

  it('Test 15: returns 500 + bounded error code when finalizeWizard throws unrecognized error', async () => {
    finalizeWizardMock.mockRejectedValueOnce(new Error('some_internal_failure'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('finalize_failed');
    // ADMIN-09: never echo the internal message.
    expect(JSON.stringify(body).toLowerCase()).not.toContain('commission');
    expect(JSON.stringify(body)).not.toContain('some_internal_failure');
  });

  it('Test 15b: bounded error codes — DraftNotFound, NoGlobalParams, ValidationFailed, FinalizeFailed echo through (500)', async () => {
    const codes = ['DraftNotFound', 'NoGlobalParams', 'ValidationFailed', 'FinalizeFailed'];
    for (const code of codes) {
      finalizeWizardMock.mockRejectedValueOnce(new Error(code));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe(code);
    }
  });

  it('Test 16: returns 400 missing_draft_id when body has no draftId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({}) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('missing_draft_id');
    expect(finalizeWizardMock).not.toHaveBeenCalled();
  });

  it('Test 16b: returns 400 invalid_body when req.json() throws', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq(new Error('bad json')) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_body');
  });

  it('Test 16c: threads session.user.id + language fr/en into finalizeWizard call', async () => {
    getCurrentLangMock.mockResolvedValue('en');
    requireUserMock.mockResolvedValue({ session: { user: { id: 'u-99' } } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await POST(makeReq({ draftId: 'd-99' }) as any);
    expect(finalizeWizardMock).toHaveBeenCalledWith({
      userId: 'u-99',
      draftId: 'd-99',
      language: 'en',
    });
  });
});
