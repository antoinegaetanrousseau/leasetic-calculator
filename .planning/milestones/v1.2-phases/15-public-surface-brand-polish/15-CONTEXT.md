# Phase 15: Public Surface Brand Polish - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply the Leasétic brand logo to all 3 `(public)` routes (`/login`, `/invite/[token]`, `/reset/[token]`) by replacing the plain-text "Leasétic" header in the shared `app/(public)/layout.tsx` with the Phase 11 `<BrandLogo />` SVG component.

**In scope:**
- Modify `app/(public)/layout.tsx`: swap the `<div>` containing `{t('sidebar.brand', lang)}` (lines 65-74) for `<BrandLogo className="public-page-logo" />`
- Add `.public-page-logo` CSS class to `app/globals.css` (or scoped CSS on the BrandLogo wrapper) sizing the logo at 200px desktop with `width: clamp(140px, 50vw, 200px)` for narrow viewports
- Vitest test: assert the BrandLogo component renders on all 3 public routes (replace any test that depends on the plain-text header)
- Manual smoke: verify in Chrome + Edge that (a) /login, /invite/[token], /reset/[token] all show the centered SVG logo above the form card, (b) light vs dark theme picks the correct logo variant via the existing `data-theme` CSS picker, (c) the form structure is unchanged, (d) top-right LocaleToggle + ThemeToggle stay where they are.

