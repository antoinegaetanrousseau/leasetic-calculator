---
phase: 39-database-guard-correctness
reviewed: 2026-09-06T18:37:23Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - scripts/_neon-endpoints.list
  - scripts/_neon-endpoints.ts
  - scripts/_env-precedence.ts
  - scripts/_db-branch-guard.ts
  - scripts/_load-env.ts
  - scripts/check-local-db-branch.sh
  - scripts/_neon-target.ts
  - scripts/probe-write-isolation.ts
  - scripts/seed-fiche-fixtures.ts
  - scripts/seed-pipeline-fixtures.ts
  - scripts/seed-reconciliation-fixtures.ts
  - package.json
  - tests/_db-guard-fixtures.ts
  - tests/neon-endpoints.test.ts
  - tests/env-precedence.test.ts
  - tests/db-branch-guard.test.ts
  - tests/load-env-contracts.test.ts
  - tests/db-guard-exit-codes.test.ts
  - tests/db-guard-differential.test.ts
  - docs/operations/neon-branch-routing.md
findings:
  critical: 3
  warning: 11
  info: 4
  total: 18
status: issues_found
---

# Phase 39: Code Review Report

**Reviewed:** 2026-09-06T18:37:23Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The headline claim of the phase holds: `npm run check:local-db-branch -- --node-env production`
now correctly refuses on this machine (verified live — it names `.env.production.local` and the
`main` endpoint and exits 1), the `prebuild`/`prestart` wiring is present in `package.json`, all
89 tests across the six suites pass, and the fixture harness genuinely spawns the real bash binary
via `execFileSync('bash', [GUARD_PATH, ...])` with an argv array and an explicitly-constructed
child environment. The credential-hygiene discipline is real: no fixture carries a live secret,
and the `MUSTNOTAPPEAR` marker makes "nothing leaked" provable rather than asserted.

That said, the phase's central safety claim — "the two resolvers cannot drift" — is **not** true
as shipped, and I reproduced a fail-open in the bash guard that is the *same shape as the incident
OPS-05 was opened to close*.

Three findings are blockers:

1. **CR-01 (reproduced):** the bash guard reads the **first** `DATABASE_URL=` line in a file;
   dotenv/`@next/env` take the **last**. A `.env.local` with a stale line above a newer one makes
   the guard print `OK: … development branch … exit 0` while `next build`/`next start` and all 14
   `tsx` consumers open **production**. Verified by execution, not inference.
2. **CR-02 (reproduced):** `parseNeonEndpointList` accepts a record with an empty `prefix` field
   despite its docstring's "fails closed" claim. `hostname.startsWith('')` is true for every host,
   so one mis-typed line in the hand-edited `.list` file silently reclassifies **production** as
   whatever branch that record names, across `_db-branch-guard.ts` and `_neon-target.ts`.
3. **CR-03 (reproduced):** the three seeders gate on a *denylist*, directly contradicting the
   `.list` header's own "an endpoint id that does NOT appear in this file must be treated as
   PRODUCTION by every consumer". An uppercase spelling of the production hostname — which DNS
   resolves identically — passes their gate.

Beyond those, the differential test proves less than its docstring says: it compares only
`resolveDatabaseUrl` (file precedence), never `classifyDatabaseTarget` (the verdict), even though
the two halves use **two different matching algorithms** over the same table (bash: exact hostname
equality; TS: `startsWith` prefix). And its per-case agreements are wrapped in `if (parsed.host)`
guards that make a case pass vacuously if the output wording ever changes.

## Critical Issues

### CR-01: bash guard takes the FIRST `DATABASE_URL` line in a file; dotenv takes the LAST — reproducible fail-open to PRODUCTION

**File:** `scripts/check-local-db-branch.sh:121`
**Issue:** `grep -E '…DATABASE_URL=' "$f" | head -n 1` selects the **first** matching line.
`dotenv.parse()` (and therefore `scripts/_env-precedence.ts`, `scripts/_load-env.ts`, `@next/env`,
and `next build`/`next start`) builds an object, so within a single file the **last** assignment
wins. Appending a new `DATABASE_URL` to the bottom of `.env.local` without deleting the old one —
a completely ordinary operator action when rotating a connection string — puts the two halves on
different databases, with the bash half reporting success.

