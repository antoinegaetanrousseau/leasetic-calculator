/**
 * Phase 31 Plan 07 — reconciliation module barrel.
 *
 * Consumers import from '@/lib/reconcile' — never from a sibling file
 * directly. Mirrors the barrel discipline in `src/lib/db/queries/index.ts`.
 *
 * Deliberately NOT re-exported: the plan-writer and the merge/keep-separate
 * write functions. Keeping every write function off this public import
 * surface is a cheap reinforcement of plan 05's write-path gate — a caller
 * that wants to write has to import the specific module, which stays a
 * visible, greppable line rather than something this barrel hands out.
 */
export { runReconciliation } from './run';
export type { RunAbortReason, RunApplyAbortedResult, RunApplySuccessResult, RunArgs, RunDryRunResult, RunMode, RunResult } from './run';

export { proposalsSource } from './sources/proposals';

export { REPORT_DIR } from './report';
export type { DryRunReportCounts, DryRunReportEnvelope, WriteDryRunReportResult } from './report';

export type { DriftChange, DriftChangeKind, DriftDirection, DriftResult } from './drift';

export type {
  PairReason,
  PlannedCompany,
  PlannedContact,
  PlannedPair,
  PlannedRelationship,
  ReconciliationPlan,
  ReconciliationSource,
  ReconciliationSourceId,
  SkippedRow,
  SourceRow,
} from './types';
