# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 — Hosted Web App Foundation** — Phases 5-10 (shipped 2026-05-11) — see `milestones/v1.1-ROADMAP.md`
- 🚧 **v1.2 — UX Polish + Proposal Wizard** — Phases 11-15 (started 2026-05-11; Figma design contract `vwOzirhL0vyxDWq4m6t4gC`)

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

### 🚧 v1.2 — UX Polish + Proposal Wizard (Phases 11-15)

- [ ] **Phase 11: Design System Foundation + Brand Assets** — Stepper, RetractableSidebar, MetricTile, AdminNavCard, StatusChip + light/dark Leasétic logo SVGs land as a reusable foundation
- [x] **Phase 12: Schema Extensions for Drafts + History** ✅ shipped 2026-05-12 — `draft` proposal status, `invited` partner status, `coefficient_history` append-only table
- [ ] **Phase 13: 3-Step Proposal Wizard** — `/proposals/new/{parametres,calcul,verification}` with server-side draft persistence and Stepper-gated forward nav
- [ ] **Phase 14: Admin Polish — Partners + History + Home** — Dedicated `/partners/new` route, status chips across admin lists, coefficient history sidebar, admin nav cards on admin home
- [ ] **Phase 15: Public Surface Brand Polish** — Login + invite + reset pages adopt centered-logo + paper-background `(public)` shell

## Phase Details

### Phase 11: Design System Foundation + Brand Assets
**Goal**: Ship the v1.2 reusable component library and Leasétic brand-logo assets that all downstream UI phases will consume
**Depends on**: Nothing (first v1.2 phase; builds on v1.1 Tailwind v4 token spine)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, ASSET-01, ASSET-02
**Success Criteria** (what must be TRUE):
  1. `Stepper`, `RetractableSidebar`, `MetricTile`, `AdminNavCard`, `StatusChip` all export from a shared component path and render in isolation tests (or visual smoke pages) with all documented prop states
  2. `RetractableSidebar` toggles between 260px expanded and 72px collapsed states, persists the user's choice in `localStorage` under a stable key, and survives a full-page reload
  3. `StatusChip` renders 4 distinct visual variants (`active` green, `draft` gold, `expired` gray-muted, `disabled` red-danger) using existing `.chip-*` class extensions in `app/globals.css`
  4. `public/logo-light.svg` and `public/logo-dark.svg` exist on disk with mark color `#6DC388` (new `--brand-mark` CSS custom property) and theme-correct wordmark inks; a manual smoke confirms the right asset shows under `[data-theme=light]` vs `[data-theme=dark]`
  5. Vitest typecheck + lint + build all 0; no Vercel-only imports introduced outside `lib/storage` and `lib/db` adapters
**Plans**: 5 plans
  - [ ] 11-01-PLAN.md — Foundation: globals.css token extensions + 13 sidebar.* i18n keys + Vitest jsdom infra
  - [ ] 11-02-PLAN.md — Brand assets: 3 SVG files (light/dark/mark) + <BrandLogo /> server component (ASSET-01, ASSET-02)
  - [ ] 11-03-PLAN.md — Static primitives: StatusChip + MetricTile + AdminNavCard (COMP-03, COMP-04, COMP-05)
  - [ ] 11-04-PLAN.md — Interactive primitives: Stepper + RetractableSidebar + LocaleToggle/ThemeToggle fullWidth prop (COMP-01, COMP-02)
  - [ ] 11-05-PLAN.md — Integration: <Shell> wrapper + Topbar refactor + layout migration + dev smoke route + chip-expired regression verify
**UI hint**: yes

### Phase 12: Schema Extensions for Drafts + History
**Goal**: Ship database migrations and query helpers that unlock draft proposals, invited partners, and coefficient-history surfaces for downstream phases
**Depends on**: Phase 11 (StatusChip variants are consumed by surfaces that read these new statuses)
**Requirements**: DB-01, DB-02, DB-03
**Success Criteria** (what must be TRUE):
  1. `proposals.status` enum now accepts `draft | active | expired | deleted` (was `active | expired | deleted`); existing rows are unaffected and a new row defaulting to `draft` can be inserted via Drizzle
  2. Partner account status surface exposes a third value `invited` (alongside `actif | désactivé`); an account created via the existing invitation flow but never logged-in returns `invited` from the partner-status read query
  3. `coefficient_history` table exists with the spec'd columns (`id`, `changed_at`, `changed_by_user_id` FK, `before_json`, `after_json`, `summary`); a DB-level rule rejects `UPDATE` and `DELETE` statements against the table (CHECK constraint, RULE, or migration-level GRANT-revoke)
  4. The Drizzle migration runs cleanly through `scripts/migrate.ts --dry-run` against the prod Neon `main` branch (typed-confirmation gate executes, no schema drift errors)
  5. Vitest unit tests cover the new query helpers (`listInvitedPartners`, `createCoefficientHistoryEntry`, `listCoefficientHistory`) and pass with mocked DB; typecheck + lint + build all 0
