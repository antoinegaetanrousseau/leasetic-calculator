---
phase: 16-shell-refresh-contrast-gates
plan: "03"
subsystem: shell
tags:
  - shell
  - footer
  - i18n-reuse
  - light-dark
dependency_graph:
  requires:
    - src/lib/i18n/dictionaries.ts (shell.footer.privacy key — FR + EN, pre-existing)
    - app/(public)/layout.tsx (reference pattern for Mentions légales link)
  provides:
    - src/components/ui/Shell.tsx footer: flex space-between layout with copyright left + Mentions légales link right
  affects: []
tech_stack:
  added: []
  patterns:
    - Inline-style React server component (matches Phase 11 convention)
    - Reuses existing i18n key via t(key, lang) pattern
key_files:
  modified:
    - src/components/ui/Shell.tsx
  created: []
decisions:
  - Reused shell.footer.privacy (FR: Mentions légales / EN: Privacy notice) — no new key added
  - Used https://leasetic.fr/mentions-legales URL matching the public layout footer exactly
  - Link style: color var(--muted), textDecoration underline, fontSize 10.5px — inline style consistent with Phase 11 component patterns
  - justifyContent space-between + padding 0 24px — per D-18 and UI-SPEC §Spacing
metrics:
  duration: "~5 minutes"
  completed: "2026-05-22"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
  lines_added: 11
  lines_removed: 2
---

# Phase 16 Plan 03: Shell Footer Mentions Légales Link Summary

Authed `<Shell>` footer extended to flex space-between with copyright left and `Mentions légales` link right, reusing existing `shell.footer.privacy` i18n key and matching the public layout's external `leasetic.fr/mentions-legales` URL.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend Shell.tsx footer with Mentions légales link (D-17, D-18) | 36a01a3 | src/components/ui/Shell.tsx |

## What Was Built

The `<footer>` element in `src/components/ui/Shell.tsx` (lines 102-130) was modified:

**Before (lines 102-118):**
- `justifyContent: 'center'`
- Body: `{t('shell.footer.copyright', lang)}` (bare text, no wrapper)

**After (lines 102-130):**
- `justifyContent: 'space-between'`
- `padding: '0 24px'` added
- Body: `<span>{t('shell.footer.copyright', lang)}</span>` (left) + `<a href="https://leasetic.fr/mentions-legales" target="_blank" rel="noopener noreferrer" style={{...}}>{t('shell.footer.privacy', lang)}</a>` (right)

**Diff size:** +11 lines, -2 lines (net +9 lines in Shell.tsx)

## i18n Key Reuse Confirmation

- `shell.footer.privacy` key was NOT created in this plan — it already exists:
  - FR (`src/lib/i18n/dictionaries.ts` line 284): `'Mentions légales'`
  - EN (`src/lib/i18n/dictionaries.ts` line 950): `'Privacy notice'`
- `shell.footer.mentionsLegales` does NOT appear in `Shell.tsx` or `dictionaries.ts` (grep returns 0)
- Compile-time `_EnHasAllFrKeys` parity proof remains green (no new keys added)

## Verification Results

- `grep -c "shell.footer.privacy" src/components/ui/Shell.tsx` → 1
- `grep -c "justifyContent: 'space-between'" src/components/ui/Shell.tsx` → 1
- `grep -c "leasetic.fr/mentions-legales" src/components/ui/Shell.tsx` → 1
- `grep -c 'rel="noopener noreferrer"' src/components/ui/Shell.tsx` → 1
- `grep -c 'target="_blank"' src/components/ui/Shell.tsx` → 1
- `grep -c "padding: '0 24px'" src/components/ui/Shell.tsx` → 1
- `grep -c "shell.footer.copyright" src/components/ui/Shell.tsx` → 1
- `grep -c "shell.footer.mentionsLegales" Shell.tsx dictionaries.ts` → 0 (no new key)
- `grep -ci "commission" src/components/ui/Shell.tsx` → 0
- `npm run build` → Compiled successfully in 16.8s
- `npm run test -- --run tests/admin-09-grep-contracts.test.ts` → 9/9 tests passed

## Deviations from Plan

None — plan executed exactly as written. The `shell.footer.privacy` key reuse was already mandated by the plan (UI-SPEC discovery superseded CONTEXT.md D-18 assumption about a new key).

## Self-Check: PASSED

- [x] `src/components/ui/Shell.tsx` modified with correct changes
- [x] Commit 36a01a3 exists (`feat(16-03): extend authed footer with Mentions légales link (D-17, D-18)`)
- [x] No new i18n key created
- [x] Build passes
- [x] ADMIN-09 9-gate suite green (9/9)
