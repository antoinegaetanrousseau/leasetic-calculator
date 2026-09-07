---
phase: 36-gate-repair-planning-record-hygiene
fixed_at: 2026-09-05T17:52:00Z
review_path: .planning/phases/36-gate-repair-planning-record-hygiene/36-REVIEW.md
iteration: 2
iterations:
  - iteration: 1
    findings_in_scope: 9
    fixed: 9
    skipped: 0
    out_of_scope: 5
  - iteration: 2
    findings_in_scope: 2
    fixed: 4
    recorded_not_fixed: 1
    out_of_scope: 5
findings_in_scope: 11
fixed: 13
skipped: 0
recorded_not_fixed: 1
out_of_scope: 5
status: all_fixed
---

# Phase 36: Code Review Fix Report

**Fixed at:** 2026-09-05T17:52:00Z
**Source review:** `.planning/phases/36-gate-repair-planning-record-hygiene/36-REVIEW.md`
**Iteration:** 1

**Summary:**

- Findings in scope (Critical + Warning): 9
- Fixed: 9
- Skipped: 0
- Deliberately out of scope (Info): 5

All nine changes land in a single file, `scripts/probe-write-isolation.ts` (+227 / −25). Nine
atomic commits, one per finding. No other file was touched — in particular
`eslint.config.mjs`, `36-PROBE-TRANSCRIPT.md`, `29-VERIFICATION.md`, `29-SECURITY.md` and
`29-VALIDATION.md` are untouched, and no migration command was run.

## Method

Work was done in an isolated git worktree (`gsd-reviewfix/36-*`, fast-forwarded into `main` and
removed on completion). Every Critical was reproduced **before** its fix and re-demonstrated
**after**, with synthetic credentials only. Two techniques kept the demonstrations off the
network:

1. A **variant copy** of the script whose two allow-listed hostnames are rewritten to RFC-2606
   `.invalid` names (`dev-probe.invalid`, `main-probe.invalid`). DNS never resolves them, so an
   input that *passes* the guard still cannot reach any endpoint.
2. **Construction-only** harnesses (`postgres()` is lazy — it parses the URL eagerly but opens no
   socket until a query), plus a local silent/capture TCP listener on `127.0.0.1` for the
   startup-packet and SIGINT demonstrations. A local socket is not a database and holds no data.

### One deviation to record honestly

The first CR-01 "after" run was executed against the **real** allow-listed hostnames before the
`.invalid` variant technique was adopted. Because the fix makes that input *pass* the guard, the
script proceeded to open a connection to the Neon **development** pooled endpoint with the
synthetic username `fakeuser`, and was rejected: `password authentication failed for user
'fakeuser'`. No sentinel was written, no row was read, no production (`main`) endpoint was
contacted, and nothing was left behind. Every subsequent demonstration used `.invalid` hosts or a
local socket. Recorded here rather than omitted, since `<constraints>` item 5 said not to contact
a real database.

## Fixed Issues

### CR-01: Hostname extractor prints password material to stderr when the password contains `@`

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `c9cf981`

**Applied fix:** Replaced the hand-rolled `indexOf('@')` / `search(/[/:]/)` extractor with the
platform `URL` parser, gated on `postgres:` / `postgresql:` and on a bare-DNS-hostname regex
(`/^[a-z0-9.-]+$/`), with the host case-folded. A rejection returns `null`, which takes the
existing "could not parse a hostname" branch — a branch that echoes no input-derived text at all.

**Before** (synthetic credential, real script, no rows touched):

```
input:  postgres://fakeuser:fake@pass@ep-polished-band-alphc576-pooler.c-3.…neon.tech/neondb
output: ERROR: PROBE_DEV_URL resolves to an unrecognised host: pass@ep-polished-band-alphc576-pooler.c-3.…neon.tech
                                                               ^^^^^ tail of the password
```

**After** (guard-level A/B, no connection):

```
input: postgres://fakeuser:fake@pass@dev-probe.invalid/neondb?sslmode=require
  old -> "pass@dev-probe.invalid"      new -> "dev-probe.invalid"
input: postgres://fakeuser:p@ssw@rd@dev-probe.invalid/neondb
  old -> "ssw@rd@dev-probe.invalid"    new -> "dev-probe.invalid"
input: postgres://fakeuser:pa/ss@dev-probe.invalid/neondb
  old -> "dev-probe.invalid"           new -> null      ← old passed a URL the driver rejects
input: postgres://fakeuser:pw@DEV-PROBE.INVALID/neondb
  old -> "DEV-PROBE.INVALID"           new -> "dev-probe.invalid"   ← IN-02 folded in
input: fakeuser:fakepass123@dev-probe.invalid/neondb
  old -> "dev-probe.invalid"           new -> null      ← CR-03's false-PASS input
```

