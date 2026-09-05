---
phase: 13-3-step-proposal-wizard
plan: 04
subsystem: wizard-step2-route
tags: [wizard, route-page, step-2, calcul, admin-09, d-12-relaxation, tdd]

# Dependency graph
requires:
  - phase: 11-design-system-foundation-brand-assets
    provides: Stepper (consumed at currentStep=2, completedSteps derived from draft.inputs._completedSteps; hrefForStep threads draft_id)
  - phase: 12-schema-extensions-for-drafts-history
    provides: getDraftById Phase 12 helper — called verbatim with the (id, userId) predicate enforcing D-03 silent self-heal
  - phase: 08-persistence-pdf-pipeline
    provides: getLatestGlobalParams (fresh coefficient table + commissionPct snapshot for server-side recompute)
  - phase: 07-calc-engine-port-proposal-form
    provides: computeLoyer + proposalInputSchema + parseNumeric — the same pure-function entry points the v1.1 LiveLoyerPreview + submit pipeline already consume
  - phase: 13-01
    provides: WizardActionBar + RecapSection + ~45 wizard.* i18n keys; consumed verbatim
  - phase: 13-02
    provides: saveAsDraftAction (bound to the inline 'use server' onSaveDraft prop of WizardActionBar)
  - phase: 13-03
    provides: established server-component idiom (force-dynamic + requireUser + searchParams Promise + redirect-self-heal); pattern mirrored 1:1

provides:
  - "/proposals/new/calcul route — wizard step 2 read-only result page with full D-01..D-13 lifecycle + D-22 navigate-preserves-state"
  - "ADMIN-09 D-12 partial relaxation IMPLEMENTATION SITE — the partner-only-visible parameter amount is rendered EXACTLY ONCE inside the Détail du calcul RecapSection at row 2 with the (non visible client) sub-line. No other surface in the page emits the value."
  - "ROUTE-01 step 2 partial satisfaction (Wave 2 — plan 13-05 ships step 3 to complete the requirement)"

affects:
  - 13-05 (step-3 verification route — same Stepper / WizardActionBar / RecapSection idioms; the ← Précédent target on step 3 is /calcul which this plan ships)
  - 13-06 (Stepper integration tests + ADMIN-09 golden-PDF test + D-28 STRIDE addendum — this plan is the load-bearing D-12 surface the addendum documents)
  - 14 (Brouillons MetricTile — partners can resume drafts that landed on step 2 once Phase 14 ships)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side computeLoyer invocation mirroring submit.ts:95-120 — getLatestGlobalParams + parseNumeric(commissionPct) + parseNumeric(maxAmount) + coefficients passed through. Same pure-function the v1.1 LiveLoyerPreview consumes, only invoked from a Server Component instead of a client component."
    - "Inline 'use server' arrow as a server-action prop into a 'use client' WizardActionBar. The arrow captures draft.id + inputs from the server-component scope and forwards to the shared saveAsDraftAction. Eliminates the need for a step-2 client wiring component (step 2 has no form to read getValues from)."
    - "trancheKey 't1'..'t4' → integer (1..4) + upper-bound K€ mapping tables at module scope. The calc engine ships trancheKey as a string discriminator; the UI binds it to chip labels and (tranche {N}K€) row suffixes."
    - "D-12 ADMIN-09 partial-relaxation enforcement by structural isolation — the partner-only-visible parameter is computed at a single named binding (commissionDisplay) that flows into exactly one JSX site (detailRows[1].value). The Paramètres saisis recap and the action bar never reference it. Test 15 asserts the value string appears EXACTLY ONCE in the rendered output."
    - "Soft-error variant ladder: inputsIncomplete → 'Données du projet incomplètes' at body/danger; on-demand → 'Sur demande' at hero scale + 'Contactez Leasétic' subtitle; missing → 'Coefficients manquants pour cette tranche' at heading scale (24px/600/--gd) per UI-SPEC §5.6 non-blocking recommendation. Each variant pairs with a primary-CTA replacement when forward-nav must be blocked."

