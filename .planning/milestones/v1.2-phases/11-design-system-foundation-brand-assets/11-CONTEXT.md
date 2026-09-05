# Phase 11: Design System Foundation + Brand Assets - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the v1.2 reusable component library and ship the Leasétic brand-logo assets that every downstream UI phase (13 wizard, 14 admin polish, 15 public surfaces) will consume. Five new components — `Stepper`, `RetractableSidebar`, `MetricTile`, `AdminNavCard`, `StatusChip` — plus two SVG logo assets (`logo-light.svg`, `logo-dark.svg`) and a new shell wrapper that composes the sidebar with the existing Topbar.

**In scope:** the 5 components, the 2 SVG assets, the new `<Shell>` wrapper, dev-only smoke route, refactor of `src/components/Topbar.tsx` to drop LocaleToggle/ThemeToggle (moved into RetractableSidebar).

**Out of scope:** wiring the new components into the consuming pages (Phases 13–15 do that), DB changes (Phase 12), public-route layouts (Phase 15).

</domain>

<decisions>
## Implementation Decisions

### File organization
- **D-01:** New design system primitives live in `src/components/ui/` (Stepper.tsx, RetractableSidebar.tsx, MetricTile.tsx, AdminNavCard.tsx, StatusChip.tsx). Shadcn-style convention.
- **D-02:** Existing app-specific components (Topbar, UserMenu, LocaleToggle, ThemeToggle, LoginForm, SetPasswordForm, InviteUrlModal) stay flat at `src/components/`. No reshuffle.
- **D-03:** The new `<Shell>` wrapper also lives in `src/components/ui/Shell.tsx`.

### Layout shell integration
- **D-04:** Build `<Shell>` as a wrapper component that composes `<RetractableSidebar />` + `<Topbar />` + `{children}` in a 2-column CSS grid (sidebar | topbar/main).
- **D-05:** Replace contents of `app/(authed)/layout.tsx` and `app/(admin)/[adminSegment]/layout.tsx` with `<Shell>{children}</Shell>`. Both layouts pass `isAdmin` to Shell for the ADMIN-pill rendering in Topbar.
- **D-06:** Refactor `src/components/Topbar.tsx` to remove the internally-rendered `<LocaleToggle />` and `<ThemeToggle />` — they relocate to the bottom of `<RetractableSidebar />`. Topbar keeps `pageTitle`, `isAdmin`, and renders only title + ADMIN pill (transparent fills per `v1.2-CONTEXT.md` chrome rule) + `<UserMenu />` on the right.
- **D-07:** Existing CSS grid setup in (authed)/(admin) layouts is preserved — `<Shell>` slots into the same grid columns. No layout grid refactor needed.

### Logo theme-switching mechanism
- **D-08:** Both logo SVGs ship as static files in `public/`: `public/logo-light.svg` (wordmark `#112C3B`) and `public/logo-dark.svg` (wordmark light ink). Mark color `#6DC388` constant in both.
- **D-09:** Render both `<img>` tags inside a small `<BrandLogo />` helper component. CSS picker via the existing `data-theme` attribute on `<html>`:
  ```css
  html[data-theme="light"] .brand-logo-dark { display: none; }
  html[data-theme="dark"]  .brand-logo-light { display: none; }
  ```
  Zero JS, zero FOUC — rides the existing no-flash inline `<head>` script that sets `data-theme` before paint.
- **D-10:** Add a new CSS custom property `--brand-mark: #6DC388` to `app/globals.css` `@theme` block. Same value in both modes (mark color stays constant across themes per Figma design).

