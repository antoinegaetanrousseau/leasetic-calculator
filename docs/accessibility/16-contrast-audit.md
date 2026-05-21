# Phase 16 — WCAG 2.1 AA Contrast Audit

**Phase:** 16-shell-refresh-contrast-gates
**Date created:** 2026-05-22
**Status:** signed off
**Requirements covered:** CONTRAST-01, CONTRAST-02

This document formally closes **CONTRAST-01** (Phase 14 deferred Tier-2 contrast measurement carry-forward: diff-panel changed-row and `.chip-invited` chip composites) and **CONTRAST-02** (Phase 16 new gold/teal surfaces: `<PageHero>` eyebrow `var(--gd)` over `var(--paper)` in both light and dark modes). It is the load-bearing artifact for these contrast gates — once signed off and committed, every downstream v1.3 wave that touches `--gold`, `.chip-invited`, or the diff-panel inherits this signed-off WCAG AA proof.

---

## Method

**Tool:** Contrast ratios were computed mathematically using the WCAG 2.1 formula — identical to [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) output. Formula: `(L₁ + 0.05) / (L₂ + 0.05)` where L₁ is the relative luminance of the lighter colour and L₂ is that of the darker colour. Relative luminance is computed per WCAG 2.1 §1.4.3 (linearise sRGB channels, apply the standard matrix). Antoine reviewed the computed ratios and approved the remediation strategy.

**Pass threshold:** Ratio ≥ 4.5:1 for normal text (WCAG 2.1 Level AA, Success Criterion 1.4.3).

**Alpha-blending:** Where a background is a semi-transparent overlay, the effective (blended) background hex is pre-calculated using the standard Porter-Duff alpha-composite formula before the contrast ratio is computed:

```
blended_channel = base_channel × (1 − α) + overlay_channel × α
```

Worked example for `rgba(224, 133, 48, 0.10)` over `--surface` `#ffffff`:

| Channel | Formula                              | Result |
|---------|--------------------------------------|--------|
| R       | 255 × 0.90 + 224 × 0.10 = 251.9 | 252 → `#FC` |
| G       | 255 × 0.90 + 133 × 0.10 = 242.8 | 243 → `#F3` |
| B       | 255 × 0.90 + 48 × 0.10 = 234.3  | 234 → `#EA` |

Blended result: **`#fcf3ea`**

> **Note on Row 3 (dark mode diff-panel BG):** The channel-by-channel formula from `--surface` dark `#161e2d` (R:22, G:30, B:45) with α=0.10 gold overlay yields an effective BG of approximately `#2a282d` (R: 22×0.90 + 224×0.10 = 42 → `#2A`; G: 30×0.90 + 133×0.10 = 40 → `#28`; B: 45×0.90 + 48×0.10 = 45 → `#2D`). This differs from the `#1d2033` value previously listed in the PLAN/CONTEXT. The audit uses `#2a282d` (the mathematically correct blended value) and the ratio 11.99:1 is computed against it.

---

## CONTRAST-01 — Diff-panel + StatusChip composites

These 5 composites cover the Phase 14 deferred Tier-2 requirement (carry-forward from `.planning/v1.3-CARRYFORWARD.md`). Source surfaces: `CoefficientDiffPanel.tsx` changed-row highlight and `StatusChip` `.chip-invited` variant (`app/globals.css`).

| # | Composite | FG token (hex) | BG token (hex) | Effective FG (hex) | Effective BG (hex) | Mode | Ratio | Tool | Pass |
|---|-----------|----------------|----------------|--------------------|--------------------|------|-------|------|------|
| 1 | Diff-panel changed-row text | `--ink` weight 600 (`#41423d`) | `rgba(224,133,48,0.10)` over `--surface` (`#ffffff`) | `#41423d` | `#fcf3ea` | Light | 9.24:1 | WCAG 2.1 formula | ✓ |
| 2 | Diff-panel changed-row text | `--ink` weight 600 (`#41423d`) | `rgba(224,133,48,0.10)` over `--paper` (`#f5f7fc`) | `#41423d` | `#f3ece8` | Light | 8.68:1 | WCAG 2.1 formula | ✓ |
| 3 | Diff-panel changed-row text | `--ink` dark (`#e6e9ef`) | `rgba(224,133,48,0.10)` over `--surface` dark (`#161e2d`) | `#e6e9ef` | `#2a282d` | Dark | 11.99:1 | WCAG 2.1 formula | ✓ |
| 4 | `.chip-invited` StatusChip text | `--gold-text` (`#8a4e13`) | `rgba(224,133,48,0.12)` over `--surface` (`#ffffff`) | `#8a4e13` | `#fbf0e6` | Light | 5.88:1 | WCAG 2.1 formula | ✓ |
| 5 | `.chip-invited` StatusChip text | `--gold-text` dark (`#e08530`) | `rgba(224,133,48,0.12)` over `--surface` dark (`#161e2d`) | `#e08530` | `#2e2a2d` | Dark | 5.26:1 | WCAG 2.1 formula | ✓ |

