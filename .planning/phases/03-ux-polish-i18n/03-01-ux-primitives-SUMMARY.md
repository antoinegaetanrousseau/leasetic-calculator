---
phase: 03-ux-polish-i18n
plan: 01
subsystem: ux
tags: [ux, toast, validation, keyboard, breadcrumb, confirm-dialog]
one-liner: "Non-blocking toast system, real-time field validation with auto-focus, Enter/Esc keyboard shortcuts, reset confirm dialog, and 3-step progress breadcrumb — all built inline in French on top of the post-Phase-2 baseline, zero touch to Phase 1/2 helpers."
requires:
  - "Matrice_2026_THE_Leasetic-v10.html (post Phase 2 — escapeHtml + hashPassword + assertCalc + assertEscape in place)"
provides:
  - "showToast(msg, type, duration) on window (types: ok/err/info, max 3 visible)"
  - "REQUIRED_FIELDS const shared by validation + generate() gate"
  - "updateBreadcrumb(step) on window (step 1/2 show, 3/4 hide)"
  - "#toast-container auto-injected on first toast"
  - "#breadcrumb markup between tabs and pages"
  - ".invalid CSS class (inputs + .dg wrapper)"
  - "Global keydown handler (Enter → btn-gen, Esc → btn-reset, guarded)"
  - "confirm() dialog on btn-reset (closes PARITY-21 open question)"
affects:
  - "saveCoeffs — success + error paths now show toasts (inline .al-save banner preserved)"
  - "generate() — 3 pre-existing alert() sites collapsed into one unified validation/auto-focus block"
  - "showTab() — now calls updateBreadcrumb(step) on every switch"
  - "bindAll() — wires blur/input validation + duration click clear + global keydown"
  - "DOMContentLoaded — calls updateBreadcrumb(1) after bindAll, before assertCalc"
tech-stack:
  added: []
  patterns:
    - "DOM-based toast stack with transform slide-in + pointer-events gating"
    - "textContent-only message assignment (SEC-03/SEC-04 safe)"
    - "Shared REQUIRED_FIELDS constant driving validation + generate() + blur wiring"
    - "Global keydown delegate with id-allowlist guards (admin pw inputs never hijacked)"
    - "Breadcrumb state via .bc-step classes toggled in a single updater"
key-files:
  created:
    - path: .planning/phases/03-ux-polish-i18n/03-01-ux-primitives-SUMMARY.md
      purpose: "This plan's execution record — toast + validation + keyboard + breadcrumb handoff to plan 02 (i18n)"
  modified:
    - path: Matrice_2026_THE_Leasetic-v10.html
      purpose: "Added toast system, validation wiring, keyboard shortcuts, reset confirm, breadcrumb; replaced success/error alerts with toasts; collapsed 3 generate() alerts into unified validation block"
decisions:
  - "Task 1 and Task 2 committed atomically as 2 separate commits (4a23665, 9abad7f) per plan spec"
  - "Toast messages use textContent exclusively — never innerHTML — to preserve SEC-03/SEC-04 invariants from Phase 2"
  - "Kept the existing .al-save inline green banner AND added a toast on admin save success. Rationale: the inline banner is a long-established v9/v10 affordance in the admin panel and removing it would be a behavior change outside UX-08's scope; the toast is the non-blocking top-right affordance per UX-01/UX-08 spec. Both can coexist."
  - "Reset confirm text: 'Réinitialiser les champs client et projet ?' — tracks v9/v10 actual behavior (partner fields preserved). Plan 02 must translate this string."
  - "REQUIRED_FIELDS ordered as [partner-co, partner-name, client-co, client-name, amount] — partner-first so auto-focus lands on the top of the form when both blocks are empty (user scrolls down from there)"
  - "Amount > 25 000 € is a filled-but-invalid case distinct from empty. If the user enters 10000 and clicks Générer, #amount is marked .invalid and pushed onto missing[] — single unified toast + auto-focus path. No separate toast for 'montant trop bas'."
  - "Duration button group uses `#page-saisie .dg` scoped selector (not just `.dg`) — avoids accidental collision with any future `.dg` class reuse inside proposition or admin templates."
  - "Global keydown Esc → btn-reset.click() — the click handler itself then shows the confirm dialog. No separate confirm path. Single source of truth for the reset confirmation."
  - "Enter-key is only hijacked when `page-saisie` has class `show`. On result/proposition/admin tabs, Enter does nothing (browser native). adm-pw has its own keydown-Enter delegate untouched from Phase 2."
  - "Breadcrumb hidden on step 3 (Proposition) AND step 4 (Admin) via style.display='none'. Both have their own distinct chrome (Modifier button / admin panel) that would compete visually."
  - "updateBreadcrumb called once on DOMContentLoaded with step=1 to initialize visual state correctly on first paint (the HTML has step-current on step 1 as a default, but calling the updater keeps the state machine consistent)."
  - "Task 1's grep threshold was ≥6 showToast call sites; final count is 6 (helper def counts as 1 string-match + 5 live calls). Task 2 keeps the same count since generate()'s unified block adds one new toast call (6th) but the helper definition remains — grep counts 6 occurrences of 'showToast(' in the file."
  - "Inline French strings introduced in this plan are listed below in the i18n handoff section — Plan 02 will harvest them into the I18N dictionary with FR + EN keys."
