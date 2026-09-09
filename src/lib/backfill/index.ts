/**
 * Phase 44 Plan 04 — backfill module barrel.
 *
 * Consumers (plan 05's CLI entry point) import from '@/lib/backfill' —
 * never from a sibling file directly. Mirrors the barrel discipline in
 * `src/lib/reconcile/index.ts`.
 *
 * Deliberately NOT re-exported: the per-row render worker, the report
 * writer and the PDF-data builder. Keeping every write-capable internal off
 * this public import surface means a future caller that wants to write has
 * to import the specific module, which stays a visible, greppable line
 * rather than something this barrel hands out.
 */
export { runBackfill } from './run';
export { createLiveBackfillDeps } from './live-deps';
export { BACKFILL_REPORT_DIR } from './report';

export type {
  BackfillCounts,
  BackfillDriftResult,
  RowOutcome,
  RunBackfillArgs,
  RunBackfillResult,
} from './types';