Consolidated scan over six hostile inputs through the finished script: **zero** occurrences of any
password substring in any refusal path.

### CR-02: Unhandled rejection prints the full connection string, password included

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `60f803f`

**Applied fix:** Both halves, as the review asked. (a) A `createClient()` helper now performs
`postgres(url, …)` **inside a `try`**, so an eager parse throw is caught and reported via
`safeErrorMessage`. (b) `main()` is no longer invoked bare — it carries a terminal
`.catch()` that prints `FATAL: ${safeErrorMessage(err)}`, i.e. the message text only, never the
error object (which is what carried the URL on `ERR_INVALID_URL.input`).

**Before** (bare entry point, synthetic credential):

```
dev host:  ep-polished-band-alphc576-pooler.c-3.…neon.tech
main host: ep-icy-boat-alx5o1tz-pooler.c-3.…neon.tech
sentinel:  isolation-probe-36-efa50a3a-…
TypeError: Invalid URL
  code: 'ERR_INVALID_URL',
  input: 'postgres://fakeuser:SuperSecretPw123@ep-polished-band-alphc576-pooler.c-3.…neon.tech:99999999/neondb'
```

Note the two `host:` lines printed first — the operator had every reason to believe the gates
had cleared.

**After**, two layers:

```
(a) same input through the real script — never reaches construction at all:
    ERROR: could not parse a hostname out of PROBE_DEV_URL.

(b) A/B of the terminal handler on an ERR_INVALID_URL escaping an async entry point:
    before:  TypeError: Invalid URL / input: 'postgres://fakeuser:SuperSecretPw123@…'
    after :  FATAL: Invalid URL        (exit 1)
    leak check for 'SuperSecretPw123' in the after-output: 0 occurrences
```

### CR-03: The allow-list validates a string the driver does not use — false `PASS`

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `8bf1ab9`

**Applied fix:** The structural half is CR-01's shared-parser rewrite — `extractHostname` now uses
the *same* `new URL` that `postgres/src/index.js:543` uses, so a scheme-less string returns `null`
and takes the refusal branch. On top of that, a new `openClient()` asserts the **driver's own**
resolved target after construction: `sql.options.host` must have length 1 and equal the
allow-listed host, otherwise the client is closed and the run refuses. This also neutralises
postgres.js's `env.PGHOST` fallback (`index.js:437`). The resolved host is deliberately **not**
echoed, since on a malformed URL it can itself be a credential fragment.

**Before:**

```
input:      fakeuser:fakepass123@ep-polished-band-alphc576-pooler.c-3.…neon.tech/neondb
guard:      "ep-polished-band-alphc576-pooler.c-3.…neon.tech"   guardPass = true
pg.host:    ["localhost"]   pg.port: [5432]
pg.db:      "akepass123@ep-polished-band-alphc576-pooler.c-3.…neon.tech/neondb"
```

i.e. the guard certified the Neon dev endpoint while the driver was pointed at `localhost` — the
sentinel would have been written and read back locally and the script would have emitted
`PASS … ISOLATED`, exit 0.

**After**, both layers demonstrated:

```
(a) real script path:
    PROBE_DEV_URL='fakeuser:fakepass123@dev-probe.invalid/neondb'
    -> ERROR: could not parse a hostname out of PROBE_DEV_URL.

(b) layer-2 assertion, proven to fire even if layer 1 were fooled
    (feeding the same input to the OLD extractor, then to the new assertion):
    old guard says : "dev-probe.invalid" -> pass = true
    driver targets : ["localhost"]
    assertion      : REFUSED (driver host != allow-listed host)
```

### CR-04: `safeErrorMessage` misses `postgresql://`, the scheme Neon's console emits

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `13695d6`

**Applied fix:** Three-stage redaction, exactly as suggested: `postgres(?:ql)?:\/\/\S*` (case
insensitive), a scheme-independent `//user:pass@` scrub, and a verbatim `split/join` of
`process.env.PROBE_DEV_URL` / `PROBE_MAIN_URL` — a pattern can be out-thought, an exact-string
replacement of the known secrets cannot. This matters because `safeErrorMessage` is now the sole
funnel for every `catch` in the file *and* for CR-02's terminal handler.

**Before → After** (same six inputs):

