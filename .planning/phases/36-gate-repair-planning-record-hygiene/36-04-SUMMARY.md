---
phase: 36-gate-repair-planning-record-hygiene
plan: 04
subsystem: infra
tags: [postgres, neon, isolation-probe, tsx, security]

# Dependency graph
requires:
  - phase: 29-migration-safety-net
    provides: "the branch/endpoint model (docs/operations/neon-branch-routing.md) and the blocked app-level probe (ISOLATION-PROBE-29) this plan supersedes"
  - phase: 36-02
    provides: "package.json db:seed:* script grouping convention, left undisturbed"
provides:
  - "scripts/probe-write-isolation.ts — SQL-level sentinel probe for INFRA-05 write isolation"
  - "npm run probe:write-isolation entry"
  - "three synthetic self-test transcripts proving every safety gate refuses before opening a connection"
affects: [36-05, 29-verification, close-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Comment-block-as-contract header (mirrors scripts/check-local-db-branch.sh): what/why/why-not-CI/security-note, stated in prose so a future maintainer cannot silently regress the safety posture"
    - "Contract-naming for greppable read-only-ness: a `const` identifier (mainSql) whose exact occurrence count in code lines is itself the proof of read-only behavior, verified by grep rather than asserted in prose"
    - "Fail-safe-before-connect: every refusal path (unconfigured, hostname mismatch, transposed variables) exits before any postgres client is constructed"

key-files:
  created:
    - scripts/probe-write-isolation.ts
  modified:
    - package.json

key-decisions:
  - "Hostname allow-list uses full-string equality (never startsWith/includes) against two `string`-typed module constants, ported directly from check-local-db-branch.sh's sed-based full-match discipline"
  - "DEV_HOST/MAIN_HOST declared with an explicit `: string` annotation rather than literal-typed const, to avoid a real logic bug: without widening, TypeScript narrows both to their literal types after the two independent mismatch-and-return guards, making the `devHost === mainHost` transposition check a compile error (\"no overlap\") rather than a runtime comparison"
  - "Header prose describing the _load-env divergence avoids the literal strings '.env.local' and '.env.test.local' (says 'the developer's local dotenv-style file' instead) — the plan's dotenv/file-read acceptance check greps the whole file including comments, unlike the docblock-stripped _load-env check, so naming the literal filename in the header would itself fail the gate"
  - "probe:write-isolation placed immediately after check:local-db-branch in package.json (local-only safety guard group), not in the db:* seed group — it is a safety probe, not a database maintenance command"

requirements-completed: [CLOSE-05]

# Metrics
duration: ~7min
completed: 2026-09-05
---

# Phase 36 Plan 04: SQL-Level Write-Isolation Probe Summary

**`scripts/probe-write-isolation.ts` — a hand-invoked sentinel probe that proves INFRA-05's write isolation with a raw SQL round-trip, gated by an exact-hostname allow-list checked before any connection opens, with the main-side client's read-only-ness enforced as a greppable naming contract (`mainSql` appears exactly 3 times in code).**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-05T14:36:40Z (previous plan's commit)
- **Completed:** 2026-09-05T14:43:18Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Built the SQL-level sentinel probe with all D-36-03 safety constraints enforced in code: no env-file import, exact-hostname allow-list before any connection, `mainSql` restricted to a single read-only `SELECT count(*)`, guaranteed `finally` cleanup, hostname-only output with `postgres://` stripped from any caught error message.
- Wired `npm run probe:write-isolation` alongside `check:local-db-branch` in package.json without disturbing plan 36-02's `db:seed:partner-launch` entry.
- Ran three synthetic self-tests (unconfigured, wrong dev hostname, transposed variables) — all refuse before constructing any postgres client, leak zero credential material, and emit zero connection errors. Transcripts below.
- No real database was contacted. This plan only proves the gate; plan 36-05 performs the operator-supervised real run.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/probe-write-isolation.ts with the D-36-03 constraints enforced in code** - `1a94f63` (feat)
2. **Task 2: Add the probe:write-isolation npm entry and prove every safety gate fires without touching a database** - `3daf33a` (chore)

_No plan-metadata commit separate from these two — this summary/state commit follows below._

## Files Created/Modified
- `scripts/probe-write-isolation.ts` — INFRA-05 SQL-level write-isolation sentinel probe. Reads `PROBE_DEV_URL`/`PROBE_MAIN_URL` inline, no `_load-env` import, no dotenv, no file reads. Full-hostname allow-list against the two documented Neon `-pooler` endpoints, checked before any client is constructed. Two named clients, `devSql` and `mainSql`; `mainSql` issues exactly one parameterised `SELECT count(*)::int FROM schema_meta WHERE label = $1` and is closed in a `finally`. Sentinel insert/read-back/delete all go through `devSql`. 223 lines.
- `package.json` — added `"probe:write-isolation": "tsx scripts/probe-write-isolation.ts"` immediately after `check:local-db-branch`.

## Decisions Made
- See `key-decisions` in frontmatter. The most load-bearing one at review time: the header comment had to be rewritten to avoid the literal strings `.env.local` / `.env.test.local` even in prose, because the plan's "no dotenv and no file reads" acceptance check (`grep -cE "...|\.env\.local|\.env\.test\.local"`) runs over the whole file, not just code lines — unlike the `_load-env` check, which explicitly strips comment lines first. The divergence is still stated in full (which shim, which config call, why it's forbidden); it just doesn't name the filename literally.

## Deviations from Plan

**1. [Rule 1 - Bug] Widened `DEV_HOST`/`MAIN_HOST` to `string` type to fix a TypeScript compile error**
- **Found during:** Task 1, `npm run typecheck`
- **Issue:** `tsc` reported `TS2367: This comparison appears to be unintentional because the types '"ep-polished-band-..."' and '"ep-icy-boat-..."' have no overlap` on the `devHost === mainHost` transposition-equality check. TypeScript had narrowed `devHost`/`mainHost` to their literal `DEV_HOST`/`MAIN_HOST` types after the two preceding mismatch-and-`process.exit(1)` guards, so the compiler treated the two literal types as provably disjoint and flagged the comparison as dead code — even though at runtime this is exactly the check needed to catch a transposed pair of *correct* hostnames swapped between the two vars.
- **Fix:** Annotated the two module-level consts with an explicit `: string` type (`const DEV_HOST: string = '...'`) instead of letting them infer as string-literal types. This is the standard fix for this TS narrowing pattern and does not change runtime behavior — the equality check still runs against the identical string values.
- **Files modified:** scripts/probe-write-isolation.ts
- **Verification:** `npm run typecheck` exits 0; self-test C (transposed variables) still exercises the intended refusal path.
- **Committed in:** `1a94f63` (Task 1 commit)

**2. [Rule 3 - Blocking] Rephrased header prose to avoid literal `.env.local`/`.env.test.local` strings**
- **Found during:** Task 1, running the plan's own acceptance-criteria greps before committing
- **Issue:** The plan's mandatory header content explicitly requires stating the `_load-env` divergence, which naturally involves naming `.env.local` — but the "no dotenv and no file reads" acceptance check greps the entire file (not comment-stripped) for that literal string, so the header itself was tripping the gate it was supposed to explain.
- **Fix:** Reworded the affected paragraph to describe the shim's target as "the developer's local dotenv-style file" rather than naming `.env.local`/`.env.test.local` verbatim, preserving the full explanation (which config call, why forbidden, don't re-add the import) without the literal filename.
- **Files modified:** scripts/probe-write-isolation.ts
- **Verification:** `test "$(grep -cE "from 'dotenv'|require\('dotenv'\)|readFileSync|readFile\(|\.env\.local|\.env\.test\.local" scripts/probe-write-isolation.ts)" = "0"` passes.
- **Committed in:** `1a94f63` (Task 1 commit)

**3. [Rule 3 - Blocking] Changed "SECURITY NOTE" heading casing to "Security note"**
- **Found during:** Task 1, checking the header-literal acceptance criterion
- **Issue:** The plan requires the header to literally contain the string `Security note`; the initial draft used all-caps `SECURITY NOTE`, which does not match case-sensitively.
- **Fix:** Changed the heading to `Security note (hostname-only output)`, matching `check-local-db-branch.sh`'s own `Security note:` convention.
- **Files modified:** scripts/probe-write-isolation.ts
- **Verification:** `grep -c "Security note" scripts/probe-write-isolation.ts` returns `1`.
- **Committed in:** `1a94f63` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking gate/literal-text fixes)
**Impact on plan:** All three were required to make the file typecheck and satisfy the plan's own acceptance-criteria greps as written. No scope creep — no behavior, constraint, or safety property was weakened; the type-widening fix does not change what is checked, and the two prose rewordings preserve full meaning while avoiding a literal-string self-trip.

