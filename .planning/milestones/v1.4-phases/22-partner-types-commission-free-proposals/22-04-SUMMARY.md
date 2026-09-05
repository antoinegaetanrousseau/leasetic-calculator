---
phase: 22-partner-types-commission-free-proposals
plan: 04
subsystem: proposal-economics
tags: [proposals, partner-types, ptype-04, ptype-05, ptype-06, commission-free, finalize, snapshot, live-preview, grep-isolation]

# Dependency graph
requires:
  - phase: 22-partner-types-commission-free-proposals
    plan: 01
    provides: users.partner_type column + session.user.partnerType + paramsSnapshot type (partnerType + commissionApplied)
  - phase: 22-partner-types-commission-free-proposals
    plan: 02
    provides: commission-free golden corpus (commissionPct:0 seam regression guard; formula.ts frozen)
provides:
  - buildComputeArgs(parsed, params, partnerType) — commissionPct:0 for Agent/Commercial, params.commissionPct for Partenaire
  - buildParamsSnapshot(params, partnerType) — records partnerType + commissionApplied alongside commissionPct/maxAmount/validityDays/coefficients
  - FinalizeWizardArgs.partnerType threaded into finalize compute + snapshot (finalize-wizard.ts stays grep-clean of the commission literal)
  - POST /api/proposals/finalize reads session.user.partnerType (legacy fallback → Partenaire) and threads it into finalizeWizard
  - calcul (step-2) + verification (step-3) pages omit the commission row entirely for Agent/Commercial (structural absence, D-05) and keep it for Partenaire (D-12)
  - LiveLoyerPreview.partnerType prop — commission-free preview loyer for Agent/Commercial
affects: [22-05, commission-free-proposals, pdf-reproducibility]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "commissionPct:0 seam — commission-free achieved only by passing 0; formula.ts frozen (22-02 golden corpus is the guard)"
    - "Structural absence (D-05) — commission row PUSHED only when isPartenaire; array is shorter for Agent/Commercial, never a display:none/empty placeholder; commissionDisplay/Amount not materialized on the commission-free path"
    - "Grep-isolation barrier — the `commission` literal lives ONLY in finalize-helpers.ts; finalize-wizard.ts threads partnerType and stays grep-clean (verified: 0 matches with comments stripped)"
    - "Snapshot byte-determinism — commissionPct percentage still recorded for reproducibility; commissionApplied:boolean records whether it was factored in"
    - "Conditional-spread seam — `...(partnerType === 'Partenaire' ? {} : { commissionPct: 0 })` keeps the seedParams default for Partenaire and forces 0 otherwise (type-safe: commissionPct is optional on the engine input)"

key-files:
  created:
    - .planning/phases/22-partner-types-commission-free-proposals/deferred-items.md
  modified:
    - src/lib/api/proposals/finalize-helpers.ts
    - src/lib/api/proposals/finalize-wizard.ts
    - src/lib/api/proposals/finalize-wizard.test.ts
    - app/api/proposals/finalize/route.ts
    - app/api/proposals/finalize/route.test.ts
    - app/(authed)/proposals/new/calcul/page.tsx
    - app/(authed)/proposals/new/verification/page.tsx
    - src/components/proposal/LiveLoyerPreview.tsx
    - src/lib/pdf/no-commission.test.ts

key-decisions:
  - "ParametresFormCard does NOT thread partnerType into LiveLoyerPreview — D-09 retired the 2-column layout and the card no longer mounts the preview (ParametresFormCard.test Test 13 asserts its absence). The partnerType prop was added to the dormant LiveLoyerPreview component only; threading a prop into the card would be dead code violating D-09."
  - "Route falls back to 'Partenaire' for unknown/legacy session partnerType (belt-and-suspenders over the DB DEFAULT 'Partenaire' from 22-01)."
  - "Snapshot records both commissionPct (percentage, for byte-determinism) and commissionApplied:boolean (whether factored in) — a later adminUpdatePartnerType (22-03) never touches existing snapshots, preserving PTYPE-06 reproducibility."

# Metrics
duration: ~12min
completed: 2026-05-30
---

# Phase 22 Plan 04: Commission-Free Proposal Economics Summary

Wired the commission-free branch through every proposal-economics surface owned by the proposal author — finalize compute + snapshot, wizard step-2 (calcul) and step-3 (verification) review rows, and the (dormant) live preview — by threading `session.user.partnerType` and passing `commissionPct: 0` for Agent/Commercial while leaving Partenaire byte-for-byte unchanged. `formula.ts` stays frozen; the `commission` literal stays isolated in `finalize-helpers.ts`.

## What Was Built

