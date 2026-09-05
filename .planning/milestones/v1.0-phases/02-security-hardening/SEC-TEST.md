# SEC-TEST — Phase 2 Manual Test Checklist

**Target file:** `Matrice_2026_THE_Leasetic-v10.html` (post plans 02-01 + 02-02)
**Browsers:** Chrome (primary), Edge (secondary)
**Prerequisites:** Phase 2 plans 01 and 02 shipped; Phase 1 smoke runbook already green
**Covered REQ IDs:** MIGRATE-02, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, TEST-02
**Estimated runtime:** ~15 minutes end-to-end

**How to use:** Run every section in order. Tick the box only after observing the expected outcome in the browser. Any red cell → stop, flag Antoine, do not sign off.

---

## Section A — Password hashing + migration (SEC-01, SEC-02, MIGRATE-02)

### A1 — Fresh install (no `lt_pw`)

- [ ] DevTools → Application → Local Storage → delete `lt_pw` (and optionally all `lt_*` keys for full reset)
- [ ] Reload `Matrice_2026_THE_Leasetic-v10.html`
- [ ] Console shows `[v10 migration] default password hashed`
- [ ] Console shows `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓`
- [ ] Console shows `[v10 self-check] escapeHtml: 8/8 fixtures pass ✓`
- [ ] `localStorage.getItem('lt_pw')` → expect exactly `d0adb0ba9321d623efc9d70cca9f7d70003f420e5c3b3c859f4e59a479f630a1`
- [ ] Admin tab → type `leasetic2025` → Accéder → admin panel opens

### A2 — Idempotence (second reload should not re-migrate)

- [ ] With A1 state in place, reload the page
- [ ] Console shows NO `[v10 migration]` line (only the two self-check lines)
- [ ] `localStorage.getItem('lt_pw')` unchanged from A1

### A3 — Legacy plaintext upgrade (v9 partner simulation)

- [ ] DevTools console: `localStorage.setItem('lt_pw', 'mylegacypwd')`
- [ ] Reload v10
- [ ] Console shows `[v10 migration] upgraded plaintext lt_pw to SHA-256`
- [ ] `localStorage.getItem('lt_pw')` matches `/^[a-f0-9]{64}$/` and is NOT `mylegacypwd`
- [ ] Admin login with `mylegacypwd` → panel opens
- [ ] Admin login with `leasetic2025` (after lock + retry) → shows `Mot de passe incorrect.`

---

## Section B — Password change with current-pw gate (SEC-05)

Start each scenario from a known good login (`leasetic2025` accepted, panel open).

### B1 — Happy path (correct current-pw)

- [ ] Fill `current-pw` = `leasetic2025`, `new-pw` = `test42`, `new-pw2` = `test42`
- [ ] Click Enregistrer → green `al-save` toast appears
- [ ] All three pw fields clear
- [ ] `localStorage.getItem('lt_pw')` ≠ `d0adb0ba...` (new hash of `test42`)
- [ ] Click Verrouiller → login with `leasetic2025` → error
- [ ] Login with `test42` → panel opens
- [ ] Restore by changing back to `leasetic2025` before continuing to B2

### B2 — Wrong current-pw blocks

- [ ] Capture current `lt_pw` value in DevTools
- [ ] Fill `current-pw` = `wrongpw`, `new-pw` = `anything`, `new-pw2` = `anything`
- [ ] Click Enregistrer → alert `Mot de passe actuel incorrect.`
- [ ] `localStorage.getItem('lt_pw')` unchanged from the captured value

### B3 — Empty current-pw blocks (same generic error)

- [ ] Capture current `lt_pw` value
- [ ] Leave `current-pw` empty, fill `new-pw` = `anything`, `new-pw2` = `anything`
- [ ] Click Enregistrer → alert `Mot de passe actuel incorrect.` (same wording as B2, no field-discrimination)
- [ ] `lt_pw` unchanged

### B4 — No-op save (coeffs only, pw fields empty)

