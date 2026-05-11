# Milestones — Matrice Commerciale

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
