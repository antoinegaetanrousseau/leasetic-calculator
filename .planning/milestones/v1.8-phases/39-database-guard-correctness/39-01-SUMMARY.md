---
phase: 39-database-guard-correctness
plan: 01
subsystem: database
tags: [neon, postgres, database-url, seeder, guard, vitest]

# Dependency graph
requires: []
provides:
  - "scripts/_neon-endpoints.list — single declarative, non-executable source of Neon endpoint identity (prefix|hostname|branch|scope)"
  - "scripts/_neon-endpoints.ts — parseNeonEndpointList() + NEON_ENDPOINTS typed accessor"
  - "tests/neon-endpoints.test.ts — parser edge cases + data-integrity regression net"
  - "scripts/_neon-target.ts, scripts/seed-fiche-fixtures.ts, scripts/seed-pipeline-fixtures.ts, scripts/seed-reconciliation-fixtures.ts all read NEON_ENDPOINTS instead of declaring their own copy"
affects: [39-02, 39-03, 39-04, 39-05, phase-40]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Data-only accessor module: readFileSync + fileURLToPath(new NodeURL(...)) explicitly from node:url, never the global URL (jsdom test environment shims globalThis.URL to resolve relative refs against a fake http://localhost:3000/ document location instead of an explicit file: base — silent misdirection, not an error, until readFileSync's scheme check on the misdirected URL throws)"
    - "FORBIDDEN_TARGETS = NEON_ENDPOINTS.filter(e => e.branch !== 'development') — derives a seeder's forbidden set from shared data instead of a hardcoded array"

key-files:
  created:
    - scripts/_neon-endpoints.list
    - scripts/_neon-endpoints.ts
    - tests/neon-endpoints.test.ts
  modified:
    - scripts/_neon-target.ts
    - scripts/seed-fiche-fixtures.ts
    - scripts/seed-pipeline-fixtures.ts
    - scripts/seed-reconciliation-fixtures.ts

key-decisions:
  - "D-05a's fold covers all five code copies (not D-05's original two); probe-write-isolation.ts keeps its D-36-03 exemption untouched, and check-local-db-branch.sh is folded by plan 39-04, not here"
  - "Used node:url's URL class explicitly (import { URL as NodeURL } from 'node:url') instead of the global URL constructor, because the test suite runs under a jsdom environment that shims globalThis.URL to silently resolve relative refs against http://localhost:3000/ rather than the file: base passed as the second argument"
  - "tests/neon-endpoints.test.ts is a sixth accounted-for file in the exhaustive survivor grep, not five — see Deviations"

requirements-completed: [OPS-05]

# Metrics
duration: ~17min
completed: 2026-09-06
---

# Phase 39 Plan 01: Neon Endpoint List Consolidation Summary

**Single declarative `prefix|hostname|branch|scope` data file replaces five divergent hardcoded Neon endpoint tables across `_neon-target.ts` and three fixture seeders, with a typed parser + data-integrity test suite as the regression net.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-09-06T18:57Z (approx, first commit landed 19:08:40+02:00)
- **Completed:** 2026-09-06T19:14:05+02:00
- **Tasks:** 3
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- Created `scripts/_neon-endpoints.list` — the single machine-readable source of Neon endpoint identity (D-05), header-documented with the bug_011 hostname-not-host discipline and the fail-safe direction (unrecognised endpoint = PRODUCTION)
- Created `scripts/_neon-endpoints.ts` exporting `NeonEndpointRecord`, `parseNeonEndpointList` (fails closed on malformed field count or invalid branch, naming the 1-based line number) and `NEON_ENDPOINTS`
- Created `tests/neon-endpoints.test.ts` (10 tests) covering every `<behavior>` bullet: comment/blank-line handling, malformed-field and invalid-branch errors with line numbers, CRLF stripping, record order, self-consistency, and the exact production hostname
- Rewired `scripts/_neon-target.ts` to derive its lookup from `NEON_ENDPOINTS` — `resolveNeonTarget`'s public contract (types, gates, exact label strings) is byte-identical; `tests/neon-target.test.ts` passes with zero edits
- Rewired all three fixture seeders (`seed-fiche-fixtures.ts`, `seed-pipeline-fixtures.ts`, `seed-reconciliation-fixtures.ts`) to derive `FORBIDDEN_TARGETS = NEON_ENDPOINTS.filter(e => e.branch !== 'development')` instead of each declaring its own `FORBIDDEN_ENDPOINTS` array; guard blocks, refusal messages, and each seeder's distinct log tag (`[seed-fiche]`, `[seed-pipeline]`, `[seed-fixtures]`) are unchanged
- Full test suite (2376 tests across 177 files), `npm run typecheck`, `npm run lint:check`, and `npm run build` all pass

## Task Commits

1. **Task 1: Create the declarative endpoint list and its typed accessor** - `274afd1` (feat, TDD)
2. **Task 2: Rewire _neon-target.ts and seed-fiche-fixtures.ts onto the shared list** - `6dee4cc` (refactor)
3. **Task 3: Rewire the pipeline and reconciliation seeders onto the shared list (D-05a)** - `fabdd6b` (refactor)

**Plan metadata:** committed alongside this SUMMARY

## Files Created/Modified

- `scripts/_neon-endpoints.list` - the 3-record data file (main/preview/development), header documents bug_011 + fail-safe policy
- `scripts/_neon-endpoints.ts` - `parseNeonEndpointList()` + `NEON_ENDPOINTS`, data-only (no require/eval/child_process)
- `tests/neon-endpoints.test.ts` - parser edge cases + data-integrity assertions
- `scripts/_neon-target.ts` - `ENDPOINTS` const deleted, now imports `NEON_ENDPOINTS`
- `scripts/seed-fiche-fixtures.ts` - `FORBIDDEN_ENDPOINTS` deleted, now derives `FORBIDDEN_TARGETS`
- `scripts/seed-pipeline-fixtures.ts` - same edit as seed-fiche-fixtures.ts
- `scripts/seed-reconciliation-fixtures.ts` - same edit, keeps its cross-reference to `scripts/backfill-partner-type.ts` in the shortened bug_011 comment

## Decisions Made

- **Explicit `node:url` `URL` class over the global `URL`.** `scripts/_neon-endpoints.ts` reads its own file location via `new URL('./_neon-endpoints.list', import.meta.url)`, per the plan's interface contract. Under Vitest's `jsdom` test environment (`vitest.config.ts` sets `environment: 'jsdom'`), the global `URL` constructor is jsdom's shim, which resolves a relative first argument against jsdom's fake `http://localhost:3000/` document location and silently ignores the `file:` base passed as the second argument — no error is thrown until `readFileSync` rejects the resulting `http:` URL with "The URL must be of scheme file". Importing `{ URL as NodeURL } from 'node:url'` and using that constructor explicitly bypasses the jsdom shim and resolves correctly under both `tsx` (production/seeder runtime) and Vitest (test runtime). Verified directly against a throwaway probe script before applying the fix.
- **`FORBIDDEN_TARGETS` naming.** Per the plan's Task 2 instruction, the derived const in every seeder is named `FORBIDDEN_TARGETS` (not `FORBIDDEN_ENDPOINTS`), so the identifier that always meant "a hardcoded table lives here" disappears from the repo entirely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom's `URL` shim silently misdirected the file read under Vitest**
- **Found during:** Task 1 (creating `scripts/_neon-endpoints.ts`)
- **Issue:** The plan's specified implementation (`readFileSync(new URL('./_neon-endpoints.list', import.meta.url), 'utf8')`) threw `TypeError: The URL must be of scheme file` whenever any test imported the module, because Vitest's `jsdom` environment replaces `globalThis.URL` with a shim that resolves the relative path against `http://localhost:3000/` instead of the `file:` base argument.
- **Fix:** Imported `URL as NodeURL` from `node:url` explicitly and used it (plus `fileURLToPath`) instead of the global `URL` / passing a `URL` object directly to `readFileSync`.
- **Files modified:** `scripts/_neon-endpoints.ts`
- **Verification:** Confirmed root cause with a throwaway probe script logging `import.meta.url` and the resolved URL's protocol under both Vitest and `npx tsx`; after the fix, `tests/neon-endpoints.test.ts` passes and `npx tsx scripts/_tsx-check.ts` (temporary, removed) printed the correct 3 records when run directly.
- **Committed in:** `274afd1` (Task 1 commit)

**2. [Rule 1 - Documentation accuracy] Reworded `_neon-endpoints.ts`'s docstring to avoid tripping its own security-invariant acceptance check**
- **Found during:** Task 1
- **Issue:** The acceptance criterion `grep -Ec 'require\(|child_process|eval\(' scripts/_neon-endpoints.ts` outputs `0` failed because the module's own docstring, explaining that it never uses those mechanisms, contained the literal substrings `require()`, `eval()`, and `child_process` in prose.
- **Fix:** Reworded the docstring to describe the guarantee without repeating the forbidden tokens verbatim.
- **Files modified:** `scripts/_neon-endpoints.ts`
- **Verification:** `grep -Ec 'require\(|child_process|eval\(' scripts/_neon-endpoints.ts` now outputs `0`.
- **Committed in:** `274afd1` (Task 1 commit)

### Discovered Plan Inconsistency (not auto-fixed — documented instead)

**3. The exhaustive survivor grep returns SIX files, not five.** Task 3's acceptance criterion states the repo-wide `grep -rl 'ep-icy-boat-alx5o1tz' scripts tests app src` must return exactly five files. Verified result:

```
scripts/_neon-endpoints.list
scripts/check-local-db-branch.sh
scripts/probe-write-isolation.ts
src/lib/db/queries/momentum.isolation.integration.test.ts
tests/neon-endpoints.test.ts   <- not in the plan's five-file list
tests/neon-target.test.ts
```

`tests/neon-endpoints.test.ts` is the sixth file, and it is unavoidable: Task 1's own `<behavior>` spec requires a test asserting "`NEON_ENDPOINTS` contains the exact production hostname `ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech` mapped to branch `main`" — a data-integrity regression check that would be worthless without an independent literal to compare against (the whole point is to catch someone accidentally corrupting the production row in the `.list` file). This is the identical justification the plan already gives for exempting `tests/neon-target.test.ts` ("needs literal inputs to assert the resolver"). The plan's Task 1 behavior spec and Task 3's five-file survivor count were written slightly out of sync with each other — Task 1 created a new test file that Task 3's criterion (written to describe the *pre-Task-1* state) didn't anticipate. No hardcoded endpoint copy or new consumer table exists anywhere; the count is six literal-containing files, not five, for a reason consistent with the plan's own stated exemption class.
- **Impact:** None on correctness or safety — no functional guard, table, or consumer is affected. This is a bookkeeping mismatch in the plan's own acceptance text, surfaced here rather than silently claimed as "exactly five."
- **Not auto-fixed** because weakening the test (e.g., obfuscating the literal via string concatenation to dodge the grep) would be dishonest engineering that defeats the test's actual purpose. Plans 39-03/39-04/39-05 and Phase 40's record work should treat the survivor list as **six** accounted-for files going forward, not five.

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 documentation accuracy) + 1 documented plan inconsistency (not auto-fixed, no safety impact)
**Impact on plan:** Both auto-fixes were necessary to make the plan's own explicit requirements (Task 1's `<behavior>` spec, the require/eval/child_process acceptance criterion) achievable at all. No scope creep — no functionality was added beyond what the plan specified.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `scripts/_neon-endpoints.ts` exports `NEON_ENDPOINTS` with the exact interface contract (`NeonEndpointRecord`, `parseNeonEndpointList`, `NEON_ENDPOINTS`) that plans 39-03, 39-04 and 39-05 depend on.
- Plan 39-04 can fold `scripts/check-local-db-branch.sh`'s bash `case` arms onto `scripts/_neon-endpoints.list` using the `while IFS='|' read -r` pattern the file format was designed for.
- Plan 39-03 owns the grep contract pinning `scripts/probe-write-isolation.ts`'s standing D-36-03 exemption — untouched by this plan.
- The survivor-count deviation (item 3 above) should be read by 39-03/39-04/39-05 and Phase 40 before writing or checking any "N files carry the literal" claim.
- Full test suite (2376 tests), typecheck, lint:check, and build all green at hand-off.

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 3 task commit hashes (`274afd1`, `6dee4cc`, `fabdd6b`) verified present in `git log`.

---
*Phase: 39-database-guard-correctness*
*Completed: 2026-09-06*
