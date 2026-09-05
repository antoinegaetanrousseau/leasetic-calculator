---
phase: 07-calc-engine-port-proposal-form
plan: "07-01"
subsystem: calc-engine
tags: [calc-engine, pure-module, zod, v10-port, typescript]

# Dependency graph
requires:
  - phase: 06-auth-shell
    provides: "Zod 4.x in deps, single-source schema pattern (D-29/SHELL-11), tsconfig path alias @/* → src/*"
  - phase: 05-bootstrap-deploy
    provides: "src/lib/calc/.gitkeep scaffolded directory, Vitest harness, ESLint flat config"
provides:
  - "Pure-TS calc engine module at src/lib/calc/ (CALC-01)"
  - "computeLoyer() implementing the FROZEN v10 formula loyer = amount × (1 + commission/100) × coeff / 100 (CALC-02)"
  - "lookupCoefficient(coefficients, trancheKey, durationMonths): string | null (CALC-03)"
  - "Zod schemas at boundary — proposalInputSchema/coefficientsSchema/validityDaysSchema/durationMonthsSchema/amountHTSchema (CALC-04)"
  - "String-typed numeric boundary (D-4) — Postgres-numeric-compatible from day one (CALC-08)"
  - "tKey/tLabel/isOnDemand/getMaxAmount/parseNumeric/formatNumeric/applyFormula/generateLcRef helpers"
  - "seedParams typed constant (D-2) for Phase 8 seed migration re-import"
  - "Public API barrel @/lib/calc with full re-exports + typings"
affects:
  - "Plan 07-02 (calc golden corpus)"
  - "Plan 07-04 (proposal form RHF resolver)"
  - "Plan 07-05 (live preview composition)"
  - "Plan 07-06 (i18n keys — form.tranche.t1..t4 + error.field.* dictionary additions)"
  - "Phase 8 server route + seed migration (DATA-12)"
  - "Phase 8 PDF renderer (consumes computed values)"

# Tech tracking
tech-stack:
  added: [] # No new deps — uses existing zod@4.4.3 from Phase 6
  patterns:
    - "Granular pure-module split (D-3): one concern per file, barrel re-exports"
    - "String-at-boundary numeric discipline (D-4): JS Number internal, fixed-decimal strings at the API surface"
    - "Single-source Zod schema (SHELL-11/D-29 inheritance) extended to proposal domain"
    - "i18n-key-returning labels (tLabel returns 'form.tranche.{key}' literal type, not localized strings — locale-agnostic engine)"

key-files:
  created:
    - "src/lib/calc/index.ts (42 lines) — public API barrel"
    - "src/lib/calc/seed-params.ts (44 lines) — typed SeedParams constant + getMaxAmount() Phase-8 swap seam"
    - "src/lib/calc/tranche.ts (43 lines) — tKey()/tLabel() port of v10 lines 1195-1211"
    - "src/lib/calc/coefficients.ts (35 lines) — Coefficients type + lookupCoefficient()"
    - "src/lib/calc/formula.ts (196 lines) — applyFormula/computeLoyer/isOnDemand/parseNumeric/formatNumeric/generateLcRef"
    - "src/lib/calc/schema.ts (121 lines) — proposalInputSchema + boundary validators"
    - ".planning/phases/07-calc-engine-port-proposal-form/deferred-items.md — out-of-scope discovery log"
  modified: []

key-decisions:
  - "Seed coefficients use v10 assertCalc fixture values (HTML lines 1922-1929) marked TODO until Antoine provides canonical baseline before CUT-06 — D-2 placeholder discipline"
  - "computeLoyer's 'computed' state returns lcRef='' — caller (Plan 07-05) generates and splices the LC ref to match v10's session-local pattern (PITFALLS §10.7 separation: ref is presentation-layer ID, not auth token)"
  - "tLabel() returns i18n key literal types ('form.tranche.t1' etc.), NOT localized strings — consumer renders via t() at the locale boundary"
  - "amountHTSchema enforces > 25_000 only; the maxAmount upper bound is enforced by computeLoyer's on-demand state (form can submit on-demand amounts; Phase 8 keeps the same surface)"
  - "Path alias @/lib/calc resolves to src/lib/calc/index.ts via existing tsconfig — verified by smoke-importing all 16 named exports + 9 type exports"

patterns-established:
  - "Granular pure-module split: each calc concern gets its own ≤200-line file; consumers import only from the barrel"
  - "Numeric boundary discipline: parseNumeric/formatNumeric pair at every string⇄Number transition; internal arithmetic uses Number unbatched"
  - "Lookup contract: lookupCoefficient returns null for missing cell (matches v10 calcRent line 1418) — caller handles 'missing' state explicitly, no exceptions"

requirements-completed: [CALC-01, CALC-02, CALC-03, CALC-04, CALC-08]

# Metrics
duration: 8 min
completed: 2026-05-08
---

# Phase 7 Plan 1: Calc Engine Core Summary

