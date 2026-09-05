---
phase: 04
plan: 03
type: execute
wave: 3
depends_on:
  - "04-01"
  - "04-02"
files_modified:
  - Matrice_2026_THE_Leasetic-v10.html
  - .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md
  - .planning/phases/03-ux-polish-i18n/FINAL-TEST.md
requirements:
  - DESIGN-07
autonomous: true
must_haves:
  truths:
    - "Topbar title renders in Plus Jakarta Sans 1.15rem/600, color --ink"
    - "Card section titles (.ctitle) render at 0.85rem/600 uppercase with 0.06em letter-spacing, color --muted"
    - "Field labels render at 0.78rem/500"
    - "Input text renders at 0.95rem (carried from Plan 04-02; this plan just confirms)"
    - "Body text renders at 0.9rem with 1.55 line-height"
    - "Footer renders at 0.75rem color --muted"
    - "Sidebar nav items render at 0.88rem/500"
    - "Section-to-section gap is 2rem (increased from 1.6rem), card padding is 2rem (from Plan 04-02), sidebar padding is 1.5rem horizontal with 0.75rem per nav item"
    - "Proposal body typography is UNCHANGED — the print output must remain byte-identical to Phase 1"
    - "FINAL-TEST-v11.md exists at .planning/phases/04-sidebar-shell-design-v2/ with sections A-J: PARITY re-run, SEC re-run, UX/FEAT re-run (post-shell locations), DESIGN-01..12 visual verification, FR smoke, EN smoke, Migration re-test, Print mode test, Browser matrix, Ship sign-off"
    - "Phase 3's FINAL-TEST.md is marked as superseded (either renamed with -superseded suffix or carries a header note pointing to FINAL-TEST-v11.md)"
    - "All 4 on-load self-checks still log green (migration + assertCalc 6/6 + assertEscape 8/8 + assertValidity 6/6)"
  artifacts:
    - path: Matrice_2026_THE_Leasetic-v10.html
      provides: "Bumped typographic scale + spacing rhythm across shell chrome; proposal body untouched"
      contains: "font-size:1.15rem (topbar-title), .ctitle font-size:0.85rem, body font-size:0.9rem, line-height:1.55"
    - path: .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md
      provides: "Master manual ship-gate runbook superseding FINAL-TEST.md"
      contains: "## Section A. PARITY re-run, ## Section B. SEC re-run, ## Section C. UX + FEAT tests, ## Section D. DESIGN-01..12, ## Section E. FR smoke, ## Section F. EN smoke, ## Section G. Migration re-test, ## Section H. Print mode test, ## Section I. Browser matrix, ## Section J. Ship sign-off"
    - path: .planning/phases/03-ux-polish-i18n/FINAL-TEST.md
      provides: "Header note or filename suffix marking supersession by FINAL-TEST-v11.md"
      contains: "SUPERSEDED or superseded"
  key_links:
    - from: "body typography"
      to: "spacious reading rhythm"
      via: "body font-size:0.9rem, line-height:1.55"
      pattern: "body\\s*\\{[^}]*font-size:\\s*0?\\.9rem"
    - from: "DESIGN-01..12 requirements"
      to: "FINAL-TEST-v11.md Section D rows"
      via: "one row per DESIGN-NN id, visual verification procedure"
      pattern: "DESIGN-01|DESIGN-02|DESIGN-03|DESIGN-04|DESIGN-05|DESIGN-06|DESIGN-07|DESIGN-08|DESIGN-09|DESIGN-10|DESIGN-11|DESIGN-12"
---

<objective>
Finalize Phase 4 by applying the locked typography and spacing scale to the shell chrome (topbar title, card titles, field labels, body, footer, sidebar nav), producing a Dashly-matched reading rhythm. Then deliver `FINAL-TEST-v11.md` — the master manual ship-gate runbook that supersedes Phase 3's `FINAL-TEST.md`. The new runbook covers PARITY re-run, SEC re-run, UX+FEAT feature tests updated for the new shell (e.g. Copy LC is now also in topbar), DESIGN-01..12 visual verification, FR/EN smoke flows through the new shell, migration re-test, print mode isolation test, browser matrix (Chrome+Edge), and the ship sign-off block.