| input | before | after |
|---|---|---|
| `…postgresql://user:Secret123@host/db…` | unchanged | `…[redacted]…` |
| `…POSTGRES://user:Secret123@host/db…` | unchanged | `…[redacted]…` |
| `…//user:Secret123@main-probe.invalid` | unchanged | `…//[redacted]@main-probe.invalid` |
| `…postgresql://u:Secret123@…:5432/neondb?sslmode=require` | unchanged | `…[redacted]` |
| `password authentication failed (SuperSecretPw123)` | unchanged | ~~`…([redacted])` via the env scrub~~ **CORRECTED — see below: still unchanged** |
| `…postgres://user:Secret123@host/db…` | `[redacted]` | `[redacted]` (unchanged behaviour) |

Leak check across all cases: 0 surviving secrets.

> **Correction (iteration 2, NEW-05).** Row 5 above over-claimed. The demonstration that
> produced it set `PROBE_DEV_URL` to the bare string `SuperSecretPw123`, which is not a shape the
> script accepts — every gate requires a full URL. Re-run with realistic values (both env vars
> holding complete URLs, as the script requires), a **bare password quoted on its own is NOT
> redacted**: the verbatim scrub matches the whole URL, never the password alone. That limit is
> now stated in `safeErrorMessage`'s own docblock rather than left to a table a maintainer might
> trust instead of re-testing. It is not a live leak — postgres.js never emits a bare client
> password (`errors.js:16-27` embeds `host:port` only; `PostgresError` copies a server message
> that cannot contain it) — but the record was wrong and is corrected here.

### WR-01: A failed cleanup still exits 0 and still prints `PASS`

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `f8a8789`

**Applied fix:** Both cleanup failure paths now set `exitCode = 1` and print
`Marking this run FAILED: cleanup could not be confirmed.` A run that cannot show the sentinel was
removed no longer reports exit 0. The existing `WARNING: cleanup deleted N row(s) …` wording was
kept verbatim, because `36-PROBE-TRANSCRIPT.md` cites the *absence* of that exact string as its
cleanup proof; renaming it would have invalidated a claim in a record that must not be altered.

### WR-02: Spurious "verify by hand" warning on every pre-insert failure

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `999bda3`

**Applied fix:** An `inserted` flag is set immediately after the `INSERT` succeeds. The `finally`
still *attempts* the DELETE unconditionally (belt-and-braces, in case the INSERT committed and the
await then failed), but only asserts the row count — and only fails the run — when `inserted` is
true. When nothing was written, the DELETE failure is reported as a `NOTE:` instead.

**Before** (INSERT fails: host never resolves):

```
ERROR during probe run: getaddrinfo ENOTFOUND dev-probe.invalid
WARNING: cleanup DELETE failed for sentinel isolation-probe-36-651bcc4d-… on dev-probe.invalid:
  getaddrinfo ENOTFOUND dev-probe.invalid — verify by hand.
```

**After** (identical input):

```
ERROR during probe run: getaddrinfo ENOTFOUND dev-probe.invalid
NOTE: cleanup DELETE could not run (getaddrinfo ENOTFOUND dev-probe.invalid), but no sentinel
  was ever written — nothing to clean up.
```

### WR-03: No signal handler — Ctrl-C between INSERT and DELETE leaves the sentinel behind

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `06e3b7a`

**Applied fix:** `process.once('SIGINT'|'SIGTERM')` handlers registered as soon as the sentinel
label exists, printing the exact recovery statement and exiting 130. The handler deliberately does
**not** attempt the DELETE itself: async work in a signal handler racing `process.exit` cannot be
relied on, and a half-run cleanup that reported success would be worse than an explicit
instruction.

Demonstrated with the probe blocked mid-run against a local silent TCP listener (accepts, never
replies — no database involved), then interrupted:

**Before:**

```
dev host:  localhost
main host: main-probe.invalid
sentinel:  isolation-probe-36-7272a3fb-…
<SIGINT — process dies silently, exit 130, no recovery instruction>
```

**After:**

```
sentinel:  isolation-probe-36-95ee58d6-…

INTERRUPTED (SIGINT) — the sentinel may still exist on localhost.
  Remove it by hand: DELETE FROM schema_meta WHERE label = 'isolation-probe-36-95ee58d6-…';
exit=130
```

### WR-04: The canonical RUN block teaches putting a production password on the command line

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `1d8d7af`

**Applied fix:** The RUN block now documents the hidden-prompt form that the operator actually
used (`read -rs` × 2, pass through the environment, `unset` immediately), with an explicit note
about shell history and `/proc`-visible argv. The two endpoint hostnames are still listed for
reference — hostnames only, no credential placeholders in an assignment shape that invites
pasting a real password.

