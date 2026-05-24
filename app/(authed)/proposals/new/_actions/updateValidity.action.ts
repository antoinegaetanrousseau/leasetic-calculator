'use server';
/**
 * Phase 17 Plan 07 — updateValidityAction server action.
 *
 * Bound by the WIZ-04 validity selector on wizard step 3 (the segmented
 * 15j / 30j / 60j pill inside the CALCUL recap card). Lets the partner
 * override the per-proposal validity without affecting global_params, and
 * WITHOUT redirecting — the page stays on step 3 so the partner can
 * continue reviewing before clicking Confirmer & Générer le PDF.
 *
 * Contract:
 *   - T-17-07-01 (Tampering, cross-user draft update): `requireUser()`
 *     FIRST, then `getDraftById` is called with `userId = session.user.id`
 *     so the helper's WHERE predicate enforces ownership. A cross-user
 *     draftId resolves to `null` and the action returns
 *     `{ ok: false, error: 'not_found' }` — never a 200 with another
 *     partner's data mutated.
 *   - T-17-07-02 (Tampering, invalid validity value): Zod enum
 *     validates `days ∈ {15, 30, 60}` even though the TS literal type
 *     narrows the client compile path; this is defense against direct
 *     server-action invocation with an attacker-controlled value.
 *   - Phase 12 D-22 — full-replace inputs jsonb semantics: read current
 *     draft.inputs, spread, set validityDays, write back.
 *   - Phase 13 D-08 / Phase 17 D-02 — finalizeDraft already copies
 *     `draft.inputs.validityDays` into `proposal.validity_days` at
 *     finalize. This action is the per-proposal write surface.
 *   - Pre-finalize lifecycle: NO audit_log entry (Phase 13 D-16; Phase 17
 *     CONTEXT Established Patterns — validity edits before finalize are
 *     draft-input changes, not lifecycle events).
 *   - NO redirect (vs. saveAsDraftAction): the client component
 *     (ValiditySelectorClient) calls this from inside useTransition and
 *     keeps the partner on step 3.
 */
import { z } from 'zod';

import { requireUser } from '@/lib/auth/require';
import { getDraftById, updateDraft } from '@/lib/db/queries/proposals';

const daysSchema = z.union([z.literal(15), z.literal(30), z.literal(60)]);
const draftIdSchema = z.string().min(1);

export type UpdateValidityResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'invalid_days' | 'invalid_draft_id' };

export async function updateValidityAction(
  draftId: string,
  days: 15 | 30 | 60,
): Promise<UpdateValidityResult> {
  // T-17-07-01: auth FIRST (PITFALLS §7.3); session.user.id is the trust
  // anchor for every downstream query.
  const { session } = await requireUser();

  // T-17-07-02: defense-in-depth Zod validation on the days enum.
  const daysParsed = daysSchema.safeParse(days);
  if (!daysParsed.success) {
    return { ok: false, error: 'invalid_days' };
  }

  const draftIdParsed = draftIdSchema.safeParse(draftId);
  if (!draftIdParsed.success) {
    return { ok: false, error: 'invalid_draft_id' };
  }

  // Ownership-enforcing read — getDraftById's WHERE clause includes
  // `user_id = $userId`, so a cross-user draftId returns null.
  const current = await getDraftById(draftIdParsed.data, session.user.id);
  if (!current) {
    return { ok: false, error: 'not_found' };
  }

  // Phase 12 D-22 full-replace inputs jsonb. Spread the current inputs and
  // overwrite ONLY validityDays — every other field (clientCo, amountHT,
  // durationMonths, _completedSteps, _uiAccordionOpen, …) is preserved
  // verbatim.
  const currentInputs = (current.inputs as Record<string, unknown>) ?? {};
  const nextInputs = { ...currentInputs, validityDays: daysParsed.data };

  const updated = await updateDraft(draftIdParsed.data, session.user.id, {
    inputs: nextInputs,
  });
  if (!updated) {
    // Belt-and-suspenders: if the row vanished between getDraftById and
    // updateDraft (concurrent soft-delete, finalize), treat as not_found.
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}
