---
phase: 03-ux-polish-i18n
plan: 03
subsystem: features-and-final-test
tags: [ux-09, ux-10, feat-04, feat-05, feat-06, coefficient-display, copy-ref, validity-override, apercu-label, final-test, ship-gate]
one-liner: "Ships the last Phase 3 features (coefficient row + copy LC button + admin validity override + Aperçu labeling) on top of Plan 03-02's i18n layer, adds 5 new dictionary keys (fr+en), rewrites expiryDate() to use day-arithmetic + locale-aware formatting, adds assertValidity() self-check, and delivers FINAL-TEST.md — the 8-section master manual runbook that is the final ship gate for v10."
requires:
  - "Matrice_2026_THE_Leasetic-v10.html (post Plan 03-02 — I18N dict, t(), applyI18n, lastGen, rerenderProposalIfActive all in place)"
  - "Plan 03-02 locked lastGen payload contract (legal to add fields before lastGen = data assignment)"
provides:
  - "result.coefficient.label / result.inline.apercu / button.copy.ref / toast.copied / admin.section.validity — 5 new keys × 2 languages = 10 strings added to I18N dictionary"
  - "UX-09 coefficient display in renderResult (res-main): `Coefficient appliqué : X.XXXX %` with 4-decimal precision, hidden when d.onDemand === true"
  - "UX-10 copy-ref button via event-delegated click handler, navigator.clipboard + textarea fallback, lives in both res-main and Proposition toolbar"
  - "FEAT-04 admin #validity-days dropdown (15/30/60) + VAL_KEY='lt_validity' constant + getValidity() helper with strict whitelist validation and default-30 fallback"
  - "FEAT-05 expiryDate() rewrite: parses FR long-date, adds getValidity() days, reformats in currentLang locale (fr-FR or en-US). Backward compatible with existing `expiryDate(d.ds)` call site from p1p2."
  - "FEAT-06 Aperçu label above #inline-res + dashed border / muted background CSS for visual distinction from the Résultat tab's final tile"
  - "assertValidity() on-load self-check — 6 fixtures (null/15/30/60/999/non-numeric) with snapshot+restore of lt_validity"
  - "FINAL-TEST.md (167 lines, 8 sections, 29 Section-C rows) — master manual runbook combining PARITY + SEC + UX/FEAT + FR/EN smoke + migration + browser matrix + sign-off"
affects:
  - "renderResult() res-main now renders 2 extra blocks: coefficient line + LC-ref with copy button"
  - "page-proposition toolbar gains a #btn-copy-ref button between Modifier and Imprimer"
  - "UTILS section gains one top-level click-delegation listener for .btn-copy-ref (no re-bind on each render)"
  - "CALC section gains getValidity() helper; CSS section gains .apercu-label + #inline-res dashed-border + .btn-copy-ref + .coef-line rules"
  - "DOMContentLoaded now calls assertValidity() after assertEscape()"
tech-stack:
  added:
    - "No new dependencies. navigator.clipboard API (native, widely supported) with document.execCommand('copy') textarea fallback."
    - "lt_validity localStorage key (new — joins lt_pw, lt_coeffs, lt_comm, lt_qtr, lt_max, lt_lang)"
  patterns:
    - "Event delegation on document for .btn-copy-ref — one listener survives every renderResult() innerHTML reassignment and every lang toggle without rebind"
    - "Whitelist validation on read (getValidity checks value ∈ {15,30,60}) AND on write (saveCoeffs only stores if ∈ {15,30,60}) — defense in depth"
    - "expiryDate() takes the existing FR long-date string input, keeping Plan 02's `proposal.conditions` call site (`expiryDate(d.ds)` → `{0}` param) stable — zero churn on Plan 02's render contract"
    - "assertValidity() uses snapshot+restore pattern to test localStorage mutation without corrupting user state — consistent with Phase 1's assertCalc and Phase 2's assertEscape pure/stateless approach but adapted for storage-dependent helper"
    - "Coefficient line template uses `t('result.coefficient.label')` + pure number → no user data → no escapeHtml wrapping needed (SEC-03 invariant preserved: user data sites still escape)"
