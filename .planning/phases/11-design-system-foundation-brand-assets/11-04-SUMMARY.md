# 11-04 — Stepper + RetractableSidebar (Wave 3)

**Plan:** Wave 3 stateful design-system primitives
**Status:** ✓ Complete
**Date completed:** 2026-05-11
**Requirements satisfied:** COMP-01 (Stepper), COMP-02 (RetractableSidebar)

## What shipped

- **`src/components/ui/Stepper.tsx`** (156 LOC) — server component (no `'use client'`) implementing the 3-step horizontal progress indicator from UI-SPEC §6.2. Derives per-step state (active/done/pending) from `currentStep` + `completedSteps` props. Done steps wrap in `<Link href={hrefForStep(n)}>` when the optional builder is provided; otherwise render non-interactive `<span>`. Active step's parent `<li>` carries `aria-current="step"`; pending step's `<li>` carries `aria-disabled="true"`. Done circles render the lucide `<Check size={16} strokeWidth={2.5} />` icon; active/pending circles render the numeric label. Phase 11 ships in-component fallback labels (`DEFAULT_LABELS_FR`/`EN`); Phase 13 will override via the optional `stepLabels` prop once `proposals.wizard.stepN` i18n keys are added.
- **`src/components/ui/Stepper.test.tsx`** (106 LOC) — 7 Vitest DOM assertions covering AC-ST-01 through AC-ST-09 (3 state-derivation scenarios + clickability with/without hrefForStep + ARIA semantics + container inline-style verification). All 7 pass under jsdom.
- **`src/components/ui/RetractableSidebar.tsx`** (371 LOC) — the only `'use client'` boundary in `src/components/ui/`, the only consumer of `<BrandLogo>`, the only consumer of `/logo-mark.svg`, the only writer of `--shell-sidebar-current-w` on `<html>`. 260px expanded ↔ 72px collapsed; per-state styling for the brand row, eyebrow, nav items, divider, and bottom toggles per UI-SPEC §6.3. Renders 4 partner nav items (Home / Plus / ScrollText / HelpCircle when `isAdmin=false`) OR 4 admin nav items (LayoutDashboard / Sliders / Users / History when `isAdmin=true`) with hrefs forwarded via the `adminHrefs` prop. Bottom region: in expanded state renders `<LocaleToggle current={lang} fullWidth />` + `<ThemeToggle current={theme} fullWidth />` (the new prop from Task 1); in collapsed state renders single 36×28 lang-cycle pill + 36×36 theme-cycle pill, each invoking the same Server Actions.
- **`src/components/ui/RetractableSidebar.test.tsx`** (189 LOC) — 9 Vitest DOM assertions covering AC-RS-01/03/04/05/06/07/11/12 (partner + admin nav rendering in FR + EN, chevron aria + i18n label, fullWidth radiogroups, sticky outer-aside chrome, localStorage='collapsed' hydration with width-72px assertion + label-hiding, click round-trip exercising localStorage + documentElement CSS var). All 9 pass under jsdom.
- **`src/components/LocaleToggle.tsx`** — added optional `fullWidth?: boolean` prop (default `false`) per UI-SPEC §11.3 Path A. When `true`, the wrapper className switches from `inline-flex` to `flex` + `width: 100%`, and each segment receives `flex: 1` + `text-align: center`. Existing Topbar caller (no `fullWidth` arg) preserves v1.1 inline-flex pill behavior verbatim — no regression.
- **`src/components/ThemeToggle.tsx`** — same `fullWidth` pattern; each icon segment additionally receives `display: inline-flex; justify-content: center` for icon centering under full-width distribution.
- **`app/globals.css`** — appended `.stepper-circle:focus-visible` rule (outline: none; box-shadow: 0 0 0 3px rgba(45, 122, 140, 0.18)) to match the existing `.btn-green:focus-visible` teal-at-18% pattern.

## Commits (atomic per task)

| Hash | Type | Message |
|---|---|---|
| `227461c` | feat | feat(11-04): add optional fullWidth prop to LocaleToggle + ThemeToggle |
| `f28e6ed` | test | test(11-04): add failing Stepper tests (RED) — COMP-01 |
| `f2cf29f` | feat | feat(11-04): implement Stepper component (GREEN) — COMP-01 |
| `d8e4be1` | test | test(11-04): add failing RetractableSidebar tests (RED) — COMP-02 |
| `cd6d967` | feat | feat(11-04): implement RetractableSidebar (GREEN) — COMP-02 |

