# Milestones — Matrice Commerciale

Living log of shipped versions. Each entry summarizes what shipped, when, and where the detailed archives live.

---

## v1.0 — Matrice Commerciale v10 Refactor

**Shipped:** 2026-04-30
**Phases:** 4 | **Plans:** 11 | **Plan↔Summary parity:** 11/11
**Requirements:** 69/69 ✅
**Deliverable:** `Matrice_2026_THE_Leasetic-v10.html` (2,296 lines, single-file standalone)

### What shipped

A complete refactor of the Leasétic Matrice Commerciale standalone HTML quote tool, modernizing the v9 baseline (911 lines, ES5 vanilla, plaintext password, no XSS guards, alert-driven UX, French only) into a production-grade v10 with:

- **Functional parity** with v9 across all 22 PARITY requirements; backward-compatible reads of v9 localStorage so existing partners need zero reconfiguration
- **ES6+ refactor** with labeled CSS sections (TOKENS / LAYOUT / COMPONENTS / PRINT) and JS sections (STATE / I18N / UTILS / CALC / ADMIN / PROPOSAL / MIGRATION / INIT); zero `var`, template literals, arrow functions
- **Security hardening:** SHA-256 password hashing via Web Crypto API, transparent in-place migration of plaintext `lt_pw`, current-password confirmation gate, `escapeHtml()` wrapping every user-sourced HTML interpolation (23-row authoritative audit table)
- **UX polish:** non-blocking toast system, real-time blur-based field validation, document-level keyboard shortcuts (Enter/Esc), auto-focus on failed submit, copy-LC button, configurable validity (15/30/60 days)
- **FR/EN bilingual** with ~138 dictionary keys × 2 languages, segmented header toggle, instant proposal re-render on language switch, bilingual RSE page caption
- **Modern SaaS shell:** retractable left sidebar (260px ↔ 72px), sticky topbar with per-page contextual actions, footer, pill buttons, shadow cards, larger typography, leasetic.fr-aligned design tokens
- **Light + dark mode** with no-flash theme restoration, Colibris-inspired dark palette, all Leasétic brand colors preserved, proposal forced to stay white in dark mode for print-output parity
- **On-load self-check triad:** `assertCalc` (6/6 fixtures), `assertEscape` (8/8 fixtures), `assertValidity` (6/6 fixtures) — every page load logs green or surfaces a regression immediately

### Verification artifacts

- `phases/01-parity-refactor/PARITY-AUDIT.md` — 22-row evidence log + browser smoke runbook
- `phases/02-security-hardening/SEC-TEST.md` — XSS payload fixtures + 23-row HTML-writing audit table
- `phases/04-sidebar-shell-design-v2/FINAL-TEST-v11.md` — Master ship-gate runbook (Sections A-J, ~75-105 min Chrome+Edge)

### Key decisions

| Decision | Outcome |
|----------|---------|
| Standalone single HTML file (no build tools, no framework) | ✓ Held — distribution model is "send the file" |
| Ship as `-v10.html` alongside intact `-v9.html` | ✓ Held — partners can roll back by reopening v9 |
| Manual test checklists instead of Playwright | ✓ Held — matches the no-build-chain constraint |
| SHA-256 via Web Crypto API for password hashing | ✓ Validated in Phase 2 |
| Hierarchical i18n keys in a single JS dictionary | ✓ Validated in Phase 3 |
| Light sidebar in Phase 4 (Dashly-style, not navy) | ✓ Held — navy would compete with white content cards |
| `--surface` token introduced for dark mode | ✓ Held — semantic separation from `--white` |
| Proposal page stays white in dark mode | ✓ Held — print parity over visual unity |
| No-flash inline `<head>` script for theme restore | ✓ Held — prevents flash of light content |

### Issues encountered + resolved

- **Premature `</script>` close in `assertEscape` fixture** — A literal `</script>` string inside the JS test fixture closed the HTML script block early, dumping unprocessed JS as visible page text. Fixed by escaping the forward slash (`<\/script>`).
- **CSS variable name collision** — v9's `--sidebar-w: 24px` was used by the proposal page's internal navy strip. Phase 4 introduced `--shell-sidebar-w: 260px` rather than overloading.
- **Duplicate IDs from button consolidation** — Topbar Save/Lock buttons renamed to `btn-save-topbar` / `btn-lock-topbar`, delegating clicks to the inline admin-panel buttons.
- **Dashly icon experiment reverted** — Mid-milestone iteration where filled-green Dashly tiles temporarily replaced the feather-style icons. Antoine preferred the feather style; reverted while keeping all retractable-sidebar work intact.

### Tech debt + carried forward to next milestone candidates

- Distribution model is still "edit + resend" per partner (no hosted version)
- No automated browser tests (manual runbooks only)
- LC references random + uncentralized (no backend dashboard)
- No proposal-portfolio Excel export
- No mobile-optimized layout (degrades gracefully but not optimized)

### Patterns established (carry forward)

- Plan↔Summary 1:1 ratio as the milestone-completeness invariant
- CONTEXT.md as the durable phase decision log (locked decisions before planning)
- On-load self-checks (`assertX()`) as regression early-warning per invariant
- Labeled CSS + JS sections for predictable code placement
- Sequential waves for shared-file projects (avoid merge conflicts)
- Atomic commits per task
- `<symbol>` + `<use>` SVG sprite with `currentColor` inheritance
- Tokens → surfaces → states (design changes start at the variable layer)

### Known notes at close

- **Git history was lost during a directory move** (cloud-sync corruption zeroed ~109 object files including HEAD). Working tree was 100% intact. Re-initialized fresh git history at milestone close with the v1.0 deliverable as the initial commit. The corrupted `.git.corrupted-backup/` directory remains in the project root for any future recovery attempts (gitignored). Planning artifacts and per-phase summaries preserved the *why* of every decision; the lost commit log was a finer-grained record of the same information.
- **`FINAL-TEST-v11.md` runbook has not yet been executed by Antoine.** Recommended before partner distribution.

### Detailed archives

- `.planning/milestones/v1.0-ROADMAP.md` — full phase-by-phase breakdown with plans, tasks, decisions
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 69 requirements with shipped status

---

*This file accumulates milestone summaries. Add new entries above this line when shipping v1.1+, with the most recent at the top.*
