# Phase 15: Public Surface Brand Polish - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 3 (2 modified + 1 created/updated test)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/(public)/layout.tsx` (MODIFY) | layout | server-render | itself (lines 56-68) + `src/components/ui/BrandLogo.tsx` (consumed) | exact |
| `app/globals.css` (MODIFY — append) | stylesheet | n/a | `app/globals.css` lines 543-545 (Phase 11 `.brand-logo` family) | exact |
| `app/(public)/layout.test.tsx` (CREATE) | test | n/a | `src/components/ui/BrandLogo.test.tsx` | role-match (component-render-and-assert pattern) |

All three files have strong analogs already present in the codebase — Phase 15 is a swap-and-extend, not a green-field write.

## Pattern Assignments

### `app/(public)/layout.tsx` (layout, server-render)

**Analog:** the file itself — the block being replaced (lines 56-68) and the surrounding chrome that stays unchanged.

**Imports pattern** (line 1 — add `BrandLogo` to the existing import cluster):
```typescript
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
// ADD:
import { BrandLogo } from '@/components/ui/BrandLogo';
```

The existing imports use the `@/components/...` alias for `src/components/...`. The `BrandLogo` lives at `src/components/ui/BrandLogo.tsx`, so the import path is `@/components/ui/BrandLogo` (named export, not default — see component contract below).

**Block being removed** (`app/(public)/layout.tsx` lines 56-68 — VERBATIM):
```tsx
{/* Leasétic logo — displayed above the card, weight 700, 22px, color --navy */}
<div
  style={{
    fontWeight: 700,
    color: 'var(--navy)',
    fontSize: 22,
    marginBottom: 16,
    userSelect: 'none',
  }}
>
  {/* Brand name — from dictionary (sidebar.brand = 'Leasétic', same in FR + EN) */}
  {t('sidebar.brand', lang)}
</div>
```

**Block replacing it** (per UI-SPEC §6.1 exact invocation):
```tsx
<BrandLogo
  className="public-page-logo"
  alt={t('sidebar.brand', lang)}
/>
```

**Preserved chrome (DO NOT TOUCH):**
- Lines 27-40: outer `<div>` with paper bg + flex-center layout + `padding: 24px 16px`
- Lines 42-54: top-right `position: absolute` toggle cluster (`top: 24, right: 24, gap: 12, zIndex: 10`)
- Line 71: `{children}` (the per-route form card)
- Lines 73-93: footer (copyright + Mentions légales link)

The swap is one block in the middle of an otherwise-preserved file.

---

### `app/globals.css` (stylesheet — append after Phase 11 brand-logo selectors)

**Analog:** `app/globals.css` lines 543-545 — the Phase 11 `.brand-logo` family.

**Existing Phase 11 selectors** (VERBATIM — do not modify, only append after):
```css
/* === Phase 11 brand-logo theme picker (UI-SPEC §6.1, D-09) === */
html[data-theme="light"] .brand-logo-dark  { display: none; }
html[data-theme="dark"]  .brand-logo-light { display: none; }
```

**Pattern to copy:**
1. Use a `=== Phase NN purpose ===` banner comment before the new block (matches the lines 543, 547 banner convention).
2. Reference UI-SPEC sections and D-decisions inline in the banner.
3. Append at the end of the file (after the Phase 11 Stepper rule at lines 547-551 or wherever the most recent phase ends).

**New block to insert** (per UI-SPEC §6.3 exact CSS declaration):
```css
/* === Phase 15 public-page logo sizing (PUB-01, PUB-02 — UI-SPEC §6.3, D-08) === */
.public-page-logo {
  /* D-02 + D-05: 200px desktop, clamps down to 140px floor on narrow viewports */
  width: clamp(140px, 50vw, 200px);
  /* D-07: aspect-ratio preserved by SVG viewBox 1192:200 ≈ 5.96:1 */
  height: auto;
  /* Phase 11 BrandLogo wrapper default; restated here to make .public-page-logo standalone */
  display: inline-block;
  /* D-04: gap between logo and form card below — matches v1.1 plain-text marginBottom: 16 */
  margin-bottom: 16px;
}
.public-page-logo img {
  /* Force the inner <img> to fill the wrapper width (Phase 11 default has width attr=190) */
  width: 100%;
  height: auto;
  display: block;
}
```

**Why the cascade rule on `.public-page-logo img` is required:**
Phase 11's `<BrandLogo>` renders `<img>` tags with literal HTML `width=190 height=32` attributes (BrandLogo.tsx lines 41-42, 49-50). Sizing the wrapper `<span>` via `clamp()` alone does NOT shrink the inner `<img>` — the HTML attributes take precedence over auto. The `.public-page-logo img { width: 100% }` cascade overrides the HTML attrs and forces the `<img>` to fill the clamped wrapper.

