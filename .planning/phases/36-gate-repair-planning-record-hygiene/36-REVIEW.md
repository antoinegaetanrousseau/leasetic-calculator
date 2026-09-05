---
phase: 36-gate-repair-planning-record-hygiene
reviewed: 2026-09-05T15:28:37Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/probe-write-isolation.ts
  - package.json
  - tests/container-radius.test.ts
  - tests/server-action-error-contracts.test.ts
  - docs/design/reui-blocks-audit.md
findings:
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