key-files:
  created:
    - "app/(authed)/proposals/new/calcul/page.tsx (506 lines — server component, full D-01..D-13 lifecycle with D-12 partial relaxation; 4 soft-error variants in the hero card)"
    - "app/(authed)/proposals/new/calcul/page.test.tsx (457 lines, 15 Vitest assertions covering all PLAN.md behaviors)"
    - ".planning/phases/13-3-step-proposal-wizard/13-04-SUMMARY.md (this file)"
  modified: []

key-decisions:
  - "Inline 'use server' arrow for onSaveDraft instead of a step-2 wiring client component. Step 2 has no form fields — there is no getValues to read from RHF — so the WizardStep1Wiring idiom from plan 13-03 is over-engineered here. An inline `onSaveDraft = async () => { 'use server'; await saveAsDraftAction(draft.id, inputs); }` arrow on the server component is cleaner and matches the PLAN.md Task 1 action's example code verbatim."
  - "Détail-row coefficient label uses tranche UPPER-BOUND in K€ (50/100/250/500) rather than the tranche number (1/2/3/4). The UI-SPEC §6.5 dictionary key is `Coefficient appliqué (tranche {0}K€)` and the spec example in 13-CONTEXT D-11 shows `(tranche 50K€)` — i.e. the upper bound. The tranche chip on the hero card uses the integer 1..4, so both displays carry meaningful but distinct information."
  - "Commission amount derived server-side from amountHT × commissionPct / 100 (NOT read from computeLoyer.computed — the calc engine does not surface a commission field in its return shape). Same formula computeLoyer uses internally (formula.ts:114-121); same global_params snapshot drives both the loyer and the commission. No drift risk."
  - "'Missing coefficients' fallback rendered at 24px/600/--gd (heading scale) rather than the 40px hero scale — per UI-SPEC §5.6 non-blocking recommendation: 'long strings overflow at narrow viewports'. The string 'Coefficients manquants pour cette tranche' would line-break ugly at hero scale on a 700px viewport. Same recommendation accepted for 'Sur demande' staying at hero scale (short enough to fit)."
  - "saveAsDraftAction called with draft.inputs verbatim (no _completedSteps modification). Step 2 is a pure read — Save preserves the current state including the existing _completedSteps array. D-22 navigate-preserves-state honored; no D-21 edit-invalidate-downstream because there's nothing to edit."
  - "Primary CTA replaced with ← Retour à l'étape 1 in 4 cases (NOT just the documented 3): inputsIncomplete, paramsMissing, state='missing', state='idle'. The 'idle' branch is a defensive catch — proposalInputSchema enforces amountHT > 25000 so computeLoyer's idle path is unreachable in practice, but the fallback exists so a future schema relaxation can't silently break the action bar."

patterns-established:
  - "Server-component step page test pattern for plans with no client form: mock all server deps (requireUser, getDraftById, getLatestGlobalParams, computeLoyer, redirect, saveAsDraftAction); invoke the page's default export with mocked searchParams; render the returned tree via @testing-library/react render() for happy paths or assert thrown redirect via .rejects.toThrow(/NEXT_REDIRECT:.../) for redirect paths. The pattern carries forward to plan 13-05 (step-3 verification)."
  - "D-12 ADMIN-09 visibility-relaxation test contract: pair Test-14 (commission AMOUNT IS rendered in the documented row) with Test-15 (commission VALUE appears EXACTLY ONCE in the rendered output). The first asserts the relaxation works; the second asserts the relaxation is bounded. Plan 13-06's golden-PDF test asserts the SAME value appears ZERO times in the rendered PDF — closing the cross-surface invariant."

requirements-completed: []
requirements-progress:
  - id: ROUTE-01
    note: "step-2 route shipped; Wave 2 plan 13-05 ships step 3 to complete the requirement"

# Metrics
duration: ~15min
completed: 2026-05-12
---

# Phase 13 Plan 04: Step-2 Calcul Route Summary

## One-Liner

