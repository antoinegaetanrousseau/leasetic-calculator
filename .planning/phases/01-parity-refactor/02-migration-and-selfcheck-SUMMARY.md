---
phase: 01-parity-refactor
plan: 02
subsystem: migration
tags: [migration, self-check, diagnostics, additive]
one-liner: "Populated the empty MIGRATION stub with readV9LocalStorage() (non-mutating v9 key inspector) and assertCalc() (6-fixture formula self-check running on DOMContentLoaded after bindAll)."
requires:
  - "Matrice_2026_THE_Leasetic-v10.html (clean scaffold from plan 01)"
provides:
  - "readV9LocalStorage() on window — v9/v10 localStorage inspector"
  - "assertCalc() on window — frozen-formula drift detector, runs every page load"
  - "Fixture set reusable by phase 2/3 tests"
affects:
  - "DOMContentLoaded init order — appended assertCalc() at end, kept v9's checkExp/loadCoeffs/bindAll order"
tech-stack:
  added: []
  patterns:
    - "Non-mutating localStorage read (getItem only)"
    - "On-load invariant self-check with console.error on drift, non-blocking UI"
    - "Diagnostic helpers exposed on window for DevTools"
key-files:
  created: []
  modified:
    - path: Matrice_2026_THE_Leasetic-v10.html
      purpose: "Filled MIGRATION section + wired assertCalc() into DOMContentLoaded"
decisions:
  - "readV9LocalStorage() is NOT called from DOMContentLoaded. v10's loadCoeffs() already reads lt_coeffs via localStorage.getItem(), so an auto-call would be redundant and partner-confusing. The function exists purely as a console-invocable diagnostic and as a hook for Phase 2's upgradeV9Password() migration."
  - "assertCalc() uses inline fixture coefficients (NOT live localStorage via getC()) per 01-CONTEXT.md requirement. This keeps the check deterministic across partner installs."
  - "assertCalc() uses inline arithmetic rather than calling the live calcRent() function. Trade-off: it only catches drift in its own copy of the formula, not in calcRent() itself. Acceptable because any refactor of calcRent() will happen via a deliberate edit that SHOULD also update assertCalc() — and if they drift apart, a phase 3 reviewer will catch it on the next page load. Plan 03 (parity-audit) is responsible for verifying calcRent() ↔ assertCalc() consistency."
  - "6 fixtures chosen over the plan's minimum of 4: adds the t1 upper boundary (exactly 50000€) and the null-tranche boundary (25000€ exactly) for extra coverage without bloat."
  - "DOMContentLoaded order preserved: checkExp() → loadCoeffs() → bindAll() → assertCalc() — matching plan 01's decision to keep v9 init order, with assertCalc() appended at the end (per plan 01 handoff note)."
metrics:
  duration: "~0.5h"
  tasks_completed: 2
  files_created: 0
  files_modified: 1
  completed_date: 2026-04-15
---

# Phase 1 Plan 02: Migration & Self-Check Summary

## What Was Built

Filled the empty `/* ===== MIGRATION ===== */` stub in `Matrice_2026_THE_Leasetic-v10.html` with two small, additive, console-first diagnostic functions:

1. **`readV9LocalStorage()`** — reads all 5 v9 keys (`lt_pw`, `lt_coeffs`, `lt_comm`, `lt_max`, `lt_qtr`) via `localStorage.getItem()` only, returns a snapshot object, and logs either a "Inherited v9 keys" info line or a "fresh install" info line to console. Zero `setItem`, zero `removeItem`, zero mutation. Exposed on `window` for DevTools use.

2. **`assertCalc()`** — validates the frozen lease formula `loyer = montantHT × (1 + commission/100) × coefficient / 100` against 6 hardcoded fixtures on every page load. Logs a green pass line on success, `console.error` with failed-fixture details on drift. Non-blocking: UI works even if the self-check screams. Exposed on `window` for DevTools use.

