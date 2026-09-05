---
phase: 15-public-surface-brand-polish
plan: 01
subsystem: public-shell
tags: [brand, ui, css, public-routes, tdd, shell-only]
dependency_graph:
  requires:
    - Phase 11 BrandLogo component (`src/components/ui/BrandLogo.tsx`)
    - Phase 11 brand-logo CSS picker (`app/globals.css` lines 543-545)
    - Phase 11 ASSET-01 + ASSET-02 SVG files (`public/logo-light.svg`, `public/logo-dark.svg`)
    - Existing `sidebar.brand` i18n key (no new keys added)
  provides:
    - `<BrandLogo className="public-page-logo" />` SVG lockup as the public-route brand anchor
    - `.public-page-logo` CSS sizing class with responsive `clamp(140px, 50vw, 200px)`
    - Reusable shared `(public)` layout pattern — single edit propagates to all 3 routes
  affects:
    - `/login` page chrome (now SVG lockup above LoginForm)
    - `/invite/[token]` page chrome (inherits via shared layout)
    - `/reset/[token]` page chrome (inherits via shared layout)
tech_stack:
  added: []
  patterns:
    - Async server-component testing in Vitest via `await PublicLayout({ children })` then `render(ui)` — first-of-kind in this codebase, documented in test-file header for future planners.
key_files:
  created:
    - app/(public)/layout.test.tsx
  modified:
    - app/(public)/layout.tsx
    - app/globals.css
decisions:
  - D-02/D-05/D-08: `.public-page-logo` uses `width: clamp(140px, 50vw, 200px)` — caps at 200px on wide viewports, floors at 140px on narrow.
  - D-04: `margin-bottom: 16px` preserved from v1.1 plain-text header for vertical-rhythm continuity above the form card.
  - D-07: `.public-page-logo { height: auto }` + `.public-page-logo img { width: 100%; height: auto }` — required cascade because Phase 11 BrandLogo renders `<img width="190" height="32">` HTML attributes that would otherwise win over the wrapper's clamped width.
  - D-09: Phase 11 brand-logo CSS picker (`html[data-theme="..."] .brand-logo-{light,dark} { display: none }`) left UNTOUCHED at globals.css lines 543-545.
  - D-10: Phase 15 is shell-only — zero modifications to LoginForm, SetPasswordForm, InviteForm, footer, toggle cluster, or color tokens.
  - AC-15-BL-06: BrandLogo NOT wrapped in `<Link>` — non-interactive brand anchor, no circular-nav surface.
metrics:
  duration: ~11min
  tasks_total: 1
  tasks_complete: 1
  test_count_before: 872
  test_count_after: 876
  files_created: 1
  files_modified: 2
  commits: 2
  completed_date: 2026-05-21
---

# Phase 15 Plan 01: Public Surface Brand Polish — Summary

Replaced the v1.1 plain-text `Leasétic` header in the shared `app/(public)/layout.tsx` with the Phase 11 `<BrandLogo>` SVG component using a new `.public-page-logo` CSS class (clamp 140px/50vw/200px); change propagates automatically to `/login`, `/invite/[token]`, and `/reset/[token]` via the single shared server layout (PUB-01 + PUB-02 closed).

## Atomic Commits

| # | Phase | Hash | Type | Message |
|---|-------|------|------|---------|
| 1 | RED   | `84410c1` | `test` | add failing public layout BrandLogo test (PUB-01, PUB-02) |
| 2 | GREEN | `3fd1121` | `feat` | swap public layout plain-text header for BrandLogo + public-page-logo CSS (PUB-01, PUB-02) |

## What Shipped

### 1. `app/(public)/layout.tsx` (modified)

- Added `import { BrandLogo } from '@/components/ui/BrandLogo';` to the import cluster (after the existing `getCurrentLang, getCurrentTheme, t` import).
- Removed the v1.1 plain-text logo block (was a `<div>` with `fontWeight: 700; color: var(--navy); fontSize: 22; marginBottom: 16; userSelect: none;` containing `{t('sidebar.brand', lang)}`).
- Inserted in its place: `<BrandLogo className="public-page-logo" alt={t('sidebar.brand', lang)} />` — no `width` / `height` props, the CSS class is authoritative.
- Preserved verbatim: outer flex-center wrapper (`background: var(--paper)`, `padding: 24px 16px`), the absolute top-right toggle cluster (`position: absolute; top: 24; right: 24; gap: 12; zIndex: 10`), `{children}`, and the footer (`marginTop: 32`, `fontSize: 10.5px`, `color: var(--muted)`, Mentions légales link).

