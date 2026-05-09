---
phase: 08-persistence-pdf-pipeline
plan: "08-11"
subsystem: home-list
tags: [home-list, search, cursor-pagination, recently-deleted-toggle, server-component, client-orchestrator]

dependency_graph:
  requires:
    - "08-02: i18n keys (proposal.search.*, proposal.list.*, proposal.deleted.*, dashboard.*)"
    - "08-08: buildListResponse helper + ProposalRowDto wire shape + GET /api/proposals"
    - "08-10: ValidityChip (nowMs prop pattern) + DeletedChip + RestoreButtonClient stub"
  provides:
    - "app/(authed)/page.tsx — Server Component populated home (SSR first paint via buildListResponse)"
    - "ProposalsList — 'use client' orchestrator: rows state + cursor + load-more"
    - "ProposalRow — 5-column grid row linking to /proposals/{id}"
    - "SearchBar — 300ms debounced input + ?q= URL state via router.replace"
    - "RecentlyDeletedToggle — 2-button pill tablist + ?deleted=0|1 URL state"
    - "LoadMoreButton — cursor-driven GET /api/proposals append"
    - "CSS: .list-row + .list-row.is-deleted + .search-bar + .toggle-pill + .toggle-pill.on"
  affects:
    - "08-12: delete/restore actions will wire into RestoreButtonClient stub (already rendered by ProposalsList)"
    - "08-13: Duplicate creates new proposals visible on home list"

tech-stack:
  added: []
  patterns:
    - "Server Component (async force-dynamic) SSR-fetches via buildListResponse; passes {rows, hasMore, nextCursor} + nowMs to ProposalsList client component"
    - "key={remountKey} (q|deleted|cursor) forces ProposalsList re-mount on URL navigation — useState initial values reset cleanly without useEffect"
    - "getNowMs() module-level async helper: Date.now() extracted from React component function to satisfy react-hooks/purity (same pattern as Plan 08-10)"
    - "SearchBar: useDebouncedValue(value, 300) from Phase 7 hook; useEffect on debounced → router.replace with cursor stripped"
    - "RecentlyDeletedToggle: role=tablist, two role=tab buttons with aria-selected"
    - "ProposalRow: nowMs passed as prop so ValidityChip stays pure (no Date.now() in chip render)"
    - "3 empty-state branches in ProposalsList: q>0 → SearchX; deleted → Trash2; net-zero → FileText (Phase 7 PROP-04)"

key-files:
  created:
    - src/components/proposals/ProposalRow.tsx
    - src/components/proposals/SearchBar.tsx
    - src/components/proposals/RecentlyDeletedToggle.tsx
    - src/components/proposals/LoadMoreButton.tsx
    - src/components/proposals/ProposalsList.tsx
  modified:
    - app/(authed)/page.tsx
    - app/globals.css

key-decisions:
  - "getNowMs() module-level async helper in page.tsx: mirrors Plan 08-10 pattern exactly — Date.now() outside component function satisfies react-hooks/purity"
  - "ProposalRow receives nowMs prop (not calling Date.now() itself): keeps ValidityChip pure through the render chain even when rendered from a client component (ProposalsList)"
  - "remountKey anchor strategy (key={q|deleted|cursor}): React re-mount resets useState cheaply without any useEffect-based row-clearing logic"
  - "SearchBar eslint-disable-next-line react-hooks/exhaustive-deps on the debounce useEffect: intentional — searchParams is stable per render anchor, only debounced value drives the URL update"
  - "CSS block appended below 08-10's chip block with clearly-bounded /* === Phase 8 (08-11) home list primitives === */ markers; existing rules untouched"

metrics:
  duration: "~25min"
  completed: "2026-05-09"
  tasks_completed: 4
  files_modified: 7
---

# Phase 8 Plan 11: Populated Home List Summary