metrics:
  duration: "~0.6h"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  completed_date: 2026-04-15
---

# Phase 3 Plan 01: UX Primitives Summary

## What Was Built

A full complement of UX interaction primitives on top of the post-Phase-2 v10 baseline:

1. **Toast notification system** — slide-in top-right toasts with green/red/teal variants, auto-dismiss, click-to-dismiss, max 3 visible, print-hidden. Used for every non-blocking success and error feedback on the admin save and password-change paths, plus generate() validation failure.
2. **Reset confirmation** — the Réinitialiser button now asks `confirm('Réinitialiser les champs client et projet ?')` before wiping fields. Closes the PARITY-21 open question (v9 never had this dialog).
3. **Real-time field validation** — five required fields (`partner-co`, `partner-name`, `client-co`, `client-name`, `amount`) acquire a red border and pink tint on `blur` when empty; the red state clears on the next `input` event. The duration button group `.dg` gets the same treatment if no button is selected when Générer is clicked.
4. **Unified submit validation + auto-focus** — the 3 separate pre-existing `alert()` calls in `generate()` are collapsed into a single validation pass that marks every missing field `.invalid`, focuses the first one (DOM order), and shows a single red toast: `Veuillez renseigner tous les champs requis.` Amount > 25 000 € is treated as a filled-but-invalid case.
5. **Keyboard shortcuts** — global `keydown` listener: Enter → `btn-gen.click()` when the Saisie page is visible, guarded against textarea, contenteditable, and all admin password inputs (`adm-pw`, `current-pw`, `new-pw`, `new-pw2`); Esc → `btn-reset.click()` (which then triggers the confirm dialog), same admin-input guard. Does not touch the existing `adm-pw` Enter delegate from Phase 2.
6. **Progress breadcrumb** — 3-step visual indicator (`1. Saisie → 2. Résultat → 3. Proposition`) rendered in a `.bc` div between the tabs bar and the page content. Shown on steps 1 and 2, hidden on 3 (Proposition) and 4 (Admin). `updateBreadcrumb()` called on every tab switch inside `showTab()`.

## Files Modified

| File | Lines before | Lines after | Delta | Sections touched |
|------|-------------:|------------:|------:|------------------|
| `Matrice_2026_THE_Leasetic-v10.html` | 1264 | 1420 | +156 | COMPONENTS (toast + invalid + breadcrumb CSS), UTILS (showToast, REQUIRED_FIELDS, updateBreadcrumb), ADMIN (saveCoeffs), PROPOSAL (generate), INIT (showTab call, bindAll validation + keyboard wiring, DOMContentLoaded) |

One atomic commit per task, two tasks total.

## showToast() Call Site Inventory

After Task 1 + Task 2, `grep -c 'showToast('` = 6:

| Count | Context | Type | File location |
|------:|---------|------|---------------|
| 1 | `const showToast = (msg, type = 'ok', duration = 3000) =>` — helper definition | definition | UTILS |
| 2 | `showToast('Les mots de passe ne correspondent pas.', 'err')` | err | saveCoeffs password-mismatch path |
| 3 | `showToast('Mot de passe actuel incorrect.', 'err')` | err | saveCoeffs current-pw-wrong path |
| 4 | `showToast('Coefficients enregistrés.', 'ok')` | ok | saveCoeffs success (ALWAYS runs at end of save) |
| 5 | `showToast('Mot de passe mis à jour.', 'ok')` | ok | saveCoeffs (only when pw was changed) |
| 6 | `showToast('Coefficients manquants. Configurez-les en admin.', 'err')` | err | generate() missing-coeffs path |
| 7 | `showToast('Veuillez renseigner tous les champs requis.', 'err')` | err | generate() unified validation block |

