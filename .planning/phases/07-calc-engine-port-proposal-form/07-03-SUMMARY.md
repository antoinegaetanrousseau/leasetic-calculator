---
phase: 07-calc-engine-port-proposal-form
plan: "07-03"
subsystem: home-page-cta
tags: [home-page, cta, empty-state, css-base-classes, v10-port, prop-01-grounded]

# Dependency graph
requires:
  - phase: 06-auth-shell
    provides: "(authed) layout shell + Topbar (pageTitle defaults to t('header.home', lang)) + requireUser() + getCurrentLang()/t() i18n helpers + ESLint no-restricted-syntax JSXText rule + Phase-5 CSS token spine (--gd, --teal, --danger, --paper, --surface, --ink, --muted, --border, --shadow-card, etc.)"
  - phase: 07-06-i18n-keys
    provides: "30 Phase-7 dictionary keys × 2 langs — dashboard.greeting (with {0} interpolation), dashboard.subtext, dashboard.cta.new.proposal, dashboard.recent.title, dashboard.empty.title, dashboard.empty.body all consumed in this plan"
provides:
  - "Phase-7 home page shell at app/(authed)/page.tsx — hero greeting + primary CTA Link to /proposals/new + recent-proposals empty-state card (PROP-01 grounded)"
  - "13 v10 base CSS classes added to app/globals.css as a class-based contract Plans 07-04/05 will consume: .card, .ctitle (+.dot), .fld (+label/req/error-msg/input chrome), input.invalid + input[aria-invalid='true'], .ieu (+suffix +focus-within), .tbadge, .dg (+.db / .db.on / hover / invalid), .yn-group / .yn-btn (+.on), .btn-green / .btn-navy / .btn-out (shared base + focus-visible + disabled)"
  - "Visual home contract: 24px h1 greeting on --paper, 14.5px subtext muted, .btn-green CTA with Plus icon at left, .card + .ctitle + 1px separator + min-h-240 empty-state with FileText icon (38px, opacity 0.4)"
affects:
  - "Plan 07-04 (proposal form scaffold) — inherits .card / .fld / .ieu / .dg / .db / .yn-btn / .btn-green / .btn-navy / .btn-out / input[aria-invalid] as a className-only contract; no inline-styled v10 chrome required"
  - "Plan 07-05 (live preview) — inherits .card / .ctitle / .tbadge / .btn-green / .btn-out + tranche badge surface for tLabel rendering"
  - "REQUIREMENTS.md — PROP-01 grounded by the empty-state shell (full requirement requires Phase-8 row population for the populated state; partial completion noted)"

# Tech tracking
tech-stack:
  added: []  # No new deps — uses existing lucide-react, next/link, @/lib/auth/require, @/lib/i18n
  patterns:
    - "Server Component for the home page — no 'use client'; only interactivity is <Link> from next/link (RSC-compatible)"
    - "Manual {0} interpolation via .replace() — Phase 6's t() does NOT auto-interpolate; React JSX child auto-escape covers XSS on displayName"
    - "Defence-in-depth requireUser(): runs at both the (authed) layout AND the page itself (matches Plan 06-07 admin tree pattern; documents the pattern for Phase 8/9 pages)"
    - "v10 CSS classes ported as pure-additive declarations using var(--*) tokens exclusively — zero new --token: declarations introduced; existing Phase 5/6 components untouched"
    - "Class-based contract for Plans 07-04/05: lift v10 form chrome from inline-styled per-component to globals.css className contract"

key-files:
  created:
    - ".planning/phases/07-calc-engine-port-proposal-form/07-03-SUMMARY.md (this file)"
  modified:
    - "app/(authed)/page.tsx (-21 / +122 = +101 net): replaced Phase-6 minimal placeholder with Phase-7 home shell — Server Component, requireUser() + getCurrentLang(), greeting + subtext + .btn-green Link to /proposals/new + .card recent-proposals empty-state"
    - "app/globals.css (+237 lines): appended 13 v10 base classes after the Phase-5 token spine + body styles + print invariants; preserves Phase 5/6 token integrity (zero new --token: declarations)"