key-files:
  created:
    - path: .planning/phases/03-ux-polish-i18n/FINAL-TEST.md
      purpose: "Master manual ship-gate checklist — 8 sections A-H, 29 REQ rows in Section C, links to PARITY-AUDIT + SEC-TEST for regression re-runs"
    - path: .planning/phases/03-ux-polish-i18n/03-03-features-and-final-test-SUMMARY.md
      purpose: "This plan's execution record — closes Phase 3 and the entire v10 project"
  modified:
    - path: Matrice_2026_THE_Leasetic-v10.html
      purpose: "Added 5 new i18n keys (fr+en), renderResult coefficient line + copy-ref button block, Proposition toolbar copy-ref button, event-delegated click handler in UTILS, admin #validity-days dropdown + label, VAL_KEY const + getValidity() helper, expiryDate() rewrite, loadCoeffs/saveCoeffs validity wiring, assertValidity() self-check, DOMContentLoaded wiring, CSS for .apercu-label + #inline-res + .btn-copy-ref + .coef-line"
decisions:
  - "Used `result.coefficient.label` (not `result.coeff.label`) as the new i18n key — matches the plan's critical-rules spec and avoids collision with the existing `result.coeff.suffix` key already used in renderResult for the '%/mois' suffix"
  - "Coefficient display rendered in res-main (not res-detail) so it appears adjacent to the loyer tile where partners look first for numeric verification; res-detail stays focused on partner/client recap"
  - "Copy-ref button in Résultat tab placed in res-main too (below the coef line), attached via event delegation — one listener handles both res-main and Proposition toolbar with zero rebind logic"
  - "Proposition toolbar copy-ref button is STATIC HTML (data-i18n='button.copy.ref', no data-ref attr) — the delegate reads from lastGen.ref at click time. Simpler than threading data-ref through the static markup and auto-localizes via applyI18n."
  - "getValidity() whitelist is [15, 30, 60] (matches dropdown options). Any stored value outside that set — including legacy, corrupted, or manually tampered — falls back to 30. Defaults to 30 when lt_validity is missing, which matches v10's original ~1-month expiry behavior within ~1 day (backward compat)."
  - "expiryDate() kept its existing signature `(dateStr)` — the caller in p1p2 still passes `d.ds` (the FR long-date string). This avoids touching Plan 02's `proposal.conditions` template literal and keeps the render contract stable. Internal parsing handles the FR month names; on currentLang === 'en' the output reformats via `toLocaleDateString('en-US', ...)`."
  - "lt_validity is the ONLY new localStorage key — all other v10 keys remain frozen per CRITICAL RULES. saveCoeffs stores it as a string (parseInt-ready), keeping consistency with lt_max/lt_comm's string-typed values."
  - "CSS .btn-copy-ref uses compact sizing (.25rem .5rem padding, .68rem font) to avoid disrupting the toolbar layout — sits cleanly between Modifier (btn-out) and Imprimer (btn-green) without widening the row"
  - "#inline-res visual distinction uses 1px dashed border + 2%-black background — subtle enough to stay harmonized with the Saisie card surface but clearly NOT the same weight as the Résultat tab's solid-green-border final tile. Avoids looking like a duplicate result card."
  - "assertValidity() is additive (does not replace or extend assertCalc/assertEscape) — called as a third self-check on DOMContentLoaded. Uses snapshot+restore because getValidity reads real localStorage, unlike assertCalc which uses a fixture sandbox."
  - "FINAL-TEST.md kept as 8 sections A-H per plan spec; Section C has 29 REQ rows covering all Phase 3 UX-01..10 + FEAT-01..06 including sub-rows for edge cases (UX-09b onDemand hide, UX-10b toolbar button, UX-10c fallback path, FEAT-05b lang re-format, FEAT-05c different-day validity) — easier for Antoine than a flat 16-row table"
