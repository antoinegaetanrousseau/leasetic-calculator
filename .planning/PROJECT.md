# Leasétic — Matrice Commerciale

## What this is

The internal sales-quote tool for **Leasétic**, distributed as a self-contained HTML file to channel partners (IT integrators, resellers). Partners open it in a browser, fill in client information + project amount + duration, and generate a 2-page PDF proposal (financial offer + RSE page) for their client.

Live deliverable: `Matrice_2026_THE_Leasetic-v10.html` (~2,300 lines, single-file standalone, no build chain).

## Current state — post-v1.0

**Shipped 2026-04-30:** v10 refactor of the original v9 standalone tool. 4 phases, 11 plans, 69 requirements all complete. See `MILESTONES.md` for details.

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

## Current Milestone: v1.1 — Hosted Web App Foundation

**Goal:** Migrate Leasétic Matrice from a single-file standalone HTML to a Vercel-hosted multi-page web application with admin-invited authentication, per-partner persistent PDF proposals, and admin-only global financial parameters — designed for future portability to Leasétic's OVH infrastructure.

**Target features:**

- Vercel-hosted Next.js (App Router) web app, Postgres + Blob storage, NextAuth credentials — separate Vercel project under the Memento team, designed portably for future OVH migration (no Vercel-only primitives)
- Multi-page shell: auth → home (new / browse recent) → proposal flow (data entry → result → review → export). v10 calc engine, FR/EN i18n, and dark mode preserved.
- Admin-invited authentication (email + password). No self-signup, no SSO. Leasétic admin creates partner accounts in backend; partner receives credentials directly.
- Persistent PDF proposals stored as immutable binary blobs per partner account. Old proposals never affected by future coefficient changes (non-negotiable invariant).
- Admin-only coefficients page at hidden URL, role-gated within the same auth system. Edits **global** coefficients, commission rate, and max threshold (single set applies to all partners' new proposals — v10's per-partner customization is removed).
- Hard cutover: v10 standalone HTML retired at v1.1 launch. Clean-slate partner onboarding (no v10 localStorage migration).

**Out of scope for v1.1** (deferred to v1.2+):

- OVH production deployment (v1.1 deploys to Vercel only; OVH happens once Leasétic IT approves)
- Mobile-optimized layout
- Excel export, webhook notifications, automated browser tests
- Multi-language beyond FR + EN

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

### Active (in v1.1)

REQ-IDs assigned in `REQUIREMENTS.md`. High-level scope:

- [ ] Vercel-hosted Next.js web app (separate Leasétic project under Memento team)
- [ ] Portable stack: Next.js + Postgres + Blob storage + NextAuth (no Vercel-only primitives → OVH migration path preserved)
- [ ] Email + password authentication, admin-invited (no self-signup)
- [ ] Multi-page shell: auth → home (new / browse recent) → proposal flow (data entry → result → review → export)
- [x] Persistent PDF proposals — immutable binary blobs, per-account, never affected by future coefficient changes — Phase 8 (2026-05-09)
- [ ] Admin-only coefficients page at hidden URL, role-gated, editing **global** coefficients / commission / max threshold
- [ ] Hard cutover from v10 standalone (clean slate, no localStorage migration)

### Deferred to v1.2+

- [ ] OVH production deployment (Vercel-only in v1.1)
- [ ] Centralized LC reference dashboard
- [ ] Excel export of proposal portfolio
- [ ] Webhook notifications to Leasétic on each proposal generation
- [ ] Mobile-optimized layout
- [ ] Multi-language beyond FR + EN
- [ ] Automated browser tests (Playwright or similar)

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

- **Codebase:** 2,296 lines of HTML + inline CSS + inline JS (`Matrice_2026_THE_Leasetic-v10.html`)
- **Tech stack:** Vanilla HTML5 / CSS3 / JS ES6+, Plus Jakarta Sans (Google Fonts CDN), Web Crypto API for SHA-256
- **No npm, no bundler, no framework, no build tools** — by design
- **Distribution:** "send the file" — the v10 HTML is emailed/shared with each partner
- **Per-partner customization:** coefficients, commission rate, max threshold are configured per partner and stored in their own localStorage
- **v9 retained as `Matrice_2026_THE_Leasetic-v9.html`** for rollback if ever needed (currently outside the working tree but documented in MILESTONES.md)
- **Test strategy:** manual checklists in Chrome + Edge (`PARITY-AUDIT.md`, `SEC-TEST.md`, `FINAL-TEST-v11.md`), plus the on-load self-check triad (`assertCalc` / `assertEscape` / `assertValidity`)

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

*Last updated: 2026-05-09 — Phase 8 (Persistence + PDF Pipeline) complete.*
