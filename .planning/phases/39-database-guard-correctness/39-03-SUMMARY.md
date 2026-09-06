---
phase: 39-database-guard-correctness
plan: 03
subsystem: database
tags: [dotenv, env-precedence, database-url, guard, vitest, tdd]

# Dependency graph
requires: [39-01, 39-02]
provides:
  - "scripts/_db-branch-guard.ts — assertSafeDatabaseTarget() + classifyDatabaseTarget(), the shared TS write-target guard every tsx entry point now gets through scripts/_load-env.ts"
  - "scripts/_load-env.ts — corrected @next/env-matching precedence via envFileOrder, with assertSafeDatabaseTarget() wired in the SAME edit (D-03)"
  - "tests/db-branch-guard.test.ts — 14-case classify + fail-safe + SKIP-rule proof"
  - "tests/load-env-contracts.test.ts — 6 blocking grep contracts pinning D-03 sequencing and the probe-write-isolation.ts exemption"
affects: [39-04, 39-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verdict classification derived from NEON_ENDPOINTS (39-01), never a fourth hardcoded endpoint table — mirrors scripts/_neon-target.ts's fail-safe shape"
    - "assertSafeDatabaseTarget() takes an injectable onRefuse (default: stderr + process.exit(1)) instead of throwing, so tests can assert refusal without an inspectable ERR_INVALID_URL-style object escaping to Node's default unhandled-rejection handler"
    - "Grep-contract test anchored to an actual CALL syntax (assertSafeDatabaseTarget\\s*\\(\\s*\\)\\s*;), not a bare identifier match — a naive substring check would still pass with only the import line present and the call deleted (caught by the plan's own negative-control step)"

key-files:
  created:
    - scripts/_db-branch-guard.ts
    - tests/db-branch-guard.test.ts
    - tests/load-env-contracts.test.ts
  modified:
    - scripts/_load-env.ts
    - scripts/probe-write-isolation.ts

key-decisions:
  - "D-03's sequencing edit (precedence fix + guard call) landed in ONE commit on scripts/_load-env.ts, exactly as the plan's executor_note required — Task 1 (the guard) was fully green, committed, and read-verified before Task 2 was opened"
  - "scripts/probe-write-isolation.ts's docstring reworded its two prose mentions of the literal import syntax so Contract 3's real acceptance grep (grep -c \"import './_load-env'\") legitimately outputs 0 — this is a wording fix, not a weakening: the file never had a real import to begin with, only an explanatory quote of one"
  - "npm run build / npx next build deliberately NOT run as part of this plan's local verification — see Deviations"

requirements-completed: [OPS-05]

# Metrics
duration: ~20min
completed: 2026-09-06
---

# Phase 39 Plan 03: Shared TypeScript Write-Target Guard + _load-env.ts Precedence Fix Summary

**`scripts/_db-branch-guard.ts`'s `assertSafeDatabaseTarget()` now runs at module scope inside the corrected `scripts/_load-env.ts`, giving all 14 write-capable tsx/drizzle consumers fail-safe production-refusal in the same edit that fixed the loader's dotenv precedence (D-02/D-03), with two grep-contract suites pinning both the sequencing invariant and the `probe-write-isolation.ts` D-36-03 exemption.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-06T19:35Z (approx, immediately after 39-02 hand-off)
- **Completed:** 2026-09-06T19:49:06+02:00
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Created `scripts/_db-branch-guard.ts` exporting `classifyDatabaseTarget` (pure, six-verdict classification derived from `NEON_ENDPOINTS`) and `assertSafeDatabaseTarget` (resolves via `resolveDatabaseUrl`, SKIPs silently when no `.env*` file exists on disk, refuses production/unrecognised hosts via an injectable `onRefuse`, never interpolates a raw URL/credential)
- `tests/db-branch-guard.test.ts` — 14 tests: all six verdicts including the bug_011 `:5432` port-suffix case and the lookalike-domain fail-safe, plus the SKIP rule and the credential-free refusal message (proven absent: `MUSTNOTAPPEAR`, `fixture:fixture`, `postgres://`)
- Corrected `scripts/_load-env.ts`'s precedence to loop over `envFileOrder(NODE_ENV)` (from 39-02) instead of the hardcoded `.env.local`/`.env` pair, and wired `assertSafeDatabaseTarget()` immediately after loading — in the SAME commit, per D-03's hard ordering constraint
- `tests/load-env-contracts.test.ts` — 6 blocking grep contracts: D-03 sequencing (envFileOrder implies a real `assertSafeDatabaseTarget()` call), no re-inlined dotenv literal, the `probe-write-isolation.ts` D-36-03 exemption, a 14-entry consumer census (13 `scripts/*.ts` + `drizzle.config.ts`) matching the filesystem exactly, no credential-interpolating `console.*` call, and no subprocess/source read of an env file
- `scripts/probe-write-isolation.ts` gained a docstring-only update recording the phase 39 extension and why the exemption still holds; zero executable lines changed (confirmed via `git diff` — only lines inside the leading `/** ... */` block differ)
- **Negative control performed and confirmed**: with `assertSafeDatabaseTarget();` temporarily deleted from `scripts/_load-env.ts`, Contract 1 failed with the expected D-03 violation message; the file was restored via `git checkout --` and `git diff --exit-code scripts/_load-env.ts` confirmed clean
- Full suite (2412 tests across 186 files, +6 over 39-02's 2406), `npm run typecheck`, and `npm run lint:check` all pass; `npm run db:generate` completes locally with the guard active (resolves `.env.local`'s development-branch target via `ok-development`, does not refuse)

## Task Commits

1. **Task 1: Create the shared TypeScript write-target guard** - `fd4b93f` (feat, TDD)
2. **Task 2: Correct _load-env.ts precedence AND wire the guard in the same edit (D-03)** - `4005873` (fix)
3. **Task 3: Pin the D-03 sequencing invariant and the probe-write-isolation exemption** - `987854f` (test)

**Plan metadata:** committed alongside this SUMMARY

## Files Created/Modified

- `scripts/_db-branch-guard.ts` - `TargetVerdict`, `classifyDatabaseTarget`, `assertSafeDatabaseTarget`; derives its verdict table from `NEON_ENDPOINTS` (39-01), resolves via `resolveDatabaseUrl` (39-02), never reads `process.env.DATABASE_URL` directly
- `tests/db-branch-guard.test.ts` - 14-case behavioural suite (`mkdtempSync`/`rmSync` harness, distinct `db-branch-guard-` prefix, fixtures carry `secretmarker=MUSTNOTAPPEAR`)
- `scripts/_load-env.ts` - hardcoded two-file `config()` pair replaced with a loop over `envFileOrder(process.env.NODE_ENV ?? 'development')`; `assertSafeDatabaseTarget()` called immediately after; docstring rewritten to describe the real precedence and record the guard/SKIP-rule/probe-exemption
- `tests/load-env-contracts.test.ts` - 6 blocking grep contracts, documentation style matching `tests/admin-09-grep-contracts.test.ts`
- `scripts/probe-write-isolation.ts` - docstring-only: reworded two prose mentions of the shared loader's import syntax, added a new paragraph recording the phase 39 extension and the standing D-36-03 exemption

## Decisions Made

- **Task 1 fully proven before Task 2 was opened**, per the plan's `<executor_note>` — `npx vitest run tests/db-branch-guard.test.ts`, `npm run typecheck`, and `npm run lint:check` all green and committed (`fd4b93f`) before reading a single line for Task 2. This is what makes Task 2's precedence-plus-guard edit safe rather than half-verified.
- **Refusal message reuses `check-local-db-branch.sh`'s remediation wording** (Neon Console → project leasetic-matrice → branch development → Connection details → Pooled connection → copy URL into `.env.local`), so a developer sees identical fix instructions from either guard (D-07).
- **`onRefuse` default is stderr-print-then-`process.exit(1)`, never a bare throw** — `tsx` entry points are plain Node processes where an uncaught rejection prints the error OBJECT via Node's default handler, and `ERR_INVALID_URL` carries the offending URL on an `input` property. Same disclosure trap `scripts/probe-write-isolation.ts`'s docstring already documents.
- **Contract 1's regex anchors to the call syntax**, not the bare identifier. During the mandated negative-control step, deleting only the `assertSafeDatabaseTarget();` invocation line left the `import { assertSafeDatabaseTarget } from './_db-branch-guard';` line intact, and a naive `/assertSafeDatabaseTarget/.test(contents)` check still matched that import — silently passing when it should have failed. Fixed to `/assertSafeDatabaseTarget\s*\(\s*\)\s*;/` before the negative control was re-run and confirmed to bite correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Contract 1's grep-contract regex matched the import line, not the call**
- **Found during:** Task 3, while performing the plan's own mandated negative-control step
- **Issue:** `/assertSafeDatabaseTarget/.test(contents)` is true for both `import { assertSafeDatabaseTarget } from './_db-branch-guard';` and the actual invocation `assertSafeDatabaseTarget();`. Deleting only the invocation (leaving the import) left the test passing when it should have failed — the exact false-negative the negative control exists to catch.
- **Fix:** Anchored the check to `/assertSafeDatabaseTarget\s*\(\s*\)\s*;/`, which only matches the call syntax.
- **Files modified:** `tests/load-env-contracts.test.ts`
- **Verification:** Re-ran the negative control: with the invocation deleted, Contract 1 now fails with the D-03 violation message; restored via `git checkout --`, confirmed `git diff --exit-code scripts/_load-env.ts` exits 0.
- **Committed in:** `987854f` (Task 3 commit)

**2. [Rule 1 - Documentation accuracy] Docstring literals tripped their own acceptance greps**
- **Found during:** Task 2 (writing `scripts/_load-env.ts`'s new docstring) and Task 3 (writing `scripts/probe-write-isolation.ts`'s addition)
- **Issue:** Three acceptance criteria are literal `grep -c` checks against whole-file contents, including comments: `grep -c "override" scripts/_load-env.ts` (expected 0), `grep -c 'URL.host\b' scripts/_db-branch-guard.ts` (expected 0), and `grep -c "process\.env\.DATABASE_URL" scripts/_db-branch-guard.ts` (expected 0). The first drafts of both docstrings used these exact words/phrases in explanatory prose (e.g. "dotenv's `override: false` default", "NEVER `URL.host`", "never reading `process.env.DATABASE_URL` directly") — accurate content, phrased in a way that tripped the literal grep.
- **Fix:** Reworded each mention to describe the same guarantee without the flagged literal (e.g. "a later file never replaces an already-set key", "the sibling property that also carries the port", "the raw ambient `DATABASE_URL` variable directly"). No functional or interface change — this is the same class of plan-authoring mismatch 39-01 and 39-02 documented (acceptance-criteria regex written without accounting for legitimate prose).
- **Files modified:** `scripts/_load-env.ts`, `scripts/_db-branch-guard.ts`
- **Verification:** All three greps now output `0`; `npx vitest run` and the full suite still pass with identical assertions.
- **Committed in:** `fd4b93f` (guard docstring) and `4005873` (loader docstring)

### Discovered Plan Inconsistency (not auto-fixed — documented instead)

**3. `npm run build` / `npx next build` were NOT run as part of this plan's local verification.**

The plan's `<verification>` section calls for `npm run build` (acknowledging it may correctly exit 1 once 39-04's `prebuild` hook lands) and, as a fallback, `npx next build` "to exercise the build itself without the hook." Both commands set `NODE_ENV=production` internally. This repo's working tree currently has a real, non-`.OFF` `.env.production.local` pointing at the actual production Neon `main` branch (verified by hostname extraction only, never printed in full). Per this session's project-specific constraints (inherited from prior incidents on this exact repo): "NEVER run a command with `NODE_ENV=production` against real env files — `.env.production.local` outranks `.env.local` and resolves `DATABASE_URL` to PROD. That precedence bug IS the OPS-05 defect this phase fixes. Exercise the guard with fixture/temp env directories only; never point a real command at prod to 'see if the guard fires.'"

