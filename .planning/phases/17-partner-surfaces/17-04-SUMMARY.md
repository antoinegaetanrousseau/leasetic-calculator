---
phase: 17-partner-surfaces
plan: 04
subsystem: partner-routes, filter-pill
tags: [proposals-route, filter-pill, archived-filter, page-hero, ssr, url-state, tdd, wave-2, props-01, props-02]

# Dependency graph
requires:
  - phase: 17-partner-surfaces
    provides: "17-01 — BuildListParams.archived?: boolean threaded through buildListResponse (Plan 17-04 consumes via ?archived=1 → archived: true at the SSR call site)"
  - phase: 17-partner-surfaces
    provides: "17-02 — proposals.title / proposals.subtitle / proposals.filter.actives / proposals.filter.archived / proposals.empty.actives / proposals.empty.archived / dashboard.cta.new i18n keys (FR + EN) consumed by both the route and the FilterPillRow"
  - phase: 17-partner-surfaces
    provides: "17-03 — Partner Home rewrite retired the inline ProposalsList + SearchBar + RecentlyDeletedToggle mounts; this plan owns the dedicated /proposals surface those moves landed in"
  - phase: 16-shell-refresh-contrast-gates
    provides: "<PageHero> primitive (D-19 partner-side adopter) — title/subtitle/actions slot consumed verbatim"
  - phase: 14-admin-polish-partners-history-home
    provides: "ProposalRowDto.displayStatus (D-27 server-derived chip variant); ADMIN-09 9-gate grep-contract suite (D-29) — stays green throughout"
  - phase: 13-3-step-proposal-wizard
    provides: "Server-component test scaffolding pattern (vi.hoisted + vi.mock('next/navigation') + redirect-throws) reused verbatim in app/(authed)/proposals/page.test.tsx"
  - phase: 8-persistence-pdf-pipeline
    provides: "Cursor-based pagination (base64 cursor) + ILIKE search wired into ProposalsList + SearchBar — reused verbatim per D-14"
provides:
  - "app/(authed)/proposals/page.tsx — dedicated server-rendered /proposals route (PROPS-01) with PageHero + FilterPillRow + SearchBar + ProposalsList; in-page Archivées toggle via ?archived=1"
  - "app/(authed)/proposals/_components/FilterPillRow.tsx — client component with two <Link> pills (Actives / Archivées) for URL-driven state (D-11 — diverges intentionally from RecentlyDeletedToggle's imperative router.replace)"
  - "Empty-state copy switching at the page level (proposals.empty.archived vs proposals.empty.actives) — handles approach (a) from PLAN.md <interfaces>: page conditional, no ProposalsList extension"
  - "T-17-04-01 IDOR mitigation: userId for buildListResponse always comes from session.user.id (never from query) — Test 7 enforces requireUser-before-buildListResponse order via callOrder assertion"
  - "T-17-04-05 open-redirect mitigation: <Link> href values are literal strings (/proposals + /proposals?archived=1) — no interpolation, no user-input bleed"
affects:
  - "17-05/06/07 (wizard refresh plans) — unaffected; orthogonal to the list surface"
  - "17-08 (visual QA / acceptance smoke) — picks up the /proposals surface end-to-end; Figma chrome match verifiable here (Partner Home 9:47 + admin partners 42:46 patterns inherited per UI-SPEC)"
  - "Plan 17-08 contrast audit append — CONTRAST-02 Row 11 (dark-mode active filter pill, ~3.9:1) is accepted-as-is per Option 1 (matches existing .chip-active baseline, no regression); must be recorded in docs/accessibility/16-contrast-audit.md addendum"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL-driven filter state via Next.js <Link> (NOT imperative router.replace) — full SSR re-render, shareable URLs, browser back/forward works natively (D-11)"
    - "Server-prop-driven active-state in client component — `archived` boolean is server-derived (searchParams === '1'), passed as a prop; client never reads useSearchParams (keeps SSR-rendered active state stable across navigation)"
    - "Inline empty-state-copy switching at the server page — avoids extending ProposalsList for a single per-surface copy variant"
    - "callOrder array via vi.hoisted to assert defense-in-depth ordering between mocked dependencies (requireUser before buildListResponse) — proves IDOR mitigation by invocation sequence"

