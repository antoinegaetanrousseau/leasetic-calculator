---
phase: 36-gate-repair-planning-record-hygiene
reviewed: 2026-09-05T15:28:37Z
rereviewed: 2026-09-05T15:57:21Z
depth: standard
iteration: 2
files_reviewed: 5
files_reviewed_list:
  - scripts/probe-write-isolation.ts
  - package.json
  - tests/container-radius.test.ts
  - tests/server-action-error-contracts.test.ts
  - docs/design/reui-blocks-audit.md
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
findings_iteration_1:
  critical: 4
  warning: 5
  info: 5
  total: 14
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-09-05T15:28:37Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five source files changed (261 insertions, 6 deletions, plus the 152-file `src/components/blocks/`
deletion). The deletion is clean: `/usr/bin/grep -rn "components/blocks"` over the tree returns
only `eslint.config.mjs:37,139` (documented as a deliberate inert residual in the audit doc) and
the audit doc itself. No import, tsconfig path, Tailwind glob or test references the deleted tree.

Both test edits **strictly widen** what is asserted — `EXCLUDED_DIRS` goes from one entry to `[]`
(the literal sweep now covers strictly more files) and the server-action skip drops one
`full.includes(...)` disjunct (strictly fewer files skipped). Neither weakens a gate.
`package.json`'s omission of `-r ./scripts/_preload-mock-server-only.cjs` on
`probe:write-isolation` is **correct**: the probe imports only `node:crypto` and `postgres`, never
an app module, and `db:migrate` / `grant:admin` already set the precedent for the bare form. There
is no ambient dotenv loading (`.npmrc` is empty, no `NODE_OPTIONS`, tsx 4.19.2 does not auto-load
env files), so the D-36-03 "no env file" constraint genuinely holds at runtime.

`scripts/probe-write-isolation.ts` is where the defects are. Three claims in its own header
docblock do not hold as written, and all three were reproduced empirically against the installed
`postgres@3.4.5` (transcripts inline below, synthetic credentials only):

1. **"never a full connection string, username or password"** — two distinct paths print
   credential material: the hostname-mismatch error message (CR-01) and the unhandled rejection
   from client construction (CR-02).
2. **the exact-hostname allow-list** validates a string that the driver does not use — a URL can
   pass the allow-list and connect somewhere else entirely, producing a **false `PASS`** (CR-03).
3. **the `postgres://` redaction** does not cover `postgresql://`, which is the scheme Neon's own
   console emits (CR-04).

The single read-only-ness contract on `mainSql` **does hold** — verified by reading, not grepping:
`mainSql` appears at line 150 (construction), line 170 (`SELECT count(*)::int … WHERE label = $1`,
parameterised) and line 214 (`.end()`). No write, no DDL, no unfiltered read is ever issued on it.
Concurrency is also sound: the sentinel is a fresh `randomUUID()` per run and every statement is
label-filtered, so two simultaneous runs cannot interfere.

None of these findings dispute the transcript's verdict — the recorded run used a well-formed URL
and did observe isolation. They are about what happens on the *next* run, on a different machine,
with a different password.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Hostname extractor prints password material to stderr when the password contains `@`

**File:** `scripts/probe-write-isolation.ts:83-90` (extraction), `:123`, `:129`, `:136` (printing)

**Issue:** `extractHostname` splits on the **first** `@` in the raw string. A password containing
an unescaped `@` — legal in Postgres, common in hand-typed or operator-generated credentials —
makes the "hostname" a substring that begins with the tail of the password. That value is then
interpolated straight into the error message the operator pastes into a transcript.

Reproduced (synthetic credential, no network):

```
input:  postgres://fakeuser:fake@pass@ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech/neondb
guard:  "pass@ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech"   → mismatch
prints: ERROR: PROBE_DEV_URL resolves to an unrecognised host: pass@ep-polished-band-...
```

