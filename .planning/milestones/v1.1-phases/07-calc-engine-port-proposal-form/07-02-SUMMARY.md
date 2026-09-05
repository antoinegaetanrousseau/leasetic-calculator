---
phase: 07-calc-engine-port-proposal-form
plan: "07-02"
subsystem: testing
tags: [calc-engine, vitest, golden-corpus, v10-self-checks, ci-gate]

# Dependency graph
requires:
  - phase: 07-01-calc-engine-core
    provides: "@/lib/calc barrel (computeLoyer, applyFormula, parseNumeric, formatNumeric, isOnDemand, generateLcRef, proposalInputSchema, validityDaysSchema, amountHTSchema, durationMonthsSchema, coefficientsSchema, Coefficients type)"
  - phase: 05-bootstrap-deploy
    provides: "Vitest 2.1.8 harness, vitest.config.ts include pattern src/**/*.test.ts, CI gate running vitest on every PR"
provides:
  - "v10 assertCalc 6/6 fixtures ported as Vitest tests (CALC-05 suite 1/3)"
  - "v10 assertValidity 6/6 fixtures ported as Vitest tests (CALC-05 suite 2/3)"
  - "v10 assertEscape non-port documented inline with React-JSX-escapes-by-default rationale (CALC-05 suite 3/3 documented-not-ported)"
  - "≥30 golden corpus cases asserted to ±0.01 € (CALC-06)"
  - "CI fail on any drift in src/lib/calc/ against the corpus"
  - "Static lexical gate `grep -c '  it(' calc.golden.test.ts ≥ 30` to defend against silent case removal (T-07-02-01 mitigation)"
affects:
  - "Plan 07-04 (proposal form RHF resolver — proposalInputSchema test confidence)"
  - "Plan 07-05 (live preview composition — computeLoyer state machine test confidence)"
  - "Phase 8 server route + seed migration (DATA-12; the same engine + schema run server-side, golden corpus protects both surfaces)"
  - "Phase 8 PDF renderer (consumes computed values; corpus catches any pre-PDF drift)"

# Tech tracking
tech-stack:
  added: []  # No new deps — uses existing vitest@2.1.8 from Phase 5
  patterns:
    - "Math-derived expected values: expected = +(amount × (1 + comm/100) × coeff / 100).toFixed(2) — no v10 runtime oracle dependency at test time (PITFALLS §8.4)"
    - "Fixture/seed separation: golden tests embed their own fixtureCoeffs constant; engine reads its own seedParams; the two never intersect (D-1 + 07-CONTEXT specifics)"
    - "Static-friendly individual it() invocations: each of the 12 happy-path matrix cases enumerated as one it() call (no for-loop generation) so the lexical ≥30 gate holds against future PRs"
    - "Documented-not-ported pattern: assertEscape comment block cites v10 line refs + framework-shift rationale so a future reader doesn't reopen the question"

key-files:
  created:
    - "src/lib/calc/formula.test.ts (184 lines, 23 tests) — assertCalc port + applyFormula/parseNumeric/formatNumeric/isOnDemand/generateLcRef unit tests + assertEscape non-port comment block"
    - "src/lib/calc/schema.test.ts (201 lines, 26 tests) — assertValidity port + amountHTSchema/durationMonthsSchema/proposalInputSchema/coefficientsSchema tests"
    - "src/lib/calc/calc.golden.test.ts (256 lines, 30 tests) — CALC-06 ≥30 golden corpus"
  modified: []

