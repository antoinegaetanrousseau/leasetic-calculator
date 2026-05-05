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

**Pending action before partner distribution:** `FINAL-TEST-v11.md` master ship-gate runbook (10 sections, ~75-105 min in Chrome + Edge) has not yet been executed by Antoine.

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

### Active (next milestone candidates)

(Define when starting v1.1 via `/gsd-new-milestone`. Likely candidates from v1.0 deferred list:)

- [ ] Hosted web app (Netlify / Vercel) — eliminates per-partner edit + resend
- [ ] Partner authentication / SSO — required for hosted version
- [ ] Centralized LC reference dashboard — backend-required
- [ ] Excel export of proposal portfolio for portfolio-wide tracking
- [ ] Webhook notifications to Leasétic on each proposal generation
- [ ] Mobile-optimized layout (currently degrades gracefully but not optimized)
- [ ] Multi-language beyond FR + EN
- [ ] Automated browser tests (Playwright or similar)

### Out of scope (continuing constraints)

- **Multi-file architecture / build tooling** — explicit constraint of the standalone-HTML distribution model. Any move to a hosted version triggers a re-evaluation, but the standalone v1.0 line stays single-file.
- **Changing the calculation formula or tranche boundaries** — frozen, partner expectations + business rules. Any change requires explicit business approval.
- **Removing the "commission invisible" rule** — non-negotiable business rule.

## Constraints (still in force)

- **Single HTML file** for the standalone v10 line. Inline `<style>` + `<script>`. Only external dep: Google Fonts (Plus Jakarta Sans).
- **Desktop browsers** are the target. Chrome and Edge are required; Firefox and Safari best-effort.
- **Client-side only** — no server, no network calls beyond Google Fonts CDN.
- **localStorage keys locked:** `lt_pw`, `lt_coeffs`, `lt_comm`, `lt_max`, `lt_qtr`, `lt_validity`, `lt_lang`, `lt_theme`, `lt_sidebar_collapsed`. Partner data must survive upgrades.
- **Calculation formula frozen.** `loyer = montantHT × (1 + commission/100) × coefficient / 100`.
- **Commission invisibility:** commission apporteur must never appear in UI or generated proposal.
- **No server-side PDF.** Print output is `window.print()` + `@media print` CSS.

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

## Next milestone

When ready to start v1.1, run:
```
/gsd-new-milestone
```

This walks through questioning → optional research → requirements → roadmap for the next milestone cycle.

---

*Last updated: 2026-04-30 after v1.0 milestone close.*