---

### `app/(public)/layout.test.tsx` (test — new file)

**Analog:** `src/components/ui/BrandLogo.test.tsx` — closest existing test that renders a component and asserts on its DOM output (class names, `<img>` tags, alt text). No existing layout test exists.

**Imports + boilerplate pattern** (BrandLogo.test.tsx lines 1-5):
```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

afterEach(() => cleanup());
```

**For the layout test, adapt to:**
```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
// Note: PublicLayout is async (server component) — must await its rendered output.
// Mock @/lib/i18n's getCurrentLang/getCurrentTheme/t to avoid Next.js cookie() server-only deps.
```

**Core assertion pattern** (BrandLogo.test.tsx lines 22-34 — adapt selectors for layout):
```typescript
it('renders <span class="brand-logo public-page-logo"> in the public layout', async () => {
  const ui = await PublicLayout({ children: <div data-testid="child" /> });
  const { container } = render(ui);

  const logo = container.querySelector('span.brand-logo.public-page-logo');
  expect(logo).not.toBeNull();

  const imgs = logo?.querySelectorAll('img');
  expect(imgs).toHaveLength(2);
  expect(imgs?.[0]).toHaveClass('brand-logo-light');
  expect(imgs?.[1]).toHaveClass('brand-logo-dark');
});
```

**Negative assertion pattern** (per UI-SPEC §9.1 assertion #4 — assert plain-text header is gone):
```typescript
it('does NOT render the v1.1 plain-text Leasétic header', async () => {
  const ui = await PublicLayout({ children: null });
  const { container } = render(ui);

  // The old block had inline style fontSize: 22 + fontWeight: 700 on a <div> containing 'Leasétic'
  const oldHeader = Array.from(container.querySelectorAll('div')).find(
    (d) => d.style.fontSize === '22px' && d.style.fontWeight === '700'
  );
  expect(oldHeader).toBeUndefined();
});
```

**Server component mocking note:**
`PublicLayout` is `async` and calls `getCurrentLang()` / `getCurrentTheme()` (which read Next.js cookies — server-only). The test must `vi.mock('@/lib/i18n', ...)` to stub these. Look at how Phase 6 / Phase 11 tested any async server components for the established mocking convention (none of the listed test files render server components — this may be the first; the planner should call this out as a small new convention).

## Shared Patterns

### `BrandLogo` consumption convention
**Source:** `src/components/ui/BrandLogo.tsx` (Phase 11 contract, lines 13-22 prop signature; lines 24-54 render contract)
**Apply to:** the single new invocation in `app/(public)/layout.tsx`
```typescript
// Named import (not default):
import { BrandLogo } from '@/components/ui/BrandLogo';

// Invocation: width/height props OMITTED — CSS class drives sizing
<BrandLogo className="public-page-logo" alt={t('sidebar.brand', lang)} />
```
Phase 11's component prepends `brand-logo` to any `className` you pass, so the rendered wrapper class is `"brand-logo public-page-logo"` — exactly what the new CSS targets.

### i18n key reuse convention
**Source:** `src/lib/i18n/dictionaries.ts` line 41 (FR) + line 707 (EN) — both return `'Leasétic'`
**Apply to:** the BrandLogo `alt` prop in `app/(public)/layout.tsx`
```typescript
alt={t('sidebar.brand', lang)}  // returns 'Leasétic' in both languages
```
No new dictionary keys are added by Phase 15 (per UI-SPEC §7 + CONTEXT decisions row).

### CSS banner-comment convention
**Source:** `app/globals.css` line 543 (Phase 11 banner) + line 547 (Phase 11 Stepper banner)
**Apply to:** the new `.public-page-logo` block
```css
/* === Phase NN purpose (requirement IDs — UI-SPEC §X.Y, D-NN) === */
```
Establishes the phase boundary and cross-references the spec inline.

## No Analog Found

None. All three target files have strong analogs in the existing codebase.

## Metadata

**Analog search scope:**
- `app/(public)/` — public route directory (the layout's home)
- `app/globals.css` — Phase 11 brand-logo selectors (lines 543-545)
- `src/components/ui/BrandLogo.tsx` — Phase 11 component contract
- `src/components/ui/*.test.tsx` — existing component test patterns (BrandLogo, MetricTile, RetractableSidebar, StatusChip, AdminNavCard, Stepper)
- `src/lib/i18n/dictionaries.ts` — i18n key existence check (`sidebar.brand` lines 41 + 707)

**Files scanned:** 8 (2 target files + 6 analog candidates)
**Pattern extraction date:** 2026-05-21
