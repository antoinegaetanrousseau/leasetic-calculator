---
phase: 43-new-pdf-layout
plan: 07
subsystem: pdf
tags: [react-pdf, pdf-layout, byte-determinism, testing, inter-typography]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-05/43-06's complete Claude Design render tree in document.tsx — header lockup through legal footer — plus the inherited RED state on render-fixtures.test.ts (D-16 byte-drift) and inter-typography.test.ts (D-10 four-faces count, D-09 U+202F absence)"
provides:
  - "A reconciled Phase 41 D-10 typography proof: exact-count-of-4 replaced with face-membership + no-weight-collapse + Regular/SemiBold-presence, matching the Claude Design layout's actual two-weight (400/600) usage; tests/vendored-ui-integrity.test.ts's four-weight REGISTRATION guard stays the separate, untouched proof"
  - "src/lib/pdf/layout.test.ts — the Phase 43 layout proof suite: DOC-10 EN/FR mutually-exclusive label + legal-paragraph inventories, DOC-11/FIELD-03 maximum-absence em-dash + unchanged-geometry + single-page proof, DOC-13 contentHash determinism, DOC-12 commission-invisibility scan (raw buffer + reconstructed text, both languages, all three fixtures)"
  - "A font-aware PDF text-reconstruction utility (keyed by the PDF's own /Font resource dict + active /Fx N Tf selector) and a graphics-state-stack (q/Q/cm) matrix tracker for device-space text-Y extraction — both committed in layout.test.ts, reusable pattern for any future PDF-content-inspection test in this repo"
  - "expected.sha256.txt regenerated for the Claude Design layout (D-16) — all three contentHash values re-baselined, second dry-run confirms No drift"
  - "The whole test suite green (200 files / 2711 tests) for the first time since plan 43-01"
