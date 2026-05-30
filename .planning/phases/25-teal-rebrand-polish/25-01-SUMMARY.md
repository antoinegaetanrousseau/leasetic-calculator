---
phase: 25-teal-rebrand-polish
plan: 01
subsystem: ui
tags: [i18n, dictionaries, admin, copy]

requires:
  - phase: 19-lc-references
    provides: admin.nav.lcReferences.title + admin.lcReferences.title keys
  - phase: 18-admin-home
    provides: admin.nav.coefficients.title + admin.home.stats.derniereModifCoeffs keys

provides:
  - FR + EN display labels for the three relabelled admin-home keys + lc-references heading
  - _EnHasAllFrKeys parity proof green (value-only edits, no key churn)

affects: [admin-home, lc-references]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/lib/i18n/dictionaries.ts
    - app/(admin)/[adminSegment]/page.test.tsx

key-decisions:
  - "Test file updated to reflect new label strings (data-testid selectors embed the label value via MetricTile mock)"

patterns-established: []

requirements-completed: [COPY-01, COPY-02, COPY-03, COPY-04]

duration: 10min
completed: 2026-05-30
---

# Phase 25 Plan 01: Admin-home label copy changes (COPY-01..04)

**Four FR + EN dictionary value edits rename the three admin-home labels and the lc-references page heading; parity proof and all 1184 tests remain green.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-30T14:33Z
- **Completed:** 2026-05-30T14:43Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- `admin.nav.lcReferences.title` + `admin.lcReferences.title`: FR "Toutes les propositions" / EN "All proposals" (COPY-01, 4 value edits)
- `admin.nav.coefficients.title`: FR + EN "Coefficients & Commissions" — capital C, plural (COPY-02, 2 value edits)
- `admin.home.stats.derniereModifCoeffs`: FR "Dernière Modif Coef" / EN "Last Coef Update" (COPY-03, 2 value edits)
- `_EnHasAllFrKeys` compile-time parity proof green — no keys added or removed (COPY-04)

## Task Commits

1. **Task 1: Relabel the three admin-home keys + lc-references heading (FR + EN)** — `[see commit]` (feat)

## Files Created/Modified

- `/Users/antoinerousseau/Developer/leasetic-calculator/src/lib/i18n/dictionaries.ts` — 8 string value edits (FR + EN for COPY-01..03)
- `/Users/antoinerousseau/Developer/leasetic-calculator/app/(admin)/[adminSegment]/page.test.tsx` — 3 test assertions updated to match new label strings (Tests 5, 6, 12)

## Decisions Made

The admin page test file hard-codes label strings as `data-testid` attributes via the MetricTile mock (`data-testid={metric-${props.label}}`). Updating the dictionary values therefore required updating the test selectors from `metric-Dernière modif. coeffs` to `metric-Dernière Modif Coef` and from `metric-Last coeff. update` to `metric-Last Coef Update`. This is not scope creep — the test file is the behavioral oracle for the labels.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Accuracy] Test selectors updated to match new label strings**
- **Found during:** Task 1 verification (`npx vitest run`)
- **Issue:** Tests 5, 6, 12 in `page.test.tsx` referenced old label strings (`Dernière modif. coeffs`, `Last coeff. update`) as `data-testid` selectors; they failed after the dictionary update.
- **Fix:** Updated three test assertions to use the new label strings.
- **Files modified:** `app/(admin)/[adminSegment]/page.test.tsx`
- **Verification:** All 1184 tests pass, 0 failures.
- **Committed in:** Task 1 commit

---

**Total deviations:** 1 auto-fixed (test selectors tracking label rename)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

None beyond the test-selector update above.

## Next Phase Readiness

- Plan 01 complete. Proceeding to Plan 02 (UIFIX-01 — status-pill hug-content fix).
- No blockers.

---
*Phase: 25-teal-rebrand-polish*
*Completed: 2026-05-30*