**One-liner:** Server-Component SSR home page with 5-column ProposalRow list, 300ms debounced SearchBar (?q= URL state), RecentlyDeletedToggle pill (?deleted=1 URL state), cursor LoadMoreButton, and 3-branch empty-state preservation (net-zero / search-miss / deleted-miss).

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-09
- **Tasks:** 4/4
- **Files created:** 5 (ProposalRow, SearchBar, RecentlyDeletedToggle, LoadMoreButton, ProposalsList)
- **Files modified:** 2 (page.tsx, globals.css)

## Accomplishments

- `app/(authed)/page.tsx` now SSR-fetches via `buildListResponse` (no HTTP round-trip on SSR pass)
- ProposalsList client orchestrator manages rows / hasMore / cursor state; re-mounts cleanly via `key={remountKey}` anchor
- 5-column ProposalRow: clientCo (flex 1) / lcRef (100px mono) / amountHT (130px right-aligned tabular-nums) / createdAt (100px muted) / ValidityChip or DeletedChip (92px)
- SearchBar: 300ms debounce via Phase 7's `useDebouncedValue`; URL updated via `router.replace`; cursor stripped on new search
- RecentlyDeletedToggle: `role=tablist` + `role=tab` + `aria-selected`; strips cursor on toggle
- LoadMoreButton: fetches `/api/proposals?cursor=...` and appends rows
- 3 empty-state branches: SearchX (search miss) / Trash2 (deleted miss) / FileText Phase 7 PROP-04 (net-zero account)
- Deleted row variant: `is-deleted` CSS class (opacity 0.7, expanded grid columns) + DeletedChip + RestoreButtonClient slot
- CSS: `.list-row`, `.list-row.is-deleted`, `.search-bar`, `.toggle-pill`, `.toggle-pill.on` appended in clearly-bounded block below 08-10's chip block
- Build: `/` in route table; all guards pass; 399 tests (no regressions)

## Task Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1: globals.css CSS classes | `d837c28` | feat(08-11): append .list-row + .search-bar + .toggle-pill CSS classes to globals.css |
| Task 2: 4 primitive components | `e24a999` | feat(08-11): ProposalRow (5-col) + SearchBar (300ms debounce) + RecentlyDeletedToggle + LoadMoreButton |
| Task 3: ProposalsList + page.tsx | `6ac6bb7` | feat(08-11): ProposalsList client orchestrator + populated home page (PROP-02..05, PROP-20) |

## Empty-State Detection Strategy

Net-zero vs search-miss vs deleted-miss is detected entirely in `ProposalsList` when `rows.length === 0`:
- **Net-zero (PROP-04):** `q === "" && !deleted` → FileText icon + `dashboard.empty.*` (Phase 7 copy preserved)
- **Search miss:** `q.length > 0` → SearchX icon + `proposal.search.empty.*`
- **Deleted miss:** `deleted === true` → Trash2 icon + `proposal.deleted.empty.*`

The conditions are mutually exclusive by evaluation order: `q>0` is checked first, then `deleted`, then net-zero as the fallback.

## Guards

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint:check` | 0 errors, 0 warnings |
| `npm run check:no-vercel-imports` | OK |
| `npm test` | 399/399 pass (no delta — no new tests added) |
| `npm run build` | 0 errors; `/` in route table |
| `git status --porcelain` | `?? scripts/seed-partner-launch.ts` only |

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/proposals/ProposalRow.tsx` | 74 | 5-column grid row; Link to /proposals/{id}; ValidityChip/DeletedChip based on deleted prop; nowMs prop |
| `src/components/proposals/SearchBar.tsx` | 66 | Debounced search input (300ms); ?q= URL state; Search/X icons |
| `src/components/proposals/RecentlyDeletedToggle.tsx` | 57 | 2-button pill tablist; ?deleted=0|1 URL state; cursor reset on toggle |
| `src/components/proposals/LoadMoreButton.tsx` | 58 | Cursor-driven GET /api/proposals fetch; appends rows via onAppend callback |
| `src/components/proposals/ProposalsList.tsx` | 127 | Client orchestrator: rows/hasMore/cursor state; 3 empty-state branches; renders ProposalRow list |