The same commit realigns the header's *claims* with the code, since the review's core complaint
was that a comment-block-as-contract file was asserting three things that were not true. The
security note now describes the actual redaction coverage and the terminal handler, and a new
`SAFETY GATES` section enumerates the five fail-closed gates in order. Verified after the rewrite:

- the `_load-env` do-not-"fix"-this directive is still present, and there is **no**
  `import './_load-env'` (0 occurrences);
- there is **no** `PROBE_DEV_URL='postgres://…` assignment anywhere in the file (0 occurrences).

### WR-05: The main-side connection's read-only-ness is a naming convention, not a constraint

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `4cfd5b7`

**Applied fix:** `mainSql` is now opened with
`connection: { default_transaction_read_only: true }` (exposed as the named constant
`MAIN_SESSION_READ_ONLY`). postgres.js types this as a first-class `ConnectionParameters` field
and merges it into the StartupMessage (`postgres/src/connection.js:970`), so this is the typed
form of the review's `-c default_transaction_read_only=on` suggestion. The header now says so, and
also recommends pairing it with a dedicated read-only Neon role for the `PROBE_MAIN_URL` slot.

Verified by capturing the actual startup packet on a local `127.0.0.1` socket:

```
dev client  (no connection options):
  "…|user|fakeuser|database|neondb|client_encoding|UTF8|application_name|postgres.js||"

main client (read-only session):
  "…|user|fakeuser|database|neondb|client_encoding|UTF8|application_name|postgres.js|default_transaction_read_only|true||"
```

The parameter appears on the `main` client only, and the pre-existing defaults are preserved.

**Residual risk, stated plainly:** this could not be exercised against the live pooled endpoint
(constraint 5 forbids contacting a real database), so whether Neon's pooler accepts
`default_transaction_read_only` as a startup parameter is **unverified**. If it refuses, the run
fails closed with a connection error and exit 1 — it can never silently connect read-write. The
header records the fallback: use the branch's direct (non-pooled) endpoint for the main slot.

## Constraint Compliance

| Constraint | Status |
|---|---|
| No env file read; `import './_load-env'` absent; header directive kept | Held — 0 occurrences, directive intact at line 34 |
| Connection strings arrive inline via `PROBE_DEV_URL` / `PROBE_MAIN_URL` | Unchanged |
| `main` side issues exactly one read-only `SELECT count(*)` on the sentinel, reads no rows | Unchanged — and now enforced server-side (WR-05) |
| Sentinel deleted in a guaranteed `finally` | Unchanged, and now also *proven* (WR-01) and recoverable on interrupt (WR-03) |
| Both clients closed | Unchanged |
| Output is hostname-only, no credential material | Strengthened — verified by leak scan over six hostile inputs |
| `mainSql` in exactly three **code** lines, `mainSql.end(` exactly once | **Held** — code lines 323 / 350 / 408; `mainSql.end(` = 1 |
| `eslint.config.mjs` untouched | Held |
| `36-PROBE-TRANSCRIPT.md`, `29-VERIFICATION.md`, `29-SECURITY.md`, `29-VALIDATION.md` untouched | Held |
| No migration command run | Held |

**One accounting note on the `mainSql` contract.** The three *code* lines are exactly as
required. The total `grep -c mainSql` over the file rose from **5 to 6**, because the WR-05
rationale comment names `mainSql` once. It was already 5 before this work (three code lines plus
two header-docblock mentions), so a naive "`mainSql` appears exactly 3 times" grep never matched
the file as shipped; the acceptance criterion that holds — and that this report asserts — is three
code lines and one `mainSql.end(`.

## Not Fixed — Info findings, deliberately out of scope

The fix scope was Critical + Warning. All five Info findings were left as-is:

- **IN-01** — unreachable transposition check; `DEV_HOST`/`MAIN_HOST` still widened to `: string`.
  Not fixed. Note that CR-01's rewrite does not make it reachable either; the observation stands.
- **IN-02** — uppercase hostnames refused. ~~**Incidentally resolved** by CR-01~~ **CORRECTED
  (iteration 2): this claim was wrong for the shipped iteration-1 file.** CR-01 made
  `extractHostname` fold case, and the `DEV-PROBE.INVALID` → `dev-probe.invalid` demonstration
  above is real — but it tested the guard function in isolation, not the whole script. End to end,
  an uppercase host still got refused, just later and after a client had been constructed, because
  `openClient` compared the driver's resolved host case-**sensitively**. The re-review caught this
  as NEW-01. IN-02 is genuinely resolved only as of iteration 2's commit `01f1332` — see the
  iteration-2 section below.
