---
phase: 30-company-contact-registry
plan: 04
subsystem: database
tags: [drizzle, postgres, crm, cursor-pagination, authorization, integration-test]

# Dependency graph
requires:
  - phase: 30-company-contact-registry (plan 01)
    provides: "companies, client_relationships, contacts tables + proposals.client_relationship_id nullable FK"
  - phase: 30-company-contact-registry (plan 03)
    provides: "Role widened to 'sales'; requireRelationshipHolder() gate; role IN ('partner','sales') predicate convention"
provides:
  - "listClientBook — owner-scoped, cursor-paginated, server-searched/sorted client book (CRM-07)"
  - "getClientRelationshipForOwner / listContactsForRelationship / listProposalsForRelationship — owner-scoped client detail reads (CRM-02, CRM-04, CRM-06)"
  - "listCompaniesForAdmin / listRelationshipsForCompany / getRelationshipForAdmin / listContactsForRelationshipAdmin / listProposalsForRelationshipAdmin — admin-only registry reads with no owner filter (CRM-03)"
  - "Real-Postgres isolation proof (client-relationships.isolation.integration.test.ts) seeding two partners against one shared company + one partner-only company"
affects: [30-company-contact-registry remaining plans (server actions, UI surfaces per 30-UI-SPEC.md), IMPORT-01..07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Owner scoping as a required, non-optional function parameter compiled into WHERE — not an admin-bypassable filter option — so omitting it is a type error, not a data leak (mirrors partners.ts's existing discipline)"
    - "Admin-only registry reads live in a separate query module (companies.ts) from owner-scoped reads (client-relationships.ts) so an accidental unscoped import into a partner page is visible on the import line"
    - "Cursor pagination over an aggregate column (MAX(...) with NULLS LAST) via a HAVING-clause tuple predicate with an explicit empty-string sentinel for the NULL tail, instead of WHERE (which cannot filter on an unaggregated GROUP BY result)"
    - "ADMIN-09 monthly-figure projection: select the whole `computed` jsonb server-side only long enough to project a single named scalar (computedClientMonthly) into the returned row shape; the row type itself never contains `computed` or `params_snapshot`"
    - "SQL introspection test helper that walks a Drizzle condition object for a column's own `.name`, deliberately skipping the `.table` back-reference — without that exclusion the walk 'finds' every sibling column on the table, which would make an owner-predicate assertion pass even after the predicate is deleted"

key-files:
  created:
    - src/lib/db/queries/client-relationships.ts
    - src/lib/db/queries/companies.ts
    - src/lib/db/queries/client-relationships.test.ts
    - src/lib/db/queries/companies.test.ts
    - src/lib/db/queries/client-relationships.isolation.integration.test.ts
  modified:
    - src/lib/db/queries/index.ts

key-decisions:
  - "listProposalsForRelationship scopes ownership via proposals.user_id = ownerId (not a join back to client_relationships.owner_id) — the plan specified this column directly, and it doubles as defense in depth (a proposal's own owner must match even if a relationship id were ever cross-linked)"
  - "Cursor 'k' sentinel: an empty string encodes 'this relationship has zero proposals' (NULL lastActivityAt) — company names are NOT NULL so the sentinel cannot collide with a real value; avoided needing a separate cursor-shape discriminator field"
  - "listRelationshipsForCompany and listCompaniesForAdmin each carry two LEFT JOINs (proposals + contacts, or relationships + proposals) that fan out via a Cartesian product before GROUP BY — correctness is preserved because COUNT(DISTINCT x.id) dedupes by id regardless of the fan-out row multiplication"
  - "Ran the real-Postgres isolation suite against the Neon development branch (same DATABASE_URL already in .env.local, confirmed via check:local-db-branch before running) rather than leaving it unverified — all seeded rows were deleted in afterAll and confirmed absent afterward; DATABASE_URL_TEST is NOT set in .env.local so the suite skips by default in a normal `npm test` run"

patterns-established:
  - "Registry query split enforced structurally: client-relationships.ts (owner required) vs companies.ts (admin, no owner param) — mirrors 30-01's data-model split and gives 30-05+ a compile-time-visible seam for wiring requireRelationshipHolder() vs requireAdmin()"

requirements-completed: [CRM-02, CRM-03, CRM-06, CRM-07]

# Metrics
duration: ~20min
completed: 2026-09-01
---

# Phase 30 Plan 04: Company & Contact Registry Read Layer Summary

**Owner-scoped client-book and client-detail queries (cursor pagination, server-side search/sort) plus a separate admin-only company/relationship registry module, proven cross-tenant-safe by a real-Postgres integration suite run against the Neon dev branch.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-01T10:29:00Z (approx.)
- **Completed:** 2026-09-01T10:49:35Z
- **Tasks:** 3
- **Files modified:** 6 (2 created query modules, 3 created test files, 1 modified barrel)

## Accomplishments

- `listClientBook` — a partner/sales owner's own client book, cursor-paginated over either `company` name or `lastActivity` (MAX(proposals.created_at), NULLS LAST), free-text search on company name + siren via parameterized `ilike()`, `ownerId` a required non-optional parameter compiled into every WHERE clause.
- `getClientRelationshipForOwner` / `listContactsForRelationship` / `listProposalsForRelationship` — the client detail page's three reads, each re-proving ownership in the same SQL statement; `getClientRelationshipForOwner` returns `null` for both "nonexistent" and "not yours" (D-18), verified indistinguishable by the integration suite.
- `listCompaniesForAdmin`, `listRelationshipsForCompany`, `getRelationshipForAdmin`, `listContactsForRelationshipAdmin`, `listProposalsForRelationshipAdmin` — the admin oversight surface, living in its own module (`companies.ts`) with no owner parameter anywhere, proven by both a source-grep and a unit-test suite that no `where` clause ever references `owner_id`.
- ADMIN-09 preserved end-to-end: neither module selects `params_snapshot` or anything from `global_params`; the one client-facing monthly figure is projected as a single scalar (`computedClientMonthly`) out of `computed`, and the raw `computed` object never appears in any returned row shape (grep-verified and unit-tested).
- 48 unit tests (27 + 21) table-driven over every partner-facing/admin function, plus an 8-test real-Postgres integration suite (`client-relationships.isolation.integration.test.ts`) that seeds two partners against a shared company and a partner-only company and proves zero leakage across every read path, including the admin breadth case (CRM-03: both holders visible on the shared company).

## Task Commits

Each task was committed atomically:

1. **Task 1: Owner-scoped client-relationship queries** - `a64a201` (feat)
2. **Task 2: Admin company-registry queries** - `34ecc81` (feat)
3. **Task 3: Prove cross-tenant isolation with unit and real-Postgres tests** - `e12551c` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/lib/db/queries/client-relationships.ts` — owner-scoped registry queries: `listClientBook`, `getClientRelationshipForOwner`, `listContactsForRelationship`, `listProposalsForRelationship`, plus the cursor encode/decode helpers and the `NULLS LAST` HAVING-predicate builders for the two `listClientBook` sort keys.
- `src/lib/db/queries/companies.ts` — admin-only registry queries: `listCompaniesForAdmin`, `getCompanyForAdmin`, `listRelationshipsForCompany`, `getRelationshipForAdmin`, `listContactsForRelationshipAdmin`, `listProposalsForRelationshipAdmin`.
- `src/lib/db/queries/index.ts` — barrel re-exports for both new modules' functions and types.
- `src/lib/db/queries/client-relationships.test.ts` — 27 unit tests: table-driven owner-predicate assertions (with/without q, cursor, each sort key), malformed-cursor handling, LIMIT-without-owner-predicate guard, row-mapping/ADMIN-09 projection tests.
- `src/lib/db/queries/companies.test.ts` — 21 unit tests: table-driven negative assertion (no function filters on `owner_id`), row-mapping tests including the `isInternal`/display-name derivation and the CRM-03 "both relationships visible" case.
- `src/lib/db/queries/client-relationships.isolation.integration.test.ts` — 8 real-Postgres tests, `describe.skipIf(!DATABASE_URL_TEST)`, seeding/cleaning up two users, two companies, three relationships, one contact, one finalized proposal.

## Decisions Made

- **`listProposalsForRelationship` scopes via `proposals.user_id`, not a join to `client_relationships.owner_id`** — this is what the plan's action block specified, and it is genuine defense in depth: even if a relationship id were ever cross-linked to the wrong owner by a future bug, the proposal's own `user_id` still has to match. The unit test suite's table-driven owner-predicate case for this function checks for `user_id`, not `owner_id`, with an explanatory comment so a future reader doesn't "fix" it to match the other three functions.
- **Cursor sentinel for the `lastActivity` sort's NULL tail:** the cursor's `k` field is an empty string when the pivot row had `lastActivityAt = null` (zero proposals). `companies.name` is `NOT NULL`, so this sentinel can never collide with a real cursor value from the `company` sort. This avoided adding a second discriminator field to the cursor payload.
- **Ran the integration suite for real, against the Neon development branch** (confirmed via `npm run check:local-db-branch` before running — NOT production) rather than treating a default skip as sufficient proof. `DATABASE_URL_TEST` is not set in `.env.local`, so a normal `npm test` run skips this suite (matches the plan's stated acceptance criteria); I additionally ran `DATABASE_URL=$DEV_DB_URL DATABASE_URL_TEST=$DEV_DB_URL npx vitest run client-relationships.isolation.integration.test.ts` and confirmed 8/8 pass, then confirmed via a follow-up raw query that all seeded rows (`crm-iso-test-*` users, `*Isolation Co*` companies) were deleted by `afterAll`.
- **Mutation-tested the CRM-02 predicate for real** (per the plan's explicit instruction, not skipped as a formality): temporarily deleted `eq(schema.clientRelationships.ownerId, ownerId)` from `listContactsForRelationship`, re-ran the unit suite, confirmed exactly one test went red (`'listContactsForRelationship'` in the table-driven owner-predicate describe block, `expected false to be true`), then restored the line and reconfirmed 27/27 green. See "Issues Encountered" below for a related discovery made during this same verification pass.
- **Test-helper `sqlReferencesColumn` deliberately skips the `.table` key** while walking a Drizzle condition object. Without this exclusion, the helper would find `owner_id` merely because the predicate touches ANY column on `client_relationships` (Drizzle Column objects carry a back-reference to their owning Table, which enumerates all sibling columns) — this was caught live (see Issues Encountered) and would have made the CRM-03 negative assertions in `companies.test.ts` permanently pass regardless of the actual predicate, defeating the whole point of the mutation-test requirement.

## Deviations from Plan

None — plan executed as written. Two implementation-detail discoveries were made and resolved during Task 3 test-authoring (documented below as "Issues Encountered" rather than deviations, since they were self-corrections within the test-writing process itself, not changes to the plan's specified query behavior).

## Issues Encountered

**1. Test-helper false positive from Drizzle's Column→Table back-reference.** While writing `companies.test.ts`'s negative assertion ("no function filters on `owner_id`"), the first version of `sqlReferencesColumn` recursively walked into a Column object's `.table` property and — because Table objects enumerate every column they own — reported `owner_id` as "found" on predicates that only reference `client_relationships.id` or `.companyId`. This surfaced immediately as two false-failing tests (`listRelationshipsForCompany`, `getRelationshipForAdmin`) that should have passed. Root-caused via a standalone Node script inspecting `eq(table.column, value)`'s object shape (confirmed `column.table === table`, and that table enumerates all sibling columns). Fixed by excluding the `table` key from the recursive walk in both `client-relationships.test.ts` and `companies.test.ts`. Re-ran the mutation test after this fix to confirm the helper is now discriminating (see Decisions Made) — without the fix, the mutation test would have stayed green even with the predicate deleted.

**2. Circular-reference crash in an early assertion.** An early draft of the "excludes soft-deleted proposals" test used `JSON.stringify(whereCall.payload)` to check for the literal string `'deleted'`, which threw `Converting circular structure to JSON` (Drizzle's `PgTable` ↔ `PgColumn` back-reference). Replaced with a purpose-built `sqlReferencesValue` walker (same `seen`-set-guarded recursive-walk pattern, checking `.value` instead of `.name`) that never touches `JSON.stringify`.

Both were caught and fixed before any commit — no red commits exist in the history for this plan.

## User Setup Required

None — no external service configuration required. The integration suite was run manually against the existing Neon development branch as part of this plan's own verification (see Decisions Made); no new environment variable is required for the normal `npm test` path, which skips it by design.

## Next Phase Readiness

- The full read layer CRM-02/03/04/06/07 depend on is in place and barrel-exported from `@/lib/db/queries` — the next plan (server actions + UI wiring per `30-UI-SPEC.md`) can import `listClientBook`, `getClientRelationshipForOwner`, `listContactsForRelationship`, `listProposalsForRelationship` for the partner-facing `/clients` tree, and `listCompaniesForAdmin`/`listRelationshipsForCompany`/`getRelationshipForAdmin`/`listContactsForRelationshipAdmin`/`listProposalsForRelationshipAdmin` for the admin `/[adminSegment]/companies` tree, without any further query-layer work.
- `getClientRelationshipForOwner`'s `null` return is ready to be wired to `notFound()` on the `/clients/[id]` page exactly as D-18 requires — no additional mapping logic needed.
- No blockers. `npm run typecheck`, `npm run lint:check`, `npm test` (1312 passed / 18 skipped — up from the 1264/10 baseline by the 48 new unit tests + 8 new skip-by-default integration tests), `npm run check:no-drizzle-push`, and `npm run check:migration-journal-sync` all exit 0. The real-Postgres isolation suite was additionally run to completion against the Neon dev branch (8/8 pass, no leftover rows).

## Self-Check: PASSED

- FOUND: `src/lib/db/queries/client-relationships.ts` contains `listClientBook` (387 lines, ≥200 required)
- FOUND: `src/lib/db/queries/companies.ts` contains `listRelationshipsForCompany` (345 lines)
- FOUND: `src/lib/db/queries/client-relationships.isolation.integration.test.ts` contains `describe.skipIf`
- FOUND: `src/lib/db/queries/index.ts` re-exports `listClientBook`, `getClientRelationshipForOwner`, `listCompaniesForAdmin`, `listRelationshipsForCompany`
- CONFIRMED: `grep -nE "ownerId\?|ownerId *=|allOwners|includeAll" src/lib/db/queries/client-relationships.ts` — no matches
- CONFIRMED: `grep -nE "args\.ownerId|eq\(schema\.clientRelationships\.ownerId" src/lib/db/queries/companies.ts` — no matches
- CONFIRMED: `grep -rniE "params_snapshot|global_params" src/lib/db/queries/client-relationships.ts src/lib/db/queries/companies.ts` — matches only on comment lines
- FOUND commit `a64a201` in `git log --oneline --all`
- FOUND commit `34ecc81` in `git log --oneline --all`
- FOUND commit `e12551c` in `git log --oneline --all`
- CONFIRMED: `npm run typecheck`, `npm run lint:check`, `npm test` (1312 passed / 18 skipped), `npm run check:no-drizzle-push`, `npm run check:migration-journal-sync` all exit 0
- CONFIRMED: `DATABASE_URL=$DEV_DB_URL DATABASE_URL_TEST=$DEV_DB_URL npx vitest run src/lib/db/queries/client-relationships.isolation.integration.test.ts` — 8/8 pass against the Neon development branch; post-run query confirmed zero leftover `crm-iso-test-*` users or `*Isolation Co*` companies

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-01*