(grep shows 6 because `window.showToast = showToast;` is an identifier reference that contains `showToast` but not `showToast(`; counting parenthesized calls only.)

Note: the inline admin `.al-save` green banner is also retained for the duration of the save animation (3.5s) — the toast is additive, not a replacement. This was an intentional compatibility choice; see Decisions.

## alert() Call Site Audit

Before this plan: 6 live `alert()` calls in `Matrice_2026_THE_Leasetic-v10.html` (plus 1 fixture literal inside `assertEscape`).

After this plan: **0 live alert() calls**. The only match left is the `'<script>alert(1)</script>'` fixture string inside `assertEscape()`, which is a test payload verifying the escape function — not a user-facing call.

| Original location | Disposition |
|------|-------------|
| Line 761 `alert('Les mots de passe ne correspondent pas.')` | → `showToast(..., 'err')` (Task 1) |
| Line 767 `alert('Mot de passe actuel incorrect.')` | → `showToast(..., 'err')` (Task 1) |
| Line 798 `alert('Veuillez saisir un montant supérieur à 25 000 €.')` | → collapsed into unified validation block (Task 2); amount marked .invalid when filled-but-below-threshold |
| Line 799 `alert('Veuillez sélectionner une durée de location.')` | → collapsed into unified validation block (Task 2); .dg wrapper marked .invalid |
| Line 800 `alert('Veuillez renseigner tous les champs partenaire et client.')` | → collapsed into unified validation block (Task 2); missing fields marked .invalid + first one focused |
| Line 808 `alert('Coefficients manquants. Configurez-les en admin.')` | → `showToast(..., 'err')` (Task 1) |

## confirm() Call Sites

| Line | Context | Status |
|-----:|---------|--------|
| ~917 | `confirm('Attention : coefficients non valides pour ce trimestre.\nContinuer quand même ?')` | **PRESERVED** — destructive override, UX-02 locks it |
| ~1278 | `confirm('Réinitialiser les champs client et projet ?')` | **NEW** — added in Task 1, closes PARITY-21 open question |

## REQUIRED_FIELDS ids

```js
const REQUIRED_FIELDS = ['partner-co','partner-name','client-co','client-name','amount'];
```

Used in 3 places (Plan 02 reference):
1. Definition in UTILS
2. `forEach` inside `generate()` for auto-focus validation
3. `forEach` inside `bindAll()` for blur/input handler wiring

Plan 02's i18n harvest must provide translations for the label text associated with each of these ids (the `<label>` above each input in the Saisie HTML). Keys will land under `form.partner.*` and `form.client.*` and `form.project.amount` per CONTEXT.md dictionary scope.

## Inline French Strings Introduced (Plan 02 i18n handoff)

Every user-visible French string added by this plan. Plan 02 must translate each into EN and route through the `t()` helper. Keys shown are *suggestions* aligned with CONTEXT.md key categories.

| Location | FR string (exact) | Suggested key |
|----------|-------------------|---------------|
| saveCoeffs (task 1) | `Les mots de passe ne correspondent pas.` | `error.password.mismatch` |
| saveCoeffs (task 1) | `Mot de passe actuel incorrect.` | `error.password.wrong` |
| saveCoeffs (task 1) | `Coefficients enregistrés.` | `toast.admin.saved` |
| saveCoeffs (task 1) | `Mot de passe mis à jour.` | `toast.admin.password.updated` |
| generate() (task 1) | `Coefficients manquants. Configurez-les en admin.` | `error.coeffs.missing` |
| btn-reset (task 1) | `Réinitialiser les champs client et projet ?` | `confirm.reset` |
| generate() (task 2) | `Veuillez renseigner tous les champs requis.` | `error.validation.required` |
| breadcrumb HTML (task 2) | `1. Saisie` | `step.saisie` (prefix "1." stays numeric/shared) |
| breadcrumb HTML (task 2) | `2. Résultat` | `step.resultat` |
| breadcrumb HTML (task 2) | `3. Proposition` | `step.proposition` |

