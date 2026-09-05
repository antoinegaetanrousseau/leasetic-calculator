# Phase 11: Design System Foundation + Brand Assets — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 18 (7 new components + 3 SVG assets + 1 dev route + 7 test files + 5 modified files)
**Analogs found:** 17 / 18 (one no-analog: `RetractableSidebar` localStorage + DOM-property-write pattern is novel)

> Codebase root: `/Users/antoinerousseau/Developer/leasetic-calculator/`
> All file references below are relative to this root unless otherwise stated.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/ui/Stepper.tsx` | component (server) | request-response (props → DOM) | `src/components/proposals/ValidityChip.tsx` + `src/components/proposals/ProposalRow.tsx` | role-match (chip uses derived-state class pattern + lucide-icon; Row uses Next-Link wrapping with aria-label) |
| `src/components/ui/RetractableSidebar.tsx` | component (client) | event-driven (toggle + localStorage + DOM-property-write) | `src/components/UserMenu.tsx` (state + useEffect + outside-click) + `src/components/ThemeToggle.tsx` (radiogroup pattern) + `src/components/LocaleToggle.tsx` (cycle pattern) | partial — no existing component combines localStorage persistence with HTML-element style write. See "No Analog Found" below. |
| `src/components/ui/MetricTile.tsx` | component (server) | request-response (props → DOM) | `src/components/proposals/DeletedChip.tsx` + `.card` / `.ctitle` utility classes in `app/globals.css` lines 114–141 | exact — same "small server component, css-var inline styles, single role on outer div" shape |
| `src/components/ui/AdminNavCard.tsx` | component (server) | request-response (Link wrapper) | `app/(admin)/[adminSegment]/page.tsx` lines 65–101 (existing `.card .admin-nav-card` Link pattern) + `src/components/proposals/ProposalRow.tsx` (Link with aria-label) | exact — Phase 9 already shipped a functionally identical card; v1.2 is a visual upgrade (48px icon-square instead of 48px raw icon) |
| `src/components/ui/StatusChip.tsx` | component (server) | request-response (variant → className) | `src/components/proposals/ValidityChip.tsx` + `src/components/proposals/DeletedChip.tsx` + `src/components/proposals/LanguageChip.tsx` | exact — three existing chip components share identical shape; StatusChip generalizes them |
| `src/components/ui/Shell.tsx` | component (server) | request-response (composes children) | `app/(authed)/layout.tsx` lines 31–102 (inline grid + sidebar + Topbar + main + footer) + `app/(admin)/[adminSegment]/layout.tsx` lines 62–133 (same structure for admin) | exact — Shell is an extract-method refactor of these two identical layout bodies |
| `src/components/ui/BrandLogo.tsx` | component (server) | request-response (props → 2× `<img>`) | no direct analog (no existing image-wrapper helper). Closest: `src/components/Topbar.tsx` (CSS-var inline styles + i18n `t()`) | role-match — pattern is "tiny server component, no state, inline styles, optional className" |
| `public/logo-light.svg` | static asset | file-I/O (HTTP served) | `public/fonts/*.woff2` (existing static assets in `public/fonts/`) | role-match — drop-in static asset, no build-step |
| `public/logo-dark.svg` | static asset | file-I/O | same as above | role-match; **BLOCKED — user has not supplied dark variant** per CONTEXT D-08 / UI-SPEC §11.1 |
| `public/logo-mark.svg` | static asset | file-I/O | same as above | role-match — derived from `logo-light.svg` by stripping wordmark path |
| `app/dev/components/page.tsx` | page (server, dev-only) | request-response | `app/(admin)/[adminSegment]/page.tsx` (server component with grid + multiple section blocks) | role-match — same "compose lots of children server-side" shape |
| Vitest tests (7 files) | test | (verification) | `src/lib/i18n/format.test.ts` + `src/lib/i18n/dictionaries.test.ts` + `src/lib/pdf/document.test.tsx` | **partial — no DOM-rendering tests exist yet**; see "Shared Patterns > Testing" |
| **MODIFIED** `src/components/Topbar.tsx` | component (server) | request-response | self (current file) — refactor in place | exact — drop 2 imports + 2 JSX lines + 1 prop |
| **MODIFIED** `app/(authed)/layout.tsx` | layout (server) | request-response | self — replace body with `<Shell>{children}</Shell>` | exact — straight replacement |
| **MODIFIED** `app/(admin)/[adminSegment]/layout.tsx` | layout (server) | request-response | self — replace body with `<Shell isAdmin>{children}</Shell>` | exact — same as authed |
| **MODIFIED** `app/globals.css` | stylesheet | (token spine) | self — append new declarations + rewrite `.chip-expired` | exact — extension pattern from Phases 7/8/9 |
| **MODIFIED** `src/lib/i18n/dictionaries.ts` | data (i18n dict) | (lookup) | self — append 11 sidebar.* keys × 2 langs per existing alphabetized section | exact — bracket-key string-literal pattern |

---

## Pattern Assignments

### `src/components/ui/Stepper.tsx` (server component, request-response)

**Analog:** `src/components/proposals/ValidityChip.tsx` (state→class mapping, lucide icon, server-side) + `src/components/proposals/ProposalRow.tsx` (Next `<Link>` wrapping with aria-label).

**Imports pattern** (copy from `ValidityChip.tsx` lines 1–3 + `ProposalRow.tsx` line 1):
```typescript
import Link from 'next/link';
import { Check } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';
```
> `Link` only imported when `hrefForStep` prop is provided. **Do NOT add `'use client'`** — Stepper is a server component (CONTEXT specifics: "Step state derives from URL pathname… render server-side").

**State-derivation pattern** (mirror `ValidityChip.tsx` lines 24–30):
```typescript
// Each step's state is derived from props at render time — no useState, no useEffect.
const stepState: 'active' | 'done' | 'pending' =
  completedSteps.includes(n) && n !== currentStep
    ? 'done'
    : n === currentStep
      ? 'active'
      : 'pending';
const circleClassName =
  stepState === 'active' ? 'stepper-circle stepper-circle--active'
  : stepState === 'done' ? 'stepper-circle stepper-circle--done'
  : 'stepper-circle stepper-circle--pending';
```

**Inline CSS-var style pattern** (copy convention from `Topbar.tsx` lines 26–41):
```typescript
<ol
  role="list"
  style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    boxShadow: 'var(--shadow-card)',
    padding: '20px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    listStyle: 'none',
  }}
>
  {/* ... <li> items + connector spans ... */}