key-files:
  created:
    - "app/(authed)/proposals/page.tsx (148 lines) — server route with PageHero + FilterPillRow + SearchBar + ProposalsList layout"
    - "app/(authed)/proposals/page.test.tsx (315 lines) — 9 Vitest tests covering PROPS-01/02 + IDOR ordering invariant"
    - "app/(authed)/proposals/_components/FilterPillRow.tsx (93 lines) — client component with two <Link> pills using only existing tokens"
    - "app/(authed)/proposals/_components/FilterPillRow.test.tsx (134 lines) — 6 AC tests covering active/inactive styling, href contracts, data-testid attributes, FR+EN copy"
  modified: []

key-decisions:
  - "CONTRAST-02 Row 11 dark-mode borderline — adopted Option 1 (accept-as-is). The dark-mode active filter pill at ~3.9:1 matches the existing `.chip-active` baseline shipped since Phase 8; no regression. Adding `--active-pill` token would have violated ROADMAP §v1.3 §3 palette stability invariant. Plan 17-08 contrast audit append records as 'matches existing baseline, no regression'."
  - "Empty-state approach (a) — server page handles the copy switch inline (`{archived ? 'empty.archived' : 'empty.actives'}`). Approach (b) — extending ProposalsList to read ?archived and switch copy internally — was rejected because ProposalsList already has three empty-state branches (search-empty / deleted-empty / new-partner-empty) and adding a fourth would have entangled the component with a route-specific signal (archived is a /proposals concept, not a general list one). Approach (a) keeps ProposalsList unchanged."
  - "ProposalsList re-mount key = `${q}|${archived?'1':'0'}|${cursor??''}` — adds `archived` segment beyond the v1.1 pattern (which was just `q|cursor`). Ensures fresh client state on filter toggle even when q and cursor are unchanged."
  - "FilterPillRow uses `<Link>` (D-11 inversion of RecentlyDeletedToggle's `router.replace`) — full SSR re-render on click, shareable URLs, browser back/forward works without intervention. The trade-off: a full page render vs RecentlyDeletedToggle's soft replace. Acceptable for this surface (rare toggle, list will re-fetch anyway)."
  - "Inline styles for FilterPillRow (not new CSS classes) — UI-SPEC §FilterPillRow specifies exact pixel values for active/inactive pills. The styles are bespoke to this surface (no existing `.filter-pill` class); inline styles keep the visual contract co-located with the component. ROADMAP §v1.3 §3 palette stability honored: only `var(--gd-text)` + `var(--muted)` + `var(--paper)` + `var(--border)` + the existing `rgba(18,150,87,0.10)` literal from `.chip-active` are used."
  - "DeleteJustToast mounted on /proposals (not just Partner Home) — the delete redirect target may shift to /proposals in a future plan; mounting here covers both lineages without breaking the Partner Home mount (Plan 17-03)."

requirements-completed: [PROPS-01, PROPS-02]

# Metrics
duration: ~5min
completed: 2026-05-24
---

# Phase 17 Plan 04: /proposals route + FilterPillRow Summary

**Ships the dedicated `/proposals` server-rendered route (PROPS-01) and the `<FilterPillRow>` client component (PROPS-02 / D-11) — splits the proposals list out of Partner Home into its own surface with an in-page Archivées toggle, consuming the archived filter from Plan 17-01 and the i18n keys from Plan 17-02.**

## Performance

- **Duration:** ~5 min
- **Tasks:** 2 (both TDD: RED → GREEN, 4 commits)
- **Files modified:** 4 (2 new client/server src + 2 colocated tests)

## Accomplishments

