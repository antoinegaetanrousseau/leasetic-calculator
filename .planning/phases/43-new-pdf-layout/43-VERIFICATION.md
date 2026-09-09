---
phase: 43-new-pdf-layout
verified: 2026-09-09T00:00:00Z
status: gaps_found
score: 5/6 roadmap success criteria verified (10/13 requirement IDs verified, 3 failed — DOC-02 content confirmed by operator 2026-09-09; a third gap, the clientSiret fixture/coverage hole, was added the same day)
overrides_applied: 0
gaps:
  - truth: "A generated proposal PDF matches the design spec end to end (Success Criterion 1 / DOC-01)"
    status: failed
    reason: >
      Font.registerHyphenationCallback is registered nowhere in src/lib/pdf (confirmed: zero matches
      under src/lib/pdf/). @react-pdf/renderer's default hyphenator is therefore active and breaks
      the title mid-word in both languages — "Proposition de location finan-cière" (FR),
      "Equipment lease financing pro-posal" (EN) — where the reference PNG breaks cleanly after "de"/
      "financing" with no hyphen. Confirmed against code; matches 43-08-SUMMARY.md Defect 1 exactly.
      This was also independently confirmed to have been absorbed rather than fixed by two prior
      automated passes: 43-05-SUMMARY.md called it "already accepted" and 43-07 wrote a
      dehyphenate() helper (src/lib/pdf/layout.test.ts:130, confirmed present) that normalises the
      break away before any DOC-10 phrase assertion runs — so the automated suite's green DOC-10
      result does not, and never did, prove the title renders without a hyphenation defect.
    artifacts:
      - path: "src/lib/pdf/document.tsx"
        issue: "No Font.registerHyphenationCallback call beside the Font.register calls (line ~42)"
      - path: "src/lib/pdf/layout.test.ts"
        issue: "dehyphenate() at line 130 normalises the defect away before DOC-10 assertions run instead of asserting its absence"
      - path: "__pdf-fixtures__/expected.sha256.txt"
        issue: "Will need regeneration once the hyphenation callback changes rendered bytes (per D-16 process, scripts/update-pdf-fixture.ts --confirm UPDATE-FIXTURE)"
    missing:
      - "Add Font.registerHyphenationCallback((word) => [word]) beside the existing Font.register calls in src/lib/pdf/document.tsx, per the exact fix location diagnosed in 43-08-SUMMARY.md Defect 1"
      - "Replace dehyphenate() in src/lib/pdf/layout.test.ts:130 with a positive assertion that no wrap-hyphen break exists in the rendered title, converting it from a normaliser into a guard"
      - "Regenerate __pdf-fixtures__/expected.sha256.txt via scripts/update-pdf-fixture.ts --confirm UPDATE-FIXTURE once the callback lands, since it changes rendered bytes"
  - truth: "The PDF shows a VOTRE CONTACT card whose headline/label structure is unambiguous (DOC-03, amended by Phase 42 D-10/D-16/D-24)"
    status: failed
    reason: >
      Confirmed in src/lib/pdf/document.tsx (lines ~296-316): the card renders one undifferentiated
      6-row list under a single headline (inputs.partnerCo) — Commercial, Téléphone (partner),
      Conseiller, Fonction, Téléphone (advisor), Email — with two identically-labelled "Téléphone"
      rows and no visual/textual divider between the partner entity and the Leasetic advisor
      entity. This produced exactly the confusion Antoine reported verbatim in 43-08-SUMMARY.md
      ("I am confused as to who is the advisor and who is partner in the contact section").
      pdf.card.contact.advisorName ("Conseiller"/"Advisor") is confirmed present in
      src/lib/i18n/dictionaries.ts (lines 507-511 FR, 1879-1882 EN) with the dictionary's own
      comment already noting it has "no design source." Antoine specified the replacement 7-row
      structure verbatim in 43-08-SUMMARY.md's "Agreed target structure" block, which this gap
      references rather than restates.
    artifacts:
      - path: "src/lib/pdf/document.tsx"
        issue: "Lines ~296-316: single 6-row undifferentiated list, no Partenaire divider row, two identical Téléphone labels"
      - path: "src/lib/i18n/dictionaries.ts"
        issue: "pdf.card.contact.advisorName / pdf.card.contact.salesRep (FR ~504-513, EN ~1876-1885) need deletion; pdf.card.contact.partner needs adding, per 43-08-SUMMARY.md's dictionary-work-implied list"
      - path: "app/(authed)/proposals/new/parametres/page.tsx"
        issue: "Line ~108: partnerCo = u.companyName?.trim() || nameFallback — silently renders a person's name under an explicit 'Partenaire' label once Defect 2 lands (Finding 3 in 43-08-SUMMARY.md); needs a decision, not yet Antoine's, per that finding's two candidate fixes"
    missing:
      - "Implement the exact 7-row VOTRE CONTACT structure specified verbatim in 43-08-SUMMARY.md's 'Agreed target structure' block (partner headline + Partenaire/Téléphone rows, then advisor headline + Fonction/Téléphone/Email rows), including the 'delete salesRep' scope reduction Antoine gave"
      - "Apply the dictionary deletions/additions listed in 43-08-SUMMARY.md's 'Dictionary work implied' bullet (delete pdf.card.contact.salesRep and pdf.card.contact.advisorName, add pdf.card.contact.partner), landing each deletion in the same diff as its last t() call"
      - "Resolve Finding 3 (partnerCo fallback to a person's name) using one of the two candidate fixes in 43-08-SUMMARY.md before shipping the new 'Partenaire' row — pick (a) drop the nameFallback and render an em dash, or (b) give companyName an admin edit path per the companyTelephone PR precedent"
  - truth: "A populated client SIRET renders in the SOCIÉTÉ CLIENTE card (DOC-02 / FIELD-01 render path)"
    status: failed
    reason: >
      Operator report (2026-09-09): "SIRET was not populated in none of these attempts."
      Confirmed as a fixture + coverage gap, not a write-path bug. NONE of the three fixtures in
      __pdf-fixtures__/fixtures.ts carries a clientSiret key — all three carry only
      clientSiren: '123456789' — so every preview PDF, and the committed byte-determinism baseline,
      render "SIRET —" by construction. Every test that touches the field exercises only the ABSENT
      branch: document.test.tsx:99 (clientSiret: undefined), layout.test.ts:395 (clientSiret:
      undefined) and layout.test.ts:424 (asserts the SIRET label beside em dashes). The single test
      carrying a real value, no-commission.test.ts:178, asserts only commission-invisibility and
      never that SIRET appears. Net: emDash(inputs.clientSiret) at document.tsx:281 has never once
      been rendered with a value in any test or fixture.
      ROOT CAUSE of the blind spot: document.tsx:82 declares clientSiret?: string — optional by
      design, because FIELD-03 requires pre-Phase-42 proposals with no clientSiret key to still
      render. That deliberate optionality let the fixtures omit the field and still typecheck, so
      the legacy escape hatch became the only branch under test. Same failure shape as the
      hyphenation gap from the opposite direction: there a test normalised the bad output away,
      here the fixtures never produce the good output. Both leave a green suite that never asked
      the question.
      NOT believed to be a live defect: both write paths enforce the field —
      finalize-wizard.ts:172 throws LegacyDraftIncomplete when the key is absent, and
      submit.ts:77 runs proposalInputSchema.safeParse, which requires clientSiret and refines that
      its first 9 digits equal clientSiren. A wizard-finalized proposal cannot lack it. The render
      of a populated value is nonetheless the one path no test covers, so it stays a gap until
      proven.
    artifacts:
      - path: "__pdf-fixtures__/fixtures.ts"
        issue: "No clientSiret on any of the three fixtures (only clientSiren at line 27) — every rendered fixture shows 'SIRET —'"
      - path: "src/lib/pdf/document.tsx"
        issue: "Line 281 emDash(inputs.clientSiret) is exercised only with undefined; line 82's FIELD-03 optionality is what permits the fixture omission"
    missing:
      - "Add a valid clientSiret to the happy-path fixtures — must satisfy the schema refine that its first 9 digits equal clientSiren ('123456789' -> e.g. '12345678900012'). Keep at least one fixture WITHOUT it so the FIELD-03 legacy-render path stays covered."
      - "Add a positive assertion that a populated SIRET renders in the SOCIÉTÉ CLIENTE card, mirroring how DOC-11's em-dash case is asserted — the absent branch is well covered, the populated branch is not covered at all."
      - "Regenerate __pdf-fixtures__/expected.sha256.txt after the fixture change (bytes will move)."
      - "Operator confirmation on ONE real finalized proposal that a captured SIRET appears in the rendered PDF — the only path no automated test covers."
