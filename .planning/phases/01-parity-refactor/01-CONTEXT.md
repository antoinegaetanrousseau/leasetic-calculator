# Phase 1: Parity Refactor — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** Inline questioning during /gsd:new-project session

<domain>
## Phase Boundary

**In scope for Phase 1:**
- Refactor the 911-line `Matrice_2026_THE_Leasetic-v9.html` into `Matrice_2026_THE_Leasetic-v10.html`
- Preserve 100% of v9 functional behavior (forms, calc, admin, banners, proposal rendering, PDF print, HTML download, reset, quarterly lockout)
- Modernize the `<script>` tag to ES6+ (const/let, arrow functions, template literals)
- Organize `<script>` and `<style>` into clearly labeled sections
- Read existing v9 localStorage keys transparently — no data loss for existing partners
- Add an on-load calculation self-check (`assertCalc()`) that verifies the formula against known fixtures

**Explicitly OUT of Phase 1 (deferred to Phase 2/3):**
- Password hashing (MIGRATE-02, SEC-01..05) — Phase 2
- XSS sanitization (SEC-03, SEC-04) — Phase 2
- Toasts, real-time validation, keyboard shortcuts (UX-01..10) — Phase 3
- FR/EN i18n (FEAT-01..03) — Phase 3
- Validity override, Aperçu rapide, Copy LC, coefficient display (FEAT-04..06, UX-09, UX-10) — Phase 3
</domain>

<decisions>
## Locked Implementation Decisions

### File & structure
- **Output file:** `Matrice_2026_THE_Leasetic-v10.html` — ship alongside v9, don't replace (rollback safety)
- **Monofichier constraint:** single HTML file, inline `<style>` + `<script>`, no build chain, no npm, no framework
- **Only external dep:** Google Fonts Inter CDN (unchanged from v9)
- **Section organization in `<script>`:** `/* ===== STATE ===== */`, `/* ===== UTILS ===== */`, `/* ===== CALC ===== */`, `/* ===== ADMIN ===== */`, `/* ===== PROPOSAL ===== */`, `/* ===== MIGRATION ===== */`, `/* ===== INIT ===== */`
- **Section organization in `<style>`:** `/* ===== TOKENS ===== */`, `/* ===== LAYOUT ===== */`, `/* ===== COMPONENTS ===== */`, `/* ===== PRINT ===== */`

### Backward compatibility (MIGRATE)
- **v9 localStorage keys are authoritative:** `lt_coeffs`, `lt_comm`, `lt_max`, `lt_qtr`, `lt_pw`, partner persistence key (`PART_KEY` in v9 — confirm exact key name from source)
- **On first v10 open:** read all existing v9 keys without mutating them. No forced re-entry.
- **No schema changes in Phase 1.** Password stays plaintext in Phase 1 (Phase 2 upgrades it to hashed — MIGRATE-02/SEC-01 live in Phase 2 explicitly to keep Phase 1 as a pure behavioral twin).

### Calculation (FROZEN — do not touch)
- **Formula:** `loyer = montantHT × (1 + commission / 100) × coefficient / 100`
- **Tranche detection:** `tKey(a)` — null ≤25k, t1 ≤50k, t2 ≤100k, t3 ≤250k, t4 >250k
- **"Sur demande" threshold:** when `amount > lt_max`
- **Self-check fixtures:** at least 4 known amount/duration/tranche combos verified on page load. If assertion fails, log to console but don't block UI.

### Proposal rendering (must be pixel-identical)
- 2 A4 pages — page 1 financial offer, page 2 RSE slide (base64 embedded image from v9, copied verbatim)
- `window.print()` + `@media print` CSS (no server-side PDF)
- Filename format: `yyyy-mm-dd_Client_Partner_THE_LC-XXXXX`
- LC reference: `LC-` + Math.floor(Math.random() × 90000 + 10000)
- Commission apporteur stays INVISIBLE in all output (static rule)

### ES6+ refactor rules
- **Zero `var`** — all converted to `const` (default) or `let` (only for reassigned)
- **Arrow functions** where idiomatic — keep top-level named functions as `function` declarations for hoisting in the init block
- **Template literals** replace all string concatenation in HTML-building code
- **No ES2020+ features that risk Safari/Edge compat** — stick to ES2017 (async/await OK, optional chaining OK, no top-level await, no numeric separators)

### Admin access (unchanged behavior)
- Password field check stays plaintext in Phase 1 (Phase 2 upgrades)
- Default password remains `leasetic2025` for fresh installs
- Admin panel editing of 12 coeffs / commission / max / new password all work identically to v9

### Claude's Discretion
- Internal helper naming (e.g. `$()` DOM helper, `escape()` stub for Phase 2, element caching strategy)
- Whether to create a small `state` object as a single source of truth vs leaving vars scattered
- Exact wording of labeled section comments
- Whether the `assertCalc()` self-check runs in all environments or only when `?dev=1` is in the URL
</decisions>

<specifics>
## Specific References

- **Baseline file:** `./Matrice_2026_THE_Leasetic-v9.html` (911 lines) — the source of truth for every behavior that must be preserved
- **Spec document:** `Matrice_Spec_Produit_v2.docx` — §10.3 calls for ES6+, sectioned code, and the self-check test function (REFACTOR-06)
- **localStorage keys observed in v9:** `lt_pw`, `lt_coeffs`, `lt_comm`, `lt_max`, `lt_qtr` (confirm partner key name when reading source)
- **Fonts:** Google Fonts Inter (weights 300, 400, 500, 600, 700) — `@import url(...)` at top of `<style>`
- **CSS design tokens:** `--navy`, `--navy-dark`, `--green`, `--gd`, `--gl`, `--teal`, `--paper`, `--white`, `--ink`, `--muted`, `--border`, `--gold`, `--danger`, `--sidebar-w` — preserve all, don't rename
</specifics>

<deferred>
## Deferred to Later Phases

- **Phase 2:** SHA-256 password hashing (Web Crypto `crypto.subtle.digest`), plaintext auto-upgrade migration, XSS-safe HTML rendering via escape helper, `innerHTML` audit, password change requires current-password confirmation
- **Phase 3:** Toast notification system, real-time field validation with red border, keyboard shortcuts (Enter=generate, Esc=reset), FR/EN toggle + `i18n` dictionary, coefficient display in Résultat, "Copier la référence" button, validity override (15/30/60 days), Aperçu rapide mode, progress indicator, auto-focus on failed validation, manual test checklist execution
</deferred>

---

*Phase: 01-parity-refactor*
*Context gathered: 2026-04-15 inline during /gsd:new-project*
