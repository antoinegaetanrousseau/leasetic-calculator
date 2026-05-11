# Leasétic — Matrice Commerciale

## What this is

The internal sales-quote tool for **Leasétic**, distributed as a self-contained HTML file to channel partners (IT integrators, resellers). Partners open it in a browser, fill in client information + project amount + duration, and generate a 2-page PDF proposal (financial offer + RSE page) for their client.

Live deliverable: `Matrice_2026_THE_Leasetic-v10.html` (~2,300 lines, single-file standalone, no build chain).

## Current state — post-v1.1 (shipped 2026-05-11)

**v1.1 — Hosted Web App Foundation** shipped 2026-05-11. 6 phases, 46 plans, 108 requirements (105 ✅ + 3 documented partials), 236 commits over 6 days. Production deployment live at `https://leasetic-matrice.vercel.app` (Vercel + Neon Postgres + Vercel Blob + Better Auth). See `MILESTONES.md` for the full v1.1 entry and `milestones/v1.1-*.md` for archived ROADMAP / REQUIREMENTS / AUDIT.

**What v1.1 has that v1.0 didn't:**
- Hosted multi-page web app instead of single-file HTML (Next.js 16 App Router + TypeScript)
- Admin-invited authentication (Better Auth 1.6.9 + argon2id, 8h sessions, hidden `/[adminSegment]` admin tree)
- Persistent PDF proposals with `params_snapshot` immutability invariant — once saved, never changed by future coefficient edits
- Server-side calc engine with 30-case CI golden corpus (±0.01 € parity vs v1.0)
- Admin coefficient editor with append-only history + "Vérifier les coefficients" first-login banner + sole-allowed commission-visibility "Explain calculation" tool
- Soft-delete + scheduled purge cron (twice-monthly 1st + 15th); 30-day window; audit_log on every mutation
- OVH-portable adapter discipline (`lib/storage` + `lib/db`) with ESLint + CI grep gates enforcing no-Vercel-only-primitives outside adapters
- 97 STRIDE threats verified closed across Phases 9 + 10 (ASVS L1); 21 code review findings caught + fixed across Phases 8/9/10

**v1.0 status:** `Matrice_2026_THE_Leasetic-v10.html` was a prepared-but-undistributed prototype. It was never sent to partners. v1.1 is the first version partners actually use; v10 is now retired in name only (no localStorage migration path, no hosted URL to redirect from per CUT-02/D-10-15).

**What v10 has that v9 didn't:**
- Modern ES6+ codebase (`const`/`let`, arrow functions, template literals, labeled CSS + JS sections)
- SHA-256 password hashing via Web Crypto API + transparent plaintext migration
- XSS-safe rendering throughout (`escapeHtml()` wrapping every user-sourced HTML interpolation)
- Toast UX (no more disruptive `alert()` for success/info)
- Real-time blur-based validation with red-ring focus states
- Keyboard shortcuts (Enter = generate, Esc = reset with confirm)
- Bilingual FR / EN with ~138 dictionary keys × 2, instant proposal re-render on language toggle
- "Copier la référence" (LC reference clipboard button)
- Configurable proposal validity (15 / 30 / 60 days)
- Modern SaaS shell: retractable left sidebar, sticky topbar with contextual actions, footer
- Dashly-aligned visual language: pill buttons, shadow cards, rounded inputs with teal focus ring
- Light + dark mode with no-flash theme restoration on reload
- Plus Jakarta Sans typography, leasetic.fr-aligned color tokens
- On-load self-checks (`assertCalc` 6/6, `assertEscape` 8/8, `assertValidity` 6/6) — every page load logs green or surfaces a regression immediately
- Backward-compatible: existing partners' v9 localStorage data (coefficients, commission, max threshold, partner name) survives the v9→v10 upgrade with zero reconfiguration

**v10 status:** v10 is a *prepared but undistributed* prototype. The `FINAL-TEST-v11.md` master ship-gate runbook was never executed and the v10 HTML was never sent to partners. v10 is superseded by v1.1 (see below) and will be retired at v1.1 launch — no partner ever runs v10 in production.

**CUT-02 / D-10-15 (cutover note):** v10 was never hosted at a URL — there is no v10 hosted URL to redirect from. CUT-02's "redirect" requirement is satisfied vacuously; documented in `docs/operations/launch-checklist.md`.

## Current Milestone: v1.2 — UX Polish + Proposal Wizard

