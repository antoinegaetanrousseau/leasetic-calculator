---
phase: 03-ux-polish-i18n
plan: 03-03-features-and-final-test
test_doc: FINAL-TEST.md
baseline: Matrice_2026_THE_Leasetic-v10.html
ship_blocker: true
created: 2026-04-15
---

# FINAL TEST — Matrice Commerciale v10

**Purpose:** Master manual checklist for v10 ship sign-off. All mandatory sections must pass in both Chrome + Edge before Antoine signs off.
**Runner:** Antoine (solo, ~60–90 min Chrome + ~15 min Edge).
**Prerequisites:** Phase 1 PARITY-AUDIT.md smoke runbook green on pre-Phase-3 v10; Phase 2 SEC-TEST.md Sections A-D green.
**Baseline file:** `Matrice_2026_THE_Leasetic-v10.html` post Phase 3 Plan 03-03.

---

## Section A — PARITY regression re-run (TEST-01)

Re-run the 31-check smoke runbook from `.planning/phases/01-parity-refactor/PARITY-AUDIT.md` → "Browser Smoke Test Runbook" on post-Phase-3 v10 to confirm zero regressions in calculation parity, tranche detection, filename format, PDF layout, and commission invisibility.

- [ ] Chrome: all 31 PARITY-AUDIT checks green
- [ ] Edge: all 31 PARITY-AUDIT checks green

---

## Section B — SECURITY regression re-run (TEST-01)

Re-run all sections of `.planning/phases/02-security-hardening/SEC-TEST.md`:

- [ ] Chrome: SEC-TEST Section A (password migration / hash-at-rest)
- [ ] Chrome: SEC-TEST Section B (password change flow + current-pw gate)
- [ ] Chrome: SEC-TEST Section C (XSS fixtures — 11 payloads across all user-sourced sites)
- [ ] Chrome: SEC-TEST Section D (escapeHtml self-check 8/8 + calcRent self-check 6/6 on load)
- [ ] Edge: all SEC-TEST sections green

---

## Section C — UX + FEAT feature tests (TEST-03)

One row per Phase 3 REQ. Steps → expected → pass box.

| REQ | Steps | Expected | Result |
|-----|-------|----------|--------|
| **UX-01** | Admin → change coefficients → Save | Green toast top-right "Coefficients enregistrés." (FR) / "Coefficients saved." (EN), auto-dismiss ~3s, no blocking alert | [ ] |
| **UX-02** | Saisie → Réinitialiser button | Native confirm dialog; Cancel aborts; OK clears client+project fields only (partner preserved) | [ ] |
| **UX-02b** | Generate with expired coefficients | Confirm dialog "coefficients non valides... continuer ?" — Cancel aborts | [ ] |
| **UX-03** | Focus #client-co → Tab away without typing | Field gets red `.invalid` border on blur | [ ] |
| **UX-03b** | Start typing in red-bordered field | Border clears on input | [ ] |
| **UX-03c** | Generate with no duration picked | Duration wrapper `.dg` gets `.invalid` class | [ ] |
| **UX-04** | Saisie tab active | Breadcrumb shows step 1 current, step 2/3 pending | [ ] |
| **UX-04b** | Switch to Résultat | Breadcrumb shows step 1 done, step 2 current | [ ] |
| **UX-04c** | Switch to Proposition / Admin | Breadcrumb hidden (no competition with Modifier button / admin UI) | [ ] |
| **UX-05** | Focus #amount → press Enter | `btn-gen` click fires | [ ] |
| **UX-05b** | Focus #adm-pw → press Enter | Admin login fires; btn-gen does NOT fire | [ ] |
| **UX-06** | Press Esc anywhere in Saisie | Confirm reset dialog appears | [ ] |
| **UX-07** | Click Générer with empty #client-co | Error toast "Veuillez renseigner..." + first empty field auto-focused | [ ] |
| **UX-07b** | Fill all fields except duration → Générer | First duration button receives focus | [ ] |
| **UX-08** | Admin → change password (success) | Green toast "Mot de passe mis à jour." | [ ] |
| **UX-09** | Générer 75 000 € / 36 mois → Résultat tab | `Coefficient appliqué : X.XXXX %` line visible in res-main, 4 decimal places | [ ] |
| **UX-09b** | Amount > max-amount threshold → Générer | Coefficient line HIDDEN (sur demande branch) | [ ] |
| **UX-10** | Résultat tab → click 📋 copy button next to LC ref | Green toast "Référence copiée.", clipboard holds LC-XXXXX (verify by paste) | [ ] |
| **UX-10b** | Proposition tab → click toolbar 📋 copy button | Same result | [ ] |
| **UX-10c** | Deny clipboard permission / old browser path | Fallback textarea+execCommand works OR red "Copy failed" toast fires | [ ] |
| **FEAT-01** | Click EN in header → reload | Lang switches instantly to English; reload keeps EN via lt_lang | [ ] |
| **FEAT-02** | Inspect any visible string | Sourced from I18N dictionary via data-i18n attribute or t() call | [ ] |
| **FEAT-03** | Generate FR proposal → toggle to EN | Proposal page 1 + 2 labels, 5 tiles, conditions block, footer, RSE caption all swap to English in place without regenerating | [ ] |
| **FEAT-04** | Admin → set Validité proposition = 60 → Save | `localStorage.lt_validity === "60"` | [ ] |
| **FEAT-05** | After FEAT-04: Générer a new proposal | Expiry date in conditions block = genDate + 60 days (±1 day timezone) | [ ] |
| **FEAT-05b** | After FEAT-05: toggle FR ↔ EN | Expiry date re-formats from "15 juin 2026" (FR) to "June 15, 2026" (EN) | [ ] |
| **FEAT-05c** | Set validity = 15 → regenerate | Expiry date = genDate + 15 days | [ ] |
| **FEAT-06** | Saisie tab | "Aperçu" (FR) / "Preview" (EN) label visible above #inline-res, dashed border + muted background visually distinct from the Résultat tab's green-bordered tile | [ ] |
| **FEAT-06b** | Fill amount + duration in Saisie | Live update visible in inline-res ("Aperçu") | [ ] |

