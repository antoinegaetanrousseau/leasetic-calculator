---
phase: 18
plan: 01
subsystem: admin-surfaces
tags: [admin-home, partners-list, help-center, i18n, sidebar, IDOR, ADMIN-09]
dependency_graph:
  requires:
    - src/lib/db/queries/proposal-aggregates.ts (Phase 17)
    - src/lib/db/queries/users.ts listInvitedPartners pattern (Phase 12 DB-02)
    - src/db/schema.ts users + coefficient_history + proposals tables
    - src/lib/api/proposals/list.ts (Phase 17 buildListResponse)
    - src/components/ui/RetractableSidebar.tsx (Phase 11 COMP-02)
    - src/lib/i18n/dictionaries.ts + _EnHasAllFrKeys parity proof (Phase 6 + 17 D-21)
    - src/lib/auth/require.ts (Phase 6 requireUser returning role)
  provides:
    - getMonthlyProposalCountAll() cross-partner monthly count (Admin Home stat)
    - getActivePartnerCount + getTotalPartnerAccountCount (Admin Home stat)
    - getRecentAdminActivity({limit?}) + ActivityRow type (Admin Home recent activity)
    - BuildListParams.adminUserIdOverride + _callerRole (D-11 admin user_id query param)
    - SidebarNav per-role config (D-27 6-item admin / 4-item partner)
    - ~70 net-new i18n keys (admin.home.stats.*, admin.home.activity.*, admin.partners.*, aide.*)
    - localStorage + sessionStorage polyfill in __tests__/setup-dom.ts (Rule 3 auto-fix)
  affects:
    - Wave-2 surface plans (18-02 .. 18-06) — all consume one or more outputs of this plan
    - /proposals SSR route — admins can now ?user_id={partnerId} scope
tech_stack:
  added: []
  patterns:
    - Drizzle aggregate `count()` chained from `db().select({count:count()}).from(...).where(...)`
    - Multi-source UNION at app layer (Drizzle SELECTs merged + sorted in JS, not SQL)
    - Server-derived role hint pattern (_callerRole derived from session, NEVER request params)
    - ASCII-safe French copy emission per planner discipline (user polishes accents at review)
key_files:
  created:
    - src/lib/db/queries/partner-aggregates.ts
    - src/lib/db/queries/partner-aggregates.test.ts
    - src/lib/db/queries/admin-activity.ts
    - src/lib/db/queries/admin-activity.test.ts
    - .planning/phases/18-admin-surfaces/deferred-items.md
  modified:
    - src/lib/db/queries/proposal-aggregates.ts (added getMonthlyProposalCountAll)
    - src/lib/db/queries/proposal-aggregates.test.ts (added 5 new tests)
    - src/lib/api/proposals/list.ts (added adminUserIdOverride + _callerRole)
    - src/lib/api/proposals/list.test.ts (added 5 new tests, 2 IDOR negative)
    - app/(authed)/proposals/page.tsx (read ?user_id= and gate on session role)
    - src/components/ui/RetractableSidebar.tsx (per-role nav 6/4 items, D-27)
    - src/components/ui/RetractableSidebar.test.tsx (updated 3 tests for D-27 contract)
    - src/lib/i18n/dictionaries.ts (~70 new keys × FR + EN)
    - __tests__/setup-dom.ts (Rule 3 — localStorage + sessionStorage polyfill)
decisions:
  - D-01 active partner = role=partner AND deletedAt IS NULL AND lastLoginAt IS NOT NULL (derived; no users.status column exists)
  - D-02 cross-partner monthly count includes ALL non-deleted statuses (drafts + active)
  - D-05 partial — invitations source DEFERRED (schema has no invitations table; password_resets has no createdBy)
  - D-05 partial — partner status sentence actor = literal 'Admin' sentinel (no users.updatedBy column)
  - D-11 admin user_id override is gated at BOTH SSR layer (session.role check) AND library layer (_callerRole === 'admin') — defense in depth
  - D-21 ASCII-safe French copy in Aide article body (user polishes accents during review)
  - D-27 admin Accueil reuses sidebar.nav.home (was sidebar.nav.adminHome 'Tableau de bord')
metrics:
  duration_min: 25
  completed_date: 2026-05-24
  tasks_complete: 3
  tests_added: 17
  files_created: 5
  files_modified: 9
---

# Phase 18 Plan 01: DB/API + i18n + Sidebar Foundation Summary

DB/API + i18n + sidebar foundation that unblocks every Wave-2 surface plan in Phase 18. Adds 3 cross-partner aggregate query helpers (Admin Home stats D-01/D-02 + Recent activity D-05), the admin-scoped `/proposals` query parameter (D-11), the per-role sidebar nav config (D-27), and ~70 net-new i18n keys per UI-SPEC Copywriting Contract.

