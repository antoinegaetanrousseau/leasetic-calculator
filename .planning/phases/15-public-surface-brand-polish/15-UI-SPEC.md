---
phase: 15
slug: public-surface-brand-polish
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-21
reviewed_at: 2026-05-21
milestone: v1.2
figma_file_key: vwOzirhL0vyxDWq4m6t4gC
figma_url: https://www.figma.com/design/vwOzirhL0vyxDWq4m6t4gC/
figma_node: "1:35"
requirements: [PUB-01, PUB-02]
---

# Phase 15 — UI Design Contract

> Visual + interaction contract for the `(public)` brand polish. Phase 15 is **exceptionally lightweight** — it swaps one plain-text logo block for the Phase 11 `<BrandLogo />` SVG component and adds one CSS class. Almost the entire design contract is inherited from Phase 11 (token spine, BrandLogo component) and Phase 6 (`(public)` layout shell). This document declares only what is *new or specific* to Phase 15.

**Source of truth precedence (read in this order if specs disagree):**
1. Figma file `vwOzirhL0vyxDWq4m6t4gC` node `1:35` (Login frame — the only sketched public route; `/invite` + `/reset` inherit per PUB-02)
2. This UI-SPEC.md
3. `.planning/phases/15-public-surface-brand-polish/15-CONTEXT.md` (12 locked D-decisions)
4. `.planning/phases/11-design-system-foundation-brand-assets/11-UI-SPEC.md` (token spine + BrandLogo contract — Phase 15 inherits verbatim)
5. `.planning/milestones/v1.2-CONTEXT.md` (3-layer fill rule — public pages use paper-bg + surface card)
6. `app/globals.css` existing tokens (never re-declare, only extend)

---

## 1. Design System

| Property | Value |
|----------|-------|
| Tool | none (manual token spine — predates shadcn; inherited from Phase 11) |
| Preset | not applicable |
| Component library | none (hand-built primitives in `src/components/ui/`) |
| Icon library | `lucide-react@0.469.0` (no new icons in Phase 15) |
| Font | Plus Jakarta Sans (self-hosted, `--font-sans`) — inherited from Phase 5/Phase 11 |
| Token spine location | `app/globals.css` (no new tokens added by Phase 15) |
| Theme switch mechanism | `data-theme` attribute on `<html>` set by no-flash inline script (Phase 4/Phase 6) — BrandLogo CSS picker rides this |
| New tokens this phase introduces | **none** (color refresh deferred to v1.3 per PROJECT.md decision row) |

**Tokens consumed (not introduced) by Phase 15:** `--paper`, `--surface`, `--navy`, `--ink`, `--muted`, `--border`, `--brand-mark` (`#6DC388` — declared in Phase 11). All present in `app/globals.css` already.

---

## 2. Spacing Scale

Phase 15 consumes the 4-multiples scale declared in Phase 11 UI-SPEC §2. No new tokens. The values Phase 15 actually uses:

| Token (semantic) | Value | Usage in Phase 15 |
|------------------|-------|-------------------|
| sm   | 8px   | (not consumed) |
| md   | 12px  | Gap between `<LocaleToggle>` and `<ThemeToggle>` in top-right cluster (existing in `app/(public)/layout.tsx` line 48; **preserved unchanged**) |
| lg   | 16px  | `margin-bottom` on `.public-page-logo` (gap between logo and the form card immediately below it) — matches the v1.1 layout's existing `marginBottom: 16` on the plain-text logo block (D-04) |
| xl   | 20px  | (not consumed) |
| 2xl  | 24px  | Top-right toggle cluster offset (`top: 24, right: 24` in `app/(public)/layout.tsx` lines 44-45; **preserved unchanged**). Horizontal page padding (`padding: 24px 16px` in layout line 36; **preserved unchanged**). |
| 4xl  | 32px  | **Vertical centering math only** — `<footer>` already has `marginTop: 32` (line 76). The flex-`justifyContent: center` produces the implicit vertical breathing room above the form card; no additional explicit 32px declaration is added by Phase 15 (D-03 is satisfied by the existing flex-center layout). |

