# Phase 13: 3-Step Proposal Wizard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 13-3-step-proposal-wizard
**Areas discussed:** Step-content split, Figma-divergence reconciliations (duration, commission, dropped fields, PDF timing), Draft save trigger, Step 3 review mode, Finalize UX, Action-bar consistency, Stepper completion-state semantics, Save-as-draft click behavior, Live preview, Duplicate (PROP-21) carry-over, Resume mechanism gap, Précédent navigation, Real-time validation

---

## Step-content split

| Option | Description | Selected |
|--------|-------------|----------|
| Pure read-only | All 14 fields in step 1; step 2 shows only computed loyer; step 3 reviews. v1.1's sticky LiveLoyerPreview becomes the full-width body of step 2. | (locked retroactively by Figma review) ✓ |
| Calc-knobs in step 2 | Step 1 holds identity/context; step 2 holds amountHT/durationMonths/validityDays as interactive controls with live result; step 3 reviews. | (initially selected) ✗ |
| Mirror v1.1 cards | Step 1 = Partner + Client; step 2 = Intérêts + Paramètres + validityDays WITH live preview; step 3 reviews. | |

**User's choice:** Initially "Calc-knobs in step 2", then redirected to Figma review which contradicted the choice. Final locked position aligns with **Pure read-only** — calc inputs live on step 1, step 2 is fully read-only.
**Notes:** The user's redirection to the Figma file (`node-id=9-46`) triggered a full design review against frames 35:46, 39:46, 40:46, 9:46. The Figma flatly contradicted the initial choice — the design has all calc inputs in step 1 (Montant HT segmented + Durée du contrat segmented) and step 2 is a hero-card + breakdown read-only result. The CONTEXT.md captures the Figma-authoritative position.

---

## Step 2 layout — where does the computed loyer render?

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky right-side | Reuse v1.1's 640px + 360px LiveLoyerPreview pattern. | |
| Hero card on top | Big computed-loyer card spans full width at top; 3 inputs below. | |
| Result card below | Inputs row at top, result below. | |

**User's choice:** (Other / free-text) "Review all design decisions based on these designs: https://www.figma.com/design/vwOzirhL0vyxDWq4m6t4gC/...?node-id=9-46"
**Notes:** User redirected the entire discussion at this point. All subsequent answers were grounded in the Figma sketches. The question was retired — the Figma definitively answers it (hero card on top, no interactive inputs, no sticky preview pane). See `<canonical_refs>` in CONTEXT.md.

---

## Duration values divergence

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 36/48/60 | Preserve v1.1 schema + Phase 7's 30-case golden corpus + ±0.01 € v9 parity CI gate. Update Figma post-phase. | ✓ |
| Switch to 24/36/48 | Adopt Figma's values; regenerate golden corpus; request new coefficient rows from Thomas for 24-month tranches. Breaks v9 parity. | |
| Union 24/36/48/60 | Schema accepts 4 values; needs new 24-month coefficient data from Thomas. | |

**User's choice:** Keep 36/48/60
**Notes:** Phase 7's golden corpus + parity-with-v9 invariant stays intact. Figma label gets fixed post-phase as a small chore (added to deferred ideas).

---

## Commission visibility on step 2

| Option | Description | Selected |
|--------|-------------|----------|
| Hide on step 2 | Preserve ADMIN-09. Remove the Commission row from Détail du calcul. | |
| Show to partner | Deliberate ADMIN-09 relaxation. Commission visible to deal owner on step 2 ONLY — still hidden in PDF, audit_log, server logs, pre-finalize traces. | ✓ |
| Render zero/redacted | Row stays in layout but value renders as '—'/'0 €' for partners; admin sees real value. | |

**User's choice:** Show to partner
**Notes:** Significant change to the 97-STRIDE-threat surface Phase 9 closed. Phase 13 planner MUST schedule a CR-grade STRIDE re-review producing a one-row addendum to the Phase 9 threat model documenting the partner-facing step-2 exception. The ADMIN-09 invariants for non-step-2 surfaces (PDF, audit_log, server logs, pre-finalize traces) stay in force and need a new Vitest test asserting the rendered PDF (any golden case) contains no commission value.

---

## Dropped fields (7 v1.1 fields not in Figma)

