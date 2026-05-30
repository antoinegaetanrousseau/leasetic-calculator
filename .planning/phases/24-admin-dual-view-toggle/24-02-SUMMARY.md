---
phase: 24-admin-dual-view-toggle
plan: "02"
subsystem: view-toggle-ui
tags: [view-toggle, sidebar, tdd, a11y, session-storage, admin-only, effectiveView]
dependency_graph:
  requires:
    - src/lib/view-store.ts (Plan 24-01 — VIEW_STORAGE_KEY, subscribeView, getViewSnapshot, getServerViewSnapshot, setView, clearView, ViewMode)
    - sidebar.view.* i18n keys (Plan 24-01 — FR+EN, 4 keys each)
  provides:
    - src/components/ViewToggle.tsx (Admin|Agent segmented control + collapsed pill)
    - src/components/ViewToggle.test.tsx (9 tests — admin gate, radios, a11y, tint, redirects, collapsed pill, keyboard)
    - effectiveView computation in RetractableSidebar (D-02 auto-reconcile)
    - view-aware nav decision: isAdmin && effectiveView==='admin' (VIEW-04)
    - ViewToggle in both sidebar footers behind isAdmin gate (VIEW-01 / C-03)
    - adminHomeHref prop chain: (authed)/layout → Shell → RetractableSidebar
  affects:
    - src/components/ui/RetractableSidebar.tsx (effectiveView, nav decision, ViewToggle, adminHomeHref)
    - src/components/ui/RetractableSidebar.test.tsx (4 new tests)
    - src/components/ui/Shell.tsx (adminHomeHref prop passthrough)
    - app/(authed)/layout.tsx (adminHomeHref server-side computation)
tech_stack:
  added: []
  patterns:
    - useSyncExternalStore over sessionStorage view-store (same pattern as collapse store)
    - TDD RED/GREEN for ViewToggle (test-first, then implementation)
    - Admin-only gate via isAdmin && ... JSX conditional (C-03)
    - effectiveView = adminSegment ? 'admin' : storedView (D-02 auto-reconcile)
    - adminHomeHref forwarded server-side from ADMIN_URL_SEGMENT (T-24-06 accepted)
key_files:
  created:
    - src/components/ViewToggle.tsx
    - src/components/ViewToggle.test.tsx
  modified:
    - src/components/ui/RetractableSidebar.tsx
    - src/components/ui/RetractableSidebar.test.tsx
    - src/components/ui/Shell.tsx
    - app/(authed)/layout.tsx
decisions:
  - "fullWidth prop kept in ViewToggleProps interface for API completeness but always renders 100% in footer — ESLint warning (not error) on _fullWidth unused param, accepted"
  - "Test 4 tint assertion uses regex /rgba(18,\\s*150,\\s*87,\\s*0\\.1)/ — browser normalizes 0.10 to 0.1 in style attribute; implementation still uses the spec-exact 0.10 literal"
  - "adminSegment NOT forwarded from (authed) layout — deliberate omission; its presence in RetractableSidebar is the D-02 signal that forces effectiveView='admin', which would defeat agent view"
metrics:
  duration: "~5min"
  completed: "2026-05-30"
  tasks: 3
  files: 6
requirements_satisfied: [VIEW-01, VIEW-02, VIEW-04]
---

# Phase 24 Plan 02: View Toggle UI Summary

**One-liner:** Admin|Agent segmented control in sidebar footer with effectiveView auto-reconcile (D-02), view-aware nav decision guarded by real server role (VIEW-04), and server-side adminHomeHref plumbing for agent→admin redirect target.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Failing tests for ViewToggle | 94565bc | src/components/ViewToggle.test.tsx (created) |
| 1 (GREEN) | Implement ViewToggle component | 1656f95 | src/components/ViewToggle.tsx (created), ViewToggle.test.tsx (tint assertion fix) |
| 2 | Wire effectiveView + ViewToggle into RetractableSidebar | 6e9c8ce | RetractableSidebar.tsx, RetractableSidebar.test.tsx |
| 3 | Forward adminHomeHref — Shell + (authed) layout | 6c8c0a6 | Shell.tsx, app/(authed)/layout.tsx |

## What Was Built

**`src/components/ViewToggle.tsx`** — `'use client'` segmented control + collapsed pill:
- Reads `currentView` via `useSyncExternalStore(subscribeView, getViewSnapshot, getServerViewSnapshot)` — survives sidebar remount (C-01)
- `goto(mode)`: `setView(mode)` + `router.push(mode === 'agent' ? '/' : adminHrefs.home)` — D-01 redirect targets
- Expanded: `div[role="radiogroup"]` with `aria-label={t('sidebar.view.aria', lang)}`, two `button[role="radio"][aria-checked]` segments with `rgba(18, 150, 87, 0.10)` tint on selected, `var(--ink)` color, `py-2` spacing (not py-1.5 grid violation), ArrowLeft/ArrowRight keyboard nav, hover overlay on unselected only
- Collapsed: single pill (36×28, `var(--paper)` bg, `border: 1px solid var(--border)`) showing 'A'/'G', `aria-label={t('sidebar.view.cycle', lang)}`, cycles on click

**`src/components/ViewToggle.test.tsx`** — 9 tests all green:
- admin gate (default admin selected), two radios with text, radiogroup+aria-label (FR+EN), selected tint, click-to-agent redirects '/', click-to-admin redirects adminHrefs.home, collapsed pill A/G, ArrowRight keyboard switch