- [ ] Capture `lt_pw`
- [ ] Change one coefficient value (e.g. t1/36 from 2.0 to 2.0001)
- [ ] All three pw fields empty
- [ ] Click Enregistrer → green `al-save` toast
- [ ] `lt_pw` unchanged
- [ ] `lt_coeffs` updated with the new coefficient

---

## Section C — XSS sanitization (SEC-03, SEC-04)

**For every row below:** paste the exact payload into the listed field, fill the minimum required fields for a valid generate (partner-co, partner-name, client-co, client-name, amount > 25000, durée), click Générer. Then verify the expected outcome on the Résultat tab, Proposition tab, and in DevTools Elements panel.

| # | Field | Payload | Expected render | Pass |
|---|-------|---------|----------------:|:----:|
| C1 | client-name (destinataire) | `<script>alert('xss')</script>` | Renders as literal text on both tabs. No alert fires. No `<script>` child node injected anywhere under `#prop-content` or `#res-detail` (Elements panel search). | [ ] |
| C2 | client-co (société) | `<img src=x onerror="alert(1)">` | Renders as literal text. No `<img>` child node appears in Elements. No alert. | [ ] |
| C3 | project-desc (projet) | `"><svg onload="alert(1)"><x="` | Renders as literal text including the stray quotes and angle brackets. Surrounding `ig-name` div remains intact (no broken layout). No alert. | [ ] |
| C4 | client-email | `javascript:alert('xss')` | Renders as literal text in the contact line on both Résultat and Proposition. Not a clickable link. No alert on page load or tab switch. | [ ] |
| C5 | client-name (legitimate ampersand + angle) | `Dupont & Co <DSI>` | Renders visually as `Dupont & Co <DSI>` (ampersand NOT double-encoded, angle-bracketed token visible as literal characters, no broken layout). This is the canary for over-escape regressions. | [ ] |

### C6 — Header title guard (updateHdrTitle)

- [ ] Paste `<img src=x onerror="alert(1)">` into `partner-co`
- [ ] `#hdr-title` shows the literal text (as a rendered string); no `<img>` child node; no alert fires on input
- [ ] Paste `Acme & Sons <Group>` into `partner-co` → header reads `Proposition de location — Acme & Sons <Group> — by Leasétic` with the ampersand and angle-bracket token visible as literal characters

### C7 — Regression guard (clean proposal still renders)

- [ ] Reset form, fill with legitimate values: partner-co=`Acme SA`, partner-name=`Jane Doe`, client-co=`TestCorp`, client-name=`John Smith`, amount=`75000`, durée=`48`, project-desc=`IT modernization`
- [ ] Generate → Proposition tab still shows: logo, header strip, info-grid (destinataire/société/projet), ref+date row, montant/loyer/durée tiles, "Pourquoi choisir Leasétic?" tiles, OPEX/Cycles tiles, conditions line, footer
- [ ] Cmd+P → exactly 2 A4 pages, commission invisible (find-in-page for `commission`/`5%` → zero hits)
- [ ] RSE slide renders on page 2

---

## Section D — Parity regression guard (cross-ref Phase 1)

- [ ] Every reload during this checklist shows `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓` in the console (no exceptions, no FAILED line)
- [ ] Every reload shows `[v10 self-check] escapeHtml: 8/8 fixtures pass ✓`
- [ ] With seeded coefficients t1/60=1.8765, commission=5%, amount=30000, durée=60 → inline-res shows `591,10 €` (matches plan 01-02 SUMMARY table)
- [ ] Inline loyer for 75000€/48mo matches the value produced by v9 for identical inputs
- [ ] After C7, Télécharger HTML produces a self-contained Blob that still renders 2 pages when opened in a fresh tab

---

## Section E — Audit table (authoritative, informational)

Every HTML-writing assignment site in the v10 `<script>` block, pre-edit line numbers. Post-edit line numbers shift by +19 lines starting from line 607 due to the escapeHtml definition insertion; each row notes its post-edit line in parentheses.