- **IN-03** — `process.exit()` can truncate piped output. Not fixed; the nine `process.exit` calls
  and the terminal `process.exit(exitCode)` are unchanged. Note that CR-02's and CR-03's fixes add
  further `process.exit` calls on refusal paths, so this finding's surface is slightly wider than
  when it was written.
- **IN-04** — unreachable `return;` after `process.exit(1)`. Not fixed; still present on the six
  original refusal branches. (The new refusal paths in `createClient` / `openClient` do not add
  any.)
- **IN-05** — `docs/design/reui-blocks-audit.md` body still asserts pre-deletion figures. Not
  fixed; that file was not touched.

## Gate Results

Run in the isolated worktree after all nine commits, then re-confirmed on `main` post-merge:

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint:check` | **PASS** (exit 0, `--max-warnings=0`) |
| `npm run test` | **PASS** — 172 files passed / 6 skipped; **2320 passed / 61 skipped** (2381) |

Test counts match the expected baseline exactly.

## Commits

```
1d8d7af fix(36): WR-04 document the hidden-prompt RUN form and realign the header contract
4cfd5b7 fix(36): WR-05 make the main-side probe session read-only at the server
06e3b7a fix(36): WR-03 print sentinel recovery instructions on SIGINT/SIGTERM
999bda3 fix(36): WR-02 only assert cleanup when the sentinel was actually written
f8a8789 fix(36): WR-01 fail the run when sentinel cleanup cannot be confirmed
13695d6 fix(36): CR-04 broaden safeErrorMessage to postgresql:// and scrub the supplied URLs
8bf1ab9 fix(36): CR-03 assert the driver-resolved host matches the allow-list
60f803f fix(36): CR-02 redact the terminal failure path and guard client construction
c9cf981 fix(36): CR-01 parse the probe hostname with the platform URL parser
```

---

# Iteration 2 — fixes for the re-review (2026-09-05)

**Source:** `36-REVIEW.md` § Re-Review — 2026-09-05T15:57:21Z (iteration 2)
**Re-review verdict:** 0 Critical / 3 Warning / 6 Info. All four iteration-1 Criticals and all five
iteration-1 Warnings confirmed **closed**, each independently re-derived by the reviewer rather
than taken from this report.

**Operator decision:** fix NEW-01 and NEW-02; record NEW-03 as a residual. Both new Info items
(NEW-04, NEW-05) were cheap and non-invasive, so both were fixed rather than recorded.

| ID | Severity | Disposition | Commit |
|---|---|---|---|
| NEW-01 | Warning | Fixed | `01f1332` |
| NEW-02 | Warning | Fixed | `23737cc` |
| NEW-03 | Warning | **Recorded, not fixed** (operator decision) | `f93478b` |
| NEW-04 | Info | Fixed | `3f26efb` |
| NEW-05 | Info | Fixed (code) + record corrected above | `357dad1` |

One file changed again: `scripts/probe-write-isolation.ts` (+129 / −29).

## Method

Same isolation as iteration 1 (dedicated git worktree, fast-forwarded and removed). Two off-network
techniques, both now recorded in the script's own header:

1. **`.invalid` variant** of the shipped file for guard-logic tests, as before.
2. **A minimal Postgres wire-protocol mock** on `127.0.0.1`, written for this iteration because
   NEW-02 cannot be demonstrated without completing a full run. It speaks enough of the v3 protocol
   (startup, `AuthenticationOk`, extended query with Describe/Flush/Bind/Execute/Sync,
   `RowDescription` / `DataRow` / `CommandComplete` / `ReadyForQuery`) to answer the probe's three
   statements. It stores nothing and holds no data. Crucially it takes a `--mode` flag —
   `honour` applies `default_transaction_read_only` like a real server, `discard` accepts the
   connection and silently drops it, exactly as a pgbouncer-family pooler with
   `ignore_startup_parameters` would. No Postgres binary and no Docker daemon were available on
   this machine, which is why the mock exists.

No real endpoint was contacted at any point in this iteration.

## NEW-01: Uppercase hostnames trip the driver-divergence security alarm

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `01f1332`

**Applied fix:** `resolved[0].toLowerCase() !== expectedHost` — comparing on the same footing the
guard already used. The `openClient` docblock now says why: this is the one message in the script
meaning "the guard and the connect path disagree", and an alarm that fires on benign input trains
the operator to dismiss the signal that must never be dismissed.

**Before** (`.invalid` variant, synthetic credential):

```
PROBE_DEV_URL=postgres://fakeuser:UpperCasePw@DEV-PROBE.INVALID/neondb
dev host:  dev-probe.invalid                        ← gates 2-3 passed
main host: main-probe.invalid
sentinel:  isolation-probe-36-8787f5f0-…
ERROR: the postgres driver resolved a different host for PROBE_DEV_URL than the allow-list accepted — refusing.
  Expected the driver to target exactly one host: dev-probe.invalid
