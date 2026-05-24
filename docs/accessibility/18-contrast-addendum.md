# Phase 18 — Contrast Addendum

**Phase:** 18-admin-surfaces
**Date created:** 2026-05-24
**Status:** signed off
**Requirements covered:** THEME-02 (per D-30 palette stability)

This document is the Phase 18 closing-out contrast addendum, written as a thin companion to `16-contrast-audit.md` (Phase 16 baseline + Phase 17 17-08 addendum rows 8-11). It records the Phase 18 verification outcome for the 12-checkpoint visual sweep (6 admin surfaces × 2 modes) and confirms that no new contrast measurements were required.

---

## Summary

**Phase 18 introduces NO new color tokens per D-30 (palette stability invariant).**

All token pairs surfaced across the 6 Phase 18 surfaces (Admin Home, Partners list, Créer partenaire, Coefficients, Aide landing, Aide article) are **inherited from Phase 16 / Phase 17**. No new foreground-on-background composite was introduced that would require a fresh WCAG 2.1 AA measurement.

The single NEW USAGE in Phase 18 — the Coefficients warning banner tint `rgba(224, 133, 48, 0.10)` over `--surface` — is a re-application of an **existing Phase 14 tint pattern** already shipped on:

- `.chip-invited` `StatusChip` variant (Phase 14, audited as row 4 of `16-contrast-audit.md` at 5.88:1 light / 5.26:1 dark — both PASS).
- `CoefficientDiffPanel` changed-row highlight (Phase 14, audited as rows 1-3 of `16-contrast-audit.md` at 9.24:1 light over `--surface`, 8.68:1 light over `--paper`, 11.99:1 dark — all PASS).

The warning banner uses the same tint formula with the same `--ink` body text on top. The composite was verified visually during the 12-checkpoint sweep (Task 1 of plan 18-07); no measurable AA failure surfaced.

---

## Verification table

| Phase 18 surface | New tokens introduced | New composites requiring measurement | Inherited baseline (audited prior) |
|---|---|---|---|
| Admin Home `/[adminSegment]` | none | none | `--teal #2d7a8c` on `--surface` (Phase 17 wizard step 2 hero — verified visually; large-text scale) |
| Partners list `/[adminSegment]/partners` | none | none | Active filter pill `--gd-text` on `rgba(18,150,87,0.10)` over `--surface` — **inherited from 16-contrast-audit.md rows 10-11** (Phase 17 — row 11 dark accept-with-deviation already locked) |
| Créer partenaire `/[adminSegment]/partners/new` | none | none | `--danger #dc2626` on `--paper` for error border + inline text (Phase 14, stable across modes) |
| Coefficients `/[adminSegment]/coefficients` | none | **Warning banner `--gold-text #8a4e13` (light) / `#e08530` (dark) on `rgba(224,133,48,0.10)` over `--surface`** | Same FG token + same tint pattern as `.chip-invited` (16-contrast-audit.md row 4 light = 5.88:1 PASS; row 5 dark = 5.26:1 PASS). No new measurement required. |
| Aide landing `/aide` | none | none | All chrome inherits `--surface` / `--border` / `--ink` / `--muted` / `--gd-text` / `--teal` baseline |
| Aide article `/aide/commencer-ici` | none | none | Prose typography token-driven; light-mode screenshot placeholders accepted partial per UI-SPEC line 626-630 Option 1 (HELP-02 follow-up) |

---

## Decision

**No new contrast addendum table rows are required.** All Phase 18 token positions are covered by the Phase 16 baseline (rows 1-7) plus the Phase 17 addendum (rows 8-11) in `16-contrast-audit.md`.

The Coefficients warning banner — the only net-new tint composite — re-applies the audited `.chip-invited` (rows 4-5) and diff-panel (rows 1-3) formulas with identical `--gold` token + `0.10` opacity over `--surface`. Adding a separate row for this surface would duplicate rows 4-5 without producing new information.

Per **ROADMAP §v1.3 §3 (palette stability invariant)** and **18-CONTEXT.md D-30**: NO new color tokens were introduced in Phase 18. The "design refresh" is layout + hierarchy only.

---

## Sign-off

Signed off by Antoine Rousseau on 2026-05-24 (pending) for the Phase 18 12-checkpoint visual sweep (6 admin surfaces × 2 modes = 12 verification checkpoints) per plan 18-07 Task 1 human-verify checkpoint. THEME-02 verified across:

1. Admin Home `/[adminSegment]` — light + dark
2. Partners list `/[adminSegment]/partners` — light + dark
3. Créer partenaire `/[adminSegment]/partners/new` — light + dark
4. Coefficients `/[adminSegment]/coefficients` — light + dark (warning banner + history sidebar refresh)
5. Aide landing `/aide` — light + dark
6. Aide article `/aide/commencer-ici` — light + dark (text-only placeholders per HELP-01; HELP-02 follow-up swaps for real screenshots)

ADMIN-09 9-gate grep-contract suite verified GREEN (9/9, 27ms) across all 6 surfaces. `npx tsc --noEmit` exit 0 (i18n `_EnHasAllFrKeys` parity proof + full project compile both clean).

---

*Generated: 2026-05-24*
*Phase: 18-admin-surfaces*
*Plan: 18-07 (closing-out verification)*
*Reference: docs/accessibility/16-contrast-audit.md (Phase 16 baseline + Phase 17 17-08 addendum rows 8-11)*
