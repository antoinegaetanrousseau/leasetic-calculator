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

## ✅ v1.2 — UX Polish + Proposal Wizard — SHIPPED 2026-05-21

**Started:** 2026-05-11 · **Shipped:** 2026-05-21 (10 days, 5 phases, 25 plans, 147 commits, +249 tests)
**Archive:** `.planning/milestones/v1.2-ROADMAP.md` · `.planning/milestones/v1.2-REQUIREMENTS.md`
**Carry-forwards to v1.3:** `.planning/v1.3-CARRYFORWARD.md`

**Shipped scope:** 3-step proposal wizard with server-side draft persistence (Phases 12+13), dedicated `/partners/new` route + 3 AdminNavCards on admin home + coefficient history sidebar + standalone `/history` route + StatusChip rollout (Phase 14), public page brand-logo treatment via `<BrandLogo>` swap in shared `(public)` layout (Phase 15). ADMIN-09 partner-facing relaxation (Phase 13 D-12, signed-off STRIDE addendum). ADMIN-09 D-29 9-gate grep-contract suite in CI (Phase 14).

**Deferred to v1.3 (see v1.3-CARRYFORWARD.md for full Tier 1-5 inventory):**
- Partner home dashboard restructure + 3 MetricTiles + /proposals route (ROUTE-02 #3 partial deferral)
- UI color refresh + diff-panel contrast measurement (deferred together)
- Admin password rotation, privacy policy confirmation (partner-onboarding gates)
- Neon 3-branch split, post-deploy DB-smoke CI step (tech debt discovered during v1.2)

## ✅ v1.3 — Design Refresh + Partner-Onboarding Ready — SHIPPED 2026-05-29

**Started:** 2026-05-21 · **Shipped:** 2026-05-29 — 8 days, 6 phases (16–21), 27 plans, 175 commits, 1122 tests passing. Summary: `.planning/reports/MILESTONE_SUMMARY-v1.3.md`. The app is now ready for the first real (non-test) partner invite.

**Started (original):** 2026-05-21 (post-v1.2 close, same-day Figma scope review)
**Source of truth:** `.planning/REQUIREMENTS.md` (TBD by `/gsd-new-milestone`) + Figma design contract `vwOzirhL0vyxDWq4m6t4gC` section `9:46` ("v1.3 — Redesign sketches", 13 screens) + `.planning/v1.3-CARRYFORWARD.md` (5-tier inventory generated at v1.2 close)

**Goal:** Apply the Figma `9:46` design contract uniformly across partner + admin surfaces in both light and dark mode, ship the deferred Tier-3 surfaces (Partner Home dashboard + `/proposals` with `Archivées` filter pill) and three Tier-5 partner-pain capabilities (Excel export, centralized LC reference dashboard, AccountsList→PartnersList rename), harden infra (Neon 3-branch split + post-deploy DB-smoke CI + Better Auth `trustedOrigins` Origin gate), and close all Tier-1 partner-onboarding gates last (admin password rotation + privacy policy confirmation with Thomas) — so the milestone ends with the app ready for the first real partner.

**Target features (organized by theme):**

- **App shell visual refresh** — Sidebar (expanded + 72px collapsed variant) with brand row + collapse toggle; Theme toggle tri-state (Light / **System** / Dark; System is new — respects `prefers-color-scheme`); FR/EN locale toggle repositioned into sidebar footer; topbar + footer visual refresh; hero pattern (`Bonjour, {prénom} 👋` + page subtitle + page-level CTA) on every authed page; **light + dark pair for every screen**
- **Contrast measurement** — diff-panel changed-row composite (`rgba(224,133,48,0.10)` over `--surface` with `--ink` weight 600) measured in light + dark at WCAG 2.1 AA; bundled into the design work because the v1.3 palette is stable (no token-level refresh — Figma `color/*` variables match `app/globals.css` exactly)
- **Partner Home `/`** — hero greeting + 3 MetricTiles (Ce mois-ci / Total / Brouillons, Europe/Paris calendar month scope) + Propositions récentes list (5 rows, "Voir toutes →" link)
- **Partner Proposals `/proposals`** — table list with filter pills; **`Archivées` filter pill surfaces archived/expired proposals in-page** (no separate `/archives` route)
- **Wizard redesign** — 3 steps (Paramètres / Calcul / Vérifier) visual refresh + new copy (`Commission apporteur (non visible client)` explicit annotation, consistent with Phase 13 D-12 envelope) + **validity-selector relocation from earlier step to step 3** (introduces `proposals.validity_days` default at draft creation; step-3 mutation); Phase 13 behavior contract + ADMIN-09 D-12 envelope + Phase 14 9-gate grep-contract suite remain in force throughout
- **Admin Home enhancement** — hero + "Nouvelle proposition" CTA + 3 admin stats (Propositions ce mois / Partenaires actifs / Dernière modif. coeffs) + 3 AdminNavCards + Recent activity card (extends Phase 14's 3-card layout)
- **Admin Partners list `/[adminSegment]/partners`** — styled table with rows + "Inviter partenaire" CTA + filter/search controls; **AccountsList → PartnersList component file rename** (Phase 14 closeout cleanup)
- **Admin Créer partenaire `/[adminSegment]/partners/new`** — form card visual refresh
- **Admin Coefficients refresh** — warning banner (orange) + inline history card refresh on top of Phase 14's 2-col history sidebar
- **Excel export of proposals** (Tier 5) — per-partner XLSX export of their proposal portfolio; partner-requested in v1.0 feedback
- **Centralized LC reference dashboard** (Tier 5) — admin tool: cross-partner LC reference view; MUST extend (not bypass) the ADMIN-09 9-gate grep-contract suite
- **Neon 3-branch split** (Tier 2) — per-Vercel-scope `DATABASE_URL` routing (main / preview / development); resolves v1.1 BOOT-03 partial
- **Post-deploy DB-smoke CI step** (Tier 2) — real-Postgres smoke on every PR touching `drizzle/*.sql`; closes the recurring "generator self-evaluation blind spot" class that bit v1.1 (correlated-subquery) + v1.2 Phase 12 (missing journal entry)
- **Better Auth `trustedOrigins` hardening** (Tier 2) — middleware-level Origin gate on `/api/auth/sign-in/*` mutations on top of existing SameSite=Lax + `__Secure-` cookies
- **Tier-1 partner-onboarding gates (LAST phase before cutover)** — Admin password rotation (`leasetic2026` shared → individual strong, both admins) + Privacy policy confirmation with Thomas (Vercel/Neon EU hosting + 10-yr PDF retention coverage)

**Key context / decisions baked in at milestone start:**

- **Palette is stable** — Figma `color/*` variables match `app/globals.css` tokens exactly (verified 2026-05-21 via `get_variable_defs` against node `9:46`). The Tier-2/Tier-3 "UI color refresh" carry-forward item reduces to **layout + hierarchy refresh, not token churn**. This decouples the contrast measurement from any token migration — it can run against current `--gold #e08530` over `--surface #ffffff` immediately.
- **Light + dark pair per screen** — Figma section ships duplicate `82:*` frames for partner-side screens explicitly indicating both modes are in the design contract.
- **ADMIN-09 envelope held** — Phase 13 D-12 partner-facing relaxation (deal-owner partner sees commission on wizard steps 2 + 3) continues; Phase 14 strict on all admin surfaces continues; the 9-gate grep-contract suite (`tests/admin-09-grep-contracts.test.ts`) must remain green throughout v1.3.
- **"Archives" interpretation locked** — filter pill on `/proposals`, NOT a separate route. Archived = soft-deleted or expired proposals visible to the partner who owns them.
- **Validity-selector relocation** — moving from current placement to step 3 of the wizard. Will likely require setting `proposals.validity_days` to a default (e.g. 30) at draft creation, with step 3 mutating the final value. To be confirmed during planning of the wizard phase.
- **Tier-1 gates ordered last** so they ride the same partner-cutover communications window as the rest of partner-readiness work.

## ✅ v1.4 — Partner Types, Admin Dual-View & Rebrand — SHIPPED 2026-05-30

**Started:** 2026-05-29 · **Shipped:** 2026-05-30 — 2 days, 4 phases (22–25), 12 plans, 129 commits, 1184 tests passing. Archives: `milestones/v1.4-{ROADMAP,REQUIREMENTS,MILESTONE-AUDIT}.md`; summary `reports/MILESTONE_SUMMARY-v1.4.md`; tag `v1.4`.

**Shipped scope:** a `partner_type` dimension (Agent / Commercial / Partenaire) conditioning proposal economics end-to-end — commission-free calc for Agent/Commercial with commission **structurally absent** from calc, UI, PDF, logs, and audit payloads (ADMIN-09 grep suite 13→19 gates); `params_snapshot` records `partner_type` + `commission_applied`. Session-only Admin/Agent view toggle (server-derived authz). PDF U+202F glyph-overlap fix + Destinataire-block removal + byte-determinism corpus extension. Admin-home label changes (COPY-01..04) + status-pill `max-content` sizing fix.

**Descoped:** Teal rebrand (BRAND-01/02/03) — splitting the overloaded `--gd` accent/success token across ~63 sites + a WCAG re-audit was judged too much effort for too little value; shelved (revisitable) to Future Requirements.

**Original target features (all shipped except the descoped teal rebrand):**

- **Partner types & commission-free proposals** — a `partner_type` selector (`Agent` / `Commercial` / `Partenaire`) on the invite/create-partner form, backfilled to `Partenaire` for existing accounts and editable later by an admin. For `Agent` and `Commercial`, the commission is **removed from the loyer calculation entirely** (`loyer = montant HT × coefficient ÷ 100`, no `(1 + commission/100)` markup) **and** never appears in the UI or PDF. `Partenaire` keeps the v1.0-frozen formula. Requires a commission-free proposal + PDF render variant that respects (and extends) the ADMIN-09 envelope.
- **Admin dual-view toggle** — a bottom-left settings toggle (next to the theme/locale controls), visible only to admin-level users, that switches the whole nav between admin routes (`/[adminSegment]`, `/coefficients`, `/partners`, `/lc-references`) and agent routes (`/`, `/proposals`). Admins land in **Admin** view on each login; the choice is **session-only** (not persisted across logout).
- **PDF rendering fixes** — resolve the number/typography rendering defect on generated proposals (the loyer figure overlaps; root-cause spike in `@react-pdf/renderer` font + French thousands-separator handling), and **remove the "Destinataire" block** beneath the "Proposition de location financière" title.
- **Teal rebrand** — ⊘ **DESCOPED 2026-05-30** (shelved to Future Requirements). Was: replace the UI accent green with `#2D7A8C` at the token layer; logo + success green untouched.
- **Admin-home & label polish** — rename the "Références LC" card + page heading to **"Toutes les propositions"** (display label only; `/[adminSegment]/lc-references` route unchanged); "Coefficients & commission" → **"Coefficients & Commissions"**; "Dernière modif. coeffs" → **"Dernière Modif Coef"**.
- **Status-pill sizing fix** — the proposal status pill (e.g. "Actif") renders at a fixed width; make it hug its text adaptively.

**Key context / decisions baked in at milestone start:**

- **The frozen-formula constraint gains a partner-type exception.** Until v1.4 the calculation formula was frozen for all partners. Antoine (business owner) has approved a partner-type-conditional variant: `Partenaire` keeps `montant HT × (1 + commission/100) × coefficient / 100`; `Agent`/`Commercial` drop the commission factor. Agent/Commercial monthly payments are therefore genuinely lower for identical inputs — intended (their compensation is handled outside this tool).
- **Commission invisibility is reinforced, not relaxed.** The ADMIN-09 envelope (and the Phase 13 D-12 partner-facing relaxation for `Partenaire` deal-owners) stays in force. For `Agent`/`Commercial`, commission must be absent end-to-end (calc, UI, PDF, logs, audit payloads) — a stricter case the existing 12-gate grep-contract suite should be extended to cover.
- **View toggle is session-only by design** — no cookie/DB persistence, so no new SSR no-flash work; admins re-enter Admin view each login.
- **Rebrand is token-scoped** — only the accent token changes; logo SVGs and success green are explicitly out of the recolor.
- **PDF defect root-cause is a planning spike** — likely the narrow-no-break-space (U+202F) French thousands separator or a missing glyph in the embedded font; to be confirmed before the PDF phase plans.

## Current Milestone: v1.5 — Proposal List Actions & Pill Fix

**Goal:** Restore per-row management actions on the partner proposals list and fix the status-pill rendering across the home + proposals surfaces.

**Target features:**
- **Active-proposal row actions** — bring back **Archive** + **Delete** icon buttons on active (and expired) rows in `/proposals`. Drafts already carry edit/archive/delete via `DraftActionsClient`; this extends the same pattern (minus Edit) to non-draft rows. **No "Edit" on active rows** — the PDF-immutability invariant means a finalized proposal is never mutated in place (Antoine 2026-05-30: "let's not use edit, unnecessary").
- **Status-pill rendering fix** — the status chip ("Actif" et al.) displays correctly and responsively on **both** the home "Propositions récentes" list and the `/proposals` table. v1.4's UIFIX-01 `max-content` column attempt was insufficient on the home surface (non-responsive, label clipped/misaligned per screenshot).

**Key context / decisions baked in at milestone start:**

- **No "Edit" on active rows** — active proposals are immutable; only Archive + Delete are exposed. Draft rows keep their full edit/archive/delete set unchanged.
- **No schema/migration changes expected** — soft-delete + archive plumbing already exists (Phases 8 + 14: `DeleteButtonClient`, `RestoreButtonClient`, Recently-Deleted toggle, `Archivées` filter pill). v1.5 wires existing capabilities onto the active-row UI rather than adding storage.
- **ADMIN-09 envelope held** — `ProposalRowDto` never projects `params_snapshot`/commission; the 19-gate grep-contract suite must stay green.
- **Pill fix is CSS/layout-scoped** — `StatusChip` is a bare `<span className="chip chip-{variant}">`; the defect lives in the list grid + `.chip` sizing, not the component contract.
- **Phase numbering continues at Phase 26.**

---

<details>
<summary>📦 v1.2 archived milestone context</summary>

### v1.2 — UX Polish + Proposal Wizard — ARCHIVED 2026-05-21

**Started:** 2026-05-11 (post-v1.1 close, Figma design session same day)
**Source of truth (at-ship):** `.planning/milestones/v1.2-REQUIREMENTS.md` (14 REQ-IDs satisfied) + `.planning/milestones/v1.2-CONTEXT.md` (Figma design contract `vwOzirhL0vyxDWq4m6t4gC`, 3-layer fill rules, design system tokens)

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

</details>

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

### Validated (shipped in v1.2)

Full requirements archived in `.planning/milestones/v1.2-REQUIREMENTS.md`; design contract detail in `.planning/milestones/v1.2-CONTEXT.md`:

- ✓ **Database extensions:** `draft` proposal status, `invited` partner status, `coefficient_history` append-only table with TRIGGER-enforced no-UPDATE/DELETE — v1.2 (Phase 12, DB-01/02/03)
- ✓ **3-step proposal wizard:** `/proposals/new/{parametres,calcul,verification}` with server-side draft persistence + Stepper-gated forward nav + ADMIN-09 D-12 partner-facing commission relaxation (signed-off STRIDE addendum) — v1.2 (Phase 13, ROUTE-01)
- ✓ **Dedicated `/[adminSegment]/partners/new` route** replacing v1.1's modal-based partner creation (modal stays as shelf code; CTA → Link) — v1.2 (Phase 14, ROUTE-02)
- ✓ **Reusable components:** Stepper, RetractableSidebar, MetricTile, AdminNavCard, StatusChip (5 variants incl. `invited` gold added in Phase 14) — v1.2 (Phase 11 + Phase 14 extension, COMP-01..05)
- ✓ **Brand assets:** Leasétic logo SVGs (mark `#6DC388`, wordmark `#112C3B`/light-ink) shipped to `public/logo-light.svg` + `public/logo-dark.svg` — v1.2 (Phase 11, ASSET-01/02)
- ✓ **Admin home redesign:** 3 AdminNavCards (Coefficients / Partenaires / Historique) replacing Phase 9's 2-link layout — v1.2 (Phase 14)
- ✓ **Coefficient history sidebar + standalone /history route** with cursor pagination + shared `<CoefficientDiffPanel>` (condensed + full modes) + side-by-side Avant/Après diff with `--gold` tint highlight — v1.2 (Phase 14, scope-inflated per D-21..D-25)
- ✓ **ADMIN-09 D-29 9-gate grep-contract suite** in CI verifying zero commission leakage across all Phase 14 non-exempt admin surfaces — v1.2 (Phase 14)
- ✓ **Public surface polish:** `<BrandLogo>` swap in shared `app/(public)/layout.tsx` + `.public-page-logo` CSS with `clamp(140px, 50vw, 200px)` responsive sizing — v1.2 (Phase 15, PUB-01/02)
- ⚠ Deferred to v1.3: partner home dashboard restructure + 3 MetricTiles + /proposals route + UI color refresh + diff-panel contrast measurement (all bundled per CONTEXT.md decisions)

### Validated (shipped in v1.3)

All v1.3 requirements shipped — 6 phases (16–21), 35 requirements, no documented partials. Full coverage in `.planning/reports/MILESTONE_SUMMARY-v1.3.md` §4. Highlights: app-shell visual refresh + WCAG-AA diff-panel contrast, Partner Home + `/proposals` Archivées pill, 3-step wizard redesign, admin home + partners-list refresh (AccountsList→PartnersList), per-partner XLSX export, centralized LC reference dashboard (ADMIN-09 envelope 9→12 gates), Neon 3-branch split, post-deploy DB-smoke CI gate, Better Auth `trustedOrigins`, in-app self-service password change (`/parametres`), and both Tier-1 onboarding gates (admin password rotation + privacy notice).

### Validated (shipped in v1.4)

All 19 active v1.4 requirements shipped — 4 phases (22–25), no documented partials; 3 descoped (BRAND-01/02/03 teal rebrand). Full coverage in `milestones/v1.4-REQUIREMENTS.md` + `milestones/v1.4-MILESTONE-AUDIT.md`. Highlights:

- ✓ Partner-type selector (`Agent` / `Commercial` / `Partenaire`), default `Partenaire`, admin-editable + audited — v1.4 (PTYPE-01..03)
- ✓ Commission-free loyer calc + PDF/UI variant for Agent/Commercial; commission structurally absent (calc/UI/PDF/logs/audit) — v1.4 (PTYPE-04..06)
- ✓ ADMIN-09 grep-contract suite extended 13→19 gates — v1.4 (PTYPE-07)
- ✓ PDF number/typography fix (U+202F) + Destinataire-block removal + byte-determinism corpus — v1.4 (PDF-01..03)
- ✓ Admin dual-view toggle (admin-only, session-only, server-derived authz) — v1.4 (VIEW-01..04)
- ✓ Admin-home label changes + status-pill adaptive sizing — v1.4 (COPY-01..04, UIFIX-01)

### Active (v1.5 — Proposal List Actions & Pill Fix)

See `.planning/REQUIREMENTS.md` for the full scoped list. Phase numbering continues at 26.

- [ ] Active/expired proposal rows expose Archive + Delete actions on `/proposals` (no Edit)
- [ ] Status pill renders correctly + responsively on the home "Propositions récentes" list and the `/proposals` table

### Deferred to v1.5+

- [ ] Teal accent rebrand (`#2D7A8C`) — descoped from v1.4 Phase 25; needs splitting the overloaded `--gd` token into distinct accent (→ teal) vs. success (→ `#129657`) tokens, recoloring ~63 sites + hardcoded `rgba(18,150,87,…)` tints, then a fresh light+dark WCAG AA audit
- [ ] OVH production deployment + smoke-deploy execution (September 2026 target; capability shipped in v1.1)
- [ ] Webhook notifications to Leasétic on each proposal generation
- [ ] Mobile-optimized layout
- [ ] Multi-language beyond FR + EN
- [ ] Automated browser tests (Playwright or similar)
- [ ] SMTP-driven self-service password reset
- [ ] Sentry / APM observability beyond Vercel logs
- [ ] Generic audit-log viewer beyond coefficient history
- [ ] Admin cross-partner proposal read view
- [ ] Wizard step-1 sticky-footer action bar / `beforeunload` warning / per-step tab titles
- [ ] Phase 11 sidebar adminHrefs config-driven refactor
- [ ] `/accounts` 308 redirect sunset (warm-cache window ≥1 milestone is met after v1.3)

### Out of scope (continuing constraints)

- **Changing the calculation formula or tranche boundaries** — frozen by default (partner expectations + business rules); any change requires explicit business approval. **v1.4 exception (approved by Antoine 2026-05-29):** a partner-type-conditional variant drops the commission factor for `Agent`/`Commercial` only; the `Partenaire` formula and all tranche boundaries stay frozen.
- **Removing the "commission invisible" rule** — non-negotiable business rule (reinforced in v1.4: commission is fully absent for `Agent`/`Commercial`).
- **Mutating already-saved PDFs** — once a proposal is stored, its PDF is immutable. Future coefficient changes apply only to new proposals.

## Constraints

### Lifted in v1.1 (applied to v1.0 only)

- ~~Single HTML file, inline `<style>` + `<script>`~~ → v1.1 introduces a Next.js build chain (npm + Vite-style toolchain).
- ~~Client-side only, no server~~ → v1.1 adds Postgres + Blob storage + NextAuth.
- ~~`window.print()` + `@media print`~~ → v1.1 generates PDFs (server-side or client-capture, decided in planning).
- ~~v10 localStorage keys (`lt_pw`, `lt_coeffs`, ...)~~ → v1.1 stores per-account state in Postgres; localStorage retained only for ephemeral UI prefs (theme, sidebar, language).

### Still in force

- **Calculation formula frozen** (with v1.4 partner-type exception). `Partenaire`: `loyer = montantHT × (1 + commission/100) × coefficient / 100`. `Agent`/`Commercial` (v1.4): `loyer = montantHT × coefficient / 100` (commission factor removed). Tranche boundaries unchanged.
- **Commission invisibility:** commission apporteur must never appear in UI or generated proposal. For `Agent`/`Commercial` (v1.4) it is absent from the math as well.
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
| **v1.2** — ADMIN-09 partner-facing commission relaxation (Phase 13 D-12) | Deal-owner partner sees their own commission on step 2 + step 3 review surfaces; PDF render path, audit_log, server logs, pre-finalize traces still hidden. Structurally enforced via finalize-helpers.ts isolation barrier + 30-case golden PDF no-commission corpus + 7-threat STRIDE addendum | ✓ Validated v1.2 (Phase 13, signed-off STRIDE addendum 2026-05-12) |
| **v1.2** — Phase 12 ship gap: SQL migration on disk but missing from drizzle/meta/_journal.json + snapshot | Hand-written 0004 SQL was committed without running drizzle-kit generate. Production schema un-applied for ~24h until Phase 13's wizard hit the new query paths. Repaired by manual psql apply + journal/snapshot sync 2026-05-12. Same class as the v1.1 Drizzle correlated-subquery bug ("generator self-evaluation blind spot"). | ⚠ Revisit — add a post-deploy DB-smoke step to CI before next migration ships |
| **v1.2** — Phase 11 sidebar adminHrefs forward-references | Shell.tsx wired sidebar to `/partners` + `/history` routes that don't exist yet (Phase 14 territory). Temporary patch: partners → /accounts, history → /coefficients placeholder. Phase 14 must either rename `accounts/` → `partners/` directory + add history sidebar inside coefficients page, OR hide the History nav entry until ready | ✓ Closed in Phase 14 (rename + standalone /history + Shell.tsx revert) |
| **v1.2** — Phase 14 color-contrast measurement deferred to v1.3 | The diff-panel changed-row composite (`rgba(224,133,48,0.10)` over `--surface` with `--ink` weight 600) needs WCAG 2.1 AA measurement in light + dark modes. User signaled an upcoming UI color refresh in v1.3 — measuring on tokens that will change is wasted work. Carried as a HARD PREREQUISITE for any v1.3 plan touching `--gold` / `.chip-invited` / diff-panel composite: contrast must be measured + signed off before merge. | ⏳ v1.3 prerequisite — measure during color refresh |
| **v1.2** — Phase 14 ADMIN-09 strict (no relaxation) | Phase 13 partner-facing wizard relaxed ADMIN-09 for step-2/3 commission visibility (D-12). Phase 14 introduces NO further relaxation: 9-gate grep-contract suite (`tests/admin-09-grep-contracts.test.ts`) blocks any future commission leak on partner list / /partners/new / admin home / sidebar collapsed / /history list. Admin-only exceptions (diff panels) explicitly tested as positive cases | ✓ Validated v1.2 (Phase 14, 9 grep gates live in CI) |
| **v1.4** — Partner-type-conditional loyer formula (`Agent`/`Commercial` drop the commission factor) | Agent/Commercial are compensated outside this tool, so no apporteur margin is added; commission removed from calc + UI + PDF + logs to avoid client confusion. `Partenaire` formula unchanged. Business-approved by Antoine 2026-05-29. | ◯ Planned v1.4 |
| **v1.4** — Admin/agent view toggle is session-only, lands in Admin | Avoids SSR no-flash persistence work; admins re-enter Admin view each login. Toggle remaps the nav between admin and agent route sets. | ◯ Planned v1.4 |
| **v1.4** — Teal rebrand is token-scoped (accent only) | Swap the single accent token to `#2D7A8C`; logo SVGs and semantic success green are explicitly excluded so success/"Actif" states stay green. | ◯ Planned v1.4 |

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

*Last updated: 2026-05-30 — v1.5 (Proposal List Actions & Pill Fix) started via `/gsd-new-milestone`. Scope: restore Archive/Delete actions on active proposal rows + fix status-pill rendering on home + `/proposals`. Roadmap continues at Phase 26.*
