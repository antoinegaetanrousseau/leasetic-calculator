# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- ✅ **v1.1 — Hosted Web App Foundation** — Phases 5-10 (shipped 2026-05-11) — see `milestones/v1.1-ROADMAP.md`
- 🚧 **v1.2 — UX Polish + Proposal Wizard** — context pre-staged in `.planning/MILESTONE-CONTEXT.md` (Figma design contract `vwOzirhL0vyxDWq4m6t4gC`); phases TBD via `/gsd-new-milestone`

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

### 🚧 v1.2 — UX Polish + Proposal Wizard (planning)

Context pre-staged 2026-05-11 in `.planning/MILESTONE-CONTEXT.md` from a Figma design session (file key `vwOzirhL0vyxDWq4m6t4gC`). Run `/gsd-new-milestone` to lock in requirements + phases.

**High-level scope** (full requirements in MILESTONE-CONTEXT.md):
- 3-step proposal wizard (Paramètres → Calcul → Vérification) with server-side draft persistence
- Retractable sidebar with brand logo (light/dark variants), home metric tiles, admin nav cards, status chip variants
- Database extensions: `draft` proposal status, `invited` partner account status, coefficient change history table
- Dedicated `/[adminSegment]/partners/new` route (replaces v1.1 modal)
- Brand-logo treatment on `/login`, `/invite/[token]`, `/reset/[token]`

**Carried-over from v1.1** (close before partner onboarding):
- Admin password rotation (`leasetic2026` → individual strong)
- `users.last_login_at` write at login (ADMIN-05 gap)
- Ask Thomas to confirm privacy-policy coverage (D-10-18)

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
| v1.2 phases | v1.2 | 0/0 | Not started | — |

---

*Last updated: 2026-05-11 after v1.1 milestone close. v1.2 context pre-staged in `MILESTONE-CONTEXT.md`. v1.0 + v1.1 details archived in `milestones/`.*
