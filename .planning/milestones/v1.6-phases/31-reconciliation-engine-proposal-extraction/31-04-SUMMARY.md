---
phase: 31-reconciliation-engine-proposal-extraction
plan: 04
subsystem: api
tags: [file-io, node-fs, vitest, drift-detection]

# Dependency graph
requires:
  - phase: 31-reconciliation-engine-proposal-extraction (plan 02)
    provides: ReconciliationPlan / PlannedCompany / PlannedRelationship / PlannedContact / PlannedPair / SkippedRow contracts (src/lib/reconcile/types.ts) that report.ts serializes verbatim
provides:
  - the two-form (Markdown + JSON) dry-run report writer/reader (src/lib/reconcile/report.ts) — D-14
  - the pure stored-vs-fresh drift comparator + CLI formatter (src/lib/reconcile/drift.ts) — D-15
  - .gitignore exclusion of the generated .reconcile/ report directory
affects: [31-07, 31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "File-writing report modules accept `now`/`rootDir` as explicit arguments instead of reading the ambient clock/cwd, so tests can target a temp directory with a fixed timestamp"
    - "Array diffing keyed by a stable domain key (never index), with the key union sorted before iteration — determinism for a drift comparator is a correctness requirement, not a style preference"
    - "flaggedPairs + suppressedPairs merge into one per-pair-key status map before diffing, so a pair's flagged→suppressed transition surfaces as a single 'changed' entry instead of a spurious removed+added pair"

key-files:
  created:
    - src/lib/reconcile/report.ts
    - src/lib/reconcile/report.test.ts
    - src/lib/reconcile/drift.ts
    - src/lib/reconcile/drift.test.ts
  modified:
    - .gitignore

key-decisions:
  - "envelope.generatedAt mirrors plan.generatedAt (the moment planReconciliation() ran), not the file-write moment — drift.ts's ageMs = fresh.generatedAt - stored.generatedAt only holds like-for-like semantics if both sides mean 'when the plan was computed', not 'when the report was written'"
  - "computeDrift's public input adds a `freshFingerprint: string` field alongside `{ stored, fresh }` — the plan's <behavior> block requires returning `{ status: 'fingerprint-mismatch', freshFingerprint }` but ReconciliationPlan carries no fingerprint field of its own, so a bare `{ stored, fresh }` signature could never satisfy that behavior bullet. `fresh` stays typed exactly as ReconciliationPlan per the plan's literal type statement; the fingerprint is threaded through as a third, caller-computed argument"
  - "Doc comments that literally spelled the substrings `server-only` and `process.cwd()` (to explain what report.ts deliberately does NOT do) tripped the acceptance-criteria grep gates counting those exact strings anywhere in the file — reworded to convey the same meaning without the literal substrings, since the gates check raw text, not semantic intent"

patterns-established:
  - "Report writers return an object of named absolute paths (not a positional array) so callers and tests read `paths.latestJsonPath` etc. self-documentingly"

requirements-completed: [IMPORT-06]

# Metrics
duration: ~10min
completed: 2026-09-02
---

# Phase 31 Plan 04: Dry-Run Report + Drift Detection Summary

**A two-form (Markdown + JSON) dry-run report writer with a companion pure drift comparator that refuses to authorize a real run against a stale, wrong-database, or wrong-source dry run.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-02T11:10:33+02:00 (approx, per prior plan's completion commit)
- **Completed:** 2026-09-02T11:20:08+02:00
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified) across 2 commits

## Accomplishments
- `writeDryRunReport()` renders a full `ReconciliationPlan` into a human-reviewable Markdown summary (10 headings, every section rendering `_None._` when empty, every `SkippedRow` listed with its `sourceRowId` grouped by reason) and a machine-readable JSON envelope, writing archived-timestamped + `-latest` copies of both into a git-ignored `.reconcile/` directory.
- `readLatestDryRunReport()` gives a real run a typed, version-gated read of the last dry run (`null` on missing file or unrecognized `reportVersion`).
- `computeDrift()` compares a stored `DryRunReportEnvelope` against a freshly recomputed `ReconciliationPlan`: fingerprint and source guards run before any change is computed (so a report from the wrong database/source can never authorize a write), a structurally-identical plan reports `clean`, and every other case reports a deterministic, key-sorted `DriftChange[]` — including the flagged→suppressed pair transition as a single `changed` entry naming the verdict.
- `formatDrift()` renders any `DriftResult` as a `+`/`-`/`~`-prefixed CLI summary.
- `.gitignore` gained `.reconcile/` (with a rationale comment) so live client names/SIRENs in report files can never be committed.
- 30 new tests (14 report, 16 drift) — full suite (1575 tests), typecheck, and lint all green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the two-form dry-run report** - `1362259` (feat, TDD)
2. **Task 2: Compute and format drift between the stored dry run and a fresh plan** - `31564f9` (feat, TDD)

**Plan metadata commit follows this summary.**

## Files Created/Modified
- `src/lib/reconcile/report.ts` - `REPORT_DIR = '.reconcile'`, `writeDryRunReport()`, `readLatestDryRunReport()`, `DryRunReportEnvelope`; renders Markdown with plain template strings (no Markdown library), counts derived from `plan` array lengths, timestamp built via `now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')`
- `src/lib/reconcile/report.test.ts` - 14 tests, one per `<behavior>` bullet plus envelope/counts/section coverage, using `mkdtempSync` + `afterEach` cleanup
- `src/lib/reconcile/drift.ts` - `DriftChange`, `DriftResult`, `computeDrift()`, `formatDrift()`; generic `diffByKey` helper reused across companies/relationships/contacts/proposalLinks/skipped, plus a dedicated `diffPairs` that merges `flaggedPairs`+`suppressedPairs` into one per-pair-key status map
- `src/lib/reconcile/drift.test.ts` - 16 tests, one per `<behavior>` bullet plus a reordered-array-is-clean determinism test
- `.gitignore` - added `.reconcile/` with a "contain live client data, never commit" rationale comment

## Decisions Made
See `key-decisions` in frontmatter: (1) `envelope.generatedAt` mirrors `plan.generatedAt` for semantically correct `ageMs`; (2) `computeDrift` gained a `freshFingerprint` input field to satisfy the plan's own `<behavior>` requirement for a `fingerprint-mismatch` result, since `ReconciliationPlan` carries no fingerprint field; (3) two doc-comment wording adjustments to avoid tripping literal-substring grep gates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `computeDrift`'s literal `{ stored, fresh }` signature could never produce the `fingerprint-mismatch` result its own `<behavior>` block requires**
- **Found during:** Task 2, while designing `computeDrift`'s parameter shape
- **Issue:** The plan states `computeDrift({ stored, fresh })` where `fresh` is a plain `ReconciliationPlan` — but `ReconciliationPlan` (from plan 02) has no `databaseFingerprint` field, and the required behavior `returns { status: 'fingerprint-mismatch', storedFingerprint, freshFingerprint }` needs a fresh-side fingerprint to compare against `stored.databaseFingerprint`.
- **Fix:** Added a third input field, `freshFingerprint: string`, to `ComputeDriftInput`, threaded by the caller (the future real-run script, which computes its own fingerprint the same way `writeDryRunReport`'s caller does). `fresh` itself stays typed exactly as `ReconciliationPlan`, matching the plan's literal type statement.
- **Files modified:** `src/lib/reconcile/drift.ts`
- **Verification:** `npx vitest run src/lib/reconcile/drift.test.ts` (16/16 pass, including the fingerprint-mismatch test); `npm run typecheck` clean.
- **Committed in:** `31564f9` (Task 2 commit)

**2. [Rule 1 - Bug] Doc comments literally containing `server-only` and `process.cwd()` tripped the acceptance-criteria grep gates**
- **Found during:** Task 1, running the acceptance-criteria greps after the initial write
- **Issue:** `report.ts`'s module header explained (correctly) that the file "deliberately does NOT import `server-only`" and that `writeDryRunReport` takes `now`/`rootDir` as arguments "rather than read from ... `process.cwd()`" — both true statements, but the acceptance criteria run `grep -c "server-only"` / `grep -c "process.cwd()"` expecting `0`, and grep matches substrings in comments exactly the same as substrings in code.
- **Fix:** Reworded both comments to convey the same meaning ("imports no server-boundary marker module of any kind", "the ambient clock / ambient working directory") without the literal substrings.
- **Files modified:** `src/lib/reconcile/report.ts`
- **Verification:** `grep -c "server-only" src/lib/reconcile/report.ts` → `0`; `grep -c "process.cwd()" src/lib/reconcile/report.ts` → `0`; `npx vitest run src/lib/reconcile/report.test.ts` still 14/14 pass.
- **Committed in:** `1362259` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bug fixes)
**Impact on plan:** Deviation 1 was necessary for `computeDrift` to satisfy its own stated behavior contract — no scope creep, the added field only carries information the caller already has to compute. Deviation 2 is textual only (doc comments), no behavior change.

## Issues Encountered
`git check-ignore -q .reconcile` (bare, no trailing slash, per the plan's `<verification>` block) exits non-zero when `.reconcile/` does not yet exist as a real directory on disk, because git cannot confirm a non-existent bare path is a directory and so does not apply the directory-only (`.reconcile/`) gitignore pattern to it. `git check-ignore -q .reconcile/` (trailing slash) exits `0` unconditionally, and the bare form also exits `0` once the directory is created (verified locally, then removed — no `.reconcile/` directory is committed by this plan). This will resolve itself naturally the first time plan 07's CLI script runs a real dry run and creates `rootDir/.reconcile/`; not a defect in the `.gitignore` entry itself.

## User Setup Required
None - no external service configuration required. This plan touches no infrastructure, no migrations, and no environment variables.

## Next Phase Readiness
- `src/lib/reconcile/report.ts` exports exactly `writeDryRunReport`, `readLatestDryRunReport`, `REPORT_DIR`, and `DryRunReportEnvelope` — plan 07's CLI script can call `writeDryRunReport()` directly for its `--dry-run` mode and `readLatestDryRunReport()` to load the report the real run diffs against.
- `src/lib/reconcile/drift.ts` exports `computeDrift`/`formatDrift`/`DriftChange`/`DriftResult` — plan 07's real-run mode calls `computeDrift({ stored: readLatestDryRunReport(rootDir), fresh: planReconciliation(...), freshFingerprint })` and can hard-abort on `no-report` | `fingerprint-mismatch` | `source-mismatch`, or print `formatDrift(result)` and require confirmation on `drift`.
- **JSON envelope shape** (for plan 07): `{ reportVersion: '1', sourceId, generatedAt, databaseFingerprint, counts: { companiesToCreate, companiesExisting, relationshipsToCreate, contactsToCreate, contactsToUpdate, proposalLinks, pairsFlagged, pairsSuppressed, skipped }, plan: <ReconciliationPlan> }`.
- **Report file names** (for plan 07, all under `rootDir/.reconcile/`): `dry-run-<basic-ISO8601-timestamp>.json` / `.md` (archived, never overwritten) and `dry-run-latest.json` / `.md` (overwritten every dry run; `dry-run-latest.json` is what the real run reads).
- No blockers for 31-05..08. Full suite (1575 tests), typecheck, and lint are all green.

---
*Phase: 31-reconciliation-engine-proposal-extraction*
*Completed: 2026-09-02*

## Self-Check: PASSED

All 4 created/modified source files plus the SUMMARY itself verified present on disk; both task commit hashes (`1362259`, `31564f9`) verified present in git log.
