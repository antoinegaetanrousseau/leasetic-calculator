# Phase 13 — Manual Smoke Runbook (Chrome + Edge)

> Manual smoke runbook for the 3-step proposal wizard.
> **Operator:** Antoine Rousseau (or designated QA partner).
> **Browsers (required):** Chrome (latest stable) + Microsoft Edge (latest stable).
> **Estimated execution time:** ~25 min per browser (~50 min total).
> **Plan reference:** [13-06-PLAN.md](../../.planning/phases/13-3-step-proposal-wizard/13-06-PLAN.md) Task 4.

**Coverage objective:** verify all 5 [ROUTE-01](../../.planning/REQUIREMENTS.md) success criteria plus the
[D-12 + D-28](../../.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md) ADMIN-09 commission-invisibility envelope, end-to-end, on real browsers.

This is the **manual human-verification gate** that closes Phase 13.
Plans 13-01..13-05 ship the per-file work; plan 13-06 Tasks 1-3 ship the
automated integration tests + security addendum; plan 13-06 Task 5 is the
human checkpoint that runs THIS runbook.

> **Note for the operator:** ROUTE-01 has 5 success criteria. They map to
> the first 5 tests below. Tests 6 + 7 are the ADMIN-09 invariant + the
> cross-partner isolation check. **All 7 tests must pass** in BOTH Chrome
> AND Edge to mark Phase 13 ready for `/gsd-transition`.

---

## Prerequisites

### Test data setup

| What | Value | Where to obtain |
|---|---|---|
| Base URL | `https://<staging-or-prod-url>` | Antoine fills in at runbook time (e.g. `https://leasetic-staging.vercel.app` or `http://localhost:3000` for local). |
| Partner A account | `<email-A>@memento.eco` / password | Antoine's own dev account, or a pre-seeded test partner from `scripts/seed-partners.ts`. |
| Partner B account | `<email-B>@memento.eco` / password | Second pre-seeded partner; must be DIFFERENT user-id from Partner A. Required for Test 7 (cross-partner isolation). |
| Browsers | Chrome (latest) + Edge (latest) | Both installed locally. |
| `pdftotext` CLI (optional) | `brew install poppler` (macOS) or `apt-get install poppler-utils` (Linux) | Required for Test 6 step 7 (PDF binary commission grep). |
| `psql` or Drizzle Studio (optional) | already installed | Required for Test 6 step 8 (audit_log payload inspection). |

### Pre-flight check

Before running the tests, verify:

1. `npm run dev` (or equivalent staging deploy) is running and reachable at the Base URL.
2. The Coefficient Editor (admin surface) has seeded `commissionPct` to a non-zero value (e.g. `5.0000`). Without this, the commission row in Test 6 will render as `0,00 €` and the invariant assertions become trivial.
3. `npm test` exits 0 locally (full suite — 520+ tests including Plan 13-06's 9 stepperBehavior tests + 36 no-commission tests).
4. Partner A and Partner B accounts can both log in successfully (test once before starting).

### Filling in the runbook (en français)

Le runbook lui-même est en anglais (langue de la QA interne).
L'app teste les copies FR (production partner-facing). Les test 1-7 ci-dessous référencent les chaînes FR observables (`Paramètres du projet`, `Continuer vers le calcul →`, etc.).

---

## Test 1 — ROUTE-01 criterion 1: All 3 routes render with Stepper showing correct state

> **ROUTE-01 success criterion:** "System splits `/proposals/new` into a 3-step wizard at three new routes ... A stepper widget at the top of each step shows current/done/pending state"

### Steps

1. **Open Chrome.** Navigate to `<Base URL>/login`. Log in as Partner A.
2. After login, navigate to `<Base URL>/proposals/new/parametres`.
3. **Expected — page chrome:**
   - Page title (browser tab): `Nouvelle proposition — Leasétic Matrice` (or equivalent).
   - Heading on page: `Paramètres du projet`.
   - Subtitle below: `Saisissez les informations du client et les détails du projet. Vous pourrez sauvegarder à tout moment et reprendre plus tard.`
   - URL: redirected to `<Base URL>/proposals/new/parametres?draft_id=<a-uuid>` (a fresh draft minted; D-02).
4. **Expected — Stepper state:**
   - Step 1: ACTIVE (green-filled circle with white `1` numeral).
   - Step 2: PENDING (outlined circle with muted `2` numeral, NO link).
   - Step 3: PENDING (outlined circle with muted `3` numeral, NO link).
5. **Expected — Action bar (bottom of page):**
   - NO `← Précédent` link (omitted on step 1 per D-19).
   - `Enregistrer comme brouillon` ghost button (visible, enabled).
   - `Continuer vers le calcul →` primary green CTA (visible, enabled).
6. **D-03 self-heal test — direct URL access without `draft_id`:**
   - Open a NEW tab. Navigate to `<Base URL>/proposals/new/calcul` (no query param).
   - Expected: silently redirected to `/proposals/new/parametres?draft_id=<new-uuid>` (D-03 spawns a fresh draft).
7. **D-03 self-heal test — same for verification:**
   - Open a NEW tab. Navigate to `<Base URL>/proposals/new/verification` (no query param).
   - Expected: silently redirected to `/proposals/new/parametres?draft_id=<new-uuid>`.

### Pass/fail checklist

- [ ] Step 1 page renders with correct heading + subtitle + URL.
- [ ] Stepper shows step 1 ACTIVE, steps 2 + 3 PENDING (no done-checks).
- [ ] Action bar has NO ← Précédent on step 1; both Save + Continuer buttons visible.
- [ ] Direct `/calcul` access without `draft_id` redirects to `/parametres`.
- [ ] Direct `/verification` access without `draft_id` redirects to `/parametres`.

**Issue?**
> _(operator writes inline notes here if anything unexpected)_

---

## Test 2 — ROUTE-01 criterion 2: Draft persistence (close browser + reopen)

> **ROUTE-01 success criterion:** "State persists between steps via the `draft` proposal row (DB-01)"

### Steps

1. From Test 1's step 1 page (Partner A, with a fresh `draft_id`), **fill in all 7 default fields:**
   - `Nom du client` (clientCo): `Acme Industries`
   - `Personne de contact` (clientName): `Jean Dupont`
   - `Email` (clientEmail): `jean.dupont@acme.example`
   - `Téléphone` (clientTel): `01 23 45 67 89`
   - `Référence du projet` (partnerRef): `DEVIS-2026-SMOKE-001`
   - `Montant HT` (amountHT): `75000`
   - `Durée du contrat` (durationMonths): click `48 mois` segment.
2. **Note the `draft_id`** in the URL bar. Copy it somewhere — you'll need it after the browser close.
3. Click `Continuer vers le calcul →`.
4. **Expected (step 2):**
   - URL: `/proposals/new/calcul?draft_id=<same-uuid>`.
   - Page heading: `Résultat du calcul`.
   - Stepper: step 1 DONE (green-filled with white check ✓), step 2 ACTIVE, step 3 PENDING.
   - Hero loyer card visible with a computed amount (e.g. `1 771,88 €` for 75000 / 48mo / 5% commission / t2 coefficient).
   - Hero card has chip `Tranche 2 · Coefficient 2,2500 %` top-right.
   - `Détail du calcul` card visible with 5 rows including `Commission apporteur` with sublabel `(non visible client)`.
   - Commission amount row shows a non-zero value (e.g. `3 750,00 €` for 75000 × 5%).
5. **Close the browser tab entirely** (NOT just navigate away — actually close the tab via the X button).
6. **Open a new tab.** Navigate to `<Base URL>/proposals/new/parametres?draft_id=<the-uuid-from-step-2>`.
7. **Expected (back on step 1):**
   - All 7 fields pre-populated with the values from step 1 above (Jean Dupont, Acme Industries, 75000, 48 mois, etc.).
   - Stepper: step 1 ACTIVE, step 2 DONE (✓), step 3 PENDING.
     - **Why step 2 shows done:** the partner advanced past step 1 by clicking Continuer, so `_completedSteps` contains `[1]`. Per D-22 navigate-preserves-state, returning to step 1 does NOT clear it.
   - Wait — re-read D-20: `_completedSteps=[1]` after Continuer on step 1. So step 2 should be PENDING (not yet reached). Re-verify the exact Stepper state matches `[1]`.
   - **Corrected expectation:** Stepper shows step 1 ACTIVE, step 2 PENDING (not yet completed), step 3 PENDING. Step 1 has NO done-check because the partner is currently ON step 1.

### Pass/fail checklist

- [ ] Step 1 fields persist across browser close + reopen via `?draft_id=` (DB-01 Postgres draft row read back).
- [ ] Step 2 renders correct loyer for 75000/48mo (verify against `npm test src/lib/calc/calc.golden.test.ts` if needed — should be ~1 771,88 € with default seedParams).
- [ ] Commission row visible on step 2 with `(non visible client)` sublabel.
- [ ] Stepper state after re-opening step 1: step 1 ACTIVE; downstream PENDING per D-20.

**Issue?**
> _(operator writes inline notes here if anything unexpected)_

---

## Test 3 — ROUTE-01 criterion 3: Stepper completed-step navigation + D-21 edit-invalidates-downstream

> **ROUTE-01 success criterion:** "partners can click back to any *completed* step but cannot jump ahead"

### Steps

1. Start from a fresh draft (or reuse Test 2's draft). Log in as Partner A, navigate to `/proposals/new/parametres?draft_id=<uuid>`.
2. Fill all 7 fields (as in Test 2 if not already there). Click `Continuer vers le calcul →`.
3. On step 2, click `Continuer vers la vérification →`.
4. **Expected (step 3):** page heading `Vérifier la proposition`; Stepper shows step 1 ✓ DONE, step 2 ✓ DONE, step 3 ACTIVE; 2-column layout with 3 recap cards (CLIENT / PROJET / CALCUL) on left + PDF preview mock on right.
5. **Stepper backward navigation test (D-22 navigate-preserves):**
   - Click the **step 1 circle** in the Stepper (should be wrapped in a `<Link>` to `/parametres?draft_id=<uuid>`).
   - Expected: navigate to step 1. Stepper now shows step 1 ACTIVE, step 2 ✓ DONE, step 3 ✓ DONE. _completedSteps was `[1,2]` and remains `[1,2]` per D-22.
6. **Pending-step click test (D-22 — pending = not interactive):**
   - From a state where `_completedSteps = []` (e.g. brand-new draft just after `parametres` redirect), try clicking the **step 3 circle**.
   - Expected: nothing happens. No URL change. The pending circle has no `<Link>` wrapper.
7. **D-21 edit-invalidates-downstream test:**
   - From step 3 (where you have `_completedSteps = [1, 2]`), click the **step 1 circle** in the Stepper (or the `← Modifier` link on the `● PROJET` recap card on step 3).
   - On step 1, change `Montant HT` from `75000` to `100000`.
   - Click `Continuer vers le calcul →`.
   - **Expected (step 2):** the page renders the NEW loyer (computed for 100000) AND the Stepper now shows: step 1 ✓ DONE, step 2 ACTIVE, step 3 PENDING (step 3's done-check has been cleared per D-21 because a step-1 input changed).
   - **Why:** plan 13-02's completedSteps.ts `deriveCompletedSteps` detected a `step-1-owned` input change (amountHT) and trimmed `_completedSteps` to `[]`, then markStepCompleted added step 1 → result `[1]`. Step 2 + 3 done-marks cleared per D-21.

### Pass/fail checklist

- [ ] Stepper step 1 circle (when done) navigates back to /parametres preserving state.
- [ ] Stepper pending step circles (e.g. step 3 from a fresh draft) are not clickable.
- [ ] D-21 edit on step 1 + Continuer clears downstream done-marks (step 3 goes PENDING).
- [ ] D-22 navigate-back (Stepper done-link or ← Modifier) does NOT clear done-marks (separate from edit).

**Issue?**
> _(operator writes inline notes here if anything unexpected)_

---

## Test 4 — ROUTE-01 criterion 4: Finalize transitions draft → active + PDF generation + appears in partner list

> **ROUTE-01 success criterion (implied by the wizard flow):** finalize produces a real PDF, flips status to `active`, makes the proposal visible to the partner.

### Steps

1. From a draft with all fields valid (recover Test 2's or create fresh), navigate to step 3 `/proposals/new/verification?draft_id=<uuid>`.
2. **Expected (step 3 ready state):**
   - All 3 recap cards visible on the left (● CLIENT / ● PROJET / ● CALCUL).
   - PDF preview mock card visible on the right with `LC-2026-XXX` literal placeholder, `Proposition de financement` title, and the computed loyer value.
   - Action bar shows: `← Précédent` ghost link + `Enregistrer comme brouillon` ghost button + `Confirmer & Générer le PDF` primary green CTA.
3. Click `Confirmer & Générer le PDF`.
4. **Expected — finalize-in-flight UX (D-24):**
   - CTA disables immediately (cannot double-click).
   - Label morphs to `Génération en cours…` with a Loader2 spinner icon spinning.
   - Other action-bar buttons (← Précédent, Save) also disabled.
   - `aria-busy="true"` on the button (Inspect Element to verify).
5. **Expected — after ~1-3 seconds:**
   - Browser redirects to `/proposals/<new-uuid>` (a NEW uuid, distinct from the draft id).
   - Sonner success toast appears bottom-right: `Proposition générée ✓`.
6. **Verify the proposal appears in the partner list:**
   - Navigate to `<Base URL>/` (partner home).
   - The newly-created proposal must appear in the partner's proposal list with an `active` StatusChip (green pill labelled `Active` or `Actif`).
   - The previous draft row should no longer appear as a separate row (since its status flipped to `active`).
   - **Phase 14 note:** the Brouillons MetricTile + draft list page do not yet exist in Phase 13. For now, verify in the DB directly that the original draft row's `status` column is now `active` (optional):
     ```sql
     SELECT id, status, lc_ref, pdf_blob_key FROM proposals WHERE id = '<the-draft-uuid>';
     ```
7. **Verify the generated PDF — download + inspect:**
   - From `/proposals/<new-uuid>`, locate the PDF download link.
   - Click it; the PDF downloads.
   - Open the PDF in your PDF viewer. Verify:
     - Header shows `LEASÉTIC` brand mark.
     - Title: `Proposition de location financière` (FR) or `Financial lease proposal` (EN).
     - `Réf. LC-YYYY-NNNN` (real allocated lc_ref, not the `XXX` placeholder).
     - Recipient block shows partnerCo + clientCo.
     - Computation breakdown shows amountHT + durationMonths + coefficient.
     - LOYER MENSUEL card shows the computed amount (e.g. `1 771,88 €`).
     - **CRITICAL: NO `Commission` text anywhere in the PDF body.**
     - **CRITICAL: NO commission amount value (e.g. `3 750,00 €` for the test fixture) anywhere in the PDF body.**

### Pass/fail checklist

- [ ] CTA disables + label morphs to `Génération en cours…` with spinner.
- [ ] After finalize, browser redirects to `/proposals/<new-uuid>`.
- [ ] Sonner success toast `Proposition générée ✓` appears.
- [ ] New proposal appears in partner home list with `active` chip.
- [ ] Downloaded PDF renders correctly with all expected sections.
- [ ] **PDF contains NO commission text and NO commission amount** (load-bearing ADMIN-09 invariant).

**Issue?**
> _(operator writes inline notes here if anything unexpected)_

---

## Test 5 — ROUTE-01 criterion 5: Cross-partner draft isolation

> **ROUTE-01 success criterion:** "draft visibility scoped to creator" (Partner A's draft must NOT be reachable by Partner B).

### Steps

1. **As Partner A:** Open Chrome. Log in as Partner A. Navigate to `/proposals/new/parametres`.
2. **Mint a fresh draft** (the URL gets a new `?draft_id=<A-uuid>`).
3. Fill in a couple of fields (e.g. clientCo `Confidential Acme A`, clientName `Top Secret A`). Click `Enregistrer comme brouillon`.
4. **Note the Partner-A `draft_id`** (`<A-uuid>`). Copy it.
5. **Log out** as Partner A (use the topbar menu or `<Base URL>/logout`).
6. **Open a new incognito/private window.** Navigate to `<Base URL>/login`. **Log in as Partner B.**
7. **Attempt to access Partner A's draft directly:** navigate to `<Base URL>/proposals/new/parametres?draft_id=<A-uuid>` (the uuid from step 4).
8. **Expected (D-03 silent self-heal):**
   - The URL changes to `/proposals/new/parametres?draft_id=<B-new-uuid>` (a NEW uuid for Partner B, not Partner A's).
   - The form is EMPTY (no `Confidential Acme A`, no `Top Secret A`, no other Partner A data).
   - No error message. No 404 page. No partial leak (e.g., a flash of Partner A's data before the redirect).
9. **Sanity check the URL:** confirm `<B-new-uuid> ≠ <A-uuid>`.
10. **Repeat for `/calcul` and `/verification`:** try `<Base URL>/proposals/new/calcul?draft_id=<A-uuid>` and `<Base URL>/proposals/new/verification?draft_id=<A-uuid>` as Partner B. Both should silently redirect to `/parametres?draft_id=<B-new-uuid>` (or to an existing B-owned draft if Partner B has any).

### Pass/fail checklist

- [ ] Partner B trying to access Partner A's draft_id is silently redirected to a fresh B-owned draft on /parametres.
- [ ] Partner B's URL after redirect has a DIFFERENT uuid (own draft, not A's).
- [ ] Partner B sees an EMPTY form, no leak of A's input field values.
- [ ] D-03 silent redirect works identically for /calcul and /verification routes.

**Issue?**
> _(operator writes inline notes here if anything unexpected)_

---

## Test 6 — ADMIN-09 commission-invisibility envelope (D-12 + D-28)

> **D-12 + D-28:** commission visible EXACTLY on step 2 + step 3 (partner-facing surfaces); INVISIBLE everywhere else.

This test is the **manual companion** to plan 13-06 Task 2's automated
no-commission.test.ts. Where the automated test inspects 30 PDFs
programmatically, this test verifies the human-visible surfaces.

### Steps

1. **Setup:** as Partner A, mint a fresh draft on `/parametres`, fill all 7 fields (use `amountHT=75000`, `durationMonths=48`). Click `Continuer vers le calcul →`. You should now be on step 2 with a non-zero commission row (e.g. `3 750,00 €` for 5% commission rate).
2. **Step 2 visibility (positive control):**
   - Verify the commission amount is visible in the `Détail du calcul` card, row labelled `Commission apporteur` with sublabel `(non visible client)`.
   - Open DevTools (F12). Right-click the commission value → Inspect.
   - **Expected:** the value is rendered as plain text inside a `<dd>` or `<span>` element. NO `data-commission-*` attribute. NO `aria-label` containing the amount. NO hidden input. NO clipboard-only invisibility.
3. **Network tab check:**
   - In DevTools, switch to the Network tab. Reload the page.
   - Filter by `/api/`. Inspect any JSON API responses.
   - **Expected:** the commission value does NOT appear in any `/api/*` response payload (the page is server-rendered, so commission is in the HTML body, NOT in a JSON API response).
4. **View source check — step 2 commission appears EXACTLY ONCE:**
   - Right-click anywhere on step 2 → `View page source` (or DevTools Sources tab).
   - Search (Ctrl/Cmd+F) for the formatted commission value (e.g. `3 750,00 €` or `3 750`).
   - **Expected:** EXACTLY ONE occurrence (in the Détail du calcul row only). NOT zero, NOT more than one.
5. **Step 3 visibility check:**
   - Click `Continuer vers la vérification →` to advance to step 3.
   - Verify the commission amount appears in the `● CALCUL` recap section (e.g. row labelled `Commission` with the same amount).
   - View source on step 3, search for the formatted commission value.
   - **Expected:** EXACTLY ONE occurrence (in the ● CALCUL recap card on the left column). NOT zero, NOT more than one. The PDF preview mock on the right column shows `LOYER MENSUEL` + the loyer value BUT NOT the commission.
6. **Post-finalize check — commission INVISIBLE on saved proposal detail:**
   - Click `Confirmer & Générer le PDF`.
   - After redirect to `/proposals/<new-uuid>`, view source.
   - Search for the formatted commission value.
   - **Expected:** ZERO occurrences. The saved proposal detail page does not surface commission (Phase 8 invariant, unchanged in Phase 13).
7. **PDF binary check (REQUIRES `pdftotext`):**
   - Download the PDF from `/proposals/<new-uuid>`.
   - Extract text: `pdftotext /path/to/downloaded.pdf -` (output to stdout).
   - Search the extracted text for `Commission` (case-insensitive): `pdftotext /path/to/file.pdf - | grep -i commission`.
   - **Expected:** ZERO matches. No `Commission` label, no commission amount.
   - Also search for the commission amount: `pdftotext /path/to/file.pdf - | grep "3 750"` (or whatever the fixture's value is).
   - **Expected:** ZERO matches.
8. **`audit_log` payload check (OPTIONAL — REQUIRES `psql` or Drizzle Studio):**
   - Query the audit_log row for this proposal:
     ```sql
     SELECT actor_id, action, payload, created_at
     FROM audit_log
     WHERE action = 'proposal.create'
       AND payload->>'lcRef' = '<the-real-lc-ref-from-the-PDF>'
     ORDER BY created_at DESC LIMIT 1;
     ```
   - **Expected:** the `payload` jsonb column contains ONLY `{ "lcRef": "LC-YYYY-NNNN" }`. No `commission` key. No commission amount as a value.

### Pass/fail checklist

- [ ] Step 2 commission visible in normal HTML text (no hidden attributes).
- [ ] No commission value in /api/* response payloads (Network tab).
- [ ] Step 2 view-source: commission appears EXACTLY ONCE.
- [ ] Step 3 view-source: commission appears EXACTLY ONCE (in ● CALCUL recap, NOT in PdfPreviewMock).
- [ ] /proposals/<id> view-source: commission appears ZERO times.
- [ ] PDF binary via `pdftotext`: ZERO `Commission` matches; ZERO commission amount matches.
- [ ] (Optional) audit_log payload has only `{ lcRef }`, no commission.

**Issue?**
> _(operator writes inline notes here if anything unexpected)_

---

## Test 7 — Edge cases + error paths

These are quick sanity checks, not ROUTE-01 success criteria but worth verifying:

### 7.1 — Validation error on step 1

1. On step 1 (`/parametres`), CLEAR all fields. Try to click `Continuer vers le calcul →`.
2. **Expected:** sonner error toast `Veuillez corriger les erreurs dans le formulaire.`; focus moves to the first invalid field (e.g. clientCo); inline `.error-msg` red text under each required field.
3. **Expected:** URL does NOT change (stays on `/parametres`).

### 7.2 — On-demand path on step 2

1. On step 1, enter `Montant HT = 750000` (above 500k seuil). Pick any duration. Click `Continuer vers le calcul →`.
2. **Expected (step 2):** hero loyer card renders `Sur demande` (not a numeric value); sublabel `Contactez Leasétic`; tranche chip hidden; Détail card shows `—` placeholders for coefficient and loyer rows; primary CTA `Continuer vers la vérification →` STAYS ENABLED (partner can still finalize; the PDF will render "Sur demande").

### 7.3 — Save-as-draft round-trip

1. From any step, click `Enregistrer comme brouillon`.
2. **Expected:** action bar disables briefly; on success, browser redirects to `/` (partner home) with sonner toast `Brouillon enregistré ✓`.
3. **Verify in DB (or via `/proposals/new/parametres?draft_id=<the-uuid>`):** the draft row still has `status='draft'`, all fields intact.

### 7.4 — Accordion expand/collapse

1. On step 1, click the `+ Plus de détails (facultatif)` accordion trigger.
2. **Expected:** accordion animates open over ~200ms; 5 optional fields appear (clientRole, clientSiren, projectDesc, slb toggle, evalParc toggle); the `+` icon rotates to `−` (or similar). Reload page — the accordion stays OPEN (because `_uiAccordionOpen: true` was persisted).
3. Click the trigger again — accordion collapses, reload, stays collapsed.

### 7.5 — `← Précédent` from step 2 + step 3

1. From step 2, click `← Précédent`. Expected: navigates to step 1; `_completedSteps` unchanged (D-22).
2. From step 3, click `← Précédent`. Expected: navigates to step 2; `_completedSteps` unchanged.

### Pass/fail checklist

- [ ] Step 1 validation error path works (sonner toast + inline errors).
- [ ] On-demand path on step 2 renders correctly.
- [ ] Save-as-draft round-trip works (DB row stays in `draft` status).
- [ ] Accordion expand/collapse animates + persists state across reload.
- [ ] ← Précédent on step 2 + step 3 navigates back without state change.

**Issue?**
> _(operator writes inline notes here if anything unexpected)_

---

## Cross-Browser Verification

After completing Tests 1-7 in **Chrome**, repeat the entire suite in
**Microsoft Edge** (the second required browser per PROJECT.md desktop-primary constraint).

Note any rendering differences (font hinting, button shadows, transition timing).
These are NOT failures unless the difference breaks functionality or visibly violates the spec — minor pixel-level variations between Chrome and Edge are acceptable.

### Edge-specific checklist

- [ ] Edge — Test 1: routes render + Stepper state correct.
- [ ] Edge — Test 2: draft persistence (close + reopen).
- [ ] Edge — Test 3: Stepper navigation + D-21 edit-invalidates-downstream.
- [ ] Edge — Test 4: finalize + PDF generation + partner list.
- [ ] Edge — Test 5: cross-partner isolation.
- [ ] Edge — Test 6: ADMIN-09 commission invisibility envelope.
- [ ] Edge — Test 7: edge cases + error paths.

---

## Pass/Fail Verdict

All 7 tests must pass in **BOTH Chrome AND Edge** to mark Phase 13 ready
for `/gsd-transition`.

| Test | Chrome | Edge |
|---|---|---|
| Test 1 — Routes + Stepper state | ☐ | ☐ |
| Test 2 — Draft persistence | ☐ | ☐ |
| Test 3 — Stepper navigation + D-21 | ☐ | ☐ |
| Test 4 — Finalize + PDF + list | ☐ | ☐ |
| Test 5 — Cross-partner isolation | ☐ | ☐ |
| Test 6 — ADMIN-09 envelope | ☐ | ☐ |
| Test 7 — Edge cases | ☐ | ☐ |

**Operator signature:** _____________________ **Date:** ______________

**Browsers/versions tested:**
- Chrome: __________ (e.g. 132.0.6834.84)
- Edge: __________ (e.g. 132.0.2957.55)

**Overall verdict (circle one):**
- ✅ **PASS** — all 7 tests pass in both browsers; Phase 13 ready for `/gsd-transition`.
- ❌ **FAIL** — at least one test failed; describe failure inline in the relevant test's "Issue?" section. Executor will iterate on the failing surface.

---

## Recovery / Iteration Path

If any test fails:

1. Describe the failure inline in the test's "Issue?" section (browser, exact URL, expected vs actual).
2. Provide reproduction steps (any non-default test data, any timing factor).
3. If the failure is reproducible: hand the runbook back to the executor agent. The executor will:
   - Triage the failure as a Rule 1 bug (auto-fix) OR Rule 4 architectural change (return to user).
   - For Rule 1: fix the code, add a regression test, re-run npm test, deploy, ask operator to re-run the failing test.
   - For Rule 4: STOP and surface the architectural decision to the user.
4. Re-run only the failing test + its dependencies (don't re-run the entire suite unless the fix is cross-cutting).
5. Once green, complete this runbook end-to-end one final time and sign off.

---

## References

- ROUTE-01 requirement: [`.planning/REQUIREMENTS.md`](../../.planning/REQUIREMENTS.md)
- Phase 13 context: [`.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md`](../../.planning/phases/13-3-step-proposal-wizard/13-CONTEXT.md)
- Phase 13 UI spec: [`.planning/phases/13-3-step-proposal-wizard/13-UI-SPEC.md`](../../.planning/phases/13-3-step-proposal-wizard/13-UI-SPEC.md)
- D-12 + D-28 decisions: 13-CONTEXT.md §Decisions
- STRIDE addendum: [`../security/13-stride-addendum-admin09-step2.md`](../security/13-stride-addendum-admin09-step2.md)
- Automated no-commission test: `src/lib/pdf/no-commission.test.ts`
- Automated Stepper integration test: `src/lib/wizard/stepperBehavior.test.ts`
