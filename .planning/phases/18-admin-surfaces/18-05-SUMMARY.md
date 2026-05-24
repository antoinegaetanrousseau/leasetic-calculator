---
phase: 18
plan: 05
subsystem: admin-surfaces
tags: [coefficients, warning-banner, sessionStorage, history-sidebar, click-to-diff-removal, ADMIN-09, ADMIN-14, THEME-02]
dependency_graph:
  requires:
    - app/(admin)/[adminSegment]/coefficients/page.tsx (Phase 14)
    - app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx (Phase 14)
    - app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebarRow.tsx (Phase 14)
    - app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx (Phase 14 — stays intact on /history)
    - src/components/ui/PageHero.tsx (Phase 16)
    - src/lib/i18n/dictionaries.ts (Plan 18-01: warning + viewAll keys)
    - __tests__/setup-dom.ts (Plan 18-01: sessionStorage polyfill)
    - lucide-react AlertTriangle icon
  provides:
    - CoefficientWarningBanner client component (D-19/D-20 dismissable banner)
    - Read-only history sidebar rows (D-22 click-to-diff removed)
    - PageHero-adopted /coefficients surface (consistent with Phase 18 18-02/03/04)
    - Shortened admin.coefficients.page.title value "Coefficients" (Open Q9)
  affects:
    - Plan 18-07 closing-out 12-checkpoint visual sign-off (this surface ships dark/light derived via Phase 16 token cascade)
tech_stack:
  added: []
  patterns:
    - Per-session dismissable banner via sessionStorage with SSR-safe useEffect guard + try/catch fallback
    - In-place component refresh preserving file path / exported symbol / prop shape
    - Source-string meta-assertion test to enforce D-22 "no CoefficientDiffPanel reference" contract (excludes documentation comments via strip)
key_files:
  created:
    - app/(admin)/[adminSegment]/coefficients/_components/CoefficientWarningBanner.tsx
    - app/(admin)/[adminSegment]/coefficients/_components/CoefficientWarningBanner.test.tsx
  modified:
    - app/(admin)/[adminSegment]/coefficients/page.tsx
    - app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx
    - app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.test.tsx
    - app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebarRow.tsx
    - src/lib/i18n/dictionaries.ts
decisions:
  - "T1-T8 sessionStorage spies replaced with observable-state assertions because the Plan 18-01 polyfill replaces window.sessionStorage with a plain object (not Storage.prototype), so vi.spyOn against Storage.prototype/window.sessionStorage methods would not intercept"
  - "SeedBanner preserved ABOVE PageHero (not removed) — it is a Phase 10 first-edit prompt and a higher-priority surface than the new D-19 advisory banner; both can coexist (SeedBanner only renders when isStillSeed===true, which is a one-time post-deploy state)"
  - "Row component dropped 'use client' directive — no state or handlers remain after D-22 removal, so it now composes inside the server-component sidebar without a client boundary"
  - "Open Q9: shortened admin.coefficients.page.title value FR+EN to 'Coefficients' (single consumer verified via grep)"
metrics:
  duration_min: 12
  completed_date: 2026-05-24
  tasks_complete: 3
  tests_added: 16
  files_created: 2
  files_modified: 5
---

# Phase 18 Plan 05: Coefficients Warning Banner + History Refresh Summary

Coefficients admin surface receives Figma `45:46` refresh: new dismissable warning banner above the editor (D-19 placement, D-20 sessionStorage per-session dismissal), in-place history sidebar chrome tightening (D-21), and removal of the Phase 14 click-to-diff handler (D-22). Editor card untouched structurally.

## What Built

### Task 1 — CoefficientWarningBanner (D-19/D-20) — commit 65c36f7

NEW `'use client'` component at `app/(admin)/[adminSegment]/coefficients/_components/CoefficientWarningBanner.tsx`:

- Visual chrome: `rgba(224,133,48,0.10)` background tint, `1px solid var(--border)`, `4px solid var(--gold)` left accent stripe, `borderRadius:8`, `padding:12px 16px`, `marginBottom:16`. Matches UI-SPEC §Coefficients lines 481-488 verbatim.
- AlertTriangle icon (lucide, 18px, `--gold-text`) + body copy (Plan 18-01 i18n key `admin.coefficients.warning.body`) + `×` close button with aria-label from `admin.coefficients.warning.dismiss.aria`.
- Dismissable per-session: × click writes `sessionStorage['gsd.coefficients.warning.dismissed'] = '1'` and re-renders to `null`. Tab close clears sessionStorage → banner returns on next visit (D-20).
- SSR-safe: read happens inside `useEffect` + `typeof window === 'undefined'` guard + `try/catch` around storage access (handles private-browsing `SecurityError`). Initial render is always "banner visible" → graceful default; one-frame flicker for already-dismissed users acceptable per UI-SPEC line 498-500 baseline.