</ol>
```

**Lucide icon usage** (copy from `ValidityChip.tsx` line 35 + `UserMenu.tsx` line 124):
```typescript
<Check size={16} strokeWidth={2.5} aria-hidden="true" />
```

**Conditional Link wrap pattern** (copy from `ProposalRow.tsx` line 30):
```typescript
{stepState === 'done' && hrefForStep ? (
  <Link href={hrefForStep(n as 1|2|3)} aria-label={stepLabels[n-1]}>
    {/* circle + label */}
  </Link>
) : (
  <span>{/* circle + label */}</span>
)}
```

**Reference for focus-ring** (copy from `app/globals.css` lines 331–336 — `.btn-green:focus-visible` rule):
```css
/* Stepper step-circle focus pattern (when wrapped in <Link>) */
.stepper-circle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18);
}
```
> Add this to `app/globals.css` alongside the existing `.btn-green:focus-visible` block.

---

### `src/components/ui/RetractableSidebar.tsx` (client component, event-driven)

**Analog:** `src/components/UserMenu.tsx` (closest existing client component with `useState` + `useEffect` + DOM-event handlers) + `src/components/ThemeToggle.tsx` (radiogroup with options-array map) + `src/components/LocaleToggle.tsx` (cycle pattern).

**`'use client'` + imports pattern** (copy from `UserMenu.tsx` lines 1–7 + `ThemeToggle.tsx` lines 1–4):
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home, Plus, ScrollText, HelpCircle,
  LayoutDashboard, Sliders, Users, History,
  ChevronLeft, ChevronRight, Sun, Moon, Monitor,
} from 'lucide-react';
import { startTransition } from 'react';
import { setTheme } from '@/lib/theme/actions';
import { setLang } from '@/lib/i18n/actions';
import { t, type Lang } from '@/lib/i18n/dictionaries';
```

**localStorage read-on-mount pattern** (copy structure from `UserMenu.tsx` useEffect lines 29–51 — the cleanup+listener shape; NEW: localStorage read):
```typescript
const [collapsed, setCollapsed] = useState(false); // SSR default

useEffect(() => {
  // PITFALL: localStorage is window-only — must read inside useEffect, not at module scope.
  const stored = window.localStorage.getItem('leasetic.sidebar.collapsed');
  if (stored === 'collapsed') {
    setCollapsed(true);
  }
}, []);

// Toggle handler also writes localStorage + the CSS custom prop for Shell grid (UI-SPEC §6.7 Option B):
const toggle = () => {
  setCollapsed((c) => {
    const next = !c;
    window.localStorage.setItem('leasetic.sidebar.collapsed', next ? 'collapsed' : 'expanded');
    document.documentElement.style.setProperty(
      '--shell-sidebar-current-w',
      next ? '72px' : '260px'
    );
    return next;
  });
};
```
> **Cross-reference for `documentElement.style.setProperty`:** the only existing instance is `src/lib/theme/no-flash-script.ts` line 25 (`document.documentElement.setAttribute('data-theme',t)`). Use the same access pattern for the new style-property write.

**Lang/theme toggle reuse pattern** (copy server-action wiring from `LocaleToggle.tsx` lines 17–32 + `ThemeToggle.tsx` lines 23–43):
```typescript
// Expanded state: render LocaleToggle + ThemeToggle as full-width segments.
// Per UI-SPEC §11.3 Recommendation: Path A — add optional `fullWidth?: boolean` prop
// to the existing LocaleToggle / ThemeToggle so the wrapper switches to
// `display: flex; width: 100%;` and each segment gets `flex: 1`.

<LocaleToggle current={lang} fullWidth /> // PROPOSED prop addition
<ThemeToggle current={theme} fullWidth />

// Collapsed state: bypass the existing components, render a single 36×28 / 36×36 pill
// that calls the same server actions directly. Action calls:
onClick={() => startTransition(() => { void setLang(lang === 'fr' ? 'en' : 'fr'); })}
onClick={() => startTransition(() => { void setTheme(nextTheme); })}
```

