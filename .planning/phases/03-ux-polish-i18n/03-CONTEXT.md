# Phase 3: UX Polish & i18n — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** Inline questioning during /gsd:new-project + Phase 1 & 2 handoffs

<domain>
## Phase Boundary

**In scope for Phase 3 — the final polish phase:**
- Toast notification system (replaces success/info alerts)
- Real-time field validation (red border on blur, clears on input)
- Auto-focus first empty required field on failed generate
- Keyboard shortcuts (Enter = generate, Esc = reset with confirm)
- Progress indicator (3-step breadcrumb: Saisie → Résultat → Proposition)
- FR/EN language toggle (persists via `lt_lang`)
- Full i18n dictionary covering every UI string + every proposal static label
- Coefficient displayed in Résultat tab
- "Copier la référence" button (clipboard API + toast)
- Validity override in admin (15/30/60 days, persisted as `lt_validity`)
- Aperçu rapide mode (inline result without full proposal generation — already mostly present in v10)
- Final manual test checklist covering PARITY + SEC + UX + FR + EN in Chrome + Edge

**Explicitly OUT of Phase 3:**
- Anything server-side / hosted / auth / dashboards — deferred
- Mobile-optimized layout — stays dégradé as v9/v10
- Additional languages beyond FR + EN — deferred
- Automated browser tests / Playwright — project policy is manual checklist
- Changes to calculation, tranche boundaries, localStorage key names, commission invisibility, RSE image content
</domain>

<decisions>
## Locked Implementation Decisions

### Toast system
- **DOM-based, no framework.** A single `#toast-container` div appended to body with `position: fixed; top: 1rem; right: 1rem; z-index: 200;`.
- **`showToast(message, type = 'ok', duration = 3000)`** helper in UTILS. Types: `'ok'` (green), `'err'` (red), `'info'` (teal). Reuses existing `--green`, `--danger`, `--teal` tokens.
- **Stacks:** multiple toasts stack vertically, newest on top.
- **Auto-dismiss** after duration; manual dismiss via click.
- **CSS transition** for slide-in from right + fade-out.
- **Max 3 visible at once** — older ones removed on overflow.
- **Replace `alert()` call sites for SUCCESS/INFO** (admin saved, migration upgraded, copied to clipboard, etc.)
- **Keep `confirm()` for destructive actions** (Réinitialiser, expired coefficients override) — safety over polish (UX-02 locks this)

### Real-time validation
- **Required fields:** `#client-co`, `#client-name`, `#amount`, selected duration, plus the partner fields (`#partner-co`, `#partner-name`) when generating for the first time.
- **Trigger:** `blur` event (not input) to avoid yelling at users mid-typing.
- **Visual:** `.invalid` CSS class adds `border-color: var(--danger)` and a subtle red background tint.
- **Cleared on:** next `input` event (user is typing again).
- **On submit (Générer click):** run all validators, collect first empty required field, auto-focus it, show a single error toast.
- **Duration buttons:** marking the duration group as invalid is via a `.invalid` class on the `.dg` wrapper (not individual buttons).

### Keyboard shortcuts (UX-05, UX-06)
- **Enter** inside the Saisie form (but NOT inside a textarea or contenteditable) → triggers `btn-gen` click.
- **Esc** anywhere except inside an admin modal input → triggers `btn-reset` click (which itself shows a confirm dialog per v9 behavior — add it now if missing).
- **Do NOT hijack:** Tab navigation, admin password input Enter (already has its own handler), or browser shortcuts (Ctrl+F, Ctrl+R).
- **Scope:** listen on `document.keydown` but guard with target checks.
- **Reset confirm:** must always show confirm dialog on Esc — this is irreversible.

### Auto-focus on failed submit (UX-07)
- When `btn-gen` click triggers validation and fails, iterate the required fields in DOM order, find the first empty one, call `.focus()` on it. If no field is empty but duration is missing, focus the first duration button.

