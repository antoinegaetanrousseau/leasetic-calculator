# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- 🚧 **v1.1 — Hosted Web App Foundation** — Phases 5-10 (in progress) — see below

## Phases

<details>
<summary>✅ v1.0 — v10 Refactor (Phases 1-4) — SHIPPED 2026-04-30</summary>

- [x] **Phase 1: Parity Refactor** (3/3 plans) — v10 behaves identically to v9 on ES6+ code; 22-row PARITY-AUDIT
- [x] **Phase 2: Security Hardening** (2/2 plans) — SHA-256 password hashing, escapeHtml + assertEscape (8 fixtures), SEC-TEST.md
- [x] **Phase 3: UX Polish & i18n** (3/3 plans) — toasts, validation, FR/EN dictionary (~138 keys × 2), copy-LC, validity override
- [x] **Phase 4: Sidebar Shell + Design System v2** (3/3 plans) — grid shell, retractable sidebar, dark mode, FINAL-TEST-v11.md

</details>

### 🚧 v1.1 — Hosted Web App Foundation (Phases 5-10)

- [x] **Phase 5: Bootstrap & Deploy** — Deployable empty Next.js shell on Vercel + Neon Postgres + Vercel Blob, all hosting primitives behind portable adapters; CI gates the no-Vercel-only-import rule. ✅ Complete 2026-05-06: /healthz live at https://leasetic-matrice.vercel.app returning `{ db: ok, blob: ok }`. Follow-ups: 3-branch Neon split, GH plan upgrade for Environment protection, project transfer to memento team.
- [x] **Phase 6: Auth & Shell** — Login, session, role-gating with hidden admin URL; bilingual app shell with FR/EN i18n + dark mode. ✅ Complete 2026-05-08: all 9/9 plans done, 32/32 AUTH+SHELL requirements satisfied, migration 0001 applied to prod, both admins (antoine + emmanuel @leasetic.com) seeded and verified to log in end-to-end. Follow-ups: admin password rotation (shared launch password → individual strong), Better Auth trustedOrigins behavior investigation, Origin-gate documentation, APP_URL/NEXT_PUBLIC_APP_URL env requirement made explicit.
- [x] **Phase 7: Calc Engine Port + Proposal Form** — Pure-TS calc module with v10 golden tests; proposal entry form with live preview (no DB writes yet). ✅ Complete 2026-05-09: 6/6 plans done, 14/14 requirements satisfied (CALC-01..08, PROP-01, PROP-06, PROP-07, PROP-08, PROP-24, PROP-25). Live preview ships at /proposals/new — partner types into form + 300ms-debounced sticky right-column card shows formatted loyer (fr-FR/en-GB explicit locale), generated LC ref + Copy button, validity selector. Calc engine + 30 golden tests preserve v10 formula parity (±0.01 €). 227/227 tests passing.
- [ ] **Phase 8: Persistence + PDF Pipeline** — Proposals table with `params_snapshot` immutability, deterministic PDF rendering with byte-identical CI gate, blob storage, home-page list, download/duplicate/soft-delete
- [ ] **Phase 9: Admin Surface** — Coefficients editor with append-only history, partner account management, audit log, commission invisibility lockdown
- [ ] **Phase 10: Cutover & Polish** — v10 retirement + redirect, OVH portability smoke deploy, runbooks, legal/privacy hookup, soft-delete purge job

## Phase Details

### Phase 5: Bootstrap & Deploy
**Goal**: A deployable empty Next.js shell exists on Vercel that exercises Postgres + Blob round-trips through adapter interfaces, with CI enforcing the no-Vercel-only-primitives rule from the very first commit.
**Depends on**: Nothing (first phase of v1.1; v1.0 is complete and independent)
**Requirements**: BOOT-01, BOOT-02, BOOT-03, BOOT-04, BOOT-05, BOOT-06, BOOT-07, BOOT-08, BOOT-09, BOOT-10, BOOT-11, BOOT-12
**Success Criteria** (what must be TRUE):
  1. Visiting the production Vercel URL serves a Next.js page rendered from the new repo
  2. Hitting `/healthz` on production returns `{ db: ok, blob: ok }` proving DB read + blob round-trip works through the adapter interfaces
  3. Opening a PR that imports `@vercel/blob` outside `lib/storage/` (or any other forbidden Vercel-only primitive) fails CI
  4. `npm test` runs the Vitest suite locally and on every PR via CI
  5. Drizzle migrations are version-controlled SQL files and apply only via the explicit production GitHub Action (never auto-run on Vercel deploy)