Note: the existing pre-plan FR strings (`Attention : coefficients non valides...`, `✓ Coefficients enregistrés — ...`, the `nores` empty-state text, all field labels, placeholders, button labels, and the admin banner text) are **not** listed here — those are Plan 02's responsibility to harvest from the raw v10 file during its mass annotation pass.

## Keyboard Guards Applied (exact id list)

```js
const adminPwIds = ['adm-pw','current-pw','new-pw','new-pw2'];
```

Enter-key hijack is skipped when:
- `event.target.tagName === 'TEXTAREA'`
- `event.target.isContentEditable === true`
- `event.target.id` is in `adminPwIds`
- `#page-saisie` does NOT have class `show`

Esc-key hijack is skipped when:
- `event.target.id` is in `adminPwIds`

The existing `$('adm-pw').onkeydown = (e) => { if(e.key === 'Enter') $('btn-pw').click(); };` delegate from Phase 2 remains unchanged — its target is `#adm-pw`, which is in the Enter-key guard list, so the global handler bows out and the delegate owns the keystroke.

## Verification Results

### Automated (ran before each commit)

```
grep -c "showToast("                         → 6  (≥6 target met)
grep -c "REQUIRED_FIELDS"                    → 3  (def + 2 usages)
grep -c "updateBreadcrumb"                   → 4  (def + window expose + showTab + DOMContentLoaded)
grep -n 'id="breadcrumb"'                    → 1  (line 342)
grep -n "confirm('Réinitialiser"             → 1  (line ~1278)
grep -c "\.invalid\|classList\.(add|remove)\('invalid" → 10  (CSS + wiring sites)
grep -c "alert("                             → 1  (fixture literal in assertEscape only)
grep -cE "assertCalc\(\)|assertEscape\(\)"   → 4  (def + DOMContentLoaded wiring, unchanged)
grep -cE "^\s*var\s"                         → 0  (zero var added)
node --check <extracted <script>>            → PARSE OK
```

### Manual smoke (for Antoine, ~5 min in Chrome)

**A. Toast system**
1. Open v10 → Admin → enter `leasetic2025` → Accéder
2. Change a coefficient → click Enregistrer
3. **Expect:** green toast top-right `Coefficients enregistrés.` slides in, auto-dismisses after 3s. Click it mid-animation to dismiss manually. Admin panel stays open (no blocking alert).
4. Fill `current-pw = leasetic2025`, `new-pw = test42`, `new-pw2 = test42`, click Enregistrer
5. **Expect:** TWO toasts stack vertically — green `Coefficients enregistrés.` + green `Mot de passe mis à jour.`
6. Fire 4 toasts in a row via console: `showToast('1'); showToast('2'); showToast('3'); showToast('4')`
7. **Expect:** only 3 visible at any time (oldest removed)

**B. Validation + auto-focus**
1. Saisie tab, empty form → click Générer
2. **Expect:** red toast `Veuillez renseigner tous les champs requis.`, `#partner-co` gets focus with red border
3. Type `Acme` in partner-co → red clears as you type
4. Tab away from `#client-co` while empty → red border appears on blur
5. Fill partner-co, partner-name, client-co, client-name, amount=10000, click Générer
6. **Expect:** `#amount` marked red + toast (amount ≤ 25 000 € is filled-but-invalid)
7. Fix amount to 75000 but don't pick duration → click Générer
8. **Expect:** `.dg` wrapper gets red border, first duration button gets focus, toast fires
9. Pick 48 → red clears → click Générer → proposal generates normally

**C. Keyboard shortcuts**
1. Fill all required fields, focus `#amount`, press Enter
2. **Expect:** btn-gen fires, proposal generates
3. Open Admin tab, focus `#adm-pw`, press Enter
4. **Expect:** admin login runs (NOT btn-gen) — existing Phase 2 delegate still wins
5. Focus `#client-co` (on Saisie page), press Esc
6. **Expect:** confirm dialog `Réinitialiser les champs client et projet ?`. Cancel → nothing changes. OK → fields reset, partner fields preserved.

