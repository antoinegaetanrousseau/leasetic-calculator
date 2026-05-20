/**
 * StatusChip — generic status indicator (COMP-05, UI-SPEC §6.6).
 *
 * Variants:
 *   - active   → green tint   (.chip-active, existing Phase 8)
 *   - draft    → gold tint    (.chip-draft, added to globals.css by Plan 11-01)
 *   - expired  → muted-gray   (.chip-expired, REWRITTEN by Plan 11-01 from prior gold)
 *   - deleted  → red-danger   (.chip-deleted, existing Phase 8 — reused by Plan 14-06
 *                              proposal-row chip rollout per D-27)
 *   - disabled → red-danger   (.chip-disabled, existing Phase 9)
 *   - invited  → gold tint    (.chip-invited, added Phase 14 — visually identical
 *                              chrome to .chip-draft but semantically distinct per UI-SPEC §4.4)
 *
 * Server component — no state, no interaction. Consumers pass i18n-resolved
 * labels via the `label` prop; this component owns no i18n strings.
 */
export interface StatusChipProps {
  variant: 'active' | 'draft' | 'expired' | 'deleted' | 'disabled' | 'invited';
  label: string;
}

export function StatusChip({ variant, label }: StatusChipProps) {
  return <span className={`chip chip-${variant}`}>{label}</span>;
}
