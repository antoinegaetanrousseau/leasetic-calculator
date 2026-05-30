# Milestones — Matrice Commerciale

## v1.5 — Proposal List Actions & Pill Fix

**Shipped:** 2026-05-30
**Phases:** 2 (26-27) | **Plans:** 5 | **Plan↔Summary parity:** 5/5
**Requirements:** 6/6 active satisfied (ROWACT-02 per-row Delete descoped → Archive-only, D-01)
**Tests:** 1184 passing / 4 skipped (env-gated) / 0 failed · typecheck + `eslint --max-warnings=0` clean
**Git range:** `add7599..8dfb1d6` (37 commits since v1.4 tag · code +2,277 / −51 across 30 files)
**Timeline:** 2026-05-30 (1 day)
**Known deferred items:** 4 (stale planning artifacts from v1.1/v1.4 — see `STATE.md` Deferred Items)

### What shipped

A focused UI-regression milestone on the partner `/proposals` surface — no change to the core
proposal flow. Restored per-row management actions: active/expired rows now expose a per-row
**Archive** icon button (instant in-place refresh + toast), the Archivées view (`?archived=1`)
gains a per-row **Restore**, and draft rows keep their existing Edit + Archive + Delete set — all
without disturbing the ADMIN-09 commission-invisibility envelope (19-gate grep-contract suite stays
green). Per-row Delete on finalized rows was descoped mid-milestone (D-01): given the single
soft-delete state, Archive and Delete collapse to the same operation, so a single Archive button
ships. Separately, the status-pill rendering regression was fixed — the chip on both the home
"Propositions récentes" list and the `/proposals` table now hugs its content adaptively (trailing
`max-content` grid track), full label, aligned, in light and dark; the chip component + color
tokens stayed frozen.

### Key accomplishments

- **Active/expired row actions** — per-row Archive on non-draft rows + Restore in the Archivées view; instant in-place refresh + toast; body-click navigation preserved; `ProposalRowDto` never carries commission/`params_snapshot`; ADMIN-09 19-gate grep suite green (Phase 26: ROWACT-01/03/04/05; ROWACT-02 descoped D-01)
- **Status-pill rendering fix** — home "Propositions récentes" chip moved to a trailing content-hugging `max-content` grid track with a `justifySelf:'start'` wrapper, eliminating the fixed-90px stretch/clip; `/proposals` re-verified post-Phase-26 row-action slots; `globals.css` `.chip*` + `StatusChip.tsx` untouched (Phase 27: UIFIX-02/03)

### Verification

- Phase 26 — 3/3 plans verified; Phase 27 — 2/2 plans verified + **human-tested** (both surfaces, light + dark, FR + EN).
- Full vitest suite 1184 passing / 0 failed; `tsc --noEmit` clean; `eslint --max-warnings=0` clean.
- Code review (Phase 27, standard depth): 0 critical / 0 warning / 2 info (inert CSS, non-blocking).

### Known gaps
None — all active v1.5 requirements satisfied. (Teal rebrand BRAND-01/02/03 remains shelved as Future Requirements, descoped since v1.4 Phase 25.)

### Archive
- `milestones/v1.5-ROADMAP.md` · `milestones/v1.5-REQUIREMENTS.md`

---

## v1.4 — Partner Types, Admin Dual-View & Rebrand

**Shipped:** 2026-05-30
**Phases:** 4 (22-25) | **Plans:** 12 | **Plan↔Summary parity:** 12/12
**Requirements:** 19/19 active satisfied (BRAND-01/02/03 teal rebrand descoped)
**Tests:** 1184 passing / 4 skipped (env-gated) / 0 failed · typecheck clean
**Git range:** `6893a4f..effb59c` (129 commits) · code +12,244 / −1,421 across 155 files
**Timeline:** 2026-05-29 → 2026-05-30 (2 days)
**Known deferred items:** 4 (stale planning artifacts — see `STATE.md` Deferred Items)

### What shipped

