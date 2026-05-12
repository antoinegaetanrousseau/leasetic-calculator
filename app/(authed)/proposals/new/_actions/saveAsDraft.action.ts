'use server';
/**
 * Phase 13 — saveAsDraft server action.
 *
 * Bound by the WizardActionBar `Enregistrer comme brouillon` button on all
 * 3 wizard steps.
 *
 * Contract:
 *   - D-01: requireUser() FIRST.
 *   - D-17: redirect to '/' (partner home) on success. The success toast
 *     `Brouillon enregistré ✓` is mounted client-side by WizardActionBar
 *     before the redirect (see plan 13-01 WizardActionBar handleSave).
 *   - D-22 navigate-preserves-state: Save is NOT an "advance" event. This
 *     action does NOT modify `_completedSteps` — it sends the client's
 *     `nextInputs` verbatim. The client may include `_completedSteps`
 *     and `_uiAccordionOpen` in nextInputs; we persist them as-is.
 *   - D-03 silent self-heal: updateDraft returns null on cross-user /
 *     soft-deleted / non-draft → redirect to /proposals/new/parametres
 *     (never 404; URL-secrecy discipline).
 *
 * No schema re-validation here — Save tolerates partial state (the partner
 * may still be filling step 1). The finalize route is the canonical
 * validation gate (D-16 step 1).
 */
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth/require';
import { updateDraft } from '@/lib/db/queries/proposals';

export async function saveAsDraftAction(
  draftId: string,
  nextInputs: Record<string, unknown>,
): Promise<void> {
  // D-01: auth FIRST.
  const { session } = await requireUser();

  // D-22: preserve client-supplied _completedSteps + _uiAccordionOpen verbatim.
  const updated = await updateDraft(draftId, session.user.id, {
    inputs: nextInputs,
  });
  if (!updated) {
    // D-03 silent self-heal.
    redirect('/proposals/new/parametres');
  }

  // D-17: partner home. Phase 14 will surface a "Brouillons" MetricTile to
  // resume — Phase 13 explicitly accepts the 1-phase resume gap (D-27).
  redirect('/');
}