**Plans**: 7 plans
  - [ ] 12-01-PLAN.md — Drizzle migration `0004_phase12_drafts_and_history.sql` + `src/db/schema.ts` updates (proposals status + nullability + partial unique indexes + completeness CHECK + coefficient_history table + 2 triggers) + [BLOCKING] `npm run db:migrate -- --dry-run` gate (DB-01, DB-02, DB-03)
  - [ ] 12-02-PLAN.md — `src/lib/admin/coefficient-diff.ts` pure `generateDiffSummary(before, after)` FR semicolon-separated diff function + Vitest unit tests (DB-03)
  - [ ] 12-03-PLAN.md — `src/lib/db/queries/users.ts` extension: `listInvitedPartners()` (role='partner' AND deleted_at IS NULL AND last_login_at IS NULL) + Vitest unit tests with mocked DB (DB-02)
  - [ ] 12-04-PLAN.md — `src/lib/db/queries/coefficient-history.ts` (new file): `createCoefficientHistoryEntry` (auto-fallback to generateDiffSummary per D-16) + `listCoefficientHistory` (cursor-paginated) + Vitest unit tests (DB-03)
  - [ ] 12-05-PLAN.md — Extend `src/lib/db/queries/proposals.ts`: `createDraft`, `updateDraft`, `finalizeDraft` (writes audit_log entry), `listDraftsByUser`, `getDraftById`, `deriveDisplayStatus` + modify `softDeleteProposal`/`restoreProposal` for D-08 status/deleted_at lockstep + Vitest unit tests (DB-01)
  - [ ] 12-06-PLAN.md — `scripts/backfill-coefficient-history.ts` (idempotent, typed-confirmation `BACKFILL_CONFIRM=YES` on Neon prod) + `package.json` script + `docs/operations/launch-checklist.md` step + Vitest integration test verifying append-only TRIGGER raises on UPDATE and DELETE (DB-03)
  - [ ] 12-07-PLAN.md — Better Auth session.create.after hook writes `users.last_login_at = now()` on every successful login — closes Phase 6 follow-up #3 / WR-AUDIT-01 (prerequisite for DB-02 truthfulness per D-11) + Vitest unit tests (DB-02)

### Phase 13: 3-Step Proposal Wizard
**Goal**: Partners create proposals through a guided 3-step wizard with server-side draft persistence between steps, replacing v1.1's single-page form
**Depends on**: Phase 11 (Stepper + RetractableSidebar), Phase 12 (DB-01 draft status)
**Requirements**: ROUTE-01
**Success Criteria** (what must be TRUE):
  1. Three routes `/proposals/new/parametres`, `/proposals/new/calcul`, `/proposals/new/verification` each render with the `Stepper` at the top showing the correct active/done/pending state per step
  2. Partner can fill step 1 (Paramètres), navigate to step 2 (Calcul), close the browser, return to `/proposals/new/parametres` and find their entered data still present — backed by a `draft` proposal row in the DB (DB-01)
  3. Partner can click back to any *completed* step via the Stepper, but clicking a pending (future) step does nothing — verified by browser smoke and by the `Stepper` component refusing to render a `<Link>` for pending steps
  4. Submitting step 3 (Vérification) transitions the draft row to `status=active`, generates the PDF via the existing v1.1 pipeline, and the proposal appears in the partner home list with an `active` `StatusChip`; the draft row is no longer visible in any draft surface
  5. Drafts are only visible to their creator — querying `/proposals/new/parametres` as a different partner shows an empty form, not the other partner's draft data
