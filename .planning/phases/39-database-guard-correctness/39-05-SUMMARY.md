---
phase: 39-database-guard-correctness
plan: 05
subsystem: database
tags: [neon, postgres, database-url, guard, vitest, fixture-testing, differential-testing]

# Dependency graph
requires:
  - phase: 39-01
    provides: "scripts/_neon-endpoints.list + scripts/_neon-endpoints.ts (shared endpoint identity)"
  - phase: 39-02
    provides: "scripts/_env-precedence.ts (envFileOrder, resolveDatabaseUrl)"
  - phase: 39-03
    provides: "scripts/_db-branch-guard.ts (assertSafeDatabaseTarget, classifyDatabaseTarget)"
  - phase: 39-04
    provides: "scripts/check-local-db-branch.sh rewritten to resolve the effective DATABASE_URL, plus prebuild/prestart hooks"
provides:
  - "tests/_db-guard-fixtures.ts — shared temp-dir + process-spawn harness and 18-case CASES matrix"
  - "tests/db-guard-exit-codes.test.ts — 20 tests proving the real bash guard's exit code and output per case (D-06, ROADMAP criterion 1)"
  - "tests/db-guard-differential.test.ts — 23 tests proving the bash guard and scripts/_env-precedence.ts agree on every case (D-02, ROADMAP criterion 3)"
  - "docs/operations/neon-branch-routing.md cross-linked to scripts/_neon-endpoints.list and describing the guard's actual --node-env/prebuild/prestart behaviour (D-05)"
  - "OPS-05 marked complete in .planning/REQUIREMENTS.md — closes the sole requirement of Phase 39"
affects: [phase-40]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "execFileSync('bash', [absolutePath, ...argv]) with an explicitly-constructed child env ({ PATH } plus only the case's own vars, never a full environment inheritance) — the first process-spawn test harness in this repo (pattern mapper found zero prior execSync/spawnSync/child_process test usage)"
    - "Narrow regex parsing of a CLI's human-readable stdout ('(HOST) from SOURCE' / '(from SOURCE)'), anchored on the 'from' fragment, never a whole-line match — keeps a differential test from coupling to log wording that D-07 already changed once"
    - "One shared CASES matrix consumed by two suites (exit-code proof + differential proof) so a single new case extends both proofs at once"

key-files:
  created:
    - tests/_db-guard-fixtures.ts
    - tests/db-guard-exit-codes.test.ts
    - tests/db-guard-differential.test.ts
  modified:
    - docs/operations/neon-branch-routing.md
    - scripts/check-local-db-branch.sh

key-decisions:
  - "The D-06/D-08 'no credential leaked' invariant checks for postgres://fixture (an actual embedded fixture credential) rather than a bare postgres:// substring — the guard's own no-user@host-segment error message legitimately prints a generic, credential-free usage-hint template ('postgres://user:pass@ep-<endpoint>-pooler.<region>.aws.neon.tech/db.') that a blanket substring check would have wrongly flagged as a leak. See Deviations."
  - "Fixed a stale filename in scripts/check-local-db-branch.sh's own header comment (introduced by plan 39-04's forward reference), which named a not-yet-written file 'tests/db-guard-fixtures.test.ts' instead of the actual 'tests/db-guard-differential.test.ts' — a one-line documentation-accuracy fix, no behaviour change."
  - "The negative-control step (perturbing the bash guard's test-nodeEnv candidate order to include .env.local) was executed exactly as the plan mandated, confirmed to fail the differential suite, then reverted via git checkout -- with a clean git diff afterward — proving the suite actually bites rather than passing vacuously."

requirements-completed: [OPS-05]

# Metrics
duration: ~25min
completed: 2026-09-06
---

# Phase 39 Plan 05: Fixture Exit-Code Proof + Differential Drift Proof + Routing-Doc Cross-Link Summary

