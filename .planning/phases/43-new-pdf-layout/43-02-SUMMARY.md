---
phase: 43-new-pdf-layout
plan: 02
subsystem: pdf
tags: [react-pdf, svg, brand-marks, vitest]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "plan 43-01's pdfColors.brandGreen (#01CC72) and pdfColors.navy (#112C3B) tokens"
provides:
  - "LeaseticLockup (862x200 viewBox, height-driven width) and LeaseticIcon (200x200 viewBox, size + optional opacity) as named exports, both built from react-pdf <Svg>/<Ellipse>/<Path> primitives"
  - "Real-rendered evidence (marks.test.tsx) that both marks emit vector content, that the wide ellipses reach their true x-extent, and the D-07 rotate-transform verdict for this react-pdf version"
  - "A second, unplanned D-07-shaped finding: style={{ opacity }} on <Svg> is a silent no-op in @react-pdf/renderer 4.5.1 — fixed by passing opacity as a direct presentation attribute"
affects: [43-05, 43-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-07 option 1 (pre-applied rx/ry swap) used for both marks' two rotated ellipses; no transform attribute is emitted by either component"
    - "Evidence-first component testing: render through the real renderToBuffer pipeline, inflate every PDF content stream, and assert on decompressed operator/coordinate text rather than on props or snapshots"

key-files:
  created:
    - src/lib/pdf/components/leasetic-icon.tsx
    - src/lib/pdf/components/leasetic-lockup.tsx
    - src/lib/pdf/components/marks.test.tsx
  modified: []

key-decisions:
  - "D-07 verdict: for @react-pdf/renderer 4.5.1, rotate(-90 cx cy) IS honoured (assertion 3's control tree reached x>=190 unrotated-equivalent extent). The plan's pre-applied rx/ry swap (option 1) is used anyway per the plan's own framing — it is geometrically exact and correct under either renderer behaviour, so the shipped components make no bet on this verdict."
  - "Rule 1 auto-fix: the plan's literal action text specified `style={opacity !== undefined ? { opacity } : undefined}` on <Svg>. The evidence test (assertion 4) proved this is a silent no-op — no ExtGState/gs operator reaches the content stream. Switched LeaseticIcon to pass `opacity` as a direct <Svg> presentation attribute, which does emit `gs`, and verified the fix via the same test."
  - "The plan's literal acceptance-criteria regex for counting Bezier operators, `/\\s c\\b/g`, cannot match — it requires two consecutive whitespace characters before `c`, but PDFKit content streams separate operands and operators with a single space. Replaced with a token-level split-and-filter count in marks.test.tsx; the underlying intent (count `c` operator occurrences, assert >=16) is preserved exactly."

patterns-established:
  - "Two-tier D-07 evidence: a hard gate (Bezier count, x-extent, opacity-difference) plus a soft, logged verdict (the rotate-transform comparison) that records renderer behavior without making the shipped code depend on it."

requirements-completed: []  # DOC-01/DOC-08 listed in this plan's frontmatter mark relevance, not closure. The plan explicitly does not touch document.tsx ("wired into the header and footer by plans 43-05 and 43-06") — neither requirement's single-page-A4-matching-the-design (DOC-01) nor legal-footer (DOC-08) criterion is satisfied until the marks are actually placed in the render tree.

# Metrics
duration: ~14min
completed: 2026-09-08
---

# Phase 43 Plan 02: Port Leasetic Marks to react-pdf Svg (D-07) Summary

**LeaseticLockup and LeaseticIcon ported to `@react-pdf/renderer`'s `<Svg>` primitives with the rotation pre-applied as an rx/ry swap, proven by a real-render evidence test that also caught and fixed a second silent-failure mode: `style={{opacity}}` on `<Svg>` is a no-op in this renderer version.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-08T19:13:00Z
- **Completed:** 2026-09-08T19:26:52Z
- **Tasks:** 2
- **Files modified:** 3 (2 created in Task 1, 1 created + 1 amended in Task 2)

## Accomplishments
- `LeaseticIcon` and `LeaseticLockup` exist as named exports, both with the two source ellipses' `rotate(-90 cx cy)` transform pre-applied as an rx/ry swap (D-07 option 1) — no `transform` attribute survives in either file
- `LeaseticLockup` carries the ~2,900-character wordmark path copied verbatim from `leasetic-lockup-color.svg`, filled with `pdfColors.navy`
- `marks.test.tsx` renders both components through the real `renderToBuffer` pipeline (not a mock), inflates every PDF content stream, and asserts: vector content exists (32 `c` operator tokens for the lockup, well over the 16-operator floor), the icon's wide ellipses reach x∈[≈0, ≈200], the D-07 rotate-transform verdict is logged (`react-pdf HONOURS rotate(-90 cx cy)` for this version — see Decisions), and the 14%-opacity path measurably changes the content stream
- Caught and fixed a real bug the evidence test was built to catch: `style={{ opacity }}` on `<Svg>` produced byte-identical content streams whether or not opacity was set (no `ExtGState`/`gs` operator at all) — `LeaseticIcon` now passes `opacity` as a direct presentation attribute, confirmed to emit `/Gs1 gs` in the rendered output

## Task Commits

1. **Task 1: Build LeaseticLockup and LeaseticIcon as react-pdf Svg primitives (D-07)** - `c0f28b4` (feat)
2. **Task 2: Prove the marks actually render, and record the rotate-transform verdict (D-07)** - `1db7141` (test) — includes the opacity fix to `leasetic-icon.tsx`, amended in the same commit since it was found by this task's own evidence test

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/lib/pdf/components/leasetic-icon.tsx` - `LeaseticIcon({ size, opacity })`: four brandGreen ellipses (two rx/ry-swapped), opacity passed as a direct `<Svg>` attribute (Rule 1 fix, not the plan's literal `style` form)
- `src/lib/pdf/components/leasetic-lockup.tsx` - `LeaseticLockup({ height })`: same four ellipses at the lockup's 862x200 viewBox, plus the verbatim wordmark `<Path>` in navy; width derives from height at the source aspect ratio (862/200 = 4.31)
- `src/lib/pdf/components/marks.test.tsx` - D-07 evidence test: 4 assertions against real rendered/inflated PDF content streams, none asserting raw `sha256` equality (D-16 discipline)

## Decisions Made
- **D-07 verdict (evidence, not assumption):** react-pdf 4.5.1's control-tree test (assertion 3) shows `rotate(-90 cx cy)` IS honoured — the source-style ellipse (narrow rx/ry + transform) reached the same wide x-extent as the pre-swapped version. Per the plan's own framing, this changes nothing about the shipped components: the pre-applied swap (option 1) is correct either way and was already the chosen approach, so no PNG fallback (option 2) is needed and none was considered.
- **Rule 1 auto-fix — opacity is a no-op via `style`:** the plan's action text specified `style={opacity !== undefined ? { opacity } : undefined}`. The Task 2 evidence test this same plan mandates proved that form never reaches the PDF (byte-identical decompressed streams with and without opacity, and no `ExtGState` object in the raw PDF at all). Switched to the direct `opacity` prop on `<Svg>`, which the SVGPresentationAttributes type also permits and which does emit a `gs` operator. Re-verified via the same test before considering the task done.
- **Regex correction in the evidence test:** the plan's suggested `/\s c\b/g` for counting Bezier operators cannot match single-space-delimited PDFKit output (it requires two whitespace characters). Replaced with a token-split-and-count approach that measures the same thing the plan intended.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `style={{ opacity }}` on `<Svg>` is a silent no-op in @react-pdf/renderer 4.5.1**
- **Found during:** Task 2 (writing/running the opacity assertion in `marks.test.tsx`)
- **Issue:** The plan's literal `LeaseticIcon` action text passed opacity via a `style` object. Rendering with and without `opacity` set produced byte-identical decompressed content streams, and the raw PDF contained no `ExtGState` object at all — the 14%-opacity footer mark from DOC-08 would have rendered at full opacity with no error.
- **Fix:** Pass `opacity` directly as a `<Svg>` presentation attribute (`<Svg ... opacity={opacity}>`) instead of via `style`. Verified this emits `/Gs1 gs` in the content stream for both a minimal repro and the shipped component.
- **Files modified:** `src/lib/pdf/components/leasetic-icon.tsx`
- **Verification:** `marks.test.tsx` assertion 4 (`the footer opacity path renders`) passes; manual repro scripts (not committed) confirmed the `gs` operator appears only with the direct-attribute form.
- **Committed in:** `1db7141` (Task 2 commit — the fix and the test that caught it landed together)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in the plan's own literal code, caught by the plan's own evidence test)
**Impact on plan:** This is exactly the failure class D-07 exists to catch — a silent, unthrown rendering gap. No scope creep: the fix is contained to the one component the bug was in, and it was found and fixed inside Task 2's own verification loop before the task was marked done.

## Issues Encountered
- The plan's acceptance-criteria regex `/\s c\b/g` (for counting Bezier `c` operators) never matches real PDFKit content-stream output, because operands and operators in this renderer's output are separated by a single space, not two whitespace characters. Not a plan defect worth escalating — replaced with a token-count approach in the test that measures the identical thing the plan intended (occurrences of the bare `c` operator), and verified the fixed count (32 for the lockup, well over the 16 floor) makes sense against the four ellipses (16) plus the wordmark's curved segments.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `LeaseticLockup` and `LeaseticIcon` are ready for plans 43-05 (header, replacing the `LEASETIC` text node at `document.tsx:132`) and 43-06 (legal footer, at 14% opacity) to import and place in the render tree.
- The D-07 question is closed with evidence, not assumption: react-pdf 4.5.1 honours `rotate(-90 cx cy)` on this codebase's toolchain, but the shipped components do not depend on that fact — they use the pre-applied rx/ry swap either way, so a future renderer upgrade cannot silently regress the mark's geometry.
- The opacity-via-`style`-is-a-no-op finding is now encoded directly in `leasetic-icon.tsx`'s implementation (not just in a comment) — any future contributor reaching for `style={{ opacity }}` on an `<Svg>` in this codebase should consult this component first.
- `document.tsx` is untouched, as the plan required — `__pdf-fixtures__/render-fixtures.test.ts` remains the same expected-red state left by plan 43-01 (margin change), unaffected by this plan.

## Self-Check: PASSED

All created/modified files confirmed present: `src/lib/pdf/components/leasetic-icon.tsx`,
`src/lib/pdf/components/leasetic-lockup.tsx`, `src/lib/pdf/components/marks.test.tsx`, this
SUMMARY.md. All task commits confirmed in `git log`: `c0f28b4` (Task 1), `1db7141` (Task 2).

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-08*
