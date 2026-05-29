# Milestone v1.3 — Design Refresh + Partner-Onboarding Ready

**Generated:** 2026-05-29
**Status:** Complete ✓
**Purpose:** Team onboarding and project review

---

## 1. Project Overview

**Leasétic Matrice** is the internal sales-quote tool for Leasétic, distributed to channel
partners (IT integrators, resellers). Partners fill in client info + project amount +
duration and generate a 2-page PDF proposal (financial offer + RSE page) for their client.

Live deployment: <https://leasetic-matrice.vercel.app> (Vercel + Neon Postgres + Vercel Blob
+ Better Auth). Tech stack: Next.js 16 App Router, React 19, TypeScript, Drizzle ORM,
Better Auth 1.6.9 (argon2id), react-hook-form + Zod, Sonner toasts.

**v1.3 — Design Refresh + Partner-Onboarding Ready** applies the Figma `9:46` design
contract uniformly across partner + admin surfaces in light and dark mode, ships deferred
Tier-3 partner-home + `/proposals` work, delivers three new capabilities (Excel export,
centralized LC reference dashboard, in-app self-service password change), hardens infra
(Neon 3-branch split, post-deploy CI db-smoke gate, Better Auth `trustedOrigins`), and
closes the two Tier-1 partner-onboarding gates — landing the app ready for the first real
non-test partner invite.

## 2. Architecture & Technical Decisions

Decisions are organized by theme. Each links back to the originating phase's CONTEXT.md
where the locked rationale lives.

### App-shell visual contract (Phase 16)

- **PageHero primitive** as the canonical hero-row component for every authed page —
  variants for partner vs. admin, optional CTA slot, hard-locked typography per Figma.
- **Tri-state theme toggle** (Light / System / Dark) — "System" respects `prefers-color-scheme`
  + persists user preference to localStorage. Introduced new `theme.ts` adapter with
  no-flash restoration via cookie-based pre-paint.
- **Diff-panel contrast measurement** locked at WCAG 2.1 AA — `rgba(224,133,48,0.10)`
  changed-row composite over `--surface` with `--ink` weight 600, verified in light + dark.

### Partner surfaces (Phase 17)

- **Hero + 3 MetricTiles** on partner home — Europe/Paris calendar-month scope for "Ce mois-ci",
  "Total", "Brouillons". Aggregate SQL queries scoped per `user_id`. Display-only (non-clickable).
- **`Archivées` filter pill** lives inside `/proposals` — no separate `/archives` route.
  Phase 17 D-05 added a partial unique index `proposals_user_id_lc_ref_uq WHERE lc_ref IS NOT NULL`
  to allocate `lc_ref` only when a proposal becomes archived (carried draft semantics).
- **Validity selector relocated** from wizard step 1 to step 3 — `proposals.validity_days`
  default set at draft creation; step-3 mutation; Phase 13 behavior contract preserved.

### Admin surfaces + Help Center (Phase 18)

- **3 cross-partner aggregate query helpers** for Admin Home stats — "Propositions ce mois /
  Partenaires actifs / Dernière modif. coeffs". ADMIN-09 9-gate grep-contract suite (Phase 14)
  EXTENDED, not bypassed, to cover the new aggregate paths.
- **AdminNavCards** layout + Recent-activity card pattern reused from Phase 14.
- **AccountsList → PartnersList rename** completed (Phase 14 closeout deferral).
- **Help Center surfaces** (`/aide`, `/aide/commencer-ici`) added to the (authed) tree.

### New capabilities (Phase 19)

- **Per-partner XLSX export** (`/proposals/export` route handler) — server-side workbook
  build via the `exceljs` adapter under `src/lib/storage/`. Respects `?q=` + `?archived=`
  URL state. **Architecture note:** originally implemented as a Server Action, but binary
  responses fail Next.js's serialization boundary — Phase 19 in-flight bug caught + fixed
  by migrating to a Route Handler (Plan 19-01 SUMMARY captures the cause and the
  permanent rule).
- **Centralized LC reference dashboard** (`/[adminSegment]/lc-references`) — cross-partner
  audit table extending the ADMIN-09 commission-visibility envelope; admin role gate raised
  from 9 → 12 grep contracts to cover the new query path.