**Plans**: 6 plans
  - [x] 13-01-PLAN.md — Wizard primitives (WizardActionBar, PlusDeDetailsAccordion, PdfPreviewMock, RecapSection) + ~45 wizard.* i18n keys
  - [x] 13-02-PLAN.md — Server actions (saveAndAdvance, saveAsDraft, persistAccordionOpen) + POST /api/proposals/finalize + completedSteps helper + legacy /proposals/new redirect
  - [ ] 13-03-PLAN.md — Step 1 route /proposals/new/parametres (draft mint/hydrate + duplicate flow + 2-section form + accordion)
  - [ ] 13-04-PLAN.md — Step 2 route /proposals/new/calcul (server-side compute + hero card + Détail du calcul with D-12 commission relaxation + recap)
  - [ ] 13-05-PLAN.md — Step 3 route /proposals/new/verification (2-column review + PdfPreviewMock + FinalizeButton wired to D-16 pipeline)
  - [ ] 13-06-PLAN.md — Stepper state semantics integration tests + ADMIN-09 no-commission-in-PDF golden corpus test + D-28 STRIDE addendum + manual smoke runbook
**UI hint**: yes

### Phase 14: Admin Polish — Partners + History + Home
**Goal**: Apply v1.2 design contract to all admin surfaces — replace partner-creation modal with a dedicated page, surface coefficient history, add status chips, and rebuild the admin home with nav cards
**Depends on**: Phase 11 (AdminNavCard + StatusChip + MetricTile + RetractableSidebar), Phase 12 (DB-02 invited status + DB-03 coefficient_history)
**Requirements**: ROUTE-02
**Success Criteria** (what must be TRUE):
  1. `/[adminSegment]/partners/new` route exists, renders a 3-section form (personal info / company info / customizable invitation message), and successfully issues a one-time invitation URL on submit using the same `InviteUrlModal` primitive as v1.1's modal flow
  2. v1.1's modal-based partner creation is removed from the admin accounts page; the "Créer un partenaire" CTA now navigates to `/[adminSegment]/partners/new` instead of opening a modal
  3. Admin home page (`/[adminSegment]`) renders 3 `AdminNavCard`s (Coefficients / Partenaires / Historique) and each navigates to its target page on click; the partner home renders 3 `MetricTile`s (Ce mois-ci / Total / Brouillons) with the correct green/navy/gold color variants powered by aggregate SQL queries over the partner's proposals
  4. Liste des partenaires renders the `invited` status as a distinct gold `StatusChip` (separate from `active` green and `disabled` red); proposal list rows also use the appropriate `StatusChip` variant per row status
  5. Coefficients page surfaces a History sidebar populated from `coefficient_history` (DB-03) showing the past 5 edits with diff summaries; each row links to a full diff modal
**Plans**: TBD
**UI hint**: yes

### Phase 15: Public Surface Brand Polish
**Goal**: Apply Leasétic brand logo + paper-background `(public)` shell pattern uniformly across login, invitation landing, and password reset pages
**Depends on**: Phase 11 (ASSET-01 + ASSET-02 logos must exist on disk)
**Requirements**: PUB-01, PUB-02
**Success Criteria** (what must be TRUE):
  1. `/login` replaces its v1.1 plain-text "Leasétic" header with the official `logo-light.svg` / `logo-dark.svg` lockup centered above the existing form card; form structure unchanged
  2. Body background on `/login`, `/invite/[token]`, and `/reset/[token]` is `--paper`; the centered form card remains `--surface` — verified visually in Chrome + Edge under both light and dark themes
  3. Language and theme toggles remain in the top-right of all 3 public routes (different from authed/admin where they moved into the `RetractableSidebar`)
  4. All 3 public routes share a single reusable `(public)` layout component — verified by grep: the logo + paper-bg pattern is not duplicated across 3 files
  5. Manual smoke: opening each of the 3 routes under both `[data-theme=light]` and `[data-theme=dark]` shows the correct logo variant (mark `#6DC388`, theme-correct wordmark ink); no flash of unstyled content on reload
**Plans**: TBD
**UI hint**: yes

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
| 11. Design System Foundation + Brand Assets | v1.2 | 0/5 | Planned | — |
| 12. Schema Extensions for Drafts + History | v1.2 | 7/7 | Complete | 2026-05-12 |
| 13. 3-Step Proposal Wizard | v1.2 | 2/6 | In Progress|  |
| 14. Admin Polish — Partners + History + Home | v1.2 | 0/0 | Not started | — |
| 15. Public Surface Brand Polish | v1.2 | 0/0 | Not started | — |

---

*Last updated: 2026-05-12 after Phase 12 execution (7/7 plans complete, DB-01/02/03 satisfied, 492 vitest tests pass, 4 integration tests skipped pending DATABASE_URL_TEST). v1.2 phases 11-15 cover 14 requirements (DB-01..03, ROUTE-01..02, COMP-01..05, ASSET-01..02, PUB-01..02). v1.0 + v1.1 details archived in `milestones/`.*
