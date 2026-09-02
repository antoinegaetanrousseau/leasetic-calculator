---
status: complete
phase: 29-migration-safety-net
source:
  - 29-01-SUMMARY.md
  - 29-02-SUMMARY.md
started: 2026-09-01T22:57:00+02:00
updated: 2026-09-01T23:40:00+02:00
---

## Current Test

[testing complete]

## Tests

### 1. Local DB branch guard names the development branch
expected: `npm run check:local-db-branch` exits 0, names the development-branch endpoint, and leaks no credential in its output.
requirement: INFRA-05
result: pass

### 2. App runs against the development branch, not production
expected: Start the dev server and open an authed page (e.g. /proposals). It loads with data. That data comes from the Neon development branch — so it may look stale or differ from production (the branch was forked from main on 2026-05-27 and accepted as test data). Nothing you do locally touches production.
requirement: INFRA-05
result: pass

### 3. Journal-parity guard catches an orphaned migration
expected: |
  This is the actual Phase 12 regression detector. Create a throwaway migration with no journal entry:

      touch drizzle/9999_orphan_probe.sql
      npm run check:migration-journal-sync

  It exits NON-ZERO and prints an actionable message naming the orphaned file. Then delete it:

      rm drizzle/9999_orphan_probe.sql
      npm run check:migration-journal-sync

  Now exits 0.
requirement: INFRA-06
result: pass
evidence: "Orphan probe reproduced live — guard exited non-zero naming drizzle/9999_orphan_probe.sql with the db:generate remedy; after cleanup, 8 migrations / 8 journal entries in sync."

### 4. Anti-rot guard covers today's migrations including Phase 30's
expected: `npm run check:db-smoke-filter` exits 0 and confirms the ci.yml `schema:` paths-filter matches every real migration file — including `drizzle/0007_phase30_crm_registry.sql` — plus a synthetic future migration path. No pattern is reported dead.
requirement: INFRA-06
result: pass
evidence: "check:db-smoke-filter exited 0 — 2 patterns validated (drizzle/*.sql, drizzle/meta/_journal.json); extraction, no dead patterns, full coverage, future-migration coverage all confirmed."

### 5. db-smoke filter fires on a migration-only change
expected: The corrected filter in `.github/workflows/ci.yml` is `drizzle/*.sql` (not the dead `drizzle/migrations/*.sql`). A PR touching only a `.sql` migration triggers the db-smoke job, and the journal-parity step runs inside it BEFORE any ephemeral Neon branch is created — so an orphaned migration fails in seconds without consuming a free-tier branch slot.
requirement: INFRA-06
result: pass

### 6. Migration-gates scenario matrix is documented
expected: `docs/operations/neon-branch-routing.md` contains a `## Migration gates (INFRA-06)` section with a 4-row scenario matrix, and restates Phase 20's locked rule 3 verbatim (migrations fan out only via `db-migrate.yml`, never `npm run db:migrate` against a real branch). The original `## Locked rules` list is untouched.
requirement: INFRA-06
result: pass

### 7. Credential-hygiene gap is closed
expected: |
  Run `git status`. The backup file `.env.local.bak.20260831` left behind by the branch repoint does NOT appear as untracked — `.gitignore` now carries `.env.local.bak*`, so it can no longer slip into history via `git add -A`.
requirement: INFRA-05
result: pass
evidence: "git status shows no .env.local.bak.20260831 among untracked files."

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Gaps

[none — all 7 tests passed]

## Notes

- **INFRA-04 is not tested here.** Plan 29-01 carried it for traceability with zero work performed — the three-branch Neon split shipped in Phase 20 (INFRA-01, 2026-05-27). Nothing in Phase 29 changed it.
- **ISOLATION-PROBE-29 was skipped by the user** during execution, so INFRA-05's end-to-end write-isolation proof (a local write being invisible in production) remains empirically unverified. Test 2 is a weaker substitute: it confirms the app *reads* from the development branch, not that a local write cannot reach production.
