---
phase: 30-company-contact-registry
plan: 03
subsystem: auth
tags: [drizzle, authorization, rbac, sales-role, admin]

# Dependency graph
requires:
  - phase: 30-company-contact-registry (plan 01)
    provides: "users_role_check widened to IN ('partner','admin','sales') + guarded Commercial->sales backfill"
provides:
  - "Role type widened to 'partner' | 'admin' | 'sales', resolved via a fail-closed allowlist in requireUser()"
  - "requireRelationshipHolder() — the /clients tree gate, admits partner + sales, refuses admin"
  - "Every admin partner-management query (partners.ts, users.ts, partner-aggregates.ts, admin-activity.ts) widened from role='partner' to role IN ('partner','sales')"
  - "PartnerRow.isInternal — access classification derived from role==='sales'"
  - "roleForPartnerType() server-side derivation wired into adminCreateInvitation + adminUpdatePartnerType, guarded against ever demoting an existing admin"
affects: [30-company-contact-registry remaining plans (/clients tree UI, /[adminSegment]/companies UI), ROLE-01, ROLE-02, ROLE-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-closed role resolution: unknown users.role values coerce to the least-privileged role ('partner'), never to 'admin'"
    - "Access-classification columns (role, partnerType) get inline ADMIN-09 comments distinguishing them from rate/commission fields wherever they are newly projected"
    - "partnerType -> role is a single invariant: every write path that sets partnerType also derives and writes role in the same UPDATE, guarded by 'skip when current role is admin'"

key-files:
  created: []
  modified:
    - src/lib/auth/require.ts
    - src/lib/auth/require.test.ts
    - src/lib/api/proposals/list.ts
    - src/lib/db/queries/partners.ts
    - src/lib/db/queries/partners.test.ts
    - src/lib/db/queries/users.ts
    - src/lib/db/queries/users.test.ts
    - src/lib/db/queries/partner-aggregates.ts
    - src/lib/db/queries/partner-aggregates.test.ts
    - src/lib/db/queries/admin-activity.ts
    - src/lib/db/queries/admin-activity.test.ts
    - "app/(admin)/[adminSegment]/partners/PartnersList.test.tsx"
    - tests/admin-09-grep-contracts.test.ts
    - src/lib/admin/actions.ts
    - src/lib/admin/actions.test.ts

key-decisions:
  - "require.test.ts was rewritten wholesale (it already existed from Phase 06-04) rather than left untouched — all 8 pre-existing behaviors (redirect/notFound/role-resolution edge cases) were re-added alongside the 6 new three-role behaviors from this plan, so no coverage was lost in the rewrite."
  - "src/lib/api/proposals/list.ts's _callerRole?: 'admin' | 'partner' type was widened to include 'sales' (out of the plan's files_modified list) — this was a Rule 3 blocking typecheck failure caused directly by widening Role; the admin-scoping check only compares === 'admin', so sales callers behave identically to partner callers with zero behavior change."
  - "Two pre-existing PartnerRow test fixtures (PartnersList.test.tsx, admin-09-grep-contracts.test.ts) needed isInternal: false added after PartnerRow gained the field — Rule 3 blocking fix, not scope creep."

patterns-established:
  - "Regression coverage for widened role predicates uses source-content grep assertions (readFileSync + toContain/not.toMatch) rather than introspecting opaque Drizzle SQL objects through the stub-builder mocks — matches the existing bug_007 pattern in users.test.ts."

requirements-completed: [ROLE-01, ROLE-02, ROLE-03]

# Metrics
duration: 21min
completed: 2026-09-01
---

# Phase 30 Plan 03: Sales Role Wiring Summary

**Three-role auth layer (`partner`/`admin`/`sales`) with a fail-closed allowlist, a new `requireRelationshipHolder()` gate for the `/clients` tree, six admin queries widened from `role='partner'` to `role IN ('partner','sales')` so Commercial accounts stay visible after the Plan 30-01 backfill, and server-side `partnerType -> role` derivation wired into both the invitation and type-change flows with an admin-demotion guard.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-09-01T11:58:00+02:00 (approx.)
- **Completed:** 2026-09-01T12:21:00+02:00
- **Tasks:** 3
- **Files modified:** 15 (2 auth, 1 out-of-scope typecheck fix, 8 query/test files, 2 fixture updates, 2 admin action files)

## Accomplishments

- `Role` type widened to `'partner' | 'admin' | 'sales'`; `requireUser()` resolves against a `KNOWN_ROLES` allowlist and fails closed to `'partner'` (never `'admin'`) on any value the DB CHECK constraint hasn't caught up to — T-30-03-01 closed.
- `requireRelationshipHolder()` added as the dedicated gate for the future `/clients` tree: admits `partner` and `sales`, refuses `admin` with `notFound()` (D-18 URL-secrecy pattern, same as `requireAdmin()`).
- All six `eq(schema.users.role, 'partner')` predicates across `partners.ts`, `users.ts` (x2), `partner-aggregates.ts` (x2), and `admin-activity.ts` widened to `inArray(schema.users.role, ['partner', 'sales'])` — the admin `/partners` list, the "Partenaires actifs"/total tiles, the invited-count derivation, and the admin activity feed all keep showing Commercial accounts after the Plan 30-01 role backfill moves them to `sales` (ROLE-03 / T-30-03-04). `'admin'` is never included in any of these predicates.
- `PartnerRow` gained `isInternal: boolean` (derived from `role === 'sales'`) — an access classification, not a rate field; ADMIN-09 envelope verified unaffected via grep.
- `roleForPartnerType()` derives `'sales'` only for `'Commercial'` (never `'admin'`) and is now called from both `adminCreateInvitation` and `adminUpdatePartnerType`, each guarded so an existing `'admin'` row's role is never overwritten (T-30-03-03). `CreatePartnerForm.tsx` received zero changes, per UI-SPEC Assumption A-3.

## Task Commits

Each task was committed atomically:

1. **Task 1: Widen the Role type, pass the DB role through, and add requireRelationshipHolder()** - `cf4dfcc` (feat)
2. **Task 2: Keep Commercial accounts visible to admin surfaces after the role backfill** - `514073f` (feat)
3. **Task 3: Derive users.role from partnerType on the invitation and update flows** - `381c522` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/lib/auth/require.ts` - `Role` widened to three members; `requireUser()` resolves via a fail-closed `KNOWN_ROLES` allowlist; `requireRelationshipHolder()` added
- `src/lib/auth/require.test.ts` - Rewritten with the new mocking pattern; covers all pre-existing behaviors plus the 6 new three-role behaviors (15 tests total)
- `src/lib/api/proposals/list.ts` - `_callerRole` hint widened to include `'sales'` (Rule 3 blocking typecheck fix; logic only compares `=== 'admin'`, no behavior change)
- `src/lib/db/queries/partners.ts` - Base role predicate widened to `inArray`; `role` projected + grouped; `PartnerRow.isInternal` added
- `src/lib/db/queries/partners.test.ts` - New tests for `isInternal` derivation and the widened predicate (source-grep)
- `src/lib/db/queries/users.ts` - Both role predicates (`listPartnersWithCounts`, `listInvitedPartners`) widened
- `src/lib/db/queries/users.test.ts` - New source-grep test asserting both predicates are widened, `'admin'` never included
- `src/lib/db/queries/partner-aggregates.ts` - Both role predicates (`getActivePartnerCount`, `getTotalPartnerAccountCount`) widened
- `src/lib/db/queries/partner-aggregates.test.ts` - New source-grep test
- `src/lib/db/queries/admin-activity.ts` - Partner-status-source role predicate widened
- `src/lib/db/queries/admin-activity.test.ts` - New behavioral test (sales row surfaces in the merged feed) + source-grep test
- `app/(admin)/[adminSegment]/partners/PartnersList.test.tsx` - `isInternal: false` added to the `PartnerRow` fixture (Rule 3)
- `tests/admin-09-grep-contracts.test.ts` - `isInternal: false` added to the `PartnerRow` fixture (Rule 3)
- `src/lib/admin/actions.ts` - `roleForPartnerType()` added; both `adminCreateInvitation` and `adminUpdatePartnerType` derive and write `role` alongside `partnerType`, guarded against demoting `'admin'` rows; `user.create` audit payload traces the derived role
- `src/lib/admin/actions.test.ts` - 12 new tests covering the derivation, the admin-demotion guard, the no-op guard, and the audit-payload trace

## Decisions Made

- **require.test.ts full rewrite, not incremental edit:** the file already existed from Phase 06-04 with 8 passing tests using a slightly different mocking idiom (`redirect`/`notFound` throwing synthetic errors). Rather than layer new tests on top of an inconsistent pattern, the whole file was rewritten with the plan's specified mocking pattern (mocks record calls without throwing), and every pre-existing behavior was explicitly re-added as its own test case so no coverage regressed. Verified: 15/15 tests pass, covering both the old and new scenarios.
- **Widened `_callerRole` in `src/lib/api/proposals/list.ts` (file not in the plan's `files_modified` list):** widening `Role` to include `'sales'` broke `npm run typecheck` at `app/(authed)/proposals/page.tsx:97`, which passes `role` (now `Role`) into `buildListResponse({ _callerRole: role })`, typed as `'admin' | 'partner'`. Rule 3 (auto-fix blocking issues directly caused by the current task): widened the field to `'admin' | 'partner' | 'sales'`. Confirmed safe by reading the only two usages of `_callerRole` in that file — both check `=== 'admin'` exclusively, so a `'sales'` caller is treated identically to a `'partner'` caller (no admin-override honored), which is exactly the ROLE-03-correct behavior.
- **Two `PartnerRow` test fixtures needed `isInternal: false`:** `PartnerRow` gained a required `isInternal: boolean` field in Task 2. Two pre-existing fixture-builder functions (`PartnersList.test.tsx`, `admin-09-grep-contracts.test.ts`) construct `PartnerRow` objects directly and failed `npm run typecheck` afterward. Rule 3 fix: added `isInternal: false` as the fixture default in both files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened `_callerRole` type in `src/lib/api/proposals/list.ts`**
- **Found during:** Task 1 (`npm run typecheck` after widening `Role`)
- **Issue:** `app/(authed)/proposals/page.tsx` passes `role: Role` (now 3 members) into `buildListResponse({ _callerRole: role })`, whose type was `'admin' | 'partner'` — a direct compile break caused by widening `Role`.
- **Fix:** Widened `_callerRole?: 'admin' | 'partner'` to `'admin' | 'partner' | 'sales'`. Verified the only two usages of the field both compare `=== 'admin'` exclusively — a `'sales'` caller is refused the admin-scoping override exactly like a `'partner'` caller, preserving T-18-01-01 IDOR mitigation and ROLE-03 (no widened visibility).
- **Files modified:** `src/lib/api/proposals/list.ts`
- **Verification:** `npm run typecheck` exits 0; full `npm test` green (no regressions in `src/lib/api/proposals/list.test.ts` — file has no dedicated test but is exercised transitively by proposals-list integration coverage).
- **Committed in:** `cf4dfcc` (Task 1 commit)

**2. [Rule 3 - Blocking] Added `isInternal: false` to two pre-existing `PartnerRow` test fixtures**
- **Found during:** Task 2 (`npm run typecheck` after adding `isInternal` to `PartnerRow`)
- **Issue:** `PartnersList.test.tsx` and `tests/admin-09-grep-contracts.test.ts` each construct `PartnerRow` fixture objects with a spread-override pattern; both failed to compile once `isInternal: boolean` became a required field.
- **Fix:** Added `isInternal: false` as the fixture default in both files.
- **Files modified:** `app/(admin)/[adminSegment]/partners/PartnersList.test.tsx`, `tests/admin-09-grep-contracts.test.ts`
- **Verification:** `npm run typecheck` exits 0; `npm test` green for both files.
- **Committed in:** `514073f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking typecheck failures caused directly by this plan's type-widening changes)
**Impact on plan:** Both fixes were necessary for `npm run typecheck` to pass and were confirmed to introduce zero behavior change beyond what the plan intended (sales treated identically to partner in both cases). No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. All changes are application-layer TypeScript against the schema and migration already applied in Plan 30-01.

## Next Phase Readiness

- The auth layer now has a real `requireRelationshipHolder()` gate ready for the `/clients` route tree (30-UI-SPEC.md §0) — the next plan can call it directly without any further auth-layer work.
- Every admin partner-management surface (`/partners` list, Admin Home stat tiles, the admin activity feed) correctly retains Commercial accounts once they are backfilled to `role='sales'` — verified by grep-contract regression tests in each affected query file, closing the ROLE-03 risk called out in this plan's `<why_this_plan_is_high_risk>` brief.
- Creating or re-typing a partner to `'Commercial'` through the existing admin UI now produces a `role='sales'` account with zero new UI surface — ROLE-01/ROLE-02 application-layer work is complete; the admin `/[adminSegment]/companies` UI plan can build directly on `client_relationships.owner_id` scoped by role without further schema or auth changes.
- No blockers. `npm run typecheck`, `npm run lint:check`, `npm test` (1264 passed / 10 skipped), `npm run check:no-drizzle-push`, `npm run check:migration-journal-sync`, and `npm run build` (`.next/standalone/server.js` present) all pass.

## Self-Check: PASSED

- FOUND: `src/lib/auth/require.ts` contains `'partner' | 'admin' | 'sales'` and `export async function requireRelationshipHolder`
- FOUND: `src/lib/db/queries/partners.ts` contains `inArray` and `isInternal`
- FOUND: `src/lib/admin/actions.ts` contains `roleForPartnerType` and the literal `'sales'`
- CONFIRMED: `grep -rn "eq(schema.users.role, 'partner')" src/lib/db/queries/` returns no matches outside test-assertion strings
- CONFIRMED: `grep -n "role: 'admin'" src/lib/admin/actions.ts` returns no matches
- CONFIRMED: `git diff --name-only` (final state) does not list `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx`
- FOUND commit `cf4dfcc` in `git log --oneline --all`
- FOUND commit `514073f` in `git log --oneline --all`
- FOUND commit `381c522` in `git log --oneline --all`
- CONFIRMED: `npm run typecheck`, `npm run lint:check`, `npm test` (1264 passed / 10 skipped), `npm run check:no-drizzle-push`, `npm run check:migration-journal-sync`, `npm run build` all exit 0

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-01*
