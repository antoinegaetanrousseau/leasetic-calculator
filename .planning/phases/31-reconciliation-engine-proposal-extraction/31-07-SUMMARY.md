---
phase: 31-reconciliation-engine-proposal-extraction
plan: 07
subsystem: api
tags: [cli, tsx, vitest, sha256, dry-run, drift-detection]

# Dependency graph
requires:
  - phase: 31-reconciliation-engine-proposal-extraction (plan 02)
    provides: planReconciliation() and the ReconciliationSource/ReconciliationPlan contracts
  - phase: 31-reconciliation-engine-proposal-extraction (plan 04)
    provides: writeDryRunReport()/readLatestDryRunReport() (D-14) and computeDrift()/formatDrift() (D-15)
  - phase: 31-reconciliation-engine-proposal-extraction (plan 05)
    provides: applyReconciliationPlan(), the idempotent, non-transactional writer
provides:
  - runReconciliation() — the mode-aware orchestrator that plans+reports+stops in dry-run mode and plans+drifts+applies in apply mode (src/lib/reconcile/run.ts)
  - src/lib/reconcile/index.ts — the module's public barrel (deliberately omits the write-only functions)
  - scripts/reconcile-proposals.ts — the CLI entry point (D-13), wired through scripts/_load-env.ts
  - db:reconcile:dry-run / db:reconcile npm scripts
  - the exit-code contract operators and plan 08's runbook depend on (0/1/2/3)