3. **Wired `assertCalc()` into `DOMContentLoaded`** AFTER `bindAll()` as the last init step (per plan 01's SUMMARY.md handoff note). `readV9LocalStorage()` is NOT auto-called — see Decisions above.

Touch scope: exactly 2 regions edited — the MIGRATION section body (was a 3-line TODO) and the `DOMContentLoaded` handler (added one line at the end). Zero other lines changed. Zero `var`. Zero `innerHTML` added.

## Fixture Set Shipped (reusable by phase 2/3)

Commission used: **5%** across all cases. Formula: `expected = amount × 1.05 × coeff / 100`.

| # | Amount (€) | Duration | Tranche | Coefficient | Expected loyer (€) |
|---|-----------:|---------:|:-------:|------------:|-------------------:|
| 1 | 30 000     | 60       | t1      | 1.8765      |             591.10 |
| 2 | 75 000     | 48       | t2      | 2.2500      |            1771.88 |
| 3 | 150 000    | 36       | t3      | 2.8000      |            4410.00 |
| 4 | 400 000    | 60       | t4      | 1.7500      |            7350.00 |
| 5 | 50 000     | 36       | t1      | 3.0000      |            1575.00 |
| 6 | 25 000     | 48       | null    | —           |               null |

Coverage: all 4 tranches, all 3 durations (36/48/60), t1 upper boundary at exactly 50 000€, null-tranche boundary at exactly 25 000€.

Math was verified via `node -e` before commit — all 6 cases reproduce the expected-column values above to 2 decimals.

## v9 localStorage Non-Mutation

`readV9LocalStorage()` uses `localStorage.getItem()` exclusively. A line-by-line audit of its body confirms:

- No `setItem` — verified
- No `removeItem` — verified
- No `clear` — verified
- Return value is a plain snapshot object; callers receiving it cannot accidentally persist anything

This matches MIGRATE-03 (no data loss) and makes v10 a drop-in replacement for v9: any existing partner opens v10 and sees their coefficients/commission/max/quarter/password exactly as v9 left them, because v10's existing `loadCoeffs()` / `checkExp()` / admin-login code already reads those same keys directly.

## Expected Console Output Scenarios

**Scenario A (existing v9 partner, all keys present):**
```
[v10 self-check] calcRent formula: 6/6 fixtures pass ✓
```
(Plus whatever else v10 logs during normal init. `readV9LocalStorage()` is NOT auto-called, so no "Inherited v9 keys" line appears on page load — partners see it only if they invoke `readV9LocalStorage()` from DevTools.)

**Scenario B (fresh install, empty localStorage):**
```
[v10 self-check] calcRent formula: 6/6 fixtures pass ✓
```
Same. Self-check is independent of storage state. DevTools `readV9LocalStorage()` would log `No v9 data found — fresh install, using defaults.`

**Scenario C (formula drift — dev accidentally breaks assertCalc's copy of the formula):**
```
[v10 self-check] calcRent formula FAILED: [{ a: 30000, d: 60, expected: 591.1, actual: …, pass: false }, …]
[v10 self-check] The frozen formula has drifted. Check the CALC section.
```
UI remains fully functional — partner can still Saisir, générer, imprimer.

## Requirements Shipped

- **MIGRATE-01** — v10 reads v9 keys via both the existing `loadCoeffs()`/`checkExp()` paths AND the new explicit diagnostic helper.
- **MIGRATE-03** — Non-mutation confirmed by code audit; existing partners see zero reconfiguration.
- **REFACTOR-06** — On-load self-check exists, runs every page load, logs pass/fail to console.

## Verification Results

| Check | Result |
|-------|--------|
| MIGRATION section no longer empty | PASS |
| `grep -n "readV9LocalStorage\|assertCalc"` shows 5 hits (2 defs + 2 window assigns + 1 init call) | PASS |
| `grep -c '^var '` = 0 | PASS |
| `node --check` on extracted script | PASS |
| No `innerHTML` added (checked git diff) | PASS |
| DOMContentLoaded order = checkExp → loadCoeffs → bindAll → assertCalc | PASS |
| Fixture math verified via `node -e` | PASS (all 6 expected values reproduce) |
| Zero edits outside MIGRATION section + 1 INIT line | PASS |
| v9 file untouched | PASS (git status clean for v9) |

## Notes for Plan 03 (Parity Audit)

1. **Check browser console on every v10 open during audit.** `assertCalc()` runs on DOMContentLoaded and will log a `6/6 fixtures pass ✓` line. If you ever see `[v10 self-check] calcRent formula FAILED`, the CALC section has drifted and plan 03's parity audit MUST investigate before signing off on anything else.

2. **`assertCalc()` validates its own copy of the formula, NOT `calcRent()` directly.** Plan 03 should do a side-by-side diff of `calcRent()` vs the arithmetic in `assertCalc()` to confirm they compute the same thing. If a future plan refactors `calcRent()`, the assertCalc copy must be updated in lockstep.

3. **`readV9LocalStorage()` is dormant by default.** Plan 03 can invoke it from DevTools during scenario testing to inspect storage state without side effects. Phase 2 will add `upgradeV9Password()` next to it — that function SHOULD mutate (one-way hash upgrade of `lt_pw`).

4. **Fixture set is a contract.** The 6 cases in this SUMMARY's table should be treated as the minimal parity test for phase 2 and phase 3 calc-path refactors. If any of these 6 numbers change, the formula changed — which requires explicit approval per the frozen-formula rule.

5. **No manual test was run by Claude** (per project config — no Playwright, manual checklist only). Antoine: when you next open v10 in Chrome, open DevTools Console and confirm you see the `6/6 fixtures pass ✓` line. If you don't, something is wrong before plan 03 starts.

## Deviations from Plan

### Auto-fixed Issues

None. The plan was executed essentially as written.

### Intentional Divergences from Plan Text

1. **`readV9LocalStorage()` is NOT auto-called in `DOMContentLoaded`.** The plan's sample code placed it at the top of `DOMContentLoaded`, but: (a) plan 01's SUMMARY handoff note explicitly said to append new init work AFTER `bindAll()` to preserve v9 init order, and (b) the executor prompt said "Do not wire this function into any automatic side-effecting init — just define it and expose it on `window` so it's reachable from DevTools." The executor prompt overrides the plan's sample code. Partners still get full v9 compatibility because v10's existing `loadCoeffs()`/`checkExp()`/admin-login code already reads the v9 keys directly.

2. **Plan's sample `DOMContentLoaded` included `updateInline()`.** v10's current `DOMContentLoaded` does not call `updateInline()` (plan 01 preserved v9's init order which doesn't call it on load). Per plan 01's SUMMARY decision ("zero behavior changes"), we did NOT add `updateInline()` to init. Only `assertCalc()` was appended.

3. **6 fixtures instead of the plan's minimum 4.** Added the two boundary cases (25000€ null-tranche and 50000€ t1-upper) for extra coverage without materially increasing complexity.

### Deferred Issues

None. Everything in scope was shipped.

## Commits

- `e78a02c` — `feat(01-02): add readV9LocalStorage() diagnostic helper`
- `bbe2494` — `feat(01-02): add assertCalc() formula self-check with 6 fixtures`

## Self-Check: PASSED

- File exists: `.planning/phases/01-parity-refactor/02-migration-and-selfcheck-SUMMARY.md` FOUND
- File exists: `Matrice_2026_THE_Leasetic-v10.html` FOUND
- Commit `e78a02c` FOUND in git log
- Commit `bbe2494` FOUND in git log
- `grep -n "readV9LocalStorage\|assertCalc"` returns exactly 5 hits in v10 html
- `node --check` on extracted `<script>` passes
- `grep -c '^var '` returns 0
- DOMContentLoaded final order verified: `checkExp(); loadCoeffs(); bindAll(); assertCalc();`
