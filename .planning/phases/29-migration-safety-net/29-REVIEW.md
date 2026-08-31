---
phase: 29-migration-safety-net
reviewed: 2026-08-31T16:50:32Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - scripts/check-migration-journal-sync.sh
  - scripts/check-db-smoke-filter.sh
  - scripts/check-local-db-branch.sh
  - .github/workflows/ci.yml
  - package.json
  - .env.example
  - .gitignore
  - docs/operations/neon-branch-routing.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-08-31T16:50:32Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

This phase adds two CI guard scripts (`check-migration-journal-sync.sh`,
`check-db-smoke-filter.sh`), one local-only guard (`check-local-db-branch.sh`), corrects the
`db-smoke` paths-filter, wires both new guards into `ci.yml` at the correct positions, mandates
the `development` Neon branch in `.env.example`, and closes a `.gitignore` gap for backup files.

I did not just read the scripts — I ran them against the live repo and reproduced every scenario
each guard claims to catch:

- **Orphan-SQL probe** (`touch drizzle/9999_zz_orphan_probe.sql`) → `check:migration-journal-sync`
  correctly fails, names the file, cleans up with no residue in `git status`.
- **Dangling-journal probe** (added a `_journal.json` entry with no matching `.sql`) → correctly
  fails, names the tag, restored cleanly.
- **Dead-filter probe** (reverted `ci.yml`'s pattern to the original bug,
  `'drizzle/migrations/*.sql'`) → `check:db-smoke-filter` correctly fails assertions B, C, and D,
  naming every uncovered migration file, restored cleanly.
- **Credential-leak probe** (synthetic `.env.local` with a fake `neondb_owner`/`SUPERSECRET`
  connection string pointed at the production hostname) → the script correctly identified the
  production endpoint and failed, and neither the password, user, nor `postgres://` scheme ever
  appeared in stdout/stderr.
- Confirmed only one `db:migrate` invocation exists in `ci.yml` (the pre-existing ephemeral-branch
  apply step) — Phase 20 locked rule 3 is intact.
- Confirmed the `## Locked rules` list in the runbook is untouched and the new "Migration gates"
  section's scenario matrix matches actual guard behavior.
- Confirmed CI wiring order: `Migration journal parity` runs after `Install dependencies` and
  before `Create ephemeral Neon branch` in `db-smoke` (so an orphan migration fails before a Neon
  branch slot is consumed, as intended); `check:db-smoke-filter` runs in `build-test` on every PR,
  not gated on the schema filter.

The one substantive issue found is a latent `set -e`/`pipefail` bug in
`check-migration-journal-sync.sh` that causes a **completely silent** script failure (no error
text at all) if the journal ever has zero `"tag"` entries — reproduced empirically below. It does
not create a false pass (the script still exits non-zero, so CI still fails), but it directly
contradicts the plan's explicit requirement that failure output "must name the offending file(s)
and state the remedy," and it's an inconsistency against the sibling script
(`check-local-db-branch.sh`), which guards the identical grep-pipeline pattern correctly.

## Warnings

### WR-01: Silent script death on empty/reformatted journal — `set -e`+`pipefail` swallows the grep-no-match case

**File:** `scripts/check-migration-journal-sync.sh:35`
**Issue:**

```bash
tags=$(grep -o '"tag"[[:space:]]*:[[:space:]]*"[^"]*"' "$JOURNAL" | sed -E 's/.../\1/')
```

Under `set -euo pipefail` (line 22), if `grep -o` finds zero matches in `$JOURNAL` (exit status 1),
`pipefail` makes the whole pipeline's exit status non-zero even though `sed` itself exits 0. Since
this is a plain variable assignment (not inside an `if`/`&&`/`||` guard), `set -e` terminates the
script **immediately at this line**, before any of the script's own error-reporting code runs.

This is not a hypothetical: I reproduced it directly against this repo.

```
$ echo '{"version":"7","dialect":"postgresql","entries":[]}' > drizzle/meta/_journal.json
$ bash scripts/check-migration-journal-sync.sh; echo "exit=$?"
exit=1
```

Note there is **zero output** — not even a bash error trace. In CI this would surface as a job
that failed with an empty log for that step, which is materially worse for triage than the
guard's own designed failure mode (it still fails closed, so no false green results, but it
produces none of the "name the offending file(s), state the remedy" output the plan's Task 1
action explicitly requires of this script).

