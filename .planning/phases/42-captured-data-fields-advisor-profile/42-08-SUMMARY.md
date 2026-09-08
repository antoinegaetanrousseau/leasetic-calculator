---
phase: 42-captured-data-fields-advisor-profile
plan: 08
subsystem: ui
tags: [react-hook-form, zod, siret, siren, registry, wizard, server-actions]

# Dependency graph
requires:
  - phase: 42-captured-data-fields-advisor-profile
    plan: "03"
    provides: "proposalInputSchema.clientSiret (required, 14-digit, cross-field-refined against clientSiren) and RegistryIdentity.siret"
provides:
  - "SiretInput — 3-3-3-5 grouped 14-digit display component (exports SiretInput, formatSiret)"
  - "lookupSiretAction — requireUser()-gated server action returning the siege SIRET or a bare { ok: false }"
  - "clientSiret rendered as clientSiren's sibling in ParametresFormCard, registry-prefilled on SIREN blur, always editable"
  - "WizardStep1Wiring's onContinue now blocks Suivant on an empty/invalid clientSiret, same as clientSiren"
affects: [42-09, 42-10, 43]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useTransition wrapping an async server-action call fired from a Controller's onBlur, with the pending flag deliberately unused when the UI contract forbids any loading affordance (D-03)"
    - "Prefill-if-empty pattern: re-read the target field's live value inside the async callback (after the await), not the value captured at blur time, so a race between typing and a slow lookup never overwrites in-progress partner input"

key-files:
  created:
    - src/components/proposal/SiretInput.tsx
    - src/components/proposal/SiretInput.test.tsx
    - app/(authed)/proposals/new/_actions/lookupSiret.action.ts
    - app/(authed)/proposals/new/_actions/lookupSiret.action.test.ts
  modified:
    - app/(authed)/proposals/new/parametres/ParametresFormCard.tsx
    - app/(authed)/proposals/new/parametres/ParametresFormCard.test.tsx
    - app/(authed)/proposals/new/parametres/WizardStep1Wiring.tsx

key-decisions:
  - "WizardStep1Wiring.tsx's onContinue trigger array was extended to include clientSiret (Rule 2 auto-fix) — the plan's declared files_modified list omitted this file, but D-04's must_haves truth ('Suivant is blocked until it is filled') would not have held without it: saveAndAdvanceAction already re-validates proposalInputSchema server-side and would reject an empty SIRET with a generic ValidationFailed toast, but the client-side inline blocking that D-04 and the rest of step 1's required fields already provide would have been silently skipped for clientSiret alone."
  - "lookupSiretAction re-runs normalizeSiren itself before calling lookupCompanyBySiren, even though lookupCompanyBySiren already normalizes internally — this is what lets the malformed-SIREN test assert zero network-adjacent calls, and keeps the short-circuit visible at the action's own boundary rather than relying on a downstream module's behavior."

patterns-established:
  - "D-03 silent-fallback UI: a Controller-bound input with a useTransition-driven prefill lookup that renders zero additional DOM on any failure path, verified by a dedicated negative test asserting no [role=status]/[role=progressbar] and no new text node."

requirements-completed: [FIELD-01]

# Metrics
duration: ~35min
completed: 2026-09-08
---

# Phase 42 Plan 08: SIRET Display Component + Registry Prefill Wiring Summary

**Wizard step 1 gains a required, registry-prefilled `SiretInput` beside `clientSiren`, wired through a `requireUser()`-gated `lookupSiretAction` whose every failure path — timeout, not-found, upstream error, or a siège with no SIRET — collapses to a silent, chrome-free `{ ok: false }` per D-03.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 7 (6 declared in the plan + 1 deviation fix)

