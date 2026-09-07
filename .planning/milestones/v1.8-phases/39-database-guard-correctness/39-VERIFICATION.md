---
phase: 39-database-guard-correctness
verified: 2026-09-07T01:30:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
---

# Phase 39: Database Guard Correctness Verification Report

**Phase Goal:** `npm run check:local-db-branch` cannot report OK while the command it guards would
connect to the production branch, and the two divergent notions of "the effective DATABASE_URL"
are reconciled into one behaviour that a test holds in place.
**Verified:** 2026-09-07T01:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

This verification did not take SUMMARY.md, 39-REVIEW.md, or 39-REVIEW-FIX.md claims at face
value. Every fix claimed by the review-fix pass was independently reproduced against the live
code: the original CR-01 fail-open was reproduced against a fresh temp fixture built from
scratch, cross-checked against Node's own `dotenv.parse()`, and shown to now refuse; the CR-02,
CR-03, and WR-01 fixes were read in source and exercised by running their pinning test files
directly; the full phase-relevant test suite (8 files, 121 tests) and the full repo suite (191
files, 2503 tests) were executed fresh, not read from a prior report.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | With a `.env.production.local` naming `ep-icy-boat-alx5o1tz-pooler` present, the guard FAILS under `NODE_ENV=production` and passes once gone, proven by an automated fixture test using throwaway env files | VERIFIED | Built a fresh temp fixture (not reused from any prior report) with a stale-development-then-production `DATABASE_URL` duplicate in one `.env.local` — this is the exact OPS-05 incident shape. `bash scripts/check-local-db-branch.sh --root <tmp> --node-env development` now prints `ERROR: … main branch … PRODUCTION` and exits 1; `node -e "dotenv.parse(...)"` on the same file independently confirms the last line (production) is what dotenv/`@next/env`/`next start` would resolve. Also confirmed `tests/db-guard-exit-codes.test.ts` (26 tests, includes `PRODUCTION_HOST = 'ep-icy-boat-alx5o1tz-pooler...'` fixtures) and `tests/db-guard-differential.test.ts` (29 tests) both pass. |
| 2 | Guard validates the effective resolved `DATABASE_URL`, resolving env exactly as `@next/env` does (`.env.$NODE_ENV.local` > `.env.local` > `.env.$NODE_ENV` > `.env`, first-writer-wins, `.env.local` excluded when `NODE_ENV=test`) | VERIFIED | Read `scripts/check-local-db-branch.sh`'s `candidates=(...)` array and `scripts/_env-precedence.ts`'s `envFileOrder()` side by side — byte-identical ordering including the `test` special case. Confirmed the bash side now takes `tail -n 1` (last-line-wins within a file) matching `dotenv.parse()`'s last-key-wins object-build semantics; independently reproduced this divergence being closed (see Truth 1 evidence). |
| 3 | `scripts/_load-env.ts` follows the same precedence, and a differential test asserts the bash guard and the TS loader resolve the same `DATABASE_URL` for every case, including verdict-level agreement | VERIFIED | Read `_load-env.ts` — precedence loop calls `envFileOrder()`, matching `_env-precedence.ts`. Read `tests/db-guard-differential.test.ts` in full: Agreement 5/6 (added for WR-01) now compares `bashVerdictClass()` against `tsVerdictClass()` (derived from `classifyDatabaseTarget`), not just which file/hostname won — closing the exact gap the code review found ("agree on host, disagree on what it means"). Ran this suite fresh: 29/29 pass. |
| 4 | `npm run build`/`npm run start` gated via `prebuild`/`prestart`; write-capable `tsx` entry points (`db:migrate`, seeders, `purge:*`, `grant:admin`) gated too | VERIFIED | `package.json` lines 7-9 confirm `prebuild`/`prestart` both invoke `check:local-db-branch -- --node-env production`. Grepped every `tsx` script under `scripts/`: `migrate.ts`, `grant-admin.ts`, `purge-test-data.ts`, `purge-soft-deleted.ts`, all three `seed-*-fixtures.ts`, `seed-partner-launch.ts`, `seed-admins-launch.ts`, `backfill-*.ts`, `reconcile-proposals.ts`, and `drizzle.config.ts` all import `./_load-env`, which now calls `assertSafeDatabaseTarget()` with a pre-load `process.env` snapshot (WR-02 fix) at module scope. `probe-write-isolation.ts` deliberately does not import it, per its documented Phase 36 D-36-03 exemption, but carries its own stricter exact-hostname gates (confirmed by reading the file). |
| 5 | Forbidden-endpoint prefixes live in one declarative source read by guard + seeders, carrying the `bug_011` hostname-not-host note; D-05a's fold-in of all discovered copies (not just the original two) is honoured | VERIFIED | `scripts/_neon-endpoints.list` is the single data file; `scripts/_neon-endpoints.ts` (`parseNeonEndpointList`) is its typed accessor, now validating non-empty/non-overlapping fields (CR-02 closed — reproduced live: an empty-prefix record now throws `"empty field in record"` instead of being silently accepted). `scripts/_db-branch-guard.ts`, `scripts/_neon-target.ts`, and the new shared `scripts/_development-target.ts` (replacing three duplicated seeder denylists, CR-03 closed) all import `NEON_ENDPOINTS` from this one source. `probe-write-isolation.ts` keeps its documented, narrower exemption. |
| 6 | No credential ever printed, no env file ever `source`d; success/refusal messages name the resolved hostname and which file supplied it | VERIFIED | Read the bash guard and `_db-branch-guard.ts` in full: every message interpolates only `hostname` and `source` (a bare filename or `'process.env'`), never `resolution.url`. `tests/db-guard-exit-codes.test.ts`'s "no case emits any fixture credential material" and "every … case names its source file" tests pass. WR-08's fix (behavioural assertion on the actual refusal string per verdict, not just the `console.*` line) closes the specific hole the review found in the prior credential-hygiene contract. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/check-local-db-branch.sh` | Rewritten guard, effective-resolution, last-line-wins, validated `.list` reader | VERIFIED | Read in full; reproduced CR-01/WR-03 fixes live |
| `scripts/_env-precedence.ts` | Single TS notion of file order + effective resolution | VERIFIED | `envFileOrder`/`resolveDatabaseUrl` match bash exactly |
| `scripts/_load-env.ts` | Corrected precedence + write-target guard wired at module scope | VERIFIED | Pre-load snapshot fix (WR-02) present and tested |
| `scripts/_db-branch-guard.ts` | Shared TS classification + refusal | VERIFIED | `classifyDatabaseTarget`/`assertSafeDatabaseTarget`, WR-06/WR-07 documented asymmetries |
| `scripts/_neon-endpoints.list` + `.ts` | Single declarative source, validated | VERIFIED | CR-02 invariants enforced; reproduced live |
| `scripts/_development-target.ts` | Shared seeder allowlist (replaces 3 denylist copies) | VERIFIED | CR-03 fix; all three seeders import it |
| `tests/db-guard-differential.test.ts` | D-02 anti-drift proof, verdict-level | VERIFIED | 29 tests pass; Agreement 5/6 present |
| `tests/db-guard-exit-codes.test.ts` | D-06 fixture harness, real binary | VERIFIED | 26 tests pass; uses real `ep-icy-boat-alx5o1tz-pooler` host |
| `package.json` prebuild/prestart | Gate build/start | VERIFIED | Lines 7-9 confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `check-local-db-branch.sh` | `_neon-endpoints.list` | validated inline bash reader (WR-09) | WIRED | Reproduced: reader now validates field count/branch/prefix relationship, aborts with line number |
| 14 `tsx` entry points + `drizzle.config.ts` | `_db-branch-guard.ts` | `_load-env.ts` module-scope call | WIRED | `assertSafeDatabaseTarget({ processEnv: preLoadEnv })` confirmed at line 86 of `_load-env.ts` |
| 3 seeders | `_development-target.ts` | `isDevelopmentTarget`/`developmentTargetRefusalMessage` imports | WIRED | Confirmed import lines in all three seeder files |
| `package.json` `prebuild`/`prestart` | `check-local-db-branch.sh` | `npm run check:local-db-branch -- --node-env production` | WIRED | Confirmed in package.json; this is the mechanism that makes the guard's SKIP branch load-bearing rather than incidental |
| Differential test | bash guard + TS resolver | `execFileSync('bash', ...)` vs `resolveDatabaseUrl`/`classifyDatabaseTarget` | WIRED | Spawns the real binary; verdict-class comparison added (WR-01) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Guard fails on stale-then-production duplicate `DATABASE_URL` in one file (the exact OPS-05 incident shape) | `bash scripts/check-local-db-branch.sh --root <fresh-tmp> --node-env development` against a hand-built fixture (not reused from any report) | `ERROR: DATABASE_URL → Neon main branch (...) — PRODUCTION`, exit 1 | PASS |
| dotenv/`@next/env` would resolve the same fixture to the same production host | `node -e "dotenv.parse(fs.readFileSync(...))"` | Resolves to `ep-icy-boat-alx5o1tz-pooler...` | PASS |
| Empty-prefix endpoint record is now rejected (CR-02) | `npx tsx -e "parseNeonEndpointList('|ep-x-pooler...|development|DEV\n')"` | Throws `"empty field in record"` | PASS |
| Full phase-relevant test suite | `npx vitest run tests/db-guard-*.test.ts tests/load-env-*.test.ts tests/neon-endpoints.test.ts tests/development-target.test.ts` | 8 files, 121 tests, 0 failed | PASS |
| Full repo gate | `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npx vitest run` | 0 errors, 0 warnings, 2503 passed / 61 skipped / 0 failed | PASS |
| No real `.env*` file touched during this verification | `git status --short`; mtimes on `.env.local`/`.env.production.local`/`.env.test.local` | Clean tree; all mtimes predate this verification session | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OPS-05 | 39-01 through 39-05 (all 5 plans declare it) | Guard validates effective resolved `DATABASE_URL`, two resolvers reconciled | SATISFIED | All 6 roadmap success criteria independently verified above; marked `[x]` in REQUIREMENTS.md and ROADMAP.md |

No orphaned requirements — OPS-05 is the only requirement mapped to Phase 39 in REQUIREMENTS.md, and every one of the 5 plans declares it.

### Anti-Patterns Found

None blocking. `IN-01` (runbook provenance footer not bumped past Phase 29) and `IN-02` (`--root`/default node-env undocumented in the runbook) remain open from the code review — both are `info`-severity, explicitly out of scope for the review-fix pass, and do not affect the guard's behaviour. No `TBD`/`FIXME`/`XXX` markers found in the files this phase modified.

### Known, Documented Limitation (not a blocker)

**WR-07 — `NODE_ENV=test` SKIP-rule narrowness.** Verified this is real and unresolved by reading
`scripts/_db-branch-guard.ts`'s SKIP check (`if (filesFound.length === 0) return;`, computed
per-node-env via `envFileOrder('test')`, which excludes `.env.local`) and confirming the pinning
test `tests/db-branch-guard.test.ts` — `'KNOWN GAP (pinned): nodeEnv test with .env.local on disk
skips, even with a production DATABASE_URL in processEnv'` — passes today, i.e. the gap exists and
is intentionally left open pending an operator decision (filed at
`.planning/todos/pending/wr-07-db-guard-skip-rule.md`).