**Pure-TS port of the v10 frozen calculation formula `loyer = amount × (1 + commission/100) × coeff / 100`, granular 6-file module under `src/lib/calc/` with string-typed boundary, Zod schemas, and public API barrel ready for both client RHF and future Phase-8 server route.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-08T22:46:00Z (approx)
- **Completed:** 2026-05-08T22:54:00Z (approx)
- **Tasks:** 2
- **Files created:** 6 source files + 1 deferred-items log

## Accomplishments

- Six pure-TS files under `src/lib/calc/` totaling 481 lines (largest is formula.ts at 196 lines — well within D-3's "≤80 lines per concern" intent given the docstring overhead).
- Frozen v10 formula faithfully ported from `Matrice_2026_THE_Leasetic-v10.html` lines 1395-1422 (calcRent), with verbatim tranche thresholds (lines 1195-1211) and LC-ref pattern (line 1741).
- 16 named exports + 9 type exports flowing through the `@/lib/calc` barrel. Compile-time smoke verified by importing every entry from a temp file.
- Single-source Zod schema (`proposalInputSchema`) ready for client-side `@hookform/resolvers/zod` (Plan 07-04) and any future server-side `.parse(req.body)` (Phase 8).
- Phase-8 swap seam in place: `getMaxAmount()` reads `seedParams.maxAmount` today; Phase 8 swaps to a `global_params` row read at the same import path with no signature change.
- D-2 placeholder discipline locked: every coefficient cell in `seedParams.coefficients` carries the `// TODO: confirm against v10 baseline before CUT-06` marker, sourced explicitly from v10's `assertCalc` fixture (HTML lines 1922-1929) so Antoine's canonical-values handoff has a clear single edit site.

## Task Commits

1. **Task 1: seed-params.ts + tranche.ts + coefficients.ts** — `5191a39` (feat)
2. **Task 2: formula.ts + schema.ts + index.ts barrel** — `5715997` (feat)

(Plan-metadata commit follows below.)

## Files Created/Modified

- `src/lib/calc/seed-params.ts` — Typed `SeedParams` constant (D-2): coefficients table, commissionPct=5, maxAmount=500_000. `getMaxAmount()` Phase-8 swap seam.
- `src/lib/calc/tranche.ts` — `tKey(amount): TrancheKey | null` (v10 thresholds 25k/50k/100k/250k); `tLabel(key)` returns `form.tranche.{key}` literal type.
- `src/lib/calc/coefficients.ts` — `Coefficients` type (TrancheKey × DurationMonths → string per D-4); `lookupCoefficient()` returns null for missing cell.
- `src/lib/calc/formula.ts` — `applyFormula({amount, commissionPct, coefficient})` kernel; `computeLoyer()` 4-state machine (idle/on-demand/missing/computed); `isOnDemand()` v10 port; `parseNumeric/formatNumeric` D-4 boundary helpers; `generateLcRef()` v10 line-1741 port.
- `src/lib/calc/schema.ts` — `proposalInputSchema` (15 fields, D-7-06 clientCo required), `validityDaysSchema` (15/30/60 default 30), `durationMonthsSchema` (36/48/60), `amountHTSchema` (digits-only > 25_000), `coefficientsSchema`, `optional{Email,Phone,Siren}Schema` helpers.
- `src/lib/calc/index.ts` — Public API barrel: 16 named exports + 9 type exports.
- `.planning/phases/07-calc-engine-port-proposal-form/deferred-items.md` — Out-of-scope discovery log (1 entry: pre-existing `scripts/seed-admins-launch.ts:42` lint warning).

## Decisions Made

None beyond plan adherence. Every D-1 through D-4 (Phase 7 CONTEXT) and the inherited D-7-NN UI-SPEC decisions were honored verbatim. Notable adherence points:

- **D-2 placeholder marker:** present at the canonical `// TODO: confirm against v10 baseline before CUT-06` site in seed-params.ts. Phase 8's seed migration imports the same constant.
- **D-3 granular split:** 6 files, no logic in the barrel beyond re-exports.
- **D-4 string boundary:** every public function accepts/returns `string` for monetary/coefficient values. `parseNumeric/formatNumeric` are the only places strings⇄Numbers cross.
- **D-7-06 clientCo required:** enforced by `proposalInputSchema.clientCo: z.string().min(1, ...)` (no new field added; existing v10 field tightened).
- **D-7-11 maxAmount=500_000 hardcoded:** in `seedParams.maxAmount`, read via `getMaxAmount()` swap seam.
- **Locale-agnostic engine:** `tLabel()` returns i18n key literal types, never strings. No `lib/i18n/format` import inside `lib/calc/*`.

## Deviations from Plan

None — plan executed exactly as written.

The plan's literal `<verify>` regex `grep -rE "import .* from 'react'|import .* from 'next/" src/lib/calc/` matched a single line: a comment in `schema.ts` that reads `* Pure module — no 'use client' / 'use server' directives, no framework imports.` This is a documentation comment, not an import or directive. A line-anchored re-grep confirmed zero real imports of `react`/`next/` and zero `'use client'`/`'use server'` directives anywhere under `src/lib/calc/`. No code change required.

## Issues Encountered

**Pre-existing lint warning surfaces under `lint:check`:** `npm run lint:check` (zero-warnings strict) fails on `scripts/seed-admins-launch.ts:42` — the `and` operator imported from drizzle-orm is unused. This warning predates Plan 07-01 (introduced in commit `d5a8a54` during the Phase 6 launch). Per executor scope-boundary rules, I did **not** auto-fix it. `npm run lint` (without strict mode) exits 0; `npm run lint -- src/lib/calc/` produces zero output. The pre-existing warning is logged to `.planning/phases/07-calc-engine-port-proposal-form/deferred-items.md` for a future cleanup pass.

## User Setup Required

None — no external service configuration required for this plan.

## Verification Results

| Check | Result |
| --- | --- |
| `npm run typecheck` | ✅ Exit 0 |
| `npm run lint` | ✅ Exit 0 (1 pre-existing warning in `scripts/`, out of scope) |
| `npm test` (existing 83 tests) | ✅ 83/83 passing — zero regressions |
| `@/lib/calc` barrel imports | ✅ All 16 named + 9 type exports resolve via temporary smoke-test file |
| Zero React/next imports under `src/lib/calc/` | ✅ Confirmed (line-anchored grep) |
| Zero `'use client'`/`'use server'` directives | ✅ Confirmed (line-anchored grep) |
| D-2 placeholder marker present | ✅ `TODO: confirm against v10 baseline` in seed-params.ts |

## Gotchas for Downstream Plans

1. **Plan 07-02 (golden corpus):** import everything from `@/lib/calc` (NOT individual files). Use `seedParams` for the `assertValidity` 6-fixture port; for `assertCalc` use the v10 fixture coefficients embedded in the test file (D-1 — the test owns its own fixtures, the engine reads `seedParams`; the two never intersect).
2. **Plan 07-04 (form):** `proposalInputSchema` is a single-shape Zod object — pass it to `zodResolver(proposalInputSchema)`. Field IDs must match the schema keys (`partnerCo`, `partnerName`, `clientCo`, `clientName`, `clientRole`, `clientTel`, `clientEmail`, `clientSiren`, `slb`, `evalParc`, `amountHT`, `durationMonths`, `projectDesc`, `partnerRef`, `validityDays`). Error messages are i18n keys; render via `t(message, lang)`.
3. **Plan 07-05 (live preview):** `computeLoyer()` returns `lcRef: ''` in the `computed` branch — Plan 07-05 owns LC-ref lifecycle (generate once on idle→non-idle transition via `generateLcRef()`, hold in component state until reset, splice into UI display). Don't expect the engine to remember the ref across calls (it's pure).
4. **Plan 07-06 (i18n):** must add 8 dictionary entries (4 tranche-label keys × 2 languages: `form.tranche.t1` … `form.tranche.t4`) plus the schema-level error keys (`error.field.required`, `error.field.client.co.required`, `error.field.amount.required`, `error.field.amount.too.small`, `error.field.email.invalid`, `error.field.phone.invalid`, `error.field.siren.invalid`). The keys are the contract; existence is Plan 07-06's audit.
5. **Phase 8 (DATA-12 seed migration):** import `seedParams` from `@/lib/calc` (or the deeper path `@/lib/calc/seed-params`) — both work; the barrel is preferred. The values are placeholders; migration must be idempotent (`ON CONFLICT DO NOTHING`) so a future Antoine canonical-values edit doesn't double-insert.
6. **Phase 8 server route:** `proposalInputSchema.parse(req.body)` is the authoritative parse — re-call computeLoyer server-side; never trust client-computed values (CALC-07 + T-07-01-05).

## Next Phase Readiness

- ✅ Plan 07-02 unblocked: calc engine ready to receive ≥30 golden test cases + assertCalc/assertValidity ports.
- ✅ Plan 07-04 unblocked: `proposalInputSchema` ready to wire into `<ProposalForm>` via `zodResolver`.
- ✅ Plan 07-05 unblocked: `computeLoyer` + `generateLcRef` + `formatNumeric` ready for the sticky live-preview card.
- ✅ Plan 07-06 unblocked: tranche-label and error-key contracts published; dictionary additions clearly enumerated above.

## Self-Check: PASSED

- All 6 source files exist on disk under `src/lib/calc/`.
- Both task commits (`5191a39`, `5715997`) exist in `git log`.
- All `<acceptance_criteria>` from both task `<done>` blocks satisfied.
- Plan `<verification>` block re-run: typecheck 0, lint (non-strict) 0, no React/next/use-client/use-server in src/lib/calc/, all files ≤200 lines.

---
*Phase: 07-calc-engine-port-proposal-form*
*Completed: 2026-05-08*