## Self-Test Transcripts (verbatim)

### Self-test A — unconfigured
```
Usage: PROBE_DEV_URL=<dev pooled URL> PROBE_MAIN_URL=<main pooled URL> npm run probe:write-isolation
  PROBE_DEV_URL must resolve to the Neon development endpoint (ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech).
  PROBE_MAIN_URL must resolve to the Neon main (production) endpoint (ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech).
```
Exit code: `1`. Contains both `PROBE_DEV_URL` and `PROBE_MAIN_URL`. No client constructed.

### Self-test B — wrong dev hostname
Invocation: `PROBE_DEV_URL=postgres://fakeuser:fakepass123@ep-wrong-host-000000-pooler.c-3.eu-central-1.aws.neon.tech/neondb PROBE_MAIN_URL=postgres://fakeuser:fakepass123@ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech/neondb npm run probe:write-isolation`
```
ERROR: PROBE_DEV_URL resolves to an unrecognised host: ep-wrong-host-000000-pooler.c-3.eu-central-1.aws.neon.tech
  Expected exactly: ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech
```
Exit code: `1`. Occurrences of `fakeuser|fakepass123|postgres://` in output: `0`. Offending hostname named. No connection error (`ENOTFOUND|ECONNREFUSED|getaddrinfo|ETIMEDOUT`): `0` occurrences.

