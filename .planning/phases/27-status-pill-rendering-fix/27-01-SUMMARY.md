---
phase: 27-status-pill-rendering-fix
plan: 01
subsystem: ui
tags: [react, nextjs, css-grid, status-chip]

# Dependency graph
requires:
  - phase: 25-teal-rebrand-polish
    provides: "max-content chip track diagnosis (D-03) — /proposals reference pattern"
  - phase: 26-active-expired-row-actions
    provides: "ProposalRow trailing-chip ordering used as parity target"
provides:
  - "Home 'Propositions récentes' row renders a trailing, content-hugging StatusChip (no fixed-width stretch / clipping)"
  - "Home recent-list column order clientCo → lcRef → amount → chip, matching /proposals"
affects: [27-02 human-verify]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Consumer grid-track fix: chip lives in a max-content track + justifySelf:'start' wrapper so it hugs content instead of inheriting the grid's default justify-self:stretch"

key-files:
  created:
    - .planning/phases/27-status-pill-rendering-fix/27-01-SUMMARY.md
  modified:
    - app/(authed)/page.tsx

key-decisions:
  - "Fixed entirely at the consumer grid track (page.tsx) — StatusChip.tsx and globals.css .chip rules left untouched, per Phase 25 D-03 diagnosis."
  - "Added a justifySelf:'start' + display:inline-flex wrapper as belt-and-suspenders so the chip never stretches even if the track changes later."

patterns-established:
  - "Trailing content-hugging chip in inline-grid rows: gridTemplateColumns '1fr auto auto max-content' with the chip as the last child wrapped in justifySelf:'start'."

requirements-completed: [UIFIX-02]

# Metrics
duration: ~10min
completed: 2026-05-30
---

# Phase 27: status-pill-rendering-fix — Plan 01 Summary

**Home "Propositions récentes" StatusChip moved to the trailing column and placed in a `max-content` grid track with a `justifySelf:'start'` wrapper — eliminating the fixed-90px stretch/clipping artifact and matching the /proposals chip rendering (UIFIX-02).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-30T20:03:55Z
- **Completed:** 2026-05-30
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Reordered the `recentRows.map(...)` row children to clientCo → lcRef → amount → chip (chip trailing, parity with `ProposalRow`).
- Changed inline `gridTemplateColumns` from `'90px 1fr auto auto'` to `'1fr auto auto max-content'` so the chip occupies a content-hugging track.
- Wrapped the trailing `<StatusChip>` in `<span style={{ justifySelf: 'start', display: 'inline-flex' }}>` so it never inherits the grid's default `justify-self: stretch`.
- `globals.css` `.chip*` rules and `StatusChip.tsx` left completely untouched (no color/variant change).

## Task Commits

Each task was committed atomically:

1. **Task 1: Reorder home recent-list row to a trailing, content-hugging chip** — `5dfc283` (fix)

## Files Created/Modified
- `app/(authed)/page.tsx` — Home recent-list row: trailing content-hugging StatusChip in a `max-content` track.

## Decisions Made
- None beyond the plan: executed exactly as written (consumer-track-only fix, chip component frozen).

## Deviations from Plan
None — plan executed exactly as written.

## Acceptance Verification
- `grep -c "90px 1fr auto auto"` → 0 (old fixed track removed).
- `grep -c "max-content"` → 1 (chip now content-hugging).
- `grep -c "justify-self\|justifySelf"` → 1 (chip wrapper does not stretch).
- StatusChip is the LAST grid child; the three text spans precede it, unchanged.
- `npx tsc --noEmit` → no error in page.tsx.
- `npm run lint:check` (eslint --max-warnings=0) → passed, 0 warnings.

## Issues Encountered
The executor subagent applied the edit and passed tsc but was interrupted mid-`lint:check` (stream idle) before committing. Per the orchestrator completion-signal fallback, the change was spot-checked (correct diff + acceptance greps), the lint gate re-run green, then committed and documented inline.

## User Setup Required
None — pure client-side CSS layout change, no external service configuration.

## Next Phase Readiness
- Source fix complete and verified. Visual confirmation (full label, no clipping, alignment) in light AND dark across home + /proposals is deferred to the Plan 27-02 human-verify checkpoint.

---
*Phase: 27-status-pill-rendering-fix*
*Completed: 2026-05-30*