**Exceptions:**
- The mobile-graceful `padding: 24px 16px` on the outer `<div>` (line 36) uses 16px horizontal padding — a deliberate SHELL-14 exception inherited from Phase 6. Phase 15 does NOT change this.

**Layout-dim tokens consumed by Phase 15:** none. The public layout uses no `--shell-sidebar-w`, `--topbar-h`, or `--footer-h`; it is a centered-flex layout that owns its own dimensions.

---

## 3. Typography

Phase 15 introduces **zero** new typography. The plain-text logo block being replaced consumed 22px/700/`--navy` (lines 59-61 of `app/(public)/layout.tsx`); after Phase 15, the BrandLogo SVG replaces it with no typography (SVG paths, not text).

Typography consumed elsewhere on the public routes (unchanged from Phase 6):

| Surface | Size | Weight | Line-height | Color | Source |
|---------|------|--------|-------------|-------|--------|
| Footer copyright + Mentions légales link | 10.5px | 400 | 1.5 | `--muted` | `app/(public)/layout.tsx` lines 77-80 (preserved) |
| `<LoginForm>`, `<SetPasswordForm>`, `<InviteForm>` field labels + inputs + submit button | (varies) | (varies) | (varies) | (varies) | Phase 6 UI-SPEC §"Login Page Layout" / Phase 7 form primitives — **preserved unchanged per PUB-01 + PUB-02 + D-10** |

**Forms are out of scope.** PUB-01 ("Form field structure is unchanged from v1.1 — only the visual frame is updated") + PUB-02 ("No form changes — purely visual alignment") + D-10 are explicit. Phase 15 modifies the shell only.

---

## 4. Color

### 4.1 60/30/10 split (inherited from Phase 11 §4.1; Phase 15 reaffirms for the public surfaces)

| Role | Token | Value (light / dark) | Usage in Phase 15 |
|------|-------|----------------------|-------------------|
| **Dominant 60%** | `--paper` | `#f5f7fc` / `#0c121c` | Public-page body background (already in `app/(public)/layout.tsx` line 35 `background: 'var(--paper)'`; **preserved**) |
| **Secondary 30%** | `--surface` | `#ffffff` / `#161e2d` | Form card background (owned by `<LoginForm>` / `<SetPasswordForm>` / `<InviteForm>`; **preserved**) |
| **Accent 10%** | `--brand-mark` | `#6DC388` (constant) | Inside `logo-light.svg` + `logo-dark.svg` clover-mark fill **only** — bound by Phase 11. Phase 15 introduces no other consumer. |
| **Destructive** | `--danger` | `#dc2626` | (not consumed in Phase 15) |

### 4.2 Accent (`--brand-mark`) reserved for (Phase 15 only)

- **`<BrandLogo>` SVG mark — clover/4-ellipse fill** (the only Phase 15 consumer). Already bound inside `public/logo-light.svg` and `public/logo-dark.svg` via Phase 11.

**`--brand-mark` is NOT used for:** Any other Phase 15 element. No new buttons, links, hover states, focus rings, or text colors use `#6DC388`. The mark color stays a logo-only concern.

### 4.3 Secondary semantic colors used by Phase 15

| Token | Value (light/dark) | Phase 15 consumer |
|---|---|---|
| `--navy` | `#112c3b` (constant) | `<BrandLogo>` light-mode SVG wordmark fill (already bound inside `logo-light.svg`). Phase 15 introduces no new `--navy` consumer. |
| `--ink` | `#41423d` / `#e6e9ef` | `<BrandLogo>` dark-mode SVG wordmark fill (`#e6e9ef` baked into `logo-dark.svg` per Phase 11). |
| `--muted` | `#6e7191` / `#8b93a8` | Footer copyright + Mentions légales link (preserved unchanged from Phase 6). |
| `--border` | `#d9dbe9` / `#242c3e` | (not directly consumed by Phase 15 — owned by form card primitives). |
| `--paper` | `#f5f7fc` / `#0c121c` | Outer page background (preserved). |
| `--surface` | `#ffffff` / `#161e2d` | Form card background (owned by form primitives, preserved). |

### 4.4 Chrome-fill table for `(public)` routes (binding contract)