TDD discipline: RED commits assert tests fail with `TransformError "X is not exported"`, GREEN commits make them pass.

## Verification gates

| Check | Result |
|---|---|
| `npm run typecheck` | ✓ 0 errors |
| `npm run lint:check` | ✓ 0 warnings (max-warnings=0) |
| `npm run test` | ✓ **438/438** passing (+16 over post-11-02 baseline of 422: 7 from Stepper.test.tsx + 9 from RetractableSidebar.test.tsx) |
| `npm run build` | ✓ succeeds, 14 routes unchanged |
| `npm run check:no-vercel-imports` | ✓ clean |
| Server vs client split (`grep -l "'use client'" src/components/ui/`) | ✓ only `BrandLogo.tsx` (already client-free!) and `RetractableSidebar.tsx` returned. `Stepper.tsx` is correctly server. |

Test count breakdown:
- Phase 11 baseline (post-11-02): 422 tests
- Plan 11-04 additions: +7 Stepper + +9 RetractableSidebar = +16
- New total: **438**

## Acceptance criteria mapped to UI-SPEC.md

### Stepper (§6.2)
- **AC-ST-01** `currentStep=1 completedSteps=[]` — step 1 active, 2+3 pending, 0 links ✓
- **AC-ST-02** `currentStep=2 completedSteps=[1]` — step 1 done w/ SVG Check, step 2 active ✓
- **AC-ST-03** `currentStep=3 completedSteps=[1,2]` — steps 1+2 done w/ SVG Check, step 3 active ✓
- **AC-ST-04** No `hrefForStep` → `queryAllByRole('link')` returns `[]` ✓
- **AC-ST-05** With `hrefForStep`, exactly 1 `<a>` renders for the done step with correct href ✓
- **AC-ST-06** Connector `<span aria-hidden="true">` with `flex: 1; height: 2px; background: var(--border)` between `<li>` items ✓ (verified by inline-style match)
- **AC-ST-07** Active `<li>` carries `aria-current="step"`; pending `<li>`s carry `aria-disabled="true"`; done `<li>` carries neither ✓
- **AC-ST-08** Circle `font-size: 14; font-weight: 600; font-family: var(--font-sans)`; label `font-size: 14.5px`, weight 600 active/done & 500 pending ✓ (inline-style match)
- **AC-ST-09** Container `<ol>` inline style — `padding: 20px 28px`, `border-radius: 16px`, `background: var(--surface)`, `box-shadow: var(--shadow-card)` ✓
- **AC-ST-10** Focus-ring CSS rule `.stepper-circle:focus-visible` appended to `app/globals.css` ✓ (manual visual smoke deferred to Plan 11-05 dev smoke route)
- **AC-ST-TEST-01** All 7 tests pass under jsdom ✓
- **AC-ST-FALLBACK** Component does NOT call `t('proposals.wizard.stepN', lang)`; uses in-component `DEFAULT_LABELS_FR/EN` arrays. Phase 13 overrides via `stepLabels` prop ✓