**Nav-item active-state class pattern** (NEW utility class — extends `.toggle-pill` and `.admin-nav-card` from `app/globals.css`):
```typescript
// Per-item active/inactive style (inline-style pattern matching Topbar.tsx):
const navItemStyle: React.CSSProperties = isActive
  ? {
      background: 'rgba(18,150,87,0.10)', // --active-pill at lower 10% per UI-SPEC §4.2
      color: 'var(--ink)',
      fontWeight: 600,
    }
  : {
      background: 'transparent',
      color: 'var(--muted)',
      fontWeight: 500,
    };
```

**aria-expanded chevron toggle pattern** (copy idiom from `UserMenu.tsx` lines 67–70):
```typescript
<button
  type="button"
  aria-expanded={!collapsed}
  aria-controls="leasetic-sidebar-nav"
  aria-label={collapsed ? t('sidebar.expand', lang) : t('sidebar.collapse', lang)}
  onClick={toggle}
>
  {collapsed ? <ChevronRight size={16} strokeWidth={1.6} /> : <ChevronLeft size={16} strokeWidth={1.6} />}
</button>
```

---

### `src/components/ui/MetricTile.tsx` (server component, request-response)

**Analog:** `src/components/proposals/DeletedChip.tsx` (smallest server component in codebase, ~22 LOC, pure prop→DOM) + `.card` / `.ctitle` rules in `app/globals.css` lines 114–141.

**Imports pattern** (copy from `DeletedChip.tsx` lines 1–3):
```typescript
// No client imports — server component.
// No lucide icons needed for MetricTile per UI-SPEC §6.4.
import type { ReactNode } from 'react'; // only if sublabel typed as ReactNode; else omit
```

**Core prop-driven render pattern** (mirror `DeletedChip.tsx` lines 14–22 + `Topbar.tsx` lines 42–54 for inline-CSS-var style):
```typescript
export function MetricTile({ label, value, sublabel, variant }: MetricTileProps) {
  const valueColor =
    variant === 'month' ? 'var(--gd)'
    : variant === 'total' ? 'var(--navy)'
    : 'var(--gold)';

  return (
    <div
      role="group"
      aria-label={`${label}: ${value}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ /* matches existing .ctitle from globals.css */
        fontSize: '11.8px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        lineHeight: 1.4,
      }}>{label}</div>
      <div style={{
        fontSize: 24,
        fontWeight: 600,
        lineHeight: 1.3,
        color: valueColor,
      }}>{value}</div>
      {sublabel && (
        <div style={{
          fontSize: '12.5px',
          fontWeight: 500,
          color: 'var(--muted)',
          lineHeight: 1.4,
        }}>{sublabel}</div>
      )}
    </div>
  );
}
```
> Alternative: lift the inline styles into globals.css as `.metric-tile`, `.metric-tile__label`, `.metric-tile__value`, `.metric-tile__sublabel` (per UI-SPEC §6.4 styles block). Planner's call — both patterns are present in the codebase (inline for Topbar/UserMenu, class-based for chips/cards).

---

### `src/components/ui/AdminNavCard.tsx` (server component, request-response)

**Analog (EXACT):** `app/(admin)/[adminSegment]/page.tsx` lines 65–101 — Phase 9 already implemented this exact card shape inline. v1.2 lifts it to a reusable component and upgrades the icon-square to a 48×48 tinted square (was 48px raw icon).

**Existing rendering (the analog to copy + upgrade)** — `app/(admin)/[adminSegment]/page.tsx` lines 65–82:
```typescript
<Link
  href={`/${adminSegment}/coefficients`}
  className="card admin-nav-card"
  aria-label={t('admin.home.coefficients.title', lang)}
>
  <Settings2
    size={48}
    strokeWidth={1.4}
    color="var(--teal)"
    aria-hidden="true"
  />
  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginTop: 12 }}>
    {t('admin.home.coefficients.title', lang)}
  </div>
  <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
    {t('admin.home.coefficients.sub', lang)}
  </div>
</Link>
```

**Existing CSS chrome (preserve hover + focus from Phase 9)** — `app/globals.css` lines 457–470:
```css
.admin-nav-card {
  cursor: pointer;
  text-decoration: none;
  transition: box-shadow 150ms, border-color 150ms;
  display: block;
}
.admin-nav-card:hover {
  border-color: var(--teal);
  box-shadow: 0 2px 8px rgba(45, 122, 140, 0.12);
}
.admin-nav-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18);
}
```

**v1.2 upgrade pattern** (icon goes inside a 48×48 tinted square instead of being the visual itself; per UI-SPEC §6.5):
```typescript
// New class name `.admin-nav-card-v2` per UI-SPEC §6.5 to avoid collision.
// The icon-square accent uses the variant color at 10% opacity:
const accentRgb =
  variant === 'coefficients' ? '18, 150, 87'  // --gd
  : variant === 'partners'   ? '45, 122, 140' // --teal
  : '17, 44, 59';                              // --navy (history)

<Link
  href={href}
  className="admin-nav-card admin-nav-card-v2" // chain existing chrome + new v2 layout
  aria-label={`${title}: ${description}. ${openLabel}`}