### Verification approach
- **D-11:** Build a dev-only smoke route at `app/dev/components/page.tsx`. Renders every component variant on one page: Stepper in all 3 states × 3 step positions, RetractableSidebar in expanded + collapsed, MetricTile in green/navy/gold, AdminNavCard with each icon, StatusChip in 4 variants, BrandLogo light + dark. Gated by `NODE_ENV !== 'production'` — returns 404 in prod builds.
- **D-12:** Vitest unit tests per component asserting prop-driven DOM output: e.g., `Stepper currentStep={2}` renders done check on step 1, filled circle on step 2, outlined circle on step 3. ~3–5 assertions per component. No snapshot tests.
- **D-13:** No Storybook, no Playwright screenshot regression. Stay aligned with v1.1's minimal-tooling stance.

### Claude's Discretion
- Exact prop signatures for each component (extract from Figma node metadata + the 5-phase RetractableSidebar localStorage key naming pattern)
- Internal CSS class names for new components (must use existing tokens; new utility classes welcome if they extend `.chip-*` / `.btn-*` patterns from `app/globals.css`)
- Whether `<Shell>` consumes server-side data via props or via a small server component that fetches once
- Whether to colocate Vitest tests next to components or use a `__tests__` folder

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (mandatory reading for any UI work)
- `.planning/milestones/v1.2-CONTEXT.md` — Figma design contract; full design system token list (23 brand variables, 13 text styles, 2 effect styles), 3-layer fill rule (shell white / canvas paper / cards white), chrome-fill table, 9-page inventory with Figma node IDs
- Figma file key `vwOzirhL0vyxDWq4m6t4gC` — opens at https://www.figma.com/design/vwOzirhL0vyxDWq4m6t4gC/ ; use `get_design_context` MCP calls per-node when implementing each component

### Project/requirements
- `.planning/REQUIREMENTS.md` — full requirement text for COMP-01..05 and ASSET-01..02 (7 requirements covered by this phase)
- `.planning/PROJECT.md` §Current Milestone — v1.2 goal and out-of-scope list

### Existing design system tokens (must reuse, do not duplicate)
- `app/globals.css` lines 7–78 — CSS custom properties for `--navy`, `--gd`, `--teal`, `--paper`, `--surface`, `--ink`, `--muted`, `--border`, `--gold`, `--danger`, plus radius/layout dims. Add `--brand-mark: #6DC388` here (D-10).
- `app/globals.css` lines 114–528 — `.card`, `.ctitle`, `.fld`, `.btn-green/.btn-navy/.btn-out`, `.chip-*`, `.search-bar`, `.toggle-pill`, `.admin-nav-card`, `.accounts-row` utility classes. `StatusChip` extends `.chip-*` per D-11.

