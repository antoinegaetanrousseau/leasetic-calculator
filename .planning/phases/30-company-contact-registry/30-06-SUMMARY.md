---
phase: 30-company-contact-registry
plan: 06
subsystem: ui
tags: [react, tanstack-table, reui, data-grid, shadcn, dialog, cursor-pagination, react-hook-form, zod]

# Dependency graph
requires:
  - phase: 30-company-contact-registry (plan 02)
    provides: "clients.* / admin.companies.* i18n keys; SearchBar placeholderKey/ariaKey; BuildingIcon; /clients nav registration"
  - phase: 30-company-contact-registry (plan 04)
    provides: "listClientBook — owner-scoped, cursor-paginated, server-searched/sorted client book read"
  - phase: 30-company-contact-registry (plan 05)
    provides: "createClientRelationshipAction — idempotent create-client with silent server-side SIREN dedup"
provides:
  - "/clients — server-rendered partner/sales client book (CRM-07), owner-scoped via session.user.id only"
  - "ClientsGrid — first real-app adoption of ReUI DataGrid's table/column/header machinery, without DataGridPagination/Filters/row-selection"
  - "CreateClientDialog — first real-app adoption of shadcn Dialog, two-field create-client flow with zero lookup surface (CRM-01)"
affects: [30-company-contact-registry remaining plans (client detail /clients/[id], admin companies view), Phase 31 IMPORT-01..07, Phase 33/34 pipeline/activity surfaces that will adopt the same DataGrid pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DataGrid table/column/header machinery adopted WITHOUT its pagination sub-component: dataGridFeatures' built-in row-pagination row model (default pageSize 10) is neutralized by sizing controlled pagination state to Math.max(rows.length, 1) rather than building a second, leaner TanStack feature bundle — resolves the documented cursor-vs-page-index architecture blocker (reui-blocks-audit.md §2) by splitting the block's table-chrome concern from its pagination concern"
    - "Server-side sort via manualSorting: true + controlled sorting state derived from URL sort/dir props — onSortingChange never mutates local state, it pushes sort/dir into the URL and deletes cursor, collapsing DataGridColumnHeader's built-in asc→desc→clear 3-way cycle into a clean 2-way toggle (no 'unsorted' URL state exists on this surface)"
    - "Dedup-invariant create flow: CreateClientDialog's success toast/copy path is structurally identical whether createClientRelationshipAction attached to a pre-existing company or created a new one — the component has no branch that could leak that distinction"
    - "z.input<typeof schema> (not the exported z.infer output type) as the RHF form-values generic for a schema with an optional+transform field — matches the ParametresFormCard.tsx precedent, avoids a resolver type mismatch between the pre-transform (optional key) and post-transform (always-present, possibly-undefined) shapes"

key-files:
  created:
    - app/(authed)/clients/page.tsx
    - app/(authed)/clients/page.test.tsx
    - app/(authed)/clients/ClientsGrid.tsx
    - app/(authed)/clients/ClientsGrid.test.tsx
    - app/(authed)/clients/CreateClientDialog.tsx
    - app/(authed)/clients/CreateClientDialog.test.tsx

key-decisions:
  - "Neutralized dataGridFeatures' row-pagination row model via controlled pagination state (pageSize = Math.max(rows.length, 1)) instead of authoring a second, leaner TanStack feature bundle. A leaner bundle would require re-declaring most of dataGridFeatures' internals (sizing, sorting, faceting, sort-fn map) to keep DataGridColumnHeader/DataGridTableInstance's concrete DataGridFeatures type contract satisfied, for no behavioral gain over sizing the existing pagination feature out of the way — DataGridPagination itself is never imported or rendered, satisfying the plan's grep gate."
  - "onSortingChange collapses DataGridColumnHeader's built-in asc→desc→clear cycle into a 2-way toggle: when the header's clearSorting() produces an empty sorting array, the handler falls back to the column that was already active (from props) and flips its direction, rather than dropping to an unsorted URL state that has no server-side representation. This matches the plan's stated behavior ('toggles dir') without a third URL state to validate against."
  - "CreateClientDialog's SIREN field is bound via RHF Controller (not register()) because SirenInput is a controlled value/onChange component (matches the existing ParametresFormCard.tsx wiring for the identical component), and the form-values type uses z.input<typeof createClientSchema> rather than the schema's exported z.infer output type, since zodResolver's generic requires the pre-transform (optional siren key) shape to match RHF's own field-values type."
  - "The empty-state 'Nouveau client' CTA (zero-clients case) renders a second, independent <CreateClientDialog> instance rather than trying to share open-state with the PageHero's trigger — each Dialog owns its own local `open` state, so two independent trigger buttons for the same flow is the simplest structurally-correct composition here."

patterns-established:
  - "Cursor-paginated DataGrid adoption pattern for future CRM lists (admin companies view, Phase 33/34 pipeline dashboard): DataGrid + DataGridTable + DataGridColumnHeader for chrome, cursor Link footer for pagination, manualSorting + URL-driven sort state for ordering — never DataGridPagination, never a client-side re-sort of a partial page"

requirements-completed: [CRM-01, CRM-02, CRM-07]

# Metrics
duration: ~55min
completed: 2026-09-01
---

# Phase 30 Plan 06: Client Book UI (/clients) + Create-Client Dialog Summary

**Server-rendered `/clients` client book on ReUI DataGrid's table machinery (cursor pagination, server-side sort, zero client-side re-sort), fed by a two-field shadcn Dialog with no lookup/autocomplete surface and a dedup-invariant success path.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-01T13:15:00Z (approx.)
- **Completed:** 2026-09-01T14:10:00Z
- **Tasks:** 3
- **Files modified:** 6 (all created)

## Accomplishments

- `app/(authed)/clients/page.tsx` — server component behind `requireRelationshipHolder()` (called before any data access), `q`/`sort`/`dir` enum-validated with silent fallback to server defaults, `cursor` passed through opaque, `ownerId` sourced exclusively from `session.user.id`. No `ownerId`/`owner_id`/`user_id` search param is ever read (grep-gated and test-proven). Renders directly inside Shell's capped `<main>` — no nested width wrapper.
- `app/(authed)/clients/ClientsGrid.tsx` — first real-app adoption of `DataGrid`/`DataGridTable`/`DataGridColumnHeader` from `@/components/reui/data-grid/*`, deliberately without `DataGridPagination`, `Filters`, or row-selection. Four columns (CLIENT sortable, SIREN em-dash fallback, PROPOSITIONS right-aligned literal count including 0, DERNIÈRE ACTIVITÉ sortable with em-dash fallback). `manualSorting: true` — clicking a sortable header pushes `sort`/`dir` into the URL and deletes `cursor`, never re-sorting the already-loaded partial page. `recordCount` is `rows.length` (current page only). Row click navigates to `/clients/{relationshipId}`. Cursor "Charger plus" footer preserves `q`/`sort`/`dir`. Two empty states (zero-clients with CTA, search-yields-nothing with the fixed generic CRM-02-safe copy) using shadcn `Empty`/`EmptyDescription`/`EmptyMedia`/`EmptyContent`.
- `app/(authed)/clients/CreateClientDialog.tsx` — first real-app adoption of shadcn `Dialog`, RHF + `zodResolver(createClientSchema)`, two fields (company name required with asterisk, SIREN optional with helper text and no asterisk). Zero autocomplete/typeahead/lookup of any kind (A-5 hard security constraint) — the only network call is the submit itself. Success toast/navigation is identical regardless of whether `createClientRelationshipAction` attached to a pre-existing company or created a new one; a rejected action fires the generic error toast and keeps the dialog open.
- 20 new tests (6 page + 8 grid + 6 dialog) covering every `<behavior>`/acceptance-criteria bullet from the plan, including the IDOR-probe test (forged `?ownerId=`/`?user_id=`/`?owner_id=` never reaches the query call) and the "no lookup surface" structural assertions (no `datalist`, no `[role=combobox]`, no `[role=listbox]`, `autoComplete="off"` on both fields).

## Task Commits

Each task was committed atomically:

1. **Task 1: The /clients server page** - `2e058b1` (feat)
2. **Task 2: ClientsGrid — DataGrid table machinery with cursor pagination and server-side sort** - `8ce66a1` (feat)
3. **Task 3: CreateClientDialog** - `1b98937` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `app/(authed)/clients/page.tsx` — server-rendered client book page: auth gate, searchParams enum-validation, `listClientBook` call, PageHero + SearchBar + ClientsGrid composition.
- `app/(authed)/clients/page.test.tsx` — 6 tests: auth-before-query ordering, `ownerId` sourced from session, forged-param rejection, invalid-sort fallback, PageHero/SearchBar rendering, no-maxWidth-wrapper acceptance check.
- `app/(authed)/clients/ClientsGrid.tsx` — DataGrid-backed 4-column client list with cursor "Charger plus" footer, server-side sort, two empty states.
- `app/(authed)/clients/ClientsGrid.test.tsx` — 8 tests covering all `<behavior>` bullets.
- `app/(authed)/clients/CreateClientDialog.tsx` — shadcn Dialog + RHF create-client form.
- `app/(authed)/clients/CreateClientDialog.test.tsx` — 6 tests covering all `<behavior>` bullets.

## Decisions Made

See frontmatter `key-decisions` for full detail. Summary:
- **Neutralized (not replaced) `dataGridFeatures`' built-in pagination row model** via controlled `pagination` state sized to the full loaded page, rather than authoring a leaner custom TanStack feature bundle — avoids a `DataGridFeatures` type-contract mismatch with `DataGridColumnHeader`/`DataGridTableInstance` for zero behavioral difference.
- **2-way sort toggle**, not TanStack's native 3-way asc→desc→clear cycle — this surface has no "unsorted" URL state, so a `clearSorting()` result is remapped to a direction flip on the already-active column.
- **`z.input<...>` form-values type + RHF `Controller` for the SIREN field** — matches existing `ParametresFormCard.tsx` conventions for the same `SirenInput` component and the same optional+transform schema shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `useReactTable` does not exist in this codebase's `@tanstack/react-table` version**
- **Found during:** Task 2, before writing code (confirmed via `package.json` — `@tanstack/react-table: ^9.1.2` — and every existing vendored data-grid block, all of which import `useTable`, never `useReactTable`)
- **Issue:** The plan's action text says "Build a TanStack table with `useReactTable`". TanStack Table v9's hook is named `useTable`; `useReactTable` is the v8 API name and does not exist in the installed package.
- **Fix:** Used `useTable` from `@tanstack/react-table`, matching every other ReUI data-grid block already vendored in this codebase (`src/components/blocks/*/components/*-grid.tsx`).
- **Files modified:** `app/(authed)/clients/ClientsGrid.tsx`
- **Verification:** `npm run typecheck` exits 0.
- **Committed in:** `8ce66a1` (Task 2 commit)

**2. [Rule 1 - Bug] Neutralized `dataGridFeatures`' default row-pagination truncation**
- **Found during:** Task 2, while reading `rowPaginationFeature.types.d.ts` before wiring `useTable`
- **Issue:** `dataGridFeatures` registers `rowPaginationFeature`/`createPaginatedRowModel()`. Without an explicit `pagination` state, TanStack's default `{ pageIndex: 0, pageSize: 10 }` would silently truncate the grid to the first 10 of up to 20 server-fetched rows — a genuine data-loss bug a reader would not notice until testing an 11+ row client book.
- **Fix:** Passed controlled `state.pagination = { pageIndex: 0, pageSize: Math.max(rows.length, 1) }` (with a no-op `onPaginationChange`) so the paginated row model never slices below the full loaded page. `DataGridPagination` itself is still never imported or rendered — this only prevents the row MODEL from truncating, per the plan's explicit "recordCount is rows.length" contract.
- **Files modified:** `app/(authed)/clients/ClientsGrid.tsx`
- **Verification:** `ClientsGrid.test.tsx` Test 3 (two rows) plus manual trace of the row-pagination feature's default; `npm test` green.
- **Committed in:** `8ce66a1` (Task 2 commit)

**3. [Rule 3 - Blocking] Required-asterisk markup adjusted to match the plan's exact grep-gated convention**
- **Found during:** Task 3, `grep -c "text-destructive\">\*"` acceptance check
- **Issue:** First draft copied `CreatePartnerForm.tsx`'s exact asterisk markup (`<span className="ml-0.5 text-destructive" aria-hidden="true">*</span>`), which does not match the plan's literal `text-destructive">\*` grep pattern (an intervening `aria-hidden="true">` attribute breaks the match).
- **Fix:** Used the plan's own simpler stated convention (`<span className="text-destructive">*</span>`) instead.
- **Files modified:** `app/(authed)/clients/CreateClientDialog.tsx`
- **Verification:** `grep -c "text-destructive\">\*" app/(authed)/clients/CreateClientDialog.tsx` returns exactly `1`.
- **Committed in:** `1b98937` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 3 blocking, 1 Rule 1 bug). All were necessary for the code to function correctly against this project's actual installed package versions and the plan's own literal acceptance gates; none weaken CRM-01/02/07 or change the plan's `<behavior>` contracts.
**Impact on plan:** No scope creep — all three fixes are internal implementation details invisible to the plan's `<behavior>`/acceptance criteria, all of which pass unchanged.