affects: [43-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Font-aware PDF text reconstruction: build a per-font glyphId->codepoint map keyed by the PDF's own /Font resource dictionary (/Fx N 0 R) and each font object's /ToUnicode stream, then decode content-stream TJ/Tj runs while tracking the active /Fx N Tf selector. Replaces the single-merged-glyph-map approach (no-commission.test.ts's reconstructVisibleText) whenever a document embeds more than one font subset — glyph IDs are renumbered per-subset and collide across fonts under the merged-map approach, which can silently under-report (proven here: it reported zero em-dash glyphs in a fixture whose ToUnicode data plainly contains them)."
    - "PDF device-space text-Y extraction via a small q/Q/cm matrix-stack tracker: react-pdf resets Tm to a page-height constant inside every BT block (empirically verified — Tm's own operands carry no positional signal), so the real vertical position must be computed by accumulating the surrounding cm chain and combining it with Tm at each BT/ET. Used to prove DOC-11's card/footer-geometry invariance is a real (non-degenerate) signal rather than a naive 'min Tm y-operand' check, which is always the constant page height and would pass vacuously."
    - "dehyphenate() before phrase assertions: react-pdf's own line-wrap can insert a real hyphenation break mid-word under real content width ('pro-posal', 'finan-cière') — already known and accepted per 43-05-SUMMARY.md. Any future PDF-content substring assertion should join '-\\s+' breaks back into the word before asserting a multi-word phrase, rather than either failing spuriously or trying to widen the layout to avoid the wrap."

key-files:
  created:
    - src/lib/pdf/layout.test.ts
  modified:
    - __pdf-fixtures__/inter-typography.test.ts
    - __pdf-fixtures__/expected.sha256.txt
    - .planning/REQUIREMENTS.md

key-decisions:
  - "D-10's reconciliation asserts face membership (every embedded face is one of the four REGISTERED Inter faces), no-weight-collapse (distinct stream-hash count equals distinct name count), and explicit Regular+SemiBold presence — not an exact count — so a future layout reintroducing weight 500 or 700 does not fail spuriously, while tests/vendored-ui-integrity.test.ts's case 3 remains the separate, untouched proof that all four weights stay REGISTERED."
  - "Retired BOTH U+202F and U+00CA from inter-typography.test.ts's D-09 REQUIRED_CODEPOINTS, not just the U+202F the inherited-state note named. Both codepoints traced to the exact same deleted pdf.section.interests FR string ('POINTS D'INTÉRÊT IDENTIFIÉS :') — U+00CA's identical fate was masked by the REQUIRED_CODEPOINTS loop's early exit on the first (U+202F) failure, and only surfaced once U+202F was removed and the loop reached the next entry. Confirmed via grep that neither codepoint has any other source in dictionaries.ts or document.tsx."
  - "layout.test.ts does not reuse no-commission.test.ts's single-merged-glyph-map reconstructVisibleText, despite the plan's literal instruction to copy it. Independently reproduced 43-06-SUMMARY's own documented finding that the merged-map approach is unreliable once >1 font subset is embedded (it under-reported em-dash glyphs to zero here). Built a font-aware decoder instead (see tech-stack patterns) and documented the deviation in the test file's own header comment."
  - "The DOC-11 footer-baseline-invariance check uses a full q/Q/cm graphics-state matrix tracker rather than a literal 'min Tm y-operand' comparison. Empirically, every Tm in this document is the same page-height constant regardless of position, so a literal Tm-based check (as the plan's wording, and 43-06's own prior ad-hoc verification, both describe) would always trivially pass with zero real signal. The matrix-tracked device-Y is a genuine per-element position, verified non-degenerate (min 31.96, max 794.94 across 67 text runs) and stable to ~1e-4pt between a full and a maximum-absence fixture."
  - "No document.tsx changes were needed anywhere in this plan — every layout.test.ts assertion passed against the existing 43-05/43-06 render tree on first run; Task 2's 'fix document.tsx if a proof fails for a layout reason' contingency was never triggered."

patterns-established:
  - "Amendment-in-plan voice extended to test-file-internal reconciliation, not just ROADMAP/REQUIREMENTS: inter-typography.test.ts's D-10 describe block now carries its own leading block comment naming Phase 43/DOC-01 and pointing at the surviving registration proof, following the same precedent (Phase 41 D-02, Phase 42 D-15..D-24) previously applied only to planning documents."

requirements-completed: [DOC-10, DOC-11, DOC-12, DOC-13, FIELD-03]

# Metrics
duration: ~22min
completed: 2026-09-09
---

# Phase 43 Plan 07: Close the Gates — Layout Proofs, Typography Reconciliation, Fixture Regeneration Summary

**A font-aware PDF text-reconstruction test suite (`layout.test.ts`) proves DOC-10/11/12/13/FIELD-03 against real rendered bytes, the Phase 41 four-distinct-faces proof is reconciled to the Claude Design layout's actual two-weight (400/600) reality, and `expected.sha256.txt` is re-baselined — taking the whole suite green (200 files / 2711 tests) for the first time since plan 43-01.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-09-08T22:17:00Z (session start)
- **Completed:** 2026-09-08T22:38:39Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- **Task 1** reconciled `inter-typography.test.ts`'s D-10 describe block: the FR/EN cases no longer assert an exact count of 4 embedded FontDescriptors, but instead assert (a) every embedded face is a member of the four registered Inter faces, (b) no two differently-named faces share a subset stream (the weight-collapse failure mode Phase 41 D-03 rejected the variable font over), and (c) `Inter-Regular` and `Inter-SemiBold` are both explicitly present — the two weights the Claude Design layout actually uses. `tests/vendored-ui-integrity.test.ts` case 3 (the four-weight REGISTRATION guard) is untouched and stays the separate, surviving Phase-41 proof. `DOC-09` in `.planning/REQUIREMENTS.md` carries the narrowing note, dated and cited.
- Also retired the D-09 `REQUIRED_CODEPOINTS` entries for U+202F and U+00CA — both traced to the same deleted `pdf.section.interests` FR string under D-05; U+00CA's identical fate had been masked by the array's early-exit-on-first-failure loop and only surfaced after removing U+202F. Confirmed via direct grep of `dictionaries.ts` and `document.tsx` that neither codepoint has any other source in the happy-path fixtures' content.
- **Task 2** added `src/lib/pdf/layout.test.ts` — 8 tests across DOC-10 (EN/FR mutually-exclusive label and legal-paragraph inventories, including the stale-`Leasétic`-spelling negative check), DOC-11/FIELD-03 (a maximum-absence FR proposal: 14 em dashes counted font-aware, every label still present, footer baseline within 1e-4pt of the full fixture's, both stay one page), DOC-13 (two renders of the same fixture produce an identical `contentHash`; all three committed fixtures produce a well-formed 64-hex-char `contentHash`), and DOC-12 (raw buffer + font-aware reconstructed text, all three fixtures, both currency-locale formattings of the derived commission amount, with an `LC-12345` positive control against vacuous extraction).
- Built and verified a font-aware PDF text decoder (per-font ToUnicode map keyed by the PDF's own `/Font` resource dict, tracking the active `/Fx N Tf` selector) after empirically reproducing 43-06-SUMMARY's own documented finding that the single-merged-glyph-map approach used elsewhere in this repo silently under-counts once a document embeds more than one font subset — it reported zero em-dash glyphs in a fixture whose ToUnicode CMap data plainly contains U+2014.
- Built and verified a small graphics-state-stack (`q`/`Q`/`cm`) matrix tracker to extract each text run's actual device-space Y position, after discovering that every `Tm` operator in this document carries the same page-height constant regardless of position — a literal "min Tm y-operand" check (as both the plan's wording and 43-06's own prior ad-hoc verification describe it) would always trivially pass with zero real signal. The matrix-tracked value is non-degenerate (min 31.96pt, max 794.94pt across 67 text runs in the full fixture) and stable to ~1e-4pt between the full and maximum-absence fixtures — real evidence for DOC-11's geometry claim, not a vacuous check.
- Discovered and accommodated (not "fixed" — already known and accepted per `43-05-SUMMARY.md`'s own verification note) that the EN/FR title text line-wraps mid-word under real content width (`"Equipment lease financing pro-posal"`, `"Proposition de location finan-cière"`). A `dehyphenate()` step joins the wrap-hyphen break back into the word before any phrase assertion.
- No `document.tsx` changes were needed anywhere in this plan — every `layout.test.ts` assertion passed against the existing 43-05/43-06 render tree on the first real run.
- **Task 3** ran `scripts/update-pdf-fixture.ts` dry-run first (captured the diff — all three hashes changed, expected for a full layout rewrite), then `--confirm UPDATE-FIXTURE` to write, then a second dry-run confirming "No drift". Full suite (`npm test`) green: 200 test files, 2711 tests, 0 failures. `npm run typecheck` and `npm run lint:check` both clean. `git diff --stat package.json package-lock.json` empty (T-43-SC).

## Task Commits

1. **Task 1: Reconcile the Phase 41 four-distinct-faces proof to the design's two-weight reality** - `389dfe3` (refactor)
2. **Task 2: Add the Phase 43 layout proof suite (DOC-10, DOC-11, DOC-12, DOC-13, FIELD-03)** - `e79ad65` (feat)
3. **Task 3: Regenerate the byte-determinism fixture and take the whole suite green (D-16)** - `cc49778` (chore)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/lib/pdf/layout.test.ts` - the Phase 43 layout proof suite (DOC-10/11/12/13, FIELD-03); font-aware PDF decoder + device-Y matrix tracker
- `__pdf-fixtures__/inter-typography.test.ts` - D-10 reconciled to face-membership/no-collapse/Regular+SemiBold-presence; D-09 REQUIRED_CODEPOINTS drops U+202F and U+00CA with a documented root cause
- `__pdf-fixtures__/expected.sha256.txt` - all three contentHash values regenerated for the Claude Design layout
- `.planning/REQUIREMENTS.md` - DOC-09's parenthetical extended with the Phase 43 / DOC-01 narrowing note, dated 2026-09-08

## Decisions Made

See `key-decisions` in the frontmatter. The two most consequential:

1. **Retired U+00CA alongside U+202F**, not just the codepoint the inherited-state note named — both share the exact same deleted source string, and the second failure was purely an artifact of the test's own early-exit loop ordering, not a separate content gap.
2. **Built a font-aware decoder and a real matrix tracker instead of following the plan's literal "copy the no-commission.test.ts helpers" / "min Tm y-operand" wording**, because both literal instructions were empirically shown (in this session, reproducing 43-06's own prior finding for the first and discovering the second independently) to produce either wrong results or a vacuously-always-passing check. The plan's own text explicitly permits fixing `document.tsx` for a failing assertion "for a layout reason" and forbids weakening assertions — the analogous principle applied here is that a test's own extraction machinery must be correct before its assertion means anything, so fixing the extraction (documented as a deviation) rather than either accepting a false negative or a fake-passing check was the correct call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Retired U+00CA from D-09's REQUIRED_CODEPOINTS alongside the plan-flagged U+202F**
- **Found during:** Task 1, immediately after removing U+202F and re-running the suite
- **Issue:** The inherited-state note (and 43-06-SUMMARY) named only U+202F as the D-09 casualty of D-05's `pdf.section.interests` deletion. Removing it revealed a SECOND failure — U+00CA LATIN CAPITAL LETTER E WITH CIRCUMFLEX — masked by the `REQUIRED_CODEPOINTS` loop's `expect(...).toBe(true)` throwing on the first failing entry (array order: U+202F before U+00CA), so the loop never reached U+00CA while U+202F was still failing.
- **Fix:** Confirmed via grep of `dictionaries.ts` and `document.tsx` that U+00CA's only source anywhere was the same deleted string (`"POINTS D’INTÉRÊT IDENTIFIÉS :"` — the Ê in "INTÉRÊT"). Retired the entry with the same D-05 rationale, documented in the same comment block as U+202F.
- **Files modified:** `__pdf-fixtures__/inter-typography.test.ts`
- **Verification:** `npm test -- __pdf-fixtures__/inter-typography.test.ts` — 6/6 tests pass.
- **Committed in:** `389dfe3` (Task 1 commit)

**2. [Rule 1 - Bug] Replaced the plan's literal single-merged-glyph-map text reconstruction with a font-aware decoder**
- **Found during:** Task 2, while validating the em-dash count assertion for the DOC-11 maximum-absence case
- **Issue:** Following the plan's literal instruction to copy `no-commission.test.ts`'s `reconstructVisibleText` (a single glyph-ID → character map merged across every embedded font's ToUnicode CMap) produced a count of **zero** em-dash (U+2014) glyphs in a render whose raw ToUnicode data plainly contains U+2014 — a later-parsed font's CMap overwrote the earlier font's mapping for the same short glyph-ID key. This is the exact risk 43-06-SUMMARY's own "Issues Encountered" section already documented and worked around ad-hoc (without committing the fix).
- **Fix:** Built a per-font glyph map keyed by the PDF's own `/Font` resource dictionary and each font's `/ToUnicode` stream, decoding content-stream text runs while tracking the active `/Fx N Tf` selector — collision-free by construction. Verified against a real render: em-dash count went from 0 to 14 (matching the expected count of absent optional fields).
- **Files modified:** `src/lib/pdf/layout.test.ts`
- **Verification:** `npm test -- src/lib/pdf/layout.test.ts` — 8/8 tests pass, including the em-dash-count assertion.
- **Committed in:** `e79ad65` (Task 2 commit)

**3. [Rule 1 - Bug] Replaced a literal "min Tm y-operand" comparison with a graphics-state matrix tracker for the DOC-11 footer-baseline check**
- **Found during:** Task 2, while implementing the footer-baseline-invariance assertion
- **Issue:** Empirically, every `Tm` operator in this document's content stream carries the identical constant `1 0 0 1 0 841.890015` (the page height) regardless of which text run it precedes — react-pdf resets `Tm` to this constant inside every `BT` block and positions text entirely via the surrounding `cm` chain instead. A literal "min Tm y-operand" check (as both the plan's own wording and 43-06-SUMMARY's prior ad-hoc verification describe it) would therefore always return the same constant and pass trivially, providing zero real signal about geometry.
- **Fix:** Implemented a small `q`/`Q`/`cm` graphics-state-stack matrix tracker that composes the full transform chain and combines it with `Tm` at each `BT`/`ET` boundary to compute the actual device-space Y position. Verified non-degenerate (67 distinct-ish values ranging 31.96 to 794.94pt in the full fixture) and stable to ~1e-4pt (attributable to floating-point accumulation order, tolerated via `toBeCloseTo(_, 2)`) between the full and maximum-absence fixtures.
- **Files modified:** `src/lib/pdf/layout.test.ts`
- **Verification:** `npm test -- src/lib/pdf/layout.test.ts` — the footer-baseline assertion passes with a genuine, non-trivial comparison.
- **Committed in:** `e79ad65` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 test-scope-completion bug, 2 test-extraction-correctness bugs)
**Impact on plan:** All three were necessary for the plan's own tests to mean what they claim to mean — none touched `document.tsx` or any production code path, and none weakened an assertion. No scope creep.

## Issues Encountered

**Building a font-aware PDF decoder and a graphics-state matrix tracker from scratch consumed most of Task 2's time.** No existing library in this repo's dependency tree (no `pdf-lib`, no `pdfjs-dist`) offered positional or font-scoped text extraction; `@react-pdf/renderer`'s own bundled `pdfkit`/`fontkit` are write-side only. Both utilities were built and empirically validated against real renders (using disposable probe test files under `src/lib/pdf/`, deleted before the real commit, matching 43-06's own precedent for ad-hoc verification scripts) before being written into the committed test file.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `document.tsx` and `styles.ts` are now fully verified against DOC-01..13 and FIELD-03 at the rendered-bytes layer, not just source review. Nothing in this plan required a corrective edit to either file.
- `expected.sha256.txt` reflects the Claude Design layout; any future layout change must re-run `scripts/update-pdf-fixture.ts --confirm UPDATE-FIXTURE` in the same change, per D-16.
- The font-aware decoder and matrix tracker in `layout.test.ts` are a reusable pattern (documented in `tech-stack.patterns`) for any future PDF-content-inspection test — in particular, a future plan should prefer them over `no-commission.test.ts`'s single-merged-glyph-map approach for any document that embeds more than one font subset (which is every proposal PDF as of Phase 41).
- D-15's human visual pass (Antoine, FR + EN against the reference PNGs) remains open — this plan closes the automated gates only. The two items 43-06 flagged for that pass (the financial table's row-4 on-demand reading; the single-line labels' shorter line-height boxes) are unchanged by this plan.
- Phase 43's remaining plan (43-08, if any) can proceed against a fully green suite.

## Self-Check: PASSED

All three task commits confirmed in `git log`: `389dfe3` (Task 1), `e79ad65` (Task 2), `cc49778` (Task 3). `src/lib/pdf/layout.test.ts` confirmed present on disk. `__pdf-fixtures__/expected.sha256.txt` confirmed to contain the three regenerated hashes (re-read after commit, not assumed). Full-suite, typecheck, and lint results in this Summary were re-run at closeout, not carried over from earlier output in this session.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-09*