Note this fires on a URL that the driver parses **correctly** (`pg.host` was the right Neon host),
so the operator sees a confusing refusal *and* loses a credential fragment in the same line. This
directly violates D-36-03's "Never print a full connection string, username or password —
hostnames only", which the header restates as a security guarantee. `check-local-db-branch.sh:65`
carries the same `sed`-based flaw, but there the value comes from a file the operator already
controls, not from a string pasted moments earlier into a hidden prompt.

**Fix:** Parse with the platform URL parser (which cannot fold userinfo into `hostname`), validate
the scheme, and never echo an unvalidated substring:

```ts
const HOSTNAME_RE = /^[a-z0-9.-]+$/;

function extractHostname(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') return null;
  const host = parsed.hostname.toLowerCase();
  return host && HOSTNAME_RE.test(host) ? host : null;
}
```

With this, a null return takes the existing "could not parse a hostname" branch, which prints no
input-derived text at all.

### CR-02: Unhandled rejection prints the full connection string, password included

**File:** `scripts/probe-write-isolation.ts:149-150` (construction outside `try`), `:223` (`main()` un-awaited, no `.catch`)

**Issue:** `main()` is invoked bare and both `postgres(...)` calls sit **before** the `try` block.
`postgres()` parses the URL eagerly (`parseOptions` → `parseUrl` → `new URL`), so a URL that
survives the allow-list but is not a valid WHATWG URL throws synchronously inside the async
function. There is no `.catch()` on `main()`, so Node's default unhandled-rejection handler prints
the error object — and Node's `ERR_INVALID_URL` carries the offending string as an own enumerable
`input` property, which the inspector dumps verbatim.

Reproduced (synthetic credential, no network — a `#` in the password is enough; port-range and
other malformations do the same):

```
guard= true
TypeError: Invalid URL
    at parseUrl (.../node_modules/postgres/src/index.js:543:18)
    ...
  code: 'ERR_INVALID_URL',
  input: 'postgres://fakeuser:SuperSecretPw123@ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech:99999999/neondb'
}
```

The allow-list passes first, so "dev host: …" has already been printed — the operator reasonably
believes the safety gates cleared and pastes the whole block into the transcript. `safeErrorMessage`
is never reached on this path.

**Fix:** Move client construction inside the `try`, and give the entry point a redacting terminal
handler:

```ts
main().catch((err) => {
  console.error(`FATAL: ${safeErrorMessage(err)}`);
  process.exit(1);
});
```

Do both — the `.catch()` alone still relies on `safeErrorMessage` being complete (see CR-04).

### CR-03: The allow-list validates a string the driver does not use — a scheme-less URL yields a false `PASS`

**File:** `scripts/probe-write-isolation.ts:83-90`, `:122-133`, `:149-150`

**Issue:** The guard checks a hand-rolled substring; `postgres@3.4.5` derives the real target
independently (`index.js:437`: `host = o.hostname || o.host || multihost || url.hostname ||
env.PGHOST || 'localhost'`). The two parsers disagree. A URL with no `://` passes the allow-list
while the driver connects to `$PGHOST` or `localhost`:

```
input:      fakeuser:fakepass123@ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech/neondb
guard=      "ep-polished-band-alphc576-pooler...neon.tech"  guardPass= true
pg.host=    ["localhost"]  port=[5432]  db=akepass123@ep-polished-band-...neon.tech/neondb
```

The consequence is exactly the failure mode this script exists to prevent: the probe prints
`dev host: ep-polished-band-…` (a claim it has not verified), writes the sentinel to whatever
local/`PGHOST` database answers, the read-back returns 1, `main` legitimately returns 0, and the
script emits **`PASS … ISOLATED`** and exit 0. The transcript then certifies write isolation on the
basis of a write that never reached the `development` branch. A verdict artifact that can be wrong
in the safe-looking direction is worse than no artifact.

The same divergence also means the driver's env fallbacks (`PGHOST`, `PGPASSWORD`, `PGDATABASE`,
`PGPORT`) remain live influences on a run the header describes as "both connection strings arrive
inline".

**Fix:** Adopt the URL-based `extractHostname` from CR-01 (which returns `null` for a scheme-less
string, taking the refusal branch), and additionally assert against the driver's own resolved
options after construction, so the guard can never again drift from the connect path:

