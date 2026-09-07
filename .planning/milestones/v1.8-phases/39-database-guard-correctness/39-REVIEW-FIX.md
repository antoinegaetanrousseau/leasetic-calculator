---
phase: 39-database-guard-correctness
fixed_at: 2026-09-07T01:20:00Z
review_path: .planning/phases/39-database-guard-correctness/39-REVIEW.md
iteration: 1
findings_in_scope: 14
fixed: 14
skipped: 0
partial: 1
status: all_fixed
---

# Phase 39: Code Review Fix Report

**Fixed at:** 2026-09-07T01:20:00Z
**Source review:** `.planning/phases/39-database-guard-correctness/39-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 14
- Fixed: 14 (one of them — WR-07 — partially, see its entry)
- Skipped: 0
- Info findings (IN-01..IN-04): out of scope for this pass, not attempted

**Gates:** `tsc --noEmit` 0 errors · `eslint . --max-warnings=0` 0 warnings ·
`vitest run` **2503 passed / 61 skipped / 0 failed** across 191 files (baseline was
2455 passing; this pass added 48 tests).

**Method note.** Every Critical, and every Warning that changes behaviour, was fixed
test-first: the regression case was written and **executed against the pre-fix code to
confirm it fails** before the fix was applied. Where a finding was about a test being
unable to detect something, the proof runs the other way — a defect was temporarily
injected to confirm the new assertion catches it, then reverted. Both directions are
recorded per finding below.

## Fixed Issues

### CR-01: bash guard took the FIRST `DATABASE_URL` line; dotenv takes the LAST

**Files modified:** `scripts/check-local-db-branch.sh`, `tests/_db-guard-fixtures.ts`
**Commit:** `d50a13c`

`head -n 1` → `tail -n 1`. Within one file the last assignment wins, because
`dotenv.parse()` builds an object; across files the first file still wins (the `break`),
and the two rules are independent.

**Negative control:** the new duplicated-key CASES entry failed against the pre-fix
guard on both consumer suites — exit `0` with the stale development host, while the TS
resolver returned production. That is the OPS-05 incident inside a single file.

### CR-02: `parseNeonEndpointList` accepted an empty `prefix`, and `startsWith('')` matches every host

**Files modified:** `scripts/_neon-endpoints.ts`, `tests/neon-endpoints.test.ts`
**Commit:** `d2025de`

The parser now rejects an empty prefix/hostname/scope, a hostname that does not start
with its own prefix, and a prefix overlapping an earlier record's in either direction
(first-`find()` would shadow whichever is listed second). Enforced in the parser, which
is where it fails closed for every consumer at once. The docstring's "fails closed"
claim is now true.

**Negative control:** all five new invariant tests failed against the pre-fix parser.

### CR-03: seeders gated on a DENYLIST, so an unrecognised — or merely uppercase — production endpoint was writable

**Files modified:** `scripts/_development-target.ts` (new), `scripts/seed-fiche-fixtures.ts`,
`scripts/seed-pipeline-fixtures.ts`, `scripts/seed-reconciliation-fixtures.ts`,
`tests/development-target.test.ts` (new), `tests/load-env-contracts.test.ts`,
`docs/operations/neon-branch-routing.md`
**Commit:** `dfaf5f5`

Took the reviewer's preferred option: one shared allowlist helper replaces three
byte-for-byte copies, matching on exact **lowercased** hostname equality. An endpoint
absent from `_neon-endpoints.list` is now PRODUCTION by construction, as that file's own
header requires.

**Negative control:** the pre-fix predicate was replayed directly. It reported `WRITES`
for the uppercase production hostname, for an unrecognised endpoint id, and for a
non-Neon host — while `new URL()` was confirmed to preserve host case for the
non-special `postgres:` scheme. A grep contract now fails if any seeder reintroduces a
local `branch !== 'development'` denylist.

### WR-01: the two guards use different matching algorithms, and the differential test never compared verdicts

**Files modified:** `tests/db-guard-differential.test.ts`, `docs/operations/neon-branch-routing.md`
**Commit:** `7d09f83`

Took option (b). Added Agreement 5 (coarse verdict class) and Agreement 6 (exit status
consistent with that class). Deliberately coarse: the two halves word refusals
differently on purpose (D-07), so `refuse` covers all three refuse verdicts — one half
passing while the other refuses is drift; different wording is not. The runbook now
carries a table of which consumer uses which predicate, replacing the sentence that
described the shared table as having one prefix match.

**Positive control:** a probe case using the `c-2` pooler host the review identified as
a live divergence made Agreement 5 fail with `expected 'refuse' to be 'ok'`. Probe
reverted; option (a) was **not** taken, because prefix-matching in bash would loosen the
stricter of the two halves.

### WR-02: `_load-env.ts` mutated `process.env` before calling the guard, so every refusal was attributed to `process.env`

**Files modified:** `scripts/_load-env.ts`, `tests/load-env-attribution.test.ts` (new),
`tests/load-env-contracts.test.ts`
**Commit:** `4b3114e`

The guard is now handed a snapshot taken before any file is loaded. A genuinely ambient
`DATABASE_URL` is in that snapshot and still outranks every file, so the documented
precedence is unchanged — asserted explicitly, since inverting it would be the obvious
way to get this wrong.

Contract 1's regex was anchored to **empty** parentheses and would have failed on the
now-argumented call; it is retargeted to the call existing, not its argument list. This
is a loosening of the regex only, and the contract's actual subject (guard call present
alongside corrected precedence) is unchanged.

**Negative control:** reproduced first against the real code path —
`REFUSED: DATABASE_URL (from process.env) …` where the true source was
`.env.production.local`. The new suite spawns a child `tsx` process, because the defect
is a consequence of statement order at module scope and nothing importable can observe
it.

### WR-03: guard swallowed a read error on a higher-precedence env file and fell through, reporting OK

**Files modified:** `scripts/check-local-db-branch.sh`, `tests/db-guard-exit-codes.test.ts`
**Commit:** `5cfc866`

Branches on grep's exit status explicitly: `1` is "no match" (fall through), `>= 2` is
"could not read" (refuse, naming the file). Verified beforehand that the guard's `bash`
resolves the system BSD grep — not the ugrep wrapper on the interactive shell — and that
it returns exactly 2/1/0 for unreadable/no-match/match under `pipefail`.

The regression case sits **outside** the shared CASES matrix on purpose: the differential
suite feeds every entry to `resolveDatabaseUrl`, whose `readFileSync` would throw on a
mode-000 fixture, so this is not expressible as a two-sided agreement. It is skipped when
running as root, where the premise does not hold.

**Negative control:** failed pre-fix (exit 0, development host reported).

### WR-04: the bash text extractor and `dotenv.parse()` are two parsers with untested divergences

**Files modified:** `scripts/check-local-db-branch.sh`, `tests/_db-guard-fixtures.ts`
**Commit:** `755dccb`

Normalised the bash side toward dotenv, as the review preferred, and added a fixture case
per shape. Extraction now lives in one documented function; hostname derivation isolates
the authority (stopping at `/`, `?` **or** `#`) and then takes the **last** `@` within it.