An empty `entries: []` journal is not the current state (7 entries exist today, so this doesn't
fire on HEAD), but it is a plausible future state — this repo has already had one journal-repair
incident (Phase 22, referenced in the script's own header comment), and a reformatted or
truncated `_journal.json` would trigger the same silent-death path if the `"tag"` regex simply
stops matching for any reason (e.g., a future drizzle-kit version changes journal formatting).

Compare to `scripts/check-local-db-branch.sh:33`, which guards the *exact same* grep-pipeline
pattern correctly:
```bash
raw_line=$(grep -E '...' "$ENV_FILE" | head -n 1 || true)
```

**Fix:** Apply the same guard to the `tags=` assignment:
```bash
tags=$(grep -o '"tag"[[:space:]]*:[[:space:]]*"[^"]*"' "$JOURNAL" | sed -E 's/.*"tag"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/' || true)
```
and consider adding an explicit check after extraction (`tag_count=0` with `tags` empty should
still correctly report "0 journal entries checked" via the existing dangling-entry loop, rather
than crash) so a genuinely empty journal produces the same actionable `ERROR:`/`OK:` messaging as
every other failure mode this script handles.

## Info

### IN-01: Hostname extraction assumes `DATABASE_URL` always contains `user:pass@`

**File:** `scripts/check-local-db-branch.sh:51`
**Issue:** `host=$(printf '%s' "$value" | sed -E 's#^[^@]*@##; s#[/:].*$##')`. If a `DATABASE_URL`
has no `@` (no userinfo, e.g. `postgres://host:5432/db`), the first substitution is a no-op (no
`@` to match) and the second substitution then cuts at the *first* `:` or `/` in the whole
string — which for a `postgres://...` URL is the colon right after the scheme, yielding `host`
extracted as the literal string `postgres` rather than an error or the real host. Verified:
```
$ echo 'DATABASE_URL=postgres://host:5432/db' > .env.local && bash scripts/check-local-db-branch.sh
ERROR: unrecognised DATABASE_URL host (postgres).
```
This happens to fail closed (unrecognised host → exit 1) rather than silently passing, so there is
no false-green risk, and every real Neon pooled URL always includes `user:pass@`, so this is
unlikely to be hit in practice. Still, the resulting error message ("unrecognised host (postgres)")
is misleading about the actual problem (a missing credential segment in the URL, not an unknown
Neon endpoint).
**Fix:** Guard the `@` split explicitly, e.g. fail with a clearer message ("DATABASE_URL has no
`user@host` segment") when the value contains no `@`, rather than falling through to the generic
unrecognised-host branch.

### IN-02: Host classification uses a prefix wildcard, not the full expected hostname

**File:** `scripts/check-local-db-branch.sh:58-85`
**Issue:** Each `case` arm matches on a prefix wildcard, e.g. `ep-polished-band-alphc576-pooler*`,
rather than the full expected suffix
`ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech`. A hostname that merely starts
with the same prefix but resolves to an unrelated domain (e.g. a typo-hijacked or unrelated host
`ep-polished-band-alphc576-pooler.evil.example.com`) would be classified as the safe `development`
branch. Given this is a local-only convenience script reading a file the developer edits by hand
themselves (no adversarial input path), this is low risk in practice, but a full-suffix match
would be strictly more precise and costs nothing.
**Fix:** Match the full pattern including the domain suffix, e.g.
`ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech*`, or drop the trailing `*`
entirely since Neon hostnames don't vary beyond the endpoint ID.

---

## What I checked and found clean

- **Both directions of the journal-parity gate** (orphan SQL, dangling journal entry) — verified
  by injection, both fail correctly and name the offending item.
- **The anti-rot filter guard's four assertions** — verified against both the current (fixed)
  `ci.yml` (passes) and a reverted copy carrying the original `drizzle/migrations/*.sql` bug
  (fails B, C, D with the exact dead pattern named).
- **Credential handling in `check-local-db-branch.sh`** — confirmed no `source`/`.` of
  `.env.local`, confirmed the script never emits the connection string, username, or password
  (tested with a synthetic secret value that never appeared in output), confirmed it correctly
  flags the production endpoint and correctly passes for `development`/`localhost` and warns for
  `preview`.
- **`.gitignore` pattern `.env.local.bak*`** — confirmed it matches the specific backup filename
  (`.env.local.bak.20260831`) referenced in the 29-02 summary, closing the gap left by the existing
  `.env*.local` pattern (which requires a `.local` suffix the backup file doesn't have).
- **CI wiring** — `Migration journal parity` step is correctly positioned between `Install
  dependencies` and `Create ephemeral Neon branch` inside `db-smoke`, gated on
  `steps.filter.outputs.schema == 'true'` (a real, existing step output); `check:db-smoke-filter`
  runs unconditionally in `build-test`. Both `if:` conditions reference outputs/steps that exist.
- **Locked rule 3** — exactly one `db:migrate` invocation exists anywhere in `ci.yml` (the
  pre-existing ephemeral-branch apply step); `.env.example` only documents the `db-migrate.yml`
  workflow-dispatch path, never a local invocation; the `## Locked rules` list in the runbook is
  byte-unchanged.
- **Bash 3.2 / POSIX compliance** — no `mapfile`, `readarray`, or associative arrays in any of the
  three new scripts; the `drizzle/[0-9]*.sql` no-match glob case is correctly guarded with
  `[ -e "$sql_file" ] || continue` in both scripts that use it, avoiding the classic
  literal-pattern-iteration bug.
- **`package.json`** — all three `check:*` scripts registered exactly once, no `db:migrate` path
  added, no new dependency introduced.

No Critical findings. No security vulnerabilities (injection, secret leakage, unsafe eval) found
in any of the reviewed files.

---

_Reviewed: 2026-08-31T16:50:32Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
