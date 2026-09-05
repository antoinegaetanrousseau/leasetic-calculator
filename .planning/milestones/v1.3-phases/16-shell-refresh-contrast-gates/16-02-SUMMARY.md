---
phase: 16-shell-refresh-contrast-gates
plan: "02"
subsystem: shell
tags:
  - sidebar
  - topbar
  - icon-sizing
  - light-dark
  - verify-only
dependency_graph:
  requires:
    - "Plan 11-04 (RetractableSidebar + ThemeToggle + LocaleToggle shipped)"
  provides:
    - "Sidebar nav icons at 20px (D-12)"
    - "Collapsed theme cycle icons at 16px (D-14)"
    - "D-13 transparent inactive bg with cross-theme rationale comment"
    - "D-15 collapsed brand-row gap 24px fix"
    - "Topbar Figma 9:46 verification (D-16)"
  affects:
    - "src/components/ui/RetractableSidebar.tsx"
    - "src/components/Topbar.tsx"
tech_stack:
  added: []
  patterns:
    - "Inline style={{}} for React icon size props (lucide-react)"
key_files:
  modified:
    - "src/components/ui/RetractableSidebar.tsx"
    - "src/components/Topbar.tsx"
decisions:
  - "D-15 required a code fix (not just a verification comment): in collapsed mode the eyebrow div is not rendered, so the 24px marginTop it carries in expanded mode is absent. Added marginTop:24 on <ul> gated by `collapsed === true`."
  - "D-16 Topbar: pure verification, zero code change. All four visual contract rules matched exactly."
metrics:
  duration: "~12 minutes"
  completed: "2026-05-22"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 16 Plan 02: Sidebar Micro-Deltas + Topbar Verification Summary

Applied four visual micro-deltas (D-12/D-13/D-14/D-15) to RetractableSidebar and confirmed Topbar matches Figma 9:46 exactly (D-16, zero code change).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Apply D-12/D-13/D-14/D-15 sidebar micro-deltas | 09e2678 | src/components/ui/RetractableSidebar.tsx |
| 2 | D-16 Topbar visual verification + inline comment | 329e2bc | src/components/Topbar.tsx |

## Delta Confirmation

### D-12 — Nav icon size 18 → 20 (APPLIED)
- **File:** `src/components/ui/RetractableSidebar.tsx`, line 304 (inside `navItems.map`)
- **Change:** `<Icon size={18} ...>` → `<Icon size={20} ...>`
- **Scope:** Single render path shared by all 8 nav items (4 partner + 4 admin)
- **Unchanged:** `strokeWidth={1.6}`, active/inactive color expressions

### D-13 — Inactive nav background comment (APPLIED)
- **File:** `src/components/ui/RetractableSidebar.tsx`, above `background:` property in `itemStyle`
- **Change:** Added comment `// D-13: 'transparent' (not literal 'white') — correct for dark-mode cascade (sidebar bg shifts to --surface dark in dark theme; explicit white would break).`
- **Value:** `'transparent'` unchanged — no behavior change

### D-14 — Collapsed theme cycle icons 17 → 16 (APPLIED)
- **File:** `src/components/ui/RetractableSidebar.tsx`, lines 358-360 (collapsed-mode block)
- **Change:** `<Sun size={17}>`, `<Monitor size={17}>`, `<Moon size={17}>` → `size={16}` on all three
- **Scope:** Collapsed-mode cycle button only; expanded `<ThemeToggle current={theme} fullWidth />` untouched

### D-15 — Brand-row to first nav icon gap in collapsed mode (FIX APPLIED)
- **Outcome:** Code fix required (not just a verification comment)
- **Root cause:** In collapsed mode, the eyebrow `<div>` (which carries `marginTop: 24`) is not rendered (`{!collapsed && ...}`). The `<ul>` had `margin: 0` with no collapsed-specific override, yielding only the brand row's `marginBottom: 4` as effective gap — approximately 4px, well short of the required 24px.
- **Fix:** Added `marginTop: collapsed ? 24 : 0` on the `<ul id="leasetic-sidebar-nav">` element with an inline comment explaining the rationale and Figma reference.
- **Lines modified:** `src/components/ui/RetractableSidebar.tsx`, nav items `<ul>` opening tag (line ~280 after edits)
- **Expanded mode:** Unaffected — expanded mode `marginTop: 0` on `<ul>` preserves existing behavior (eyebrow div carries the 24px gap via its own `marginTop: 24`).

### D-16 — Topbar visual verification (PURE VERIFY — zero code change)
- **File:** `src/components/Topbar.tsx`
- **All four contract rules verified:**
  1. Page title: `fontSize: '16.5px'`, `fontWeight: 600`, `color: 'var(--ink)'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`, `whiteSpace: 'nowrap'`, `maxWidth: '60%'` — exact match
  2. ADMIN pill: `fontSize: '9px'`, `fontWeight: 700`, `background: 'var(--navy)'`, `color: '#ffffff'` — exact match
  3. Container: `height: 'var(--topbar-h)'`, `background: 'var(--surface)'`, `borderBottom: '1px solid var(--border)'`, `position: 'sticky'`, `top: 0`, `zIndex: 100` — exact match
  4. UserMenu right-aligned via `<div style={{ flex: 1 }} />` spacer — exact match
- **Comment added:** `// PHASE 16: verified visual match to Figma 9:46 on 2026-05-22 (D-16). Zero functional change.`

## Verify-Only Confirmations (SHELL-02, SHELL-04)

- **SHELL-02 (tri-state ThemeToggle):** `<ThemeToggle current={theme} fullWidth />` mount in expanded sidebar footer preserved. `grep -c "ThemeToggle current={theme} fullWidth" src/components/ui/RetractableSidebar.tsx` = 1.
- **SHELL-04 (FR/EN LocaleToggle):** `<LocaleToggle current={lang} fullWidth />` mount in expanded sidebar footer preserved. `grep -c "LocaleToggle current={lang} fullWidth" src/components/ui/RetractableSidebar.tsx` = 1.

## Test Results

- `RetractableSidebar.test.tsx`: 9 tests passed
- `tests/admin-09-grep-contracts.test.ts`: 9 tests passed (ADMIN-09 9-gate suite green)
- `npx tsc --noEmit`: clean (0 errors)
- `npm run build`: succeeded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug / Rule 2 - Missing Critical] D-15: collapsed sidebar brand-row gap was ~4px, not 24px**
- **Found during:** Task 1 inspection (D-15 instruction to "inspect first")
- **Issue:** In collapsed mode, the eyebrow `<div>` is gated by `{!collapsed && ...}` and not rendered. The `<ul>` had `margin: 0`, leaving only the brand row's `marginBottom: 4` as the effective gap — far below the Figma 23:46 24px specification.
- **Fix:** Added `marginTop: collapsed ? 24 : 0` to the `<ul>` element with explanatory comment. This is the minimum patch per D-15 instructions ("if the gap renders less, add `marginTop: 24` on `<ul>` in collapsed mode only").
- **Files modified:** `src/components/ui/RetractableSidebar.tsx`
- **Commit:** 09e2678

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access, or schema changes introduced.

## Self-Check: PASSED

- `src/components/ui/RetractableSidebar.tsx` exists and contains `size={20}`, `size={16}` (x3 + x2 chevrons), `D-13:`, `D-15:` comments, `'transparent'`, `ThemeToggle current={theme} fullWidth`, `LocaleToggle current={lang} fullWidth`
- `src/components/Topbar.tsx` exists and contains `PHASE 16: verified`
- Commit `09e2678` exists (Task 1)
- Commit `329e2bc` exists (Task 2)
- All tests green; build clean
