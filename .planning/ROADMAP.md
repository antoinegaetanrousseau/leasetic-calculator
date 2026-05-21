# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 — Hosted Web App Foundation** — Phases 5-10 (shipped 2026-05-11) — see `milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 — UX Polish + Proposal Wizard** — Phases 11-15 (shipped 2026-05-21) — see `milestones/v1.2-ROADMAP.md`
- 🚧 **v1.3 — Design Refresh + Partner-Onboarding Ready** — Phases 16-21 (in progress, started 2026-05-21)

---

## v1.3 Cross-Cutting Invariants

These are not delivery targets — they are constraints that every phase in v1.3 must satisfy. Documented here so each phase planner can verify compliance before merging.

### 1. Light + dark pair per design phase (THEME-01 / THEME-02)

Every screen shipped in a design phase (Phases 16, 17, 18) must ship both light and dark variants simultaneously. A phase plan that ships only the light variant is incomplete. THEME-01 and THEME-02 are recorded as requirements of the phases where they are verified (Phase 17 and Phase 18 respectively), but the light+dark discipline applies to Phase 16 as well.

### 2. ADMIN-09 D-12 envelope + 9-gate grep-contract suite (WIZ-05)

The Phase 13 partner-facing commission relaxation (deal-owner partner sees commission on wizard steps 2+3 only) and the Phase 14 `tests/admin-09-grep-contracts.test.ts` 9-gate CI suite must remain green throughout every phase of v1.3. Any PR that touches admin or wizard surfaces must leave the suite green. No further relaxations to ADMIN-09 are in scope for v1.3. This suite will grow monotonically during Phase 19 (EXPORT-02 and LCDASH-02 extend it to 10+ gates).

### 3. Palette stability

No token-level changes to `--gold`, `--navy`, `--ink`, `--teal`, `--paper`, or `--surface` in v1.3. The Figma `9:46` `color/*` variables match `app/globals.css` exactly (verified 2026-05-21). All v1.3 surfaces consume existing `--*` tokens. The v1.3 "design refresh" is layout and hierarchy — not token churn. Contrast measurement in Phase 16 runs against the current token values and must be signed off before any wave touching `--gold` / `.chip-invited` / diff-panel merges.

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

### v1.3 — Design Refresh + Partner-Onboarding Ready (Phases 16-21)

- [ ] **Phase 16: Shell Refresh + Contrast Gates** — Refreshed sidebar + tri-state theme + hero pattern + locale relocation + topbar/footer; WCAG AA contrast for diff-panel and gold surfaces measured and signed off
- [ ] **Phase 17: Partner Surfaces** — Partner Home dashboard (hero + MetricTiles + Propositions récentes), /proposals table with Archivées pill, full wizard redesign (3 steps + validity relocation + LC reference reservation); light+dark pair verified
- [ ] **Phase 18: Admin Surfaces** — Admin Home enhancement (hero + stats + CTA), Partners list styled table + AccountsList→PartnersList rename, Créer partenaire form refresh, Coefficients warning banner + history card refresh; light+dark pair verified
- [ ] **Phase 19: New Capabilities** — Per-partner XLSX export (ADMIN-09 clean, grep-contract suite extended), centralized LC reference dashboard (cross-partner, admin-only, grep-contract suite extended to 10+ gates)
- [ ] **Phase 20: Infra Hardening** — Neon 3-branch split (per-scope DATABASE_URL), post-deploy DB-smoke CI step, Better Auth trustedOrigins middleware gate
- [ ] **Phase 21: Partner-Onboarding Gates** — Admin password rotation (shared `leasetic2026` → individual strong), privacy policy confirmation with Thomas; final phase before first real partner

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
**Plans:** 1/5 plans executed
- [x] 16-01-PLAN.md — PageHero primitive + Vitest coverage (D-01..D-05, SHELL-03 scaffold)
- [ ] 16-02-PLAN.md — Sidebar icon-size micro-deltas + Topbar visual verification (D-12..D-16, SHELL-01/02/04 + SHELL-05 topbar half)
- [ ] 16-03-PLAN.md — Shell footer extension with Mentions légales link (D-17/D-18, SHELL-05 footer half; reuses existing `shell.footer.privacy` key)
- [ ] 16-04-PLAN.md — Admin home reference adopter for PageHero + new `admin.home.eyebrow` i18n key (D-06, SHELL-03 consumer)
- [ ] 16-05-PLAN.md — Manual WCAG 2.1 AA contrast audit + Antoine sign-off (D-08..D-11, CONTRAST-01/02)
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
**Plans:** TBD
**UI hint:** yes

### Phase 18: Admin Surfaces