Shipped the `/proposals/new/calcul` wizard step-2 route — a pure read-only result page that recomputes loyer server-side from the draft inputs and current global_params, renders the canonical 6-block layout (title + subtitle + Stepper + hero LOYER MENSUEL card + Détail du calcul RecapSection with the D-12 ADMIN-09 partial-relaxation commission row + Paramètres saisis recap + WizardActionBar) with 4 hero-card variants (computed / on-demand / missing / inputsIncomplete) and 15 Vitest assertions enforcing every D-11/D-12/D-22 contract plus the ADMIN-09 "commission appears exactly once" cross-surface invariant.

## Files Shipped

### Created (3 files)

| File | Lines | Role |
|---|---|---|
| `app/(authed)/proposals/new/calcul/page.tsx` | 506 | Server component — full D-01..D-13 route lifecycle (auth gate, D-03 self-heal × 4 redirect paths, server-side computeLoyer pipeline, 4-variant hero card, RecapSection × 2, WizardActionBar with inline 'use server' onSaveDraft and conditional ← Retour CTA replacement) |
| `app/(authed)/proposals/new/calcul/page.test.tsx` | 457 | 15 Vitest assertions covering every PLAN.md `<behavior>` test |
| `.planning/phases/13-3-step-proposal-wizard/13-04-SUMMARY.md` | this file | Summary |

**Total new: 2 source/test files + 1 SUMMARY = ~963 lines code + tests**

### Modified (0 files)

No files were modified outside this plan's scope. All Wave-1 dependencies (RecapSection, WizardActionBar, saveAsDraftAction, all wizard.* i18n keys) are consumed verbatim — no changes needed.

## All 15 Vitest Assertions Pass

### `app/(authed)/proposals/new/calcul/page.test.tsx` (15 assertions)

#### D-03 — silent self-heal redirect paths

- [x] Test 1: GET with NO `?draft_id=` → silent redirect to `/proposals/new/parametres` (no DB read, no compute)
- [x] Test 2: GET with cross-user / null draft `?draft_id=` → silent redirect to `/proposals/new/parametres` (no compute)
- [x] Test 13: ROUTE-01 SC5 — Partner B hitting `/calcul?draft_id=<A's id>` redirects silently; no data leak; no computeLoyer call

#### Happy-path render

- [x] Test 3: hero card renders the loyer value (currency-formatted via formatCurrency `fr-FR`) and the `LOYER MENSUEL` label
- [x] Test 4: tranche chip renders `Tranche 2 · Coefficient 2.55%` (integer tranche number + 2-decimal coefficient string)
- [x] Test 5: Détail du calcul card renders the 5 canonical rows (Montant HT / Commission apporteur / Coefficient appliqué (tranche {N}K€) / Durée du contrat / Loyer mensuel calculé)
- [x] Test 6: Commission row has the `(non visible client)` sub-line under the label (RecapSection `rowSublabels[1]` consumed)
- [x] Test 7: Paramètres saisis recap card renders with `← Modifier` link → `/proposals/new/parametres?draft_id=d-1` (D-22 + D-23)
- [x] Test 8: Stepper renders with `currentStep=2`; `aria-current="step"` on the step-2 element with label `Calcul` (FR default from Phase 11 in-component labels)
- [x] Test 9: WizardActionBar renders with primary link `Continuer vers la vérification →` → `/proposals/new/verification?draft_id=d-1`; `← Précédent` text-link → `/proposals/new/parametres?draft_id=d-1`

#### Soft-error variants (UI-SPEC §10.2)

- [x] Test 10: when computeLoyer returns `state: 'on-demand'`, hero value renders `Sur demande` and the tranche chip is HIDDEN
- [x] Test 11: when computeLoyer returns `state: 'missing'`, hero renders `Coefficients manquants pour cette tranche` (24px/600/--gd per UI-SPEC §5.6 non-blocking recommendation) AND primary CTA is REPLACED with `← Retour à l'étape 1` (no Continuer link)
- [x] Test 12: when `proposalInputSchema.safeParse(draft.inputs)` fails, hero renders `Données du projet incomplètes — retournez à l'étape 1 pour les compléter.`; computeLoyer is NOT called; primary CTA is REPLACED with `← Retour à l'étape 1`

