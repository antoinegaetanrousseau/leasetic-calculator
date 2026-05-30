# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 — Hosted Web App Foundation** — Phases 5-10 (shipped 2026-05-11) — see `milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 — UX Polish + Proposal Wizard** — Phases 11-15 (shipped 2026-05-21) — see `milestones/v1.2-ROADMAP.md`
- ✅ **v1.3 — Design Refresh + Partner-Onboarding Ready** — Phases 16-21 (shipped 2026-05-29) — see `milestones/v1.3-ROADMAP.md`
- 🚧 **v1.4 — Partner Types, Admin Dual-View & Rebrand** — Phases 22-25 (in progress, started 2026-05-29)

---

## v1.4 Cross-Cutting Invariants

These are not delivery targets — they are constraints that every phase in v1.4 must satisfy. Documented here so each phase planner can verify compliance before merging.

### 1. ADMIN-09 commission invisibility — reinforced and extended (PTYPE-05 / PTYPE-07)

The ADMIN-09 envelope applies to all v1.4 phases. For `Agent`/`Commercial` partner types, commission must be **fully absent** from calc output, UI surfaces, PDF render path, server logs, and audit payloads — not conditionally hidden, but structurally absent. The existing 12-gate grep-contract suite (`tests/admin-09-grep-contracts.test.ts`) must stay green throughout and is extended during Phase 22 (PTYPE-07). The Phase 13 D-12 partner-facing relaxation (`Partenaire` deal-owner sees commission on wizard steps 2+3) continues to hold for `Partenaire` type only.

### 2. `params_snapshot` PDF immutability (PTYPE-06)

Every v1.4 phase that touches proposal creation or the calc engine must preserve the `params_snapshot` immutability invariant: once a proposal is stored, its inputs and rendered PDF are permanently frozen. The snapshot schema is extended in Phase 22 to record `partner_type` + `commission_applied` boolean so PDFs remain reproducible after a partner's type changes.

### 3. Light + dark pair per design change (BRAND-01 / BRAND-03)

Any visual change — including the Phase 25 teal rebrand token swap — must ship light and dark simultaneously. Every recolored foreground/background pair must meet WCAG 2.1 AA (≥4.5:1 text contrast). Logo SVGs and the semantic success green (`#6DC388` / "Actif" pill) are explicitly excluded from the rebrand.

### 4. PDF byte-determinism CI gate (PDF-03)

The byte-determinism CI gate must remain green throughout. Phase 23 regenerates the fixture after the PDF layout changes (Destinataire removal + typography fix); Phase 22's commission-free variant extends the golden corpus. Any phase that touches `src/lib/pdf/` must leave the gate green before merge.

### 5. Frozen formula + tranche boundaries

The `Partenaire` formula (`loyer = montant HT × (1 + commission/100) × coefficient / 100`) and all tranche boundaries stay frozen. The v1.4 business-approved exception is strictly limited to `Agent`/`Commercial` dropping the commission factor (`loyer = montant HT × coefficient / 100`). No other formula change is in scope.

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

### v1.4 — Partner Types, Admin Dual-View & Rebrand (Phases 22-25)

- [x] **Phase 22: Partner Types & Commission-Free Proposals** — `partner_type` enum + Drizzle migration + backfill; commission-free calc variant for Agent/Commercial; UI surfaces (selector on create/edit form, commission structurally absent from wizard + preview); commission-free PDF render variant + snapshot integrity; ADMIN-09 grep-contract suite extended (completed 2026-05-29)
- [ ] **Phase 23: PDF Rendering Fixes** — Root-cause spike + fix for number/typography glyph overlap; remove "Destinataire" block; regenerate byte-determinism fixture; extend golden corpus to cover Agent/Commercial commission-free render
- [ ] **Phase 24: Admin Dual-View Toggle** — Admin-only Admin/Agent view toggle in the bottom-left settings area; nav remaps between admin and agent route sets; session-only (no persistence); authorization unchanged in both views
- [ ] **Phase 25: Teal Rebrand & Polish** — Accent green → `#2D7A8C` at design-token layer (light + dark, WCAG AA); admin-home label changes; status-pill adaptive sizing fix

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

**Plans:** 1/3 plans executed

Wave 1:
- [x] 23-01-PLAN.md — PDF-01: PDF-scoped number sanitizer (U+202F/U+00A0 → space) + reproduction test; format.ts untouched

Wave 2:
- [ ] 23-02-PLAN.md — PDF-02: remove Destinataire block + dead LABELS/lbl() helpers + pdf.section.recipient dict keys; clean reflow

Wave 3:
- [ ] 23-03-PLAN.md — PDF-03: Agent/Commercial commission-free byte-determinism fixture + [BLOCKING] expected.sha256.txt regen + full PDF/ADMIN-09 regression

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

**Plans:** TBD
**UI hint:** yes

### Phase 25: Teal Rebrand & Polish

**Goal:** Replace the UI accent color with `#2D7A8C` at the design-token layer across light and dark, close three admin-home label changes, and fix the status-pill sizing — shipping a consistent visual identity update without touching the logo green or semantic success green.
**Depends on:** Phase 22 (commission-free UI surfaces exist; any new accent-colored commission-related elements from Phase 22 must be recolored here), Phase 24 (dual-view toggle renders accent-colored elements that must also be recolored)
**Requirements:** BRAND-01, BRAND-02, BRAND-03, COPY-01, COPY-02, COPY-03, COPY-04, UIFIX-01
**Success Criteria** (what must be TRUE):

  1. Every surface that previously used the accent green (primary buttons, active nav items, focus rings, hero accents, CTAs) now renders `#2D7A8C` in light mode and the appropriate dark-mode variant from the same token; the Leasétic logo mark (`#6DC388`) and the "Actif" / "activé" semantic success green are visually unchanged.
  2. Every recolored foreground/background pair meets WCAG 2.1 AA (≥4.5:1 for text) in both light and dark — confirmed by a contrast audit record committed alongside the token change.
  3. The admin-home cards and stat labels read "Toutes les propositions", "Coefficients & Commissions", and "Dernière Modif Coef" in both FR and EN; the compile-time `_EnHasAllFrKeys` parity proof stays green; the `/[adminSegment]/lc-references` route is unchanged.
  4. The proposal status pill ("Actif", "Brouillon", "Expirée", "Archivée") hugs its text content in all variants and both languages, with no fixed minimum width causing clipping or excess padding.

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
| 23. PDF Rendering Fixes | v1.4 | 1/3 | In Progress|  |
| 24. Admin Dual-View Toggle | v1.4 | 0/? | Not started | - |
| 25. Teal Rebrand & Polish | v1.4 | 0/? | Not started | - |

---

*Last updated: 2026-05-29 — v1.3 shipped (6 phases, 27 plans, 1122 tests); v1.4 roadmap created (4 phases, 22 requirements mapped). Production live at https://leasetic-matrice.vercel.app. Next: `/gsd-plan-phase 22`.*