## Accomplishments
- `SiretInput.tsx` mechanically mirrors `SirenInput.tsx`: 3-3-3-5 grouping over 14 digits, `maxLength=17`, no spinner/status affordance, digits-only storage left to `requiredSiretSchema`'s transform (Plan 42-03). `formatSiret` exported and unit-tested against all four behaviours from the plan plus two extra assertions (invalid-state rendering, maxLength/inputMode attributes).
- `lookupSiretAction` calls `requireUser()` before inspecting its argument or making any outbound call (T-42-08-A), normalizes the SIREN itself to short-circuit malformed input before any network call, and maps every failure — including a resolved company with a null siège SIRET — to a bare `{ ok: false }` with no reason, message or partial identity (T-42-08-B). A dedicated test asserts `Object.keys(result)` is exactly `['ok']` on the failure path.
- `ParametresFormCard.tsx` renders `clientSiret` as `clientSiren`'s sibling inside the same INFORMATIONS CLIENT `FieldGroup`, required with the same asterisk treatment. The SIREN field's `onBlur` now calls `field.onBlur()` first (preserving `mode='onBlur'` validation) then fires `lookupSiretAction` inside a `useTransition`; on success it prefills `clientSiret` only if the field is still empty at resolution time (re-checked via `getValues` after the `await`, not the value captured at blur), and on failure it does nothing at all — no notice, spinner, banner or retry anywhere in the rendered output.
- The cross-field SIRET/SIREN mismatch error (Plan 42-03's `path: ['clientSiret']` refine) renders inside `#client-siret-error`, proven by a test that fills every other required field first (the refine only runs once every field-level parse succeeds — see `schema.ts`'s own comment) so the mismatch is the sole issue reaching the resolver.

## Task Commits

Each task was committed atomically:

1. **Task 1: SiretInput display component** - `c724070` (feat)
2. **Task 2: lookupSiret server action** - `6588b4f` (feat)
3. **Task 3: Render the SIRET field and wire the SIREN-blur prefill** - `20433d0` (feat)

## Files Created/Modified
- `src/components/proposal/SiretInput.tsx` — `SiretInput` component + `formatSiret` helper
- `src/components/proposal/SiretInput.test.tsx` — 8 tests (4 `formatSiret` behaviours + 4 component behaviours)
- `app/(authed)/proposals/new/_actions/lookupSiret.action.ts` — `lookupSiretAction`
- `app/(authed)/proposals/new/_actions/lookupSiret.action.test.ts` — 9 tests covering auth-gating, malformed-input short-circuit, success mapping, every failure reason, and the narrow-shape assertion
- `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx` — `clientSiret` `Field` + SIREN-blur prefill wiring
- `app/(authed)/proposals/new/parametres/ParametresFormCard.test.tsx` — new `describe('Phase 42 — clientSiret ...')` block, 7 tests
- `app/(authed)/proposals/new/parametres/WizardStep1Wiring.tsx` — `onContinue`'s `form.trigger([...])` array extended with `clientSiret` (deviation, see below)