```ts
const devSql = postgres(devUrl, { max: 1, prepare: false, onnotice: () => {} });
if (devSql.options.host[0] !== DEV_HOST || devSql.options.host.length !== 1) {
  console.error('ERROR: driver resolved a different dev host than the allow-list accepted.');
  await devSql.end({ timeout: 5 });
  process.exit(1);
}
// …identical assertion for mainSql against MAIN_HOST
```

### CR-04: `safeErrorMessage` misses `postgresql://`, the scheme Neon's console emits

**File:** `scripts/probe-write-isolation.ts:93-96`

**Issue:** The redaction is `raw.replace(/postgres:\/\/[^\s]*/g, '[redacted]')`. Neon's connection
panel hands out `postgresql://…` URLs, and `postgres@3.4.5` accepts both. Verified:

```
in:  connection to postgresql://user:Secret123@host/db failed
out: connection to postgresql://user:Secret123@host/db failed     ← unchanged
```

It is also anchored on the scheme, so a bare `user:pass@host` fragment, or the password alone,
passes through untouched. This is the last line of defence for every `catch` in the file (lines
187, 203, 210, 216) and for the terminal handler recommended in CR-02, so its coverage should be
maximal rather than minimal.

**Fix:** Broaden the pattern and add a verbatim scrub of the two inputs, which cannot miss:

```ts
function safeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  let out = raw
    .replace(/postgres(?:ql)?:\/\/\S*/gi, '[redacted]')
    .replace(/\/\/[^\s/@]*:[^\s/@]*@/g, '//[redacted]@');
  for (const secret of [process.env.PROBE_DEV_URL, process.env.PROBE_MAIN_URL]) {
    if (secret) out = out.split(secret).join('[redacted]');
  }
  return out;
}
```

## Warnings

### WR-01: A failed cleanup still exits 0 and still prints `PASS`

**File:** `scripts/probe-write-isolation.ts:189-218`

**Issue:** The `finally` block's `DELETE` failure path (line 200) and its wrong-row-count path
(line 194) both only `console.error` a warning; neither touches `exitCode`. So a run whose sentinel
was **not** removed can still print `PASS … ISOLATED` and exit 0, contradicting D-36-03's "Nothing
is left behind on `development`". The transcript's cleanup proof is "no `WARNING:` line appeared",
which means the evidentiary chain depends on a human reading every line rather than on the exit
code the operator actually reports.

**Fix:** Make cleanup failure fail the run:

```ts
if (deleteResult.count !== 1) {
  console.error(`WARNING: cleanup deleted ${deleteResult.count} row(s) …`);
  exitCode = 1;
}
// …and in the catch:
exitCode = 1;
```

### WR-02: Spurious "verify by hand" warning on every pre-insert failure

**File:** `scripts/probe-write-isolation.ts:190-199`

**Issue:** The `finally` runs unconditionally, including when the `INSERT` at line 155 itself threw
(bad credentials, TLS failure, table missing). The `DELETE` then correctly affects 0 rows, and the
script prints `WARNING: cleanup deleted 0 row(s) for sentinel … (expected 1) — verify by hand`
even though nothing was ever written. That instructs the operator to go hand-inspect a database
over a non-event, and it dilutes the exact signal WR-01 shows the transcript relies on.

**Fix:** Track whether the insert landed and only assert the count when it did:

```ts
let inserted = false;
// …after the INSERT succeeds:
inserted = true;
// …in finally:
if (inserted && deleteResult.count !== 1) { /* warn + fail */ }
```

### WR-03: No signal handler — Ctrl-C between INSERT and DELETE leaves the sentinel behind

**File:** `scripts/probe-write-isolation.ts:154-218`

**Issue:** `finally` does not run on `SIGINT`/`SIGTERM`. A probe interrupted during the `main`-side
query (the slowest step — a cold Neon compute can take seconds) leaves the sentinel row on
`development` permanently. Recoverable only because the label was printed at line 147, which is
luck rather than design given D-36-03's "deleted in the same run".

