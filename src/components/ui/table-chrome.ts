/**
 * Shared chrome for the admin data tables (partners, LC references, and the
 * coefficient history).
 *
 * Phase 4 of the ReUI/Maia migration. These three tables previously each
 * carried their own `TH_BASE_STYLE` / `TD_BASE_STYLE` inline-style objects —
 * LcReferencesList's own header comment described them as copied "verbatim
 * from PartnersList", which is exactly the duplication that drifts. Defined
 * once here and applied through the shadcn Table primitives instead.
 *
 * Note these deliberately keep the v10 metrics (11.2px uppercase headers,
 * 13px cells, 20px horizontal padding) rather than adopting the primitive's
 * defaults. Phase 4 is a structural migration; restyling the tables is a
 * design decision that should be visible, not smuggled in here.
 */

/** Column header: 11.2px / 700 / uppercase, 12px 20px padding. */
export const tableHeadClass =
  'h-auto px-5 py-3 text-[11.2px] font-bold uppercase tracking-[0.04em] text-[var(--muted)]';

/** Body cell: 13px muted, 16px 20px padding. */
export const tableCellClass = 'px-5 py-4 text-[13px] text-[var(--muted)]';

/** Right-aligned numeric cell — currency columns line up on the decimal. */
export const tableCellNumericClass = `${tableCellClass} text-right tabular-nums`;
