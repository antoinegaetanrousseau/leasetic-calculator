---
phase: 03-ux-polish-i18n
plan: 03
type: execute
wave: 3
depends_on:
  - 03-01
  - 03-02
files_modified:
  - Matrice_2026_THE_Leasetic-v10.html
  - .planning/phases/03-ux-polish-i18n/FINAL-TEST.md
autonomous: true
requirements:
  - UX-09
  - UX-10
  - FEAT-04
  - FEAT-05
  - FEAT-06
  - TEST-01
  - TEST-03
  - TEST-04
  - TEST-05
gap_closure: false

must_haves:
  truths:
    - "The Résultat tab shows a line 'Coefficient appliqué : X.XXXX %' when the result is computed (hidden in 'sur demande' mode)."
    - "A 'Copier la référence' button next to LC-XXXXX copies the reference to clipboard and shows a toast confirmation."
    - "An admin sets validity to 60 days; the next generated proposal shows an expiry date exactly 60 days after the generation date."
    - "The inline result area is clearly labeled 'Aperçu' / 'Preview' and visually distinct from the final Résultat tile — no duplicate calc logic."
    - "FINAL-TEST.md exists with 8 sections (A-H) covering PARITY + SEC + UX + FR/EN + migration + browser matrix + sign-off, runnable in under 90 minutes."
    - "Every new string in this plan (coefficient label, copy button, toast.copied, validity label, aperçu label) exists in both FR and EN inside the I18N dictionary."
  artifacts:
    - path: "Matrice_2026_THE_Leasetic-v10.html"
      provides: "Coefficient row in renderResult, copy-ref button + clipboard handler + toast, #validity-days admin field + lt_validity persistence + getValidity() helper, expiryDate() rewrite using days arithmetic, Aperçu label + visual distinction on inline-res, new i18n keys."
      contains: "getValidity"
    - path: ".planning/phases/03-ux-polish-i18n/FINAL-TEST.md"
      provides: "Master manual test checklist covering every Phase 3 REQ plus regressions from Phase 1/2, FR + EN smoke runs, migration re-test, browser matrix, sign-off block."
      contains: "Sign-off"
  key_links:
    - from: "admin #validity-days dropdown"
      to: "lt_validity localStorage key"
      via: "saveCoeffs() persist + getValidity() read"
      pattern: "lt_validity|getValidity"
    - from: "expiryDate() function"
      to: "getValidity() * 86400000"
      via: "Date arithmetic (genDate + days)"
      pattern: "getValidity\\(\\)"
    - from: "copy-ref button click"
      to: "navigator.clipboard.writeText + showToast(t('toast.copied'))"
      via: "onclick handler"
      pattern: "navigator.clipboard|toast.copied"
---

<objective>
Ship the remaining Phase 3 features (coefficient display, copy LC button, validity override, aperçu labeling) and deliver the master manual test checklist that Antoine will run for ship sign-off.

Purpose: Close Phase 3 with everything validated in a single dry-run pass. New strings are added directly to the Plan 02 i18n dictionary so FR/EN coverage stays complete. The FINAL-TEST.md is the gate for ship — no merge to final without green rows.

Output: v10 with all feature work done, FINAL-TEST.md checklist ready for Antoine's runbook session in Chrome + Edge, FR + EN.
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
@.planning/phases/03-ux-polish-i18n/03-01-ux-primitives-SUMMARY.md
@.planning/phases/03-ux-polish-i18n/03-02-i18n-infrastructure-SUMMARY.md
@.planning/phases/01-parity-refactor/PARITY-AUDIT.md
@.planning/phases/02-security-hardening/SEC-TEST.md
@Matrice_2026_THE_Leasetic-v10.html

<interfaces>
<!-- Helpers available after Plans 01 + 02 -->

- `$(id)`, `escapeHtml(s)` (Phase 2)
- `showToast(msg, type, duration)` (Plan 01)
- `updateBreadcrumb(step)` (Plan 01)
- `t(key, ...args)` + `applyI18n()` + `I18N = {fr, en}` (Plan 02)
- `lastGen` + `rerenderProposalIfActive()` (Plan 02)
- `renderResult()` at line ~828 (now calling t() for labels after Plan 02)
- `expiryDate(dateStr)` at line ~576 — CURRENT implementation uses French date-string parsing + 1-month add. Plan 03 replaces it.
- `saveCoeffs()` — Phase 2 async, reads #cm (commission), #mx (max), 12 coeff inputs, current-pw. Plan 03 extends to read #validity-days.
- CALC section location for getValidity() helper