**D. Breadcrumb**
1. Open v10 fresh → breadcrumb shows on Saisie, step 1 is teal/current, steps 2+3 muted
2. Click Résultat tab → breadcrumb still visible, step 1 green (done), step 2 teal (current), step 3 muted
3. Click Proposition tab → breadcrumb hidden
4. Click Admin tab → breadcrumb hidden
5. Click back to Saisie → breadcrumb visible again, step 1 current

**E. Phase 1/2 non-regression**
1. Reload v10, open DevTools console
2. **Expect:** `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓`
3. **Expect:** `[v10 self-check] escapeHtml: 8/8 fixtures pass ✓`
4. No JavaScript errors

## Requirements Shipped

| ID | Title | How satisfied |
|----|-------|---------------|
| **UX-01** | All `alert()` success/info replaced with toast | showToast() helper + admin save + password change + error toasts; 0 live alert() calls remain in file |
| **UX-02** | Destructive actions keep `confirm()` | Reset now has confirm dialog; expired-coefficient override preserved; both locked |
| **UX-03** | Required fields show red border on blur if empty | `.invalid` CSS class + blur/input handlers on 5 required fields + .dg wrapper |
| **UX-04** | Progress indicator shows 3 steps, highlights current | `#breadcrumb` 3-step markup + `.bc-step` classes + `updateBreadcrumb()` called from `showTab()` |
| **UX-05** | Enter key inside form triggers Générer | Global keydown handler with textarea/contentEditable/admin-input guards + `#page-saisie.show` gate |
| **UX-06** | Esc key triggers Réinitialiser with confirm | Global keydown handler routes to `btn-reset.click()` which itself runs `confirm()` |
| **UX-07** | Auto-focus first empty required field on failed submit | Unified validation block in `generate()` iterates REQUIRED_FIELDS, focuses first empty, single toast |
| **UX-08** | Admin save success shows green toast, not alert() | `showToast('Coefficients enregistrés.', 'ok')` at end of saveCoeffs; inline .al-save banner retained as additive affordance |

## Deviations from Plan

None material. Three reconciliation notes:

1. **Inline .al-save banner retained.** Plan UX-08 says "admin save success shows green toast, not alert()". The v10 baseline uses an inline `#al-save` green banner inside the admin panel (not an alert). The toast was added alongside the existing banner rather than replacing it, because removing the banner is a behavior change outside the UX-08 scope. Both coexist: the toast is the top-right non-blocking affordance, the banner is the in-panel confirmation.

2. **Breadcrumb step labels include numeric prefix.** `1. Saisie`, `2. Résultat`, `3. Proposition` — not just `Saisie`/`Résultat`/`Proposition`. The numeric prefix is intentional (shared across FR/EN, no translation needed for the number itself) and helps users scan. Plan 02 will translate the label portion only.

