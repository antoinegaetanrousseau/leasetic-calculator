---
phase: 42-captured-data-fields-advisor-profile
plan: 09
subsystem: ui
tags: [react-hook-form, zod, better-auth, session-hydration, wizard, server-components]

# Dependency graph
requires:
  - phase: 42-captured-data-fields-advisor-profile
    plan: "04"
    provides: "companyTelephone registered as a Better Auth additionalField (input:false), readable via session.user.companyTelephone"
  - phase: 42-captured-data-fields-advisor-profile
    plan: "08"
    provides: "clientSiret rendered in ParametresFormCard, required in proposalInputSchema, cross-field-refined against clientSiren"
provides:
  - "partnerTel session-hydrated into draft.inputs on every draft-creation path (D-30 relationship overlay, D-25 duplicate overlay, plain-mint-then-save) — never a wizard field, never read back from the form"
  - "clientSiret survives a page reload — the resume prefill reads it back from the draft's inputs the way clientSiren already does"
  - "ProposalForm.tsx's RHF defaultValues now track both clientSiret and partnerTel, closing a gap where page.tsx's prefill had no effect on either field"
affects: [43, 44]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hidden-field RHF tracking: a value resolved server-side (session or params) must still appear in useForm's defaultValues even when never rendered as a visible input, because the wizard's save actions persist form.getValues() verbatim — omitting it from defaultValues silently drops it on the next save, not just on initial render."

key-files:
  created: []
  modified:
    - app/(authed)/proposals/new/parametres/page.tsx
    - app/(authed)/proposals/new/parametres/page.test.tsx
    - src/components/proposal/ProposalForm.tsx

key-decisions:
  - "ProposalForm.tsx (not in the plan's declared files_modified) required a Rule 2 auto-fix: its useForm defaultValues object never carried clientSiret or partnerTel, so page.tsx's prefill additions from this plan would have had zero effect — the Controller-bound SiretInput falls back to field.value ?? '' regardless of what prefill carries, and the wizard's save actions (WizardStep1Wiring.tsx) persist form.getValues() verbatim, silently dropping any key missing from defaultValues on the very next save."
  - "partnerTel is verified via the RHF form-state path (clicking 'Enregistrer comme brouillon' and inspecting the mocked updateDraft call), not via a DOM query, because D-11 requires it never render as a visible input. The suite's pre-existing saveAsDraftMock (registered at a src/-rooted module id that the real app/ relative import never resolves to) turned out to be an unreachable mock unrelated to this plan; routing the assertion through the correctly-aliased updateDraft mock avoided touching that pre-existing gap."

patterns-established:
  - "Hidden-field RHF tracking (see tech-stack.patterns above) — applies to any future field added to the D-07/D-11 session-hydrated group."

requirements-completed: [FIELD-02]

# Metrics
duration: ~40min
completed: 2026-09-08
---

# Phase 42 Plan 09: Session-Hydrated Partner Telephone + SIRET Resume Prefill Summary

**`draft.inputs.partnerTel` is now session-hydrated on every draft path (mint, D-30 relationship overlay, D-25 duplicate overlay) and re-asserted over any stale stored value, while `clientSiret` survives a page reload — closing a latent gap where neither field's prefill actually reached the rendered form because `ProposalForm.tsx`'s RHF `defaultValues` never tracked either key.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 2
- **Files modified:** 3 (2 declared in the plan + 1 Rule 2 deviation)

## Accomplishments
- `page.tsx`'s session cast widened with `companyTelephone?: string | null`; `partnerTel` derived with no fallback chain (unlike `companyName` → `partnerCo`, `companyTelephone` was registered as a Better Auth `additionalField` in Plan 42-04, so `session.user.companyTelephone` is directly authoritative).
- `clientSiret` added to the read-from-draft prefill group (D-04) beside `clientSiren`; `partnerTel` added to the session-hydrated group (D-11) beside `partnerName`/`partnerCo` — resolved from the session on every render so a stale stored value is always overwritten.
- Both draft-creation overlay `updateDraft` calls (D-30 relationship prefill, D-25 duplicate) now write `partnerTel` alongside `partnerName`/`partnerCo`, discarding any source-row or relationship-prefill telephone. `clientSiret` was deliberately left out of the duplicate overlay's explicit key list — it is client data, not partner attribution, and continues to flow through the existing `...sourceInputs` spread.
- No new `updateDraft` call was introduced; the plain-mint-then-resume path still writes no `inputs` at draft creation and picks up `partnerTel` from the session on the first `saveAsDraft`/`saveAndAdvance` after Task 1's `ProposalForm.tsx` fix.

## Task Commits

Each task was committed atomically:

1. **Task 1: Read companyTelephone off the session and add both fields to the resume prefill** - `a7c5721` (feat)
2. **Task 2: Re-assert partnerTel in all three draft-creation overlay paths** - `314af70` (feat)

## Files Created/Modified
- `app/(authed)/proposals/new/parametres/page.tsx` — session cast + `partnerTel` derivation, `clientSiret`/`partnerTel` prefill entries, `partnerTel` added to both overlay `updateDraft` calls
- `app/(authed)/proposals/new/parametres/page.test.tsx` — two new `describe` blocks: `Phase 42 — partnerTel hydration + clientSiret resume (D-11 / FIELD-01)` (6 tests) and `Phase 42 — overlay writes re-assert partnerTel (D-11 / D-25 / D-30)` (4 tests)
- `src/components/proposal/ProposalForm.tsx` — `clientSiret` and `partnerTel` added to `useForm`'s `defaultValues` (Rule 2 deviation, see below)