| Surface | Fill token | Border | Owner |
|---|---|---|---|
| Outer page `<div>` (the `(public)` layout root) | `--paper` | none | `app/(public)/layout.tsx` line 35 (preserved) |
| Top-right toggle cluster wrapper | transparent | none | `app/(public)/layout.tsx` lines 42-54 (preserved) |
| `<LocaleToggle>` + `<ThemeToggle>` segments | per existing `.toggle-pill` rules | per existing | Phase 5/Phase 6 primitives (unchanged) |
| **`<BrandLogo>` wrapper `<span>`** | transparent (the SVG sits directly on `--paper`) | none | **NEW in Phase 15** — replaces the existing plain-text `<div>` (lines 57-68) |
| Form card (`<LoginForm>`, `<SetPasswordForm>`, `<InviteForm>` outer container) | `--surface` | per existing `.card` | Phase 6 + Phase 7 primitives (preserved) |
| Footer strip (`<footer>`) | transparent (inherits `--paper`) | none | `app/(public)/layout.tsx` lines 74-93 (preserved) |

**Verification (chrome-fill rule):** the 3-layer fill principle from `v1.2-CONTEXT.md` §"Background fill rule" — "shell white (n/a here, no sidebar) → canvas paper → elevated cards white" — applies to `(public)` routes as: there is no shell zone (no sidebar/topbar on public routes); canvas is `--paper`; the form card is the only `--surface` zone. The BrandLogo sits on `--paper` with no card wrapper of its own. Verified visually under both `[data-theme=light]` and `[data-theme=dark]` per ROADMAP §Phase 15 success criterion #5.

### 4.5 No new tokens, no color refresh

Per CONTEXT D-deferred (carried from Phase 14) + PROJECT.md decision row:
> **v1.2 — Phase 14 color-contrast measurement deferred to v1.3** ... user signaled an upcoming UI color refresh in v1.3 — measuring on tokens that will change is wasted work.

Phase 15 inherits this stance: **no new color tokens, no color-contrast measurement** of the BrandLogo against `--paper` background. Phase 11 already validated the logo's `#6DC388` mark + `--navy` (light) / `#e6e9ef` (dark) wordmark contrast at logo design. Phase 15 introduces no new color composite.

**Hard prerequisite for v1.3 color refresh:** when `--navy` / `--ink` / `--paper` tokens are refreshed, re-verify the BrandLogo's mark + wordmark contrast against the new `--paper` value in both light + dark modes before merging the v1.3 refresh.

---

## 5. Shadows + Focus Ring

Phase 15 introduces **zero** new shadows or focus rings.

- The BrandLogo wrapper `<span>` is non-interactive (no `:focus-visible`, no `tabindex`, no `<Link>` wrapper per D-Claude-discretion in CONTEXT). It receives no focus and renders no shadow.
- The top-right `<LocaleToggle>` + `<ThemeToggle>` retain their existing `:focus-visible` rings (teal-18%, 3px spread — Phase 5/Phase 6 contract).
- The form card retains its existing `.card` shadow (`--shadow-card` from Phase 11 §5).

**Tab order on `(public)` pages (unchanged from Phase 6):** LocaleToggle → ThemeToggle → form field 1 → form field 2 → ... → submit button → footer link. The BrandLogo is non-tabbable (decorative SVG with `alt=""` for non-decorative usage; see §6.1 below for the alt-text decision).

---

## 6. Components

### 6.1 `<BrandLogo>` consumption on public surfaces

**Component:** `src/components/ui/BrandLogo.tsx` (shipped Phase 11, consumed verbatim — **no changes to the component itself**).
**Phase 11 prop signature (recap, do not modify):**
```ts
export interface BrandLogoProps {
  width?: number;   // default 190
  height?: number;  // default 32
  alt?: string;     // default '' (decorative)
  className?: string;
}
```

#### Phase 15 invocation contract (in `app/(public)/layout.tsx`)

Replace the existing plain-text logo block (lines 57-68):
```tsx
// REMOVE this block:
<div
  style={{
    fontWeight: 700,
    color: 'var(--navy)',
    fontSize: 22,
    marginBottom: 16,
    userSelect: 'none',
  }}
>
  {t('sidebar.brand', lang)}
</div>
```

