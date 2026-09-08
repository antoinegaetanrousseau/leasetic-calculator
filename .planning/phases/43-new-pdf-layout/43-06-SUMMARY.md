---
phase: 43-new-pdf-layout
plan: 06
subsystem: pdf
tags: [react-pdf, i18n, pdf-layout, claude-design-layout, byte-determinism]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-05's page frame, header lockup, 2px rule, title row and the two-card grid — document.tsx's render tree from <Page> through the card grid; Eyebrow and CardKeyValueRow primitives; the emDash formatter"
provides:
  - "FinancialRow — the 42/58 flexBasis port of the design's CONDITIONS FINANCIÈRES table row"
  - "document.tsx complete end to end: the navy-outlined loyer hero beside the 5-row financial table, the conditions paragraph interpolating the proposal's real validityDays, the interests block deleted (D-05), the marginTop:'auto'-pinned acceptance block, and the legal footer with the react-pdf render/fixed page-number callback and the 14%-opacity LeaseticIcon"
  - "pdf.section.interests and pdf.footer.left deleted from both dictionary blocks, from phase8Keys and from twoArgKeys — 43-03's Phase 43 orphan ledger fully closed"
  - "SectionLabel and KeyValueRow primitives deleted; pdfFontSizes holds exactly D-10's ten design roles; pdfColors drops green/greenTint/ink/muted/border"
  - "A reproduced and worked-around @react-pdf/renderer 4.5.1 defect: an inherited `lineHeight` anywhere in this document's ancestor chain silently drops every dynamic render-prop <Text>"