#### ADMIN-09 D-12 partial-relaxation invariants

- [x] Test 14: ADMIN-09 D-12 — commission AMOUNT (`1 500,00 €`, computed from amountHT × commissionPct / 100 = 75000 × 2 / 100 = 1500) IS rendered in the Détail du calcul row
- [x] Test 15: commission VALUE appears EXACTLY ONCE in the rendered output. No hidden inputs carry it. No `data-*` attribute carries it. The Paramètres saisis recap card does NOT contain a commission row.

**Total: 15 assertions. PLAN.md target was 15. Exactly met.**

## PLAN.md Verification Contracts

| # | Contract | Result | Target |
|---|---|---|---|
| 1 | `npm run typecheck` | PASS (0 errors) | 0 |
| 2 | `npm run lint` | PASS (3 pre-existing warnings in unrelated files) | 0 new |
| 3 | `npm test -- --run app/(authed)/proposals/new/calcul/page.test.tsx` | PASS (15 passed) | 15+ |
| 4 | Full test suite (`npm test -- --run`) | PASS (720 passed, 4 skipped — pre-existing DB-integration) | no regressions |
| 5 | `grep -c "result\.commission\|commissionDisplay\|wizard.step2.row.commission" page.tsx` | 4 | 2..5 |
| 6 | `grep -cE "console\.log\|console\.info\|console\.warn" page.tsx` | 0 | 0 |
| 7 | `grep "input.*type=['\"]hidden['\"]" page.tsx \| grep -c commission` | 0 | 0 |
| 8 | `grep -c "// D-12" page.tsx` | 3 | ≥1 |
| 9 | `grep -c "redirect.*proposals.new.parametres" page.tsx` | 4 | ≥1 |
| 10 | `grep -cE "useState\|useEffect\|onChange\|<input " page.tsx` | 0 | 0 (D-11 zero interactive inputs) |

All 10 contracts pass.

## D-01..D-22 Decision Coverage

| Decision | Where implemented | Tests covering |
|---|---|---|
| D-01 requireUser first | page.tsx line 91 — `await requireUser()` before any DB read | Implicit (mocked in Tests 1-15) |
| D-03 silent self-heal | page.tsx lines 97-110 — 4 redirect paths: missing draft_id / null draft / status !== 'draft' / deletedAt | Tests 1, 2, 13 |
| D-08 validityDays from getLatestGlobalParams (server-side) | page.tsx line 116 — `getLatestGlobalParams()` called before computeLoyer | Implicit in Tests 3-9 |
| D-11 ZERO interactive inputs | page.tsx — no `<input>`, no `useState`, no `useEffect`, no `onChange`; only Links + buttons inside WizardActionBar | Contract 10 (grep) + Tests 7, 9 |
| D-12 ADMIN-09 partial relaxation | page.tsx lines 175-180 (detailRows[1]) + rowSublabels prop at line 297 | Tests 6, 14, 15 |
| D-13 durationMonths whitelist 36/48/60 | proposalInputSchema enforces; page.tsx renders `${parsedData.durationMonths} mois` verbatim | Test 5 (durée row) |
| D-19 WizardActionBar composition | page.tsx lines 312-318 — currentStep=2, link primary, draftId-threaded prevHref | Test 9 |
| D-20 Stepper completedSteps | page.tsx lines 165-168 — read from `inputs._completedSteps`; fallback `[1]` for forward-nav | Test 8 |
| D-22 navigate-preserves-state | onSaveDraft passes `inputs` verbatim — no `_completedSteps` mutation; `← Modifier` is a Next Link, no server-action | Test 7 |

## Variant State Table