metrics:
  tasks-completed: 2
  commits: 3
  files-modified: 1
  files-created: 2
  lines-added-html: 127
  lines-added-final-test: 167
  new-i18n-keys: 5
  new-i18n-strings: 10
  new-localstorage-keys: 1
  new-self-checks: 1
  final-test-sections: 8
  final-test-section-c-rows: 29
  duration-minutes: "~30"
  completed: 2026-04-15
---

# Phase 3 Plan 03: Features & FINAL-TEST Summary

## What shipped

A unified feature drop closing Phase 3 and v10's feature scope:

1. **Coefficient display (UX-09)** — `renderResult()` now emits a dedicated row in `res-main`:
   ```
   Coefficient appliqué : 1.8765 %
   ```
   4 decimal places match admin input precision. Hidden when `d.onDemand === true`. Text flows through `t('result.coefficient.label')` → FR/EN dictionary. Uses pure numeric interpolation — no user data, no escape needed.

2. **Copy LC button (UX-10)** — one event-delegated click listener on `document` handles every `.btn-copy-ref` click across the app. Reads `btn.dataset.ref` (dynamic res-main button) or falls back to `lastGen.ref` (static Proposition toolbar button). Calls `navigator.clipboard.writeText()` → `showToast(t('toast.copied'), 'ok')`. Fallback path creates a hidden textarea + `document.execCommand('copy')` for older browsers. The static toolbar button sits between Modifier and Imprimer, fully i18n'd via `data-i18n="button.copy.ref"`.

3. **Validity override (FEAT-04 + FEAT-05)** —
   - HTML: `<select id="validity-days">` with 15/30/60 options under the commission/max card, labeled via `data-i18n="admin.section.validity"`
   - Storage: new `VAL_KEY = 'lt_validity'` constant (the ONLY new storage key)
   - Helper: `getValidity()` returns `parseInt(localStorage.getItem(VAL_KEY), 10)` only if `∈ {15, 30, 60}`, else 30. Exposed on `window`.
   - Wiring: `loadCoeffs()` hydrates the dropdown on admin panel open; `saveCoeffs()` persists with whitelist validation on write
   - `expiryDate()` rewrite: parses the FR long-date `d.ds` input, adds `getValidity() * 86400000` ms, then reformats via `toLocaleDateString` with `currentLang === 'en' ? 'en-US' : 'fr-FR'`. The existing `expiryDate(d.ds)` call site in `p1p2()`'s conditions block is untouched — Plan 02's render contract is preserved.
   - Re-render flows: `applyI18n()` → `rerenderProposalIfActive()` → `p1p2()` → `expiryDate()` picks up `currentLang` automatically, so lang toggles re-format the expiry date in place without regenerating.

4. **Aperçu labeling (FEAT-06)** — static `<div class="apercu-label" data-i18n="result.inline.apercu">` inserted above `#inline-res` in the Saisie tab. Global CSS (top-level, not inside the mobile media query) adds `.apercu-label` styling (uppercase, muted, letter-spaced) + `#inline-res` dashed border + 2% black background + rounded corners. Result: visually subordinate to the Résultat tab's solid-green-border final tile. Zero calc-logic duplication — `updateInline()` flow untouched.

5. **5 new i18n keys × 2 languages** added to `I18N` dictionary:
   - `result.coefficient.label` — "Coefficient appliqué" / "Applied coefficient"
   - `result.inline.apercu` — "Aperçu" / "Preview"
   - `button.copy.ref` — "📋 Copier la référence" / "📋 Copy reference"
   - `toast.copied` — "Référence copiée." / "Reference copied."
   - `admin.section.validity` — "Validité proposition (jours)" / "Proposal validity (days)"

6. **`assertValidity()` self-check** — consistent with Phase 1's `assertCalc` and Phase 2's `assertEscape`. 6 fixtures (null, '15', '30', '60', '999', 'abc') with snapshot+restore of `lt_validity`. Logs `[v10 self-check] getValidity: 6/6 fixtures pass ✓` on DOMContentLoaded.

