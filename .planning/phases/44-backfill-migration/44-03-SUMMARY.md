---
phase: 44-backfill-migration
plan: 03
subsystem: backfill
tags: [markdown-report, drift-detection, mig-01, mig-05, d-08, d-09]

# Dependency graph
requires:
  - phase: 44-backfill-migration
    plan: 01
    provides: "src/lib/backfill/types.ts contracts (BackfillCandidate, RowOutcome, BackfillCounts, BackfillReportRow, BackfillReportEnvelope, BackfillDriftResult)"
  - phase: 31-crm-reconciliation
    provides: "src/lib/reconcile/report.ts and drift.ts — the two-form report + drift-check shape this plan mirrors"
provides:
  - "toReportRows() / writeBackfillReport() / readLatestBackfillReport() — the D-08 safety artifact plan 04 writes in dry-run mode and reads before an apply write"
  - "computeBackfillDrift() / formatBackfillDrift() — the D-09 three-way classification plan 04's apply gate calls before writing"
affects: [44-04, 44-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closed safe-projection funnel (toReportRows) as the ONLY path a row can take into a GitHub-artifact-bound report — mirrors reconcile's report.ts shape, adapted to a flat row list instead of a nested plan object"
    - "Three-way set classification (added/removed/alreadyMigrated) instead of reconcile's two-way (added/removed/changed) diff, because a third external signal (the migratedIds marker set) exists here and must be consulted before a missing id can be called drift"

key-files:
  created:
    - src/lib/backfill/report.ts
    - src/lib/backfill/report.test.ts
    - src/lib/backfill/drift.ts
    - src/lib/backfill/drift.test.ts

key-decisions:
  - "A 'migrated' RowOutcome is projected to outcome: 'rendered' in the report (BackfillReportRow's outcome field only has 'rendered' | 'failed' per types.ts) — the report describes what was/would be re-rendered, not which mode produced the row, since dry-run and apply share one report shape"
  - "computeBackfillDrift iterates the union of stored-report proposal ids and fresh-candidate ids via three Sets (storedIds, freshIds, migratedSet) rather than reconcile's diffByKey helper, since this plan's classification needs a THIRD input (migratedIds) that reconcile's two-way diff has no equivalent for"
  - "added/removed/alreadyMigrated arrays are sorted before being returned, matching reconcile's determinism note ('never rely on Set/array iteration order') even though the plan's acceptance criteria didn't require a specific order"

requirements-completed: []

# Metrics
duration: ~9min
completed: 2026-09-09
---

# Phase 44 Plan 03: Dry-Run Report + Drift Check Summary

**Two pure, filesystem/database-free modules — `report.ts` writes the two-form (`.md` + `.json`) dry-run artifact an operator reviews and job 2 downloads, and `drift.ts` three-way-classifies a resumed apply's own completed rows as `alreadyMigrated` rather than `removed` so it never aborts on its own progress.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-09-09T22:12:00Z
- **Completed:** 2026-09-09T22:20:27Z
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments

- `toReportRows()` is the single, closed allow-list projection from `(BackfillCandidate[], RowOutcome[])` to `BackfillReportRow[]`: proposal id, lc ref, the proposal's own lifecycle status, `blobKeyPresent` (a boolean, never the key), outcome, and `reason`/`detail` for failures — no figure, no `inputs`, no `computed`, no blob key, no user id, no connection string can reach the artifact through it.
- `writeBackfillReport()` writes archived + `-latest` `.json`/`.md` pairs into `.backfill/`, with every Markdown section (`## Counts`, `## Would re-render`, `## Would fail to render`, `## What approving this run does`) rendering unconditionally — an empty table renders its header plus a single `_none_` row rather than being omitted.
- `readLatestBackfillReport()` returns `null` for a missing file or a `reportVersion` other than `'1'`, so an unreadable report is indistinguishable from no report at all, which plan 04 turns into a refusal.
- `computeBackfillDrift()` classifies every proposal id from either side into `added` (real drift — a proposal was finalized after approval), `removed` (real drift — hard-purged or left scope), or `alreadyMigrated` (NOT drift — a resumed run's own completed rows, verified against the `migratedIds` marker set). `status` only reacts to `added`/`removed`.
- `formatBackfillDrift()` renders `+`/`-` lines per drifted id plus one summary count line for `alreadyMigrated` (never one line per already-migrated id, since a large resumed run could have thousands).
- 19 new tests (12 + 7), all passing; `npx tsc --noEmit`, `npx eslint src/lib/backfill --max-warnings=0`, and the repo-wide `npm run lint:check` all exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: report.ts — the two-form dry-run artifact (D-08, MIG-01)** - `6da35f4` (feat)
2. **Task 2: drift.ts — three-way classification so a resumed run is not mistaken for drift (D-09)** - `5bc6610` (feat)

_No TDD tasks in this plan — both were `type="auto"`._

## Files Created/Modified

- `src/lib/backfill/report.ts` (new) - `BACKFILL_REPORT_DIR`, `toReportRows`, `writeBackfillReport`, `readLatestBackfillReport`; runtime imports `node:fs` + `node:path` only
- `src/lib/backfill/report.test.ts` (new) - 12 tests: projection shape (rendered/migrated/failed), directory creation, four-path existence, round-trip with counts, redaction proof (user id + blob-key path absent from raw JSON), safe-projection proof (figures + field names absent from raw JSON), empty-section headings, pipe-escaping in a table cell, and version/missing-file rejection
- `src/lib/backfill/drift.ts` (new) - `computeBackfillDrift`, `formatBackfillDrift`; re-exports `BackfillDriftResult` (type-only) from `./types` rather than redeclaring it; no runtime imports beyond the type import
- `src/lib/backfill/drift.test.ts` (new) - 7 tests: clean (identical sets), added, MIG-05 resumability (named explicitly), removed, a mixed case with all three buckets non-empty, an all-migrated re-run against an empty fresh set, and `formatBackfillDrift`'s redaction (no scheme, no `proposals/`)

## Decisions Made

- Followed `types.ts`'s actual `BackfillReportRow.outcome` union (`'rendered' | 'failed'`) rather than inventing a third `'migrated'` report-level outcome: a `RowOutcome` of `'migrated'` maps to report `outcome: 'rendered'`, since the report's purpose is describing what was/would be re-rendered, independent of which mode produced the row.
- Wrote `computeBackfillDrift` as three explicit `Set`/loop passes rather than adapting reconcile's generic `diffByKey<T>` helper, because this classification has three inputs (stored ids, fresh ids, migratedIds) where reconcile's diff only ever compares two arrays — forcing the third input through `diffByKey`'s two-array signature would have been more contorted than a direct implementation.
- Reused reconcile's `mdEscape` / header-plus-empty-row Markdown discipline verbatim in spirit (own local `mdEscape`, own `renderTable` helper) rather than importing from `src/lib/reconcile/report.ts`, per the plan's own instruction that this module deliberately has zero imports beyond `node:fs`/`node:path`/`./types`.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance-criteria greps (directory-constant count, forbidden-import absence, `alreadyMigrated` occurrence count, `BackfillDriftResult` declaration-location check) passed on the first implementation without needing a wording adjustment, unlike plans 01 and 02's docstring-literal deviations.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Both modules are pure: `report.ts` touches only a caller-supplied `rootDir` on the local filesystem, and `drift.ts` performs no I/O at all.

## Requirements Traceability

This plan's frontmatter lists `requirements: [MIG-01]` for relevance, but it is NOT marked complete here — per the "requirements: is relevance, not ownership" rule, MIG-01's full text was checked against what this plan actually closes:

- **MIG-01** ("An operator can dry-run the backfill and see how many stored PDFs would be re-rendered and which proposals fail to render, without a single blob being written.") — this plan builds the artifact an operator would read (`writeBackfillReport`) and the reader plan 04 uses to gate apply, but there is no orchestration loop yet that calls `listBackfillCandidates` → `renderRow` → `writeBackfillReport` end to end, and no CLI entry point an operator can actually invoke. The requirement describes an operator-observable outcome of a real dry run, which does not exist until plan 04 (orchestration) and plan 05 (the `tsx` entry point + npm scripts) land. Left open, matching the reasoning already recorded in 44-01-SUMMARY.md and 44-02-SUMMARY.md for MIG-05/MIG-03/MIG-04.

## Next Phase Readiness

- Plan 04 (orchestration) can import `writeBackfillReport`, `readLatestBackfillReport`, `computeBackfillDrift`, and `formatBackfillDrift` directly from `src/lib/backfill/report` and `src/lib/backfill/drift` to assemble `runBackfill()` without re-deriving the report shape or the drift classification.
- The report envelope's `reportVersion: '1'` and the drift check's `alreadyMigrated` bucket are both already unit-tested at the boundary plan 04 will call them from, so plan 04's own tests can focus on orchestration (candidate iteration, mode branching, abort reasons) rather than re-proving safe-projection or resumability.
- No blockers. No schema migration, no new runtime dependency, no database or storage access in this plan.

## Self-Check: PASSED

All 4 claimed files found on disk; both commit hashes (`6da35f4`, `5bc6610`) found in git log.