**Classification legend:** STATIC (pure author-controlled markup, no variables), NUMERIC (only `fmt()`/`toFixed()`/`parseInt()` output), INTERNAL (code-generated tokens like tranche keys, quarter codes, LC refs), USER (contains `d.pco`/`d.pnm`/`d.cco`/`d.cnm`/`d.crole`/`d.ctel`/`d.cemail`/`d.csiren`/`d.projdesc`/`d.partnerref` or live `$('partner-co').value`), READ (read-only, never written back to DOM), EMPTY (assigns empty string).

**Action legend:** NONE (left untouched), ESCAPE (user values wrapped in `escapeHtml()`), TEXTCONTENT (switched to `textContent` assignment).

| # | Pre-edit line | Post-edit line | Site | Class | Action | Justification / fields escaped |
|--:|--:|--:|------|:-----:|:------:|---|
| 1 | 626 | 637 | `updateInline()` empty-state nores block | STATIC | NONE | Pure author-controlled markup, no variables. |
| 2 | 630 | 641 | `updateInline()` "Coefficients non valides" | STATIC | NONE | Hardcoded string. |
| 3 | 634 | 645 | `updateInline()` "Sur demande" block | STATIC | NONE | Pure static template, no interpolation. |
| 4 | 643 | 654 | `updateInline()` "Coefficients manquants pour cette tranche" | STATIC | NONE | Hardcoded string. |
| 5 | 646 | 657 | `updateInline()` inline loyer tile | NUMERIC | NONE | Only `${fmt(r.monthly)}`, `${dur}`, `${r.coeff.toFixed(4)}` — all numeric, never user-sourced. |
| 6 | 668 | 679 | `checkExp()` "Coefficients non configurés" banner | STATIC | NONE | Hardcoded string. |
| 7 | 673 | 684 | `checkExp()` expired banner | INTERNAL | NONE | `${s}` is the stored `lt_qtr` token (code-generated `YYYY-QN`), `${c}` is `curQ()` output. Neither is user-sourced in the XSS sense — only admin can write `lt_qtr`, and the value shape is enforced by `curQ()`. |
| 8 | 679 | 690 | `checkExp()` days-left warn banner | NUMERIC | NONE | `${d}` is the `daysLeft()` integer. |
| 9 | 794 | 816 | `renderResult()` res-main loyer tile | NUMERIC+INTERNAL | NONE | `${loyer}` is a local const of form `fmt(d.monthly) + ' €'` or literal `'Sur demande'`; `${d.dur}` numeric; `${d.coeff.toFixed(4)}` numeric; `${tLabel(d.key)}` is the static map `tLabel()` output — internal enum. |
| 10 | 800 | 822 | `renderResult()` res-detail recap card | USER | ESCAPE | Wraps `d.pco`, `d.pnm`, `d.cco`, `d.cnm`, `d.crole`, `d.ctel`, `d.cemail`, `d.csiren`, `d.projdesc`, `d.partnerref`. Partnerref fallback kept as `escapeHtml(d.partnerref)` (but no `\|\| 'NC'` at this site — empty branch skipped entirely via outer `d.partnerref ? ... : ''`). |
| 11 | 816 | 838 | `renderProposal()` delegates to `p1p2() + p3()` | USER | (escape happens inside callees) | Sites 12–15 cover the escape sweep. |
| 12 | 821 | 843 | `p1p2()` `siren` local var | USER | ESCAPE | `escapeHtml(d.csiren)`. |
| 13 | 824 | 846 | `p1p2()` `contact` local var | USER | ESCAPE | `escapeHtml(d.ctel \|\| '')` and `escapeHtml(d.cemail \|\| '')`. |
| 14 | 832–896 | 854–918 | `p1p2()` main return block | USER | ESCAPE | Wraps `d.pco` (×4: prop-offer-partner, prop-partner, conds line, prop-foot), `d.pnm` (×2: prop-partner, prop-foot), `d.cnm`, `d.crole`, `d.ctel`, `d.cemail`, `d.cco`, `d.csiren` (inline SIREN), `d.projdesc`, `d.partnerref`. Partnerref uses `escapeHtml(d.partnerref) \|\| 'NC'` so the `'NC'` fallback stays literal. Leaves untouched: `${LOGO_SRC}`, `${fmt(d.a)}`, `${fmt(d.monthly)}`, `${d.dur}`, `${d.ref}`, `${d.ds}`, `${expiryDate(d.ds)}`, `${intro}` (local const), `ynDisplay(...)` calls, all static "Pourquoi Leasétic" tiles and conditions prose. |
| 15 | 899–906 | 921–928 | `p3()` page 2/2 footer | USER | ESCAPE | Wraps `d.pco` and `d.pnm`. Leaves `${DECK3_SRC}` untouched (internal base64 src). |
| 16 | 1046 | 1100 | `btn-dl` handler reads `styleTags[i].innerHTML` | READ | NONE | Read-only: iterates `<style>` tags to inline CSS into downloadable blob. No DOM write. |
| 17 | 1055 | 1109 | `btn-dl` handler reads `$('printable').innerHTML` | READ | NONE | Read-only: serializes the already-rendered proposal into the blob. No DOM write. Upstream `#prop-content` is already escaped via site 11→14→15. |
| 18 | 1072 | 1126 | reset inline-res empty state | STATIC | NONE | Hardcoded string. |
| 19 | 1074 | 1128 | reset res-main empty state | STATIC | NONE | Hardcoded string. |
| 20 | 1075 | 1129 | reset res-detail empty string | EMPTY | NONE | Literally assigns `''`. |
| 21 | 1076 | 1130 | reset prop-content empty state | STATIC | NONE | Hardcoded string. |
| 22 | 1094 | 1148 | `updateHdrTitle()` partner-co interpolation | USER | ESCAPE | Wraps live `$('partner-co').value.trim()` via `escapeHtml(pco)`. Markup stored in a temp `const markup` before assignment. |
| 23 | 1095 | 1152 | `updateHdrTitle()` else-branch | STATIC | NONE | Already uses `textContent` with a hardcoded literal — safe by construction. |

