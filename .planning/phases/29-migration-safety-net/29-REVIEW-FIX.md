---
phase: 29-migration-safety-net
fixed_at: 2026-08-31T17:20:00Z
review_path: .planning/phases/29-migration-safety-net/29-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 29: Code Review Fix Report

**Fixed at:** 2026-08-31T17:20:00Z
**Source review:** .planning/phases/29-migration-safety-net/29-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (`fix_scope: critical_warning`): 1 (0 Critical, 1 Warning)
- Fixed: 1
- Skipped: 0

Note: REVIEW.md's 2 Info findings (IN-01, IN-02) are out of scope for `critical_warning` and were
left untouched, per this run's explicit scope note. They are documented below as deferred, not
skipped due to failure.

## Fixed Issues

### WR-01: Silent script death on empty/reformatted journal — `set -e`+`pipefail` swallows the grep-no-match case

**Files modified:** `scripts/check-migration-journal-sync.sh`
**Commit:** `17f0691`
**Applied fix:** Added `|| true` to the `tags=$(grep -o ... | sed -E ...)` pipeline assignment
at line 35, matching the existing guard convention already used for the identical grep-pipeline
pattern in `scripts/check-local-db-branch.sh:33`. This prevents `pipefail` + `set -e` from killing
the script silently at a plain variable assignment when `grep -o` finds zero `"tag"` matches (exit
status 1) — the script's own error-reporting code (naming offending files, printing remedy) now
always runs instead of the process dying with no output.

The suggestion in REVIEW.md's Fix section also floated an additional "consider adding an explicit
check … so a genuinely empty journal produces the same actionable OK/ERROR messaging" as an
optional enhancement. This was found unnecessary after empirical verification: the existing orphan
loop (`while IFS= read -r tag; do if [ "$tag" = "$base" ]; ...`) already handles an empty `$tags`
string correctly — every real `.sql` file fails to match the single empty line read from the
here-string, so `orphan_count` becomes correctly non-zero and every affected file is named in the
`ERROR:` output. No additional code was needed to reach the required behavior.

**Verification performed (commands + actual output, run against the isolated fixer worktree at
`/tmp/sv-29-reviewfix-y0qy0Z`, working tree confirmed clean via `git status --porcelain drizzle/`
before and after each probe):**

1. Failure mode reproduced and confirmed fixed — emptied `drizzle/meta/_journal.json` to
   `{"version":"7","dialect":"postgresql","entries":[]}` (the exact reproduction from REVIEW.md),
   ran the script, restored the original file from a scratch backup afterward:
   ```
   $ bash scripts/check-migration-journal-sync.sh
   ERROR: migration journal/SQL parity violation detected (Phase 12 regression class).

   Orphan SQL file(s) — present on disk but missing from drizzle/meta/_journal.json:
     - drizzle/0000_striped_metal_master.sql
     - drizzle/0001_kind_doctor_faustus.sql
     - drizzle/0002_phase8_persistence.sql
     - drizzle/0003_seed_global_params.sql
     - drizzle/0004_phase12_drafts_and_history.sql
     - drizzle/0005_partner_company_name.sql
     - drizzle/0006_workable_yellow_claw.sql

   Remedy: never hand-author a migration file or journal entry. Regenerate with
     npm run db:generate
   so the .sql file and its journal entry are always written together.
   exit=1
   ```
   Before the fix this produced zero output (`exit=1`, no text at all) — confirmed the named,
   actionable error is now emitted instead.

2. Regression check — real repo state (7 migrations, 7 journal entries) still passes:
   ```
   $ bash scripts/check-migration-journal-sync.sh
   OK: 7 migration file(s) checked, 7 journal entrie(s) checked — in sync.
   exit=0
   ```

3. Regression check — orphan `.sql` probe still fails correctly, naming the file
   (`touch drizzle/9999_zz_orphan_probe.sql`, then removed):
   ```
   ERROR: migration journal/SQL parity violation detected (Phase 12 regression class).

   Orphan SQL file(s) — present on disk but missing from drizzle/meta/_journal.json:
     - drizzle/9999_zz_orphan_probe.sql
   ...
   exit=1
   ```

4. Regression check — dangling journal entry probe still fails correctly, naming the tag
   (added a synthetic `9999_zz_dangling_probe` entry via a Node script, then restored the
   original journal from a scratch backup):
   ```
   ERROR: migration journal/SQL parity violation detected (Phase 12 regression class).

   Dangling journal entrie(s) — present in drizzle/meta/_journal.json but missing .sql file:
     - 9999_zz_dangling_probe
   ...
   exit=1
   ```

5. `git status --porcelain drizzle/` returned empty after every probe (working tree restored
   cleanly each time) and returned empty overall except for the single intended edit to
   `scripts/check-migration-journal-sync.sh`.

6. Required npm scripts, all passing:
   ```
   $ npm run check:migration-journal-sync
   OK: 7 migration file(s) checked, 7 journal entrie(s) checked — in sync.

   $ npm run check:db-smoke-filter
   OK: 2 pattern(s) validated (extraction, no dead patterns, full coverage, future-migration coverage).

   $ npm run lint:check
   (no output, exit 0)
   ```
   (`npm run lint:check` required a temporary `node_modules` symlink into the isolated worktree,
   since git worktrees don't carry over untracked directories from the main checkout; the symlink
   was removed before committing and never staged.)

7. `bash -n scripts/check-migration-journal-sync.sh` — syntax OK (Tier 2 verification).

## Deferred (out of scope for this run)

`fix_scope` for this run is `critical_warning`; the following Info-severity findings from
REVIEW.md were left untouched by design and require a future `fix_scope: all` run or manual fix:

- **IN-01** — `scripts/check-local-db-branch.sh:51` — hostname extraction assumes
  `DATABASE_URL` always contains a `user:pass@` segment; misleading (but fail-closed, non-exploitable)
  error message if it doesn't.
- **IN-02** — `scripts/check-local-db-branch.sh:58-85` — `case` host classification uses a
  prefix wildcard rather than the full expected hostname suffix; low-risk since this is a
  local-only, non-adversarial-input script.

## Skipped Issues

None — the one in-scope finding (WR-01) was fixed successfully.

---

_Fixed: 2026-08-31T17:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