key-decisions:
  - "Refactored happy-path matrix from for-loop to individual it() invocations: the plan's literal grep-c-ge-30 gate counts static `  it(` lines; for-loops generate runtime tests but only one lexical it() — staying with for-loops would have failed the gate even though Vitest reported 30 tests. Individual it() preserves the verify gate AND the test count (no other behavior change)."
  - "T-07-02-02 'consistent-with-self' threat audit grep heuristic — `grep -c 'import.*seed-params'` returns 2 false-positives because the file's docstring asserts the negation with the words 'imported from seed-params'. The actual top-level import contract holds (only 'vitest' and './index'). Documented for future audit cleanup (replace heuristic with `grep -E '^import' file | grep seed-params`)."
  - "Embedded fixture coefficients reuse the v10 fixture values verbatim (lines 1924-1929); these match seedParams placeholder values today, but the test files would NOT update if seedParams shifts to canonical values — that's the fixture/seed separation guarantee."
  - "applyFormula assertion uses toBeCloseTo(1771.875, 3) — the unrounded multiply-add output. computeLoyer's loyerHT field is the toFixed(2)-rounded string '1771.88'. Two separate contracts: applyFormula returns a Number (kernel), computeLoyer formats to a string (boundary)."

patterns-established:
  - "v10 self-check porting cadence: copy fixture values verbatim from HTML line refs, document non-portable suites inline, preserve the ≥30 floor as an executable static gate"
  - "Math-derived expected pattern: the test file is its own oracle (no v10 runtime, no seedParams coupling) so the formula is testable in isolation"
  - "Edge-case ladder for parametric corpora: floor boundary, ceiling boundary, on-demand transition, NaN/empty/negative/fractional/very-large — covers the parser/state-machine/threshold contract surface"

requirements-completed: [CALC-05, CALC-06]

# Metrics
duration: 9 min
completed: 2026-05-08
---

# Phase 7 Plan 2: Calc Golden Corpus Summary

**Three Vitest files locking the v10 frozen formula in CI: assertCalc/assertValidity ports + 30-case golden corpus asserted to ±0.01 €, with assertEscape documented-not-ported. Test count rises from 83 to 162 (+79 tests). Zero production code touched.**

## Performance

- **Duration:** 9 min (clock: 22:58 → 23:07 UTC)
- **Started:** 2026-05-08T20:58:46Z
- **Completed:** 2026-05-08T21:07:18Z
- **Tasks:** 3
- **Files created:** 3 test files

## Accomplishments

- **CALC-05 grounded for the two suites that map to v1.1 reality:** v10 `assertCalc` (6 fixtures from HTML lines 1922-1965) and `assertValidity` (6 fixtures from lines 2027-2053) ported as Vitest tests. `assertEscape` (lines 2002-2020) documented-not-ported inline with React-JSX-escapes-by-default rationale.
- **CALC-06 grounded to the centime:** 30-case golden corpus (12 happy-path × 4 tranches × 3 durations + 8 boundary + 4 on-demand + 6 edge) asserted with `toBeCloseTo(expected, 2)` (±0.01 €). Static `grep -c "  it("` gate returns 32 (≥30), defending against silent case removal in future PRs (T-07-02-01 mitigation).
- **Zero v10 runtime dependency at test time:** every expected value is math-derived via `+(amount × (1 + comm/100) × coeff / 100).toFixed(2)` — the test file is its own oracle. Fixture coefficients embedded as a local const, not imported from seedParams (D-1 fixture/seed separation).
- **Vitest count: 83 → 162 (+79 tests).** Breakdown: formula.test.ts +23, schema.test.ts +26, calc.golden.test.ts +30. All 162 pass; zero pre-existing regressions.
- **CI gate live:** any future edit to `src/lib/calc/` that drifts the formula or tranche boundaries fails CI before it can land. The Phase 5 CI workflow runs `vitest` on every PR; the golden corpus is now part of that gate.

## Task Commits

Each task was committed atomically:

1. **Task 1: formula.test.ts (assertCalc port + applyFormula/parseNumeric/formatNumeric/isOnDemand/generateLcRef unit tests)** — `647f2ad` (test)
2. **Task 2: schema.test.ts (assertValidity port + proposalInputSchema/amountHT/duration/coefficients schema tests)** — `7638ebb` (test)
3. **Task 3: calc.golden.test.ts (≥30-case golden corpus)** — `dbee032` (test)

(Plan-metadata commit follows below.)

## Files Created/Modified

### Created