### Codebase patterns to follow
- `src/components/Topbar.tsx` — current chrome implementation; shows the CSS-grid placement pattern and use of CSS custom properties via inline styles. RetractableSidebar can follow the same inline-style + CSS-var pattern, OR migrate to Tailwind utilities (planner's call).
- `src/components/ThemeToggle.tsx`, `src/components/LocaleToggle.tsx` — existing toggles that get re-parented into RetractableSidebar's bottom region. Read these before refactoring.
- `app/layout.tsx` — has the no-flash inline `<script>` that sets `data-theme` before first paint. The CSS picker in D-09 depends on this.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/Topbar.tsx` — current top-bar with 2-column CSS grid placement (gridColumn: '2'). The grid is already set up in the parent layouts; Shell just needs to fill the sidebar slot.
- `src/components/ThemeToggle.tsx` + `src/components/LocaleToggle.tsx` — drop-in reusable, just move their rendering location from Topbar to RetractableSidebar bottom.
- `src/components/UserMenu.tsx` — stays in Topbar, no refactor needed.
- `app/globals.css` `.chip-active`, `.chip-expired`, `.chip-deleted`, `.chip-language` — StatusChip's `active`, `expired`, `disabled` variants can map directly; new `chip-draft` (gold tint) needs adding for the `draft` variant.

### Established Patterns
- **CSS Custom Properties for theme tokens** — every color used in the codebase is `var(--xxx)`. New components must do the same; no hex hardcoding.
- **Inline-style components with CSS-var refs** — current Topbar uses `style={{ background: 'var(--surface)' }}`. Acceptable; planner may choose Tailwind v4 utility classes instead for the new components since `app/globals.css` exposes the tokens via `@theme`.
- **Server components by default** — most existing components are server-rendered; client-side state (e.g., RetractableSidebar's collapsed/expanded toggle, Stepper's clickable navigation) requires `'use client'` boundary at the component file.
- **i18n via `t('key', lang)` helpers** — see `Topbar.tsx` line 4. Any user-facing strings in new components must use this pattern, not bare French strings.

### Integration Points
- `app/(authed)/layout.tsx` — currently renders Topbar + main, with sidebar slot likely empty. Replace contents with `<Shell isAdmin={false}>{children}</Shell>`.
- `app/(admin)/[adminSegment]/layout.tsx` — currently same Topbar but `isAdmin=true`. Replace with `<Shell isAdmin={true}>{children}</Shell>`.
- `app/layout.tsx` — no changes; the no-flash script and font registration stay as-is. The `@theme` block in `app/globals.css` gets `--brand-mark` added (D-10).
- `public/` — drop logo-light.svg and logo-dark.svg files at the root of this folder. No `next.config` changes needed.

</code_context>

<specifics>
## Specific Ideas

- **Logo SVG source:** the user has already provided `light mode logo.svg` (in `~/Downloads/`) — the official 4-ellipse clover + "Leasetic" wordmark lockup at viewBox 0 0 1192 200. Mark is `#6DC388`, wordmark `#112C3B`. The dark-mode variant has not yet been provided — the user needs to supply `dark mode logo.svg` (same shape, wordmark in light ink) before this phase ships. Note this as a Phase-11 blocker for ASSET-02 specifically.
- **Existing `--green`, `--gd`, `--gl` tokens stay:** the user explicitly noted in MILESTONE-CONTEXT.md that `--brand-mark: #6DC388` is *additive* — none of the existing green tokens migrate. This means `--brand-mark` is consumed ONLY by the logo SVG (via the new BrandLogo component); other UI continues using `--gd` / `--green` / `--gl`.
- **`StatusChip` variant `draft`:** needs a new CSS class `.chip-draft` (gold tint) added to `app/globals.css` because v1.1 only has `.chip-active`, `.chip-expired`, `.chip-deleted`, `.chip-language`. Existing CSS classes for `active` and `expired` map directly to StatusChip variants; `disabled` maps to existing `.chip-deleted` (red-danger tint).
- **Stepper SSR concern:** Step state derives from URL pathname (e.g., `/proposals/new/parametres` → step 1). The component can render server-side with `currentStep` and `completedSteps` as props. Clickable back-navigation uses `<Link>` for completed steps and a non-interactive `<div>` for pending steps — no client boundary needed at the Stepper level. (Wizard form interactions in Phase 13 will need client boundaries elsewhere.)

</specifics>

<deferred>
## Deferred Ideas

- **Storybook integration** — considered for component verification, rejected for v1.2 per minimal-tooling stance. Reconsider in v1.3+ if the component library grows beyond ~15 primitives.
- **Playwright visual regression** — same reasoning. Manual Chrome+Edge smoke continues per v1.0/v1.1 convention.
- **Migrating existing Topbar / UserMenu / LocaleToggle / ThemeToggle into `src/components/ui/`** — out of scope; only NEW design system primitives go to `ui/`. Existing files stay flat to avoid churn.
- **`<Shell>` Storybook stories** — covered by D-11's dev-only smoke route instead.
- **Component theming variants beyond Light/Dark** — Figma file currently has 2 modes; if a "high contrast" or accessibility mode is wanted, that's its own v1.3+ phase.
- **Domain-folder reorganization (`src/components/{layout,forms,data-display}/`)** — considered, rejected. May revisit when component count exceeds ~20.

</deferred>

---

*Phase: 11-design-system-foundation-brand-assets*
*Context gathered: 2026-05-11*
