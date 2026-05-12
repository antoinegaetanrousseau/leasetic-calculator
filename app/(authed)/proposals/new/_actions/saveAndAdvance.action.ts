'use server';
/**
 * Phase 13 — saveAndAdvance server action.
 *
 * Wave-1 plan 13-02. Bound by the WizardActionBar primary CTA on steps 1 + 2.
 *
 * Contract:
 *   - D-01: requireUser() FIRST (auth gate per PITFALLS §7.3).
 *   - D-13 schema unchanged in Phase 13. Server re-validates proposalInputSchema.
 *   - D-21 edit-invalidates-downstream — deriveCompletedSteps trims the
 *     `_completedSteps` array when a step-1 field changes, then
 *     markStepCompleted re-adds the leaving step idempotently.
 *   - D-22 navigate-preserves-state — `_uiAccordionOpen` is carried forward
 *     from prev unchanged (cosmetic state never changes on advance).
 *   - D-03 silent self-heal — updateDraft returns null on cross-user /
 *     soft-deleted / non-draft; we redirect to /proposals/new/parametres.
 *
 * Failure modes:
 *   - Auth missing → `requireUser()` redirects to /login (route handler caller
 *     surfaces nothing; the redirect throws inside this action and the
 *     framework propagates).
 *   - Validation failure → throw Error('ValidationFailed'). Client side
 *     (WizardActionBar) catches and surfaces toast 'wizard.toast.validation.errors'.
 *   - Draft missing / cross-user → silent redirect to /proposals/new/parametres
 *     (URL-secrecy discipline; never confirms cross-user existence).
 */
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require';
import { proposalInputSchema } from '@/lib/calc';
import { getDraftById, updateDraft } from '@/lib/db/queries/proposals';
import {
  deriveCompletedSteps,
  markStepCompleted,
} from '@/lib/wizard/completedSteps';

/**
 * Persist the step-N inputs and advance to the next step.
 *
 * @param draftId    UUID of the in-flight draft.
 * @param nextInputs Full replacement of the draft's `inputs` jsonb (the
 *                   client sends every field at every step — stateless server
 *                   per Phase 12 full-replace contract).
 * @param fromStep   Which step the partner is leaving (1 → /calcul, 2 → /verification).
 */
export async function saveAndAdvanceAction(
  draftId: string,
  nextInputs: Record<string, unknown>,
  fromStep: 1 | 2,
): Promise<void> {
  // D-01: auth FIRST.
  const { session } = await requireUser();

  // D-13: re-validate the canonical schema server-side. Defence in depth
  // against client-bypass tampering; the client's RHF resolver already gates.
  const parsed = proposalInputSchema.safeParse(nextInputs);
  if (!parsed.success) {
    // Caller's WizardActionBar catch converts this to toast
    // 'wizard.toast.validation.errors' (UI-SPEC §6.8).
    throw new Error('ValidationFailed');
  }

  // Read prev inputs for D-21 invalidation + _uiAccordionOpen carry-forward.
  // D-03 self-heal: getDraftById returns null for cross-user / non-draft /
  // soft-deleted → never proceed; redirect to /parametres which mints a fresh draft.
  const prev = await getDraftById(draftId, session.user.id);
  if (!prev) {
    redirect('/proposals/new/parametres');
  }

  const prevInputs = (prev.inputs ?? {}) as Record<string, unknown>;
  const completed = deriveCompletedSteps(prevInputs, nextInputs, fromStep);
  const merged: Record<string, unknown> = {
    ...nextInputs,
    _uiAccordionOpen: prevInputs._uiAccordionOpen ?? false,
    _completedSteps: markStepCompleted(completed, fromStep),
  };

  const updated = await updateDraft(draftId, session.user.id, {
    inputs: merged,
  });
  if (!updated) {
    // D-03 self-heal — never confirm cross-user existence.
    redirect('/proposals/new/parametres');
  }

  const nextSlug = fromStep === 1 ? 'calcul' : 'verification';
  redirect(`/proposals/new/${nextSlug}?draft_id=${draftId}`);
}