**8 tests (RED → GREEN):**
- T1 first visit renders icon + body + × button
- T2 already-dismissed sessionStorage state → banner returns null after effect
- T3 × click writes sessionStorage and hides on same click (observed via stored value)
- T4 persistence is sessionStorage NOT localStorage (observed via both storages)
- T5 FR i18n body copy matches dictionary verbatim
- T6 × aria-label matches dictionary in FR + EN
- T7 SSR-safe: even when sessionStorage.getItem throws, render does not throw (covers both SSR + private-browsing cases)
- T8 visual chrome — inline style matches gold accent + locked dimensions

### Task 2 — CoefficientHistorySidebar in-place refresh (D-21/D-22) — commit b97477a

IN-PLACE refresh of `CoefficientHistorySidebar.tsx` + `CoefficientHistorySidebarRow.tsx`:

- **D-22 click-to-diff removed:** Row component no longer has `role="button"`, `tabIndex`, `onClick`, `cursor:pointer`, or any state. The `CoefficientDiffPanel` import and JSX mount removed. Rows are now READ-ONLY.
- **D-21 chrome refresh:** Row renders the UI-SPEC §Coefficients lines 511-518 contract: `padding:'12px 16px'`, `borderBottom:'1px solid var(--border)'`, `cursor:'default'`. 3-element vertical stack — top line (relative time 13px/600/--ink + admin name 13px/400/--muted), middle line (change summary 12.5px/400/--muted/lineHeight 1.4), optional italic note line.
- **Footer link updated:** Uses new Plan 18-01 key `admin.coefficients.history.viewAll` (FR: `Voir tout l'historique →`, EN: `View full history →`). Sidebar already had a `coefficients.history.viewAll` key from Phase 14 but the D-21 contract pins it to the new namespaced key.
- **Preserved:** 2-column layout (owned by parent page), cursor pagination (Phase 14 mount stays), `/history` link at bottom, empty state copy + footer hidden when rows empty, header chrome (`● HISTORIQUE` `.ctitle + .dot`), server-component identity, file path, exported symbol name, prop shape (`{ lang, adminSegment }`).
- **Row component** dropped `'use client'` directive — no state or handlers remain, so it composes inside the server-component sidebar without a client boundary.
- **CoefficientDiffPanel.tsx** stays intact at `app/(admin)/[adminSegment]/history/` and continues to be rendered by `CoefficientHistoryRow.tsx` on the `/history` full-page route.

**8 tests (Phase 14 click-to-diff suite REPLACED per D-22):**
- T1 row has NO `role="button"` and clicking is a no-op (DOM string unchanged)
- T2 row cursor is `default`, not `pointer`
- T3 3-element stack content
- T4 row chrome — padding 12px 16px + borderBottom var(--border)
- T5 footer link uses `admin.coefficients.history.viewAll`
- T6 empty state — footer hidden
- T7 header chrome preserved
- T8 meta-assert: source code (with comments stripped) contains NO `CoefficientDiffPanel` reference, NO `openDiff`, NO `onClick.*diff` in either sidebar or row file

### Task 3 — page.tsx wiring + Open Q9 i18n shortening — commit 22586e8

`app/(admin)/[adminSegment]/coefficients/page.tsx` refactored per UI-SPEC lines 458-471 + line 908:

- **PageHero adoption** — Phase 16 primitive replaces the inline `<h1>` + `<p>` hero (consistent with the rest of Phase 18 18-02/03/04).
- **CoefficientWarningBanner** mounts BETWEEN PageHero subtitle and the 2-col layout (D-19 placement).
- **SeedBanner preserved** ABOVE the PageHero. It is a Phase 10 first-edit prompt and a higher-priority surface than the new D-19 advisory banner; both can coexist (SeedBanner only renders when `isStillSeed===true`, a one-time post-deploy state).
- **Layout switched from CSS grid → flex** per UI-SPEC line 461-463: left column `flex:1 minWidth:0` (editor + ExplainTool), right column `width:360 flexShrink:0` (CoefficientHistorySidebar).
- **Max-width 1040 → 1280** per UI-SPEC line 908; outer wrapper is now `<main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>`.
- **Open Q9 i18n shortening** — `admin.coefficients.page.title` value FR+EN shortened from `Coefficients & Commission` → `Coefficients` to match Figma `45:46` hero. Verified single consumer (this page.tsx) via grep before changing. Value-only change of an EXISTING key — no net-new key.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test infrastructure mismatch] `vi.spyOn(window.sessionStorage, '...')` does not intercept polyfilled storage**