Purpose: After this plan, Antoine has a single runbook to work through in Chrome + Edge; once all sections are green, v10-with-Phase-4-shell ships on 2026-04-18 EOD.

Output: Updated v10 HTML (typography + spacing bumps, proposal body untouched), new FINAL-TEST-v11.md (~200 lines), superseded FINAL-TEST.md.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-sidebar-shell-design-v2/04-CONTEXT.md
@.planning/phases/04-sidebar-shell-design-v2/04-01-shell-restructure-PLAN.md
@.planning/phases/04-sidebar-shell-design-v2/04-02-component-restyle-PLAN.md
@.planning/phases/03-ux-polish-i18n/FINAL-TEST.md
@.planning/phases/01-parity-refactor/PARITY-AUDIT.md
@.planning/phases/02-security-hardening/SEC-TEST.md
@Matrice_2026_THE_Leasetic-v10.html

<interfaces>
<!-- Typography scale (locked in CONTEXT, CONFIRMED by ROADMAP Success Criteria 3) -->

| Element | Size | Weight | Letter-spacing / transform |
|---------|------|--------|---------------------------|
| .topbar-title | 1.15rem | 600 | color: --ink |
| .ctitle (card section title) | 0.85rem | 600 | uppercase, .06em |
| label | 0.78rem | 500 | — |
| input text (already 0.95rem per Plan 04-02) | 0.95rem | 400 | — |
| body | 0.9rem | 400 | line-height: 1.55 |
| #footer span | 0.75rem | 400 | color: --muted |
| .sidebar-nav .nav-item | 0.88rem | 500 | — |

