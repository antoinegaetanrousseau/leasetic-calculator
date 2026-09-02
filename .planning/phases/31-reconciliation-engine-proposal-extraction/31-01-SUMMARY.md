---
phase: 31-reconciliation-engine-proposal-extraction
plan: 01
subsystem: database
tags: [drizzle, postgres, migrations, audit-log, schema]

# Dependency graph
requires:
  - phase: 30-company-contact-registry
    provides: companies/clientRelationships/contacts tables, leasetic_normalize_company_name() SQL function, AuditAction/AuditTargetType union
provides:
  - source provenance column (D-08) on companies, client_relationships, contacts
  - company_pair_decisions table (D-09) with unordered-pair uniqueness (D-10)
  - 7 new AuditAction members + 2 new AuditTargetType members for extraction/merge writes
affects: [31-02, 31-03, 31-04, 31-05, 31-06, 31-07, 31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unordered-pair uniqueness via hand-written CREATE UNIQUE INDEX ... (LEAST(a,b), GREATEST(a,b)) — drizzle-kit cannot generate expression indexes"
    - "Resolution-completeness CHECK constraint (verdict/decided_by/decided_at all-or-nothing) makes a half-written pair resolution structurally impossible"

key-files:
  created:
    - drizzle/0008_phase31_reconciliation.sql
  modified:
    - src/db/schema.ts
    - src/db/schema.test.ts
    - src/lib/db/queries/audit-log.ts
    - drizzle/meta/_journal.json
    - drizzle/meta/0008_snapshot.json
    - src/lib/pdf/no-commission.test.ts

key-decisions:
  - "D-10 pair key refined to an unordered pair of side identity keys (siren:<9 digits> or owner:<ownerId>|name:<name_normalized>), not the literal normalized-name pair, because two candidates matching only on name_normalized share the same name_normalized and would degenerate to (x, x)"
  - "Provenance column (source) scoped to all three tables (companies, client_relationships, contacts), not contacts-only — undoing a bad extraction means deleting the companies and relationships it created too, and adding the column now is one ALTER vs. a migration+backfill with lost information later"
  - "Hand-completion beyond the three plan-named statements: none required — db:generate's output needed only the LEAST/GREATEST unique index, the distinct-sides CHECK, and the partial FIFO index"

patterns-established:
  - "Pair-decision tables with an unordered natural key use LEAST/GREATEST hand-written unique indexes since drizzle-kit cannot generate expression indexes from a schema definition"

requirements-completed: [IMPORT-01, IMPORT-04, IMPORT-05]

# Metrics
duration: ~10min
completed: 2026-09-02
---

# Phase 31 Plan 01: Reconciliation Engine Schema Facts Summary

**Provenance marker on all three CRM tables plus an unordered-pair company_pair_decisions table, keyed on DB-derived side identity keys rather than company ids, enforced by a hand-written LEAST/GREATEST unique index.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-02T10:08:10Z (approx, per STATE.md phase-start timestamp)
- **Completed:** 2026-09-02T10:15:27+02:00
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified) across 4 commits

## Accomplishments
- Added the nullable `source` provenance column (CHECK-constrained to `'proposal_extraction'`/`'hubspot_import'`) to `companies`, `client_relationships` and `contacts`, so a bad bulk import can be surgically undone by deleting rows carrying its source value.
- Added `company_pair_decisions` (Drizzle export `companyPairDecisions`): pending-by-default verdict, FIFO `first_flagged_at`, and a resolution-completeness CHECK that makes a verdict without `decided_by`+`decided_at` structurally impossible.
- Generated, renamed, and hand-completed `drizzle/0008_phase31_reconciliation.sql` with the D-10 unordered-pair unique index (`LEAST`/`GREATEST`), a distinct-sides guard CHECK, and a partial FIFO index — journal parity and `db:check` both green.
- Extended `AuditAction` with 7 Phase 31 members (`company.extract`, `client_relationship.extract`, `contact.extract`, `company_pair.flag`, `company.merge`, `client_relationship.merge`, `company_pair.keep_separate`) and `AuditTargetType` with `'company'`/`'company_pair'`.
- Added 7 new schema-level tests (17 total in `schema.test.ts`), including a source-guard pair that fails loudly if the hand-completed unordered-pair index is ever removed from the migration (spot-verified during execution, then restored).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add provenance column, company_pair_decisions table, Phase 31 audit vocabulary** - `9712a51` (feat)
2. **Task 2 [BLOCKING]: Generate migration, hand-complete unordered-pair index, prove journal parity** - `9f09ed0` (feat)
3. **Task 3: Assert new schema facts in schema.test.ts** - `606efe4` (test)

**Deviation fix commit:** `05c7c78` (fix — registered the new migration in an existing ADMIN-09 guard test, see Deviations below)

_Note: plan metadata commit follows this summary._

