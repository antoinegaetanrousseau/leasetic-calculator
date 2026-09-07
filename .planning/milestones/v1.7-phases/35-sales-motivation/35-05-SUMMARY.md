---
phase: 35-sales-motivation
plan: 05
subsystem: home-page-ui
tags: [react, server-component, next.js, i18n, crm-02, gamification]

# Dependency graph
requires:
  - phase: 35-sales-motivation (plan 02)
    provides: "src/lib/db/queries/momentum.ts — listWeeklyMovementsForOwner, listProgressWeekKeysForOwner, getBadgeCountsForOwner (verified against real Postgres in 35-04)"
  - phase: 35-sales-motivation (plan 03)
    provides: "app/(authed)/_components/MomentumCard.tsx — MomentumCard, MomentumCardProps (no nowMs prop, movements as one WeeklyMovements object)"
provides:
  - "app/(authed)/page.tsx — the admin-gated call site: role destructured from requireUser(), isAdmin ? null : Promise.all([...]) around the three momentum queries, momentum props assembled via summarizeStreaks/deriveBadgeProgress, MomentumCard rendered between RelanceCard and the recent-proposals block"
  - "app/(authed)/page.test.tsx — admin-gate, ordering, window-shape and placement assertions for the momentum surface, plus a narrowed Test 6"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nested Promise.all gated by a ternary (isAdmin ? null : Promise.all([...])) so an admin's request never evaluates the three momentum queries, while the outer Promise.all still resolves in one round"
    - "The clock (getNowMs()) and the derived week window (currentWeekWindow(nowMs)) are read/computed ABOVE the Promise.all, not after — the window is now a query argument, not just a component prop"
    - "Momentum props assembled via a single IIFE guarded on momentumData !== null, folding the three raw query results through summarizeStreaks + deriveBadgeProgress exactly once"

key-files:
  created: []
  modified:
    - app/(authed)/page.tsx
    - app/(authed)/page.test.tsx

key-decisions:
  - "Test 6's blanket `expect(src).not.toMatch(/role\\s*[!=]==/)` was narrowed, not deleted, to the behavioural assertion it always stood for (listRelanceMock still called unconditionally with the admin's own id) — the blanket form would forbid the one role branch D-15 requires for the momentum surface, and Phase 35 could not ship past this test without narrowing it. The retired regex's literal text is preserved verbatim inside the test's own explanatory comment (per the plan's decision_record instruction) so a future reader understands why it isn't there as an active assertion."
  - "isAdmin is derived once, immediately after userId, and is the only new role logic in the file — no requireRelationshipHolder()/requireAdmin() call was introduced, per the plan's explicit prohibition (that would 404 an admin out of their own home page, a larger behaviour change than D-15 asks for)."

requirements-completed: [GAME-01, GAME-02, GAME-03, GAME-04, GAME-05]

# Metrics
duration: ~45min (including the human-verification checkpoint pause)
completed: 2026-09-05
---

# Phase 35 Plan 05: Home Page Wiring Summary

**The admin-gated momentum call site — `isAdmin ? null : Promise.all([...])` so an admin's request never resolves the three momentum queries, one shared clock read driving the week window before the queries fire, and the card placed between "à relancer" and recent proposals — human-verified live and approved.**

## Performance

