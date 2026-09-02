# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 — Hosted Web App Foundation** — Phases 5-10 (shipped 2026-05-11) — see `milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 — UX Polish + Proposal Wizard** — Phases 11-15 (shipped 2026-05-21) — see `milestones/v1.2-ROADMAP.md`
- ✅ **v1.3 — Design Refresh + Partner-Onboarding Ready** — Phases 16-21 (shipped 2026-05-29) — see `milestones/v1.3-ROADMAP.md`
- ✅ **v1.4 — Partner Types, Admin Dual-View & Rebrand** — Phases 22-25 (shipped 2026-05-30) — see `milestones/v1.4-ROADMAP.md`
- ✅ **v1.5 — Proposal List Actions & Pill Fix** — Phases 26-27 (shipped 2026-05-30) — see `milestones/v1.5-ROADMAP.md`
- 🚧 **v1.6 — CRM Foundation** — Phases 29-34 (in progress, started 2026-08-31) — CRM registry, two-source reconciliation, pipeline, activity

---

## Phases

<details>
<summary>✅ v1.0 — v10 Refactor (Phases 1-4) — SHIPPED 2026-04-30</summary>

- [x] **Phase 1: Parity Refactor** (3/3 plans) — v10 behaves identically to v9 on ES6+ code; 22-row PARITY-AUDIT
- [x] **Phase 2: Security Hardening** (2/2 plans) — SHA-256 password hashing, escapeHtml + assertEscape (8 fixtures), SEC-TEST.md
- [x] **Phase 3: UX Polish & i18n** (3/3 plans) — toasts, validation, FR/EN dictionary (~138 keys × 2), copy-LC, validity override
- [x] **Phase 4: Sidebar Shell + Design System v2** (3/3 plans) — grid shell, retractable sidebar, dark mode, FINAL-TEST-v11.md

Full archive: `milestones/v1.0-ROADMAP.md` · `milestones/v1.0-REQUIREMENTS.md`

</details>

<details>
<summary>✅ v1.1 — Hosted Web App Foundation (Phases 5-10) — SHIPPED 2026-05-11</summary>

- [x] **Phase 5: Bootstrap & Deploy** (7/7 plans) — Vercel + Neon + Vercel Blob; `/healthz` live; OVH-portable adapter discipline locked from first commit
- [x] **Phase 6: Auth & Shell** (9/9 plans) — Better Auth 1.6.9 + argon2id; hidden `/[adminSegment]` 2-layer gate; 231-key FR/EN i18n; SHELL-12/13 error pages
- [x] **Phase 7: Calc Engine Port + Proposal Form** (6/6 plans) — Pure-TS calc with 30-case ±0.01 € golden corpus; live preview + 14-input form
- [x] **Phase 8: Persistence + PDF Pipeline** (14/14 plans) — `proposals` + `global_params` + `audit_log` tables; `@react-pdf/renderer` byte-deterministic CI gate; soft-delete + 30-day purge window
- [x] **Phase 9: Admin Surface** (4/4 plans) — coefficients editor + explain tool + accounts list; 42 STRIDE threats closed (ASVS L1); ADMIN-09 commission invisibility enforced
- [x] **Phase 10: Cutover & Polish** (6/6 plans) — OVH runbook + smoke script (Sept 2026 target); Vercel Cron purge; SeedBanner; v10 retirement; 55 STRIDE threats closed

**Shipped:** 2026-05-11 · **Plans:** 46 · **Requirements:** 108/108 (105 ✅ + 3 partial) · **Tests:** 399/399 passing
**Production:** https://leasetic-matrice.vercel.app
**Full archive:** `milestones/v1.1-ROADMAP.md` · `milestones/v1.1-REQUIREMENTS.md` · `milestones/v1.1-MILESTONE-AUDIT.md`

</details>

<details>
<summary>✅ v1.2 — UX Polish + Proposal Wizard (Phases 11-15) — SHIPPED 2026-05-21</summary>

- [x] **Phase 11: Design System Foundation + Brand Assets** (5/5 plans) — Stepper, RetractableSidebar, MetricTile, AdminNavCard, StatusChip + light/dark Leasétic logo SVGs
- [x] **Phase 12: Schema Extensions for Drafts + History** (7/7 plans) — `draft` proposal status, `invited` partner status, `coefficient_history` append-only table (with TRIGGER-enforced no-UPDATE/DELETE)
- [x] **Phase 13: 3-Step Proposal Wizard** (6/6 plans) — `/proposals/new/{parametres,calcul,verification}` with server-side draft persistence + Stepper-gated forward nav + ADMIN-09 D-12 partner-facing commission relaxation (signed-off STRIDE addendum)
- [x] **Phase 14: Admin Polish — Partners + History + Home** (6/6 plans) — Dedicated `/partners/new` route, StatusChip rollout, `/coefficients` history sidebar + standalone `/history` route, 3 AdminNavCards on admin home, ADMIN-09 D-29 grep-contract suite (9 gates)
- [x] **Phase 15: Public Surface Brand Polish** (1/1 plans) — `<BrandLogo />` swap in shared `(public)` layout with `clamp(140px, 50vw, 200px)` responsive sizing

**Shipped:** 2026-05-21 · **Plans:** 25 · **Requirements:** 14/14 (with documented adjustments) · **Tests:** 876/876 passing (+249 net from v1.1) · **Commits:** 147
**Production:** https://leasetic-matrice.vercel.app
**Full archive:** `milestones/v1.2-ROADMAP.md` · `milestones/v1.2-REQUIREMENTS.md`
**Carry-forwards to v1.3:** `v1.3-CARRYFORWARD.md`

</details>

<details>
<summary>✅ v1.3 — Design Refresh + Partner-Onboarding Ready (Phases 16-21) — SHIPPED 2026-05-29</summary>

- [x] **Phase 16: Shell Refresh + Contrast Gates** — Refreshed sidebar + tri-state theme + hero pattern + locale relocation + topbar/footer; WCAG AA contrast for diff-panel and gold surfaces measured and signed off (completed 2026-05-21)
- [x] **Phase 17: Partner Surfaces** — Partner Home dashboard (hero + MetricTiles + Propositions récentes), /proposals table with Archivées pill, full wizard redesign (3 steps + validity relocation + LC reference reservation); light+dark pair verified (completed 2026-05-24)
- [x] **Phase 18: Admin Surfaces + Help Center** — Admin Home enhancement (hero + stats + CTA), Partners list styled table + AccountsList→PartnersList rename, Créer partenaire form refresh, Coefficients warning banner + history card refresh, Aide / Help Center (landing + Commencer ici starter article); light+dark pair verified; topbar route-awareness + 4 visual gaps closed; wizard step-1 CTA fixed (partnerCo fallback + validityDays whitelist clamp) (completed 2026-05-25)
- [x] **Phase 19: New Capabilities** — Per-partner XLSX export (ADMIN-09 clean, grep-contract suite extended to gate 10), centralized LC reference dashboard (cross-partner, admin-only, grep-contract suite extended to gates 11+12)
- [x] **Phase 20: Infra Hardening** — Neon 3-branch split (per-scope DATABASE_URL), post-deploy DB-smoke CI step, Better Auth trustedOrigins middleware gate (completed 2026-05-27)
- [x] **Phase 21: Partner-Onboarding Gates** — Admin password rotation (shared `leasetic2026` → individual strong), privacy policy confirmation with Thomas; final phase before first real partner (completed 2026-05-29)

