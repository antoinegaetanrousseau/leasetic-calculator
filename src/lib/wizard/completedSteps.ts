/**
 * Phase 13 — D-21 / D-22 / D-23 Stepper bookkeeping helpers.
 *
 * `_completedSteps` is a `number[]` stored inside the draft's `inputs` jsonb.
 * Algorithm rules:
 *   - D-21 edit-invalidates-downstream: editing any step-1-owned input clears
 *     the done-mark for that step AND all subsequent steps. The partner must
 *     walk back through `Continuer` to regain each downstream done-check.
 *   - D-22 navigate-preserves-state: clicking `← Précédent` / Stepper done-step
 *     links does NOT change `_completedSteps`. Only a true edit re-evaluates.
 *   - D-23: `← Modifier` links are equivalent to `← Précédent` (pure nav).
 *
 * Pure module — no I/O, no `'use server'`, no React.
 */

/**
 * Step ownership. Inputs owned by step 1 are the only ones that can trigger
 * the D-21 invalidation when edited.
 *
 * Step 2 owns nothing (read-only per D-11).
 * Step 3 owns nothing (read-only; clicking Continuer = finalize, not advance).
 *
 * `partnerCo` + `partnerName` are session-hydrated server-side (D-07) but are
 * persisted inside `inputs` — therefore they count as step-1-owned for the
 * change-detection predicate even though the partner cannot type them.
 */
const STEP_1_KEYS = [
  'clientCo',
  'clientName',
  'clientEmail',
  'clientTel',
  'clientRole',
  'clientSiren',
  'partnerRef',
  'amountHT',
  'durationMonths',
  'projectDesc',
  'slb',
  'evalParc',
  'partnerCo',
  'partnerName',
] as const;

/**
 * D-21 edit-invalidates-downstream + D-22 navigate-preserves-state derivation.
 *
 * @param prevInputs  The draft's CURRENT inputs jsonb (before this update).
 * @param nextInputs  The inputs jsonb about to be persisted.
 * @param fromStep    Which step the partner is leaving (1 | 2).
 *
 * Algorithm:
 *   1. Determine the lowest step whose owned inputs differ between
 *      prev → next (currently only step 1 owns inputs; step 2/3 don't).
 *      `_completedSteps` and `_uiAccordionOpen` are bookkeeping fields and
 *      are EXCLUDED from change detection.
 *   2. Start with prevInputs._completedSteps (default []).
 *   3. Filter to numbers strictly less than lowestChangedStep
 *      (i.e., clear downstream done-marks).
 *   4. Add `fromStep` since the partner is advancing forward through it
 *      (this matches the PLAN's per-test expectation that fromStep is
 *      always present in the result when this function returns).
 *   5. Sort ascending + deduplicate.
 *
 * Returns the new _completedSteps array.
 */
export function deriveCompletedSteps(
  prevInputs: Record<string, unknown>,
  nextInputs: Record<string, unknown>,
  fromStep: 1 | 2,
): number[] {
  // 1. Detect lowest changed step. Only step-1 keys can trigger invalidation
  //    in Phase 13 (step 2 + 3 are read-only).
  let lowestChangedStep = Infinity;
  for (const key of STEP_1_KEYS) {
    if (prevInputs[key] !== nextInputs[key]) {
      lowestChangedStep = 1;
      break;
    }
  }

  // 2. Start from prev._completedSteps (default empty).
  const prevSteps = Array.isArray(prevInputs._completedSteps)
    ? (prevInputs._completedSteps as number[])
    : [];

  // 3. Trim to strictly-less-than lowestChangedStep (Infinity → preserve all).
  const trimmed = prevSteps.filter(
    (n) => typeof n === 'number' && n < lowestChangedStep,
  );

  // 4. Add fromStep — partner is advancing through it.
  trimmed.push(fromStep);

  // 5. Sort ascending + deduplicate.
  return Array.from(new Set(trimmed)).sort((a, b) => a - b);
}

/**
 * Idempotent append-and-sort. Used by `saveAndAdvanceAction` after
 * `deriveCompletedSteps` to mark the leaving step as completed.
 *
 * @example
 *   markStepCompleted(undefined, 1) → [1]
 *   markStepCompleted([1], 2)        → [1, 2]
 *   markStepCompleted([1, 2], 1)     → [1, 2]   (idempotent)
 *   markStepCompleted([2], 1)        → [1, 2]   (sorted ascending)
 */
export function markStepCompleted(
  prevSteps: number[] | undefined,
  step: 1 | 2 | 3,
): number[] {
  const base = Array.isArray(prevSteps) ? prevSteps : [];
  return Array.from(new Set([...base, step])).sort((a, b) => a - b);
}
