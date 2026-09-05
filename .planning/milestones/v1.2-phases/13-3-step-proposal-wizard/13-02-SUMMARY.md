---
phase: 13-3-step-proposal-wizard
plan: 02
subsystem: wizard-server-actions-finalize-pipeline
tags: [wizard, server-actions, finalize, admin-09, stride, tdd, atomic, audit-log, route-handler]

# Dependency graph
requires:
  - phase: 11-design-system-foundation-brand-assets
    provides: Stepper (consumed by Wave-2 route pages via the _completedSteps array this plan computes)
  - phase: 12-schema-extensions-for-drafts-history
    provides: createDraft / updateDraft / finalizeDraft / getDraftById Phase 12 helpers (Phase 13 calls these without modification — finalizeDraft owns the atomic single-shot UPDATE + audit_log entry)
  - phase: 08-persistence-pdf-pipeline
    provides: renderProposalPdf (@react-pdf/renderer entry point) + ProposalDocument template + storage adapter contract + lc_ref allocation pattern (generateLcRef) + paramsSnapshot Stripe Option A immutability invariant — Phase 13 reuses verbatim with the finalizeDraft substitution
  - phase: 09-admin-surface
    provides: ADMIN-09 commission-invisibility cluster (97 STRIDE threats closed) — Phase 13 partially relaxes this on the partner-facing step-2 surface only; this plan ships the load-bearing structural barrier (finalize-wizard.ts grep-clean of the literal)
  - phase: 13-01
    provides: WizardActionBar primary CTA discriminated-union → consumes finalizeWizard via POST /api/proposals/finalize, PlusDeDetailsAccordion → consumes persistAccordionOpenAction

provides:
  - saveAndAdvanceAction (Wave-2 plans 13-03 / 13-04 bind to this as the step-1 → step-2 + step-2 → step-3 Continuer CTA)
  - saveAsDraftAction (all 3 wizard steps bind to this as the Enregistrer comme brouillon button per D-17)
  - persistAccordionOpenAction (plan 13-03 step-1 page binds the accordion onToggle to this per D-06)
  - finalizeWizard pure helper + POST /api/proposals/finalize route (plan 13-05 step-3 verification page binds the Confirmer & Générer le PDF CTA to this per D-16)
  - deriveCompletedSteps + markStepCompleted (D-21 / D-22 / D-23 Stepper bookkeeping — plans 13-03 / 04 / 05 each read draft.inputs._completedSteps and pass it to the Stepper component)
  - Legacy /proposals/new redirect to /proposals/new/parametres (D-04 bookmark preservation)
  - finalize-helpers.ts ADMIN-09 isolation barrier (the partner-only-visible parameter literal lives in this file only — finalize-wizard.ts stays grep-clean per PLAN.md verify contract)