deferred: []
human_verification:
  # RESOLVED 2026-09-09 by the operator: "Societe cliente card works." — DOC-02 content confirmed
  # against the reference. The SIRET row was reported blank in the same message; that is NOT a
  # DOC-02 content failure but the fixture/coverage gap recorded as the third gap above.
  - test: "[RESOLVED — operator confirmed] Confirm SOCIÉTÉ CLIENTE card content (DOC-02) — SIREN, SIRET, destinataire, fonction, téléphone, email labels and values — against the reference PNGs field-by-field, not just card geometry"
    expected: "Every field label and its bound value matches Quote-FR-A.reference.png / Quote-EN-A.reference.png exactly"
    why_human: >
      43-08-SUMMARY.md's own key-decisions explicitly record that this checkpoint's lettered verdict
      item (c) 'Cards - all good' covered card geometry (equal width/height, no label wrap) only,
      not SOCIÉTÉ CLIENTE's field-by-field content — and that DOC-02 was therefore deliberately
      left un-ticked rather than assumed complete on that basis. The code (document.tsx lines
      270-286) renders the correct field set structurally (clientCo, clientSiren, clientSiret,
      clientName, clientRole, clientTel, clientEmail via the same CardKeyValueRow/emDash pattern as
      the SOCIÉTÉ CLIENTE spec requires), but no human has confirmed the rendered values/labels
      against the reference PNG the way the title-row and contact-card defects were caught — this
      verifier cannot substitute a grep for that visual confirmation.