## Files Modified

| File | Change |
|------|--------|
| `app/(authed)/page.tsx` | Full replacement: Phase 7 empty-state shell → SSR list orchestrator with buildListResponse + ProposalsList + SearchBar + RecentlyDeletedToggle |
| `app/globals.css` | Appended 61 lines: .list-row (+ .is-deleted variant) + .search-bar (+ :focus-within) + .toggle-pill (+ .on) in clearly-bounded block |

## Deviations from Plan

### [Rule 1 - Bug] react-hooks/purity flags Date.now() in component function

**Found during:** Task 3 (page.tsx)
**Issue:** The same `react-hooks/purity` ESLint rule from `eslint-config-next` that triggered in Plan 08-10 fired again when `const nowMs = Date.now()` was written directly inside the `HomePage` async function body. ESLint treats the component function as a render context and flags impure calls.
**Fix:** Extracted `getNowMs()` as a module-level async function (identical pattern to Plan 08-10's detail page). `HomePage` awaits `getNowMs()` before rendering — functionally identical, architecturally required.
**Files modified:** `app/(authed)/page.tsx`
**Commit:** `6ac6bb7`

Also propagated `nowMs` as a prop through `ProposalsList → ProposalRow → ValidityChip` to maintain the pure render chain even when `ProposalRow` is rendered from the client component context.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `RestoreButtonClient` slot | `src/components/proposals/ProposalsList.tsx` line 83 | Renders the 08-10 stub button for deleted rows; Plan 08-12 wires the real server action |

The stub renders correctly (button is visible with correct i18n label). The list's deleted-view is fully functional except the Restore action itself — which is Plan 08-12's scope.

## Threat Surface Scan

No new network endpoints introduced. The home page reads from the DB via `buildListResponse` (server-only, userId-scoped). The only new client-side network call is `LoadMoreButton → GET /api/proposals` which was already declared in the plan's threat model (same-origin cookie auth, T-08-11-01 cursor tamper mitigated by userId WHERE clause in 08-08).

| Threat | Mitigation Applied |
|--------|--------------------|
| T-08-11-01 | Cursor tamper: 08-08's WHERE userId=? filter excludes other partners' rows |
| T-08-11-03 | 300ms debounce caps search-as-you-type at ~3.3 Hz |
| T-08-11-04 | React JSX child-escape covers clientCo rendering |

## Self-Check: PASSED

- [x] `src/components/proposals/ProposalRow.tsx` exists, contains `ProposalRowDto`, `nowMs`, `ValidityChip`, `DeletedChip`
- [x] `src/components/proposals/SearchBar.tsx` exists, contains `'use client'`, `useDebouncedValue`, `role="search"`
- [x] `src/components/proposals/RecentlyDeletedToggle.tsx` exists, contains `'use client'`, `role="tablist"`
- [x] `src/components/proposals/LoadMoreButton.tsx` exists, contains `'use client'`, `/api/proposals?`
- [x] `src/components/proposals/ProposalsList.tsx` exists, contains `'use client'`, `EmptyBlock`, `LoadMoreButton`, `ProposalRow`
- [x] `app/(authed)/page.tsx` contains `buildListResponse`, `ProposalsList`, `SearchBar`, `RecentlyDeletedToggle`, `getNowMs`
- [x] `app/globals.css` has `.list-row`, `.list-row.is-deleted`, `.search-bar`, `.toggle-pill`, `.toggle-pill.on`
- [x] Commit `d837c28` exists in git log
- [x] Commit `e24a999` exists in git log
- [x] Commit `6ac6bb7` exists in git log
- [x] 399 tests pass (no regressions)
- [x] `npm run build` exits 0 with `/` in route table
- [x] `git status --porcelain` shows only `?? scripts/seed-partner-launch.ts`