**Shipped:** 2026-05-29 · **Plans:** 27 · **Tests:** 1122/1122 passing · **Commits:** 175
**Full archive:** `milestones/v1.3-ROADMAP.md` · **Summary:** `reports/MILESTONE_SUMMARY-v1.3.md`

</details>

<details>
<summary>✅ v1.4 — Partner Types, Admin Dual-View & Rebrand (Phases 22-25) — SHIPPED 2026-05-30</summary>

- [x] **Phase 22: Partner Types & Commission-Free Proposals** (5/5 plans) — `partner_type` enum + Drizzle migration `0006` + backfill; commission-free calc variant for Agent/Commercial; commission structurally absent from wizard/preview/PDF; ADMIN-09 grep suite 13→19 gates; 21 STRIDE closed
- [x] **Phase 23: PDF Rendering Fixes** (3/3 plans) — U+202F glyph-overlap fix (PDF-scoped sanitizer); Destinataire block removed; byte-determinism fixture regenerated + Agent/Commercial commission-free corpus
- [x] **Phase 24: Admin Dual-View Toggle** (2/2 plans) — session-only Admin/Agent toggle (admin-gated, `sessionStorage`); `effectiveView` nav remap; authz unchanged (server-derived `isAdmin`); 7 STRIDE closed
- [x] **Phase 25: Admin-Home Labels & Pill Fix** (2/2 plans) — COPY-01..04 FR+EN relabels (parity proof green); status-pill `max-content` sizing fix. *(Teal rebrand BRAND-01/02/03 descoped 2026-05-30.)*

**Shipped:** 2026-05-30 · **Plans:** 12 · **Requirements:** 19/19 active (3 descoped) · **Tests:** 1184 passing · **Commits:** 129
**Full archive:** `milestones/v1.4-ROADMAP.md` · `milestones/v1.4-REQUIREMENTS.md` · `milestones/v1.4-MILESTONE-AUDIT.md` · **Summary:** `reports/MILESTONE_SUMMARY-v1.4.md`

</details>

<details>
<summary>✅ v1.5 — Proposal List Actions & Pill Fix (Phases 26-27) — SHIPPED 2026-05-30</summary>

- [x] **Phase 26: Active/Expired Row Actions** (3/3 plans) — Archive icon button on non-draft proposal rows + Restore in Archivées (Delete descoped D-01); ADMIN-09 envelope held (19-gate grep suite stays green)
- [x] **Phase 27: Status-Pill Rendering Fix** (2/2 plans) — content-hugging `.chip` sizing on home "Propositions récentes" list and `/proposals` table; light + dark human-verified

**Shipped:** 2026-05-30 · **Plans:** 5 · **Requirements:** 6/6 active (ROWACT-02 descoped) · **Tests:** 1184 passing
**Full archive:** `milestones/v1.5-ROADMAP.md` · `milestones/v1.5-REQUIREMENTS.md`

</details>

### 🚧 v1.6 — CRM Foundation (Phases 29-34) — IN PROGRESS

Client data gets its own life independent of proposals — a shared company registry with
private per-partner relationships — so the extranet can become the CRM that replaces HubSpot.
`proposals.inputs` stays immutable throughout; the CRM is strictly additive. Phase numbering
continues from Phase 28 (retro-documented ReUI/base-maia migration). Depends on PR #6 landing.

- [x] **Phase 29: Migration Safety Net** — repair the `db-smoke` path filter so the gate fires on this repo's real migration paths (currently blind to the Phase 12 regression), and point local dev at the Neon `development` branch. Rescoped 2026-08-31: the 3-branch split already shipped in Phase 20; **not** a prerequisite for the phases below (completed 2026-08-31)
- [x] **Phase 30: Company & Contact Registry** — `companies` (global) + `client_relationships` (private, per-partner) + `contacts` (scoped to relationship) schema and surfaces; `proposals` gains a nullable FK; new `sales` role added alongside `partner`/`admin` (completed 2026-09-02)
- [x] **Phase 31: Reconciliation Engine & Proposal Extraction** — dry-run-first dedup engine (SIREN auto-merge, name-normalized flagging, human-resolution UI) exercised against existing `proposals.inputs` (completed 2026-09-02)
- [ ] **Phase 32: HubSpot Import** — reuses the Phase 31 engine against the HubSpot `.xlsx` export; contact-owner mapped to a Leasétic sales-role user; idempotent re-import via provenance IDs. **Design partially blocked** — see open dependency note below.
- [ ] **Phase 33: Pipeline** — partner-advanced stage on the relationship (late stages system-owned), won/lost/unanswered outcome on the proposal, SIREN-gated win
- [ ] **Phase 34: Activity & Follow-Up** — unified timeline (manual notes + system events), next-action date, "who to chase" list

**Open dependency:** IMPORT-02's detailed design (Phase 32) is blocked on the HubSpot export file (`hubspot-crm-exports-tous-les-contacts-2026-08-31.xlsx`) being readable — macOS TCC currently blocks `~/Downloads`. This gates Phase 32's detailed planning only, not the milestone or any other phase.

</details>

---

## Phase Details

### Phase 16: Shell Refresh + Contrast Gates

**Goal:** Deliver the v1.3 refreshed app shell across all authed surfaces and formally close the Phase 14 deferred contrast measurement before any downstream wave touches `--gold` / `.chip-invited` / diff-panel.
**Depends on:** Phase 15 (v1.2 final)
**Requirements:** SHELL-01, SHELL-02, SHELL-03, SHELL-04, SHELL-05, CONTRAST-01, CONTRAST-02
**Success Criteria** (what must be TRUE):

  1. Every authed page renders the hero pattern (`Bonjour, {prénom} 👋` + subtitle + page CTA) in both light and dark without layout shift.
  2. The sidebar collapse toggle, the tri-state theme control (Light / System / Dark), and the FR/EN locale toggle all appear in the sidebar footer; System mode updates live when the OS theme changes; collapse preference persists across reload.
  3. The topbar and footer render the Figma `9:46` visual treatment in both light and dark on every authed route.
  4. A signed-off contrast audit record confirms the diff-panel changed-row composite (`rgba(224,133,48,0.10)` over `--surface` + `--ink` weight 600) reaches ≥4.5:1 in both light and dark, and any new `--gold` / `--teal` foreground-on-background pair introduced in this phase also passes WCAG AA.

**Plans:** 5/5 plans complete

