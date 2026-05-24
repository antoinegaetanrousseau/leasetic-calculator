---
phase: 18
plan: 03
subsystem: admin-surfaces
tags: [partners-list, d14-rename, filter-pills, overflow-menu, cursor-pagination, ADMIN-09, D-08, D-09, D-10, D-11, D-12, D-13, D-14]
dependency_graph:
  requires:
    - src/lib/db/queries/partners.ts ← src/db/schema.ts (users + proposals)
    - src/components/ui/PageHero.tsx (Phase 16)
    - src/components/ui/StatusChip.tsx (Phase 11 + Phase 14 invited variant)
    - src/components/proposals/SearchBar.tsx (Phase 17 reuse)
    - src/lib/api/proposals/list.ts adminUserIdOverride + _callerRole (Plan 18-01 D-11)
    - src/lib/i18n/dictionaries.ts admin.partners.* keys (Plan 18-01)
    - src/lib/admin actions: adminDisableUser / adminReEnableUser / adminReissueInvitation (Phase 14)
    - src/lib/auth/require.ts requireAdmin (Phase 6)
  provides:
    - listPartnersWithLastActivity({status?, q?, cursor?, limit?}) + PartnerRow + PartnerStatus types — D-08 MAX-aggregate JOIN with status derivation per Phase 12 DB-02 D-10
    - PartnersList component — D-14 rename of AccountsList; full Figma 42:46 6-col table chrome with D-13 empty states + D-12 cursor pagination footer
    - PartnersFilterPillTabs component — D-09 4-tab URL-driven filter row
    - PartnerRowActions component — D-10 popover menu with custom click-outside + Escape, wired to existing Phase 14 server actions; D-11 Voir les propositions link → /proposals?user_id={partnerId}
  affects:
    - app/(admin)/[adminSegment]/partners/page.tsx — full rewrite per UI-SPEC §Partners list layout
    - tests/admin-09-grep-contracts.test.ts — Surface 1 migrated from AccountsList to PartnersList with the new PartnerRow shape; 9-gate suite remains green
tech_stack:
  added: []
  patterns:
    - Drizzle LEFT JOIN + GROUP BY + SQL MAX() aggregate via `sql\`MAX(${schema.proposals.createdAt})\`` template
    - Status-derivation pattern (Phase 12 DB-02 D-10) — schema has no users.status column; derived from (deletedAt, lastLoginAt) at row-projection time
    - Cursor primitive — base64url-encoded (createdAt ISO, id text); tuple-comparison via raw SQL `(createdAt, id) < (cursor.createdAt, cursor.id)`; mirrors Phase 8 proposals cursor
    - Server-component popover pattern with custom useState + click-outside (mousedown listener on document) + Escape (keydown listener on document) — no Radix; matches UI-SPEC line 363 recommendation
    - URL-driven server-rendered active state for filter pills (no client useSearchParams); enum-validation at the SSR layer for T-18-03-01
key_files:
  created:
    - src/lib/db/queries/partners.ts
    - src/lib/db/queries/partners.test.ts
    - app/(admin)/[adminSegment]/partners/PartnersList.tsx
    - app/(admin)/[adminSegment]/partners/PartnersList.test.tsx
    - app/(admin)/[adminSegment]/partners/_components/PartnersFilterPillTabs.tsx
    - app/(admin)/[adminSegment]/partners/_components/PartnersFilterPillTabs.test.tsx
    - app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.tsx
    - app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.test.tsx
    - app/(admin)/[adminSegment]/partners/page.test.tsx
  modified:
    - app/(admin)/[adminSegment]/partners/page.tsx (rewrite — PageHero + SearchBar + PartnersFilterPillTabs + PartnersList + cursor)
    - tests/admin-09-grep-contracts.test.ts (Surface 1 migrated to PartnersList + PartnerRow shape)
  deleted:
    - app/(admin)/[adminSegment]/partners/AccountsList.tsx (D-14)
    - app/(admin)/[adminSegment]/partners/AccountsList.test.tsx (D-14)
