---
phase: 35-sales-motivation
plan: 03
subsystem: home-page-ui
tags: [i18n, react, server-component, gamification, crm-02]

# Dependency graph
requires:
  - phase: 35-sales-motivation (plan 01)
    provides: "src/lib/momentum/types.ts (MomentumRow, WeeklyMovements, BadgeAxisProgress) + src/lib/momentum/window.ts (MOMENTUM_TIME_ZONE) + src/lib/momentum/badges.ts (deriveBadgeProgress, used to build test fixtures)"
provides:
  - "src/lib/i18n/dictionaries.ts — 19 dashboard.momentum.* keys x 2 languages"
  - "app/(authed)/_components/MomentumCard.tsx — MomentumCard, MomentumCardProps (the surface itself)"
  - "app/(authed)/_components/MomentumCard.test.tsx — 11 render assertions"
affects: [35-05-home-page-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "movements passed as one WeeklyMovements object ({rows, total}), not a bare array plus a separate count prop — keeps the truncation math (total - rows.length) impossible to desync"
    - "No nowMs prop on MomentumCard — every date computation (streak, week window, trackedSinceLabel) happens server-side before the component is reached; an unused nowMs binding would fail eslint --max-warnings=0"
    - "Dictionary interpolation via .replace('{0}', ...) chained at the call site, never a template literal in the dictionary — same convention as RelanceCard's statusLabel"
    - "One shared row <Link> code path with one data-testid, no conditional class/weight/icon branch for a backwards move or a move to Perdu (D-11) — proven by className string-equality in a test, not just by convention"

key-files:
  created:
    - app/(authed)/_components/MomentumCard.tsx
    - app/(authed)/_components/MomentumCard.test.tsx
  modified:
    - src/lib/i18n/dictionaries.ts

key-decisions:
  - "trackedSinceLabel is the month-year FRAGMENT ('septembre 2026'), not a full sentence — the component assembles the sentence via t('dashboard.momentum.trackedSince', lang).replace('{0}', trackedSinceLabel). This resolves the UI-SPEC's JSX-skeleton-vs-i18n-key-plan ambiguity in favor of the key plan."
  - "movements is one WeeklyMovements object ({rows, total}), not a bare MomentumRow[] plus a separate movementsTotal prop, per this plan's own <decision_record> — the UI-SPEC's props block is illustrative, not literal."
  - "nowMs is dropped from MomentumCardProps entirely (UI-SPEC lists it mirroring RelanceCard, but this component derives nothing from the current instant — streak/window/trackedSinceLabel are all pre-computed). 35-05 must NOT pass nowMs when wiring the call site."
  - "Movement row layout matches RelanceCard's two-column split (company name left, detail right) verbatim, including its className string; the copy contract's full sentence becomes the Link's aria-label so the accessible name is the complete sentence while the visual layout stays the established one."
  - "'Cette semaine' section label renders at text-xs font-semibold text-muted-foreground (sentence case) — UPPERCASE is reserved for the card's own eyebrow title only; UI-SPEC's Typography table has no explicit row for this label, so this is recorded here rather than silently chosen."

requirements-completed: [GAME-01, GAME-02, GAME-03, GAME-04, GAME-05]

# Metrics
duration: ~35min
completed: 2026-09-05
---

# Phase 35 Plan 03: MomentumCard Surface Summary

**19 `dashboard.momentum.*` dictionary keys (fr/en) plus the `MomentumCard` server component — one Card, three parts (streak / this week's movements / badge ladder), two permanent footer lines, zero queries, zero role logic, and a D-11 parity guarantee proven by className string-equality in a test rather than left to convention.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- All 19 `dashboard.momentum.*` keys exist in both `fr` and `en`, exact UI-SPEC copy, `_EnHasAllFrKeys` compile-time parity green, zero re-declared `pipeline.stage.*` keys.
- `MomentumCard` renders the streak sentence (bold number+unit fragment only, D-12), this week's movements as full-row links (D-09/D-10), and the full 9-rung badge ladder (GAME-03, D-13's zero state is the same ladder unlit) inside one `Card`, with two permanent footer lines (D-14 credibility line + the permanent under-report disclosure) that render unconditionally in every state.
- D-11 (no penalty framing for a backwards move or a move to `Perdu`) is enforced structurally: one shared row code path, one `data-testid="momentum-row"`, no stage special-casing (`grep` for `'negociation'|'perdu'` in the component source returns 0) — and proven behaviourally by test case 6's className string-equality assertion, not just a source grep.
- GAME-04 (no comparative/ranking vocabulary) is guarded by a permanent regex test assertion (`classement|leaderboard|moyenne|average|percentile|rank|top \d|par rapport|compared`) documented in the test file as never to be relaxed.
- GAME-05/D-08/D-16 (nothing withheld, no control, no opt-out) verified: zero `<button>`, zero `onClick`, zero `useState`/`useEffect` in the component source.
- Zero new tokens added to `app/globals.css`, zero new type sizes — `git status --porcelain app/globals.css` is empty.
- Full `vitest run`: 2308 passed, 52 skipped — no regressions. `npm run typecheck` and `npm run lint:check` both exit 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: The 19 dashboard.momentum.* keys, fr and en** - `1c7c4c1` (feat)
2. **Task 2: MomentumCard — one Card, three parts, two footer lines** - `65c1678` (feat)
3. **Task 3: MomentumCard render tests** - `d09f348` (test)

**Plan metadata:** (this commit) `docs(35-03): complete momentum-card plan`

_No TDD tasks in this plan — all three tasks were `type="auto"` without `tdd="true"`._

## Files Created/Modified
- `src/lib/i18n/dictionaries.ts` - added the 19-key `dashboard.momentum.*` block to both `fr` and `en` objects
- `app/(authed)/_components/MomentumCard.tsx` - `MomentumCard`, `MomentumCardProps`, plus the module-private `movementCopy` and `splitStreakSentence` helpers
- `app/(authed)/_components/MomentumCard.test.tsx` - 11 `it()` blocks covering both states, D-11 parity, GAME-03/04/05 guards, EN parity, and the server-component source guard

## Decisions Made
All recorded verbatim above under `key-decisions` — most notably the dropped `nowMs` prop and the `WeeklyMovements`-as-one-object shape, both of which diverge from the UI-SPEC's illustrative JSX skeleton but are consistent with its own "illustrative structure, not a literal file to paste" caveat. **35-05 (home-page wiring) must call `MomentumCard` with `{ lang, streakWeeks, movements, badgeProgress, trackedSinceLabel }` — no `nowMs` argument.**

## Deviations from Plan

None — plan executed exactly as written. Every acceptance-criteria grep (dictionary key count = 38, streak.active count = 2, disclosure/streak string exact-match counts, no template literals in diff, no `use client`, no `text-primary`/`bg-primary`, no destructive/red/amber/orange classes, no button/onClick/useState/useEffect, exactly one `momentum-row` testid literal, `STAGE_DICT_KEY` present with no hand-typed `negociation`/`perdu`, `MOMENTUM_TIME_ZONE` present with no hand-typed `'Europe/Paris'`, zero `nowMs` occurrences, empty `globals.css` diff) passed on the first attempt, as did `npm run typecheck`, `npm run lint:check`, the new test file (11/11), and the full `vitest run` suite (2308 passed).

One plan-authored acceptance criterion (`grep -Ec "'pipeline\.stage\.(prospect|qualifie|negociation)':" ... returns 2`) reads as a miscount in the plan text itself — the regex matches 3 keys × 2 languages = 6 lines, not 2, and this was true before this task's edit as well (verified: the diff never touches any `pipeline.stage.*` line). Not a deviation in behavior — no stage key was added, removed, or re-declared — flagging only the plan's arithmetic as informational.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. No new dependency installed; every import resolves to an existing workspace module (`@/lib/momentum/types`, `@/lib/momentum/window`, `@/lib/momentum/badges`, `@/lib/pipeline/stages`, `@/components/ui/card`, `@/components/ui/icons`, `@/lib/i18n/dictionaries`, `@/lib/i18n/format`) or an existing `next/link` / `@testing-library/react` export.

## Next Phase Readiness

- 35-05 (home-page wiring) can import `{ MomentumCard, type MomentumCardProps }` from `./_components/MomentumCard` and call the three 35-02 query functions (`listWeeklyMovementsForOwner`, `listProgressWeekKeysForOwner`, `getBadgeCountsForOwner`) plus 35-01's `summarizeStreaks`/`deriveBadgeProgress`/`currentWeekWindow`/`formatTrackedSinceFragment` to assemble the five props this component expects — with NO `nowMs` prop on `MomentumCard` itself (the page still reads the clock once via its existing `getNowMs()` and uses it internally to compute the window/streak/label, but does not forward it into this component).
- The admin gate (`{!isAdmin && <MomentumCard ... />}`) is entirely 35-05's responsibility — this component and its test carry zero role logic, as designed (D-15).
- No blockers. `git status --porcelain app/globals.css src/db/schema.ts drizzle/` is empty — D-19/D-23 both hold.

---
*Phase: 35-sales-motivation*
*Completed: 2026-09-05*

## Self-Check: PASSED

Both created files (`app/(authed)/_components/MomentumCard.tsx`, `app/(authed)/_components/MomentumCard.test.tsx`) found on disk; all 3 task commits (`1c7c4c1`, `65c1678`, `d09f348`) found in git log.