Reproduced against the real binary (fixture temp dir, fake credentials):

```
$ printf 'DATABASE_URL=…ep-polished-band-alphc576-pooler…\nOTHER=1\nDATABASE_URL=…ep-icy-boat-alx5o1tz-pooler…\n' > dup/.env.local
$ bash scripts/check-local-db-branch.sh --root "$PWD/dup" --node-env development
OK: DATABASE_URL → Neon development branch (ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech) from .env.local
bash exit=0
$ node -e "…dotenv.parse(…).DATABASE_URL…"
dotenv/TS resolves -> ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech
```

This is the OPS-05 incident verbatim: guard says development, the command about to run gets
production. Neither `tests/db-guard-exit-codes.test.ts` nor `tests/db-guard-differential.test.ts`
has a fixture with a duplicated key, so the whole suite passes with this hole open.

**Fix:** last-assignment-wins *within* a file (first-file-wins *across* files stays correct):

```bash
raw_line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$f" | tail -n 1 || true)
```

Add a `CASES` entry to `tests/_db-guard-fixtures.ts` with two `DATABASE_URL` lines in one file
(development first, production second, `nodeEnv: 'development'`, `expect: { kind: 'error',
host: PRODUCTION_HOST }`) so the differential suite pins it.

---

### CR-02: `parseNeonEndpointList` accepts an empty `prefix`, and `startsWith('')` matches every host — total classification fail-open

**File:** `scripts/_neon-endpoints.ts:37-73` (validation), consumed at `scripts/_db-branch-guard.ts:105` and `scripts/_neon-target.ts:60`
**Issue:** The parser validates only field *count* and the `branch` enum. It does not validate that
`prefix` or `hostname` is non-empty, that `hostname` starts with `prefix`, or that prefixes are
unique. A record with an empty first field parses cleanly:

```
$ npx tsx -e "…parseNeonEndpointList('|ep-x-pooler.neon.tech|development|DEV\n')…"
empty-prefix record ACCEPTED -> [{"prefix":"","hostname":"ep-x-pooler.neon.tech","branch":"development","scope":"DEV"}]
```

Because both TS consumers match with `hostname.startsWith(endpoint.prefix)` and take the **first**
`find()` hit, a single empty-prefix record classifies *every* Neon host — including
`ep-icy-boat-alx5o1tz-pooler…` — as that record's branch. If the record says `development`,
`assertSafeDatabaseTarget` returns silently on production and `resolveNeonTarget` reports
`isProductionSeverity: false`. The `.list` file is explicitly designed to be hand-edited by an
operator ("Change both together whenever a branch is recreated"), and the module docstring claims
"a malformed record … throws rather than being silently dropped" — it does not.

The `tests/neon-endpoints.test.ts` "every record hostname starts with its own prefix" case asserts
this only for the *current committed file*, not as a parser invariant, so it would not catch the
edit that introduces the bad record.

**Fix:** enforce the invariants in the parser, where they fail closed for every consumer:

```ts
const [prefix, hostname, branch, scope] = fields;
if (prefix === '' || hostname === '' || scope === '') {
  throw new Error(`scripts/_neon-endpoints.list:${String(lineNumber)}: empty field in record`);
}
if (!hostname.startsWith(prefix)) {
  throw new Error(`scripts/_neon-endpoints.list:${String(lineNumber)}: hostname "${hostname}" does not start with prefix "${prefix}"`);
}
if (records.some((r) => r.prefix.startsWith(prefix) || prefix.startsWith(r.prefix))) {
  throw new Error(`scripts/_neon-endpoints.list:${String(lineNumber)}: prefix "${prefix}" overlaps an earlier record`);
}
```

Add parser tests for each throw (empty prefix, empty hostname, prefix/hostname mismatch, overlapping
prefixes) rather than only for the real file.

---

### CR-03: the three seeders gate on a DENYLIST, so an unrecognised — or merely uppercase — production endpoint is permitted to be written