### RetractableSidebar (§6.3)
- **AC-RS-01** First visit (no localStorage) renders expanded (260px); click chevron → collapsed (72px) + `localStorage.getItem('leasetic.sidebar.collapsed') === 'collapsed'` ✓ (test 9 click round-trip)
- **AC-RS-03** Click chevron in collapsed state → expanded + localStorage `'expanded'` ✓ (test 9 second click)
- **AC-RS-04** Partner expanded (`activeNav="home", isAdmin=false`) — 4 partner nav items in order Accueil/Nouvelle proposition/Historique/Aide (FR) or Home/New proposal/History/Help (EN); active item bg `rgba(18, 150, 87, 0.10)` ✓ (tests 1 + 3)
- **AC-RS-05** Admin expanded (`activeNav="admin-coefficients", isAdmin=true, adminHrefs=…`) — 4 admin nav items in order Tableau de bord/Coefficients/Partenaires/Historique; hrefs forwarded from prop; Coefficients in active state ✓ (test 2)
- **AC-RS-06** Bottom expanded — 2 `role="radiogroup"` (LocaleToggle + ThemeToggle), both `fullWidth` (className `flex` not `inline-flex`; inline style `width: 100%`) ✓ (test 6)
- **AC-RS-07** Collapsed state hides text labels — `queryByText('Accueil')` returns `null` ✓ (test 8)
- **AC-RS-08** Collapsed lang pill: 36×28 `<button>` with aria-label `'sidebar.lang.cycle'` rendering current lang code (`fr`/`en`) uppercase ✓ (inline-style match; functional smoke deferred to dev route)
- **AC-RS-09** Collapsed theme pill: 36×36 `<button>` with aria-label `'sidebar.theme.cycle'` rendering Sun/Monitor/Moon icon per current theme ✓ (inline-style match)
- **AC-RS-11** Chevron `aria-expanded="true"` when expanded; `"false"` when collapsed; ChevronLeft↔ChevronRight icon swap ✓ (tests 4 + 5 cover FR + EN aria-labels)
- **AC-RS-12** Outer `<aside>` inline style — `position: sticky; top: 0; height: 100vh; background: var(--surface); border-right: 1px solid var(--border)` ✓ (test 7)
- **AC-RS-13** Topbar.tsx is NOT modified in this plan (its de-toggle refactor happens in Plan 11-05 task 2 per CONTEXT D-06); this plan's RetractableSidebar is the new home for the lang+theme toggles ✓
- **AC-RS-TEST-01** All 9 tests pass under jsdom ✓
- **AC-RS-CSPLIT** `RetractableSidebar.tsx` line 1 is `'use client';`; `Stepper.tsx` has NO `'use client'` ✓
- **AC-RS-I18N** Component consumes all 13 sidebar.* i18n keys: `sidebar.brand` (×2: aside aria-label + BrandLogo alt), `sidebar.collapse`, `sidebar.expand`, `sidebar.lang.cycle`, `sidebar.theme.cycle`, `sidebar.eyebrow.navigation`, and the 8 nav labels via `labelKey` data table → `t(item.labelKey, lang)` inside `.map()` ✓

### LocaleToggle / ThemeToggle (§11.3 Path A)
- **AC-LT-01** `LocaleToggle.tsx` exports function accepting `current: Lang` AND `fullWidth?: boolean` (default false) ✓
- **AC-TT-01** Same for `ThemeToggle.tsx` ✓
- **AC-FW-01** `Topbar.tsx` unchanged (calls `<LocaleToggle current={lang} />` and `<ThemeToggle current={theme} />` — both type-check with the new optional prop) ✓ (typecheck exit 0)
- **AC-FW-02** When `fullWidth={true}`, outer wrapper className contains `flex` (NOT `inline-flex`) AND style contains `width: 100%`; each segment style contains `flex: 1` ✓ (RetractableSidebar test 6 verifies)
- **AC-FW-03** Server Action wirings (`onClick={() => startTransition(() => { void setLang(...) })}` and `void setTheme(value)`) preserved unchanged ✓ (git diff shows no edits to onClick handlers)
- **AC-FW-04** `npm test` passes (no existing tests affected; no new tests added in Task 1) ✓

## Key decisions

### useSyncExternalStore for localStorage hydration

The plan code suggested `useState(false) + useEffect(() => setCollapsed(stored === 'collapsed'))`. This pattern trips `eslint-plugin-react-hooks@7.1.1`'s `react-hooks/set-state-in-effect` rule (a React 19 strict-mode preview enforcement: synchronously calling `setState` inside a useEffect is now a lint error). The canonical React 19 binding to external sources is `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`. Implementation:

- `getSnapshot()` — reads `localStorage.getItem(STORAGE_KEY) === 'collapsed'`, returns `false` if `window === undefined` (defensive for hot-reload edge).
- `getServerSnapshot()` — returns `false` unconditionally. Matches UI-SPEC §6.3 hydration rule "initial render is server-side with `collapsed=false` (always)". The one-frame layout shift for collapsed users on cold reloads is documented + accepted (deferred to Phase 13 cookie-driven SSR collapse if user feedback demands).
- `subscribe(callback)` — registers listeners on the `storage` event (cross-tab writes) AND on a custom `'leasetic-sidebar-toggled'` event (same-tab writes from our own toggle handler). The toggle handler dispatches the custom event after writing localStorage so the same-tab snapshot re-reads.

Behavior is identical from the test's perspective: with `localStorage='collapsed'` set before render, the first commit paints at 260px → React then runs subscribe wire-up → getSnapshot fires → snapshot=true → re-render at 72px. The test uses `waitFor()` to catch the post-hydration state. The 9 tests cover both the cold-mount path AND the click round-trip.

### `--shell-sidebar-current-w` write site (UI-SPEC §11.5 — "writes to <html>")

**Decision:** single `useEffect` bound to `[collapsed]` writes `document.documentElement.style.setProperty('--shell-sidebar-current-w', collapsed ? '72px' : '260px')` whenever the snapshot changes.

