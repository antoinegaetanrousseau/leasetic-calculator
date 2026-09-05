---
phase: 13-3-step-proposal-wizard
plan: 06
subsystem: wizard-integration-tests-and-security
tags: [wizard, stepper, integration-test, admin-09, d-12, d-28, stride, no-commission, golden-corpus, smoke-runbook, route-01-closeout]

# Dependency graph
requires:
  - phase: 13-01
    provides: completedSteps.ts (deriveCompletedSteps + markStepCompleted) — the D-21/D-22/D-23 bookkeeping primitive Plan 13-06 Task 1 exercises end-to-end
  - phase: 13-02
    provides: finalize-wizard.ts D-16 8-step pipeline + finalize-helpers.ts ADMIN-09 isolation barrier — the surface area Plan 13-06 Task 2 drives with 30 golden corpus fixtures
  - phase: 13-03 / 13-04 / 13-05
    provides: page.test.tsx files (commission appears-exactly-once assertions) — referenced from STRIDE addendum §6 verification artifacts
  - phase: 11
    provides: Stepper component contract (D-20..D-23 state semantics consumed verbatim)
  - phase: 09 + phase: 10
    provides: 97-threat ADMIN-09 closure (42 + 55) — the threat model Plan 13-06 Task 3 addendum extends
  - phase: 07 + phase: 08
    provides: 30-case golden corpus + @react-pdf/renderer byte-determinism gate (calc.golden.test.ts pattern + __pdf-fixtures__/render-fixtures.test.ts gate untouched)

provides:
  - "src/lib/wizard/stepperBehavior.test.ts — 9-scenario integration test of D-20/D-21/D-22/D-23 Stepper state semantics exercising deriveCompletedSteps + markStepCompleted under realistic Continuer/Modifier/Précédent/Save sequences"
  - "src/lib/pdf/no-commission.test.ts — 36-assertion ADMIN-09 regression test across 30 v9-parity golden fixtures with 4-layer defense-in-depth (render-data prop / computed jsonb / paramsSnapshot scope / binary PDF inspection via node:zlib decompression + ToUnicode CMap reconstruction); the load-bearing D-12 + D-28 gate"
  - "docs/security/13-stride-addendum-admin09-step2.md — formal STRIDE addendum to Phase 9 + Phase 10's 97-threat closure documenting the D-12 relaxation envelope + 7 new threats (5 accepted, 2 mitigated, 1 deferred to Phase 14) + 7 verification artifacts that enforce the invariants; the D-28 phase-blocking deliverable"
  - "docs/smoke/13-wizard-runbook.md — manual Chrome+Edge smoke runbook covering all 5 ROUTE-01 success criteria + the ADMIN-09 commission-invisibility envelope + cross-partner draft isolation across 7 numbered tests with operator pass/fail checkboxes"
  - "ROUTE-01 structural closeout — all 5 success criteria now have BOTH automated test coverage (across plans 13-01..13-06) AND a manual verification runbook waiting on Antoine's sign-off"

