/**
 * Tranche resolution — port of v10's tKey() / tLabel() (lines 1195-1211).
 *
 * D-3 (Phase 7 CONTEXT): tLabel returns i18n KEYS, not strings — keeps the
 * calc engine locale-agnostic. The consumer (Plan 07-05's `<LiveLoyerPreview>`
 * tranche badge) maps the key through t() at render time.
 *
 * Pure module — no I/O, no React, no framework imports.
 */

export type TrancheKey = 't1' | 't2' | 't3' | 't4';

/**
 * Resolve a project amount (€ HT) to its tranche key, or null if amount is
 * at-or-below v10's 25 000 € floor.
 *
 * v10 thresholds (Matrice_2026_THE_Leasetic-v10.html lines 1195-1201):
 *   amount ≤ 25 000  → null
 *   amount ≤ 50 000  → t1
 *   amount ≤ 100 000 → t2
 *   amount ≤ 250 000 → t3
 *   amount > 250 000 → t4
 */
export function tKey(amount: number): TrancheKey | null {
  if (amount <= 25000) return null;
  if (amount <= 50000) return 't1';
  if (amount <= 100000) return 't2';
  if (amount <= 250000) return 't3';
  return 't4';
}

/**
 * Map a tranche key to its i18n dictionary key. Consumers call
 * t(tLabel('t2'), lang) to render the localized range label.
 *
 * Dictionary keys are added by Plan 07-06 (i18n copy table). This function
 * commits the contract; the physical key existence is verified there.
 */
export function tLabel(
  key: TrancheKey,
): 'form.tranche.t1' | 'form.tranche.t2' | 'form.tranche.t3' | 'form.tranche.t4' {
  return `form.tranche.${key}` as const;
}