- **Task 1 — FilterPillRow client component (TDD RED → GREEN):**
  - RED: 6 AC-FPR tests fail (component file doesn't exist; vite import-resolution error).
  - GREEN: client component renders two `<Link>` pills wrapped in a segmented `role="tablist"` container.
    - Active pill: `rgba(18,150,87,0.10)` bg + `var(--gd-text)` color + 600 weight (matches `.chip-active` chrome family).
    - Inactive pill: transparent bg + `var(--muted)` color + 500 weight (matches `.toggle-pill` chrome).
    - `data-testid` attributes (`filter-pill-actives` + `filter-pill-archived`) added per D-21 recommendation for future Playwright tests.
    - `archived` is a prop (NOT useSearchParams in client) — keeps SSR-rendered active state stable across navigation (D-11).
  - All 6 AC-FPR tests pass (active/inactive styling × 2 directions, href contracts × 2, data-testid presence, FR+EN copy).
- **Task 2 — /proposals server route (TDD RED → GREEN):**
  - RED: 9 behavior tests fail (route file doesn't exist).
  - GREEN: `app/(authed)/proposals/page.tsx` ships with:
    - `export const dynamic = 'force-dynamic'` + `metadata.title = 'Mes propositions — Leasétic Matrice'`
    - `requireUser()` defense-in-depth + `getCurrentLang()` + `searchParams` Promise unwrap (Next.js 16 shape)
    - Single SSR `buildListResponse({ userId: session.user.id, q, cursorEncoded: cursor, archived, limit: 20 })` call — IDOR-safe userId scope
    - Layout: `<DeleteJustToast/>` + `<PageHero/>` (title + subtitle + Nouvelle proposition CTA) + filter+search flex row + `<ProposalsList/>` (with re-mount key) OR empty-state `.card`
    - Inline empty-state copy switch (`proposals.empty.archived` vs `proposals.empty.actives`)
    - `ProposalsList` re-mount key = `${q}|${archived?'1':'0'}|${cursor??''}` (extends v1.1 pattern with archived segment)
  - All 9 behavior tests pass.
- **ADMIN-09 9-gate grep-contract suite** stays green throughout (verified after each commit). The new route + component touch zero commission surface — `FilterPillRow` is pure URL navigation; `/proposals` reuses `ProposalsList` + `buildListResponse` projection which strip `paramsSnapshot` at the API layer.
- **TypeScript** clean: `npx tsc --noEmit` exits 0 after each commit.
- **All 133 proposals/ tests pass** (verifies the plan-level verification gate `npm test -- "app/(authed)/proposals/"`).

## Task Commits

Each task committed atomically (TDD: RED + GREEN per task):

1. **Task 1 RED — failing FilterPillRow tests** — `09d2a60` (test)
2. **Task 1 GREEN — FilterPillRow client component** — `7b95a3a` (feat)
3. **Task 2 RED — failing /proposals route tests** — `8691df6` (test)
4. **Task 2 GREEN — /proposals server route** — `35e72c8` (feat)

## Files Created/Modified

- **app/(authed)/proposals/_components/FilterPillRow.tsx** (CREATED, 93 lines) — Client component (`'use client'`). Two `<Link>` pills (Actives `href="/proposals"`, Archivées `href="/proposals?archived=1"`) in a segmented `role="tablist"` container. Active/inactive styling via inline-style constants; CONTRAST-02 Row 11 accepted-as-is per Option 1. Top docstring cites D-11 inversion rationale.
- **app/(authed)/proposals/_components/FilterPillRow.test.tsx** (CREATED, 134 lines) — 6 AC tests: active/inactive styling assertions via inline-style regex matching; href contracts; data-testid presence; FR+EN copy verification.
- **app/(authed)/proposals/page.tsx** (CREATED, 148 lines) — Server route with PageHero + filter+search row + list-or-empty conditional. Top docstring cites D-10/D-11/D-13/D-14/D-18/D-19 + the IDOR-by-construction defense pattern.
- **app/(authed)/proposals/page.test.tsx** (CREATED, 315 lines) — 9 Vitest tests covering: archived flag wiring (3 tests for false/true/q+archived), PageHero copy, FilterPillRow+SearchBar sibling mounting, ProposalsList render + cursor propagation, requireUser-before-buildListResponse ordering (callOrder array assertion), Nouvelle proposition CTA href, and empty-state copy switch.

## Decisions Made

- **CONTRAST-02 Row 11 = Option 1 (accept-as-is).** Dark-mode active filter pill ~3.9:1 matches existing `.chip-active` baseline (same token pair, same opacity, shipped since Phase 8). Adding `--active-pill` token at higher opacity (Option 2) would have violated ROADMAP §v1.3 §3 palette stability invariant. UI-SPEC frontmatter `flags_outstanding` allowed both options; PLAN.md Task 1 action step 8 explicitly recommended Option 1 for palette stability. Plan 17-08 contrast audit append records the row as "matches existing baseline, no regression."
- **Empty-state approach (a): inline page conditional.** Approach (b) — extending `ProposalsList` to read `?archived` for empty-state copy switching — was rejected. `ProposalsList` already branches on three empty-state cases (search-empty / deleted-empty / new-partner-empty); adding a fourth route-specific branch (`archived-empty`) would entangle the component with a `/proposals`-specific URL convention. The server page knows `archived` natively (already parsed for the SSR call), so the conditional is one line. ProposalsList stays unchanged.
- **`<Link>` over `router.replace` (D-11 divergence).** `RecentlyDeletedToggle` uses imperative `router.replace` on `onClick` for a soft-replace (no full re-render). `FilterPillRow` uses `<Link>` for full SSR re-render + shareable URLs. The trade-off is one full page render per filter toggle vs RecentlyDeletedToggle's client-only soft replace; acceptable here because the list refetches anyway and shareable URLs are a partner-onboarding requirement.
- **Inline styles for FilterPillRow (not a new CSS class).** UI-SPEC §FilterPillRow specifies exact pixel values; the styling is bespoke to this surface. Adding a `.filter-pill` class to `app/globals.css` would have grown the global CSS for a single component without abstraction value. Inline-style constants kept co-located.
- **ProposalsList re-mount key extended with archived segment.** v1.1 pattern was `${q}|${cursor??''}`; Plan 17-04 adds `${archived?'1':'0'}|` between q and cursor. Ensures fresh client state on filter toggle even when q and cursor are unchanged.
- **DeleteJustToast mounted on /proposals.** Carries forward the toast lineage from v1.1 Partner Home; future plans may shift the delete redirect target to /proposals. Mounting here covers both lineages.

## Deviations from Plan

None — both tasks followed the TDD RED → GREEN cycle exactly as written. All done-criteria pass:

1. `app/(authed)/proposals/_components/FilterPillRow.tsx` starts with `'use client'` ✓
2. Component uses `<Link href>` (not `router.replace`) — verified by `grep -n "router.replace" FilterPillRow.tsx` returning only the comment line citing the D-11 inversion ✓
3. `grep -c "data-testid=\"filter-pill-actives\"\|data-testid=\"filter-pill-archived\"" FilterPillRow.tsx` returns 2 ✓
4. All 6 AC-FPR tests pass ✓
5. No new CSS tokens introduced — palette stability invariant preserved ✓
6. `app/(authed)/proposals/page.tsx` contains `export const dynamic = 'force-dynamic'` and `requireUser()` call ✓
7. `grep -c "archived" page.tsx` returns 10 (>= 3 — includes searchParams parse + buildListResponse arg + FilterPillRow prop + docstring) ✓
8. `grep -c "buildListResponse" page.tsx` returns 4 (1 import + 2 docstring + 1 call site) — **done-criterion stated `== 1` literally; the SINGLE-SSR-CALL invariant is satisfied (line 66 is the only invocation)**; Test 7 mechanically enforces single invocation via `expect(buildListResponseMock).toHaveBeenCalledTimes(1)` in Test 1.
9. `grep -c "session.user.id" page.tsx` returns 2 (1 docstring + 1 actual usage) — `>= 1` satisfied ✓
10. All 9 behavior tests pass ✓
11. `npm test -- tests/admin-09-grep-contracts.test.ts` exits 0 ✓

## Done-Criteria Interpretation Note

The PLAN.md done-criterion `grep -c "buildListResponse" page.tsx == 1` was written assuming a literal-count match. The actual SINGLE-SSR-CALL invariant is satisfied — line 66 of `page.tsx` is the only invocation site. The other 3 occurrences are: 1 import statement, 2 docstring comments explaining the IDOR mitigation + ADMIN-09 invariant. Test 7's `expect(buildListResponseMock).toHaveBeenCalledTimes(1)` mechanically enforces the invariant. Removing the docstring references to satisfy a literal-count gate would have stripped meaningful security commentary without changing the invariant. Same situation for `requireUser()` (2 hits — 1 docstring + 1 call).

## Issues Encountered

- **Pre-existing test failures unchanged by this plan:** 11 failures remain that were already documented in 17-01, 17-02, and 17-03 SUMMARYs (9 in `src/components/ui/RetractableSidebar.test.tsx` due to a `window.localStorage.clear is not a function` jsdom setup issue + 2 in `__pdf-fixtures__/render-fixtures.test.ts` byte-determinism fixtures). None of these touch the files this plan modifies. Verified out-of-scope per deviation Rule 4 scope-boundary clause.
- **No build / typecheck failures.** `npx tsc --noEmit` exits 0 after each commit.
- **No ADMIN-09 regression.** 9-gate suite green after both Task 1 GREEN and Task 2 GREEN commits.

## TDD Gate Compliance

Both tasks followed the per-task TDD cycle correctly:

- **Task 1 RED:** `09d2a60` (`test(17-04): add failing tests for FilterPillRow (PROPS-02 RED)`) — verified failing with vite import-resolution error (module didn't exist).
- **Task 1 GREEN:** `7b95a3a` (`feat(17-04): add FilterPillRow client component (PROPS-02 / D-11 GREEN)`) — all 6 tests pass.
- **Task 2 RED:** `8691df6` (`test(17-04): add failing tests for /proposals route (PROPS-01 RED)`) — verified failing with vite import-resolution error.
- **Task 2 GREEN:** `35e72c8` (`feat(17-04): add /proposals server route (PROPS-01 D-10/D-13/D-14 GREEN)`) — all 9 tests pass.

No REFACTOR commits needed; both implementations were minimal and final on first pass.

## Threat Model Verification

All 6 threats from the plan's `<threat_model>` register are mitigated as designed:

- **T-17-04-01 (IDOR via query):** `userId` for `buildListResponse` always sourced from `session.user.id`. Test 7 enforces requireUser-before-buildListResponse order via `callOrder` array assertion + cross-checks `buildListResponseMock` received the session userId.
- **T-17-04-02 (Archivées window leak):** Plan 17-01 owns the SQL filter (`userId AND (expired OR deleted within 30d)`); Plan 17-04 calls the helper with `session.user.id` only — no leak surface added.
- **T-17-04-03 (q param XSS):** SearchBar reused verbatim from v1.1; Drizzle parameterization + React auto-escape continue.
- **T-17-04-04 (cursor manipulation):** Phase 8 base64 cursor format reused; userId scope makes attacker-supplied cursors yield zero results.
- **T-17-04-05 (open redirect):** `<Link>` hrefs are literal strings (`/proposals` + `/proposals?archived=1`) — no interpolation, no off-site redirect possible.
- **T-17-04-06 (commission leak):** ProposalsList reuses ProposalRowDto projection — `paramsSnapshot` (commission_pct bearing) stripped at the API layer; ADMIN-09 9-gate suite green.

## User Setup Required

None — no external service configuration, no environment variables, no schema migrations. Plan 17-01 (DB/API foundation) + Plan 17-02 (i18n keys + PdfPreviewMock) shipped all upstream dependencies.

## Next Phase Readiness

- **Plan 17-05 (Wizard step 1 visual refresh)** unaffected by this plan — orthogonal to the list surface.
- **Plan 17-06 (Wizard step 2 visual refresh + restructure)** unaffected.
- **Plan 17-07 (Wizard step 3 visual refresh + WIZ-04 + WIZ-06)** unaffected.
- **Plan 17-08 (visual QA / acceptance smoke + contrast audit append)** picks up the new `/proposals` surface end-to-end. Must:
  - Visually verify `/proposals` and `/proposals?archived=1` toggle works (SSR re-render visible in URL bar)
  - Verify Figma chrome match (PageHero + filter+search row + list)
  - Add CONTRAST-02 rows 10 + 11 to `docs/accessibility/16-contrast-audit.md` (Row 10: light-mode active pill PASS at 4.96:1; Row 11: dark-mode active pill ~3.9:1 accepted-as-is per Option 1, matches existing `.chip-active` baseline)
- **No blockers** for Wave-2 wizard plans (17-05/06/07).

## Self-Check: PASSED

Files verified to exist:
- FOUND: `app/(authed)/proposals/_components/FilterPillRow.tsx`
- FOUND: `app/(authed)/proposals/_components/FilterPillRow.test.tsx`
- FOUND: `app/(authed)/proposals/page.tsx`
- FOUND: `app/(authed)/proposals/page.test.tsx`

Commits verified in `git log`:
- FOUND: 09d2a60 (test Task 1 RED)
- FOUND: 7b95a3a (feat Task 1 GREEN)
- FOUND: 8691df6 (test Task 2 RED)
- FOUND: 35e72c8 (feat Task 2 GREEN)

Verification gates (re-confirmed at SUMMARY time):
- `npx tsc --noEmit` → exit 0
- `npm test -- "app/(authed)/proposals/" tests/admin-09-grep-contracts.test.ts --run` → 142/142 pass (133 proposals + 9 ADMIN-09)
- `npm test -- "app/(authed)/proposals/_components/FilterPillRow.test.tsx" --run` → 6/6 pass
- `npm test -- "app/(authed)/proposals/page.test.tsx" --run` → 9/9 pass
- `grep -c "data-testid=\"filter-pill-actives\"\|data-testid=\"filter-pill-archived\"" "app/(authed)/proposals/_components/FilterPillRow.tsx"` → 2
- `grep -rn '?archived=' "app/(authed)/proposals/_components/"` → href literal `/proposals?archived=1` in FilterPillRow.tsx (line 83)
- `grep -c "export const dynamic = 'force-dynamic'" "app/(authed)/proposals/page.tsx"` → 1
- `grep -c "session.user.id" "app/(authed)/proposals/page.tsx"` → 2 (>= 1)

---
*Phase: 17-partner-surfaces*
*Completed: 2026-05-24*