Four divergences closed, all four confirmed failing pre-fix:

| Shape | Pre-fix behaviour |
| --- | --- |
| password containing `@` | sed took the first `@`; the halves landed on different hostnames |
| query with no path | query stayed glued to the hostname — misclassified **and printed** `secretmarker=MUSTNOTAPPEAR` |
| CRLF + inline `#` comment | both kept in the value; hostname carried a trailing `\r` |
| unmatched leading quote | quote stripped anyway, turning a broken line into a confident OK |

The second row is worth flagging: the pre-fix guard **did** emit fixture credential
material, and the existing D-08 assertion caught it as soon as the case existed. Verified
under bash 3.2 as well as 5.x, since `/bin/bash` on macOS is 3.2.

### WR-05: the differential test's agreements passed vacuously when the output regex failed to match

**Files modified:** `tests/db-guard-differential.test.ts`
**Commit:** `524e47c`

The expectation now comes from the case's own `expect`, so "the guard output no longer
parses" fails loudly instead of silently disabling the proof. Agreement 2 also compares
via `classifyDatabaseTarget` rather than a bare `new URL`, which would throw inside the
assertion on the deliberately-malformed fixture added by WR-04.

**Positive control:** breaking `parseHostAndSource`'s regex made 15 cases fail with the
explanatory message. Pre-fix, the same break left the suite green.

### WR-06: the two guards disagree when candidate files exist but none defines `DATABASE_URL`

**Files modified:** `scripts/_db-branch-guard.ts`, `tests/db-guard-differential.test.ts`
**Commit:** `dbe163e`

Chose to **keep** the TS half permissive and document why, rather than adopt bash's hard
failure. Rationale recorded in the code: the guard runs at import time for 14 consumers
whose own startup checks already report a missing variable with script-specific context,
and there is no target for a database-safety guard to have an opinion about. Aligning
them would replace specific messages with a generic one.