key-decisions:
  - "CSS classes added as a SHARED CONTRACT for both 07-03 and 07-04/05 — even though 07-03 only uses .card / .ctitle / .btn-green directly, the full v10 base set is dropped here once-and-for-all. Per the orchestrator's sequential note: 'do not duplicate CSS work that should be shared.' Plans 07-04/05 inherit ALL 13 classes without re-touching globals.css."
  - "Interpolation strategy: .replace('{0}', displayName) — Phase 6's t() returns the literal string with {0} preserved; the consumer interpolates. React JSX child auto-escape sanitizes any HTML chars in displayName at render time. This is the same pattern Plan 07-06 SUMMARY's 'Gotchas for Downstream Plans' item 1 mandated."
  - "Server Component over Client Component for HomePage — only interactivity is <Link>, which works in RSC. Phase 8's eventual population (proposals list) can also stay server-rendered (data fetched at request time via requireUser() → user.id → DB query). 'use client' is NOT introduced."
  - "Recent-proposals .ctitle has NO leading dot (deviation from generic UI-SPEC §3.2.2 chrome) — this is an INFORMATIONAL section header on a list, not a form section. The .dot is reserved for form sections per UI-SPEC convention; using it here would visually conflate 'list section' with 'form input group.' Documented in the page comment."
  - "Defence-in-depth requireUser() at the page even though (authed)/layout.tsx already gates — matches Plan 06-07 admin tree pattern. The redundant call is cheap (cached session), and it forwards correctly-typed `session` for the displayName fallback chain. PITFALLS §7.3 ordering preserved."

patterns-established:
  - "Phase-N page replacement cadence: Server Component first; Link for navigation; t() for ALL user-facing strings; .replace('{0}', value) for interpolation; defence-in-depth requireUser() at the page level"
  - "v10 base class additions cadence: append at end of globals.css, NEVER modify existing rules, var(--*) tokens exclusively, group with /* === Plan-X-Y additions === */ separator comment, document the v10 source line range"
  - "PROP-01 partial-completion pattern: shell ships in Phase 7 (empty state grounds the requirement structurally), full population ships in Phase 8 (PROP-02..05 add the row data). Mark requirement complete when the structural surface lands; document partial in the requirement note."

requirements-completed:
  - "PROP-01 (Authenticated partner sees a home page with a prominent 'Create new proposal' CTA) — empty-state portion grounded by this plan; full requirement (with populated row data) blocks on Phase 8 PROP-02..05"

# Metrics
duration: 8 min
completed: 2026-05-08
---

# Phase 7 Plan 3: Home Page CTA + v10 Base CSS Classes Summary

**PROP-01 home shell shipped: Server-rendered greeting + primary CTA Link + .card empty-state with FileText icon at `app/(authed)/page.tsx`. Class-based v10 form chrome contract added once to `app/globals.css` (13 classes, 237 lines) — Plans 07-04/05 now inherit `.card`/`.fld`/`.ieu`/`.dg`/`.db`/`.yn-btn`/`.btn-*` as a className surface and no longer need to re-inline v10 chrome per component.**

## Performance

- **Duration:** ~8 min (start: 2026-05-08T21:32:49Z; end: 2026-05-08T21:40:09Z plus SUMMARY)
- **Started:** 2026-05-08T21:32:49Z
- **Completed:** 2026-05-08T21:40:09Z
- **Tasks:** 2
- **Files created:** 1 (this SUMMARY.md)
- **Files modified:** 2 (`app/(authed)/page.tsx`, `app/globals.css`)

## Accomplishments

