# Phase 22: Partner Types & Commission-Free Proposals - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Introduce a `partner_type` dimension (**Agent** / **Commercial** / **Partenaire**)
that conditions proposal economics end-to-end — from the create/edit form
through the calc engine, UI surfaces, PDF output, and audit trail.

Requirements PTYPE-01→07 are locked in `.planning/REQUIREMENTS.md` with detailed
success criteria in `.planning/ROADMAP.md` (Phase 22). This discussion captures
**HOW** to implement them, not what to build.

**In scope (from REQUIREMENTS/ROADMAP):**
- `partner_type` enum on partner accounts + Drizzle migration + backfill of all
  existing accounts → `Partenaire` (PTYPE-01, PTYPE-02).
- Admin can change an existing partner's type later, audited (PTYPE-03).
- Commission-free calc variant for Agent/Commercial:
  `loyer = montant HT × coefficient / 100`; Partenaire formula unchanged
  (PTYPE-04). Golden corpus covers all three types.
- Commission structurally absent (not CSS-hidden) from all UI surfaces for
  Agent/Commercial (PTYPE-05).
- Commission-free PDF render variant + `params_snapshot` records `partner_type`
  + `commission_applied` so PDFs stay reproducible after a type change (PTYPE-06).
- ADMIN-09 grep-contract suite extended; existing 12 gates stay green (PTYPE-07).

**Out of scope:**
- Any change to the `Partenaire` formula or tranche boundaries — frozen. Only the
  Agent/Commercial commission-free variant is the business-approved exception.
- Agent vs Commercial **own-remuneration** calculation rules — not yet defined,
  deferred to ~V2 (see Deferred Ideas).
- PDF layout/typography fixes (Destinataire removal, glyph overlap) — Phase 23.
- Admin/Agent dual-view toggle — Phase 24.

</domain>

<decisions>
## Implementation Decisions

### Agent vs Commercial semantics
- **D-01 (Identical behavior in v1.4):** In this milestone, **Agent and Commercial
  behave identically** — both use the commission-free formula and render the same
  way across calc, wizard/preview, PDF, and dashboards. Downstream may treat them
  as a single "commission-free" branch for behavior, but **must persist the
  specific type** (Agent vs Commercial), not collapse it to a boolean.
- **D-02 (Persist specific type in snapshot + audit):** `params_snapshot` records
  the exact `partner_type` (Agent / Commercial / Partenaire) **and** a
  `commission_applied` boolean (PTYPE-06). Audit entries on type change record
  before/after as the specific type (PTYPE-03). Rationale: the only real
  Agent↔Commercial difference (their own remuneration) lands in ~V2 and needs this
  data already captured faithfully.

### Create / invite form
- **D-03 (Force explicit choice):** The "Type de partenaire" selector has **no
  default** — the admin must actively pick one of the three before the create/invite
  form submits (required field, validation error if unset). Prevents an account from
  being silently created commission-free or commission-bearing by an unfilled field.
- **D-04 (Labels only):** Selector shows the three plain labels —
  **Agent / Commercial / Partenaire** — under the field label "Type de partenaire".
  No per-option descriptor/helper text.

### Commission-free presentation (Agent/Commercial)
- **D-05 (Clean reflow on screen, no trace):** The commission row/annotation that
  `Partenaire` deal-owners see on wizard step 2 (Détail du calcul) + step 3 (recap)
  and in the live preview is **not rendered at all** for Agent/Commercial.
  Surrounding rows close up — no gap, no placeholder, no "sans commission" note.
  The surface looks as though commission never existed for that partner. This is the
  literal expression of PTYPE-05 "structurally absent."
- **D-06 (Clean reflow in PDF, no trace):** The PDF financial-offer page omits the
  commission line and any commission-derived wording for Agent/Commercial; the loyer
  block reflows naturally with no gap or replacement copy. Keeps the byte-determinism
  gate and the existing `no-commission.test.ts` strategy straightforward, and avoids
  adding commission-adjacent strings that PTYPE-07 grep gates would have to special-case.

### Admin type management
- **D-07 (Show type in accounts list):** The admin accounts/partners list surfaces
  each partner's type at a glance (badge or column), so an admin can manage types
  without opening each record. This is an addition beyond the PTYPE-03 minimum
  (detail/edit surface) and is intentional.
- **D-08 (Confirm on type change):** Changing an existing partner's type shows a
  confirmation dialog explaining the consequence — **future proposals change
  economics; existing saved proposals and their PDFs stay frozen** (`params_snapshot`
  immutability). The change is audited (PTYPE-03) regardless of the dialog.