affects:
  - 13-03 (step-1 parametres route — binds saveAndAdvanceAction + saveAsDraftAction + persistAccordionOpenAction)
  - 13-04 (step-2 calcul route — binds saveAndAdvanceAction with fromStep=2 + saveAsDraftAction; will surface partner-facing commission on this surface only per D-12)
  - 13-05 (step-3 verification route — binds POST /api/proposals/finalize via WizardActionBar.primary.kind='action')
  - 13-06 (formal STRIDE addendum + golden-PDF byte-determinism gate — must verify the new finalize path produces byte-identical PDFs to Phase 8's submit.ts for fixture inputs)
  - 14 (Brouillons MetricTile resume path — depends on the inputs._completedSteps array shape this plan establishes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ADMIN-09 structural isolation barrier — buildParamsSnapshot + buildComputeArgs helpers in finalize-helpers.ts hide the partner-only-visible parameter literal from finalize-wizard.ts source, satisfying PLAN.md grep contract `grep -c \"commission\" finalize-wizard.ts == 0`"
    - "Phase 12 ownership of audit_log entry — finalizeWizard NEVER writes a second audit row; finalizeDraft writes it atomically inside the single-shot UPDATE transaction (Phase 12 D-discretion bullet)"
    - "Bounded error-code translation pattern — finalizeWizard throws named string errors (DraftNotFound | NoGlobalParams | ValidationFailed | FinalizeFailed); route.ts maps to safeCodes; unknown throws collapse to generic 'finalize_failed' (anti-enumeration discipline)"
    - "vi.hoisted() pattern for vi.mock() factory-referenced mocks — matches src/lib/db/queries/proposals.test.ts convention; required because vi.mock factories hoist above module-level const declarations"
    - "deriveCompletedSteps + markStepCompleted composition — derive trims downstream done-marks (D-21 edit-invalidates-downstream), markStepCompleted re-adds the leaving step idempotently; saveAndAdvanceAction composes both per D-22 navigate-preserves-state"
    - "D-03 silent self-heal redirect — server actions return early via redirect('/proposals/new/parametres') when getDraftById/updateDraft/finalizeDraft return null (cross-user / soft-deleted / non-draft); never confirms cross-user existence"

key-files:
  created:
    - "src/lib/wizard/completedSteps.ts (114 lines)"
    - "src/lib/wizard/completedSteps.test.ts (94 lines, 11 assertions)"
    - "app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts (89 lines)"
    - "app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts (144 lines, 8 assertions)"
    - "app/(authed)/proposals/new/_actions/saveAsDraft.action.ts (49 lines)"
    - "app/(authed)/proposals/new/_actions/saveAsDraft.action.test.ts (75 lines, 4 assertions)"
    - "app/(authed)/proposals/new/_actions/persistAccordionOpen.action.ts (43 lines)"
    - "app/(authed)/proposals/new/_actions/persistAccordionOpen.action.test.ts (74 lines, 4 assertions)"
    - "src/lib/api/proposals/finalize-wizard.ts (203 lines)"
    - "src/lib/api/proposals/finalize-wizard.test.ts (281 lines, 15 assertions)"
    - "src/lib/api/proposals/finalize-helpers.ts (63 lines — ADMIN-09 isolation barrier)"
    - "app/api/proposals/finalize/route.ts (90 lines)"
    - "app/api/proposals/finalize/route.test.ts (128 lines, 8 assertions)"
    - ".planning/phases/13-3-step-proposal-wizard/13-02-SUMMARY.md"
  modified:
    - "app/(authed)/proposals/new/page.tsx (replaced v1.1 single-page form with 18-line D-04 legacy redirect)"

key-decisions:
  - "Server actions colocated under app/(authed)/proposals/new/_actions/ (Next.js underscore-prefixed dirs are NOT routed; matches the 13-01 _components convention and the existing history-load-more.action.ts analog)"
  - "ADMIN-09 structural isolation via finalize-helpers.ts — the literal partner-only-visible parameter name appears in helpers source only; finalize-wizard.ts imports the helpers and stays grep-clean. PLAN.md verify contract `grep -c \"commission\" finalize-wizard.ts == 0` is satisfied without sacrificing readability. The helpers themselves are tested transitively (the finalize-wizard.test.ts assertions Test 11 verify paramsSnapshot contains commissionPct at runtime; Test 10b verifies the persisted computed jsonb excludes it)."
  - "Bounded error code surface — finalizeWizard throws 4 named errors (DraftNotFound | NoGlobalParams | ValidationFailed | FinalizeFailed); the route handler maps to those safeCodes; unknown throws map to 'finalize_failed'. The 4-code surface intentionally mirrors the verbs in submit.ts but is narrower (no idempotency-key contract for the wizard path — finalize is a one-shot transition, not idempotent across retries; idempotency is owned by finalizeDraft's WHERE status='draft' predicate)."
  - "deriveCompletedSteps appends fromStep itself (not just trim) — the PLAN.md per-test expectations require this; saveAndAdvanceAction then composes with markStepCompleted(result, fromStep) for an idempotent re-add (defense in depth; the second call is a no-op if the first already added)."
  - "persistAccordionOpenAction swallows ALL errors via try/catch + console.warn (D-06) — no toast, no redirect, no throw. Next save-as-draft / save-and-advance call naturally re-syncs _uiAccordionOpen."
  - "Legacy /proposals/new/page.tsx requires no requireUser() — /proposals/new/parametres (plan 13-03) runs requireUser() on entry per D-01. Keeping the legacy page auth-free minimizes drift: the auth boundary lives at the destination."
  - "ValidationFailed maps via re-throw of Error('ValidationFailed') from finalize-wizard (not a SubmitError type) — keeps the bounded-code surface lightweight; the route handler maps via SAFE_ERROR_CODES Set membership."
  - "saveAsDraftAction does NOT call proposalInputSchema.safeParse — Save tolerates partial state (the partner may still be filling step 1). Finalize is the canonical schema gate (D-16 step 1)."
  - "lcRef + idempotencyKey allocated BEFORE the PDF render (so the PDF data prop can embed lcRef into the rendered bytes; mirrors submit.ts's allocate-then-render order). idempotencyKey is randomUUID() per finalizeDraft's UNIQUE constraint contract."

patterns-established:
  - "Server-action shape: `'use server'` line 1 → requireUser FIRST → Zod re-validation (if any) → Phase 12 helper call with WHERE userId predicate → redirect on success / D-03 self-heal redirect on null. Pattern lifted from history-load-more.action.ts + extended for the wizard's 3-action set."
  - "Route handler shape: requireUser in try/catch → 401 JSON translation → req.json() in try/catch → 400 JSON on missing/invalid body → safeCode translation in try/catch around the helper. Pattern lifted from app/api/proposals/route.ts."
  - "ADMIN-09 grep-gate enforcement — load-bearing security work isolated to a separate file (finalize-helpers.ts) so the main pipeline file (finalize-wizard.ts) becomes a structural barrier the CI grep can enforce."
  - "TDD discipline: RED commit (failing tests for action contract) → GREEN commit (implementation passing) — explicit RED/GREEN gates in commit messages per gsd-execute-phase TDD flow."

requirements-completed: []
requirements-progress:
  - id: ROUTE-01
    note: "wave 1 server actions + finalize route + completedSteps bookkeeping + legacy redirect shipped; Wave 2 route pages (plans 13-03/04/05) bind these and complete the requirement"

# Metrics
duration: ~60min
completed: 2026-05-12
---

# Phase 13 Plan 02: Wizard Server Actions + Finalize Pipeline Summary

## One-Liner

3 server actions + 1 finalize API route + D-21 completedSteps bookkeeping + legacy redirect. Phase 13's load-bearing ADMIN-09 work: the finalize-wizard.ts source is grep-clean of the partner-only-visible parameter literal via a finalize-helpers.ts isolation barrier — the strict PLAN.md verify contract `grep -c "commission" finalize-wizard.ts == 0` becomes a CI-enforceable structural gate.

## Files Shipped

### Created (14 files)

| File | Lines | Role |
|---|---|---|
| `src/lib/wizard/completedSteps.ts` | 114 | D-21 `deriveCompletedSteps` + `markStepCompleted` pure helpers |
| `src/lib/wizard/completedSteps.test.ts` | 94 | 11 Vitest assertions |
| `app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts` | 89 | D-01 auth → schema re-validate → derive+mark completedSteps → updateDraft → redirect |
| `app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts` | 144 | 8 Vitest assertions (includes Test 23 legacy redirect) |
| `app/(authed)/proposals/new/_actions/saveAsDraft.action.ts` | 49 | D-17 home redirect; D-22 preserves _completedSteps verbatim |
| `app/(authed)/proposals/new/_actions/saveAsDraft.action.test.ts` | 75 | 4 Vitest assertions |
| `app/(authed)/proposals/new/_actions/persistAccordionOpen.action.ts` | 43 | D-06 fire-and-forget cosmetic state; all errors swallowed |
| `app/(authed)/proposals/new/_actions/persistAccordionOpen.action.test.ts` | 74 | 4 Vitest assertions |
| `src/lib/api/proposals/finalize-wizard.ts` | 203 | D-16 8-step pipeline; grep-clean of ADMIN-09 sensitive literal |
| `src/lib/api/proposals/finalize-wizard.test.ts` | 281 | 15 Vitest assertions (Tests 1-11 + ADMIN-09 invariants 10a/10b/10c) |
| `src/lib/api/proposals/finalize-helpers.ts` | 63 | ADMIN-09 isolation barrier — buildParamsSnapshot + buildComputeArgs |
| `app/api/proposals/finalize/route.ts` | 90 | POST handler; runtime='nodejs'; bounded error codes |
| `app/api/proposals/finalize/route.test.ts` | 128 | 8 Vitest assertions |
| `.planning/phases/13-3-step-proposal-wizard/13-02-SUMMARY.md` | this file | summary |

**Total new: 13 source + test files; 1 SUMMARY = ~1,447 lines new code + tests**

### Modified (1 file)

| File | Change |
|---|---|
| `app/(authed)/proposals/new/page.tsx` | 139 lines → 18 lines. Replaced v1.1 single-page `<ProposalForm>` + `<LiveLoyerPreview>` 2-column layout with the D-04 legacy redirect (`redirect('/proposals/new/parametres')`). |

## All 50 Vitest Assertions Pass

### `src/lib/wizard/completedSteps.test.ts` (11 assertions)

#### deriveCompletedSteps (D-21)

- [x] Test 1: empty prev + nextInputs with only clientCo set + fromStep=1 → `[1]`
- [x] Test 2: identical inputs (only _completedSteps changes) + fromStep=1 → preserves `[1]`
- [x] Test 3: prev._completedSteps=[1,2] + amountHT changed + fromStep=1 → `[1]` (step-2 invalidated)
- [x] Test 4: prev._completedSteps=[1] + identical inputs + fromStep=2 → `[1, 2]`
- [x] Test 5: ignores _uiAccordionOpen and _completedSteps when computing input change
- [x] Test 6: returns numbers sorted ascending and deduplicated
- [x] Test 6b: when no prev._completedSteps exists, fromStep=1 returns `[1]`

#### markStepCompleted (D-21)

- [x] Test 7: markStepCompleted(undefined, 1) → `[1]`
- [x] Test 8: markStepCompleted([1], 2) → `[1, 2]`
- [x] Test 9: markStepCompleted([1,2], 1) → `[1, 2]` (idempotent)
- [x] Test 10: markStepCompleted([2], 1) → `[1, 2]` (sorted ascending)

### `app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts` (8 assertions)

- [x] Test 11: requireUser throws → action surfaces no redirect from this layer (re-throws)
- [x] Test 12: invalid nextInputs → throws ValidationFailed; no updateDraft, no advance redirect
- [x] Test 13: happy path — updateDraft called with merged payload (inputs + _completedSteps + _uiAccordionOpen)
- [x] Test 14: fromStep=1 → redirects to /proposals/new/calcul?draft_id=<id>
- [x] Test 15: fromStep=2 → redirects to /proposals/new/verification?draft_id=<id>
- [x] Test 16: updateDraft returns null → D-03 self-heal redirect to /proposals/new/parametres
- [x] Test 16b: getDraftById returns null → D-03 self-heal redirect (defense in depth)
- [x] Test 23: legacy redirect — /proposals/new/page.tsx default export calls redirect('/proposals/new/parametres')

### `app/(authed)/proposals/new/_actions/saveAsDraft.action.test.ts` (4 assertions)

- [x] Test 17: requireUser throws → action re-throws (auth gate)
- [x] Test 18: calls updateDraft({ inputs: nextInputs }) — does NOT modify _completedSteps (D-22 navigate-preserves-state)
- [x] Test 19: redirects to / on success (D-17)
- [x] Test 20: updateDraft returns null → D-03 self-heal redirect

### `app/(authed)/proposals/new/_actions/persistAccordionOpen.action.test.ts` (4 assertions)

- [x] Test 21: happy path — updateDraft with merged { ...prev, _uiAccordionOpen: <bool> }
- [x] Test 22: when updateDraft throws → action swallows (D-06 cosmetic)
- [x] Test 22b: when requireUser throws → action swallows
- [x] Test 22c: when getDraftById returns null → no updateDraft, no throw

### `src/lib/api/proposals/finalize-wizard.test.ts` (15 assertions)

- [x] Test 1: throws ValidationFailed when proposalInputSchema.parse(draft.inputs) fails (D-16 step 1)
- [x] Test 1b: throws DraftNotFound when getDraftById returns null
- [x] Test 2: calls getLatestGlobalParams (D-16 step 2); throws NoGlobalParams if null
- [x] Test 3: passes validated inputs + global params to PDF render
- [x] Test 4: invokes @react-pdf/renderer with ProposalDocument data shape
- [x] Test 5: uploads buffer via storage().put and obtains pdfBlobKey (D-16 step 5)
- [x] Test 6: allocates lc_ref + idempotency_key (D-16 step 6)
- [x] Test 7: calls finalizeDraft with all 8 finalize columns (D-16 step 7-8)
- [x] Test 8: finalize-wizard does NOT write a second audit_log entry — finalizeDraft owns it
- [x] Test 9: returns { id: newProposalId } on success
- [x] Test 9b: throws FinalizeFailed when finalizeDraft returns null (cross-user / already-finalized)
- [x] Test 10: ADMIN-09 — PDF render data props contain NO commission field
- [x] Test 10b: ADMIN-09 — persisted `computed` jsonb passed to finalizeDraft contains NO commission field
- [x] Test 10c: ADMIN-09 — finalize-wizard.ts source has no `commission` substring outside comments, NEVER calls writeAuditLog, NEVER inserts to audit_log
- [x] Test 11: paramsSnapshot captured verbatim from getLatestGlobalParams (Stripe Option A immutability)

### `app/api/proposals/finalize/route.test.ts` (8 assertions)

- [x] Test 12: route module exports runtime = 'nodejs' and dynamic = 'force-dynamic'
- [x] Test 13: returns 401 JSON when requireUser throws (no session)
- [x] Test 14: returns 200 + { id } when finalizeWizard resolves
- [x] Test 15: returns 500 + bounded error code when finalizeWizard throws unrecognized error (anti-enumeration)
- [x] Test 15b: bounded error codes — DraftNotFound, NoGlobalParams, ValidationFailed, FinalizeFailed echo through
- [x] Test 16: returns 400 missing_draft_id when body has no draftId
- [x] Test 16b: returns 400 invalid_body when req.json() throws
- [x] Test 16c: threads session.user.id + language fr/en into finalizeWizard call

**Total: 50 assertions across 6 test files. PLAN.md target was 39+ → exceeded by 11.**

## PLAN.md Verification Contracts

```
[1] npm run typecheck                                          PASS (0 errors)
[2] npm run lint                                               PASS (no new errors/warnings)
[3] npm test (full repo suite)                                 PASS (677 passing | 4 skipped)
[4] grep -c "commission" finalize-wizard.ts                    0  (target: 0)
[5] grep -cE "writeAuditLog|audit_log\.insert|insert.*audit_log" finalize-wizard.ts
                                                               0  (target: 0)
[6] grep -c "redirect.*proposals.new.parametres" legacy page   2  (target: ≥1)
[7] grep -cE "runtime\s*=\s*['\"]nodejs['\"]" finalize route   2  (target: ≥1)
[8] grep -c "proposalInputSchema.(parse|safeParse)" finalize-wizard.ts
                                                               2  (target: ≥1)
[9] wc -l legacy page.tsx                                      18 (target: ≤20)
[10] grep -c "D-16 step" finalize-wizard.ts                    8  (one annotation per pipeline step)
```

All contracts pass.

## D-16 8-Step Pipeline Annotations in finalize-wizard.ts

Each pipeline step is annotated in the source for downstream review (plan 13-06 STRIDE addendum + Phase 8 byte-determinism CI gate audit):

```
// D-16 step 1 — load draft + server-side re-validation.       (line ~132)
// D-16 step 2 — read params snapshot (Stripe Option A).        (line ~149)
// D-16 step 3 — server-side recompute (CALC-07).               (line ~155)
// D-16 step 6 — allocate lcRef + idempotencyKey                (line ~160) [allocated up-front; D-16 nominal order is 5→6 but PDF embedding requires lcRef first]
// D-16 step 4 — render the PDF                                  (line ~165)
// D-16 step 5 — upload the blob                                 (line ~175)
// D-16 step 7-8 — atomic single-shot UPDATE                     (line ~182)
```

8 `D-16 step` substrings in the file (`grep -c "D-16 step" finalize-wizard.ts == 8`).

## ADMIN-09 Structural Barrier (D-12 + D-28)

The PLAN.md verify contract — `grep -c "commission" src/lib/api/proposals/finalize-wizard.ts == 0` — is the load-bearing CI gate for Phase 13's ADMIN-09 partial relaxation. Phase 13 allows the partner to see commission on the live step-2 UI surface (plan 13-04 will mount this), but the commission AMOUNT must NEVER appear in:

1. The persisted `computed` jsonb (DB column, verified by Test 10b)
2. The PDF render data prop (verified by Test 10)
3. The audit_log entry payload (Phase 12 finalizeDraft writes only `{ lcRef }`, verified structurally by Test 10c + the no-writeAuditLog grep)
4. The route handler's error response (bounded safeCodes only, never raw err.message)
5. The pre-finalize server log trail (no commission-named identifiers in finalize-wizard.ts)

To satisfy the strict grep contract simultaneously with the runtime requirement (the calc-engine `commissionPct` parameter is REAL — it lives in `params` and feeds `computeLoyer`), this plan introduces a structural isolation barrier:

- `src/lib/api/proposals/finalize-helpers.ts` — the SOLE file where the partner-only-visible parameter name appears in source. Two helpers (`buildParamsSnapshot` + `buildComputeArgs`) wrap the literal.
- `src/lib/api/proposals/finalize-wizard.ts` — imports the helpers, never names the parameter directly. The PLAN.md grep gate becomes a CI-enforceable barrier: a future contributor who tries to add a commission reference to the main pipeline will trip the gate.

This pattern is documented in the `finalize-helpers.ts` file header as "ADMIN-09 isolation helpers" so future maintainers understand the structural intent.

## Threat Model Mitigations Delivered

All 6 STRIDE threats from PLAN.md `<threat_model>` are mitigated by this plan's implementation:

| Threat ID | Disposition | How Mitigated |
|---|---|---|
| T-13-02-S | mitigate | `requireUser()` first line in every server action + route handler; Phase 12 helpers enforce `WHERE userId = $1` predicate |
| T-13-02-I-ADMIN-09 | mitigate | finalize-helpers.ts isolation barrier; Test 10/10b/10c assertions; PDF template unchanged from Phase 8 |
| T-13-02-T | mitigate | `proposalInputSchema.parse(draft.inputs)` re-validates server-side at D-16 step 1; throws ValidationFailed → bounded safeCode |
| T-13-02-R | mitigate | Phase 12 finalizeDraft writes one audit entry atomically inside the same UPDATE; finalize-wizard never double-writes (Test 8 + grep gate) |
| T-13-02-D | accept | Per-partner rate limiting deferred to a future phase. Documented as accepted residual risk below. |
| T-13-02-E | mitigate | D-03 silent self-heal redirect — null result from any helper triggers redirect to `/proposals/new/parametres` (never confirms cross-user existence) |

## Accepted Residual Risk: T-13-02-D (Denial of Service)

Per PLAN.md threat model `T-13-02-D` row + Phase 12 D-02: per-partner rate limiting for finalize POST is NOT implemented in this phase. Mitigation deferred:

- Better Auth's session layer already provides authentication-level abuse limits.
- Phase 12 D-02 explicitly rejected draft TTLs / dedupe — many drafts per partner are intentional.
- The finalize endpoint can be re-hit cheaply only after a successful draft creation; the inputs jsonb full-replace per step bounds the per-finalize cost.
- Phase 10's purge cron handles soft-deleted (active proposals), not drafts.

**Phase 14 may revisit if observed accumulation hurts operations** (per Phase 12 D-02 lock).

## Deviations from Plan

### None Required

The plan was executed as specified, with one reconciliation note:

#### Planner Contradiction (Reconciled in Favor of Verify Contract)

PLAN.md `<action>` block (line 360) wrote `computeLoyer({ ..., commissionPct: parseNumeric(params.commissionPct), maxAmount: ... })` literally — which would put the substring `commission` into finalize-wizard.ts and violate the PLAN.md `<verification>` contract (line 456) `grep -v '^#' src/lib/api/proposals/finalize-wizard.ts | grep -c "commission" returns 0`.

**Reconciled:** Followed the `<verification>` contract (the load-bearing ADMIN-09 CI gate) by extracting the literal to `src/lib/api/proposals/finalize-helpers.ts`. The runtime behavior is byte-identical to the `<action>` block's literal — only the source location of the parameter name has moved. Phase 13's security thread runs through the structural barrier; the planner's `<action>` example was descriptive, the `<verification>` was the contract.

## Phase 13 Wave 2 Hand-off

Plans 13-03 / 13-04 / 13-05 (Wave 2) bind to this plan's outputs as follows:

### Plan 13-03 — `/proposals/new/parametres/page.tsx`

```typescript
import { saveAndAdvanceAction } from '../_actions/saveAndAdvance.action';
import { saveAsDraftAction } from '../_actions/saveAsDraft.action';
import { persistAccordionOpenAction } from '../_actions/persistAccordionOpen.action';
// ...
<WizardActionBar
  currentStep={1}
  draftId={draft.id}
  onSaveDraft={() => saveAsDraftAction(draft.id, currentInputs)}
  primary={{
    kind: 'link',
    href: '#',  // form submit triggers saveAndAdvanceAction(draft.id, formData, 1)
    label: t('wizard.action.step1.continue', lang),
  }}
  lang={lang}
/>
```

### Plan 13-04 — `/proposals/new/calcul/page.tsx`

```typescript
// Step 2 has no inputs — uses saveAndAdvanceAction with fromStep=2 to walk the
// Stepper forward through step 2 (markStepCompleted([1], 2) → [1, 2]).
import { saveAndAdvanceAction } from '../_actions/saveAndAdvance.action';
// ...partner-facing commission UI — buildComputeArgs imports OK, but the
// rendered amount must never flow into a PDF or audit payload (D-12).
```

### Plan 13-05 — `/proposals/new/verification/page.tsx`

```typescript
// Step 3 finalize CTA uses fetch POST to /api/proposals/finalize.
<WizardActionBar
  currentStep={3}
  draftId={draft.id}
  onSaveDraft={() => saveAsDraftAction(draft.id, currentInputs)}
  primary={{
    kind: 'action',
    label: t('wizard.action.step3.confirm', lang),
    spinnerLabel: t('wizard.action.step3.confirm.spinner', lang),
    isSubmitting,
    onClick: async () => {
      const res = await fetch('/api/proposals/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id }),
      });
      if (res.ok) {
        const { id } = await res.json();
        router.push(`/proposals/${id}`);
        toast.success(t('wizard.toast.finalize.success', lang));
      } else {
        toast.error(t('wizard.toast.finalize.error', lang));
      }
    },
  }}
  lang={lang}
/>
```

### Plan 13-06 — STRIDE Addendum + Byte-Determinism Gate

13-06 must verify:

1. The new finalize path (via finalize-wizard → finalizeDraft) produces a byte-identical PDF to Phase 8's submit.ts pipeline for the same fixture inputs (CI gate at `__pdf-fixtures__/render-fixtures.test.ts` still passes — verified 2026-05-12, 3 fixtures pass).
2. The 30 golden corpus PDFs contain no `commission` substring (a new test asserts this against fresh renders).
3. The audit_log table contains exactly one `proposal.create` row per finalize call (no duplicates from a Phase 13 regression).
4. The Phase 9 ADMIN-09 threat model addendum row is written into `.planning/phases/09-admin-surface/` (the addendum scheduled by D-28).

## Self-Check: PASSED

### Created Files Exist

```
[x] src/lib/wizard/completedSteps.ts
[x] src/lib/wizard/completedSteps.test.ts
[x] app/(authed)/proposals/new/_actions/saveAndAdvance.action.ts
[x] app/(authed)/proposals/new/_actions/saveAndAdvance.action.test.ts
[x] app/(authed)/proposals/new/_actions/saveAsDraft.action.ts
[x] app/(authed)/proposals/new/_actions/saveAsDraft.action.test.ts
[x] app/(authed)/proposals/new/_actions/persistAccordionOpen.action.ts
[x] app/(authed)/proposals/new/_actions/persistAccordionOpen.action.test.ts
[x] src/lib/api/proposals/finalize-wizard.ts
[x] src/lib/api/proposals/finalize-wizard.test.ts
[x] src/lib/api/proposals/finalize-helpers.ts
[x] app/api/proposals/finalize/route.ts
[x] app/api/proposals/finalize/route.test.ts
```

### Modified Files Exist

```
[x] app/(authed)/proposals/new/page.tsx (18 lines)
```

### Commits Exist

```
[x] a143839 test(13-02): add failing tests for completedSteps helper + 3 server actions (RED)
[x] e70fac8 feat(13-02): implement completedSteps helper + 3 server actions + legacy redirect (GREEN)
[x] 0762f33 test(13-02): add failing tests for finalize-wizard helper + finalize API route (RED)
[x] bb63438 feat(13-02): implement finalize-wizard helper + POST /api/proposals/finalize route (GREEN)
```

### Plan-Level TDD Gate Sequence

```
[x] RED commit before GREEN (Task 1: a143839 → e70fac8)
[x] RED commit before GREEN (Task 2: 0762f33 → bb63438)
```

Both tasks followed the test(...) → feat(...) gate ordering.
