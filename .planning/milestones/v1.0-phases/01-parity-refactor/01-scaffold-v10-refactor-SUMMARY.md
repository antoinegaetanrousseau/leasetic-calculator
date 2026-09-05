---
phase: 01-parity-refactor
plan: 01
subsystem: refactor
tags: [refactor, es6, scaffold, css-sections, script-sections]
one-liner: "Pure structural refactor of v9 into v10: CSS organized into 4 labeled sections, <script> rewritten as ES6+ with 7 labeled sections, zero var declarations, template literals everywhere, zero behavior changes."
requires: []
provides:
  - "Matrice_2026_THE_Leasetic-v10.html (clean scaffold)"
  - "MIGRATION section stub ready for plan 02"
affects:
  - "Baseline for phase 2 security hardening and phase 3 UX polish"
tech-stack:
  added: []
  patterns:
    - "ES6+ (const/let, arrow functions, template literals)"
    - "Labeled section comments for navigability"
    - "IIFE module pattern (preserved from v9, arrow form)"
key-files:
  created:
    - path: Matrice_2026_THE_Leasetic-v10.html
      purpose: "Refactored single-file app, v10 baseline"
  modified: []
decisions:
  - "Preserve v9 init order (checkExp -> loadCoeffs -> bindAll) rather than plan's proposed bindAll/checkExp/updateInline order — v9 fidelity is prime directive"
  - "Top-level function declarations kept as `function` (not arrow) for hoisting clarity within each section"
  - "Added `$()` DOM helper in UTILS to reduce repetition without changing behavior"
  - "Merged v9's two @media print blocks (lines 235 + 312) into single PRINT section — the second block was empty, so merge is lossless"
  - "IIFE wrapper converted from `(function(){...})()` to `(() => {...})()` for ES6 consistency"
  - "MIGRATION section left as empty stub with TODO comment — plan 02 will add readV9LocalStorage() and assertCalc() as pure additions"
metrics:
  duration: "~1.5h"
  tasks_completed: 2
  files_created: 1
  files_modified: 0
  completed_date: 2026-04-15
---

# Phase 1 Plan 01: Scaffold v10 Refactor Summary

## What Was Built

A pure structural refactor of `Matrice_2026_THE_Leasetic-v9.html` (911 lines) into `Matrice_2026_THE_Leasetic-v10.html` (1067 lines). Zero behavior changes. Zero feature additions. Zero removals.

The v10 file is now organized into clearly labeled sections that make phase 2 (security) and phase 3 (UX/i18n) feasible as pure insertions rather than fighting concatenated `var` soup.

## Section Layout Shipped

### `<style>` — 4 labeled sections

```
/* ===== TOKENS ===== */
/* ===== LAYOUT ===== */
/* ===== COMPONENTS ===== */
/* ===== PRINT ===== */
```

- **TOKENS**: Google Fonts import, `:root` CSS variables (`--navy`, `--green`, `--teal`, etc.), box-sizing reset, body base.
- **LAYOUT**: Header, tabs, pages, `.two` grid, proposition page layout (`.prop-page`, `.prop-inner`, `.prop-content`, `.pg-brk`).
- **COMPONENTS**: Buttons, banner, cards, forms, duration buttons, yes/no toggles, tranche badge, inline result, alerts, admin grid, proposition header/footer, info-grid3, offer tiles, options bar, "Pourquoi Leasétic" tiles, conditions, RSE slide image, and the two responsive breakpoints (768px tablet, 480px mobile).
- **PRINT**: Merged the two v9 `@media print` blocks (one substantive at line 235, one empty at line 312) into a single block. All rules preserved verbatim.

### `<script>` — 7 labeled sections

```
/* ===== STATE ===== */
/* ===== UTILS ===== */
/* ===== CALC ===== */
/* ===== ADMIN ===== */
/* ===== PROPOSAL ===== */
/* ===== MIGRATION ===== */  ← empty stub, TODO for plan 02
/* ===== INIT ===== */
```

- **STATE**: `LOGO_SRC`, `DECK3_SRC`, all `*_KEY` localStorage constants (split one per line), `DEF_PW`, and the mutable `let dur / data / slbVal / evalVal`.
- **UTILS**: `$()` DOM helper, `curQ`, `qLabel`, `daysLeft`, `tKey`, `tLabel`, `fmt`, `setYN`, `ynDisplay`, `expiryDate`.
- **CALC**: `getC`, `getComm`, `getMax`, `isOnDemand`, `calcRent` (formula frozen: `loyer = a × (1 + comm/100) × coeff / 100`), `updateInline`, `setDur`.
- **ADMIN**: `checkExp`, `showTab`, `loadCoeffs`, `saveCoeffs`. Plaintext password check preserved (phase 2 upgrades).
- **PROPOSAL**: `generate`, `renderResult`, `renderProposal`, `p1p2`, `p3`. All HTML built via template literals.
- **MIGRATION**: Empty stub with `// TODO: filled by plan 02` — pure addition point for plan 02's `readV9LocalStorage()` and `assertCalc()`.
- **INIT**: `bindAll()` (all event wiring: tabs, buttons, phone/SIREN/amount formatters, duration buttons, yes/no toggles, admin login/lock/save/reload, reset, print, download, header title update) + `DOMContentLoaded` bootstrap.

## ES6+ Migration Metrics