With:
```tsx
// REPLACE WITH:
<BrandLogo
  className="public-page-logo"
  alt={t('sidebar.brand', lang)}
/>
```

**Why this exact invocation (D-01, D-02, D-Claude-discretion):**
- `className="public-page-logo"` — adds the Phase 15 sizing class (declared in §6.3 below) which overrides the Phase 11 defaults via CSS specificity.
- `alt={t('sidebar.brand', lang)}` — reuses the existing `sidebar.brand` i18n key (returns `'Leasétic'` in both FR + EN per `src/lib/i18n/dictionaries.ts` line 41 + line 707). No new i18n keys introduced.
- `width` and `height` props are **omitted intentionally** — the CSS `width: clamp(...)` rule on `.public-page-logo` is the authoritative sizing source; the underlying `<img>` `width`/`height` attributes default to 190×32 from Phase 11 (these become layout fallbacks under `width: auto; height: auto;` should the CSS fail to load, but the `.public-page-logo` CSS overrides them).

#### DOM contract after the swap (rendered output in `(public)` routes)

```html
<span class="brand-logo public-page-logo" style="display:inline-block; line-height:0;">
  <img class="brand-logo-light" src="/logo-light.svg" alt="Leasétic" width="190" height="32" />
  <img class="brand-logo-dark"  src="/logo-dark.svg"  alt="Leasétic" width="190" height="32" />
</span>
```

The Phase 11 CSS picker (already in `app/globals.css` lines 544-545) hides one img based on `html[data-theme]`. The new `.public-page-logo` class (§6.3 below) overrides the rendered `<img>` width/height via CSS `width: clamp(...)` + `height: auto`.

#### Acceptance criteria (Phase 15 BrandLogo consumption)