- [x] 16-01-PLAN.md — PageHero primitive + Vitest coverage (D-01..D-05, SHELL-03 scaffold)
- [x] 16-02-PLAN.md — Sidebar icon-size micro-deltas + Topbar visual verification (D-12..D-16, SHELL-01/02/04 + SHELL-05 topbar half)
- [x] 16-03-PLAN.md — Shell footer extension with Mentions légales link (D-17/D-18, SHELL-05 footer half; reuses existing `shell.footer.privacy` key)
- [x] 16-04-PLAN.md — Admin home reference adopter for PageHero + new `admin.home.eyebrow` i18n key (D-06, SHELL-03 consumer)
- [x] 16-05-PLAN.md — Manual WCAG 2.1 AA contrast audit + Antoine sign-off (D-08..D-11, CONTRAST-01/02)

**UI hint:** yes

### Phase 17: Partner Surfaces

**Goal:** Deliver the full Figma `9:46` design treatment for all partner-facing routes — home dashboard, proposals list with archives, and the redesigned 3-step wizard including validity-selector relocation and LC reference reservation — in both light and dark.
**Depends on:** Phase 16 (contrast gates signed off; shell primitives available)
**Requirements:** PHOME-01, PHOME-02, PHOME-03, PROPS-01, PROPS-02, WIZ-01, WIZ-02, WIZ-03, WIZ-04, WIZ-05, WIZ-06, THEME-01
**Success Criteria** (what must be TRUE):

  1. Partner Home `/` shows `Bonjour, {prénom} 👋`, three MetricTile values scoped to the current partner and calendar month (Europe/Paris), and a Propositions récentes card with the 5 most recent proposals and a `Voir toutes →` link — in both light and dark.
  2. `/proposals` renders a styled table with an `Archivées` filter pill; toggling it surfaces soft-deleted and expired proposals in-page with correct `<StatusChip>` labels, without navigating away.
  3. Wizard step 1 shows the Figma `35:46` form card with `● INFORMATIONS CLIENT` / `● DÉTAILS DU PROJET` section labels and segmented duration pill; step 2 shows the loyer-mensuel hero card in `--teal` with explicit `Commission apporteur (non visible client)` row; step 3 shows the 2-column 1040px layout with `<PdfPreviewMock>` header carrying the LC reference reserved at step 1 submission.
  4. The validity-selector (15j / 30j / 60j) is present on step 3 inside the CALCUL review card; a default value (30j) is set at draft creation; selecting a different value updates the draft before finalize.
  5. Every partner-side screen ships light and dark variants matching Figma `82:*` duplicate frames; ADMIN-09 D-12 envelope and the 9-gate grep-contract suite remain green throughout.

**Plans:** 8/8 plans complete

- [x] 17-01-PLAN.md — Move lc_ref allocation to createDraft + add archived filter to buildListResponse (DB/API layer foundation)
- [x] 17-02-PLAN.md — Add ~30 Phase 17 i18n keys (FR + EN) + PdfPreviewMock lcRef prop change
- [x] 17-03-PLAN.md — Partner Home / rewrite (PageHero + 3 MetricTiles + Propositions récentes) + proposal-aggregates queries
- [x] 17-04-PLAN.md — /proposals server route + FilterPillRow client component (Actives/Archivées toggle)
- [x] 17-05-PLAN.md — Wizard step 1 PageHero adoption (repaint only, no JSX restructure)
- [x] 17-06-PLAN.md — Wizard step 2 restructure (PageHero + loyer hero card + Tranche/Coefficient chip + Détail du calcul + Paramètres saisis)
- [x] 17-07-PLAN.md — Wizard step 3 PageHero adoption + validity selector inside CALCUL + PdfPreviewMock real lcRef + updateValidity server action
- [x] 17-08-PLAN.md — THEME-01 light+dark verification checkpoint + CONTRAST-02 audit append + ADMIN-09 final gate check

**UI hint:** yes

### Phase 18: Admin Surfaces + Help Center

**Goal:** Apply the Figma `9:46` design contract to all admin surfaces — home, partners list (with component rename), create-partner form, and coefficients page — plus ship the net-new Aide (Help Center) flow (landing + 1 starter article), in both light and dark.
**Depends on:** Phase 16 (shell primitives available), Phase 17 not required (no partner↔admin coupling)
**Requirements:** ADMIN-10, ADMIN-11, ADMIN-12, ADMIN-13, ADMIN-14, THEME-02, HELP-01
**Success Criteria** (what must be TRUE):

  1. Admin Home shows a hero with ADMIN badge + `Nouvelle proposition` CTA + 3 stats row (Propositions ce mois / Partenaires actifs / Dernière modif. coeffs) + 3 AdminNavCards + Recent activity card in both light and dark.
  2. `/[adminSegment]/partners` renders the Figma `42:46` styled table with an `Inviter partenaire` CTA and filter/search controls; the component file is `PartnersList.tsx` (renamed from `AccountsList.tsx`) and all imports resolve cleanly.
  3. `/[adminSegment]/partners/new` renders the Figma `43:46` form card visual treatment; behavior (3-section RHF form + adminCreateInvitation + InviteUrlModal) is unchanged from Phase 14.
  4. `/[adminSegment]/coefficients` shows the Figma `45:46` orange warning banner (using `--gold` token) with copy confirming coefficient edits do not retroactively change existing PDFs, plus the refreshed inline history card alongside the Phase 14 2-column sidebar.
  5. Every admin-side screen ships both light and dark variants; the 9-gate grep-contract suite remains green.
  6. `/aide` landing renders the 3-card placeholder grid; `/aide/commencer-ici` renders the starter article; sidebar `Aide` link is visible for both partner and admin roles; light + dark verified.

**Plans:** 7/7 plans complete

- [x] 18-01-PLAN.md — DB/API foundation: proposal-aggregates cross-partner + partner-aggregates + admin-activity 3-source union + /proposals admin user_id query (D-11) + per-role sidebar nav (D-27) + ~70 net-new i18n keys
- [x] 18-02-PLAN.md — Admin Home rebuild (PageHero + 3 stat tiles all teal D-04 + 3 AdminNavCards + Recent activity card + RecentActivityRow component + MetricTile valueColor prop)
- [x] 18-03-PLAN.md — Partners list: AccountsList→PartnersList full rename (D-14), 6-col styled table, 4-tab filter pill (D-09), per-row overflow menu (D-10), cursor pagination (D-12), empty states (D-13)
- [x] 18-04-PLAN.md — Créer partenaire visual refresh: separate action card (D-15), inline red error state (D-16), dirty-form confirm dialog (D-18); behavior unchanged
- [x] 18-05-PLAN.md — Coefficients: new CoefficientWarningBanner (sessionStorage dismissable D-19/D-20) + CoefficientHistorySidebar in-place refresh (D-21) + click-to-diff removal (D-22)
- [x] 18-06-PLAN.md — Aide landing (3-card placeholder D-25) + Commencer ici starter article (hardcoded TSX D-24/26 + 3 wizard screenshots) + SUPPORT_EMAIL decision checkpoint
- [x] 18-07-PLAN.md — Closing-out: visual sweep + contrast addendum + ADMIN-09 9-gate verification + 4 visual gap fixes + topbar route-awareness