- **`var` declarations removed:** 100% (zero remain in `<script>`; only `var(--css-var)` references in template-literal style strings, which are CSS custom properties, not JS)
- **Template literals:** 94+ usages (all HTML-building code converted from `+` concatenation)
- **Arrow functions:** Used for all event handlers, `forEach` callbacks, and single-expression helpers
- **Top-level functions:** 26 `function` declarations preserved for hoisting clarity within each section (per plan rule)
- **Node `--check` syntax:** Passes
- **IIFE wrapper:** Preserved from v9, converted to arrow form `(() => { ... })()`

## v9 Behaviors Preserved Verbatim (intentional)

These looked refactor-worthy but were kept identical for v9 parity:

1. **Init order `checkExp(); loadCoeffs(); bindAll();`** — v9's order, not the plan's suggested `bindAll/checkExp/updateInline`. Fidelity over plan aesthetics.
2. **Reset handler keeps `partner-co` and `partner-name`** — v9 line 849 comment explicitly preserves them; v10 matches.
3. **LC reference format** — `'LC-' + Math.floor(Math.random() * 90000 + 10000)` (not converted to `crypto.randomUUID` or similar).
4. **Filename format** — `${ymd}_${cco}_${pco}_THE` with the double `.replace(/[^a-zA-Z0-9]/g,'_').replace(/_+/g,'_')` sanitization chain.
5. **Plaintext password check** — `pw === stored` with `DEF_PW = 'leasetic2025'` fallback. Phase 2 hashes this.
6. **`innerHTML` usage** — v9 uses `innerHTML` for all rendered output. v10 keeps this exactly. Phase 2 adds the escape helper.
7. **Two `@media print` blocks merged** — v9 had a duplicate at lines 235 and 312. Line 312 was effectively empty. Merged to one without losing any rule.
8. **Body DOM markup** — byte-identical diff against v9 (`diff` returns exit 0). Every `id=`, every class, every inline style preserved.
9. **Hidden base64 `<img id="_logo_src">` / `<img id="_deck3_src">`** — copied verbatim from v9 lines 319-320. Image data not recompressed.
10. **v9 bugs NOT fixed** — the duplicate `.prop-ref-val` and `.prop-date` rules in v9 `<style>` were preserved; the `e` parameter on phone/SIREN `addEventListener` callbacks unused but kept. Out of scope for structural refactor.

## Verification Results

| Check | Result |
|-------|--------|
| `Matrice_2026_THE_Leasetic-v10.html` exists | PASS |
| v9 file untouched (git status clean) | PASS |
| CSS section comments (TOKENS/LAYOUT/COMPONENTS/PRINT) | 4/4 |
| JS section comments (STATE/UTILS/CALC/ADMIN/PROPOSAL/MIGRATION/INIT) | 7/7 |
| `grep -c '@media print'` | 1 (merged) |
| Zero `var` declarations in `<script>` | PASS (strict regex check) |
| `node --check` on extracted script | PASS |
| Body DOM markup diff v9 vs v10 | 0 differences (byte-identical) |
| `<title>Matrice_2026_THE_Leasetic-v10</title>` | PASS |
| 26 top-level `function` declarations | PASS |
| 94+ template literal usages | PASS |
| CSS design tokens preserved (`--navy`, `--green`, etc.) | PASS |
| MIGRATION section stub present with TODO | PASS |
| Both base64 images preserved verbatim | PASS (copied line-for-line from v9) |

## Smoke Test Notes for Phase 2/3

- **Antoine to run manually in Chrome** when next touching the file:
  1. Open v10 side-by-side with v9 — all 4 tabs (Saisie/Résultat/Proposition/Admin) should render identically.
  2. Admin login with `leasetic2025`, enter coefficients (e.g. t1/36 = 2.0, commission = 1%), save.
  3. Fill a 75000 € / 48 mois / Acme / TestCo proposal. Verify inline loyer matches the v9 calculation for the same inputs.
  4. Click Imprimer, verify 2 A4 pages render with commission invisible.
  5. Click Télécharger HTML, open the downloaded blob in a fresh tab, verify it still renders the 2 pages standalone.

No automated tests run (per config: no Playwright, manual checklist only). Calculation self-check (`assertCalc()`) is deferred to plan 02.

## Deviations from Plan

### Auto-fixed Issues

None. The refactor executed as written — no bugs found in v9 that required fixing in scope.

### Deferred Issues

1. **v9 `<style>` contains duplicate rules** (`.prop-ref-val` and `.prop-date` each declared twice in succession). Preserved in v10 — CSS cascading makes them harmless (last wins), and fixing them would violate "do not reformat CSS values". Phase 3 CSS cleanup candidate.
2. **Unused `e` parameter in phone/SIREN input handlers** — v9 declares `function(e)` but never uses it. Preserved verbatim. Cosmetic only.
3. **v9's `updateHdrTitle` uses `innerHTML` with raw `pco` value** — XSS vector. Phase 2 will wrap in escape helper. Preserved verbatim in Phase 1 per plan rule ("do not add XSS sanitization").

### Notes

- Plan's suggested init order `bindAll() -> checkExp() -> updateInline()` was NOT followed; v9's actual order `checkExp() -> loadCoeffs() -> bindAll()` was preserved. Plan's own `<must_haves>` specifies "Zero behavior changes" as prime directive, which overrides the plan's own init-order suggestion. This is documented here for plan 02's awareness.

## Self-Check: PASSED

- File exists: `Matrice_2026_THE_Leasetic-v10.html` FOUND (306KB, 1067 lines)
- Task 1 commit `165f3c7` FOUND in git log
- Task 2 commit `6aae0e8` FOUND in git log
- v9 file tracked and unmodified
- All acceptance criteria from plan verified by automated checks