7. **FINAL-TEST.md** — the ship gate. 8 sections:
   - **A. PARITY re-run** (link to `.planning/phases/01-parity-refactor/PARITY-AUDIT.md`)
   - **B. SEC re-run** (link to `.planning/phases/02-security-hardening/SEC-TEST.md`)
   - **C. UX + FEAT tests** — 29 REQ rows
   - **D. FR-only smoke** — 13 steps end-to-end
   - **E. EN-only smoke** — same flow in English
   - **F. Migration re-test** — 9 steps covering fresh install, v9 password upgrade, FR↔EN persistence
   - **G. Browser matrix** — Chrome + Edge mandatory, Firefox + Safari optional
   - **H. Sign-off block** — reviewer, date, commit hash, checkboxes for each mandatory section

## File deltas

| File | Lines before | Lines after | Delta |
|------|-------------:|------------:|------:|
| `Matrice_2026_THE_Leasetic-v10.html` | 1849 | 1976 | +127 |
| `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md` | — | 167 | +167 (new) |

## Verification

### Automated (ran after each task)

```
grep -cn "result.coefficient.label|btn-copy-ref|lt_validity|getValidity|admin.section.validity|result.inline.apercu|rse-caption" Matrice_2026_THE_Leasetic-v10.html → 27 (≥7 target ✓)
grep -c "assertCalc|assertEscape|assertValidity" Matrice_2026_THE_Leasetic-v10.html → 9 (3 helpers × def/window/call ✓)
grep -cE "^[[:space:]]*var " Matrice_2026_THE_Leasetic-v10.html → 0 (0 var ✓)
node --check on extracted <script> → PARSE OK ✓
test -f .planning/phases/03-ux-polish-i18n/FINAL-TEST.md → true ✓
grep -c "^## Section [A-H]" FINAL-TEST.md → 8 (all 8 sections ✓)
grep -c "^| \*\*" FINAL-TEST.md → 29 (Section C REQ row count ✓)
```

### Self-checks on load (Antoine runs in Chrome console)

```
[v10 migration] default password hashed  (or v9 data inherited)
[v10 self-check] calcRent formula: 6/6 fixtures pass ✓
[v10 self-check] escapeHtml: 8/8 fixtures pass ✓
[v10 self-check] getValidity: 6/6 fixtures pass ✓
```

## Requirements shipped in this plan

| ID | Title | How satisfied |
|----|-------|---------------|
| **UX-09** | Coefficient display in Résultat | `renderResult()` res-main coef-line, 4 decimals, hidden on onDemand, i18n-backed |
| **UX-10** | Copy LC reference button | Event-delegated handler, clipboard API + fallback, both res-main and Proposition toolbar |
| **FEAT-04** | Admin validity dropdown | `#validity-days` select (15/30/60) + saveCoeffs persist + loadCoeffs hydrate |
| **FEAT-05** | Expiry date honors validity | `expiryDate()` rewrite: day-arithmetic + locale-aware formatting; re-renders on lang toggle |
| **FEAT-06** | Aperçu labeling | Static label + CSS distinction on #inline-res vs Résultat tab tile |
| **TEST-01** | Chrome + Edge browser matrix | FINAL-TEST.md Section G (mandatory rows) + Sections A, B re-runs |
| **TEST-03** | UX/FEAT test checklist | FINAL-TEST.md Section C, 29 rows covering UX-01..10 + FEAT-01..06 |
| **TEST-04** | FR + EN smoke runs | FINAL-TEST.md Sections D + E (13 steps each) |
| **TEST-05** | Migration re-test | FINAL-TEST.md Section F (9 steps covering fresh install, v9 upgrade, FR↔EN persistence) |

Plan ships 9 requirements — last batch of Phase 3.

## Deviations from Plan

None material. Minor notes:

1. **Dropdown placement** — plan text suggested "near commission/max fields" (could be its own card or inline). Chose to place inside the existing commission/max card as a new `.fld` row to avoid adding an extra card and to keep related admin settings grouped.

2. **Key naming** — plan spec used `result.coeff.label` in some places and `result.coefficient.label` in the critical-rules section. Used `result.coefficient.label` (the critical-rules spec wins) to avoid collision with the pre-existing `result.coeff.suffix` key.

3. **Copy-ref button placement in Résultat tab** — plan text was slightly ambiguous about where in the Résultat tab to place the button (res-main vs res-detail). Chose res-main directly below the coefficient line so the LC-ref + copy action is adjacent to the primary numeric display, which matches partner workflow (read the loyer → copy the ref → paste into the client email).

4. **assertValidity added** — listed as "Task 7: Optional" in critical-rules. Implemented it because Phase 1/2 pattern strongly suggests every new helper gets a self-check, and the snapshot+restore approach was a 20-line clean add.

## Handoff to Antoine

**You are now at the final ship gate.** The code is feature-complete for v10.

### What to do next

1. Open `Matrice_2026_THE_Leasetic-v10.html` in Chrome
2. Open DevTools console → confirm 4 green self-checks log on load:
   - `[v10 migration] ...`
   - `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓`
   - `[v10 self-check] escapeHtml: 8/8 fixtures pass ✓`
   - `[v10 self-check] getValidity: 6/6 fixtures pass ✓`
3. Open `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md` in a side panel
4. Work Sections A → H in order, ticking boxes as you go. Total ~60–90 min in Chrome.
5. Once Chrome is fully green, repeat the CRITICAL sections in Edge (~15 min):
   - Section A 31-check PARITY runbook
   - Section B SEC-TEST re-run
   - Section C (spot-check any FR/EN + copy-ref + validity paths)
   - Section D FR smoke + Section F migration
6. Fill Section H sign-off, commit the completed FINAL-TEST.md (or keep it local as your runbook log).

### Things to watch for

- **Clipboard API on Safari / private browsing** — if the async writeText rejects, the textarea fallback should still work. If both fail, a red "Copy failed" toast fires.
- **Expiry date timezone edge** — `toLocaleDateString` is timezone-aware; if you run near midnight in CET/CEST, the displayed date may be off by ±1 day from pure `genDate + N days`. Acceptable and matches the FR locale reader's intuition.
- **Dropdown sync** — if you change the validity dropdown value BUT DON'T click Save, the next Générer will still use the OLD stored value. This is intentional (consistent with commission / max / password / coefficient behavior). Save → Regenerate.

### What's frozen (do not touch in any patch release)

- calcRent formula, tranche boundaries, filename format (`LC-XXXXX`, `_THE` suffix)
- All localStorage keys: `lt_pw`, `lt_coeffs`, `lt_comm`, `lt_qtr`, `lt_max`, `lt_lang`, `lt_validity`
- `escapeHtml`, `hashPassword`, `migratePasswordIfNeeded`, `assertCalc`, `assertEscape`, `assertValidity` — all window-exposed
- `lastGen` shape + `rerenderProposalIfActive` contract (Plan 02)
- `t()` / `applyI18n()` / `setLang()` / I18N dictionary structure (Plan 02)
- Commission invisibility in all customer-facing output (PARITY-22)

## Commits

| Hash | Scope | Message |
|------|-------|---------|
| `e11f820` | Task 1 | `feat(03-03): coefficient display, copy LC button, Apercu labeling + i18n keys` |
| `74e9a06` | Task 2a | `feat(03-03): validity override (admin dropdown + getValidity + expiryDate rewrite)` |
| `565d71b` | Task 2b | `docs(03-03): add FINAL-TEST.md master manual runbook` |

## Full project commit history (v10 journey)