- **Found during:** Task 1 GREEN phase (3 of 8 tests failed on first run).
- **Issue:** The Plan 18-01 sessionStorage polyfill at `__tests__/setup-dom.ts` installs a plain object via `Object.defineProperty(globalThis, 'sessionStorage', { value: ... })` — not a `Storage.prototype` instance. Plan 18-05 tests T3/T4/T7 originally used `vi.spyOn(Storage.prototype, 'setItem')` and `vi.spyOn(window.sessionStorage, 'setItem')`, neither of which intercepts a plain-object polyfill.
- **Fix:** Rewrote T3/T4 to assert observable state — `window.sessionStorage.getItem(DISMISS_KEY)` before and after the click. Rewrote T7 to mutate `window.sessionStorage.getItem` to throw and assert `render(...)` still does not throw (covers both SSR-safety and private-browsing-safety with the same assertion). The behavior-tests-via-observable-state approach is more robust than spying on call signatures: it survives polyfill swaps, jsdom upgrades, and any upstream `window.Storage` API spec change if/when it happens.
- **Files modified:** `app/(admin)/[adminSegment]/coefficients/_components/CoefficientWarningBanner.test.tsx`
- **Commit:** 65c36f7 (folded into Task 1 — fix happened during the same RED→GREEN iteration).

**2. [Rule 1 - Test meta-assertion false-positive on JSDoc] T8 D-22 meta-check matched `<CoefficientDiffPanel>` in documentation comments**

- **Found during:** Task 2 GREEN phase (1 of 8 tests failed).
- **Issue:** T8 reads `CoefficientHistorySidebar.tsx` + `CoefficientHistorySidebarRow.tsx` source and asserts no `CoefficientDiffPanel` reference. The Row component's JSDoc explicitly mentions `<CoefficientDiffPanel>` for traceability ("Phase 14 baseline shipped each row as ... with an expandable <CoefficientDiffPanel> mount. Plan 18-05 D-22 moves the diff modal..."). A naive regex matched the doc string.
- **Fix:** T8 now strips block comments (`/* ... */`) and line comments (`// ...`) BEFORE matching. The contract intent is "no IMPORT or MOUNT of CoefficientDiffPanel in CODE" — JSDoc traceability mentions are explicitly allowed. The strip is a simple but robust regex that handles all the comment patterns in this file.
- **Files modified:** `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.test.tsx`
- **Commit:** b97477a (folded into Task 2).

### Out-of-Scope Discoveries (NOT fixed)

- **`__pdf-fixtures__/render-fixtures.test.ts` byte-drift** — 2 tests fail (happy-path-en + paired fixture). Confirmed pre-existing via `git stash` + re-run: same 2 failures with my changes reverted. This is the identical failure flagged in Plan 18-01 SUMMARY's "Out-of-Scope Discoveries" section. The regeneration runbook is the appropriate fix path (`npm run regenerate-fixtures` or equivalent); not in Plan 18-05's scope. Already logged in `.planning/phases/18-admin-surfaces/deferred-items.md` per Plan 18-01.

## Known Stubs

None. All three tasks ship complete behavior — no placeholders, no TODOs, no commented-out wiring. The warning banner is fully functional with real i18n copy + real sessionStorage persistence; the sidebar refresh has the full D-21 chrome contract; the page wires every prop.

## Threat Flags

No new threat surface introduced beyond what Plan 18-05's `<threat_model>` anticipated:

- **T-18-05-01 (sessionStorage tampering):** ACCEPTED — banner is informational only; coefficient edits gated server-side via `requireAdmin()` (Phase 14 layer preserved).
- **T-18-05-02 (commission via warning copy):** MITIGATED — copy is generic (`Modifier ces valeurs change le calcul...`) and contains NO commission value. Verified by reading FR + EN dictionary entries (Task 1 T5).
- **T-18-05-03 (XSS via i18n):** MITIGATED — `t()` returns plain strings rendered as React text children, which React auto-escapes. No raw-HTML injection sinks anywhere in the new code.
- **T-18-05-04 (commission via history row summary):** ACCEPTED — `row.summary` (Phase 14 contract) may include commission values when commission was the modified field. This is the pre-existing ADMIN-09 D-12 allowed exception on the admin coefficient-editing surface. Plan 18-05 D-21/D-22 changes do NOT add new commission exposure paths.
- **T-18-05-05 (SSR crash on sessionStorage):** MITIGATED — `useEffect` + `typeof window === 'undefined'` guard + `try/catch` around storage access. Test T7 asserts a hostile `getItem` (throwing implementation) still permits render.
- **T-18-05-06 (silent banner dismissal):** ACCEPTED — banner is a UX nudge, not a legal disclosure; no audit log entry required.