A `partner_type` dimension (Agent / Commercial / Partenaire) that conditions proposal economics
end-to-end. Agent/Commercial proposals compute the loyer **without** the commission factor, with
commission **structurally absent** from every surface (wizard, live preview, dashboards, PDF,
server logs, audit payloads) — the first approved exception to the frozen formula, kept tightly
scoped (`Partenaire` formula + tranches unchanged; all existing accounts backfilled to
`Partenaire`). Plus a session-only Admin/Agent view toggle for admins, a PDF typography fix
(U+202F glyph overlap) + Destinataire-block removal, and admin-home label changes + status-pill
sizing fix. The teal rebrand (BRAND-01/02/03) was descoped mid-milestone and shelved.

### Key accomplishments

- **Partner types + commission-free calc** — `partner_type` column (migration `0006` + Better Auth additionalField + idempotent backfill); commission-free variant via a `commissionPct:0` seam with 12 golden cases (±0.01 €, `formula.ts` frozen); required type selector on the create form + audited `adminUpdatePartnerType` (Phase 22: PTYPE-01..07)
- **Commission structural absence + 19-gate grep suite** — commission omitted (not hidden) across wizard steps 2+3, live preview, PDF; `params_snapshot` records `partner_type` + `commission_applied` for reproducibility; ADMIN-09 grep-contract suite grown 13→19 gates; 21 STRIDE threats closed (ASVS L1) (Phase 22)
- **PDF rendering fixes** — root-caused number/typography glyph overlap to U+202F; PDF-scoped `sanitizePdfNumber` (U+202F/U+00A0 → space) with reproduction test, `format.ts` untouched; Destinataire block removed with clean reflow; byte-determinism fixture regenerated + Agent/Commercial commission-free corpus (Phase 23: PDF-01..03)
- **Admin dual-view toggle** — session-only view store (`sessionStorage` + `useSyncExternalStore`, cleared on logout); `ViewToggle` behind `isAdmin` gate; `effectiveView` nav remap; authorization unchanged (server-derived `isAdmin` short-circuits forged flags); 7 STRIDE threats closed; 5 code-review warnings fixed (Phase 24: VIEW-01..04)
- **Admin-home polish** — COPY-01..04 FR+EN relabels ("Toutes les propositions", "Coefficients & Commissions", "Dernière Modif Coef") with `_EnHasAllFrKeys` parity proof green; status-pill `max-content` hug-content fix (Phase 25: COPY-01..04, UIFIX-01)

### Verification artifacts

- `milestones/v1.4-ROADMAP.md` — full phase + plan archive with milestone summary
- `milestones/v1.4-REQUIREMENTS.md` — 22-requirement traceability with final outcomes (19 satisfied, 3 descoped)
- `milestones/v1.4-MILESTONE-AUDIT.md` — convergent-evidence audit (19/19 reqs, 6/6 integration, 2/2 E2E flows, PASSED)
- `reports/MILESTONE_SUMMARY-v1.4.md` — narrative milestone report (onboarding pointer + next-session notes)
- Per-phase `SUMMARY.md` (12 files); SECURITY.md for Phases 22+24; REVIEW.md + REVIEW-FIX.md + UAT.md for Phase 22/24

### Key decisions (v1.4)

- **Partner-type formula exception** — Agent/Commercial drop the commission factor; first break in the frozen-formula constraint, strictly scoped (`Partenaire` formula + tranches stay frozen)
- **Commission as structural absence, not CSS hiding** — defense-in-depth against leakage, enforced by the 19-gate grep suite
- **View toggle is session-only + server-derived authz** — a nav convenience, never a permission change (VIEW-04)
- **PDF-scoped sanitizer** — confine the U+202F fix to the PDF layer; leave `format.ts` and the byte-determinism surface untouched
- **Teal rebrand descoped 2026-05-30** — `--gd` token split + WCAG re-audit across ~63 sites judged too much effort for too little value; shelved (revisitable), not killed

### Known gaps / tech debt at close (acknowledged, non-blocking, all Info-level)

