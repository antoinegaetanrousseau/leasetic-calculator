---
phase: 29-migration-safety-net
plan: 01
subsystem: infra
tags: [ci, github-actions, drizzle, neon, migrations, bash]

# Dependency graph
requires:
  - phase: 20-infra-hardening
    provides: "Three-branch Neon split (main/preview/development) and db-migrate.yml fan-out workflow"
provides:
  - "scripts/check-migration-journal-sync.sh — journal/SQL 1:1 parity guard (the actual Phase 12 regression detector)"
  - "scripts/check-db-smoke-filter.sh — anti-rot guard asserting the db-smoke paths-filter matches real migration paths"
  - "Corrected db-smoke paths-filter (drizzle/*.sql, was the dead drizzle/migrations/*.sql)"
  - "Journal-parity step wired inside db-smoke before ephemeral Neon branch creation"
  - "Anti-rot guard wired into build-test on every PR"
  - "Migration gates scenario matrix documented in docs/operations/neon-branch-routing.md"
affects: [30-migration-safety-net, 31, 32, 33, 34]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bash guard scripts (set -euo pipefail, cd to repo root, header comment citing the incident, actionable failure message) as the house style for CI-config regression detectors"
    - "Two-layer CI defense: build-test runs config-shape guards on every PR; db-smoke runs data-shape guards only when the schema filter fires"

key-files:
  created:
    - scripts/check-migration-journal-sync.sh
    - scripts/check-db-smoke-filter.sh
  modified:
    - package.json
    - .github/workflows/ci.yml
    - docs/operations/neon-branch-routing.md

key-decisions:
  - "Journal-parity check placed BEFORE ephemeral Neon branch creation in db-smoke, so an orphaned migration fails in seconds without consuming a Neon free-tier branch slot"
  - "Anti-rot filter guard placed in build-test (not db-smoke) because it must run on every PR regardless of whether a migration changed — the filter can rot on any PR"
  - "No jq/YAML-parser dependency added; both guards parse ci.yml and _journal.json with grep/sed/awk to keep zero new package.json dependencies (per threat T-29-SC disposition)"

requirements-completed: [INFRA-04, INFRA-06]

# Metrics
duration: ~5min (Task 3 continuation only; Tasks 1-2 completed in a prior session ~12:37-12:38 CEST; session was interrupted by a Bash tool outage between Task 2 and Task 3)
completed: 2026-08-31
---

# Phase 29 Plan 01: Migration Safety Net Summary

**Fixed a fail-open CI migration gate — db-smoke's paths-filter never matched real migration files, and even when it did, drizzle-orm's journal-driven `migrate()` silently ignored orphaned `.sql` files; two bash guards now catch both defects and one is wired to run on every PR.**

## Performance

- **Duration:** Tasks 1-2 ~2 min (prior session); Task 3 (this continuation) ~5 min of active work, after resuming from a Bash-tool-outage interruption
- **Completed:** 2026-08-31
- **Tasks:** 3/3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `scripts/check-migration-journal-sync.sh` — DB-free, fast guard asserting every `drizzle/[0-9]*.sql` file has a matching `_journal.json` tag and vice versa (both directions); this is the actual Phase 12 regression detector.
- `scripts/check-db-smoke-filter.sh` — regression test for the CI-config bug class itself: parses the `schema:` paths-filter out of `ci.yml` and asserts (A) extraction succeeded, (B) no pattern is dead, (C) every real migration file is covered, (D) a synthetic future migration path would be covered.
- `.github/workflows/ci.yml` db-smoke paths-filter corrected from the dead `drizzle/migrations/*.sql` to `drizzle/*.sql`; journal-parity step now runs inside `db-smoke`, gated on the schema filter, before ephemeral Neon branch creation; anti-rot filter guard now runs in `build-test` on every PR.
- `docs/operations/neon-branch-routing.md` gained a `## Migration gates (INFRA-06)` section with the 4-row scenario matrix and a verbatim restatement of Phase 20 locked rule 3 (the `## Locked rules` list itself untouched).
- INFRA-04 carried for traceability with zero work performed, per plan objective (Phase 20 already shipped the three-branch Neon split).

## Task Commits

Each task was committed atomically:

1. **Task 1: Journal/SQL parity gate — the Phase 12 regression detector** - `b42c9c3` (feat)
2. **Task 2: Anti-rot guard — the db-smoke path filter must match real migration paths** - `7f4a8bd` (feat)
3. **Task 3: Rewire ci.yml and record the scenario matrix** - `7f12cbd` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `scripts/check-migration-journal-sync.sh` - Journal/SQL 1:1 parity guard, run inside db-smoke before branch creation
- `scripts/check-db-smoke-filter.sh` - Anti-rot guard for the db-smoke paths-filter, run in build-test on every PR
- `package.json` - Registered `check:migration-journal-sync` and `check:db-smoke-filter` npm scripts
- `.github/workflows/ci.yml` - Fixed paths-filter pattern; wired both new guard steps into `db-smoke` and `build-test`
- `docs/operations/neon-branch-routing.md` - Added `## Migration gates (INFRA-06)` scenario matrix section; updated trailing attribution line

## Decisions Made
None beyond those already logged in frontmatter `key-decisions` — Task 3's on-disk edits (applied by the interrupted prior executor) matched the plan's specification exactly on verification; no corrections were needed.

## Deviations from Plan

None - plan executed exactly as written. Task 3's file edits, which had been applied to the working tree before the Bash tool outage interrupted the prior executor, were independently re-verified against the plan's Task 3 action spec and acceptance criteria in this continuation session before being committed — no gaps or corrections were found.

## Issues Encountered

**Prior session interruption:** A Bash tool outage interrupted the previous executor mid-Task-3, after the file edits had already been applied but before verification or commit. This continuation session re-verified every acceptance criterion from scratch (all `check:*` scripts, lint, typecheck, the orphan-migration probe, and a scratch-copy dead-pattern probe) before committing, rather than trusting the uncommitted on-disk state. All checks passed without modification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The db-smoke migration gate is now honest: it fires on every migration-only changeset and fails on an un-journaled `.sql` file, verified locally via the orphan-probe and dead-pattern-probe reproductions from the plan's `<verification>` block.
- `check:db-smoke-filter` runs on every PR in `build-test`, so the filter itself cannot silently rot again as new migrations land in phases 30-34.
- `db-migrate.yml` is byte-identical to HEAD; no new `db:migrate` invocation was introduced anywhere; Phase 20 locked rule 3 stands unchanged.
- Plan 29-02 (if any) can proceed; no blockers identified.

---
*Phase: 29-migration-safety-net*
*Completed: 2026-08-31*

## Self-Check: PASSED

All claimed files found on disk (`scripts/check-migration-journal-sync.sh`,
`scripts/check-db-smoke-filter.sh`, this SUMMARY.md) and all three task commits
(`b42c9c3`, `7f4a8bd`, `7f12cbd`) found in git log.
