---
phase: 03-ux-polish-i18n
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - Matrice_2026_THE_Leasetic-v10.html
autonomous: true
requirements:
  - UX-01
  - UX-02
  - UX-03
  - UX-04
  - UX-05
  - UX-06
  - UX-07
  - UX-08
gap_closure: false

must_haves:
  truths:
    - "A partner sees a green toast (not a blocking alert) after admin save succeeds."
    - "An empty required field shows a red border on blur and clears it on next input."
    - "Clicking Générer with an empty required field auto-focuses the first empty field and shows an error toast."
    - "Pressing Enter inside the Saisie form (outside textarea and outside the admin password field) triggers Générer."
    - "Pressing Esc triggers Réinitialiser after a confirm() dialog; the confirm also blocks the direct click on btn-reset."
    - "A 3-step breadcrumb (Saisie → Résultat → Proposition) is visible on #page-saisie and #page-resultat and reflects the current tab."
  artifacts:
    - path: "Matrice_2026_THE_Leasetic-v10.html"
      provides: "showToast() helper, #toast-container injected on init, toast CSS, .invalid CSS class, validation handlers, global keydown handler, breadcrumb DOM + state updater, confirm() on btn-reset."
      contains: "showToast"
  key_links:
    - from: "saveCoeffs / password change success paths"
      to: "showToast('ok', ...)"
      via: "direct call replacing alert()"
      pattern: "showToast\\("
    - from: "document keydown (Enter)"
      to: "$('btn-gen').click()"
      via: "guarded handler (ignores textarea + #adm-pw + admin modal inputs)"
      pattern: "keydown"
    - from: "tab switch handler"
      to: "updateBreadcrumb(step)"
      via: "call on every page show"
      pattern: "updateBreadcrumb|step-current"
---

<objective>
Build every UX interaction primitive on top of the post-Phase-2 baseline: toasts, real-time validation, keyboard shortcuts, auto-focus on failed submit, reset confirm dialog, and a 3-step progress breadcrumb.

Purpose: Deliver a professional feel (non-blocking feedback, forgiving validation, keyboard ergonomics) before any i18n work. Strings are written inline in French — Plan 02 will extract them into the i18n dictionary in a single mass pass. This avoids duplicating the annotation work.

Output: A v10 file where every success/info `alert()` is replaced by a toast, required fields highlight red on blur, Générer auto-focuses the first missing field, Enter/Esc shortcuts work, btn-reset asks for confirmation, and a breadcrumb shows progress on Saisie/Résultat pages.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/03-ux-polish-i18n/03-CONTEXT.md
@.planning/phases/01-parity-refactor/01-scaffold-v10-refactor-SUMMARY.md
@.planning/phases/01-parity-refactor/PARITY-AUDIT.md
@.planning/phases/02-security-hardening/02-02-xss-sanitization-SUMMARY.md
@Matrice_2026_THE_Leasetic-v10.html

<interfaces>
<!-- Reusable helpers already present in v10 (from Phase 1 + 2) — use directly, do not re-implement. -->

From Matrice_2026_THE_Leasetic-v10.html (UTILS section):
- `$(id)` — document.getElementById shortcut
- `escapeHtml(s)` — Phase 2, returns HTML-escaped string (used for toast messages that echo user input, e.g. "Référence LC-XXXXX copiée")
- `assertCalc()` / `assertEscape()` — on-load self-checks, DO NOT break

From Matrice_2026_THE_Leasetic-v10.html (ADMIN section):
- `$('btn-pw').onclick` — password change handler (alert sites to replace)
- `saveCoeffs()` — admin save (alert success site to replace)

From Matrice_2026_THE_Leasetic-v10.html (INIT section):
- `$('btn-gen').onclick = generate;` — generate flow
- `$('btn-reset').onclick = () => { ... }` — reset flow (needs confirm wrap)
- `generate()` — reads required fields, currently uses blocking `alert()` for missing fields at lines ~798-800

