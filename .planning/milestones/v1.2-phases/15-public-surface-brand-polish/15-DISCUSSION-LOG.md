# Phase 15: Public Surface Brand Polish - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md.

**Date:** 2026-05-20
**Phase:** 15-public-surface-brand-polish
**Areas discussed:** Logo sizing on public pages, Mobile responsive scaling

---

## Logo width on public pages (desktop)

| Option | Description | Selected |
|---|---|---|
| 200px wide | Matches v1.1 plain-text weight; 32px above-card padding | ✓ |
| 240px wide | Slightly more presence | |
| 160px wide | Discreet, top-bar-like | |

**Notes:** 200px width balances brand presence with form-card prominence. Phase 11 BrandLogo intrinsic ratio 5.96:1 → 33.5px height.

---

## Mobile responsive scaling (< 420px)

| Option | Description | Selected |
|---|---|---|
| Scale to max(140px, 50vw) | clamp(140px, 50vw, 200px); smooth scaling | ✓ |
| Fixed size, no scaling | Stays 200px on all viewports | |
| Hide logo on < 480px | Replace with plain-text on narrow | |

**Notes:** CSS clamp() avoids breakpoint snapping. 140px minimum preserves wordmark legibility at extreme narrow widths (< 280px).

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` Claude's Discretion subsection — CSS location, aria-label key reuse, link wrapper choice.

## Deferred Ideas

Captured in `<deferred>` section of CONTEXT.md — color refresh carry-forward from Phase 14, future logo size variations, animated entrance, mobile-first redesign, public-page hero copy.
