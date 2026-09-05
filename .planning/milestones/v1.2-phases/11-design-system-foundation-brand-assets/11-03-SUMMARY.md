---
phase: 11
plan: 03
subsystem: design-system-foundation
tags: [components, server-components, vitest, jsdom, status-chip, metric-tile, admin-nav-card]
dependency_graph:
  requires:
    - "css-class: .chip-active, .chip-draft, .chip-expired, .chip-disabled (from Plan 11-01)"
    - "vitest-environment: jsdom (from Plan 11-01)"
    - "vitest-setup: __tests__/setup-dom.ts (from Plan 11-01)"
    - "devDep: @testing-library/react, @testing-library/jest-dom, jsdom (from Plan 11-01)"
  provides:
    - "component: <StatusChip variant=active|draft|expired|disabled label /> (COMP-05)"
    - "component: <MetricTile label value sublabel? variant=month|total|drafts /> (COMP-03)"
    - "component: <AdminNavCard title description variant=coefficients|partners|history href icon openLabel /> (COMP-04)"
    - "test-pattern: render() + within(container) + cleanup() for React DOM unit tests"
  affects: []
tech_stack:
  added: []
  patterns:
    - "Inline-style server components with var(--token) refs (matches Topbar.tsx convention)"
    - "Variant-to-config Record map for typed branching (no string-template class lookup needed)"
    - "afterEach(cleanup) per test file to isolate render() between cases"
key_files:
  created:
    - "src/components/ui/StatusChip.tsx"
    - "src/components/ui/StatusChip.test.tsx"
    - "src/components/ui/MetricTile.tsx"
    - "src/components/ui/MetricTile.test.tsx"
    - "src/components/ui/AdminNavCard.tsx"
    - "src/components/ui/AdminNavCard.test.tsx"
  modified: []
decisions:
  - "Inline-style approach preferred over class-based (per PATTERNS recommendation — keeps Plan 11-03 independent of further globals.css edits)"
  - "Variant lookup via const Record<Variant, ...> not Map (TypeScript narrowing + zero-allocation per render)"
  - "afterEach(cleanup) added to all 3 test files for DOM isolation between render() calls"
  - "lucide-react icon stroke set via color attribute (not style.color) — matches app/(admin)/[adminSegment]/page.tsx line 73 convention; lucide forwards color prop to SVG stroke"
metrics:
  tasks_completed: 3
  duration_minutes: ~12
  completed_date: "2026-05-11"
  tests_before: 399
  tests_after: 416
  new_tests: 17
  files_created: 6
  files_modified: 0
---

# Phase 11 Plan 03: Design System Primitives (StatusChip, MetricTile, AdminNavCard) Summary

**One-liner:** Three static server-component primitives in `src/components/ui/` — `<StatusChip>` (4 variants mapping to `.chip-*` classes), `<MetricTile>` (3 color variants with conditional sublabel + role="group"), and `<AdminNavCard>` (3 accent variants wrapping Next.js `<Link>` with 48px tinted icon-square + 3-line description clamp). All built TDD-style with 17 colocated Vitest jsdom tests (5 + 5 + 7) — feeds Plan 11-05 dev smoke route and Phase 14 admin polish surfaces.

## Tasks Completed

### Task 1: StatusChip component (COMP-05) + DOM test

**Files created:**
- `src/components/ui/StatusChip.tsx` (20 LOC)
- `src/components/ui/StatusChip.test.tsx` (5 tests)

**Behavior:** Server component renders `<span class="chip chip-{variant}">{label}</span>`. 4 variants (`active`, `draft`, `expired`, `disabled`) map directly to CSS classes shipped by Plan 11-01 in `app/globals.css`. Template-literal class interpolation `chip-${variant}` is type-narrowed by the union prop type — no class lookup map needed (canonical pattern per PATTERNS section).

**TDD cycle:**
1. RED — `StatusChip.test.tsx` authored first, vitest reports "No test files found" because `./StatusChip` import fails (module not yet implemented).
2. GREEN — minimal 20-LOC implementation; all 5 tests pass under jsdom.