**File:** `scripts/seed-fiche-fixtures.ts:98,540`; `scripts/seed-pipeline-fixtures.ts:68,271`; `scripts/seed-reconciliation-fixtures.ts:73,242`
**Issue:** All three build `FORBIDDEN_TARGETS = NEON_ENDPOINTS.filter((e) => e.branch !== 'development')`
and refuse only if `FORBIDDEN_TARGETS.find((e) => hostname.startsWith(e.prefix))` hits. Anything
*not* in that two-element denylist proceeds to `neon(databaseUrl)` and writes. This is the exact
inversion of the rule stated in `scripts/_neon-endpoints.list:27-29`:

> FAIL-SAFE: an endpoint id that does NOT appear in this file must be treated as PRODUCTION by
> every consumer

Two concrete bypasses:

1. **Recreated / new production endpoint.** Neon issues a new endpoint id whenever `main` is
   recreated. Until someone edits the `.list`, that host is unrecognised → not forbidden → the
   seeders write fixture rows into production.
2. **Case.** `postgres:` is a non-special URL scheme, so Node's `new URL()` does **not** lowercase
   the host. Verified: `classifyDatabaseTarget('postgres://f:f@EP-ICY-BOAT-ALX5O1TZ-POOLER.…')`
   returns `refuse-unrecognised` (safe), but the seeders' `startsWith('ep-icy-boat-alx5o1tz')`
   returns `undefined` → **not forbidden**. DNS is case-insensitive, so that connection string
   reaches production.

The `_load-env` guard covers most of this in practice, but not all of it: `assertSafeDatabaseTarget`
returns immediately when `filesFound` is empty, so `DATABASE_URL=<unrecognised-prod> npm run
db:seed:fiche-fixtures` in any directory/container with no `.env*` on disk leaves the seeder's own
(broken) denylist as the only gate. These scripts advertise "This script is development-only and
has no override flag" — that promise is not kept.

**Fix:** make it an allowlist keyed on the `development` record, and normalise case:

```ts
const ALLOWED = NEON_ENDPOINTS.filter((e) => e.branch === 'development');
// …
const host = hostname.toLowerCase();
const allowed =
  host === 'localhost' ||
  host === '127.0.0.1' ||
  ALLOWED.some((e) => host === e.hostname.toLowerCase());
if (!allowed) {
  fail(
    'refusing to seed fixtures into an endpoint that is not the Neon development branch (' +
      hostname +
      '). Unrecognised endpoints are treated as PRODUCTION — see scripts/_neon-endpoints.list.',
  );
}
```

Better still: replace all three copies with a single shared helper (they are byte-for-byte
duplicates apart from the log prefix) so a future fix lands once.

## Warnings

### WR-01: the two guards use different matching algorithms, and the differential test never compares verdicts

**File:** `scripts/check-local-db-branch.sh:179-194` vs `scripts/_db-branch-guard.ts:104-121`; `tests/db-guard-differential.test.ts:66-107`
**Issue:** Bash classifies with **exact equality** against the record's `hostname` field; every TS
consumer classifies with `startsWith(prefix)`. Those are genuinely different predicates over the
same table, and the differential suite compares only `resolveDatabaseUrl` (which file won, which
hostname) — never `classifyDatabaseTarget`'s verdict. Divergences exist today and are untested,
e.g. `ep-polished-band-alphc576-pooler.c-2.eu-central-1.aws.neon.tech` (a pooler-host change Neon
can make unilaterally): TS → `ok-development` (silently proceeds), bash → `ERROR … unrecognised`
(exit 1). The current drift happens to be in the safe direction, but nothing in the suite holds it
there. `docs/operations/neon-branch-routing.md:51` compounds this by describing the shared table as
"this file's prefix match", which is only true of the TS half.
**Fix:** either (a) make the bash side prefix-match too (with the `.neon.tech` suffix pre-gate the
TS side applies), or (b) extend `tests/db-guard-differential.test.ts` with a verdict-level
agreement: map the bash exit status + leading `OK:`/`WARN:`/`ERROR:` token to a `TargetVerdict`
class and assert it equals `classifyDatabaseTarget(tsResult.resolution.url).verdict` for every
`CASES` entry. Then correct the doc sentence to state that the two halves match differently and why.

### WR-02: `_load-env.ts` mutates `process.env` before calling the guard, so every refusal is attributed to `process.env` instead of the winning file