- **Task 1 (PTYPE-06) — finalize compute + snapshot** [`1da7a22`]: `buildComputeArgs` and `buildParamsSnapshot` in `finalize-helpers.ts` now accept `partnerType`. Compute sets `commissionPct: partnerType === 'Partenaire' ? parseNumeric(params.commissionPct) : 0`. The snapshot additionally records `partnerType` + `commissionApplied: partnerType === 'Partenaire'`. `FinalizeWizardArgs` gained `partnerType` and threads it through without naming the commission literal (grep-clean barrier intact). `finalize/route.ts` reads `session.user.partnerType` (legacy fallback → `Partenaire`) and passes it into `finalizeWizard`.
- **Task 2 (PTYPE-05 / D-05) — wizard steps 2 + 3** [`28ef9d5`]: both `calcul/page.tsx` and `verification/page.tsx` derive `isPartenaire` and pass `commissionPct: isPartenaire ? <param> : 0` to the server `computeLoyer` call. The commission row is PUSHED into `detailRows` / `calculRows` ONLY when `isPartenaire` — for Agent/Commercial the array is one entry shorter and the surrounding rows close up with no gap, placeholder, or "sans commission" note. `commissionDisplay`/`commissionAmount` are not computed on the commission-free path. The D-12/ADMIN-09 relaxation comments are preserved on the Partenaire branch.
- **Task 3 (PTYPE-04 / PTYPE-05 step 1) — live preview** [`f3db3a4`]: `LiveLoyerPreview` accepts an optional `partnerType` prop (default `'Partenaire'`). The `useMemo` `computeLoyer` call uses a conditional spread — omit `commissionPct` for Partenaire (seedParams default, unchanged) and force `commissionPct: 0` for Agent/Commercial. The preview renders no commission annotation, so PTYPE-05's "no commission text" already holds; this only corrects the loyer VALUE.

## Deviations from Plan

### [Rule 1 / Rule 3 — Plan premise corrected] Task 3 does not thread partnerType into ParametresFormCard

- **Found during:** Task 3 `read_first`.
- **Issue:** The plan's Task 3 action assumed `ParametresFormCard.tsx` renders `<LiveLoyerPreview>` and must thread `partnerType` down to it. In reality, decision **D-09** retired the 2-column form layout — `ParametresFormCard` does NOT mount the preview, and `ParametresFormCard.test.tsx` **Test 13** explicitly asserts no `LiveLoyerPreview` is rendered. A repo-wide search confirms `<LiveLoyerPreview` has no live JSX mount anywhere (only doc comments + the retired `ProposalForm.tsx` sibling reference).
- **Fix:** Added the `partnerType` prop + `commissionPct:0` seam to the (dormant) `LiveLoyerPreview` component itself, so it computes correctly for the type if/when remounted (PTYPE-04 contract honored at the component boundary). Did NOT add a `partnerType` prop to `ParametresFormCard` — that would be dead code that contradicts D-09 and would break Test 13. The prop defaults to `'Partenaire'` so no current caller's behavior changes.
- **Files modified:** `src/components/proposal/LiveLoyerPreview.tsx`.
- **Commit:** `f3db3a4`.

### [Rule 1 — test fixtures lagging intended behavior] finalize/route tests updated for threaded partnerType

- **Found during:** Task 3 verification (running the affected suites after Task 1's route change landed).
- **Issue:** `finalize/route.test.ts` Test 14 and Test 16c asserted the exact `finalizeWizard` args WITHOUT `partnerType`, so they failed once the route correctly threads it.
- **Fix:** Updated both assertions to include `partnerType: 'Partenaire'` (the route's legacy fallback for sessions with no type, which both tests mock). Added Test 16d (Agent/Commercial/Partenaire thread through via `objectContaining`) and Test 16e (unknown/legacy type → `Partenaire` fallback) to lock the PTYPE-06 contract.
- **Files modified:** `app/api/proposals/finalize/route.test.ts`.
- **Commit:** `f3db3a4`.

> Note: `finalize-wizard.test.ts` and `pdf/no-commission.test.ts` were already updated in Tasks 1–2's commits to match the threaded `partnerType`; they are listed in key-files because they sit on the changed surface.

## Deferred Issues (out of scope — SCOPE BOUNDARY)

- **Pre-existing lint errors in `CreatePartnerForm.tsx` (lines 282–284):** hardcoded `<option>` enum text (`Agent`/`Commercial`/`Partenaire`) flagged by `no-restricted-syntax` (SHELL-06 / D-26). Introduced by commit `8b582f2` (Plan **22-03**, PTYPE-01), NOT by this plan. `npm run lint` on the 22-04 files only is clean (exit 0). Logged to `.planning/phases/22-partner-types-commission-free-proposals/deferred-items.md` for a 22-03 follow-up or the phase verifier. Not fixed here per the SCOPE BOUNDARY rule.

## Authentication Gates

None.

## Verification Results

- `npm run typecheck` → exits 0.
- `npm run lint` → 3 errors, all pre-existing + out-of-scope in `CreatePartnerForm.tsx` (Plan 22-03); 0 errors on any 22-04 file (verified by `npx eslint src/components/proposal/LiveLoyerPreview.tsx` → exit 0).
- `npm run test` (full suite) → 1136 passed, 4 skipped, 0 failed (88 files).
- Targeted suites: `calc.golden` (42), `finalize/route` (10), `finalize-wizard` (15), `FinalizeButton` (8), `ParametresFormCard` (16) — all pass; ParametresFormCard Test 13 (D-09 no-preview) still green.
- Grep-isolation barrier: `grep -v '^[[:space:]]*//' src/lib/api/proposals/finalize-wizard.ts | grep -c commission` → **0**.

## Known Stubs

None. The `partnerType` prop on the dormant `LiveLoyerPreview` is not a stub — it is the correct PTYPE-04 seam at the component boundary, defaulting to `Partenaire` for behavioral parity; the component is simply not mounted in the current wizard (D-09), which is an intentional, pre-existing architecture decision, not unfinished work in this plan.

## Self-Check: PASSED

- FOUND: `.planning/phases/22-partner-types-commission-free-proposals/deferred-items.md`
- FOUND: `src/components/proposal/LiveLoyerPreview.tsx` (partnerType prop + commissionPct:0 seam)
- FOUND commit `1da7a22` (Task 1), `28ef9d5` (Task 2), `f3db3a4` (Task 3)
