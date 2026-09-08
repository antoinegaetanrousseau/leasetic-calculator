# Phase 43: New PDF Layout - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase rebuilds the proposal PDF's render tree — `src/lib/pdf/document.tsx` and
`src/lib/pdf/styles.ts` — from today's five-block text document into the Claude Design
layout: lockup header + proposition block over a 2px navy rule, 21pt two-line title with
`Réf. partenaire` / term pills, a `SOCIÉTÉ CLIENTE` card beside a `VOTRE CONTACT` card,
a navy-outlined loyer hero beside the `CONDITIONS FINANCIÈRES` table, the conditions
paragraph, a bottom-pinned acceptance block, and the legal footer. Both languages, from
one component. The design's ten-step type scale lands here, relocated from Phase 41 by
its D-02 amendment.

It also threads the data the new layout needs into the render path: the client SIRET and
partner telephone Phase 42 added to `inputs`, and the `leasetic_advisor` row read live at
render time. Neither is wired to the PDF today.

**Not this phase:** the font family (Phase 41, done). The capture of the new fields and
the advisor admin screen (Phase 42, done). Re-rendering the stored PDFs of proposals that
already exist (Phase 44, MIG-01..05) — this phase changes what a *new* render produces.

Two things are non-negotiable gates on the finished output rather than features to build:
no commission value visible anywhere (DOC-12 / ADMIN-09), and a deterministic re-render
(DOC-13).

</domain>

<decisions>
## Implementation Decisions

### The governing rule

- **D-01:** **The design files are authoritative. Where they are silent, mirror their
  intent rather than invent a new device.** Operator, verbatim: *"Just take the design from
  the layout."* This is the tiebreaker for every question below and for anything the
  planner meets that this document does not cover. It has one standing exception — D-04 —
  which was locked by Phase 42 before this discussion and is not reopened.

  Concretely, "mirror their intent" means: the design's own device for an absent value is
  the em dash (DOC-11), so absence is expressed that way rather than by hiding an element,
  collapsing a row, or inventing a placeholder string.

### The contact card and "Fonction"

- **D-02:** **Follow the design exactly on Fonction.** The advisor block keeps its single
  `Fonction` row, rendering `leasetic_advisor.fonction` — admin-typed free text — as typed.
  The partner block gains **no** Fonction row, because the design has none
  (`Quote-FR-A.dc.html:72-74` is `Partenaire` / `Commercial` / `Téléphone` only).

  **Consequence the planner must not treat as a bug:** the `pdf.partnerType.*` FR/EN label
  pairs that Phase 42 D-16 shipped (`src/lib/i18n/dictionaries.ts:489-491` and the EN block
  at :1804) have **no consumer in the PDF**. D-16 scoped them "PDF only", so under D-02 they
  are dead keys with a passing test (`src/lib/i18n/dictionaries.test.ts:620-625`) still
  pinning them.

- **D-03:** **Upstream amendment forced.** `DOC-03`'s final clause — *"the advisor's fonction
  renders from the FR/EN label pair matching the proposal's committed `language`"* — is
  **retracted**, along with the matching clause in ROADMAP Phase 43's planning note (the
  D-24 amendment). It rests on a category error: it applies D-16's `users.partnerType`
  translation to `leasetic_advisor.fonction`, which is a different column on a different
  table, free-text and required (`src/lib/admin/advisor-schemas.ts:18-20`). Honouring it
  literally would mean converting the advisor's fonction to an enum and contradicting the
  admin form Phase 42 just built.

  The executing plan reconciles `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md`
  in place and records a scope note, following the Phase 41 D-02 and Phase 42 D-15..D-24
  precedent. It must also decide the fate of the orphaned `pdf.partnerType.*` keys and
  their test — delete both, or keep them with a comment naming D-02 as the reason they are
  unused. Do not leave the contradiction unrecorded.