```

**After** (identical input) — all four gates pass and the run proceeds to DNS:

```
dev host:  dev-probe.invalid
main host: main-probe.invalid
sentinel:  isolation-probe-36-1cafedd0-…
ERROR during probe run: getaddrinfo ENOTFOUND DEV-PROBE.INVALID
```

**Regression check — gate 4 still discriminates.** The case fold must not blunt the assertion:

```
genuine divergence (driver -> localhost)   driver=["localhost"]          gate4=REFUSES
benign DNS case difference                 driver=["DEV-PROBE.INVALID"]  gate4=accepts
```

This is also what finally resolves **IN-02**, which iteration 1 wrongly reported as already
resolved. The correction is applied in place in the iteration-1 section above.

## NEW-02: The read-only control was unverified in the direction that matters

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `23737cc`

**Applied fix:** the reviewer's preferred form — fold the proof into the statement the run was
always going to issue:

```sql
SELECT count(*)::int AS n, current_setting('transaction_read_only') AS ro
FROM schema_meta WHERE label = $1
```

If `ro` is not `on`, the run refuses and sets `exitCode = 1`, naming the pooler-configuration cause
and the direct-endpoint workaround. The refusal deliberately does **not** call `process.exit` —
that would skip the `finally` and orphan the sentinel; it sets the exit code and lets cleanup run.

The header no longer asserts a database constraint. It now states the guarantee precisely: the
parameter is **requested**, the single statement **verifies** it took effect, and *"this run either
observed a read-only session or failed — it never assumes one."* `MAIN_SESSION_READ_ONLY`'s
docblock spells out all three outcomes (honoured / refused / **silently discarded**) and why the
third is the one that motivated the change.

**Before** — pooler in `discard` mode: parameter sent, dropped without error, script certifies:

```
dev host:  localhost
main host: 127.0.0.1
sentinel:  isolation-probe-36-0c7f292b-…
PASS: sentinel isolation-probe-36-0c7f292b-… is absent from 127.0.0.1 — ISOLATED.
exit=0
[mock:5442] startup: default_transaction_read_only=true mode=discard -> transaction_read_only=off
```

That is a `PASS`, exit 0, on a read-write session, under a header claiming a database constraint.

**After (a)** — same `discard` server:

```
ERROR: the session on 127.0.0.1 is NOT read-only (transaction_read_only = off) — refusing to certify this run.
  The default_transaction_read_only startup parameter was sent but not honoured. A pgbouncer-family
  pooler can accept the connection and silently discard it (ignore_startup_parameters /
  track_extra_parameters), which raises no error.
  Use the branch's direct (non-pooled) endpoint for PROBE_MAIN_URL, or supply a role that is
  read-only at the database.
