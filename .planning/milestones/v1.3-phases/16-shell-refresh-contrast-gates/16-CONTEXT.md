# Phase 16: Shell Refresh + Contrast Gates - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Refresh the v1.2 app shell visually to match the v1.3 Figma `9:46` design contract, extract a shared `<PageHero>` primitive, and formally close the Phase 14 deferred WCAG AA contrast measurement — so every downstream v1.3 wave (Phases 17, 18) inherits a stable, signed-off, visually consistent shell + hero foundation in both light and dark.

**In scope:**

- **`<PageHero>` primitive** at `src/components/ui/PageHero.tsx`. Server component. Props: `title: string`, `subtitle?: string`, `eyebrow?: string` (e.g. `ÉTAPE 1 SUR 3`), `actions?: React.ReactNode` (page-level CTA slot, right-aligned). Single source of truth for hero typography, spacing, light/dark behavior.
- **One reference adopter:** migrate `app/(admin)/[adminSegment]/page.tsx` to consume `<PageHero>` as the proof-of-concept consumer. Other authed pages stay on inline hero JSX until Phase 17/18 ships their per-page refresh.
- **Sidebar visual touch-ups** to `src/components/ui/RetractableSidebar.tsx` matching Figma `23:46` (collapsed) and the expanded sidebar visible in `9:47` / `41:46`. Most of the implementation is correct; deltas are micro (nav-icon SVG size, inactive-icon background, theme-icon size).
- **Topbar refinement** at `src/components/Topbar.tsx` matching Figma `9:46` (page title + optional ADMIN pill + UserMenu).
- **Footer extension** at `src/components/ui/Shell.tsx` to add a `Mentions légales` link alongside the existing copyright (parity with the public layout's footer).
- **Tri-state theme toggle visual polish** — already-functional (Plan 11-04, `ThemeToggle.tsx` ships `light | system | dark` via `setTheme` action; `app/layout.tsx:45-46` resolves `'system'` via `prefers-color-scheme`). Phase 16 verifies the visual treatment matches Figma's pill-style toggle in the sidebar footer.
- **Locale toggle in sidebar footer** — already-shipped (Plan 11-04, `RetractableSidebar.tsx:363-368` mounts `LocaleToggle` in the expanded footer). Phase 16 verifies the visual treatment.
- **Contrast audit document** at `docs/accessibility/16-contrast-audit.md` listing every measured composite (`--gold` over `--surface` at full opacity + `rgba(224,133,48,0.10)` over `--surface` with `--ink` weight 600 + any new `--gold`/`--teal` foreground-on-background pair introduced by Phase 16) with computed WCAG AA ratios in both light and dark modes, signed off by Antoine.
- **Light + dark verification** for every Phase 16 surface (`<PageHero>`, refreshed sidebar, refreshed topbar, refreshed footer, contrast targets). Light+dark is a hard acceptance criterion on every plan in this phase.

**Out of scope (DEFERRED to Phase 17/18 or v1.4+):**

- **Partner Home hero migration** — Phase 17 owns `app/(authed)/page.tsx` rebuild (PHOME-01..03) and will adopt `<PageHero>` at that time. Phase 16 does NOT touch the partner home.
- **Wizard step hero migration** — Phase 17 owns the wizard redesign (WIZ-01..06) and will adopt `<PageHero>` with the `eyebrow` slot for `ÉTAPE X SUR 3`.
- **Admin /partners list, /partners/new, /coefficients, /history hero migrations** — Phase 18 owns these (ADMIN-10..14) and will adopt `<PageHero>` at that time.
- **Token-level color refresh** — palette is stable (Figma `color/*` matches `app/globals.css` exactly, verified 2026-05-21 via `get_variable_defs` on node `9:46`). No `--gold` / `--navy` / `--ink` / `--paper` value changes in Phase 16.
- **System-mode runtime listener** — already shipped (the no-flash inline script in `app/layout.tsx` handles `'system'` via `prefers-color-scheme`). No new listener work.
- **Automated contrast CI** (Vitest assertion / axe-core / pa11y-ci) — Phase 16 ships a manual markdown audit. Automated enforcement is a v1.4+ candidate.
- **Public layout (`app/(public)/layout.tsx`) hero or shell touch-ups** — Phase 15 just polished it; out of scope.
- **MetricTile / AdminNavCard / StatusChip visual touch-ups** — those components ship from Phase 11 / Phase 14; their consumers (Phase 17/18) own any visual deltas.
- **Browser tab title per page** — carried-forward deferred from Phase 13; v1.4+.
- **Route transition animations** — carried-forward deferred from Phase 13/14; v1.4+.
- **Sidebar adminHrefs config-driven refactor** — carried-forward deferred from Phase 14; v1.4+ (Shell.tsx still hard-codes the 4 admin hrefs; acceptable while admin nav stays at 4 items).
- **`/accounts` 308 redirect sunset** — Phase 14 redirect stays at least 1 milestone of warm-cache time; v1.4+.
- **Animated logo entrance on public pages** — carried-forward deferred from Phase 15.

</domain>

<decisions>
## Implementation Decisions

### `<PageHero>` primitive (D-01..D-06)

- **D-01:** Ship `src/components/ui/PageHero.tsx` as a **server component** (no `'use client'`). Props:
  ```ts
  export interface PageHeroProps {
    title: string;                  // The big greeting or page title ("Bonjour, Antoine 👋" or "Coefficients")
    subtitle?: string;              // 14.5px muted description line below the title
    eyebrow?: string;               // Small uppercase label ABOVE the title (e.g. "ÉTAPE 1 SUR 3" or "ADMIN")
    actions?: React.ReactNode;      // Right-aligned page-level CTA slot (one or more buttons/Links)
    children?: React.ReactNode;     // Reserved for future composition (e.g. inline stats); not used in Phase 16.
  }
  ```
- **D-02:** Typography (matches Figma `heading/hero` and `body/default`):
  - **Title:** `font-size: 32px`, `font-weight: 700`, `line-height: 1.2`, `color: var(--ink)`, `margin: 0`.
  - **Subtitle:** `font-size: 14.5px`, `font-weight: 400`, `line-height: 1.55`, `color: var(--muted)`, `margin-top: 8px`.
  - **Eyebrow:** `font-size: 11.8px`, `font-weight: 700`, `letter-spacing: 0.06em`, `text-transform: uppercase`, `color: var(--gd)` (Leasétic brand green, matches the `●` section-bullet color from Phase 13), `margin-bottom: 8px`.
- **D-03:** Layout — two-row flex container:
  - Row 1 (`actions` row): `display: flex`, `justify-content: space-between`, `align-items: flex-start`. Left: stacked eyebrow + title + subtitle column. Right: `actions` slot (right-aligned, top-aligned).
  - When `actions` is undefined or empty, the title block expands full-width naturally.
- **D-04:** Spacing — `margin-bottom: 32px` between `<PageHero>` and the page's first content card (matches Phase 13/14 4-multiple scale and the existing `app/(authed)/page.tsx` greeting section's `marginBottom: 32`).
- **D-05:** Light/dark — `<PageHero>` consumes existing tokens (`--ink`, `--muted`, `--gd`). No new tokens. Already-validated `data-theme` cascade ensures dark-mode rendering without extra work.
- **D-06:** **Reference adopter:** migrate `app/(admin)/[adminSegment]/page.tsx` to consume `<PageHero>` (replacing its current inline `<h1>`). This single migration validates the primitive's contract. Other consumers wait for Phase 17/18.