| Option | Description | Selected |
|--------|-------------|----------|
| Remove all 7 | Drop from proposalInputSchema AND PDF. Phase 7 parity tests need updates. | |
| Hidden auto-fill | Schema unchanged. partnerCo/Name hydrate from session; clientRole/clientSiren/slb/evalParc/projectDesc default to '' / false; validityDays = admin default. | |
| Plus de détails accordion | Step 1 adds collapsed `+ Plus de détails (facultatif)` exposing the 5 optional fields. partnerCo/Name auto-hydrate. validityDays = admin default. | ✓ |

**User's choice:** Plus de détails accordion
**Notes:** Initially the user asked for clarification ("I am not sure what you are referring to"). A concrete enumeration mapping Figma fields → v1.1 schema field names resolved it. The accordion approach preserves all v1.1 capability for partners who need it while keeping the primary flow lean.

---

## Step-3 PDF preview generation timing

| Option | Description | Selected |
|--------|-------------|----------|
| Mock until finalize | Step 3 right column is a CSS mock; no PDF blob, no lc_ref allocated until Confirmer click. | ✓ |
| Pre-generate on entry | Real PDF blob exists when partner reaches step 3; lc_ref pre-allocated; faster finalize but creates orphan blobs. | |
| Server-render, don't upload | Step 3 server-renders in-memory; no blob; re-renders + uploads on finalize. Costs 2 renders per finalize. | |

**User's choice:** Mock until finalize
**Notes:** Cleanest architecture. `finalizeDraft` stays the sole writer of `lc_ref` + `idempotency_key` + `params_snapshot` + `computed` + `pdf_*` columns + `audit_log proposal.create`. No orphan blob purge logic needed. CSS mock displays a literal `LC-2026-XXX` placeholder (the real lc_ref uses numeric digits, so XXX never collides).

---

## Action bar pattern (all 3 steps?)

