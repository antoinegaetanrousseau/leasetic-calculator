---
phase: 30-company-contact-registry
verified: 2026-09-02T00:30:00Z
status: passed
score: 11/11 requirements verified (8/9 plans formally closed; 30-09 code landed and verified directly, plan formally open)
overrides_applied: 0
notes:
  - "Plan 30-09 (autonomous: false) has no SUMMARY.md — it is parked at a blocking human-verify checkpoint (Task 3). Its Task 1/2 code IS landed (commits 8d2f06b, e86aec4) and was verified directly against source + live tests in this pass, not against a summary's claims. 30-UAT.md test 7 (the parked checkpoint's own subject) is recorded as result: pass, user-confirmed 'prior session (2026-09-02)', but no formal /gsd resume ('approved') closed the plan and no 30-09-SUMMARY.md exists. This is a process/paperwork gap, not a functional one — see Gaps Summary."
  - "30-UAT.md frontmatter status is still 'testing' (not 'approved'/'complete'), and its 'Current Test' block is stale (parked at test 2, pre-dating the later test entries which all show result: pass). The document's own Summary counts (passed 8 / issues 3 / pending 4) do not reconcile with the 13 itemized per-test results (12 pass + 1 fixed issue). Recorded as a documentation-quality gap, not re-litigated as a new functional finding."
  - "Known, pre-documented gap (deferred-items.md): app/(authed)/proposals/[id]/page.tsx has no admin bypass, so an admin clicking through from the new admin relationship-detail page to a full proposal detail 404s. Confirmed still true in code. Assessed below as non-blocking to CRM-03 (relationship-level summary — LC ref, amount, date, status, counts — is fully visible on the admin surfaces this phase ships; only the full detail page is unreachable, and this is an existing characteristic of the pre-Phase-30 admin flow, not a regression introduced here)."
---

# Phase 30: Company & Contact Registry — Verification Report

