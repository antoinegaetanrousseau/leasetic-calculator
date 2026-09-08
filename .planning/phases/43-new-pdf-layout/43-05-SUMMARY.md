---
phase: 43-new-pdf-layout
plan: 05
subsystem: pdf
tags: [react-pdf, i18n, em-dash, claude-design-layout]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-01's styles.ts token transcription (pdfColors/pdfFontSizes/pdfPageMargins/pdfPageBase), 43-02's LeaseticLockup, 43-03's dictionary keys and orphan ledger, 43-04's emDash formatter and the grown ProposalDocumentProps (partner/advisor)"
provides:
  - "Eyebrow and CardKeyValueRow — the two new one-component-per-file PDF primitives the rest of the layout (43-06) also uses"
  - "The page frame, header lockup band, 2px navy rule and 21pt title row with unconditional pills — document.tsx's render tree from <Page> through the card grid"
  - "The SOCIÉTÉ CLIENTE and VOTRE CONTACT cards, contact card headlining the partner company per D-04, every optional value routed through emDash"
  - "pdf.tagline, pdf.ref.label, pdf.section.project and the now-orphaned pdf.project.ref.prefix deleted from both dictionary blocks and from dictionaries.test.ts's phase8Keys, in the same diff as their last consumer"
affects: [43-06, 43-07, 43-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "react-pdf gap style property (flexDirection: 'row', gap: N) used for the pill row — confirmed supported by the installed @react-pdf/stylesheet 4.5.1 (processGapShorthand) before use, since nothing in the tree used it previously"
    - "Font-subset-aware PDF text-content verification: @react-pdf/renderer emits one ToUnicode CMap per registered font weight, and merging all four into a single glyph-map (the reconstructVisibleText approach referenced in no-commission.test.ts) silently corrupts cross-font glyph lookups. Correct verification decodes the shared content stream once per font's own CMap and checks all four candidate decodes for a match — used ad hoc (not committed) to prove the rendered text inventory for this plan's acceptance criteria"

key-files:
  created:
    - src/lib/pdf/components/eyebrow.tsx
    - src/lib/pdf/components/card-key-value-row.tsx
  modified:
    - src/lib/pdf/document.tsx
    - src/lib/i18n/dictionaries.ts
    - src/lib/i18n/dictionaries.test.ts

key-decisions:
  - "pdf.project.ref.prefix deleted alongside the three keys the plan named explicitly (pdf.tagline, pdf.ref.label, pdf.section.project) — the plan's own instruction to grep for a surviving consumer before deleting it found none (its only consumer was the partnerRefText variable Task 2 removes), so it was deleted in the same diff rather than left for 43-06"
  - "Ledger comments and the dictionaries.test.ts derivation-comment that named the three deleted keys literally (pdf.tagline / pdf.ref.label / pdf.section.project) were reworded to describe them by role instead of by dotted key string — the plan's own repo-wide grep gate (`! grep -rq \"pdf\\.tagline\" src/ app/ tests/ __pdf-fixtures__/`) checks comments too, not just consumers, so a literal mention in a comment trips the same gate that proves the key is gone"

patterns-established:
  - "Eyebrow takes no textTransform prop — dictionary strings for uppercase labels (PROPOSITION N°, SOCIÉTÉ CLIENTE, VOTRE CONTACT) are stored pre-uppercased in dictionaries.ts, so any future eyebrow-style label should follow the same convention rather than relying on a render-time transform"
  - "Partner-phone resolution (inputs.partnerTel snapshot wins, live partner.companyTelephone is the FIELD-03 fallback) is computed once as a local above the JSX, not inline at the render site — matches the file's existing projectText/expiresAt convention"

requirements-completed: []  # DOC-01/DOC-02/DOC-03/DOC-10/DOC-11 in this plan's frontmatter mark relevance to plan 43-05's own scope, not the phase's full closure. The header, title row and both cards now render per the design and DOC-11's em-dash guarantee holds for every field this plan wires — but DOC-04..DOC-08 (hero, financial table, conditions, acceptance block, legal footer) are still the untouched 42-06 region below the card grid, and ROADMAP.md's phase-level DOC-01..13 closure is 43-06/43-07/43-08's to finish. Marking these here would overstate what this plan alone shipped.

# Metrics
duration: ~25min
completed: 2026-09-08
---

# Phase 43 Plan 05: Rebuild the Top Half — Header, Title Row and the Two Cards Summary

**Replaced the header's LEASETIC text node with the real Leasetic lockup SVG over a 2px navy rule, rebuilt the title row as a 21pt h1 with two unconditional emDash-backed pills, and added a two-card grid (SOCIÉTÉ CLIENTE / VOTRE CONTACT) where the contact card headlines the partner company per D-04 — deleting the tagline, PROJET label, bare N° prefix and the now-orphaned partner-ref-prefix key from both dictionary blocks in the same diff as their last consumer.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-08T22:16:34+02:00 (session start, prior plan's metadata commit)
- **Completed:** 2026-09-08T22:44:51+02:00
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `Eyebrow` and `CardKeyValueRow` land as the two new PDF primitives — 7.5pt uppercase label and 8.5pt fixed-label/flex-value row respectively — following the directory's one-component-per-file convention and reading every value from `pdfColors`/`pdfFontSizes`.
- The `<Page>` style object now carries the design's 14/15/10mm margins (via `pdfPageMargins`), 9.5pt base size and 1.45 line height (via `pdfPageBase`), plus an explicit `flexDirection: 'column'` that plan 43-06's `margin-top: auto` acceptance-block pin depends on.
- The header band is the real `LeaseticLockup` (height 19.5pt) beside a three-line eyebrow/reference/issued-date stack — the `LEASETIC` text node and the tagline are both gone from the render tree.
- The divider is now a 1.5pt navy rule (the design's 2px), replacing the old 1px border-colored hairline.
- The title row is a 21pt semibold h1 with `letterSpacing: -0.525`, the project description beneath it, and two right-aligned pills (partner ref, term) that render **unconditionally** — the partner-ref pill routes its value through `emDash` instead of hiding when absent, closing DOC-11 for this field.
- Two cards render side by side with identical chrome (`cardFill`, 10.5pt radius, 9.75/11.25pt padding): SOCIÉTÉ CLIENTE headlines `inputs.clientCo`, VOTRE CONTACT headlines `inputs.partnerCo` per D-04 (a comment above the headline names D-04 so a future reader does not "fix" it back to the design's advisor-first ordering). Every optional value in both cards — SIREN/SIRET/recipient/role/phone/email, and salesRep/partnerPhone/advisor name/role/phone/email — routes through `emDash`.
- Partner-phone resolution is a single local: `inputs.partnerTel` (the immutable creation-time snapshot) wins over the live `partner.companyTelephone` fallback, computed once above the JSX per the file's existing convention.
- `pdf.tagline`, `pdf.ref.label`, `pdf.section.project` and the now-orphaned `pdf.project.ref.prefix` are deleted from both dictionary language blocks and from `dictionaries.test.ts`'s `phase8Keys` array, in the same diff as their last consumer (Task 2) — `npm run typecheck` stayed green immediately before and after that edit. `pdf.section.interests` and `pdf.footer.left` are untouched, as the plan requires (43-06 owns their deletion).
- Verified the actual rendered PDF bytes (not just source review): a real FR and EN render's content-stream text was reconstructed per registered font weight and confirmed to contain `PROPOSITION N°` / `PROPOSAL NO.`, `Établie le` / `Issued`, `Réf. partenaire` / `Partner ref.`, `LC-12345`, the FR/EN title text (`Proposition de location finan-cière` / `Equipment lease financing pro-posal`, hyphenated by react-pdf's own line-wrap), `SOCIÉTÉ CLIENTE`/`CLIENT COMPANY`, `VOTRE CONTACT`/`YOUR CONTACT`, `Destinataire`/`Recipient`, `Commercial`/`Sales rep`, `Conseiller`/`Advisor`, and the fixture's headline values (`Memento IT` as the contact-card headline, not the advisor's name) — while confirming `Location financière IT` (tagline), `IT financial leasing`, `PROJET` and `PROJECT` are absent from every candidate decode. A second render with `advisor: null` and `clientSiret: undefined` stayed at 1 page and produced 5 em-dash glyphs (4 advisor fields + 1 SIRET), proving DOC-11's geometry guarantee holds.

