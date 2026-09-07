---
phase: 35-sales-motivation
plan: 01
subsystem: sales-motivation
tags: [date-fns, tz, timezone, vitest, pure-functions, gamification]

# Dependency graph
requires: []
provides:
  - "src/lib/momentum/types.ts — MomentumRow, WeeklyMovements, BadgeAxisId/TierId, BadgeAxisProgress, StreakSummary, MomentumBadgeCounts (the single shared contract set for 35-02 and 35-03)"
  - "src/lib/momentum/window.ts — currentWeekWindow/weekKeyFromMs/shiftWeekKey (the ONE Europe/Paris Mon-Sun week window, D-10) + MOMENTUM_TRACKING_STARTED_AT/formatTrackedSinceFragment (D-14)"
  - "src/lib/momentum/badges.ts — BADGE_THRESHOLDS, summarizeStreaks, deriveBadgeProgress (pure streak fold + badge ladder, D-03/D-07)"
affects: [35-02-momentum-query-layer, 35-03-momentum-card]

# Tech tracking
tech-stack:
  added: []  # date-fns@^4.4.0 and @date-fns/tz@^1.5.0 were already in package.json dependencies — no new install
  patterns:
    - "Pure, dependency-free lib modules with nowMs as a required parameter — never Date.now() inside the module (react-hooks/purity + determinism)"
    - "TZDate + startOfWeek({weekStartsOn:1}) + addWeeks for a DST-safe civil week boundary, instead of hand-rolled Intl offset arithmetic"
    - "Dictionary values return bare fragments (formatTrackedSinceFragment); the sentence is assembled via .replace('{0}', fragment) at the call site, per RelanceCard's statusLabel convention"

key-files:
  created:
    - src/lib/momentum/types.ts
    - src/lib/momentum/window.ts
    - src/lib/momentum/window.test.ts
    - src/lib/momentum/badges.ts
    - src/lib/momentum/badges.test.ts
  modified: []

key-decisions:
  - "Badge thresholds (operator-adjustable, editable without a migration): clients bronze=3/silver=10/gold=25, wins bronze=1/silver=5/gold=15, consistency (longest-streak weeks) bronze=2/silver=6/gold=12"
  - "currentWeeks two-branch rule: if the current week key has progress, count the run ending there; else if the PREVIOUS week key has progress, the streak is still alive and counts the run ending at the previous week; else 0 (broken)"
  - "longestWeeks is an independent max-over-history scan (never derived from currentWeeks), so a broken current streak can never erase the longest-ever consistency badge (D-07/A-5)"
  - "deriveBadgeProgress's consistency axis reads streaks.longestWeeks, not currentWeeks — verified by an explicit test"

requirements-completed: [GAME-01, GAME-02, GAME-03]

# Metrics
duration: ~20min
completed: 2026-09-05
---

# Phase 35 Plan 01: Momentum Core Contracts Summary

**Pure Europe/Paris Mon-Sun week window (DST-safe via `@date-fns/tz` TZDate) plus a streak fold and 3-axis x 3-tier badge ladder, with 30 unit tests and zero database/clock coupling.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-05T01:37 CEST (approx, from first test run)
- **Completed:** 2026-09-05T01:40 CEST
- **Tasks:** 2
- **Files modified:** 5 (all created)

## Accomplishments
- Exactly one week-window definition (`currentWeekWindow`) exists in the repo, Europe/Paris Monday-start, verified against both 2026 DST transitions (167h spring week, 169h autumn week) and the UTC-Sunday-is-Paris-Monday trap.
- `summarizeStreaks` distinguishes "alive but not yet moved this week" from "broken", with `longestWeeks` as an independent max-over-history value that survives a broken current streak (D-07) — covered by an explicit 5-week-run-ending-months-ago regression test.
- `deriveBadgeProgress` always returns all 3 axes x 3 tiers (9 rungs), earned or not, satisfying GAME-03's "unearned criteria must be readable" and D-13's zero-state requirement without a separate code path.
- Badge thresholds are named `Record` constants (`BADGE_THRESHOLDS`), editable in one file with no migration (D-03).
- `types.ts` exports the exact 6-symbol contract set (`MomentumRow`, `WeeklyMovements`, `BadgeAxisProgress`, `StreakSummary`, `MomentumBadgeCounts`, plus the two ID unions) that 35-02 and 35-03 will import — neither plan needs to declare its own copy.

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared contracts + the one Europe/Paris week window** - `31e1299` (feat)
2. **Task 2: Streak fold + badge tier ladder (pure)** - `fa7cd8d` (feat)