- **Duration:** ~45 min (2 auto tasks + a human-verification checkpoint pause)
- **Started:** 2026-09-05T08:36 (approx, Task 1)
- **Completed:** 2026-09-05T09:21
- **Tasks:** 3 (2 auto, 1 checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments

- `app/(authed)/page.tsx` destructures `role` from `requireUser()` (no new auth call), derives `isAdmin` once, and gates the three momentum queries behind `isAdmin ? null : Promise.all([...])` nested inside the page's existing single `Promise.all` — an admin's request never evaluates `listWeeklyMovementsForOwner`, `listProgressWeekKeysForOwner`, or `getBadgeCountsForOwner` (D-15), proven at both the query level (`toHaveBeenCalledTimes(0)`) and the DOM level (zero-state copy absent, not just "no rows").
- The clock (`getNowMs()`) now reads before the `Promise.all`, and `currentWeekWindow(nowMs)` is computed from that same read and passed as `listWeeklyMovementsForOwner`'s window argument — the streak and the movements list share one instant (D-10).
- Momentum props are folded exactly once, via `summarizeStreaks(weekKeys, nowMs)` → `deriveBadgeProgress(counts, streaks)`; the consistency axis reads `streaks.longestWeeks`, never `currentWeeks` (D-07/UI-SPEC A-5).
- `{!isAdmin && momentum && <MomentumCard .../>}` renders directly below `<RelanceCard>` and above the recent-proposals block, with the pre-existing `<RelanceCard>` line untouched (`git diff | grep -c "^-.*RelanceCard"` = 0, GAME-05).
- `app/(authed)/page.test.tsx` gained a "momentum card" describe block (7 new tests): admin gets zero queries and no DOM node (including the zero-state invitation copy specifically); partner queries fire once each with the session id; the shared window argument is a Monday 00:00 Europe/Paris half-open range; the momentum calls join the page's single `Promise.all`; `requireUser` is still the first await; placement is proven with `compareDocumentPosition` (after relance rows, before the first recent-proposals row); and the pre-existing metric tiles / chase list are unaffected by the momentum defaults.
- Test 6's blanket source regex was narrowed to the behavioural assertion it always stood for — see Decisions above.
- Full `npx vitest run`: 172 files / 2315 tests passed, 6 files / 61 skipped — no regressions against 35-04's 2308-test baseline plus the 7 new tests. `npm run typecheck`, `npm run lint:check` (`--max-warnings=0`), and `npm run build` all exit 0.
- **Human verification (Task 3) — APPROVED.** See the full item-by-item record below.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire the admin-gated momentum card into the home page** - `f614308` (feat)
2. **Task 2: Update the home-page tests — admin gate, ordering, placement** - `b3d9794` (test)
3. **Task 3: Verify the rendered surface** - checkpoint:human-verify, no code commit (operator approved live)

**Plan metadata:** (this commit) `docs(35-05): complete home-page-wiring plan`

_No TDD tasks in this plan — Task 1 and Task 2 were `type="auto"` without `tdd="true"`; Task 3 was `checkpoint:human-verify`._

## Files Created/Modified

- `app/(authed)/page.tsx` - role destructured from `requireUser()`, `isAdmin` derived, clock read moved above the `Promise.all`, three momentum queries nested behind `isAdmin ? null : Promise.all([...])`, momentum props folded through `summarizeStreaks`/`deriveBadgeProgress`, `MomentumCard` rendered between `RelanceCard` and the recent-proposals block
- `app/(authed)/page.test.tsx` - three new hoisted mocks for the momentum queries, `role: 'partner'` added to the session fixture, Test 6 narrowed, new "momentum card" describe block (7 tests)

## Human Verification Results (Task 3)

Operator walked the live surface as a partner and as an admin. All items passed:

| Item | What was checked | Result |
|---|---|---|
| 2 | Placement below "À relancer", above recent proposals | PASS — confirmed on a live partner session |
| 3 | Eyebrow `VOTRE PROGRESSION`, restrained styling | PASS as built |
| 4 | Streak states its break condition | PASS — rendered "1 semaine(s). Un dossier doit avancer d'ici dimanche." |
| 5 | Both footer lines, in order | PASS |
| 6 | Nine badge rungs readable | PASS on content — all nine rungs and their criteria render |
| 7 | Admin sees NO card at all (D-15) | PASS — operator signed in as admin and confirmed complete absence, not a zero state |
| 8–9 | No i18n leakage; pipeline/conversion/chase list unchanged | PASS |

**Resume signal:** `approved`.

## Decisions Made

All recorded verbatim above under `key-decisions`. Most notably: Test 6's narrowing (not deletion) of the blanket role-regex assertion, with the retired pattern's exact text preserved in an explanatory comment per this plan's own `decision_record`.

## Deviations from Plan

### Plan-authoring mismatches (informational — not behavioral gaps)

**1. `currentWeekWindow` grep-count criterion.** The plan's acceptance criteria state `grep -c "currentWeekWindow" "app/(authed)/page.tsx"` should return `1`. The actual file has 2 matching lines: the import (`import { currentWeekWindow, formatTrackedSinceFragment } from '@/lib/momentum/window';`) and the single call site (`const week = currentWeekWindow(nowMs);`). There is exactly ONE behavioral call to `currentWeekWindow` — the criterion appears to have been written assuming the import line wouldn't count, which isn't how `grep -c` on a static-import codebase works. No second window definition exists anywhere (D-10 holds); this is the same class of plan-arithmetic note recorded as informational in 35-03's SUMMARY, not a defect to fix.

**2. Retired blanket-regex criterion.** The plan's acceptance criteria state `grep -c "role\\s*[!=]==" "app/(authed)/page.test.tsx"` should return `0` — i.e., the blanket regex should be "gone" from the file. It returns `1`, because the plan's own `decision_record` explicitly requires the retired assertion's literal text be quoted inside the test's replacement comment ("the reasoning recorded in the test's own comment so a future reader does not 'restore' it"). The assertion itself (`expect(src).not.toMatch(/role\s*[!=]==/)`) is gone — no such `expect(...)` call exists in the file — only the documentary comment quoting it for context survives. This satisfies the decision_record's explicit instruction; the acceptance-criteria grep pattern doesn't distinguish "active assertion" from "comment quoting the retired assertion for a future reader."

No other deviations. Plan executed exactly as written for both `type="auto"` tasks.

## Post-Verification Note (tracked as separate follow-on work, not a defect in this plan)

Post-approval, the operator judged the card's **visual design** inadequate and requested a fuller gamified treatment (richer badge tiles, tier iconography, greater prominence). This reverses D-19's "same visual restraint as the rest of the app" and is being tracked as separate follow-on work with an explicit amendment to `35-CONTEXT.md`. It is **not** a defect in this plan's wiring — no file owned by 35-05 (`app/(authed)/page.tsx`, `app/(authed)/page.test.tsx`) is affected by this note. The restyle, if approved, is confined to 35-03's `app/(authed)/_components/MomentumCard.tsx` and `src/lib/i18n/dictionaries.ts`, neither of which this plan touches.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. No new dependency installed; every import resolves to an existing workspace module (`@/lib/momentum/window`, `@/lib/momentum/badges`, `@/lib/db/queries`, `./_components/MomentumCard`).

## Next Phase Readiness

- GAME-01 through GAME-05 are now fully wired end to end: pure logic (35-01) → owner-scoped, Postgres-verified queries (35-02, 35-04) → the rendered card (35-03) → the admin-gated call site (35-05), human-verified live.
- D-15 (admin sees nothing), D-17 (placement below à relancer), D-10 (one shared window), D-07/A-5 (consistency reads longest streak), D-19 (visual restraint as *built*), D-23 (no migration) all hold as of this plan.
- A follow-on visual-design request (see Post-Verification Note above) is out of this plan's scope and will need its own `35-CONTEXT.md` amendment and planning pass before any `MomentumCard.tsx`/dictionary change is made.
- No blockers. `git status --porcelain src/db/schema.ts drizzle/ app/globals.css` is clean — D-19/D-23 both hold.

---
*Phase: 35-sales-motivation*
*Completed: 2026-09-05*

## Self-Check: PASSED

Both modified files (`app/(authed)/page.tsx`, `app/(authed)/page.test.tsx`) found on disk; all 3 commits (`f614308`, `b3d9794`, `4e3d60c`) found in git log.