Running `next build` would not exercise `scripts/_db-branch-guard.ts` at all — Next.js's own `@next/env` loading is unrelated to this plan's guard, and no `prebuild` hook exists yet (39-04 has not landed: confirmed via `grep -n '"prebuild"' package.json` returning nothing). It would, however, risk any server component or API route that queries the database at build time actually reaching the production branch. That risk is exactly what the project's standing constraint forbids, independent of this plan's own scope.

- **Impact:** None on this plan's actual deliverable. Every acceptance criterion that can be verified safely was verified: `npx vitest run tests/db-branch-guard.test.ts`, `npx vitest run tests/load-env-contracts.test.ts`, the full `npx vitest run` (2412 tests), `npm run typecheck`, `npm run lint:check`, the `envFileOrder('production')[0] === '.env.production.local'` behavioural proof (via a temp probe script, since the plan's literal `npx tsx -e "import(...)"` one-liner hit an unrelated `tsx` CJS/ESM interop quirk under `-e` evaluation — documented for 39-04/39-05's awareness), and `npm run db:generate` completing locally with the guard active.
- **Not auto-fixed** because running the build against this specific working tree's real production credentials is the actual hazard the constraint exists to prevent — substituting a safe alternative here would mean fabricating a result rather than skipping an unsafe step. Plan 39-04, which adds the `prebuild`/`prestart` hooks, is the correct place to exercise this class of check, ideally against a throwaway env fixture rather than the repo's real `.env.production.local`.