**Started:** 2026-05-11 (post-v1.1 close, Figma design session same day)
**Source of truth:** `.planning/REQUIREMENTS.md` (14 REQ-IDs) + `.planning/milestones/v1.2-CONTEXT.md` (Figma design contract `vwOzirhL0vyxDWq4m6t4gC`, 3-layer fill rules, design system tokens)

**Goal:** Apply the visual + interaction design contract sketched in Figma to the v1.1 surface — adding a 3-step proposal wizard (Paramètres → Calcul → Vérification), a retractable sidebar with brand logo, draft-state proposal persistence, dedicated partner-create route, coefficient change history surface, and brand-logo treatment across login / invite / reset public pages.

**Target features (full requirements in `MILESTONE-CONTEXT.md`):**

- **Database:** add `draft` proposal status (enum: `draft | active | expired | deleted`), `invited` partner account status, coefficient change history table powering a new History sidebar
- **Routing:** split `/proposals/new` into 3 wizard steps with server-side draft persistence between steps; dedicated `/[adminSegment]/partners/new` route replacing v1.1's modal-based partner creation
- **Components:** new reusable Stepper (3 states per step: active/pending/done), Retractable sidebar (260px ↔ 72px with localStorage preference), Home metric tile (3 variants), Admin nav cards, Status chip variants (active/draft/expired/disabled)
- **Brand assets:** add Leasétic logo files (`#6DC388` mark, `#112C3B` wordmark) with light/dark mode SVG variants
- **Public surfaces:** apply brand logo + paper background to login, invite/[token], reset/[token]

**Carried-over follow-ups from v1.1 (close before partner onboarding):**

- Rotate shared admin password (`leasetic2026` → individual strong) — Phase 6 follow-up #1
- Ask Thomas to confirm privacy-policy coverage of (a) Vercel/Neon EU hosting and (b) 10-year PDF retention (D-10-18)
- Wire `users.last_login_at` write at login time (ADMIN-05 operational gap; WR-AUDIT-01)

**Out of scope for v1.2** (deferred to v1.3+):

- OVH production deployment + smoke deploy execution (September 2026 target; capability shipped in v1.1)
- Mobile-optimized layout
- Excel export, webhook notifications, automated browser tests
- Multi-language beyond FR + EN
- SMTP-driven self-service password reset (admin-mediated only continues)
- Sentry / APM observability (Vercel logs continue as production observability)
- Better Auth `trustedOrigins` hardening (SameSite=Lax + `__Secure-` cookies stay the CSRF defense)

## Core value

**One thing that must work:** A partner opens the v10 HTML file, fills in client info + project amount + duration, and generates a pixel-correct 2-page PDF proposal — with the exact same lease calculation formula as v9 (`montantHT × (1 + commission/100) × coefficient / 100`).

If that doesn't work, nothing else matters. v10 preserves this core via on-load `assertCalc` self-check (6 fixtures verify the formula on every page load) and a Phase 1 PARITY audit confirming print output is byte-identical to v9.

## Requirements

### Validated (shipped in v1.0)

- ✓ Functional parity with v9 — v1.0
- ✓ ES6+ refactor with sectioned codebase — v1.0
- ✓ XSS sanitization on all user-entered fields — v1.0
- ✓ SHA-256 password hashing with transparent migration — v1.0
- ✓ Toast notification system replacing alert() — v1.0
- ✓ Real-time field validation with red focus ring — v1.0
- ✓ Keyboard shortcuts (Enter / Esc) — v1.0
- ✓ Coefficient displayed in Résultat tab — v1.0
- ✓ Copy-LC clipboard button + toast — v1.0
- ✓ FR / EN i18n toggle with proposal re-render — v1.0
- ✓ Partner field persistence (session-scoped per v9) — v1.0
- ✓ Validity override (15 / 30 / 60 days) — v1.0
- ✓ Aperçu rapide labeling on inline preview — v1.0
- ✓ Backward-compatible v9 localStorage migration — v1.0
- ✓ Modern shell (sidebar / topbar / footer) — v1.0
- ✓ Dark mode with no-flash restore — v1.0
- ✓ Retractable sidebar with hover tooltips — v1.0

### Validated (shipped in v1.1)

