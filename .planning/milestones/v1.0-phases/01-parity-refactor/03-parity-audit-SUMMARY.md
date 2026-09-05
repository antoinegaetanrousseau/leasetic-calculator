---
phase: 01-parity-refactor
plan: 03
subsystem: verification
tags: [audit, parity, verification, evidence-log]
one-liner: "Static (source-level) audit of all 22 PARITY requirements against v10 vs v9 — zero regressions found, 22/22 pass at code level, browser smoke runbook handed to Antoine for runtime sign-off."
requires:
  - "Phase 1 plan 01 (scaffold v10 refactor) — needed v10 source to audit"
provides:
  - "PARITY-AUDIT.md (evidence log, 486 lines)"
  - "Browser Smoke Test Runbook for Antoine (~15 min Chrome checklist)"
  - "Spec-vs-v9 divergence flag for PARITY-21 (defer confirm dialog to UX-02)"
affects:
  - "Phase 1 closure depends on Antoine running the smoke runbook"
  - "Phase 3 plan UX-02 should explicitly cover reset confirm() dialog"
tech-stack:
  added: []
  patterns:
    - "Static source verification (grep + line diff vs v9 baseline)"
    - "Two-form evidence model (static + smoke) when no browser available"
key-files:
  created:
    - path: .planning/phases/01-parity-refactor/PARITY-AUDIT.md
      purpose: "Evidence log for all 22 PARITY requirements, with browser smoke runbook"
  modified: []
decisions:
  - "Audit performed code-only because executor environment has no browser — every PARITY REQ has both static evidence (verified now) and a 30-second smoke test for Antoine to run"
  - "PARITY-21 spec drift: plan 03's audit template asked for a confirm dialog on Réinitialiser, but v9 itself has none. Deferred to Phase 3 UX-02 — keeping v10 byte-equivalent to v9 in Phase 1 is the prime directive"
  - "Commission invisibility (PARITY-22) verified by greppingall 6 emit functions (updateInline, renderResult, p1p2, p3, btn-print, btn-dl) — zero references; the only commission surfaces are the admin form (hidden by print CSS) and JS getters (never DOM-written)"
  - "Plan 01's documented v9-preservations (duplicate CSS, unused `e` params, plaintext password, innerHTML usage) are NOT counted as regressions — they were present in v9 too"
metrics:
  duration: "~45min"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
  completed_date: 2026-04-15
---

# Phase 1 Plan 03: Parity Audit Summary

## What Was Done

A complete code-level audit of `Matrice_2026_THE_Leasetic-v10.html` against the v9 baseline for all 22 PARITY-XX requirements. The audit ran without a browser (executor environment limitation), so every requirement received two forms of evidence:

1. **Static evidence** — verified by reading v10 source and diffing against v9 (grep, line-by-line comparison, ID inventory, function-body match). Done now, in this plan.
2. **Smoke test** — a 30-second Chrome DevTools check that Antoine runs manually before signing off Phase 1. Compiled into a single Browser Smoke Test Runbook at the end of `PARITY-AUDIT.md`, grouped by tab (Saisie / Résultat / Proposition / Admin) so Antoine can execute them sequentially in ~15 minutes.

## Final Pass/Fail Count

| Metric | Value |
|--------|-------|
| Total PARITY REQs | 22 |
| Passed at static (code-level) review | **22 / 22** |
| Smoke tests required | 22 |
| Regressions found in v10 | **0** |
| Regressions fixed in-flight | 0 |
| Spec-vs-v9 divergences flagged | 1 (PARITY-21) |
| Open questions for Phase 3 | 3 |

## Regressions Found in Plan 01's Refactor

**None.** v10 is functionally byte-equivalent to v9 for every PARITY check. The structural refactor (CSS into 4 sections, JS into 7 sections, full ES6+) introduced zero behavioral changes, exactly as plan 01 promised.

The only "differences" are intentional ones documented in plan 01's SUMMARY:
- Two `@media print` blocks merged (one was empty in v9 — lossless)
- IIFE wrapper converted to arrow form
- Top-level `var` → `const`/`let`
- String concatenation → template literals
- Added `$()` DOM helper

None of these affect runtime behavior. v10 calculates the same loyer, generates the same LC reference, downloads the same blob, prints the same 2 pages.

## Spec-vs-v9 Divergence (PARITY-21)