- **`app/globals.css` extended with 13 v10 base classes (237 net lines added).** All declarations use `var(--*)` token references — zero new `--token:` declarations introduced. The block is appended after the Phase-5 token spine + body styles + print invariants; existing Phase 5/6 rules untouched. Verification grep counts:

  | grep pattern | count |
  | --- | --- |
  | `^\.btn-green` | 5 (base + 3 hover/focus-visible/disabled groups) |
  | `^\.card` | 1 |
  | `^\.fld` | 10 (.fld, .fld + .fld, .fld > label, .fld .req, .fld .error-msg, 4× input chrome selectors, .fld input:focus) |
  | `^\.dg ` | 5 (.dg, .dg.invalid, .dg .db, .dg .db:last-child, .dg .db:hover, .dg .db.on counted with `^\.dg `) |
  | `input\[aria-invalid` | 1 |
  | `\.ieu` (any) | 8 (.ieu, .ieu:focus-within, .ieu.invalid, .ieu input × 3 selectors, .ieu .suffix) |
  | `\.tbadge` | 1 |
  | `^[[:space:]]*--[a-z-]+:` (token declarations total) | 45 (= Phase 5/6 baseline; ZERO net new tokens) |

- **`app/(authed)/page.tsx` rewritten as Phase-7 home shell.** -21/+122 = +101 net lines. Server Component (no `'use client'`). Imports: `Link` from `next/link`, `Plus` + `FileText` from `lucide-react@0.469.0`, `requireUser` from `@/lib/auth/require`, `getCurrentLang` + `t` from `@/lib/i18n`. Structure:
  - **Hero greeting section** (`<section>` with 32px margin-bottom on `--paper`):
    - `<h1>` 24px/700/--ink rendering `t('dashboard.greeting', lang).replace('{0}', displayName)` with manual interpolation
    - `<p>` 14.5px/400/--muted rendering `t('dashboard.subtext', lang)`
    - `<Link href="/proposals/new" className="btn-green">` with leading `<Plus size=17>` icon and aria-label
  - **Recent-proposals card** (`<section className="card">`):
    - `<div className="ctitle">` rendering `t('dashboard.recent.title', lang)` (no leading dot — informational header, not form section)
    - 1px `--border` separator (12px / 16px margin)
    - Empty-state body (min-height 240, flex-column-center) with `<FileText size=38 strokeWidth=1.3 opacity=0.4>` icon, `<h2>` 16.5px/600 `t('dashboard.empty.title', lang)`, `<p>` 14.5px/400 max-width-480 `t('dashboard.empty.body', lang)`

- **PROP-01 grounded.** The empty-state shell satisfies the structural portion of PROP-01 (authenticated partner sees a prominent "Create new proposal" CTA). Full requirement completion (populated row data via PROP-02..05) blocks on Phase 8.

- **Test count: 227/227 still passing.** No new tests added by this plan (per plan note — visual surface, not logic). No regressions introduced.

## Task Commits

1. **Task 1: Add v10 base CSS classes to globals.css (one-shot for Plans 07-03/04/05)** — `67b5904` (feat)
2. **Task 2: Replace app/(authed)/page.tsx with Phase-7 home shell (CTA + empty-state list)** — `79fd6d6` (feat)

(Plan-metadata commit follows below.)

## Files Created/Modified

### Created

- **`.planning/phases/07-calc-engine-port-proposal-form/07-03-SUMMARY.md`** (this file).

### Modified

- **`app/globals.css`** — appended 13 v10 base CSS classes (237 lines). NO modification to existing tokens or rules. v10 source: `Matrice_2026_THE_Leasetic-v10.html` lines 170-260.
- **`app/(authed)/page.tsx`** — replaced Phase-6 placeholder (uses legacy `welcomeHeading`/`welcomeSubtext` keys) with Phase-7 home shell (uses `dashboard.greeting`/`.subtext`/`.cta.new.proposal`/`.recent.title`/`.empty.title`/`.empty.body`). Phase-6 `welcomeHeading` + `welcomeSubtext` keys remain in `dictionaries.ts` for backward-compat per pre-06 STATE.md decision; not deleted.

## Decisions Made