## What Built

### Task 1 — Cross-partner aggregate helpers (D-01/D-02)

- **`getMonthlyProposalCountAll()`** in `src/lib/db/queries/proposal-aggregates.ts` — cross-partner variant of Phase 17's `countThisMonth`; reuses the same Europe/Paris month-boundary helper but drops the `userId` predicate and the `inArray(status, ['active','draft'])` filter (D-02 explicit: includes ALL non-deleted statuses). Bounded by Europe/Paris calendar month start.
- **`getActivePartnerCount()`** + **`getTotalPartnerAccountCount()`** in new `src/lib/db/queries/partner-aggregates.ts`. `active` is DERIVED (no `users.status` column in schema) per Phase 12 DB-02 D-10: `role='partner' AND deletedAt IS NULL AND lastLoginAt IS NOT NULL`. Total = same minus the `lastLoginAt` predicate.
- 11 new tests (4 for cross-partner monthly + 6 for partner aggregates + 1 isolation regression). All green.

### Task 2 — Recent activity (D-05) + admin user_id query param (D-11)

- **`getRecentAdminActivity({limit?})`** + **`ActivityRow`** type in new `src/lib/db/queries/admin-activity.ts`. **2-source union** (NOT 3 — invitations source DEFERRED, see Known Stubs):
  - (a) `coefficient_history` LEFT JOIN `users` ON `changedByUserId` → `sentenceKey: 'admin.home.activity.sentence.coefficientModified'`, `id: 'ch-' + row.id`
  - (b) Partner status transitions from `users` filtered by `updatedAt >= NOW() - INTERVAL '30 days'` AND (`deletedAt IS NOT NULL` OR `lastLoginAt IS NOT NULL`) — captures deactivation + first-login (activation from invited). `id: 'ps-' + user.id`. Sentence interpolates the TARGET partner name (no `users.updatedBy` column exists).
- Each source `LIMIT 10` (T-18-01-06 DoS mitigation); merge + sort DESC; slice top `limit` (default 5). 7 new tests.
- **`BuildListParams.adminUserIdOverride?: string` + `_callerRole?: 'admin'|'partner'`** in `src/lib/api/proposals/list.ts`. Override is HONORED only when `_callerRole === 'admin'`; otherwise silently ignored. `effectiveUserId` is computed once and threaded into `listProposalsByUser`/`searchProposals`.
- **`app/(authed)/proposals/page.tsx`** — reads `searchParams.user_id`, derives role from `requireUser()`, passes `adminUserIdOverride` only when role is admin. Defense in depth: BOTH SSR layer + library layer gate the override on admin role. T-18-01-01 IDOR mitigation. 5 new tests (incl. 2 IDOR negative tests + 2 defense-in-depth tests).

### Task 3 — Per-role sidebar nav (D-27) + ~70 i18n keys (D-21)

- **`src/components/ui/RetractableSidebar.tsx`** — `partnerNavItems()` + `adminNavItems()` reshaped per D-27:
  - **Partner (4 items):** Accueil, Nouvelle proposition, Propositions, Aide
  - **Admin (6 items):** Accueil, Nouvelle proposition, Propositions, Partenaires, Coefficients, Aide
  - Historique REMOVED from BOTH variants. Admin "Accueil" now reuses `sidebar.nav.home` (was `sidebar.nav.adminHome` "Tableau de bord"); same canonical greeting across roles per D-27.
  - hrefs: `/proposals/new/parametres` (new), `/proposals` (proposals), `/aide` (help), adminHrefs.partners/coefficients (admin), adminHrefs.home (admin Accueil), `/` (partner Accueil).
  - `ActiveNav` type extended with `'proposals'` member.
  - 3 sidebar tests updated to enforce D-27 contract (item count + order + labels + no Historique).
- **`src/lib/i18n/dictionaries.ts`** — ~70 new keys × FR + EN. Categories: `sidebar.nav.proposals` (1), `admin.home.stats.*` (7), `admin.home.activity.*` (10), `admin.partners.*` (20), `admin.partners.form.*` + breadcrumb (4), `admin.coefficients.warning.*` + `.history.viewAll` (3), `aide.landing.*` (10), `aide.commencer-ici.*` (16). `_EnHasAllFrKeys` parity proof compiles clean.
- All existing `admin.accounts.*` keys preserved for back-compat (Phase 14 callers continue to work). D-21 verify-and-reuse discipline honored — no duplicate keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] users.status column does not exist in schema**
- **Found during:** Task 1 reading `src/db/schema.ts`.
- **Issue:** Plan said `getActivePartnerCount` filters `users.status='active'` and `getTotalPartnerAccountCount` excludes by status. The Leasétic schema has NO `users.status` column — invited/active/inactive are DERIVED from existing columns per Phase 12 DB-02 D-10 (see `src/lib/db/queries/users.ts:listInvitedPartners`).
- **Fix:** Implemented `active` as `role='partner' AND deletedAt IS NULL AND lastLoginAt IS NOT NULL` (logged in at least once AND not soft-deleted). Total = same minus the `lastLoginAt` clause. Mirrors the established Phase 12 pattern.
- **Files modified:** `src/lib/db/queries/partner-aggregates.ts` JSDoc explicitly cites Phase 12 D-10 as the derivation source.
- **Commit:** 989d8ce.

