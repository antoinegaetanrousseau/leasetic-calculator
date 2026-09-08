---
phase: 42-captured-data-fields-advisor-profile
plan: 10
subsystem: api
tags: [finalize, zod, bounded-error-codes, dialog, base-ui, shadcn, admin-09]

# Dependency graph
requires:
  - phase: 42-03
    provides: clientSiret required field on proposalInputSchema (FIELD-01)
  - phase: 42-04
    provides: users.telephone registered as a Better Auth additionalField, readable off session.user
provides:
  - "PROF-02 enforced end-to-end: a partner with no telephone on their account is stopped at finalization"
  - "LegacyDraftIncomplete bounded code + toast + step-1 redirect for pre-Phase-42 drafts missing clientSiret (D-05)"
  - "MissingPartnerTelephone bounded code + Dialog naming the field with a /parametres CTA (D-17/D-18)"
affects: [43-pdf-layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Arg-threading through FinalizeWizardArgs (telephone mirrors partnerType) instead of a new DB read inside finalizeWizard"
    - "Independent pre-check placed textually before schema.parse() rather than inspecting ZodError.issues, so it survives future schema shape changes"
    - "Client-side failure-body parsing via res.json().catch(() => null) to keep a non-JSON error on the generic-toast path"

key-files:
  created: []
  modified:
    - src/lib/api/proposals/finalize-wizard.ts
    - src/lib/api/proposals/finalize-wizard.test.ts
    - src/lib/pdf/no-commission.test.ts
    - app/api/proposals/finalize/route.ts
    - app/api/proposals/finalize/route.test.ts
    - app/(authed)/proposals/new/verification/FinalizeButton.tsx
    - app/(authed)/proposals/new/verification/FinalizeButton.test.tsx

key-decisions:
  - "D-05 pre-check for missing clientSiret runs before proposalInputSchema.parse, not inside the ZodError catch, so it can't collapse into the generic ValidationFailed code as the schema evolves"
  - "D-17 gate is the single enforcement point (finalization only), checking only the partner's own telephone; D-13 keeps the company telephone from ever blocking finalization"
  - "D-18 dialog vs D-05 toast are deliberately different affordances for two different fixes (leave the page vs. return to step 1) and never share UI"

patterns-established:
  - "Two-code SAFE_ERROR_CODES extension pattern: bare string literal, no payload, commented with its owning decision ID"

requirements-completed: [PROF-02, FIELD-01]

# Metrics
duration: ~35min
completed: 2026-09-08
---

# Phase 42 Plan 10: Finalize Telephone Gate & Legacy-Draft Handling Summary

**PROF-02's server-side telephone gate lands inside `finalizeWizard`, with a distinct D-05 legacy-draft pre-check and a client dialog that finally reads the finalize failure body.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `finalizeWizard` throws `LegacyDraftIncomplete` for any draft whose stored `inputs` predates the
  `clientSiret` field, via an independent presence check that runs textually before
  `proposalInputSchema.parse` is ever called — so it can never collapse into the generic
  `ValidationFailed` code, now or after a future schema change.
- `finalizeWizard` throws `MissingPartnerTelephone` when the (session-sourced) partner telephone is
  falsy, placed after schema validation and before `getLatestGlobalParams` / `computeLoyer` /
  `renderProposalPdf` — a blocked finalize never spends a PDF render. The company telephone
  (`draft.inputs.partnerTel`) is never inspected (D-13).
- The route handler threads `session.user.telephone` into `finalizeWizard` exactly like
  `partnerType`, normalising empty/whitespace to `null`, and extends `SAFE_ERROR_CODES` with both
  new codes — still bare string literals, no payload echo (ADMIN-09 discipline unchanged, verified
  by the existing 21-gate grep-contract suite).
- `FinalizeButton` now parses the failure response body (`res.json().catch(() => null)`) and
  branches on the bounded code: `MissingPartnerTelephone` opens a controlled shadcn `Dialog`
  (never `AlertDialog`) naming the missing telephone with a primary CTA linking to `/parametres`
  and no toast; `LegacyDraftIncomplete` shows the SIRET-naming toast and redirects to
  `/proposals/new/parametres?draft_id=...`; every other failure (including a non-JSON body) keeps
  today's generic `wizard.toast.finalize.error` toast.

## Task Commits

Each task was committed atomically:

1. **Task 1: Legacy-draft pre-check and the telephone gate in finalizeWizard** - `d22074c` (feat)
2. **Task 2: Extend SAFE_ERROR_CODES and thread the session telephone through the route** - `cd59680` (feat)
3. **Task 3: Teach FinalizeButton to read the failure body and render the missing-phone dialog** - `8686894` (feat)

_No separate plan-metadata commit — this SUMMARY + STATE/ROADMAP/REQUIREMENTS update is the final commit for this plan._

## Files Created/Modified

- `src/lib/api/proposals/finalize-wizard.ts` - Adds `telephone` to `FinalizeWizardArgs`; D-05 pre-check before `.parse()`; D-17 gate before expensive work
- `src/lib/api/proposals/finalize-wizard.test.ts` - New `describe('Phase 42 — finalize gates (D-05 / D-17 / D-13)')` block, 6 behaviours incl. the parse-not-reached ordering assertion
- `src/lib/pdf/no-commission.test.ts` - 4 call sites updated with the new required `telephone` arg (cross-cutting caller of `finalizeWizard`, unrelated to this plan's own scope but broken by the type change — Rule 3 fix)
- `app/api/proposals/finalize/route.ts` - `SAFE_ERROR_CODES` gains `MissingPartnerTelephone` + `LegacyDraftIncomplete`; reads + normalises `session.user.telephone`; threads it into the single `finalizeWizard(...)` call
- `app/api/proposals/finalize/route.test.ts` - New `describe('Phase 42 — new bounded codes (D-05 / D-17 / D-18)')` block, 7 behaviours incl. response-body key-set assertion
- `app/(authed)/proposals/new/verification/FinalizeButton.tsx` - Reads the failure body; renders the `Dialog` for `MissingPartnerTelephone`; toast+redirect for `LegacyDraftIncomplete`
- `app/(authed)/proposals/new/verification/FinalizeButton.test.tsx` - New `describe` block, 7 behaviours incl. the two negative assertions (no toast on the dialog path, no rendered body text)

## Decisions Made

- Placed the D-05 legacy check as a standalone `if` guard immediately after `DraftNotFound`, rather
  than inspecting `err.issues` inside the `ZodError` catch — a presence check on stored `inputs`
  doesn't depend on Zod internals and survives future schema changes, per the plan's explicit
  rationale.
- Used `res.json().catch(() => null)` on the client rather than a bare `await res.json()` so a
  non-JSON error response degrades to the generic toast instead of an unhandled rejection.
- Used the existing `<Button variant="outline" render={<Link href="..." />}>` composition pattern
  (already used in `clients/[id]/page.tsx` and `pipeline/page.tsx`) for the dialog's primary CTA,
  rather than wrapping `<Link>` around `<Button>`, to match project convention exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `src/lib/pdf/no-commission.test.ts` call sites for the new required `telephone` arg**
- **Found during:** Task 1 (typecheck after adding `telephone` to `FinalizeWizardArgs`)
- **Issue:** `no-commission.test.ts` (Phase 14/22, ADMIN-09 golden-fixture suite) calls `finalizeWizard(...)` at 4 sites without the plan's declared files, and adding a required field to the interface broke its compilation.
- **Fix:** Added `telephone: '06 12 34 56 78'` to all 4 call sites (1-line and multi-line forms).
- **Files modified:** `src/lib/pdf/no-commission.test.ts`
- **Verification:** `npx vitest run src/lib/pdf/no-commission.test.ts` (42/42 passing) + `npm run typecheck` clean
- **Committed in:** `d22074c` (part of Task 1 commit)

**2. [Rule 1 - Bug] Test disambiguation for the dialog's dual "Fermer" buttons**
- **Found during:** Task 3 (writing `FinalizeButton.test.tsx`'s dismiss-action test)
- **Issue:** shadcn `Dialog`'s built-in icon-only close button and the plan-specified footer dismiss button both carry the accessible name "Fermer" (the icon close reuses `common.close.aria`), causing `getByRole('button', { name: 'Fermer' })` to throw on multiple matches. Similarly, after the dialog opens, the background CTA becomes `aria-hidden`/inert (correct Base UI modal behavior), so a plain `getByRole` query for it fails.
- **Fix:** Used `getAllByRole(...)[0]` to target the footer dismiss button specifically (it renders before the icon close in DOM order), and added `{ hidden: true }` to the background-CTA query so RTL still locates the inert element to assert its `disabled` state.
- **Files modified:** `app/(authed)/proposals/new/verification/FinalizeButton.test.tsx`
- **Verification:** `npx vitest run "app/(authed)/proposals/new/verification/FinalizeButton.test.tsx"` (15/15 passing)
- **Committed in:** `8686894` (part of Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking cross-file type fix, 1 test-authoring bug fix)
**Impact on plan:** Both fixes were necessary for compilation/test correctness and stayed strictly inside test files or the one cross-cutting caller broken by the type change. No scope creep — no production behavior changed beyond what the plan specified.

## Issues Encountered

- `Base UI: A component that acts as a button expected a native <button>...` — a benign console
  warning from Base UI's `Button` + `render={<Link />}` composition (an `<a>`, not a native
  `<button>`). This is the exact pre-existing pattern used in `clients/[id]/page.tsx` and
  `pipeline/page.tsx`, so it was kept as-is rather than deviated from; not a test failure, no
  behavior impact.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 42 (Captured Data — Fields & Advisor Profile) is now fully executed: all 10 plans complete.
- PROF-02 closes end-to-end: a partner missing a telephone is stopped at finalization with a
  message naming the field and a link to `/parametres`; a pre-Phase-42 draft is distinguished from
  any other validation failure and sent back to step 1 naming SIRET; the company telephone never
  blocks finalization.
- PROF-01 and PROF-03 remain open per REQUIREMENTS.md — PROF-03's PDF-render half is explicitly
  Phase 43's scope (not touched here, per this plan's instructions).
- No blockers for Phase 43 (PDF layout): the telephone gate and legacy-draft handling are
  independent of the PDF rendering surface Phase 43 will build.

---
*Phase: 42-captured-data-fields-advisor-profile*
*Completed: 2026-09-08*

## Self-Check: PASSED

All 8 claimed files found on disk; all 3 task commit hashes (`d22074c`, `cd59680`, `8686894`) found in git log.