This does not block the phase goal: confirmed neither `package.json`'s `test` script nor any
`.github/workflows/*.yml` sets `NODE_ENV=test`, and none of the guarded npm scripts
(`build`/`start` via `prebuild`/`prestart`, or any `tsx` entry point invoked via `npm run`) pass
`--node-env test` / run under `NODE_ENV=test`. The gap requires a manual `NODE_ENV=test npx tsx
...` invocation with production credentials in the ambient environment or `.env.local` — a path no
sanctioned command in this repo takes. It is documented in three places (module docstring, pinning
test, todo file) rather than silently left as a surprise, consistent with the phase's escalation
pattern for the two decisions (WR-01, WR-06) closed by written argument rather than code change,
both of which were independently checked above and hold.

### Human Verification Required

None. Every truth above was verified by reading source, reproducing behavior against fresh
fixtures, and running the automated test suite — no visual, real-time, or subjective judgment is
required for this phase's deliverable.

### Gaps Summary

No gaps block the phase goal. All 6 roadmap success criteria are independently verified against
live code and fresh fixture reproductions, not SUMMARY.md claims. The three Critical findings from
39-REVIEW.md (CR-01, CR-02, CR-03) — each of which was a genuine fail-open to production — are
confirmed fixed by direct reproduction. Ten of eleven Warning findings are confirmed fixed; the
eleventh (WR-07) is a real, narrow, explicitly-documented and pinned limitation reachable only via
an unsanctioned manual invocation, correctly escalated as an operator decision rather than silently
shipped or silently dropped.

---

_Verified: 2026-09-07T01:30:00Z_
_Verifier: Claude (gsd-verifier)_