### 2. `app/globals.css` (appended at end-of-file, after Phase 11 Stepper rule)

```css
/* === Phase 15 public-page logo sizing (PUB-01, PUB-02 — UI-SPEC §6.3, D-08) === */
.public-page-logo {
  width: clamp(140px, 50vw, 200px);
  height: auto;
  display: inline-block;
  margin-bottom: 16px;
}
.public-page-logo img {
  width: 100%;
  height: auto;
  display: block;
}
```

The inner-img cascade rule is REQUIRED — without `width: 100%` on `.public-page-logo img`, the literal `width="190"` HTML attribute on the Phase 11 BrandLogo's `<img>` tags would override the clamped wrapper width.

The existing Phase 11 brand-logo CSS picker at lines 543-545 (`html[data-theme="light"] .brand-logo-dark { display: none }` / `html[data-theme="dark"] .brand-logo-light { display: none }`) is untouched per D-09.

### 3. `app/(public)/layout.test.tsx` (new — 130 lines)

Four Vitest assertions:

- **AC-15-BL-01** — `<BrandLogo>` with `.public-page-logo` className renders: outer `span.brand-logo.public-page-logo` contains two `<img>` tags (one `.brand-logo-light` → `/logo-light.svg`, one `.brand-logo-dark` → `/logo-dark.svg`), both with `alt="Leasétic"`.
- **AC-15-BL-02** — v1.1 plain-text header is gone: no `<div>` with inline style `font-size: 22; font-weight: 700` exists in rendered output.
- **AC-15-BL-03** — Top-right LocaleToggle + ThemeToggle cluster preserved: the absolute-positioned wrapper (`position: absolute; top: 24; right: 24`) exists and contains both toggles.
- **T-15-01** — Information-disclosure gate: rendered DOM contains no `commission`, `admin`, or `[adminSegment]` substrings.

The test file documents the first-of-kind async-server-component pattern (`await PublicLayout({ children })` → `render(ui)`) in a top-of-file comment for future planners adding tests for `(authed)` or `(admin)` layouts.

## Verification Results

### Automated gates (all PASS)

| Check | Result |
|-------|--------|
| `npm test -- app/(public)/layout.test.tsx --run` | 4 passed (0 failed) |
| `npm test --run` (full suite) | **876 passed**, 4 skipped (was 872; +4 net per plan target) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 (0 errors; 3 pre-existing warnings unrelated to this plan) |
| `npm run build` | exit 0 (Next.js production build, all 24 routes compiled) |

### Grep contracts (UI-SPEC §9.3)

| Gate | Want | Got | Status |
|------|-----:|----:|:------:|
| `grep -c 'BrandLogo' app/(public)/layout.tsx` | 2 | 2 | ✅ |
| `grep -c 'public-page-logo' app/(public)/layout.tsx` | 1 | 1 | ✅ |
| `grep -c '\.public-page-logo' app/globals.css` | 2 | 2 | ✅ |
| `grep -c 'clamp(140px, 50vw, 200px)' app/globals.css` | 1 | 1 | ✅ |
| `grep -rln 'fontSize: 22' app/(public)/*.tsx` (non-test files) | 0 | 0 | ✅ |
| `grep -rln 'BrandLogo' app/(public)/*.tsx` (non-test files) | 1 | 1 | ✅ |
| `grep -c "sidebar.brand" app/(public)/layout.tsx` | 1 | 1 | ✅ |

**Note on test-file matches.** The raw `grep -rln` queries from the plan's `<verify>` block include `layout.test.tsx` in their scan, so `fontSize: 22` appears 1× (inside test it() description + negative-assertion `s.includes(...)` literal) and `BrandLogo` appears in 2 files (the production layout + the test that imports/references it). The grep contracts above use `--include='*.tsx' --exclude='*.test.tsx'` to scope to production files per the plan's documented intent ("plain-text header is gone" — verified in `layout.tsx`; "mounted only in shared layout, not duplicated per route" — verified by the single non-test `.tsx` hit).

### Threat-model gates