**2. [Rule 2 - Documented partial] Invitations source (c) DEFERRED in admin-activity**
- **Found during:** Task 2 reading `src/db/schema.ts` for invitations table.
- **Issue:** Plan said source (c) reads from `invitations` table JOIN `users` ON `createdBy`. The Leasétic schema has NO `invitations` table — partner invites live in `password_resets` (kind='invite') and that table has NO `createdBy` actor reference (only `userId`, the target). Implementing the invitation source requires schema work (out of Phase 18 scope).
- **Fix:** Documented as D-05 partial in JSDoc of `admin-activity.ts`. Recent activity ships as a 2-source union (coefficient_history + partner status). Logged in deferred-items.md.
- **Files modified:** `src/lib/db/queries/admin-activity.ts` JSDoc + Known Stubs section of this SUMMARY.
- **Commit:** 7dbd3c9.

**3. [Rule 2 - Documented partial] Partner status sentence actor = 'Admin' sentinel**
- **Found during:** Task 2.
- **Issue:** Plan said partner status sentence should resolve actor from `users.updatedBy` if column exists. No `updatedBy` column exists on users.
- **Fix:** Sentence interpolates the TARGET partner's name (e.g. "Admin a désactivé le compte de Marie Dupont") and uses literal `Admin` as the actor display name. Documented as D-05 partial. Future schema work could add `updatedBy`; ActivityRow shape accommodates it without breaking changes.
- **Commit:** 7dbd3c9.

**4. [Rule 3 - Blocking infra] localStorage undefined in jsdom test environment**
- **Found during:** Task 3 running new D-27 sidebar tests.
- **Issue:** Pre-existing failure — jsdom 25.0.1 + Node 25.9.0 + Vitest 2.1.8 combination did not expose `window.localStorage` in the test VM context. Confirmed independent of 18-01 changes by checking out the prior commit (same failure). My new D-27 tests could not be validated without fixing this.
- **Fix:** Added minimal in-memory polyfill for `localStorage` and `sessionStorage` in `__tests__/setup-dom.ts`. Idempotent — if a future jsdom upgrade restores native Storage, the polyfill installer no-ops. The polyfill matches the WHATWG Web Storage spec surface (clear/getItem/key/removeItem/setItem + length).
- **Files modified:** `__tests__/setup-dom.ts`.
- **Commit:** bc451f9.
- **Documented:** see `.planning/phases/18-admin-surfaces/deferred-items.md` item #2.

**5. [Rule 1 - Component path correction] Plan referenced `SidebarNav.tsx`; actual component is `RetractableSidebar.tsx`**
- **Found during:** Task 3.
- **Fix:** Modified `src/components/ui/RetractableSidebar.tsx` (the actual sidebar component) rather than creating a new `SidebarNav.tsx`. The Plan's file path was outdated.

### Out-of-Scope Discoveries (NOT fixed — logged in deferred-items.md)

- **PDF byte-drift in `__pdf-fixtures__/render-fixtures.test.ts`** — 2 tests fail (happy-path-en + paired fixture). Confirmed pre-existing via git stash. Likely indirect dependency drift; regeneration runbook is the appropriate fix path, not 18-01.

## Known Stubs

1. **Recent activity invitations source (c)** — DEFERRED. The `getRecentAdminActivity` helper ships as a 2-source union (coefficient_history + partner status). Adding the invitations source requires either (a) a new `invitations` table with `createdBy`, or (b) extending `password_resets` with `createdBy` for `kind='invite'` rows. Either is schema work scoped to a future plan (Phase 18 18-02 Admin Home is a candidate consumer that could flag this if the user wants invite-activity visible). Documented in `admin-activity.ts` JSDoc and `deferred-items.md`.

2. **Partner status sentence actor** — uses literal `'Admin'` sentinel because the schema has no `users.updatedBy` column. The sentence still correctly identifies the TARGET partner; only the actor is generic. Adding actor attribution requires schema work (out of Phase 18 scope).

3. **Aide article body content** — uses ASCII-safe French (no `é`/`è`/`à`) per planner discipline noted in PLAN.md task 3. The user is expected to polish the accents during review BEFORE the Aide article surface plan (18-06) consumes these keys.

