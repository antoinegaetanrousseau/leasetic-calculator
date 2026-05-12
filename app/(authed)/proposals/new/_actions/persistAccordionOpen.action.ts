'use server';
/**
 * Phase 13 — persistAccordionOpen server action (fire-and-forget cosmetic state).
 *
 * Bound to PlusDeDetailsAccordion's `onToggle` (plan 13-01). When the partner
 * expands or collapses the "+ Plus de détails (facultatif)" accordion on
 * step 1, this action persists `_uiAccordionOpen: <bool>` into the draft's
 * `inputs` jsonb so the state survives a page reload.
 *
 * Contract:
 *   - D-06: failure is PURELY cosmetic — no toast, no error surfacing. The
 *     next updateDraft call (from saveAndAdvance or saveAsDraft) naturally
 *     overwrites `_uiAccordionOpen` with the current value, so a silent miss
 *     here self-recovers on the next user-driven save.
 *   - All errors swallowed via try/catch + console.warn. The function
 *     ALWAYS resolves to undefined.
 *
 * No redirect. No throw. No toast.
 */
import { requireUser } from '@/lib/auth/require';
import { getDraftById, updateDraft } from '@/lib/db/queries/proposals';

export async function persistAccordionOpenAction(
  draftId: string,
  open: boolean,
): Promise<void> {
  try {
    const { session } = await requireUser();
    const prev = await getDraftById(draftId, session.user.id);
    if (!prev) {
      // D-03 — cross-user / soft-deleted / non-draft. Silently no-op; no
      // self-heal redirect because this action is fire-and-forget.
      return;
    }
    const prevInputs = (prev.inputs ?? {}) as Record<string, unknown>;
    await updateDraft(draftId, session.user.id, {
      inputs: { ...prevInputs, _uiAccordionOpen: open },
    });
  } catch (e) {
    // D-06: cosmetic-only state. NEVER throw, NEVER toast.
    console.warn('persistAccordionOpen failed (non-fatal):', e);
  }
}