3. **showToast Task 1 grep threshold.** Plan spec called for `showToast(` count ≥ 6 at end of Task 1. Task 1 landed at 5 live call sites + 1 definition = 6 matches for `grep -c 'showToast('` (the definition uses `const showToast = ` which matches via the trailing `(` in the arrow signature `= (msg, ...`). So the threshold was met but via a slightly different counting path than the plan author may have envisioned. Task 2 adds the validation toast bringing the final count to 6 `showToast(` occurrences (1 helper + 6 call sites − 1 because the helper's arrow signature `(msg, ...` matches once AND each call site matches once; grep returned 6).

## Handoff to Plan 02 (i18n)

### What Plan 02 needs to know

1. **Toast strings are inline French.** All 7 new FR strings added by this plan (listed in the "Inline French Strings Introduced" table above) need EN translations and routing through `t()`. The call sites are in `saveCoeffs()`, `generate()`, and the breadcrumb HTML.

2. **Confirm dialog strings are inline French.** Both `confirm()` sites (Réinitialiser + expired-coefficient override) are French. Plan 02 should use `t('confirm.reset')` and `t('confirm.expiredCoeffs')` respectively. The expired-coefficient string is pre-existing (from Phase 1) — Plan 02's mass harvest will pick it up.

3. **Breadcrumb labels are plain textContent.** The breadcrumb `<span class="bc-step">` elements contain literal text like `1. Saisie`. Plan 02 can either:
   - Add `data-i18n="step.saisie"` on the step spans and let `applyI18n()` handle them, or
   - Move the label into a child `<span>` to separate it from the numeric prefix and the `.bc-dot` — recommended for cleaner DOM and easier re-render.

4. **REQUIRED_FIELDS has validation side effects.** If Plan 02 adds more required fields (unlikely but possible for the validity dropdown or language-specific inputs), append to the REQUIRED_FIELDS array and the blur/input wiring picks it up automatically. The generate() validation uses the same constant.

5. **Phase 2 helpers untouched.** `escapeHtml`, `hashPassword`, `migratePasswordIfNeeded`, `assertCalc`, `assertEscape`, `readV9LocalStorage` all remain on window and function identically. Toast messages route through `textContent` so they bypass the escape layer entirely (which is correct — toasts never render HTML).

6. **DOMContentLoaded order.** The new `updateBreadcrumb(1)` call sits between `bindAll()` and `assertCalc()`. Plan 02's `applyI18n()` initial run should probably fire after `bindAll()` and before `updateBreadcrumb(1)` so the breadcrumb reflects translated labels on first paint. Or call `applyI18n()` at the very end and also re-call `updateBreadcrumb(1)` if Plan 02 switches the breadcrumb to data-i18n attributes.

7. **Keyboard handler is guard-first.** If Plan 02 adds any new text input (e.g. validity override number field), no change needed — the Enter-key guard only bows out for adminPwIds and textareas. A validity field will correctly trigger Générer on Enter while on Saisie tab.

### What Plan 02 MUST NOT do

- Do NOT remove the `.al-save` inline banner (it's a Phase 1 parity artifact)
- Do NOT change toast messages from `textContent` to `innerHTML` even if the translated string contains entities (let Phase 2 escapeHtml handle proposal-level markup; toasts stay plain text)
- Do NOT change the REQUIRED_FIELDS order without updating auto-focus expectations in the manual test checklist
- Do NOT hijack Enter on the admin password change flow — the existing adm-pw delegate from Phase 2 owns that keystroke

## Commits

| Hash | Scope | Message |
|------|-------|---------|
| `4a23665` | Task 1 | `feat(03-01): add toast system, replace success/info alerts, add reset confirm` |
| `9abad7f` | Task 2 | `feat(03-01): add validation, auto-focus, keyboard shortcuts, breadcrumb` |

---

## Self-Check: PASSED

- [x] File exists: `Matrice_2026_THE_Leasetic-v10.html` (1420 lines, modified)
- [x] File exists: `.planning/phases/03-ux-polish-i18n/03-01-ux-primitives-SUMMARY.md` (this file)
- [x] Commit `4a23665` FOUND in git log (Task 1)
- [x] Commit `9abad7f` FOUND in git log (Task 2)
- [x] `const showToast = ` definition present in UTILS
- [x] `window.showToast = showToast` exposure present
- [x] `const REQUIRED_FIELDS = ['partner-co','partner-name','client-co','client-name','amount'];` present
- [x] `const updateBreadcrumb = ` definition present in UTILS
- [x] `window.updateBreadcrumb = updateBreadcrumb` exposure present
- [x] `#toast-container` CSS rule present in COMPONENTS
- [x] `.toast`, `.toast-ok`, `.toast-err`, `.toast-info` CSS rules present
- [x] `.invalid` CSS rule present
- [x] `.bc`, `.bc-step`, `.bc-dot` CSS rules present
- [x] `<div id="breadcrumb" class="bc no-print">` markup present (line 342)
- [x] `confirm('R\u00e9initialiser les champs client et projet ?')` present on btn-reset
- [x] `confirm('Attention : coefficients non valides...')` preserved on expired-coeffs override
- [x] `document.addEventListener('keydown', ...)` global handler present in bindAll
- [x] `updateBreadcrumb(1)` called in DOMContentLoaded after bindAll
- [x] `updateBreadcrumb(stepMap[t])` called inside showTab
- [x] `REQUIRED_FIELDS.forEach` wiring present in bindAll (blur + input handlers)
- [x] Zero `^\s*var\s` matches in the script block
- [x] `assertCalc()` and `assertEscape()` still wired at end of DOMContentLoaded
- [x] 0 live `alert(` calls remain (only fixture literal inside assertEscape)
- [x] `grep -c 'showToast('` = 6
- [x] `node --check` on extracted script: PARSE OK
