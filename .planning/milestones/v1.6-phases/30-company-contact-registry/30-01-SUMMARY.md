---
phase: 30-company-contact-registry
plan: 01
subsystem: database
tags: [drizzle, postgres, migrations, crm, generated-column]

# Dependency graph
requires:
  - phase: 06-auth-shell
    provides: users table (Better Auth text id, role/partnerType CHECK constraints)
  - phase: 08-persistence-pdf
    provides: proposals table with the immutable inputs/paramsSnapshot/computed/schemaVersion snapshot triple
provides:
  - companies table (name, versioned STORED-generated name_normalized, nullable UNIQUE siren, CRM-08 external-ref columns)
  - client_relationships table (company_id + owner_id, unique per pair, CRM-02/03/07 indexes)
  - contacts table scoped to client_relationship_id only (CRM-04)
  - proposals.client_relationship_id nullable FK + cursor index (CRM-05, snapshot untouched)
  - users.role widened to accept 'sales' with a guarded Commercial->sales backfill (ROLE-01/03)
  - leasetic_normalize_company_name() versioned IMMUTABLE SQL function
affects: [30-company-contact-registry remaining plans, IMPORT-01..07, ROLE-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Versioned normalization rules live in a pure-SQL IMMUTABLE STRICT function driving a STORED generated column — never in application code"
    - "Legal-form abbreviation handling: delete periods before collapsing non-alnum runs so 'S.A.S.' joins into 'sas' before the space-bounded legal-form regex strips it"

key-files:
  created:
    - drizzle/0007_phase30_crm_registry.sql
    - src/db/schema.test.ts
    - src/lib/db/queries/crm-normalize.integration.test.ts
  modified:
    - src/db/schema.ts
    - drizzle/meta/_journal.json
    - drizzle/meta/0007_snapshot.json
    - src/lib/pdf/no-commission.test.ts

key-decisions:
  - "Periods are deleted (not turned into spaces) before the non-alnum collapse step, so abbreviated legal forms like 'S.A.S.' join into 'sas' and get stripped by the legal-form regex instead of surviving as isolated 's a s' letters — verified against all four spec test cases directly against the dev DB"
  - "0007_phase30_crm_registry.sql added to no-commission.test.ts's KNOWN_MIGRATIONS allowlist after confirming it introduces no commission-related column"

patterns-established:
  - "Company/contact registry split: companies are global facts, client_relationships are private per-owner bindings, contacts hang off the relationship never the company"

requirements-completed: [CRM-01, CRM-04, CRM-05, CRM-08, ROLE-01]

# Metrics
duration: 12min
completed: 2026-09-01
---

# Phase 30 Plan 01: Company & Contact Registry Data Model Summary

**Three new Drizzle tables (companies, client_relationships, contacts) plus a nullable proposals FK, backed by one versioned migration with a hand-authored IMMUTABLE SQL normalization function, generated and applied against the Neon development branch.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-01T09:21:35Z
- **Completed:** 2026-09-01T09:34:09Z
- **Tasks:** 3
- **Files modified:** 8 (1 modified schema.ts, 3 migration artifacts created, 2 test files created, 1 test file modified for allowlist)

## Accomplishments

- `companies`, `client_relationships` and `contacts` declared in `src/db/schema.ts` and shipped as migration `drizzle/0007_phase30_crm_registry.sql`, applied live to the Neon development branch
- `companies.name_normalized` is a STORED generated column driven by a new `leasetic_normalize_company_name()` IMMUTABLE SQL function — normalization rules are versioned in the migration, not in TypeScript
- `proposals.client_relationship_id` added as a nullable FK with zero changes to `inputs`/`paramsSnapshot`/`computed`/`schemaVersion` (verified by grep and by a schema-shape unit test)
- `users_role_check` widened to `IN ('partner', 'admin', 'sales')` with a guarded backfill (`AND role = 'partner'`) so no admin row could be silently promoted or demoted
- Two new test files prove the schema shape (unit, no DB) and the normalization + uniqueness rules (integration, real Postgres, `DATABASE_URL_TEST`-gated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Declare companies, client_relationships, contacts and the proposals FK in schema.ts** - `d76bf69` (feat)
2. **Task 2: [BLOCKING] Generate, hand-complete, journal and apply the migration** - `c5d7580` (feat)
3. **Task 3: Prove the schema shape and the normalization rules with tests** - `145fea7` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/db/schema.ts` - Added companies/clientRelationships/contacts pgTable declarations, proposals.clientRelationshipId FK + index, widened users_role_check, and CompanyRow/ClientRelationshipRow/ContactRow type exports
- `drizzle/0007_phase30_crm_registry.sql` - Versioned DDL: normalization function, three CREATE TABLEs, proposals ALTER, role CHECK re-add, Commercial->sales backfill
- `drizzle/meta/_journal.json` - New entry for `0007_phase30_crm_registry` (renamed from drizzle-kit's auto-generated tag to keep journal/SQL parity)
- `drizzle/meta/0007_snapshot.json` - drizzle-kit's schema snapshot for this migration
- `src/db/schema.test.ts` - Unit test asserting table exports and column-map shape via `getTableColumns`
- `src/lib/db/queries/crm-normalize.integration.test.ts` - Integration test for the normalization function's 4 spec cases plus siren/relationship uniqueness constraints
- `src/lib/pdf/no-commission.test.ts` - Added `0007_phase30_crm_registry.sql` to `KNOWN_MIGRATIONS` after reviewing it for commission-related columns (none found)

## Decisions Made

- **Normalization function periods-deletion fix:** the plan's literal step order (b) accent-strip → (c) collapse all non-alnum runs to a single space → (d) strip legal-form tokens would leave `S.A.S.` as three isolated letters `s a s` after step (c), because each period is its own single-character non-alnum run and gets replaced by a space, breaking the token apart before the legal-form regex can match it as a whole word. Fixed by deleting periods outright (`replace(text, '.', '')`) immediately after the accent-strip and before the general non-alnum collapse, so `S.A.S.` becomes `sas` as a single joined token that the space-bounded legal-form regex correctly strips. Verified directly against the dev DB for all four spec cases (`Dupont Menuiserie SARL` → `dupont menuiserie`, `Éts Léger S.A.S.` → `ets leger`, `  ACME   SA  ` → `acme`, `Société Générale` → `societe generale`) before committing the migration.
- **KNOWN_MIGRATIONS allowlist entry:** `src/lib/pdf/no-commission.test.ts` carries a drizzle-directory guard that fails loud on any migration file not explicitly reviewed and allowlisted (ADMIN-09 commission-invisibility discipline). Reviewed `0007_phase30_crm_registry.sql` line by line — it adds no commission-percentage or financial-parameter column anywhere — and added it to the allowlist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Normalization function periods-deletion fix**
- **Found during:** Task 2 (hand-editing the generated migration SQL)
- **Issue:** The plan's literal recipe (strip accents → collapse all non-alnum runs to a space → remove standalone legal-form tokens) fails on the `Éts Léger S.A.S.` spec case: each period in `S.A.S.` is its own single-character non-alnum run, so step (c) turns it into `s a s` — three isolated single-letter tokens the legal-form regex in step (d) cannot recognize as the word "sas", leaving unremoved letters in the output instead of the expected `ets leger`.
- **Fix:** Added a `replace(text, '.', '')` step immediately after the accent-strip, deleting periods outright (rather than turning them into spaces) so abbreviated forms like `S.A.S.` join into `sas` before the non-alnum collapse and legal-form removal run.
- **Files modified:** `drizzle/0007_phase30_crm_registry.sql` (and validated as a standalone SQL snippet against the dev DB before being baked into the migration)
- **Verification:** Ran all four spec test cases directly against the Neon development branch via a scratch function before finalizing the migration; all four match expected output exactly. Re-confirmed via the committed `crm-normalize.integration.test.ts` (6/6 tests passing against the applied migration).
- **Committed in:** `c5d7580` (Task 2 commit)

**2. [Rule 3 - Blocking] Added migration to no-commission.test.ts allowlist**
- **Found during:** Task 3 (running the full test suite before writing this summary)
- **Issue:** `src/lib/pdf/no-commission.test.ts` maintains a `KNOWN_MIGRATIONS` allowlist that fails any test run when an unreviewed `.sql` file appears in `drizzle/` — this is a deliberate ADMIN-09 commission-invisibility gate, not a bug in the new migration.
- **Fix:** Reviewed `0007_phase30_crm_registry.sql` for any commission-percentage or financial-parameter column (none found — it is CRM/role schema only) and added `'0007_phase30_crm_registry.sql'` to the allowlist with an inline comment recording that review.
- **Files modified:** `src/lib/pdf/no-commission.test.ts`
- **Verification:** `npm test` — full suite green (1220 passed, 10 skipped, 0 failed), no other regressions.
- **Committed in:** `145fea7` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix in the normalization SQL, 1 blocking allowlist update)
**Impact on plan:** Both fixes were necessary for correctness — the first for the normalization function to actually satisfy its own spec's test cases, the second to satisfy a pre-existing security-discipline gate unrelated to this plan's scope. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. The migration was applied to the local Neon development branch only (confirmed via `check:local-db-branch` before and after); production application happens exclusively through `.github/workflows/db-migrate.yml`, not triggered by this plan.

## Next Phase Readiness

- `companies`, `client_relationships` and `contacts` exist in both the Drizzle schema and the live development database — every other Phase 30 plan (query layer, server actions, UI surfaces per `30-UI-SPEC.md`) can now read/write against this data model.
- `proposals.client_relationship_id` is ready for finalization-time wiring (CRM-05) without touching the immutable snapshot triple.
- `users.role` accepts `sales`; ROLE-02 (giving Commercial staff pipeline surfaces) can build directly on the existing `client_relationships.owner_id` FK without further schema work.
- No blockers. `check:migration-journal-sync`, `check:no-drizzle-push`, `check:db-smoke-filter` and `check:local-db-branch` all pass; `npm run db:migrate:dry-run` lists all 8 migrations with no errors.

## Self-Check: PASSED

- FOUND: `src/db/schema.ts` contains `export const companies`, `export const clientRelationships`, `export const contacts`
- FOUND: `drizzle/0007_phase30_crm_registry.sql`
- FOUND: `drizzle/meta/_journal.json` contains tag `0007_phase30_crm_registry`
- FOUND: `drizzle/meta/0007_snapshot.json`
- FOUND: `src/db/schema.test.ts`
- FOUND: `src/lib/db/queries/crm-normalize.integration.test.ts`
- FOUND commit `d76bf69` in `git log --oneline --all`
- FOUND commit `c5d7580` in `git log --oneline --all`
- FOUND commit `145fea7` in `git log --oneline --all`
- CONFIRMED: `npm run typecheck`, `npm run lint:check`, `npm test` (1220 passed / 10 skipped), `npm run check:migration-journal-sync`, `npm run check:no-drizzle-push`, `npm run check:db-smoke-filter`, `npm run check:local-db-branch` all exit 0

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-01*