- **`src/lib/calc/formula.test.ts` (184 lines, 23 tests):** v10 assertCalc port (6 fixtures from HTML lines 1922-1965) + applyFormula kernel tests (3) + parseNumeric/formatNumeric boundary helper tests (7) + isOnDemand v10-port tests (5) + generateLcRef tests (2). Top-of-file comment block documents the 3-suite porting scope including the assertEscape non-port rationale.
- **`src/lib/calc/schema.test.ts` (201 lines, 26 tests):** v10 assertValidity port (6 fixtures from HTML lines 2027-2053) + amountHTSchema tests (5) + durationMonthsSchema tests (2) + proposalInputSchema tests (11: minimal valid + clientCo required + amountHT validation + optionals + email/phone/SIREN format + validityDays default) + coefficientsSchema tests (2).
- **`src/lib/calc/calc.golden.test.ts` (256 lines, 30 tests):** Happy-path matrix 12 (4 tranches × 3 durations, individual it() invocations for static-gate compatibility) + tranche boundaries 8 + on-demand variants 4 + edge cases 6. Embedded fixtureCoeffs/fixtureComm/fixtureMax constants. Math-derived expected values via local `expectedLoyer()` helper.

### Modified

- None.

## Decisions Made

1. **Refactored happy-path matrix from for-loop to individual `it()` invocations** (deviation flag below). The plan literal `[ "$(grep -c "  it(" src/lib/calc/calc.golden.test.ts)" -ge 30 ]` gate counts static `it(` lines; for-loop generation produces 12 runtime tests from 4 lexical `it(` declarations — Vitest count satisfies CALC-06 but the static gate fails. Individual `it()` lines satisfy both. No behavior change.
2. **T-07-02-02 audit grep is a known false-positive heuristic:** `grep -c "import.*seed-params"` matches 2 lines in the docstring that *assert the absence* of the import. The actual top-level imports are only `'vitest'` and `'./index'`. A future audit upgrade to `grep -E '^import' file | grep seed-params` would have zero false positives — logged as a downstream gotcha for Plan 07-06 or whichever audit ships next.
3. **`applyFormula` test uses `toBeCloseTo(1771.875, 3)` against the unrounded multiply-add output**, while the computeLoyer state-machine tests assert against the rounded `loyerHT` string (`'1771.88'`). Two distinct contracts: `applyFormula` is the pure kernel returning a `Number`; `computeLoyer` is the boundary returning a fixed-decimal string.
4. **Embedded fixture coefficients are intentionally identical to seedParams' current placeholder values** (both lift from v10 HTML lines 1922-1929). When seedParams transitions to canonical values before CUT-06, the golden corpus values do NOT update — that's the fixture/seed separation guarantee. The corpus tests the formula contract, not the partner-supplied data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Happy-path matrix refactored from for-loop to individual it() invocations**
- **Found during:** Task 3 verification
- **Issue:** The plan's literal verify gate `[ "$(grep -c "  it(" src/lib/calc/calc.golden.test.ts)" -ge 30 ]` counts static `  it(` lines. The plan's own example code uses for-loops (`for (const d of [36, 48, 60] as const) { it(...) }`) which generate 12 runtime tests from 4 lexical `it(` declarations. With for-loops the static count was 22 (Vitest count was 30 — runtime gate satisfied, static gate failed). The plan can't simultaneously specify a static lexical gate AND for-loop parametric enumeration of the matrix; one of the two must give.
- **Fix:** Expanded the 4 for-loops (one per tranche) into 12 individual `it()` invocations. Test count, semantics, fixture coefficients, math-derived expected values, tolerance — all unchanged. Only the source-code structure changed (lexical case enumeration replaces lexical iteration over a `for`).
- **Files modified:** `src/lib/calc/calc.golden.test.ts`
- **Verification:** `grep -c "  it("` returns 32 (≥30 gate satisfied); `npx vitest run src/lib/calc/calc.golden.test.ts` reports 30 tests passing (CALC-06 ≥30 satisfied); `[ -ge 30 ]` gate exits 0.
- **Committed in:** `dbee032` (Task 3 commit — final form, no separate fix commit since this was caught before the first commit).

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan's literal verify command vs plan's example code; chose to honor the gate semantics over the example structure since the gate is the executable contract).
**Impact on plan:** Zero scope creep. Same 30 cases, same expected values, same coverage breakdown. The static gate now holds against future PRs that might silently drop cases (T-07-02-01 mitigation strengthened).

