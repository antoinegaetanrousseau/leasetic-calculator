# Requirements: Matrice Commerciale v1.5 — Proposal List Actions & Pill Fix

**Defined:** 2026-05-30
**Milestone:** v1.5
**Core value (unchanged since v1.0):** A partner fills client info + amount + duration and gets a pixel-correct PDF proposal with the correct lease calculation. v1.5 is a focused UI-regression milestone — no change to the core flow.

**Source of truth:** This milestone's scope conversation with Antoine (2026-05-30) + two attached screenshots (home "Propositions récentes" pill; `/proposals` list missing row actions). No domain research (internal UI work on the known stack; `workflow.research: false`).

**Phase numbering:** continues from v1.4 (ended at Phase 25) — v1.5's first phase is **Phase 26**.

---

## v1.5 Requirements

### Proposal Row Actions (ROWACT)

Restore per-row management actions on the partner `/proposals` list. The `DraftActionsClient` component (edit/archive/delete icon buttons) already exists but is wired only to **draft** rows; active/expired rows currently render as a bare `<Link>` with no actions. This milestone extends the same pattern — **minus Edit** — to non-draft rows.

> **Scope reduced 2026-05-30 (D-01).** During the 2026-05-30 discussion the phase was
> descoped from Archive + Delete to **Archive-only** on finalized rows. Per-row Delete
> (ROWACT-02) is dropped — Archive and Delete collapse to the same soft-delete operation
> and a single Archive button ships instead. A per-row Restore in the Archivées view is
> added as a new requirement (D-02 → ROWACT-05). Authority: `26-CONTEXT.md`.

- [x] **ROWACT-01**: From the `/proposals` list, a partner can **archive** an active or expired proposal via a per-row Archive icon button, moving it to the **Archivées** filter view without a full-page navigation (the list refreshes in place).
- [~] **ROWACT-02** *(descoped 2026-05-30, D-01)*: ~~per-row Delete on finalized rows~~ — superseded by ROWACT-01 Archive. For a finalized proposal the only reversible backend op is soft-delete; Archive and Delete collapse to the same operation, so a single Archive button ships instead. Hard-delete remains forbidden by 10-year PDF retention.
- [x] **ROWACT-03**: Active and expired rows expose **ONLY Archive** (no Edit, no Delete — finalized proposals are immutable and Delete is descoped per D-01); draft rows retain their existing **Edit + Archive + Delete** set unchanged.
- [x] **ROWACT-04**: The row-action wiring keeps the ADMIN-09 commission-invisibility envelope intact — `ProposalRowDto` never carries `params_snapshot`/commission, and the 19-gate grep-contract suite stays green.
- [x] **ROWACT-05**: From the Archivées view (`/proposals?archived=1`), a partner can **RESTORE** a soft-deleted proposal via a per-row Restore icon button, returning it to the Actives list in place (D-02).

### Status Pill Rendering (UIFIX — continues v1.4 UIFIX-01)

The `StatusChip` is a bare `<span className="chip chip-{variant}">`; the defect lives in the list grid + `.chip` sizing, not the component contract. v1.4's UIFIX-01 set the `/proposals` status column to `max-content`, but the home "Propositions récentes" pill is still mis-sized/non-responsive (screenshot 1).

- [x] **UIFIX-02**: The status chip on the home **"Propositions récentes"** list renders its full label (e.g. "Actif") with no clipping or vertical/horizontal misalignment, hugging its content adaptively across desktop viewport widths, in both light and dark mode.
- [x] **UIFIX-03**: The status chip on the **`/proposals`** table renders with the same content-hugging, responsive behavior as the home surface, correct in both light and dark mode (no fixed-width artifact).

## Future Requirements

Carried from v1.4 close; not in this milestone's roadmap.

### Teal Rebrand (BRAND)

- **BRAND-01**: UI accent color → `#2D7A8C` at the token layer (descoped v1.4; needs `--gd` token split + ~63-site recolor + fresh WCAG audit).
- **BRAND-02**: Logo green + semantic success green left unchanged.
- **BRAND-03**: Every recolored pair meets WCAG 2.1 AA in light + dark.

(See PROJECT.md "Deferred to v1.5+" for the full deferred inventory: OVH deploy, webhook notifications, mobile layout, Playwright, SMTP reset, Sentry/APM, etc.)

## Out of Scope

Explicitly excluded for v1.5. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| "Edit" action on active proposals | PDF-immutability invariant — finalized proposals are never mutated in place (Antoine 2026-05-30: "let's not use edit, unnecessary") |
| New DB columns / migrations | Archive + soft-delete + restore plumbing already exists (Phases 8 + 14); v1.5 wires existing capability onto the active-row UI |
| Admin-side proposal list actions | This milestone targets the partner `/proposals` surface (agent view) per the screenshots; admin `/lc-references` cross-partner view unchanged |
| Bulk / multi-select row actions | Single-row actions only; bulk operations not requested |
| Status-pill visual restyle (colors, new variants) | Fix is sizing/layout only; chip variant chrome + palette stay as-is |
| Per-row Delete on finalized rows | Descoped 2026-05-30 (D-01) — collapses into Archive given the single soft-delete state; revisitable as its own phase (separate archivedAt vs deletedAt product decision) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROWACT-01 | Phase 26 | Mapped |
| ROWACT-02 | Phase 26 | ⊘ Descoped (D-01) |
| ROWACT-03 | Phase 26 | Mapped |
| ROWACT-04 | Phase 26 | Mapped |
| ROWACT-05 | Phase 26 | Mapped |
| UIFIX-02 | Phase 27 | Mapped |
| UIFIX-03 | Phase 27 | Mapped |
| BRAND-01 | — | ⊘ Shelved (Future Requirements — descoped v1.4 Phase 25) |
| BRAND-02 | — | ⊘ Shelved (Future Requirements — descoped v1.4 Phase 25) |
| BRAND-03 | — | ⊘ Shelved (Future Requirements — descoped v1.4 Phase 25) |

**Coverage:**
- v1.5 requirements: 7 defined; 6 active + 1 descoped (ROWACT-02)
- Mapped to phases: 6 active (ROWACT-01/03/04/05 + UIFIX-02/03) + ROWACT-05
- Unmapped: 0 ✓ (updated 2026-05-30)

---
*Requirements defined: 2026-05-30*
*Last updated: 2026-05-30 — ROWACT-02 descoped (D-01, Archive-only); ROWACT-05 Restore added (D-02)*
