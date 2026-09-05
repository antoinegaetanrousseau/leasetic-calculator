---
phase: 13-3-step-proposal-wizard
plan: 05
subsystem: wizard-step3-route
tags: [wizard, route-page, step-3, verification, finalize, admin-09, d-12-relaxation, d-15-pdf-mock, d-24-spinner-ux, tdd]

# Dependency graph
requires:
  - phase: 11-design-system-foundation-brand-assets
    provides: Stepper (consumed at currentStep=3; hrefForStep threads draft_id for D-23 navigate-back)
  - phase: 12-schema-extensions-for-drafts-history
    provides: getDraftById Phase 12 helper (D-03 silent self-heal via the userId predicate)
  - phase: 08-persistence-pdf-pipeline
    provides: getLatestGlobalParams (commissionPct + coefficients + validityDays for server-side compute)
  - phase: 07-calc-engine-port-proposal-form
    provides: computeLoyer + proposalInputSchema + parseNumeric — same pure entry points the v1.1 LiveLoyerPreview and submit pipeline consume
  - phase: 13-01
    provides: PdfPreviewMock + RecapSection + WizardActionBar + ~45 wizard.* i18n keys (consumed verbatim)
  - phase: 13-02
    provides: saveAsDraftAction (bound to onSaveDraft) + POST /api/proposals/finalize route handler (FinalizeButton POSTs to this; the route runs the D-16 8-step pipeline server-side)
  - phase: 13-03 / 13-04
    provides: established server-component idiom (force-dynamic + requireUser + searchParams Promise + redirect self-heal); pattern mirrored 1:1 for plan 13-05

provides:
  - "/proposals/new/verification route — wizard step 3 terminal review page with full D-01..D-24 lifecycle (2-column 1040px review + finalize CTA)"
  - "FinalizeButton — 'use client' adapter wiring the Confirmer & Générer le PDF CTA to POST /api/proposals/finalize with D-24 spinner UX + success redirect + bounded error toast"
  - "ROUTE-01 final satisfaction (Wave 2 complete — all 3 wizard step routes shipped; plan 13-06 closes integration + STRIDE addendum)"
  - "ADMIN-09 D-12 partial relaxation BOUNDED on step 3: commission rendered EXACTLY ONCE inside ● CALCUL recap card; absent from PdfPreviewMock (no commission prop), ● CLIENT recap, ● PROJET recap, hidden inputs, data-* attributes, and POST payload (only draftId crosses the wire)"