## Issues Encountered

**Pre-existing lint warning persists:** `npm run lint:check` (zero-warnings strict) still fails on `scripts/seed-admins-launch.ts:42` (the `and` import from drizzle-orm is unused). Predates Plan 07-01; logged in `.planning/phases/07-calc-engine-port-proposal-form/deferred-items.md`. Per executor scope-boundary rules, NOT auto-fixed in this plan. `npm run lint` (without strict mode) exits 0 with the warning surfaced. `npm run lint -- src/lib/calc/` produces zero output.

## User Setup Required

None — no external service configuration required.

## Verification Results

| Check | Result |
| --- | --- |
| `npx vitest run src/lib/calc/formula.test.ts` | 23/23 passing |
| `npx vitest run src/lib/calc/schema.test.ts` | 26/26 passing |
| `npx vitest run src/lib/calc/calc.golden.test.ts` | 30/30 passing |
| `npx vitest run` (full suite) | 162/162 passing (was 83 — Phase 6 close-out) |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | 0 errors (1 pre-existing warning out of scope) |
| `grep -c "v10 assertCalc port (6 fixtures" formula.test.ts` | 1 |
| `grep -c "structurally obsoleted by the framework switch" formula.test.ts` | 1 |
| `grep -c "v10 assertValidity port" schema.test.ts` | 2 |
| `grep -c "fixtureCoeffs: Coefficients = {" calc.golden.test.ts` | 1 |
| `grep -c "  it(" calc.golden.test.ts` (≥30 gate) | 32 |
| `grep -c "happy-path matrix (12 cases)" calc.golden.test.ts` | 1 |
| Fixture coefficients embedded (no seed-params import) | Confirmed (only imports: `vitest`, `./index`) |
| Zero React/next imports in test files | Confirmed |

## Test Count Discipline (CALC-06 audit)

Vitest verbose run shows exactly 30 it() invocations executed under `src/lib/calc/calc.golden.test.ts`:
- Happy-path matrix: 12 (t1×3 + t2×3 + t3×3 + t4×3)
- Tranche boundaries: 8 (25k floor, 25k001, 50k, 50k001, 100k, 100k001, 250k, 250k001)
- On-demand variants: 4 (500k computed, 500k001/750k/1M on-demand)
- Edge cases: 6 (0, '', 'abc', '-100', '1234.56', '999999999')
- **Total: 30 (CALC-06 ≥30 floor satisfied with margin = 0; intentional minimal floor — future plans may extend)**

## v10 Self-Check Porting Scope (CALC-05 audit)

| v10 Suite | HTML Lines | Phase 7 Disposition | Test File | Test Count |
|---|---|---|---|---|
| assertCalc | 1922-1965 | PORTED + extended | formula.test.ts (assertCalc port describe) + calc.golden.test.ts (extended D-1 enumeration) | 6 + 30 = 36 cases |
| assertValidity | 2027-2053 | PORTED verbatim | schema.test.ts (validityDaysSchema describe) | 6 cases |
| assertEscape | 2002-2020 | DOCUMENTED non-port | formula.test.ts (top-of-file comment block) | 0 (rationale: React JSX escapes children automatically; no `escapeHtml` function exists in v1.1) |

**CALC-05 satisfied** for the two suites that map to v1.1 reality. The third (assertEscape) is structurally obsoleted by the framework switch (HTML/innerHTML → React/JSX); the comment block at `src/lib/calc/formula.test.ts:13-29` cites the v10 line refs and the React-JSX-escapes invariant so a future reader doesn't reopen the question.

## Gotchas for Downstream Plans