affects: [31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Orchestration-in-a-testable-module, not in the CLI script body: runReconciliation() is what a test drives to prove criterion 1, keeping scripts/reconcile-proposals.ts a thin argv/env/exit-code shell"
    - "Every apply-mode abort return sits structurally above the single write call site in run.ts (grep-verifiable by line number), not just proven by tests"
    - "Database fingerprint = SHA-256(hostname + '/' + database name) — never the full connection string — computed once in the CLI script and threaded through as a plain argument"

key-files:
  created:
    - src/lib/reconcile/run.ts
    - src/lib/reconcile/run.test.ts
    - src/lib/reconcile/index.ts
    - scripts/reconcile-proposals.ts
  modified:
    - package.json

key-decisions:
  - "Dry-run mode's `counts` are read back from the just-written report via readLatestDryRunReport() rather than by exporting report.ts's internal computeCounts() — avoids modifying a file (report.ts) not listed in this plan's files_modified while still satisfying the behavior bullet"
  - "computeDrift() is called with the apply-mode-validated stored envelope even though it re-checks fingerprint/source internally — those checks are always no-ops on that path (run.ts's own guards already passed) and the redundancy is cheap, deliberate defense in depth rather than dead code"
  - "Doc comments in run.ts that literally spelled the substring 'applyReconciliationPlan' a second and third time (beyond the one import + one call site) were reworded — same self-tripping-grep class documented in 31-04/31-05's summaries — to satisfy the acceptance criterion's exact count of 2"

patterns-established:
  - "A CLI script under scripts/ that drives a reconciliation/import run: _load-env first, argv-based flags (no CLI-args library), a Neon-prod typed-confirmation env var gated on hostname (never the port-inclusive URL property), lazy post-validation imports of db and the domain module, and a 4-way exit code contract (0/1/2/3) distinguishing success/crash/env-refusal/guard-refusal"

requirements-completed: [IMPORT-01, IMPORT-06]

# Metrics
duration: ~15min
completed: 2026-09-02
---

# Phase 31 Plan 07: Reconciliation Orchestrator & CLI Summary

**`runReconciliation()` — a mode-aware orchestrator, proven by a named test to write zero rows in dry-run mode, that a new `scripts/reconcile-proposals.ts` CLI drives via two npm scripts, gated by a Neon-production typed-confirmation env var and a D-15 drift comparison before every apply.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-02T12:11:00+02:00 (approx, per prior plan's completion commit)
- **Completed:** 2026-09-02T12:25:51+02:00
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified) across 3 commits

## Accomplishments

- `runReconciliation({ dbi, source, mode, rootDir, databaseFingerprint, now, allowDrift, log })` drives both modes: dry-run plans, writes the two-form report, and returns without ever reaching the write layer; apply reads the stored report, runs the fingerprint guard, the source guard, recomputes a fresh plan, diffs it against the stored one (D-15), and only then applies — every abort return sits textually above the single write call site in `run.ts`, verified by both a grep gate and 10 tests.
- Criterion 1 is now a passing, named test (`criterion 1 — a dry run writes ZERO rows to the database`): `dbi.insert`/`update`/`delete` each asserted `toHaveBeenCalledTimes(0)`, plus every `dbi.execute()` call in that run asserted to carry a `SELECT` statement (extracted from the drizzle-orm `sql` tagged template's `StringChunk`s).
- Four dedicated tests prove each apply-mode abort path (`no-dry-run-report`, `fingerprint-mismatch`, `source-mismatch`, unaccepted `drift`) returns before `applyReconciliationPlan` and before any write; a fifth proves the applied plan is object-identical to what the (wrapped, still-real) planner returned for that run, never the deserialized stored plan.
- `src/lib/reconcile/index.ts` barrels the public surface (`runReconciliation`, `proposalsSource`, `REPORT_DIR`, public types) while deliberately omitting `applyReconciliationPlan`, `mergeCompanyPair` and `recordKeepSeparate` — reinforcing plan 05's write-path gate at the import-surface level.
- `scripts/reconcile-proposals.ts` (D-13): `_load-env` first, `--dry-run`/`--allow-drift` flags via `process.argv.includes`, a Neon-prod typed-confirmation gate (`RECONCILE_CONFIRM=YES`, `URL.hostname` not the port-inclusive property, per the bug_011 fix), a SHA-256 database fingerprint over `hostname + '/' + databaseName` only (never the full connection string), lazy post-validation imports, and a 4-way exit code contract (`0` success / `1` crash / `2` env refusal / `3` guard refusal).
- `db:reconcile:dry-run` and `db:reconcile` npm scripts added, mirroring the `db:backfill:*` preload wiring.
- Never invokes the forbidden schema-push command and never applies a migration — `check:no-drizzle-push` and `check:migration-journal-sync` both green.
- 10 new tests in `run.test.ts`; full `src/lib/reconcile/` suite (144 tests), `typecheck`, and `lint:check` all green.

## Task Commits

Each task was committed atomically:

1. **Task 1: The mode-aware orchestrator** - `b97058c` (feat, TDD)
2. **Task 2: Prove zero writes in dry-run mode and prove every drift abort** - `e09e9b0` (test, TDD)
3. **Task 3: The CLI entry point and its npm scripts** - `741f946` (feat)

**Plan metadata commit follows this summary.**

## Files Created/Modified

- `src/lib/reconcile/run.ts` - `runReconciliation()`, `RunMode`/`RunResult`/`RunArgs` and related types; the single `applyReconciliationPlan` call site sits after every abort return in file order
- `src/lib/reconcile/run.test.ts` - 10 tests: criterion 1 (zero writes + SELECT-only execute), report-files-on-disk, never-calls-apply-in-dry-run, the four apply-mode abort reasons, fresh-plan-identity, clean-drift-after-unchanged-world, and an `allowDrift=true` proceed case
- `src/lib/reconcile/index.ts` - the module's public barrel; omits every write function by design
- `scripts/reconcile-proposals.ts` - the CLI entry point; `main()` implements the full flag/env/gate/fingerprint/run/exit-code sequence from the plan's `<action>` block
- `package.json` - `db:reconcile:dry-run` and `db:reconcile` script entries, immediately after `db:backfill:*`

## Decisions Made

See `key-decisions` in frontmatter. In prose: (1) dry-run counts are read back from the just-written report file rather than exporting `report.ts`'s internal `computeCounts()`, keeping this plan's file changes scoped to exactly what `files_modified` declared; (2) `computeDrift()`'s internal fingerprint/source checks are deliberately redundant with `run.ts`'s own guards — cheap defense in depth, not dead code; (3) two doc-comment mentions of the literal string `applyReconciliationPlan` were reworded to satisfy the acceptance criterion's exact count of `2` (one import, one call site), the same self-tripping-grep class as prior 31-04/31-05 deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `run.ts`'s own module-header doc comments tripped its own acceptance-criteria grep gate**
- **Found during:** Task 1, running the acceptance-criteria greps after the initial write
- **Issue:** The plan's own acceptance criterion requires `grep -c "applyReconciliationPlan" src/lib/reconcile/run.ts` to return exactly `2` (one import, one call site) — a mechanical proxy for "the plan writer appears exactly once, at the end of the apply branch." The initial draft's module-header prose explained the same property in words that happened to spell the identifier literally twice more, pushing the count to `4`.
- **Fix:** Reworded both doc-comment mentions ("the plan-writer imported below" / "the plan writer") to convey the identical meaning without the literal substring, leaving only the real `import` and the real call site.
- **Files modified:** `src/lib/reconcile/run.ts`
- **Verification:** `grep -c "applyReconciliationPlan" src/lib/reconcile/run.ts` → `2`; `npm run typecheck` and `npm run lint:check` both clean; all 10 `run.test.ts` tests still pass.
- **Committed in:** `b97058c` (Task 1 commit)

**2. [Rule 1 - Bug] `scripts/reconcile-proposals.ts`'s own bug_011 doc comment tripped its own `.host\b` grep gate**
- **Found during:** Task 3, running the acceptance-criteria greps after the initial write
- **Issue:** The acceptance criterion `grep -c "\.host\b" scripts/reconcile-proposals.ts` must return `0` — proving the port-inclusive `URL.host` property is never used, only `URL.hostname`. The initial header comment explaining the bug_011 fix literally wrote out `URL.host` (with a trailing space, satisfying the `\b` boundary) as the property being avoided, tripping the same guard it was documenting.
- **Fix:** Reworded the comment to describe the avoided property ("the port-inclusive URL property") without spelling the literal `.host` token.
- **Files modified:** `scripts/reconcile-proposals.ts`
- **Verification:** `grep -c "\.host\b" scripts/reconcile-proposals.ts` → `0`; `grep -c "new URL(databaseUrl).hostname\|url.hostname"` → `1`; `npm run typecheck`, `npm run lint:check`, `npm run check:no-drizzle-push` all clean.
- **Committed in:** `741f946` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1, both wording-only self-tripping-grep fixes — same class documented in 31-04/31-05's summaries)
**Impact on plan:** Both fixes are textual only; no behavior change. No scope creep.

## Issues Encountered

None beyond the two deviations above. Manually running `scripts/reconcile-proposals.ts` with `DATABASE_URL` unset confirmed exit code `2` and the required error text; no `.reconcile/` directory or other artifact was left behind by that run (it exits before any filesystem or database access).

## User Setup Required

None — no external service configuration required. This plan touches no infrastructure and no migrations. `RECONCILE_CONFIRM` is an operator-supplied env var at invocation time, not a persisted secret.

## Next Phase Readiness

- **Exit-code contract** (for plan 08's runbook): `0` success (dry-run report written, or apply completed), `1` crash (uncaught error), `2` environment refusal (`DATABASE_URL` missing/malformed, or an unconfirmed production apply), `3` guard refusal (apply mode aborted: no report / fingerprint mismatch / source mismatch / unaccepted drift).
- **npm script names** (for plan 08's runbook): `npm run db:reconcile:dry-run` and `npm run db:reconcile` (append `-- --allow-drift` to the latter to proceed past detected drift).
- `runReconciliation()` and `scripts/reconcile-proposals.ts` are both complete and independently testable — plan 08 can document the operator workflow (dry run → review the Markdown report → real run → review any drift/apply output) without touching this plan's code.
- No blockers for 31-08. Full `src/lib/reconcile/` suite (144 tests), `typecheck`, `lint:check`, `check:no-drizzle-push`, and `check:migration-journal-sync` are all green.

---
*Phase: 31-reconciliation-engine-proposal-extraction*
*Completed: 2026-09-02*