**UI hint:** yes

### Phase 19: New Capabilities

**Goal:** Add per-partner XLSX proposal export (ADMIN-09 clean) and a centralized cross-partner LC reference dashboard (admin-only), both extending the ADMIN-09 grep-contract suite monotonically.
**Depends on:** Phase 17 (XLSX export CTA lives on `/proposals`; ADMIN-09 suite baseline from Phase 17), Phase 18 (LC dashboard is an admin surface)
**Requirements:** EXPORT-01, EXPORT-02, LCDASH-01, LCDASH-02
**Success Criteria** (what must be TRUE):

  1. A partner can trigger an XLSX export from `/proposals`; the downloaded file contains all proposals matching the current filter (Active or Archivées) with columns: Référence, Client, Projet, Montant HT, Durée, Loyer mensuel, Coefficient, Statut, Date de création, Date d'expiration.
  2. The XLSX file contains no `Commission` column, no `commission_pct` cell, and no commission-related substring in any sheet; this is enforced by a new gate in `tests/admin-09-grep-contracts.test.ts`.
  3. An admin can navigate to `/[adminSegment]/lc-references` and see a cursor-paginated, searchable list of every issued LC reference across all partners (reference, partner name, client name, project amount, status, created_at).
  4. The LC dashboard passes all ADMIN-09 grep-contract suite gates (now ≥10); list rows, search results, and any detail surfaces contain no commission data.**Plans:** 2/2 plans complete

**Wave 1**

- [x] 19-01-PLAN.md — EXPORT: per-partner XLSX export (src/lib/xlsx adapter + Server Action + ExportButton + ADMIN-09 gate 10)

**Wave 2**

- [x] 19-02-PLAN.md — LCDASH: cross-partner LC reference dashboard (lc-references DB query + admin SSR page + LcReferencesList + 4th AdminNavCard + Admin Home grid 3→4 + ADMIN-09 gates 11+12)

**UI hint:** yes

### Phase 20: Infra Hardening

**Goal:** Resolve the three Tier-2 infrastructure deferred items: Neon 3-branch split, post-deploy DB-smoke CI step, and Better Auth `trustedOrigins` middleware gate.
**Depends on:** Phase 16 (no functional dependency; can run in parallel with 17/18, but ordered after to let design phases ship first and avoid migration noise)
**Requirements:** INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):

  1. Vercel production scope uses the Neon `main` branch endpoint, preview scope uses `preview`, development scope uses `development`; each scope's `DATABASE_URL` env var points to the corresponding Neon pooled endpoint; a PR against a development branch can no longer accidentally touch production data.
  2. A GitHub Actions CI step runs a real-Postgres smoke on every PR touching `drizzle/migrations/*.sql` or `drizzle/meta/_journal.json`, using a Neon ephemeral branch; the step fails (and blocks merge) if the schema cannot be applied cleanly.
  3. A middleware-level Origin gate on `/api/auth/sign-in/*` mutations hard-blocks requests whose `Origin` header is not in the `trustedOrigins` list; verified by a test that sends an untrusted Origin and asserts a non-2xx response.

**Plans:** 3/3 plans complete

### Phase 21: Partner-Onboarding Gates

**Goal:** Close the two Tier-1 partner-onboarding blockers that must complete before any real partner account is created — admin password rotation and Thomas's privacy policy confirmation.
**Depends on:** Phases 16-20 (all v1.3 product work complete before the operational gate runs)
**Requirements:** GATE-01, GATE-02
**Success Criteria** (what must be TRUE):

  1. Both admin accounts (`antoine.rousseau@memento.eco` and the second admin) have individual strong passwords set via the admin↔admin password-reset flow; the shared `leasetic2026` password is no longer valid for either account; confirmed by a successful login + failed login test with the old credential.
  2. `docs/legal/privacy-coverage-confirmation.md` is updated (committed) with Thomas Heufke's explicit confirmation covering (a) Vercel/Neon EU hosting and (b) 10-year PDF retention; the stub placeholder text is replaced with dated confirmation copy.
  3. Both criteria above are met before any non-test partner account (`not @test.leasetic.com`) is invited via the admin `/partners/new` flow.

**Plans:** 2/2 plans complete

---

### Phase 22: Partner Types & Commission-Free Proposals

**Goal:** Partners have an assigned type (Agent / Commercial / Partenaire) that conditions their proposal economics end-to-end — from the create/edit form through the calc engine, UI surfaces, PDF output, and audit trail — with the ADMIN-09 grep-contract suite extended to assert zero commission leakage for Agent/Commercial.
**Depends on:** Phase 21 (v1.3 complete; baseline 12-gate grep suite green)
**Requirements:** PTYPE-01, PTYPE-02, PTYPE-03, PTYPE-04, PTYPE-05, PTYPE-06, PTYPE-07
**Success Criteria** (what must be TRUE):

  1. When creating or inviting a partner, an admin sees a "Type de partenaire" selector (Agent / Commercial / Partenaire) on the form; all existing accounts show as Partenaire after the migration applies, with behavior identical to pre-migration for all current partners.
  2. An admin can open an existing partner's detail/edit surface and change their partner type; the change appears in `audit_log` with the before/after values.
  3. A proposal created for an Agent or Commercial account computes `loyer = montant HT × coefficient / 100` (no commission factor); a proposal for a Partenaire uses the unchanged formula; the golden test corpus covers all three partner types with verified ±0.01 € accuracy.
  4. For Agent/Commercial, no commission annotation, line, figure, or label appears anywhere in the wizard steps, live preview, or partner-facing dashboards — the commission UI is structurally absent (not hidden via CSS).
  5. A PDF generated for an Agent or Commercial proposal contains no commission figure, no commission-derived wording, and renders the correct commission-free loyer; the `params_snapshot` records `partner_type` + `commission_applied: false` so the PDF is reproducible even if the partner's type changes later.
  6. The `tests/admin-09-grep-contracts.test.ts` suite gains new gates asserting zero commission leakage across the Agent/Commercial calc output, UI render paths, PDF template, server logs, and audit payloads; all existing 12 gates remain green.

**Plans:** 5/5 plans complete

Wave 1 (parallel):

- [x] 22-01-PLAN.md — Schema: partner_type column + Better Auth registration + snapshot type + generated migration + idempotent backfill (PTYPE-01 schema, PTYPE-02, PTYPE-06 type)
- [x] 22-02-PLAN.md — Commission-free golden corpus via commissionPct:0 seam; formula.ts frozen (PTYPE-04)

Wave 2 (parallel, after 22-01):

- [x] 22-03-PLAN.md — Admin surfaces: required type selector on create form + audited adminUpdatePartnerType + list badge/column (PTYPE-01, PTYPE-03)
- [x] 22-04-PLAN.md — Commission-free presentation end-to-end: wizard steps 2+3 structural absence + live preview + finalize snapshot (PTYPE-04, PTYPE-05, PTYPE-06)