---

# Phase 43: New PDF Layout Verification Report

**Phase Goal:** The generated proposal PDF matches the Claude Design layout pixel-for-pixel in both languages — replacing the current single-page text-only document — while holding ADMIN-09 commission invisibility and byte-determinism as non-negotiable gates on the finished output.
**Verified:** 2026-09-09
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A generated PDF matches the design spec end to end (header/title/cards/hero+table/acceptance/footer) | ✗ FAILED | Two confirmed, code-level defects: (a) title-row hyphenation breaks mid-word in both languages — no `Font.registerHyphenationCallback` in `src/lib/pdf/document.tsx`; (b) VOTRE CONTACT card renders one undifferentiated 6-row list with duplicate "Téléphone" labels and no partner/advisor divider — `src/lib/pdf/document.tsx` lines ~296-316. Both defects were operator-confirmed against the reference PNGs in `43-08-SUMMARY.md` D-15 human pass. |
| 2 | Conditions paragraph always states the proposal's actual `validityDays`, never a hardcoded 30 | ✓ VERIFIED | `pdf.validity.caption` carries the `{0}`/`{1}` interpolation contract (43-03), consumed in `document.tsx`; covered by the green `layout.test.ts` DOC-06 assertions and the already-run full suite (2711 passed / 0 failed). |
| 3 | English proposals render every label + full legal paragraph from `Quote-EN-A.dc.html`; French from `Quote-FR-A.dc.html` | ✓ VERIFIED | Full FR/EN `pdf.*` key set confirmed in `src/lib/i18n/dictionaries.ts`; `layout.test.ts` DOC-10 assertions green. Caveat: this suite's `dehyphenate()` helper (line 130) normalises the title-row hyphenation defect away before any DOC-10 phrase assertion runs — the green result proves label/paragraph text fidelity, not title-row rendering correctness, which is captured separately under Gap 1 / Success Criterion 1. |
| 4 | A field with no captured value renders its label followed by an em dash, so card geometry is identical regardless of which fields exist | ✓ VERIFIED | `emDash()` / `EM_DASH` formatter (`src/lib/pdf/em-dash.ts`) used consistently across both cards via `emDash(inputs.xxx)` / `emDash(advisor?.xxx)` calls in `document.tsx`; advisor fields use optional chaining (`advisor?.name`, `.fonction`, `.telephone`, `.email`) confirmed present, satisfying FIELD-03's "renders without throwing on absent advisor" requirement. |
| 5 | No commission figure/rate/derived value appears anywhere; re-rendering the same proposal twice is byte-identical | ✓ VERIFIED | `tests/admin-09-grep-contracts.test.ts` and `src/lib/pdf/no-commission.test.ts` both exist and are part of the already-run green suite (0 failed). `render.ts` computes `contentHash` from sorted inflated stream hashes; `layout.test.ts` DOC-13 describe block asserts identical `contentHash` across two renders of the same fixture and asserts every committed fixture's hash is well-formed. `scripts/update-pdf-fixture.ts` confirmed present for regeneration. |
| 6 | Every text node uses the design's ten-step type scale (6.8/7.5/8/8.5/9/9.5/10/11/13/21pt) | ✓ VERIFIED | `src/lib/pdf/styles.ts` (43-01) confirmed to carry the extended `pdfFontSizes` scale including `cardHeadline: 11` and the design-derived tokens; consumed throughout `document.tsx`. |