- ✓ Vercel-hosted Next.js 16 web app on Memento team scope — v1.1 (Phase 5)
- ✓ Portable stack — Next.js + Neon Postgres + Vercel Blob + Better Auth via `lib/storage` + `lib/db` adapters; ESLint + CI grep gates block Vercel-only imports outside adapters — v1.1 (Phase 5)
- ✓ Email + password authentication via Better Auth 1.6.9 + argon2id; admin-invited only (no self-signup); hidden `/[adminSegment]` 2-layer gate — v1.1 (Phase 6)
- ✓ Multi-page shell with FR/EN i18n (231 keys × 2 langs, compile-time parity proof); cookie-driven theme with no flash; sonner toasts; SHELL-12 error boundary + localized 404 — v1.1 (Phase 6)
- ✓ Pure-TS v10 calculation engine with 30-case CI golden corpus (±0.01 € parity); live preview (300ms debounce); 5-state machine on the proposal entry form — v1.1 (Phase 7)
- ✓ Persistent PDF proposals — immutable binary blobs per account; `params_snapshot` jsonb makes old PDFs immune to future coefficient changes; byte-deterministic CI gate on SHA-256 — v1.1 (Phase 8)
- ✓ Admin coefficients editor at hidden URL with append-only history + computed-diff modal + first-login "Vérifier les coefficients" banner + sole-allowed commission-visibility "Explain calculation" tool — v1.1 (Phase 9)
- ✓ Admin partners page with 6-column list (including proposals_count), per-row disable/re-enable/reset/re-issue actions, create-partner modal with one-time-URL InviteUrlModal — v1.1 (Phase 9)
- ✓ Cross-cutting commission invisibility (ADMIN-09) across server logs, audit_log payloads, and partner-facing surfaces — v1.1 (Phase 9)
- ✓ Scheduled soft-delete purge cron (Vercel Cron at 03:00 UTC on 1st + 15th of each month) — v1.1 (Phase 10)
- ✓ Hard cutover from v10 standalone — v10 was never hosted (CUT-02 vacuous); clean-slate partner onboarding; CI grep gate blocks v10 localStorage key resurrection — v1.1 (Phase 10)
- ✓ OVH portability runbook + scripted full-lifecycle smoke (`scripts/smoke-ovh.ts` + `docs/operations/deploy-ovh.md`); execution deferred to September 2026 — v1.1 (Phase 10)
- ✓ 97 STRIDE threats verified closed across Phases 9 + 10 (ASVS L1) — v1.1
- ⚠ Partial v1.1: Neon 3-branch split (BOOT-03 — all Vercel scopes route to `main` Neon branch; deferred to ops follow-up)

### Active (in v1.2 — UX Polish + Proposal Wizard)

Full requirements in `.planning/REQUIREMENTS.md` (14 REQ-IDs); design contract detail in `.planning/milestones/v1.2-CONTEXT.md`:

- [ ] **Database extensions:** add `draft` proposal status, `invited` partner account status, coefficient change history table
- [ ] **Routing:** 3-step proposal wizard (Paramètres → Calcul → Vérification) with server-side draft persistence between steps; dedicated `/[adminSegment]/partners/new` route replacing modal flow
- [ ] **Reusable components:** Stepper, retractable sidebar (260px ↔ 72px with localStorage preference), home metric tile (3 variants), admin nav cards, status chip variants
- [ ] **Brand assets:** add Leasétic logo SVGs (mark `#6DC388`, wordmark `#112C3B`) with light/dark variants; apply to login + invite + reset public pages and authed sidebar
- [ ] **Public surface polish:** paper background + centered logo + card pattern across all 3 `(public)` routes

### Deferred to v1.3+

- [ ] OVH production deployment + smoke-deploy execution (September 2026 target; capability shipped in v1.1)
- [ ] Centralized LC reference dashboard
- [ ] Excel export of proposal portfolio
- [ ] Webhook notifications to Leasétic on each proposal generation
- [ ] Mobile-optimized layout
- [ ] Multi-language beyond FR + EN
- [ ] Automated browser tests (Playwright or similar)
- [ ] SMTP-driven self-service password reset
- [ ] Sentry / APM observability beyond Vercel logs
- [ ] Better Auth `trustedOrigins` hardening (currently relying on SameSite=Lax + `__Secure-` cookies)
- [ ] Generic audit-log viewer beyond coefficient history
- [ ] Admin cross-partner proposal read view

### Out of scope (continuing constraints)

- **Changing the calculation formula or tranche boundaries** — frozen, partner expectations + business rules. Any change requires explicit business approval.
- **Removing the "commission invisible" rule** — non-negotiable business rule.
- **Mutating already-saved PDFs** — once a proposal is stored, its PDF is immutable. Future coefficient changes apply only to new proposals.

## Constraints

### Lifted in v1.1 (applied to v1.0 only)

