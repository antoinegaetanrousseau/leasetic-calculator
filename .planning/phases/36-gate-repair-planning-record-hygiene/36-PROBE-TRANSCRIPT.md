# INFRA-05 write-isolation probe — run transcript

**Run:** 2026-09-05 by Antoine (operator's shell) — Phase 36, CLOSE-05, D-36-03

## Invocation

Canonical form, both values inline, no env file read by the probe:

```
PROBE_DEV_URL='<development pooled url>' PROBE_MAIN_URL='<main pooled url>' npm run probe:write-isolation
```

Three attempts occurred, in the operator's own shell, in order. They are all recorded below
verbatim rather than only the clean final run, because the first two are themselves evidence
about the probe's safety gates:

- **Attempt 1** was run from `/Users/antoinerousseau` (the wrong directory, not this repo)
  with the URL placeholders left unsubstituted — an operator setup mistake, not an invocation
  of the probe at all.
- **Attempt 2** used the real `development` pooled URL in the `PROBE_MAIN_URL` slot — a live
  credential, correctly formed, but in the wrong variable.
- **Attempt 3** used the correct URLs in the correct slots: `<development pooled url>` sourced
  from `.env.test.local`'s `DATABASE_URL_TEST`, `<main pooled url>` supplied via a hidden
  `read -rs` prompt so it was never echoed, never placed on a command line, and never written
  to shell history. Both shell variables were `unset` immediately after the run.

## Output

### Attempt 1 — wrong directory, placeholders not substituted

```
npm error code ENOENT
npm error syscall open
npm error path /Users/antoinerousseau/package.json
npm error errno -2
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/Users/antoinerousseau/package.json'
exit=254
```

npm resolves `package.json` from the cwd upward and found none in that directory tree, so
`tsx` never loaded `scripts/probe-write-isolation.ts`. No connection was opened, no sentinel
was written, and there is nothing to clean up from this attempt.

### Attempt 2 — exact-hostname allow-list refusing a real, live URL in the wrong slot

```
> leasetic-matrice@0.1.0 probe:write-isolation
> tsx scripts/probe-write-isolation.ts

ERROR: PROBE_MAIN_URL resolves to an unrecognised host: ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech
  Expected exactly: ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech
exit=1
```

This is the first time the exact-hostname allow-list refused a real, live connection string
rather than a synthetic one (plan 36-04's self-tests used fake credentials). It refused before
constructing any client, printed only the offending hostname, and leaked no credential
material. Exact-string equality is why this refusal happened at all: a looser "is this a Neon
host" check would have accepted the `development` URL in the `main` slot, written the sentinel
to `development`, then asked `development` (via the `main`-slot variable, which actually pointed
at `development`) whether it saw its own sentinel, found `count = 1`, and reported a false
`ISOLATION VIOLATED` — a branch compared against itself, not against production.

### Attempt 3 — the real run

```
> leasetic-matrice@0.1.0 probe:write-isolation
> tsx scripts/probe-write-isolation.ts

dev host:  ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech
main host: ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech
sentinel:  isolation-probe-36-a72d43b9-7b3d-44c6-bab2-19a6b588665a
PASS: sentinel isolation-probe-36-a72d43b9-7b3d-44c6-bab2-19a6b588665a is absent from ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech — ISOLATED.
exit=0
```

No `WARNING: cleanup deleted N row(s)` line appeared, so the sentinel's `finally`-block
`DELETE` affected exactly one row on `development` and no stray row remains.

## Verdict

**ISOLATED** — exit `0`.

- `main`-side count for the sentinel: `0` (the printed `PASS` line only prints when the
  main-side `SELECT count(*)` returns `0`).
- `development`-side read-back: implicitly `1` — the script only reaches the `main`-side check
  at all when its own dev-side read-back equals exactly `1`; had it been anything else, the
  script would have taken its other error branch instead (visible in `scripts/probe-write-isolation.ts`),
  which did not appear in the output.
- Sentinel label: `isolation-probe-36-a72d43b9-7b3d-44c6-bab2-19a6b588665a`.

## What this does and does not prove

A row written to the Neon `development` branch's pooled compute endpoint
(`ep-polished-band-alphc576-pooler...`) was observed — not inferred — to be absent from the
`main` branch's pooled compute endpoint (`ep-icy-boat-alx5o1tz-pooler...`), via a live
`SELECT count(*)` executed against `main` immediately after the write. This upgrades INFRA-05's
evidentiary basis from the architectural-inference posture recorded in `29-VERIFICATION.md` §
"Known Weak Link — INFRA-05 Evidentiary Basis" to a direct, single-instant empirical
observation.

The residual, stated precisely and not overstated:

- This observes isolation at **one instant**, through the **pooled endpoints**, for **one
  table** (`schema_meta`). It is not a continuous or repeated observation.
- It does **not** audit Neon's storage layer directly — it relies on Neon's compute-endpoint
  routing, not a control-plane inspection of the underlying copy-on-write storage branches
  themselves.
- It says **nothing** about the Vercel production runtime's own connection routing beyond the
  fact that it shares the same `main` endpoint this probe queried — if the production runtime
  were ever misconfigured to point at a different endpoint, this probe would not detect that.

**Residual classification: informational, not a blocker.** The weaker claim (endpoint
separation, fail-closed guard) was already fully verified in Phase 29 and again in plan 36-04's
synthetic self-tests. This run adds the stronger, previously-missing claim (observed
write-isolation) on top of it, closing the specific gap `29-VERIFICATION.md` flagged as a
WARNING-level residual gap. It does not eliminate the narrower residuals listed above, and does
not claim to.

## Safety posture of this run

Per `36-CONTEXT.md` § D-36-03, the following constraints held for all three attempts:

- No env file was opened by the probe itself (attempt 3's `development` URL was copied by the
  operator out of `.env.test.local` by hand into the inline invocation; the probe process never
  read that file).
- Both connection strings were supplied inline to the process environment and never recorded —
  the `main` URL was entered via a hidden `read -rs` prompt in the operator's shell (never
  echoed, never in shell history, never on a command line), and both shell variables were
  `unset` immediately after the run.
- The `main`-side client executed exactly one `SELECT count(*)` filtered on the probe's own
  freshly-generated UUID, against `schema_meta`, and read no customer data.
- The sentinel was deleted from `development` in the same run's guaranteed `finally` block; no
  cleanup warning was printed.
- All printed output — across all three attempts — is hostnames, a sentinel label, `npm`/`tsx`
  process framing, and exit codes only. Zero connection strings, usernames or passwords appear
  anywhere in this transcript.
- As a secondary, unplanned benefit, attempt 2 exercised the exact-hostname allow-list against a
  real, live credential for the first time (plan 36-04's self-tests used only synthetic
  credentials) and confirmed the same fail-closed behavior holds outside the synthetic case.

## Sentinel cleanup

Confirmed. Attempt 3's output contains no `WARNING: cleanup deleted N row(s)` line, which is the
probe's own signal that its `finally`-block `DELETE ... WHERE label = <sentinel>` affected
exactly one row. No sentinel row remains on `development`, and no manual removal was necessary.