affects: [43-07, 43-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "react-pdf table port: a real HTML <table> with a fixed-width colgroup has no react-pdf primitive, so a flex row with flexBasis: '42%' / '58%' (matching the colgroup's own percentages) is the direct substitute — comment the derivation at the component, not the call site."
    - "Bottom-pinned block: marginTop: 'auto' on a direct child of a flexDirection:'column' <Page> works exactly like CSS flex auto-margins and needs no position:'absolute' fallback, PROVIDED no lineHeight is set anywhere in the ancestor chain (see the deviation below)."
    - "@react-pdf/renderer 4.5.1 known-defect avoidance: never set `lineHeight` on <Page> (or on any single ancestor View spanning the whole page) in a document that also uses a dynamic render-prop <Text> anywhere. Set the design's base line-height explicitly per Text node that needs it instead of relying on inheritance from a shared ancestor."
    - "PDF text-content verification, properly font-aware: build the /Fx font-resource-name -> /ToUnicode object-number mapping from the PDF's own object graph (`/Font << /F2 A 0 R ... >>`, `A 0 obj ... /ToUnicode C 0 R`), then decode the content stream tracking the active `/Fx N Tf` selector so each glyph run is decoded with the font that actually painted it. The single-shared-glyph-map approach used elsewhere in this repo (no-commission.test.ts's reconstructVisibleText) silently corrupts any text whose glyph IDs collide across two font subsets and is unreliable as a positive-presence check (it is fine for the absence checks it's actually used for)."

key-files:
  created:
    - src/lib/pdf/components/financial-row.tsx
  modified:
    - src/lib/pdf/document.tsx
    - src/lib/pdf/styles.ts
    - src/lib/i18n/dictionaries.ts
    - src/lib/i18n/dictionaries.test.ts
    - src/lib/pdf/sanitize-number.ts
    - src/lib/pdf/no-commission.test.ts
  deleted:
    - src/lib/pdf/components/section-label.tsx
    - src/lib/pdf/components/key-value-row.tsx

key-decisions:
  - "The financial table's row 4 (Loyer mensuel HT) restates the hero's value through the same on-demand branch as the hero, rather than D-09's literal two-em-dash enumeration (rows 3 and 5 only) — same real-value reasoning as the hero, flagged for the D-15 visual pass per the plan's own instruction."
  - "Rule 1 auto-fix: root-caused a @react-pdf/renderer 4.5.1 defect where a `lineHeight` set anywhere in this document's ancestor chain (on <Page> itself, or hoisted onto a wrapping <View> via flexGrow/height/a literal pixel height) silently drops every dynamic render-prop <Text> — the legal footer's page-number/lcRef text never reached the content stream, with no thrown error. The fix removes the Page-level `lineHeight: pdfPageBase.lineHeight` entirely; every Text node that needs a specific line-height already sets its own (hero 1.05, conditions/validity body 1.65, legal footer 1.5, etc.). Single-line labels/headlines lose the inherited 1.45 base default, which is visually insensitive for a single line — flagged for D-15's human visual pass to confirm or overrule."
  - "The two dictionary-comment rewordings for pdf.section.interests/pdf.footer.left (in dictionaries.ts and dictionaries.test.ts) avoid the literal dotted key strings in prose, following 43-05's established precedent — the plan's own repo-wide grep gates check comments, not just live consumers."
  - "sanitize-number.ts and no-commission.test.ts each carried one stale comment naming KeyValueRow literally; reworded to describe the row generically rather than by the now-deleted component's name, for the same grep-gate reason."

patterns-established:
  - "FinancialRow follows the file's one-component-per-file convention (named interface + named function + inline style pulling from pdfColors/pdfFontSizes/pdfFontWeights), matching Eyebrow and CardKeyValueRow."
  - "pdfPageBase.lineHeight is retained as a named constant even though nothing currently reads it from a single shared ancestor — it documents the design's intended base value for any future per-Text consumer, with a comment pointing at the document.tsx defect explanation."

requirements-completed: [DOC-04, DOC-05, DOC-06, DOC-07, DOC-08]

# Metrics
duration: ~65min
completed: 2026-09-08
---

# Phase 43 Plan 06: Rebuild the Bottom Half — Hero, Table, Conditions, Acceptance and Legal Footer Summary

**The navy-outlined loyer hero and the five-row CONDITIONS FINANCIÈRES table replace the old green loyer card and computation-breakdown card; the interests block is gone under D-05; the acceptance block is pinned to the page bottom via `marginTop: 'auto'`; and the legal footer's react-pdf page-number callback now actually renders after a root-caused @react-pdf/renderer line-height/dynamic-text defect was found and worked around.**

## Performance

- **Duration:** ~65 min
- **Started:** 2026-09-08T20:56:00Z (session start)
- **Completed:** 2026-09-08T21:53:30Z
- **Tasks:** 3
- **Files modified:** 8 (1 created, 5 modified, 2 deleted)

## Accomplishments

- `FinancialRow` lands as the 42/58 `flexBasis` port of the design's fixed-layout `<table>` colgroup, with the 42%/58% derivation commented at the component per the plan's instruction. Five instances render the financial table in this exact order: `Montant financé HT`, `Durée de location`, `Coefficient appliqué`, `Loyer mensuel HT`, and the emphasized `Total des loyers HT` total row.
- The loyer hero (navy `borderWidth: 1.125`, no fill, no green — D-08) sits beside the table in a `flexGrow: 1.05 / 1.15` row. The total is computed as `Math.round(Number(computed.loyerHT) * inputs.durationMonths * 100) / 100` before `formatCurrency`, verified against the FR happy-path fixture's known product (`1771.88 × 48 = 85 050,24 €`). The on-demand state renders the translated on-request string in the hero and row 4 (same real-value reasoning as the hero, a deliberate reading beyond D-09's literal two-row enumeration, flagged for D-15) and em dashes for the coefficient and total rows, with no `%` sign on the coefficient row in that state.
- The conditions paragraph (DOC-06) now genuinely interpolates `inputs.validityDays` — a rendered 15-day fixture contains `15 jours` and does not contain `30 jours`, proving the design's own hardcoded "(30 jours)" defect is not copied forward.
- The interests block (`✓ Sale & leaseback` / `✓ Évaluation de parc`) is deleted with a D-05 comment at the deletion site; `inputs.slb`/`inputs.evalParc` stay in the wizard and the immutable inputs snapshot, they simply stop printing. Neither `Sale & leaseback` nor `Évaluation de parc` appears anywhere in a rendered FR fixture.
- The acceptance block (three-column Fait à/Le/Nom et qualité row, two-column Signature/dashed-stamp row) is pinned via `marginTop: 'auto'` — proven by rendering identical FR fixtures with a 1-character and a 400-character project description and finding the same minimum `Tm` y-operand (the footer's baseline) across both, with both rendering exactly one page.
- The legal footer replaces the old `position: 'absolute'` block: two registration-line `<Text>`s (brand name in navy semibold, the rest in teal), the react-pdf `render={({ pageNumber, totalPages }) => ...}` + `fixed` page-number callback (preserved verbatim per 43-PATTERNS.md), and `LeaseticIcon` at `size={13.5}` / `opacity={0.14}`.
- `pdf.section.interests` and `pdf.footer.left` are deleted from both FR/EN dictionary blocks, from `phase8Keys`, and from `twoArgKeys`, in the same diff as their last consumers — closing 43-03's orphan ledger. `npm run typecheck` stayed green immediately before and after.
- `SectionLabel` and `KeyValueRow` are deleted (their only consumers — the old PROJET label and the computation-breakdown card — were removed by 43-05/43-06); `pdfFontSizes` holds exactly D-10's ten roles; `pdfColors` drops `green`/`greenTint` (D-08) and the three superseded tokens `ink`/`muted`/`border`.
- **Rule 1 bug fix, the load-bearing finding of this plan:** verified the ACTUAL rendered PDF bytes (not just source review) contained the legal footer's page-number text, and found it silently absent. Root-caused via systematic bisection of `@react-pdf/renderer` 4.5.1's own layout source (`node_modules/@react-pdf/layout`) to a defect where any `lineHeight` in the document's ancestor chain — on `<Page>` itself, or on a wrapping `<View>` via `flexGrow`, `height: '100%'`, or a literal pixel height — silently drops every dynamic `render`-prop `<Text>` node in the whole document (no thrown error, no console warning). Fixed by removing `lineHeight: pdfPageBase.lineHeight` from `<Page>`'s style entirely; every Text node that needs a specific line-height in this document already sets its own explicit value. Verified: the rendered PDF now contains `LC-12345 · Page 1/1` in the legal footer.

## Task Commits

1. **Task 1: Build the loyer hero and the CONDITIONS FINANCIÈRES table** - `ce6c93b` (feat)
2. **Task 2: Build the conditions paragraph, the bottom-pinned acceptance block and the legal footer, and close the orphan ledger** - `9c2f3a2` (feat)
3. **Task 3: Remove the orphaned primitives and tokens** - `122667c` (refactor)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/lib/pdf/components/financial-row.tsx` - `FinancialRow`, the 42/58 flex port of the design's table row
- `src/lib/pdf/document.tsx` - hero, financial table, conditions, interests-block deletion, acceptance block, legal footer; the `lineHeight` fix on `<Page>`
- `src/lib/pdf/styles.ts` - `pdfFontSizes` reduced to the ten D-10 roles; `pdfColors` drops five superseded tokens; comment updates
- `src/lib/i18n/dictionaries.ts` - `pdf.section.interests` / `pdf.footer.left` deleted from both language blocks; ledger comments reworded
- `src/lib/i18n/dictionaries.test.ts` - same two keys removed from `phase8Keys` / `twoArgKeys`; derivation comments reworded
- `src/lib/pdf/sanitize-number.ts` - one stale comment naming `KeyValueRow` reworded
- `src/lib/pdf/no-commission.test.ts` - one stale comment naming `KeyValueRow` reworded

## Files Deleted

- `src/lib/pdf/components/section-label.tsx` - `SectionLabel`, superseded (its only consumer, the interests block, is gone)
- `src/lib/pdf/components/key-value-row.tsx` - `KeyValueRow`, superseded (its only consumer, the computation-breakdown card, was removed in Task 1)

## Decisions Made

See `key-decisions` in the frontmatter. The two substantive ones:

1. **Table row 4 (monthly rent) reads the on-demand branch the same way the hero does**, rather than D-09's literal enumeration of only rows 3 and 5 as em-dash cases — the plan itself instructed recording this reading for the D-15 visual pass to confirm or overrule, since it restates the hero's own quantity under the same "real translated value, not an absence" reasoning.
2. **The @react-pdf/renderer line-height defect is fixed by removal, not by a wrapping View** — every wrapping-View alternative tried (flexGrow, height:'100%', a literal pixel height, single or double-nested) either kept the bug (height:'100%', literal height) or fixed the bug but overflowed the document to two pages (flexGrow — the wrapper resolved against the Page's un-padded outer box rather than its content box during Yoga's pagination-unbound measurement pass). Removing the Page-level `lineHeight` entirely was the only change that satisfied both constraints (dynamic text renders, document stays one page) without touching page geometry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed the now-unused `KeyValueRow` import from `document.tsx` in Task 1, ahead of Task 3's formal primitive deletion**
- **Found during:** Task 1 (hero + table build)
- **Issue:** Deleting the computation-breakdown card (`KeyValueRow`'s only remaining call site in `document.tsx`) left an unused import that fails `eslint --max-warnings=0`, the CI gate this plan's own Task 1 verify step runs.
- **Fix:** Removed the import in the same diff; the `key-value-row.tsx` file itself was left in place for Task 3 to delete formally alongside its sibling `SectionLabel`.
- **Files modified:** `src/lib/pdf/document.tsx`
- **Verification:** `npm run lint:check` exits 0 immediately after Task 1.
- **Committed in:** `ce6c93b` (Task 1 commit)

**2. [Rule 1 - Bug] Removed the now-unused `SectionLabel` import in Task 2, ahead of Task 3's formal deletion**
- **Found during:** Task 2 (interests-block deletion)
- **Issue:** Same class of issue as #1 — deleting the interests block (its only remaining call site) orphaned the import.
- **Fix:** Removed the import in the same diff; `section-label.tsx` itself deleted in Task 3.
- **Files modified:** `src/lib/pdf/document.tsx`
- **Verification:** `npm run lint:check` exits 0 immediately after Task 2.
- **Committed in:** `9c2f3a2` (Task 2 commit)

**3. [Rule 1 - Bug] Reworded two comments in Task 2 that named `pdf.section.interests` / `pdf.footer.left` literally in prose**
- **Found during:** Task 2 (dictionary ledger closure)
- **Issue:** The plan's own repo-wide grep acceptance gates (`! grep -rq "pdf\.section\.interests" ...`, same for `pdf\.footer\.left`) check the entire file tree including comments, not just live `t()` consumers. Two ledger/derivation comments in `dictionaries.ts` and `dictionaries.test.ts` named the keys literally and would have tripped the plan's own gate — the same class of issue 43-05 already hit and fixed for a different key set.
- **Fix:** Reworded both comments to describe the keys by role ("the interests-block section-label key", "the old two-arg footer-left key") rather than by dotted key string.
- **Files modified:** `src/lib/i18n/dictionaries.ts`, `src/lib/i18n/dictionaries.test.ts`
- **Verification:** `! grep -rq "pdf\.section\.interests" src/ app/ tests/ __pdf-fixtures__/` and the equivalent for `pdf\.footer\.left` both pass repo-wide.
- **Committed in:** `9c2f3a2` (Task 2 commit)

**4. [Rule 1 - Bug] Root-caused and fixed a @react-pdf/renderer 4.5.1 defect dropping the legal footer's dynamic page-number text**
- **Found during:** Task 2's own acceptance criteria (the rendered-text proof for `Page 1/1` and the react-pdf `render`/`fixed` callback pattern)
- **Issue:** The legal footer's `<Text render={({pageNumber,totalPages}) => ...} fixed />` — written exactly per 43-PATTERNS.md's "preserved verbatim" instruction and matching the file's pre-existing footer pattern — compiled, typechecked, and rendered a valid PDF, but the actual rendered bytes never contained the page-number text at all, with no error anywhere in the pipeline. Verified via direct inspection of the decompressed PDF content stream (font-aware TJ/Tf decoding built for this purpose — see Issues Encountered) that the text was genuinely absent, not merely mis-decoded by an imprecise verification script.
- **Fix:** Bisected the exact trigger by editing `document.tsx` directly and re-rendering after each change (removing/restoring individual `<Page>` style properties, then testing wrapping-View alternatives), cross-referenced against `@react-pdf/layout`'s own source (`resolveDynamicNodes`/`splitPage`/`splitNodes`) to confirm the mechanism is plausible. Root cause: any `lineHeight` present anywhere in the ancestor chain of a dynamic `render`-prop `<Text>` — including on `<Page>` itself — causes `@react-pdf/renderer` 4.5.1 to silently drop that Text's content when this document's real content volume is rendered (short excerpts did not always reproduce it, which is why isolated minimal repros initially looked clean). The fix removes `lineHeight: pdfPageBase.lineHeight` from `<Page>`'s style; no wrapping View is introduced (every wrapping-View alternative either kept the bug or caused a two-page overflow — see key-decisions).
- **Files modified:** `src/lib/pdf/document.tsx`, `src/lib/pdf/styles.ts` (comment only)
- **Verification:** A font-aware decode of a real FR-fixture render confirms `LC-12345 · Page 1/1` in the legal footer; the full plan test suite (491 tests) and the DOC-07 one-page/pinning proof both stay green.
- **Committed in:** `9c2f3a2` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 unused-import cleanups, 1 grep-gate comment rewording, 1 library-defect root-cause-and-fix)
**Impact on plan:** All four were necessary for correctness (CI lint gate, the plan's own grep acceptance gates, and DOC-08's actual functional requirement that the page number render). No scope creep — no feature beyond what the plan specified was added.

## Issues Encountered

**The single-shared-glyph-map text-reconstruction approach used elsewhere in this repo (`no-commission.test.ts`'s `reconstructVisibleText`) is unreliable as a positive-presence check when a document embeds more than one font subset.** Built a font-aware alternative for this plan's own ad-hoc verification (not committed — deleted after use, matching 43-05's precedent): it reads the PDF's own `/Font << /F2 A 0 R /F3 B 0 R >>` resource dictionary and each font object's `/ToUnicode` reference to build a `{fontName: glyphMap}` table from the object graph itself, then decodes the content stream tracking the active `/Fx N Tf` selector so each glyph run uses the CMap that actually painted it. This is what surfaced the Rule 1 defect above — the single-merged-map approach would have reported the page-number text as "present but garbled" rather than genuinely absent, which would have hidden the real bug.

**Bisecting the `@react-pdf/renderer` defect consumed the bulk of this plan's time.** Every isolated minimal repro (`Font.register` with 2 or 4 weights, `<Svg>` siblings, `marginTop: 'auto'` ancestors, IIFE-wrapped JSX, 20+ rows of mixed-weight text) reproduced the bug ONLY when combined with the real document's actual content volume — none of the individually-suspicious features (custom fonts, SVG, auto-margin, dynamic-in-a-row-with-an-icon) triggered it alone. The eventual fix (remove `lineHeight` from `<Page>`, no wrapper) is minimal and low-risk, but reaching it required directly reading `@react-pdf/layout`'s own `resolveDynamicNodes`/`splitPage` source to understand why a wrapping-View alternative that fixed the missing-text symptom (`flexGrow: 1`) introduced a page-overflow regression instead (the wrapper's `flexGrow` resolves against the Yoga tree's un-padded, pagination-unbound measurement pass rather than the page's actual padded content box).

## User Setup Required

None — no external service configuration required.

## Verification (re-run at closeout)

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint:check` (`--max-warnings=0`) | pass |
| `npm test -- src/lib/pdf/ src/lib/i18n/dictionaries.test.ts tests/admin-09-grep-contracts.test.ts tests/vendored-ui-integrity.test.ts` | 491 passed |
| `npm test -- src/lib/pdf/ tests/admin-09-grep-contracts.test.ts` | 93 passed |
| `npm test -- tests/vendored-ui-integrity.test.ts` (four-weight font-registration guard) | 5 passed |
| `git diff --stat package.json package-lock.json` (T-43-SC) | empty |
| `__pdf-fixtures__/render-fixtures.test.ts` | red, as D-16 requires — same expected transient state as 43-01/43-05; not fixed here (plan 43-07 owns regeneration) |
| `__pdf-fixtures__/commission-free-fixture.test.ts` | **5 passed** — this file does structural/no-commission checks only (no byte-hash comparison), so it is unaffected by the layout change and stays green throughout Phase 43 |
| `__pdf-fixtures__/inter-typography.test.ts` | 3 passed, 3 failed — see below |

**`inter-typography.test.ts` failure detail (evidence for plan 43-07's reconciliation, per this plan's own verification note):**

- **Expected failure (per this plan's `<verification>` section):** the D-10 case now measures **2 distinct embedded Inter faces** (not 4) in both the FR and EN fixtures. The Claude Design layout uses only weights 400 (regular) and 600 (semibold) — confirmed by grep: `pdfFontWeights.medium` (500) and `.bold` (700) are never referenced anywhere in `document.tsx`, `eyebrow.tsx`, `card-key-value-row.tsx`, or `financial-row.tsx` — so only two font subsets ever get embedded, exactly the correct consequence of the redesign.
- **Additional failure not anticipated by the plan's verification note:** the D-09 case now also fails — `U+202F NARROW NO-BREAK SPACE` is absent from the reconstructed FR+EN glyph inventory. Root cause: that codepoint's *only* source anywhere in the FR/EN dictionaries was the literal escape inside `pdf.section.interests`'s FR string (`"POINTS D’INTÉRÊT IDENTIFIÉS :"`), which this plan deletes under D-05. No other `pdf.*`/`proposal.*` string or `document.tsx` literal consumed by the happy-path fixtures contains U+202F — `sanitizePdfNumber` actively strips it from every formatted number before render, by design. This is a direct, correct consequence of D-05's content deletion, not a regression; the test's hardcoded "high-risk codepoint" list (written in Phase 41, before Phase 43 existed) is now stale for that one entry. Recorded here, not fixed, per this plan's `files_modified` scope (`inter-typography.test.ts` is not listed) and the plan's own instruction to hand this file's reconciliation to 43-07.

## Next Phase Readiness

- `document.tsx` is now complete end to end — every block from the header lockup through the legal footer is the Claude Design layout; nothing of the pre-Phase-43 five-block document remains.
- 43-07 inherits the fixture regeneration (D-16, blocking) for `render-fixtures.test.ts` / `commission-free-fixture.test.ts`'s hash file, and the `inter-typography.test.ts` reconciliation for both the 4→2 distinct-face count and the now-stale U+202F requirement (both documented above with root causes, not guesses).
- The `@react-pdf/renderer` 4.5.1 line-height/dynamic-text defect is now documented in-place at `document.tsx`'s `<Page>` style and in `styles.ts`'s `pdfPageBase` comment — any future plan that touches `<Page>`'s style object should read that comment before reintroducing a shared `lineHeight`.
- D-15's human visual pass (Antoine, FR + EN against the reference PNGs) should specifically check: (1) the table's row-4 on-demand reading (this plan's Decision 1), and (2) whether the single-line labels' slightly-shorter-than-1.45-line-height boxes (this plan's Rule 1 fix) are visually detectable anywhere.

## Self-Check: PASSED

All created/modified/deleted files confirmed present or absent on disk as expected. All three task commits confirmed in `git log`: `ce6c93b` (Task 1), `9c2f3a2` (Task 2), `122667c` (Task 3). Test counts and grep results in the Verification tables above were re-run at closeout, not assumed from earlier output in this session.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-08*