### Progress indicator (UX-04)
- **Location:** a small breadcrumb row between the existing tabs bar and the page content, but ONLY visible on `#page-saisie` and `#page-resultat`. Hidden on `#page-proposition` (would compete with the "Modifier" button) and `#page-admin` (out of scope).
- **3 steps:** `1. Saisie` → `2. Résultat` → `3. Proposition`
- **States:** `.step-done` (green dot, check mark), `.step-current` (teal, filled circle), `.step-pending` (muted, empty circle)
- **No click-to-jump** — steps are informational only. Use existing tabs for navigation.

### FR/EN i18n (FEAT-01..03)
- **Storage:** JavaScript object `I18N = { fr: { key: 'string' }, en: { key: 'string' } }` in a new **I18N** labeled section between STATE and UTILS.
- **Helper:** `const t = (key, ...args) => { const s = I18N[currentLang][key] || I18N.fr[key] || key; return args.length ? s.replace(/\{(\d+)\}/g, (_, i) => args[i]) : s; }` in UTILS.
- **Current lang:** `let currentLang = localStorage.getItem('lt_lang') || 'fr';`
- **Toggle button:** header right, text shows the OTHER language (e.g. button says "EN" when currently fr). Click switches, persists, and re-renders everything.
- **Re-render:** a `applyI18n()` function scans all elements with `data-i18n="key"` attribute and updates `textContent` (or `innerHTML` for trusted keys that include markup, but prefer textContent). Also re-renders the current proposal if `page-proposition` is active.
- **Keys must be hierarchical-ish** for sanity: `form.partner.co`, `form.client.name`, `proposal.tiles.solution.title`, `admin.save.success`, `toast.copied`, `error.password.wrong`, etc.
- **Proposal static labels translated:** "Offre de location financière", "Points d'intérêt identifiés", "Pourquoi choisir Leasétic?", all 5 tile titles + texts, conditions block, footers.
- **Keep untranslated:** numeric formatting (use locale-aware `toLocaleString('fr-FR')` in FR, `'en-US'` in EN for numbers if desired — but currency symbol stays €), partner/client entered names, company name "Leasétic".
- **RSE page** is a base64 image → cannot translate the image content. Add a small bilingual caption below the image if FEAT-03 strictly requires it. Otherwise note in PLAN that the RSE slide stays French.

### Coefficient display (UX-09)
- In Résultat tab (`#res-detail`), after the existing content, add: `Coefficient appliqué : X.XXXX %` (4 decimal places to match admin input precision).
- i18n key: `result.coefficient.label` → "Coefficient appliqué" / "Applied coefficient"
- Hidden when `onDemand === true` (no coefficient applies).

### Copy LC reference (UX-10)
- In Résultat tab AND in Proposition tab, next to the rendered reference, add a small button labeled with a copy icon + text.
- Click: `navigator.clipboard.writeText(data.ref)` → `showToast(t('toast.copied'))`.
- Fallback if clipboard API unavailable: select the reference text (edge case, unlikely in target browsers).

### Validity override (FEAT-04, FEAT-05)
- **Admin panel** gains a new field: dropdown `#validity-days` with options 15 / 30 / 60 (default 30).
- **Storage:** `lt_validity` — integer, default 30.
- **`expiryDate()` function in CALC:** changes from "add 1 month" to "add `getValidity()` days". The current v9/v10 implementation uses a French "dd month yyyy" string parse + add-1-month; simplify to ISO-ish date arithmetic (`new Date(genDate.getTime() + days * 86400000)`) and reformat back to FR long date.
- **Backward compat:** if `lt_validity` is missing, treat as 30 (matches current v10 behavior).
- **Proposal conditions block** must show the correct validity in the translated string.

### Aperçu rapide (FEAT-06)
- v10 already has inline result in the Saisie tab (`#inline-res`). The "Aperçu rapide" feature in v2 spec is about clearly labeling this as a preview vs a committed generation.
- **Change:** add a small label "Aperçu" above `#inline-res` and a visual distinction (lighter border, muted background) vs the Résultat tab.
- **Don't duplicate** the calc logic — reuse `calcRent()` already in place.