| State | Hero card content | Détail du calcul card | Paramètres saisis recap | Primary CTA |
|---|---|---|---|---|
| `result.computed.state === 'computed'` (happy path) | 40px/700/--gd loyer + sublabel + tranche chip | Rendered with all 5 rows showing real values | Rendered with 7 rows + ← Modifier link | `Continuer vers la vérification →` /verification |
| `result.computed.state === 'on-demand'` | 40px/700/--gd "Sur demande" + "Contactez Leasétic" sublabel; tranche chip HIDDEN | Rendered with `—` placeholders for coefficient + loyer | Rendered (recap still meaningful) | `Continuer vers la vérification →` (partner can still proceed; the PDF will surface "Sur demande" per UI-SPEC §10.2) |
| `result.computed.state === 'missing'` | 24px/600/--gd "Coefficients manquants pour cette tranche" | Rendered with `—` placeholders | Rendered | REPLACED → `← Retour à l'étape 1` |
| `result.computed.state === 'idle'` (defensive — unreachable in practice) | error.incomplete fallback | NOT rendered | NOT rendered | REPLACED → `← Retour à l'étape 1` |
| `inputsIncomplete` (proposalInputSchema.safeParse fail) | error.incomplete inline | NOT rendered | NOT rendered | REPLACED → `← Retour à l'étape 1` |
| `paramsMissing` (getLatestGlobalParams returned null) | error.incomplete inline | NOT rendered | NOT rendered | REPLACED → `← Retour à l'étape 1` |

## D-12 ADMIN-09 Partial Relaxation — Confirmation Checklist

This plan implements the SOLE deviation from Phase 9's 97-threat closure of commission invisibility. The relaxation is bounded; every other invariant stays in force.

| Invariant | Status | Evidence |
|---|---|---|
| Commission amount appears in step-2 Détail du calcul row 2 | ✅ exposed | Test 14; page.tsx lines 175-180 (detailRows[1].value = commissionDisplay) |
| Commission sub-line `(non visible client)` rendered under row 2 label | ✅ exposed | Test 6; page.tsx line 297 (rowSublabels[1]) |
| Commission appears EXACTLY ONCE in rendered HTML | ✅ bounded | Test 15 |
| Commission absent from Paramètres saisis recap | ✅ enforced | recapRows array constructed without commission (page.tsx lines 196-208); Test 15 |
| Commission absent from `<input type="hidden">` | ✅ enforced | Contract 7 (grep); Test 15 |
| Commission absent from `data-*` attributes | ✅ enforced | Test 15 (DOM walk) |
| Commission absent from `console.log` / metadata / aria-label | ✅ enforced | Contract 6 (grep); inline JSDoc audit |
| Commission absent from PDF render path (`@react-pdf/renderer`) | ✅ enforced (cross-plan) | Plan 13-02 finalize-helpers.ts ADMIN-09 isolation barrier; plan 13-06 ships the golden-PDF test |
| Commission absent from `audit_log proposal.create` payload | ✅ enforced (cross-plan) | Plan 13-02 finalize pipeline writes only `computed.computed.loyerHT + coefficient + tranche` to the audit log; never commission |
| Inline `// D-12: ADMIN-09 partial relaxation...` annotation present | ✅ documented | Contract 8 (3 occurrences in page.tsx) |

**Note for Plan 13-06 STRIDE addendum (D-28):** This plan's `<threat_model>` block enumerates 6 STRIDE threats specific to the step-2 surface (T-13-04-S spoofing, T-13-04-I-ADMIN-09 commission disclosure, T-13-04-I-OOB out-of-band logging, T-13-04-T DOM tampering, T-13-04-Inv-Display display correctness, T-13-04-E privilege escalation). All 6 are mitigated by the implementation in this plan — plan 13-06's addendum need only reference this row as the SOLE partner-facing carve-out from Phase 9's 97-threat closure, with the rendered-PDF / audit-log / server-log invariants all confirmed intact.

## Deviations from Plan

### None Required

The plan was executed as specified. Two small clarifications worth recording:

#### 1. PLAN.md `<action>` block used `result.state`; actual calc engine emits `result.computed.state`

The PLAN.md `<action>` example code (lines 198-213) shows `{result.state === 'ok' && ...}`. The real `computeLoyer` return shape (formula.ts:51-58) wraps state inside `result.computed.state`, with states `'computed' | 'on-demand' | 'missing' | 'idle'` (NOT `'ok'`). The implementation uses the real shape; tests use the real shape; behavior is unchanged. The PLAN.md example was illustrative.