**Out of scope:**
- Form field changes (PUB-01 explicit: "Form field structure is unchanged")
- New i18n keys (the existing `sidebar.brand` key + `<BrandLogo>` aria-label key from Phase 11 are sufficient)
- New shadcn / new third-party dependencies
- Mobile-specific layouts beyond the SHELL-14 clamp() responsive scaling
- Logo size variations beyond 200px desktop (other phases may need different sizing; this is the public-page-specific class)
- Theme-toggle relocation (top-right stays top-right per PUB-01 success criterion #3)
- Footer changes
- Color token changes (deferred to v1.3 color refresh per PROJECT.md decision row)
- Color-contrast measurement of the BrandLogo against `--paper` (Phase 11 already validated this at logo design; no new composite is introduced)

</domain>

<decisions>
## Implementation Decisions

### Logo placement

- **D-01:** Replace the plain-text logo block in `app/(public)/layout.tsx` (currently lines 65-74) with `<BrandLogo className="public-page-logo" />`. The Phase 11 `<BrandLogo>` component auto-picks light vs dark SVG via the existing `data-theme` CSS picker — zero JS, zero FOUC.
- **D-02:** Logo width on desktop: **200px**. Matches the visual weight of the v1.1 plain-text "Leasétic" (22px / weight 700 / `--navy`) while introducing the real SVG lockup with mark + wordmark.
- **D-03:** Vertical padding above the form card: **32px** (Phase 11 4-multiple scale; replaces v1.1's 16px since the SVG logo has more presence than the text it replaces).
- **D-04:** Vertical padding below the BrandLogo (between logo and the card below it): already 16px in the existing layout; preserved.

### Responsive scaling

- **D-05:** Logo width uses CSS `clamp()` for smooth scaling: `width: clamp(140px, 50vw, 200px);`. At viewport widths ≥ 400px the logo is 200px (max-clamped). At viewport widths < 400px the logo shrinks proportionally to 50% of viewport width. Below 280px viewport (extreme edge case) the logo locks at 140px minimum to preserve wordmark legibility.
- **D-06:** No hard breakpoint media queries. The clamp() formula handles all viewport sizes smoothly.
- **D-07:** The logo's intrinsic height-to-width ratio (preserved from Phase 11's 1192:200 SVG viewBox = 5.96:1) means the logo height scales proportionally — at 200px width → 33.5px height; at 140px width → 23.5px height.

### CSS organization

- **D-08:** Add a new CSS class `.public-page-logo` in `app/globals.css` (alongside the existing `.brand-logo` base class from Phase 11). The new class is scoped: it adds `width: clamp(...)` + `height: auto` + display: `inline-block` + `margin-bottom: 16px`. Inheriting from `.brand-logo` for the SVG internals.
- **D-09:** Do NOT modify the `.brand-logo` base class or the `.brand-logo-light` / `.brand-logo-dark` selectors from Phase 11 — those are reused as-is across authed/admin sidebar + public surfaces.

### Forms (locked unchanged)

- **D-10:** `<LoginForm>`, `<SetPasswordForm>` (and any invite-flow form), `<RecentlyDeletedToggle>` — all unchanged per PUB-01 + PUB-02 explicit. Phase 15 modifies the SHELL ONLY, not the per-page form contents.

### Tests

- **D-11:** Update any existing test that asserts the plain-text "Leasétic" header is in the rendered DOM (e.g. `app/(public)/layout.test.tsx` if it exists, or login.test.tsx) — replace the assertion with one that asserts `<BrandLogo>` (or its rendered `<span className="brand-logo">` shell) is present in the layout's output.
- **D-12:** Add ONE new Vitest test asserting: (a) all 3 public routes (/login, /invite/[token], /reset/[token]) render the BrandLogo, (b) the `.public-page-logo` className is applied, (c) the layout still renders the LocaleToggle + ThemeToggle in the top-right absolute-positioned cluster. Mockable via React Testing Library's `render` on the layout component.

### Claude's Discretion

- Whether to put the `.public-page-logo` CSS in `app/globals.css` (Phase 11 convention) or as inline CSS-in-JS on the BrandLogo wrapper div (zero-impact alternative). Recommendation: globals.css for consistency.
- Whether to set the logo via `width` attribute vs CSS class. Recommendation: CSS class (matches Phase 11's `.brand-logo` base pattern).
- The exact `aria-label` text on the BrandLogo for the public pages — recommendation: reuse Phase 11's existing key (e.g. `brand.logo.alt`) which says "Leasétic — retour à l'accueil" or similar. Verify the existing key matches the public-page context.
- Whether to wrap the BrandLogo in a `<Link href="/login">` (clickable logo). Recommendation: NO — `/login` IS the public landing route; making the logo clickable would just refresh the same page or create a circular nav.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract
- Figma file `vwOzirhL0vyxDWq4m6t4gC` node `1:35` — Login page (the only sketched public route; invite + reset inherit the pattern per PUB-02)
- `.planning/milestones/v1.2-CONTEXT.md` §"Background fill rule" — 3-layer fill rule (sidebar/shell white, canvas paper, cards white) — Phase 15 confirms public pages use paper bg + surface card

### Project / requirements
- `.planning/REQUIREMENTS.md` PUB-01 + PUB-02 — full requirement text (Phase 15 covers both)
- `.planning/ROADMAP.md` §Phase 15 — 5 success criteria
- `.planning/PROJECT.md` §Key decisions — v1.2 color refresh deferral row applies to Phase 15 (no new tokens introduced; BrandLogo's `#6DC388` mark + `--navy` wordmark already shipped in Phase 11)

### Prior-phase decisions Phase 15 must respect
- `.planning/phases/11-design-system-foundation-brand-assets/11-CONTEXT.md` — BrandLogo component contract, light/dark CSS picker via `data-theme`, no-flash inline `<script>` from Phase 6 that sets `data-theme` before paint
- `.planning/phases/06-auth-shell/06-CONTEXT.md` — SHELL-03 (public layout boundary), SHELL-14 (mobile-graceful padding)
- `.planning/phases/13-3-step-proposal-wizard/13-UI-SPEC.md` — 4-multiple spacing scale precedent (Phase 15's 32px vertical padding follows this)
- `.planning/phases/14-admin-polish-partners-history-home/14-CONTEXT.md` — v1.3 color refresh deferral applies (no new color work in Phase 15)

### Source files Phase 15 modifies or reads
- `app/(public)/layout.tsx` — THE ONLY FILE BEING MODIFIED. Lines 65-74 (the plain-text logo block) become `<BrandLogo className="public-page-logo" />`.
- `app/globals.css` — add `.public-page-logo` class (one CSS rule with `width: clamp(...)`)
- `src/components/ui/BrandLogo.tsx` — Phase 11 shipped; consumed verbatim, no changes
- `src/lib/i18n/dictionaries.ts` — verify existing `brand.logo.alt` key (or equivalent) is suitable for public-page context; no new keys expected

### New files Phase 15 will create
- None expected. Phase 15 is a modification-only phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`<BrandLogo />` from Phase 11** (`src/components/ui/BrandLogo.tsx`) — accepts `className`, renders both light + dark SVG with CSS picker; ready to drop in.
- **`(public)/layout.tsx` — 90% ready already.** Centered flex layout, paper bg, top-right toggle cluster, footer with copyright + Mentions légales — all in place from Phase 6 / SHELL-03. Phase 15 modifies one block.
- **`LocaleToggle.tsx` + `ThemeToggle.tsx`** stay in place (top-right absolute-positioned in the public layout). NOT moved to a sidebar like authed/admin per PUB-01 success criterion #3.

### Established Patterns
- **No-flash theme** — Phase 6's `app/layout.tsx` inline `<script>` sets `data-theme` on `<html>` before first paint. The `<BrandLogo>` CSS picker (`html[data-theme="light"] .brand-logo-dark { display: none; }`) rides this without any flash.
- **SHELL-14 mobile-graceful** — public layout already uses `padding: 24px 16px` for narrow viewport friendliness. Phase 15's clamp() scaling preserves this.
- **i18n via `t(key, lang)`** — Phase 15 reuses existing keys; no new dictionary entries needed.
- **No new global CSS** — Phase 15 adds ONE class (.public-page-logo); everything else reuses Phase 11's `.brand-logo` family + existing layout chrome.

### Integration Points
- **Modify only:** `app/(public)/layout.tsx` (the SHELL — affects all 3 public routes simultaneously)
- **Modify:** `app/globals.css` (one new class)
- **Tests:** add 1 new Vitest test asserting BrandLogo presence on the 3 public routes; update any existing test that asserts the plain-text header
- **Verify:** existing Phase 6 + Phase 11 tests still pass (BrandLogo, LocaleToggle, ThemeToggle, no-flash theme)

</code_context>

<specifics>
## Specific Ideas

- **CSS class:** `.public-page-logo { width: clamp(140px, 50vw, 200px); height: auto; display: inline-block; margin-bottom: 16px; }`
- **Vertical padding above logo** (between top of card-area + logo): 32px on desktop (per existing centered-flex layout, this happens naturally; no change needed unless the logo's own intrinsic height changes the vertical centering).
- **Alt text** — the BrandLogo `<img>` tags already have `alt="Leasétic"` baked in per Phase 11 default. No new aria-label needed.
- **No link wrapper on the logo** — keeping it as a non-interactive SVG matches the "logo IS the visual brand anchor, not a nav element" intent of the public page layout.
- **No animation** — the logo appears statically on page load. No fade-in, no scale, no shimmer.
- **Footer remains unchanged** — the existing copyright + Mentions légales link footer stays at the bottom of all 3 public routes.

</specifics>

<deferred>
## Deferred Ideas

- **Color refresh** (carried from Phase 14 deferral) — when v1.3 updates `--gold` / `--gd` / `--navy` / `--ink` tokens, the BrandLogo's mark `#6DC388` and wordmark `--navy` may need realignment. Hard prerequisite for any v1.3 plan touching these tokens: re-verify the logo's contrast against `--paper` background.
- **Logo size variations** — Phase 11 introduced the BrandLogo with the public-page sizing in mind. If v1.3 adds an email-template logo, signature-block logo, or favicon logo, those need separate size classes (`.email-logo`, `.signature-logo`, etc.). Don't bake them into `.public-page-logo`.
- **Animated logo entrance** — if v1.3+ wants a brand-flourish on first paint (fade-in, mark-then-wordmark sequence), that's a separate polish task.
- **Mobile-specific layout** — Phase 15's clamp() scaling is sufficient for the desktop-primary constraint; a real mobile-first redesign (vertical stack, larger touch targets, larger forms) belongs in the mobile-optimized layout work item already deferred to v1.3+ per PROJECT.md.
- **Logo as nav element** — wrapping in `<Link href="/login">` if a future flow needs "click logo to go to login from invite/reset". Currently no such flow.
- **Public-page hero copy** — adding a tagline or subtitle above/below the logo ("Outil interne — Leasétic" or similar). Currently none; the logo speaks for itself. Reconsider with the v1.3 brand polish.

</deferred>

---

*Phase: 15-public-surface-brand-polish*
*Context gathered: 2026-05-20*