Wave 3 (after 22-03 + 22-04):

- [x] 22-05-PLAN.md — ADMIN-09 grep-contract extension + no-commission PDF 4-layer corpus for Agent/Commercial + full-suite regression (PTYPE-06, PTYPE-07)

**UI hint:** yes

### Phase 23: PDF Rendering Fixes

**Goal:** Resolve the existing number/typography rendering defect on generated proposals, remove the "Destinataire" block, and keep the byte-determinism CI gate green after the layout changes — extending the golden corpus to cover the commission-free Agent/Commercial render introduced in Phase 22.
**Depends on:** Phase 22 (Agent/Commercial commission-free PDF variant must exist before the golden corpus can be extended to cover it; PDF-03 depends on PTYPE-04/06)
**Requirements:** PDF-01, PDF-02, PDF-03
**Success Criteria** (what must be TRUE):

  1. A generated PDF for any partner type renders all numeric values (loyer, montant HT, € symbol, thousands separators) without glyph overlap, artifact, or misplaced character — verified visually in a generated fixture and confirmed by the root-cause fix being committed with a reproduction test.
  2. The generated PDF no longer contains a "Destinataire" block beneath the "Proposition de location financière" title; the remaining layout reflows cleanly with no blank gap where the block was.
  3. The byte-determinism CI gate passes with regenerated SHA-256 fixtures that reflect the new layout; the golden corpus includes at least one Agent/Commercial fixture asserting the commission-free loyer and the absence of any commission wording.

**Plans:** 3/3 plans complete

Wave 1:

- [x] 23-01-PLAN.md — PDF-01: PDF-scoped number sanitizer (U+202F/U+00A0 → space) + reproduction test; format.ts untouched

Wave 2:

- [x] 23-02-PLAN.md — PDF-02: remove Destinataire block + dead LABELS/lbl() helpers + pdf.section.recipient dict keys; clean reflow

Wave 3:

- [x] 23-03-PLAN.md — PDF-03: Agent/Commercial commission-free byte-determinism fixture + [BLOCKING] expected.sha256.txt regen + full PDF/ADMIN-09 regression

**UI hint:** yes

### Phase 24: Admin Dual-View Toggle

**Goal:** Admin-level users can switch the navigation between admin and agent route sets via a session-only toggle in the bottom-left settings area — giving admins a self-service way to experience the partner view without losing admin rights.
**Depends on:** Phase 22 (the agent route set now conditionally renders commission-free UI for Agent/Commercial; the toggle must work correctly with the Phase 22 nav changes)
**Requirements:** VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):

  1. An admin user sees an Admin / Agent toggle in the bottom-left settings area (alongside theme + locale controls); a non-admin partner user never sees the toggle.
  2. Switching to Agent view replaces the sidebar nav with the agent route set (Accueil `/`, Nouvelle proposition, Propositions `/proposals`, Aide); switching back to Admin view restores the admin route set (Accueil `/[adminSegment]`, Coefficients, Partenaires, Toutes les propositions, Aide).
  3. After logout and a fresh login, the admin lands in Admin view regardless of the toggle state before logout; the session-only requirement means no cookie or DB column stores the view preference.
  4. In Agent view, the admin's authorization is unchanged — they retain admin rights, and any attempt to directly navigate to an admin route still works; the toggle is a nav convenience, not a permission change.

**Plans:** 2/2 plans complete
Plans:
**Wave 1**