- **D-04:** **D-10's restructure stands — it is the one deliberate deviation from the
  design in this card, and it is intended.** The `VOTRE CONTACT` card headlines the partner
  company, with `Commercial` and `Téléphone` beneath it, then the Leasetic advisor's name,
  fonction, téléphone and email as the supporting contact. The design
  (`Quote-FR-A.dc.html:67-74`) makes `advisorName` the 11pt/600 headline and demotes the
  partner rows; Phase 42 D-10 inverted that deliberately, because the client meets the
  partner first and the advisor second. **Phase 43 must not "fix" this back.**

  The blocks are **re-ordered, not relabelled** — the card title stays `VOTRE CONTACT` /
  `YOUR CONTACT`, and the row labels keep the design's wording. Geometry is unaffected: the
  card still resolves to one 11pt headline over six key/value rows.

### Content the design has no slot for

- **D-05:** **The interests block is dropped from the PDF.** Today's document prints
  `✓ Sale & leaseback` / `✓ Évaluation de parc` when the partner ticks them
  (`src/lib/pdf/document.tsx:255-277`). The design has no slot for it anywhere and
  DOC-01..08 never mention it. `inputs.slb` and `inputs.evalParc` stay in the wizard, stay
  in the immutable `inputs`, and simply stop printing. Rejected: folding them into the
  `{{ project.description }}` line (reads as generated rather than written), and adding a
  row to `CONDITIONS FINANCIÈRES` (that table is financial; interests are not).

  Recorded plainly because this is the only place the redesign removes something a partner
  deliberately chose. The operator accepted it under D-01.

- **D-06:** The **tagline** (`pdf.tagline`, `document.tsx:138`) and the **`PROJET`
  section label** (`pdf.section.project`) are also gone — the design replaced that whole
  region with the lockup, the 21pt title and the description line. Their i18n keys follow
  the same disposition rule as D-03's orphans.

### The header lockup and the footer icon mark

- **D-07:** **Port both SVGs to `@react-pdf/renderer`'s `<Svg>` primitives** rather than
  rasterizing by default. They are unusually simple: `leasetic-icon-color.svg` is four
  `<ellipse>` elements and nothing else; `leasetic-lockup-color.svg` is those same four
  ellipses plus a single `<path>` carrying the outlined "Leasetic" wordmark. Both are
  flat-filled `#01CC72` with no gradients, masks, clip paths or embedded text.

  **The risk is narrow and specific:** two of the four ellipses carry
  `transform="rotate(-90 cx cy)"` — rotation about an explicit origin. That three-argument
  form is exactly where react-pdf's partial SVG support tends to fail, and it fails
  *silently* (element drawn unrotated, or not at all) rather than throwing.

  **Decide by evidence, not by assumption.** The first task that touches the header renders
  the lockup and inspects the output before any other layout work depends on it. If the
  transforms do not survive, fall back in this order: (1) pre-apply the rotation by hand —
  a 90° rotation of an axis-aligned ellipse is just swapping `rx`/`ry`, so the transform can
  be eliminated at authoring time rather than at render time; (2) a committed PNG at 3×
  with `<Image>`. Option (1) is preferred and is very likely sufficient — record which was
  used and why.

  The real lockup replaces the `LEASETIC` text node at `document.tsx:132`. The footer
  mark is the icon at 14% opacity.

- **D-08:** **Brand green `#01CC72` enters the document through the logo only.** Today's
  `pdfColors.green` (`#129657`) and `greenTint` (`#f0f9f4`) exist solely for the loyer
  card's border and fill; the design's hero is navy-outlined on white, so both tokens lose
  their only consumer. The design uses no green anywhere except the mark itself.

### The on-demand proposal

- **D-09:** **The design has no "sur demande" state, so D-01's em-dash rule resolves it.**
  When `computed.state === 'on-demand'`: the navy hero keeps today's `pdf.loyer.on.demand`
  string (it is a real, translated, operator-facing value, not an absence), while
  `Coefficient appliqué` and `Total des loyers HT` render em dashes — those two genuinely
  have no value, and `monthlyRent × termMonths` is undefined without a rent. No new state,
  no hidden rows, geometry unchanged. `Montant financé HT` and `Durée de location` are
  always present and always render.

### Type scale, palette and geometry