**Token source confirmation:**
- Row 1–3 FG: `--ink` light `#41423d` / dark `#e6e9ef` — confirmed in `app/globals.css` `:root` and `html[data-theme="dark"]`.
- Row 1–3 BG overlay: `rgba(224,133,48,0.10)` — confirmed via `CoefficientDiffPanel.tsx` changed-row highlight tint using `--gold` (`#e08530`) at 10% alpha.
- Row 4–5 FG: After Phase 16 remediation, `.chip-invited` uses `--gold-text` (light: `#8a4e13`; dark resolves to `#e08530` = same as `--gold`).
- Row 4–5 BG: `.chip-invited` uses `background: rgba(224, 133, 48, 0.12)` per `app/globals.css`. In dark mode the chip renders on a `--surface` dark (`#161e2d`) base.
- Row 4–5 effective BG: pre-calculated with alpha = 0.12 using the alpha-blending formula in Method section above.

---

## CONTRAST-02 — Phase 16 new surfaces

These 2 composites cover the `<PageHero>` eyebrow introduced by Phase 16 Plan 16-01. After Phase 16 remediation, the eyebrow uses `color: var(--gd-text)` (light: `#0e7544`; dark resolves to `#129657` = same as `--gd`) on the page canvas background `var(--paper)`.

| # | Composite | FG token (hex) | BG token (hex) | Effective FG (hex) | Effective BG (hex) | Mode | Ratio | Tool | Pass |
|---|-----------|----------------|----------------|--------------------|--------------------|------|-------|------|------|
| 6 | `<PageHero>` eyebrow | `--gd-text` (`#0e7544`) | `--paper` light (`#f5f7fc`) | `#0e7544` | `#f5f7fc` | Light | 5.37:1 | WCAG 2.1 formula | ✓ |
| 7 | `<PageHero>` eyebrow | `--gd-text` dark (`#129657`) | `--paper` dark (`#0c121c`) | `#129657` | `#0c121c` | Dark | 4.94:1 | WCAG 2.1 formula | ✓ |

**Token source confirmation:**
- FG light: `--gd-text` = `#0e7544` (Phase 16 new token, `app/globals.css` `:root`).
- FG dark: `--gd-text` overridden to `#129657` in `html[data-theme="dark"]` (same as `--gd` — already passing).
- BG light: `--paper` light = `#f5f7fc` — confirmed `app/globals.css` `:root`.
- BG dark: `--paper` dark = `#0c121c` — confirmed `app/globals.css` `html[data-theme="dark"]`.
- No alpha blending needed for rows 6–7 (both FG and BG are solid colors).

---

## Remediation Note

**Initial measurement** found 2 composites failing WCAG AA in light mode:
- Row 4: `.chip-invited` text `#e08530` over `#fbf0e6` = 2.47:1 (fail — below 4.5:1 threshold)
- Row 6: `<PageHero>` eyebrow `#129657` over `#f5f7fc` = 3.55:1 (fail — below 4.5:1 threshold)

Dark mode passes for both composites. Antoine reviewed the computed ratios and approved the remediation strategy.

**Phase 16 remediation** introduced two text-mode token variants (`--gd-text`, `--gold-text`) that resolve to darker values in light mode and to the primary tokens (`--gd`, `--gold`) in dark mode where contrast already passes:
- `--gd-text: #0e7544` (light) / `#129657` (dark = same as `--gd`)
- `--gold-text: #8a4e13` (light) / `#e08530` (dark = same as `--gold`)

This approach **preserves brand identity** — the primary tokens (`--gd`, `--gold`) are unchanged and continue to be used for graphical elements (dots, button backgrounds, icon fills) where the WCAG AA 4.5:1 threshold does not apply. Only foreground text composites now use the text-mode variants.

**Surfaces updated:**
- `app/globals.css` `.chip-invited`: `color: var(--gold)` → `color: var(--gold-text)` (fixes Row 4)
- `app/globals.css` `.chip-draft`: same change (Phase 14 pre-existing visual-debt — same color combination as `.chip-invited`)
- `src/components/ui/PageHero.tsx` eyebrow: `color: 'var(--gd)'` → `color: 'var(--gd-text)'` (fixes Row 6)

**Contrast computation:** All ratios were computed mathematically using the WCAG 2.1 formula `(L₁ + 0.05) / (L₂ + 0.05)` — identical to WebAIM's calculator output. Antoine reviewed the computed ratios and approved the remediation strategy.

---

## Additional CONTRAST-02 composites

No additional CONTRAST-02 composites introduced by Phase 16 plans 16-01..16-04 beyond the PageHero eyebrow rows 6-7. Plans 16-02 (sidebar/topbar micro-deltas), 16-03 (footer extension), and 16-04 (admin home adopter) introduce no new `--gold` or `--teal` foreground-on-background pair.

---

## Sign-off

Signed off by Antoine Rousseau on 2026-05-22 (commit pending). Each composite above measured mathematically using the WCAG 2.1 formula (identical to WebAIM contrast checker). All values ≥4.5:1 WCAG AA in both light and dark modes after Phase 16 remediation (introduces --gd-text + --gold-text token variants).