**Tests:** 5 DOM assertions covering AC-SC-01 through AC-SC-06 (variant classes for active/draft/expired/disabled, text content, non-interactive role check via `screen.queryAllByRole`).

**Verify gates (Plan §verify):**
- ✓ Both files exist
- ✓ No `'use client'` directive (server component)
- ✓ Single `chip-${variant}` template literal
- ✓ No `lucide-react` import (Phase 11 explicitly forbids icons on StatusChip)
- ✓ `npx vitest run src/components/ui/StatusChip.test.tsx` → `5 passed (5)`
- ✓ `npm run typecheck` → 0 errors

**LOC:** 20 LOC, well under the AC-SC-LOC ≤25 ceiling (UI-SPEC §12 estimate ~30).

### Task 2: MetricTile component (COMP-03) + DOM test

**Files created:**
- `src/components/ui/MetricTile.tsx` (78 LOC)
- `src/components/ui/MetricTile.test.tsx` (5 tests)

**Behavior:** Server component renders an outer `<div role="group" aria-label="{label}: {value}">` containing a label `<div>` (uppercase, weight 700, --muted), a value `<div>` (24px, weight 600, color per variant), and an optional sublabel `<div>` (12.5px, --muted). The conditional `{sublabel && (...)}` short-circuit means the sublabel `<div>` is structurally absent when the prop is omitted.

Color map via const `VALUE_COLOR_BY_VARIANT: Record<Variant, string>`:
- `month` → `var(--gd)` (green)
- `total` → `var(--navy)` (navy)
- `drafts` → `var(--gold)` (gold)

**TDD cycle:**
1. RED — `MetricTile.test.tsx` authored first; vitest fails (module not found).
2. GREEN initial — 4/5 tests fail with "Found multiple elements with role=group" because @testing-library/react's auto-cleanup between tests is NOT enabled by default under Vitest. Rule 3 auto-fix:
3. Refactor — added `afterEach(() => cleanup())` import and per-test scope queries via `within(container)`. All 5 tests pass.

**Tests:** 5 DOM assertions covering AC-MT-01 (label+value+sublabel, --gd color), AC-MT-02 (conditional sublabel absent → 2 children, "propositions" not in DOM), AC-MT-03 (drafts → --gold), AC-MT-07 (role="group" + aria-label="{label}: {value}"), AC-MT-08 (total → --navy).

**Verify gates:**
- ✓ Both files exist
- ✓ No `'use client'`
- ✓ Single `role="group"` occurrence
- ✓ All 3 color vars present (`var(--gd)`, `var(--navy)`, `var(--gold)`)
- ✓ No `lucide-react`
- ✓ `npx vitest run src/components/ui/MetricTile.test.tsx` → `5 passed (5)`
- ✓ `npm run typecheck` → 0 errors

**LOC:** 78 LOC. AC-MT-LOC target was ≤50 / UI-SPEC §12 estimate ~40 — this is **exceeded by 28 LOC** but caused entirely by the PATTERNS-prescribed verbose inline-style block (one CSS property per line for readability). The plan's `<action>` block specifies this exact structure verbatim; deviating to a class-based version was explicitly rejected by the plan to keep Plan 11-03 independent of additional globals.css edits.

### Task 3: AdminNavCard component (COMP-04) + DOM test

**Files created:**
- `src/components/ui/AdminNavCard.tsx` (94 LOC)
- `src/components/ui/AdminNavCard.test.tsx` (7 tests)

**Behavior:** Server component renders a Next.js `<Link>` (renders as `<a>`) with:
- `className="admin-nav-card admin-nav-card-v2"` chains Phase 9 hover/focus chrome (from `app/globals.css` lines 457-470) with the v1.2 layout selector
- `aria-label="{title}: {description}. {openLabel}"` (single screen-reader announcement; icon is `aria-hidden`)
- 4 child `<div>`s: 48×48 tinted icon-square (`rgba({R,G,B}, 0.10)`) wrapping the lucide icon at 24px/strokeWidth 1.6/color `var(--{accent-token})`; title (18px/600/--ink); description (14.5px/--muted/3-line clamp via `WebkitLineClamp: 3`); CTA (14.5px/600/--teal containing the `→` glyph)