>
  <div style={{
    width: 48, height: 48, borderRadius: 12,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: `rgba(${accentRgb}, 0.10)`,
  }}>
    <Icon size={24} strokeWidth={1.6} color={`var(--${variant === 'coefficients' ? 'gd' : variant === 'partners' ? 'teal' : 'navy'})`} aria-hidden={true} />
  </div>
  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4, color: 'var(--ink)' }}>{title}</div>
  <div style={{ fontSize: '14.5px', color: 'var(--muted)', lineHeight: 1.55,
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
    {description}
  </div>
  <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--teal)' }}>{openLabel}</div>
</Link>
```

---

### `src/components/ui/StatusChip.tsx` (server component, request-response)

**Analog (EXACT × 3):** `src/components/proposals/ValidityChip.tsx`, `src/components/proposals/DeletedChip.tsx`, `src/components/proposals/LanguageChip.tsx`. All three are 1-element `<span className="chip chip-{variant}">` server components.

**Smallest analog — copy structurally** (`DeletedChip.tsx` lines 14–22):
```typescript
export function DeletedChip({ deletedAt, lang }: DeletedChipProps) {
  const label = t('proposal.chip.deleted', lang).replace('{0}', formatDate(deletedAt, lang));
  return (
    <span className="chip chip-deleted">
      <Trash2 size={12} aria-hidden="true" />
      {label}
    </span>
  );
}
```

**StatusChip pattern** (caller passes label per UI-SPEC §6.6 — no internal i18n):
```typescript
import type { ReactNode } from 'react';

export interface StatusChipProps {
  variant: 'active' | 'draft' | 'expired' | 'disabled';
  label: string;
}

export function StatusChip({ variant, label }: StatusChipProps) {
  return <span className={`chip chip-${variant}`}>{label}</span>;
}
```

**Existing `.chip-*` base + variants** (`app/globals.css` lines 344–375 + 496–499):
```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 11.2px;
  font-weight: 600;
  line-height: 1.4;
}
.chip-active   { background: rgba(18, 150, 87, 0.12); color: var(--gd); }
.chip-deleted  { background: rgba(220, 38, 38, 0.08); color: var(--danger); }
.chip-disabled { background: rgba(220, 38, 38, 0.08); color: var(--danger); }
.chip-language { background: rgba(45, 122, 140, 0.10); color: var(--teal); }
/* CURRENTLY (v1.1) — REWRITE in Phase 11 per UI-SPEC §6.6: */
.chip-expired  { background: rgba(224, 133, 48, 0.12); color: var(--gold); }
```

**Phase 11 CSS work** (append to `app/globals.css` per UI-SPEC §6.6):
```css
/* ADD: */
.chip-draft {
  background: rgba(224, 133, 48, 0.12);
  color: var(--gold);
}

/* REWRITE existing .chip-expired (was gold; now muted gray per v1.2 design): */
.chip-expired {
  background: rgba(110, 113, 145, 0.12);
  color: var(--muted);
}
```
> **Regression watchlist:** `ValidityChip.tsx` line 27 uses `chip-expired`. After rewrite the expired proposal row visual shifts gold→muted-gray. Acceptable per UI-SPEC §11.2; smoke-test required.

---

### `src/components/ui/Shell.tsx` (server component, request-response)

**Analog (EXACT × 2):** `app/(authed)/layout.tsx` lines 31–102 + `app/(admin)/[adminSegment]/layout.tsx` lines 62–133. The two are 100% identical except for `isAdmin={true}` on the Topbar — Shell is a textbook extract-method refactor.

**Existing layout body to lift verbatim** — `app/(authed)/layout.tsx` lines 31–102:
```typescript
return (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'var(--shell-sidebar-w) 1fr',  // CHANGES in Phase 11 → var(--shell-sidebar-current-w) 1fr
      gridTemplateRows: 'var(--topbar-h) 1fr var(--footer-h)',
      minHeight: '100vh',
    }}
  >
    {/* Sidebar (rows 1-3, col 1) */}
    <aside
      style={{
        gridRow: '1 / 4',
        gridColumn: '1',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem 1rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '22px' }}>
        {t('sidebar.brand', lang)}
      </div>
    </aside>

    {/* Topbar (row 1, col 2) */}
    <Topbar displayName={displayName} email={u.email} lang={lang} theme={theme} isAdmin={role === 'admin'} />

    {/* Main content (row 2, col 2) */}
    <main style={{
      gridRow: '2', gridColumn: '2',
      background: 'var(--paper)',
      padding: '1.5rem 1.5rem 2rem',
      maxWidth: '1100px', width: '100%', margin: '0 auto',
    }}>
      {children}
    </main>

    {/* Footer (row 3, col 2) */}
    <footer style={{
      gridRow: '3', gridColumn: '2',
      background: 'var(--paper)',
      borderTop: '1px solid var(--border)',
      height: 'var(--footer-h)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '10.5px', color: 'var(--muted)',
    }}>
      {t('shell.footer.copyright', lang)}
    </footer>
  </div>
);
```

**Phase 11 changes inside the lifted Shell:**
1. **`<aside>` block replaced** with `<RetractableSidebar activeNav={activeNav} isAdmin={isAdmin} lang={lang} theme={theme} adminHrefs={...} />` (UI-SPEC §11.6 — admin hrefs passed as prop since RetractableSidebar is client and cannot read `process.env`).
2. **`gridTemplateColumns`** changes from `var(--shell-sidebar-w) 1fr` to `var(--shell-sidebar-current-w) 1fr` (UI-SPEC §6.7 Option B — declare `--shell-sidebar-current-w: 260px` default in `app/globals.css :root`; RetractableSidebar mutates it on `<html>` on toggle).
3. **`<Topbar>` props** lose `theme` (D-06 — Topbar refactor drops the ThemeToggle).

**Wrapper at call site** — replace `app/(authed)/layout.tsx` body with:
```typescript
return (
  <Shell
    isAdmin={role === 'admin'}
    lang={lang}
    theme={theme}
    displayName={displayName}
    email={u.email}
    activeNav="home" // or derived; planner decides
  >
    {children}
  </Shell>
);
```

---

### `src/components/ui/BrandLogo.tsx` (server component, request-response)

**Analog:** No direct image-wrapper helper exists. Closest patterns are `Topbar.tsx` (small server component with CSS-var styles) + `DeletedChip.tsx` (minimal prop→DOM shape).

**Pattern to follow** (per UI-SPEC §6.1):
```typescript
export interface BrandLogoProps {
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
}