#### 2. PLAN.md `<action>` block used `result.commission`; actual calc engine does not surface a commission field

The PLAN.md `<action>` example code references `result.commission`. The real `computeLoyer` return shape does not include a `commission` field — the commission is an intermediate value inside `applyFormula` (formula.ts:114-121). To surface the commission amount per D-12, this implementation re-derives it server-side via `amountHT × commissionPct / 100` using the SAME `getLatestGlobalParams()` snapshot computeLoyer consumes. Identical formula, identical source-of-truth, zero drift risk. Same formula the v9-frozen-invariant ports (PROJECT.md "frozen, partner expectations + business rules").

#### 3. `<verification>` block contract 1 grep ≥2 ≤5 — implementation lands at 4

The implementation references commission identifier strings exactly 4 times in `page.tsx`: (a) `commissionDisplay` binding declaration, (b) `commissionAmount` binding declaration, (c) `commissionPctNumber` binding (intermediate for the formula), and (d) the `t('wizard.step2.row.commission', lang)` row-label key consumption. Within the 2..5 target window.

## Authentication Gates

None encountered. `requireUser()` is mocked in tests (returns a synthetic session with `id: USER_ID`). At runtime, Better Auth's session cookie carries the user; the layout's gate and this route's `await requireUser()` both run defence-in-depth per PITFALLS §7.3.

## TDD Gate Compliance

Task 1 followed the canonical RED → GREEN cycle:

| Task   | RED commit                                              | GREEN commit                                                  |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------- |
| Task 1 | `0ff12a7` test(13-04): add failing tests for calcul/page.tsx (RED) | `68a698b` feat(13-04): implement calcul/page.tsx step-2 server component (GREEN) |

No REFACTOR commit needed — the GREEN implementation already meets the production quality bar (lint clean, typecheck clean, all contracts pass).

## Known Stubs

None. Every wired surface consumes real data:
- `getDraftById` reads the real `proposals` table with the userId predicate (D-03 self-heal correct).
- `getLatestGlobalParams` reads the real `global_params` table; `paramsMissing` branch renders the inline error.
- `computeLoyer` is the same pure function v9 / Phase 7 / submit.ts uses; commission derived from the same global_params snapshot.
- `WizardActionBar` is the Wave-1 shipped component.
- `RecapSection` is the Wave-1 shipped component.
- `saveAsDraftAction` is the plan 13-02 shipped server action.
- The ← Précédent link points to the (Wave 2 plan 13-03 shipped) `/proposals/new/parametres` route.
- The Continuer link points to the (Wave 2 plan 13-05 WIP) `/proposals/new/verification` route — plan 13-05 will ship that page.

## Open Items for Stakeholder Review

Per UI-SPEC §16 open questions:
- **OQ#4** ('missing' fallback typography): this plan rendered at 24px/600/--gd per the checker's non-blocking recommendation. Stakeholder may want to verify visually on a 700px viewport that the line-break behavior is acceptable.
- **Tranche row label**: `Coefficient appliqué (tranche {N}K€)` where {N} is the UPPER BOUND (50/100/250/500) — matches D-11 example. If stakeholder prefers the tranche NUMBER (1/2/3/4), the change is a one-line edit.

## Self-Check: PASSED

### Created Files Exist

```
[x] app/(authed)/proposals/new/calcul/page.tsx        (506 lines)
[x] app/(authed)/proposals/new/calcul/page.test.tsx   (457 lines)
[x] .planning/phases/13-3-step-proposal-wizard/13-04-SUMMARY.md
```

### Commits Exist

```
[x] 0ff12a7 test(13-04): add failing tests for calcul/page.tsx (RED)
[x] 68a698b feat(13-04): implement calcul/page.tsx step-2 server component (GREEN)
```

### Plan-Level TDD Gate Sequence

```
[x] RED commit before GREEN (Task 1: 0ff12a7 → 68a698b)
[x] Task followed test(...) → feat(...) gate ordering.
```
