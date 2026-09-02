import { applyReconciliationPlan } from './apply';
import { planReconciliation } from './engine';
import { computeDrift, formatDrift } from './drift';
import { readLatestDryRunReport, writeDryRunReport } from './report';
import type { ApplyResult } from './apply';
import type { DriftChange, DriftResult } from './drift';
import type { DryRunReportCounts, WriteDryRunReportResult } from './report';
import type { DbHandle, ReconciliationPlan, ReconciliationSource } from './types';

/**
 * Phase 31 Plan 07 — `runReconciliation`, the mode-aware orchestrator
 * (IMPORT-01, IMPORT-06) both the CLI script and the tests drive.
 *
 * The dry run is not a convenience — criterion 1 requires that running the
 * import in dry-run mode writes ZERO rows to the database, and this module
 * exists so that guarantee is a passing test (`run.test.ts`) rather than a
 * comment. D-15's drift comparison, run before the single apply call site
 * below, is what stops a real run from silently doing something the
 * reviewed dry-run report never promised.
 */

export type RunMode = 'dry-run' | 'apply';

export type RunAbortReason = 'no-dry-run-report' | 'fingerprint-mismatch' | 'source-mismatch' | 'drift';

export interface RunDryRunResult {
  mode: 'dry-run';
  plan: ReconciliationPlan;
  reportPaths: WriteDryRunReportResult;
  counts: DryRunReportCounts;
}

export interface RunApplyAbortedResult {
  mode: 'apply';
  aborted: true;
  reason: RunAbortReason;
  changes?: DriftChange[];
}

export interface RunApplySuccessResult {
  mode: 'apply';
  aborted: false;
  applied: ApplyResult;
  drift: DriftResult;
}

export type RunResult = RunDryRunResult | RunApplyAbortedResult | RunApplySuccessResult;

export interface RunArgs {
  dbi: DbHandle;
  source: ReconciliationSource;
  mode: RunMode;
  rootDir: string;
  databaseFingerprint: string;
  now: Date;
  allowDrift: boolean;
  log: (line: string) => void;
}

/**
 * Drives both the dry-run and apply flows against a single `ReconciliationSource`.
 *
 * Dry-run: plans, writes the two-form report, and returns — it never reaches
 * the plan-writer imported below, and it never issues an
 * `insert`/`update`/`delete` statement of its own (`run.test.ts`'s
 * `ZERO rows` test asserts this against the injected `dbi`).
 *
 * Apply: every abort path below — no stored report, a fingerprint mismatch, a
 * source mismatch, or unaccepted drift — returns before this function's one
 * and only call to the plan writer, at the very end of the apply branch. The
 * stored dry-run report only ever authorizes a write; the freshly recomputed
 * plan is always what gets applied.
 */
export async function runReconciliation(args: RunArgs): Promise<RunResult> {
  const { dbi, source, mode, rootDir, databaseFingerprint, now, allowDrift, log } = args;

  if (mode === 'dry-run') {
    log('[reconcile] planning (dry-run) ...');
    const plan = await planReconciliation({ dbi, source, now });
    const reportPaths = writeDryRunReport({ plan, databaseFingerprint, now, rootDir });
    const envelope = readLatestDryRunReport(rootDir);
    // The report was just written above, so a null read here would indicate
    // a filesystem-level failure, not a legitimate "no report yet" state.
    if (envelope === null) {
      throw new Error('run: dry-run report write succeeded but could not be read back');
    }
    log(`[reconcile] dry-run report written: ${reportPaths.latestMdPath}`);
    return { mode: 'dry-run', plan, reportPaths, counts: envelope.counts };
  }

  // ── Apply mode — every guard below returns before any write. ──
  log('[reconcile] reading last dry-run report ...');
  const stored = readLatestDryRunReport(rootDir);
  if (stored === null) {
    log('[reconcile] no dry-run report found — refusing to proceed.');
    return { mode: 'apply', aborted: true, reason: 'no-dry-run-report' };
  }

  if (stored.databaseFingerprint !== databaseFingerprint) {
    log('[reconcile] dry-run report was generated against a different database — refusing to proceed.');
    return { mode: 'apply', aborted: true, reason: 'fingerprint-mismatch' };
  }

  if (stored.sourceId !== source.id) {
    log('[reconcile] dry-run report was generated for a different source — refusing to proceed.');
    return { mode: 'apply', aborted: true, reason: 'source-mismatch' };
  }

  log('[reconcile] planning (apply) ...');
  const plan = await planReconciliation({ dbi, source, now });
  const drift = computeDrift({ stored, fresh: plan, freshFingerprint: databaseFingerprint });

  if (drift.status === 'drift' && !allowDrift) {
    log(formatDrift(drift));
    return { mode: 'apply', aborted: true, reason: 'drift', changes: drift.changes };
  }

  if (drift.status === 'drift' && allowDrift) {
    log(formatDrift(drift));
    log('[reconcile] drift accepted (--allow-drift) — proceeding.');
  }

  log('[reconcile] applying ...');
  const applied = await applyReconciliationPlan({
    dbi,
    plan,
    onProgress: (p) => log(`[reconcile] ${p.stage}: ${p.done}/${p.total}`),
  });

  return { mode: 'apply', aborted: false, applied, drift };
}