**ADMIN-09 9-gate suite remains green (9/9 pass)** — verified post-Task-3 against `tests/admin-09-grep-contracts.test.ts`. Plan 18-05 introduces zero commission-adjacent surface; warning banner copy is generic, history sidebar refresh preserves the pre-existing Phase 14 D-12 allowed exception unchanged.

## Verification

```
npx vitest run "app/(admin)/[adminSegment]/coefficients/" tests/admin-09-grep-contracts.test.ts
→ Test Files  3 passed (3)
  Tests       25 passed (25)

npx vitest run "src/lib/i18n/"
→ Test Files  2 passed (2)
  Tests       307 passed (307)   (_EnHasAllFrKeys parity proof intact)

npx tsc --noEmit
→ exits 0 (TS clean)

grep -nE "openDiff|onClick.*diff|cursor:.*pointer" app/\(admin\)/\[adminSegment\]/coefficients/CoefficientHistorySidebar.tsx
→ no hits (D-22 click-to-diff fully removed)

grep -n "admin.coefficients.history.viewAll" app/\(admin\)/\[adminSegment\]/coefficients/CoefficientHistorySidebar.tsx
→ 2 hits (JSDoc + render)

grep -n "CoefficientHistorySidebar" app/\(admin\)/\[adminSegment\]/coefficients/page.tsx
→ 3 hits (import + comment + render — sidebar still mounted)

grep -rln "CoefficientDiffPanel" app/\(admin\)/\[adminSegment\]/history/
→ 6 files (intact — diff modal continues to live on /history per D-22)

grep -n "sessionStorage" app/\(admin\)/\[adminSegment\]/coefficients/_components/CoefficientWarningBanner.tsx
→ 7 hits (JSDoc + read + write paths)

grep -n "localStorage" app/\(admin\)/\[adminSegment\]/coefficients/_components/CoefficientWarningBanner.tsx
→ 0 hits (per-session only per D-20)

grep -n "gsd.coefficients.warning.dismissed" app/\(admin\)/\[adminSegment\]/coefficients/_components/CoefficientWarningBanner.tsx
→ 2 hits (JSDoc + constant)
```

Pre-existing PDF fixture drift in `__pdf-fixtures__/render-fixtures.test.ts` (2 failures) — confirmed unrelated to Plan 18-05 via stash + rerun; flagged in Plan 18-01 SUMMARY + `.planning/phases/18-admin-surfaces/deferred-items.md`.

Manual visual sign-off (light + dark) deferred to Plan 18-07 (the closing-out 12-checkpoint sweep — 6 surfaces × 2 modes).

## Commits

| Hash    | Task   | Summary |
| ------- | ------ | ------- |
| 65c36f7 | Task 1 | `feat(18-05): CoefficientWarningBanner dismissable per-session (D-19/D-20)` — new client component + 8 RED→GREEN tests; sessionStorage persistence + SSR/private-browsing safety + lucide AlertTriangle + locked --gold chrome |
| b97477a | Task 2 | `refactor(18-05): CoefficientHistorySidebar in-place refresh (D-21/D-22)` — Phase 14 click-to-diff suite replaced with the D-22 read-only contract; row chrome rewritten to UI-SPEC lines 511-518; CoefficientDiffPanel import + mount removed from sidebar+row (intact on /history); footer link copy via Plan 18-01 viewAll key |
| 22586e8 | Task 3 | `feat(18-05): wire CoefficientWarningBanner + PageHero + flex 2-col layout` — page.tsx adopts PageHero, mounts banner between hero+layout, switches grid→flex, bumps max-width to 1280; admin.coefficients.page.title shortened to 'Coefficients' per Open Q9 |

## Self-Check: PASSED

Files verified to exist:
- ✓ `app/(admin)/[adminSegment]/coefficients/_components/CoefficientWarningBanner.tsx`
- ✓ `app/(admin)/[adminSegment]/coefficients/_components/CoefficientWarningBanner.test.tsx`
- ✓ `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.tsx` (modified in place — exports `CoefficientHistorySidebar`)
- ✓ `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebar.test.tsx` (D-22 contract suite)
- ✓ `app/(admin)/[adminSegment]/coefficients/CoefficientHistorySidebarRow.tsx` (modified in place — exports `CoefficientHistorySidebarRow`, no more `CoefficientDiffPanel` import)
- ✓ `app/(admin)/[adminSegment]/coefficients/page.tsx` (modified — imports `CoefficientWarningBanner`, `PageHero`)
- ✓ `src/lib/i18n/dictionaries.ts` (modified — `admin.coefficients.page.title` value `'Coefficients'` FR+EN)
- ✓ `app/(admin)/[adminSegment]/history/CoefficientDiffPanel.tsx` (intact — diff modal stays on /history per D-22)

Commits verified to exist (via `git log --oneline | grep`):
- ✓ 65c36f7
- ✓ b97477a
- ✓ 22586e8
