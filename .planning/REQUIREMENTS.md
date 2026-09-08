# Requirements — v1.9 PDF Proposal Redesign

**Milestone:** v1.9 — PDF Proposal Redesign
**Defined:** 2026-09-08
**Design spec:** `.planning/assets/v1.9-quote-design/Quote-FR-A.dc.html` and `Quote-EN-A.dc.html`
are the authoritative pixel spec. Source project:
https://claude.ai/design/p/004ac2c2-f4ad-4ee7-8f77-49d79542d512

**Goal:** Replace the proposal PDF with the new Claude Design layout and bring every existing
proposal into it.

---

## Requirements

### Document — the redesigned PDF

> **Scope reconciled 2026-09-08 (Phase 41 discussion — `41-CONTEXT.md` D-02 / D-04).** DOC-09 is
> narrowed to a font-family swap: the design's ten-step type scale (6.8 … 21pt) moves to DOC-01 /
> Phase 43, where the card geometry that gives a 6.8pt caption a reason to exist also lands.
> Inter Tight is not committed in Phase 41 (D-04) — neither `Quote-FR-A.dc.html` nor
> `Quote-EN-A.dc.html` references it. Authority: `.planning/phases/41-typography-migration/41-CONTEXT.md`.

- [ ] **DOC-01**: A partner generating a proposal gets a single-page A4 PDF matching the design
  spec's header band — `leasetic-lockup-color` logo left, `PROPOSITION N°` eyebrow + reference +
  `Établie le {date}` right, a 2px `#112C3B` rule beneath — followed by the 21pt two-line title,
  the project description, and the `Réf. partenaire` / term pills. Every text node uses the
  design's ten-step type scale (6.8 / 7.5 / 8 / 8.5 / 9 / 9.5 / 10 / 11 / 13 / 21pt) — relocated
  here from DOC-09 by the Phase 41 D-02 amendment, since the scale only has meaning alongside
  this layout.
- [ ] **DOC-02**: The PDF shows a `SOCIÉTÉ CLIENTE` card listing the client company name, SIREN,
  SIRET, destinataire, fonction, téléphone and email in the design's two-column key/value grid.
- [ ] **DOC-03**: The PDF shows a `VOTRE CONTACT` card whose headline is the partner company,
  commercial and téléphone, with the Leasetic advisor's name, fonction, téléphone and email as the
  supporting contact beneath; the advisor's fonction renders from the FR/EN label pair matching the
  proposal's committed `language`. *(Amended 2026-09-08 by Phase 42 D-10 / D-16 via D-24: this
  deliberately deviates from `Quote-FR-A.dc.html:67-74`, which makes `advisorName` the 11pt/600
  headline. The deviation is intended — Phase 43 must not treat it as a spec violation. The two
  blocks are re-ordered, not relabelled.)*
- [ ] **DOC-04**: The PDF shows the monthly rent in a navy-outlined hero card with its term caption,
  sized and spaced per the design spec.
- [ ] **DOC-05**: The PDF shows a `CONDITIONS FINANCIÈRES` table listing financed amount, lease term,
  applied coefficient, monthly rent, and a bold **Total des loyers HT** derived as
  `monthlyRent × termMonths`.
- [ ] **DOC-06**: The conditions paragraph states the proposal's **actual** validity period, not a
  hardcoded 30 days. *(Both design files hardcode "(30 jours)" / "(30 days)" while `validityDays`
  is operator-selectable at 15 / 30 / 60 — a 15-day proposal would otherwise contradict its own
  `validUntil` date. The design is wrong here and the implementation must not copy it.)*
- [ ] **DOC-07**: The PDF shows a client acceptance block — `Fait à`, `Le`, `Nom et qualité du
  signataire`, `Signature`, and a dashed company-stamp box — pinned to the bottom of the page
  regardless of how much content precedes it.