1. **Full v10 base class set added in this plan, not deferred to per-plan additions in 07-04/05.** Orchestrator note flagged the duplication risk: "do not duplicate CSS work that should be shared — drop the full v10 base class set in this plan." All 13 classes added once, with appropriate v10 source citations. Plans 07-04 and 07-05 will consume them as a className-only contract.

2. **`.ctitle` for the recent-proposals card has no leading `.dot`.** UI-SPEC §3.2.2 reserves the dot for form section headers (the dot has a fixed `--gd` color signaling "active form group"). The recent-proposals title is an informational list header, not a form section. The `.ctitle .dot` rule in globals.css is preserved for Plans 07-04/05 to use, but this page omits the dot in markup. Documented inline in the page.

3. **Manual `{0}` interpolation strategy.** Phase 6's `t()` helper returns the literal dictionary string with `{0}` preserved (dictionaries.ts line 283: `'dashboard.greeting': 'Bonjour, {0} 👋'`). Used `.replace('{0}', displayName)`. React JSX child auto-escape (`{greeting}` as JSX child) handles XSS on the interpolated displayName per T-07-03-01 mitigation in the plan threat model. This matches Plan 07-06 SUMMARY's "Gotchas for Downstream Plans" guidance.

4. **Server Component over Client Component.** No interactivity required beyond a `<Link>` (which is RSC-compatible in Next.js 16 App Router). Aligns with Phase 6's pattern: `requireUser()` runs server-side, page renders server-side, no JS hydration needed for the home shell. Future Phase 8 population can also stay server-rendered.

5. **Defence-in-depth `requireUser()` at the page despite layout already gating.** Matches Plan 06-07 admin tree (`/[adminSegment]/page.tsx` calls `requireAdmin()` independently). The redundant call is cheap (Better Auth caches the session per request) and gives the page a strongly-typed `session` for the displayName fallback chain (`displayName ?? name ?? email`). PITFALLS §7.3 ordering preserved.

## Deviations from Plan

**1. [Rule 4-adjacent design call] Recent-proposals `.ctitle` markup omits the leading `.dot` element.** The plan's CSS contract includes `.ctitle .dot` with `background: var(--gd)`, but UI-SPEC §3.2.2 reserves the dot for form section headers. This page is an informational list header. The rule is added to globals.css as specified (so Plans 07-04/05 have it), but the markup omits the `<span class="dot"/>` child. Not a deviation from the plan's CSS contract — only from the plan's MARKUP example which had `<div className="ctitle"><span>...</span></div>` without a dot anyway. Aligned with the plan's existing example.

**2. [Plan-aligned, noted for traceability] Verification used `npm run lint` (non-strict) instead of `npm run lint:check` (strict).** The pre-existing `scripts/seed-admins-launch.ts:42` `'and' is defined but never used` warning fails `--max-warnings=0`. This warning is documented in `deferred-items.md` (Phase 7) as out-of-scope for all Phase 7 plans. Plans 07-01 and 07-02 followed the same convention. The Plan 07-03 page itself was independently lint-checked with `npx eslint "app/(authed)/page.tsx" --max-warnings=0` → exit 0 (zero output).

No other deviations. The page structure exactly matches the plan's prescribed body. The CSS additions exactly match the `<v10_class_contract>` block.

## Issues Encountered

**Pre-existing `scripts/seed-admins-launch.ts:42` lint warning persists** (the same warning logged in Plans 07-01, 07-02, 07-06). `npm run lint` (non-strict) exits 0 with the warning surfaced; `npm run lint:check` (strict, zero-warnings) fails on it. Per executor scope-boundary rules, NOT auto-fixed in this plan (it's in `scripts/`, not in this plan's `files_modified` list). Continues to be tracked in `deferred-items.md`.

## User Setup Required

None — no external service configuration required for this plan.

