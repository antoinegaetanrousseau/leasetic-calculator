# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 — Hosted Web App Foundation** — Phases 5-10 (shipped 2026-05-11) — see `milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 — UX Polish + Proposal Wizard** — Phases 11-15 (shipped 2026-05-21) — see `milestones/v1.2-ROADMAP.md`
- ◯ **v1.3 — TBD** — see `v1.3-CARRYFORWARD.md` for candidate scope (admin password rotation, privacy policy confirmation, color refresh, partner home dashboard, /proposals route, etc.)

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

**Shipped:** 2026-05-21 · **Plans:** 25 · **Requirements:** 14/14 (with documented adjustments — ROUTE-02 #3 partner-home MetricTiles deferred to v1.3) · **Tests:** 876/876 passing (+249 net from v1.1) · **Commits:** 147
**Production:** https://leasetic-matrice.vercel.app
**Full archive:** `milestones/v1.2-ROADMAP.md` · `milestones/v1.2-REQUIREMENTS.md`
**Carry-forwards to v1.3:** `v1.3-CARRYFORWARD.md`

</details>

### ◯ v1.3 — TBD

Run `/gsd-new-milestone v1.3` to define scope. Anchor candidates (from `v1.3-CARRYFORWARD.md`):
- **Tier 1 (partner-onboarding gates):** admin password rotation, privacy policy confirmation
- **Tier 2 (tech debt from v1.2):** color-contrast measurement, Neon branch split, post-deploy DB-smoke CI, Better Auth hardening
- **Tier 3 (deferred v1.2 design):** UI color refresh, partner home dashboard restructure, MetricTiles, /proposals route, inline Loyer estimé chip

## Phase Details

*v1.3 phase details land here after `/gsd-new-milestone v1.3` runs.*

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

---

*Last updated: 2026-05-21 — v1.2 milestone archived via `/gsd-complete-milestone v1.2`. Production live at https://leasetic-matrice.vercel.app. Next: `/gsd-new-milestone v1.3` after reviewing `v1.3-CARRYFORWARD.md`.*