- [x] 24-01-PLAN.md — Session-only view-store (sessionStorage useSyncExternalStore) + 4 i18n keys (FR+EN) + logout clear (VIEW-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 24-02-PLAN.md — ViewToggle component + sidebar effectiveView nav remap + Shell/(authed)-layout redirect-target plumbing (VIEW-01/02/04)

**UI hint:** yes

### Phase 25: Admin-Home Labels & Pill Fix

> **Scope reduced 2026-05-30 (discussion).** The teal rebrand (BRAND-01/02/03) was
> descoped — splitting the overloaded `--gd` accent/success token across ~63 sites +
> a fresh WCAG audit was too much effort for too little value. Green stays the brand
> accent; the rebrand is shelved (revisitable) in REQUIREMENTS.md → Future Requirements.
> The phase now ships the admin-home label changes + the status-pill sizing fix only.

**Goal:** Close the three admin-home display-label changes (FR + EN, parity proof green) and fix the proposal status-pill sizing so chips hug their text — leaving the accent color, logo green, and success green untouched.
**Depends on:** Phase 18 (admin-home AdminNavCards + stat row whose labels COPY-01..03 edit), Phase 19 (the `/lc-references` route COPY-01 relabels)
**Requirements:** COPY-01, COPY-02, COPY-03, COPY-04, UIFIX-01 *(BRAND-01/02/03 descoped)*
**Success Criteria** (what must be TRUE):

  1. The admin-home cards and stat labels read "Toutes les propositions", "Coefficients & Commissions", and "Dernière Modif Coef" in both FR and EN; the compile-time `_EnHasAllFrKeys` parity proof stays green; the `/[adminSegment]/lc-references` route is unchanged (display label only).
  2. The proposal status pill ("Actif", "Brouillon", "Expirée", "Archivée") — and every sibling `.chip` variant (it shares the same base) — hugs its text content in all variants and both languages, with no fixed minimum width causing clipping or excess padding.

**Plans:** 2 plans

- [x] 25-01-PLAN.md — Admin-home label changes (COPY-01..04): FR+EN dict edits, parity proof green
- [x] 25-02-PLAN.md — Status-pill hug-content fix (UIFIX-01): .list-row status track to max-content

**UI hint:** yes

---

### Phase 26: Active/Expired Row Actions

**Goal:** Partners can ARCHIVE any active or expired proposal directly from the `/proposals` row (and RESTORE soft-deleted proposals from the Archivées view), using the same icon-button pattern already wired for draft rows — with the ADMIN-09 envelope held throughout.
**Depends on:** Phase 25 (v1.4 complete; 19-gate grep suite baseline; `DraftActionsClient` pattern established)
**Requirements:** ROWACT-01, ROWACT-03, ROWACT-04, ROWACT-05 *(ROWACT-02 descoped)*
**Success Criteria** (what must be TRUE):

  1. From `/proposals`, archiving an active or expired proposal via its per-row Archive icon button moves it to the Archivées view without a full-page navigation; the row disappears from the Actives list and reappears in the Archivées list.
  2. From the Archivées view, clicking the per-row Restore icon button on a soft-deleted proposal returns it to the Actives list in place (no full-page navigation).
  3. Draft rows continue to show Edit + Archive + Delete unchanged; active and expired rows show ONLY Archive (no Edit, no Delete).
  4. `ProposalRowDto` carries no `params_snapshot` or commission data; the 19-gate grep-contract suite passes without modification.
  5. Clicking an active/expired row body still opens the proposal detail page; the Archive/Restore icon button acts without navigating (stopPropagation).

> **Scope note (planner, 2026-05-30 — D-01).** Per-row Delete on finalized rows (ROWACT-02) is descoped to Archive-only; a per-row Restore is added in the Archivees view (D-02). Plan 26-03 reconciles the Goal + criteria above and REQUIREMENTS.md at execute time. See 26-CONTEXT.md.

**Plans:** 3/3 plans complete

Wave 1 (parallel):

- [x] 26-01-PLAN.md — i18n keys (FR+EN) + shared RowActionsClient (Archive for active/expired, Restore for deleted, keyed off displayStatus) — ROWACT-01/03/04
- [x] 26-03-PLAN.md — Doc reconciliation: REQUIREMENTS.md + ROADMAP.md to Archive-only (ROWACT-02 descoped, ROWACT-03 rewritten, ROWACT-05 Restore added)

Wave 2 (after 26-01):

- [x] 26-02-PLAN.md — Wire RowActionsClient into ProposalRow (clickable-div + actionsSlot, D-06) + ProposalsList (mount per displayStatus, D-03) + human-verify checkpoint — ROWACT-01/03/04

**UI hint**: yes

### Phase 27: Status-Pill Rendering Fix

**Goal:** The status chip ("Actif", "Brouillon", "Expirée", "Archivée") renders with content-hugging, responsive sizing on both the home "Propositions récentes" list and the `/proposals` table — in light and dark mode — closing the regression left open after v1.4's `max-content` column fix.
**Depends on:** Phase 26 (row-actions wiring adds new layout context to `/proposals` rows; pill fix should run on the stable post-26 DOM structure to avoid churn)
**Requirements:** UIFIX-02, UIFIX-03
**Success Criteria** (what must be TRUE):

  1. The status chip on the home "Propositions récentes" list displays its full label (e.g. "Actif") with no text clipping, no vertical misalignment, and no fixed-width artifact across desktop viewport widths in both light and dark mode.
  2. The status chip on the `/proposals` table renders with the same content-hugging behavior as the home surface, correct in both light and dark mode; no regression introduced on draft or archived rows.

**Plans**: 2 plans

- [x] 27-01-PLAN.md — Home "Propositions récentes" recent-list row: reorder to trailing content-hugging chip (UIFIX-02)
- [x] 27-02-PLAN.md — Light+dark human-verify on home + /proposals; /proposals post-Phase-26 re-verification (UIFIX-02, UIFIX-03)

**UI hint**: yes

---

### Phase 29: Migration Safety Net

> **Rescoped 2026-08-31, before planning.** The original scope assumed the Neon split did not
> exist, per the v1.3 carry-forward (2026-05-21). That note was stale: Phase 20 shipped the
> full split on 2026-05-27. Verified against `ci.yml`, `db-migrate.yml` and
> `docs/operations/neon-branch-routing.md`. INFRA-04 is already satisfied; what remains is a
> **miswired CI path filter** and a **local env pointing at production**.
>
> **No longer a hard gate.** The isolation exists. Phases 30-34 are not blocked by this phase —
> though the filter bug should be fixed before eight new migrations land.

**Goal:** The migration safety net Phase 20 built actually fires — the `db-smoke` gate matches this repo's real migration paths, and local development stops reading production data.
**Depends on:** Phase 27 (v1.5 complete). No downstream phase is blocked by this one.
**Requirements:** INFRA-04 *(already satisfied, Phase 20)*, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):

  1. A PR that adds a migration at `drizzle/NNNN_*.sql` **without** a matching `drizzle/meta/_journal.json` entry causes the `db-smoke` job to run and fail — the exact Phase 12 regression, which today passes green because the job's path filter (`drizzle/migrations/*.sql`) matches a directory that does not exist.
  2. A PR with a correctly generated migration still triggers `db-smoke` and passes it against a real Postgres instance.
  3. A check fails if the `db-smoke` path filter ever stops matching the directory migrations actually live in — so this cannot silently rot again.
  4. Local development reads and writes the Neon `development` branch; a query run locally returns zero production partner rows.
  5. Phase 20's locked rule 3 is **unchanged** — migrations still fan out only via `db-migrate.yml`; no local `db:migrate` path is introduced.

**Plans:** 2/2 plans complete

Plans:

- [x] 29-01-PLAN.md — Fix the `db-smoke` path filter, add the journal/SQL parity gate that makes it actually fail, and add the anti-rot guard (INFRA-06; carries INFRA-04 for traceability, zero work)
- [x] 29-02-PLAN.md — Mandate the Neon `development` branch in `.env.example`, add `check:local-db-branch`, and repoint `.env.local` off production (INFRA-05; blocking checkpoint)

### Phase 30: Company & Contact Registry

**Goal:** Client data has its own life — a shared company registry with private per-partner relationships and contacts — and a `sales` role exists so internal Commercial users hold relationships exactly as partners do.
**Depends on:** Phase 29 recommended-but-not-blocking (the Neon isolation already exists from Phase 20; Phase 29 only repairs the CI filter)
**Requirements:** CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, CRM-06, CRM-07, CRM-08, ROLE-01, ROLE-02, ROLE-03
**Success Criteria** (what must be TRUE):

  1. A company record exists independent of any proposal, identified by an optional SIREN (nullable UNIQUE) and a versioned `name_normalized` column; two proposals for the same client can be linked to the same company.
  2. A partner opens a client and sees every proposal they have made for that client on one page; a different partner holding a relationship with the same company sees only their own relationship — never the other partner's contacts, notes, or proposals.
  3. An admin viewing a company sees every relationship attached to it, including which partner (or sales/house owner) holds each one.
  4. A contact (name, role, phone, email) is created and edited on a relationship, not on the company, and is invisible to anyone who is not that relationship's owner or an admin.
  5. A user with the new `sales` role logs in, holds client relationships, and reaches the same pipeline/client-book surfaces a partner reaches — with zero change in what existing `partner` and `admin` accounts can see or do, and the ADMIN-09 commission-invisibility envelope intact.

**Plans:** 8/9 plans executed
Plans:
**Wave 1**