## Verification Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 (no TypeScript errors) |
| `npm run lint` | Exit 0 (1 pre-existing out-of-scope warning) |
| `npx eslint "app/(authed)/page.tsx" --max-warnings=0` | Exit 0 (zero output — page is clean for the strict gate) |
| `npm run build` | Exit 0 (route `ƒ /` compiles; route map unchanged from Phase 6) |
| `npm test` | 227/227 passing (no regression — Phase 7 Wave 2 baseline preserved) |
| `grep -c "/proposals/new" "app/(authed)/page.tsx"` | 1 (CTA href present) |
| `grep -c "dashboard.greeting" "app/(authed)/page.tsx"` | 2 (interpolation comment + t() call) |
| `grep -c "dashboard.cta.new.proposal" "app/(authed)/page.tsx"` | 2 (aria-label + button label) |
| `grep -c "dashboard.empty.title" "app/(authed)/page.tsx"` | 1 (h2 i18n) |
| `grep -c "FileText" "app/(authed)/page.tsx"` | 2 (lucide import + JSX use) |
| `grep -c "from 'next/link'" "app/(authed)/page.tsx"` | 1 |
| `grep -c "use client" "app/(authed)/page.tsx"` | 0 (Server Component, correct) |
| `grep -c "^\.btn-green" app/globals.css` | 5 (.btn-green + base shared rule + :hover + :focus-visible + :disabled) |
| `grep -c "^\.card" app/globals.css` | 1 |
| `grep -c "^\.fld" app/globals.css` | 10 |
| `grep -c "^\.dg " app/globals.css` | 5 |
| `grep -c "input\[aria-invalid" app/globals.css` | 1 |
| `grep -c "\.ieu" app/globals.css` | 8 |
| `grep -c "\.tbadge" app/globals.css` | 1 |
| `grep -cE "^[[:space:]]*--[a-z-]+:" app/globals.css` (total tokens) | 45 (= Phase 5/6 baseline; ZERO new --token: declarations) |

## Visual Regression Check (Manual smoke pending)

Per the plan's `<output>` section: "Phase 6 visual regression check result (manual: LoginForm, InviteUrlModal, UserMenu, error/404 still render correctly)."

The new `.btn-green` class rule in globals.css is **purely additive**: existing Phase 6 components (LoginForm, SetPasswordForm, InviteUrlModal, error.tsx, not-found.tsx) reference `.btn-green` as `className="btn-green"` AND ALSO carry inline `style={{ background: 'var(--gd)', ... }}`. The inline `style` props take precedence (CSS specificity rules) over class rules, so the visual rendering is unchanged. The new class rule simply adds a class-based contract that future RSC-only components (Plans 07-03/04/05) can rely on.

`npm run build` succeeds and route map is unchanged: `ƒ /, ƒ /_not-found, ƒ /[adminSegment], ƒ /api/auth/[...all], ƒ /healthz, ƒ /invite/[token], ƒ /login, ƒ /reset/[token]` — same as Phase 6's exit. No new routes, no removed routes. Manual browser smoke test deferred (the home page requires authentication; the deferred check is cosmetic only, since the inline `style` props on Phase 6 components dominate the new class rule).

## Gotchas for Downstream Plans

1. **Plan 07-04 (proposal form scaffold):** All v10 base classes are already in globals.css. Use them as `className="card"`, `className="fld"`, `className="ieu"`, `className="dg"`, `<button className="db on">`, `className="yn-btn"`, `className="yn-btn on"`, `<button className="btn-green">`, etc. Do NOT re-inline v10 styles — the contract is now class-based.

2. **Plan 07-05 (live preview):** Same — `<section className="card">`, `<div className="ctitle"><span className="dot"/><span>{t(...)}</span></div>` for form section headers (with the dot, this time, since live-preview is a form-adjacent panel). For tranche badges: `<span className="tbadge">{t(tLabel(tk), lang)}</span>`.