| Threat | Disposition | Verification |
|--------|-------------|--------------|
| T-15-01 (info disclosure of admin URLs) | mitigate | T-15-01 Vitest assertion: rendered DOM contains no `commission` / `admin` / `[adminSegment]` substrings. **PASS.** |
| T-15-02 (BrandLogo SVG injection) | accept | No user input flows in; `src` attrs are hard-coded string literals in Phase 11 component. **NO CHANGE.** |
| T-15-03 (BrandLogo as nav element / CSRF) | accept | Grep contract confirms no parent `<Link>` or `<a>` around `<BrandLogo>`. **PASS.** |
| T-15-04 (clamp DoS) | accept | `clamp(140px, 50vw, 200px)` bounded by CSS spec to [140, 200]. **NO CHANGE.** |
| T-15-05 (theme-flash exposing wrong-theme logo) | mitigate | Phase 6 no-flash script + Phase 11 CSS picker still active; both `<img>` tags render in Vitest with the picker hiding one synchronously at runtime. Manual smoke (below) reconfirms zero flash. |
| T-15-06 (public layout adopting authed chrome) | accept | File-scope: only `app/(public)/layout.tsx` modified; `app/(authed)/`, `app/(admin)/` untouched. **NO CHANGE.** |

## Phase 15 Success Criteria (ROADMAP §Phase 15)

| # | Criterion | Status | Verification |
|---|-----------|:------:|--------------|
| 1 | `/login` swaps plain-text "Leasétic" → SVG logo lockup centered above form card; form unchanged | ✅ | Vitest AC-15-BL-01 + grep `fontSize: 22` = 0 in non-test files |
| 2 | Body background on `/login`, `/invite/[token]`, `/reset/[token]` = `--paper`; form card stays `--surface` | ⏳ (automated) | `background: 'var(--paper)'` on layout line 35 preserved (no edit to lines 27-40); form cards owned by Phase 6 form primitives, also unmodified. Manual smoke below outstanding for Chrome + Edge. |
| 3 | LocaleToggle + ThemeToggle stay top-right on all 3 public routes | ✅ | Vitest AC-15-BL-03 |
| 4 | All 3 routes share one reusable `(public)` layout — no per-route duplication | ✅ | Grep contract: `BrandLogo` appears in exactly 1 non-test file in `app/(public)/` (the shared layout) |
| 5 | Manual smoke: correct logo variant per theme on each route; no flash on reload | ⏳ (manual) | Smoke table below |

## Manual Smoke Runbook — 12 checkpoints (3 routes × 2 themes × 2 browsers)

Executor cannot run a live browser within this environment — manual smoke is the user's responsibility per project policy (`verifier_enabled: false`). Below is the runbook template; user signs off post-merge.

| Route | Theme | Browser | Logo SVG renders | Mark = #6DC388 | Wordmark theme-correct | Body = --paper | Card = --surface | Toggles top-right | No flash on reload | Theme swap no flash |
|-------|-------|---------|:----------------:|:--------------:|:----------------------:|:--------------:|:----------------:|:-----------------:|:------------------:|:-------------------:|
| /login | light | Chrome  | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /login | light | Edge    | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /login | dark  | Chrome  | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /login | dark  | Edge    | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /invite/<token> | light | Chrome | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /invite/<token> | light | Edge   | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /invite/<token> | dark  | Chrome | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /invite/<token> | dark  | Edge   | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /reset/<token>  | light | Chrome | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /reset/<token>  | light | Edge   | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /reset/<token>  | dark  | Chrome | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| /reset/<token>  | dark  | Edge   | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

Bonus check: resize browser to 320px width on `/login` — confirm logo scales smoothly via clamp (expect ~160px wide at viewport=320 per `clamp(140px, 50vw, 200px)` → `50% * 320 = 160`).

## What Was NOT Modified (Invariants Preserved)