- [ ] **DOC-08**: The PDF shows a legal footer carrying the Leasetic company registration line
  (SAS, address, SIREN, SIRET, TVA) with the proposal reference, page number and the 14%-opacity
  icon mark on the right.
- [x] **DOC-09**: The PDF renders in Inter, replacing Plus Jakarta Sans, with no missing-glyph or
  font-registration failure in any rendered proposal. *(Narrowed 2026-09-08 by Phase 41 D-02: the
  design's ten-step type scale moved to DOC-01 / Phase 43. Phase 41 keeps today's `pdfFontSizes`
  — 8 / 9 / 10 / 22 / 32pt — untouched per D-01.)*
- [ ] **DOC-10**: A proposal whose committed language is English renders the English variant —
  every label and the full legal conditions paragraph — per `Quote-EN-A.dc.html`.
- [ ] **DOC-11**: A field with no captured value renders its label followed by an em dash, so card
  geometry is identical across proposals regardless of which fields a record carries.
- [ ] **DOC-12**: No commission figure, rate or derived commission value appears anywhere in the
  PDF, in either language, for any partner type. *(ADMIN-09 envelope — the existing 20 grep gates
  and `no-commission.test.ts` stay green.)*
- [ ] **DOC-13**: Re-rendering the same proposal twice produces byte-identical PDFs, and the
  committed fixture hash reflects the new design.

### Fields — newly captured data

- [x] **FIELD-01**: A partner filling the proposal wizard must supply the client's SIRET, validated
  as 14 digits, before the proposal can be finalized.
- [ ] **FIELD-02**: The partner company's telephone is held on the partner account (admin-set) and
  carried onto every proposal's immutable `inputs` at draft creation. *(Restated 2026-09-08 by Phase 42 D-15 / D-11 / D-13:
  it is not a wizard field, and it never blocks finalization — the
  column ships nullable and an absent value renders as an em dash under DOC-11.)*
- [ ] **FIELD-03**: A proposal finalized before these fields existed still renders — the PDF reads
  the absent keys without throwing, and DOC-11's em-dash treatment covers them.

### Profile — advisor identity

- [ ] **PROF-01**: A partner can set their own telephone on their account and sees their fonction,
  name and email on the settings page; fonction is read-only. *(Restated 2026-09-08 by Phase 42 D-20 / D-14:
  "can set their fonction" is dropped — fonction is `users.partnerType`, admin-assigned
  and client-immutable by `input: false`.)*
- [ ] **PROF-02**: A partner whose account is missing a telephone is stopped at proposal
  finalization with a message naming the telephone field and linking to `/parametres`. *(Restated 2026-09-08 by Phase 42 D-21 / D-14:
  narrowed from the prior wording pairing fonction with telephone — `partner_type`
  is NOT NULL so fonction can never be the missing thing. The "fixed once, never re-prompted per
  proposal" clause is dropped as a behaviour to build: it follows automatically from a check that
  reads the account.)*
- [ ] **PROF-03**: A finalized proposal's **partner** block is sourced from the authenticated
  creating user's account rather than retyped per proposal; its **advisor** block is sourced from
  a single admin-editable Leasetic advisor setting (name, fonction, telephone, email) read live at
  render time and never snapshotted into `inputs`. *(Restated 2026-09-08 by Phase 42 D-22 / D-06 /
  D-07 / D-08 / D-09: the advisor is a Leasetic-side person who supports the partner's relationship
  with the end client, not the creating user.)*

### Migration — the backfill

- [ ] **MIG-01**: An operator can dry-run the backfill and see how many stored PDFs would be
  re-rendered and which proposals fail to render, without a single blob being written.
- [ ] **MIG-02**: An operator can execute the backfill behind the local-database guard and an
  explicit confirmation, re-rendering every stored proposal PDF in the new design.
- [ ] **MIG-03**: Each proposal is re-rendered in its own committed `language`, so no delivered
  document changes language at its existing reference.