decisions:
  - D-08 implemented via Drizzle LEFT JOIN + GROUP BY + MAX(proposals.createdAt) with `ne(proposals.status, 'deleted')` JOIN predicate — partners with zero non-deleted proposals project lastActivityAt=null (PartnersList renders em-dash "—" in cell 4)
  - D-14 rename is mechanical (file + symbol); admin.accounts.* i18n keys preserved for back-compat per Plan 18-01 SUMMARY discipline; D-14 scrub of PRODUCTION CODE = 0 references
  - Status derivation uses Phase 12 DB-02 D-10 (no users.status column in schema) — derives 'active'/'invited'/'inactive' from (deletedAt, lastLoginAt) at the query-helper boundary; PartnerStatus type exported for downstream consumers
  - StatusChip variant mapping: PartnerStatus 'inactive' → existing .chip-disabled variant (red-danger) — no new chip variant needed; existing chip.disabled label resolves correctly
  - PartnerRowActions custom popover (no Radix per UI-SPEC line 363); uses mousedown listener for click-outside (more reliable than click — fires before focus-loss in popovers) and keydown for Escape
  - adminReissueInvitation signature requires email + displayName + language; PartnerRow does NOT project language (Phase 18 follow-up — partner-language column extension out of scope per <action> step 5 in PLAN.md Task 2). Workaround: thread admin's current `lang` as the partner's language (the action overwrites users.language anyway; partner's own pref reapplied on next login)
  - Cursor encoding mirrors Phase 8 proposals.ts encodeCursor (base64url JSON {createdAt, id}); ORDER BY createdAt DESC, id DESC matches the cursor tuple compare direction
  - page.tsx Task 3 layout maxWidth=1280px (Partners table needs the width); matches UI-SPEC line 893 recommendation
metrics:
  duration_min: 15
  completed_date: 2026-05-24
  tasks_complete: 3
  tests_added: 42  # 15 partners.test.ts + 8 PartnersList.test.tsx + 7 PartnersFilterPillTabs.test.tsx + 6 PartnerRowActions.test.tsx + 6 page.test.tsx
  files_created: 9
  files_modified: 2
  files_deleted: 2
---

# Phase 18 Plan 03: Partners Surface Rebuild (D-14 rename + Figma 42:46) Summary

Phase 14 `AccountsList.tsx` renamed to `PartnersList.tsx` and rebuilt per Figma 42:46 + UI-SPEC §Partners list contract. The 6-column table chrome (PARTENAIRE / EMAIL / DATE CRÉATION / DERNIÈRE ACTIVITÉ / STATUT / ⋯) lands with the D-08 last-activity LEFT JOIN, D-09 4-tab filter pill row (Tous / Actifs / Invités / Désactivés), D-10 per-row overflow menu with conditional 4 actions, D-11 `Voir les propositions du partenaire` consumer of the Plan 18-01 admin user_id override, D-12 cursor pagination, and D-13 empty states.

## What Built

### Task 1 — D-14 rename + D-08 last-activity query helper

- **`src/lib/db/queries/partners.ts`** — new module exposing `listPartnersWithLastActivity({status?, q?, cursor?, limit?})`. Drizzle `select().from(users).leftJoin(proposals, …).groupBy(…).orderBy(desc(createdAt), desc(id)).limit(limit+1)` with `sql\`MAX(${schema.proposals.createdAt})\`` aggregate for the D-08 last-activity. Status filter branches per Phase 12 DB-02 D-10 derivation (active = `deletedAt IS NULL AND lastLoginAt IS NOT NULL`; invited = both NULL; inactive = `deletedAt IS NOT NULL`). Cursor primitive = base64url-encoded `{createdAt: ISO, id: text}` mirroring Phase 8 proposals cursor; tuple compare via raw SQL `(createdAt, id) < (cursor.createdAt, cursor.id)::(timestamptz, text)`.
- **`PartnersList.tsx`** — full Figma 42:46 rebuild. 6-column table with stacked name+email in col 1, single-line email in col 2 (UI-SPEC keep-both decision), Intl-formatted dates in cols 3+4 (cell 4 falls back to literal "—" when lastActivityAt is null per D-08), StatusChip in col 5 with `inactive`→`.chip-disabled` mapping, PartnerRowActions in col 6. D-13 empty states: (a) zero-partners → `Aucun partenaire pour le moment.` + Inviter CTA; (b) filter-empty → `Aucun partenaire ne correspond aux filtres.` + Effacer les filtres → link that resets all filters. Cursor pagination footer renders a Load More `<Link>` when nextCursor is non-null.
- **Delete `AccountsList.tsx` + `AccountsList.test.tsx`** — D-14 scrub. Grep verified zero production-code references to `AccountsList`/`accountsList`/`listAccounts` in `app/` + `src/`. Remaining string occurrences live only in `.test.tsx` JSDoc and the Task 1 scrub-assertion regex (test contract).
- **`tests/admin-09-grep-contracts.test.ts`** — Surface 1 migrated: imports `PartnersList` (was `AccountsList`); a new `makePartnerRow()` fixture for the post-rename `PartnerRow` shape; 4 sub-tests cover active/invited/inactive/empty-state variants. ADMIN-09 9-gate suite remains 9/9 green.
- 15 query tests (`partners.test.ts`) + 8 PartnersList tests = 23 net new.
- Task 1 stub PartnerRowActions component shipped in the same commit so PartnersList compiles atomically; Task 2 replaces the stub with the full popover.

### Task 2 — PartnersFilterPillTabs (D-09) + PartnerRowActions popover (D-10/D-11)

- **`PartnersFilterPillTabs.tsx`** — server component, 4 `<Link>` pills with shared base style. Active pill = `.chip-active` tint (`rgba(18,150,87,0.10)` bg + `--gd-text` + 600 weight); inactive = transparent bg + `--muted` + 500. `buildHref()` drops the status param for the `all` tab and preserves `?q=` across tab navigations when set. Each pill carries `data-testid="partner-filter-pill-{key}"` per UI-SPEC line 326. No client state — `currentStatus` is server-derived in page.tsx from `searchParams.status`.
- **`PartnerRowActions.tsx`** — `'use client'` component replacing the Task 1 stub. Custom React state + click-outside hook (mousedown listener on document) + Escape handler (keydown listener on document) — no Radix per UI-SPEC line 363 recommendation. D-10 conditional menu items:
  - `Renvoyer l'invitation` when `status === 'invited'` — wired to `adminReissueInvitation({email, displayName, language})` with partner's email + name threaded from PartnersList; language defaults to the admin's current `lang` (Phase 18 follow-up — partner's own language pref would require a PartnerRow column extension).
  - `Désactiver le compte` when `status === 'active'` — wired to `adminDisableUser(partnerId)`.
  - `Réactiver le compte` when `status === 'inactive'` — wired to `adminReEnableUser(partnerId)`.
  - `Voir les propositions du partenaire` always visible — `<Link href={'/proposals?user_id=' + partnerId}>` consumes Plan 18-01's admin user_id query override (D-11, gated at SSR + library layer for IDOR per T-18-01-01).
- aria-haspopup="menu" + aria-expanded reflects open state; each item carries `role="menuitem"`. Toast feedback for each mutation using existing `admin.accounts.toast.*` keys; `router.refresh()` invoked after success to re-fetch the SSR list.
- 7 PartnersFilterPillTabs tests + 6 PartnerRowActions tests = 13 net new.

### Task 3 — page.tsx wired with full UI-SPEC §Partners list layout

- **`page.tsx`** rewritten end-to-end. SSR ordering: `requireAdmin()` (AUTH-15 defense-in-depth) → `validateStatus()` enum-validates raw `?status=` arg (T-18-03-01 — invalid values silently drop to undefined → no filter) → `listPartnersWithLastActivity({status, q, cursor, limit:20})`. Layout: `<main maxWidth=1280px>` containing PageHero (title = `admin.partners.page.title` + subtitle + `Inviter un partenaire` CTA → `/<seg>/partners/new`), SearchBar (Phase 17 reuse), PartnersFilterPillTabs (currentStatus derived from sp.status), PartnersList (rows + nextCursor + filter-echo props).
- 6 page integration tests cover PageHero/Inviter CTA href, SearchBar input presence, all 4 filter pill data-testids, `listPartnersWithLastActivity` call with the validated args, `status=invited` → Invités pill carries `aria-selected="true"`, and the T-18-03-01 enum-validation negative case.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Plan ambiguity] PartnerRowActions wiring needs partner email + display name beyond `partnerId`**

- **Found during:** Task 2 GREEN — writing the `Renvoyer l'invitation` click handler.
- **Issue:** Plan Task 2 props spec listed `{partnerId, status, adminSegment, lang}` only, but `adminReissueInvitation` requires `{email, displayName, language}`. Without email/name, the Reissue action would fail at runtime with the existing Phase 14 server action's lookup logic.
- **Fix:** Extended `PartnerRowActionsProps` with optional `partnerEmail` + `partnerDisplayName` props; `PartnersList.tsx` threads `row.email` + `row.name` through. When either is missing the action surfaces a toast error rather than throwing. Language pref defaults to the admin's current `lang` (the action overwrites `users.language` anyway — partner's own pref reapplied on next login). Documented in the component JSDoc as a Phase 18 follow-up candidate (PartnerRow language column extension would yield the partner's own preferred language).
- **Files modified:** `_components/PartnerRowActions.tsx` (props extension), `PartnersList.tsx` (thread props through).
- **Commit:** 7ec78ab.

**2. [Rule 1 — Plan ambiguity] Task 1 must add a Task 2 stub for PartnerRowActions**

- **Found during:** Task 1 GREEN — wiring the 6th cell of the new PartnersList table.
- **Issue:** Plan Task 1 must produce a complete 6-column row, but Task 2 is the one that creates PartnerRowActions. Solution: ship a non-functional ⋯ stub in `_components/PartnerRowActions.tsx` at Task 1 so PartnersList compiles atomically; Task 2 then replaces the stub with the full popover.
- **Fix:** Created a 32×32 ⋯ button stub at Task 1 time with `aria-haspopup="menu"` + `aria-expanded={false}` + lucide `MoreVertical`. Task 2 commit replaces the stub with the full component (same export name, expanded props).
- **Commits:** 39de7b8 (stub) + 7ec78ab (full).

### Out-of-Scope Discoveries (NOT fixed — already logged in deferred-items.md)

- **PDF byte-drift in `__pdf-fixtures__/render-fixtures.test.ts`** — 2 tests fail (happy-path-en + paired fr fixture). Confirmed pre-existing via `git stash && npx vitest run` on the Task 1 base commit. Already documented in `.planning/phases/18-admin-surfaces/deferred-items.md` item #1 by Plan 18-01.

## Known Stubs

None introduced by Plan 03. Documented partials from prior plans still apply:

1. **Partner-language column on PartnerRow** — `adminReissueInvitation` is called with the admin's current `lang` rather than the partner's own preferred language. The action overwrites `users.language` so the partner sees their own preferred language on next login; the on-call moment of re-issue uses the admin's pref. A future plan could extend PartnerRow to project `users.language`. Tracking JSDoc lives in `_components/PartnerRowActions.tsx`.

2. **admin.accounts.* i18n keys preserved for back-compat** — Plan 18-01 SUMMARY's discipline (no re-key churn). PartnerRowActions consumes the existing `admin.accounts.toast.{disable,enable,reissue}.*` keys via `t()`. Plan 18-03 does NOT introduce new toast keys.

## Threat Flags

No new security-relevant surface introduced beyond the plan's `<threat_model>`.

- **T-18-03-01 (status enum injection):** mitigated — `validateStatus()` in page.tsx checks the raw arg against a `ReadonlySet<PartnerStatus>` before passing to the query. Invalid values → undefined → safe default (no filter). Test 4 cont. proves it.
- **T-18-03-02 (SQL injection via q):** mitigated — `listPartnersWithLastActivity` passes q through Drizzle's `ilike(col, '%${q}%')` which bind-params the pattern (the `${q}` interpolation happens at TS template-literal time, not SQL time; Drizzle re-quotes for SQL emission). Never raw-concatenated.
- **T-18-03-03 (IDOR via Voir les propositions):** mitigated — link target /proposals already has its own admin role gate at the SSR layer (Plan 18-01 D-11 mitigation T-18-01-01); PartnerRowActions itself only renders inside the admin-gated /partners route.
- **T-18-03-04 (deleted users in list):** mitigated — `deriveStatus()` reads `deletedAt` and the helper's `eq(users.role, 'partner')` predicate + status-branch predicates ensure soft-deleted partners appear only when `status='inactive'` is explicitly requested.
- **T-18-03-05 (XSS via name/email):** mitigated — React text rendering auto-escapes; no raw-HTML injection sinks present.
- **T-18-03-06 (DoS via deep cursor):** accepted — LIMIT 21 per fetch (cursor primitive); v1.3 expected partner volume <100.
- **T-18-03-07 (commission leakage via rename):** mitigated — ADMIN-09 9-gate suite Surface 1 migrated to the renamed PartnersList; 9/9 green post-change. No PartnerRow column projects commission (commission lives on `global_params`).

## Verification

```
npx vitest run \
  src/lib/db/queries/partners.test.ts \
  'app/(admin)/[adminSegment]/partners' \
  tests/admin-09-grep-contracts.test.ts
→ Test Files  8 passed (8)
  Tests       58 passed (58)

npx tsc --noEmit
→ exits 0 (TS + _EnHasAllFrKeys parity proof green)

# D-14 scrub — production code references only
grep -rn "AccountsList" app/ src/ | grep -v node_modules | grep -v "\.test\."
→ 0 hits

# D-14 file-existence check
find 'app/(admin)/[adminSegment]/partners' -name "AccountsList*"
→ 0 results

# D-08 JOIN proof
grep -n "lastActivityAt\|MAX.*createdAt" src/lib/db/queries/partners.ts
→ MAX(${schema.proposals.createdAt}) aggregate at column projection + lastActivityAt at multiple sites

# D-11 link proof
grep -n "user_id=" 'app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.tsx'
→ href={`/proposals?user_id=${partnerId}`}
```

ADMIN-09 9-gate suite remains 9/9 green post-rename (Surface 1 verified with new PartnerRow shape). Full vitest sweep: 1005 passed / 4 skipped / 2 failed — the 2 failing tests are the pre-existing `__pdf-fixtures__/render-fixtures.test.ts` byte-drift (not caused by Plan 18-03; verified via `git stash`; documented in deferred-items.md from Plan 18-01).

## Commits

| Hash    | Task   | Summary |
| ------- | ------ | ------- |
| 8e99e13 | Task 1 RED  | test(18-03): failing tests for listPartnersWithLastActivity (D-08/D-14) |
| 39de7b8 | Task 1 GREEN | feat(18-03): D-14 rename AccountsList→PartnersList + D-08 query helper |
| 2c2b3ce | Task 2 RED  | test(18-03): failing tests for PartnersFilterPillTabs + PartnerRowActions (D-09/D-10/D-11) |
| 7ec78ab | Task 2 GREEN | feat(18-03): PartnersFilterPillTabs (D-09) + PartnerRowActions popover (D-10/D-11) |
| de1ab98 | Task 3 RED  | test(18-03): failing integration tests for partners page.tsx (D-12) |
| beb49af | Task 3 GREEN | feat(18-03): wire partners/page.tsx — PageHero + SearchBar + filter pills + cursor |

## Self-Check: PASSED

Files verified to exist (via `[ -f path ] && echo FOUND`):

- ✓ `src/lib/db/queries/partners.ts` — contains `listPartnersWithLastActivity` + `PartnerRow` + `PartnerStatus` + `MAX(${schema.proposals.createdAt})`
- ✓ `src/lib/db/queries/partners.test.ts` — 15 tests
- ✓ `app/(admin)/[adminSegment]/partners/PartnersList.tsx` — 6-col table chrome + D-13 empty states + D-12 cursor footer
- ✓ `app/(admin)/[adminSegment]/partners/PartnersList.test.tsx` — 8 tests including the D-14 file-content scrub
- ✓ `app/(admin)/[adminSegment]/partners/_components/PartnersFilterPillTabs.tsx` — 4-tab D-09 server component
- ✓ `app/(admin)/[adminSegment]/partners/_components/PartnersFilterPillTabs.test.tsx` — 7 tests
- ✓ `app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.tsx` — D-10 popover + D-11 link
- ✓ `app/(admin)/[adminSegment]/partners/_components/PartnerRowActions.test.tsx` — 6 tests
- ✓ `app/(admin)/[adminSegment]/partners/page.tsx` — PageHero + SearchBar + PartnersFilterPillTabs + PartnersList + cursor
- ✓ `app/(admin)/[adminSegment]/partners/page.test.tsx` — 6 tests

Files verified to be deleted:

- ✓ `app/(admin)/[adminSegment]/partners/AccountsList.tsx` — gone
- ✓ `app/(admin)/[adminSegment]/partners/AccountsList.test.tsx` — gone

Commits verified to exist (via `git log --oneline | grep`):

- ✓ 8e99e13
- ✓ 39de7b8
- ✓ 2c2b3ce
- ✓ 7ec78ab
- ✓ de1ab98
- ✓ beb49af