**Goal:** Apply the Figma `9:46` design contract to all admin surfaces — home, partners list (with component rename), create-partner form, and coefficients page — in both light and dark.
**Depends on:** Phase 16 (shell primitives available), Phase 17 not required (no partner↔admin coupling)
**Requirements:** ADMIN-10, ADMIN-11, ADMIN-12, ADMIN-13, ADMIN-14, THEME-02
**Success Criteria** (what must be TRUE):
  1. Admin Home shows a hero with ADMIN badge + `Nouvelle proposition` CTA + 3 stats row (Propositions ce mois / Partenaires actifs / Dernière modif. coeffs) + 3 AdminNavCards + Recent activity card in both light and dark.
  2. `/[adminSegment]/partners` renders the Figma `42:46` styled table with an `Inviter partenaire` CTA and filter/search controls; the component file is `PartnersList.tsx` (renamed from `AccountsList.tsx`) and all imports resolve cleanly.
  3. `/[adminSegment]/partners/new` renders the Figma `43:46` form card visual treatment; behavior (3-section RHF form + adminCreateInvitation + InviteUrlModal) is unchanged from Phase 14.
  4. `/[adminSegment]/coefficients` shows the Figma `45:46` orange warning banner (using `--gold` token) with copy confirming coefficient edits do not retroactively change existing PDFs, plus the refreshed inline history card alongside the Phase 14 2-column sidebar.
  5. Every admin-side screen ships both light and dark variants; the 9-gate grep-contract suite remains green.
**Plans:** TBD
**UI hint:** yes

### Phase 19: New Capabilities

**Goal:** Add per-partner XLSX proposal export (ADMIN-09 clean) and a centralized cross-partner LC reference dashboard (admin-only), both extending the ADMIN-09 grep-contract suite monotonically.
**Depends on:** Phase 17 (XLSX export CTA lives on `/proposals`; ADMIN-09 suite baseline from Phase 17), Phase 18 (LC dashboard is an admin surface)
**Requirements:** EXPORT-01, EXPORT-02, LCDASH-01, LCDASH-02
**Success Criteria** (what must be TRUE):
  1. A partner can trigger an XLSX export from `/proposals`; the downloaded file contains all proposals matching the current filter (Active or Archivées) with columns: Référence, Client, Projet, Montant HT, Durée, Loyer mensuel, Coefficient, Statut, Date de création, Date d'expiration.
  2. The XLSX file contains no `Commission` column, no `commission_pct` cell, and no commission-related substring in any sheet; this is enforced by a new gate in `tests/admin-09-grep-contracts.test.ts`.
  3. An admin can navigate to `/[adminSegment]/lc-references` and see a cursor-paginated, searchable list of every issued LC reference across all partners (reference, partner name, client name, project amount, status, created_at).
  4. The LC dashboard passes all ADMIN-09 grep-contract suite gates (now ≥10); list rows, search results, and any detail surfaces contain no commission data.
**Plans:** TBD
**UI hint:** yes

### Phase 20: Infra Hardening

**Goal:** Resolve the three Tier-2 infrastructure deferred items: Neon 3-branch split, post-deploy DB-smoke CI step, and Better Auth `trustedOrigins` middleware gate.
**Depends on:** Phase 16 (no functional dependency; can run in parallel with 17/18, but ordered after to let design phases ship first and avoid migration noise)
**Requirements:** INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Vercel production scope uses the Neon `main` branch endpoint, preview scope uses `preview`, development scope uses `development`; each scope's `DATABASE_URL` env var points to the corresponding Neon pooled endpoint; a PR against a development branch can no longer accidentally touch production data.
  2. A GitHub Actions CI step runs a real-Postgres smoke on every PR touching `drizzle/migrations/*.sql` or `drizzle/meta/_journal.json`, using a Neon ephemeral branch; the step fails (and blocks merge) if the schema cannot be applied cleanly.
  3. A middleware-level Origin gate on `/api/auth/sign-in/*` mutations hard-blocks requests whose `Origin` header is not in the `trustedOrigins` list; verified by a test that sends an untrusted Origin and asserts a non-2xx response.
**Plans:** TBD

### Phase 21: Partner-Onboarding Gates

**Goal:** Close the two Tier-1 partner-onboarding blockers that must complete before any real partner account is created — admin password rotation and Thomas's privacy policy confirmation.
**Depends on:** Phases 16-20 (all v1.3 product work complete before the operational gate runs)
**Requirements:** GATE-01, GATE-02
**Success Criteria** (what must be TRUE):
  1. Both admin accounts (`antoine.rousseau@memento.eco` and the second admin) have individual strong passwords set via the admin↔admin password-reset flow; the shared `leasetic2026` password is no longer valid for either account; confirmed by a successful login + failed login test with the old credential.
  2. `docs/legal/privacy-coverage-confirmation.md` is updated (committed) with Thomas Heufke's explicit confirmation covering (a) Vercel/Neon EU hosting and (b) 10-year PDF retention; the stub placeholder text is replaced with dated confirmation copy.
  3. Both criteria above are met before any non-test partner account (`not @test.leasetic.com`) is invited via the admin `/partners/new` flow.
**Plans:** TBD

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
| 16. Shell Refresh + Contrast Gates | v1.3 | 1/5 | In Progress|  |
| 17. Partner Surfaces | v1.3 | 0/TBD | Not started | — |
| 18. Admin Surfaces | v1.3 | 0/TBD | Not started | — |
| 19. New Capabilities | v1.3 | 0/TBD | Not started | — |
| 20. Infra Hardening | v1.3 | 0/TBD | Not started | — |
| 21. Partner-Onboarding Gates | v1.3 | 0/TBD | Not started | — |

---

*Last updated: 2026-05-21 — v1.3 roadmap created by `/gsd-roadmapper` (6 phases, 34 requirements mapped). Production live at https://leasetic-matrice.vercel.app. Next: `/gsd-plan-phase 16`.*
