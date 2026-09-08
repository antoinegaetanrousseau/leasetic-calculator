---
phase: 41-typography-migration
verified: 2026-09-08T11:35:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
---

# Phase 41: Typography Migration Verification Report

**Phase Goal (amended, per D-02/D-04, executed by Plan 41-01):** The PDF renders in Inter (the new
design's typeface) with no font-registration regression, isolated from any layout or palette change
— so the riskiest change in the milestone lands first and alone, in the exact place a past
`shadcn init` broke the self-hosted Plus Jakarta Sans font.

**Verified:** 2026-09-08T11:35:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The upstream amendment (D-02/D-04) itself landed correctly: DOC-09 narrowed (ID preserved), the type-scale clause relocated to DOC-01/Phase 43 criterion 6, "Inter Tight" dropped from ROADMAP criterion 3, both docs cite `41-CONTEXT.md`, 24/24 coverage intact | ✓ VERIFIED | `REQUIREMENTS.md:18` blockquote cites `41-CONTEXT.md`; `REQUIREMENTS.md:50` DOC-09 reads "renders in Inter" with narrowing note, no `6.8` type-scale list; `REQUIREMENTS.md:22-24` DOC-01 carries the relocated ten-step scale; `ROADMAP.md` Phase 41 block cites `41-CONTEXT.md` and `rsms/inter`, no "Inter Tight" string; Phase 43 gained criterion 6 verbatim; `Coverage:** 24/24` line 159 unchanged |
| 2 | Every text node in a generated proposal PDF (FR and EN) renders in Inter; Plus Jakarta Sans fully retired from the font-registration path and its nine binaries deleted | ✓ VERIFIED | `src/lib/pdf/document.tsx:33-40` registers `family: 'Inter'` with four weight-exact `FontSource` entries; line 115 `fontFamily: 'Inter'` is the sole declaration; `grep -ci jakarta src/lib/pdf/document.tsx` = 0; `ls public/fonts/` = exactly 4 files, all `Inter-{400,500,600,700}.ttf`, zero PlusJakartaSans files remain |
| 3 | No proposal PDF renders a missing-glyph/tofu character or throws a font-registration error | ✓ VERIFIED | `__pdf-fixtures__/inter-typography.test.ts` D-09 suite derives the FR+EN glyph inventory from real rendered bytes (never hand-listed) and asserts `hasGlyphForCodePoint` true for every codepoint across all four Inter TTFs; re-ran independently, 6/6 tests pass |
| 4 | Four static Inter TTFs (400/500/600/700) committed as self-hosted assets, acquired from `rsms/inter` v4.1, pinned by SHA-256 | ✓ VERIFIED | Independently re-hashed all four binaries: `40d692fc…`, `97ad806f…`, `78a843fa…`, `28831609…` — match the pins recorded in `41-RESEARCH.md`/`41-02-SUMMARY.md` byte-for-byte; `file` confirms TrueType (not woff2/variable) for all four |
| 5 | The PDF's visual design, palette and content stay exactly as they are today; the byte-determinism fixture is regenerated to reflect the font swap | ✓ VERIFIED | `src/lib/pdf/styles.ts` untouched since commit `793f988` (Phase 08, predates Phase 41) — `pdfFontSizes` still 8/9/10/22/32pt, no value from the ten-step scale entered the file; `sanitize-number.ts` untouched since Phase 23; `__pdf-fixtures__/expected.sha256.txt` regenerated in commit `44673b1` (same commit as the font swap, per D-12); `render-fixtures.test.ts` and `commission-free-fixture.test.ts` both pass |
| 6 | The structural guard (`tests/vendored-ui-integrity.test.ts` cases 3-4) is inverted (not deleted) to pin Inter and remains non-vacuous | ✓ VERIFIED | Cases 3-4 assert `family: 'Inter'`, the four `Inter-{weight}.ttf` references, and on-disk presence; failure messages rewritten to explain the new baseline; "deliberately NOT Inter" string is gone; code reviewer independently reproduced the rename-a-TTF mutation and confirmed it fails as designed (not re-run per verification-notes instruction) |
| 7 | D-11 human visual gate: Antoine reviewed FR and EN rendered proposals and approved | ✓ VERIFIED | `41-03-SUMMARY.md` records Antoine's verbatim response ("approved... No tofu, accents/€/'/° render, weights are visibly distinct, layout and content unchanged"), explicitly attributed as his own response and not an auto-mode self-approval |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `public/fonts/Inter-{400,500,600,700}.ttf` | Four SHA-256-pinned static TTFs | ✓ VERIFIED | Exist, TrueType-confirmed, hashes match pins, tracked in git |
| `src/lib/pdf/document.tsx` | Font.register for Inter at 4 weights + single `fontFamily` decl | ✓ VERIFIED | `family: 'Inter'` ×1, `fontFamily: 'Inter'` ×1, four `fontWeight` entries, zero "jakarta" references |
| `tests/vendored-ui-integrity.test.ts` | Inverted structural guard pinning Inter | ✓ VERIFIED | Cases 3-4 rewritten; guard structure (`PDF_FONT_WEIGHTS`, `PDF_FONT_DIR`) unchanged per D-06/D-08 |
| `__pdf-fixtures__/expected.sha256.txt` | Regenerated PROP-17 baseline | ✓ VERIFIED | Regenerated via script in the same commit as the font swap (44673b1), never hand-edited |
| `__pdf-fixtures__/inter-typography.test.ts` | D-09 glyph coverage + D-10 distinct-faces proof | ✓ VERIFIED | 296 lines, git-tracked, 6 tests, all pass on independent re-run |
| `.planning/REQUIREMENTS.md` | Narrowed DOC-09, relocated scale, scope note | ✓ VERIFIED | All grep-based acceptance criteria from 41-01-PLAN.md independently re-checked and pass |
| `.planning/ROADMAP.md` | Reconciled Phase 41 criteria 1/3, Phase 43 criterion 6 | ✓ VERIFIED | All grep-based acceptance criteria independently re-checked and pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/pdf/document.tsx` | `public/fonts/Inter-{400,500,600,700}.ttf` | `Font.register` src paths built from `FONT_DIR` | ✓ WIRED | Paths resolve; files exist on disk with matching bytes |
| `tests/vendored-ui-integrity.test.ts` | `src/lib/pdf/document.tsx` | `readRequired` + `toContain` on family/weight strings | ✓ WIRED | Guard reads the actual source file content, not a mock |
| `__pdf-fixtures__/inter-typography.test.ts` | `src/lib/pdf` (`renderProposalPdf`) | Renders real FR+EN fixture bytes, then parses them | ✓ WIRED | Test imports and calls the real render path (not stubbed); confirmed by re-running |
| `__pdf-fixtures__/inter-typography.test.ts` | `public/fonts/Inter-*.ttf` | `fontkit.openSync(...).hasGlyphForCodePoint` per weight | ✓ WIRED | Opens actual committed binaries, not a fixture copy |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Guard + fixture + glyph-coverage suites all pass together | `npx vitest run tests/vendored-ui-integrity.test.ts __pdf-fixtures__/render-fixtures.test.ts __pdf-fixtures__/commission-free-fixture.test.ts __pdf-fixtures__/inter-typography.test.ts` | 4 files, 20 tests, all passed | ✓ PASS |
| Modified files lint clean | `npx eslint --max-warnings=0` on the 5 phase-modified source files | 0 warnings/errors | ✓ PASS |
| Font binaries are TrueType and byte-match pins | `file` + `shasum -a 256` on 4 Inter TTFs | All TrueType, all hashes match `41-RESEARCH.md` pins | ✓ PASS |
| `styles.ts` / `sanitize-number.ts` frozen per D-01 | `git log` on both files | No commits since Phase 08 / Phase 23 respectively (predate Phase 41) | ✓ PASS |
| No debt markers in phase-touched files | `grep -E "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` on all 6 modified/created files | None found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DOC-09 | 41-01, 41-02, 41-03 | PDF renders in Inter, no missing-glyph/registration failure | ✓ SATISFIED | Ticked `[x]` in REQUIREMENTS.md, Traceability row "Complete"; font registered, guard inverted, glyph coverage + distinct-faces proven, human-approved |
| DOC-13 | (carried in 41-02/41-03 frontmatter, owned by Phase 43) | Byte-determinism fixture reflects new design | Correctly NOT ticked | REQUIREMENTS.md line 61 `[ ]`, Traceability row maps DOC-13 to "Phase 43 — New PDF Layout / Pending" — consistent with the task brief's framing that DOC-13 is carried but owned by Phase 43. Phase 41 did regenerate the fixture for the font-only baseline (D-12, satisfied), but the full DOC-13 requirement text ("reflects the new design") is scoped to Phase 43's layout, matching ROADMAP Phase 43 criterion 5. |

No orphaned requirements: Phase 41's ROADMAP block declares only `DOC-09`, matching the single ID referenced in Plan 41-01's frontmatter (Plans 41-02/41-03 additionally list DOC-13 in frontmatter for relevance, not ownership — both SUMMARYs explicitly document this and leave DOC-13 unticked, consistent with REQUIREMENTS.md's traceability table).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `__pdf-fixtures__/inter-typography.test.ts` | 214-238 | Per-codepoint glyph-resolution test has no non-vacuity guard of its own (relies on sibling test's ordering to catch an empty inventory) | ⚠️ Warning (from 41-REVIEW.md, independently confirmed by inspection) | Not exploitable under this repo's documented invocation pattern (whole-file `npx vitest run`); would only matter under an isolated `-t` filter run. Already filed as WR-01 in 41-REVIEW.md with a concrete fix. Does not block phase goal — the suite as actually invoked (and as CI invokes it) is non-vacuous. |

No BLOCKER-level anti-patterns found. No TBD/FIXME/XXX debt markers in any phase-touched file.

**Known deferred item (not a gap, per task brief):** `src/lib/pdf/document.tsx` lines 103 and 132 render `Leasétic`/`LEASÉTIC` (pre-rebrand spelling); correct spelling is `LEASETIC`. Pre-existing, repo-wide (145 occurrences / 53 files), predates Phase 41, explicitly frozen by D-01 (content freeze), and recorded as deferred in `41-03-SUMMARY.md`. Not counted as a phase gap.

### Human Verification Required

None. D-11 (the one item that required human judgment) was already satisfied — Antoine's verbatim "approved" response is recorded in `41-03-SUMMARY.md`, attributed as his own response and not a workflow auto-advance. No further human verification is needed to close this phase.

### Gaps Summary

No gaps. All observable truths verified, all artifacts exist/are substantive/are wired, all key links wired, the amended ROADMAP/REQUIREMENTS text was independently re-checked (not just trusted from SUMMARY.md), the four Inter TTFs were independently re-hashed against source pins, the full guard+fixture+glyph-coverage test suite was independently re-run (20/20 passing), lint was independently re-run clean on every touched file, and `styles.ts`/`sanitize-number.ts` were confirmed untouched via git history. The one WARNING-level finding (WR-01, a test-design non-vacuity gap under isolated-test-filter invocation) does not block the phase goal and is already tracked in `41-REVIEW.md` with a concrete fix for a future pass.

---

_Verified: 2026-09-08T11:35:00Z_
_Verifier: Claude (gsd-verifier)_