New i18n keys this plan adds (must land in BOTH fr: and en: inside the I18N dictionary):
- `result.coefficient.label` — fr "Coefficient appliqué", en "Applied coefficient"
- `button.copy.ref` — fr "📋 Copier la référence", en "📋 Copy reference"
- `toast.copied` — fr "Référence copiée.", en "Reference copied."
- `admin.section.validity` — fr "Validité proposition (jours)", en "Proposal validity (days)"
- `result.inline.apercu` — fr "Aperçu", en "Preview"
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Coefficient display + copy LC button + Aperçu labeling + i18n key additions</name>
  <files>Matrice_2026_THE_Leasetic-v10.html</files>
  <behavior>
    - Générer → go to Résultat tab → see "Coefficient appliqué : 1.8765 %" below the result tile. On 'sur demande' result, the line is absent.
    - Click "Copier la référence" next to the LC-XXXXX reference → clipboard holds the reference text → green toast "Référence copiée." appears.
    - Above #inline-res in the Saisie tab, an "Aperçu" label is visible; the inline block has a lighter border and muted background vs the final Résultat tab card.
    - Switching lang to EN swaps "Coefficient appliqué" → "Applied coefficient", "Copier la référence" → "Copy reference", "Aperçu" → "Preview".
  </behavior>
  <action>
    **1. Add i18n keys** to the I18N dictionary from Plan 02 (in BOTH fr: and en:):
    - `result.coefficient.label` → "Coefficient appliqué" / "Applied coefficient"
    - `button.copy.ref` → "📋 Copier la référence" / "📋 Copy reference"
    - `toast.copied` → "Référence copiée." / "Reference copied."
    - `result.inline.apercu` → "Aperçu" / "Preview"

    **2. Coefficient display (UX-09):**
    In `renderResult()` (line ~828), inside the template that builds the result card, append a new row AFTER the existing content but BEFORE the closing tag. Example:
    ```js
    const coefLine = onDemand
      ? ''
      : `<div class="coef-line" style="margin-top:.5rem;font-size:.9rem;color:#555">${t('result.coefficient.label')} : ${(coef).toFixed(4)}\u202f%</div>`;
    ```
    Insert `${coefLine}` into the existing `res-detail` template. `onDemand` is the existing flag used when amount > max. `coef` is the already-looked-up coefficient in that render path (grep for the variable name — likely `c` or `coeff`).
    Do NOT recompute the coefficient — reuse the one the render already picked.
    Do NOT display the commission or any intermediate value (PARITY-22 guardrail).

    **3. Copy LC reference button (UX-10):**
    Add a small button next to the reference in Résultat tab's render output AND in the Proposition tab's rendered reference element. For each site, inject:
    ```html
    <button class="btn btn-out btn-copy-ref" data-ref="LC-XXXXX" data-i18n="button.copy.ref">📋 Copier la référence</button>
    ```
    In INIT (or inside the render function, wired after each render call), bind click handlers:
    ```js
    document.querySelectorAll('.btn-copy-ref').forEach(btn => {
      btn.onclick = async () => {
        const ref = btn.dataset.ref || (lastGen && lastGen.ref);
        if (!ref) return;
        try {
          await navigator.clipboard.writeText(ref);
          showToast(t('toast.copied'), 'ok');
        } catch (e) {
          // fallback: select text in a hidden input
          const ta = document.createElement('textarea');
          ta.value = ref;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); showToast(t('toast.copied'), 'ok'); }
          catch (e2) { showToast('Copy failed', 'err'); }
          ta.remove();
        }
      };
    });
    ```
    The button is re-rendered on every generate() + every lang toggle (via rerenderProposalIfActive), so the bind must run inside renderResult/p1p2 after they populate the DOM, OR via event delegation on `document` (cleaner — use delegation to avoid re-bind bugs):
    ```js
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-copy-ref');
      if (!btn) return;
      const ref = btn.dataset.ref || (lastGen && lastGen.ref);
      if (!ref) return;
      try { await navigator.clipboard.writeText(ref); showToast(t('toast.copied'), 'ok'); }
      catch { /* fallback textarea path as above */ }
    });
    ```
    Prefer delegation — one listener, no rebind needed.

    **4. Aperçu labeling (FEAT-06):**
    Above `#inline-res` in the Saisie tab HTML, insert:
    ```html
    <div class="apercu-label" style="font-size:.8rem;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem" data-i18n="result.inline.apercu">Aperçu</div>
    ```
    Add CSS to visually distinguish #inline-res from the Résultat tab's final tile:
    ```css
    #inline-res{border:1px dashed #ccc;background:rgba(0,0,0,.02);}
    ```
    The Résultat tab's final tile keeps its existing stronger border/background. Do NOT duplicate calcRent logic — the existing updateInline() flow is untouched.

    **5. Guardrails:**
    - The new coefficient line is inside the escape-safe template — do not interpolate user input into it.
    - Commission stays invisible (PARITY-22): the coefficient is the tranche coefficient, NOT commission-loaded.
    - Do NOT touch assertCalc/assertEscape.
    - Do NOT break the "sur demande" branch — hide the coefficient line via the ternary.
  </action>
  <verify>
    <automated>grep -n "result.coefficient.label\|btn-copy-ref\|toast.copied\|apercu-label\|result.inline.apercu" Matrice_2026_THE_Leasetic-v10.html</automated>
    Manual: open v10 → fill form → Générer → Résultat tab shows coefficient line with 4 decimals → click copy button → toast "Référence copiée." → paste into text editor → see LC-XXXXX. Test 'sur demande' path by entering amount > lt_max → coefficient line hidden. Toggle lang → all three new strings flip.
  </verify>
  <done>
    Coefficient line in renderResult output (hidden on onDemand), copy button in Résultat + Proposition with event delegation, aperçu label + styling on inline-res, 4 new i18n keys in dictionary (fr + en), no calcRent / escapeHtml regression, commission not leaked.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Validity override (admin dropdown + getValidity + expiryDate rewrite) + FINAL-TEST.md</name>
  <files>Matrice_2026_THE_Leasetic-v10.html, .planning/phases/03-ux-polish-i18n/FINAL-TEST.md</files>
  <behavior>
    - Admin panel shows a new "Validité proposition (jours)" dropdown with 15/30/60 options, default 30.
    - Saving admin persists the choice to `lt_validity`.
    - Next Générer call produces a proposal whose expiry date is exactly `genDate + lt_validity days`, formatted in the current lang's long-date format.
    - Switching lang re-renders the proposal with the expiry date re-formatted (FR: "15 juin 2026", EN: "June 15, 2026").
    - FINAL-TEST.md exists in the phase directory with 8 sections (A-H) and every REQ-ID from Phase 3 has at least one row.
  </behavior>
  <action>
    **1. Add i18n key** to dictionary:
    - `admin.section.validity` → "Validité proposition (jours)" / "Proposal validity (days)"

    **2. Admin dropdown HTML** — inside the admin panel, near commission/max fields, add:
    ```html
    <label data-i18n="admin.section.validity">Validité proposition (jours)</label>
    <select id="validity-days">
      <option value="15">15</option>
      <option value="30">30</option>
      <option value="60">60</option>
    </select>
    ```

    **3. Storage wiring:**
    - In STATE or CALC, add helper:
      ```js
      const getValidity = () => {
        const v = parseInt(localStorage.getItem('lt_validity'), 10);
        return (v === 15 || v === 30 || v === 60) ? v : 30;
      };
      window.getValidity = getValidity;
      ```
    - On admin panel open (loadCoeffs or equivalent), pre-select the dropdown: `$('validity-days').value = getValidity();`
    - In `saveCoeffs()` (Phase 2 async), after the existing coeff writes, persist: `localStorage.setItem('lt_validity', $('validity-days').value);`

    **4. expiryDate() rewrite (FEAT-05):**
    Replace the current implementation at line ~576 with a clean Date-arithmetic version:
    ```js
    const expiryDate = (dateStr) => {
      // dateStr: "DD month YYYY" (FR long date) — genDate source
      // Rebuild a Date object, add getValidity() days, reformat in currentLang
      const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
      const parts = String(dateStr).trim().split(/\s+/);
      let base;
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthIdx = MONTHS_FR.indexOf(parts[1].toLowerCase());
        const year = parseInt(parts[2], 10);
        base = (monthIdx >= 0) ? new Date(year, monthIdx, day) : new Date(dateStr);
      } else {
        base = new Date(dateStr);
      }
      if (isNaN(base.getTime())) base = new Date();
      const target = new Date(base.getTime() + getValidity() * 86400000);
      // format in current lang
      const locale = currentLang === 'en' ? 'en-US' : 'fr-FR';
      return target.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    };
    ```
    **Backward compat:** if `lt_validity` is missing, `getValidity()` returns 30 → matches current v10's ~1-month behavior (within 1-day precision, acceptable).
    **Important:** the `proposal.conditions` template from Plan 02 already uses `{0}` = `expiryDate(d.ds)`. This rewrite is transparent to that call site.

    **5. FINAL-TEST.md — create at `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md`:**

    Structure (use Markdown tables, checkbox rows):
    ```markdown
    # FINAL TEST — Matrice Commerciale v10

    **Purpose:** Master manual checklist for Phase 3 ship sign-off.
    **Runtime:** ~60-90 min in Chrome (mandatory), ~15 min re-run in Edge (mandatory).
    **Runner:** Antoine.
    **Prerequisites:** Phase 1 PARITY-AUDIT.md smoke runbook green; Phase 2 SEC-TEST.md Sections A-E green.

    ## Section A — PARITY regression re-run

    Link: `.planning/phases/01-parity-refactor/PARITY-AUDIT.md`

    Re-run the 31-check browser smoke runbook on post-Phase-3 v10 to confirm zero regressions. One row per check, status: pass/fail/notes.

    (Reference the existing table — do not duplicate here.)

    - [ ] All 31 PARITY-AUDIT browser smoke checks pass on post-Phase-3 v10

    ## Section B — SECURITY regression re-run

    Link: `.planning/phases/02-security-hardening/SEC-TEST.md`

    Re-run SEC-TEST Sections A-E (password flow + XSS fixtures + user-sourced sites audit).

    - [ ] SEC-TEST.md Section A (password migration)
    - [ ] SEC-TEST.md Section B (password change)
    - [ ] SEC-TEST.md Section C (XSS fixtures)
    - [ ] SEC-TEST.md Section D (escapeHtml self-check)
    - [ ] SEC-TEST.md Section E (23-row user-source audit)

    ## Section C — UX + FEAT checks (Phase 3 core)

    One row per Phase 3 REQ. Steps, expected, actual, pass/fail.

    | REQ | Steps | Expected | Result |
    |-----|-------|----------|--------|
    | UX-01 | Admin panel → Save | Green toast top-right "Coefficients enregistrés." (FR) / "Coefficients saved." (EN), no blocking alert | [ ] |
    | UX-02 | Click Réinitialiser | Confirm dialog appears; Cancel aborts; OK clears client+project fields only (partner preserved) | [ ] |
    | UX-03 | Focus #client-co, tab away | Red border appears (.invalid class) | [ ] |
    | UX-04 | Switch tab to Résultat | Breadcrumb highlights step 2; switch to Proposition → breadcrumb hidden | [ ] |
    | UX-05 | Focus #amount, press Enter | btn-gen fires (validation or generation) | [ ] |
    | UX-05b | Focus #adm-pw, press Enter | Admin login fires; btn-gen does NOT fire | [ ] |
    | UX-06 | Press Esc anywhere in Saisie | Confirm dialog appears, OK triggers reset | [ ] |
    | UX-07 | Click Générer with empty #client-co | First empty field gets focus, error toast "Veuillez renseigner..." | [ ] |
    | UX-08 | Admin password change success | Green toast "Mot de passe modifié.", no alert | [ ] |
    | UX-09 | Générer a proposal | Résultat shows "Coefficient appliqué : X.XXXX %"; 'sur demande' hides the line | [ ] |
    | UX-10 | Click "Copier la référence" | Toast "Référence copiée."; clipboard holds LC-XXXXX | [ ] |
    | FEAT-01 | Click EN toggle in header | Lang switches; reload page → still EN | [ ] |
    | FEAT-02 | Inspect any visible string | Sourced from I18N via data-i18n or t() | [ ] |
    | FEAT-03 | Generate proposal, toggle lang | Proposal re-renders fully in new lang; RSE caption bilingual; tiles bilingual | [ ] |
    | FEAT-04 | Admin → Validité = 60 → Save | lt_validity = 60 in localStorage | [ ] |
    | FEAT-05 | Générer after FEAT-04 | Expiry date = genDate + 60 days, formatted in current lang | [ ] |
    | FEAT-06 | Saisie tab | "Aperçu" label above inline-res, distinct visual styling vs Résultat tile | [ ] |

    ## Section D — FR smoke run (full flow)

    Steps: open fresh v10 → confirm lang = FR → fill partner (Memento, Antoine) → fill client (Acme SAS, Jean Dupont, 12345 6789, 06 06 06 06 06) → amount 45 000 € → duration 48 mois → Générer → Résultat → Proposition → Imprimer/PDF → inspect PDF for 2 pages, commission-free, correct LC ref, correct expiry date.

    - [ ] FR smoke: partner fill
    - [ ] FR smoke: client fill with auto-formatting (SIREN + phone)
    - [ ] FR smoke: amount auto-formats with thin-space
    - [ ] FR smoke: tranche badge appears above duration
    - [ ] FR smoke: inline-res live updates (Aperçu)
    - [ ] FR smoke: Résultat tab shows coef line + copy button
    - [ ] FR smoke: Proposition renders both pages
    - [ ] FR smoke: PDF export 2 A4 pages, commission-free
    - [ ] FR smoke: filename = yyyy-mm-dd_Acme_Memento_THE_LC-XXXXX

    ## Section E — EN smoke run (full flow)

    Steps: click EN toggle BEFORE filling → same flow as Section D → verify every label is EN → verify proposal page 1 + 2 labels + tiles all EN → verify RSE caption "Our CSR commitment" visible → PDF export still 2 pages.

    - [ ] EN smoke: full flow mirrors Section D in English
    - [ ] EN smoke: PDF expiry date formatted "Month D, YYYY"
    - [ ] EN smoke: RSE caption EN
    - [ ] EN smoke: all 5 tiles EN

    ## Section F — Migration re-test (TEST-05)

    1. Clear localStorage completely.
    2. Open v10 → confirm defaults (FR, lt_pw = hash of leasetic2025, lt_validity = 30).
    3. Clear localStorage again.
    4. Inject a v9-style plaintext payload: `lt_pw = "leasetic2025"`, a partner co + name, lt_coeffs populated, lt_comm, lt_max, lt_qtr.
    5. Reload v10 → confirm migration upgrades lt_pw to hash, all other keys intact, partner co + name still pre-filled.
    6. Toggle EN → reload → confirm migrated data still visible, lang still EN.
    7. Fill form + Générer in EN → Modifier → toggle FR → Proposition tab → verify proposal re-rendered in FR with same data.

    - [ ] Fresh install: defaults correct
    - [ ] v9 plaintext injected: migration runs silently
    - [ ] Post-migration: partner pre-fill intact
    - [ ] Post-migration: hashed lt_pw in localStorage
    - [ ] Cross-lang: FR→EN→FR preserves form state + re-renders proposal

    ## Section G — Browser matrix

    - [ ] Chrome latest — all of A-F green (MANDATORY)
    - [ ] Edge latest — all of A-F green (MANDATORY)
    - [ ] Firefox latest — A-F best-effort (optional, document any issues)
    - [ ] Safari latest — A-F best-effort (optional, document any issues)

    ## Section H — Sign-off

    - [ ] All mandatory sections green
    - [ ] Any red rows documented with reproduction steps
    - [ ] Antoine approves ship

    **Signed:** ___________ **Date:** ___________
    ```

    **6. Guardrails:**
    - FINAL-TEST.md lives in `.planning/phases/03-ux-polish-i18n/` — do not scatter.
    - Every Phase 3 REQ-ID (UX-01..10, FEAT-01..06) has at least one row in Section C.
    - TEST-01 = Sections A + G (PARITY re-run in Chrome + Edge).
    - TEST-03 = Section C.
    - TEST-04 = Sections D + E.
    - TEST-05 = Section F.
    - The FINAL-TEST.md delivers the 4 TEST REQs by acting as the single runbook — execution by Antoine, but authorship is Plan 03's scope.
  </action>
  <verify>
    <automated>grep -n "getValidity\|lt_validity\|validity-days" Matrice_2026_THE_Leasetic-v10.html &amp;&amp; test -f ".planning/phases/03-ux-polish-i18n/FINAL-TEST.md" &amp;&amp; grep -c "^| " .planning/phases/03-ux-polish-i18n/FINAL-TEST.md | awk '{if($1>=15)print"OK "$1;else{print"FAIL "$1;exit 1}}' &amp;&amp; grep -c "Section [A-H]" .planning/phases/03-ux-polish-i18n/FINAL-TEST.md</automated>
    Manual: open v10 → admin → set validity = 60 → save → localStorage shows lt_validity=60 → logout admin → Générer a new proposal → Proposition tab → expiry date = today + 60 days (FR format). Toggle EN → expiry date re-formats as "Month D, YYYY". Set validity back to 15 → expiry date shifts to today + 15.
  </verify>
  <done>
    #validity-days exists in admin HTML, saveCoeffs persists lt_validity, getValidity() helper, expiryDate() rewritten with Date arithmetic + locale-aware formatting, proposal.conditions template (Plan 02) continues to work unchanged, FINAL-TEST.md exists at the right path with all 8 sections and ≥15 rows in Section C, all Phase 3 REQ-IDs represented, assertCalc + assertEscape still green.
  </done>