- **AC-15-BL-01:** All 3 public routes (`/login`, `/invite/[token]`, `/reset/[token]`) render exactly one `<span class="brand-logo public-page-logo">` element. Verified by Vitest test (D-12).
- **AC-15-BL-02:** The plain-text `{t('sidebar.brand', lang)}` block (the v1.1 plain-text "Leasétic" header) is no longer present in the rendered DOM of `(public)` routes. Verified by Vitest test (D-11): grep the rendered HTML for `fontSize: 22` inline style — must return 0 matches in `app/(public)/layout.tsx` output.
- **AC-15-BL-03:** With `<html data-theme="light">`, `.brand-logo-light` `<img>` has computed `display !== 'none'`; `.brand-logo-dark` `<img>` has computed `display: none`. Inherited from Phase 11 AC-BL-01; verified in manual smoke (ROADMAP §Phase 15 success criterion #5).
- **AC-15-BL-04:** With `<html data-theme="dark">`, the reverse. Inherited from Phase 11 AC-BL-02.
- **AC-15-BL-05:** No flash of unstyled content on reload — the Phase 6 no-flash inline `<script>` sets `data-theme` before first paint, and the CSS picker is in `app/globals.css` (synchronously linked). Verified in manual smoke per ROADMAP §Phase 15 success criterion #5.
- **AC-15-BL-06:** The `<BrandLogo>` wrapper `<span>` is not wrapped in a `<Link>` or `<a>` — it is non-interactive (D-Claude-discretion: making the logo clickable would just refresh `/login` or create a circular nav). Verified by grep: `grep -A2 "<BrandLogo" app/\(public\)/layout.tsx` must NOT contain a parent `<Link>` or `<a>` tag.

### 6.2 Top-right toggle cluster (preserved unchanged)

The existing toggle cluster in `app/(public)/layout.tsx` lines 42-54 is **preserved verbatim** by Phase 15. Documenting the geometry for downstream verification:

| Property | Value | Source |
|----------|-------|--------|
| Position | `absolute` | line 43 (preserved) |
| Offset | `top: 24px, right: 24px` | lines 44-45 (preserved) |
| Display | `flex` | line 46 (preserved) |
| Gap between toggles | `12px` | line 47 (preserved) |
| z-index | `10` | line 48 (preserved) |
| Children | `<LocaleToggle current={lang} />` then `<ThemeToggle current={theme} />` | lines 51-52 (preserved) |

**PUB-01 success criterion #3 binding:** "Language and theme toggles remain in the top-right of all 3 public routes (different from authed/admin where they moved into the `RetractableSidebar`)." Phase 15 enforces this by **not modifying** the toggle cluster.

### 6.3 New CSS class: `.public-page-logo`

**File:** `app/globals.css` (D-08 — append to existing brand-logo selectors at lines 543-545).
**Insertion point:** immediately after the existing `html[data-theme="light"] .brand-logo-dark` / `html[data-theme="dark"] .brand-logo-light` picker rules (line 545), under a new `=== Phase 15 public-page logo sizing ===` section banner.

#### Exact CSS declaration

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
/* Cascade: the inner <img> tags inherit width via the wrapper.
   The <img> width/height HTML attributes (190/32 from Phase 11 defaults) act as fallbacks
   under CSS `width: auto; height: auto;` — overridden by the .public-page-logo rule above. */
.public-page-logo img {
  /* Force the inner <img> to fill the wrapper width (Phase 11 default has width attr=190) */
  width: 100%;
  height: auto;
  display: block;
}
```

#### CSS rationale (line-by-line)

| Rule | Why | Source decision |
|------|-----|-----------------|
| `width: clamp(140px, 50vw, 200px)` | Desktop ≥ 400px → 200px (max). Below 400px → scales to 50vw. Below 280px (extreme edge) → locks at 140px to preserve wordmark legibility. | D-02 + D-05 |
| `height: auto` | SVG aspect ratio (1192:200) auto-scales height proportionally — at 200px width → 33.5px height; at 140px width → 23.5px height. | D-07 |
| `display: inline-block` | Matches Phase 11's `<BrandLogo>` wrapper default (inline-style line 34 of BrandLogo.tsx). Restated in `.public-page-logo` for class-only-standalone consumption. | D-08 |
| `margin-bottom: 16px` | Gap between BrandLogo and the form card immediately below. Matches the v1.1 plain-text block's `marginBottom: 16` (line 62 of pre-Phase-15 layout). Preserves visual rhythm. | D-04 |
| `.public-page-logo img { width: 100% }` | Necessary because Phase 11's `<BrandLogo>` renders the `<img>` tags with literal HTML `width=190` and `height=32` attributes. CSS `width: clamp(...)` is applied to the **wrapper `<span>`**, not the `<img>` directly — the inner `<img>` must be told to fill the wrapper. | Phase 11 DOM contract |

#### Mobile responsive verification table

For each viewport width below, compute the rendered logo width via the clamp formula `clamp(140px, 50vw, 200px)`:

| Viewport width | 50vw | clamp(140, 50vw, 200) | Logo width | Logo height (÷5.96) |
|----------------|------|------------------------|------------|---------------------|
| 320px (smallest realistic mobile) | 160px | 160 (mid) | **160px** | ~26.8px |
| 360px | 180px | 180 (mid) | **180px** | ~30.2px |
| 400px | 200px | 200 (clamped at max) | **200px** | ~33.5px |
| 420px | 210px | 200 (max) | **200px** | ~33.5px |
| 768px (tablet portrait) | 384px | 200 (max) | **200px** | ~33.5px |
| 1024px (laptop) | 512px | 200 (max) | **200px** | ~33.5px |
| 1512px (Figma reference) | 756px | 200 (max) | **200px** | ~33.5px |
| 280px (extreme narrow — edge case) | 140px | 140 (clamped at min) | **140px** | ~23.5px |
| 240px (sub-280, ultra-narrow) | 120px | 140 (clamped at min) | **140px** | ~23.5px |

**Verification target (manual smoke + ROADMAP §Phase 15 success criterion #1):** at viewport ≥ 400px, the logo renders at 200×33.5px. Mobile breakpoints scale smoothly via clamp — no hard media queries needed (D-06).

#### Acceptance criteria (`.public-page-logo`)

- **AC-15-CSS-01:** The `.public-page-logo` rule exists in `app/globals.css` after the Phase 11 brand-logo selectors. Verified by `grep -n "\.public-page-logo" app/globals.css` returning 2 matches (the wrapper rule + the inner-img rule).
- **AC-15-CSS-02:** The rule contains the literal `clamp(140px, 50vw, 200px)` substring. Verified by grep.
- **AC-15-CSS-03:** At viewport widths 320 / 360 / 420 / 768 / 1024 / 1512, the rendered logo width matches the table above (±1px tolerance). Verified in manual smoke (Chrome DevTools responsive mode).
- **AC-15-CSS-04:** No new CSS variables are introduced. Verified by grep: `git diff app/globals.css` shows no new `--{name}:` declarations.
- **AC-15-CSS-05:** No modification to the existing `.brand-logo` base class or `.brand-logo-light` / `.brand-logo-dark` selectors (D-09). Verified by grep: the Phase 11 selectors at lines 544-545 are unchanged.

### 6.4 Form cards (`<LoginForm>`, `<SetPasswordForm>`, `<InviteForm>`)

**Locked unchanged per D-10.** Phase 15 does NOT modify the form components or their card chrome. All field structures, validation rules, submit-button styling, and error-message rendering are inherited verbatim from Phase 6 (`<LoginForm>`) and Phase 6 + Phase 7 (`<SetPasswordForm>`, `<InviteForm>`).

**Verification (PUB-01 + PUB-02 binding):**
- `grep -L "LoginForm\|SetPasswordForm\|InviteForm" $(git diff --name-only HEAD..main -- 'src/**/*.tsx' 'app/(public)/**/*.tsx')` after Phase 15 ships must NOT list any of the form component files among the modified set.
- Vitest tests for `<LoginForm>` (Phase 6) and `<SetPasswordForm>` / `<InviteForm>` (Phase 6/7) continue to pass with **zero changes** to their assertions.

### 6.5 Footer

**Locked unchanged.** The existing footer (`app/(public)/layout.tsx` lines 74-93) — copyright + Mentions légales link, 10.5px, `--muted`, `marginTop: 32` — is preserved verbatim by Phase 15. No new i18n keys, no styling changes.

---

## 7. Copywriting Contract

Phase 15 introduces **zero** new user-facing copy. All visible text on public routes after Phase 15 ships is identical to before — only the brand-mark visual changes.

| Element | Copy (FR / EN) | Source key | New in Phase 15? |
|---------|----------------|------------|------------------|
| BrandLogo `alt` text | `"Leasétic"` / `"Leasétic"` | `sidebar.brand` (existing) | No — reuses Phase 11 / Phase 6 key |
| Footer copyright | (existing FR / EN values) | `shell.footer.copyright` | No |
| Footer privacy link | `"Mentions légales"` / `"Privacy notice"` (existing) | `shell.footer.privacy` | No |
| Form field labels (login / invite / reset) | (existing) | Phase 6 / Phase 7 keys | No |
| Form error messages | (existing) | Phase 6 / Phase 7 keys | No |
| Submit button labels | (existing) | Phase 6 / Phase 7 keys | No |

**No primary CTA copy declared by Phase 15** — the CTAs on each public route (`<LoginForm>`'s "Se connecter" button, `<SetPasswordForm>`'s "Définir le mot de passe" button) are owned by their respective form components from Phase 6/7. Phase 15 is a shell-only modification.

**No empty state / error state / destructive confirmation copy declared** — Phase 15 introduces no new states. The public layout is a thin wrapper; all state-bearing UI lives inside the form components.

---

## 8. Accessibility

| Concern | Phase 15 behavior |
|---------|-------------------|
| BrandLogo alt text | `alt={t('sidebar.brand', lang)}` → `"Leasétic"` in both languages. Phase 11's BrandLogo renders both `<img>` tags with this alt; one is hidden via CSS, but screen readers may still announce both — acceptable because the alt text is identical, so it reads as one logical brand name. |
| Tab order | LocaleToggle → ThemeToggle → form fields → submit button → footer link. BrandLogo is **non-tabbable** (no `tabindex`, no `<Link>` wrapper, no native interactive element). Preserved from Phase 6. |
| Focus ring | BrandLogo wrapper has no `:focus-visible` rule (it is non-focusable). Toggles and form fields retain their existing `:focus-visible` rings (teal-18%, 3px spread). |
| Color contrast | Inherited from Phase 11 logo design — `#6DC388` mark + `--navy` (light) / `#e6e9ef` (dark) wordmark on `--paper` background was validated at Phase 11 logo design. Phase 15 introduces no new composite. **Re-verification deferred to v1.3 color refresh per §4.5.** |
| Reduced motion | No animations on the logo (D-Phase-15 specifics §"No animation — the logo appears statically on page load"). `prefers-reduced-motion` honored vacuously. |
| Screen-reader landmark | The `(public)` layout root is a plain `<div>` (line 28). The form card and footer are owned by their respective primitives. Phase 15 introduces no new landmarks. |

---

## 9. Tests

Per D-11 + D-12, Phase 15 adds **exactly 1 new Vitest test** and **updates any existing test** that asserted the plain-text "Leasétic" header.

### 9.1 New test (D-12)

**File:** likely `app/(public)/layout.test.tsx` (new file) or extend an existing test if one is present.

**Assertions:**
1. Rendering `<PublicLayout>{children}</PublicLayout>` produces a DOM that contains exactly one element matching `span.brand-logo.public-page-logo`.
2. The same DOM contains two `<img>` tags with classes `brand-logo-light` and `brand-logo-dark` respectively.
3. The same DOM contains the top-right absolute-positioned toggle cluster: a `<div>` with `position: absolute; top: 24; right: 24` containing both `<LocaleToggle>` and `<ThemeToggle>` (rendered by class names or test-ids per Phase 6 convention).
4. The same DOM **does NOT contain** the plain-text "Leasétic" header pattern (inline `fontSize: 22` style + `fontWeight: 700` on a `<div>` containing `'Leasétic'`).

**Coverage of the 3 routes:** since all 3 public routes (`/login`, `/invite/[token]`, `/reset/[token]`) share the same `app/(public)/layout.tsx`, asserting the layout's output once covers all 3 by the layout's shared-shell guarantee. ROADMAP §Phase 15 success criterion #4 ("All 3 public routes share a single reusable `(public)` layout component — verified by grep: the logo + paper-bg pattern is not duplicated across 3 files") is verified by an additional grep test step.

### 9.2 Updated tests (D-11)

If any existing test under `app/` or `src/` asserts the plain-text "Leasétic" header on `(public)` routes, update its expectation to assert the BrandLogo span instead. Probable candidates (developer audit):
- `app/(public)/login/page.test.tsx` (if exists)
- Any e2e or integration test that scrapes the login page DOM

**Verification:** after Phase 15 ships, no test in the codebase asserts the presence of the inline-styled plain-text "Leasétic" `<div>`. Grep: `grep -rn "fontSize: 22\|fontSize: '22'" {src,app}/**/*.test.{ts,tsx}` returns 0 matches related to the public layout.

### 9.3 Grep contract (ROADMAP §Phase 15 success criterion #4)

After Phase 15 ships:
- `grep -rn "paper" app/\(public\)/` returns 1 match (the `background: 'var(--paper)'` in `layout.tsx` line 35) — the paper-bg pattern is NOT duplicated across the 3 child route files.
- `grep -rn "BrandLogo" app/\(public\)/` returns 1 match (the invocation in `layout.tsx`) — the BrandLogo is mounted in the shared layout, not per-route.

---

## 10. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable (Phase 15 introduces no shadcn primitives) |
| third-party registries | none | not applicable |
| Phase 11 internal | `<BrandLogo>` (consumed verbatim, no shadcn) | not applicable |

**Phase 15 introduces no new dependencies, no new third-party components, no new registries.** The only "external" asset consumed is the Phase 11-shipped `<BrandLogo>` component and the existing `public/logo-light.svg` + `public/logo-dark.svg` SVG files (both present on disk per `ls public/` output during research).

---

## 11. What Phase 15 explicitly does NOT touch

Documented to prevent scope creep during planning + execution:

- **Form component internals** (`<LoginForm>`, `<SetPasswordForm>`, `<InviteForm>`) — D-10, PUB-01, PUB-02.
- **Footer copy or styling** — preserved verbatim from Phase 6.
- **Top-right toggle cluster geometry** (`top: 24, right: 24`, `gap: 12`) — preserved per PUB-01 success criterion #3.
- **Phase 11 `<BrandLogo>` component internals** (`src/components/ui/BrandLogo.tsx`) — D-09 explicit: do NOT modify the Phase 11 component.
- **Phase 11 `.brand-logo` base class or `.brand-logo-light` / `.brand-logo-dark` CSS selectors** — D-09.
- **Color tokens** (`--paper`, `--surface`, `--navy`, `--ink`, `--muted`, `--border`, `--brand-mark`) — color refresh deferred to v1.3 per PROJECT.md.
- **i18n keys** — no new keys; reuses `sidebar.brand` for the alt text.
- **Footer i18n keys** (`shell.footer.copyright`, `shell.footer.privacy`) — preserved verbatim.
- **`<LocaleToggle>` / `<ThemeToggle>` components** — preserved verbatim from Phase 5/Phase 6.
- **Authed / admin sidebar BrandLogo consumption** — owned by Phase 11 / Phase 14 (`<RetractableSidebar>`); Phase 15 only touches `(public)` routes.
- **`/healthz` route, the root `app/layout.tsx`, the no-flash script** — all untouched.
- **Mobile-specific layouts beyond the clamp() responsive scaling** — full mobile redesign deferred to v1.3+ (PROJECT.md constraint).
- **PDF preview mock** — `<PdfPreviewMock>` in Phase 13 also consumes BrandLogo at width=140; Phase 15 does not interact with this.

---

## 12. Phase 11 inheritance recap (no re-declaration)

Phase 15 inherits the following Phase 11 UI-SPEC contracts **verbatim, without modification**:

- §1 Design System (tool, preset, component library, icon library, font, token spine location, theme switch mechanism)
- §2 Spacing Scale (xs through 6xl — 4px multiples; layout-dim tokens)
- §3 Typography (13 semantic text styles + Plus Jakarta Sans + the wordmark chrome typography)
- §4.1 60/30/10 split (declared once in Phase 11; re-affirmed in Phase 15 §4.1)
- §4.2 Accent (`--gd`) reserved-for list (Phase 15 introduces no new `--gd` consumer)
- §4.3 Secondary semantic colors (consumed in Phase 15 §4.3, no new tokens)
- §4.4 Brand-mark color (`--brand-mark: #6DC388` — declared in Phase 11; consumed-but-not-re-declared in Phase 15)
- §5 Shadows + Focus Ring (no new shadows in Phase 15)
- §6.1 `<BrandLogo>` component DOM contract + prop signature + SVG file contract (consumed verbatim; only the consumer in `app/(public)/layout.tsx` changes)
- Acceptance criteria AC-BL-01 through AC-BL-06 from Phase 11 §6.1 — Phase 15 §6.1 acceptance criteria (AC-15-BL-01 through AC-15-BL-06) extend these for the public-surface consumer.

**If Phase 11 UI-SPEC and Phase 15 UI-SPEC disagree on any of the above, Phase 11 wins** (source-of-truth precedence #4 in the header).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (Phase 15 introduces zero new copy; §7 documents inherited copy with explicit "no new" disclaimers)
- [ ] Dimension 2 Visuals: PASS (§6.1 + §6.3 give exact BrandLogo invocation + exact CSS declaration with line-by-line rationale)
- [ ] Dimension 3 Color: PASS (§4 inherits Phase 11 token spine; zero new tokens; chrome-fill table binding for public surfaces)
- [ ] Dimension 4 Typography: PASS (§3 inherits Phase 11 13 semantic text styles; Phase 15 introduces zero new typography)
- [ ] Dimension 5 Spacing: PASS (§2 inherits Phase 11 4-multiples scale; §6.3 documents the only new spacing decision — `margin-bottom: 16px` on `.public-page-logo`, a token-`lg` value)
- [ ] Dimension 6 Registry Safety: PASS (§10 — Phase 15 introduces zero shadcn, zero third-party registries, zero new dependencies)

**Approval:** pending (awaiting `gsd-ui-checker` validation)

---

*Phase: 15-public-surface-brand-polish*
*UI-SPEC drafted: 2026-05-21*
*Source CONTEXT: `.planning/phases/15-public-surface-brand-polish/15-CONTEXT.md` (12 D-decisions, all locked)*
*Inherits: Phase 11 UI-SPEC token spine + BrandLogo contract; Phase 6 public layout shell*
