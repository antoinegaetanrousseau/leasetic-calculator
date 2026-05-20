---
phase: 14-admin-polish-partners-history-home
plan: 03
subsystem: ui
tags: [admin-home, navigation, AdminNavCard, i18n, route-wiring, lucide-react, tdd]

# Dependency graph
requires:
  - phase: 11-design-system-foundation-brand-assets
    provides: AdminNavCard primitive (3 variants — coefficients/partners/history) consumed verbatim
  - phase: 14-admin-polish-partners-history-home (plan 01)
    provides: Renamed /partners directory + Shell.tsx hrefs already pointing at /partners and /history (so the wired hrefs from this plan land naturally once 14-05 ships /history)
provides:
  - "Admin home page rebuilt: 3-column AdminNavCard grid replaces Phase 9's 2-link layout per D-13..D-16"
  - "9 new i18n keys × FR + EN — admin.nav.{coefficients,partners,history}.{title,description} + admin.nav.open (×2) + admin.home.subtitle copy update"
  - "Page test harness for admin home: app/(admin)/[adminSegment]/page.test.tsx (10 cases, TDD RED→GREEN)"
  - "Identity-based icon assertion pattern (Sliders === SlidersVertical in newer lucide) — captured in test code + commit message for future plans"

affects:
  - 14-04 (CoefficientHistorySidebar mounts on /coefficients — the admin home now links there)
  - 14-05 (creates /history — the AdminNavCard variant=history href is already wired)
  - 14-06 (StatusChip rollout — no direct interaction; this plan touches no chip surface)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mock-by-identity for component-consuming server pages: vi.mock the child component (<AdminNavCard>) to capture each call's props as a data-* attribute on a simple <div>. Assert wiring at the page test level, leaving variant-chrome assertions to the component's own test (separation of concerns)."
    - "Lucide-react alias-resilient icon assertions: assert by component identity (props.icon === Sliders) rather than displayName, because newer lucide-react versions alias Sliders → SlidersVertical (same component reference, different displayName)."
    - "Inline-style 3-column grid for admin home: gridTemplateColumns: 'repeat(3, 1fr)', gap 24, maxWidth 1040, marginTop 32 — no new globals.css class. Mobile responsive collapse is deferred (desktop-primary per PROJECT.md constraints; Phase 14 scope = desktop only)."

key-files:
  created:
    - "app/(admin)/[adminSegment]/page.test.tsx (NEW — 10 vitest cases covering D-13..D-16 + AUTH-15 gate)"
    - ".planning/phases/14-admin-polish-partners-history-home/14-03-SUMMARY.md"
  modified:
    - "app/(admin)/[adminSegment]/page.tsx (-44 lines net: 2-link layout → 3-card grid; imports swapped Settings2 → Sliders + History; AdminNavCard imported)"
    - "src/lib/i18n/dictionaries.ts (+15 lines: 7 admin.nav.* keys × FR + EN + updated admin.home.subtitle copy)"

key-decisions:
  - "Mock <AdminNavCard> at the page test level (D-13 / D-14 wiring concern) rather than re-running Phase 11's full chrome assertions (variant→color, icon-square geometry). The component's own test owns those — page test asserts only props passed to it."
  - "Phase 9 legacy i18n keys (admin.home.{coefficients,accounts}.{title,sub}) stay in the dictionary as dead-but-harmless. Removal would force a coordinated cleanup across both fr+en blocks for zero functional gain; the _EnHasAllFrKeys parity proof still typechecks with them present. Future cleanup at planner discretion."
  - "Update admin.home.subtitle FR+EN copy to UI-SPEC §6.1 canonical values (FR: 'Gérez les paramètres globaux et les comptes' / EN: 'Manage global parameters and accounts'), replacing Phase 9's dashboard tagline. The key name is preserved (no schema churn); only the value changes."
  - "Icon-identity assertion (props.icon === Sliders) over displayName-string assertion. Newer lucide-react aliases Sliders → SlidersVertical (same reference); a string-based assertion would fail today and might break again on future lucide upgrades. Identity comparison is alias-resilient."
  - "Comment in page.tsx uses prose 'three AdminNavCard instances' instead of '<AdminNavCard>' — the plan's grep verification (`grep -c '<AdminNavCard' page.tsx | grep -q '^3$'`) counts JSX literals only. Keeping the comment angle-bracket-free avoids a verification false positive while preserving documentation clarity."