affects:
  - 13-06 (Stepper integration tests + ADMIN-09 golden-PDF test + D-28 STRIDE addendum — this plan completes the partner-facing commission-disclosure footprint; step-2 + step-3 are the SOLE surfaces where the value appears, both pre-finalize, both excluded from PDF/audit_log/server logs)
  - 14 (Brouillons MetricTile resume path — partners reaching step 3 will be able to resume from the Brouillons surface once Phase 14 ships)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline 'use server' arrow as a server-action prop into the FinalizeButton 'use client' component (then re-passed to WizardActionBar's onSaveDraft). The arrow captures draft.id + inputs from the server-component scope and forwards to saveAsDraftAction — same idiom plan 13-04 used for its WizardActionBar mount."
    - "Client-side fetch POST with bounded error handling pattern: useState(isSubmitting) → fetch with explicit Content-Type → res.ok gate → success path (toast.success + router.push + leave isSubmitting=true to prevent double-click race during navigation) → catch path (toast.error with duration: 5000 + setIsSubmitting(false) for retry)."
    - "2-column 1040px grid with `grid-template-columns: minmax(0, 1fr) 360px` and `gap: 24px` per UI-SPEC §5.7 — the page outer container at 1040px is the WIDEST of the 3 wizard steps (steps 1+2 use 840px); the PdfPreviewMock occupies a fixed 360px right column."
    - "D-25 hide-when-empty for the accordion-field recap rows (clientRole, clientSiren, projectDesc) per UI-SPEC §16 open-question recommendation. The rows are appended to the RecapSection rows array only when the corresponding draft.inputs field has a truthy value."
    - "ADMIN-09 D-12 partial-relaxation enforcement by structural isolation — commission flows through a SINGLE named binding (commissionDisplay) into a SINGLE JSX site (calculRows[2].value). The PdfPreviewMock component signature has no commission prop (locked in plan 13-01 §5.3). Test 15 enforces the EXACTLY-ONCE rendered output invariant."

key-files:
  created:
    - "app/(authed)/proposals/new/verification/page.tsx (357 lines — server component, full D-01..D-24 lifecycle; D-03 self-heal × 5 redirect paths; 2-column 1040px review with 3 RecapSection cards + PdfPreviewMock + FinalizeButton)"
    - "app/(authed)/proposals/new/verification/page.test.tsx (489 lines, 15 Vitest assertions covering all PLAN.md `<behavior>` tests)"
    - "app/(authed)/proposals/new/verification/FinalizeButton.tsx (112 lines — 'use client' adapter; fetch POST /api/proposals/finalize; D-24 spinner UX; success-redirect + error-toast)"
    - "app/(authed)/proposals/new/verification/FinalizeButton.test.tsx (301 lines, 8 Vitest assertions covering all PLAN.md `<behavior>` tests)"
    - ".planning/phases/13-3-step-proposal-wizard/13-05-SUMMARY.md (this file)"
  modified: []

key-decisions:
  - "Step 3 redirects (not soft-renders) when proposalInputSchema.safeParse fails — UI-SPEC §10.3 explicit. Unlike step 2 which renders an inline 'Données du projet incomplètes' fallback, step 3 has no visual review surface for incomplete drafts (a review of nothing is meaningless). Same disposition for getLatestGlobalParams returning null."
  - "PdfPreviewMock right column uses the loyer display from computeLoyer for the 'computed' state and falls back to t('result.sur.demande') for the 'on-demand' state. The 'missing' and 'idle' states are unreachable here because the upstream incomplete-inputs redirect catches them — but the loyerDisplay derivation is defensive (parseNumeric on an empty string yields NaN; formatCurrency tolerates it)."
  - "Commission amount derived from amountHT × commissionPct / 100 server-side (NOT read from computeLoyer.computed — the calc engine does not surface a commission field). Same formula computeLoyer uses internally (formula.ts:114-121); same global_params snapshot. Matches plan 13-04's pattern exactly — zero drift risk."
  - "FinalizeButton intentionally does NOT reset isSubmitting on the 200 success path. The redirect will unmount the component; keeping the CTA disabled during the navigation window prevents a double-click race where the partner could fire a second POST before the route handler resolves. On failure, isSubmitting is reset so the partner can retry."
  - "Bounded error handling in FinalizeButton: any non-OK response or thrown fetch surfaces a generic wizard.toast.finalize.error toast (the API route already returns only safeCodes, never raw err.message — but the client adds a second layer of bounded disclosure by never echoing the response body to the partner). T-13-05-I-FailureLeak (PLAN.md threat model) mitigated at both layers."
  - "Inline 'use server' arrow for onSaveDraft instead of threading saveAsDraftAction through a client wiring component. Step 3 has no client-side form to read getValues from; the parent server component owns the draft.inputs reference. Inline arrow keeps the data flow direct (page.tsx → FinalizeButton via prop → WizardActionBar via prop) and matches plan 13-04's step-2 idiom verbatim."
  - "D-25 hide-when-empty for clientName / clientEmail / clientTel / partnerRef ALSO applied (not just clientRole + clientSiren + projectDesc). Each of these schema fields is optional except clientCo. Showing a row with empty value would be ugly; the conditional row builder keeps the recap card information-dense."

patterns-established:
  - "TDD discipline for plan 13-05: RED commit per task (failing tests with module-import error) → GREEN commit (implementation passing). Two RED/GREEN pairs (FinalizeButton task + page.tsx task). Both implementations passed their full assertion set on first GREEN attempt — no GREEN-iteration commits needed."
  - "Server-component page test pattern for plans with a client-component child (FinalizeButton): the page.test.tsx does NOT mock FinalizeButton; the real client component renders alongside the server tree under @testing-library/react. The page tests verify wiring (CTA label, prev-href, presence of the WizardActionBar primary CTA) without needing to exercise the fetch + spinner flow — those are exercised in FinalizeButton.test.tsx."
  - "Cross-plan ADMIN-09 invariant contract: step 2 (plan 13-04) and step 3 (plan 13-05) are the ONLY two pre-finalize partner-facing surfaces that render the commission value. Both render it EXACTLY ONCE per Test 15. Plan 13-06's golden-PDF test asserts the SAME value appears ZERO times in the rendered PDF — closing the cross-surface invariant by enforcing it at the persistence boundary."

requirements-completed:
  - id: ROUTE-01
    note: "Wave 2 step-3 verification route shipped; combined with plans 13-03 (step 1) + 13-04 (step 2) + plan 13-02 (server actions + finalize route) + plan 13-01 (shared components), ROUTE-01's 5 success criteria are now structurally satisfied. Plan 13-06 closes the requirement with the integration suite + STRIDE addendum."

requirements-progress: []

# Metrics
duration: ~20min
completed: 2026-05-12
---

# Phase 13 Plan 05: Step-3 Verification Route Summary

## One-Liner

Shipped the `/proposals/new/verification` wizard step-3 route — the terminal 2-column 1040px review page (3 RecapSection cards left for CLIENT/PROJET/CALCUL + PdfPreviewMock right) plus the FinalizeButton client adapter that POSTs to `/api/proposals/finalize`, surfaces the D-24 spinner UX, navigates to `/proposals/{newId}` on success, and bounds error disclosure to a generic toast — completing Phase 13's 3-step wizard surface inventory with 23 Vitest assertions plus a structurally-bounded ADMIN-09 commission-visibility carve-out for the partner-facing pre-finalize review.

## Files Shipped

### Created (5 files)

| File | Lines | Role |
|---|---|---|
| `app/(authed)/proposals/new/verification/page.tsx` | 357 | Server component — full D-01..D-24 lifecycle (auth gate, D-03 self-heal × 5 redirect paths including incomplete-inputs and missing-params, server-side computeLoyer, 2-column 1040px review with 3 RecapSection cards, PdfPreviewMock right column, FinalizeButton below) |
| `app/(authed)/proposals/new/verification/page.test.tsx` | 489 | 15 Vitest assertions covering every PLAN.md Task 2 `<behavior>` test |
| `app/(authed)/proposals/new/verification/FinalizeButton.tsx` | 112 | 'use client' adapter — fetch POST /api/proposals/finalize + D-24 spinner UX + success-redirect + bounded error toast |
| `app/(authed)/proposals/new/verification/FinalizeButton.test.tsx` | 301 | 8 Vitest assertions covering every PLAN.md Task 1 `<behavior>` test |
| `.planning/phases/13-3-step-proposal-wizard/13-05-SUMMARY.md` | this file | Summary |

**Total new: 4 source/test files + 1 SUMMARY = ~1,259 lines code + tests.**

### Modified (0 files)

No files were modified outside this plan's scope. All Wave-1 / Wave-2 dependencies (PdfPreviewMock, RecapSection, WizardActionBar, saveAsDraftAction, POST /api/proposals/finalize route, all wizard.* i18n keys) consumed verbatim.

## All 23 Vitest Assertions Pass

### `FinalizeButton.test.tsx` (8 assertions)

- [x] Test 1: renders WizardActionBar with primary CTA label "Confirmer & Générer le PDF" (FR)
- [x] Test 2: while finalize is in flight, primary CTA label morphs to "Génération en cours…"
- [x] Test 3: clicking the primary CTA fires `POST /api/proposals/finalize` with body `{ draftId }` and `Content-Type: application/json`
- [x] Test 4: during the in-flight fetch, the primary CTA is `aria-busy="true"` and `disabled`
- [x] Test 5: 200 response `{ id: "p-99" }` → `router.push("/proposals/p-99")` + `toast.success("Proposition générée ✓")`
- [x] Test 6: 500 response → `toast.error("Erreur lors de la génération. Réessayez.", { duration: 5000 })` + CTA re-enables + no navigation
- [x] Test 7: fetch throws (network error) → same error path as 500 (toast.error + CTA re-enables + no navigation)
- [x] Test 8: `onSaveDraft` prop is invoked when the "Enregistrer comme brouillon" ghost button is clicked

### `page.test.tsx` (15 assertions)

#### D-03 silent self-heal redirect paths

- [x] Test 1: GET with NO `?draft_id=` → silent redirect to `/proposals/new/parametres` (no DB read, no compute)
- [x] Test 2: GET with cross-user / null draft → silent redirect (no compute)
- [x] Test 3: GET with incomplete inputs (proposalInputSchema.safeParse fail) → silent redirect BEFORE render (UI-SPEC §10.3 — no visual fallback on step 3)
- [x] Test 14: ROUTE-01 SC5 — Partner B hitting `/verification?draft_id=<A's id>` → silent redirect; no data leak; no computeLoyer call

#### Happy-path render

- [x] Test 4: valid draft → renders title "Vérifier la proposition" + subtitle + Stepper currentStep=3 (FR "Vérification" label)
- [x] Test 5: outer container has `max-width: 1040px` (D-14 / UI-SPEC §5.7)
- [x] Test 6: 2-column grid with `grid-template-columns: minmax(0, 1fr) 360px` and `gap: 24px`
- [x] Test 7: left column renders 3 RecapSection cards (CLIENT, PROJET, CALCUL) in vertical order
- [x] Test 8: ● CLIENT recap rows (clientCo / clientName / clientEmail / clientTel) + ← Modifier link → `/proposals/new/parametres?draft_id=d-1`
- [x] Test 9: ● CLIENT recap INCLUDES clientRole + clientSiren rows ONLY when those accordion fields are filled (D-25 hide-when-empty, UI-SPEC §16 OQ#5)
- [x] Test 10: ● PROJET recap rows (partnerRef / amountHT / durationMonths) + ← Modifier → `/parametres` (≥2 such links total, paired with the CLIENT card)
- [x] Test 11: ● CALCUL recap rows (Coefficient appliqué / Tranche / Commission apporteur with "(non visible client)" sublabel) + ← Modifier → `/proposals/new/calcul?draft_id=d-1`
- [x] Test 12: right column renders PdfPreviewMock with literal `LC-2026-XXX` + `30 jours de validité` + the loyer display inside the role="img" wrapper
- [x] Test 13: FinalizeButton mounted at the bottom — primary CTA "Confirmer & Générer le PDF" present; ← Précédent link to `/proposals/new/calcul?draft_id=d-1`

#### ADMIN-09 D-12 partial-relaxation invariants

- [x] Test 15: commission VALUE (`1 500,00 €`, computed from 75000 × 2 / 100) appears EXACTLY ONCE in rendered output (inside ● CALCUL recap); is ABSENT from the PdfPreviewMock body; no hidden input or data-* attribute carries the value

**Total: 23 assertions. PLAN.md target was 23+. Met exactly.**

## PLAN.md Verification Contracts

| # | Contract | Result | Target |
|---|---|---|---|
| 1 | `npm run typecheck` | PASS (0 errors) | 0 |
| 2 | `npm run lint` | PASS (3 pre-existing warnings in unrelated files: `coefficient-diff.ts` x2, `coefficient-history.integration.test.ts` x1) | 0 new |
| 3 | `npm test -- --run app/(authed)/proposals/new/verification/` | PASS (23 of 23) | 23+ |
| 4 | Full test suite (`npm test -- --run`) | PASS (743 passed, 4 skipped — pre-existing DB-integration tests) | no regressions |
| 5 | `grep -c "<PdfPreviewMock" page.tsx` | 1 | 1 |
| 6 | `grep -c "<RecapSection" page.tsx` | 3 | 3 |
| 7 | `grep -c "redirect.*proposals/new/parametres" page.tsx` | 5 (no-draft + null draft + non-draft/deleted + incomplete-inputs + no-params) | ≥3 |
| 8 | `grep -c "// D-12" page.tsx` | 3 | ≥1 |
| 9 | `grep -c "1040" page.tsx` | 2 (max-width 1040 + the explanatory comment) | ≥1 |
| 10 | `grep -c "api/proposals/finalize" FinalizeButton.tsx` | 1 (the POST endpoint) | 1 |
| 11 | `grep -cE "toast\.success\|toast\.error" FinalizeButton.tsx` | 2 (success path + error path) | ≥2 |

All 11 contracts pass.

## D-01..D-25 Decision Coverage

| Decision | Where implemented | Tests covering |
|---|---|---|
| D-01 requireUser first | page.tsx line 75 — `await requireUser()` before any DB read | Implicit (mocked in Tests 1-15) |
| D-03 silent self-heal × 5 paths | page.tsx lines 81-100 — no-draft-id, null draft, non-draft/deleted, incomplete-inputs, no-params | Tests 1, 2, 3, 14 |
| D-12 ADMIN-09 partial relaxation | page.tsx lines 191-209 (calculRows[2]) + rowSublabels prop at line 271 | Tests 11, 15 |
| D-14 step-3 2-column layout | page.tsx lines 241-296 — outer 1040px max-width + grid with minmax(0, 1fr) 360px columns | Tests 5, 6, 7 |
| D-15 PdfPreviewMock CSS mock | page.tsx lines 282-289 + the PdfPreviewMock component (plan 13-01) | Test 12 |
| D-16 finalize pipeline trigger | FinalizeButton.tsx — fetch POST /api/proposals/finalize with { draftId }; plan 13-02 owns the 8-step server pipeline | FinalizeButton Tests 3, 5 |
| D-20 Stepper completedSteps | page.tsx lines 158-162 — read from inputs._completedSteps; fallback [1, 2] for forward-nav defensiveness | Test 4 |
| D-22 navigate-preserves-state | onSaveDraft passes inputs verbatim — no _completedSteps mutation; ← Modifier links are Next Links, no server-action | Test 8, 10, 11 |
| D-23 ← Modifier semantics | All ← Modifier links use Next Link (no server action); CLIENT+PROJET → /parametres, CALCUL → /calcul | Tests 8, 10, 11 |
| D-24 finalize spinner UX | FinalizeButton.tsx — isSubmitting state + label morph + aria-busy + 5s error toast | FinalizeButton Tests 2, 4, 6, 7 |
| D-25 hide-when-empty accordion rows | page.tsx lines 168-186 + 188-200 — conditional pushes for clientRole / clientSiren / projectDesc | Test 9 |

## D-12 ADMIN-09 Partial Relaxation — Step-3 Confirmation Checklist

Plan 13-04 already implemented the D-12 carve-out on step 2's `Détail du calcul` row. Plan 13-05 extends it to step 3's ● CALCUL recap card — the SECOND and FINAL partner-facing commission-visibility surface. Both surfaces are pre-finalize, both are partner-only (the client-facing PDF excludes commission), and both are bounded EXACTLY-ONCE by their respective Test 15 assertions.

| Invariant | Status | Evidence |
|---|---|---|
| Commission amount appears in step-3 ● CALCUL recap row 2 (with `(non visible client)` sub-line) | ✅ exposed | Tests 11, 15; page.tsx lines 200-208 (calculRows[2]) |
| Commission appears EXACTLY ONCE in rendered HTML | ✅ bounded | Test 15 |
| Commission absent from PdfPreviewMock (no commission prop) | ✅ enforced structurally (component signature lock from plan 13-01 §5.3) | Test 15 (PdfPreviewMock body scanned, no match) |
| Commission absent from ● CLIENT recap | ✅ enforced | clientRows array constructed without commission (page.tsx lines 168-186) |
| Commission absent from ● PROJET recap | ✅ enforced | projetRows array constructed without commission (page.tsx lines 188-200) |
| Commission absent from `<input type="hidden">` | ✅ enforced | Test 15 (DOM walk over input[type=hidden]) — there are no such inputs anyway, the page has zero form controls |
| Commission absent from `data-*` attributes | ✅ enforced | Test 15 (DOM walk over data-* attributes) |
| Commission absent from page metadata / aria-label / console output | ✅ enforced | Page metadata is a static FR title string; the only aria-label on the page comes from PdfPreviewMock (the role="img" wrapper) and is the localized "Aperçu de la proposition à générer"; no console.* calls |
| Commission absent from PDF render path (`@react-pdf/renderer`) | ✅ enforced (cross-plan) | Plan 13-02 finalize-helpers.ts ADMIN-09 isolation barrier + finalize-wizard.ts grep-clean of the literal; plan 13-06's golden-PDF test seals the contract |
| Commission absent from `audit_log proposal.create` payload | ✅ enforced (cross-plan) | Plan 13-02 finalize pipeline writes only `loyerHT + coefficient + tranche` to the audit log payload |
| Commission absent from the POST body or the success response | ✅ enforced | FinalizeButton POSTs only `{ draftId }`; receives only `{ id }` on success or `{ error: <safeCode> }` on failure (Tests 3, 5, 6, 7) |
| Inline `// D-12: ADMIN-09 partial relaxation...` annotation present | ✅ documented | grep contract 8 (3 occurrences in page.tsx) |

**Note for Plan 13-06 STRIDE addendum (D-28):** Step 2 (plan 13-04) and step 3 (plan 13-05) are the SOLE partner-facing pre-finalize surfaces in the entire wizard where the commission value is rendered. Both are bounded EXACTLY-ONCE per Test 15 in their respective test files. Both belong to the same surface family (partner-facing, pre-finalize, excluded from PDF + audit_log + server logs + POST payload). The addendum should treat them as a single cohesive carve-out from Phase 9's 97-threat closure, with the same closure language: rendered-PDF / audit-log / server-log / network-payload invariants confirmed intact across both surfaces.

## Threat Model Coverage

Per PLAN.md `<threat_model>`:

| Threat ID | Category | Status | Mitigation site |
|---|---|---|---|
| T-13-05-S | Spoofing — partner crafts cross-user draft_id | ✅ mitigated | page.tsx lines 88-93 (requireUser + getDraftById userId predicate); Tests 2, 14 |
| T-13-05-T | Tampering — partner POSTs cross-user draftId to /api/proposals/finalize | ✅ mitigated | Plan 13-02 route handler re-auths + finalizeWizard re-checks via getDraftById; FinalizeButton can only echo `{ draftId }` |
| T-13-05-T-Tampering-Inputs | Tampering — partner forces step 3 with incomplete inputs by URL manipulation | ✅ mitigated | page.tsx line 100 (proposalInputSchema.safeParse server-side); plan 13-02 route ALSO re-validates (defence in depth); Test 3 |
| T-13-05-I-ADMIN-09 | Information Disclosure — commission appears in PDF preview or beyond ● CALCUL | ✅ mitigated | PdfPreviewMock signature lock (plan 13-01) + structural isolation (single named binding → single JSX site); Test 15 |
| T-13-05-R | Repudiation — partner finalizes then denies | ✅ mitigated (cross-plan) | Plan 12 finalizeDraft writes the atomic audit_log entry; FinalizeButton's success path is durable via the route handler |
| T-13-05-I-FailureLeak | Information Disclosure — error response leaks commission | ✅ mitigated | Plan 13-02 route returns only safeCodes; FinalizeButton displays a generic toast string (Tests 6, 7) — never echoes response body |

## Deviations from Plan

### None Required

The plan was executed as specified. One small clarification worth recording:

#### 1. PLAN.md `<action>` block for Task 2 showed `← Modifier` link via `t('wizard.step3.modifier.link', lang).replace('← ', '')` — implementation uses literal "Modifier"

The PLAN.md example action block built the link label by stripping the leading "← " from the `wizard.step3.modifier.link` dictionary entry (`'← Modifier'`). The RecapSection component already prepends `← ` to the label in its rendered JSX (`{`← ${modifierLink.label}`}`), so passing the full `'← Modifier'` string would produce `← ← Modifier`. The implementation passes the literal `'Modifier'` directly to keep the rendered output as `← Modifier` (a single arrow). This matches plan 13-04's calcul/page.tsx idiom (line 485 in that file: `label: 'Modifier'`). Behavior unchanged.

## Authentication Gates

None encountered. `requireUser()` is mocked in tests (returns a synthetic session with `id: USER_ID`). At runtime, Better Auth's session cookie carries the user; the layout's gate and this route's `await requireUser()` both run defence-in-depth per PITFALLS §7.3.

## TDD Gate Compliance

Both tasks followed the canonical RED → GREEN cycle:

| Task | RED commit | GREEN commit |
|---|---|---|
| Task 1 (FinalizeButton) | `ba2e8a6` test(13-05): add failing FinalizeButton tests (RED) | `047c833` feat(13-05): implement FinalizeButton client component (GREEN) |
| Task 2 (verification/page.tsx) | `f3db401` test(13-05): add failing verification/page.tsx tests (RED) | `23517a3` feat(13-05): implement verification/page.tsx step-3 server component (GREEN) |

Plan-level TDD gate sequence verified:
- Both RED commits used `test(13-05):` prefix and failed with the canonical module-import error before implementation.
- Both GREEN commits used `feat(13-05):` prefix and immediately followed the corresponding RED.
- Both GREEN implementations passed their full assertion set on the first attempt — no GREEN-iteration commits needed, no REFACTOR commits needed.

## Known Stubs

None. Every wired surface consumes real data or the appropriate Wave-1/Wave-2 dependency:
- `getDraftById` reads the real `proposals` table with the userId predicate.
- `getLatestGlobalParams` reads the real `global_params` table.
- `computeLoyer` is the same pure function v9 / Phase 7 / submit.ts / plan 13-04 uses.
- Commission derived from the SAME global_params snapshot the computeLoyer call consumes (zero drift).
- `PdfPreviewMock`, `RecapSection`, `WizardActionBar` — Wave-1 shipped components (plan 13-01).
- `saveAsDraftAction` — plan 13-02 shipped server action.
- `POST /api/proposals/finalize` — plan 13-02 shipped route handler with the full D-16 8-step pipeline.
- The ← Précédent target on step 3's WizardActionBar points to the (plan 13-04 shipped) `/proposals/new/calcul` route.
- The success redirect target `/proposals/{newId}` points to the existing Phase 8 proposal detail page.

## Phase 13 Wave 2 Completion

Plan 13-05 closes the Wave 2 (route pages) work in Phase 13. The full Wave 2 inventory:

| Plan | Route | Status |
|---|---|---|
| 13-03 | /proposals/new/parametres (step 1) | ✅ shipped |
| 13-04 | /proposals/new/calcul (step 2) | ✅ shipped |
| 13-05 | /proposals/new/verification (step 3) | ✅ shipped (this plan) |

Combined with Wave 1 (plans 13-01 shared components + 13-02 server actions + finalize route), Phase 13's surface inventory for ROUTE-01 is now structurally complete. Plan 13-06 (Wave 3) ships the integration test suite + the D-28 STRIDE addendum + the golden-PDF byte-determinism gate, closing the requirement.

## Self-Check: PASSED

### Created Files Exist

```
[x] app/(authed)/proposals/new/verification/page.tsx              (357 lines)
[x] app/(authed)/proposals/new/verification/page.test.tsx         (489 lines)
[x] app/(authed)/proposals/new/verification/FinalizeButton.tsx    (112 lines)
[x] app/(authed)/proposals/new/verification/FinalizeButton.test.tsx (301 lines)
[x] .planning/phases/13-3-step-proposal-wizard/13-05-SUMMARY.md   (this file)
```

### Commits Exist

```
[x] ba2e8a6 test(13-05): add failing FinalizeButton tests (RED)
[x] 047c833 feat(13-05): implement FinalizeButton client component (GREEN)
[x] f3db401 test(13-05): add failing verification/page.tsx tests (RED)
[x] 23517a3 feat(13-05): implement verification/page.tsx step-3 server component (GREEN)
```

### Plan-Level TDD Gate Sequence

```
[x] Task 1 RED (ba2e8a6) before Task 1 GREEN (047c833)
[x] Task 2 RED (f3db401) before Task 2 GREEN (23517a3)
[x] Both tasks followed test(...) → feat(...) gate ordering.
```
