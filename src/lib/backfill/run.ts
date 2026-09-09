import { computeBackfillDrift, formatBackfillDrift } from './drift';
import { readLatestBackfillReport, writeBackfillReport } from './report';
import { renderRow } from './render-row';
import type { BackfillCandidate, RowOutcome, RunBackfillArgs, RunBackfillResult } from './types';

/**
 * Phase 44 Plan 04 — `runBackfill`, the mode-aware orchestrator both the CLI
 * (plan 05) and the tests drive (MIG-01, MIG-05, D-08, D-09, D-10).
 *
 * The dry run is not a convenience: MIG-01 requires it to write zero blobs
 * and zero database rows, and `run.test.ts` is where that guarantee is a
 * passing test rather than a comment — exactly the discipline
 * `src/lib/reconcile/run.ts` established for the reconciliation engine.
 *
 * D-01 removed the rollback, so the three gates in the apply branch below —
 * missing report, fingerprint mismatch, drift — are the ENTIRE safety net
 * between the plan a human approved and an irreversible overwrite. Every one
 * of them returns before the loop that writes; there is exactly one such
 * loop in this module and it sits after all three gates.
 *
 * Pure module — imports only from `./types`, `./render-row`, `./report` and
 * `./drift`. Every external effect (the row scan, the render, the blob
 * write, the persist, the marker, the clock, the log sink) arrives through
 * `args.deps`, so this module and its tests need no database module, no
 * storage module and no PDF-renderer module.
 */

const PROGRESS_EVERY = 25;

function computeCounts(candidates: BackfillCandidate[], outcomes: RowOutcome[]) {
  return {
    candidates: candidates.length,
    rendered: outcomes.filter((o) => o.status === 'rendered' || o.status === 'migrated').length,
    failed: outcomes.filter((o) => o.status === 'failed').length,
  };
}

export async function runBackfill(args: RunBackfillArgs): Promise<RunBackfillResult> {
  const { deps, mode, rootDir, databaseFingerprint, allowDrift } = args;

  // Shared preamble for both modes. The advisor is a live read (D-02 / Phase
  // 43 D-13): reading it ONCE for the whole run — not once per row — keeps
  // every document in a single run internally consistent and avoids one
  // query per proposal. A `null` advisor is a valid run and must NOT be
  // guarded against or turned into a refusal.
  const candidates = await deps.listCandidates();
  const advisor = await deps.getAdvisor();

  if (mode === 'dry-run') {
    deps.log(`[backfill] planning (dry-run) — ${candidates.length} candidate(s)`);
    const outcomes: RowOutcome[] = [];
    let i = 0;
    for (const row of candidates) {
      const outcome = await renderRow({ row, advisor, mode: 'dry-run', deps });
      outcomes.push(outcome);
      i += 1;
      if (i % PROGRESS_EVERY === 0) {
        deps.log(`[backfill] ${i}/${candidates.length} planned`);
      }
    }
    // Neither `deps.putBlob`, `deps.persistPdfArtifact` nor `deps.writeMarker`
    // is reachable from this branch — `renderRow` returns before any of them
    // in dry-run mode. That is MIG-01's zero-write guarantee, proved in
    // `run.test.ts`, not merely asserted in this comment.
    const reportPaths = writeBackfillReport({
      candidates,
      outcomes,
      databaseFingerprint,
      now: deps.now(),
      rootDir,
    });
    const counts = computeCounts(candidates, outcomes);
    deps.log(`[backfill] dry-run report written: ${reportPaths.latestMdPath}`);
    return { mode: 'dry-run', reportPaths, counts };
  }

  // ── Apply mode — every gate below returns before the loop that writes. ──
  deps.log('[backfill] reading last dry-run report ...');
  const stored = readLatestBackfillReport(rootDir);
  if (stored === null) {
    deps.log('[backfill] no approved dry-run report found — refusing to proceed.');
    return { mode: 'apply', aborted: true, reason: 'no-dry-run-report' };
  }

  if (stored.databaseFingerprint !== databaseFingerprint) {
    deps.log('[backfill] dry-run report was generated against a different database — refusing to proceed.');
    return { mode: 'apply', aborted: true, reason: 'fingerprint-mismatch' };
  }

  deps.log('[backfill] re-planning (apply) ...');
  const migratedIds = await deps.listMigratedIds();
  const drift = computeBackfillDrift({ stored, fresh: candidates, migratedIds });

  if (drift.status === 'drift' && !allowDrift) {
    deps.log(formatBackfillDrift(drift));
    return { mode: 'apply', aborted: true, reason: 'drift', drift };
  }

  if (drift.status === 'drift' && allowDrift) {
    deps.log(formatBackfillDrift(drift));
    deps.log('[backfill] drift accepted (--allow-drift) — proceeding.');
  }

  // Only now, the one loop in this module that writes.
  deps.log(`[backfill] applying — ${candidates.length} candidate(s)`);
  const outcomes: RowOutcome[] = [];
  let i = 0;
  for (const row of candidates) {
    // `renderRow` never throws — every failure path returns a bounded
    // `failed` RowOutcome — so no try/catch is needed here. If one is ever
    // added around this call, it must continue rather than rethrow (D-10).
    const outcome = await renderRow({ row, advisor, mode: 'apply', deps });
    outcomes.push(outcome);
    i += 1;
    if (i % PROGRESS_EVERY === 0) {
      deps.log(`[backfill] ${i}/${candidates.length} applied`);
    }
  }

  const counts = computeCounts(candidates, outcomes);
  const failures = outcomes.filter((o): o is Extract<RowOutcome, { status: 'failed' }> => o.status === 'failed');

  deps.log(`[backfill] done — ${counts.rendered} migrated, ${failures.length} failed`);
  if (failures.length > 0) {
    deps.log('[backfill] re-run to retry failed rows — they remain unmarked and are candidates again.');
  }

  // This module never terminates the process itself. Turning a non-empty
  // `failures` array into a non-zero exit status is the CALLER's job (plan
  // 05's CLI entry point) — nobody should "helpfully" call the process-exit
  // primitive from in here.
  return { mode: 'apply', aborted: false, counts, failures, drift };
}