## Files Created/Modified
- `src/db/schema.ts` - `source` column + CHECK on 3 CRM tables; `companyPairDecisions` table with 6 named CHECK/index constraints; type exports
- `src/db/schema.test.ts` - Phase 31 describe block: column-shape assertions + migration source guards
- `src/lib/db/queries/audit-log.ts` - 7 new `AuditAction` members, 2 new `AuditTargetType` members
- `drizzle/0008_phase31_reconciliation.sql` - generated + hand-completed migration
- `drizzle/meta/_journal.json` - tag renamed to `0008_phase31_reconciliation`
- `drizzle/meta/0008_snapshot.json` - generated snapshot (unchanged rename, already `0008_*`)
- `src/lib/pdf/no-commission.test.ts` - registered the new migration in the `KNOWN_MIGRATIONS` guard allowlist (Rule 1 auto-fix, see below)

## Decisions Made

**(a) D-10 pair-key refinement.** D-09/D-10 as originally stated key the flagged pair on "the normalized-name pair." Taken literally that key is degenerate for this phase's dominant case: two candidates that "match only on `name_normalized`" have the *same* `name_normalized`, so the pair would collapse to `(x, x)`. The key was refined to an unordered pair of **side identity keys**, each computable before any company row exists:
- `siren:<9 digits>` when the side carries a valid 9-digit SIREN
- `owner:<ownerId>|name:<name_normalized>` when it does not

This preserves every property D-10 asked for (computable pre-write, DB-derived rather than TypeScript-derived, stable across a merge that deletes one company id) while staying non-degenerate. `name_normalized` is still stored as its own column on the table for D-10 lineage/readability, but it is not the uniqueness carrier — `side_a_key`/`side_b_key` are, via the hand-written `LEAST`/`GREATEST` unique index.

**(b) Open Question 4 resolution — provenance scope.** The `source` column was added to all three CRM tables (companies, client_relationships, contacts), not contacts-only. D-08's stated purpose is "a bad import cannot be surgically undone." Undoing an extraction means deleting the companies and relationships it created, not only the contacts — a contacts-only column would leave the two harder-to-identify populations (companies, relationships) unmarked. Adding the column now is one `ALTER TABLE ... ADD COLUMN` per table; adding it after the first real import would need a migration *plus* a backfill that no longer has the information to be correct (same precedent as CRM-08's external-reference columns).

**(c) Hand-completion beyond the plan's three named statements.** None was needed. `npm run db:generate` produced exactly the table/column/FK/CHECK/index set expected from the schema in Task 1; the only hand-completions were the three the plan named: the `LEAST`/`GREATEST` unordered-pair unique index, the distinct-sides CHECK, and the partial FIFO-pending index.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Registered the new migration in the ADMIN-09 no-commission drizzle guard**
- **Found during:** Post-task-3 full-suite run (`npx vitest run`)
- **Issue:** `src/lib/pdf/no-commission.test.ts` maintains a `KNOWN_MIGRATIONS` allowlist of every file under `drizzle/*.sql`, asserting no unreviewed migration slips in. Adding `drizzle/0008_phase31_reconciliation.sql` in Task 2 tripped this guard (`Found unanticipated migration(s): 0008_phase31_reconciliation.sql`), a scope-in-bounds regression directly caused by this plan's Task 2 change, not a pre-existing failure.
- **Fix:** Added `'0008_phase31_reconciliation.sql'` to the allowlist with a review comment confirming it adds only the `source` provenance column and `company_pair_decisions` table — no commission-related column.
- **Files modified:** `src/lib/pdf/no-commission.test.ts`
- **Verification:** `npx vitest run src/lib/pdf/no-commission.test.ts` (42/42 pass); full suite `npx vitest run` (1442 passed, 18 skipped, 0 failed)
- **Committed in:** `05c7c78`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug fix)
**Impact on plan:** Necessary to keep the pre-existing ADMIN-09 migration-review guard green; no scope creep — the fix only registers the migration this plan itself introduced.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required. `npm run db:migrate` was deliberately NOT run against any real Neon branch per this plan's constraints; production application happens only via `.github/workflows/db-migrate.yml`.

## Next Phase Readiness
- The two schema facts every downstream Phase 31 plan depends on are in place and verified: `source` provenance on all three CRM tables, and `company_pair_decisions` keyed on unordered side-identity-key pairs.
- `AuditAction`/`AuditTargetType` carry the full Phase 31 vocabulary — plans 02–08 write against this union rather than inventing a parallel one.
- No blockers for 31-02 (or later plans). Journal parity, `db:check`, typecheck, lint, and the full 1442-test suite are all green.

---
*Phase: 31-reconciliation-engine-proposal-extraction*
*Completed: 2026-09-02*

## Self-Check: PASSED

All created/modified files verified present on disk; all 5 commit hashes (`9712a51`, `9f09ed0`, `606efe4`, `05c7c78`, `4e29885`) verified present in git log.