**File:** `scripts/_load-env.ts:69-73`
**Issue:** The loop calls `config({ path })`, which writes `process.env.DATABASE_URL`. The very next
line calls `assertSafeDatabaseTarget()` with no arguments, so `resolveDatabaseUrl` takes its
`processEnv.DATABASE_URL` branch (`scripts/_env-precedence.ts:90-95`) and reports
`source: 'process.env'` — always. The refusal message therefore can never name the file that caused
the problem, which is precisely what D-07 exists to provide. Verified against the real code path:

```
REFUSED: DATABASE_URL (from process.env) resolves to PRODUCTION (Neon branch `main`) (ep-icy-boat-alx5o1tz-pooler…).
```

…where the actual source was `.env.production.local`. `tests/db-branch-guard.test.ts` never
exercises this because it always passes an explicit `processEnv` with no `DATABASE_URL`, so the
only path that runs in production is the only path with no coverage.
**Fix:** capture the pre-load environment and hand it to the guard:

```ts
const preLoadEnv = { ...process.env };
for (const path of envFileOrder(process.env.NODE_ENV ?? 'development')) {
  config({ path });
}
assertSafeDatabaseTarget({ processEnv: preLoadEnv });
```

Add a test that writes a temp `.env.production.local`, runs a child `tsx` process importing the
loader, and asserts the stderr message contains `.env.production.local`.

### WR-03: bash guard swallows a read error on a higher-precedence env file and falls through to a lower one, reporting OK

**File:** `scripts/check-local-db-branch.sh:121-124`
**Issue:** `|| true` cannot distinguish grep's exit 1 ("no match", benign) from exit ≥2 ("could not
read the file", not benign). When the higher-precedence file is unreadable, `raw_line` is empty, the
loop `continue`s, and the guard reports the *lower*-precedence file's value as the verdict.
Reproduced:

```
$ chmod 000 unread/.env.production.local
$ bash scripts/check-local-db-branch.sh --root "$PWD/unread" --node-env production
grep: .env.production.local: Permission denied
OK: DATABASE_URL → Neon development branch (…ep-polished-band-alphc576…) from .env.local
exit=0
```

A root-owned or restrictive-mode `.env.production.local` (e.g. dropped in by a container or a `sudo`
`vercel env pull`) turns the guard into a green light.
**Fix:** branch on the exit status explicitly:

```bash
set +e
raw_line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$f" | tail -n 1)
grep_status=${PIPESTATUS[0]}
set -e
if [ "$grep_status" -gt 1 ]; then
  echo "ERROR: candidate env file '$f' exists but could not be read — refusing to fall through."
  exit 1
fi
```

### WR-04: the bash text extractor and `dotenv.parse()` are two different parsers with untested divergences

**File:** `scripts/check-local-db-branch.sh:121-134` vs `scripts/_env-precedence.ts:97-106`
**Issue:** Beyond CR-01, the two value extractors disagree on several real inputs. dotenv stops an
unquoted value at `#` (its LINE regex uses `[^#\r\n]+`); the sed pipeline does not. dotenv `.trim()`s
away a trailing `\r`; the sed strips a trailing quote only when it is followed by whitespace, so a
CRLF file without quotes leaves `\r` on the value. dotenv supports multi-line quoted values; the
grep sees only the first line. dotenv requires matched quotes; the two independent sed substitutions
happily strip a leading `'` and a trailing `"`. Node's `URL` takes the **last** `@` as the userinfo
delimiter while `s#^[^@]*@##` takes the **first**, so a password containing `@` puts the two halves
on different hostnames (verified: TS → `ok-development`, bash → `main`/ERROR on the same string).
Only four quoting shapes appear in `CASES`.
**Fix:** add fixture cases for each shape above so the differential suite (which spawns the real
binary against the real resolver) is the thing that decides whether a divergence is acceptable,
rather than nobody. Prefer normalising the bash side toward dotenv's semantics where they differ.

### WR-05: the differential test's agreements pass vacuously when the output regex fails to match

**File:** `tests/db-guard-differential.test.ts:77-102`
**Issue:** Agreements 2 and 3 are wrapped in `if (parsed.host)` / `if (parsed.source)`. If a future
wording change breaks `parseHostAndSource`'s regex, both regexes return `{}` and every case silently
degrades to asserting only Agreement 1 (SKIP ⇔ empty `filesFound`) — the suite stays green while the
anti-drift proof is gone. The docstring correctly warns against coupling to whole log lines, but the
answer is a positive assertion that parsing succeeded, not an unchecked `if`.
**Fix:** carry the expectation from the case, e.g.