- **D-10:** **The ten-step scale lands here**, per Phase 41 D-01/D-02 which withheld it
  precisely so it would arrive with the card geometry that justifies a 6.8pt caption. Read
  off the design: **6.8** legal footer · **7.5** uppercase eyebrows · **8** pills,
  `Établie le`, conditions paragraph, acceptance labels · **8.5** card key/value rows ·
  **9** hero caption + financial table · **9.5** page base · **10** project description ·
  **11** card headline · **13** proposition number · **21** h1 and hero value.

  Today's five roles (`pdfFontSizes` at 8/9/10/22/32) are replaced wholesale. Note 32pt
  disappears entirely — the hero drops from 32 to 21, the same size as the title.

- **D-11:** The design's palette is larger than today's six tokens. Recorded here so it is
  transcribed rather than eyeballed: `#112C3B` navy (body text, the 2px rule, the 1.5px
  hero border, signature rules) · `#3a6a75` label teal (eyebrows, key labels, footer) ·
  `#2A4F6E` body blue (values, description, table labels) · `#F8FAFF` card fill ·
  `#D6DCE5` hairline (pills, table rows, acceptance card, top rules) · `#BAC4D0` dashed
  stamp border · `#94A7B6` stamp placeholder text · `#01CC72` brand green (mark only).

  Also from the design: page padding `14mm 15mm 10mm`, base `line-height:1.45`, radii
  999px (pills) / 14px (cards) / 10px (stamp box), and negative tracking at `-.01em`
  (11pt, 13pt), `-.025em` (h1), `-.03em` (hero value).

### Data threading

- **D-12:** **`ProposalDocumentProps` must grow, and there are two render call sites, not
  one.** `finalize-wizard.ts:220` and `submit.ts:146` both construct the PDF data. The new
  layout needs: `clientSiret` and `partnerTel` (already in `inputs` since Phase 42 — they
  arrive free via `inputs: parsed`), the partner's `companyTelephone`, and the advisor
  block. Nothing advisor-shaped reaches the document today.

- **D-13:** **The advisor is read live at render time and a missing advisor must never
  throw.** Phase 42 D-09 fixed the live read; `getAdvisor()` already returns `null` rather
  than throwing when the seed row is absent, and all four of its columns are nullable by
  design. A null advisor, or any null column, renders em dashes under DOC-11 — the card
  keeps its geometry and the proposal still finalizes. A partner must never be blocked from
  finalizing by an admin-side setting they cannot fill in.

  D-09's accepted consequence stands and Phase 44 already knows it: re-rendering an old
  proposal after the advisor changes will not reproduce the originally delivered bytes.

### Verification

- **D-14:** **The rendered reference PNGs are the visual acceptance target.**
  `.planning/assets/v1.9-quote-design/reference/Quote-FR-A.reference.png` and
  `Quote-EN-A.reference.png` are the design files as they actually render, at 2×. The
  `.dc.html` source alone does not show what the layout resolves to — the `_ds` runtime
  supplies the fonts, the A4 frame and the token values. Compare generated output against
  the PNGs, not against the HTML.

- **D-15:** **Human visual pass before the phase closes**, per Phase 41 D-11. Antoine opens
  one generated FR proposal and one generated EN proposal beside the reference PNGs. No
  automated check sees "technically correct, looks wrong", and this phase changes far more
  than Phase 41 did.

- **D-16:** **Fixture regeneration is blocking**, per Phase 41 D-12 — regenerated via
  `scripts/update-pdf-fixture.ts` in the same change that lands the layout, or CI goes red.
  Both `__pdf-fixtures__/render-fixtures.test.ts` and
  `__pdf-fixtures__/commission-free-fixture.test.ts` are in scope.

  **Precision the planner needs:** ROADMAP criterion 5 and `DOC-13` both say "byte-identical",
  but `src/lib/pdf/render.ts:16-34` documents that the raw `sha256` is *not* stable across
  renders — @react-pdf/renderer's Fiber scheduler orders PDF objects differently each call.
  The deterministic contract is `contentHash` (sorted, inflated stream hashes), and that is
  what the fixture files store. Do not write a test asserting raw `sha256` equality between
  two renders; it will fail for reasons unrelated to this phase.

### Claude's Discretion

- **The shape of the type-scale tokens.** Whether `pdfFontSizes` keeps role names, moves to
  numeric keys, or splits into scale + role maps. Recommendation: role names that survive
  a designer's re-reading (`eyebrow`, `kvRow`, `cardHeadline`, `hero`…), since a numeric
  key named `s68` tells a future reader nothing about where 6.8pt belongs.