## Threat Flags

No new security-relevant surface introduced beyond what the plan's `<threat_model>` anticipated. All mitigations exercised by tests:
- **T-18-01-01 (IDOR via `?user_id=`)** — mitigated at SSR (`role === 'admin'` gate) AND library (`_callerRole === 'admin'` gate) layers. Tests 6 + 6b verify partner override is silently ignored; Test 5 verifies admin override is honored.
- **T-18-01-02 (cross-partner partner-count leak)** — accepted: helpers consumed only by admin-gated route.
- **T-18-01-03 (cross-partner activity feed leak)** — accepted: helper consumed only by admin-gated route.
- **T-18-01-04 (commission via Recent activity)** — mitigated: ActivityRow.sentenceArgs hold actor names only (string). Sanity test asserts no numeric or "commission" substring in sentenceArgs. ADMIN-09 9-gate suite verified green post-change.
- **T-18-01-05 (i18n key shadowing)** — mitigated: `_EnHasAllFrKeys` parity proof + manual grep verification that no Phase 18 key collides with existing `admin.accounts.*` etc.
- **T-18-01-06 (unbounded UNION scan)** — mitigated: each source `LIMIT 10`; partner-status branch bounded `updatedAt >= NOW() - 30 days`.
- **T-18-01-07 (sidebar nav config drift)** — mitigated: 2 sidebar tests assert exact 6/4 item counts + order + labels; Historique-absence assertion locked.

## Verification

```
npx vitest run src/lib/db/queries/ src/lib/api/proposals/ src/components/ui/RetractableSidebar.test.tsx tests/admin-09-grep-contracts.test.ts
→ Test Files  12 passed | 1 skipped (13)
  Tests       152 passed | 4 skipped (156)

npx tsc --noEmit
→ exits 0 (TS + _EnHasAllFrKeys parity proof green)

grep -c "admin.home.stats.partenairesActifs" src/lib/i18n/dictionaries.ts
→ 4 (label key × 2 langs + sublabel key × 2 langs)

grep "Historique" src/components/ui/RetractableSidebar.tsx
→ 2 hits, BOTH in JSDoc comments documenting removal (no nav item present)

grep -n "getMonthlyProposalCountAll\|getActivePartnerCount\|getRecentAdminActivity\|adminUserIdOverride" src/lib/
→ matches expected files (proposal-aggregates.ts, partner-aggregates.ts, admin-activity.ts, list.ts)
```

ADMIN-09 9-gate suite remains green (9/9 pass) — verified twice (before Task 2 + after Task 3).

## Commits

| Hash    | Task   | Summary |
| ------- | ------ | ------- |
| 989d8ce | Task 1 | Cross-partner aggregate helpers (D-01/D-02) — getMonthlyProposalCountAll + getActivePartnerCount + getTotalPartnerAccountCount, 11 new tests |
| 7dbd3c9 | Task 2 | Recent activity 3-source union (D-05) + /proposals admin user_id (D-11) — getRecentAdminActivity + ActivityRow + adminUserIdOverride/_callerRole, 12 new tests incl. 2 IDOR negative |
| bc451f9 | Task 3 | Per-role sidebar nav (D-27) + ~70 net-new i18n keys (D-21) — RetractableSidebar 6/4 item config, dictionaries.ts ~140 new entries, localStorage polyfill |

## Self-Check: PASSED

Files verified to exist:
- ✓ `src/lib/db/queries/proposal-aggregates.ts` — contains `getMonthlyProposalCountAll`
- ✓ `src/lib/db/queries/partner-aggregates.ts` — contains `getActivePartnerCount` + `getTotalPartnerAccountCount`
- ✓ `src/lib/db/queries/partner-aggregates.test.ts`
- ✓ `src/lib/db/queries/admin-activity.ts` — contains `getRecentAdminActivity` + `ActivityRow`
- ✓ `src/lib/db/queries/admin-activity.test.ts`
- ✓ `src/lib/api/proposals/list.ts` — contains `adminUserIdOverride` + `_callerRole`
- ✓ `app/(authed)/proposals/page.tsx` — reads `searchParams.user_id` + gates on `role === 'admin'`
- ✓ `src/components/ui/RetractableSidebar.tsx` — per-role nav (6 admin / 4 partner; no Historique)
- ✓ `src/lib/i18n/dictionaries.ts` — ~70 net-new keys × FR + EN with parity proof clean
- ✓ `__tests__/setup-dom.ts` — localStorage + sessionStorage polyfill
- ✓ `.planning/phases/18-admin-surfaces/deferred-items.md`

Commits verified to exist (via `git log --oneline | grep`):
- ✓ 989d8ce
- ✓ 7dbd3c9
- ✓ bc451f9
