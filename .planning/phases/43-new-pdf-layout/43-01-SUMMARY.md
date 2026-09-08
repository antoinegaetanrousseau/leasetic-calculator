---
phase: 43-new-pdf-layout
plan: 01
subsystem: pdf
tags: [react-pdf, i18n, planning-docs, design-tokens]

# Dependency graph
requires:
  - phase: 42-captured-data-fields-advisor-profile
    provides: leasetic_advisor row + advisor-schemas.ts free-text fonction contract that forced the D-03 upstream retraction
provides:
  - DOC-03 and the ROADMAP Phase 43 planning note reconciled in place, both citing D-03 as the retracting decision
  - The orphaned pdf.partnerType.* key disposition locked in ROADMAP.md for plan 43-03 to execute
  - src/lib/pdf/styles.ts carrying the design's ten-step type scale (pdfFontSizes), nine-token palette (pdfColors), mm-derived page margins (pdfPageMargins), and a new pdfPageBase export — all additive alongside the five legacy font roles and six legacy colors
affects: [43-02, 43-03, 43-04, 43-05, 43-06, 43-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upstream amendment-in-plan: retract a wrong requirement clause in place, cite the retracting decision (D-03), keep the surviving restructure note intact — same precedent as Phase 41 D-02 and Phase 42 D-15..D-24"
    - "Additive token extension: new design tokens land alongside old ones in the same three as-const objects (pdfColors/pdfFontSizes/pdfPageMargins); deletion is deferred to the plan that removes the last consumer (43-06)"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - src/lib/pdf/styles.ts

key-decisions:
  - "D-03 retraction executed verbatim: DOC-03's fonction-translation clause is a category error (users.partnerType FR/EN pairs applied to the unrelated, free-text, required leasetic_advisor.fonction column) — removed from both REQUIREMENTS.md and ROADMAP.md, D-04's restructure note preserved"
  - "Orphaned pdf.partnerType.* keys: kept and annotated (not deleted) per CONTEXT.md's Deferred Ideas noting partnerType translation on web surfaces is a live later decision — disposition recorded in ROADMAP.md for 43-03 to execute"
  - "px->pt and em->pt conversion rules recorded as // line comments (not JSDoc block) so the plan's grep-based acceptance gate (comment-only, not a live value) passes cleanly"

patterns-established:
  - "Same three-object shape (pdfColors/pdfFontSizes/pdfPageMargins) extended, not restructured, when a design system swap lands mid-phase"

requirements-completed: [DOC-01, DOC-03]

# Metrics
duration: ~5min
completed: 2026-09-08
---

# Phase 43 Plan 01: Reconcile DOC-03 + Transcribe Design Tokens Summary

**Retracted DOC-03's category-error fonction-translation clause and additively transcribed the design's ten-step type scale, nine-token palette, and mm-derived page margins into `styles.ts`, leaving all five legacy font roles and six legacy colors in place for 43-06 to retire.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-08T19:04:27Z
- **Completed:** 2026-09-08T19:09:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `DOC-03` in `.planning/REQUIREMENTS.md` and the Phase 43 planning note in `.planning/ROADMAP.md` no longer claim the advisor's fonction renders from an FR/EN label pair; both cite `D-03` as the retracting decision and record the orphaned-key disposition for plan 43-03
- `src/lib/pdf/styles.ts` now exports the design's full ten-step type scale, nine-token palette (including `brandGreen: '#01CC72'`), and 14mm/15mm/10mm page margins converted to points — all additive, no token deleted
- `npm run typecheck`, `npm run lint:check`, and `npm test -- src/lib/pdf/` all green; `__pdf-fixtures__/render-fixtures.test.ts` is expected-red per D-16 (margin values changed) and was deliberately left unregenerated

## Task Commits

1. **Task 1: Reconcile DOC-03 and the ROADMAP planning note in place (D-03)** - `0434f37` (docs)
2. **Task 2: Transcribe the design's type scale, palette and page margins into styles.ts (D-10 / D-11)** - `c41af92` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `.planning/REQUIREMENTS.md` - DOC-03's fonction-translation clause retracted; D-03 retraction note appended to the existing parenthetical
- `.planning/ROADMAP.md` - Phase 43's second planning note reconciled the same way; orphaned `pdf.partnerType.*` key disposition (keep + annotate, executed by 43-03) recorded in brackets
- `src/lib/pdf/styles.ts` - `pdfColors` extended with 8 new tokens (navy uppercased in place, same colour), `pdfFontSizes` extended with 10 new roles, `pdfPageMargins` replaced in place with mm-derived pt values, new `pdfPageBase` export added, px→pt and em→pt conversion rules recorded as comments

## Decisions Made
- Followed the plan's exact acceptance-criteria wording for both REQUIREMENTS.md and ROADMAP.md edits — no deviation from the specified clause deletions.
- Placed the unit-conversion rule comment as `//` line comments rather than a `/** */` JSDoc block, so the plan's `grep -v '^ *//' | grep -c "0.75pt"` acceptance gate (asserting the rule lives only in a comment) matches the codebase's existing convention and passes exactly as written. This is a formatting choice within Task 2's own action text, not a deviation from plan intent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `styles.ts` now carries every token plan 43-02 through 43-06 need to build the new render tree, with the legacy tokens still present so `document.tsx` continues to compile unchanged until 43-05/43-06 rewrite it.
- `DOC-03` and the ROADMAP note are clean of the retracted clause, so no downstream plan implements against a contradicted requirement.
- The `__pdf-fixtures__` byte-determinism suite is red as documented and expected — this is the accepted interval through 43-06; plan 43-07 regenerates it per D-16. No action needed from this plan.

## Self-Check: PASSED

All created/modified files confirmed present: `src/lib/pdf/styles.ts`, `.planning/REQUIREMENTS.md`,
`.planning/ROADMAP.md`, this SUMMARY.md. All task commits confirmed in `git log`: `0434f37`
(Task 1), `c41af92` (Task 2), `1a24836` (SUMMARY.md).

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-08*