The asymmetry is now asserted in both directions, so aligning them later is a deliberate
decision rather than a discovery in a build. This is the review's explicit alternative
("if the TS half must stay permissive, document why … and assert the asymmetry
explicitly"), not a silent decline.

### WR-07: the SKIP rule is per-node-env, so `NODE_ENV=test` can disable the guard — **PARTIAL**

**Files modified:** `scripts/_db-branch-guard.ts`, `tests/db-branch-guard.test.ts`
**Commit:** `3686e88`

Implemented the review's stated minimum — the pinning test case — plus a full written
analysis in the guard. The behavioural hardening is **deliberately not applied**, and
this is the one finding where the code still does what the review objected to.

Why, concretely:

- The obvious broadening ("skip only when no `.env*` file exists in `cwd`") is not merely
  imperfect, it is **dangerous here**: `.env.example` is committed to this repository, so
  every checkout matches it. The guard would stop skipping inside the `MIGRATE PROD`
  workflow and CI's ephemeral-branch migration step, where `DATABASE_URL` is a
  production-scoped secret — it would refuse the migration paths outright.
- The safe narrow version does exist and is written down in the guard: decide **only the
  SKIP** on the union order (node-env order plus `.env.local`) while resolution keeps
  `envFileOrder(nodeEnv)`. It is inert for every node-env except `test`. But it requires a
  matching two-array change in `check-local-db-branch.sh` or Agreement 1 breaks, and it
  flips the pinned "NODE_ENV=test with only .env.local present" case from SKIP to ERROR.
- Reaching the gap requires a manual `NODE_ENV=test npx tsx scripts/<x>.ts` with
  production credentials exported. No npm script in the repo does it.

Changing a load-bearing rule that three sanctioned production paths depend on is an
operator decision, not a review-fix decision. **Recommend scheduling the narrow version
as its own change** with the bash half in the same edit.

### WR-08: Contract 5 only inspects the line containing `console.*`, so a credential built in a helper passes

**Files modified:** `tests/db-branch-guard.test.ts`, `tests/load-env-contracts.test.ts`
**Commit:** `af363ff`

Replaced the false assurance with behavioural assertions on the emitted string for every
refuse verdict reached through a file (`refuse-production`, `refuse-unrecognised`,
`refuse-malformed`) plus the `warn-preview` path, which no test previously exercised at
all. Contract 5 is kept and relabelled as the coarse backstop it is.

**Positive control, and it confirms the review's claim exactly:** injecting
`resolution.url` into `buildRefusalMessage` (the helper, not a `console.*` line) left
Contract 5 **green at 6/6** while the three new behavioural cases failed. Injection
reverted; the guard is byte-identical to before the probe.

### WR-09: the bash reader of `_neon-endpoints.list` performed no validation

**Files modified:** `scripts/check-local-db-branch.sh`, `tests/db-guard-endpoint-list.test.ts` (new)
**Commit:** `a027ad9`

Validates field count, non-empty fields, the branch enum and the hostname/prefix
relationship, aborting with the line number in the TS parser's wording. Guards the
trailing-newline case with `|| [ -n "$field_1" ]`. Validates the **whole file** rather
than stopping at the first hostname match, so both halves fail on the same input
regardless of which record matched.

The new suite copies the guard beside a synthetic `.list` in a temp dir, because the
guard reads its table from beside itself and `--root` deliberately does not redirect
that. The repository's own `.list` is never read, written or moved.

**Negative control:** 7 of the 9 cases failed against the pre-fix reader.

### WR-10: parser decided comment/blank on the trimmed line but split the untrimmed line

**Files modified:** `scripts/_neon-endpoints.ts`, `tests/neon-endpoints.test.ts`
**Commit:** `c186bd2`

Splits `trimmed` and trims every field, matching the bash reader from WR-09 so a padded
record now behaves identically on both sides instead of on only one.

**Negative control:** both new cases failed pre-fix.

### WR-11: dead ternary — both branches identical

**Files modified:** `tests/db-guard-exit-codes.test.ts`
**Commit:** `fcafb45`

Reduced to `testCase.expect.source`. The discriminated union already narrows the access;
the load-bearing branch is the `continue` that skips error cases declaring no source.

### Follow-up commit

`ec0a8ca` — comment-only move: `trim_field` (added by WR-09) had been inserted between
`extract_env_value`'s documentation and the function itself. No behaviour change.

## Skipped Issues

None. WR-07 is recorded above as **partial** rather than skipped: its pinning test and
analysis landed, its behavioural hardening did not.

## Out of scope

`IN-01` (runbook footer), `IN-02` (`--root` / node-env default undocumented), `IN-03`
(`source` shadows a builtin), `IN-04` (uncovered branches) were not attempted — the pass
was scoped to Critical + Warning. Two are now partly overtaken: **IN-04** is largely
closed by WR-08, which added the `warn-preview`, `refuse-malformed`-via-file and
`defaultOnRefuse`-message coverage it asked for; **IN-01/IN-02** remain open, and the
runbook was edited by CR-03 and WR-01 without its provenance footer being bumped.

## Verification performed

- `npx tsc --noEmit` — 0 errors
- `npx eslint . --max-warnings=0` — 0 warnings
- `npx vitest run` — 2503 passed, 61 skipped, 0 failed (191 files)
- `bash -n scripts/check-local-db-branch.sh` after every edit to it
- Guard exercised under **bash 3.2** (`/bin/bash`) as well as 5.x, since the shebang
  resolves via PATH and macOS ships 3.2 at `/bin/bash`
- No production-env command was run. `npm run build`, `npm start`, `db:migrate` and
  `db:push` were never invoked; no real `.env*` file was read, modified, moved or
  removed. Every guard invocation used `--root` against a throwaway temp directory with
  fixture-only credentials.

_Fixed: 2026-09-07_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