- Stale `deferred-items.md` lint entry in Phase 22 (already resolved in 22-05; delete the file)
- Migration label drift `0005`→`0006_workable_yellow_claw.sql` reconciled 2026-05-30 (doc-only)
- Phase 24: dead `fullWidth` prop on `ViewToggle`; unused `adminHrefs.history`; duplicated `rgba(18,150,87,0.10)` active-tint literal (extract to a CSS var); retained back-compat i18n keys
- `partnerType` session fallback re-derived in 3 places (finalize route + calcul + verification) — a shared helper would reduce drift risk

### Deploy gate (pre-onboarding, not a code blocker)

Migration `0006_workable_yellow_claw.sql` + `partner_type` backfill (`db:backfill:partner-type`, `BACKFILL_CONFIRM=YES`) must be applied to Neon `main` via the `MIGRATE PROD` GitHub Action before the first real Agent/Commercial partner is onboarded. Per session record the 0005→0006 reconcile + Neon apply occurred 2026-05-30 — **confirm applied** before onboarding.

---

## v1.1 — Hosted Web App Foundation

**Shipped:** 2026-05-11
**Phases:** 6 | **Plans:** 46 | **Plan↔Summary parity:** 46/46
**Requirements:** 108/108 (105 ✅ complete + 3 partial — see audit)
**Timeline:** 2026-05-05 → 2026-05-11 (6 days from Phase 5 scaffold to Phase 10 audit pass)
**Deliverable:** `https://leasetic-matrice.vercel.app` — Vercel-hosted Next.js 16 + Neon Postgres + Vercel Blob + Better Auth, OVH-portable architecture
**Git range:** `24a9bae..5df081a` (236 commits, 300 files changed, 16,139 LOC across `src/` + `app/`)
**Known deferred items:** 7 (see `STATE.md` Deferred Items section and `milestones/v1.1-MILESTONE-AUDIT.md`)

### What shipped

Migration of the Leasétic Matrice from a single-file standalone HTML quote tool to a **hosted multi-page web application** with admin-invited authentication, persistent PDF proposals stored as immutable blobs per partner, admin-only global financial parameters (commission / max / validity / coefficients), and a coefficient-snapshot pattern that makes existing PDFs immune to future parameter edits. The full v10 calculation formula was ported as a pure-TS module with a 30-case golden corpus asserting ±0.01 € parity in CI. The architecture is deliberately OVH-portable: a `lib/storage` + `lib/db` adapter spine plus ESLint + CI grep gates prevent Vercel-only imports outside those modules, so the September 2026 OVH cutover can swap drivers via env-var changes only.

### Key accomplishments