- ~~Single HTML file, inline `<style>` + `<script>`~~ → v1.1 introduces a Next.js build chain (npm + Vite-style toolchain).
- ~~Client-side only, no server~~ → v1.1 adds Postgres + Blob storage + NextAuth.
- ~~`window.print()` + `@media print`~~ → v1.1 generates PDFs (server-side or client-capture, decided in planning).
- ~~v10 localStorage keys (`lt_pw`, `lt_coeffs`, ...)~~ → v1.1 stores per-account state in Postgres; localStorage retained only for ephemeral UI prefs (theme, sidebar, language).

### Still in force

- **Calculation formula frozen.** `loyer = montantHT × (1 + commission/100) × coefficient / 100`.
- **Commission invisibility:** commission apporteur must never appear in UI or generated proposal.
- **Desktop browsers** are the primary target. Chrome and Edge are required; Firefox and Safari best-effort. Mobile is out of scope until a future milestone.
- **PDF immutability** (new in v1.1): once a proposal is stored, neither its inputs nor its rendered PDF may be retroactively changed by anything — including coefficient updates.
- **Portability constraint** (new in v1.1): the v1.1 stack must be deployable to OVH (generic Node + Postgres + S3-compatible blob) without rewrite. No Vercel-only primitives.

## Context

- **Codebase (post-v1.1):** 16,139 LOC of TypeScript across `src/` + `app/` (.ts + .tsx); 4 Drizzle migrations; 4 deployed routes + 1 internal cron route; 263+ i18n keys × 2 languages
- **Tech stack:** Next.js 16 (App Router) + TypeScript + Drizzle ORM 0.45.2 + Neon Postgres + Vercel Blob + Better Auth 1.6.9 + argon2id + @react-pdf/renderer 4.5.1 + Tailwind v4 (custom CSS classes, no framework UI primitives) + Sonner + react-hook-form + Zod + Plus Jakarta Sans (self-hosted)
- **Distribution:** hosted at `https://leasetic-matrice.vercel.app` — partners receive a one-time invitation URL via Antoine; admin-invited only (no self-signup, no SMTP)
- **Global financial parameters:** single set of coefficients / commission_pct / max_amount / validity_days lives in the `global_params` append-only history table; admin-only edits via `/[adminSegment]/coefficients` create new rows (existing PDFs unchanged via `proposals.params_snapshot`)
- **v10 retained as `Matrice_2026_THE_Leasetic-v10.html`** in repo root for reference (never distributed in production; CUT-01 / CUT-02 satisfied)
- **Test strategy:** 399 Vitest tests in CI on every PR (typecheck + lint + grep gates + unit tests + build); manual smoke verification on Vercel after migration applies; `scripts/smoke-ovh.ts` ready for September 2026 OVH execution
- **Verification policy:** `verifier_enabled: false` in `.planning/config.json` — per-phase formal VERIFICATION.md is skipped by design. Verification rigor comes from SUMMARY.md (per plan), REVIEW.md (Phases 8/9/10), REVIEW-FIX.md (Phases 9/10), SECURITY.md (Phases 9/10), and milestone-level audit (every milestone close)