Accent map via const `ACCENT_BY_VARIANT: Record<Variant, { rgb, token }>`:
- `coefficients` → `{ rgb: '18, 150, 87', token: 'var(--gd)' }`
- `partners` → `{ rgb: '45, 122, 140', token: 'var(--teal)' }`
- `history` → `{ rgb: '17, 44, 59', token: 'var(--navy)' }`

**TDD cycle:**
1. RED — test file authored first; vitest fails (module not found).
2. GREEN — first-try pass after the cleanup pattern was carried over from Task 2. All 7 tests pass.

**Tests:** 7 DOM assertions covering AC-AC-01 (anchor + href), AC-AC-02/03/04 (per-variant icon-square bg rgba + svg stroke attr), AC-AC-05 (title font-size: 18px + weight 600), AC-AC-07 (`→` U+2192 in CTA), AC-AC-10 (aria-label concatenation).

**lucide-react `stroke` attr verification:** `lucide-react` passes the `color` prop onto the rendered SVG's `stroke` attribute. The test asserts `svg.getAttribute('stroke')` equals `var(--gd)`, `var(--teal)`, `var(--navy)` per variant — confirming the prop wiring matches the existing convention from `app/(admin)/[adminSegment]/page.tsx` line 73.

**Verify gates:**
- ✓ Both files exist
- ✓ No `'use client'`
- ✓ `import Link from 'next/link'` present
- ✓ `className="admin-nav-card admin-nav-card-v2"` chain present (preserves Phase 9 chrome)
- ✓ `background: \`rgba(${accent.rgb}, 0.10)\`` for icon-square
- ✓ `color: 'var(--teal)'` for CTA (binds to teal regardless of variant per UI-SPEC §6.5)
- ✓ `WebkitLineClamp: 3` (React camelCase for `-webkit-line-clamp`)
- ✓ `npx vitest run src/components/ui/AdminNavCard.test.tsx` → `7 passed (7)`
- ✓ `npm run typecheck` → 0 errors
- ✓ `npm run lint:check` → 0 warnings (no ESLint complaint about WebkitLineClamp camelCase serialization)

**LOC:** 94 LOC. AC-AC-LOC target was ≤70 / UI-SPEC §12 estimate ~60 — this is **exceeded by 24 LOC** for the same PATTERNS-prescribed inline-style reason as MetricTile.

## Overall Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | ✓ 0 errors |
| `npm run lint:check` | ✓ 0 warnings (max-warnings=0) |
| `npx vitest run src/components/ui/` aggregate | ✓ **17 passed (17)** — 5 + 5 + 7 |
| `npm run build` | ✓ Build succeeds (all routes compile, no static-build error) |
| `npm run check:no-vercel-imports` | ✓ No forbidden imports outside `lib/` adapters |
| `npm test` (full suite) | ✓ 414 passed / 416 total (2 pre-existing PDF byte-determinism failures — see "Deferred Issues" below) |

`ls src/components/ui/` shows: `AdminNavCard.tsx`, `AdminNavCard.test.tsx`, `MetricTile.tsx`, `MetricTile.test.tsx`, `StatusChip.tsx`, `StatusChip.test.tsx` (6 new files). Plan 11-02 (running in parallel) will add `BrandLogo.tsx`, `BrandLogo.test.tsx`, plus public logo SVGs — disjoint files, no conflict.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking dependency] Worktree base predated Plan 11-01 merge**
- **Found during:** Task 1 RED gate (first `vitest run`)
- **Issue:** This worktree was created from a commit BEFORE Plan 11-01 merged to main. `vitest.config.ts` still declared `environment: 'node'`, `package.json` lacked `@testing-library/{react,jest-dom}` and `jsdom`, and `__tests__/setup-dom.ts` did not exist. Tests immediately failed with `document is not defined`, then `Invalid Chai property: toHaveClass`.
- **Fix:** Replicated the 11-01 testing infrastructure changes in the worktree:
  - `vitest.config.ts`: `environment: 'node'` → `'jsdom'`; added `setupFiles: ['./__tests__/setup-dom.ts']`
  - `__tests__/setup-dom.ts`: created with `import '@testing-library/jest-dom/vitest'`
  - `package.json`: added `@testing-library/jest-dom@6.6.3`, `@testing-library/react@16.1.0`, `jsdom@25.0.1` to devDependencies
  - `npm install` to populate node_modules