### Refresh scope (D-07)

- **D-07:** **Foundation only**, NOT cascade. Phase 16 ships primitives + measurement + ONE reference adopter (admin home, D-06). Phase 17 migrates `app/(authed)/page.tsx`, `/proposals`, and the wizard steps. Phase 18 migrates `/partners`, `/partners/new`, `/coefficients`, `/history`. Each downstream phase consumes `<PageHero>` as part of its own page-refresh deliverable. Phase 16 does NOT touch any page outside `app/(admin)/[adminSegment]/page.tsx`.

### Contrast sign-off mechanism (D-08..D-11)

- **D-08:** Sign-off artifact: **`docs/accessibility/16-contrast-audit.md`**. Markdown table listing each measured composite:
  - Foreground token (e.g. `--ink #41423d`)
  - Background token (e.g. `--surface #ffffff` or `--paper #f5f7fc`)
  - Composite alpha layers (e.g. `rgba(224,133,48,0.10)` over `--surface`)
  - Computed effective foreground hex (after alpha blending — manually calculated or via WebAIM contrast checker)
  - Computed effective background hex (same)
  - WCAG 2.1 AA ratio (e.g. `5.8:1`)
  - Pass / Fail (≥4.5:1 = pass for normal text)
  - Light vs dark column
  - Tool used (WebAIM contrast checker / Chrome DevTools)
  - Antoine sign-off line