exit=1
```

**After (b)** — `honour` server, i.e. the normal case, unregressed:

```
PASS: sentinel isolation-probe-36-f7a5ef8c-… is absent from 127.0.0.1 — ISOLATED.
exit=0
[mock:5442] startup: default_transaction_read_only=true mode=honour -> transaction_read_only=on
```

**Constraint check.** `mainSql` remains on exactly **3 code lines** (357 / 390 / 465 pre-NEW-03,
verified again after), `mainSql.end(` appears once, `0` write verbs appear on a `mainSql` template,
and the statement returns a count plus a GUC string — never a row of `schema_meta`. Adding a second
query would have broken all of that; folding into the existing one does not.

The iteration-1 residual ("unverified against the live pooler") is **discharged**: the run no
longer needs the pooler's behaviour to be known in advance, because it measures it.

## NEW-03: No parse-only mode — recorded, not fixed

**Files modified:** `scripts/probe-write-isolation.ts` (header only)
**Commit:** `f93478b`

**Recorded, per operator decision.** No `PROBE_PARSE_ONLY` was added — verified, `0` occurrences in
the file. Adding a bypass would widen the surface of a production-touching script for the benefit
of its own tests.

A new header section, `TESTING THIS SCRIPT'S OWN GATES — READ BEFORE WRITING A TEST INPUT`, states
the residual: there is no way to exercise the hostname gates without opening a socket, **because a
correct guard is precisely one that lets well-formed, credential-shaped input through**. It cites
this fixer's own disclosed incident as the worked example — the iteration-1 CR-01 demonstration that
opened a socket to the Neon `development` endpoint and was rejected at auth — and notes that only
the choice of slot kept it off production. It then prescribes the method: copy the file, rewrite
both host constants to `.invalid`, assert on the copy that both constant lines end in `.invalid`,
and point them at a local socket for end-to-end work.

One self-inflicted detail worth recording: the first draft told the reader to assert "zero
occurrences of `neon.tech`" — a check that fails on the paragraph's own prose. Caught while
re-deriving the variant, and corrected before the commit landed.

## NEW-04: A credential-less URL was accepted

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `3f26efb`

**Applied fix:** `if (!parsed.username) return null;` in `extractHostname`, restoring parity with
`check-local-db-branch.sh:54-62` ("no user@host segment (missing credentials)"), which the
URL-parser rewrite had silently dropped. This closes the `PGUSER` / `PGUSERNAME` / `PGPASSWORD` /
`osUsername()` fallbacks on a run the header describes as fully inline.

**Before:** `postgres://dev-probe.invalid/neondb` passed every gate and proceeded to connect
(`dev host: dev-probe.invalid` … `getaddrinfo ENOTFOUND`).
**After:** `ERROR: could not parse a hostname out of PROBE_DEV_URL.` — refused before construction.

**Regression:** `postgres://fakeuser:pw@…` still passes, and so does user-without-password
(`postgres://fakeuser@…`), matching what the shell analog allows.

## NEW-05: Scheme-less `user:pass@` fragments were unredacted

**Files modified:** `scripts/probe-write-isolation.ts`
**Commit:** `357dad1`

**Applied fix:** the `//` is now optional and preserved through a replacer function, so both forms
are covered without injecting a spurious `//`:

```ts
.replace(/(\/\/)?[^\s/@]{1,64}:[^\s/@]{1,64}@/g,
  (_match, slashes) => `${slashes ?? ''}[redacted]@`)
```

The docblock now also states the verbatim scrub's real limit — it matches whole URLs, never a
password quoted alone — instead of leaving a maintainer to trust the over-claiming table.

**Before → After** (env vars holding realistic full URLs, as the script requires):

| input | before | after |
|---|---|---|
| `bare fragment fakeuser:Secret123@main-probe.invalid …` | unchanged | `bare fragment [redacted]@main-probe.invalid …` |
| `… //fakeuser:Secret123@main-probe.invalid …` | `//[redacted]@…` | `//[redacted]@…` |
| `… postgresql://fakeuser:Secret123@…/db …` | `[redacted]` | `[redacted]` |
| `write CONNECT_TIMEOUT main-probe.invalid:5432` | unchanged | unchanged (no over-redaction of `host:port`) |
| `password authentication failed … (MainSecret)` | unchanged | unchanged — the stated limit |

Row 4 matters as much as the others: the widened pattern must not eat the `host:port` diagnostics
the operator needs.

## Iteration-2 regression sweep

Nine hostile inputs through the finished script (`.invalid` variant), one line each:

```
scheme-less        ERROR: could not parse a hostname out of PROBE_DEV_URL.
invalid port       ERROR: could not parse a hostname out of PROBE_DEV_URL.
'/' in password    ERROR: could not parse a hostname out of PROBE_DEV_URL.
multihost          ERROR: could not parse a hostname out of PROBE_DEV_URL.
wrong host         ERROR: PROBE_DEV_URL resolves to an unrecognised host: evil.example.com
no credentials     ERROR: could not parse a hostname out of PROBE_DEV_URL.   ← NEW-04
IPv6 literal       ERROR: could not parse a hostname out of PROBE_DEV_URL.
bad scheme         ERROR: could not parse a hostname out of PROBE_DEV_URL.
uppercase          dev host:  dev-probe.invalid                              ← NEW-01, now accepted
```

Consolidated leak scan across all nine: **0** occurrences of any password, username or URL
substring. Verdict paths re-checked against the mock: `PASS` (exit 0), `ISOLATION VIOLATED`,
`INCONCLUSIVE`, and the new read-only refusal all still reach their intended branch.

## Iteration-2 constraint compliance

| Constraint | Status |
|---|---|
| No env-file reading; `import './_load-env'` absent; do-not-"fix" directive intact | Held — 0 imports, directive at line 34 |
| Both URLs inline-only via `PROBE_DEV_URL` / `PROBE_MAIN_URL` | Unchanged |
| `main` issues exactly ONE statement | Held — one `SELECT`, now returning count + GUC |
| `main` statement returns no customer rows | Held — a count and a setting value only |
| `main` session still read-only | Strengthened — requested **and verified** |
| `mainSql` on exactly 3 code lines, `mainSql.end(` once, 0 write verbs | Held — verified mechanically after every commit |
| Sentinel deleted in a guaranteed `finally`; both clients closed | Unchanged; the new refusal sets `exitCode` rather than calling `process.exit`, precisely so `finally` still runs |
| Output hostname-only | Held — 0 credential occurrences across 9 hostile inputs |
| No `PROBE_PARSE_ONLY` added | Held — 0 occurrences |
| `eslint.config.mjs` untouched | Held |
| `36-PROBE-TRANSCRIPT.md`, `29-VERIFICATION.md`, `29-SECURITY.md`, `29-VALIDATION.md` untouched | Held |
| No migration command run | Held |
| No real endpoint contacted | Held — `.invalid` hostnames and a local `127.0.0.1` mock only |

## Iteration-2 Info items still open

- **IN-01** (unreachable transposition check, `: string` widening) — not fixed, unchanged.
- **IN-03** (`process.exit()` can truncate piped output) — not fixed. Surface is now **12** call
  sites; note that NEW-02's read-only refusal deliberately does *not* add one.
- **IN-04** (unreachable `return;` after `process.exit(1)`) — not fixed, six original branches.
- **IN-05** (`reui-blocks-audit.md` body figures) — not fixed; file untouched.
- **NEW-03** — recorded in the header as a permanent residual, by operator decision.

## Iteration-2 gate results

| Gate | Result |
|---|---|
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint:check` | **PASS** (exit 0, `--max-warnings=0`) |
| `npm run test` | **PASS** — 172 files passed / 6 skipped; **2320 passed / 61 skipped** (2381) |
| `npm run build` | **PASS** (exit 0) |

Test counts match the baseline exactly. `npm run build` was run in the main repository rather than
the worktree: Turbopack rejects a symlinked `node_modules` ("points out of the filesystem root"),
which is a harness limitation, not a build failure.

## Iteration-2 commits

```
f93478b docs(36): NEW-03 record why the gates cannot be tested without a socket
357dad1 fix(36): NEW-05 redact scheme-less user:pass@ fragments and state the scrub's limit
3f26efb fix(36): NEW-04 require credentials in the URL, matching check-local-db-branch.sh
23737cc fix(36): NEW-02 prove the main session is read-only in-band instead of assuming it
01f1332 fix(36): NEW-01 compare the driver-resolved host case-insensitively
```

---

_Fixed: 2026-09-05T17:52:00Z (iteration 1), 2026-09-05T18:40:00Z (iteration 2)_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_

---

## Post-fix note — the `mainSql` count criterion is under-specified (orchestrator, 2026-09-05)

Plan `36-04`'s acceptance criterion reads:

```
test "$(grep -v "^\s*\*" <file> | grep -c 'mainSql')" = "3"
```

Against the file as it now stands that command returns **4**, and would fail. This is a
defect in the *measurement*, not in the code:

| Line | Form | Counts as code? |
|---|---|---|
| 42, 45, 245, 252 | `*` block-comment continuation | no — stripped by the criterion |
| **400** | `const mainSql = await openClient(...)` | **yes — declaration** |
| 427 | `// Still exactly ONE statement on \`mainSql\`, ...` | no — but NOT stripped by the criterion |
| **433** | `const [mainResult] = await mainSql\`` | **yes — the single SELECT** |
| **508** | `await mainSql.end({ timeout: 5 })` | **yes — the close** |

The contract the criterion exists to enforce — `mainSql` appears in exactly three
*executable* lines, one of them the sole read-only statement — **holds**. Stripping both
comment forms returns 3:

```
grep -v '^\s*\*' <file> | grep -v '^\s*//' | grep -c 'mainSql'   →   3
```

**Deliberately NOT done:** rewording line 427 to avoid the literal `mainSql`. The
iteration-1 review established that the security commentary is required to name the
identifier and "must not be contorted to satisfy a count" — that reasoning applies to a
`//` comment as much as to the docblock. Editing prose to satisfy a grep would make the
count pass while making the file worse, which is the failure mode this phase exists to
close.

The corrected command above is the one to use in any future verification of this file.
`mainSql.end(` = 1 and zero write verbs on a `mainSql` template both still hold as written.