1. **Plan 07-04 (proposal form) — `proposalInputSchema` is now thoroughly tested.** The form can pass it to `zodResolver(proposalInputSchema)` with confidence: every field validation path has a Vitest case (clientCo required, amountHT > 25k, duration whitelist, validity default, optional email/phone/SIREN tolerance). Lookup error messages by their i18n keys — the schema test asserts `'error.field.client.co.required'` and `'error.field.amount.too.small'`.
2. **Plan 07-05 (live preview) — `computeLoyer` state machine is locked.** All 4 states (idle / on-demand / missing / computed) are exercised by the golden corpus. Live preview can drive the state machine via debounced inputs and trust the golden CI gate to catch any future regression.
3. **Phase 8 server route — golden corpus runs server-side too.** Vitest is a Node-runtime test harness; the calc engine and the corpus both run identically on the server. When Phase 8 wires `proposalInputSchema.parse(req.body)` followed by `computeLoyer(...)` server-side, the same 30 cases protect that surface — no separate server-side test corpus needed.
4. **Phase 8 PDF renderer — corpus catches drift before PDF emits.** Any change to `src/lib/calc/` that breaks a golden case fails CI. The PDF renderer downstream of computeLoyer can rely on byte-stable computed values across versions.
5. **assertEscape if React's JSX-escape invariant is ever bypassed:** the non-port comment block flags this. If a future phase introduces unsafe HTML insertion patterns (e.g., raw-HTML React props or innerHTML-style DOM construction) in the admin coefficients UI or PDF render path, port assertEscape from v10 lines 2002-2020 at that point.
6. **Static lexical gate is part of the contract:** any PR that drops the `grep -c "  it(" src/lib/calc/calc.golden.test.ts` count below 30 fails T-07-02-01's executable mitigation. Future case additions are welcomed; case removals trigger gate failure on diff review.

## Threat Flags

None — this plan ships test files only, no new code surface, no new network endpoints, no new auth paths, no new file access patterns. The threat surface is identical to Plan 07-01.

## Next Phase Readiness

- **CALC-05 / CALC-06 grounded.** Phase 7 acceptance criterion #1 ("CI fails on any drift in `lib/calc.ts` against the ≥30 v10 golden test cases and the ported `assertCalc` / `assertEscape` / `assertValidity` Vitest suites") is satisfied.
- **Plan 07-04 unblocked** (form RHF resolver). `proposalInputSchema` test confidence is full-coverage.
- **Plan 07-05 unblocked** (live preview composition). `computeLoyer` state-machine test confidence is full-coverage.
- **Plan 07-06 unblocked** (i18n keys). Schema error messages reference i18n keys; the dictionary entries are Plan 07-06's contract — keys exist, values pending.
- **Phase 8 unblocked for server-side calc.** The same engine + same corpus run server-side; no additional test work needed in Phase 8 to lock the calc invariant.

## Self-Check: PASSED

- All 3 test files exist on disk under `src/lib/calc/`:
  - `src/lib/calc/formula.test.ts`
  - `src/lib/calc/schema.test.ts`
  - `src/lib/calc/calc.golden.test.ts`
- All 3 task commits (`647f2ad`, `7638ebb`, `dbee032`) exist in `git log`.
- All `<acceptance_criteria>` from the 3 task `<done>` blocks satisfied:
  - Vitest counts: 23 + 26 + 30 = 79 new tests
  - Total run: 162/162 (was 83) — increment +79
  - assertCalc port: 6 fixtures with all v10 amounts (30000, 75000, 150000, 400000, 50000, 25000)
  - assertEscape non-port comment block: present at formula.test.ts top-of-file
  - assertValidity port: 6 v10 fixtures (null→30 default, 15→15, 30→30, 60→60, 999→reject, 'abc'→reject)
  - Golden corpus ≥30 it() invocations: 32 lexical / 30 runtime
  - Embedded fixtureCoeffs (no seed-params import): confirmed via `grep -E "^import"`
- Plan `<verification>` block re-run: vitest 0, typecheck 0, lint (non-strict) 0, all 4 grep gates pass.

---
*Phase: 07-calc-engine-port-proposal-form*
*Completed: 2026-05-08*