Known alert() sites to convert to toast (SUCCESS/INFO only — keep errors as toast 'err'):
- Line 761: password mismatch → toast err
- Line 767: current password incorrect → toast err
- Line 798-800: required-field errors inside generate() → toast err + auto-focus (UX-07)
- Line 808: missing coeffs → toast err
- Admin save success ("Coefficients enregistrés") → toast ok
- Password change success → toast ok

Known confirm() site to KEEP:
- Line 802: expired coefficients override (destructive)

Known confirm() site to ADD:
- Line 1161: `$('btn-reset').onclick` currently has NO confirm. Wrap with `confirm('Réinitialiser les champs client et projet ?')` — this resolves PARITY-21 open question and satisfies UX-02.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Toast system + alert replacement + reset confirm</name>
  <files>Matrice_2026_THE_Leasetic-v10.html</files>
  <behavior>
    - showToast('Coefficients enregistrés', 'ok') shows a green slide-in toast top-right, auto-dismisses after 3s, click dismisses manually.
    - Three concurrent showToast() calls stack vertically with newest on top.
    - A 4th toast while 3 are visible removes the oldest.
    - Admin save no longer triggers a blocking alert(); a green toast appears instead.
    - Password change success shows a green toast; password mismatch and wrong-current-password show red error toasts.
    - Clicking btn-reset shows a confirm() dialog; cancel aborts, OK proceeds with existing reset logic.
  </behavior>
  <action>
    **1. Toast CSS (COMPONENTS section of <style>):**
    Add a `#toast-container` rule: `position:fixed;top:1rem;right:1rem;z-index:200;display:flex;flex-direction:column;gap:.5rem;pointer-events:none;`.
    Add `.toast` rule: `pointer-events:auto;min-width:240px;max-width:360px;padding:.75rem 1rem;border-radius:.5rem;color:#fff;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);cursor:pointer;transform:translateX(120%);opacity:0;transition:transform .25s ease,opacity .25s ease;`.
    Add `.toast.show` rule: `transform:translateX(0);opacity:1;`.
    Add `.toast-ok{background:var(--green)}`, `.toast-err{background:var(--danger)}`, `.toast-info{background:var(--teal)}`.
    Reuse existing CSS tokens — do NOT introduce new ones. If `--green`/`--danger`/`--teal` don't exist under those exact names, use the equivalent existing tokens (grep TOKENS section first).

    **2. showToast() helper in UTILS section:**
    ```js
    // UTILS — toast
    const showToast = (msg, type = 'ok', duration = 3000) => {
      let container = $('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
      // enforce max 3 visible
      while (container.children.length >= 3) container.removeChild(container.firstChild);
      const t = document.createElement('div');
      t.className = `toast toast-${type}`;
      t.textContent = msg; // textContent — never innerHTML
      const dismiss = () => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 250);
      };
      t.onclick = dismiss;
      container.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(dismiss, duration);
      return t;
    };
    window.showToast = showToast; // expose for future plans + console smoke
    ```

    **3. Replace alert() sites** (UX-01, UX-08):
    - Line ~761 password mismatch: `alert('Les mots de passe...')` → `showToast('Les mots de passe ne correspondent pas.', 'err')`
    - Line ~767 current-pw wrong: `alert('Mot de passe actuel incorrect.')` → `showToast('Mot de passe actuel incorrect.', 'err')`
    - Admin save success (find the `alert('Coefficients enregistrés')` or equivalent in saveCoeffs): → `showToast('Coefficients enregistrés.', 'ok')`
    - Password change success: → `showToast('Mot de passe modifié.', 'ok')`
    - Line ~808 missing coeffs: `alert('Coefficients manquants...')` → `showToast('Coefficients manquants. Configurez-les en admin.', 'err')`
    - DO NOT touch lines 798-800 (generate validation alerts) — those become toasts in Task 2 alongside auto-focus.
    - DO NOT touch line 802 (expired coefficients `confirm()`) — locked as destructive per UX-02.

    **4. Reset confirm dialog (UX-02, resolves PARITY-21):**
    In INIT section, replace the `$('btn-reset').onclick = () => { ... }` handler so its FIRST line is:
    ```js
    if (!confirm('Réinitialiser les champs client et projet ?')) return;
    ```
    Keep the rest of the existing reset body (field clearing, inline-res innerHTML reset, res-detail clear) unchanged.

    **5. Avoid breakage:**
    - Toast messages MUST be set via `textContent`, never innerHTML (Phase 2 contract).
    - Do NOT wrap or modify `assertCalc()` / `assertEscape()` — they stay untouched.
    - Keep the file a single self-contained HTML file; no new external assets.
  </action>
  <verify>
    <automated>grep -c "showToast(" Matrice_2026_THE_Leasetic-v10.html | awk '{if($1>=6)print"OK "$1;else{print"FAIL "$1;exit 1}}' &amp;&amp; grep -n "confirm('Réinitialiser" Matrice_2026_THE_Leasetic-v10.html &amp;&amp; ! grep -n "alert('Coefficients enregistrés\|alert('Les mots de passe\|alert('Mot de passe actuel\|alert('Coefficients manquants" Matrice_2026_THE_Leasetic-v10.html</automated>
    Manual: open v10 in Chrome → admin login → change coeffs → Save → green toast appears top-right, auto-dismisses in 3s, admin panel stays open (no blocking alert). Click btn-reset → confirm dialog appears. Cancel → nothing changes. OK → fields reset.
  </verify>
  <done>
    showToast() exists, 5+ alert() sites converted (admin save + password change success + 3 error paths), assertCalc and assertEscape still pass on load, btn-reset shows confirm, toast stacks to max 3, all messages use textContent.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Real-time validation + auto-focus + keyboard shortcuts + progress breadcrumb</name>
  <files>Matrice_2026_THE_Leasetic-v10.html</files>
  <behavior>
    - Leaving #client-co empty and tabbing away adds class `invalid` (red border). Typing any char removes it on input event.
    - Same behavior for #client-name, #amount, #partner-co, #partner-name.
    - Duration button group `.dg` wrapper gets `.invalid` class if Générer is clicked without a duration selected; clicking any button clears it.
    - Clicking Générer with #client-co empty and #client-name empty focuses #client-co (first in DOM order) and shows an error toast "Veuillez renseigner tous les champs requis."
    - Pressing Enter with focus in #amount triggers btn-gen click.
    - Pressing Enter with focus in #adm-pw does NOT trigger btn-gen (admin password has its own handler).
    - Pressing Enter with focus inside any textarea does NOT trigger btn-gen.
    - Pressing Esc anywhere except inside an admin modal input triggers btn-reset click (which shows its confirm dialog from Task 1).
    - Switching tabs between #tab-saisie and #tab-resultat updates the breadcrumb highlight. The breadcrumb is hidden on #page-proposition and #page-admin.
  </behavior>
  <action>
    **1. .invalid CSS (COMPONENTS section):**
    ```css
    .invalid, .dg.invalid{border-color:var(--danger)!important;background:rgba(220,38,38,.05)!important;}
    .dg.invalid button{border-color:var(--danger)!important;}
    ```

    **2. Validation wiring (INIT section, after bindAll or wherever event binding lives):**
    Define a list: `const REQUIRED_FIELDS = ['partner-co','partner-name','client-co','client-name','amount'];`
    For each id in that list:
    ```js
    const el = $(id);
    if (!el) return;
    el.addEventListener('blur', () => { if (!el.value.trim()) el.classList.add('invalid'); });
    el.addEventListener('input', () => el.classList.remove('invalid'));
    ```
    For the duration group, get the `.dg` wrapper element and add a click listener on each child button that removes `.invalid` from the wrapper.

    **3. Auto-focus on failed submit (UX-07, replace lines ~798-800):**
    Inside `generate()`, before the existing alert() trio, write:
    ```js
    const missing = [];
    for (const id of REQUIRED_FIELDS) {
      const el = $(id);
      if (!el.value.trim()) { el.classList.add('invalid'); missing.push(el); }
    }
    const durWrap = document.querySelector('.dg'); // or actual duration wrapper
    if (!dur) { durWrap.classList.add('invalid'); }
    if (missing.length || !dur) {
      showToast('Veuillez renseigner tous les champs requis.', 'err');
      (missing[0] || durWrap.querySelector('button')).focus();
      return;
    }
    ```
    Remove the three separate `alert()` calls at ~798-800; the new block replaces them. Keep the `confirm()` at line 802 (expired coefficients) and the `alert()` at line 808 is already converted in Task 1.

    **4. Keyboard shortcuts (UX-05, UX-06) — add at end of INIT:**
    ```js
    document.addEventListener('keydown', (e) => {
      const tgt = e.target;
      const tag = tgt.tagName;
      const id = tgt.id;
      // Enter → btn-gen
      if (e.key === 'Enter' && tag !== 'TEXTAREA' && id !== 'adm-pw' && id !== 'new-pw' && id !== 'current-pw' && !tgt.isContentEditable) {
        // only fire if Saisie page is visible (avoid double-fire from inside modal forms)
        if ($('page-saisie') && $('page-saisie').style.display !== 'none') {
          e.preventDefault();
          $('btn-gen').click();
        }
      }
      // Esc → btn-reset (with confirm from Task 1)
      if (e.key === 'Escape' && id !== 'adm-pw' && id !== 'new-pw' && id !== 'current-pw') {
        $('btn-reset').click();
      }
    });
    ```
    **Critical:** match the admin input id list to what actually exists in v10 (grep `id="adm-pw"`, `id="new-pw"`, `id="current-pw"` — adjust if names differ).

    **5. Progress breadcrumb (UX-04):**
    Add HTML right below the existing tabs bar (find the tabs container — likely `<div class="tabs">` or similar — insert sibling below):
    ```html
    <div id="breadcrumb" class="bc">
      <span class="bc-step" data-step="1"><span class="bc-dot"></span>1. Saisie</span>
      <span class="bc-sep">→</span>
      <span class="bc-step" data-step="2"><span class="bc-dot"></span>2. Résultat</span>
      <span class="bc-sep">→</span>
      <span class="bc-step" data-step="3"><span class="bc-dot"></span>3. Proposition</span>
    </div>
    ```
    Add CSS:
    ```css
    .bc{display:flex;gap:.5rem;align-items:center;padding:.5rem 1rem;font-size:.85rem;color:#888;}
    .bc-step{display:flex;gap:.35rem;align-items:center;}
    .bc-dot{width:.75rem;height:.75rem;border-radius:50%;border:2px solid #ccc;background:transparent;}
    .bc-step.step-done .bc-dot{background:var(--green);border-color:var(--green);}
    .bc-step.step-current{color:var(--teal);font-weight:600;}
    .bc-step.step-current .bc-dot{background:var(--teal);border-color:var(--teal);}
    @media print{.bc{display:none!important;}}
    ```
    Add `updateBreadcrumb(step)` helper in UTILS:
    ```js
    const updateBreadcrumb = (step) => {
      const bc = $('breadcrumb');
      if (!bc) return;
      // hide on proposition + admin
      const propVisible = $('page-proposition') && $('page-proposition').style.display !== 'none';
      const adminVisible = $('page-admin') && $('page-admin').style.display !== 'none';
      bc.style.display = (propVisible || adminVisible) ? 'none' : 'flex';
      bc.querySelectorAll('.bc-step').forEach(s => {
        const n = parseInt(s.dataset.step, 10);
        s.classList.toggle('step-done', n < step);
        s.classList.toggle('step-current', n === step);
        s.classList.toggle('step-pending', n > step);
      });
    };
    window.updateBreadcrumb = updateBreadcrumb;
    ```
    Call it from the tab switch handler: when showing page-saisie → `updateBreadcrumb(1)`; page-resultat → `updateBreadcrumb(2)`; page-proposition → `updateBreadcrumb(3)` (which hides it anyway).
    Also call once on DOMContentLoaded after initial page reveal: `updateBreadcrumb(1)`.

    **6. Do not break:**
    - assertCalc/assertEscape still run untouched at end of init.
    - DOMContentLoaded order preserved (Phase 2 made it async for password migration — keep the await chain).
  </action>
  <verify>
    <automated>grep -n "REQUIRED_FIELDS\|updateBreadcrumb\|class=\"bc\"\|\.invalid\|keydown" Matrice_2026_THE_Leasetic-v10.html | head -20 &amp;&amp; grep -c "showToast" Matrice_2026_THE_Leasetic-v10.html</automated>
    Manual: open v10, focus #client-co then tab away → red border. Type a char → red clears. Click Générer with empty fields → toast appears, #partner-co (or first missing) gets focus. Focus #amount, press Enter → btn-gen fires. Open admin panel, focus #adm-pw, press Enter → admin login fires (NOT btn-gen). Press Esc → confirm dialog. Switch to Résultat tab → breadcrumb shows step 2 highlighted. Switch to Proposition → breadcrumb hidden. Reload page → console shows calcRent 6/6 ✓ and escapeHtml 8/8 ✓.
  </verify>
  <done>
    .invalid CSS in place, blur/input handlers wired on all 5 required fields + duration wrapper, generate() auto-focuses first missing field with toast, Enter shortcut fires btn-gen (guarded against textareas + all 3 admin password inputs), Esc fires btn-reset (which confirms), breadcrumb visible on Saisie/Résultat with correct current step, hidden on Proposition/Admin + print, assertCalc + assertEscape still green.
  </done>
