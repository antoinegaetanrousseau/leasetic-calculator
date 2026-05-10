---
phase: 10-cutover-polish
plan: "01"
subsystem: foundation
tags: [audit-log, i18n, css, env, npm-scripts, phase-10]
dependency_graph:
  requires: []
  provides:
    - "AuditAction union with 'user.purge' (consumed by 10-03 purge-test-data.ts)"
    - "admin.seed_banner.message + login.privacy.label i18n keys (consumed by 10-04 SeedBanner + LoginForm)"
    - ".seed-banner CSS class (consumed by 10-04 SeedBanner.tsx)"
    - "NEXT_PUBLIC_PRIVACY_URL_FR/EN + PURGE_CRON_SECRET in .env.example (referenced by 10-06 deploy-ovh.md)"
    - "purge:test-data + smoke:ovh + check:no-v10-localstorage npm scripts (wired in 10-03/06/05)"
  affects:
    - src/lib/db/queries/audit-log.ts
    - src/lib/i18n/dictionaries.ts
    - app/globals.css
    - .env.example
    - package.json
tech_stack:
  added: []
  patterns:
    - "AuditAction union extension (closed-set TS union; grep gate verifies exact-1 occurrence)"
    - "i18n block comment convention mirroring Phase 9 (// ── Phase N — ... ──────)"
    - "FR curly apostrophe U+2019 per Phase 8 typography convention"
    - "_EnHasAllFrKeys compile-time parity check enforced via typecheck"
    - "CSS token discipline: existing var(--gold)/var(--navy)/var(--ink) only"
    - ".env.example section with Phase separator + per-var rationale"
    - "tsx -r ./scripts/_preload-mock-server-only.cjs pattern for server-only scripts"
key_files:
  modified:
    - src/lib/db/queries/audit-log.ts
    - src/lib/i18n/dictionaries.ts
    - app/globals.css
    - .env.example
    - package.json
decisions:
  - "user.purge added to AuditAction union to enable pre-launch test-data scrub audit trail (D-10-11)"
  - "4 i18n keys (2 × 2 langs) added in one edit to keep _EnHasAllFrKeys build green"
  - ".seed-banner appended at end of globals.css; no new CSS tokens introduced"
  - "PURGE_CRON_SECRET left blank in .env.example per T-10-01-02 (secret lives only in Vercel Production env)"
  - "3 npm scripts registered as placeholders; downstream plans wire actual script files"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-10"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 5
---

# Phase 10 Plan 01: Foundation — AuditAction, i18n, CSS, env vars, npm scripts

**One-liner:** Cross-cutting foundation for Phase 10 — extends AuditAction union with `user.purge`, adds SeedBanner + privacy i18n keys (FR+EN), declares `.seed-banner` CSS class, documents Phase 10 env vars, and registers 3 npm script placeholders so Wave-2 plans can proceed in parallel.

## Tasks Completed

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 | Extend AuditAction union + add Phase 10 i18n keys | 52bbb72 | audit-log.ts, dictionaries.ts | +15 |
| 2 | Add .seed-banner CSS class to globals.css | d23c9a4 | globals.css | +17 |
| 3 | Extend .env.example + register npm scripts | a019d35 | .env.example, package.json | +27 |

## File Diff Summary

| File | Lines Added | Lines Removed | Notes |
|------|-------------|---------------|-------|
| `src/lib/db/queries/audit-log.ts` | +7 | -1 | AuditAction union + JSDoc bullet |
| `src/lib/i18n/dictionaries.ts` | +9 | 0 | 4 keys (2 FR + 2 EN) + 2 comment blocks |
| `app/globals.css` | +17 | 0 | .seed-banner light + dark rules |
| `.env.example` | +22 | 0 | Phase 10 section with 3 env vars |
| `package.json` | +5 | -1 | 3 new npm scripts (comma discipline corrected) |

## Wave-2 Plans Unblocked

All 5 Wave-2 plans (10-02 through 10-06) can now run in parallel:

- **10-02** (OVH runbook + deploy-ovh.md) — references `PURGE_CRON_SECRET` from .env.example ✓
- **10-03** (purge-test-data.ts) — `npm run purge:test-data` registered; `'user.purge'` AuditAction available ✓
- **10-04** (SeedBanner + privacy link) — `admin.seed_banner.message` + `login.privacy.label` i18n keys + `.seed-banner` CSS class ready ✓
- **10-05** (CI grep gate) — `check:no-v10-localstorage` npm script registered ✓
- **10-06** (smoke-ovh.ts) — `npm run smoke:ovh` registered; `NEXT_PUBLIC_PRIVACY_URL_*` documented ✓

## Verification Gates

All gates green at commit time:

- `npm run typecheck` — exits 0 (AuditAction union extension + _EnHasAllFrKeys parity check)
- `npm run lint:check` — exits 0 (0 warnings, 0 errors)
- `npm test` — 399/399 tests pass across 21 test files (no regressions)
- `grep -cE "^[[:space:]]*\| 'user\.purge'" src/lib/db/queries/audit-log.ts` — returns 1
- `grep -c "admin.seed_banner.message" src/lib/i18n/dictionaries.ts` — returns 2 (FR + EN)
- `grep -c "login.privacy.label" src/lib/i18n/dictionaries.ts` — returns 2 (FR + EN)
- FR `admin.seed_banner.message` contains curly apostrophe U+2019
- `.env.example` has `PURGE_CRON_SECRET=` (blank, secure), `NEXT_PUBLIC_PRIVACY_URL_FR=https://...`, `NEXT_PUBLIC_PRIVACY_URL_EN=https://...`
- `package.json` JSON valid; 3 scripts wired with correct tsx preload pattern

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `purge:test-data`, `smoke:ovh`, `check:no-v10-localstorage` npm scripts are placeholder registrations. Running them before plans 10-03/10-06/10-05 ship will fail with `ENOENT` — expected behavior documented in the plan.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All changes are:
- Source-code type extension (AuditAction)
- String literals (i18n dictionary)
- CSS declarations (globals.css)
- Documentation (`.env.example`, `package.json` script names)

No threat flags.

## Self-Check: PASSED

- `src/lib/db/queries/audit-log.ts` — exists, contains `user.purge`
- `src/lib/i18n/dictionaries.ts` — exists, contains 2× `admin.seed_banner.message`, 2× `login.privacy.label`
- `app/globals.css` — exists, contains `.seed-banner` rule (2 occurrences: light + dark)
- `.env.example` — exists, contains `PURGE_CRON_SECRET=`
- `package.json` — exists, scripts `purge:test-data`, `smoke:ovh`, `check:no-v10-localstorage` all present
- Commits 52bbb72, d23c9a4, a019d35 — all present in git log