- **How the acceptance block is pinned.** The design uses `margin-top:auto` inside a flex
  column, which Yoga supports; today's footer uses `position:absolute`. Either is fine —
  the constraint is DOC-07's "regardless of how much content precedes it".
- **How the financial table is built** — the design uses `<table>` with `table-layout:fixed`
  and a 42/58 colgroup; react-pdf has no table primitive, so flex rows with fixed
  `flexBasis` are the obvious port. `KeyValueRow` (`src/lib/pdf/components/key-value-row.tsx`)
  may or may not survive; the card grid and the financial table have different geometry.
- **The em-dash helper's shape** — a single formatter every optional field passes through,
  versus per-call-site handling. A single helper is strongly preferred: DOC-11 is a
  geometry guarantee, and geometry guarantees decay when they are re-implemented per field.
- **Whether Inter Tight is needed after all.** Phase 41 D-04 deferred this to exactly this
  phase, on the condition that the phase which proves it renders is the phase that commits
  it. Neither design file references it, so the expected answer is no — but the 21pt title
  is the one place a display cut could plausibly be wanted. If it is, commit it here with
  the same static-TTF discipline as D-03/D-05 of Phase 41.
- **Whether the phase ships as one plan or several.** The natural seams: data threading
  (D-12/D-13) → header and logo (D-07) → cards and hero and table → acceptance and footer
  → fixtures and proofs.
- Disposition of the orphaned i18n keys from D-03 and D-06 (delete versus annotate).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The design spec (authoritative — D-01)
- `.planning/assets/v1.9-quote-design/Quote-FR-A.dc.html` — the pixel spec, FR. Header
  §30-37, the 2px rule §39, title + pills §41-50, the two cards §52-78, hero + financial
  table §80-99, conditions §101-104, acceptance block §106-119, legal footer §121-130.
- `.planning/assets/v1.9-quote-design/Quote-EN-A.dc.html` — the pixel spec, EN. Same
  structure; every label and the full conditions paragraph differ.
- `.planning/assets/v1.9-quote-design/reference/Quote-FR-A.reference.png` and
  `Quote-EN-A.reference.png` — **the visual acceptance target (D-14)**. What the two files
  above actually render to, at 2×.
- `.planning/assets/v1.9-quote-design/reference/README.md` — provenance of those PNGs and
  the command to regenerate them.
- `.planning/assets/v1.9-quote-design/svg/leasetic-lockup-color.svg` and
  `leasetic-icon-color.svg` — the two marks D-07 ports.
- `.planning/assets/v1.9-quote-design/tokens/typography.css` and `colors.css` — token
  provenance. Note `colors.css` here is the corrected `Leasetic` spelling; the handoff
  bundle's copy carries the stale accented form.
- `.planning/assets/v1.9-quote-design/README.md` — handoff bundle notes.

Verified 2026-09-08: the operator's re-supplied handoff bundle
(`Quote design system-handoff.zip`, and his extraction at
`~/Downloads/quote-design-system/project/`) is **byte-identical** to the vendored
`.dc.html` files, all three SVGs, and 7 of 8 token files. The spec has not drifted since
Phases 41 and 42 decided against it. The bundle's `_ds/` runtime and fonts are
deliberately not vendored (see the reference README).

### Prior-phase decisions this phase inherits
- `.planning/phases/41-typography-migration/41-CONTEXT.md` — D-01/D-02 (the type scale was
  withheld for this phase), D-03 (four static Inter TTFs, never the variable font),
  D-04 (Inter Tight deferred to here), D-11 (human visual pass), D-12 (blocking fixture
  regeneration).
- `.planning/phases/42-captured-data-fields-advisor-profile/42-CONTEXT.md` — D-06..D-10
  (the advisor reframe and the card restructure this phase must honour), D-12 (two phones,
  two fields), D-13 (nullable company telephone → em dash), D-16 and D-24 (the fonction
  translation D-03 above now retracts).

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — DOC-01..DOC-08, DOC-10..DOC-13, FIELD-03. `DOC-03` is
  amended by D-03. The Out of Scope section and the "Rule lifted by this milestone" note
  both matter.