- **D-09:** Mandatory composites to measure for CONTRAST-01:
  - **Diff-panel changed-row** (Phase 14 `CoefficientDiffPanel.tsx`): `rgba(224,133,48,0.10)` over `--surface` background with `--ink` weight 600 text → LIGHT
  - Same composite over `--paper` background with `--ink` text → LIGHT (if used elsewhere)
  - **DARK MODE EQUIVALENTS:** `rgba(224,133,48,0.10)` over dark `--surface #161e2d` with light `--ink #e6e9ef` text
  - **`.chip-invited`** (gold StatusChip from Phase 14): background `--gold` tint over chip surface with chip text color → LIGHT + DARK
- **D-10:** Mandatory composites to measure for CONTRAST-02 (new surfaces introduced by Phase 16):
  - **`<PageHero>` eyebrow** `var(--gd)` (#129657) over `var(--paper)` → LIGHT + DARK
  - Any NEW gold or teal pair introduced during Phase 16 plan execution (planner enumerates during planning; CONTEXT.md does not predict)
  - If no new composites are introduced, CONTRAST-02 closes vacuously with a "no new composites" line in the audit.
- **D-11:** **Sign-off line in `docs/accessibility/16-contrast-audit.md`** — last line of the doc, e.g.:
  ```
  Signed off by Antoine Rousseau on 2026-05-XX (commit <sha>). Each composite above measured manually using WebAIM contrast checker. All values ≥4.5:1 WCAG AA in both light and dark modes.
  ```
  The contrast-audit commit is the load-bearing artifact for the CONTRAST gates. No Vitest assertion, no axe-core scan, no pa11y CI in Phase 16. (Automated enforcement is a v1.4+ candidate per the Deferred section.)

### Sidebar visual touch-ups (D-12..D-15)

The current `RetractableSidebar.tsx` is **already 95% Figma-correct**. Decisions below capture the micro-deltas surfaced by `get_design_context` on Figma node `23:46`.

- **D-12:** Nav icon SVG size: Figma is **20×20** inside a 36×36 button slot. Current code uses `size={18}`. **Bump to `size={20}`** for nav icons (both expanded and collapsed mode). Stroke weight `1.6` stays unchanged.
- **D-13:** Inactive nav icon background: Figma shows **`white` (= `--surface`)** for inactive icons; current code uses `'transparent'`. The visual difference is invisible since the sidebar itself is `--surface` white, but Figma's explicit white background makes the icon a proper button-shape on dark mode (where sidebar bg shifts to `#161e2d` and a `white` rendering would NOT be appropriate). **Honor the spirit, not the literal:** keep `'transparent'` as inactive background — that's the right cross-theme behavior. Document in code comment.
- **D-14:** Theme toggle icon size (collapsed sidebar's cycle button): Figma is **16×16**; current code uses `size={17}` for Sun/Moon/Monitor. **Bump down to `size={16}`** for the collapsed-mode theme cycle button only. Expanded-mode `<ThemeToggle current={theme} fullWidth />` keeps its current internal sizing (Figma did not pin the expanded-mode icon size).
- **D-15:** Brand-row gap: Figma `23:46` has a **24px "Gap" spacer node** between the brand row and the first nav icon. Current code uses `marginTop: 24` on the eyebrow div (expanded) and implicit spacing in collapsed mode. Verify the collapsed-mode spacing renders at 24px (planner inspects + adjusts if needed). Documented as a visual-verification task in the plan, not a literal code change.

### Topbar refinement (D-16)

- **D-16:** Topbar visual treatment matches `9:46` already. No code changes anticipated. Planner inspects + confirms. Specifically: page title (16.5px, weight 600, `--ink`, ellipsis truncate) + optional ADMIN pill (9px, weight 700, navy bg, white text) + UserMenu (right-aligned). Sticky positioning + 64px height (`--topbar-h`) + `--surface` bg + 1px bottom border (`--border`) all match. **If planner finds a visual delta during inspection, treat as planner discretion and document in the plan.**

### Footer extension (D-17..D-18)

- **D-17:** Authed footer at `src/components/ui/Shell.tsx:103-118` currently renders only `t('shell.footer.copyright', lang)`. Phase 16 adds a `Mentions légales` link to match the `(public)` layout's footer pattern.
- **D-18:** Layout: footer becomes a flex row with `gap: 24px`, copyright on the left, `Mentions légales` link on the right (`color: var(--muted)`, `font-size: 10.5px`, underline on hover). Link target: `/mentions-legales` (path TBD — if the route doesn't exist, planner creates a placeholder or links externally; if the existing public footer links to a working URL, reuse it). i18n: add `shell.footer.mentionsLegales` FR/EN keys.

### Already-shipped (no Phase 16 implementation work)

- **Tri-state theme toggle (SHELL-02):** `ThemeToggle.tsx` already supports `light | system | dark`. `setTheme` action persists to cookie. `app/layout.tsx:45-46` resolves `'system'` to a neutral SSR fallback; the no-flash inline `<script>` in `app/layout.tsx:50-52` (compile-time `NO_FLASH_SCRIPT` constant in `src/lib/theme/no-flash-script.ts`) overrides at first paint based on `prefers-color-scheme`. **Phase 16 verifies + visually polishes. NO code change to theme actions, no schema migration, no new no-flash script.**
- **Locale toggle in sidebar footer (SHELL-04):** `RetractableSidebar.tsx:363-368` mounts `<LocaleToggle current={lang} fullWidth />` in the expanded footer. Collapsed mode renders a single FR/EN cycle button at lines 320-340. **Phase 16 verifies + visually polishes. NO relocation work.**
- **`<Shell>` composition (SHELL-05):** RetractableSidebar + Topbar + main + footer in 2-col / 3-row CSS grid is shipped. Phase 16 only modifies the footer (D-17, D-18); the grid + topbar + sidebar wiring is unchanged.
- **Sidebar collapsed (72px) variant (SHELL-01):** `RetractableSidebar.tsx` lines 195-209 handle the collapse via `--shell-sidebar-current-w` documentElement style property. Phase 16 only applies micro visual touch-ups per D-12..D-15.

### Cross-cutting invariants Phase 16 must hold

- **ADMIN-09 D-12 envelope** — Phase 13 partner-facing commission relaxation (wizard step 2 + step 3 only) remains in force. Phase 16 introduces NO new commission-bearing surfaces. The Phase 14 9-gate grep-contract suite (`tests/admin-09-grep-contracts.test.ts`) must remain green throughout. Plan-checker should verify no commission strings leak into any new Phase 16 component (specifically `<PageHero>`).
- **Palette stability** — no token-level changes to `--gold`, `--navy`, `--ink`, `--teal`, `--paper`, `--surface`. Phase 16 consumes existing tokens only.
- **PDF immutability** — Phase 16 makes no changes to PDF generation. The `params_snapshot` invariant from Phase 8 is irrelevant to Phase 16.
- **OVH portability** — Phase 16 introduces no Vercel-only primitives. The Shell components are pure React (no `next/image`, no `next/font` runtime calls beyond what's already in `app/layout.tsx`).
- **Light + dark pair shipped together** — every Phase 16 visual change ships both modes simultaneously. A plan that ships only the light variant is incomplete.

### Claude's Discretion

- The exact pixel positions of the `Mentions légales` link in the authed footer (right-aligned vs. centered with copyright on the left vs. flex space-between). Recommendation: flex with `justify-content: space-between` so copyright stays left, link goes right.
- Whether `<PageHero>` exposes a `className` prop for per-page CSS escape hatch. Recommendation: no — keep the surface area minimal; if a page needs custom hero treatment, render inline JSX instead.
- Whether the contrast audit doc lives at `docs/accessibility/16-contrast-audit.md` or `docs/security/16-contrast-audit.md`. Recommendation: `accessibility/` — matches the WCAG framing better than security; create the directory if needed.
- The exact wording of the eyebrow text for the admin home reference adopter (`ADMIN` / `ADMINISTRATION` / `ESPACE ADMIN` etc.). Recommendation: `ADMIN` (matches the existing Topbar ADMIN pill text for consistency).
- Whether to add a Storybook-like dev route (`/dev/components/page-hero`) showing `<PageHero>` in light + dark with various prop combinations. Recommendation: skip — the project does not maintain Storybook; `app/dev/components/page.tsx` already exists and can host an inline showcase if useful.
- Whether the contrast-audit doc's "tool used" column accepts any link (WebAIM, Coolors, Chrome DevTools, Figma plugin) or pins one tool. Recommendation: any reputable WCAG calculator is acceptable; pin "WebAIM" as the default if the planner wants consistency.
- Whether to bump the Theme cycle button (collapsed mode) icon size to 16 (per D-14) atomically or as a separate visual-polish pass. Recommendation: atomic — bundle all sidebar micro-deltas (D-12, D-14) in one wave.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (mandatory)

- Figma file `vwOzirhL0vyxDWq4m6t4gC` — opens at https://www.figma.com/design/vwOzirhL0vyxDWq4m6t4gC/ . Use `mcp__0c362372-5270-457f-b11b-4797e40bf045__get_design_context` MCP calls per-node when implementing.
  - Node `9:46` — v1.3 — Redesign sketches (root frame, 13 screens)
  - Node `23:46` — Sidebar — collapsed (72px) — design contract for SHELL-01 collapsed mode
  - Node `9:47` — Partner Home (contains the expanded sidebar + topbar + hero treatment)
  - Node `41:46` — Admin Home (contains the expanded sidebar + topbar + admin hero with ADMIN badge)
  - Node `23:47` — Annotation note for collapsed sidebar variant
- `.planning/v1.3-CARRYFORWARD.md` — Tier 2 contrast measurement carry-forward (the hard prerequisite Phase 16 closes)
- The Phase 16 UI-SPEC.md (forthcoming from `/gsd-ui-phase 16`) will lock per-component visual contracts with measured layout constants.

### Project / requirements

- `.planning/REQUIREMENTS.md` — full text for SHELL-01..05 + CONTRAST-01/02 + THEME-01/02 (THEME requirements verified in this phase but apply to the entire milestone)
- `.planning/ROADMAP.md` §Phase 16 — 4 success criteria; cross-cutting invariants block at top
- `.planning/PROJECT.md` §Current Milestone v1.3 — palette stability decision row; Foundation-only scope row

### Prior-phase decisions Phase 16 must respect

- `.planning/phases/06-auth-shell/06-CONTEXT.md` — SHELL-03 (public layout boundary), SHELL-14 (mobile-graceful padding), no-flash inline `<script>` pattern, cookie-driven theme
- `.planning/phases/11-design-system-foundation-brand-assets/11-CONTEXT.md` — Phase 11 shipped: `<Stepper>`, `<RetractableSidebar>` (260↔72), `<MetricTile>`, `<AdminNavCard>`, `<StatusChip>`, `<BrandLogo>`, `<Shell>` wrapper, light/dark logo SVGs, `.chip-*` utility classes, 3-layer fill rule, 4-multiple spacing scale, hand-rolled FR/EN i18n; Plan 11-04/11-05 relocated `<LocaleToggle>` + `<ThemeToggle>` from Topbar to sidebar footer
- `.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md` — D-19 (WizardActionBar pattern), `●`-section-header pattern + `--gd` brand-green for section bullets (Phase 16 hero eyebrow reuses `--gd`), 4-multiple spacing precedent
- `.planning/phases/14-admin-polish-partners-history-home/14-CONTEXT.md` — D-29 (9-gate grep-contract suite Phase 16 must keep green), D-30 (admin coefficient_history surfaces commission — Phase 16 introduces no new commission surfaces), Phase 14 diff-panel composite that Phase 16's CONTRAST-01 measures, `<CoefficientDiffPanel>` light/dark behavior
- `.planning/phases/15-public-surface-brand-polish/15-CONTEXT.md` — `<BrandLogo>` usage, `.public-page-logo` CSS pattern (Phase 16 stays away from the public layout but the spacing scale precedent applies), Phase 15 footer copyright + Mentions légales link pattern that Phase 16's D-17/D-18 mirrors in the authed footer

### Source files Phase 16 modifies or reads

- [src/components/ui/Shell.tsx](src/components/ui/Shell.tsx) — D-17/D-18 footer extension (Mentions légales link)
- [src/components/ui/RetractableSidebar.tsx](src/components/ui/RetractableSidebar.tsx) — D-12 (nav icon size 18→20), D-14 (theme cycle icon size 17→16 in collapsed mode), D-15 (verify brand-row gap)
- [src/components/Topbar.tsx](src/components/Topbar.tsx) — D-16 (visual verification only, expected zero code change)
- [src/components/ThemeToggle.tsx](src/components/ThemeToggle.tsx) — read-only verification; no changes
- [src/components/LocaleToggle.tsx](src/components/LocaleToggle.tsx) — read-only verification; no changes
- [app/layout.tsx](app/layout.tsx) — read-only verification of no-flash script behavior; no changes
- [src/lib/theme/no-flash-script.ts](src/lib/theme/no-flash-script.ts) — read-only verification; no changes
- [app/(admin)/[adminSegment]/page.tsx](app/<adminSegment>/page.tsx) — D-06 reference adopter migration to `<PageHero>`
- [app/globals.css](app/globals.css) — no token changes; possibly adds `.page-hero` class if `<PageHero>` needs scoped CSS (or uses inline styles like Phase 11 components)
- [src/lib/i18n/dictionaries.ts](src/lib/i18n/dictionaries.ts) — add `shell.footer.mentionsLegales` FR/EN keys (D-18); possibly add `admin.home.eyebrow` if D-06 reference adopter introduces eyebrow text

### New files Phase 16 will create

- `src/components/ui/PageHero.tsx` — `<PageHero>` primitive (D-01..D-05)
- `src/components/ui/PageHero.test.tsx` — Vitest test for prop coverage (title, subtitle, eyebrow, actions, light/dark snapshot)
- `docs/accessibility/16-contrast-audit.md` — manual contrast audit + sign-off (D-08..D-11)
- `docs/accessibility/` — directory may need creation if first accessibility doc

### Operational

- `.github/workflows/*.yml` — no CI changes in Phase 16. axe-core and pa11y are NOT introduced.
- `docs/operations/launch-checklist.md` — no Phase 16 addition expected.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`<Shell>` wrapper** (`src/components/ui/Shell.tsx`) — server component; 2-col / 3-row CSS grid; Phase 16 modifies only the footer slot (D-17, D-18). Sidebar + topbar + main + grid wiring stays.
- **`<RetractableSidebar>`** (`src/components/ui/RetractableSidebar.tsx`) — client component, uses `useSyncExternalStore` to bind to `localStorage` collapse state; mutates `--shell-sidebar-current-w` documentElement var on toggle. Already mounts `<LocaleToggle>` + `<ThemeToggle>` in the expanded footer (lines 363-368) and single-icon cycle buttons in collapsed (lines 320-362). **Phase 16 modifies icon sizes only (D-12, D-14).**
- **`<Topbar>`** (`src/components/Topbar.tsx`) — page title + optional ADMIN pill + UserMenu. **Expected zero code change** per D-16; planner verifies.
- **`<ThemeToggle>`** (`src/components/ThemeToggle.tsx`) — already tri-state (Light / System / Dark). Calls `setTheme` server action. **Verify-only; no Phase 16 code change.**
- **`<LocaleToggle>`** (`src/components/LocaleToggle.tsx`) — FR / EN pill. Already mounted in sidebar footer. **Verify-only.**
- **`<BrandLogo>`** (`src/components/ui/BrandLogo.tsx`) — Phase 11; consumed by sidebar brand row. **No Phase 16 changes.**
- **`NO_FLASH_SCRIPT`** (`src/lib/theme/no-flash-script.ts`) — compile-time constant inlined in `app/layout.tsx:50-52`. Already handles `'system'` mode via `prefers-color-scheme`. **No Phase 16 changes.**
- **CSS tokens** (`app/globals.css`) — `--shell-sidebar-w: 260px`, `--shell-sidebar-w-collapsed: 72px`, `--shell-sidebar-current-w` (live), `--topbar-h: 64px`, `--footer-h: 48px`, plus the full `--ink/--muted/--paper/--surface/--navy/--gd/--gold/--teal/--border` family. **Phase 16 consumes; no tokens added or modified.**
- **i18n parity proof** — every new `shell.footer.*` / `admin.home.*` key needs FR + EN entries (compile-time `_EnHasAllFrKeys`).

### Established Patterns

- **Server-component primitives** — `<Shell>`, `<BrandLogo>`, `<StatusChip>`, `<MetricTile>`, `<AdminNavCard>` are server components (no `'use client'`). `<PageHero>` follows.
- **No new global CSS for primitives** — Phase 11 components use inline `style={{}}` (CSS-in-JS-like) for layout; reusable utility classes (`.card`, `.ctitle`, `.btn-green`, `.chip-*`) live in `app/globals.css`. `<PageHero>` follows inline-style pattern (no new global CSS class needed unless planner finds a reason).
- **i18n via `t(key, lang)`** — Phase 16 adds 1-3 new keys (`shell.footer.mentionsLegales` + possibly `admin.home.eyebrow`).
- **No-flash theme** — handled by `app/layout.tsx` inline `<script>` (compile-time `NO_FLASH_SCRIPT` constant; standard SSR theme bootstrap pattern, same as next-themes). Already covers `'system'` mode. **No Phase 16 changes.**
- **`data-theme` cascade** — every component (existing + new `<PageHero>`) inherits light/dark via the `html[data-theme="..."] .selector` pattern. `<PageHero>` uses tokens, so no per-component dark-mode CSS needed.
- **Defense-in-depth `requireUser()` / `requireAdmin()`** — page-level auth gates. `<PageHero>` is server but does NOT call auth helpers (it's a pure presentation component); pages composing it remain responsible.
- **ADMIN-09 9-gate grep-contract suite** — `tests/admin-09-grep-contracts.test.ts`. Stays green throughout. Plan-checker should verify `<PageHero>` does not introduce a commission-leak path (it doesn't — pure presentational).

### Integration Points

- **MODIFY: `src/components/ui/Shell.tsx`** — footer extension (D-17, D-18)
- **MODIFY: `src/components/ui/RetractableSidebar.tsx`** — icon sizes (D-12, D-14)
- **MODIFY: `app/(admin)/[adminSegment]/page.tsx`** — reference adopter for `<PageHero>` (D-06)
- **MODIFY: `src/lib/i18n/dictionaries.ts`** — add `shell.footer.mentionsLegales` + possibly `admin.home.eyebrow`
- **NEW: `src/components/ui/PageHero.tsx`** — primitive (D-01..D-05)
- **NEW: `src/components/ui/PageHero.test.tsx`** — Vitest test
- **NEW: `docs/accessibility/16-contrast-audit.md`** — sign-off artifact (D-08..D-11)
- **NEW: `docs/accessibility/`** — directory if not yet created

</code_context>

<specifics>
## Specific Ideas

- **`<PageHero>` prop shape (locked, D-01):**
  ```ts
  export interface PageHeroProps {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    actions?: React.ReactNode;
    children?: React.ReactNode; // reserved
  }
  ```
- **`<PageHero>` Vitest test coverage (D-01):**
  - Renders title only (minimal props)
  - Renders title + subtitle
  - Renders title + subtitle + eyebrow (uppercase, brand-green)
  - Renders title + actions (right-aligned)
  - Renders all 4 slots together
  - Light snapshot + dark snapshot (via `data-theme` attr on a test wrapper)
- **`<PageHero>` usage on admin home (reference adopter, D-06):**
  ```tsx
  <PageHero
    eyebrow="ADMIN"
    title={t('dashboard.greeting', lang).replace('{0}', displayName)}
    subtitle={t('admin.home.subtitle', lang)}
    actions={<Link href={`/${adminSegment}/coefficients`} className="btn-green">…</Link>}
  />
  ```
  Whether to also render a `Nouvelle proposition` CTA on admin home (matching Figma `41:46`) is the planner's call — the Figma shows it but the existing v1.2 admin home does not include such a CTA. Recommendation: keep parity with v1.2 admin home (no `Nouvelle proposition` CTA from admin); reconsider as a Phase 18 enhancement.
- **Contrast audit FILE shape (D-08, D-09, D-10, D-11):** markdown table with one row per composite. Example row:
  ```
  | Composite | FG token | BG token | Effective FG | Effective BG | Ratio | Light/Dark | Tool | Pass |
  |---|---|---|---|---|---|---|---|---|
  | diff-panel changed-row text | `--ink` weight 600 (#41423d) | `rgba(224,133,48,0.10)` over `--surface` (#ffffff) | #41423d | #fff1e1 (blended) | 9.1:1 | Light | WebAIM | ✓ |
  ```
- **Mentions légales i18n keys (D-18):**
  - FR `shell.footer.mentionsLegales`: `Mentions légales`
  - EN `shell.footer.mentionsLegales`: `Legal notice`
- **Mentions légales link target (D-18):** if `/mentions-legales` route already exists (check during planning), reuse. If not, planner creates a stub server-component page that renders the existing copy from wherever it lives in the v1.1 public layout footer. The link itself is in scope; the page contents is OUT of scope (treat as out-of-scope decision under "Out of scope" above if the page does not exist; planner flags during planning).
- **Sidebar nav icon size delta (D-12):** literal change in `src/components/ui/RetractableSidebar.tsx` lines 304: `<Icon size={18} strokeWidth={1.6} ... />` → `<Icon size={20} strokeWidth={1.6} ... />`. One line per nav item rendering. Verify all 4 partner + 4 admin nav items use the same size.
- **Theme cycle icon size delta (D-14):** literal change in `src/components/ui/RetractableSidebar.tsx` lines 358-360: `<Sun size={17} ... />` / `<Monitor size={17} ... />` / `<Moon size={17} ... />` → `size={16}`. Only collapsed-mode cycle button. The expanded-mode `<ThemeToggle>` is verify-only.

</specifics>

<deferred>
## Deferred Ideas

- **Partner Home, /proposals, wizard hero migrations** — Phase 17 adopts `<PageHero>` when those surfaces are rebuilt.
- **Admin /partners, /partners/new, /coefficients, /history hero migrations** — Phase 18 adopts `<PageHero>` when those admin surfaces are refreshed.
- **Automated contrast CI** (Vitest assertion / axe-core / pa11y-ci) — v1.4+ candidate. Phase 16 ships manual markdown audit only.
- **Token-level color refresh** — palette stable; no v1.3 work. Revisit only if brand guidelines change.
- **Sidebar adminHrefs config-driven refactor** — Phase 14 deferred; v1.4+ if admin nav grows beyond 4 items.
- **System-mode real-time listener tests** — already-shipped behavior; no Phase 16 work. Could add a Vitest for the no-flash script behavior in v1.4+.
- **Browser tab title per page** — Phase 13 deferred; v1.4+.
- **Route transition animations** — Phase 13/14 deferred; v1.4+.
- **`/accounts` 308 redirect sunset** — Phase 14 deferred; v1.4+ after warm-cache window.
- **Animated logo entrance on public pages** — Phase 15 deferred; v1.4+ brand polish.
- **Storybook-style component showcase route for `<PageHero>`** — out of scope; project does not maintain Storybook. Could add to `app/dev/components/page.tsx` showcase as planner's discretion.
- **`<PageHero>` `className` escape-hatch prop** — explicitly omitted per Claude's Discretion above; if a page needs custom hero treatment, it renders inline.
- **Status / version / build-date footer slots** — out of scope; copyright + Mentions légales only.
- **`<PageHero>` composing the wizard `<Stepper>` internally** — out of scope; wizard pages compose `<PageHero>` + `<Stepper>` as siblings in Phase 17.
- **Light/dark-aware brand logo variants beyond Phase 11's existing pair** — out of scope; reuse `<BrandLogo>`.

</deferred>

---

*Phase: 16-shell-refresh-contrast-gates*
*Context gathered: 2026-05-22*
