# Phase 11: Design System Foundation + Brand Assets - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 11-design-system-foundation-brand-assets
**Areas discussed:** Component file organization, Layout shell integration, Logo theme-switching mechanism, Verification approach for components

---

## Component file organization

| Option | Description | Selected |
|--------|-------------|----------|
| src/components/ui/ subfolder | Shadcn-style: put the 5 new primitives in src/components/ui/. Existing app-specific components stay flat | ✓ |
| Domain folders (layout/data/forms) | Reorganize all components into domain folders — bigger refactor | |
| Stay flat | All 12 components in src/components/ | |
| Co-locate with consumers | Stepper in proposal/, RetractableSidebar in shell/, etc. | |

**User's choice:** src/components/ui/ subfolder
**Notes:** Aligns with shadcn convention, keeps existing app-specific components (Topbar, UserMenu, LoginForm, etc.) untouched. Clean separation between design system primitives and feature components.

---

## Layout shell integration

| Option | Description | Selected |
|--------|-------------|----------|
| Slot RetractableSidebar into existing grid | Drop into existing aside slot, refactor Topbar internals only. Minimal disruption | |
| Build a new <Shell> wrapper component | Compose RetractableSidebar + Topbar + children. Replace layout.tsx contents with <Shell>{children}</Shell>. More declarative | ✓ |
| Keep Topbar + add sidebar as sibling | RetractableSidebar as sibling in layout, no shared wrapper. Two independent pieces | |

**User's choice:** Build a new <Shell> wrapper component
**Notes:** More declarative; localizes the layout grid setup inside one component instead of repeating it across (authed) and (admin) layouts. Aligns with the file-org decision — Shell lives in src/components/ui/.

---

## Logo theme-switching mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| CSS picker via [data-theme] | Two `<img>` tags, CSS toggles visibility. Zero JS, zero FOUC | ✓ |
| Single <Logo /> component reading data-theme | Client component reads dataset.theme on mount and swaps src. Flashes on reload | |
| Inline SVG with currentColor | Bundle SVG path as React component, wordmark uses currentColor | |
| next/image with theme prop | Use Next's Image with theme context. Heavy machinery for a logo swap | |

**User's choice:** CSS picker via [data-theme]
**Notes:** Rides the existing no-flash inline `<head>` script that sets `data-theme` before paint. Two static SVG files cached independently. Lowest complexity, best SSR alignment.

---

## Verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Dev-only /dev/components smoke route | New route at app/dev/components/page.tsx, gated by NODE_ENV. Renders every component+variant. Zero new deps | ✓ |
| Vitest only (no visual smoke) | Stay strictly data-only. Visual correctness verified inline when components ship in consuming phases | |
| Add Storybook | Full Storybook setup. ~30MB deps, separate build, CI integration | |
| Smoke route + Vitest + screenshot snapshots | Smoke route + Vitest + Playwright screenshots committed to repo | |

**User's choice:** Dev-only /dev/components smoke route
**Notes:** Stays aligned with v1.1's minimal-tooling stance. Smoke route handles visual verification; Vitest covers prop-driven behavior. No new deps. Gated by NODE_ENV so it returns 404 in production.

---

## Claude's Discretion

- Exact prop signatures for each component (extract from Figma node metadata during research/planning).
- Internal CSS class naming for new components (must use existing tokens; new utility classes welcome if they extend `.chip-*` / `.btn-*` patterns from `app/globals.css`).
- localStorage key naming convention for the RetractableSidebar collapsed/expanded preference.
- Whether `<Shell>` consumes server-side data via props or via a small server component that fetches once.
- Whether to colocate Vitest tests next to components or use a `__tests__` folder.

## Deferred Ideas

- **Storybook integration** — rejected for v1.2 per minimal-tooling stance. Reconsider in v1.3+ if component library grows beyond ~15 primitives.
- **Playwright visual regression** — same reasoning. Manual Chrome+Edge smoke continues.
- **Migrating existing flat components into `src/components/ui/`** — out of scope; only NEW design system primitives go to `ui/`. Existing files stay flat.
- **`<Shell>` Storybook stories** — covered by the dev-only smoke route instead.
- **Component theming variants beyond Light/Dark** — own v1.3+ phase if ever needed (e.g., high-contrast, accessibility mode).
- **Domain-folder reorganization (`src/components/{layout,forms,data-display}/`)** — rejected. May revisit when component count exceeds ~20.