| Option | Description | Selected |
|--------|-------------|----------|
| All 3 steps | Save-as-draft + Précédent + step-specific CTA on every step. | ✓ |
| Step 1 only | Save-as-draft only on step 1; steps 2/3 have Précédent + CTA only. | |
| Step 1 & 2 only | Save on 1 & 2; step 3 strips Save (you've reviewed everything, only Confirmer makes sense). | |

**User's choice:** All 3 steps
**Notes:** Consistent action-bar pattern. `<WizardActionBar>` shared component takes a step-specific primary CTA prop. Step 3's Save-as-draft preserves `status='draft'` (only Confirmer finalizes).

---

## "← Modifier" / Stepper completion-state on edit

| Option | Description | Selected |
|--------|-------------|----------|
| Invalidate downstream | Editing step 1 resets steps 2 & 3 to pending; partner must walk Continuer again. | ✓ |
| Keep done, recompute on visit | Steps 2/3 stay done in Stepper; revisiting step 2 re-fetches + re-computes fresh. | |
| Keep done, freeze values | Stepper stays done; step 2/3 display whatever was computed last (risk of stale data). | |

**User's choice:** Invalidate downstream
**Notes:** Safest. Combined with the "Préserve state on navigate" rule (separate question), produces a clean algorithm: completedSteps = (steps walked through Continuer) MINUS (steps whose inputs were re-edited).

---

## Finalize UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline progress states | CTA morphs through 'Calcul…' → 'Génération du PDF…' → 'Sauvegarde…'. Requires server streaming. | |
| Single spinner | CTA disables + shows one generic label ('Génération en cours…'). Redirect on completion. Simplest. | ✓ |
| Full-screen overlay | Modal covers step 3 mid-finalize. Prevents accidental Modifier click. | |
| Optimistic redirect | Immediate navigate to /proposals/[draft_id] with skeleton; finalize runs server-side. | |

**User's choice:** Single spinner
**Notes:** Mirrors v1.1 finalize UX. RHF `formState.isSubmitting` plus the disabled-CTA pattern from the existing proposal page is reusable.

---

## Save-as-draft click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Stay + toast | Partner stays on current step; sonner toast. | |
| Redirect to home | Save + redirect to / + toast. Future Brouillons MetricTile (Phase 14) becomes the resume entry. | ✓ |
| Redirect to brouillons list | Saves + redirects to a draft-list view. Phase 14 territory. | |

**User's choice:** Redirect to home
**Notes:** Reinforces the "Save-as-draft = I'm done for now" framing. Partner home (post-Phase-14 — has Brouillons MetricTile) becomes the natural resume entry.

---

## Live preview on step 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop on step 1 | No LiveLoyerPreview pane on step 1. Calc only shown on step 2. Matches Figma exactly. | ✓ |
| Keep as sticky on step 1 | Keep v1.1's 640px + 360px layout. Continuer still navigates to step 2. | |
| Compact inline preview | Small inline `Loyer estimé` chip near Montant HT / Durée. | |

**User's choice:** Drop on step 1
**Notes:** v1.1 UX regression — partners lose the see-as-you-type feedback. The `<LiveLoyerPreview>` component stays in the codebase pending a possible v1.3 inline-chip revival (deferred idea).

---

## Duplicate flow (PROP-21 carry-over)

| Option | Description | Selected |
|--------|-------------|----------|
| Carry, land step 1 | `/proposals/new/parametres?duplicate=<id>` creates a fresh draft prefilled from source; partner lands on step 1; DuplicatePrefillToast fires. | ✓ |
| Drop | Remove duplicate support entirely. | |
| Carry on parametres only | Same as 'Carry, land step 1' explicitly scoped to one route. | |

**User's choice:** Carry, land step 1
**Notes:** `partnerName` and `partnerCo` get a session overlay (the v1.1 PROP-21 pattern) so a duplicate never carries the source row's cached partner attribution.

---

## Draft resume mechanism (Phase 13 vs. Phase 14)

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 14 owns it | Phase 13 only creates drafts; resume waits for Phase 14's MetricTile/list. 1-phase gap. | ✓ |
| Add minimal /drafts page | Phase 13 ships a small `/proposals/drafts` list. Phase 14's MetricTile becomes a click-through. | |
| Resume on home Brouillons tile | Temporary inline draft list on partner home; replaced by proper MetricTile in Phase 14. | |

**User's choice:** Phase 14 owns it
**Notes:** GSD scope discipline. The 1-phase usability gap is documented in CONTEXT.md so Phase 14 planning prioritizes the resume path early.

---

## "← Précédent" navigation behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve state | Navigate-only (no edits) keeps completedSteps intact. Partner browses freely; only edits trigger D-21. | ✓ |
| Reset on backward nav | Any backward navigation drops completedSteps to numbers below the destination. | |

**User's choice:** Preserve state
**Notes:** Combined with "Invalidate downstream on edit" produces a clean rule. See D-20–D-23 in CONTEXT.md for the full algorithm.

---

## Real-time validation timing

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time on blur | RHF zodResolver `mode: 'onBlur'`. Email/phone/SIREN validate on blur; required fields error on blur if empty. Matches v1.1. | ✓ |
| On Continuer click only | RHF `mode: 'onSubmit'`. Errors surface only on Continuer click. | |
| Hybrid | Required fields error on blur; format checks on Continuer click. | |

**User's choice:** Real-time on blur
**Notes:** v1.1 / Phase 7 parity. The `<ProposalForm>` pattern is directly reusable.

---

## Claude's Discretion

Captured in the `Claude's Discretion` subsection of CONTEXT.md `<decisions>`:

- Exact dictionary keys + their FR/EN copy
- Test colocation convention (planner follows Phase 11/12)
- Sticky-footer vs. inline-scrolling action bar treatment when accordion expansion overflows viewport
- Route-private vs. globally-reusable placement of `<WizardActionBar>` / `<PlusDeDetailsAccordion>` / `<PdfPreviewMock>` (recommendation: route-private under `app/(authed)/proposals/new/_components/`)
- Exact placeholder string for mock `lc_ref` (recommendation: `LC-2026-XXX`)
- `beforeunload` warning implementation (recommendation: implement; planner may defer)
- Animation/transitions between steps (recommendation: none for v1.2)
- Reuse of `<DurationSegmented>` as-is vs. wrapper (recommendation: as-is)
- Single-card-with-`<hr>` vs. two-separate-`.card`s for step 1 sections (recommendation: single card matching Figma)
- `_completedSteps` bookkeeping location (recommendation: in `inputs` jsonb; no migration)

---

## Deferred Ideas

Captured in the `<deferred>` section of CONTEXT.md:

- Draft resume mechanism (Phase 14)
- Inline `Loyer estimé` chip on step 1 (v1.3+ polish)
- Sticky-footer action bar treatment (planner's call within Phase 13 or v1.3)
- `beforeunload` warning for unsaved edits (Phase 13 polish or v1.3)
- Animation / transitions between routes (v1.3+)
- Per-step browser tab titles
- Cron purge of stale empty drafts (rejected for now per Phase 12 D-02)
- Figma label fixes for the wizard frames (post-phase chore)
- Admin coefficient history viewer, AdminNavCards, partner home MetricTiles, partner-home Nouvelle proposition CTA wiring (all Phase 14)
- Public-surface brand polish — login / invite / reset (Phase 15)
