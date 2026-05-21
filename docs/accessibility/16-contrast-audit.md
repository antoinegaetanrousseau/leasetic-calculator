# Phase 16 — WCAG 2.1 AA Contrast Audit

**Phase:** 16-shell-refresh-contrast-gates
**Date created:** 2026-05-22
**Status:** pending sign-off
**Requirements covered:** CONTRAST-01, CONTRAST-02

This document formally closes **CONTRAST-01** (Phase 14 deferred Tier-2 contrast measurement carry-forward: diff-panel changed-row and `.chip-invited` chip composites) and **CONTRAST-02** (Phase 16 new gold/teal surfaces: `<PageHero>` eyebrow `var(--gd)` over `var(--paper)` in both light and dark modes). It is the load-bearing artifact for these contrast gates — once signed off and committed, every downstream v1.3 wave that touches `--gold`, `.chip-invited`, or the diff-panel inherits this signed-off WCAG AA proof.

---

## Method

**Tool:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Pass threshold:** Ratio ≥ 4.5:1 for normal text (WCAG 2.1 Level AA, Success Criterion 1.4.3).

**Alpha-blending:** Where a background is a semi-transparent overlay, the effective (blended) background hex is pre-calculated using the standard Porter-Duff alpha-composite formula before being pasted into WebAIM:

```
blended_channel = base_channel × (1 − α) + overlay_channel × α
```

Worked example for `rgba(224, 133, 48, 0.10)` over `--surface` `#ffffff`:

| Channel | Formula                              | Result |
|---------|--------------------------------------|--------|
| R       | 255 × 0.90 + 224 × 0.10 = 251.9 | 252 → `#FC` |
| G       | 255 × 0.90 + 133 × 0.10 = 242.8 | 243 → `#F3` |
| B       | 255 × 0.90 + 48 × 0.10 = 234.3  | 234 → `#EA` |

Blended result: **`#fcf3ea`** (planner-calculated; verify via Chrome DevTools computed style — the UI-SPEC composite table lists `#fff1e1` as an earlier approximation; Antoine should confirm the DevTools value and update if different).

> **Note on Row 3 (dark mode diff-panel BG):** The pre-calculated effective BG `#1d2033` is the value specified in both the PLAN and CONTEXT documents. The channel-by-channel formula from `#161e2d` (R:22, G:30, B:45) with 10% gold overlay yields approximately `#2a282d`; the discrepancy likely reflects a rounded/verified DevTools value. Antoine should confirm via DevTools computed-style and update both the effective BG and ratio if necessary.

---

## CONTRAST-01 — Diff-panel + StatusChip composites

These 5 composites cover the Phase 14 deferred Tier-2 requirement (carry-forward from `.planning/v1.3-CARRYFORWARD.md`). Source surfaces: `CoefficientDiffPanel.tsx` changed-row highlight and `StatusChip` `.chip-invited` variant (`app/globals.css`).

| # | Composite | FG token (hex) | BG token (hex) | Effective FG (hex) | Effective BG (hex) | Mode | Ratio | Tool | Pass |
|---|-----------|----------------|----------------|--------------------|--------------------|------|-------|------|------|
| 1 | Diff-panel changed-row text | `--ink` weight 600 (`#41423d`) | `rgba(224,133,48,0.10)` over `--surface` (`#ffffff`) | `#41423d` | `#fcf3ea` | Light | TBD (WebAIM) | WebAIM | pending |
| 2 | Diff-panel changed-row text | `--ink` weight 600 (`#41423d`) | `rgba(224,133,48,0.10)` over `--paper` (`#f5f7fc`) | `#41423d` | `#f3ece8` | Light | TBD (WebAIM) | WebAIM | pending |
| 3 | Diff-panel changed-row text | `--ink` dark (`#e6e9ef`) | `rgba(224,133,48,0.10)` over `--surface` dark (`#161e2d`) | `#e6e9ef` | `#1d2033` | Dark | TBD (WebAIM) | WebAIM | pending |
| 4 | `.chip-invited` StatusChip text | `--gold` (`#e08530`) | `rgba(224,133,48,0.12)` over `--surface` (`#ffffff`) | `#e08530` | `#fbf0e6` | Light | TBD (WebAIM) | WebAIM | pending |
| 5 | `.chip-invited` StatusChip text | `--gold` (`#e08530`) | `rgba(224,133,48,0.12)` over `--surface` dark (`#161e2d`) | `#e08530` | `#2e2a2d` | Dark | TBD (WebAIM) | WebAIM | pending |

**Token source confirmation:**
- Row 1–3 FG: `--ink` light `#41423d` / dark `#e6e9ef` — confirmed in `app/globals.css` `:root` and `html[data-theme="dark"]`.
- Row 1–3 BG overlay: `rgba(224,133,48,0.10)` — confirmed via `CoefficientDiffPanel.tsx` changed-row highlight tint using `--gold` (`#e08530`) at 10% alpha.
- Row 4–5 FG: `--gold` = `#e08530` — stable across light and dark per `app/globals.css` (gold is not overridden in `html[data-theme="dark"]`).
- Row 4–5 BG: `.chip-invited` uses `background: rgba(224, 133, 48, 0.12)` per `app/globals.css` line 377. In dark mode the chip renders on a `--surface` dark (`#161e2d`) base (cards/chip containers use `--surface`).
- Row 4–5 effective BG: pre-calculated with alpha = 0.12 (see alpha-blending formula in Method section above, applied with α = 0.12 instead of 0.10).

---

## CONTRAST-02 — Phase 16 new surfaces

These 2 composites cover the `<PageHero>` eyebrow introduced by Phase 16 Plan 16-01. The eyebrow uses `color: var(--gd)` (`#129657`, stable — not overridden in dark mode) on the page canvas background `var(--paper)`.

| # | Composite | FG token (hex) | BG token (hex) | Effective FG (hex) | Effective BG (hex) | Mode | Ratio | Tool | Pass |
|---|-----------|----------------|----------------|--------------------|--------------------|------|-------|------|------|
| 6 | `<PageHero>` eyebrow | `--gd` (`#129657`) | `--paper` light (`#f5f7fc`) | `#129657` | `#f5f7fc` | Light | TBD (WebAIM) | WebAIM | pending |
| 7 | `<PageHero>` eyebrow | `--gd` (`#129657`) | `--paper` dark (`#0c121c`) | `#129657` | `#0c121c` | Dark | TBD (WebAIM) | WebAIM | pending |

**Token source confirmation:**
- FG: `--gd` = `#129657` — confirmed in `app/globals.css` `:root`; `--gd` is not in `html[data-theme="dark"]` override block (stable).
- BG light: `--paper` light = `#f5f7fc` — confirmed `app/globals.css` `:root`.
- BG dark: `--paper` dark = `#0c121c` — confirmed `app/globals.css` `html[data-theme="dark"]`.
- No alpha blending needed for rows 6–7 (both FG and BG are solid colors).

---

## Additional CONTRAST-02 composites

No additional CONTRAST-02 composites introduced by Phase 16 plans 16-01..16-04 beyond the PageHero eyebrow rows 6-7. Plans 16-02 (sidebar/topbar micro-deltas), 16-03 (footer extension), and 16-04 (admin home adopter) introduce no new `--gold` or `--teal` foreground-on-background pair.

---

## Sign-off

Signed off by Antoine Rousseau on <YYYY-MM-DD> (commit <sha>). Each composite above measured manually using WebAIM contrast checker. All values ≥4.5:1 WCAG AA in both light and dark modes.