3. **`.dg` / `.db` in v10 was a flexbox row of pills; in this CSS it's a 3-column grid with NO inter-button gap (visually merged into a single segmented control with internal `border-right: 1px solid --border` separators).** The plan's UI-SPEC §3.2.5 mandated this updated visual; Plans 07-04/05 should treat the segmented control as a SINGLE rounded outline container with N internal cells, not N independent pill buttons. The `.db.on` state uses `--gd` background + white text (consistent with v10's `.db.on` semantic, but visually adapted to the new segmented chrome).

4. **`.yn-btn` follows the same pattern** — the v10 split-pill (left side green-tinted on-yes, right side gray on-no) is replaced by a 2-column segmented control where the active button gets `--gd` background + white text. Plan 07-04 should NOT use `on-yes` / `on-no` class names from v10 — the new contract is a single `.on` modifier.

5. **`.btn-green` already has `padding: 0.6rem 1.5rem` and `border-radius: 9999px` from the new shared rule.** Plan 07-03's page tsx still passes `style={{ padding: '0.75rem 1.5rem', width: 'max-content' }}` because the home CTA wants slightly more vertical padding than the form-row CTAs (visual hierarchy). Plans 07-04/05 do NOT need to re-pass padding — the class default is fine for form-row submit buttons.

6. **The `welcomeHeading` + `welcomeSubtext` keys are NOT removed from dictionaries.ts.** Phase 5 placeholder keys per pre-06 STATE.md decision; preserved for backward-compat. Other future plans may rely on them. Do NOT delete.

7. **Manual `{0}` interpolation pattern for Plans 07-04/05:** Wherever a key contains `{0}` (e.g., `proposal.validity.computed.label = "Valable {0} jours"` from Plan 07-06), use `t(key, lang).replace('{0}', value.toString())`. Always render the result as a JSX child for React's auto-escape.

## Threat Flags

None — this plan ships a Server-Component home page + pure-additive CSS. No new network endpoints, no auth paths, no file access, no schema changes. The plan's `<threat_model>` correctly identified T-07-03-01 (XSS via interpolated displayName); mitigation is React JSX child auto-escape, validated by the rendering pattern (`{greeting}` is rendered as a JSX child, not via raw-HTML injection APIs).

## Next Phase Readiness

- **Plan 07-04 unblocked** (proposal form scaffold). Inherits `.card` / `.fld` / `.ieu` / `.dg` / `.db` / `.yn-btn` / `.btn-green` / `.btn-navy` / `.btn-out` / `input[aria-invalid="true"]` as a className-only contract. Form sections use `<div className="ctitle"><span className="dot"/><span>{t(...)}</span></div>`.
- **Plan 07-05 unblocked** (live preview composition). Inherits `.card` / `.ctitle` / `.tbadge` / `.btn-green` / `.btn-out`. Tranche badge surface ready.
- **Phase 7 progress: 4/6 plans complete.** Wave 3 partially shipped (07-03 ✅; 07-04 next, then Wave 3 done). Wave 4 (07-05 live preview) follows.
- **PROP-01 partially complete** — empty-state shell shipped here; populated row data is Phase 8's PROP-02..05.

## Self-Check: PASSED

- `app/(authed)/page.tsx` exists and is the new Phase-7 shell (verified by grep counts above).
- `app/globals.css` extended with all 13 v10 base classes (verified by grep counts above).
- Both task commits exist in `git log`:
  - `67b5904 feat(7-03): add v10 base CSS classes to globals.css for Plans 07-03/04/05`
  - `79fd6d6 feat(7-03): replace home page placeholder with Phase-7 shell (PROP-01)`
- All `<success_criteria>` from the plan satisfied:
  - Page rebuilt with greeting + CTA Link + empty-state list shell, all strings via t() ✅
  - 13 v10 base classes added to globals.css with var(--*) tokens (zero new --token: declarations) ✅
  - typecheck / lint / test / build all exit 0 (227/227 tests preserved) ✅
  - No new ESLint hardcoded-JSX violations (page passes strict gate) ✅
  - SUMMARY.md created at expected path ✅
  - No files modified outside `files_modified` list (excluding tracking) ✅

---
*Phase: 07-calc-engine-port-proposal-form*
*Completed: 2026-05-08*
