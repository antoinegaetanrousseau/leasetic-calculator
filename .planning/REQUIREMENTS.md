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

- [ ] **DOC-01**: A partner generating a proposal gets a single-page A4 PDF matching the design
  spec's header band — `leasetic-lockup-color` logo left, `PROPOSITION N°` eyebrow + reference +
  `Établie le {date}` right, a 2px `#112C3B` rule beneath — followed by the 21pt two-line title,
  the project description, and the `Réf. partenaire` / term pills.
- [ ] **DOC-02**: The PDF shows a `SOCIÉTÉ CLIENTE` card listing the client company name, SIREN,
  SIRET, destinataire, fonction, téléphone and email in the design's two-column key/value grid.
- [ ] **DOC-03**: The PDF shows a `VOTRE CONTACT` card listing the advisor's name, fonction,
  téléphone and email, then the partner company, commercial and téléphone.
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
- [ ] **DOC-09**: The PDF renders in Inter at the design's type scale (6.8 / 7.5 / 8 / 8.5 / 9 /
  9.5 / 10 / 11 / 13 / 21pt), replacing Plus Jakarta Sans, with no missing-glyph or
  font-registration failure in any rendered proposal.
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

- [ ] **FIELD-01**: A partner filling the proposal wizard must supply the client's SIRET, validated
  as 14 digits, before the proposal can be finalized.
- [ ] **FIELD-02**: A partner filling the proposal wizard must supply the partner company's
  telephone number before the proposal can be finalized.
- [ ] **FIELD-03**: A proposal finalized before these fields existed still renders — the PDF reads
  the absent keys without throwing, and DOC-11's em-dash treatment covers them.

### Profile — advisor identity

- [ ] **PROF-01**: A partner can set their fonction and telephone on their own account, and see
  them on the settings page alongside the name and email already held there.
- [ ] **PROF-02**: A partner whose profile is missing fonction or telephone is stopped at proposal
  finalization with a message naming exactly what is missing and linking to where to set it —
  once, not on every proposal.
- [ ] **PROF-03**: The PDF's advisor name and email come from the authenticated creating user's
  account rather than being retyped per proposal.

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

### Rule lifted by this milestone

- **"Mutating already-saved PDFs"** moves from a standing constraint to a deliberate one-time
  migration (MIG-01..05). Accepted 2026-09-08: the redesign applies retroactively so every
  proposal looks current. `params_snapshot` keeps the figures honest (MIG-04) and per-proposal
  language is preserved (MIG-03), so a re-rendered document differs from the delivered one in
  presentation only.

---

## Traceability

*(Filled by the roadmapper.)*