- `.planning/ROADMAP.md` § "Phase 43: New PDF Layout" — goal, six success criteria, the
  two planning notes (partial SVG support; the D-24 amendment). Criterion 5's
  "byte-identical" wording is qualified by D-16 above.

### The code this phase rewrites
- `src/lib/pdf/document.tsx` — the whole render tree. §10-49 font registration (untouched),
  §57-90 the props interface D-12 grows, §112 the single `fontFamily`, §132 the `LEASETIC`
  text node D-07 replaces and §138 the tagline D-06 deletes, §255-277 the interests block
  D-05 deletes.
- `src/lib/pdf/styles.ts` — `pdfColors` (D-11 extends), `pdfFontSizes` (D-10 replaces),
  `pdfPageMargins` (the design's 14/15/10mm).
- `src/lib/pdf/components/section-label.tsx`, `components/key-value-row.tsx` — today's two
  primitives; may not survive the new geometry.
- `src/lib/pdf/render.ts` §16-34, §50-104 — the determinism contract and `computeContentHash`.
  Read before writing any determinism assertion (D-16).
- `src/lib/api/proposals/finalize-wizard.ts` §220-227 — the first `pdfData` construction.
- `src/lib/api/proposals/submit.ts` §146 — the second. Both need D-12's new fields.
- `src/lib/db/queries/advisor.ts` — `getAdvisor()`, `ADVISOR_ROW_ID`, and the header
  comment explaining why the row is read live and never snapshotted (D-13).
- `src/db/schema.ts` §189-228 — `leaseticAdvisor` and its four nullable columns;
  §71-81 — `companyTelephone` and `telephone`.
- `src/lib/calc/schema.ts` §184, §195, §224-227 — `partnerTel`, `clientSiret`, and the
  SIRET/SIREN prefix refine.
- `src/lib/i18n/dictionaries.ts` §489-491 and §1804 — the `pdf.partnerType.*` pairs D-02
  orphans; the `pdf.*` namespace this phase extends heavily.

### The gates that must stay green
- `tests/admin-09-grep-contracts.test.ts` — the 20 commission-invisibility gates.
- `src/lib/pdf/no-commission.test.ts` — the rendered-output commission check.
- `__pdf-fixtures__/expected.sha256.txt`, `render-fixtures.test.ts`,
  `commission-free-fixture.test.ts` — regenerated by D-16.
- `tests/vendored-ui-integrity.test.ts` §126-158 — the font-registration guard Phase 41
  inverted to pin Inter. This phase must not disturb it.
- `__pdf-fixtures__/inter-typography.test.ts` — Phase 41's glyph-coverage and
  distinct-faces proofs.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`getAdvisor()` (`src/lib/db/queries/advisor.ts`)** already returns `null` instead of
  throwing when the seed row is missing — exactly the shape D-13 needs, no wrapper required.
- **`sanitizePdfNumber` (`src/lib/pdf/sanitize-number.ts`)** and the `formatCurrency` /
  `formatNumber` / `formatDate` helpers in `src/lib/i18n/format.ts` carry the FR/EN number
  and date rules already. The new layout has more numeric slots, not different ones.
- **`computeContentHash` (`src/lib/pdf/render.ts`)** already inflates every PDF stream —
  the machinery for any output-inspection proof this phase wants.
- **The single `fontFamily` declaration** at `document.tsx:112` means the whole rewritten
  tree inherits Inter with no per-node font wiring.

### Established Patterns
- **The document declares its own props interface and both API call sites construct it.**
  Growing `ProposalDocumentProps` is a typed change that will surface every call site at
  compile time — D-12's two sites cannot be silently missed.
- **Determinism discipline:** no `Date.now()`, no `Math.random()`, hex literals only,
  constant PDF metadata (`document.tsx:50-56`). Every new element inherits these rules.
- **ADMIN-09 grep isolation:** `finalize-wizard.ts` threads `partnerType` opaquely and
  never names the commission parameter in its own source. Nothing in the new layout may
  introduce a commission-adjacent identifier into the PDF path.
- **Amendment-in-plan precedent** (Phase 41 D-02, Phase 42 D-15..D-24): when a phase's own
  upstream criteria are wrong, the executing plan reconciles ROADMAP + REQUIREMENTS in
  place and records a scope note. D-03 follows it.

### Integration Points
- `src/lib/pdf/document.tsx` and `styles.ts` — the rewrite itself.
- `src/lib/api/proposals/finalize-wizard.ts` and `submit.ts` — D-12's two call sites.
- `src/lib/db/queries/advisor.ts` — the live read, called from those two sites.
- `src/lib/i18n/dictionaries.ts` — a large batch of new `pdf.*` FR/EN pairs (every card
  label, table row, acceptance-block label, and the full legal conditions paragraph in
  both languages, sourced verbatim from the two design files).
- `__pdf-fixtures__/` — regenerated, blocking.

</code_context>

<specifics>
## Specific Ideas

- **"Just take the design from the layout."** The operator's governing instruction, and the
  reason three of the four gray areas surfaced in this discussion resolved without further
  questions. When the planner meets an unanswered question, this is the tiebreaker.
- **The reference PNGs exist because the HTML alone was not enough.** The `.dc.html` files
  do not show their own output — fonts, the A4 frame and token values all come from a
  runtime that is not vendored. Rendering them once and committing the result converts
  "pixel-for-pixel" from a claim into a check.
- **The handoff bundle's fonts confirm Phase 41 rather than challenging it.** It ships Inter
  as `Inter-VariableFont_opsz_wght.ttf` — the single variable font D-03 rejected because
  fontkit would silently render all four weights at the default instance — and Inter Tight
  as nine statics, which D-04 omitted. Nothing there changes those calls.
- **The failure mode with no natural alarm is the rotated ellipse.** Like Phase 41's
  weight-collapse risk: a `rotate(-90 cx cy)` react-pdf does not understand draws something
  plausible rather than throwing. D-07 exists to catch it early and cheaply, before other
  layout depends on the header's height.

</specifics>

<deferred>
## Deferred Ideas

- **Re-rendering the stored PDFs of existing proposals** — Phase 44, MIG-01..05. This phase
  changes what a new render produces; nothing already in blob storage moves.
- **Multi-page proposals** — the design and its footer both assume `Page 1/1`. Listed under
  Future Requirements in `.planning/REQUIREMENTS.md`. If real content ever overflows the
  single page, that is a new phase, not a fix here.
- **Brand-aware PDF output** for LOOPIX / COLIBRIS / SEENSYS — the four-brand system exists
  in Figma; v1.9 is Leasetic-only.
- **Retiring `sanitize-number.ts`** — carried over from Phase 41's deferred list. It exists
  because Plus Jakarta Sans mis-rendered U+202F; Inter handles it. The fixture is being
  re-baselined here anyway, which is the cheap moment to check — but removing it is a
  behaviour change beyond this phase's scope, and the Phase 23 `PDF-01` reproduction test is
  the gate. Note it, do not act on it.
- **Translating `partnerType` on the admin and partner web surfaces** — Phase 42 D-16
  scoped the FR/EN pairs to the PDF only and the operator declined extending them. Under
  D-02 the PDF no longer consumes them either, so the inconsistency is now total: the raw
  value shows everywhere. Worth a decision in a later phase.
- **Client-side e-signature** — the acceptance block is a print-and-sign affordance, not a
  workflow. Future Requirements.

### Reviewed Todos (not folded)
- `ops-03-ovh-cutover-december-2026.md` — "Provision an OVH-compatible target and run
  scripts/smoke-ovh.ts". Matched at 0.6 on generic keywords (`scripts`, `source`,
  `context`); unrelated infrastructure milestone. Phase 41 reviewed and declined the same
  match.
- `wr-07-db-guard-skip-rule.md` — "Harden the DB guard's NODE_ENV=test SKIP rule". Matched
  at 0.6 on generic keywords (`node`, `rule`, `source`, `phase`); a database-guard concern
  with no relationship to PDF rendering. Belongs with the Phase 39 guard work. Also
  declined by Phase 41.

</deferred>

---

*Phase: 43-New PDF Layout*
*Context gathered: 2026-09-08*