**Plan metadata:** (this commit) `docs(35-01): complete momentum-core plan`

_No TDD tasks in this plan — both tasks were `type="auto"` without `tdd="true"`._

## Files Created/Modified
- `src/lib/momentum/types.ts` - shared result contracts (`MomentumRow`, `WeeklyMovements`, `BadgeAxisId`/`BadgeTierId`, `BadgeAxisProgress`, `StreakSummary`, `MomentumBadgeCounts`)
- `src/lib/momentum/window.ts` - `MOMENTUM_TIME_ZONE`, `currentWeekWindow`, `weekKeyFromMs`, `shiftWeekKey`, `MOMENTUM_TRACKING_STARTED_AT`, `formatTrackedSinceFragment`
- `src/lib/momentum/window.test.ts` - 13 tests: mid-week, Sunday-late/Monday-00:00 boundary, UTC-Sunday trap, spring/autumn DST hour counts, `shiftWeekKey` arithmetic, tracked-since fragment (fr/en), two source guards
- `src/lib/momentum/badges.ts` - `BADGE_THRESHOLDS`, `summarizeStreaks`, `deriveBadgeProgress`
- `src/lib/momentum/badges.test.ts` - 17 tests covering all 12 plan-enumerated cases plus a `BADGE_THRESHOLDS` exact-value check and a `Date.now()` source guard

## Decisions Made
- Badge tier thresholds recorded verbatim above (see `key-decisions`) so Antoine can adjust them by editing `BADGE_THRESHOLDS` in `src/lib/momentum/badges.ts` without touching anything else.
- `summarizeStreaks`'s longest-run scan walks forward only from keys whose predecessor is absent (a run start), avoiding O(n²) re-walks while staying independent of input order — verified by an unsorted-with-duplicates test asserting identical output to the sorted/deduped equivalent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Doc-comment prose tripped its own literal grep acceptance criterion**
- **Found during:** Task 1 verification (`grep -c "server-only" src/lib/momentum/window.ts` expected `0`)
- **Issue:** The file-level doc comment explained "no `server-only` import" using the literal string `server-only` in prose, which the plan's own acceptance-criteria grep counts — exactly the "grep-based acceptance criteria measure prose too" gotcha the plan itself warned about (UI-CONVENTIONS.md reference in Task 1's `<read_first>`).
- **Fix:** Reworded the comment to "no framework import gating its execution to the server" — same meaning, no longer matches the grep pattern.
- **Files modified:** `src/lib/momentum/window.ts`
- **Verification:** `grep -c "server-only" src/lib/momentum/types.ts src/lib/momentum/window.ts` now returns `0` for both files; `npx vitest run src/lib/momentum/window.test.ts` still green (13/13).
- **Committed in:** `31e1299` (part of Task 1 commit — caught before commit, no separate fix commit needed)

---

**Total deviations:** 1 auto-fixed (1 bug, self-caught before commit)
**Impact on plan:** Cosmetic wording fix only; no behavior change. No scope creep.

## Issues Encountered
None — the `@date-fns/tz` `TZDate` + `date-fns` `startOfWeek`/`addWeeks` combination was verified against all six plan-specified fixtures (mid-week, Sunday-late boundary, Monday-00:00 boundary, UTC trap, spring DST, autumn DST) via a quick Node REPL check before writing the test file, and every value matched the plan's literal expected output on the first attempt.

## User Setup Required

None - no external service configuration required. `date-fns@^4.4.0` and `@date-fns/tz@^1.5.0` were already present in `package.json` `dependencies` (confirmed via `node -e "require('./package.json').dependencies"` before importing) — no package-manager install occurred, so no legitimacy gate applies.

## Next Phase Readiness
- 35-02 (owner-scoped query layer) and 35-03 (`MomentumCard`) can both compile against `src/lib/momentum/types.ts` immediately and run in parallel per the plan's wave structure — neither needs to guess the other's shape.
- 35-02's weekly-window SQL bound should call `currentWeekWindow(nowMs)` from this plan rather than recomputing a boundary.
- 35-02's streak/badge derivation should call `summarizeStreaks` and `deriveBadgeProgress` from this plan rather than re-deriving the fold in the query layer.
- No blockers. No migration, no schema change, no persisted state — `git status --porcelain src/db/schema.ts drizzle/` is empty, confirming D-23.

---
*Phase: 35-sales-motivation*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 6 created files found on disk; both task commits (`31e1299`, `fa7cd8d`) found in git log.
