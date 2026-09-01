---
phase: 30-company-contact-registry
plan: 02
subsystem: ui
tags: [i18n, dictionaries, sidebar, route-meta, icons, search, reui, base-maia]

# Dependency graph
requires:
  - phase: 30-company-contact-registry (plan 01)
    provides: companies / client_relationships / contacts tables, proposals.client_relationship_id FK, widened users_role_check
provides:
  - clients.* and admin.companies.* i18n namespaces (fr + en, 59 new keys per language)
  - SearchBar optional placeholderKey/ariaKey props, defaulting to the current proposal.search.* keys
  - BuildingIcon and PhoneIcon in the product icon vocabulary (@/components/ui/icons)
  - /clients and /{adminSegment}/companies route-meta + sidebar nav entries (partner nav 5 items, admin nav 7 items)
affects: [30-company-contact-registry remaining plans (client book, client detail, admin company view, contacts editor)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional DictKey props with default values preserve existing call-site output while letting new surfaces override copy (SearchBar placeholderKey/ariaKey)"
    - "Sidebar nav-set selection stays a single isAdmin boolean gate — new roles/routes are added to the existing array, never a new branch"

key-files:
  created:
    - src/components/icons/BuildingIcon.tsx
    - src/components/icons/PhoneIcon.tsx
    - src/components/proposals/SearchBar.test.tsx
  modified:
    - src/lib/i18n/dictionaries.ts
    - src/lib/i18n/dictionaries.test.ts
    - src/components/proposals/SearchBar.tsx
    - src/components/ui/icons.tsx
    - src/lib/route-meta.ts
    - src/lib/route-meta.test.ts
    - src/components/ui/AppSidebar.tsx
    - src/components/ui/AppSidebar.test.tsx
    - src/components/ui/Shell.tsx

key-decisions:
  - "BuildingIcon/PhoneIcon are hand-authored using stroke-based paths (stroke=currentColor, strokeWidth=1.5, fill=none) rather than replicating Iconly's filled-evenodd-outline conversion technique — no licensed Iconly source exists for a building/handset glyph (Assumption A-7), and a real 1.5 stroke achieves the same visual weight the plan's action text asked for without hand-tracing double-contour bezier outlines"
  - "clients.modal.create.title and admin.companies.page.subtitle have no literal copy in the UI-SPEC's Copywriting Contract table — filled in consistently with adjacent precedent ('Nouveau client' matching the CTA it opens; a subtitle phrased like the existing admin.lcReferences.subtitle 'tous partenaires confondus' pattern)"

patterns-established:
  - "clients.* (partner-facing) / admin.companies.* (admin-facing) i18n namespace split mirrors the CRM-01/02 shared-vs-private data model split from Plan 30-01"

requirements-completed: [CRM-07, ROLE-02]

# Metrics
duration: 16min
completed: 2026-09-01
---

# Phase 30 Plan 02: Shared UI Foundations (i18n, SearchBar, Icons, Nav) Summary

**Widened the FR/EN dictionaries with 59 new `clients.*`/`admin.companies.*` keys per language, added optional `placeholderKey`/`ariaKey` props to `SearchBar` with zero call-site regressions, authored two new product icons, and registered `/clients` + `/{adminSegment}/companies` in route-meta and the sidebar (partner nav 5 items, admin nav 7 items) with no role-specific branch.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-01T09:38:48Z
- **Completed:** 2026-09-01T09:54:23Z
- **Tasks:** 3
- **Files modified:** 12 (3 created, 9 modified)

## Accomplishments

- `dictionaries.ts` grew from 738 to 797 keys per language (41 `clients.*` + 16 `admin.companies.*` + 2 `sidebar.nav.*`), with the compile-time `_EnHasAllFrKeys` check proving FR/EN parity and a new `dictionaries.test.ts` describe block locking exact copy plus the CRM-02 non-leakage wording on `clients.empty.search.title`
- `SearchBar` accepts optional `placeholderKey`/`ariaKey` `DictKey` props defaulting to `'proposal.search.placeholder'`/`'proposal.search.aria'` — `/proposals` and the admin `/partners` page render byte-identical output with no edit at either call site (verified by grep + by running their existing test suites)
- `BuildingIcon` and `PhoneIcon` added to `@/components/ui/icons`, hand-authored (no Iconly source available), explicitly not sourced from `@hugeicons/*` per Assumption A-7
- `/clients` and `/{adminSegment}/companies` are now reachable and correctly highlighted: `ActiveNav` gained `'clients'`/`'admin-companies'`, partner nav is 5 items (adds Clients between Propositions and Aide), admin nav is 7 items (adds Sociétés between Partenaires and Coefficients) — `AppSidebar.tsx` contains zero occurrences of the string `sales`, confirming ROLE-02 is satisfied by construction

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the clients.* and admin.companies.* i18n namespaces** - `5fd3327` (feat)
2. **Task 2: Widen SearchBar with placeholderKey/ariaKey and add the two product icons** - `fd7e748` (feat)
3. **Task 3: Register the /clients and /{adminSegment}/companies nav entries** - `a6ce886` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/lib/i18n/dictionaries.ts` - Added the Phase 30 `clients.*` / `admin.companies.*` / `sidebar.nav.clients` / `sidebar.nav.adminCompanies` blocks to both `fr` and `en`
- `src/lib/i18n/dictionaries.test.ts` - Raised the key-count floor from 220 to 790 and added a Phase 30 describe block with exact-copy + non-leakage assertions
- `src/components/proposals/SearchBar.tsx` - Added optional `placeholderKey`/`ariaKey: DictKey` props, both defaulting to the current proposal keys
- `src/components/proposals/SearchBar.test.tsx` - New test file: default behavior, override behavior, clear-button reuse, plus BuildingIcon/PhoneIcon size + aria-hidden checks
- `src/components/icons/BuildingIcon.tsx` - New hand-authored building/office glyph
- `src/components/icons/PhoneIcon.tsx` - New hand-authored handset glyph
- `src/components/ui/icons.tsx` - Re-exports `BuildingIcon` and `PhoneIcon`
- `src/lib/route-meta.ts` - Extended `ActiveNav`; added `/companies` (admin branch) and `/clients` (partner branch) matches
- `src/lib/route-meta.test.ts` - Added coverage for `/clients` and `/<seg>/companies`
- `src/components/ui/AppSidebar.tsx` - Added `companies` to the `adminHrefs` prop type; added Clients to `partnerNavItems()` and Sociétés to `adminNavItems()`, both using the new `BuildingIcon`
- `src/components/ui/AppSidebar.test.tsx` - Updated the `ADMIN_HREFS` fixture and all 4→5 / 6→7 count/order assertions
- `src/components/ui/Shell.tsx` - Added `companies: \`/${adminSegment}/companies\`` to the `adminHrefs` object literal

## Decisions Made

- **Icon authoring technique:** rather than hand-tracing Iconly's filled double-contour outline conversion (fill="currentColor" + evenodd hole paths), `BuildingIcon`/`PhoneIcon` use real SVG strokes (`stroke="currentColor" strokeWidth="1.5" fill="none"`). This achieves the same visual "1.5px stroke-weight outline" the action text specified, is far less error-prone to author by hand than approximating bezier double-contours, and has no automated test enforcing the exact fill/stroke mechanism.
- **New-key count floor:** computed the exact pre-existing key count (738 per language via a scratch `tsx` script) before adding, confirmed 59 new keys land per language (797 total), and raised the `dictionaries.test.ts` floor to 790 (rounded down to the nearest ten) per the plan's instruction.
- **`clients.modal.create.title` / `admin.companies.page.subtitle` copy:** the UI-SPEC's Copywriting Contract table doesn't give literal strings for these two keys. Filled in using direct precedent: the create-dialog title reuses the CTA text it's opened by ("Nouveau client"), and the admin subtitle mirrors the existing `admin.lcReferences.subtitle` "tous partenaires confondus" phrasing already used for a peer admin-oversight surface.

## Deviations from Plan

None — plan executed exactly as written. The icon-authoring technique note above is a within-scope implementation choice for a "hand-author following the same style" instruction, not a deviation from a load-bearing requirement, and one un-specified copy string per key was filled in per existing precedent rather than left blank.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Every later Phase 30 UI plan (client book, client detail, admin company view, contacts editor) can now reference stable `DictKey` values for `clients.*`/`admin.companies.*` instead of inventing copy.
- `<SearchBar placeholderKey="clients.search.placeholder" ariaKey="clients.search.aria" />` is ready for the client book (Surface 1) to consume as-is.
- `BuildingIcon` is available for the client-book zero-state and the two new sidebar entries; `PhoneIcon` is available for the contact row's phone field.
- `/clients` and `/{adminSegment}/companies` resolve correctly in the sidebar and in `getRouteMeta` even though no page exists at either route yet (404 until a later plan adds the route file) — this is expected and does not block subsequent plans.
- No blockers. `npm run typecheck`, `npm run lint:check`, `npm test` (1237 passed / 10 skipped), `npm run check:no-drizzle-push`, `npm run check:migration-journal-sync`, and `npm run build` (`.next/standalone/server.js` present) all pass.

## Self-Check: PASSED

- FOUND: `src/components/icons/BuildingIcon.tsx`
- FOUND: `src/components/icons/PhoneIcon.tsx`
- FOUND: `src/components/proposals/SearchBar.test.tsx`
- FOUND: `'clients.page.title'` and `'admin.companies.relation.type.sales'` in `src/lib/i18n/dictionaries.ts`
- FOUND: `placeholderKey` / `ariaKey` in `src/components/proposals/SearchBar.tsx`
- FOUND: `'admin-companies'` / `'clients'` in `src/lib/route-meta.ts`
- FOUND: `companies: \`/${adminSegment}/companies\`` in `src/components/ui/Shell.tsx`
- CONFIRMED: `grep -n "sales" src/components/ui/AppSidebar.tsx` returns no matches
- FOUND commit `5fd3327` in `git log --oneline --all`
- FOUND commit `fd7e748` in `git log --oneline --all`
- FOUND commit `a6ce886` in `git log --oneline --all`
- CONFIRMED: `npm run typecheck`, `npm run lint:check`, `npm test` (1237 passed / 10 skipped), `npm run check:no-drizzle-push`, `npm run check:migration-journal-sync`, `npm run build` all exit 0

## Self-Check: PASSED (re-verified post-commit)

All file/string/commit claims above were independently re-checked against
the working tree and `git log --oneline --all` after the plan-metadata
commit; all FOUND, no discrepancies.

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-01*