- **Vercel-hosted Next.js 16 + Neon Postgres + Vercel Blob deployment** with `/healthz` live exercising DB read + blob round-trip via portable adapters; `output: 'standalone'` from first commit; CI enforces no-Vercel-only-imports rule on every PR (Phase 5: BOOT-01..12)
- **Admin-invited authentication** with Better Auth 1.6.9 + argon2id hashing + 8h sliding sessions; hidden `/[adminSegment]` admin tree with 2-layer gate (env-segment `notFound()` → `requireAdmin()`); no SMTP — invitations and resets are admin-mediated one-time URLs via the `InviteUrlModal` primitive; 231-key FR/EN i18n dictionary with compile-time `_EnHasAllFrKeys` parity proof; light/dark mode with no-flash cookie-driven SSR (Phase 6: AUTH-01..18, SHELL-01..14)
- **Pure-TS calculation engine** at `src/lib/calc/` with the frozen v10 formula `loyer = amountHT × (1 + commission/100) × coefficient / 100`; 30-case golden corpus in CI with ±0.01 € tolerance; live preview (300ms debounce) on the proposal entry form with full 5-state machine (idle / expired / missing / on-demand / computed) and LC reference + Copy button + 15/30/60-day validity selector (Phase 7: CALC-01..08, PROP-01/06/07/08/24/25)
- **Persistent PDF proposals with `params_snapshot` immutability** — single `POST /api/proposals` handler with client-generated `Idempotency-Key`, server-side `computeLoyer()` recompute (never trusts client), deep-copy snapshot of `global_params` into the row, deterministic `@react-pdf/renderer` PDF (CI-gated SHA-256 byte-equality on a fixture proposal), blob upload at `proposals/{userId}/{proposalId}.pdf` with private access; cursor-paginated home list + ILIKE search + soft-delete (30-day window) + duplicate flow (snapshots *current* params, not source's) (Phase 8: DATA-01..12, PROP-02..05/09..23/26)
- **Admin operating surface** at `/[adminSegment]/coefficients` (editor + computed-diff confirmation modal + cursor-paginated history with per-row diff + pure-client "Explain calculation" debug tool — the SOLE non-editor surface allowed to display `commission_pct` per ADMIN-09) and `/[adminSegment]/accounts` (6-column partners list with proposal counts, per-row disable/re-enable via sonner confirm-toast, re-issue invitation, send password reset, create-new-partner modal); 42 STRIDE threats verified closed (ASVS L1); cross-cutting commission redaction discipline enforced across server logs, audit_log payloads, and partner-facing surfaces (Phase 9: ADMIN-01..09)
- **Cutover & polish operational layer** — `docs/operations/deploy-ovh.md` runbook + `scripts/smoke-ovh.ts` 7-step full-lifecycle smoke (deferred OVH execution to September 2026; capability ships now); twice-monthly Vercel Cron at `0 3 1,15 * * UTC` → dual-auth `/api/internal/purge-soft-deleted` route → shared `src/lib/admin/purge.ts` pure function called by both CLI and cron; email-pattern test-data discriminator (`@test.leasetic.com`) with `scripts/purge-test-data.ts` pre-launch scrub; `<SeedBanner>` first-login confirmation surface; CI grep gate blocking v10 localStorage key resurrection; 55 STRIDE threats verified closed (Phase 10: CUT-01..09)

### Verification artifacts

- `milestones/v1.1-ROADMAP.md` — full phase + plan archive
- `milestones/v1.1-REQUIREMENTS.md` — 108-row traceability with final outcomes
- `milestones/v1.1-MILESTONE-AUDIT.md` — integration check + cross-cutting invariants + Drizzle correlated-subquery latent-bug audit (commit `5df081a`)
- Per-phase artifacts under `.planning/phases/{05..10}-*/` — SUMMARY.md per plan (46 files), REVIEW.md + REVIEW-FIX.md for Phases 8/9/10, SECURITY.md for Phases 9/10 (97 threats verified closed across the two)
- 399/399 Vitest tests passing as of milestone close; typecheck + lint + build all clean
- Code review surfaced and fixed 21 findings across Phases 8/9/10 (5 critical + 11 warning + 5 info-deferred); zero open critical issues

### Key decisions (v1.1)

- **Vercel + Neon + Better Auth** chosen over NextAuth alternatives for adapter ergonomics, EU-hosting compliance, and OVH portability; locked at Phase 5 with all dep versions pinned exact-no-carets
- **OVH portability is a CI claim, not a runtime claim** in v1.1 — the smoke script + runbook ship now; actual OVH deploy is September 2026 (v1.2 follow-up)
- **PDF immutability via `params_snapshot` jsonb** (Stripe pattern, Option A in ARCHITECTURE §2.5) — old PDFs render byte-identically forever even after admin coefficient edits
- **Commission invisibility extended to logs / traces / audit payloads** (ADMIN-09 cross-cutting), with the explicit "Explain calculation" debug tool as the sole authorized exception
- **Hard cutover from v10 — no localStorage migration path**; v10 was never hosted (delivered as emailed HTML file), so CUT-02 collapses vacuously
- **Phased pilot launch** (2-3 trusted partners → 1-2 weeks observation → batch onboard); Antoine owns partner comms directly (not delegated to Thomas)

### Known gaps at close (acknowledged, not blocking)

- BOOT-03 partial: Neon 3-branch split deferred — all Vercel scopes currently route to the `main` Neon branch (functionally green; documented Phase 5 follow-up)
- ADMIN-05 operational gap: `users.last_login_at` is read by the admin accounts page but never *written* anywhere in the auth code — every partner row will show `'—'`
- DATA-11 legal counsel sign-off on 10-year PDF retention deferred (Thomas reply pending; stub committed at `docs/legal/privacy-coverage-confirmation.md`)
- CUT-09 live OVH smoke deploy deferred to September 2026 (capability shipped: `scripts/smoke-ovh.ts` + `docs/operations/deploy-ovh.md`)
- Admin password rotation (`leasetic2026` → individual strong) — Phase 6 follow-up #1, must complete *before* first real partner is onboarded
- Better Auth `trustedOrigins` hardening deferred to v1.2 (SameSite=Lax + `__Secure-` cookies are the actual CSRF defense)
- 2 stale `[~]` markers in v1.1 REQUIREMENTS.md (CALC-07, PROP-01) — functionally satisfied by Phase 8 work; cosmetic only

### Surprises captured

- **Drizzle correlated-subquery name-resolution footgun** (commit `4879831`) — `${schema.users.id}` interpolation inside a `sql\`...\`` template emits unqualified `"id"`, which Postgres binds to the wrong inner-table column. Caught in production via Vercel runtime logs after the partners page 500'd; fixed by inlining `users.id` as raw SQL. The milestone audit confirmed no other latent instances of this pattern exist in the codebase
- **Vercel Cron auth env-var reserved name** (commit `df6fdae`) — Vercel auto-injects `Authorization: Bearer ${CRON_SECRET}` using the literal env-var name `CRON_SECRET`. The Phase 10 plan originally named it `PURGE_CRON_SECRET`; CR-01 fix renamed to match Vercel's reserved name. Would have caused the soft-delete purge cron to silently 401 forever without alerting (CUT-07 alerting is deferred to v1.2)
- **Token-scope friction on push** — the local `gh` token initially lacked the `workflow` scope needed to push commits modifying `.github/workflows/`; resolved with `gh auth refresh -s workflow`. Worth flagging for any future contributor

---

Living log of shipped versions. Each entry summarizes what shipped, when, and where the detailed archives live.

---

## v1.0 — Matrice Commerciale v10 Refactor

**Shipped:** 2026-04-30
**Phases:** 4 | **Plans:** 11 | **Plan↔Summary parity:** 11/11
**Requirements:** 69/69 ✅
**Deliverable:** `Matrice_2026_THE_Leasetic-v10.html` (2,296 lines, single-file standalone)

### What shipped

A complete refactor of the Leasétic Matrice Commerciale standalone HTML quote tool, modernizing the v9 baseline (911 lines, ES5 vanilla, plaintext password, no XSS guards, alert-driven UX, French only) into a production-grade v10 with:

- **Functional parity** with v9 across all 22 PARITY requirements; backward-compatible reads of v9 localStorage so existing partners need zero reconfiguration
- **ES6+ refactor** with labeled CSS sections (TOKENS / LAYOUT / COMPONENTS / PRINT) and JS sections (STATE / I18N / UTILS / CALC / ADMIN / PROPOSAL / MIGRATION / INIT); zero `var`, template literals, arrow functions
- **Security hardening:** SHA-256 password hashing via Web Crypto API, transparent in-place migration of plaintext `lt_pw`, current-password confirmation gate, `escapeHtml()` wrapping every user-sourced HTML interpolation (23-row authoritative audit table)
- **UX polish:** non-blocking toast system, real-time blur-based field validation, document-level keyboard shortcuts (Enter/Esc), auto-focus on failed submit, copy-LC button, configurable validity (15/30/60 days)
- **FR/EN bilingual** with ~138 dictionary keys × 2 languages, segmented header toggle, instant proposal re-render on language switch, bilingual RSE page caption
- **Modern SaaS shell:** retractable left sidebar (260px ↔ 72px), sticky topbar with per-page contextual actions, footer, pill buttons, shadow cards, larger typography, leasetic.fr-aligned design tokens
- **Light + dark mode** with no-flash theme restoration, Colibris-inspired dark palette, all Leasétic brand colors preserved, proposal forced to stay white in dark mode for print-output parity
- **On-load self-check triad:** `assertCalc` (6/6 fixtures), `assertEscape` (8/8 fixtures), `assertValidity` (6/6 fixtures) — every page load logs green or surfaces a regression immediately

### Verification artifacts

- `phases/01-parity-refactor/PARITY-AUDIT.md` — 22-row evidence log + browser smoke runbook
- `phases/02-security-hardening/SEC-TEST.md` — XSS payload fixtures + 23-row HTML-writing audit table
- `phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` — Master ship-gate runbook (Sections A-J, ~75-105 min Chrome+Edge)

### Key decisions

| Decision | Outcome |
|----------|---------|
| Standalone single HTML file (no build tools, no framework) | ✓ Held — distribution model is "send the file" |
| Ship as `-v10.html` alongside intact `-v9.html` | ✓ Held — partners can roll back by reopening v9 |
| Manual test checklists instead of Playwright | ✓ Held — matches the no-build-chain constraint |
| SHA-256 via Web Crypto API for password hashing | ✓ Validated in Phase 2 |
| Hierarchical i18n keys in a single JS dictionary | ✓ Validated in Phase 3 |
| Light sidebar in Phase 4 (Dashly-style, not navy) | ✓ Held — navy would compete with white content cards |
| `--surface` token introduced for dark mode | ✓ Held — semantic separation from `--white` |
| Proposal page stays white in dark mode | ✓ Held — print parity over visual unity |
| No-flash inline `<head>` script for theme restore | ✓ Held — prevents flash of light content |

### Issues encountered + resolved

- **Premature `</script>` close in `assertEscape` fixture** — A literal `</script>` string inside the JS test fixture closed the HTML script block early, dumping unprocessed JS as visible page text. Fixed by escaping the forward slash (`<\/script>`).
- **CSS variable name collision** — v9's `--sidebar-w: 24px` was used by the proposal page's internal navy strip. Phase 4 introduced `--shell-sidebar-w: 260px` rather than overloading.
- **Duplicate IDs from button consolidation** — Topbar Save/Lock buttons renamed to `btn-save-topbar` / `btn-lock-topbar`, delegating clicks to the inline admin-panel buttons.
- **Dashly icon experiment reverted** — Mid-milestone iteration where filled-green Dashly tiles temporarily replaced the feather-style icons. Antoine preferred the feather style; reverted while keeping all retractable-sidebar work intact.

### Tech debt + carried forward to next milestone candidates

- Distribution model is still "edit + resend" per partner (no hosted version)
- No automated browser tests (manual runbooks only)
- LC references random + uncentralized (no backend dashboard)
- No proposal-portfolio Excel export
- No mobile-optimized layout (degrades gracefully but not optimized)

### Patterns established (carry forward)

- Plan↔Summary 1:1 ratio as the milestone-completeness invariant
- CONTEXT.md as the durable phase decision log (locked decisions before planning)
- On-load self-checks (`assertX()`) as regression early-warning per invariant
- Labeled CSS + JS sections for predictable code placement
- Sequential waves for shared-file projects (avoid merge conflicts)
- Atomic commits per task
- `<symbol>` + `<use>` SVG sprite with `currentColor` inheritance
- Tokens → surfaces → states (design changes start at the variable layer)

### Known notes at close

- **Git history was lost during a directory move** (cloud-sync corruption zeroed ~109 object files including HEAD). Working tree was 100% intact. Re-initialized fresh git history at milestone close with the v1.0 deliverable as the initial commit. The corrupted `.git.corrupted-backup/` directory remains in the project root for any future recovery attempts (gitignored). Planning artifacts and per-phase summaries preserved the *why* of every decision; the lost commit log was a finer-grained record of the same information.
- **`FINAL-TEST-v11.md` runbook has not yet been executed by Antoine.** Recommended before partner distribution.

### Detailed archives

- `.planning/milestones/v1.0-ROADMAP.md` — full phase-by-phase breakdown with plans, tasks, decisions
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 69 requirements with shipped status

---

*This file accumulates milestone summaries. Add new entries above this line when shipping v1.1+, with the most recent at the top.*