```ts
const expectsHost = testCase.expect.kind !== 'skip' && 'host' in testCase.expect && Boolean(testCase.expect.host);
if (expectsHost) {
  expect(parsed.host, 'bash guard stdout no longer parses — the drift proof is disabled').toBeDefined();
}
```

### WR-06: the two guards disagree when candidate files exist but none defines `DATABASE_URL`

**File:** `scripts/_db-branch-guard.ts:191-193` vs `scripts/check-local-db-branch.sh:137-140`
**Issue:** Bash prints `ERROR: no DATABASE_URL found in any candidate file` and exits 1; TS returns
silently and lets the process continue. Agreement 4 in the differential test only asserts that the
TS *resolution* is null on that input — it never asserts the two guards reach the same verdict, so
this divergence is encoded as "expected" rather than surfaced. Whichever behaviour is intended, they
should not differ silently: a build blocked by the bash half and a `tsx` script waved through by the
TS half is exactly the two-resolvers-that-drift situation OPS-05 set out to end.
**Fix:** pick one policy (bash's hard failure is the more defensible) and align. If the TS half must
stay permissive, document *why* in `_db-branch-guard.ts` and assert the asymmetry explicitly in the
differential test rather than leaving it implicit.

### WR-07: the SKIP rule is computed per-node-env, so `NODE_ENV=test` can disable the guard entirely on a machine that has production credentials on disk

**File:** `scripts/_db-branch-guard.ts:184-186`; `scripts/_env-precedence.ts:61-66`
**Issue:** `envFileOrder('test')` deliberately excludes `.env.local`. On a machine with only
`.env.local` and `.env.production.local` (no `.env.test*`, no `.env`), `filesFound` is empty under
`NODE_ENV=test`, so `assertSafeDatabaseTarget` returns silently — including when a production
`DATABASE_URL` is sitting in the ambient environment. All 14 write-capable `tsx` consumers are then
unguarded for that invocation. The docstring justifies the SKIP rule with three CI/Vercel paths, but
the rule as written is broader than those three.
**Fix:** make the skip condition about *the machine*, not about the candidate set for one node-env —
e.g. skip only when no `.env*` file matching any node-env exists in `cwd`, or add an explicit
`CI`/`VERCEL` environment check alongside it. At minimum add a `tests/db-branch-guard.test.ts` case
covering "`.env.local` on disk, `nodeEnv: 'test'`, production `DATABASE_URL` in `processEnv`" so the
behaviour is a deliberate, pinned decision.

### WR-08: Contract 5 only inspects the single line containing `console.*`, so a credential built in a helper passes the gate

**File:** `tests/load-env-contracts.test.ts:166-183`
**Issue:** The gate filters to lines matching `/console\.(log|warn|error|info)\(/` and then tests
*that same line* for an interpolated credential. `defaultOnRefuse` (`scripts/_db-branch-guard.ts:148-151`)
is `console.error(message)` — the message is assembled in `buildRefusalMessage` several lines away.
Any future edit that folds `resolution.url` into that helper is invisible to this contract, which
would nonetheless keep reporting D-07/D-08 as enforced. The comment "the guard's output is expected
to be pasted into a transcript" makes the false assurance load-bearing.
**Fix:** replace the line-local grep with a behavioural assertion — `tests/db-branch-guard.test.ts`
already captures the refusal message; assert there that it does not contain the fixture credential
for *every* refuse verdict (`refuse-production`, `refuse-unrecognised`, `refuse-malformed`), and
keep the grep only as a coarse backstop.

### WR-09: the bash reader of `_neon-endpoints.list` performs no validation, so a malformed record fails differently on each side

**File:** `scripts/check-local-db-branch.sh:179-187`
**Issue:** `while IFS='|' read -r prefix hostname record_branch scope` silently tolerates records the
TS parser rejects: three fields (`record_branch` set, `scope` empty), five fields (extra folded into
`scope`), an invalid branch name (falls to the `*)` arm → `unrecognised`). It also drops the final
record entirely if the file ever loses its trailing newline, because `read` returns non-zero on the
last partial line. The TS side throws at module load for the same file. A single mis-edit therefore
produces "TS crashes / bash quietly runs with a different table" — the divergence class this phase
exists to eliminate.
**Fix:** validate in bash too — count fields (`case "$scope" in *'|'*) …`), reject a `record_branch`
outside `main|preview|development`, and abort with a non-zero exit naming the line number, mirroring
`parseNeonEndpointList`'s messages. Guard the trailing-newline case with
`while … read -r … || [ -n "$prefix" ]`.

### WR-10: `parseNeonEndpointList` decides comment/blank on the trimmed line but splits the untrimmed line

**File:** `scripts/_neon-endpoints.ts:45-57`
**Issue:** `trimmed` gates the `''` and `#` skips, but `rawLine.split('|')` produces the fields. A
data line with a leading space yields `prefix: ' ep-icy-boat-…'`, which then matches nothing —
`startsWith` fails, the record is effectively invisible, and the endpoint silently degrades to
`refuse-unrecognised` (safe here, but by accident). A trailing space yields a padded `scope` that
ends up in operator-facing messages.
**Fix:** split `trimmed`, and/or `.trim()` each field before validation (folds naturally into CR-02's
validation block).

### WR-11: dead ternary — both branches are identical

**File:** `tests/db-guard-exit-codes.test.ts:106`
**Issue:**

```ts
const source = testCase.expect.kind === 'error' ? testCase.expect.source : testCase.expect.source;
```

Both arms evaluate the same expression. It reads as though the two branches were meant to differ
(the `error` variant's `source` is optional, the others' is required), which is a plausible sign a
narrowing was intended and lost.
**Fix:** `const source = testCase.expect.source;` — or, if the `error` case genuinely needs different
handling, restore it and add the case that proves it.

## Info

### IN-01: runbook footer not updated for Phase 39

**File:** `docs/operations/neon-branch-routing.md:235-236`
**Issue:** "Runbook last updated: 2026-08-31. Phase 20 … Phase 29 …" — the doc gained two new
sections in this phase (Machine-readable counterpart, The local DATABASE_URL guard) but the
provenance footer still stops at Phase 29.
**Fix:** append "Phase 39 / OPS-05 added the machine-readable endpoint list and the effective-URL
guard" and bump the date.

### IN-02: the runbook documents neither `--root` nor the bare-invocation node-env default

**File:** `docs/operations/neon-branch-routing.md:54-66`
**Issue:** `scripts/check-local-db-branch.sh` exposes a `--root` flag that redirects env-file
resolution (a hand-run `--root /tmp` returns `SKIP` + exit 0), and a bare
`npm run check:local-db-branch` resolves the **development** order — on this machine it prints
`OK: … development branch … from .env.local` while `.env.production.local` holds the `main`
endpoint. `prestart`/`prebuild` cover the dangerous commands, but an operator running the check by
hand still gets a reassuring answer to a different question.
**Fix:** document both in the OPS-05 section, and state that the manual invocation must be given
`--node-env production` to answer "what would `npm run start` connect to?".

### IN-03: `source` shadows a bash builtin name

**File:** `scripts/check-local-db-branch.sh:106,112,132`
**Issue:** `source=` is a variable named after the `source` builtin. Bash keeps the namespaces
separate so this is not a bug, but it is a readability trap in a file whose whole point is that a
reader can audit it quickly.
**Fix:** rename to `src_file` or `resolved_from`.

### IN-04: uncovered branches in `_db-branch-guard.ts`

**File:** `scripts/_db-branch-guard.ts:147-151,197-203`
**Issue:** No test exercises `defaultOnRefuse`, the `warn-preview` `console.warn` branch of
`assertSafeDatabaseTarget` (only `classifyDatabaseTarget`'s verdict is tested), the `refuse-malformed`
path reached through a file, or the `!resolution` early return. These are small branches, but the
warn path is the one an operator is most likely to see and least likely to have verified.
**Fix:** add three `assertSafeDatabaseTarget` cases (preview host → no refusal + a warn containing
the hostname and source; `.env.local` containing `DATABASE_URL=not-a-url` → refusal with
`refuse-malformed` wording; `.env.local` with no `DATABASE_URL` key → no refusal, pinning WR-06's
decision).

---

_Reviewed: 2026-09-06T18:37:23Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