export function BrandLogo({ width = 190, height = 32, alt = '', className = '' }: BrandLogoProps) {
  return (
    <span
      className={`brand-logo ${className}`.trim()}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <img className="brand-logo-light" src="/logo-light.svg" alt={alt} width={width} height={height} />
      <img className="brand-logo-dark"  src="/logo-dark.svg"  alt={alt} width={width} height={height} />
    </span>
  );
}
```

**Theme picker CSS** (add to `app/globals.css` — pattern matches existing `html[data-theme="dark"] .seed-banner` block at line 523):
```css
/* Brand-logo theme picker — rides the no-flash inline script that sets <html data-theme> before paint */
html[data-theme="light"] .brand-logo-dark  { display: none; }
html[data-theme="dark"]  .brand-logo-light { display: none; }
```

**Cross-reference for `data-theme`-driven hide-show** (the only existing precedent in the codebase): `app/globals.css` lines 102–105 (`html[data-theme="dark"] [data-pdf-surface]`) and lines 523–526 (`html[data-theme="dark"] .seed-banner`). Same selector strategy.

---

### `public/logo-light.svg`, `public/logo-dark.svg`, `public/logo-mark.svg` (static assets)

**Analog:** `public/fonts/*.woff2` (5 font files already shipped at `public/fonts/PlusJakartaSans-{300..700}.woff2`).

**Pattern:** drop SVG files at root of `public/`; no Next.js config changes needed. Files are served from `/{filename}` and fetched directly by `<img src="/logo-light.svg">`.

**SVG file contract per UI-SPEC §6.1:**

| File | viewBox | Mark fill | Wordmark fill | Source |
|---|---|---|---|---|
| `logo-light.svg` | `0 0 1192 200` | `#6DC388` | `#112C3B` | User already supplied at `~/Downloads/light mode logo.svg` |
| `logo-dark.svg` | `0 0 1192 200` | `#6DC388` | `#e6e9ef` | **BLOCKED — user has not supplied** (UI-SPEC §11.1) |
| `logo-mark.svg` | `0 0 200 200` | `#6DC388` | n/a (mark only) | Derive from `logo-light.svg` by stripping wordmark path |

**Verification per UI-SPEC AC-BL-04:** file payload contains literal `#6DC388` exactly once.

---

### `app/dev/components/page.tsx` (dev-only smoke route)

**Analog:** `app/(admin)/[adminSegment]/page.tsx` — server component that composes a grid of children with section headings + `t(...)` calls.

**Gating pattern (NEW — no existing analog for `NODE_ENV` route gating):**
```typescript
import { notFound } from 'next/navigation';

export default async function DevComponentsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound(); // hides the route in prod builds — same idiom as admin layout line 44
  }
  // ... render every component variant ...
}
```
> Cross-reference for `notFound()`: `app/(admin)/[adminSegment]/layout.tsx` lines 42–44.

**Multi-section render pattern** (copy from `app/(admin)/[adminSegment]/page.tsx` lines 36–104):
```typescript
return (
  <div>
    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
      Dev components smoke
    </h1>
    {/* Stepper section */}
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Stepper</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Stepper currentStep={1} completedSteps={[]} lang="fr" />
        <Stepper currentStep={2} completedSteps={[1]} lang="fr" />
        <Stepper currentStep={3} completedSteps={[1, 2]} lang="fr" />
      </div>
    </section>
    {/* ... repeat for MetricTile / AdminNavCard / StatusChip / BrandLogo ... */}
  </div>
);
```

---

### Vitest test files (one per component)

**Analog (partial):** `src/lib/i18n/format.test.ts` (describe/it/expect structure, vi.mock for server-only) + `src/lib/pdf/document.test.tsx` (the only existing `.test.tsx` — but it tests a pure async function, not React DOM output).

**Critical gap — no DOM testing infrastructure yet:**
- `vitest.config.ts` line 6 declares `environment: 'node'` (NOT `jsdom`).
- `package.json` has NO `@testing-library/react`, NO `jsdom`, NO `happy-dom`.
- Phase 11 requirement D-12 specifies "Vitest unit tests per component asserting prop-driven DOM output: e.g., `Stepper currentStep={2}` renders done check on step 1, filled circle on step 2, outlined circle on step 3. ~3–5 assertions per component."

**Plan implication:** Phase 11 plan must include a DOM-testing infrastructure setup task:
1. `pnpm add -D @testing-library/react @testing-library/jest-dom jsdom`
2. Update `vitest.config.ts` to `environment: 'jsdom'` (or use per-file `// @vitest-environment jsdom` directive).
3. Add `__tests__/setup.ts` (or equivalent) registering `@testing-library/jest-dom` matchers if used.
4. CONTEXT D-13 forbids Storybook/Playwright but does NOT forbid `@testing-library/react` — this is necessary for D-12 ACs.