**Phase Goal:** Client data has its own life — a shared company registry with private per-partner relationships and contacts — and a `sales` role exists so internal Commercial users hold relationships exactly as partners do.
**Verified:** 2026-09-02T00:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria, merged with plan must-haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A company record exists independent of any proposal, identified by an optional SIREN (nullable UNIQUE) and a versioned `name_normalized` column; two proposals can link to the same company | VERIFIED | `src/db/schema.ts:366-395`; `drizzle/0007_phase30_crm_registry.sql` — `CREATE OR REPLACE FUNCTION leasetic_normalize_company_name(...)` (IMMUTABLE STRICT SQL) precedes `CREATE TABLE "companies"`, `name_normalized` is `GENERATED ALWAYS AS (...) STORED`; live integration test `crm-normalize.integration.test.ts` (6/6 pass, re-run against Neon dev branch in this pass) proves all 4 spec cases including `"Société Générale" → "societe generale"` (SA never stripped as substring) |
| 2 | A partner opens a client and sees every proposal they made for that client on one page; a different partner with a relationship on the same company sees only their own relationship — never the other's contacts, notes, or proposals | VERIFIED | `app/(authed)/clients/[id]/page.tsx:56-70` (auth-first, `getClientRelationshipForOwner` null→404 before any contact/proposal fetch); `src/lib/db/queries/client-relationships.ts` every export takes required `ownerId` compiled into WHERE; live isolation integration test `client-relationships.isolation.integration.test.ts` (8/8 pass, re-run against Neon dev branch in this pass) directly proves cross-tenant non-leakage including CRM-04 contact isolation |
| 3 | An admin viewing a company sees every relationship attached to it, including which partner (or sales/house owner) holds each one | VERIFIED | `src/lib/db/queries/companies.ts:185-236` `listRelationshipsForCompany` — no `ownerId` param, joins `users` for `ownerDisplayName`/`isInternal`; `app/(admin)/[adminSegment]/companies/[id]/relations/[relationshipId]/page.tsx:56-66` gated by `requireAdmin()` |
| 4 | A contact (name, role, phone, email) is created/edited on a relationship, not the company, and is invisible to anyone but that relationship's owner or an admin | VERIFIED | `src/db/schema.ts:418-438` `contacts` has no `companyId` column (structural test `src/db/schema.test.ts`); `src/lib/crm/actions.ts:173-232` (`createContactAction` — TOCTOU closed via `INSERT...SELECT`, ownership proven inside the write) |
| 5 | A user with the new `sales` role logs in, holds client relationships, and reaches the same pipeline/client-book surfaces a partner reaches — zero change to existing `partner`/`admin` access, ADMIN-09 envelope intact | VERIFIED | `src/lib/auth/require.ts:106-112` `requireRelationshipHolder()` admits `partner`+`sales`, refuses `admin`; six widened predicates use `inArray(['partner','sales'])` (`partners.ts:167`, `users.ts:66,137`, `partner-aggregates.ts:51,75`, `admin-activity.ts:127`) confirmed by grep — zero remaining `eq(users.role,'partner')`/`role === 'partner'` equality checks anywhere in `app/`/`src/`; `tests/admin-09-grep-contracts.test.ts` 19/19 pass |
| 6 (CRM-05, plan-level) | `finalizeDraft`'s UPDATE set-object contains no `inputs` key; `client_relationship_id` is additive-only | VERIFIED | `src/lib/db/queries/proposals.ts:751-764` — `.set({...})` object enumerated: `status, lcRef, idempotencyKey, paramsSnapshot, computed, pdfBlobKey, pdfSha256, pdfSizeBytes, pdfGeneratedAt` — no `inputs`, no `clientRelationshipId` key; `createDraft` (`proposals.ts:620-634`) is the sole write site for the FK (`CreateDraftArgs.clientRelationshipId?: string` at line 523); single mint-path write confirmed by repo-wide grep of `clientRelationshipId` under `app/(authed)/proposals/` and `src/lib/api/proposals/` |
| 7 (CRM-02, inference property) | `ownerId` is a required, non-defaulted parameter compiled into every WHERE in the partner-facing module; the admin module has no owner filter; no forged query param reaches a query call | VERIFIED | `src/lib/db/queries/client-relationships.ts` header comment + every exported function signature requires `ownerId`; `src/lib/db/queries/companies.ts` header comment states "No function here takes an `ownerId` filter" — confirmed true by reading all 6 exports; `app/(authed)/clients/page.tsx:51-55,67-74` — no `?ownerId=`/`?user_id=` search param read, `ownerId` sourced only from `session.user.id` |
| 8 (ROLE-01/03 completeness) | No remaining `role === 'partner'` equality check or `eq(users.role,'partner')` predicate that should have been widened | VERIFIED | Exhaustive grep across `app/` and `src/` for `role === 'partner'`, `role !== 'partner'`, `eq(schema.users.role, 'partner')`, `eq(users.role, 'partner')` → zero matches. All narrowing checks found use `!== 'admin'`/`=== 'admin'`/`isInternal: role === 'sales'` (correct, not a missed-widening pattern) |
| 9 (CRM-08) | Columns exist and are genuinely unused | VERIFIED | Exist: `src/db/schema.ts:373-376,428-429` (`contractToolCustomerId`, `syncedAt`×2, `hubspotCompanyId`, `hubspotContactId`) + partial unique indexes `companies_hubspot_company_id_uq`/`contacts_hubspot_contact_id_uq`. Unused: grep for these identifiers across `app/`+`src/` (excluding `.test.` files) returns matches ONLY inside `src/db/schema.ts` itself — no consumer reads or writes them |

