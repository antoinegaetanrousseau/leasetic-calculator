---
phase: 09-admin-surface
plan: "04"
subsystem: admin-home-and-validity-seam
tags: [admin, home, validity-seam, getDefaultValidityDays, seed-params, i18n]
dependency_graph:
  requires:
    - 09-01 (admin.home.* i18n keys × 2 langs + .admin-nav-card CSS class)
    - 09-02 (coefficients page — linked from admin home card)
    - 09-03 (accounts page — linked from admin home card)
    - 08-persistence-pdf-pipeline (getLatestGlobalParams, GlobalParamsRow.validityDays)
  provides:
    - app/(admin)/[adminSegment]/page.tsx (admin home nav hub — UI-SPEC §3.0)
    - src/lib/calc/seed-params.ts (getDefaultValidityDays() swap-in seam)
    - app/(authed)/proposals/new/page.tsx (validity default wired from global_params)
  affects:
    - Phase 10 (admin home is now the navigation hub for all admin tooling)
tech_stack:
  added: []
  patterns:
    - D-09-13 swap-in seam (getDefaultValidityDays mirrors getMaxAmount shape)
    - D-09-14 whitelist narrowing ({15,30,60} at calc-engine layer, unchanged)
    - AUTH-15 defense in depth (requireAdmin() in both layout AND page)
    - PITFALLS §1.1 async params await pattern
key_files:
  created: []
  modified:
    - app/(admin)/[adminSegment]/page.tsx
    - src/lib/calc/seed-params.ts
    - src/lib/calc/index.ts
    - app/(authed)/proposals/new/page.tsx
decisions:
  - "ADMIN-07 satisfied by Phase 6 gate (env-segment + requireAdmin in layout); Phase 9 only updates the home page body — no gate re-implementation"
  - "AllowedValidity narrowing pattern chosen over type cast for runtime safety (out-of-whitelist admin value silently falls back to 30)"
  - "Duplicate flow (PROP-21) preserves source validityDays from sourceInputs spread, which is correct — a duplicated proposal should keep the original validity"
  - "seedParams.defaultValidityDays = 30 matches seed migration 0003 validity_days = 30 — no divergence, no STATE.md item needed"
metrics:
  duration_minutes: 25
  completed_date: "2026-05-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 4
---

# Phase 9 Plan 04: Admin Home + Validity Seam Summary

**One-liner:** Two-card admin nav hub (Settings2→coefficients, Users→accounts) and getDefaultValidityDays() swap-in seam wiring global_params.validity_days into the proposal form's pre-selected default.

## Tasks Completed

### Task 1: Replace admin home page with two-card nav grid (e32c33e)

Replaced the Phase 6 placeholder body of `app/(admin)/[adminSegment]/page.tsx` with the UI-SPEC §3.0 two-card navigation grid.

Key implementation details:
- `Link href="/${adminSegment}/coefficients"` + `Link href="/${adminSegment}/accounts"` — env-driven segment, never hard-coded.
- Both links use `className="card admin-nav-card"` (Plan 01's CSS classes from `app/globals.css`).
- `Settings2` (coefficients) and `Users` (accounts) Lucide icons, `size=48 strokeWidth=1.4 color="var(--teal)"`, `aria-hidden="true"`.
- Each `Link` carries `aria-label` from i18n for screen readers (UI-SPEC §12 a11y).
- All copy via `t('admin.home.*', lang)` — no hardcoded strings.
- `await requireAdmin()` independent call (AUTH-15 defense in depth — layout gate is NOT sufficient alone).
- `export const metadata` with `robots: { index: false, follow: false }` — admin page never indexed.
- Placeholder copy (`shell.topbar.admin.badge`, `welcomeSubtext`) fully removed.

ADMIN-07 confirmation: the existing Phase 6 layout provides the 2-layer gate (URL-segment obscurity + requireAdmin). Plan 04 confirms the home page renders correctly through that gate and links to the working Plan 02/03 pages. No gate logic re-implemented.

### Task 2: getDefaultValidityDays seam + wire proposals-new page (bac130c)

**2a. src/lib/calc/seed-params.ts** — extended with:
- `defaultValidityDays: number` field added to `SeedParams` interface (with JSDoc referencing D-09-13).
- `defaultValidityDays: 30` added to `seedParams` const (v10 line 1405 default).
- `getDefaultValidityDays()` function exported — mirrors `getMaxAmount()` shape exactly.
- Module JSDoc updated to include D-09-13 and D-09-14 references.

**2b. src/lib/calc/index.ts** — `getDefaultValidityDays` added to the barrel export alongside `getMaxAmount`.

**2c. app/(authed)/proposals/new/page.tsx** — wired validity default:
- Imports `getDefaultValidityDays` from `@/lib/calc`.
- `rawValidityDays = params?.validityDays ?? getDefaultValidityDays()` — reads latest `global_params` row (already fetched for `coefficientsExpired`), falls back to seed default when no DB row.
- **Whitelist narrowing pattern:**
  ```typescript
  const ALLOWED_VALIDITY = [15, 30, 60] as const;
  type AllowedValidity = (typeof ALLOWED_VALIDITY)[number];
  const defaultValidityNarrowed: AllowedValidity =
    ALLOWED_VALIDITY.find((v) => v === rawValidityDays) ?? 30;
  ```
  Out-of-whitelist admin values silently fall back to 30 — D-09-14 invariant honored.
- `prefill.validityDays = defaultValidityNarrowed` — `ProposalFormProvider` pre-selects the narrowed value in the segmented control.
- Duplicate flow (PROP-21): when `?duplicate=<id>`, the `sourceInputs` spread includes the source's `validityDays` (correct — duplicating a 60-day proposal should pre-select 60 days).

## Seed Migration Alignment

`drizzle/0003_seed_global_params.sql` seeds `validity_days = 30::integer`.
`seedParams.defaultValidityDays = 30`.

Values **match** — no divergence, no STATE.md blocker needed.

## D-09-14 Invariant Verification

`src/lib/calc/schema.ts` line 47:
```typescript
export const validityDaysSchema = z.union([z.literal(15), z.literal(30), z.literal(60)]);
```
This line is **byte-identical** to Phase 7 — unchanged by Plan 04. The calc-engine whitelist is enforced at the Zod schema layer; the admin's edit only controls the pre-selected UI default.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data sources wired. `getDefaultValidityDays()` returns from `seedParams.defaultValidityDays` (hardcoded 30, same as seed migration); `proposals/new` reads live `global_params.validity_days` on every request.

## Threat Surface Scan

No new network endpoints introduced. The admin home page is behind the existing 2-layer gate (Phase 6). The proposals/new page reads one additional field (`validityDays: number`) from an already-queried `global_params` row — no new DB call, no new trust boundary.

T-09-04-03 (Information Disclosure): proposals/new passes `validityDays` only (a single integer) to the partner UI — commission_pct, max_amount, coefficients are NOT passed. ADMIN-09 commission-invisibility holds.

## Self-Check: PASSED

- app/(admin)/[adminSegment]/page.tsx: exists, 95 lines, two-card grid confirmed
- src/lib/calc/seed-params.ts: exports getDefaultValidityDays, defaultValidityDays in interface + const + function
- src/lib/calc/index.ts: getDefaultValidityDays re-exported
- app/(authed)/proposals/new/page.tsx: getLatestGlobalParams, getDefaultValidityDays, defaultValidityNarrowed all present
- Commits e32c33e (Task 1) and bac130c (Task 2) exist in git log
- npm run typecheck: 0 errors
- npm run lint: 0 warnings
- npm run test: 399/399 pass
- npm run build: all 16 routes compiled, no errors
