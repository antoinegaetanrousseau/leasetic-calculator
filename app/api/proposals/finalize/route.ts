import { NextResponse, type NextRequest } from 'next/server';

import { finalizeWizard } from '@/lib/api/proposals/finalize-wizard';
import { requireUser } from '@/lib/auth/require';
import { getProposalById, insertRelationshipEventForOwner } from '@/lib/db/queries';
import { getCurrentLang } from '@/lib/i18n';

/**
 * Phase 13 — POST /api/proposals/finalize
 *
 * D-16: the atomic finalize endpoint. Client POSTs { draftId } from
 * /proposals/new/verification → step 3 `Confirmer & Générer le PDF` CTA.
 * Server runs the 8-step pipeline and returns { id } on success, or a
 * bounded error code on failure.
 *
 * runtime = 'nodejs' — @react-pdf/renderer + storage adapter both require
 * Node APIs (matches app/api/proposals/route.ts:10).
 *
 * dynamic = 'force-dynamic' — cookie/session-reading per PITFALLS §1.6.
 *
 * Threat model (T-13-02 cluster):
 *   - T-S Spoofing: requireUser() runs FIRST → 401 JSON on missing session.
 *   - T-T Tampering: finalizeWizard re-validates proposalInputSchema server-side
 *     against the draft's persisted inputs (defense in depth — partner cannot
 *     hand-craft a finalize POST that bypasses the schema).
 *   - T-I Information Disclosure (ADMIN-09 D-12): the error JSON returns only
 *     bounded safeCodes — never echoes raw err.message. The full PDF render +
 *     audit_log write are owned by finalize-wizard.ts + Phase 12's
 *     finalizeDraft; neither carries the partner-only-visible field. The route
 *     handler itself never names that field.
 *   - T-E Privilege Escalation: the WHERE userId predicate inside Phase 12's
 *     getDraftById / finalizeDraft guarantees that a cross-user draftId returns
 *     null → finalizeWizard throws 'DraftNotFound' (which echoes through to the
 *     client as a safeCode). The endpoint never confirms or denies existence
 *     of another user's draft.
 *   - T-R Repudiation: Phase 12's finalizeDraft writes one audit_log entry
 *     `action='proposal.create'` inside the same transaction as the UPDATE.
 *     Append-only audit_log table provides non-repudiation.
 *   - T-I / T-E ACTV-02 timeline hook (Phase 34 plan 34-08): the
 *     `proposal_finalized` event carries the proposal id and its LC reference
 *     only — never an amount, a rate or the partner-only-visible field
 *     (ADMIN-09 / D-26). It is written by this handler rather than by a
 *     database trigger because a trigger cannot see the session and ACTV-02
 *     requires an actor (D-15). This is a `requireUser()` surface serving every
 *     role, so the write is made safe by passing `ownerId: userId` into
 *     `insertRelationshipEventForOwner`, whose `INSERT … SELECT` inserts
 *     nothing for a caller who does not own the relationship. The hook lives in
 *     its own try/catch AFTER finalizeWizard has resolved, so it cannot reach
 *     the outer catch and cannot change the response, the status code or the
 *     bounded error surface above.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bounded error codes returned to the client. Anti-enumeration discipline —
// never echo the internal err.message. The 4 named codes are surfaced; any
// other throw maps to the generic 'finalize_failed'.
const SAFE_ERROR_CODES = new Set([
  'DraftNotFound',
  'NoGlobalParams',
  'ValidationFailed',
  'FinalizeFailed',
]);

export async function POST(req: NextRequest) {
  // Step 0: requireUser FIRST (PITFALLS §7.3). The helper throws via
  // redirect('/login') on missing session; translate the thrown NEXT_REDIRECT
  // into a 401 JSON so API consumers can handle it without following the
  // redirect chain.
  let userId: string;
  let partnerType: 'Agent' | 'Commercial' | 'Partenaire';
  try {
    const { session } = await requireUser();
    userId = session.user.id;
    // PTYPE-06: the author's partner type drives proposal economics. The type
    // is admin-assigned and client-immutable (input:false), so reading it here
    // is safe. Cast with fallback to 'Partenaire' to guard against legacy rows
    // that predate the migration (DEFAULT 'Partenaire' covers them in DB, but
    // a belt-and-suspenders cast protects during schema transition).
    const rawType = (session.user as { partnerType?: unknown }).partnerType;
    partnerType =
      rawType === 'Agent' || rawType === 'Commercial' ? rawType : 'Partenaire';
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Parse the request body. NextRequest.json() throws on invalid JSON.
  let body: { draftId?: unknown };
  try {
    body = (await req.json()) as { draftId?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body || typeof body.draftId !== 'string' || body.draftId.length === 0) {
    return NextResponse.json({ error: 'missing_draft_id' }, { status: 400 });
  }
  const draftId = body.draftId;

  // D-A2: capture language from the session/cookie at finalize time.
  const language = await getCurrentLang();

  try {
    const result = await finalizeWizard({ userId, draftId, language, partnerType });

    // ACTV-02 (D-15) — narrate the finalize onto the owner's timeline. Its OWN
    // try/catch, deliberately: by this point the PDF is rendered, uploaded and
    // the row is finalized, so a missing timeline entry is a narration gap and
    // must never turn a successful finalize into a 500. Nothing in here can
    // reach the outer catch, and the 200 below is unconditional.
    try {
      const proposal = await getProposalById(result.id);
      // A proposal created outside the CRM flow carries no relationship and has
      // nothing to narrate onto. The `userId` equality is defence in depth in
      // the shape app/api/proposals/[id]/pdf/route.ts uses on the same helper —
      // it is NOT the gate: ownership is proved inside the helper's
      // `INSERT … SELECT` by the `ownerId` argument below.
      if (proposal && proposal.userId === userId && proposal.clientRelationshipId) {
        await insertRelationshipEventForOwner({
          relationshipId: proposal.clientRelationshipId,
          ownerId: userId,
          kind: 'proposal_finalized',
          actorId: userId,
          payload: { proposalId: result.id, lcRef: proposal.lcRef },
        });
      }
    } catch (e) {
      console.error('[finalize] proposal_finalized event not written:', e);
    }

    return NextResponse.json({ id: result.id }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const safeCode = SAFE_ERROR_CODES.has(message) ? message : 'finalize_failed';
    // ADMIN-09: NEVER include the full payload in the error response.
    // Bounded error codes only — partner sees a generic toast for unknown errors.
    return NextResponse.json({ error: safeCode }, { status: 500 });
  }
}