patterns-established:
  - "Mock-child-via-props-capture testing pattern for admin server-component pages — locks the wiring contract without coupling to the child's rendered chrome"
  - "Identity-based lucide icon assertions in vitest — robust to lucide-react version aliases"

requirements-completed: [ROUTE-02]

# Metrics
duration: 17min
completed: 2026-05-20
---

# Phase 14 Plan 03: Admin Home v1.2 Redesign Summary

**3 AdminNavCards replace the Phase 9 2-link layout on the admin home — variant chrome from Phase 11 (Sliders/Users/History icons, color-tinted icon-squares, "Ouvrir →" CTA) wired through the v1.2 design contract per Figma node 41:46.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-05-20T20:15:00Z (approx — plan start)
- **Completed:** 2026-05-20T20:32:23Z
- **Tasks:** 1 (with TDD sub-steps: RED commit → GREEN commit)
- **Files modified:** 3 (1 created, 2 modified)
- **Test count delta:** +10 cases (admin home page test, fresh file)

## Accomplishments

- Replaced the Phase 9 two-link admin home (`<Link>` with Settings2 + Users icons in a `1fr 1fr` grid) with three `<AdminNavCard>` instances per D-13..D-16:
  - **#1 Coefficients & commission** — variant `coefficients`, Sliders icon, → `/<seg>/coefficients`
  - **#2 Partenaires** — variant `partners`, Users icon, → `/<seg>/partners`
  - **#3 Historique** — variant `history`, History icon, → `/<seg>/history` (link wired even though /history ships in Plan 14-05)
- Updated the h1 to 32px/700 + added a 16px muted subtitle (was 24px/700 with no subtitle in Phase 9) — matches UI-SPEC §5.5 hero typography.
- Added 7 new i18n keys × FR + EN (14 total entries) under the `admin.nav.*` namespace + refreshed `admin.home.subtitle` copy in both dictionaries per UI-SPEC §6.1 + §6.2.
- Established 10 RED-first vitest cases for the admin home — caught the lucide-react Sliders ↔ SlidersVertical alias gotcha during the GREEN gate (1 test failure on the first GREEN run; resolved by switching to identity-based assertion).
- Preserved `requireAdmin()` AUTH-15 defense-in-depth + `dynamic = 'force-dynamic'` + admin metadata (Phase 9 contract; Test 9 asserts the call).

## Task Commits

Each TDD step committed atomically:

1. **Task 1 RED** — `6765b51` (`test(14-03)`): added 10 failing tests for the admin home 3-card layout (9 of 10 fail; only the existing requireAdmin() call passed pre-change)
2. **Task 1 GREEN** — `13e1b1e` (`feat(14-03)`): rebuilt the page with 3 AdminNavCards + added 9 new i18n keys (refined to icon-identity assertion after first run revealed the Sliders → SlidersVertical alias)

(REFACTOR step not needed — the GREEN implementation is the canonical shape per PATTERNS.md §`admin home page.tsx`; no cleanup pass would improve it.)

**Plan metadata commit:** (pending — this SUMMARY commit lands the metadata + STATE.md + ROADMAP.md updates.)

## Files Created/Modified

- **`app/(admin)/[adminSegment]/page.tsx`** (modified, -44 lines net)
  - Imports: `Settings2, Users` → `Sliders, Users, History` from lucide-react; added `AdminNavCard` from `@/components/ui/AdminNavCard`; dropped Next.js `Link` import (no longer used directly).
  - Body: replaced the inline 2-link grid (Phase 9 lines 57-102) with a 3-column AdminNavCard grid (`grid-template-columns: repeat(3, 1fr)`, gap 24, max-width 1040, margin-top 32).
  - h1 typography updated: 24px/700 with 8px bottom margin → 32px/700 with `margin: 0` (per UI-SPEC §5.5 hero spec).
  - Subtitle: 14.5px/400 with 24px bottom margin → 16px/400 with `marginTop: 8, marginBottom: 0` (UI-SPEC §5.5).
  - JSDoc updated to describe the v1.2 design contract + ADMIN-09 invariant (no commission values render).