## Decisions Made
- Verified `partnerTel` survival through the RHF form-state path rather than a DOM query, since D-11 forbids it ever rendering as a visible input. Discovered mid-task that this test file's pre-existing `saveAsDraftMock` (mocked at `@/(authed)/proposals/new/_actions/saveAsDraft.action`, which resolves under the `@` → `src/` alias to a **non-existent** path) never actually intercepts `WizardStep1Wiring.tsx`'s real relative import (`../_actions/saveAsDraft.action`, under `app/`) — a pre-existing, unrelated test-infrastructure gap that had never been exercised because no prior test clicked the button. Routed the new assertions through the correctly-aliased `updateDraft` mock instead (the real, unmocked `saveAsDraftAction` calls it directly), leaving the broken `saveAsDraftMock` untouched as out of this plan's scope.
- `clientSiret`'s resume-prefill value is asserted against the raw stored digits string (`'12345678900012'`), not the 3-3-3-5 grouped display form — `formatSiret` only runs on the `onChange` handler inside `SiretInput`, never on a value arriving via RHF's `defaultValues`, so the field renders unformatted on resume. This matches existing behavior for `clientSiren` and is not a new defect introduced by this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `clientSiret` and `partnerTel` to `ProposalForm.tsx`'s `useForm` `defaultValues`**
- **Found during:** Task 1, while verifying the plan's own must_haves truth "Resuming a draft repopulates the SIRET the partner already typed"
- **Issue:** `ProposalForm.tsx` (not in the plan's declared `files_modified`) builds RHF's `defaultValues` object explicitly field-by-field. It already special-cases `partnerCo`/`partnerName`/`validityDays` (the existing hidden, session-hydrated fields) but never carried `clientSiret` or `partnerTel`. Two independent failures resulted: (a) `ParametresFormCard`'s Controller-bound `SiretInput` reads `field.value ?? ''`, and since RHF had no `defaultValues.clientSiret`, `field.value` was `undefined` regardless of what `page.tsx`'s prefill carried — the resume-prefill this plan's Task 1 adds would have had zero visible effect; (b) the wizard's save actions (`WizardStep1Wiring.tsx`) persist `form.getValues()` verbatim to `updateDraft` — a `partnerTel` value present only in `page.tsx`'s prefill but absent from RHF's tracked field set would be silently dropped (as `undefined`) on the very next save-as-draft or save-and-advance, discarding whatever the D-25/D-30 overlay had written moments earlier.
- **Fix:** Added `clientSiret: prefill?.clientSiret ?? ''` and `partnerTel: prefill?.partnerTel ?? ''` to the `defaultValues` object, mirroring the existing pattern for `clientSiren`/`partnerCo`.
- **Files modified:** `src/components/proposal/ProposalForm.tsx`
- **Verification:** All 29 tests in `page.test.tsx` pass (25 pre-existing + 6 Task 1 + 4 Task 2, `git add -p`-split across the two commits); `npm run typecheck` and `npm run lint:check` both exit 0 at each commit boundary; full `npm test` (2679 passed, 0 failing, 61 skipped — unrelated) green after both commits.
- **Committed in:** `a7c5721` (Task 1 commit, alongside the `page.tsx` hunks and test block that depend on it).

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical functionality)
**Impact on plan:** No scope creep. The fix is 2 lines in a file directly downstream of the fields this plan introduces to the prefill, required for both of this plan's own must_haves truths ("SIRET repopulates on resume", "stale partnerTel is overwritten by the current session value") to actually hold at runtime rather than only in the prefill object handed to a provider that silently ignored two of its keys.

## Issues Encountered
- The test file's pre-existing `saveAsDraftMock` turned out to be dead/unreachable (see Decisions Made) — discovered only because this plan's tests were the first to actually click "Enregistrer comme brouillon" rather than just asserting its presence. Not fixed (out of this plan's scope per the deviation-rules scope boundary — pre-existing, unrelated to the files this plan touches), but the new tests were designed around the correctly-working `updateDraft` mock instead, so the plan's own behaviors are still provably verified.

## User Setup Required

None — no external service configuration required. All dependencies (Plan 42-04's `companyTelephone` additionalField registration, Plan 42-08's `clientSiret` field and schema) were already live on `main`.

## Next Phase Readiness
- FIELD-02 is closed: the partner company's telephone is held on the partner account, session-hydrated, and carried onto every proposal's `inputs` (via the first save after draft creation, matching the established `partnerName`/`partnerCo` precedent), never blocking finalization on an absent value.
- FIELD-01's resume gap is closed: `clientSiret` now round-trips through a page reload exactly like `clientSiren`.
- Plan 42-10 (legacy-draft `LegacyDraftIncomplete` handling) is unaffected by this plan's changes and remains independently scoped.
- Phase 43 can rely on `draft.inputs.partnerTel` being populated by the time any proposal reaches finalization (subject to at least one save having occurred, which the wizard's own flow guarantees before step 2).

---
*Phase: 42-captured-data-fields-advisor-profile*
*Completed: 2026-09-08*

## Self-Check: PASSED

All 3 claimed files found on disk; both commit hashes (a7c5721, 314af70) found in git history.
