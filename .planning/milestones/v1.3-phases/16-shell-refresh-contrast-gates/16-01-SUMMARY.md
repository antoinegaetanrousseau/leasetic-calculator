---
phase: 16-shell-refresh-contrast-gates
plan: "01"
subsystem: design-system
tags:
  - shell
  - design-system
  - primitive
  - server-component
  - light-dark
dependency_graph:
  requires: []
  provides:
    - src/components/ui/PageHero.tsx (PageHero, PageHeroProps)
  affects:
    - Plan 16-04 (reference adopter: admin home)
    - Phase 17/18 (PageHero consumers: partner home, wizard, admin pages)
tech_stack:
  added: []
  patterns:
    - inline style={{}} server-component primitive (matches MetricTile.tsx, AdminNavCard.tsx)
    - CSS custom property token cascade for light/dark (--ink, --muted, --gd)
key_files:
  created:
    - src/components/ui/PageHero.tsx
    - src/components/ui/PageHero.test.tsx
  modified: []
decisions:
  - D-01 prop interface shipped verbatim (5 props: title, subtitle, eyebrow, actions, children)
  - D-01 server component — no 'use client' directive
  - D-02 typography: title 32px/700/1.2/var(--ink)/m0, eyebrow 11.8px/700/0.06em/uppercase/var(--gd)/mb8, subtitle 14.5px/400/1.55/var(--muted)/mt8
  - D-03/D-04 outer flex justify-content:space-between/align-items:flex-start/marginBottom:32
  - D-03 actions right-slot conditional — no wrapper div rendered when actions is falsy
  - D-05 light/dark via token cascade only — zero per-component dark CSS
  - No className escape-hatch prop (per Claude's Discretion in CONTEXT.md)
metrics:
  duration: ~5min
  completed: 2026-05-22
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_before: 876
  tests_after: 883
  tests_delta: +7
---

# Phase 16 Plan 01: PageHero Primitive Summary

**One-liner:** Pure server-component hero primitive with 5-prop API, D-02 pixel-exact typography, and token-driven light/dark cascade — foundation for all Phase 17/18 page migrations.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PageHero server component primitive | 4bead3b | src/components/ui/PageHero.tsx |
| 2 | Vitest coverage (7 cases, AC-PH-01..07) | 41a85db | src/components/ui/PageHero.test.tsx |

## PageHeroProps Interface (as shipped)

```ts
export interface PageHeroProps {
  title: string;                   // Required. The greeting or page title.
  subtitle?: string;               // Optional. Muted description line below the title.
  eyebrow?: string;                // Optional. Uppercase label above title (e.g. "ADMIN", "ÉTAPE 1 SUR 3").
  actions?: React.ReactNode;       // Optional. Right-aligned page-level CTA slot.
  children?: React.ReactNode;      // Reserved for future composition; not consumed in Phase 16.
}
```

## Test Coverage

| Test | Description | Result |
|------|-------------|--------|
| AC-PH-01 | title-only — h1 present, no p, no eyebrow, no right-slot | PASS |
| AC-PH-02 | title + subtitle — h1 + p present, eyebrow absent | PASS |
| AC-PH-03 | title + subtitle + eyebrow — eyebrow has uppercase + var(--gd) in inline style | PASS |
| AC-PH-04 | title + actions — right-slot renders with sentinel button, no subtitle | PASS |
| AC-PH-05 | all 4 props — DOM order eyebrow → h1 → p in left column | PASS |
| AC-PH-06 | light wrapper — all 4 elements present, title uses var(--ink) | PASS |
| AC-PH-07 | dark wrapper — data-theme="dark" on wrapper, same 4 elements, token refs present | PASS |

**7 / 7 tests pass.**

## Verification Results

- `npm run test -- --run src/components/ui/PageHero.test.tsx`: 7/7 PASS
- `npm run test -- --run tests/admin-09-grep-contracts.test.ts`: 9/9 PASS (ADMIN-09 invariant maintained)
- `npx tsc --noEmit`: exits 0 (no TypeScript errors)
- Full test suite: 876 → 883 tests (+7 net), 63 → 64 test files

## Deviations from Plan

None — plan executed exactly as written. D-01..D-05 truths implemented verbatim.

## Known Stubs

None. PageHero is a pure presentation primitive with no data-fetching and no placeholder copy. The `children` prop is reserved/unused by design (D-01) — this is intentional and documented in the prop interface JSDoc.

## Threat Flags

None. PageHero is purely presentational with no network endpoints, no auth paths, no file access, and no database interactions. Zero commission-related strings (ADMIN-09 gate stays green).

## Self-Check: PASSED

- [x] `src/components/ui/PageHero.tsx` exists
- [x] `src/components/ui/PageHero.test.tsx` exists
- [x] Commit 4bead3b found in git log
- [x] Commit 41a85db found in git log
- [x] 7 tests pass, ADMIN-09 9-gate suite green
- [x] tsc --noEmit exits 0
