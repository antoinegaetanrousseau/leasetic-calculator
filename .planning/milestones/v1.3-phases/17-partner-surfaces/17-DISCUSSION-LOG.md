# Phase 17: Partner Surfaces - Discussion Log

> **Audit trail only.** Decisions are captured in `17-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 17-partner-surfaces
**Areas discussed:** Wizard invariant changes (WIZ-04 + WIZ-06), Partner Home detail (PHOME-02 + PHOME-03), /proposals route + Archives semantics (PROPS-01 + PROPS-02), Visual refresh scope + hero adoption (WIZ-01..03 + cross-cutting)

---

## Wizard invariant changes — WIZ-04 (validity selector behavior)

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible, defaults to global value, overrides this proposal only (Recommended) | Step 3 CALCUL recap always shows `Durée de validité (15j/30j/60j)` segmented pill. Default = `globalParams.validityDays` resolved at step 1. Partner can change; selection writes to `draft.inputs.validityDays` and overrides ONLY this proposal at finalize. Global default unchanged. | ✓ |
| Always visible, partner choice = new global default | Same UI but selection updates `globalParams.validityDays` for all future proposals. Risks confusing partner UX + legal implications. | |
| Hidden by default, 'Modifier' link reveals it | Shows `Durée de validité: 30 jours` (read-only) with `← Modifier` link to reveal pills. Adds one click for the override case. | |

**User's choice:** Always visible, defaults to global value, overrides this proposal only (Recommended)

**Notes:** Locked as D-01 in CONTEXT.md. Schema already supports the behavior (Phase 12 `validity_days NOT NULL`). No migration required. Phase 13 D-08 already established that wizard writes `draft.inputs.validityDays` on every `updateDraft` call — Phase 17 only adds the partner-facing selector on step 3 that lets them change the resolved value.

---

## Wizard invariant changes — WIZ-06 (LC reference reservation timing)

| Option | Description | Selected |
|--------|-------------|----------|
| Allocate at draft creation (Recommended for WIZ-06 fidelity) | `createDraft()` allocates next sequential `lc_ref` per-user and persists on the draft row. PdfPreviewMock shows real reference. Pros: WYSIWYG step-3 preview. Cons: abandoned drafts consume lc_ref numbers (sequential gaps). | ✓ |
| Keep Phase 13 behavior — literal LC-2026-XXX placeholder, allocate at finalize | Preserve Phase 13 D-15 invariant. PdfPreviewMock shows `LC-2026-XXX` literal. No gaps. Cons: contradicts WIZ-06's explicit spec text. | |
| Allocate at draft creation but skip-gaps reclaim on draft delete | Allocate early AND attempt to reclaim if last allocated on draft delete. Reduces gaps for abandoned-recent-draft case. Adds delete-path complexity. | |

**User's choice:** Allocate at draft creation (Recommended for WIZ-06 fidelity)

**Notes:** Locked as D-03 + D-04 in CONTEXT.md. This explicitly INVERTS Phase 13 D-15 invariant. Schema (Phase 12 `lc_ref` nullable + partial unique index `WHERE lc_ref IS NOT NULL`) already supports drafts with lc_ref values — no migration. Pool gaps from abandoned drafts accepted as the trade-off; no reclamation logic.

---

## Partner Home detail — MetricTile + recent proposals semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative: active-only everywhere (Recommended) | Tiles count `status = 'active'` only. Recent list = active-only by `created_at DESC`. Conservative semantics; smaller numbers; cleanest separation. | |
| Inclusive: counts include drafts + expired (excludes deleted) | Tiles count `status IN ('active','draft','expired')`. Recent list = same set ordered by `created_at DESC`. Bigger numbers, activity-rich feel. | ✓ |
| Mixed: active + drafts counted; expired excluded | Tiles count `status IN ('active','draft')`. Recent list = top 5 by `updated_at DESC` (catches recently-edited drafts). | |

**User's choice:** Inclusive: counts include drafts + expired (excludes deleted)

**Notes:** Locked as D-05 + D-08 in CONTEXT.md. Antoine deliberately chose the activity-rich variant over the conservative recommendation — for an internal tool where partners work iteratively through proposals, the inclusive count better reflects their actual activity. Soft-deleted proposals excluded from all 3 tiles + recent list. SQL-side Europe/Paris timezone math for "Ce mois-ci" boundary (D-06).

---

## /proposals route + Archives semantics

| Option | Description | Selected |
|--------|-------------|----------|
| URL-driven state + Archivées = expired OR soft-deleted (Recommended) | Server-rendered `/proposals` route reusing `ProposalsList`. URL `?archived=1` matches v1.1 `?deleted=1` precedent. Two pills (Actives default + Archivées). Shareable/bookmarkable URLs. Archivées = expired + soft-deleted within 30-day window. | ✓ |
| URL-driven, separate pills per status (Active / Brouillons / Expirées / Supprimées) | Four filter pills instead of two. More granular; more visual complexity. `expired`/`deleted` could feel confusingly similar. | |
| Client-only toggle (no URL state) | State in React useState only. Breaks shareability and v1.1 precedent. | |

**User's choice:** URL-driven state + Archivées = expired OR soft-deleted (Recommended)

**Notes:** Locked as D-10..D-14 in CONTEXT.md. New server-component route at `app/(authed)/proposals/page.tsx`. The full proposals list moves out of Partner Home (which becomes hero + 3 tiles + 5-row recent preview only). URL state `?archived=1` matches existing v1.1 patterns. Archivées composition: `(status = 'expired') OR (deleted_at >= NOW() - INTERVAL '30 days')`. Reuses existing `ProposalsList` + `SearchBar` + cursor pagination.

---

## Visual refresh scope + hero adoption

| Option | Description | Selected |
|--------|-------------|----------|
| Full restructure for wizard + PageHero on all partner surfaces (Recommended) | Wizard: net-new JSX where Figma shows new structure (step 2 Détail du calcul card + Tranche/Coefficient pill); repaint elsewhere. PageHero on: Partner Home, /proposals, all 3 wizard steps. Full consistency. | ✓ |
| Repaint-only wizard + PageHero on landing pages only | Pure CSS deltas in wizard, no JSX restructure (defer step 2's Détail du calcul to v1.4). PageHero only on Partner Home + /proposals. Loses visual consistency on wizard steps. | |
| Full restructure wizard + selective PageHero (Partner Home + /proposals only) | Wizard restructured but builds own inline hero (stepper-eyebrow-title coupling). PageHero on landing pages. | |

**User's choice:** Full restructure for wizard + PageHero on all partner surfaces (Recommended)

**Notes:** Locked as D-15..D-20 in CONTEXT.md. The wizard restructure is justified by Figma `39:46`'s new Détail du calcul card + Tranche/Coefficient pill on hero (genuinely net-new JSX). Step 1 + step 3 are repaint-only (CSS deltas). PageHero adopted on all 5 partner surfaces with `<Stepper>` rendered as a sibling (not composed inside). Light + dark pair per surface via existing token cascade.

---

## Claude's Discretion

(Items where Antoine left flexibility — full list in `17-CONTEXT.md` `<decisions>` → "Claude's Discretion" subsection.)

- Wizard step subtitle copy (planner picks based on Figma if shown)
- PageHero `actions` slot vs sibling block for Partner Home `Nouvelle proposition` CTA (recommendation: actions slot)
- lc_ref allocation algorithm (use Phase 8 format `LC-2026-NNN`, sequential per-user; transaction-safe)
- lc_ref warm pool / reclamation (NO — simple sequential is fine)
- `?archived=1` + `?q=` query param composition (orthogonal, naturally composes via Next.js searchParams)
- `Voir toutes →` link destination (default Actives view, not Archivées)
- Step 2 Tranche/Coefficient pill styling (`--teal` tint background recommended; UI-SPEC validates)
- `data-testid` on new MetricTile + filter-pill instances (recommendation: yes, for future Playwright tests)

---

## Deferred Ideas

(Items mentioned during discussion that were noted for future phases — full list in `17-CONTEXT.md` `<deferred>` section.)

- MetricTile click-through to filtered /proposals views → v1.4+
- XLSX export from /proposals → Phase 19 (EXPORT-01)
- Centralized LC reference dashboard → Phase 19 (LCDASH-01)
- Inline `Loyer estimé` chip on wizard step 1 → v1.4+ polish
- Wizard `beforeunload` warning → v1.4+
- Per-step browser tab titles → v1.4+
- Route transition animations → v1.4+
- lc_ref reclamation logic → out of scope; gap-tolerance accepted
- `<RecentlyDeletedToggle>` component deletion → planner's discretion (retired from Partner Home; file disposition optional)
- Mobile-optimized wizard layout → v1.4+
- Activity timeline / audit history on `/proposals/[id]` → v1.4+
