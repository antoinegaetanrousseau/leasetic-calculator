/**
 * Frozen v10 baseline calculation parameters.
 *
 * D-2 (Phase 7 CONTEXT): single source of truth for the coefficient table,
 * commission percent, and max amount. Phase 7 imports it for live-preview
 * via getMaxAmount() / lookupCoefficient(); Phase 8's idempotent seed
 * migration (DATA-12) re-imports it verbatim. Values are PLACEHOLDERS
 * (sourced from v10's assertCalc fixture coefficients lines 1922-1929)
 * pending Antoine's canonical baseline before CUT-06 production verify.
 *
 * D-7-11 (Phase 7 UI-SPEC): getMaxAmount() reads from this constant; Phase 8
 * swaps to a global_params row read at the same import path. Single seam.
 *
 * Pure module — no I/O, no React, no framework imports. Importable from any
 * runtime (Node, Edge, browser, Vitest).
 */
import type { Coefficients } from './coefficients';

export interface SeedParams {
  /** Per-tranche × per-duration coefficient table. */
  readonly coefficients: Coefficients;
  /** Commission apporteur percent (PROJECT.md commission-invisibility rule applies). */
  readonly commissionPct: number;
  /** Hardcoded "on demand" threshold (D-7-11). Phase 8 swaps to global_params read. */
  readonly maxAmount: number;
}

export const seedParams: SeedParams = {
  // TODO: confirm against v10 baseline before CUT-06 — values lifted from v10
  // assertCalc fixture coefficients (Matrice_2026_THE_Leasetic-v10.html lines 1922-1929).
  coefficients: {
    t1: { 36: '3.0000', 48: '2.3000', 60: '1.8765' },
    t2: { 36: '2.9000', 48: '2.2500', 60: '1.8500' },
    t3: { 36: '2.8000', 48: '2.2000', 60: '1.8000' },
    t4: { 36: '2.7000', 48: '2.1500', 60: '1.7500' },
  },
  commissionPct: 5, // v10 fixtureComm = 5
  maxAmount: 500_000, // OQ-7-C resolution: 500_000 € hardcoded for Phase 7 (D-7-11)
};

/** Phase 8 swap-in seam (D-7-11). Phase 7 reads from seedParams; Phase 8 reads global_params. */
export function getMaxAmount(): number {
  return seedParams.maxAmount;
}