**Plans:** 7 plans
Plans:
- [x] 05-01-PLAN.md — Repo scaffolding + Next.js init with output: standalone (BOOT-01, BOOT-07)
- [x] 05-02-PLAN.md — Tailwind v4 + UI-SPEC token spine + Plus Jakarta Sans + cookie theme/locale bootstrap + layout shell (BOOT-08)
- [x] 05-03-PLAN.md — lib/storage adapter (StorageAdapter interface + VercelBlobStorage + S3Storage drivers + Vitest selector tests) (BOOT-04, BOOT-05)
- [x] 05-04-PLAN.md — lib/db Drizzle 0.45 adapter + driver-by-URL selection + drizzle-kit generate baseline migration (BOOT-09)
- [x] 05-05-PLAN.md — ESLint flat config + CI grep gates (no @vercel/*, no drizzle-kit push) + Vitest CI workflow (BOOT-06, BOOT-11)
- [ ] 05-06-PLAN.md — Production migration GitHub Action (workflow_dispatch + environment approval + scripts/migrate.ts via postgres-js) (BOOT-10)
- [ ] 05-07-PLAN.md — Vercel/Neon/Blob provisioning + /healthz route exercising DB + blob round-trip via adapters (BOOT-02, BOOT-03, BOOT-04, BOOT-12)

### Phase 6: Auth & Shell
**Goal**: A real user can log in with email/password, see a bilingual themed app shell, and reach exactly the routes their role permits — with the admin URL hidden behind an env-driven segment that 404s on tampering.
**Depends on**: Phase 5 (needs deployable shell, DB, adapter interfaces, root layout, theme bootstrap)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12, AUTH-13, AUTH-14, AUTH-15, AUTH-16, AUTH-17, AUTH-18, SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, SHELL-06, SHELL-07, SHELL-08, SHELL-09, SHELL-10, SHELL-11, SHELL-12, SHELL-13, SHELL-14
**Success Criteria** (what must be TRUE):
  1. A partner provided an invitation URL by the admin can set their initial password and log in to reach `/`, while admin role is granted only via the production CLI script (never via app UI)
  2. An unauthenticated visitor accessing any `(authed)` or `(admin)` route is redirected to `/login`; an already-authenticated visitor on `/login` is redirected to `/`
  3. An admin reaches the admin tree only at the env-driven hidden segment; visiting any other segment value returns 404 (not 403), and a partner who guesses the correct segment still gets 404 because each layout and API handler independently calls `requireAdmin()`
  4. When admin disables a partner account, that partner's existing session is invalidated within 5 minutes via the `session_version` JWT bump, and re-login is rejected with the generic "incorrect email or password" message
  5. A logged-in user can toggle FR/EN and light/dark/system themes from the topbar, the choice survives logout/login (cookie + DB), and initial paint shows the correct theme without flash
**Plans:** 9 plans
Plans:
- [x] 06-01-PLAN.md — Foundation: install deps + drizzle-kit upgrade + env vars + Drizzle schema (users, sessions, accounts, verifications, password_resets) + 0001 migration (AUTH-13, AUTH-17)
- [x] 06-02-PLAN.md — i18n full v10 dictionary port (231 keys × 2 langs) + format.ts (explicit fr-FR / en-GB) + ESLint hardcoded-JSX rule (SHELL-04..06, SHELL-09) ✅ Complete 2026-05-08
- [x] 06-03-PLAN.md — Better Auth instance + Drizzle adapter + argon2id + tokens.ts + schemas.ts + auth catch-all route (AUTH-01, AUTH-02, AUTH-13, AUTH-17, AUTH-18, SHELL-11) ✅ Complete 2026-05-08
- [x] 06-04-PLAN.md — requireUser/requireAdmin helpers + admin server actions (disable/reEnable/createInvitation/createPasswordReset) + proxy.ts auth gate (AUTH-05, AUTH-06, AUTH-11, AUTH-14, AUTH-15, AUTH-16) ✅ Complete 2026-05-08
- [x] 06-05-PLAN.md — Public auth tree: (public)/layout + login + invite/[token] + reset/[token] + LoginForm + SetPasswordForm + redeem.ts (AUTH-01, AUTH-04, AUTH-08..10, AUTH-18, SHELL-03, SHELL-10, SHELL-11, SHELL-14) ✅ Complete 2026-05-08
- [x] 06-06-PLAN.md — (authed) shell + Topbar + UserMenu + theme/locale DB persistence; replace app/page.tsx (AUTH-03, AUTH-06, SHELL-01, SHELL-02, SHELL-04, SHELL-07, SHELL-08, SHELL-10, SHELL-14) ✅ Complete 2026-05-08
- [x] 06-07-PLAN.md — (admin)/[adminSegment] layout (env-segment + requireAdmin two-layer gate) + InviteUrlModal primitive (AUTH-07, AUTH-08, AUTH-10, AUTH-14, AUTH-15) ✅ Complete 2026-05-08
- [x] 06-08-PLAN.md — Error boundary (app/error.tsx) + 404 page (app/not-found.tsx) localized FR + EN (SHELL-12, SHELL-13) ✅ Complete 2026-05-08
- [x] 06-09-PLAN.md — scripts/grant-admin.ts CLI for AUTH-12 admin role assignment (Antoine + Emmanuel seed at v1.1 launch) ✅ Complete 2026-05-08
**UI hint**: yes

### Phase 7: Calc Engine Port + Proposal Form
**Goal**: A pure-TS calculation engine matches every v10 self-check fixture and ≥30 golden cases in CI, and an authenticated partner can fill out the proposal entry form and watch the loyer compute live — without any data being saved yet.
**Depends on**: Phase 6 (needs `(authed)` shell, i18n dictionaries, form/validation libraries, theme system)
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07, CALC-08, PROP-01, PROP-06, PROP-07, PROP-08, PROP-24, PROP-25
**Success Criteria** (what must be TRUE):
  1. CI fails on any drift in `lib/calc.ts` against the ≥30 v10 golden test cases and the ported `assertCalc` / `assertEscape` / `assertValidity` Vitest suites
  2. A partner sees a "Create new proposal" CTA on the home page, opens the entry form, fills in client name + amount HT + duration (and v10 fields), and the computed loyer updates live as they type — without any DB write occurring
  3. Form fields validate on blur with v10's red-ring focus pattern, and the same Zod schema imported on the client also runs on the server boundary
  4. The "Copier la référence" LC clipboard button and the configurable validity (15 / 30 / 60 days) selector work as in v10, with bilingual labels driven by the i18n `t()` helper
  5. Manual parity comparison of the live-preview output against v10 across ≥5 representative scenarios shows zero divergence in computed loyer
**Plans:** 6 plans
Plans:
**Wave 1**
- [x] 07-01-PLAN.md — Calc engine core (pure-TS module; computeLoyer / lookupCoefficient / tKey / tLabel / isOnDemand / generateLcRef + Zod schemas; string-typed boundary; seed-params constant) — CALC-01..04, CALC-08 ✅ Complete 2026-05-08

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 07-02-PLAN.md — Calc golden corpus (≥30 golden cases + assertCalc 6/6 + assertValidity 6/6 ports; assertEscape documented-not-ported) — CALC-05, CALC-06 ✅ Complete 2026-05-08
- [x] 07-06-PLAN.md — i18n copy table: 26 NEW Phase-7 keys × 2 langs + 4 tranche-label keys + parametric parity tests — cross-cutting (PROP-01, PROP-06, PROP-07, PROP-08, PROP-24, PROP-25) ✅ Complete 2026-05-08

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 07-03-PLAN.md — Home page CTA + v10 base CSS classes added to globals.css (.card / .ctitle / .fld / input.invalid / .ieu / .dg / .db / .yn-btn / .btn-* / .tbadge) — PROP-01 ✅ Complete 2026-05-08
- [x] 07-04-PLAN.md — Proposal form scaffold (RHF + zodResolver, 4 cards, 14 inputs, blur validation, native confirm reset, no-DB-write submit) + DurationSegmented + YesNoToggle + NumberInputAmount + PhoneInput + SirenInput components — PROP-06, PROP-08 ✅ Complete 2026-05-09

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 07-05-PLAN.md — Live preview composition (300ms-debounced sticky preview card, 5-state machine, formatCurrency fr-FR/en-GB, LC ref + Copy button, Validity selector, FormProvider restructure) — PROP-07, PROP-24, PROP-25, CALC-07 ✅ Complete 2026-05-09
**UI hint**: yes

### Phase 8: Persistence + PDF Pipeline
**Goal**: Submitting the proposal form persists an immutable, snapshotted row to Postgres, generates a byte-deterministic single-page PDF stored privately in blob, and the partner can browse, search, duplicate, download, and soft-delete their proposals from the home page — with the PDF immutability invariant enforced by `params_snapshot` and gated in CI.
**Depends on**: Phase 7 (needs calc engine, proposal form, validation schemas)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-11, DATA-12, PROP-02, PROP-03, PROP-04, PROP-05, PROP-09, PROP-10, PROP-11, PROP-12, PROP-13, PROP-14, PROP-15, PROP-16, PROP-17, PROP-18, PROP-19, PROP-20, PROP-21, PROP-22, PROP-23, PROP-26
**Success Criteria** (what must be TRUE):
  1. A partner submits the form and lands on `/proposals/{id}` (post-redirect-get) where they see the read-only inputs, validity status, an embedded PDF preview, and Download / Duplicate / Delete buttons
  2. The home page lists the partner's last 20 proposals (descending by date, with client name + LC ref + montant HT + creation date + validity status), supports load-more pagination, search by client name or LC reference, an empty state for new partners, and never shows another partner's data
  3. A fixture proposal rendered through `lib/pdf` produces a SHA-256 matching a committed expected hash; CI fails the build on any drift, the PDF is single-page, uses Plus Jakarta Sans self-hosted woff2 with `document.fonts.ready`, and uses explicit `Intl` locales (never system defaults)
  4. Once a proposal is saved, neither its inputs, computed values, nor PDF can be retroactively changed — verified by reading `params_snapshot` + `inputs` + `computed` + `schema_version` straight off the row, with the audit log capturing every admin mutation and partner soft-delete
  5. PDFs stream through `/api/proposals/{id}/pdf` after auth + ownership checks (never via raw blob URL), are stored at `proposals/{userId}/{proposalId}.pdf` with private access, and soft-deleted proposals are hidden from the default list while their blob remains available for the 30-day recovery window
**Plans**: TBD
**UI hint**: yes

### Phase 9: Admin Surface
**Goal**: The admin can edit global coefficients / commission / max threshold (creating a new append-only row each time), manage partner accounts, and review the audit log — while commission values stay invisible everywhere except the explicit debug tool, and existing proposals remain provably unchanged by any param edit.
**Depends on**: Phase 8 (needs `global_params`, `proposals.params_snapshot`, `audit_log`, partner data)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08, ADMIN-09
**Success Criteria** (what must be TRUE):
  1. An admin opens the hidden coefficients page, edits a coefficient or commission rate or max threshold, confirms the "affects new proposals only" modal, and a new `global_params` row appears with the actor / timestamp / fields-changed / optional note visible in the on-page history table
  2. After the admin's edit, a partner creating a brand-new proposal sees the new values applied, while every previously-saved proposal continues to render with its own snapshotted params (PDF and HTML view both unchanged)
  3. An admin can list all partners (email, display name, status, last login, created date), disable / re-enable any account, and trigger a one-time admin-mediated reset URL for any partner
  4. Every admin mutation (params update, account create, partner disable, proposal delete, role grant) writes a row to `audit_log` with actor + action + target + payload + timestamp
  5. Commission values are nowhere visible to the admin (not in lists, not in proposal views, not in logs, not in traces) except inside the explicit "explain calculation" debug tool that runs entirely in the admin's browser with no DB write
**Plans**: TBD
**UI hint**: yes

### Phase 10: Cutover & Polish
**Goal**: v10 standalone is retired, the v1.1 deployment is operationally ready (purge job, error pages, runbook, legal hookup), and OVH portability is *proven* by an actual smoke deploy of the same code against Node + Postgres + S3-compatible — with only env-var changes.
**Depends on**: Phase 9 (whole feature surface complete; this phase ships nothing new product-side, only operational and portability proofs)
**Requirements**: CUT-01, CUT-02, CUT-03, CUT-04, CUT-05, CUT-06, CUT-07, CUT-08, CUT-09
**Success Criteria** (what must be TRUE):
  1. After launch date, no partner can use v10; v10's hosted URL (if any) returns the bilingual "Leasétic Matrice has moved" notice that links to the v1.1 login page, and no localStorage migration path exists (all partners are onboarded clean-slate by the admin)
  2. The same git ref that runs on Vercel deploys successfully against a Node + Postgres + S3-compatible test environment with only env-var changes; a smoke run creates a proposal, generates a PDF, and the SHA-256 matches the Vercel-rendered fixture
  3. Production database contains zero `is_test=true` rows, the admin has used the first-login "Vérifier les coefficients" diff tool to confirm seed values match the v10 baseline, and the login page links to Leasétic's existing privacy notice in FR + EN with legal counsel confirmation that PDF storage is covered
  4. The README + `docs/deploy-ovh.md` runbook walks an operator through env vars, build, migration application, and smoke tests; platform logs (Vercel) cover all server errors with no Sentry/APM yet
  5. The 30-day soft-delete purge job runs successfully against a soft-deleted fixture proposal — deleting the blob, deleting the row, writing the audit-log entry — while PDFs flagged for the 10-year commercial-document retention remain untouched even after partner deactivation
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Parity Refactor | v1.0 | 3/3 | Complete | 2026-04-30 |
| 2. Security Hardening | v1.0 | 2/2 | Complete | 2026-04-30 |
| 3. UX Polish & i18n | v1.0 | 3/3 | Complete | 2026-04-30 |
| 4. Sidebar Shell + Design System v2 | v1.0 | 3/3 | Complete | 2026-04-30 |
| 5. Bootstrap & Deploy | v1.1 | 5/7 (06 checkpoint) | In progress | - |
| 6. Auth & Shell | v1.1 | 9/9 | Complete | 2026-05-08 |
| 7. Calc Engine Port + Proposal Form | v1.1 | 6/6 | Complete | 2026-05-09 |
| 8. Persistence + PDF Pipeline | v1.1 | 0/0 | Not started | - |
| 9. Admin Surface | v1.1 | 0/0 | Not started | - |
| 10. Cutover & Polish | v1.1 | 0/0 | Not started | - |

---

*Last updated: 2026-05-09 — **Phase 7 complete: 6/6 plans done.** Wave 4 closed by Plan 07-05 (live preview composition; capstone). 4 new components (550 lines): LiveLoyerPreview (398 lines, 5-state machine + useDebouncedValue + useMemo computeLoyer + LC ref lifecycle via store-info-from-previous-render + aria-live polite + coefficientsExpired D-7-12 stub) + CopyRefButton (82 lines, navigator.clipboard + sonner + 2s Check label + Range/Selection fallback) + ValiditySegmented (46 lines, DurationSegmented<15|30|60> wrapper per D-7-16) + useDebouncedValue (24 lines, generic 300ms hook). ProposalForm hoisted to ProposalFormProvider (Path A); page wraps form + preview as siblings under one RHF context. typecheck/lint/test/build all 0; 227/227 tests preserved. PROP-07 + PROP-24 + PROP-25 + CALC-07 grounded. ROADMAP success criteria #2 (live preview), #4 (Copy LC + Validity), #5 (manual v10 parity, via Plan 07-02's 30-case golden corpus running on every PR) all satisfied. Phase 8 (Persistence + PDF Pipeline) unblocked.*
*Detailed v1.0 archives in `.planning/milestones/`.*