**The audit template asked for a confirm dialog on Réinitialiser. v9 doesn't have one. v10 doesn't have one. REQUIREMENTS.md PARITY-21 is silent on the dialog.**

Conclusion: the audit template was over-specified. The confirm dialog is a Phase 3 polish item — UX-02 explicitly states "Destructive actions (reset, expired-coeff override) keep `confirm()`". Phase 1 must keep v10 byte-equivalent to v9.

**Action for Antoine:** When planning Phase 3, make sure plan UX-02 explicitly mentions adding `confirm()` to `btn-reset`. Don't lose this in the shuffle.

## Open Questions for Phase 3

1. **PARITY-21 confirm dialog** — see above. Plan UX-02 must add it.
2. **PARITY-02 cross-session persistence** — Neither v9 nor v10 actually persists `partner-co` / `partner-name` across page reloads. They're only protected from the in-session reset button. If a partner closes and reopens v10, they retype their name. v9 behavior, not a regression, but worth raising: should Phase 3 add an `lt_partner_co` localStorage key?
3. **PARITY-19 testing gap** — Orange warn banner can only be tested at runtime by waiting for the last 15 days of a quarter or mocking `Date.now()`. Recommend Phase 3 test checklist includes a DevTools snippet that monkey-patches `daysLeft()` for testing.

## Commission Invisibility Triple-Check (PARITY-22)

**The single most important non-negotiable rule of the project. Verified at the source level.**

Static grep for `commission` outside admin/migration sections found ZERO references inside:
- `updateInline()` — inline result builder
- `renderResult()` — Résultat tab card
- `p1p2()` — proposal page 1 builder
- `p3()` — proposal page 2 builder
- `btn-print` handler
- `btn-dl` handler

The commission `<input id="commission">` exists only inside `<div id="page-admin">`, which is hidden during print by `body>*:not(#page-proposition){display:none!important;}`. The `getComm()` JS getter is used in `calcRent()` to compute the post-commission monthly value, but the multiplier itself is never written to the DOM.

**Antoine still needs to run the three runtime sub-checks** (print preview find-in-page, downloaded HTML view-source, Proposition tab view-source) to confirm zero hits at runtime. The runbook in PARITY-AUDIT.md spells out each one.

**Static result:** Triple-clean.
**Runtime result:** Pending Antoine.

## What Antoine Still Needs to Manually Test

Open `Matrice_2026_THE_Leasetic-v10.html` in Chrome and run the **Browser Smoke Test Runbook** appended to `PARITY-AUDIT.md`. Estimated time: 15 minutes. Structure:

- **Saisie tab:** 11 checks (formatters, tranche badge, inline result, sur demande, reset)
- **Résultat tab:** 2 checks (loyer card, recap card — verify no commission visible)
- **Proposition tab:** 11 checks (LC ref, filename, page 1 blocks, page 2 RSE, print 2-pages, download blob, view-source — including PARITY-22 triple-check)
- **Admin tab:** 6 checks (default password, save flow, expired banner, lock button, coeff persistence)
- **Cross-version sanity:** 1 check (v9 vs v10 side-by-side, same inputs → same loyer)

Total: **31 manual smoke checks**, each ≤30 seconds. Once green, Phase 1 is officially closed and Phase 2 security hardening can begin.

## Audit Methodology Note

The executor environment for this plan has no browser. Every static evidence line in `PARITY-AUDIT.md` was verified by:

1. Reading v10 source line-by-line against v9
2. `grep` for ID presence in HTML body, function definitions in JS, and CSS rules
3. Matching v10 functions character-by-character against v9 functions (after ES6 normalization)
4. Confirming localStorage keys, default values, and HTML structure are identical

The smoke runbook is the bridge between static verification and runtime confidence. Without browser automation in this session, Antoine's 15-minute manual pass is the final acceptance gate.

## Self-Check: PASSED

- File exists: `.planning/phases/01-parity-refactor/PARITY-AUDIT.md` FOUND (486 lines, 22 PARITY REQs documented + runbook)
- Commit `bfa650e` FOUND in git log
- All 22 PARITY-XX requirements have a section with static evidence + smoke test + status
- Browser Smoke Test Runbook appended, grouped by tab
- Zero regressions found → no v10 patch commits needed
- Spec-vs-v9 divergence (PARITY-21) flagged with explicit Phase 3 action item