### Claude's Discretion
- Exact French copy for the confirmation dialog (D-08) and the accounts-list
  badge/column styling (D-07) — match existing admin surfaces; UI phase / planner
  may refine.
- Column vs badge presentation for D-07 — pick what fits the current accounts-list
  layout.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §"Partner Types & Commission-Free Proposals (PTYPE)" — PTYPE-01→07, locked.
- `.planning/ROADMAP.md` §"Phase 22: Partner Types & Commission-Free Proposals" — goal + 6 success criteria.
- `.planning/ROADMAP.md` §"v1.4 Cross-Cutting Invariants" (§1 ADMIN-09 extension, §2 params_snapshot, §4 PDF byte-determinism, §5 frozen formula) — constraints every Phase 22 change must satisfy.

### Commission invisibility (ADMIN-09)
- `tests/admin-09-grep-contracts.test.ts` — the 12-gate grep-contract suite that must stay green and gets extended for Agent/Commercial (PTYPE-07).
- `src/lib/pdf/no-commission.test.ts` — existing 4-layer structural gate proving no commission leaks into the rendered PDF / `computed` jsonb / audit / logs (Plan 13-06, D-12 + D-28). Extend, don't break.
- `.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md` (D-12) — the bounded partner-facing relaxation: `Partenaire` deal-owner sees own commission on wizard steps 2+3. This relaxation continues for `Partenaire` only; Agent/Commercial get the clean-reflow treatment (D-05).

### Calc engine
- `src/lib/calc/formula.ts` — calc kernel; the FROZEN-formula invariant lives here. It already exposes a `commissionPct` override seam; the Agent/Commercial variant drops the commission factor (`montant HT × coefficient / 100`).
- `src/lib/calc/calc.golden.test.ts` — golden corpus to extend so all three partner types are covered with ±0.01 € parity (PTYPE-04, PDF-03 ties in at Phase 23).

### Business approval
- `.planning/PROJECT.md` §"Key Decisions" (2026-05-29) — business-approved exception to the frozen-formula constraint allowing the Agent/Commercial commission-free variant.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Better Auth `additionalFields` on `users`** (`src/db/schema.ts`): `role`,
  `displayName`, `language`, `theme`, `sessionVersion` are all custom columns added
  via Better Auth's `user.additionalFields`. `partner_type` follows the same
  pattern — a `text` column with a default, registered in the Better Auth config.
- **`commissionPct` override in `formula.ts`**: the calc kernel already accepts an
  optional commission override, so a commission-free branch is a seam that exists,
  not a rewrite of the frozen formula.
- **`no-commission.test.ts` 4-layer strategy**: structural assertions across all 30
  golden fixtures (data prop to renderProposalPdf, `computed` jsonb, audit payload,
  server-log grep). The PTYPE-07 extension should follow this defense-in-depth shape.

### Established Patterns
- **ADMIN-09 = structural absence, not hiding**: commission is kept out of payloads,
  jsonb, logs, audit, and render data — enforced by grep contracts, not CSS. D-05/D-06
  must satisfy this by not emitting the data at all for Agent/Commercial.
- **`params_snapshot` immutability**: once a proposal is saved its inputs + rendered
  PDF are frozen. Type changes (D-08) never mutate existing proposals.
- **Append-only audit_log on every mutation**: PTYPE-03 type changes record before/after.

### Integration Points
- Create/invite form: `/[adminSegment]/partners/new` (PTYPE-01 selector — D-03/D-04).
- Partner detail/edit surface (PTYPE-03 type change — D-08 confirmation).
- Admin accounts/partners list (D-07 type badge/column).
- Wizard steps 2+3 + `src/components/proposal/LiveLoyerPreview.tsx` (D-05 clean reflow).
- PDF render path under `src/lib/pdf/` (D-06 clean reflow).
- `proposals.params_snapshot` schema extension (`partner_type` + `commission_applied`).

</code_context>

<specifics>
## Specific Ideas

- Agent/Commercial commission-free treatment should be visually indistinguishable
  from "a proposal that never had commission" — the user explicitly wants no residual
  trace (no gap, no note) on either screen or PDF (D-05/D-06).
- The specific partner type must be stored faithfully now (not flattened to a
  commission boolean) precisely so the future V2 remuneration rules have the data
  (D-02).

</specifics>

<deferred>
## Deferred Ideas

- **Agent vs Commercial own-remuneration calculation rules (~V2):** Agent and
  Commercial differ in how *their own* remuneration on a project is calculated. Those
  rules are not yet defined and are out of scope for v1.4. Phase 22 only needs to
  persist the distinct type so V2 can build on it. Captured here so it isn't lost.

</deferred>

---

*Phase: 22-partner-types-commission-free-proposals*
*Context gathered: 2026-05-29*