**Fix:** Register a handler that performs the same label-filtered delete before exiting, or at
minimum print an explicit recovery instruction:

```ts
process.once('SIGINT', () => {
  console.error(`INTERRUPTED: remove the sentinel by hand — DELETE FROM schema_meta WHERE label = '${sentinel}';`);
  process.exit(130);
});
```

### WR-04: The canonical RUN block teaches putting a production password on the command line

**File:** `scripts/probe-write-isolation.ts:54-57`

**Issue:** The header's "RUN (copy-pasteable)" block shows both URLs inline on the command line.
That writes the **production** credential into shell history and into `/proc`-visible process args
for the duration of the run. The operator who actually ran it did the right thing instead — a
hidden `read -rs` prompt, per `36-PROBE-TRANSCRIPT.md:23-25` — but the file that the next operator
will read documents the unsafe form as canonical. In a comment-block-as-contract file, the header
is the contract.

**Fix:** Replace the RUN block with the form that was actually used, e.g.:

```
 *   read -rs -p 'main pooled URL: ' PROBE_MAIN_URL; echo
 *   read -rs -p 'dev  pooled URL: ' PROBE_DEV_URL;  echo
 *   PROBE_DEV_URL="$PROBE_DEV_URL" PROBE_MAIN_URL="$PROBE_MAIN_URL" npm run probe:write-isolation
 *   unset PROBE_DEV_URL PROBE_MAIN_URL
```

### WR-05: The main-side connection's read-only-ness is a naming convention, not a database constraint

**File:** `scripts/probe-write-isolation.ts:150`

