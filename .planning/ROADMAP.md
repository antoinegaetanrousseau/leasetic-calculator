# Roadmap — Matrice Commerciale

## Milestones

- ✅ **v1.0 — v10 Refactor** — Phases 1-4 (shipped 2026-04-30) — see `milestones/v1.0-ROADMAP.md`
- 📋 **v1.1+** — Not yet planned — run `/gsd-new-milestone` to start the next cycle

## Phases

<details>
<summary>✅ v1.0 — v10 Refactor (Phases 1-4) — SHIPPED 2026-04-30</summary>

- [x] **Phase 1: Parity Refactor** (3/3 plans) — v10 behaves identically to v9 on ES6+ code; backward-compatible v9 localStorage reads; 22-row PARITY-AUDIT
- [x] **Phase 2: Security Hardening** (2/2 plans) — SHA-256 password hashing via Web Crypto, transparent plaintext migration, current-pw confirmation, escapeHtml + assertEscape (8 fixtures), SEC-TEST.md
- [x] **Phase 3: UX Polish & i18n** (3/3 plans) — toasts, validation, keyboard shortcuts, FR/EN dictionary (~138 keys × 2), copy-LC, validity override, FINAL-TEST.md
- [x] **Phase 4: Sidebar Shell + Design System v2** (3/3 plans) — grid shell (sidebar + topbar + footer), pill buttons, shadow cards, rounded inputs, retractable sidebar, dark mode, leasetic.fr-aligned design tokens, FINAL-TEST-v11.md
- *(post-roadmap polish: bug fix `</script>` escape, font swap to Plus Jakarta Sans, brand logo + dark-mode wordmark inversion, feather icon sprite, retractable sidebar, dark mode with no-flash restore)*

</details>

### 🚧 v1.1 — Not yet planned

(Use `/gsd-new-milestone` to start the next cycle. Likely candidates from v1.0 Out-of-Scope: hosted version, partner auth, centralized LC dashboard, Excel export, mobile-optimized layout, automated browser tests.)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Parity Refactor | v1.0 | 3/3 | Complete | 2026-04-30 |
| 2. Security Hardening | v1.0 | 2/2 | Complete | 2026-04-30 |
| 3. UX Polish & i18n | v1.0 | 3/3 | Complete | 2026-04-30 |
| 4. Sidebar Shell + Design System v2 | v1.0 | 3/3 | Complete | 2026-04-30 |

---

*Last updated: 2026-04-30 after v1.0 milestone close.*
*Detailed archives in `.planning/milestones/`.*