- **Phase 11 `<BrandLogo>` component** (`src/components/ui/BrandLogo.tsx`) — consumed verbatim; no changes to its public API or rendered DOM.
- **Phase 11 CSS picker** (`app/globals.css` lines 543-545) — `.brand-logo-light` / `.brand-logo-dark` display rules untouched (D-09).
- **Form primitives** — `<LoginForm>`, `<SetPasswordForm>`, `<InviteForm>` and their containing pages (`app/(public)/login/page.tsx`, `app/(public)/invite/[token]/page.tsx`, `app/(public)/reset/[token]/page.tsx`) all untouched (D-10 shell-only).
- **Footer** in `app/(public)/layout.tsx` — `marginTop: 32`, `fontSize: 10.5px`, `color: var(--muted)`, Mentions légales link preserved verbatim.
- **Top-right toggle cluster** — same `position: absolute; top: 24; right: 24; gap: 12; zIndex: 10` styling; both `<LocaleToggle current={lang} />` and `<ThemeToggle current={theme} />` invocations identical.
- **Color tokens & CSS variables** — no new `--variables`, no edits to existing tokens; v1.3 color refresh remains the appropriate vehicle per PROJECT.md.
- **i18n keys** — no new keys; the `sidebar.brand` key (returns `'Leasétic'` in FR + EN per `dictionaries.ts` lines 41 + 707) is reused for the BrandLogo `alt` prop.
- **Other layouts** — `app/(authed)/`, `app/(admin)/`, `app/layout.tsx` (root) — all untouched.

## Deviations from Plan

**1. [Rule 1 — Bug] TypeScript namespace error in test file**
- **Found during:** GREEN typecheck step
- **Issue:** Used `as JSX.Element` cast in the renderPublicLayout helper. The project uses the React 19 `jsx-react` runtime with `jsx: "preserve"` in `tsconfig.json`, so the global `JSX` namespace is not exposed — typecheck failed with `error TS2503: Cannot find namespace 'JSX'`.
- **Fix:** Replaced `JSX.Element` with `ReactElement` imported from `react`; removed an unused `eslint-disable import/first` directive that ESLint flagged after the change.
- **Files modified:** `app/(public)/layout.test.tsx` (within the same GREEN commit).
- **Commit:** GREEN `3fd1121` (folded into the GREEN squash since the RED commit's test file was identical except for these two lines).

**2. [Rule 3 — Documentation match] Plan's grep gate scope clarified**
- **Found during:** GREEN grep-contract verification
- **Issue:** Plan's raw `grep -rln 'fontSize: 22' app/(public)/` and `grep -rln BrandLogo app/(public)/` queries scan ALL `.tsx` files including the new `layout.test.tsx`, which legitimately contains the strings as part of its negative-assertion logic. Naively reading the gates would report 1 and 2 instead of 0 and 1.
- **Fix:** Reported the gates with `--include='*.tsx' --exclude='*.test.tsx'` to scope to production files per the plan's documented intent ("plain-text header is gone" / "mounted only in shared layout, not duplicated per route"). The intent-scoped gates all return their expected counts.
- **Files modified:** none (verification methodology only)
- **Commit:** none

**3. [Rule 1 — RED assertion count]** The plan's RED-phase contract said "all 3 tests MUST fail before GREEN" — but the actual count of behavior-changing tests is 2 (AC-15-BL-01: BrandLogo present, AC-15-BL-02: plain-text header absent). Tests 3 and 4 (AC-15-BL-03 toggle cluster, T-15-01 info-disclosure) are invariant-guard tests — they must pass before AND after the swap, since the toggle cluster and the absence of admin URLs were already correct in the pre-Phase-15 layout. The RED run correctly showed 2 failed + 2 passed; the GREEN run correctly shows 4 passed. This is a clarification of test intent, not a behavior change.

No other deviations. Phase 15 is a tightly-scoped shell-only swap and executed exactly per plan.

## REQUIREMENTS.md closing

Both PUB-01 and PUB-02 are closed by this plan:

- **PUB-01** — "Public routes adopt centered Leasétic SVG logo above form card" → ✅ implemented via the BrandLogo swap in the shared `(public)` layout.
- **PUB-02** — "Logo sizing responsive via `clamp(140px, 50vw, 200px)`" → ✅ implemented via the `.public-page-logo` CSS class with the exact clamp formula from UI-SPEC §6.3.

User to update REQUIREMENTS.md Traceability table to mark both rows as ✅ (executor leaves the markdown edit to the user pending final visual smoke).

## Self-Check: PASSED

- ✅ FOUND: `app/(public)/layout.test.tsx`
- ✅ FOUND: `app/(public)/layout.tsx` (modified — confirmed via `git log -1 --stat`)
- ✅ FOUND: `app/globals.css` (modified — confirmed via `git log -1 --stat`)
- ✅ FOUND: commit `84410c1` (RED test)
- ✅ FOUND: commit `3fd1121` (GREEN implementation)
- ✅ All 7 grep gates return expected counts
- ✅ Full Vitest suite 876 passed (target ≥ 875)
- ✅ Typecheck / lint / build all exit 0