**`src/components/ui/RetractableSidebar.tsx`** — key changes:
- Imports: `ViewToggle`, `subscribeView/getViewSnapshot/getServerViewSnapshot/ViewMode` from view-store
- New prop: `adminHomeHref?: string` in `RetractableSidebarProps`
- `storedView = useSyncExternalStore(subscribeView, ...)` + `effectiveView = adminSegment ? 'admin' : storedView` (D-02)
- `viewToggleHome = adminHrefs?.home ?? adminHomeHref ?? '/'`
- Nav decision: `isAdmin && effectiveView === 'admin' ? adminNavItems(...) : partnerNavItems()` (VIEW-04 / T-24-03)
- Expanded footer: `{isAdmin && <ViewToggle lang={lang} adminHrefs={{ home: viewToggleHome }} fullWidth />}` as first child
- Collapsed footer: `{isAdmin && <ViewToggle lang={lang} adminHrefs={{ home: viewToggleHome }} collapsed />}` as first child

**`src/components/ui/RetractableSidebar.test.tsx`** — 4 new tests added (13 total, all green):
- AC-RS-24-01: admin expanded footer → 3 radiogroups (ViewToggle first, aria-label='Vue')
- AC-RS-24-02 (C-03 gate): isAdmin=false → no 'Vue' radiogroup
- AC-RS-24-03 (VIEW-02): stored 'agent' → 4 nav items; stored 'admin' → 6 nav items
- AC-RS-24-04 (D-02): adminSegment present + stored 'agent' → 6 nav items (admin forced)

**`src/components/ui/Shell.tsx`** — added `adminHomeHref?: string` to `ShellProps`, destructured + forwarded to `RetractableSidebar`.

**`app/(authed)/layout.tsx`** — computes `adminHomeHref = role === 'admin' && process.env.ADMIN_URL_SEGMENT ? \`/${...}\` : undefined` server-side; passes to `<Shell>`. `adminSegment` deliberately NOT forwarded (D-02 isolation). `isAdmin={role === 'admin'}` unchanged (C-02).

## Verification

- `npx vitest run src/components/ViewToggle.test.tsx` — 9/9 green
- `npx vitest run src/components/ui/RetractableSidebar.test.tsx` — 13/13 green
- `npm run test` — 91 test files passed, 1 skipped, 1184/1188 tests pass (zero regressions, ADMIN-09 grep contract unaffected)
- `npx tsc --noEmit` — no errors
- `npx eslint src/components/ViewToggle.tsx src/components/ui/RetractableSidebar.tsx src/components/ui/Shell.tsx "app/(authed)/layout.tsx"` — 0 errors (1 warning on unused _fullWidth param, accepted)
- UI-SPEC gates: `grep -c "py-1.5" ViewToggle.tsx` = 0 ✓; `grep -c "rgba(18, 150, 87, 0.10)" ViewToggle.tsx` = 1 ✓; `grep -c "var(--gd)" ViewToggle.tsx` = 0 ✓; `grep -c "#ffffff" ViewToggle.tsx` = 0 ✓
- VIEW-04/C-04 gate: no middleware/proxy/requireAdmin files in diff ✓
- `grep -c "adminSegment=" "app/(authed)/layout.tsx"` = 0 ✓ (deliberately absent)

## Deviations from Plan

### Minor Adjustments (no behavior impact)

**1. [Rule 1 - Bug] Test 4 tint assertion regex**
- **Found during:** Task 1 GREEN
- **Issue:** Test asserted `toContain('rgba(18, 150, 87, 0.10)')` but jsdom normalizes `0.10` → `0.1` in style attribute serialization. Implementation correctly uses `0.10` per UI-SPEC.
- **Fix:** Changed assertion to `toMatch(/rgba\(18,\s*150,\s*87,\s*0\.1\)/)` — matches both `0.1` and `0.10`.
- **Files modified:** src/components/ViewToggle.test.tsx
- **Commit:** 1656f95

**2. [Rule 2 - Missing functionality] next/navigation mock in RetractableSidebar.test.tsx**
- **Found during:** Task 2
- **Issue:** New tests rendering with `isAdmin={true}` would cause ViewToggle to call `useRouter()` without a mock.
- **Fix:** Added `vi.mock('next/navigation', ...)` at the top of the test file.
- **Files modified:** src/components/ui/RetractableSidebar.test.tsx
- **Commit:** 6e9c8ce

## Known Stubs

None — all functionality is fully wired. The toggle reads real sessionStorage, computes effectiveView, picks real nav items, and redirects to real hrefs.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. T-24-03, T-24-04, T-24-05, T-24-06 all mitigated/accepted as documented in the plan.

## Self-Check: PASSED

- [x] src/components/ViewToggle.tsx exists
- [x] src/components/ViewToggle.test.tsx exists (9 tests green)
- [x] src/components/ui/RetractableSidebar.tsx contains effectiveView (×2) and <ViewToggle (×2)
- [x] src/components/ui/Shell.tsx contains adminHomeHref (×3)
- [x] app/(authed)/layout.tsx contains adminHomeHref (×3) and ADMIN_URL_SEGMENT (×1)
- [x] Commits 94565bc, 1656f95, 6e9c8ce, 6c8c0a6 present in git log
- [x] Full test suite: 91 files / 1184 tests pass
- [x] tsc clean, eslint 0 errors
