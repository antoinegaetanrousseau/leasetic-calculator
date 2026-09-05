---
phase: 16-shell-refresh-contrast-gates
plan: "04"
subsystem: admin-shell
tags:
  - shell
  - admin
  - reference-adopter
  - page-hero
  - i18n
dependency_graph:
  requires:
    - 16-01  # PageHero primitive (shipped in Wave 1)
  provides:
    - SHELL-03 consumer side (admin home PageHero adoption)
    - admin.home.eyebrow i18n key (FR + EN)
  affects:
    - app/(admin)/[adminSegment]/page.tsx
    - src/lib/i18n/dictionaries.ts
tech_stack:
  added: []
  patterns:
    - PageHero consumption via named import from @/components/ui/PageHero
    - Flat dotted i18n key addition (admin.home.eyebrow) with FR/EN parity
key_files:
  modified:
    - src/lib/i18n/dictionaries.ts
    - app/(admin)/[adminSegment]/page.tsx
decisions:
  - Add admin.home.eyebrow with value 'ADMIN' in both FR and EN (matches Topbar ADMIN pill, per CONTEXT.md Claude's Discretion)
  - No actions prop on PageHero — Nouvelle proposition CTA deferred to Phase 18 per D-06 / CONTEXT.md §Specifics
  - PageHero marginBottom 32 (D-04) + grid marginTop 32 preserved — 32px hero-to-grid spacing intact without extra code
metrics:
  duration: "~5 minutes"
  completed: "2026-05-22"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 16 Plan 04: Admin Home PageHero Migration Summary

Admin home page migrated from inline `<h1>` + `<p>` hero to the `<PageHero>` primitive (Plan 16-01), with one new i18n key pair (`admin.home.eyebrow`, value `'ADMIN'` in both FR and EN). This is the SHELL-03 reference adopter — the single Phase 16 consumer that proves the PageHero contract against a real page with all three optional text props (eyebrow + title + subtitle).

## Tasks Completed

| # | Task | Commit | Files Modified |
|---|------|--------|----------------|
| 1 | Add admin.home.eyebrow FR + EN i18n keys | 7777288 | src/lib/i18n/dictionaries.ts |
| 2 | Migrate admin home page to PageHero consumer | 0d02594 | app/(admin)/[adminSegment]/page.tsx |

## Changes by File

### src/lib/i18n/dictionaries.ts
- **Lines edited:** FR ~line 437 (inserted above `admin.home.title`), EN ~line 1092 (symmetric position)
- **Insertions:** 4 lines total (2 comment lines + 2 key entries)
- **New keys:** `'admin.home.eyebrow': 'ADMIN'` in both FR and EN dictionaries
- **Verified present (pre-existing):** `admin.home.title` (FR/EN: 'Administration') — count 2, `admin.home.subtitle` (FR: 'Gérez les paramètres globaux et les comptes' / EN: 'Manage global parameters and accounts') — count 2
- **_EnHasAllFrKeys compile-time parity proof:** stays green (tsc --noEmit exits 0)

### app/(admin)/[adminSegment]/page.tsx
- **Diff size:** 6 lines added, 22 lines removed (net −16)
- **Import added (1 line):** `import { PageHero } from '@/components/ui/PageHero';`
- **Replaced:** inline `<h1>` block (10 lines) + `<p>` block (9 lines) + blank line between = 22 lines removed
- **Replaced with:** `<PageHero eyebrow={...} title={...} subtitle={...} />` self-closing element (4 lines) + blank line = 5 lines

## Preserved Invariants

| Invariant | Verified |
|-----------|----------|
| `requireAdmin()` AUTH-15 defense-in-depth | yes — present (grep count 4, including JSDoc reference) |
| `export const dynamic = 'force-dynamic'` | yes — present (grep count 1) |
| `export const metadata` block | yes — unchanged |
| 3-card AdminNavCard grid (coefficients / partners / history) | yes — 3 `<AdminNavCard` instances, `repeat(3, 1fr)`, gap 24, maxWidth 1040 |
| `marginTop: 32` on grid (32px hero-to-grid gap) | yes — preserved; PageHero supplies `marginBottom: 32` (D-04) |
| No `actions` prop | yes — no Nouvelle proposition CTA in Phase 16 (Phase 18 enhancement) |

## Acceptance Criteria

| Check | Result |
|-------|--------|
| `grep -c "import { PageHero } from '@/components/ui/PageHero'" page.tsx` | 1 |
| `grep -c "<PageHero" page.tsx` | 1 |
| `grep -c "admin.home.eyebrow" page.tsx` | 1 |
| `grep -c "<h1" page.tsx` | 0 (h1 now rendered by PageHero internally) |
| `grep -c "admin.home.title\|admin.home.subtitle" page.tsx` | 2 |
| `grep -c "requireAdmin" page.tsx` | 4 |
| `grep -c "export const dynamic = 'force-dynamic'" page.tsx` | 1 |
| `grep -c "<AdminNavCard" page.tsx` | 3 |
| `grep -c "'admin.home.eyebrow': 'ADMIN'" dictionaries.ts` | 2 (FR + EN) |
| `grep -c "'admin.home.title':" dictionaries.ts` | 2 |
| `grep -c "'admin.home.subtitle':" dictionaries.ts` | 2 |
| ADMIN-09 9-gate grep-contract suite | 9/9 passed |
| `npx tsc --noEmit` | exits 0 |
| `npm run build` | exits 0 |

## i18n Keys Added

| Key | FR value | EN value | Action |
|-----|----------|----------|--------|
| `admin.home.eyebrow` | `'ADMIN'` | `'ADMIN'` | NEW (Plan 16-04) |
| `admin.home.title` | `'Administration'` | `'Administration'` | pre-existing, verified |
| `admin.home.subtitle` | `'Gérez les paramètres globaux et les comptes'` | `'Manage global parameters and accounts'` | pre-existing, verified |

**Total new keys added:** 1 pair (admin.home.eyebrow FR + EN). 0 other key changes.

## Deviations from Plan

None — plan executed exactly as written. The commission grep match in page.tsx (`grep -ci "commission"` returns 1) is the pre-existing JSDoc comment "no commission values are exposed" — not introduced by this change, matching the pre-edit baseline. ADMIN-09 invariant is confirmed intact.

## Known Stubs

None. Both pages are fully wired: `<PageHero>` receives live i18n values via `t()`, and the AdminNavCard grid is fully data-driven.

## Threat Flags

None. `<PageHero>` is a pure presentational server component with no new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- [x] `src/lib/i18n/dictionaries.ts` exists and has 2 occurrences of `admin.home.eyebrow`
- [x] `app/(admin)/[adminSegment]/page.tsx` exists and has `<PageHero`
- [x] Commit 7777288 exists (Task 1 — i18n keys)
- [x] Commit 0d02594 exists (Task 2 — PageHero migration)
- [x] `npm run build` exits 0
- [x] ADMIN-09 9-gate suite: 9/9 passed
- [x] `npx tsc --noEmit` exits 0
