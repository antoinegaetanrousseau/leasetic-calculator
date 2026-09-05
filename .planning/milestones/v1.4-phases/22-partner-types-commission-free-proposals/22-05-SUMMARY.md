---
phase: 22-partner-types-commission-free-proposals
plan: 05
subsystem: testing
tags: [vitest, pdf, zlib, grep-contracts, commission, partner-type, stride]

# Dependency graph
requires:
  - phase: 22-01
    provides: users.partner_type column + migration (KNOWN_MIGRATIONS allowlist entry)
  - phase: 22-03
    provides: admin partner-type surfaces (list badge, create-form selector, row-action type-change)
  - phase: 22-04
    provides: commission-free finalize (FinalizeWizardArgs.partnerType, buildParamsSnapshot/buildComputeArgs)
provides:
  - Extended ADMIN-09 grep-contract suite covering all three partner-type surfaces (PTYPE-07)
  - Agent + Commercial 4-layer no-commission PDF corpus + snapshot integrity gates (PTYPE-06)
  - Phase-22 full-suite regression confirmed green (1148 tests)
affects: [phase-23-pdf-byte-determinism, future-admin-surfaces, commission-free-invariants]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-partner-type parametrized grep gates reusing assertNoCommissionLeakage verbatim"
    - "4-layer no-commission corpus extended to commission-free finalize (partnerType drives commissionApplied:false)"

key-files:
  created: []
  modified:
    - tests/admin-09-grep-contracts.test.ts
    - src/lib/pdf/no-commission.test.ts
    - app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx

key-decisions:
  - "Render partner-type <option> labels from the enum array (dynamic expr) rather than dictionary keys — the type values are language-neutral proper nouns, matching PartnerRowActions"
  - "assertNoCommissionLeakage reused unchanged; baseline gate count increased (13→19) to prevent silent gate removal"

patterns-established:
  - "Pattern 1: extend defense-in-depth CI gates per new enum value rather than adding a single combined gate — keeps each surface independently fail-loud"
  - "Pattern 2: commission-free finalize asserted via paramsSnapshot.commissionApplied:false + partnerType, proving PTYPE-06 reproducibility under later admin type-change"

requirements-completed: [PTYPE-06, PTYPE-07]

# Metrics
duration: ~12min
completed: 2026-05-30
---

# Phase 22 Plan 05: Commission-Leakage CI Gate Extension Summary

**Extended the two ADMIN-09 structural-absence suites — the grep-contract suite now greps all three partner-type surfaces (PTYPE-07) and the PDF no-commission 4-layer corpus now drives Agent + Commercial finalize runs asserting commissionApplied:false + zero leakage (PTYPE-06) — with the full 1148-test suite green.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- ADMIN-09 grep-contract suite extended to all three partner-type surfaces (list badge per type, create-form selector, row-action type-change UI); gate count 13 → 19, all prior gates green.
- PDF no-commission 4-layer corpus extended with Agent + Commercial finalize runs (2 fixtures × 2 types) asserting no commission in render data / computed jsonb, plus `paramsSnapshot.partnerType` + `commissionApplied:false` reproducibility, plus commission-free loyer = amountHT × coeff / 100; suite 34 → 42 tests.
- Full regression confirmed: typecheck, lint, no-drizzle-push, no-vercel-imports all clean; `npm run test` = 87 files / 1148 tests passing (no byte-determinism fixture regression, so the documented Phase 23 dependency was not triggered).

## Task Commits

1. **Task 1: Extend admin-09 grep suite for partner-type surfaces (PTYPE-07)** - `bb110a8` (feat) — committed prior to this session
2. **Task 2: Extend no-commission PDF corpus for Agent/Commercial (PTYPE-06)** - `2d6f834` (feat)
3. **Task 3: Full-suite regression gate** - verification-only; surfaced one Phase-22 lint regression fixed below

**Deviation fix:** `8db9b80` (fix — SHELL-06 lint)

## Files Created/Modified
- `tests/admin-09-grep-contracts.test.ts` - new per-type grep gates + makePartnerRow.partnerType field (PTYPE-07)
- `src/lib/pdf/no-commission.test.ts` - Agent/Commercial 4-layer corpus + snapshot-integrity gates (PTYPE-06)
- `app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx` - partner-type options rendered dynamically (lint fix)

## Decisions Made
- Partner-type `<option>` labels rendered by mapping the enum array (dynamic JSX expression) instead of dictionary lookups. The values (Agent / Commercial / Partenaire) are language-neutral proper nouns and are already rendered as dynamic expressions in PartnersList (`{row.partnerType}`) and PartnerRowActions; this keeps CreatePartnerForm consistent and satisfies the SHELL-06 no-hardcoded-JSX-text rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SHELL-06 lint failure introduced by Plan 22-03**
- **Found during:** Task 3 (full-suite regression gate)
- **Issue:** `npm run lint` failed with 3 `no-restricted-syntax` errors in `CreatePartnerForm.tsx` (lines 282-284) — Plan 22-03 (commit 8b582f2) added hardcoded `<option>Agent</option>` etc. literal JSX text, forbidden by the SHELL-06 / D-26 gate. Task 3's acceptance criteria require `npm run lint` to exit 0, so the phase could not ship green without this fix.
- **Fix:** Replaced the three literal `<option>` elements with a `.map()` over the `['Agent','Commercial','Partenaire']` enum array (dynamic expression), matching the existing PartnerRowActions pattern. Also wrapped the placeholder em-dash in an expression.
- **Files modified:** app/(admin)/[adminSegment]/partners/new/CreatePartnerForm.tsx
- **Verification:** `npm run lint` exits 0; `npm run typecheck` exits 0; CreatePartnerForm + partners suites pass (62 tests); full suite green (1148 tests).
- **Committed in:** 8db9b80

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary to satisfy Task 3's `npm run lint` exit-0 criterion. The regression originated in Plan 22-03 but surfaced here as the phase's final regression gate. No scope creep — the change is a presentation-equivalent refactor (same rendered options).

## Issues Encountered
- The Task 2 corpus extension was already present as uncommitted working-tree changes at session start (verified correct against finalize-helpers.ts snapshot field names `partnerType` / `commissionApplied`); committed atomically as `2d6f834`.
- The auth/index.test.ts stderr trace in full-suite output is an intentional caught-error-path assertion — the file passes (4/4 tests). Not a regression.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PTYPE-06 and PTYPE-07 satisfied; Phase 22 commission-free invariants are fully CI-gated.
- Phase 23 (PDF-03 byte-determinism) remains the owner of any golden-SHA fixture regeneration for commission-free PDFs — none was needed here since existing Partenaire fixtures are unchanged.

## Self-Check: PASSED

- FOUND: 22-05-SUMMARY.md
- FOUND commits: bb110a8 (Task 1), 2d6f834 (Task 2), 8db9b80 (deviation fix)

---
*Phase: 22-partner-types-commission-free-proposals*
*Completed: 2026-05-30*