### Self-test C — transposed variables (the single most important self-test)
Invocation: `PROBE_DEV_URL=postgres://fakeuser:fakepass123@ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech/neondb PROBE_MAIN_URL=postgres://fakeuser:fakepass123@ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech/neondb npm run probe:write-isolation`
```
ERROR: PROBE_DEV_URL resolves to an unrecognised host: ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech
  Expected exactly: ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech
```
Exit code: `1`. Occurrences of `fakeuser|fakepass123|postgres://` in output: `0`. No connection error occurrences: `0`. The transposed production hostname is caught by the `PROBE_DEV_URL` check alone (it is not the expected dev host), refusing before either client is constructed — proving the allow-list makes it impossible to write the sentinel into production by swapping the two variables.

## Measured `mainSql` code-line count

`grep -v "^[[:space:]]*\*" scripts/probe-write-isolation.ts | grep -c 'mainSql'` → **3**, matching exactly: (1) `const mainSql = postgres(...)` declaration, (2) `const [mainResult] = await mainSql\`...\`` — the single `SELECT count(*)::int` existence check, (3) `await mainSql.end({ timeout: 5 })`. `mainSql.end(` appears exactly once. No INSERT/UPDATE/DELETE/DROP/ALTER/CREATE ever appears on a `mainSql` template (verified: 0 matches).

## Issues Encountered
None beyond the three deviations documented above, all resolved before the Task 1 commit.

## User Setup Required
None — no external service configuration required. Plan 36-05 (a separate plan) will supply real Neon connection strings under an operator checkpoint; this plan never touches a real database.

## Next Phase Readiness
- `scripts/probe-write-isolation.ts` and `npm run probe:write-isolation` are ready for plan 36-05's operator-supervised real run against the actual `development` and `main` Neon branches.
- Plan 36-05 should update `.planning/phases/29-migration-safety-net/29-VERIFICATION.md`'s "Known Weak Link — INFRA-05 Evidentiary Basis" section and revisit T-29-06 in `29-SECURITY.md` with the observed result, per D-36-03.
- No blockers. `git diff -- eslint.config.mjs` is empty; `package-lock.json` is untouched; `typecheck` and `lint:check` both exit 0.

## Self-Check: PASSED
- FOUND: scripts/probe-write-isolation.ts
- FOUND: .planning/phases/36-gate-repair-planning-record-hygiene/36-04-SUMMARY.md
- FOUND: commit 1a94f63
- FOUND: commit 3daf33a

---
*Phase: 36-gate-repair-planning-record-hygiene*
*Completed: 2026-09-05*
