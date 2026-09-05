---
phase: 37-crm-stack-closure
plan: 02
subsystem: momentum
tags: [nextjs, hygiene, immutability, vitest, server-components]

# Dependency graph
requires:
  - phase: 37-crm-stack-closure
    plan: 01
    provides: a clean lint:check / typecheck / test / build baseline (2326 passing, 61 skipped) this plan proves itself against
provides:
  - single-source momentum render gate on app/(authed)/page.tsx (GAP-03 / IN-01 closed)
  - BADGE_THRESHOLDS frozen at both nesting levels (GAP-03 / IN-02 closed)
affects: [40-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-level frozen exported constant: Object.freeze on the outer object AND on each inner object, typed Readonly<Record<K, Readonly<Record<K2, V>>>> — a single outer freeze leaves nested objects mutable"
    - "Byte-for-byte render-identity proof: capture container.innerHTML to a throwaway scratch file across representative fixtures before and after a hygiene fix, diff each pair, and prove the fixtures are non-vacuous (baselines differ from each other) before trusting an empty diff"

key-files:
  created: []
  modified:
    - "app/(authed)/page.tsx"
    - "src/lib/momentum/badges.ts"
    - "src/lib/momentum/badges.test.ts"

key-decisions:
  - "D-37-05 / IN-01: dropped the redundant !isAdmin from the JSX gate, keeping isAdmin as the single source of truth at the data layer (momentumData's ternary, line 93) — comment wording avoids the literal tokens '!isAdmin' and repeating 'isAdmin' beyond the intended two occurrences, so the plan's own grep-based acceptance criteria measure real code shape"
  - "D-37-05 / IN-02: froze BADGE_THRESHOLDS at both levels via nested Object.freeze calls plus a Readonly<Record<..., Readonly<Record<...>>>> type, matching src/lib/registry/labels.ts's frozen-constant convention"

requirements-completed: [GAP-03]

# Metrics
duration: ~15min
completed: 2026-09-05
---

# Phase 37 Plan 02: GAP-03 Momentum Hygiene Fixes Summary

**Removed a redundant `!isAdmin` render gate and deep-froze `BADGE_THRESHOLDS` at both nesting levels, with byte-for-byte HTML diffs proving the momentum card renders identically before and after.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-05 (session start, following 37-01)
- **Completed:** 2026-09-05T22:26:00+02:00 (approx, Task 3 gate run)
- **Tasks:** 3 completed (Task 3 was verification-only, no source changes, no commit)
- **Files modified:** 3

## Accomplishments

- `app/(authed)/page.tsx:158` (now line 162) gates `MomentumCard` on `momentum` alone; `isAdmin` remains the single source of the gate at the data layer (`momentumData`'s `isAdmin ? null : Promise.all([...])` at line 93). Lines 62 and 93 are untouched.
- `src/lib/momentum/badges.ts`'s `BADGE_THRESHOLDS` is now frozen at both nesting levels — the outer object AND each of `clients`/`wins`/`consistency` — with the type widened to `Readonly<Record<BadgeAxisId, Readonly<Record<BadgeTierId, number>>>>`. No threshold value changed.
- `src/lib/momentum/badges.test.ts` gained 5 new cases under the existing `describe('BADGE_THRESHOLDS', ...)` block: frozen-at-outer, frozen-at-each-inner-axis (asserted individually, not via a loop), top-level-reassignment throws, nested-mutation throws, and a read-is-unaffected case via `deriveBadgeProgress` before/after an attempted mutation. The pre-existing `'matches the exact UI-SPEC numbers'` case is unmodified.

## Rendering-Identity Attestation (Task 1, D-37-05)

Three fixtures were rendered via a throwaway `vitest` scratch file (`app/(authed)/__scratch-render-baseline.test.tsx`, deleted before this task's commit) that reused the mock setup from `app/(authed)/page.test.tsx`:

| Fixture | Before size | After size | `diff` exit code |
|---|---|---|---|
| admin (`role: 'admin'`) | 5816 bytes | 5816 bytes | **0** |
| partner with momentum data | 22475 bytes | 22475 bytes | **0** |
| partner with empty momentum | 19777 bytes | 19777 bytes | **0** |

**Non-vacuity check:** `diff before-admin.html before-partner-momentum.html` exits **1** (non-empty — the admin and partner-with-data baselines genuinely differ), and `diff before-admin.html before-partner-empty.html` also exits **1**. This proves the harness actually exercises both branches and the three empty post-fix diffs above are not trivially vacuous.

No `MomentumCard` prop changed (only the gate expression was edited) and no `BADGE_THRESHOLDS` value changed (only nested `Object.freeze` calls and the type annotation were added). The momentum card renders byte-identically before and after both fixes.

Captures retained at `/private/tmp/claude-501/-Users-antoinerousseau-Claude-Code/cf1fe483-89a8-48ec-ac29-01deaf077ccc/scratchpad/{before,after}-{admin,partner-momentum,partner-empty}.html`.

## Nested-Freeze Depth Proof (Task 2, IN-02)

With only the OUTER `Object.freeze` applied (`Object.freeze({ clients: {...}, wins: {...}, consistency: {...} })`, no inner freeze), the nested-mutation case was run and observed to fail with:

```
AssertionError: expected [Function] to throw an error
 ❯ src/lib/momentum/badges.test.ts:154:8
    152|     expect(() => {
    153|       (BADGE_THRESHOLDS.wins as unknown as Record<string, number>).gol…
    154|     }).toThrow();
```

After adding `Object.freeze` to each of the three inner axis objects (`clients`, `wins`, `consistency`), the same case passes. This confirms the fix went deep enough — a shallow-only freeze would not have closed IN-02.

## Final `BADGE_THRESHOLDS` Declaration

```typescript
export const BADGE_THRESHOLDS: Readonly<Record<BadgeAxisId, Readonly<Record<BadgeTierId, number>>>> =
  Object.freeze({
    clients: Object.freeze({ bronze: 3, silver: 10, gold: 25 }),
    wins: Object.freeze({ bronze: 1, silver: 5, gold: 15 }),
    consistency: Object.freeze({ bronze: 2, silver: 6, gold: 12 }),
  });
```

## Task Commits

1. **Task 1: Capture the render baseline, then remove the redundant `!isAdmin` (IN-01)** - `9d49e8f` (fix)
2. **Task 2: Deep-freeze BADGE_THRESHOLDS at both nesting levels (IN-02)** - `1029e67` (fix)
3. **Task 3: Full gate run and rendering-identity attestation** - verification only, no commit (all four CI gates green; see below)

**Plan metadata:** committed together with this SUMMARY via the final metadata commit.

## Full Gate Run (Task 3)

- **`npm run lint:check`** — exit 0, zero warnings (`--max-warnings=0`).
- **`npm run typecheck`** — exit 0.
- **`npm test`** — exit 0. **2331 passed, 61 skipped** (172 test files passed, 6 skipped, 178 total). Baseline from Plan 01 was 2326 passing / 61 skipped; delta of **+5** accounts exactly for Task 2's five new `BADGE_THRESHOLDS` cases. Skipped count unchanged.
- **`npm run build`** — exit 0, compiled successfully, all routes generated.
- **`git diff --name-only`** against the plan's start commit lists exactly the three files in `files_modified`: `app/(authed)/page.tsx`, `src/lib/momentum/badges.ts`, `src/lib/momentum/badges.test.ts`. No `package.json`/`package-lock.json` change.

## Files Created/Modified

- `app/(authed)/page.tsx` - dropped the redundant `!isAdmin` from the `MomentumCard` render gate (line 158 → now `{momentum && <MomentumCard`); added a comment recording GAP-03/IN-01, worded to avoid the literal `!isAdmin` token or an extra `isAdmin` occurrence so the plan's grep-based acceptance criteria measure real code shape
- `src/lib/momentum/badges.ts` - froze `BADGE_THRESHOLDS` at both nesting levels; widened the type to `Readonly<Record<BadgeAxisId, Readonly<Record<BadgeTierId, number>>>>`; extended the JSDoc block recording GAP-03/IN-02, worded to avoid inflating the `grep -c "Object.freeze"` acceptance count beyond the intended 4
- `src/lib/momentum/badges.test.ts` - added `MomentumBadgeCounts`/`StreakSummary` type imports and 5 new cases inside the existing `describe('BADGE_THRESHOLDS', ...)` block; the pre-existing `'matches the exact UI-SPEC numbers'` case is untouched

## Decisions Made

- Comment wording in both modified source files deliberately avoids literally repeating tokens the plan's own grep-based acceptance criteria check for (`!isAdmin`, an extra `isAdmin`, an extra `Object.freeze`) outside their intended occurrence count — same discipline Plan 01 established for this phase.
- The depth-proof (observing the nested-mutation case fail against an outer-only freeze) was performed by temporarily editing the real `badges.ts` to an outer-only `Object.freeze` and temporarily adding the nested-mutation `it()` to `badges.test.ts`, running the suite, and capturing the literal failure message — then reverting both to the correct two-level freeze and finalizing the test additions per the plan's committed shape.

## Deviations from Plan

None - plan executed exactly as written. The only adjustments were within Task 1's and Task 2's own instructions: rewording code comments to avoid inflating the plan's own grep-based acceptance-criteria counts, which is the same discipline already established in Plan 01's SUMMARY (not a new pattern).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP-03 is closed: both Phase 35 INFO findings are resolved, with byte-identical rendering proven by diff (not asserted) and a nested-freeze depth proof quoted verbatim.
- No blockers for the remaining Phase 37 plans (CLOSE-04's Phase 34 verification/review, the consolidated CLOSE-01/CLOSE-03 operator walk).

## Self-Check: PASSED

- FOUND: `app/(authed)/page.tsx`
- FOUND: `src/lib/momentum/badges.ts`
- FOUND: `src/lib/momentum/badges.test.ts`
- FOUND: `.planning/phases/37-crm-stack-closure/37-02-SUMMARY.md`
- FOUND commit: `9d49e8f`
- FOUND commit: `1029e67`

---
*Phase: 37-crm-stack-closure*
*Completed: 2026-09-05*
