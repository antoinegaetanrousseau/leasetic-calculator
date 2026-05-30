---
phase: 26-active-expired-row-actions
plan: 03
subsystem: docs
tags: [requirements, roadmap, descope, rowact]

requires:
  - phase: 26-context
    provides: D-01 Archive-only descope decision, D-02 Restore, D-06 body-click behavior

provides:
  - REQUIREMENTS.md with ROWACT-02 descoped (ID preserved), ROWACT-03 rewritten to Archive-only, ROWACT-05 Restore added
  - ROADMAP.md Phase 26 goal/criteria reflecting Archive + Restore + body-click (D-06); Delete criterion replaced
  - Out-of-Scope table entry for per-row Delete (D-01 rationale)
  - Traceability table updated: ROWACT-02 "Descoped (D-01)", ROWACT-05 row added

affects: [26-01-PLAN, 26-02-PLAN, milestone-audit-v1.5]

tech-stack:
  added: []
  patterns: ["Descoped requirement marked [~] with rationale, not silently dropped — mirrors v1.4 BRAND-01/02/03 pattern"]

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md

key-decisions:
  - "ROWACT-02 ID preserved and marked [~] descoped — traceability over deletion"
  - "ROWACT-05 (Restore in Archivées) added as explicit tracked requirement for D-02"
  - "ROADMAP criterion 5 added for D-06 body-click / stopPropagation behavior"

patterns-established:
  - "Descoped requirements use [~] *(descoped YYYY-MM-DD, D-xx)*: ~~original wording~~ — rationale pattern (from v1.4)"

requirements-completed: [ROWACT-02, ROWACT-03, ROWACT-01]

duration: 2min
completed: 2026-05-30
---

# Phase 26 Plan 03: Doc Reconciliation Summary

**ROWACT-02 (per-row Delete) marked descoped in REQUIREMENTS.md + ROADMAP.md; ROWACT-05 Restore added; Phase 26 goal/criteria rewritten to Archive-only + Restore + body-click (D-06)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-30T17:24:47Z
- **Completed:** 2026-05-30T17:26:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- REQUIREMENTS.md: ROWACT-02 marked `[~] *(descoped 2026-05-30, D-01)*` with rationale (ID preserved, not dropped); scope-reduction blockquote added to ROWACT section
- REQUIREMENTS.md: ROWACT-03 rewritten to Archive-only; ROWACT-05 (Restore in Archivées) added; Out-of-Scope row + Traceability + Coverage tally updated
- ROADMAP.md Phase 26: Goal/Requirements line/criteria rewritten to match Archive-only + Restore + body-click scope; v1.5 phase-list bullet updated; no duplicate blockquote added

## Task Commits

1. **Task 1: Reconcile REQUIREMENTS.md to Archive-only + Restore** - `1e47a2b` (docs)
2. **Task 2: Reconcile ROADMAP.md Phase 26 to Archive-only** - `aa5ad2f` (docs)

## Files Created/Modified

- `.planning/REQUIREMENTS.md` - ROWACT-02 descoped, ROWACT-03 rewritten, ROWACT-05 added, Out-of-Scope + Traceability + Coverage updated
- `.planning/ROADMAP.md` - Phase 26 goal/criteria rewritten, v1.5 bullet updated, footer updated

## Decisions Made

None — plan executed exactly as written. All edits prescribed by the plan's action blocks.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — documentation-only plan; no UI or data stubs.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. Documentation edits only.

## Issues Encountered

None.

## Next Phase Readiness

- Plans 26-01 and 26-02 can proceed with REQUIREMENTS.md + ROADMAP.md now matching the Archive-only build scope
- ROWACT-05 is a tracked requirement — 26-01/02 must implement Restore wiring in the Archivées view (D-02)
- No blockers

---

*Phase: 26-active-expired-row-actions*
*Completed: 2026-05-30*