## Task Commits

1. **Task 1: Add the Eyebrow and CardKeyValueRow primitives** - `599a84b` (feat)
2. **Task 2: Rebuild the page frame, header band, 2px rule and title row, and delete the three orphans it retires** - `41e16fe` (feat)
3. **Task 3: Build the SOCIÉTÉ CLIENTE and VOTRE CONTACT cards** - `504508f` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `src/lib/pdf/components/eyebrow.tsx` - `Eyebrow`, the 7.5pt uppercase section label
- `src/lib/pdf/components/card-key-value-row.tsx` - `CardKeyValueRow`, the 8.5pt card key/value row
- `src/lib/pdf/document.tsx` - page frame, header band, rule, title row, card grid rewritten; `ProposalDocumentProps` destructuring grew to include `partner`/`advisor`
- `src/lib/i18n/dictionaries.ts` - four orphaned keys removed from both FR/EN blocks; ledger comments reworded to avoid literal key-string mentions that would trip the plan's own grep gate
- `src/lib/i18n/dictionaries.test.ts` - `phase8Keys` reduced from 13 to 9 entries; the floor-count test's derivation comment reworded the same way

## Decisions Made

See `key-decisions` in the frontmatter. The two substantive ones:

1. `pdf.project.ref.prefix` was deleted in this plan (not deferred to 43-06) — the plan's own instruction was conditional on a repo-wide grep finding no surviving consumer, and the grep confirmed its only consumer was the `partnerRefText` variable this plan's Task 2 removes.
2. The grep acceptance gate (`! grep -rq "pdf\.tagline" src/ app/ tests/ __pdf-fixtures__/`) checks the entire file tree including comments, not just live consumers — the 43-03-authored ledger comments and a pre-existing test derivation comment both named the deleted keys literally and had to be reworded (by role, not by dotted key string) to satisfy the gate honestly rather than by narrowing the grep.