## Decisions Made
- `lookupSiretAction` deliberately duplicates the `normalizeSiren` short-circuit that `lookupCompanyBySiren` already performs internally, so the action's own contract (no network call on malformed input) is provable at the action's boundary without depending on a downstream module's implementation detail.
- Test timing for the async `useTransition`-wrapped prefill uses `@testing-library/react`'s `waitFor` rather than a fixed count of `await Promise.resolve()` ticks — zodResolver's validation chain (triggered by `setValue(..., { shouldValidate: true })`) takes a variable number of microtask hops, and `waitFor` polls until the assertion holds rather than guessing a tick count.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `clientSiret` to `WizardStep1Wiring.tsx`'s `onContinue` trigger array**
- **Found during:** Task 3, while verifying the plan's own must_haves truth "Suivant is blocked until SIRET is filled and valid"
- **Issue:** `WizardStep1Wiring.tsx` (not in the plan's declared `files_modified`) triggers only `['clientCo', 'clientSiren', 'amountHT', 'durationMonths']` on the step-1 "Suivant" click. Without `clientSiret` in that list, RHF's `form.trigger()` would never validate it on click, so an empty or invalid SIRET would not show an inline error and would not (via this path) block advance — even though the server-side `saveAndAdvanceAction` already re-validates the full `proposalInputSchema` (Plan 42-03) and would reject it, the failure mode would have been a generic `ValidationFailed` toast instead of the inline field-level blocking every other required field on this step already gets. This directly contradicts D-04 ("Suivant is blocked until it is filled") and this plan's own frontmatter `must_haves.truths`.
- **Fix:** Added `'clientSiret'` to the array, alongside its sibling `'clientSiren'`.
- **Files modified:** `app/(authed)/proposals/new/parametres/WizardStep1Wiring.tsx`
- **Verification:** `npm run typecheck`, `npm run lint:check`, and the full `npm test` suite (2663 passed, 0 failing) all green after the change; no dedicated test file exists for `WizardStep1Wiring.tsx` in this codebase today (verified via file search), so this fix relies on the existing `ParametresFormCard.test.tsx` schema-level coverage (an empty `clientSiret` produces `error.field.required`) plus the server-side re-validation in `saveAndAdvance.action.test.ts`, which was already green and unaffected by this change.
- **Committed in:** `20433d0` (Task 3 commit).

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical functionality)
**Impact on plan:** No scope creep. The fix is a single-line addition to an array literal in a file adjacent to the plan's declared scope, required for the plan's own D-04 must_haves truth to actually hold. No production behavior outside the SIRET/SIREN gating on step 1 was touched.

## Issues Encountered
- `screen.getByLabelText('SIREN')` / `'SIRET'` (exact string) failed against the rendered `<label>` markup because `getByLabelText`'s internal text computation includes the label's full `textContent` (including the hidden asterisk span's `'*'`), unlike `getByText`'s default matcher, which only considers direct `TEXT_NODE` children. Switched to anchored regexes (`/^SIREN/`, `/^SIRET/`) to match the existing convention used elsewhere in this test file (e.g., `/Nom du client/`).
- The SIRET/SIREN mismatch test initially failed because `proposalInputSchema`'s cross-field `.refine()` only runs once every other field-level parse succeeds (documented in `schema.ts`) — with `clientCo`/`amountHT`/`durationMonths` still empty, the refine never reached, so no mismatch error appeared. Fixed by filling those three fields before triggering the mismatch scenario.
- Manual `await Promise.resolve()` tick-counting after `fireEvent.blur()` was insufficient to observe the async prefill (zodResolver's validation chain has a variable number of microtask hops). Switched the 4 timing-sensitive new tests to `@testing-library/react`'s `waitFor`.

## User Setup Required

None — no external service configuration required. `lookupSiretAction` reuses the existing `recherche-entreprises` registry client (Plan 34-02) with no new credentials or environment variables.

## Next Phase Readiness
- `clientSiret` is now a genuinely fillable, validated, wizard-blocking field for **new** drafts — FIELD-01 is closed end-to-end (wizard capture → client-side blur validation → server-side `saveAndAdvanceAction` re-validation → `finalizeWizard` re-validation, all sharing `proposalInputSchema` from Plan 42-03).
- **Known, deliberately deferred gap (D-05, not this plan's scope):** a draft created *before* this phase has no `clientSiret` key in its stored `inputs`. Such a draft would still hit `finalizeWizard`'s generic `ValidationFailed` → 500 toast path today. Plan 42-10 owns the dedicated `LegacyDraftIncomplete` bounded-code handling for this. Plan 42-09 separately owns resuming a draft's `clientSiret` value across a page reload (this plan's `page.tsx` prefill was not touched, by design — confirmed against 42-09-PLAN.md before starting).
- `SiretInput` and `lookupSiretAction` are both standalone, reusable exports — no further phase needs to duplicate this shape for the SIRET field.

---
*Phase: 42-captured-data-fields-advisor-profile*
*Completed: 2026-09-08*
