/**
 * @/lib/calc — public API barrel (D-3).
 *
 * Consumers (Plan 07-04 form, Plan 07-05 live preview, Plan 07-02 tests,
 * future Phase 8 server route, Phase 8 PDF renderer) MUST import from
 * '@/lib/calc' — never from individual sibling files.
 *
 * Pure module — no I/O, no React, no framework imports. Safe in any runtime
 * (Node, Edge, browser, Vitest).
 */
export { tKey, tLabel } from './tranche';
export type { TrancheKey } from './tranche';

export { lookupCoefficient } from './coefficients';
export type { Coefficients, DurationMonths } from './coefficients';

export {
  computeLoyer,
  isOnDemand,
  parseNumeric,
  formatNumeric,
  applyFormula,
  generateLcRef,
} from './formula';
export type {
  ComputeLoyerInput,
  ComputeLoyerResult,
  ComputeLoyerState,
  ValidityDays,
} from './formula';

export { seedParams, getMaxAmount, getDefaultValidityDays } from './seed-params';
export type { SeedParams } from './seed-params';

export {
  proposalInputSchema,
  coefficientsSchema,
  amountHTSchema,
  durationMonthsSchema,
  validityDaysSchema,
} from './schema';
export type { ProposalInput } from './schema';