</task>

</tasks>

<verification>
- `grep -c "showToast(" Matrice_2026_THE_Leasetic-v10.html` ≥ 7 (helper def + 5+ call sites + validation toast + window exposure)
- `grep -c "alert(" Matrice_2026_THE_Leasetic-v10.html` dropped significantly from baseline (only validation-site alerts remain if any were preserved — expected 0 in generate, expected 0 in admin save/password paths)
- `grep -n "confirm('Réinitialiser" Matrice_2026_THE_Leasetic-v10.html` → exactly 1 match
- `grep -n "REQUIRED_FIELDS" Matrice_2026_THE_Leasetic-v10.html` → at least 1 definition + 1+ usage
- `grep -n "updateBreadcrumb" Matrice_2026_THE_Leasetic-v10.html` → ≥ 4 matches (def + window expose + 3+ calls)
- Open v10 in Chrome: console shows `calcRent formula: 6/6 fixtures pass ✓` AND `escapeHtml: 8/8 fixtures pass ✓`.
- Full UX smoke: empty submit → toast + focus; Enter in amount → generate; Esc → confirm; tab switch → breadcrumb updates.
</verification>

<success_criteria>
- All 5 alert() success/info sites converted to toast (UX-01, UX-08).
- btn-reset shows confirm() (UX-02, closes PARITY-21).
- Required fields get .invalid on blur (UX-03).
- Générer auto-focuses first empty field (UX-07).
- Enter triggers generate with correct guards (UX-05).
- Esc triggers reset confirm (UX-06).
- Breadcrumb visible on Saisie/Résultat with correct state (UX-04).
- No regression in assertCalc or assertEscape on-load checks.
- Single atomic commit.
</success_criteria>

<output>
After completion, create `.planning/phases/03-ux-polish-i18n/03-01-ux-primitives-SUMMARY.md` documenting:
- showToast() call sites enumerated
- Exact line of the confirm('Réinitialiser...') insertion
- REQUIRED_FIELDS ids used (for Plan 02 i18n key mapping)
- Any inline FR strings introduced (Plan 02 will convert these to t() calls)
- Keyboard guards applied (exact id list)
</output>