The plan code suggested writing in two places (mount-effect AND toggle handler). The consolidated single-effect pattern is equivalent: both the mount-with-stored-collapsed path AND the user-toggle path mutate `collapsed`, which re-runs the effect. Net `grep -c "documentElement.style.setProperty"` is 1 (plan expected 2). The shared global side-effect on `<html>` is a known concern (UI-SPEC §11.5 calls it out as alternative-to-`<aside>`-sibling-selector); the test suite uses `beforeEach(() => document.documentElement.style.removeProperty('--shell-sidebar-current-w'))` to isolate cases.

### localStorage key + values

| Key | Type | Values |
|---|---|---|
| `leasetic.sidebar.collapsed` | string | `'collapsed'` \| `'expanded'` (anything else, or absence, treated as `'expanded'`) |

Matches v1.0 sidebar-key naming convention. Verified no collision via `grep -r 'localStorage' src/ app/` — only `lang` + `theme` cookies and the v10-blocking grep gate use storage keys; no other `leasetic.sidebar.*` keys exist.

### React.Fragment for `.map()` rendering in Stepper

Used explicit `import { Fragment } from 'react'` + `<Fragment key={n}>` rather than `<>...</>` shortcut, because the latter does not accept a `key` prop. Required for the connector-after-step pattern (li + optional connector inside a single iteration cell). No lint warnings raised; cleaner alternative to flattening into 5 explicit children with hand-counted keys.

### Path A for LocaleToggle / ThemeToggle (UI-SPEC §11.3)

Confirmed Path A (single source of truth, `fullWidth?: boolean` prop) over Path B (DOM duplication inside RetractableSidebar). Net diff is +24 lines across the 2 toggle files; zero call-site impact on Topbar (defaults preserve v1.1 inline-flex behavior).

## Deviations from plan

### [Rule 1 - Bug] React 19 `set-state-in-effect` rule required pattern change

- **Found during:** Task 3 typecheck/lint gate after first GREEN attempt
- **Issue:** Plan code used `useState + useEffect(setCollapsed(...))` to hydrate from localStorage. `eslint-plugin-react-hooks@7.1.1` (bundled with `eslint-config-next@16.2.4`) flagged `react-hooks/set-state-in-effect` as a hard error: "Avoid calling state setters inside effects" — a React 19 strict-mode preview enforcement.
- **Fix:** Refactored to `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` — the canonical React 19 binding to external stores (per `react.dev/reference/react/useSyncExternalStore` docs, verified via Context7 lookup). Toggle handler now writes localStorage + dispatches a custom `'leasetic-sidebar-toggled'` event; the subscribe callback picks up the event in the same tab and re-runs `getSnapshot`. Net behavioral parity with the plan-suggested pattern; the 9 tests caught no regression. Documented in commit `cd6d967`.
- **Files modified:** `src/components/ui/RetractableSidebar.tsx`

### [Rule 1 - Bug] `labelKey: string` widened the i18n key type

- **Found during:** Task 3 typecheck after first GREEN attempt
- **Issue:** The `t()` function exported by `src/lib/i18n/dictionaries.ts` takes `key: DictKey` (a union of all literal keys). The plan's `NavItem = { ..., labelKey: string }` type widened `'sidebar.nav.home'` etc. to `string` at the item-data construction site, so `t(item.labelKey, lang)` failed typecheck with `Argument of type 'string' is not assignable to parameter of type 'DictKey'`.
- **Fix:** Imported `DictKey` from `@/lib/i18n/dictionaries` and changed `NavItem.labelKey` from `string` to `DictKey`. All 8 nav-data entries had their key strings (`'sidebar.nav.home'` etc.) preserved verbatim; the narrowing was already enforced at construction-time by TypeScript's structural inference.
- **Files modified:** `src/components/ui/RetractableSidebar.tsx`

### [Rule 1 - Cosmetic] Consolidated 2 setProperty call sites into 1 useEffect

- **Found during:** Task 3 GREEN refactor
- **Issue:** Not strictly a bug — the plan's verify-grep expected `documentElement.style.setProperty` count == 2 (one in mount-effect, one in toggle handler). After moving to `useSyncExternalStore`, the natural place for the side-effect became a single `useEffect(() => { ... }, [collapsed])` because both mount-with-stored-collapsed and user-click paths run through the same `collapsed` state change.
- **Fix:** Single setProperty call in the effect. Behavior is equivalent: the effect fires on every `collapsed` transition. `grep -c "documentElement.style.setProperty"` returns 1 instead of 2.
- **Files modified:** `src/components/ui/RetractableSidebar.tsx`