**Score:** 5/6 truths verified (Criterion 1 failed on two confirmed, operator-diagnosed defects)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/pdf/styles.ts` | Ten-step type scale, extended palette, mm-derived page margins | ✓ VERIFIED | Confirmed present with `cardHeadline`, brand green, etc. |
| `src/lib/pdf/components/leasetic-lockup.tsx` + icon marks | `<Svg>` port of lockup/icon marks | ✓ VERIFIED (via 43-02 commits + green marks.test.tsx in full suite) | Not independently re-derived; relies on already-run green suite |
| `src/lib/i18n/dictionaries.ts` | Full FR/EN `pdf.*` key set | ✓ VERIFIED, with 2 defects in content | `pdf.card.contact.advisorName`/`.salesRep` confirmed present and flagged for deletion under Gap 2 |
| `src/lib/pdf/em-dash.ts` | `emDash(value)` absence formatter | ✓ VERIFIED | Confirmed consumed at every card row |
| `src/lib/pdf/document.tsx` | Full page render tree: header, title, cards, hero+table, acceptance, footer | ⚠️ PARTIAL | Structurally complete and wired; two content-level defects open (title hyphenation, contact-card semantics) |
| `scripts/render-pdf-preview.ts` + `pdf:preview` script | Confirm-free, DB-free preview renderer | ✓ VERIFIED | `.preview/*.pdf` confirmed present and above byte floor per 43-08-SUMMARY.md; not re-rendered by this verifier per orchestrator's already-run guidance |
| `__pdf-fixtures__/expected.sha256.txt` | Byte-determinism fixture reflecting new design | ✓ VERIFIED (current state) | Green per already-run full suite; will require regeneration once Gap 1's fix lands (noted, not a current failure) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `document.tsx` | `styles.ts` | named token imports (`pdfColors`/`pdfFontSizes`/`pdfPageMargins`) | ✓ WIRED | Confirmed via direct reads of `document.tsx` using `pdfFontSizes.cardHeadline`, `pdfColors.navy`, etc. |
| `document.tsx` | `dictionaries.ts` | `t('pdf.*', lang)` calls | ✓ WIRED | Confirmed at every card/footer/acceptance text node |
| `document.tsx` | `em-dash.ts` | `emDash(...)` calls | ✓ WIRED | Confirmed at every optional field |
| `render.ts` | `document.tsx` | `renderProposalPdf` → JSX render → `contentHash` | ✓ WIRED | Confirmed via `layout.test.ts` DOC-13 assertions in the already-run green suite |
| `finalize-wizard.ts` / `submit.ts` | `document.tsx` (`ProposalDocumentProps`) | both render call sites threading advisor/companyTelephone/SIRET | ✓ WIRED (per 43-04 commits, not independently re-derived here) | Relies on already-run green suite covering both call sites |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| DOC-01 | 43-01, 43-02, 43-05, 43-08 | Single-page A4 matching design's header/title/type-scale | ✗ BLOCKED | Title-row hyphenation defect (Gap 1) violates "matching the design spec." REQUIREMENTS.md correctly still shows `[ ]` Pending. |
| DOC-02 | 43-03, 43-05 | SOCIÉTÉ CLIENTE card, two-column key/value grid | ? NEEDS HUMAN | Code structurally correct (all 7 fields present via `CardKeyValueRow`/`emDash`); content not independently confirmed against reference PNG per 43-08-SUMMARY.md's own decision. REQUIREMENTS.md correctly still shows `[ ]` Pending. |
| DOC-03 | 43-01, 43-03, 43-05, 43-08 | VOTRE CONTACT card, partner-first/advisor-second per D-24 | ✗ BLOCKED | Card-semantics defect (Gap 2), operator-confirmed. REQUIREMENTS.md correctly still shows `[ ]` Pending. |
| DOC-04 | 43-06 | Navy-outlined loyer hero card | ✓ SATISFIED | Confirmed in `document.tsx`; human check (d) "Hero and table - all good." |
| DOC-05 | 43-03, 43-06 | CONDITIONS FINANCIÈRES table with bold Total des loyers HT | ✓ SATISFIED | Confirmed in `document.tsx`; `total = loyerHT × durationMonths`. |
| DOC-06 | 43-03, 43-06 | Conditions paragraph states actual validityDays | ✓ SATISFIED | Confirmed via dictionary interpolation contract + DOC-06 test assertions. |
| DOC-07 | 43-06 | Bottom-pinned acceptance/signature/stamp block | ✓ SATISFIED | Confirmed in `document.tsx` lines ~442-490; human check (e) "Acceptance block - all good." |
| DOC-08 | 43-02, 43-06 | Legal footer with registration line, ref, page number, 14%-opacity icon | ✓ SATISFIED | Confirmed in `document.tsx` lines ~494-535, `opacity={0.14}` on `LeaseticIcon`; human check (f) "Footer - all good." |
| DOC-10 | 43-03, 43-07 | English variant renders every label + full legal paragraph | ✓ SATISFIED (with caveat) | Green in the already-run suite, but the underlying `dehyphenate()` normalisation means this proof never covered title-row hyphenation correctness — see Observable Truth #3 caveat and Gap 1's process finding. |
| DOC-11 | 43-04, 43-05, 43-06, 43-07 | Absent field renders label + em dash | ✓ SATISFIED | `emDash()` confirmed consumed at every card row; FIELD-03 optional chaining confirmed. |
| DOC-12 | 43-07 | No commission figure/rate/value anywhere | ✓ SATISFIED | `no-commission.test.ts` + `admin-09-grep-contracts.test.ts` both present and green in already-run suite. |
| DOC-13 | 43-07 | Byte-identical re-renders, fixture reflects new design | ✓ SATISFIED | `contentHash` determinism tests confirmed in `layout.test.ts`; already-run schema-drift check false. |
| FIELD-03 | 43-04, 43-07 | Proposal finalized before these fields existed still renders without throwing | ✓ SATISFIED | Optional chaining (`advisor?.xxx`) + `emDash()` fallback confirmed at every consumption site. |

**Orphaned requirements check:** REQUIREMENTS.md maps exactly the 13 IDs given in this task's Phase requirement list to Phase 43; all 13 appear in at least one plan's `requirements:` frontmatter (DOC-01 through DOC-08, DOC-10 through DOC-13, FIELD-03). No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/pdf/document.tsx` | ~296-316 | Two entities in one undifferentiated list, duplicate labels | 🛑 Blocker | Gap 2 — DOC-03 |
| `src/lib/pdf/document.tsx` | (Font.register block, no callback) | Missing hyphenation-disable callback | 🛑 Blocker | Gap 1 — DOC-01 |
| `src/lib/pdf/layout.test.ts` | 130 | `dehyphenate()` normalises a real rendering defect away before assertion runs (self-documented in the file's own header comment) | ⚠️ Warning | Automated-gate absorption pattern — flagged for replacement in Gap 1's `missing` list |
| `app/(authed)/proposals/new/parametres/page.tsx` | ~108 | Silent fallback (`partnerCo = u.companyName?.trim() || nameFallback`) mislabels a person as a company once exposed under an explicit "Partenaire" row | ⚠️ Warning | Finding 3 — folded into Gap 2's `missing` list, needs a decision in gap closure |

No `TBD`/`FIXME`/`XXX` debt markers found in files modified by this phase (`document.tsx`, `styles.ts`, `layout.test.ts`, `dictionaries.ts`). The two `XXX` matches in `dictionaries.ts` are pre-existing placeholder reference-format strings (`LC-2026-XXX`), unrelated to this phase's work and not debt markers.

### Behavioral Spot-Checks

Not run independently — the orchestrator's already-run full test suite (200 files / 2711 passed / 0 failed) covers this phase's runnable code (`layout.test.ts`, `no-commission.test.ts`, `admin-09-grep-contracts.test.ts`, `render-fixtures.test.ts`, etc.) more thoroughly than a spot-check could reproduce in this pass. This verifier instead re-derived the two operator-confirmed defects directly against source (see Anti-Patterns and Gaps above) rather than re-running gates.

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention found for this phase, and neither PLAN nor SUMMARY files reference a probe-based verification pattern. Skipped — not applicable.

### Human Verification Required

### 1. SOCIÉTÉ CLIENTE card content audit (DOC-02)

**Test:** Compare the rendered SOCIÉTÉ CLIENTE card's field labels and bound values (SIREN, SIRET, destinataire, fonction, téléphone, email) against `Quote-FR-A.reference.png` and `Quote-EN-A.reference.png`, field by field.
**Expected:** Every label and value matches the reference exactly, with no mislabeling or wrong-field binding.
**Why human:** `43-08-SUMMARY.md`'s own key-decisions record that the D-15 lettered verdict's item (c) "Cards - all good" covered card geometry only, not SOCIÉTÉ CLIENTE's field-by-field content — this checkpoint deliberately did not audit DOC-02's content and left it unticked rather than assume completeness. The code is structurally correct but no human has confirmed rendered values against the reference the way the other two defects were caught.

## Gaps Summary

Two of six roadmap success criteria components are open, both fully diagnosed in
`43-08-SUMMARY.md` and reconfirmed against the current codebase by this verification:

1. **Title-row hyphenation** breaks the FR/EN title mid-word in the rendered PDF because no
   `Font.registerHyphenationCallback` is registered. This was seen and silently absorbed by two
   prior automated verification passes (43-05, 43-07) — 43-07's `dehyphenate()` helper normalises
   the defect away before its own DOC-10 assertions run, so the green test suite never actually
   proved the title renders correctly. Only the human visual pass (43-08) caught it as real.

2. **VOTRE CONTACT card semantics** are ambiguous: one undifferentiated 6-row list mixes the
   selling partner and the Leasetic advisor with two identically-labelled "Téléphone" rows and no
   divider, which is exactly the confusion Antoine reported. He specified an exact 7-row
   replacement structure (quoted verbatim in `43-08-SUMMARY.md`) plus a scope reduction (delete
   `salesRep`). A downstream data question (`partnerCo` falling back to a person's name) needs a
   decision before this fix ships cleanly under the new "Partenaire" label.

Both defects block DOC-01 and DOC-03 respectively; REQUIREMENTS.md already and correctly leaves
both unticked. Everything else claimed by this phase's plans (DOC-04 through DOC-13, FIELD-03) is
verified against the actual codebase and the already-run green test suite. DOC-02 is the one item
that is neither failed nor verified — it needs a human content audit that the D-15 checkpoint did
not perform, per that checkpoint's own explicit decision not to assume completeness.

Phase 43 is **not** ready to close. Per the phase's own sequencing note, Phase 44 (the backfill) is
this milestone's one irreversible step and must not run until the document it re-renders every
existing proposal into is correct — running it against the current hyphenated-title,
ambiguous-contact-card render would permanently bake both defects into every backfilled proposal.

---

*Verified: 2026-09-09*
*Verifier: Claude (gsd-verifier)*
