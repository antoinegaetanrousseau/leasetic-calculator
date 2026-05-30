---
phase: 24-admin-dual-view-toggle
plan: "01"
subsystem: view-store
tags: [session-storage, external-store, i18n, auth, view-toggle]
dependency_graph:
  requires: []
  provides:
    - src/lib/view-store.ts (VIEW_STORAGE_KEY, VIEW_TOGGLE_EVENT, ViewMode, DEFAULT_VIEW, getViewSnapshot, getServerViewSnapshot, subscribeView, setView, clearView)
    - sidebar.view.* i18n keys (FR + EN, 4 keys each)
    - UserMenu.handleLogout clears view flag (D-04 / VIEW-03)
  affects:
    - src/components/UserMenu.tsx (logout flow)
    - src/lib/i18n/dictionaries.ts (parity proof)
tech_stack:
  added: []
  patterns:
    - useSyncExternalStore external store over sessionStorage (analog: collapse store in RetractableSidebar)
    - dual-listener subscribe (storage event + custom dispatchEvent) for cross-tab + same-tab reactivity
key_files:
  created:
    - src/lib/view-store.ts
    - src/lib/view-store.test.ts
  modified:
    - src/lib/i18n/dictionaries.ts
    - src/components/UserMenu.tsx
decisions:
  - "view-store.ts has no 'use client' — plain utility consumed by client components (Plan 02 imports directly)"
  - "localStorage reference kept in JSDoc comment only — documents the analog pattern source; no functional localStorage usage"
  - "clearView() does not dispatch VIEW_TOGGLE_EVENT — session is ending, no subscriber needs to react"
metrics:
  duration: "~2min"
  completed: "2026-05-30"
  tasks: 2
  files: 4
requirements_satisfied: [VIEW-03]
---

# Phase 24 Plan 01: View-Store Foundation Summary

**One-liner:** sessionStorage `useSyncExternalStore` triple for admin/agent view flag — default='admin', event-driven same-tab reactivity, clearView on logout.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Failing tests for view-store | 3b3af5d | src/lib/view-store.test.ts (created) |
| 1 (GREEN) | Implement view-store module | 5e1d212 | src/lib/view-store.ts (created) |
| 2 | i18n keys + clearView on logout | 261f43c | src/lib/i18n/dictionaries.ts, src/components/UserMenu.tsx |

## What Was Built

**`src/lib/view-store.ts`** — standalone sessionStorage external-store module (no `'use client'`):
- Constants: `VIEW_STORAGE_KEY = 'leasetic.view'`, `VIEW_TOGGLE_EVENT = 'leasetic-view-toggled'`
- Type: `ViewMode = 'admin' | 'agent'`, `DEFAULT_VIEW = 'admin'`
- `getViewSnapshot()`: reads sessionStorage, guards `typeof window`, coerces absent/junk to `'admin'`
- `getServerViewSnapshot()`: returns `'admin'` (SSR safe)
- `subscribeView()`: dual-listener (storage + custom event), returns cleanup fn
- `setView()`: writes sessionStorage + dispatches custom event for same-tab reactivity
- `clearView()`: removes key (logout wiring per D-04 / VIEW-03)

**`src/lib/view-store.test.ts`** — 8 Vitest tests covering all behavior cases (all green).

**`src/lib/i18n/dictionaries.ts`** — 4 new `sidebar.view.*` keys in both FR and EN blocks:
- `sidebar.view.admin`: 'Admin' / 'Admin'
- `sidebar.view.agent`: 'Agent' / 'Agent'
- `sidebar.view.cycle`: 'Changer de vue' / 'Switch view'
- `sidebar.view.aria`: 'Vue' / 'View'
- `_EnHasAllFrKeys` parity proof holds (tsc green).

**`src/components/UserMenu.tsx`** — `clearView()` called after `authClient.signOut()` and before `router.push('/login?logged_out=1')`.

## Verification

- `npx vitest run src/lib/view-store.test.ts` — 8/8 tests pass
- `npx tsc --noEmit` — no errors (parity proof green)
- `npx eslint src/lib/view-store.ts src/lib/i18n/dictionaries.ts src/components/UserMenu.tsx` — no errors
- `grep -c "sidebar.view." src/lib/i18n/dictionaries.ts` → 8 (4 FR + 4 EN)
- `grep -c "'use client'" src/lib/view-store.ts` → 0
- `grep -c "localStorage" src/lib/view-store.ts` → 1 (JSDoc comment only, no functional usage)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — view-store.ts exports the full API. Plan 02 can import all required symbols with no further work.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

- [x] src/lib/view-store.ts exists
- [x] src/lib/view-store.test.ts exists
- [x] Commits 3b3af5d, 5e1d212, 261f43c present in git log
- [x] 8 tests pass
- [x] tsc clean
