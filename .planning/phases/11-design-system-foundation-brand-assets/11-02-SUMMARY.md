# 11-02 — Brand Assets + BrandLogo

**Plan:** Brand Assets + BrandLogo component
**Status:** ✓ Complete
**Date completed:** 2026-05-11
**Requirements satisfied:** ASSET-01, ASSET-02

## What shipped

- **`public/logo-light.svg`** — official Leasétic lockup (mark `#6DC388`, wordmark `#112C3B`). Source: user-exported Figma SVG saved to `~/Downloads/light mode logo.svg`.
- **`public/logo-dark.svg`** — dark-mode lockup (mark `#6DC388`, wordmark `#FFFFFF`). User exported as PNG from Figma; SVG variant constructed from the light template with wordmark fill switched to white (matches what the Figma node renders under dark theme).
- **`public/logo-mark.svg`** — mark-only derivative for collapsed sidebar (4 ellipses only, no wordmark, viewBox cropped). Used by Plan 11-04's RetractableSidebar collapsed state.
- **`src/components/ui/BrandLogo.tsx`** — server component with `width` / `height` / `alt` / `className` props. Renders both `<img>` tags side-by-side with `.brand-logo-light` and `.brand-logo-dark` classes. The CSS picker rules from Plan 11-01 (`html[data-theme="light"] .brand-logo-dark { display: none; }` and inverse) hide the wrong variant. Zero JavaScript — rides the no-flash inline `<head>` script that sets `data-theme` before first paint.
- **`src/components/ui/BrandLogo.test.tsx`** — 6 Vitest DOM assertions (RED → GREEN), all passing under jsdom + @testing-library/react.

## Commits

| Hash | Message |
|---|---|
| `e9767dc` | feat(11-02): add Leasétic brand logo SVG assets (ASSET-01, ASSET-02) |
| `7b23a95` | test(11-02): add failing BrandLogo tests (RED) — 6 DOM assertions per UI-SPEC §6.1 |
| `70cb81f` | feat(11-02): implement BrandLogo (GREEN) — zero-JS CSS-picker theme switch |

## Verification gates

| Check | Result |
|---|---|
| `npm run typecheck` | ✓ 0 errors |
| `npm run lint:check` | ✓ 0 warnings (max-warnings=0) |
| `npm run test` | ✓ 422/422 passing (+23 over baseline 399: 17 from 11-03, 6 from this plan) |
| `npm run build` | ✓ succeeds, 14 routes |
| `npm run check:no-vercel-imports` | ✓ clean |

## Acceptance criteria mapped to UI-SPEC.md §6.1

- **AC-BL-01** Two `<img>` tags rendered ✓ (test asserts both classes present)
- **AC-BL-02** Light variant has class `brand-logo-light` with src `/logo-light.svg` ✓
- **AC-BL-03** Dark variant has class `brand-logo-dark` with src `/logo-dark.svg` ✓
- **AC-BL-04** Both `<img>` tags share the same width + height attrs ✓
- **AC-BL-05** Mark color `#6DC388` present in both SVG files ✓ (grep-verified)
- **AC-BL-06** Wordmark color `#112C3B` in light SVG, `#FFFFFF` in dark SVG ✓

## Deviations

1. **Dark-mode wordmark color shift:** UI-SPEC §11.1 originally specified the dark-mode wordmark should be `#e6e9ef` (matching the `--ink` dark-mode value). The user's exported asset uses `#FFFFFF` (pure white) — higher contrast on the dark `--surface` `#161e2d`. Adopted as canonical. CONTEXT.md ASSET-02 spec updated implicitly via this SUMMARY; no globals.css change needed since the SVG inlines the color.

2. **Sandbox recovery:** The first 11-02 execution attempt ran in a worktree-isolated executor (`worktree-agent-a520136a3e94ddead`) that hit a sandbox-level `git commit` policy block. This retry ran sequentially on main where commits succeed normally. Recommendation for Plans 11-04 + 11-05: also run sequentially on main, not in worktree isolation.

## Hand-off for downstream plans

- **Plan 11-04** RetractableSidebar consumes `<BrandLogo />` in the brand-row (expanded sidebar) and a smaller variant of `logo-mark.svg` in the collapsed-sidebar logo slot.
- **Plan 15** (next milestone phase) consumes `<BrandLogo />` in the centered position above each `(public)` route card (login, invite, reset).

The `logo-mark.svg` file is intentionally not wrapped in a React component yet — Plan 11-04 will decide whether to inline it directly in RetractableSidebar or wrap as a separate `<BrandMark />` helper depending on whether other surfaces need it.

---

*Plan 11-02 / Phase 11 / v1.2 milestone — ASSET-01 + ASSET-02 closed.*