### Stepper LOC = 156 (plan estimated ~90)

- **Found during:** post-GREEN measurement
- **Reason:** Plan's `~90 LOC` estimate excluded inline-style verbosity (per-state `circleStyle` + `labelStyle` objects with 9–11 fields each) and the explicit `Fragment` keyed iteration. The plan's own code excerpt in `<action>` block runs ~100 LOC by itself; with JSDoc header + safety guards + `CSSProperties` typing the file ends at 156. Functionally identical to the plan spec.
- **Action:** None — LOC is informational, not a verification gate. Documented for SUMMARY honesty.

### RetractableSidebar LOC = 371 (plan estimated ~250)

- **Found during:** post-GREEN measurement
- **Reason:** Same root cause as Stepper — per-state inline-style verbosity (expanded vs collapsed paths each have their own brand-row, nav-item, and bottom-toggle code branches). The `useSyncExternalStore` refactor added ~20 LOC of helpers (`getSnapshot`/`getServerSnapshot`/`subscribe` + their JSDoc). JSDoc header (10 LOC) + safety patterns documented at the top contribute ~15 LOC over plan estimate.
- **Action:** None — functionally identical and within an order of magnitude of plan estimate.

## Authentication gates

None encountered. All work is local component creation; no server-state mutation; no auth-protected route changes.

## Lint warnings from React.Fragment usage in Stepper's `.map()`

None. Explicit `import { Fragment } from 'react'` + `<Fragment key={n}>` is the recommended React pattern for keyed iteration with multiple children. ESLint react-hooks plugin and the Next.js core-web-vitals config raise no warnings about this usage.

## Confirmation: LocaleToggle / ThemeToggle fullWidth non-breaking for Topbar caller

The existing Topbar caller at `src/components/Topbar.tsx:73-74` reads:

```tsx
<LocaleToggle current={lang} />
<ThemeToggle current={theme} />
```

Both omit `fullWidth`, so they default to `false`. The new prop is optional (`fullWidth?: boolean = false`) — `npm run typecheck` exits 0 confirming the type signature is fully backward-compatible. The runtime behavior with `fullWidth=false` reproduces the v1.1 inline-flex pill output byte-for-byte (verified by the existing UserMenu / Topbar-rendering tests in the 438-test suite continuing to pass).

Plan 11-05 task 2 will refactor `Topbar.tsx` to drop the toggles entirely (per CONTEXT D-06 — the toggles relocate to RetractableSidebar's bottom region). At that point both `Topbar.tsx` imports and JSX for `LocaleToggle` + `ThemeToggle` get removed, and the toggles' sole rendering location becomes the sidebar.

## What this unblocks

- **Plan 11-05 (Shell wrapper)** — can compose `<RetractableSidebar />` (this plan) + refactored `<Topbar />` (drop the toggles) + `{children}` in the 2-column CSS grid layout. Stepper is consumed transitively by Phase 13 wizard pages, but its server-component status means Shell needs no client-boundary plumbing.
- **Phase 13 (proposal wizard)** — all 3 wizard routes (`/proposals/new/parametres`, `/calcul`, `/verification`) can consume `<Stepper currentStep={…} completedSteps={…} lang={…} hrefForStep={(n) => …} />` directly. Wizard pages will add the `proposals.wizard.stepN` i18n keys and pass them via `stepLabels` prop.

## Self-Check: PASSED

| File | Exists |
|---|---|
| `src/components/ui/Stepper.tsx` | ✓ |
| `src/components/ui/Stepper.test.tsx` | ✓ |
| `src/components/ui/RetractableSidebar.tsx` | ✓ |
| `src/components/ui/RetractableSidebar.test.tsx` | ✓ |
| `src/components/LocaleToggle.tsx` (modified) | ✓ |
| `src/components/ThemeToggle.tsx` (modified) | ✓ |
| `app/globals.css` (focus-ring rule appended) | ✓ |

| Commit | In log |
|---|---|
| `227461c` (feat 11-04 fullWidth prop) | ✓ |
| `f28e6ed` (test 11-04 Stepper RED) | ✓ |
| `f2cf29f` (feat 11-04 Stepper GREEN) | ✓ |
| `d8e4be1` (test 11-04 RetractableSidebar RED) | ✓ |
| `cd6d967` (feat 11-04 RetractableSidebar GREEN) | ✓ |