- [x] 30-01-PLAN.md — Schema + migration: companies / client_relationships / contacts, nullable proposals FK, role CHECK widening + sales backfill (wave 1)
- [x] 30-02-PLAN.md — UI foundations: clients.* / admin.companies.* i18n, SearchBar placeholder props, BuildingIcon + PhoneIcon, sidebar and route-meta entries (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 30-03-PLAN.md — Role widening across every access gate and admin partner-management query; partnerType-driven role derivation (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 30-04-PLAN.md — Owner-scoped registry queries + admin company queries + cross-tenant isolation tests (wave 3)
- [x] 30-05-PLAN.md — CRM server actions: create-client with silent SIREN dedup, contact create/update/delete (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 30-06-PLAN.md — /clients client book on DataGrid table machinery + CreateClientDialog (wave 4)
- [x] 30-07-PLAN.md — /clients/[id] detail with Contacts editor and Propositions card (wave 4)
- [x] 30-08-PLAN.md — Admin /[adminSegment]/companies list, company detail with Relations table, admin relationship detail (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 30-09-PLAN.md — CRM-05 proposal-to-relationship wiring in the wizard + phase human verification (wave 5)

**UI hint:** yes

### Phase 31: Reconciliation Engine & Proposal Extraction

**Goal:** Every client already implied by existing proposals becomes a real company + relationship record, built on a reusable dedup engine that a human resolves ambiguity through once, at import — not fuzzy logic re-derived forever after — and that never writes without a prior dry run.
**Depends on:** Phase 30 (companies/client_relationships/contacts schema must exist to import into)
**Requirements:** IMPORT-01, IMPORT-03, IMPORT-04, IMPORT-05, IMPORT-06
**Success Criteria** (what must be TRUE):

  1. Running the import in dry-run mode against existing proposals produces a full report of every company/relationship it would create, merge, or flag — with zero rows written to the database.
  2. Running the same import for real extracts a company + relationship for every distinct client found in `proposals.inputs` and links each source proposal to the relationship it produced, without altering any proposal's `inputs` JSONB.
  3. Two extracted clients that share a SIREN are merged into one company automatically, with no human step required.
  4. Two extracted clients that match only on `name_normalized` — no SIREN on one or both — are NOT silently merged; they appear in a human review queue instead.
  5. A human opens the review queue and, for each flagged pair, either merges the two into one company or marks them permanently separate; the decision is durable and is never re-flagged on a later run.

**Plans:** 8/8 plans complete
Plans:
**Wave 1**

- [x] 31-01-PLAN.md — Schema: provenance column, company_pair_decisions table, migration 0008, audit vocabulary

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 31-02-PLAN.md — Reconciliation engine core: source abstraction, candidate derivation, SIREN/name matching, pair keys
- [x] 31-03-PLAN.md — Merge & keep-separate write layer: admin reads, the non-transactional D-12 merge, server actions

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 31-04-PLAN.md — Dry-run report (Markdown + JSON) and drift comparison
- [x] 31-05-PLAN.md — Apply layer: idempotent non-transactional writes, provenance, widened single-writer gate
- [x] 31-06-PLAN.md — Admin pair-review queue UI at /[adminSegment]/companies/review

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 31-07-PLAN.md — Run orchestrator, zero-write proof, CLI script and npm wiring

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 31-08-PLAN.md — Operator runbook and the phase success-criteria checkpoint

**UI hint:** yes

### Phase 31.1: App Shell Refresh (INSERTED)

**Goal:** The application shell converges on **Colibris** (`https://colibris-eosin.vercel.app`) — a sibling product on the same ReUI `base-maia` system, serving the same teams under the same group — so the two read as one family: breadcrumbs where the page title sits today, the collapse control in the header, a brand lockup proportioned like Colibris's, and a radius scale declared step-by-step so container surfaces can be generous without dragging inputs back into the pill shape that got the large radius reverted the first time.
**Depends on:** Phase 30 (`.card` at the token-derived radius) and Phase 31 (its review-queue cards carry the interim `rounded-[24px]` literal this phase converges); no schema dependency — this is presentation only
**Requirements:** SHELL-C1 … SHELL-C7 — minted from the seven success criteria below (REQUIREMENTS.md carries no SHELL-3x IDs; each plan's `requirements` field traces to these)
**Success Criteria** (what must be TRUE):

  1. Collapsing the sidebar no longer stacks the brand mark above a chevron: the collapsed rail shows the mark alone, and the collapse/expand control lives in the shell header at every width.
  2. The collapse/expand control remains focusable and FR/EN-labelled — keyboard users can still collapse the sidebar, and no two controls announce the same accessible name to a screen reader.
  3. Every authenticated page renders a breadcrumb trail in the shell header, derived from `getRouteMeta`, in the viewer's language, with the current page as non-link text.
  4. Container surfaces (cards, panels, sheets, dialogs) render at a **named token**, never a per-file literal, and every Input, Button and Select keeps its current 8px corner — the radius scale is declared as explicit per-step values rather than multiples of a single token, so the top of the scale cannot inflate the bottom.
     *(Planning correction, 2026-09-02, grep-verified: Leasétic's controls do not read `--radius` and are not 8px today — `Button`/`Input`/`Select`/`Badge` reach `--radius-4xl` via the `rounded-4xl` utility. "8px" describes Colibris. The binding half of this criterion is **keeps its current corner**, and Plan 31.1-01 pins that value explicitly.)*

  5. Phase 30's `.card` and Phase 31's review-queue cards render at the same radius; no surface is left on a hardcoded `rounded-[24px]`.
  6. The sidebar brand lockup occupies roughly the same share of sidebar width as Colibris's (~47%, i.e. ~120px in a 252px sidebar), and the sidebar width variables are still set where `SidebarProvider`'s inline style cannot outrank them.
  7. Dark mode renders on a palette **sampled from Colibris's own dark theme** — page background, elevated surface, border and muted text each traceable to a measured value rather than an invented one — while the print/PDF surface still forces white in dark mode (`app/globals.css:214`, established Phase 5 / enforced Phase 8) and no-flash theme restoration still works.

**Plans:** 7 plans
Plans:
**Wave 1**

- [ ] 31.1-01-PLAN.md — Radius scale mechanism: explicit per-step scale, `--radius-container`, `--topbar-h` 52px (wave 1)
- [ ] 31.1-02-PLAN.md — Breadcrumb data layer: `getRouteMeta` trail + 5 FR/EN keys (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 31.1-03-PLAN.md — Header: labelled `SidebarTrigger`, breadcrumb, `TopbarTitle` deleted (wave 2)
- [ ] 31.1-04-PLAN.md — Container radius back-application; `rounded-[24px]` retired (wave 2)
- [ ] 31.1-05-PLAN.md — Dark palette: 6 sampled declarations + PDF/no-flash invariant gates (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 31.1-06-PLAN.md — Sidebar: chevron removed, centred collapsed badge, 252/68px, 120px lockup (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 31.1-07-PLAN.md — UIC-04/UIC-03 revision, OPEN-A/OPEN-C closure, phase acceptance checkpoint (wave 4)

**UI hint:** yes

### Phase 32: HubSpot Import

**Goal:** The HubSpot export becomes companies, contacts, and relationships in the registry — reusing Phase 31's dry-run/dedup/review engine — with each HubSpot contact-owner mapped to a Leasétic sales-role user, and safe to re-run without creating duplicates.
**Depends on:** Phase 31 (reconciliation engine + dry-run/review-queue infrastructure), Phase 30 (`sales` role for contact-owner mapping)
**Requirements:** IMPORT-02, IMPORT-07
**Success Criteria** (what must be TRUE):

  1. Running the HubSpot import in dry-run mode produces a report of what it would create, merge, and flag from the `.xlsx` export, without writing anything.
  2. Running the import for real creates companies, contacts, and "house" relationships owned by the mapped Leasétic sales-role user for every HubSpot record, applying the same SIREN-auto-merge / name-flag / human-review rules as Phase 31.
  3. Every imported company/contact carries its HubSpot provenance ID (`hubspot_company_id` / `hubspot_contact_id`); re-running the import against the same export creates zero duplicate companies, contacts, or relationships.

**Plans:** TBD

> **Open dependency (blocks detailed design, not the phase or milestone).** The HubSpot export (`hubspot-crm-exports-tous-les-contacts-2026-08-31.xlsx`, ~2.9 MB) is not yet readable — macOS blocks `~/Downloads` at the TCC level. Its column inventory determines how much of IMPORT-02 can be automatic versus human-resolved. This phase can be scaffolded (engine reuse, role mapping, provenance columns) at `/gsd-plan-phase 32` time, but the mapping/column-level plan detail cannot be finalized until the file is readable.

### Phase 33: Pipeline

**Goal:** Every relationship has a place in a partner-advanced pipeline, and every proposal records whether it converted — giving a real per-quote conversion rate without ever blocking a partner from quoting a prospect who has no paperwork yet.
**Depends on:** Phase 30 (relationships must exist to carry a stage); benefits from Phase 31/32 having populated real relationships, but is not schema-blocked by them
**Requirements:** PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05
**Success Criteria** (what must be TRUE):

  1. A relationship's owner (partner or sales) advances their relationship through the early pipeline stages themselves.
  2. The late stages (`signé`, `débloqué`) are visible on the relationship but are NOT hand-editable — the UI communicates they are system-owned, reserved for a later contract-tool integration.
  3. A partner marks a proposal `won`, `lost`, or `unanswered` with a date and an optional reason; a per-quote conversion rate can be computed from this data.
  4. Marking a deal `won` is blocked unless the company has a SIREN on file; quoting or advancing early pipeline stages is never blocked by a missing SIREN.
  5. A partner opens their pipeline view and sees their own relationships grouped by stage; they never see another partner's relationships.

**Plans:** TBD
**UI hint:** yes

### Phase 34: Activity & Follow-Up

**Goal:** A relationship's full history — manual notes and system events together — is visible in one place, and a partner can see who needs to be chased this week.
**Depends on:** Phase 33 (system events include pipeline stage changes, so the pipeline must exist to generate them)
**Requirements:** ACTV-01, ACTV-02, ACTV-03, ACTV-04, ACTV-05
**Success Criteria** (what must be TRUE):

  1. Opening a relationship shows a single chronological timeline mixing manual notes and system events — no separate tabs for the two.
  2. A stage change or a new proposal automatically appends a timestamped, attributed system event to the relevant relationship's timeline with no user action required.
  3. A user adds a dated note to a relationship and sees it appear in the timeline immediately.
  4. A user sets or edits a next-action date on a relationship.
  5. A user opens a "who to chase" list and sees relationships ordered by next-action date and staleness, scoped to relationships they own.

**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Parity Refactor | v1.0 | 3/3 | Complete | 2026-04-30 |
| 2. Security Hardening | v1.0 | 2/2 | Complete | 2026-04-30 |
| 3. UX Polish & i18n | v1.0 | 3/3 | Complete | 2026-04-30 |
| 4. Sidebar Shell + Design System v2 | v1.0 | 3/3 | Complete | 2026-04-30 |
| 5. Bootstrap & Deploy | v1.1 | 7/7 | Complete | 2026-05-06 |
| 6. Auth & Shell | v1.1 | 9/9 | Complete | 2026-05-08 |
| 7. Calc Engine + Form | v1.1 | 6/6 | Complete | 2026-05-09 |
| 8. Persistence + PDF | v1.1 | 14/14 | Complete | 2026-05-09 |
| 9. Admin Surface | v1.1 | 4/4 | Complete | 2026-05-10 |
| 10. Cutover & Polish | v1.1 | 6/6 | Complete | 2026-05-11 |
| 11. Design System Foundation + Brand Assets | v1.2 | 5/5 | Complete | 2026-05-11 |
| 12. Schema Extensions for Drafts + History | v1.2 | 7/7 | Complete | 2026-05-12 |
| 13. 3-Step Proposal Wizard | v1.2 | 6/6 | Complete | 2026-05-12 |
| 14. Admin Polish — Partners + History + Home | v1.2 | 6/6 | Complete | 2026-05-20 |
| 15. Public Surface Brand Polish | v1.2 | 1/1 | Complete | 2026-05-21 |
| 16. Shell Refresh + Contrast Gates | v1.3 | 5/5 | Complete | 2026-05-21 |
| 17. Partner Surfaces | v1.3 | 8/8 | Complete | 2026-05-24 |
| 18. Admin Surfaces + Help Center | v1.3 | 7/7 | Complete | 2026-05-25 |
| 19. New Capabilities | v1.3 | 2/2 | Complete | 2026-05-25 |
| 20. Infra Hardening | v1.3 | 3/3 | Complete | 2026-05-27 |
| 21. Partner-Onboarding Gates | v1.3 | 2/2 | Complete | 2026-05-29 |
| 22. Partner Types & Commission-Free Proposals | v1.4 | 5/5 | Complete   | 2026-05-29 |
| 23. PDF Rendering Fixes | v1.4 | 3/3 | Complete   | 2026-05-30 |
| 24. Admin Dual-View Toggle | v1.4 | 2/2 | Complete    | 2026-05-30 |
| 25. Admin-Home Labels & Pill Fix | v1.4 | 2/2 | Complete | 2026-05-30 |
| 26. Active/Expired Row Actions | v1.5 | 3/3 | Complete    | 2026-05-30 |
| 27. Status-Pill Rendering Fix | v1.5 | 2/2 | Complete    | 2026-05-30 |
| 29. Migration Safety Net | v1.6 | 2/2 | Complete    | 2026-08-31 |
| 30. Company & Contact Registry | v1.6 | 9/9 | Complete    | 2026-09-02 |
| 31. Reconciliation Engine & Proposal Extraction | v1.6 | 8/8 | Complete   | 2026-09-02 |
| 32. HubSpot Import | v1.6 | TBD | Not started | - |
| 33. Pipeline | v1.6 | TBD | Not started | - |
| 34. Activity & Follow-Up | v1.6 | TBD | Not started | - |

---

*Last updated: 2026-08-31 — v1.6 ROADMAP created: 6 phases (29-34), 31/31 requirements mapped, 100% coverage. Phase 29 RESCOPED 2026-08-31 — the Neon 3-branch split already shipped in Phase 20 (the v1.3 carry-forward that claimed otherwise was stale); Phase 29 is now a small CI-filter repair and is NOT a blocking prerequisite. Phase 32 (HubSpot Import) has an open dependency on the unreadable `.xlsx` export file gating detailed design only. Next: `/gsd-plan-phase 29`.*