**An 18-case fixture matrix drives the real `check-local-db-branch.sh` binary via `execFileSync` to prove its exit code per case (D-06, closing ROADMAP criterion 1), a companion differential suite proves that binary and `scripts/_env-precedence.ts`'s TypeScript resolver agree on every case including the `NODE_ENV=test` exclusion (D-02, closing ROADMAP criterion 3), and the routing doc now names `scripts/_neon-endpoints.list` as its six-consumer machine-readable counterpart — closing OPS-05, the sole requirement of Phase 39.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-06T19:56:00+02:00 (approx, immediately after 39-04 hand-off)
- **Completed:** 2026-09-06T20:20:33+02:00
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Created `tests/_db-guard-fixtures.ts` — the first process-spawn test harness in this repo (`execFileSync('bash', [absolutePath, '--root', dir, '--node-env', nodeEnv])`, argv array never a shell string, child env constructed explicitly as `{ NODE_ENV: 'test' (type-satisfying placeholder), PATH, ...caseEnv }`, never inheriting the vitest worker's ambient environment) plus the shared 18-case `CASES` matrix
- `tests/db-guard-exit-codes.test.ts` — 20 tests (18 cases + 2 harness-level invariants) driving the REAL `scripts/check-local-db-branch.sh` binary, proving: the 2026-09-06 incident both ways (production file present → ERROR; absent → OK), the `NODE_ENV=test` `.env.local` exclusion (both the positive case and the "only `.env.local` present" SKIP case), the `bug_011` `:5432` port-suffix case, both FAIL-SAFE cases (unrecognised endpoint, lookalike domain), the no-user@host-segment error, the commented-out-value case, the leading-whitespace `export` form, and the `process.env`-beats-every-file case — plus that no case's output leaks `MUSTNOTAPPEAR`, `fixture:fixture`, `sslmode`, or an embedded `postgres://fixture` credential (D-08), and that every case with a resolved source names it via a `from <source>` fragment (D-07)
- `tests/db-guard-differential.test.ts` — 23 tests: one per fixture case asserting the bash guard and `resolveDatabaseUrl` agree on SKIP-vs-resolve, hostname, and source-file attribution; two targeted tests re-stating the `NODE_ENV=test` exclusion and the `process.env` case explicitly; three structural per-node-env candidate-order tests (development/production/test) proving the winning file matches `envFileOrder(nodeEnv)[0]` on both sides, with `test` additionally proving `.env.local` is never selected even when present on disk
- **Negative control performed and confirmed, per the plan's mandate**: temporarily changed the bash guard's `test` branch to include `.env.local` in its candidate order, re-ran the differential suite, confirmed it failed (`NODE_ENV=test with only .env.local present` — `expected false to be true`), then reverted via `git checkout --` and confirmed `git diff --exit-code scripts/check-local-db-branch.sh` exits 0
- `docs/operations/neon-branch-routing.md` § Lifecycle gained two new subsections (no edits inside the numbered rules block or the ASCII diagram, confirmed via `git diff`): one naming `scripts/_neon-endpoints.list` as the six-consumer machine-readable counterpart (including the `probe-write-isolation.ts` D-36-03 exemption), one describing the guard's actual `--node-env`/`prebuild`/`prestart`/SKIP behaviour and citing OPS-05 and the 2026-09-06 incident date — no endpoint hostname or credential restated in prose
- Full suite (2455 tests across 188 files, +43 over 39-04's 2412), `npm run typecheck`, and `npm run lint:check` all pass; the repo's real `.env*` file set (`.env.example`, `.env.local`, `.env.local.bak.20260831`, `.env.production.local`, `.env.test.local`) is confirmed unchanged before and after every run, and `/tmp` carries zero leaked `db-guard-*` directories

## Task Commits

1. **Task 1: Build the spawn/temp-dir harness and prove the guard's exit code per case (D-06)** - `d033469` (test, TDD)
2. **Task 2: Prove the bash guard and the TypeScript loader cannot drift (D-02)** - `8ef8353` (test, TDD)
3. **Task 3: Cross-link the routing doc to the machine-readable endpoint list** - `6b64485` (docs)

**Plan metadata:** committed alongside this SUMMARY

## Files Created/Modified

- `tests/_db-guard-fixtures.ts` - helper module (not collected as a suite): `makeFixtureDir`, `cleanupFixtureDir`, `runGuard`, `CASES`, plus `urlFor`/`PRODUCTION_HOST`/`PREVIEW_HOST`/`DEVELOPMENT_HOST` reused by both consumer test files
- `tests/db-guard-exit-codes.test.ts` - D-06 evidence, 20 tests, collected by `npm test` / CI's "Vitest unit tests" step
- `tests/db-guard-differential.test.ts` - D-02 anti-drift proof, 23 tests, including the mandated negative-control demonstration
- `docs/operations/neon-branch-routing.md` - two new subsections after the Lifecycle table (`### Machine-readable counterpart`, `### The local DATABASE_URL guard (OPS-05)`)
- `scripts/check-local-db-branch.sh` - one-line header-comment fix (stale filename reference), no behavioural change

## Decisions Made

- **`postgres://fixture` over a bare `postgres://` substring check** for the D-08 no-credential-leak invariant. The guard's own no-user@host-segment error message legitimately prints a generic usage-hint template containing the literal scheme prefix as a placeholder — not a disclosure, since it names no real host, user, or password. A blanket substring check would have flagged this pre-existing, correct help text as a leak. The precise check (`/postgres:\/\/fixture/`) targets an actual embedded fixture credential instead, while the `fixture:fixture`, `MUSTNOTAPPEAR`, and `sslmode` checks remain unconditional across every case.
- **Corrected a stale forward-reference** in `scripts/check-local-db-branch.sh`'s header comment: plan 39-04 wrote `tests/db-guard-fixtures.test.ts` as a placeholder name for "the differential test 39-05 will add"; this plan's actual filenames are `tests/_db-guard-fixtures.ts` (helper) and `tests/db-guard-differential.test.ts` (the test). Fixed to the real name — a one-line documentation-accuracy correction, no functional change.
- **`NODE_ENV: 'test'` as a type-satisfying placeholder** in both the harness's `runGuard` and the differential test's `toProcessEnv` helper, following the precedent 39-02's SUMMARY documented: Next.js's global type augmentation makes `NODE_ENV` a required field of `NodeJS.ProcessEnv`, but neither `resolveDatabaseUrl` nor the guard (always invoked with an explicit `--node-env`) ever reads this ambient value.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The D-08 "no credential leaked" invariant's literal `postgres://` check produced a false positive against the guard's own legitimate help text**

- **Found during:** Task 1, first run of `tests/db-guard-exit-codes.test.ts`
- **Issue:** The plan's `<behavior>` spec calls for asserting no case's output contains the literal `postgres://`. The `.env.local whose DATABASE_URL has no user@host segment` case triggers `scripts/check-local-db-branch.sh`'s own pre-existing (unchanged by this plan) error branch, which prints a generic connection-string format example: `postgres://user:pass@ep-<endpoint>-pooler.<region>.aws.neon.tech/db.` — using placeholder tokens (`user`, `pass`, `<endpoint>`, `<region>`), not a real or fixture credential. The literal blanket check failed this legitimate, credential-free line.
- **Fix:** Narrowed the assertion to `/postgres:\/\/fixture/` — the pattern an actual leaked fixture credential would always match (since every fixture URL in this suite uses `fixture:fixture`) — while keeping the `MUSTNOTAPPEAR`, `fixture:fixture`, and `sslmode` checks as unconditional blanket substring checks across every case.
- **Files modified:** `tests/db-guard-exit-codes.test.ts`
- **Verification:** All 20 tests in `tests/db-guard-exit-codes.test.ts` pass; the assertion still fails if any case's output contains `postgres://fixture` (confirmed by construction — every other case's fixture URL uses that exact pattern and is correctly caught by the `fixture:fixture` check independently).
- **Committed in:** `d033469` (Task 1 commit)

**2. [Rule 1 - Documentation accuracy] Fixed a stale filename in `scripts/check-local-db-branch.sh`'s header comment**

- **Found during:** Task 2, while reading the guard's header comment for context before writing the differential test
- **Issue:** Plan 39-04's rewrite of the guard included a forward reference to "the differential test that fails if the two diverge," naming it `tests/db-guard-fixtures.test.ts` — a placeholder guess written before this plan existed. This plan's actual filenames are `tests/_db-guard-fixtures.ts` (the non-`.test.ts` helper module, never collected as a suite per `vitest.config.ts`'s include glob) and `tests/db-guard-differential.test.ts` (the actual differential test).
- **Fix:** Updated the comment to name `tests/db-guard-differential.test.ts`, the file that actually performs that role.
- **Files modified:** `scripts/check-local-db-branch.sh` (comment only, zero executable lines changed)
- **Verification:** `git diff` confirms only the one comment line changed; all 43 tests across both new suites still pass.
- **Committed in:** `8ef8353` (Task 2 commit)

### Discovered Plan Inconsistency (not auto-fixed — none found)

No unsatisfiable acceptance-criteria conflicts were found in this plan, unlike 39-01 through 39-04. This plan's own interface contract (fixture credential discipline, `--root`/`--node-env` CLI shape) was written after those four plans landed and matches the actual shipped behaviour precisely.

---

**Total deviations:** 2 auto-fixed (1 bug in the invariant's own literal-check specificity, 1 documentation-accuracy fix carried over from 39-04) — both narrow, both verified, no scope creep, no weakening of any actual security or correctness guarantee.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required.

## ROADMAP Criteria Closed

- **Criterion 1** ("`.env.production.local` failure demonstrated by an automated fixture test in CI using throwaway env files"): closed by `tests/db-guard-exit-codes.test.ts`'s `INCIDENT 2026-09-06` and `criterion 1 second half` cases, collected by `npm test` and therefore CI's "Vitest unit tests" step (`.github/workflows/ci.yml` line 64).
- **Criterion 3** ("the bash guard and the TypeScript loader resolve the SAME `DATABASE_URL` and name the SAME source for every case, including `NODE_ENV=test`"): closed by `tests/db-guard-differential.test.ts`, demonstrated to bite via the mandated negative control (perturb → fail → revert → clean diff).
- **Criterion 5** (D-05a's single-source endpoint table, six consumers): already closed by plan 39-01; this plan's Task 3 makes the six-consumer list and the standing `probe-write-isolation.ts` exemption legible in `docs/operations/neon-branch-routing.md` for a human reader, matching D-05's cross-link requirement.

## Negative-Control Results (both suites)

| Suite | Perturbation | Result before revert | Result after revert |
|---|---|---|---|
| `tests/db-guard-differential.test.ts` | Added `.env.local` back into the bash guard's `test`-nodeEnv candidate array | `NODE_ENV=test with only .env.local present` failed: `expected false to be true` | `git diff --exit-code scripts/check-local-db-branch.sh` exits 0; full 23-test suite passes again |

(Task 1's exit-code suite has no analogous negative-control requirement in the plan; its evidence is the direct case matrix itself, including the incident proven in both directions.)

## Final Case Count

- **18 fixture cases** in the shared `CASES` matrix (`tests/_db-guard-fixtures.ts`), covering every `<behavior>` bullet from Task 1.
- **20 tests** in `tests/db-guard-exit-codes.test.ts` (18 cases + 2 harness-level invariants: no-credential-leak, `from <source>` presence).
- **23 tests** in `tests/db-guard-differential.test.ts` (18 per-case agreement tests + 2 targeted `NODE_ENV=test`/`process.env` re-assertions + 3 structural per-node-env order tests).
- **43 new tests total**, full suite now at **2455 passed / 61 skipped** (up from 39-04's hand-off of 2412).

## Next Phase Readiness

- OPS-05 is closed — Phase 39's sole requirement. `.planning/REQUIREMENTS.md`'s OPS-05 checkbox and traceability status are updated as part of this plan's state-update step.
- Phase 40 (Milestone Record Closure) can cite this plan's evidence directly: the fixture and differential suites are permanent, CI-collected regression nets, not one-off manual verification — any future change to either resolver that breaks their agreement will fail `npm test` before merge.
- `tests/_db-guard-fixtures.ts`'s `CASES` matrix, `makeFixtureDir`/`runGuard`/`cleanupFixtureDir` harness, and hostname constants (`PRODUCTION_HOST`/`PREVIEW_HOST`/`DEVELOPMENT_HOST`/`urlFor`) are available for reuse by any future plan needing to exercise the guard binary against fixture env files.
- Full test suite (2455 tests), typecheck, and lint:check all green at hand-off. The repo's real `.env*` file set is confirmed unchanged: `.env.example`, `.env.local`, `.env.local.bak.20260831`, `.env.production.local`, `.env.test.local`.

## Self-Check: PASSED

All 3 created files and 2 modified files verified present on disk with expected content; all 3 task commit hashes (`d033469`, `8ef8353`, `6b64485`) verified present in `git log`.

---
*Phase: 39-database-guard-correctness*
*Completed: 2026-09-06*