- [ ] **MIG-04**: Every re-rendered PDF shows the same financial figures as before, read from that
  proposal's `params_snapshot` rather than current coefficients.
- [ ] **MIG-05**: The backfill can be re-run safely after an interruption without duplicating work
  or corrupting proposals already migrated.

---

## Future Requirements (deferred beyond v1.9)

- Multi-page proposal output — the design and footer both assume a single page (`Page 1/1`)
- Brand-aware PDF output for LOOPIX / COLIBRIS / SEENSYS (the four-brand Figma system exists; this
  milestone is Leasetic-only)
- Client-side e-signature — the acceptance block is a print-and-sign affordance, not a workflow
- Re-rendering a single proposal on demand from the admin UI

## Out of Scope

- **Changing the calculation formula, tranche boundaries or coefficients** — frozen by default;
  this milestone changes presentation and captured metadata only.
- **Removing the commission-invisibility rule** — non-negotiable, and DOC-12 pins it.
- **Retiring `proposals.language`** — the PDF stays bilingual, so the column keeps driving rendering.
- **The design's ten-step type scale inside Phase 41** — Phase 41 is a font-family swap only
  (D-01 / D-02). Introducing the scale there would make the byte-determinism delta "font + scale",
  so a regression could not be attributed to either. It ships with DOC-01 in Phase 43.
- **Inter Tight anywhere in v1.9** — Phase 41 commits four static Inter TTFs only (D-04). Inter
  Tight is the design system's display face for the web app, not the document's; if Phase 43's
  header lockup proves it needs a display cut, Phase 43 commits it in the same phase that proves
  it renders.

### Rule lifted by this milestone

- **"Mutating already-saved PDFs"** moves from a standing constraint to a deliberate one-time
  migration (MIG-01..05). Accepted 2026-09-08: the redesign applies retroactively so every
  proposal looks current. `params_snapshot` keeps the figures honest (MIG-04) and per-proposal
  language is preserved (MIG-03), so a re-rendered document differs from the delivered one in
  presentation only.

---

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| DOC-01 | Phase 43 — New PDF Layout | Pending |
| DOC-02 | Phase 43 — New PDF Layout | Pending |
| DOC-03 | Phase 43 — New PDF Layout | Pending |
| DOC-04 | Phase 43 — New PDF Layout | Pending |
| DOC-05 | Phase 43 — New PDF Layout | Pending |
| DOC-06 | Phase 43 — New PDF Layout | Pending |
| DOC-07 | Phase 43 — New PDF Layout | Pending |
| DOC-08 | Phase 43 — New PDF Layout | Pending |
| DOC-09 | Phase 41 — Typography Migration | Complete |
| DOC-10 | Phase 43 — New PDF Layout | Pending |
| DOC-11 | Phase 43 — New PDF Layout | Pending |
| DOC-12 | Phase 43 — New PDF Layout | Pending |
| DOC-13 | Phase 43 — New PDF Layout | Pending |
| FIELD-01 | Phase 42 — Captured Data — Fields & Advisor Profile | Complete |
| FIELD-02 | Phase 42 — Captured Data — Fields & Advisor Profile | Pending |
| FIELD-03 | Phase 43 — New PDF Layout | Pending |
| PROF-01 | Phase 42 — Captured Data — Fields & Advisor Profile | Pending |
| PROF-02 | Phase 42 — Captured Data — Fields & Advisor Profile | Pending |
| PROF-03 | Phase 42 — Captured Data — Fields & Advisor Profile | Pending |
| MIG-01 | Phase 44 — Backfill Migration | Pending |
| MIG-02 | Phase 44 — Backfill Migration | Pending |
| MIG-03 | Phase 44 — Backfill Migration | Pending |
| MIG-04 | Phase 44 — Backfill Migration | Pending |
| MIG-05 | Phase 44 — Backfill Migration | Pending |

**Coverage:** 24/24 requirements mapped (100%). No orphans, no double-mapping.