### Final test pass (TEST-01, TEST-03, TEST-04, TEST-05)
- **Deliverable:** `FINAL-TEST.md` — combined manual checklist for the final ship decision. Sections:
  - A. PARITY re-run (link to PARITY-AUDIT.md)
  - B. SEC re-run (link to SEC-TEST.md)
  - C. UX tests (all 10 UX REQs + 6 FEAT REQs) — one row per REQ with step-by-step
  - D. FR-only smoke run (set lang to FR, do full partner → client → generate → PDF flow)
  - E. EN-only smoke run (same flow but switch to EN first)
  - F. Migration re-test (fresh install → plaintext v9 → hashed v10, all must work in FR + EN)
  - G. Browser matrix: Chrome + Edge mandatory, Firefox + Safari if time permits
  - H. Sign-off block: Antoine's go/no-go

### Claude's Discretion
- Exact wording of French and English strings (Claude writes drafts; Antoine reviews)
- Icon choices (use Unicode symbols like ✓ ✗ ⚠ 📋 — already consistent with v9 style, no icon font)
- Toast animation timing curves
- Breadcrumb visual weight
- Whether the i18n dictionary is split into subsections by screen (form / result / proposal / admin / toast / error) or flat keyed
- Whether to add a `data-i18n-attr="placeholder"` pattern for input placeholders or only for textContent
</decisions>

<specifics>
## Specific References

- **Baseline:** `Matrice_2026_THE_Leasetic-v10.html` (post-Phase-2: hashed password + escapeHtml sweep + assertCalc/assertEscape self-checks)
- **v10 section layout (from Phase 1 scaffold):**
  - `<style>`: TOKENS / LAYOUT / COMPONENTS / PRINT
  - `<script>`: STATE / UTILS / CALC / ADMIN / PROPOSAL / MIGRATION / INIT
- **Phase 3 introduces:** a new I18N section between STATE and UTILS
- **Known alert() call sites to replace with toast** (from Phase 2 audit):
  - Admin save success ("Coefficients enregistrés")
  - Password change success
  - Migration console logs → toast info versions? (probably stay console, too noisy)
  - Copy LC confirmation (new, via showToast)
- **Known confirm() call sites to KEEP:**
  - Réinitialiser button
  - Expired coefficients override
- **Existing helpers to leverage:**
  - `escapeHtml()` (Phase 2)
  - `hashPassword()` (Phase 2)
  - `calcRent()` / `tKey()` (v9/v10)
  - `$()` DOM helper from Phase 1
- **`data-i18n` attribute convention:**
  - `data-i18n="form.partner.co"` → updates textContent
  - `data-i18n-placeholder="form.partner.co.placeholder"` → updates placeholder attribute
  - `data-i18n-title="..."` → updates title attribute
- **Migration edge case:** on lang switch, the already-rendered proposal (if any) must re-render in the new language. Otherwise users see half-translated output until they regenerate.

## i18n dictionary scope (key categories)

- `header.*` — header labels, admin button, generate button
- `tab.*` — tab labels
- `form.partner.*` — partner block
- `form.client.*` — client block
- `form.interests.*` — sale & lease-back + evaluation
- `form.project.*` — amount, duration, desc, ref
- `form.duration.*` — 36/48/60 mois
- `result.*` — inline preview, final result, coefficient label
- `proposal.*` — all proposal static labels including "Pourquoi Leasétic?" tile titles + texts
- `admin.*` — admin panel labels including new validity dropdown
- `step.*` — progress indicator labels
- `toast.*` — success/info toast messages
- `error.*` — error messages
- `confirm.*` — confirm dialog texts
- `common.*` — € HT, Oui, Non, Page 1/2, etc.
</specifics>

<deferred>
## Deferred to Post-v10 Milestones

- Additional languages (DE, IT, ES, PT)
- RTL support
- Mobile-optimized layout
- Server-side hosted version
- Partner SSO
- Centralized LC dashboard
- Email/webhook integration
- Excel export
</deferred>

---

*Phase: 03-ux-polish-i18n*
*Context gathered: 2026-04-15 inline during /gsd:plan-phase 3*