**Totals:**

- 23 assignment sites in the v10 `<script>` block
- 6 USER-sourced sites → all wrapped with `escapeHtml()` (sites 10, 12, 13, 14, 15, 22)
- 2 READ-only sites → safe, no write (sites 16, 17)
- 10 STATIC sites → no interpolation (sites 1, 2, 3, 4, 6, 18, 19, 21, plus the static else-branch site 23)
- 2 NUMERIC sites → only `fmt()`/`toFixed()` output (sites 5, 8)
- 2 INTERNAL sites → `lt_qtr`/`curQ()`/`tLabel()` tokens (sites 7, 9)
- 1 EMPTY site → literal `''` assignment (site 20)
- 1 delegation site → escapes happen in callees (site 11)
- Post-edit `escapeHtml(` call count: ≥26 (definition + sanity probe block + 6 user-site blocks averaging 3-6 call each + updateHdrTitle + assertEscape fixture array)
- `grep -c '\.innerHTML\s*='` unchanged from pre-plan (16 writes — 13 after excluding the 2 READ and 1 EMPTY accounted separately)

**No stowaway sites:** a fresh grep of `.innerHTML` after Task 1's commit matches the table row-for-row. Any future additions must be appended here before merging.

---

## Sign-off

- [ ] Section A (A1 A2 A3) green in Chrome
- [ ] Section B (B1 B2 B3 B4) green in Chrome
- [ ] Section C (C1 C2 C3 C4 C5 C6 C7) green in Chrome
- [ ] Section D (parity regression guard) green
- [ ] Section E audit table reviewed; no stowaway sites
- [ ] Repeat A + C in Edge; both green
- [ ] Console log across all reloads shows zero error-level lines

**Signed off by:** __________________
**Date:** __________________

---

*Covers MIGRATE-02, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, TEST-02.*