</task>

</tasks>

<verification>
- `grep -n "result.coefficient.label\|btn-copy-ref\|lt_validity\|getValidity\|admin.section.validity\|result.inline.apercu\|rse-caption" Matrice_2026_THE_Leasetic-v10.html` → all present
- `test -f .planning/phases/03-ux-polish-i18n/FINAL-TEST.md` → true
- FINAL-TEST.md contains Sections A, B, C, D, E, F, G, H (grep confirms)
- FINAL-TEST.md Section C has ≥16 REQ rows covering UX-01..10 + FEAT-01..06
- Open v10 in Chrome: console shows calcRent 6/6 ✓ + escapeHtml 8/8 ✓
- Full E2E: set validity = 60 → generate → verify expiry = today + 60; toggle lang → verify expiry re-formats; click copy-ref → verify clipboard + toast
- Single atomic commit for code, separate atomic commit for FINAL-TEST.md (or combined — Antoine's call per YOLO mode)
</verification>

<success_criteria>
- UX-09: Coefficient line visible in Résultat tab, 4 decimals, hidden on onDemand.
- UX-10: Copy button in Résultat + Proposition, clipboard API + fallback, toast confirmation.
- FEAT-04: Admin dropdown, lt_validity persisted, default 30.
- FEAT-05: expiryDate() uses getValidity() days, backward compatible.
- FEAT-06: Aperçu label + visual distinction on inline-res, no calc logic duplication.
- TEST-01, TEST-03, TEST-04, TEST-05: FINAL-TEST.md delivers the 4 runbooks as a single master checklist.
- No regression in assertCalc, assertEscape, PARITY-22 (commission hidden), Phase 2 escape contract.
- Phase 3 complete, ready for Antoine's final runbook.
</success_criteria>

<output>
After completion, create `.planning/phases/03-ux-polish-i18n/03-03-features-and-final-test-SUMMARY.md` documenting:
- New i18n keys added (5 total: result.coefficient.label, button.copy.ref, toast.copied, admin.section.validity, result.inline.apercu)
- getValidity() / expiryDate() rewrite details (exact line numbers, backward-compat notes)
- FINAL-TEST.md section headers + row counts
- Confirmation that assertCalc + assertEscape still pass on load
- Handoff note to Antoine: run FINAL-TEST.md in Chrome + Edge before shipping, target total runtime ~90 min
- Phase 3 REQ coverage: 9/9 REQs in this plan shipped (UX-09, UX-10, FEAT-04, FEAT-05, FEAT-06, TEST-01, TEST-03, TEST-04, TEST-05)
</output>