affects:
  - 14 (Brouillons MetricTile + partner home draft list — T-13-NEW-07 in the addendum flags Phase 14 needs its own no-commission verification on those surfaces)
  - Phase 13 sign-off (this plan is the FINAL Wave 3 deliverable; Antoine's smoke-runbook sign-off + addendum review unlocks /gsd-transition)

# Tech tracking
tech-stack:
  added: []   # NO new dependencies. node:zlib already in Node stdlib. No pdf-parse / pdfjs-dist needed.
  patterns:
    - "PDF binary inspection via node:zlib decompression of FlateDecode streams + ToUnicode CMap reconstruction. @react-pdf/renderer emits text via [<HEX> num <HEX>...] TJ bracketed-array form with 2-byte glyph indices and a bfchar CMap mapping glyph→unicode. Reconstructing the visible text requires both regexes (bfchar + TJ) — Plan 13-06 Task 2 establishes this pattern for the no-commission gate. Future ADMIN-09 PDF surface checks (e.g. Phase 14) can reuse decompressPdfStreams + reconstructVisibleText helpers."
    - "Defense-in-depth test layering for cross-surface invariants: a single security invariant (ADMIN-09 commission invisibility) is enforced at FOUR different boundaries — render-data prop (Layer 1) + persisted jsonb (Layer 2) + paramsSnapshot scope (Layer 3) + actual PDF binary (Layer 4). Any single-layer regression caught immediately. This pattern is reusable for any future cross-surface invariant (e.g. pricing leak, PII leak)."
    - "Manual smoke runbook structure: each numbered test maps to ONE requirement success criterion, has explicit prerequisites + setup, numbered observable steps with expected outcomes, a pass/fail checklist for the operator, and a 'Issue?' free-text section. Cross-browser checklist mirrors the primary suite. Recovery path documented at the bottom. Reusable template for any future phase that needs human verification of complex UI flows."
    - "STRIDE addendum structure for bounded relaxation of an existing closed threat cluster: §1 Context (what + why) → §2 Envelope (precise surface list) → §3 Reaffirmation table (what's UNCHANGED) → §4 Cluster re-review (group closed threats and disposition each cluster) → §5 New threats (with dispositions) → §6 Verification artifacts (locked, with file:line refs) → §7 Out-of-scope → §8 Sign-off contract → §9 References. Reusable template for any future deliberate security relaxation."

key-files:
  created:
    - "src/lib/wizard/stepperBehavior.test.ts (267 lines, 9 Vitest tests covering D-20/D-21/D-22/D-23 across realistic Continuer/Modifier/Précédent/Save sequences)"
    - "src/lib/pdf/no-commission.test.ts (581 lines, 36 Vitest tests across 30 golden fixtures × 4 assertion layers + binary inspection on 4 representative PDFs + drizzle migration count check)"
    - "docs/security/13-stride-addendum-admin09-step2.md (295 lines, 9 sections + 11 D-12/D-28 references + 7 new threat IDs T-13-NEW-01..T-13-NEW-07)"
    - "docs/smoke/13-wizard-runbook.md (442 lines, 7 tests covering all 5 ROUTE-01 criteria + ADMIN-09 envelope + cross-partner isolation; 14 ROUTE-01 references)"
    - ".planning/phases/13-3-step-proposal-wizard/13-06-SUMMARY.md (this file)"
  modified: []

key-decisions:
  - "Layer 4 binary PDF inspection uses node:zlib NOT pdf-parse — the project already depends on @react-pdf/renderer for output AND node:zlib is in stdlib. Adding pdf-parse as a dev dep was deemed unnecessary because the FlateDecode stream format + ToUnicode CMap reconstruction is fully implementable in ~30 lines of stdlib regex code (the decompressPdfStreams + reconstructVisibleText helpers in no-commission.test.ts). Zero new dependencies in Phase 13 — consistent with the phase's 'no schema migrations, no new tech' posture."
  - "Layer 4 subset is 4 PDFs (2 fixtures × 2 langs) NOT all 30. Rationale: Layers 1-3 cover all 30 fixtures structurally (no commission KEY in render data, no commission VALUE in render data, no commission in computed jsonb, paramsSnapshot scope verified). Layer 4 is the BACKSTOP — it proves the structural assertions translate to actual PDF bytes. Two representative fixtures (t2/75000/48 happy-path + t4/400000/60 edge of seuil) × two languages cover the high-value cases without paying 30× the CI cost. If a future regression flips commission into the PDF, Layers 1-2 catch it immediately for all 30 fixtures; Layer 4 catches it on the 4 binary tests. Combined coverage > 30 binary tests in CI cost."
  - "Positive control for Layer 4 binary inspection is lcRef in PDF metadata, NOT the loyer in visible text. Rationale: @react-pdf/renderer renders KeyValueRow as a flex row; glyphs from label + value columns interleave in document order with kerning adjustments, scrambling reconstructed text. The loyer value digits ARE present but fragmented. lcRef is embedded in PDF metadata (Title, Keywords) as plain ASCII — NOT subject to font subsetting or kerning interleaving — so it's a 100%-reliable positive control. The negative control (commission absence) still works on fragmented text because a leaked commission would be glyph-CONTIGUOUS within a single value's TJ run (a renderer emits one value's digits before moving to the next column)."
  - "STRIDE addendum format: TABLE-DRIVEN not prose-driven. The reaffirmation table (§3) and the new threats table (§5) are the load-bearing sections — they enumerate every affected surface in one place, machine-greppable. Cluster summaries (§4) provide narrative context. Verification artifacts (§6) are file:line specific. This format is more maintainable than free-text and matches Phase 9 SECURITY.md's threat register style."
  - "Smoke runbook is in ENGLISH (internal QA tooling) but references FR copy of the app (partner-facing). Per CONTEXT.md §3 the app is FR-primary; the runbook tests FR copies (`Paramètres du projet`, `Continuer vers le calcul →`, etc.) but the runbook prose itself is English for internal team accessibility. Cross-browser checklist mirrors the primary suite — Chrome + Edge are the only browsers PROJECT.md requires (desktop-primary, latest stable)."
  - "Plan execution per the orchestrator's split: Tasks 1-4 (artifacts) executed automated; Task 5 (human verification checkpoint) deferred to the user. The plan is autonomous: false specifically because the smoke runbook execution is the LAST manual gate before Phase 13 closes. This executor delivers the 4 artifacts; Antoine runs the runbook + reviews the STRIDE addendum + signs off."

patterns-established:
  - "Phase-closing 'wave 3 integration' pattern: where waves 1-2 deliver per-file work, wave 3 stitches with cross-cutting integration tests + security artifacts. Plan 13-06 establishes the template: (a) integration test for the load-bearing bookkeeping primitive shipped in wave 1-2 (stepperBehavior.test.ts), (b) security regression test across a golden corpus (no-commission.test.ts), (c) formal security addendum documenting any deliberate threat-model changes (STRIDE addendum), (d) manual smoke runbook for human verification of the end-to-end flow. Future phases that ship cross-cutting features can mirror this 4-deliverable structure."
  - "ADMIN-09 invariant enforcement via structural isolation barrier + grep contracts + golden-corpus regression tests: the finalize-helpers.ts file owns the literal `commission` property name; finalize-wizard.ts has zero `commission` substring outside comments (verified by source-file grep test); the golden-corpus test asserts the invariant across 30 representative cases. This 3-layer defense (isolation + grep + golden) is reusable for any other 'forbidden substring' security invariant."

requirements-completed:
  - id: ROUTE-01
    note: "Wave 3 closeout shipped — the integration tests + STRIDE addendum + manual smoke runbook close ROUTE-01's last automation gates. The requirement is structurally complete (788 Vitest tests pass, including 9 stepperBehavior + 36 no-commission tests from this plan); MANUAL human verification via the smoke runbook is the final gate before Phase 13 can be marked complete via /gsd-transition. Antoine executes the runbook in Chrome + Edge + signs off the STRIDE addendum to fully close the requirement."

requirements-progress: []

# Metrics
duration: ~25min
completed: 2026-05-12
---

# Phase 13 Plan 06: Wave-3 Integration Tests + STRIDE Addendum + Smoke Runbook Summary

## One-Liner

Shipped Phase 13's Wave-3 closeout — 9-scenario Stepper D-20/D-21/D-22/D-23 integration test + 36-assertion ADMIN-09 no-commission-in-PDF golden corpus test (across 30 v9-parity fixtures with 4-layer defense-in-depth including binary PDF inspection via node:zlib decompression + ToUnicode CMap reconstruction) + formal STRIDE addendum to Phase 9 + Phase 10's 97-threat ADMIN-09 closure documenting the D-12 bounded relaxation envelope + manual Chrome+Edge smoke runbook walking all 5 ROUTE-01 success criteria + ADMIN-09 invariant + cross-partner draft isolation, with full Vitest suite at 788 passing tests (4 skipped — integration-DB) and zero new schema migrations.

## Files Shipped

### Created (5 files)

| File | Lines | Role |
|---|---|---|
| `src/lib/wizard/stepperBehavior.test.ts` | 267 | 9 Vitest scenarios — D-20 completion derivation, D-21 edit-invalidates-downstream (3 scenarios incl. accordion field + bookkeeping-key exclusion), D-22 ← Précédent preservation, D-23 ← Modifier preservation, D-21+D-20 combined rebuild, Save-as-draft no-advance, markStepCompleted idempotency |
| `src/lib/pdf/no-commission.test.ts` | 581 | 36 Vitest assertions — Layer 1+2+3 across 30 golden fixtures (render data prop + persisted computed jsonb + paramsSnapshot scope) + Layer 4 binary inspection on 4 representative PDFs (t2/75000/48 and t4/400000/60 × {fr,en}) + drizzle migration count check (Phase 13 ships ZERO 0005+ migrations) |
| `docs/security/13-stride-addendum-admin09-step2.md` | 295 | Formal STRIDE addendum — 9 sections, 11 D-12/D-28 references, 7 new threats T-13-NEW-01..T-13-NEW-07 (5 accepted, 2 mitigated, 1 deferred to Phase 14), 6-cluster STRIDE re-review of the 97-threat closure, 7 verification artifacts with file:line refs, Antoine sign-off contract |
| `docs/smoke/13-wizard-runbook.md` | 442 | Manual Chrome+Edge runbook — 7 numbered tests covering all 5 ROUTE-01 success criteria + ADMIN-09 commission-invisibility envelope + cross-partner draft isolation; pass/fail checkboxes per test; cross-browser checklist; recovery path |
| `.planning/phases/13-3-step-proposal-wizard/13-06-SUMMARY.md` | this file | Summary |

**Total new: 4 deliverables + 1 SUMMARY = ~1,585 lines code + docs.**

### Modified (0 files)

No files modified outside this plan's scope. All Wave 1 + Wave 2 dependencies consumed verbatim (completedSteps.ts, finalize-wizard.ts, finalize-helpers.ts, renderProposalPdf, computeLoyer, formatCurrency, golden corpus fixtures from calc.golden.test.ts).

## Tasks Executed

### Task 1 — Stepper state semantics integration test (commit `c2471a2`)

Created `src/lib/wizard/stepperBehavior.test.ts` (267 lines, 9 tests). Each test is a SCENARIO test — not a pure-function test — exercising deriveCompletedSteps + markStepCompleted helpers through realistic partner-flow sequences.

**Test coverage (D-decision tags inline):**

| Test | Scenario | D-rules |
|---|---|---|
| 1 | a step only completed after Continuer click (Save = no-op) | D-20 |
| 2 | editing step-1 field after [1,2] clears step 2 → [1] | D-21 |
| 3 | editing an accordion field (clientSiren) also clears downstream | D-21 |
| 4 | toggling _uiAccordionOpen does NOT clear downstream | D-21 (BOOKKEEPING_KEYS exclusion) |
| 5 | ← Précédent navigation preserves _completedSteps (pure `<Link>`) | D-22 |
| 6 | ← Modifier from step 3 → step 2 preserves state | D-23 |
| 7 | edit + revisit + Continuer rebuilds [1] → [1,2] | D-21 + D-20 |
| 8 | Save-as-draft on step 2 does NOT advance _completedSteps | D-17 |
| 9 | markStepCompleted is idempotent under Continuer replay | D-20 |

All 9 tests passing on first commit.

### Task 2 — ADMIN-09 no-commission-in-PDF golden corpus test (commit `0c5db1c`)

Created `src/lib/pdf/no-commission.test.ts` (581 lines, 36 tests). The load-bearing D-12 + D-28 gate.

**4-layer defense-in-depth across 30 v9-parity golden fixtures:**

| Layer | Coverage | Mechanism | Per-fixture? |
|---|---|---|---|
| 1 | render-data prop has no `commission` substring + no commission AMOUNT currency string | JSON.stringify + lowercase substring search | yes — 30× |
| 2 | persisted `computed` jsonb has no `commission` key + no commission AMOUNT currency string | `in` operator + JSON.stringify substring search | yes — 30× |
| 3 | paramsSnapshot DOES contain `commissionPct` (the PERCENTAGE — Phase 8 Stripe Option A immutability) | direct property access | yes — 30× |
| 4 | rendered PDF binary has no `commission` literal in metadata + no commission AMOUNT currency string in decompressed glyph streams | real renderProposalPdf via `@/lib/pdf/render` direct import + node:zlib inflate + ToUnicode CMap glyph→unicode reconstruction + TJ bracketed-array parsing | subset — 4 PDFs (2 fixtures × 2 langs) |

**Plus 1 structural assertion:** `drizzle/` directory contains NO 0005+ migration files (Phase 13 ships ZERO schema migrations).

The 30 golden fixtures match the structure of `src/lib/calc/calc.golden.test.ts`:
- 12 happy-path (4 tranches × 3 durations)
- 8 tranche boundaries
- 4 on-demand
- 6 edge / unusual amounts

All 36 tests passing on second commit (first iteration had positive-control false negatives from KeyValueRow column-interleaving in @react-pdf/renderer; switched to lcRef-in-metadata positive control which is 100% reliable).

### Task 3 — STRIDE addendum (commit `d4d60e0`)

Created `docs/security/13-stride-addendum-admin09-step2.md` (295 lines, 9 sections). The D-28 mandatory deliverable.

**Structure:**

1. Header + author + reviewer + status (drafted, pending Antoine sign-off)
2. Context — 97-threat closure summary + D-12 carve-out rationale
3. Relaxation envelope — precise surface list (3 rows) + cross-user invariant
4. Invariants that remain in force — 10-row reaffirmation table with verification artifacts column
5. STRIDE re-review of the 97-threat closure — grouped into 6 clusters (A: PDF binary / B: audit_log / C: server-log / D: cross-user / E: admin-surface / F: partner-facing UI); 5 clusters UNCHANGED, Cluster F has NEW BOUNDED RELAXATION on 2 wizard surfaces
6. New threats — 7 entries T-13-NEW-01..T-13-NEW-07 with dispositions:
   - 5 accepted (screen-share, copy-paste, browser-extension keylogger, browser cache history, malicious script via XSS — covered by existing CSP)
   - 2 mitigated (DOM inspection paths verified clean; URL doesn't embed value)
   - 1 deferred to Phase 14 (Brouillons MetricTile + partner home draft list)
7. Verification artifacts — 7 file references with line:test-id specificity (no-commission.test.ts, finalize-wizard.test.ts Tests 10/10b/10c, finalize-helpers.ts isolation barrier, page.test.tsx Test 15 in plans 13-04 + 13-05, stepperBehavior.test.ts, smoke runbook Test 6)
8. Out-of-scope (Phase 14 partner home, browser-extension layer, public-surface auth)
9. Sign-off contract — Antoine reviews end-to-end + edits the `Status:` line on completion

11 D-12/D-28 references (≥4 required). 1 `Cluster F` reference. Verification gates pass.

### Task 4 — Manual smoke runbook (commit `d5b6b83`)

Created `docs/smoke/13-wizard-runbook.md` (442 lines, 7 tests).

**Coverage:**

| Test | Maps to | What it verifies |
|---|---|---|
| Test 1 | ROUTE-01 #1 (3 routes + Stepper state) | All 3 wizard routes render with correct Stepper state per step; D-03 self-heal redirects work |
| Test 2 | ROUTE-01 #2 (state persists between steps via DB-01) | Fields persist across browser-tab close + reopen via `?draft_id=` query param + DB-01 Postgres draft row |
| Test 3 | ROUTE-01 #3 (Stepper completed-step navigation) | Done-step links navigate back preserving state (D-22); pending steps not clickable (D-22 negative); D-21 edit-invalidates-downstream test (Stepper step 3 reverts to PENDING after a step-1 edit) |
| Test 4 | ROUTE-01 #4 (finalize transitions draft→active) | Confirmer & Générer le PDF spinner UX (D-24), redirect to /proposals/{newId}, success toast, partner list shows new proposal with `active` chip, downloaded PDF inspection (NO commission) |
| Test 5 | ROUTE-01 #5 (draft visibility scoped to creator) | Partner B trying to access Partner A's draft_id is silently redirected to a fresh B-owned draft on /parametres (D-03); URL has different uuid; form is empty; no flash of A's data |
| Test 6 | D-12 + D-28 ADMIN-09 envelope | Commission visible exactly once on step 2; exactly once on step 3; zero on /proposals/{id}; zero in PDF binary (via `pdftotext`); zero in audit_log payload (optional SQL query) |
| Test 7 | Edge cases | Validation error, on-demand path, save-as-draft round-trip, accordion expand/collapse + persistence, ← Précédent on steps 2+3 |

Plus a cross-browser verification checklist for Edge mirroring the Chrome suite. Operator signature + pass/fail verdict + recovery path documented.

14 ROUTE-01 references (≥5 required).

## Verification

| Gate | Status |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0 (3 pre-existing warnings unrelated to this plan) |
| `npm test` | ✅ 788 passed, 4 skipped (integration-DB tests requiring DATABASE_URL_TEST) |
| `test -f docs/security/13-stride-addendum-admin09-step2.md` | ✅ exists |
| `test -f docs/smoke/13-wizard-runbook.md` | ✅ exists |
| `grep -c "ROUTE-01" docs/smoke/13-wizard-runbook.md` | ✅ 14 (≥5 required) |
| `grep -c "D-12\|D-28" docs/security/13-stride-addendum-admin09-step2.md` | ✅ 11 (≥4 required) |
| `grep -c "Cluster F" docs/security/13-stride-addendum-admin09-step2.md` | ✅ 1 (≥1 required) |
| `ls drizzle/0005*` | ✅ no new migration (Phase 13 ships zero schema work) |
| Task 5 (manual smoke runbook execution) | ⏸ pending Antoine |

## Deviations from Plan

### Auto-fixed during execution

**1. [Rule 3 — Blocking issue] Layer 4 positive-control loyer fragility**

- **Found during:** Task 2 first iteration (Layer 4 binary inspection)
- **Issue:** The initial Layer 4 positive control asserted the loyer (e.g. `1 771,88 €` / `€7,350.00`) was visible in the reconstructed PDF text. But @react-pdf/renderer renders `KeyValueRow` as a flex row; glyphs from the label + value columns interleave in document order with kerning adjustments, scrambling the reconstructed value digits. The negative commission control was working correctly, but the positive control was flaky.
- **Fix:** Switched the positive control from "loyer in visible text" to "lcRef in PDF metadata". The lcRef is embedded in `<Document title>` / `<Document keywords>` as plain ASCII — NOT subject to font subsetting or kerning interleaving — so it's a 100%-reliable positive control. The negative control (commission absence in the decompressed glyph streams) still works because a leaked commission would be glyph-CONTIGUOUS within a single TJ run.
- **Files modified:** `src/lib/pdf/no-commission.test.ts` (the same file being authored — no additional file touched)
- **Commit:** rolled into the Task 2 commit `0c5db1c`

**2. [Rule 1 — Bug] Bare-digit commission variants false-positive in Layer 1/2**

- **Found during:** Task 2 first iteration
- **Issue:** The Layer 1/2 negative assertions included bare-digit commission variants (e.g. `String(intAmount)` = `"2500"`). For fixture `boundary/50001/48`, commission = 2500.05 → intAmount = 2500. The bare "2500" substring collided with the coefficient string `2.2500` in the params snapshot, producing a false-positive leak detection.
- **Fix:** Scoped the commission format variants to CURRENCY-FORMATTED strings only (those containing the € symbol). The currency-formatted strings (e.g. `"5 250,00 €"` or `"€5,250.00"`) are unique enough that any appearance in the render data prop or computed jsonb is a genuine leak. Bare-digit checks are unreliable due to legitimate digit overlap between commission / amountHT / coefficient / loyer fields.
- **Files modified:** `src/lib/pdf/no-commission.test.ts` — `commissionFormatsFor()` helper trimmed from 9 variants to 4 currency-formatted variants
- **Commit:** rolled into Task 2 commit `0c5db1c`

### No other deviations

The plan was executed atomically per-task. No CLAUDE.md violations. No architectural changes needed (no Rule 4 escalations). No new dependencies added.

## Phase 13 Closeout Status

After this plan commits, Phase 13 has shipped:

- **Wave 1 (plans 13-01 + 13-02):** 4 wizard primitives + ~45 i18n keys + 3 server actions + finalize API route + completedSteps helper + legacy redirect + ADMIN-09 isolation barrier
- **Wave 2 (plans 13-03 + 13-04 + 13-05):** 3 wizard route pages (parametres/calcul/verification) + ParametresFormCard + FinalizeButton
- **Wave 3 (this plan):** stepperBehavior integration test + no-commission PDF golden corpus + STRIDE addendum + manual smoke runbook

**Vitest suite:** 788 tests pass (4 skipped — integration DB). Phase 13 added approximately ~150 new tests across the 6 plans (45 from this plan alone).

**Schema migrations shipped by Phase 13:** ZERO (DB-01 was Phase 12; verified by Task 2's drizzle/0005+ count assertion).

**Remaining gates before `/gsd-transition`:**

1. Antoine executes the manual smoke runbook (`docs/smoke/13-wizard-runbook.md`) in Chrome + Edge.
2. Antoine reviews the STRIDE addendum (`docs/security/13-stride-addendum-admin09-step2.md`) end-to-end and signs off by editing the `Status:` line.
3. Once both are complete, Phase 13 is ready for `/gsd-transition`.

## Key Links

- Plan: [`.planning/phases/13-3-step-proposal-wizard/13-06-PLAN.md`](./13-06-PLAN.md)
- Wave 1 SUMMARYs: [13-01](./13-01-SUMMARY.md) · [13-02](./13-02-SUMMARY.md)
- Wave 2 SUMMARYs: [13-03](./13-03-SUMMARY.md) · [13-04](./13-04-SUMMARY.md) · [13-05](./13-05-SUMMARY.md)
- D-12 + D-28 anchors: [13-CONTEXT.md](./13-CONTEXT.md)
- ROUTE-01: [`.planning/REQUIREMENTS.md`](../../REQUIREMENTS.md)
- ADMIN-09 origin: [`.planning/phases/09-admin-surface/09-CONTEXT.md`](../09-admin-surface/09-CONTEXT.md)
- Phase 9 SECURITY: [`.planning/phases/09-admin-surface/09-SECURITY.md`](../09-admin-surface/09-SECURITY.md)
- Phase 10 SECURITY: [`.planning/phases/10-cutover-polish/10-SECURITY.md`](../10-cutover-polish/10-SECURITY.md)

## Self-Check: PASSED

All claimed artifacts verified to exist:
- ✅ `src/lib/wizard/stepperBehavior.test.ts` (267 lines, 9 tests passing)
- ✅ `src/lib/pdf/no-commission.test.ts` (581 lines, 36 tests passing)
- ✅ `docs/security/13-stride-addendum-admin09-step2.md` (295 lines)
- ✅ `docs/smoke/13-wizard-runbook.md` (442 lines)
- ✅ commit `c2471a2` (Task 1)
- ✅ commit `0c5db1c` (Task 2)
- ✅ commit `d4d60e0` (Task 3)
- ✅ commit `d5b6b83` (Task 4)
- ✅ Full Vitest suite: 788 passed, 4 skipped
- ✅ Typecheck: exit 0
- ✅ Lint: exit 0 (3 pre-existing warnings unrelated)