### Infra hardening (Phase 20)

- **Better Auth `trustedOrigins`** (INFRA-03) — explicit Origin gate added at middleware
  layer; CSRF defense no longer relies on SameSite cookies alone.
- **Neon 3-branch routing** — `main` / `preview` / `development` Neon branches mapped to
  the corresponding Vercel deployment scopes via per-scope `DATABASE_URL` env vars. Pooled
  connections enforced. Migrations fan out via the `db-migrate.yml` GitHub workflow
  (audit trail + required-reviewer gate on `branch=main`). No `drizzle-kit push` allowed.
- **CI `db-smoke` migration apply gate** — post-deploy step runs every PR that touches
  `drizzle/*.sql` against a Neon ephemeral branch; ~5s no-op when no schema change. Catches
  the class of bug that produced Phase 12's 24h production drift.

### Partner-onboarding gates (Phase 21)

- **`/parametres` self-service settings page** for ALL logged-in users (admin + partner) —
  D-02 made it role-agnostic to permanently close the no-self-service-password-change gap
  open since v1.1 Phase 6. Single Account card: identity (Prénom + Nom; email is
  read-only because both admins have `email_verified=1` in production — D-06d resolved via
  runtime DB probe) + password row (Ancien + Nouveau). `revokeOtherSessions: true`
  hardcoded on every changePassword call (D-08).
- **Admin password rotation** completed via the new flow (no fallback used). Audit trail
  in `docs/operations/phase-21-gate-evidence.md`.
- **Privacy notice reframe** (D-01) — Antoine self-edits leasetic.fr directly instead of
  the original "ask Thomas Heufke" stub. Published 2026-05-29; recorded in
  `docs/legal/privacy-coverage-confirmation.md`.

## 3. Phases Delivered

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 16 | Shell Refresh + Contrast Gates | 5/5 | ✓ | 2026-05-21 |
| 17 | Partner Surfaces | 8/8 | ✓ | 2026-05-24 |
| 18 | Admin Surfaces + Help Center | 7/7 | ✓ | 2026-05-25 |
| 19 | New Capabilities (XLSX + LC dashboard) | 2/2 | ✓ | 2026-05-25 |
| 20 | Infra Hardening | 3/3 | ✓ | 2026-05-27 |
| 21 | Partner-Onboarding Gates | 2/2 | ✓ | 2026-05-29 |

**Total v1.3:** 27 plans complete across 6 phases.

## 4. Requirements Coverage

v1.3 ships 35 requirements (30 across phases 16-19, 5 across phases 20-21). High-level
coverage by theme:

- ✅ App-shell visual refresh (sidebar + topbar + tri-state theme + hero pattern + light+dark pair)
- ✅ WCAG 2.1 AA contrast measurement on the diff-panel composite
- ✅ Partner Home dashboard + 3 MetricTiles + Propositions récentes (ROUTE-02 #3 resolved)
- ✅ `/proposals` `Archivées` filter pill (no separate route per design contract)
- ✅ Wizard 3-step redesign + validity-selector relocation to step 3
- ✅ Admin Home enhancement + AdminNavCards + Recent activity card
- ✅ Admin Partners list refresh + AccountsList → PartnersList rename
- ✅ Admin Créer-partenaire form-card refresh
- ✅ Admin Coefficients warning banner + history card refresh
- ✅ Excel export of proposals (XLSX, Route Handler, Tier 5 carry-forward)
- ✅ Centralized LC reference dashboard (Tier 5, ADMIN-09 envelope extended)
- ✅ Neon 3-branch split (Tier 2 carry-forward, BOOT-03 partial resolved)
- ✅ Post-deploy DB-smoke CI gate (Tier 2)
- ✅ Better Auth `trustedOrigins` hardening (INFRA-03)
- ✅ GATE-01 admin password rotation (Tier 1)
- ✅ GATE-02 privacy notice update (Tier 1, D-01 reframe)

**Audit verdict:** all v1.3 requirements satisfied. No documented partials. The two Tier-1
gates closed 2026-05-29 — partner onboarding is unblocked for non-`@test.leasetic.com` accounts.

## 5. Key Decisions Log

A representative slice of the locked decisions (each phase's CONTEXT.md has the full set):

| ID | Phase | Decision | Why |
|----|-------|----------|-----|
| **D-01** | 16 | PageHero is the canonical hero primitive across all authed pages | Single contract = single Figma source of truth, no per-page hero variants |
| **D-04** | 16 | Tri-state theme toggle (Light/System/Dark), no-flash via cookie | "System" respects user OS preference; cookie pre-paint avoids flash-of-wrong-theme |
| **D-05** | 17 | `proposals.lc_ref` nullable + partial unique index | `lc_ref` allocated only on archive; partial unique index lets drafts coexist |
| **D-11** | 18 | Admin-scoped `/proposals?partner_id=` query parameter | Cross-partner admin view extends the partner-scoped route; one component, two audiences |
| **D-06** | 19 | XLSX route is a Route Handler, NOT a Server Action | Server Actions can't return binary responses; serialization boundary fails silently in tests, breaks in production |
| **D-03** | 20 | Neon `-pooler` hostname is the single source of correctness | Substitutes for `?pgbouncer=true&connection_limit=1` query params; one config rule |
| **D-15** | 20 | `db-migrate.yml` GitHub workflow is the only path to apply migrations | No ad-hoc `npm run db:migrate`; audit trail + required-reviewer gate on `branch=main` |
| **D-01** | 21 | Antoine self-edits leasetic.fr privacy notice directly | Supersedes Phase 10's "ask Thomas Heufke" stub; Antoine owns the website, no third-party loop |
| **D-02** | 21 | `/parametres` flow available to ALL logged-in users (admin AND partner) | Permanently closes the no-self-service-password-change gap open since v1.1 |
| **D-06d** | 21 | Email demoted to read-only because both admins have `email_verified=1` | Better Auth 1.6.9 rejects email change without SMTP when verified; safe fallback per runtime DB probe |
| **D-07** | 21 | Two password fields (Ancien + Nouveau), NO Confirmer field | Match Figma 132:867 rev 2 exactly; mistyped pw recovered via existing admin↔admin reset |
| **D-08** | 21 | `revokeOtherSessions: true` hardcoded, never toggleable | Surfaces other-device sign-out as a feature, not a buried option |

Phases 16–21 collectively locked ~50 D-XX decisions. Full provenance lives in
`.planning/phases/{N}-*/{N}-CONTEXT.md`.

## 6. Tech Debt & Deferred Items

Captured during v1.3 execution; not blockers for milestone close. Candidates for v1.4
scoping:

### Forms i18n hardening

- **SetPasswordForm (Phase 7) + identitySchema firstName/lastName Zod errors** have the
  same English-leak pattern that Phase 21 commit `6cad405` fixed in ParametresForm. A
  centralized error-localization helper would remove the duplication and cover all
  forms.
- **No automated test coverage** for Phase 21's partial-success matrix fix (`735e02f`)
  or Zod localization (`6cad405`). Tests stayed at 1122 passing through both fixes —
  the fixes are unguarded against regression.

### Account v2

- **Avatar upload** deferred per D-06b — requires Vercel Blob image storage infra.
- **Phone number field** deferred per D-06b — requires User-model schema migration +
  Better Auth additionalFields extension.
- **Editable email** deferred per D-06d — requires SMTP for Better Auth's
  email-change verification flow (SMTP is out-of-scope since v1.1).

### Authentication hardening (post-v1.3)

- **Multi-factor authentication** on admin accounts — adjacent topic surfaced during
  the Phase 21 rotation discussion; not in v1.3; belongs in an admin-auth-hardening phase.
- **SMTP-driven forgotten-password reset** — partners who forget rely on the
  admin-mediated reset URL flow; v1.4+ candidate.

### Scheduled / locked-date work

- **OVH production deployment + smoke execution** — September 2026, capability
  shipped in v1.1 Phase 10; runbook `docs/operations/deploy-ovh.md`.

### Phase 19 lesson archived

- **Next.js Server Actions can't return binary responses** — caught in Phase 19 by
  the export bug; rule captured in PR commit + the memory index. Future PR-author
  reflex: any download/export goes through a Route Handler, never a Server Action.

## 7. Getting Started

For a new contributor reading this doc:

### Run the project locally

```bash
git clone https://github.com/antoinegaetanrousseau/leasetic-calculator.git
cd leasetic-calculator
npm install
cp .env.example .env.local  # fill in DATABASE_URL + BETTER_AUTH_SECRET
npm run dev                  # http://localhost:3000
```

### Key directories

| Path | What lives there |
|------|------------------|
| `app/(public)/` | Login, invite/reset token redemption, public-facing routes |
| `app/(authed)/` | Partner + admin shell-wrapped pages (parametres, proposals, history, aide) |
| `app/(admin)/[adminSegment]/` | Hidden admin tree (coefficients, partners, lc-references) |
| `app/api/auth/` | Better Auth route handlers |
| `src/lib/auth/` | Better Auth config, schemas, redeem, strength helpers |
| `src/lib/db/` | Drizzle schema + queries (OVH-portable adapter discipline) |
| `src/lib/storage/` | exceljs adapter for XLSX export, Vercel Blob adapter for PDFs |
| `src/lib/pdf/` | PDF generation pipeline (30-case golden corpus for parity) |
| `src/components/ui/` | Shell, RetractableSidebar, Topbar, PageHero, MetricTile, StatusChip |
| `src/i18n/dictionaries.ts` | All FR + EN strings (compile-time parity proof via `_EnHasAllFrKeys`) |
| `drizzle/` | Generated SQL migrations + `_journal.json` |
| `scripts/` | Operational scripts (seed-admins-launch, grant-admin, etc.) |
| `docs/operations/` | Runbooks (neon-branch-routing, phase-21-gate-evidence) |
| `docs/legal/` | Legal artifacts (privacy-coverage-confirmation) |
| `.planning/` | GSD planning artifacts (phases/, milestones/, ROADMAP, STATE) |

### Tests

```bash
npm run typecheck   # tsc --noEmit
npm run build       # Next.js production build
npm run test        # Vitest — 1122 passing (4 skipped DB-integration)
npm run lint        # ESLint with the no-hardcoded-JSXText rule active
```

### Where to look first

| You want to understand… | Read this first |
|-------------------------|-----------------|
| The hosted product | `.planning/PROJECT.md` (entry section) |
| The v1.3 design contract | Figma file `vwOzirhL0vyxDWq4m6t4gC` section `9:46` |
| Why the codebase has a "hidden admin tree" | v1.1 Phase 9 CONTEXT.md |
| The OVH-portable adapter discipline | `src/lib/db/` + `src/lib/storage/` + ESLint config |
| The commission-visibility envelope (ADMIN-09) | Phase 14 D-12 + Phase 18 9-gate suite |
| Better Auth setup + auth flows | `src/lib/auth/index.ts` |
| The new self-service password flow | `app/(authed)/parametres/ParametresForm.tsx` |
| How CI gates work | `.github/workflows/` (CI, db-migrate, db-smoke) |
| The partner-onboarding closure | `docs/operations/phase-21-gate-evidence.md` |

### GSD planning artifacts

This project uses the GSD (Get Shit Done) planning system. To understand any past
decision:

1. Open `.planning/ROADMAP.md` to see the phase index.
2. For phase N, the binding decisions live in `.planning/phases/N-*/N-CONTEXT.md`.
3. The plan tasks + executor work live in `N-{plan}-PLAN.md` and `N-{plan}-SUMMARY.md`.
4. The discussion that led to the decisions is in `N-DISCUSSION-LOG.md`.

Run `/gsd-progress` for a live snapshot, or `/gsd-milestone-summary v1.3` to regenerate
this document.

---

## Stats

- **Timeline:** 2026-05-22 → 2026-05-29 (8 days)
- **Phases:** 6 / 6 complete
- **Plans:** 27 / 27 complete
- **Commits:** 175 (on `main`)
- **Files changed:** 224 (+39,999 / −2,262)
- **Tests:** 1122 passing (4 skipped DB-integration)
- **Contributors:** Antoine Rousseau (solo)
- **Production URL:** <https://leasetic-matrice.vercel.app>
