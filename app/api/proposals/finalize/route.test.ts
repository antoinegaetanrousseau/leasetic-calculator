/**
 * Plan 13-02 Task 2 — POST /api/proposals/finalize route tests
 * (behavior 12-16 from PLAN.md).
 *
 * Pattern mirrors app/api/proposals/route-list.test.ts: mock requireUser,
 * finalizeWizard, getCurrentLang; instantiate a NextRequest-ish object
 * and invoke POST().
 *
 * Phase 34 Plan 08 (ACTV-02) adds the `@/lib/db/queries` barrel to the mocked
 * set for the `proposal_finalized` timeline hook, and an ordered `callLog` —
 * the hook must provably run AFTER finalizeWizard resolves, and must never be
 * able to change the response, the status code or the bounded error surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  requireUserMock,
  finalizeWizardMock,
  getCurrentLangMock,
  getProposalByIdMock,
  insertRelationshipEventMock,
  callLog,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  finalizeWizardMock: vi.fn(),
  getCurrentLangMock: vi.fn(),
  getProposalByIdMock: vi.fn(),
  insertRelationshipEventMock: vi.fn(),
  callLog: [] as string[],
}));

vi.mock('@/lib/auth/require', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/i18n', () => ({ getCurrentLang: getCurrentLangMock }));
vi.mock('@/lib/api/proposals/finalize-wizard', () => ({
  finalizeWizard: (...args: unknown[]) => finalizeWizardMock(...args),
}));
vi.mock('@/lib/db/queries', () => ({
  getProposalById: getProposalByIdMock,
  insertRelationshipEventForOwner: insertRelationshipEventMock,
}));

/** A proposal row that carries a relationship — the narratable case. */
const LINKED_PROPOSAL = {
  id: 'p-finalized-1',
  userId: 'u-1',
  clientRelationshipId: 'r-1',
  lcRef: 'LC-2026-0042',
};

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
  getProposalByIdMock.mockReset();
  insertRelationshipEventMock.mockReset();
  callLog.length = 0;
  requireUserMock.mockResolvedValue({ session: { user: { id: 'u-1' } } });
  getCurrentLangMock.mockResolvedValue('fr');
  finalizeWizardMock.mockImplementation(async () => {
    callLog.push('finalizeWizard');
    return { id: 'p-finalized-1' };
  });
  getProposalByIdMock.mockResolvedValue(LINKED_PROPOSAL);
  insertRelationshipEventMock.mockImplementation(async () => {
    callLog.push('event');
    return { id: 'e-1' };
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

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
    // PTYPE-06: route threads the author's partnerType into finalizeWizard.
    // This session user has no partnerType → route falls back to 'Partenaire'.
    expect(finalizeWizardMock).toHaveBeenCalledWith({
      userId: 'u-1',
      draftId: 'd-1',
      language: 'fr',
      partnerType: 'Partenaire',
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
      partnerType: 'Partenaire',
    });
  });

  it('Test 16d (PTYPE-06): threads the author partnerType (Agent/Commercial) into finalizeWizard', async () => {
    for (const type of ['Agent', 'Commercial', 'Partenaire'] as const) {
      finalizeWizardMock.mockClear();
      requireUserMock.mockResolvedValue({
        session: { user: { id: 'u-pt', partnerType: type } },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await POST(makeReq({ draftId: 'd-pt' }) as any);
      expect(finalizeWizardMock).toHaveBeenCalledWith(
        expect.objectContaining({ partnerType: type }),
      );
    }
  });

  // ── Phase 34 Plan 08 — ACTV-02 proposal_finalized timeline hook ──────────

  it('34-08 Test 1: writes a proposal_finalized event attributed to the caller, payload keys exactly { proposalId, lcRef }', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(200);

    expect(insertRelationshipEventMock).toHaveBeenCalledTimes(1);
    const args = insertRelationshipEventMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.kind).toBe('proposal_finalized');
    expect(args.relationshipId).toBe('r-1');
    // ownerId is what makes this safe on a requireUser() surface: the helper's
    // INSERT … SELECT inserts nothing for a caller who owns no relationship.
    expect(args.ownerId).toBe('u-1');
    // T-34-08-01: attributed, never null.
    expect(args.actorId).toBe('u-1');
    // T-34-08-05: no amount, no rate, no partner-only-visible field (D-26).
    expect(Object.keys(args.payload as object).sort()).toEqual(['lcRef', 'proposalId']);
    expect((args.payload as Record<string, unknown>).proposalId).toBe('p-finalized-1');
    expect((args.payload as Record<string, unknown>).lcRef).toBe('LC-2026-0042');
  });

  it('34-08 Test 2: a proposal with no client_relationship_id writes no event and still returns 200 + { id }', async () => {
    getProposalByIdMock.mockResolvedValue({ ...LINKED_PROPOSAL, clientRelationshipId: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'p-finalized-1' });
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  it('34-08 Test 3: a thrown or null event write still returns 200 + { id } — the PDF exists', async () => {
    insertRelationshipEventMock.mockRejectedValueOnce(new Error('driver exploded'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const thrown: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(thrown.status).toBe(200);
    expect(await thrown.json()).toEqual({ id: 'p-finalized-1' });

    insertRelationshipEventMock.mockResolvedValueOnce(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nulled: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(nulled.status).toBe(200);
    expect(await nulled.json()).toEqual({ id: 'p-finalized-1' });
  });

  it('34-08 Test 3b: a thrown read in the hook still returns 200 — nothing in it can reach the outer catch', async () => {
    getProposalByIdMock.mockRejectedValueOnce(new Error('read exploded'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'p-finalized-1' });
  });

  it('34-08 Test 4: the hook runs AFTER finalizeWizard resolves, and a failed finalize writes no event', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(callLog).toEqual(['finalizeWizard', 'event']);

    callLog.length = 0;
    insertRelationshipEventMock.mockClear();
    finalizeWizardMock.mockRejectedValueOnce(new Error('FinalizeFailed'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(500);
    expect(insertRelationshipEventMock).not.toHaveBeenCalled();
  });

  it('34-08 Test 5: the bounded error surface is unchanged — the hook introduces no new code', async () => {
    finalizeWizardMock.mockRejectedValueOnce(new Error('ValidationFailed'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const known: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(await known.json()).toEqual({ error: 'ValidationFailed' });

    finalizeWizardMock.mockRejectedValueOnce(new Error('event_write_failed'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknownErr: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(await unknownErr.json()).toEqual({ error: 'finalize_failed' });
  });

  it('34-08 Test 6: a relationship owned by another user inserts nothing and the route still returns 200', async () => {
    // The helper's INSERT … SELECT selects zero rows for a non-owner and
    // returns null; the route must not read that as a failure.
    insertRelationshipEventMock.mockResolvedValue(null);
    getProposalByIdMock.mockResolvedValue({ ...LINKED_PROPOSAL, userId: 'someone-else' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await POST(makeReq({ draftId: 'd-1' }) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'p-finalized-1' });
  });

  it('Test 16e (PTYPE-06): unknown/legacy partnerType falls back to Partenaire', async () => {
    requireUserMock.mockResolvedValue({
      session: { user: { id: 'u-legacy', partnerType: 'bogus' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await POST(makeReq({ draftId: 'd-legacy' }) as any);
    expect(finalizeWizardMock).toHaveBeenCalledWith(
      expect.objectContaining({ partnerType: 'Partenaire' }),
    );
  });
});