**Proposal body (inside #page-proposition) is UNCHANGED.** All typography below applies to the shell chrome and page-saisie/resultat/admin surfaces. The proposal page is a print-ready A4 document and its typography is part of Phase 1's audited parity — DO NOT TOUCH.

<!-- Spacing scale -->
- .two grid gap: 2rem (was 1.6rem in v10; confirm current value via grep and update)
- Card padding: 2rem (set in Plan 04-02 — verify unchanged)
- Sidebar padding: 1.5rem horizontal (Plan 04-01 set 1rem; update to 1.5rem to match CONTEXT spec), 0.75rem per nav item vertical (currently 0.6rem; bump slightly)
- Topbar padding: 1.5rem horizontal (Plan 04-01 already set)

<!-- FINAL-TEST.md to supersede — reference its 8-section structure -->
.planning/phases/03-ux-polish-i18n/FINAL-TEST.md has sections A-H:
- A. PARITY re-run → new A in v11: PARITY re-run (same semantics, note print PDF must be byte-identical to Phase 1)
- B. SEC re-run → new B
- C. UX + FEAT tests → new C, UPDATE locations for button relocations (Copy LC now in res-main AND topbar, Générer now in topbar, Réinitialiser now in topbar, FR/EN toggle now in sidebar bottom)
- D. FR smoke → new E (renumbered; new D is DESIGN tests)
- E. EN smoke → new F
- F. Migration → new G
- G. Browser matrix → new I
- H. Sign-off → new J
New sections in v11:
- D. DESIGN-01..12 visual verification (one row per requirement)
- H. Print mode isolation test (sidebar/topbar/footer hidden; #page-proposition identical to Phase 1)

<!-- Copy LC location decision (CONTEXT risk #8 — document explicitly in v11) -->
Copy LC button lives in TWO places after Phase 4:
1. Résultat tab res-main row (kept from Phase 3 Plan 03-03)
2. Proposition topbar action group (added in Plan 04-01)
Both attach to the same event-delegated `.btn-copy-ref` click handler. Both read from lastGen.ref (topbar) or btn.dataset.ref (res-main button). Both fire the same `toast.copied` on success. FINAL-TEST-v11.md Section C must have both rows.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Apply typography + spacing scale to shell chrome</name>
  <files>Matrice_2026_THE_Leasetic-v10.html</files>
  <behavior>
    After this task:
    - body has font-size: 0.9rem and line-height: 1.55
    - .topbar-title renders at 1.15rem/600 --ink (set in Plan 04-01; verify/adjust)
    - .ctitle renders at 0.85rem/600 uppercase with 0.06em letter-spacing --muted
    - label renders at 0.78rem/500
    - .sidebar-nav .nav-item renders at 0.88rem/500 (set in Plan 04-01; verify)
    - #footer text renders at 0.75rem --muted (set in Plan 04-01; verify)
    - .two grid gap is 2rem
    - #sidebar padding is 1.5rem horizontal, 1.5rem vertical top; .nav-item padding 0.75rem 0.8rem
    - Proposal body typography (inside #page-proposition) is UNCHANGED — verify by grepping proposal CSS selectors and leaving them untouched
    - Print output remains byte-identical to Phase 1
    - All 4 self-checks still log green
  </behavior>
  <action>
    1. **Update body base** in TOKENS or LAYOUT section:
       ```css
       body { font-size: 0.9rem; line-height: 1.55; /* grid rules from Plan 04-01 stay */ }
       ```
       If body currently has `font-size: 14px` or `font-size: 0.85rem`, replace with 0.9rem. If no line-height, add 1.55.

    2. **Update .ctitle** in COMPONENTS. Current: `font-size: 0.66rem`. Target:
       ```css
       .ctitle{font-size:0.85rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem;display:flex;align-items:center;gap:.4rem;}
       ```

    3. **Update label** in COMPONENTS. Current: `0.73rem`. Target:
       ```css
       label{display:block;font-size:0.78rem;font-weight:500;color:var(--muted);margin-bottom:.3rem;}
       ```

    4. **Verify/adjust .topbar-title** in LAYOUT. Plan 04-01 should already set 1.15rem/600. Re-confirm; if missing, set it.

    5. **Verify/adjust sidebar nav typography** in LAYOUT:
       ```css
       .sidebar-nav .nav-item{...font-size:0.88rem;font-weight:500;padding:0.75rem 0.8rem;...}
       ```
       Bump sidebar padding if Plan 04-01 set 1rem:
       ```css
       #sidebar{...padding:1.5rem 1.25rem;...}
       ```

    6. **Verify #footer typography**:
       ```css
       #footer{...font-size:0.75rem;color:var(--muted);...}
       ```

    7. **Update .two grid gap** — grep for `.two` rule. If current `gap: 1.6rem` or similar, update to `gap: 2rem`. Also increase section-to-section margin where appropriate (e.g. between .card blocks stacked vertically).

    8. **Guard the proposal body**:
       - `grep -n '\.prop-|\.prop-content|#page-proposition' Matrice_2026_THE_Leasetic-v10.html` to list all proposal-scoped selectors
       - Visually confirm NONE of the above typography edits touch those selectors
       - If any existing shell selector (.card, label, .ctitle) is reused INSIDE #page-proposition, add a scoped override to keep the proposal looking like Phase 1:
         ```css
         #page-proposition .ctitle{font-size:inherit;letter-spacing:normal;text-transform:none;}
         /* or equivalent — only needed if proposal visually regresses */
         ```
       - Do NOT add scoped overrides speculatively. Print-preview first; if identical to Phase 1, skip.

    9. **Smoke-verify in Chrome**:
       - Visual: larger, more legible section titles; more breathing room between cards; topbar title reads 1.15rem
       - Print preview: #page-proposition must render identically to Phase 1 (compare side-by-side if possible)
       - Self-checks green in console
  </action>
  <verify>
    <automated>grep -c 'font-size:\s*0\?\.85rem' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$' && grep -c 'font-size:\s*1\.15rem' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$' && grep -c 'font-size:\s*0\?\.9rem' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$' && grep -c 'line-height:\s*1\.55' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$' && grep -c 'letter-spacing:\s*0?\.06em' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$'</automated>
  </verify>
  <done>body, .topbar-title, .ctitle, label, .sidebar-nav .nav-item, #footer typography bumped per Phase 4 scale. .two grid gap is 2rem. Sidebar padding 1.5rem/1.25rem. Proposal body typography unchanged — print preview identical to Phase 1. Self-checks green.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Write FINAL-TEST-v11.md; supersede FINAL-TEST.md</name>
  <files>
    .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md,
    .planning/phases/03-ux-polish-i18n/FINAL-TEST.md
  </files>
  <behavior>
    After this task:
    - `.planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` exists with 10 sections (A-J) covering PARITY, SEC, UX+FEAT, DESIGN, FR smoke, EN smoke, migration, print mode, browser matrix, ship sign-off
    - The old `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md` carries a top-of-file supersession note pointing to FINAL-TEST-v11.md (do NOT rename; leave the file on disk for historical trace per CONTEXT)
    - Every DESIGN-01..12 id appears at least once in FINAL-TEST-v11.md Section D
    - Every UX-01..10 id appears in Section C (updated locations post-shell)
    - Every FEAT-01..06 id appears in Section C (updated locations post-shell)
    - Copy LC location in BOTH res-main AND topbar is documented as two separate test rows
    - The ship sign-off block in Section J has checkboxes for each mandatory section (A-I) and fields for reviewer, date, commit hash
  </behavior>
  <action>
    1. **Create FINAL-TEST-v11.md** at `.planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` with structure:
       ```markdown
       # FINAL-TEST v11 — Master Ship-Gate Runbook (Phase 4 shell)

       **Supersedes:** `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md`
       **Target build:** `Matrice_2026_THE_Leasetic-v10.html` post-Phase-4
       **Ship date:** 2026-04-18 EOD
       **Scope:** PARITY (Phase 1) + SEC (Phase 2) + UX/FEAT (Phase 3) + DESIGN (Phase 4) + migration + print + browser matrix + sign-off
       **Run order:** A → B → C → D → E → F → G → H → I → J
       **Estimated time:** ~90 min Chrome, ~20 min Edge spot-check

       ## On-load self-check gate (run FIRST — blocks everything else)
       Open v10 in Chrome with DevTools Console open. Confirm 4 green lines:
       - [ ] `[v10 migration] ...` (or `default password hashed` on fresh install)
       - [ ] `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓`
       - [ ] `[v10 self-check] escapeHtml: 8/8 fixtures pass ✓`
       - [ ] `[v10 self-check] getValidity: 6/6 fixtures pass ✓`
       If ANY is missing or FAILED: stop, investigate, re-run self-check gate before proceeding.

       ## Section A. PARITY re-run
       Link: `.planning/phases/01-parity-refactor/PARITY-AUDIT.md` — 31-check runbook
       Scope: PARITY-01..22 + MIGRATE-01 + MIGRATE-03 + REFACTOR-01..06
       Critical: the 2-page A4 PDF produced by `window.print()` on the Proposition page MUST render byte-identical to Phase 1's audited output. Side-by-side diff recommended. No sidebar, no topbar, no footer in print.
       - [ ] All 31 PARITY-AUDIT rows green
       - [ ] Print PDF byte-identical to Phase 1 baseline

       ## Section B. SEC re-run
       Link: `.planning/phases/02-security-hardening/SEC-TEST.md` — MIGRATE-02 + SEC-01..05 + TEST-02
       - [ ] All SEC-TEST.md sections A-E green
       - [ ] C5 canary `Dupont & Co <DSI>` renders correctly (no double-encoding)
       - [ ] C1 script-tag + C2 img-onerror payloads render as literal text

       ## Section C. UX + FEAT tests (post-shell locations)
       | REQ | Test | Location post-shell | Expected | Result |
       |-----|------|---------------------|----------|--------|
       | UX-01 | Admin save success toast | After Enregistrer in admin topbar | Green toast fires | ☐ |
       | UX-02 | Reset confirm dialog | Réinitialiser in topbar-saisie | confirm() shows before clear | ☐ |
       | UX-03 | Blur empty required field | partner-co, client-co, client-name, amount | Red invalid ring (12%) via new input CSS | ☐ |
       | UX-04 | Progress feedback | Sidebar active state + ● dot on Résultat/Proposition after generate | DESIGN-09 supersedes old breadcrumb | ☐ |
       | UX-05 | Enter triggers Générer | In Saisie form, Enter key | $('btn-gen').click() fires (btn-gen now in topbar-saisie group) | ☐ |
       | UX-06 | Esc triggers Réinitialiser | Any non-adm-pw context | $('btn-reset').click() fires (btn-reset now in topbar-saisie group) | ☐ |
       | UX-07 | Auto-focus failed required | Click Générer with empty partner-co | partner-co gains focus + invalid ring | ☐ |
       | UX-08 | Admin save green toast | Duplicate of UX-01 — confirm | Same | ☐ |
       | UX-09 | Coefficient in res-main | `Coefficient appliqué : X.XXXX %` | 4 decimals, hidden on onDemand | ☐ |
       | UX-10a | Copy LC from res-main | Button next to LC-XXXXX in res-main | Toast "Référence copiée." fires | ☐ |
       | UX-10b | Copy LC from topbar | Button in topbar-proposition action group (added Plan 04-01) | Same toast, reads lastGen.ref | ☐ |
       | UX-10c | Clipboard fallback | Disable clipboard API, retry | textarea fallback works | ☐ |
       | FEAT-01 | FR/EN toggle | Sidebar bottom segmented control (NOT header anymore) | Click EN → UI translates; reload → persists | ☐ |
       | FEAT-02 | I18N dict coverage | All sidebar, topbar, footer strings | No FR leakage in EN or vice versa | ☐ |
       | FEAT-03 | Proposal bilingual | #page-proposition (including RSE caption) | All labels + conditions + page2 flip with lang | ☐ |
       | FEAT-04 | Admin validity dropdown | #validity-days in admin panel | 15/30/60 select, persists to lt_validity | ☐ |
       | FEAT-05 | Expiry honors validity | Set 60 → Générer | Expiry date = genDate + 60d, locale-aware | ☐ |
       | FEAT-06 | Aperçu label | Above #inline-res in Saisie | Dashed border, muted bg, "Aperçu" / "Preview" | ☐ |

       ## Section D. DESIGN-01..12 visual verification (Phase 4)
       | REQ | Test | Expected | Result |
       |-----|------|----------|--------|
       | DESIGN-01 | Sidebar structure | 260px light, Leasétic brand top, 3 main nav + Admin below divider, FR/EN segmented + quarter badge bottom | ☐ |
       | DESIGN-02 | Topbar contextual actions | Saisie: Réinit + Générer; Résultat: Modifier + Voir; Proposition: Modifier + Copier + Imprimer + Télécharger; Admin: Verrouiller + Enregistrer | ☐ |
       | DESIGN-03 | Footer | Single 48px row "© 2026 Leasétic · thomas.heufke@leasetic.com · Matrice v10" | ☐ |
       | DESIGN-04 | Pill buttons | Every .btn has 9999px radius; .btn-green has shadow + translateY hover lift | ☐ |
       | DESIGN-05 | Shadow cards | 16px radius, zero border, dual-layer navy-tinted shadow, 2rem padding | ☐ |
       | DESIGN-06 | Rounded inputs | 12px radius, 0.7rem/1rem padding, teal focus ring, red invalid ring | ☐ |
       | DESIGN-07 | Typography scale | Topbar 1.15rem/600; .ctitle 0.85rem/600 uppercase; labels 0.78rem; inputs 0.95rem; body 0.9rem/1.55 | ☐ |
       | DESIGN-08 | Banner as card | .exp floats at top of main-content with 12px radius + shadow + 1.25rem bottom margin | ☐ |
       | DESIGN-09 | No breadcrumb + ● dot | #breadcrumb DOM gone; Résultat/Proposition sidebar items show ● after generate, disappear on reset | ☐ |
       | DESIGN-10 | Print isolation | `window.print()` hides sidebar + topbar + footer; PDF identical to Phase 1 | ☐ |
       | DESIGN-11 | Sidebar lang segmented | FR/EN pill in sidebar bottom; .active follows currentLang; setLang persists | ☐ |
       | DESIGN-12 | Zero regression | All 4 self-checks green; calc unchanged; escape unchanged; print identical | ☐ |

       ## Section E. FR-only smoke (end-to-end flow through new shell)
       Fresh install or `localStorage.setItem('lt_lang','fr'); location.reload();`
       1. [ ] Sidebar labels in French, topbar title "Saisie", footer shows © 2026 line
       2. [ ] Fill partner-co "Partner SA", partner-name "J. Dupont", client-co "Acme", client-name "M. Durand", amount 75000 (thin-space formatting), SIREN 123 456 789, phone 01 23 45 67 89
       3. [ ] Click 60 mois duration → .db active state pill-shaped
       4. [ ] Click Générer from topbar → navigate to Proposition tab → ● dots appear on Résultat + Proposition sidebar items
       5. [ ] Proposition page renders in French with all 5 "Pourquoi choisir Leasétic?" tiles, conditions block, RSE caption "Notre engagement RSE"
       6. [ ] Click Copier la référence in topbar → toast "Référence copiée." fires → paste in DevTools → LC-XXXXX matches
       7. [ ] Click ← Modifier in topbar → back to Saisie with all fields intact
       8. [ ] Click Imprimer / PDF → print preview shows 2-page A4 identical to Phase 1, no sidebar/topbar/footer visible
       9. [ ] Click Télécharger HTML → blob downloads with correct filename
       10. [ ] Réinitialiser with confirm → fields cleared, partner-co/name preserved, ● dots disappear
       11. [ ] Admin login (password `leasetic2025`) → coefficients visible, validity dropdown shows 30 default, sidebar Admin item loses 🔒 affix
       12. [ ] Edit a coefficient → Enregistrer in topbar → green save toast in French
       13. [ ] Verrouiller in topbar → panel hides, sidebar Admin item regains 🔒 affix

       ## Section F. EN-only smoke (same flow in English)
       Toggle to EN via sidebar bottom → repeat 13 steps above in English:
       - Footer text also translates to the EN `footer.text` key
       - Proposition "Why choose Leasétic?" / "CSR commitment" visible
       - Toasts in English ("Reference copied." / "Coefficients saved.")
       - Reload → UI persists in English
       - Toggle back → FR

       ## Section G. Migration re-test
       1. [ ] DevTools: `localStorage.clear(); location.reload()` → fresh install, default coefficients load from script? (or blank per v10 baseline — match v9 behavior)
       2. [ ] Set `localStorage.setItem('lt_pw','leasetic2025'); location.reload()` → console logs migration line → lt_pw now 64-hex
       3. [ ] Set v9-style `localStorage.setItem('lt_coeffs', JSON.stringify({t1:{36:1.8, 48:1.6, 60:1.4}, ...}))` → reload → loadCoeffs() hydrates admin panel correctly
       4. [ ] Set lt_lang='en' → reload → UI opens in English
       5. [ ] Set lt_validity='60' → Générer → expiry date = genDate + 60d
       6. [ ] Set lt_validity='999' (invalid) → reload → getValidity() falls back to 30 → console log 6/6 green
       7. [ ] Zero data loss across the full migration scenario

       ## Section H. Print mode isolation test
       1. [ ] From Proposition page: `window.print()` → PDF shows only #page-proposition, 2 pages A4
       2. [ ] From Saisie page: `window.print()` → sidebar/topbar/footer hidden; if proposition not generated yet, PDF is empty/noise (acceptable — matches Phase 1 behavior)
       3. [ ] Compare Proposition PDF vs Phase 1's PARITY-AUDIT certified output — byte-identical or visually indistinguishable

       ## Section I. Browser matrix
       | Browser | Version | A | B | C | D | E | F | G | H | Notes |
       |---------|---------|---|---|---|---|---|---|---|---|-------|
       | Chrome (required) | latest | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | |
       | Edge (required) | latest | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | Spot-check A, B, D, E, G, H |
       | Firefox (optional) | latest | | | | | | | | | |
       | Safari (optional) | latest | | | | | | | | | |

       ## Section J. Ship sign-off
       - [ ] Reviewer: _______________________
       - [ ] Date: _______________________
       - [ ] Commit hash: _______________________
       - [ ] Sections A-I all green in Chrome
       - [ ] Sections A, B, D, E, G, H spot-checked green in Edge
       - [ ] v10-with-Phase-4-shell READY TO SHIP

       ---

       ## Appendix — superseded runbooks
       - `.planning/phases/03-ux-polish-i18n/FINAL-TEST.md` — Phase 3 runbook. Superseded by THIS file. UX/FEAT rows migrated to Section C with updated locations; PARITY/SEC re-runs moved to Sections A/B links; FR/EN smoke and migration migrated to Sections E/F/G; new DESIGN section D and print section H added.
       ```

    2. **Mark Phase 3 FINAL-TEST.md as superseded**. Prepend a header block (first 5 lines of the file):
       ```markdown
       > **SUPERSEDED 2026-04-18** — this runbook has been replaced by
       > `.planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md`
       > (Phase 4 adds sidebar shell + design system v2; locations of some
       > UX/FEAT tests changed; new DESIGN section added).
       > Kept on disk for historical trace per 04-CONTEXT.md.
       ```
       Do NOT rename the file. Do NOT delete anything below the header. Historical trace is intentional.

    3. **Verify deliverables**:
       - `test -f .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` → true
       - `grep -c '^## Section [A-J]' .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` → 10 (A through J)
       - `grep -cE 'DESIGN-0[1-9]|DESIGN-1[012]' .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` → at least 12 (every DESIGN-NN id appears)
       - `grep -cE 'UX-0[1-9]|UX-10' .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` → at least 10
       - `grep -cE 'FEAT-0[1-6]' .planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` → at least 6
       - `head -5 .planning/phases/03-ux-polish-i18n/FINAL-TEST.md | grep -qi 'superseded'` → match (header note prepended)
  </action>
  <verify>
    <automated>test -f ".planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md" && grep -c '^## Section [A-J]' ".planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md" | grep -q '^10$' && grep -cE 'DESIGN-0[1-9]|DESIGN-1[012]' ".planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md" | grep -qE '^1[2-9]$|^[2-9][0-9]+$' && grep -cE 'UX-0[1-9]|UX-10' ".planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md" | grep -qE '^[1-9][0-9]*$' && grep -cE 'FEAT-0[1-6]' ".planning/phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md" | grep -qE '^[6-9]$|^[1-9][0-9]+$' && head -10 ".planning/phases/03-ux-polish-i18n/FINAL-TEST.md" | grep -qi 'superseded'</automated>
  </verify>
  <done>FINAL-TEST-v11.md exists with 10 sections A-J, all 12 DESIGN + 10 UX + 6 FEAT requirements represented, Copy LC in both res-main AND topbar tested as separate rows, ship sign-off block present. Phase 3 FINAL-TEST.md carries a supersession header but is otherwise unchanged.</done>
</task>

</tasks>

<verification>
1. Typography bumped per scale — visual inspection in Chrome
2. Proposal body typography unchanged — window.print() output visually identical to Phase 1
3. FINAL-TEST-v11.md sections A-J all present and structurally complete
4. Every DESIGN-01..12 id appears in Section D
5. Every UX-01..10, FEAT-01..06 id appears in Section C (with updated locations)
6. Copy LC tested in both res-main AND topbar
7. FINAL-TEST.md superseded header present
8. Self-checks green: assertCalc 6/6, assertEscape 8/8, assertValidity 6/6
9. node --check on extracted <script>: PARSE OK
</verification>

<success_criteria>
- [ ] body font-size:0.9rem, line-height:1.55
- [ ] .topbar-title 1.15rem/600
- [ ] .ctitle 0.85rem/600 uppercase 0.06em
- [ ] label 0.78rem/500
- [ ] .sidebar-nav .nav-item 0.88rem/500
- [ ] #footer 0.75rem --muted
- [ ] .two grid gap 2rem
- [ ] Sidebar padding 1.5rem horizontal
- [ ] Proposal body typography UNCHANGED (print output byte-identical to Phase 1)
- [ ] FINAL-TEST-v11.md created with sections A-J
- [ ] DESIGN-01..12 each in Section D (≥12 matches)
- [ ] UX-01..10 each in Section C (updated locations)
- [ ] FEAT-01..06 each in Section C
- [ ] Copy LC tested in res-main AND topbar (UX-10a + UX-10b rows)
- [ ] Ship sign-off block in Section J with checkboxes + reviewer/date/commit fields
- [ ] Phase 3 FINAL-TEST.md prepended with SUPERSEDED header pointing to v11
- [ ] All 4 self-checks green
- [ ] Zero JS console errors
</success_criteria>

<output>
After completion, create `.planning/phases/04-sidebar-shell-design-v2/04-03-typography-and-final-polish-SUMMARY.md` documenting:
- Exact CSS changes for typography + spacing (before/after values)
- Confirmation that proposal body selectors were NOT touched + print-preview smoke result
- FINAL-TEST-v11.md structure (10 sections, row counts per section)
- Supersession header added to Phase 3 FINAL-TEST.md
- Copy LC location decision (res-main + topbar, both via event-delegated handler)
- Final Phase 4 ship-ready status + next step: Antoine runs FINAL-TEST-v11.md sections A-J in Chrome + A/B/D/E/G/H spot-check in Edge, then fills Section J sign-off and ships `Matrice_2026_THE_Leasetic-v10.html` on 2026-04-18 EOD
</output>