**Score:** 9/9 top-level truths verified (all ROADMAP success criteria + the four explicitly-requested deep-dive properties)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | companies/clientRelationships/contacts tables, proposals FK, widened role CHECK | VERIFIED | All three tables declared (:366,396,418); `IN ('partner', 'admin', 'sales')` at :74; `clientRelationshipId` on proposals at :257 |
| `drizzle/0007_phase30_crm_registry.sql` | Versioned DDL, normalization function, CHECK widening, backfill | VERIFIED | Function precedes table; CHECK re-add precedes guarded backfill (`AND "role" = 'partner'`); no `inputs`/`params_snapshot`/`computed` token present |
| `drizzle/meta/_journal.json` | Journal parity | VERIFIED | `npm run check:migration-journal-sync` → "OK: 8 migration file(s) checked, 8 journal entrie(s) checked — in sync." (re-run) |
| `src/lib/auth/require.ts` | `requireUser`/`requireAdmin`/`requireRelationshipHolder` | VERIFIED | All three gates present, role allowlist fail-closed to `partner` (:68-74) |
| `src/lib/db/queries/client-relationships.ts` | Owner-scoped registry queries (387 lines) | VERIFIED | Every export requires `ownerId`; live isolation test passes against real Postgres |
| `src/lib/db/queries/companies.ts` | Admin-only company/relationship queries (345 lines) | VERIFIED | No `ownerId` param on any export; imported only via `src/lib/db/queries/index.ts` barrel and consumed by the 3 admin `companies` routes — not orphaned |
| `src/lib/crm/actions.ts` | create-client + contact CRUD server actions | VERIFIED | `requireRelationshipHolder()` first in all 4 exports; single `BOUNDED_ERROR` key; TOCTOU fix present (`INSERT...SELECT`, :193-210) |
| `src/lib/crm/schemas.ts` | Zod validation | VERIFIED | Exists, imported by `actions.ts` |
| `app/(authed)/proposals/new/parametres/page.tsx` | ownership-validated `?clientRelationshipId=` handling | VERIFIED | `getClientRelationshipForOwner` call at :138, silent-degrade on null (no `notFound()`/throw on that branch, confirmed by grep) |
| `src/components/ui/AppSidebar.tsx` | Clients nav entry, role-aware | VERIFIED | `partnerNavItems(isAdmin)` omits Clients for admins (fixed post-summary in `ca75c9d`, regression-tested) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/db/schema.ts` | `drizzle/0007_phase30_crm_registry.sql` | `npm run db:generate` | WIRED | Journal/SQL parity confirmed live |
| `companies.name_normalized` | `leasetic_normalize_company_name()` | `GENERATED ALWAYS AS ... STORED` | WIRED | Confirmed both in migration SQL and live integration test |
| `proposals.client_relationship_id` | `client_relationships.id` | nullable FK, ON DELETE SET NULL | WIRED | `schema.ts:257-258`; migration `ALTER TABLE "proposals" ADD CONSTRAINT ... ON DELETE set null` |
| `app/(authed)/proposals/new/parametres/page.tsx` | `proposals.client_relationship_id` | `createDraft({ ..., clientRelationshipId })` | WIRED | Single write path confirmed by grep; `finalize-wizard.test.ts` end-to-end deep-equal assertion on `inputs` |
| `finalizeDraft` | `proposals.inputs` | UPDATE set-object must not contain an `inputs` key | WIRED (invariant held) | `proposals.ts:751-764` set-object enumerated directly — no `inputs` key present |
| `/clients/[id]` | `client-relationships.ts` queries | `requireRelationshipHolder()` → `getClientRelationshipForOwner` → notFound() on null | WIRED | Auth precedes all data access; confirmed order in source |
| `/[adminSegment]/companies/...` | `companies.ts` queries | `requireAdmin()` → no owner filter | WIRED | Confirmed order in source; barrel-imported, actually consumed (not orphaned) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `app/(authed)/clients/page.tsx` | `rows`, `nextCursor` | `listClientBook({ ownerId: session.user.id, ... })` — real join against `clientRelationships`/`companies`/`proposals` | Yes (verified live against Neon dev branch) | FLOWING |
| `app/(admin)/[adminSegment]/companies/page.tsx` | `rows`, `nextCursor` | `listCompaniesForAdmin({...})` — real aggregate query, no static fallback | Yes | FLOWING |
| `app/(admin)/.../relations/[relationshipId]/page.tsx` | `relationship`, `contacts`, `proposals` | `getRelationshipForAdmin` / `listContactsForRelationshipAdmin` / `listProposalsForRelationshipAdmin` | Yes | FLOWING |
| `app/(authed)/clients/[id]/page.tsx` | `relationship`, `contacts`, `proposals` | `getClientRelationshipForOwner` / `listContactsForRelationship` / `listProposalsForRelationship` | Yes | FLOWING |

### Behavioral Spot-Checks / Live Integration Tests (re-run in this verification pass)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Normalization function produces spec-correct output against real Postgres | `DATABASE_URL_TEST=<dev-branch> npx vitest run src/lib/db/queries/crm-normalize.integration.test.ts` | 6/6 passed | PASS |
| Cross-tenant isolation holds against real Postgres (CRM-02/03/04) | `DATABASE_URL_TEST=<dev-branch> npx vitest run src/lib/db/queries/client-relationships.isolation.integration.test.ts` | 8/8 passed | PASS |
| Full unit/component suite | `npm test` | 1437 passed / 18 skipped / 0 failed (111/114 files) | PASS |
| Typecheck | `npm run typecheck` | exit 0 | PASS |
| Lint (zero-warning) | `npm run lint:check` | exit 0 | PASS |
| Migration↔journal parity | `npm run check:migration-journal-sync` | "8/8 in sync" | PASS |
| `drizzle-kit push` ban | `npm run check:no-drizzle-push` | exit 0 | PASS |
| DB smoke filter | `npm run check:db-smoke-filter` | exit 0 | PASS |
| Vercel-only import ban | `npm run check:no-vercel-imports` | exit 0 | PASS |
| Local DB branch safety | `npm run check:local-db-branch` | confirmed dev branch (`ep-polished-band-...`) | PASS |
| Production build | `npm run build` | succeeded; all Phase 30 routes present (`/clients`, `/clients/[id]`, `/[adminSegment]/companies`, `/[adminSegment]/companies/[id]`, `.../relations/[relationshipId]`); `.next/standalone/server.js` exists | PASS |
| ADMIN-09 commission-invisibility grep contracts | `npx vitest run tests/admin-09-grep-contracts.test.ts` | 19/19 passed | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| CRM-01 | 30-01, 30-06 | Company registry, versioned `name_normalized`, nullable UNIQUE `siren` | SATISFIED | `drizzle/0007_phase30_crm_registry.sql:8-27`; `src/db/schema.ts:366-395`; live normalization test 6/6 |
| CRM-02 | 30-01,04,05,06,07 | Private per-partner relationships, no inference | SATISFIED | `client-relationships.ts` header contract + every export; live isolation test 8/8; `actions.ts` bounded-error/silent-dedup |
| CRM-03 | 30-03, 30-08 | Admin sees every relationship + holder identity | SATISFIED | `companies.ts:185-236`; `relations/[relationshipId]/page.tsx:56-66` |
| CRM-04 | 30-01, 30-05, 30-07 | Contact belongs to relationship, not company | SATISFIED | `schema.ts:418-438` (no `companyId`); `schema.test.ts` structural assertion |
| CRM-05 | 30-01, 30-09 | Proposal FK, `inputs` byte-identical | SATISFIED | `proposals.ts:751-764` set-object has no `inputs`/`clientRelationshipId` key; `finalize-wizard.test.ts` end-to-end deep-equal; landed via `8d2f06b`/`e86aec4` |
| CRM-06 | 30-04, 30-07, 30-09 | Every proposal for a client on one page | SATISFIED | `listProposalsForRelationship` (`client-relationships.ts:355-387`) filters on `clientRelationshipId` AND `userId` (defense in depth) |
| CRM-07 | 30-02, 30-04, 30-06 | Browse/search own client book | SATISFIED | `listClientBook` cursor+search+sort, owner-scoped; `/clients` page |
| CRM-08 | 30-01 | External-reference columns, unused | SATISFIED | Columns exist (`schema.ts:373-376,428-429`); zero consumers outside `schema.ts` (grep-confirmed) |
| ROLE-01 | 30-01, 30-03 | `sales` role + CHECK + every gate | SATISFIED | CHECK widened; `require.ts` allowlist; grep for stale `'partner'`-only checks → zero |
| ROLE-02 | 30-02, 30-03, 30-06 | Commercial users hold relationships as partners do | SATISFIED | `requireRelationshipHolder()` admits `sales`; `AppSidebar` gives `sales` identical nav (by construction, no role branch); `require.test.ts:187-190` |
| ROLE-03 | 30-03 | Existing access unchanged, ADMIN-09 intact | SATISFIED | Six `inArray(['partner','sales'])` widenings (grep-confirmed exhaustive); `admin-09-grep-contracts.test.ts` 19/19 |

No orphaned requirements — every CRM-*/ROLE-* id in REQUIREMENTS.md's Phase 30 mapping appears in at least one plan's `requirements` frontmatter.

### Anti-Patterns Found

None of severity blocker or warning. Scanned all Phase-30-touched files (`src/db/schema.ts`, `drizzle/0007_*.sql`, `src/lib/auth/require.ts`, `src/lib/db/queries/client-relationships.ts`, `src/lib/db/queries/companies.ts`, `src/lib/db/queries/proposals.ts`, `src/lib/crm/actions.ts`, `src/lib/crm/schemas.ts`, `app/(authed)/proposals/new/parametres/page.tsx`, `src/components/ui/AppSidebar.tsx`, all of `app/(authed)/clients/**` and `app/(admin)/[adminSegment]/companies/**`) for `TODO|FIXME|XXX|TBD|placeholder|coming soon|not yet implemented` — the only hits are a legitimate SIREN-formatting comment (`"XXX XXX XXX"` literal display format) and ordinary HTML `placeholder=` input-hint props, none of which represent stub/incomplete code.

No orphaned exports: `companies.ts`'s admin-only functions are consumed via the `src/lib/db/queries/index.ts` barrel by the three admin `companies` routes (initially appeared unconsumed on a direct-path grep; resolved by checking the barrel re-export).

## Deep-Dive Findings (per orchestrator's specific asks)

1. **CRM-05 invariant, directly:** `finalizeDraft`'s `.set({...})` object (`src/lib/db/queries/proposals.ts:751-764`) contains exactly `status, lcRef, idempotencyKey, paramsSnapshot, computed, pdfBlobKey, pdfSha256, pdfSizeBytes, pdfGeneratedAt` — no `inputs` key, no `clientRelationshipId` key. `client_relationship_id` is set exactly once, at `createDraft` insert time (`:620-634`), and never touched again by `updateDraft` or `finalizeDraft`. Confirmed additive-only.

2. **CRM-02 as an inference property:** `client-relationships.ts`'s module header states the contract explicitly and every one of its 5 exported functions (`listClientBook`, `getClientRelationshipForOwner`, `listContactsForRelationship`, `listProposalsForRelationship`) takes `ownerId` as a required, non-optional parameter compiled directly into the SQL WHERE clause — verified by reading each function body, not just the header comment. `companies.ts` (the admin module) has zero `ownerId` parameters on any of its 6 exports — verified the same way. `/clients` and `/clients/[id]` pages read no `?ownerId=`/`?user_id=`/`?owner_id=` search param (grep-confirmed). The one place a caller-supplied id crosses into a query (`?clientRelationshipId=` on the wizard mint path) is validated through `getClientRelationshipForOwner(id, session.user.id)` before use, and a `null` result (not-found, not-owned, or malformed — all three collapse identically) degrades silently with no error page, no `notFound()`, no toast.

3. **ROLE-01/03 completeness:** Exhaustive grep for `role === 'partner'`, `role !== 'partner'`, `eq(schema.users.role, 'partner')`, `eq(users.role, 'partner')` across `app/` and `src/` returned zero matches. Every place a role predicate exists uses either the correct narrow `=== 'admin'`/`!== 'admin'` form (unaffected by the role widening) or has been explicitly widened to `inArray(['partner', 'sales'])` at 6 call sites (`partners.ts:167`, `users.ts:66,137`, `partner-aggregates.ts:51,75`, `admin-activity.ts:127`).

4. **CRM-08 both halves:** Columns exist in both `schema.ts` and the applied migration (verified via `\d` semantics through the Drizzle declarations and the SQL file). Genuinely unused: grepping the four column identifiers (`contractToolCustomerId`, `syncedAt`, `hubspotCompanyId`, `hubspotContactId`) across `app/` and `src/` (excluding test files) returns matches only inside `src/db/schema.ts` itself — no query, action, or component reads or writes them.

5. **Anti-patterns:** none found of blocker/warning severity (see above).

## Known Open Items (carried forward, not re-discovered)

- **`/proposals/[id]` has no admin bypass** (documented in `deferred-items.md`). Confirmed still true in code: `app/(authed)/proposals/[id]/page.tsx` gates strictly on `proposal.userId !== session.user.id → notFound()`. **Assessment: does not undermine CRM-03.** The admin relationship-detail page (`.../relations/[relationshipId]/page.tsx`) already renders every field CRM-03 requires (LC ref, amount, date, status, counts, holder identity) without needing the full detail page; only the deeper drill-through breaks, and this is a pre-existing characteristic of the admin `/proposals?user_id=` flow (Phase 18), not a regression introduced by Phase 30. Correctly deferred to Phase 33/34.
- **Plan 30-09 is formally open.** `autonomous: false`, no `30-09-SUMMARY.md`, parked at its `checkpoint:human-verify` Task 3. Its Task 1 and Task 2 code is landed (`8d2f06b`, `e86aec4`) and was independently verified in this pass against source and live tests (see Requirements Coverage CRM-05/CRM-06 above) — it functions correctly. `30-UAT.md` records its own Task 3 subject (test 7, "Proposal started from a client links back to it") as `result: pass`, user-confirmed in a prior session, but the UAT document's frontmatter `status:` remains `testing` (not `approved`), its `Current Test` block is stale, and its `Summary` block's aggregate counts (`passed: 8 / issues: 3 / pending: 4`) do not reconcile against the 13 itemized per-test results (12 `pass` + 1 fixed `issue`) recorded in the same file. This phase's own artifacts (30-SECURITY.md, 30-VALIDATION.md) both explicitly flag this as an open scope note. **This is a paperwork/process-closure gap, not a functional gap** — every piece of code and every automated + live-DB test this verification could run confirms the phase goal is achieved end to end.

## Gaps Summary

No functional gaps found. All 9 ROADMAP success-criteria-derived truths, all 11 requirements (CRM-01..08, ROLE-01..03), and the 5 specifically-requested deep-dive properties are VERIFIED against live code and, where a live database was the only way to prove an invariant (normalization function, cross-tenant isolation), against a real Postgres run on the Neon development branch in this verification pass — not merely against SUMMARY.md prose.

The only items carried into this report are: (a) the pre-documented, non-blocking `/proposals/[id]` admin-bypass gap, already correctly deferred by the phase's own `deferred-items.md`, and (b) the process-closure status of plan 30-09 (code landed and verified, but the plan itself and its UAT document have not been formally marked complete/approved). Neither prevents this phase from being considered functionally complete; (b) is worth closing administratively (write `30-09-SUMMARY.md` and update `30-UAT.md`'s frontmatter/Current-Test/Summary block to match its own itemized results) before the milestone audit, but does not block proceeding to Phase 31, which depends on the schema and query layer — both of which are fully verified.

---

*Verified: 2026-09-02T00:30:00Z*
*Verifier: Claude (gsd-verifier)*