## Issues Encountered

None beyond the three auto-fixed deviations above — all caught and resolved before any commit (no red commits exist in the history for this plan).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/clients` is live, server-rendered, owner-scoped, and reachable from the sidebar ("Clients" nav entry, registered in plan 30-02).
- `ClientsGrid`'s DataGrid adoption pattern (table/column/header machinery, cursor footer, `manualSorting`, no pagination/filters/row-selection) is the reference implementation for any future cursor-paginated CRM list — the admin companies view (deliberately) stays on the plain shadcn `Table` per 30-UI-SPEC.md, but Phase 33/34's pipeline/activity surfaces can reuse this exact pattern.
- `CreateClientDialog` is the reference implementation for the next real-app `Dialog` adopter (the client-detail contact add/edit dialog, a later plan in this phase).
- No blockers. `npm run typecheck`, `npm run lint:check`, `npm test` (1355 passed / 18 skipped — up from the 1335/18 baseline by 20 new tests), `npm run check:no-drizzle-push`, and `npm run build` (`.next/standalone/server.js` present, `/clients` listed in the route manifest) all pass.

## Self-Check: PASSED

- FOUND: `app/(authed)/clients/page.tsx` contains `requireRelationshipHolder` and `ownerId: session.user.id`
- CONFIRMED: `grep -nE "sp\.(ownerId|owner_id|user_id)" app/(authed)/clients/page.tsx` — no matches
- CONFIRMED: `grep -n "maxWidth" app/(authed)/clients/page.tsx` — no matches
- FOUND: `app/(authed)/clients/page.tsx` contains `export const dynamic = 'force-dynamic'`
- FOUND: `app/(authed)/clients/ClientsGrid.tsx` contains `DataGridTable`, `DataGridColumnHeader`, `manualSorting`, `delete('cursor')`, `className="card overflow-hidden p-0"`
- CONFIRMED: `grep -nE "DataGridPagination|DataGridTableRowSelect|RowSelectAll|components/reui/filters|FramePanel|<Frame" app/(authed)/clients/ClientsGrid.tsx` — no matches
- CONFIRMED: `grep -nE "\.sort\(|getSortedRowModel" app/(authed)/clients/ClientsGrid.tsx` — no matches
- FOUND: `app/(authed)/clients/CreateClientDialog.tsx` imports `Dialog` from `@/components/ui/dialog`
- CONFIRMED: `grep -nE "datalist|Combobox|autoComplete=\"on\"|useDebouncedValue|fetch\(" app/(authed)/clients/CreateClientDialog.tsx` — no matches
- CONFIRMED: `grep -n "role=\"dialog\"" app/(authed)/clients/CreateClientDialog.tsx` — no matches
- CONFIRMED: `grep -c "text-destructive\">\*" app/(authed)/clients/CreateClientDialog.tsx` — exactly `1`
- FOUND commit `2e058b1` in `git log --oneline --all`
- FOUND commit `8ce66a1` in `git log --oneline --all`
- FOUND commit `1b98937` in `git log --oneline --all`
- CONFIRMED: `npm run typecheck`, `npm run lint:check`, `npm test` (1355 passed / 18 skipped), `npm run check:no-drizzle-push`, `npm run build` all exit 0

---
*Phase: 30-company-contact-registry*
*Completed: 2026-09-01*