---

## Section D — FR smoke run (TEST-04)

Fresh-reload v10. Confirm lang = FR (header button reads "EN"). Execute full end-to-end:

1. Fill partner: `Société Informatique XY` / `Jean Dupont`
2. Fill client: `Acme SAS` / `Marie Leblanc` / `DSI` / `06 12 34 56 78` / `marie@acme.fr` / `123 456 789`
3. Slb: Oui · Eval: Non
4. Amount: `75 000 €` → auto-formats with thin-space → tranche badge shows T2
5. Duration: 48 mois
6. Project desc: `Renouvellement postes commerciaux`
7. Partner ref: `DEVIS-2026-042`
8. Observe Aperçu inline-res live update
9. Click Générer → green toast + auto-navigate to Résultat tab
10. Verify coefficient line + click copy LC ref → toast + paste check
11. Switch to Proposition tab → 2-page layout renders with coherent FR throughout
12. Click Imprimer / PDF → browser print dialog → verify Page 1 financial offer + Page 2 RSE slide + bilingual caption below image
13. Back to Modifier → Réinitialiser → confirm → client/project fields cleared, partner preserved

- [ ] Chrome: all 13 steps pass, zero JS console errors
- [ ] Edge: all 13 steps pass, zero JS console errors

---

## Section E — EN smoke run (TEST-04)

Fresh-reload. Click EN header button BEFORE filling. Then repeat Section D steps 1–13 in English.

- [ ] Chrome: UI fully in English (header, tabs, form labels, buttons, placeholders, toasts, confirms)
- [ ] Chrome: Proposition page 1 + 2 fully in English (offer title, tiles, conditions, footer)
- [ ] Chrome: Expiry date formatted "Month D, YYYY"
- [ ] Chrome: RSE caption "Our CSR commitment" visible below page-2 image
- [ ] Chrome: Console clean
- [ ] Edge: all of the above

---

## Section F — Migration re-test (TEST-05)

1. DevTools → Application → clear all localStorage for v10
2. Reload v10 → console logs:
   - `[v10 migration] default password hashed` or `[v10 migration] No v9 data found — fresh install, using defaults.`
   - `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓`
   - `[v10 self-check] escapeHtml: 8/8 fixtures pass ✓`
   - `[v10 self-check] getValidity: 6/6 fixtures pass ✓`
3. Admin login with `leasetic2025` → succeeds; set coefficients + commission + max + validity = 30 → Save → green toast
4. Manually inject v9 plaintext password: `localStorage.setItem('lt_pw','oldpass123')`
5. Reload → console logs migration upgrade path
6. `localStorage.getItem('lt_pw')` → 64-char lowercase hex
7. Admin login with `oldpass123` → succeeds
8. Toggle FR ↔ EN → reload → previously entered partner+client data survives, lang persists
9. Fill form + Générer in EN → Modifier → toggle FR → Proposition tab → proposal re-renders in FR with same data + expiry re-formatted

- [ ] Chrome: all 9 migration steps pass
- [ ] Edge: all 9 migration steps pass

---

## Section G — Browser matrix

| Browser | Required | Notes |
|---------|----------|-------|
| Chrome (latest) | ✓ Mandatory | Primary ship target |
| Edge (latest) | ✓ Mandatory | Partner distribution |
| Firefox (latest) | Optional | Best-effort; minor rendering OK |
| Safari (latest) | Optional | Best-effort; Web Crypto available |

- [ ] Chrome complete
- [ ] Edge complete
- [ ] Firefox (optional)
- [ ] Safari (optional)

---

## Section H — Ship sign-off

**Reviewer:** Antoine Rousseau
**Date:** _______________
**Version:** `Matrice_2026_THE_Leasetic-v10.html`
**Commit hash:** _______________

- [ ] All mandatory sections (A, B, C, D, E, F, G) green in Chrome
- [ ] All mandatory sections green in Edge
- [ ] No unresolved blockers
- [ ] Any red rows documented with reproduction steps in a follow-up issue

**Sign-off signature:** _______________

---

*Generated 2026-04-15 by plan 03-03. This is the final ship gate for v10.*
