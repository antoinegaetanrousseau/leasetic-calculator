---
phase: 27-status-pill-rendering-fix
plan: 02
subsystem: ui
tags: [react, nextjs, css-grid, status-chip, verification, dark-mode]

# Dependency graph
requires:
  - phase: 27-status-pill-rendering-fix
    provides: "27-01 home recent-list trailing content-hugging chip source fix (UIFIX-02)"
  - phase: 25-teal-rebrand-polish
    provides: "/proposals max-content chip track (UIFIX-03 original fix)"
  - phase: 26-active-expired-row-actions
    provides: "ProposalRow action slots whose effect on chip sizing is re-verified here"
provides:
  - "Human-verified visual confirmation: home + /proposals chips render content-hugging, full-label, aligned in light AND dark"
  - "UIFIX-03 re-verification: Phase 26 row-action slots did not regress the /proposals chip track"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/27-status-pill-rendering-fix/27-02-SUMMARY.md
  modified: []

key-decisions:
  - "Verification-only: human checkpoint approved both surfaces in light + dark, no regression found, so no consumer-track fix was required."

patterns-established: []

requirements-completed: [UIFIX-02, UIFIX-03]

# Metrics
duration: ~2min
completed: 2026-05-30
---

# Phase 27: status-pill-rendering-fix — Plan 02 Summary

**Human-verify checkpoint approved: the status chip renders content-hugging, full-label, and aligned on both the home "Propositions récentes" list and the /proposals table, in light AND dark mode — no regression from the Phase 26 row-action slots.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-30
- **Completed:** 2026-05-30
- **Tasks:** 1 (human-verify checkpoint)
- **Files modified:** 0 (verification-only — no regression found)

## Accomplishments
- UIFIX-02 visual confirmation: home recent-list chip is trailing, hugs its full label (FR + EN), vertically aligned, no fixed-width stretch/clipping across desktop widths.
- UIFIX-03 re-verification: /proposals chip remains content-hugging on draft / active / expired / archived rows alongside the Phase 26 Edit/Archive/Delete/Restore controls — no overlap, stretch, or clipping.
- Both surfaces confirmed identical (trailing, content-hugging) in light AND dark mode.

## Task Commits

No source commit — this plan is verification-only and no regression fix was needed.

1. **Task 1: human-verify checkpoint** — approved by user; no code change.

**Plan metadata:** committed with the docs(27-02) tracking commit.

## Files Created/Modified
- None (verification-only).

## Decisions Made
- No consumer grid-track fix required — the human checkpoint surfaced no defect on either surface in either theme.

## Deviations from Plan
None — plan executed exactly as written (verification-only path, no regression branch taken).

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- Both ROADMAP Phase 27 success criteria are satisfied (home full-label/no-clip; /proposals content-hugging, no Phase-26 regression) in light + dark.
- Phase 27 complete — milestone v1.5 (Proposal List Actions & Pill Fix) ready for its final phase-completion flow.

---
*Phase: 27-status-pill-rendering-fix*
*Completed: 2026-05-30*