---

**Total deviations:** 2 auto-fixed (1 bug in the test's own negative-control coverage, 1 documentation-wording conflict matching 39-01/39-02's precedent) + 1 documented plan step deliberately not run (safety-motivated, no impact on this plan's deliverable)
**Impact on plan:** No scope creep. The negative-control fix strengthened the test the plan itself demanded; the docstring rewording is cosmetic; the skipped build step is a safety call consistent with this repo's standing production-isolation constraints, not a gap in what was actually built or proven.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `scripts/_db-branch-guard.ts` exports `assertSafeDatabaseTarget` with an `onRefuse` injection point exactly as the interface contract specifies — plan 39-05's differential test can use it directly.
- `scripts/_load-env.ts` now honours the full `@next/env` candidate order and enforces the write target for all 14 consumers through one import; none of the 14 consumer files was edited (`git diff --name-only` confirms).
- `scripts/probe-write-isolation.ts` keeps its D-36-03 exemption, now cross-referencing `tests/load-env-contracts.test.ts` Contract 3 directly in its own docstring.
- Plan 39-04 (bash guard fold + `prebuild`/`prestart` hooks) should read this summary's Deviation 3 before running any `NODE_ENV=production` command locally, and should prefer a throwaway env fixture over this repo's real `.env.production.local` when proving the hook fires.
- Plan 39-05's differential test has both halves ready: `resolveDatabaseUrl` (39-02) for the TS side, and now `classifyDatabaseTarget`/`assertSafeDatabaseTarget` for the guard side, both built on 39-01's shared `NEON_ENDPOINTS`.
- Full test suite (2412 tests), typecheck, and lint:check all green at hand-off. `npm run build`/`next build` were not exercised locally — see Deviation 3.

## Self-Check: PASSED

All 5 created/modified files verified present on disk with expected content; all 3 task commit hashes (`fd4b93f`, `4005873`, `987854f`) verified present in `git log`.

---
*Phase: 39-database-guard-correctness*
*Completed: 2026-09-06*