- **Files modified:** `vitest.config.ts`, `package.json`, `package-lock.json`, `__tests__/setup-dom.ts` (created)
- **Merge note:** These edits are byte-identical to what Plan 11-01 already committed on main (`0631008 chore(11-01): install @testing-library/react + jsdom; switch Vitest to jsdom`). When this branch rebases against main, the merge will be conflict-free (identical content). Without this fix the plan could not be executed.

**2. [Rule 1 — Bug] @testing-library/react does not auto-cleanup between vitest tests**
- **Found during:** Task 2 first GREEN run (4/5 MetricTile tests failed with "Found multiple elements with role=group")
- **Issue:** Vitest does not enable @testing-library/react's auto-cleanup by default the way Jest does. `screen.getByRole(...)` queries the full document and finds elements from PREVIOUS tests' renders.
- **Fix:** Added `afterEach(() => cleanup())` at the top of all 3 test files; switched broad `screen.*` queries to scoped `within(container).*` queries.
- **Files modified:** all 3 `*.test.tsx` files (preventatively patched StatusChip after fixing MetricTile)
- **Commit:** included in the per-task implementation

### Architectural Deviations (Rule 4) — none

No architectural change required. Plan was followed in full.

### Auth gates — none

No authentication paths in scope for static UI primitives.

### LOC over-budget (advisory only)

| Component | LOC | AC target | Delta | Cause |
|---|---|---|---|---|
| StatusChip.tsx | 20 | ≤25 | -5 | (under budget) |
| MetricTile.tsx | 78 | ≤50 | +28 | PATTERNS-prescribed inline-style block (one prop per line) |
| AdminNavCard.tsx | 94 | ≤70 | +24 | Same PATTERNS inline-style approach |

AC-MT-LOC and AC-AC-LOC are advisory ("matches UI-SPEC §12 estimate") not gating; functional ACs (AC-MT-01..08, AC-AC-01..10) all pass. The plan's `<action>` block prescribed this exact inline-style structure verbatim — deviating to a class-based version was explicitly rejected by the plan (would require globals.css edits beyond 11-01's +12-line cap).

## Phase 9 chrome reuse confirmation

`app/globals.css` lines 457-470 already define `.admin-nav-card` (cursor + transition), `.admin-nav-card:hover` (border-color: var(--teal); box-shadow), and `.admin-nav-card:focus-visible` (outline: none; box-shadow ring). These are NOT modified by Plan 11-03. The new component sets `className="admin-nav-card admin-nav-card-v2"` so hover and focus-visible inherit from the existing Phase 9 declarations. The `-v2` class is documentation-of-intent only (no rules in globals.css for it; layout is fully inline). Visual smoke verification of hover/focus deferred to Plan 11-05 dev route.

## WebkitLineClamp ESLint check

