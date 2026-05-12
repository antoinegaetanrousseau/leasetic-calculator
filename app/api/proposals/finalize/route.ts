import { NextResponse, type NextRequest } from 'next/server';

import { finalizeWizard } from '@/lib/api/proposals/finalize-wizard';
import { requireUser } from '@/lib/auth/require';
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
  try {
    const { session } = await requireUser();
    userId = session.user.id;
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
    const result = await finalizeWizard({ userId, draftId, language });
    return NextResponse.json({ id: result.id }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const safeCode = SAFE_ERROR_CODES.has(message) ? message : 'finalize_failed';
    // ADMIN-09: NEVER include the full payload in the error response.
    // Bounded error codes only — partner sees a generic toast for unknown errors.
    return NextResponse.json({ error: safeCode }, { status: 500 });
  }
}