```
565d71b docs(03-03): add FINAL-TEST.md master manual runbook
74e9a06 feat(03-03): validity override (admin dropdown + getValidity + expiryDate rewrite)
e11f820 feat(03-03): coefficient display, copy LC button, Apercu labeling + i18n keys
7727249 docs(03-02): complete i18n-infrastructure plan
b294797 feat(03-02): mass-annotate HTML, convert JS templates to t(), add proposal re-render + RSE caption
f2c90c0 feat(03-02): add I18N section, t/applyI18n/setLang helpers, lang toggle button
0db57c8 docs(03-01): complete ux-primitives plan
9abad7f feat(03-01): add validation, auto-focus, keyboard shortcuts, breadcrumb
4a23665 feat(03-01): add toast system, replace success/info alerts, add reset confirm
9133980 docs(phase-03): plan UX polish and i18n (3 plans, 3 waves)
9d4205e docs(phase-02): complete phase execution
18753c5 docs(02-02): complete xss-sanitization plan
43e52e8 docs(02-02): add SEC-TEST.md manual checklist for Phase 2 verification
c2b90af feat(02-02): add escapeHtml() helper and wrap user-sourced interpolations
599f795 docs(02-01): complete password-hashing plan
8c1b756 feat(02-01): wire password hashing into admin login, save, and DOMContentLoaded
b1b3b7d feat(02-01): add hashPassword() helper and migratePasswordIfNeeded()
5452e38 docs(phase-02): plan security hardening (2 plans, 2 waves)
1bde42f docs(phase-01): complete phase execution
c051120 docs(01-03): complete parity-audit plan
```

29 commits total from baseline → v10 ship-ready.

---

## Self-Check: PASSED

- [x] File exists: `Matrice_2026_THE_Leasetic-v10.html` (1976 lines)
- [x] File exists: `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md` (167 lines)
- [x] File exists: `.planning/phases/03-ux-polish-i18n/03-03-features-and-final-test-SUMMARY.md` (this file)
- [x] Commit `e11f820` FOUND in git log (Task 1)
- [x] Commit `74e9a06` FOUND in git log (Task 2 code)
- [x] Commit `565d71b` FOUND in git log (Task 2 FINAL-TEST.md)
- [x] 5 new i18n keys in both fr + en blocks (result.coefficient.label, result.inline.apercu, button.copy.ref, toast.copied, admin.section.validity)
- [x] `renderResult()` emits coef-line + copy-ref button block
- [x] Event-delegated `.btn-copy-ref` click handler in UTILS
- [x] `#validity-days` select in admin panel HTML
- [x] `VAL_KEY = 'lt_validity'` constant
- [x] `getValidity()` helper with whitelist + default 30
- [x] `expiryDate()` rewritten to use Date arithmetic + locale-aware formatting
- [x] `loadCoeffs()` hydrates dropdown; `saveCoeffs()` persists validity with whitelist
- [x] `assertValidity()` defined + window-exposed + called in DOMContentLoaded
- [x] `.apercu-label` CSS + `#inline-res` dashed border + `.btn-copy-ref` + `.coef-line` all added at top-level CSS scope (not inside mobile media query)
- [x] FINAL-TEST.md has 8 sections (A-H) — grep `^## Section` → 8
- [x] FINAL-TEST.md Section C has 29 REQ rows — grep `^| \*\*` → 29
- [x] node --check on extracted <script> → PARSE OK
- [x] Zero `^\s*var\s` matches
- [x] Phase 1 helpers intact (escapeHtml, assertCalc, calcRent, tKey, tLabel, readV9LocalStorage)
- [x] Phase 2 helpers intact (hashPassword, migratePasswordIfNeeded, assertEscape)
- [x] Plan 03-01 helpers intact (showToast, REQUIRED_FIELDS, updateBreadcrumb)
- [x] Plan 03-02 helpers intact (I18N dict, t, applyI18n, setLang, lastGen, rerenderProposalIfActive, updateHdrTitle)
- [x] lt_validity is the only new localStorage key; all other keys frozen
- [x] No user data flows into innerHTML without escapeHtml (SEC-03 invariant preserved)
- [x] Commission still invisible in all customer-facing output (PARITY-22 invariant preserved)