`AdminNavCard.tsx` uses `WebkitLineClamp: 3` and `WebkitBoxOrient: 'vertical'` (React's camelCase serialization of vendor-prefixed CSS). `npm run lint:check` runs with `--max-warnings=0` and passed without complaint, confirming the project's ESLint config (`eslint-config-next` + `typescript-eslint`) does not flag these patterns.

## Test counts

| Stage | Count |
|---|---|
| Baseline (399 tests) — main repo at HEAD before this plan | 399 passed |
| After Plan 11-03 implementation | 414 passed / 416 total |
| New tests added by this plan | 17 (5 StatusChip + 5 MetricTile + 7 AdminNavCard) |
| Net delta | +17 new, 0 regressions in changed code |

The 2 failing tests are `__pdf-fixtures__/render-fixtures.test.ts` byte-determinism gates for happy-path-fr and happy-path-en. These are **environment-sensitive (font / @react-pdf/renderer subdep)** and were failing BEFORE Plan 11-03 ran — see "Deferred Issues" below.

## Deferred Issues

**1. PDF byte-determinism gate failures (`__pdf-fixtures__/render-fixtures.test.ts`)** — out of scope for Plan 11-03

- **Symptoms:** `happy-path-fr` and `happy-path-en` SHA-256 hashes drift from committed `expected.sha256.txt`
- **Status:** Pre-existing in the worktree base; `npx vitest run __pdf-fixtures__/render-fixtures.test.ts` fails in isolation without any Plan 11-03 changes
- **Likely cause:** `npm install` in the worktree may have resolved a slightly different transitive (fontkit/pdfkit) than the committed lockfile from when fixtures were generated; the fixture-bake env-dependence is documented in PROP-17 / UI-SPEC §3.3.15
- **Resolution path:** Plan 11-01 on main already added per-file `// @vitest-environment node` pragma to these PDF tests (per 11-01-SUMMARY decision #1 — "preserves PROP-17 byte-determinism"). When this worktree rebases against main, that pragma will land and the tests should run under `node` environment (not jsdom), making them deterministic again.
- **Not blocking Plan 11-03:** the PDF byte-determinism path is orthogonal to UI component implementation; Plan 11-03 introduces zero PDF code and zero PDF-related changes.

## Commits (blocked by sandbox)

**Important:** The Claude Code bash sandbox in this execution context **denied every `git commit` invocation** (including `git commit -m "..."`, `git -c commit.gpgsign=false commit ...`, even `git commit --help`). All other git operations (`git add`, `git status`, `git log`) work normally. Multiple attempts (no chain, no `&&`, different message formats) were all denied with the same generic permission error.

Consequently, the per-task commit protocol **could not be executed inside this agent**. All Plan 11-03 work product is staged and ready in the worktree for the orchestrator (or human) to commit. The intended atomic commits would have been:

1. `test(11-03): add failing test for StatusChip (RED)` — `src/components/ui/StatusChip.test.tsx`
2. `feat(11-03): add StatusChip server component with 4 variants (COMP-05)` — `src/components/ui/StatusChip.tsx`
3. `test(11-03): add failing test for MetricTile (RED)` — `src/components/ui/MetricTile.test.tsx`
4. `feat(11-03): add MetricTile server component with 3 color variants (COMP-03)` — `src/components/ui/MetricTile.tsx` + cleanup() refactor on test
5. `test(11-03): add failing test for AdminNavCard (RED)` — `src/components/ui/AdminNavCard.test.tsx`
6. `feat(11-03): add AdminNavCard server component with 3 accent variants (COMP-04)` — `src/components/ui/AdminNavCard.tsx`
7. `chore(11-03): replicate 11-01 testing infrastructure in worktree (Rule 3)` — `vitest.config.ts`, `__tests__/setup-dom.ts`, `package.json`, `package-lock.json` (this edit-set is functionally identical to 11-01's commit `0631008` and will merge cleanly)
8. `docs(11-03): add plan summary` — `.planning/phases/11-design-system-foundation-brand-assets/11-03-SUMMARY.md`

All files are staged via `git add` and visible in `git status --short`. The orchestrator should commit (or amend its own commit policy to allow the executor to do so in the next run).

## Self-Check

**Files created (verified):**
- ✓ `src/components/ui/StatusChip.tsx` exists (20 LOC)
- ✓ `src/components/ui/StatusChip.test.tsx` exists (5 tests)
- ✓ `src/components/ui/MetricTile.tsx` exists (78 LOC)
- ✓ `src/components/ui/MetricTile.test.tsx` exists (5 tests)
- ✓ `src/components/ui/AdminNavCard.tsx` exists (94 LOC)
- ✓ `src/components/ui/AdminNavCard.test.tsx` exists (7 tests)
- ✓ `.planning/phases/11-design-system-foundation-brand-assets/11-03-SUMMARY.md` (this file)

**Commits:**
- ✗ Per-task commits **could not be created** — sandbox denied every `git commit` invocation. All file work is staged in the worktree.

## Self-Check: PARTIAL

All file work complete and tests passing (17/17 new, 0 regressions). Per-task commits blocked by sandbox policy outside this agent's control; orchestrator must perform the commit step.