## Key decisions (running log)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone single HTML file | Distribution model is "send the file" | ✓ Held through v1.0 |
| Ship as `-v10.html` alongside intact v9 | Rollback safety | ✓ Held |
| Skip GSD research phase, fast-track planning | Antoine owns the IT-leasing domain | ✓ Held |
| Manual test runbooks instead of Playwright | Zero tooling, fits no-build constraint | ✓ Held |
| SHA-256 via Web Crypto API for password hashing | Browser-built-in, no library, one-way | ✓ Validated v1.0 |
| Hierarchical i18n keys in single JS dictionary | No framework needed; ~276 strings × 2 langs | ✓ Validated v1.0 |
| Sequential waves within a phase | Avoid merge conflicts on the shared HTML file | ✓ Held |
| Skip 3-step breadcrumb in Phase 4 | Sidebar active state + ● dot is sufficient progress feedback | ✓ Held |
| Light sidebar in dark mode (not navy) | Avoid competing with white content cards | ✓ Held |
| `--surface` token introduced for dark mode | Semantic separation from `--white` (used for text on green CTAs) | ✓ Held |
| Proposal page stays white in dark mode | Print parity over visual unity | ✓ Held |
| No-flash inline `<head>` script for theme restore | Prevents flash of light content on dark-mode reload | ✓ Held |
| **v1.1** — Better Auth 1.6.9 over NextAuth v5 | Drizzle adapter ergonomics + admin-invitation flow primitives + smaller bundle | ✓ Validated v1.1 (Phase 6) |
| **v1.1** — Drizzle 0.45.2 over Prisma | OVH portability (no proprietary engine) + smaller cold-start; generate-only discipline | ✓ Validated v1.1 (Phase 5) |
| **v1.1** — `@react-pdf/renderer` over Puppeteer | Byte-determinism + OVH portability + no Chromium dependency | ✓ Validated v1.1 (Phase 8) |
| **v1.1** — Hidden admin URL via env-driven segment | URL obscurity is defense-in-depth on top of `requireAdmin()`; layout 404s on mismatch | ✓ Validated v1.1 (Phase 6) |
| **v1.1** — `params_snapshot` jsonb for PDF immutability (Stripe Option A) | Data-shape enforcement instead of code-path enforcement; old PDFs trivially immune to coefficient edits | ✓ Validated v1.1 (Phase 8) |
| **v1.1** — `lib/storage` + `lib/db` adapter spine with ESLint + CI grep gates | OVH portability claim is mechanically enforced from day 1, not retrofitted | ✓ Validated v1.1 (Phase 5) |
| **v1.1** — Append-only `global_params` history (DATA-05) | Audit trail by data shape; admin edits trivially produce a new row, never overwrite | ✓ Validated v1.1 (Phase 8) |
| **v1.1** — Hand-rolled FR/EN i18n dict over `next-intl` | No framework needed for 263 strings × 2 langs; compile-time parity proof catches drift | ✓ Validated v1.1 (Phase 6) |
| **v1.1** — Cookie-based dark mode (no flash, SSR-rendered) over `next-themes` | Phase-4 v10 pattern preserved; explicit and small | ✓ Validated v1.1 (Phase 6) |
| **v1.1** — Single typed-confirmation prod migration via GitHub Actions | Never auto-run on Vercel deploy; explicit human approval; safe by construction | ✓ Validated v1.1 (Phase 5) |
| **v1.1** — Commission invisibility extended to logs / traces / audit payloads (ADMIN-09) | Cross-cutting privacy invariant; debug tool is the sole authorized exception | ✓ Validated v1.1 (Phase 9, CR-03 review fix) |
| **v1.1** — Twice-monthly purge cron (1st + 15th) over daily | Less ops noise; DATA-10 "after 30 days" reads as minimum threshold; worst-case persistence ~46 days | ✓ Held v1.1 (Phase 10) |
| **v1.1** — Email-pattern test-data discriminator (`@test.leasetic.com`) over `is_test` schema column | No schema artifact post-launch; cleaner production schema | ✓ Held v1.1 (Phase 10) |
| **v1.1** — Antoine owns partner cutover comms directly (not Thomas) | Technical voice during the change; runbook written assuming Antoine-context | ✓ Held v1.1 (Phase 10) |
| **v1.1** — OVH execution deferred to September 2026 | Ship runbook + script now (capability); execute when Leasétic IT engagement is ready | ✓ Held v1.1 (Phase 10) |
| **v1.1** — `verifier_enabled: false` project policy | Per-phase VERIFICATION.md not needed when SUMMARY + REVIEW + SECURITY + milestone audit cover the same ground | ✓ Held v1.1 (validated by milestone audit) |
| **v1.1** — Code review caught Drizzle correlated-subquery SQL bug post-deploy | Generator self-evaluation blind spot: unit tests passed (fixtures), build passed (types), only real Postgres exposed it. Found via Vercel runtime logs. | ⚠ Revisit — add a post-deploy DB-smoke step to CI in v1.2 or v1.3 |
| **v1.1** — Vercel Cron uses reserved env-var name `CRON_SECRET` | Phase 10 originally named it `PURGE_CRON_SECRET`; CR-01 review fix renamed to match Vercel's auto-injection contract | ✓ Caught by code review |

## Team

- **Antoine Rousseau** — product owner, ship decision, sole reviewer
- **Thomas Heufke** (Leasétic) — business stakeholder; distributes to channel partners
- **Claude Code** — implementation pair-programming partner

## How we work

- GSD planning system (`.planning/` directory): one milestone at a time, phases with locked CONTEXT, plans with summaries, atomic commits per task
- Manual test checklists in Chrome + Edge (the deliverable's two required browsers)
- French (product-facing) + English (planning docs)
- Phase summaries are the durable record; commit log is secondary

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-11 — after v1.1 milestone close. v1.1 shipped (hosted web app foundation); v1.2 milestone (UX Polish + Proposal Wizard) is the active focus, context pre-staged in `.planning/MILESTONE-CONTEXT.md` from the 2026-05-11 Figma design session.*