## Deviations from Plan

None beyond the `pdf.project.ref.prefix` deletion and the comment rewording above, both of which the plan's own text anticipated and instructed (verify-then-delete for the orphan; the grep gate itself demanded the comment rewording — no separate judgment call was made).

## Issues Encountered

**Text-reconstruction verification required a font-aware fix.** The `reconstructVisibleText` approach referenced in the plan's acceptance criteria (from `no-commission.test.ts`) merges every registered font's ToUnicode CMap into one glyph-map before decoding the shared content stream. With four Inter weights registered, this silently corrupts any text whose glyph IDs collide across fonts — a first attempt produced fully garbled output for every string. Fixed by decoding the content stream once per font's own CMap and checking all four candidate decodes for a match, which correctly surfaced every expected FR/EN string in at least one candidate. This was ad hoc verification tooling, not committed to the repo (deleted after use) since it wasn't in the plan's `files_modified`.

## User Setup Required

None — no external service configuration required.

## Verification (re-run at closeout)

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint:check` (`--max-warnings=0`) | pass |
| `npm test -- src/lib/pdf/ src/lib/i18n/dictionaries.test.ts tests/admin-09-grep-contracts.test.ts` | 491 passed |
| `npm test -- src/lib/pdf/document.test.tsx src/lib/i18n/dictionaries.test.ts` | 405 passed |
| `npm test -- src/lib/pdf/ tests/admin-09-grep-contracts.test.ts` | 93 passed |
| `__pdf-fixtures__/render-fixtures.test.ts` | red, as D-16 requires — same expected transient state; not fixed here (plan 43-07 owns regeneration) |
| `__pdf-fixtures__/inter-typography.test.ts` | 6 passed |
| `__pdf-fixtures__/commission-free-fixture.test.ts` | 5 passed |
| `git diff --stat package.json package-lock.json` (T-43-SC) | empty |
| `npm run build` | **not run** — the `prebuild` hook's DB-branch guard hard-fails on any `NODE_ENV=production` command in this environment (`.env.production.local` resolves to the prod Neon branch); per CLAUDE.md this command must never be run locally. `typecheck` + `lint:check` + the full relevant test suite are the substitute gates, all green. |

**Acceptance criteria spot-checks (Task 1):**

| Check | Result |
|---|---|
| `grep -q "letterSpacing: 0.45"` in `eyebrow.tsx` | PASS |
| `! grep -q "textTransform"` in `eyebrow.tsx` | PASS |
| `grep -q "width: 54"` in `card-key-value-row.tsx` | PASS |
| `grep -q "pdfColors.labelTeal"` / `pdfColors.bodyBlue` | PASS |

**Acceptance criteria spot-checks (Task 2):**

| Check | Result |
|---|---|
| `<LeaseticLockup` / `height={19.5}` present | PASS |
| `>LEASETIC<` / `pdf.tagline` / `pdf.section.project` / `pdf.ref.label` absent from `document.tsx` | PASS |
| Repo-wide grep for `pdf\.tagline` / `pdf\.section\.project` / `pdf\.ref\.label` across `src/ app/ tests/ __pdf-fixtures__/` | 0 matches (required rewording two comments — see Decisions Made) |
| `pdf.section.interests` count = 2, `pdf.footer.left` count = 2 in `dictionaries.ts` | PASS (untouched, owned by 43-06) |
| `partnerRefText` absent from `document.tsx` | PASS |
| `pdf.header.proposition.eyebrow` / `pdf.pill.partnerRef` / `pdf.pill.term` present | PASS |
| `letterSpacing: -0.525` (h1) / `letterSpacing: -0.13` (reference) present | PASS |
| `pdfPageBase` / `flexDirection: 'column'` present | PASS |
| `npm test -- src/lib/pdf/document.test.tsx src/lib/i18n/dictionaries.test.ts` | 405 passed |

**Acceptance criteria spot-checks (Task 3):**

| Check | Result |
|---|---|
| `grep -c "<CardKeyValueRow"` = 12 | PASS |
| `pdf.card.contact.advisorName` present, `pdf.partnerType` absent | PASS |
| `D-04` comment present | PASS |
| `inputs.partnerCo` count >= 1 | PASS |
| `grep -c "emDash("` = 13 (>= 12) | PASS |
| `! grep -q "\|\| '—'"` (no hand-written absence ternary) | PASS |
| `npm test -- src/lib/pdf/ tests/admin-09-grep-contracts.test.ts` | 93 passed |
| Rendered-text proof, FR: SOCIÉTÉ CLIENTE / VOTRE CONTACT / Destinataire / Commercial / Conseiller / advisor name present | PASS |
| Rendered-text proof, EN: CLIENT COMPANY / YOUR CONTACT / Recipient / Sales rep / Advisor present | PASS |
| Em-dash geometry proof: null-advisor + absent-SIRET render, page count 1, em-dash glyph count >= 5 | PASS (page count 1, 5 em dashes) |

## Next Phase Readiness

- 43-06 can now build directly beneath the card grid — everything from the loyer hero through the legal footer is still today's five-block computation/loyer/interests/validity/footer region, untouched by this plan as required, and `SectionLabel`/`KeyValueRow` remain live (their remaining consumers are all in that untouched region).
- `pdf.section.interests` and `pdf.footer.left` are the two remaining Phase-43 orphans, deliberately left for 43-06 to delete alongside the interests block and the legacy footer line it replaces.
- `Eyebrow` and `CardKeyValueRow` are ready for reuse in 43-06's financial table and acceptance block if their geometry fits; `KeyValueRow`'s 80pt-fixed/flex-1 shape is tuned for the old computation card and may not survive per 43-PATTERNS.md's note.
- The byte-determinism fixture (`__pdf-fixtures__/expected.sha256.txt`) remains in its expected-red state through 43-06, per D-16; plan 43-07 regenerates it once the full layout lands.
- `npm run build` could not be executed in this environment due to the DB-branch guard's `NODE_ENV=production` block — the orchestrator or a CI run should confirm a clean production build once this plan's changes reach a context where that command is safe to run.

## Self-Check: PASSED

All created/modified files confirmed present on disk. All three commits confirmed in `git log`:
`599a84b` (Task 1), `41e16fe` (Task 2), `504508f` (Task 3). Test counts and grep results in the
Verification tables above were re-run at closeout, not assumed from earlier output in this session.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-08*