**Issue:** `mainSql` is constructed from whatever role the operator supplies — in practice the
Neon owner role, which can write and can read customer data. The "exactly one read-only statement"
property is enforced only by the source reading correctly today; a later edit adding a second
statement on `mainSql` is a one-line change against production with nothing but a grep convention
(`36-04-SUMMARY.md`'s "`mainSql` appears exactly 3 times") standing in the way. D-36-03 treats
reading production from a local machine as the thing INFRA-05 forbids; the exception deserves a
mechanical floor, not a lexical one.

**Fix:** Make the session read-only at the server, so any future write on this client errors:

```ts
const mainSql = postgres(mainUrl, {
  max: 1,
  prepare: false,
  onnotice: () => {},
  connection: { options: '-c default_transaction_read_only=on' },
});
```

Ideally combine with a dedicated read-only Neon role for the `PROBE_MAIN_URL` slot and say so in
the header.

## Info

### IN-01: The transposition check is unreachable, and the type widening it forced weakens the constants

**File:** `scripts/probe-write-isolation.ts:65-66`, `:134-140`

**Issue:** By line 134, `devHost === DEV_HOST` and `mainHost === MAIN_HOST` are both established,
and `DEV_HOST !== MAIN_HOST` is fixed at authoring time — so `devHost === mainHost` can never be
true. TypeScript said exactly this (`TS2367`); the fix recorded in `36-04-SUMMARY.md` was to widen
both constants to `: string`, which silences the compiler by discarding the literal types that
would otherwise catch a typo introduced into `DEV_HOST`/`MAIN_HOST` later.

**Fix:** Keep the literal types and assert the invariant once at module scope instead — it is a
statement about the constants, not about the inputs:

```ts
const DEV_HOST = 'ep-polished-band-...';
const MAIN_HOST = 'ep-icy-boat-...';
if ((DEV_HOST as string) === (MAIN_HOST as string)) throw new Error('DEV_HOST and MAIN_HOST must differ');
```

### IN-02: Uppercase hostnames are refused

**File:** `scripts/probe-write-isolation.ts:122-133`

**Issue:** DNS is case-insensitive, and `postgres@3.4.5` passes the host through unchanged
(verified: `pg.host = ["EP-POLISHED-BAND-…"]`). A URL pasted with any uppercase in the host is
therefore refused with "unrecognised host". Fail-closed, so not a safety problem — but it costs an
operator a confusing round trip on a URL that would have worked.

**Fix:** `.toLowerCase()` the extracted host (already folded into the CR-01 fix).

### IN-03: `process.exit()` can truncate the verdict line when output is piped

**File:** `scripts/probe-write-isolation.ts:220` (and the eight earlier `process.exit` calls)

**Issue:** Node's stdout is asynchronous when it is a pipe. `process.exit()` immediately after
`console.log` can drop buffered output — which for this script is the evidence itself, e.g. if the
operator runs `npm run probe:write-isolation | tee transcript.txt`.

**Fix:** Set `process.exitCode = exitCode` and let the process end naturally; both pools are
already closed by then, so nothing keeps the loop alive.

### IN-04: Unreachable `return;` after every `process.exit(1)`

**File:** `scripts/probe-write-isolation.ts:105`, `:114`, `:119`, `:126`, `:132`, `:139`

**Issue:** `process.exit` is typed `never`, so these six `return` statements are dead. Harmless,
but they suggest the author was unsure the exit was terminal, which is the wrong impression to
leave in a file whose fail-closed behaviour is the point.

**Fix:** Drop them, or keep exactly one style and note in the header that `process.exit` is
terminal.

### IN-05: The audit doc's body still asserts the pre-deletion figures and "Nothing was deleted"

**File:** `docs/design/reui-blocks-audit.md:5-27` (new record) vs `:29-34` (body)

**Issue:** The prepended record correctly states 25 blocks / 152 files / 1.1M, but the body two
paragraphs later still reads "all 18 vendored blocks under `src/components/blocks/` are dead. 816K
across 104 files" and "Nothing was deleted. (True as of 2026-08-31; superseded by the decision
record above.)". D-36-02 explicitly sanctions keeping the historical figures, so this is not a
violation — but a reader arriving via a deep link or a grep hit on line 31 gets a stale statement
with the correction 25 lines above it.

**Fix:** Add a four-word inline marker on the two stale sentences (e.g. `— superseded, see head`),
which costs nothing and makes each line self-correcting.

---

_Reviewed: 2026-09-05T15:28:37Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

# Re-Review — 2026-09-05T15:57:21Z (iteration 2)

**Scope:** `scripts/probe-write-isolation.ts` only (223 → 425 lines). `package.json`,
`tests/container-radius.test.ts`, `tests/server-action-error-contracts.test.ts` and
`docs/design/reui-blocks-audit.md` are byte-identical to iteration 1 and are not re-reviewed.

**Verdict:** all four Criticals and all five Warnings from iteration 1 are **closed**, each
re-verified by independent reproduction rather than by reading the fix report. Three new Warnings
and two new Info items arise from the ~200 lines of new code. Nothing found is Critical, so no
production-touching defect blocks the file — but `status` stays `issues_found` because Warnings
survive.

## Method (independent, off-network)

I did not reuse the fixer's harness. I generated a variant copy of the shipped file with both
allow-listed hostnames rewritten to RFC-2606 `.invalid` names via `sed`, verified `0` occurrences
of `neon.tech` in it before running anything, and drove the **whole** script — not extracted
functions — with nine hostile inputs plus a local silent TCP listener for the signal test. All
credentials synthetic. No real endpoint was contacted at any point; the variant physically cannot
reach one. Both temp files were deleted; `git status --porcelain` is empty.

## Iteration-1 findings: verification results

| ID | Verdict | Evidence |
|---|---|---|
| CR-01 | **Closed** | `postgres://fakeuser:fake@PwSecret123@dev-probe.invalid/neondb` now yields `dev host: dev-probe.invalid` and proceeds; the old extractor returned `PwSecret123@dev-probe.invalid` and printed it. Consolidated leak scan over **8** hostile inputs: `0` occurrences of any password, username or URL substring in any output. |
| CR-02 | **Closed, both layers** | `#` in password → `ERROR: could not parse a hostname out of PROBE_DEV_URL.` (gate 2 catches it before construction). Out-of-range port → same, no `input:` dump. And the path that still reaches the eager parse — an invalid percent-escape, `pa%zzSecret`, which `new URL` accepts but `postgres.js`'s own `decodeURIComponent` rejects — is caught by `createClient` and printed as `ERROR: the postgres driver rejected PROBE_DEV_URL: URI malformed`, exit 1. That input would previously have escaped `main()` bare. |
| CR-03 | **Closed, both layers** | Layer 1: the scheme-less `fakeuser:fakepass123@dev-probe.invalid/neondb` (the exact false-PASS input) now returns `null` → refusal. Layer 2 independently verified against inputs layer 1 lets through: uppercase host is refused **by the driver-host assertion**, proving `openClient` genuinely fires (see NEW-01). Multihost `a,b` refused; `?host=` in the query string does **not** redirect the driver (run targeted the dev host, `ENOTFOUND dev-probe.invalid`) — confirmed against `parseOptions`, where query params only feed the `defaults` keys, never `host`. |
| CR-04 | **Closed** | `postgresql://…` → `[redacted]`; `POSTGRES://…` → `[redacted]` (case-insensitive); bare `//user:pass@host` → `//[redacted]@host`; full supplied URL → `[redacted]` via the verbatim scrub. The scrub reads `process.env` only as a search needle and never prints it. See NEW-05 for the one over-claim in the fix report's table. |
| WR-01 | **Closed** | Both cleanup-failure branches now set `exitCode = 1` (lines 384, 388) and the wrong-count branch prints `Marking this run FAILED: cleanup could not be confirmed.` Keeping the `WARNING: cleanup deleted N row(s)` wording verbatim was the right call — `36-PROBE-TRANSCRIPT.md` cites the absence of that exact string as its cleanup proof. |
| WR-02 | **Closed** | `inserted` flag verified end-to-end: a run whose INSERT fails now prints `NOTE: cleanup DELETE could not run (…), but no sentinel was ever written — nothing to clean up.` instead of the old false `WARNING: … verify by hand.` |
| WR-03 | **Closed** | Driven against a local accept-and-never-reply socket, then `SIGINT`: prints `INTERRUPTED (SIGINT) — the sentinel may still exist on …` plus the exact `DELETE FROM schema_meta WHERE label = '…';`, exit **130**. The coordinator's specific worry does not materialise: the handler does no async work, uses `process.once` per signal, and cannot double-execute (the first invocation calls `process.exit`). No unhandled rejection appeared. The interpolated label is a `randomUUID`, so the printed SQL carries no injection surface. |
| WR-04 | **Closed** | The RUN block is now the `read -rs` hidden-prompt form with an explicit shell-history/argv rationale; no `PROBE_*='postgres://…'` assignment shape remains anywhere in the file. |
| WR-05 | **Applied, but the control is unproven — see NEW-02.** | The startup parameter is genuinely sent on the `main` client only (`connection.js:970` merges `options.connection` into the StartupMessage). What is not established is that it takes effect. |

## D-36-03 constraint re-check (mechanical, run by me)

| Constraint | Result |
|---|---|
| No env file read | `0` matches for `dotenv` / `readFileSync` / `readFile(` / local dotenv filenames; the only two `import` statements in the file are `node:crypto` and `postgres` |
| `import './_load-env'` absent, do-not-"fix" directive intact | `0` code-level `_load-env` imports (the 2 grep hits are both docblock prose); directive present |
| Both URLs inline-only | Unchanged — `process.env.PROBE_DEV_URL` / `PROBE_MAIN_URL` and nothing else |
| `main` issues exactly one read-only `SELECT count(*)` on the sentinel | Held — `mainSql` on exactly 3 code lines (140 / 162 / 216 after comment-stripping), `mainSql.end(` once, `0` write verbs on a `mainSql` template, and the SELECT is parameterised on the sentinel and returns a count, never rows |
| Sentinel deleted in a guaranteed `finally` | Held, and now failure-signalling (WR-01) and interrupt-recoverable (WR-03) |
| Both clients closed | Held; refusal inside `openClient` also closes its own client before exiting |
| Output hostname-only | Held — `0` credential occurrences across 8 hostile inputs |

## New Warnings

### NEW-01: Uppercase hostnames now trip the driver-divergence **security alarm** — and IN-02 is not resolved

**File:** `scripts/probe-write-isolation.ts:140-145` (case-fold) vs `:243` (case-sensitive assertion)

**Issue:** `extractHostname` lowercases the host (line 143, added for IN-02), but `openClient`
compares the driver's resolved host with `!==` against the same constant. `postgres:` is not a
WHATWG "special" scheme, so the driver preserves the case it was given. A URL with any uppercase in
the host therefore passes gates 2 and 3 and is then rejected by gate 4. Reproduced:

```
PROBE_DEV_URL=postgres://fakeuser:UpperCasePw@DEV-PROBE.INVALID/neondb
dev host:  dev-probe.invalid
ERROR: the postgres driver resolved a different host for PROBE_DEV_URL than the allow-list accepted — refusing.
exit=1
```

Two consequences. First, the fix report's claim that IN-02 was "**Incidentally resolved** by CR-01"
is **not true of the shipped file** — the input is still refused, just later and after a client has
been constructed. Second, and worse: gate 4's message is the one alarm in this script that means
"the guard and the connect path disagree, something is routing you somewhere unexpected." Firing it
for a benign DNS-case difference trains the operator to dismiss precisely the signal that must
never be dismissed. Fail-closed, hence Warning and not Critical.

**Fix:** one line — compare on the same footing the guard used:

```ts
if (resolved.length !== 1 || resolved[0].toLowerCase() !== expectedHost) {
```

### NEW-02: The server-side read-only control is unverified in the direction that matters, yet the header states it as fact

**File:** `scripts/probe-write-isolation.ts:45-47` (header claim), `:182-202` (`MAIN_SESSION_READ_ONLY`), `:323`

**Issue:** I confirmed the parameter is really transmitted: `StartupMessage()` at
`node_modules/postgres/src/connection.js:970` merges `options.connection` into the startup packet,
and it is passed only on the `main` client. The header then concludes that the session is
"read-only at the SERVER … so the property is a database constraint and not merely a naming
convention" (lines 45-47).

That conclusion does not follow from what has been tested. The fixer's residual note addresses only
the branch where the pooler **refuses** the parameter — which does fail closed, since the error
surfaces on the `mainSql` SELECT and is caught into `exitCode = 1`. The untested branch is the
opposite one: a pgbouncer-family pooler with the parameter in `ignore_startup_parameters`
**silently discards** it, and one that does not carry it in `track_extra_parameters` may not apply
it to the pooled server connection at all. Both produce no error and no signal — a session that is
read-write while the contract docblock asserts a database constraint. `36-PROBE-TRANSCRIPT.md`
predates this change, so no run has ever exercised it, and the next real run will carry an
untested connection-parameter change into a production connection.

This is the same defect class as iteration-1's CR-01/02/04: a comment-block-as-contract asserting a
property the code does not establish.

**Fix (preferred — makes the control self-proving without breaking the three-code-line `mainSql`
contract):** fold the check into the single existing statement. It stays one statement, still
returns only a count and a GUC value, and still reads no customer data:

```ts
const [mainResult] = await mainSql`
  SELECT count(*)::int AS n, current_setting('transaction_read_only') AS ro
  FROM schema_meta WHERE label = ${sentinel}
`;
if (mainResult?.ro !== 'on') {
  console.error('ERROR: the main session is NOT read-only — the pooler ignored the startup parameter.');
  exitCode = 1;
}
```

**Fix (minimum):** downgrade lines 45-47 from an asserted control to a documented residual —
"requested at startup; whether the pooled endpoint honours it is unverified" — so the header stops
claiming more than the code proves.

### NEW-03: No parse-only mode — the gates cannot be exercised without connecting, and that has already caused an unintended live connection

**File:** `scripts/probe-write-isolation.ts:322-323`

**Issue:** Assessing the fixer's disclosure, which the coordinator passed on: while demonstrating
the CR-01 fix it ran the script with the real allow-listed hostnames and a synthetic username, and
because a correct fix makes that input *pass*, the script opened a socket to the Neon
**development** pooled endpoint and was rejected at auth (`password authentication failed for user
'fakeuser'`). No write, no read, `main` never contacted, nothing left behind — the harm is nil.

The ergonomics defect it reveals is real, and the fixes made it slightly sharper: gates 2-4 are now
permissive about well-formed input by design, so any credential-shaped test input that exercises
the *hostname* logic necessarily proceeds to a connection attempt. Testing the safety gates of a
production-touching script should not require either editing the two host constants or opening a
socket to a live endpoint. It is only luck that the slot involved was `development` — the identical
mistake with `PROBE_MAIN_URL` opens a socket to production.

**Fix:** add an explicit no-connect mode that exits after gate 4, which also gives the operator a
rehearsal before the real run:

```ts
if (process.env.PROBE_PARSE_ONLY) {
  console.log('PARSE-ONLY: both URLs passed every gate; no connection attempted.');
  process.exit(0);
}
```

Place it immediately after the two `openClient` calls so gate 4 is still exercised, and document it
in the RUN block alongside the `read -rs` form.

## New Info

### NEW-04: A credential-less URL is now accepted where the previous parser refused it

**File:** `scripts/probe-write-isolation.ts:132-145`

**Issue:** The old extractor required an `@` and returned `null` without one; `check-local-db-branch.sh:54-62`
refuses the same case explicitly ("no user@host segment (missing credentials)"). The URL-based
parser has no such requirement, so `postgres://dev-probe.invalid/neondb` passes every gate and
proceeds to connect — reproduced. `postgres.js` then fills the gap from `url.username ||
env.PGUSERNAME || env.PGUSER || osUsername()` and `url.password || env.PGPASSWORD` (`index.js:439,469`).
Gate 4 neutralises the `PGHOST` fallback, as the header says, but the user/password fallbacks
remain live on a run the header describes as fully inline. Impact is low — the verdict stays sound
because the host is still the allow-listed one — but it is a silent loosening relative to both the
previous behaviour and the shell analog.

**Fix:** `if (!parsed.username) return null;` inside `extractHostname`, matching the shell guard.

### NEW-05: The fix report's redaction table over-claims one row, and a scheme-less `user:pass@` fragment is still unredacted

**File:** `scripts/probe-write-isolation.ts:162-171`

**Issue:** Row 5 of the fix report's CR-04 table claims `password authentication failed
(SuperSecretPw123)` is redacted "via the env scrub". Re-run with the env vars holding realistic
values (full URLs, as the script requires), it is not: the verbatim scrub matches the whole URL,
never the password alone. Verified:

```
in:  password authentication failed for user "fakeuser" (MainSecret)
out: password authentication failed for user "fakeuser" (MainSecret)     ← unchanged
in:  bare fragment user:Secret123@main-probe.invalid without scheme
out: bare fragment user:Secret123@main-probe.invalid without scheme      ← unchanged
```

Neither is reachable from `postgres.js` today — its own error constructors embed `host:port` only
(`errors.js:16-27`) and `PostgresError` copies a server message that never contains the client
password — so this is an accuracy defect in the record, not a live leak. Worth correcting because
the record is what a future maintainer will trust instead of re-testing.

**Fix:** drop the `//` requirement from the second pattern (`/(?:\/\/)?[^\s/@]{1,64}:[^\s/@]{1,64}@/g`),
and correct the row in `36-REVIEW-FIX.md`.

## Iteration-1 Info items: current status

- **IN-01** (unreachable transposition check, `: string` widening) — survives, unchanged, still Info.
- **IN-02** (uppercase hostnames refused) — **not resolved**; superseded by NEW-01, which promotes
  it to Warning because the failure now presents as the driver-divergence alarm.
- **IN-03** (`process.exit()` can truncate piped output) — survives with a wider surface: **11**
  `process.exit` call sites now, up from 9.
- **IN-04** (unreachable `return;` after `process.exit(1)`) — survives on the six original branches;
  `createClient` / `openClient` correctly add none.
- **IN-05** (`reui-blocks-audit.md` body figures) — survives; that file was not touched.

---

_Re-reviewed: 2026-09-05T15:57:21Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard — iteration 2_