**Reference test structure** (copy from `src/lib/i18n/format.test.ts` lines 1–25 for the describe/it/expect shape):
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper } from './Stepper';

describe('Stepper', () => {
  it('renders step 1 as active when currentStep=1 and completedSteps=[]', () => {
    render(<Stepper currentStep={1} completedSteps={[]} lang="fr" />);
    // assert: 3 list items present
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    // assert: step 1 has aria-current
    expect(screen.getByText('1').closest('li')).toHaveAttribute('aria-current', 'step');
    // assert: steps 2 and 3 have aria-disabled
    expect(screen.getByText('2').closest('li')).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders step 1 as done (with check icon) when currentStep=2 and completedSteps=[1]', () => {
    const { container } = render(<Stepper currentStep={2} completedSteps={[1]} lang="fr" />);
    // The Check icon from lucide-react renders <svg> — its presence inside step 1's <li> is the check
    expect(container.querySelector('li:first-child svg')).not.toBeNull();
  });
});
```

**Alternative path (no test infra):** Tests assert imports + prop-types at compile time only (TypeScript). Reject — does not meet D-12 AC criteria.

---

### `src/components/Topbar.tsx` (MODIFY — drop LocaleToggle + ThemeToggle)

**Analog:** self.

**Diff to apply** (`src/components/Topbar.tsx` lines 1–10 + 73–75):
```diff
-import { LocaleToggle } from './LocaleToggle';
-import { ThemeToggle } from './ThemeToggle';
 import { UserMenu } from './UserMenu';
 import { t, type Lang } from '@/lib/i18n';

 export interface TopbarProps {
   displayName: string;
   email: string;
   lang: Lang;
-  theme: 'light' | 'dark' | 'system';
   isAdmin?: boolean;
   pageTitle?: string;
 }

 export function Topbar({
   displayName,
   email,
   lang,
-  theme,
   isAdmin = false,
   pageTitle,
 }: TopbarProps) {
   // ...
-      <LocaleToggle current={lang} />
-      <ThemeToggle current={theme} />
       <UserMenu displayName={displayName} email={email} lang={lang} />
```

**Verification:** `grep -rn "theme=" app/ | grep "Topbar"` returns zero matches after refactor — confirms no caller still passes `theme` to Topbar.

---

### `app/(authed)/layout.tsx` (MODIFY — replace body with `<Shell>`)

**Analog:** self.

**Pattern:** preserve the existing data-loading prelude (lines 17–29: `requireUser()` → `getCurrentLang()` → `getCurrentTheme()` → `displayName` fallback), replace the return-body (lines 31–102) with a single `<Shell>...</Shell>` invocation:
```typescript
// Preserve verbatim — lines 17–29 of current file:
const { session, role } = await requireUser();
const lang = await getCurrentLang();
const theme = await getCurrentTheme();
const u = session.user as { email: string; displayName?: string | null; name?: string | null };
const displayName = u.displayName ?? u.name ?? u.email;

// REPLACED return:
return (
  <Shell
    isAdmin={role === 'admin'}
    lang={lang}
    theme={theme}
    displayName={displayName}
    email={u.email}
    activeNav="home" // pathname-derived; planner decides exact logic
  >
    {children}
  </Shell>
);
```

---

### `app/(admin)/[adminSegment]/layout.tsx` (MODIFY — replace body with `<Shell isAdmin>`)

**Analog:** self.

**Pattern:** same as authed, but `isAdmin={true}` AND the `adminSegment` is computed and may need to be passed to `RetractableSidebar` via Shell's prop chain (UI-SPEC §11.6). Preserve the existing prelude (lines 36–60: notFound gates + requireAdmin + lang/theme/user lookup):
```typescript
// Preserve verbatim — lines 36–60 of current file:
const { adminSegment } = await params;
const expected = process.env.ADMIN_URL_SEGMENT;
if (!expected || adminSegment !== expected) {
  notFound();
}
const { session } = await requireAdmin();
const lang = await getCurrentLang();
const theme = await getCurrentTheme();
const u = session.user as { email: string; displayName?: string | null; name?: string | null };
const displayName = u.displayName ?? u.name ?? u.email;

// REPLACED return — adminSegment passed through Shell for sidebar admin hrefs:
return (
  <Shell
    isAdmin={true}
    lang={lang}
    theme={theme}
    displayName={displayName}
    email={u.email}
    activeNav="admin-home"
    adminSegment={adminSegment} // UI-SPEC §11.6 — Shell forwards to RetractableSidebar's adminHrefs prop
  >
    {children}
  </Shell>
);
```

---

### `app/globals.css` (MODIFY — extend token spine + chip classes + brand-logo picker)

**Analog:** self — the file has already been extended 4× (Phases 7/8/9/10). Pattern: append new declarations at the bottom or in the matching topical block.

**Changes per UI-SPEC §6.1 + §6.3 + §6.6 + §6.7:**

1. **Add to `:root` block** (after line 22):
```css
--brand-mark: #6DC388;                /* UI-SPEC §4.4 — additive token, mark color in both modes */
--shell-sidebar-w-collapsed: 72px;    /* UI-SPEC §6.3 — NEW collapsed sidebar width token */
--shell-sidebar-current-w: 260px;     /* UI-SPEC §6.7 Option B — runtime-mutated grid column width */
```

2. **Add to `@theme` block** (after line 67):
```css
--color-brand-mark: var(--brand-mark);
```

3. **Add brand-logo CSS picker** (anywhere — match the existing `html[data-theme="dark"] .seed-banner` pattern at lines 523–526):
```css
html[data-theme="light"] .brand-logo-dark  { display: none; }
html[data-theme="dark"]  .brand-logo-light { display: none; }
```

4. **REWRITE `.chip-expired`** (line 362–365 current) per UI-SPEC §6.6 + §11.2:
```css
.chip-expired {
  background: rgba(110, 113, 145, 0.12);
  color: var(--muted);
}
```

5. **ADD `.chip-draft`** (place adjacent to other `.chip-*` rules around line 375):
```css
.chip-draft {
  background: rgba(224, 133, 48, 0.12);
  color: var(--gold);
}
```

6. **OPTIONAL — `.stepper-circle:focus-visible`** (if Stepper uses a global class for its focus ring; alternatively inline `style={{ boxShadow: ... }}` on focus event):
```css
.stepper-circle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18);
}
```

---

### `src/lib/i18n/dictionaries.ts` (MODIFY — add 11 sidebar.* keys × 2 langs)

**Analog:** self. Current file has 222+ keys per language. The sidebar.* namespace currently has ONLY `sidebar.brand` (lines 41 + 545). Phase 11 adds 11 more.

**Pattern** (insert into the existing sidebar/topbar/footer comment block at FR line 40 + EN line 544):
```typescript
// In dictionaries.fr (around line 41):
'sidebar.brand': 'Leasétic',
'sidebar.collapse': 'Réduire le menu',                  // NEW per UI-SPEC §7
'sidebar.expand': 'Déployer le menu',                   // NEW
'sidebar.lang.cycle': 'Changer de langue',              // NEW
'sidebar.theme.cycle': 'Changer de thème',              // NEW
'sidebar.eyebrow.navigation': 'NAVIGATION',             // NEW
'sidebar.nav.home': 'Accueil',                          // NEW
'sidebar.nav.proposalsNew': 'Nouvelle proposition',     // NEW
'sidebar.nav.history': 'Historique',                    // NEW
'sidebar.nav.help': 'Aide',                             // NEW
'sidebar.nav.adminHome': 'Tableau de bord',             // NEW
'sidebar.nav.adminCoefficients': 'Coefficients',        // NEW
'sidebar.nav.adminPartners': 'Partenaires',             // NEW
'sidebar.nav.adminHistory': 'Historique',               // NEW
```

EN mirror at line 545 area:
```typescript
'sidebar.brand': 'Leasétic',
'sidebar.collapse': 'Collapse menu',
'sidebar.expand': 'Expand menu',
'sidebar.lang.cycle': 'Change language',
'sidebar.theme.cycle': 'Change theme',
'sidebar.eyebrow.navigation': 'NAVIGATION',
'sidebar.nav.home': 'Home',
'sidebar.nav.proposalsNew': 'New proposal',
'sidebar.nav.history': 'History',
'sidebar.nav.help': 'Help',
'sidebar.nav.adminHome': 'Dashboard',
'sidebar.nav.adminCoefficients': 'Coefficients',
'sidebar.nav.adminPartners': 'Partners',
'sidebar.nav.adminHistory': 'History',
```

**Parity verification:** `src/lib/i18n/dictionaries.test.ts` lines 13–20 already enforces FR↔EN key parity. The new keys must be added to BOTH languages or the existing test fails.

**Discipline (from `dictionaries.ts` line 14):** "All values are string literals — no template literals at runtime, no interpolation." The new keys follow this verbatim.

---

## Shared Patterns

### Authentication (no change in Phase 11)
**Source:** `src/lib/auth/require.ts` (`requireUser`, `requireAdmin`)
**Apply to:** Phase 11 introduces no new auth surfaces. The two MODIFIED layout files KEEP their existing `requireUser()` / `requireAdmin()` prelude verbatim (UI-SPEC §6.7).
**Cross-ref:** `app/(authed)/layout.tsx` line 17, `app/(admin)/[adminSegment]/layout.tsx` line 49.

### i18n via `t(key, lang)` + Server Actions
**Source:** `src/lib/i18n/index.ts` (server-side) + `src/lib/i18n/dictionaries.ts` (pure `t()`) + `src/lib/i18n/actions.ts` (Server Actions for `setLang`).
**Apply to:** RetractableSidebar (uses both), Shell (passes `lang` down), Topbar refactor (preserves existing `t(...)` calls), BrandLogo (alt-text via consumer).

**Import discipline** (UI-SPEC §3 + `dictionaries.ts` line 9–11 note):
- **Server components** import from `@/lib/i18n`: gets `t`, `Lang`, `getCurrentLang`, `getCurrentTheme`.
- **Client components** import from `@/lib/i18n/dictionaries`: gets only `t`, `Lang` (no `next/headers` pollution).

**Concrete excerpt** (`Topbar.tsx` line 4):
```typescript
import { t, type Lang } from '@/lib/i18n';
```

**Concrete excerpt** (`ThemeToggle.tsx` line 4 + LocaleToggle.tsx line 5):
```typescript
// Client component imports from dictionaries (NOT from index.ts):
import type { Lang } from '@/lib/i18n/dictionaries';
import { setTheme } from '@/lib/theme/actions';
```

**Server Action call pattern** (`ThemeToggle.tsx` line 32):
```typescript
onClick={() => startTransition(() => { void setTheme(value); })}
```

### CSS-var inline-style pattern (project default)
**Source:** `Topbar.tsx` lines 26–41, `UserMenu.tsx` lines 71–80, `InviteUrlModal.tsx` lines 134–157, `ProposalRow.tsx` lines 32–63.
**Apply to:** Every new component in Phase 11. **Do NOT hardcode hex colors** — every color must be `var(--xxx)`. CONTEXT D-09 line 89 binds this.

**Concrete excerpt** (`Topbar.tsx` lines 27–40):
```typescript
style={{
  gridRow: '1',
  gridColumn: '2',
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  height: 'var(--topbar-h)',
  display: 'flex',
  // ...
}}
```

### Server-component-by-default discipline
**Source:** CONTEXT D-09 line 90: "Server components by default — most existing components are server-rendered; client-side state … requires `'use client'` boundary at the component file."
**Apply to:** Stepper, MetricTile, AdminNavCard, StatusChip, BrandLogo, Shell, dev/components/page = **server**. Only RetractableSidebar = **client** (manages collapsed state + localStorage).
**Pre-existing client components (top of file)**: `ThemeToggle.tsx` line 1, `LocaleToggle.tsx` line 1, `UserMenu.tsx` line 1, `InviteUrlModal.tsx` line 1, `SearchBar.tsx` line 1 — `'use client'` directive on line 1.

### Error handling (not in scope)
Phase 11 components have no data-fetching, no async paths, no error states owned at this layer (UI-SPEC §7 "Empty / error / loading states"). The two modified layouts preserve their existing `notFound()` paths verbatim.

### Lucide icon usage convention
**Source:** Every existing component file using icons (`Topbar`, `UserMenu`, `ThemeToggle`, `LocaleToggle`, `InviteUrlModal`, `SearchBar`, `ValidityChip`, `DeletedChip`, `app/(admin)/[adminSegment]/page.tsx`).
**Convention (binding):**
- Size: 12–17 px for inline-text icons; 24 px inside icon-squares; 48 px for hero icons.
- `strokeWidth={1.6}` is the project default (Topbar lines 73–75 idiom).
- Decorative icons get `aria-hidden="true"` (e.g., `DeletedChip.tsx` line 18, `ValidityChip.tsx` line 35).
- Color via `color="var(--xxx)"` attribute (not `style.color`) — see `ProposalRow.tsx` → no, ProposalRow uses style. **Pattern is mixed**; either works. The clearest example is `app/(admin)/[adminSegment]/page.tsx` line 73 `color="var(--teal)"` (attribute) vs `UserMenu.tsx` line 126 `style={{ color: 'var(--muted)' }}` (style). Planner picks; both pass.

### Testing convention
**Source:** Existing tests are pure-function tests (no React DOM). See "Vitest test files" section above for the gap analysis. **Phase 11 plan MUST include a DOM-testing infra setup task** to satisfy D-12.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/ui/RetractableSidebar.tsx` (the localStorage + `documentElement.style.setProperty` combination) | client component | event-driven | No existing client component combines: (a) `useState` for a UI flag, (b) `localStorage` read-on-mount + write-on-toggle, (c) DOM-property write to `<html>`. The closest analog is `src/lib/theme/no-flash-script.ts` (which writes `data-theme` on `<html>`) — but that's an inline-script string, not a React component. Planner should use the file's existing `documentElement.setAttribute` pattern as the reference and adapt it to `documentElement.style.setProperty`. |
| `app/dev/components/page.tsx` (the `NODE_ENV === 'production'` gate) | dev-only route | request-response | No existing precedent for `NODE_ENV`-gated routes. The recommendation (UI-SPEC D-11) is to call `notFound()` when in production — `notFound()` is used in `app/(admin)/[adminSegment]/layout.tsx` lines 42–44 for URL-segment gating. Same idiom, different condition. |
| `@testing-library/react` rendering tests | test | (verification) | Codebase has NO existing React DOM test. All `.test.tsx` files (only one — `src/lib/pdf/document.test.tsx`) test pure async functions, not component rendering. Phase 11 plan MUST add `@testing-library/react` + `jsdom` (or `happy-dom`) + update `vitest.config.ts` from `environment: 'node'` to `'jsdom'`. |
| `public/logo-light.svg` content payload | asset content | n/a | The user has supplied the source SVG at `~/Downloads/light mode logo.svg`; pattern is "copy file into `public/`". The structural pattern for `public/`-rooted assets is `public/fonts/*.woff2` (already shipped). |
| `public/logo-dark.svg` | asset content | n/a | **BLOCKER** — user has not supplied. See UI-SPEC §11.1. Planner schedules a task to request from user before Phase 11 ships ASSET-02 acceptance. |

---

## Metadata

**Analog search scope:** `src/components/` (10 files at root + 12 in `proposal/` + 13 in `proposals/`), `src/lib/i18n/` (5 files), `src/lib/theme/` (2 files), `app/` (layouts, pages, globals.css), `public/` (existing fonts directory).
**Files scanned:** 18 component/lib files + 3 layout/page files + 3 test files + 1 config file = **25 files**.
**Pattern extraction date:** 2026-05-11.
**Codebase root:** `/Users/antoinerousseau/Developer/leasetic-calculator/`.