- **`app/(admin)/[adminSegment]/page.test.tsx`** (created, 196 lines)
  - 10 vitest cases under `describe('Admin home page (D-13..D-16)')`.
  - Hoisted-mock harness (verification/page.test.tsx style): `requireAdmin`, `getCurrentLang`, `AdminNavCard` all mocked with capture functions.
  - Real `t()` + dictionaries from `@/lib/i18n` (partial mock via `vi.importActual`) so i18n-resolved values flow through unmodified.
- **`src/lib/i18n/dictionaries.ts`** (modified, +15 lines)
  - FR: `admin.home.subtitle` value updated; 7 new `admin.nav.*` keys appended in a new namespace block.
  - EN: same updates mirrored.
  - `_EnHasAllFrKeys` parity proof typechecks (verified via `npm run typecheck`).

## Decisions Made

- **Mock-by-prop-capture for the child component.** `<AdminNavCard>` is mocked at the page test level via `vi.mock('@/components/ui/AdminNavCard', ...)` returning a `<div>` with each prop projected as a `data-*` attribute. This pattern keeps the page test concerned only with **what the page wires** (variant, href, icon, title, description, openLabel) and leaves **how the component renders** to `AdminNavCard.test.tsx`. Separation of concerns; faster test runs.
- **Identity-based icon assertion** (`props.icon === Sliders` not `displayName === 'Sliders'`). Newer lucide-react versions alias `Sliders` → `SlidersVertical` (same component reference, different displayName). String-based assertions are brittle across lucide upgrades; identity comparison is forward-compatible.
- **Comment prose, not JSX-shaped angle brackets, for the docstring.** The plan's verification grep counts `<AdminNavCard` occurrences expecting exactly 3 (the JSX literals). A docstring saying "three `<AdminNavCard>` instances" would inflate the count to 4 and fail the gate. The docstring now reads "three AdminNavCard instances" — semantically equivalent, grep-compatible.
- **Phase 9 legacy i18n keys retained.** `admin.home.coefficients.{title,sub}` and `admin.home.accounts.{title,sub}` are no longer consumed by any source file after this plan. Removing them would force a coordinated diff across both `fr` and `en` blocks for zero functional gain; the parity proof still typechecks with them present. Documented as "dead-but-harmless" — future cleanup at planner discretion.

## Deviations from Plan

None — plan executed exactly as written.

(One micro-adjustment during GREEN: the first test run after implementation revealed the lucide-react `Sliders` → `SlidersVertical` alias. The test was refined from displayName-string assertion to component-identity assertion within the same GREEN commit. This is normal TDD iteration, not a deviation from plan scope.)

## Issues Encountered

- **lucide-react Sliders aliased to SlidersVertical.** On the first GREEN test run, Test 4 failed with `expected 'SlidersVertical' to be 'Sliders'`. Investigation via `node -e "..."` confirmed `Sliders === SlidersVertical` (same component reference). Resolution: assert by identity (`props.icon === Sliders` imported from the same `lucide-react` package) instead of displayName string. Pattern documented in the commit message and in this SUMMARY's `key-decisions` for future plans.

## User Setup Required

None — no external service configuration touched by this plan.

## Next Phase Readiness

- **Plan 14-04** (CoefficientHistorySidebar on `/coefficients`) — independent; not blocked by anything here.
- **Plan 14-05** (`/history` route) — this plan wires the AdminNavCard href to `/<seg>/history` proactively; when 14-05 ships the route, navigation works without any further wiring change.
- **Plan 14-06** (StatusChip rollout on proposal lists) — untouched by this plan; no integration friction expected.

The admin home now matches the v1.2 design contract (Figma node 41:46). ROUTE-02 success criterion #3 (admin-home portion: "renders 3 AdminNavCards") is satisfied. Partner-home MetricTiles portion of ROUTE-02 #3 remains explicitly deferred to v1.3 per CONTEXT.md (no work for it in Phase 14).

## Self-Check: PASSED

All claimed files exist on disk; both task commits (RED `6765b51`, GREEN `13e1b1e`) are present in `git log --oneline --all`. No missing artifacts.

---
*Phase: 14-admin-polish-partners-history-home*
*Completed: 2026-05-20*
