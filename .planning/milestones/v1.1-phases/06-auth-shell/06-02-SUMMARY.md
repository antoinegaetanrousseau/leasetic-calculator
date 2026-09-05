---
phase: 06-auth-shell
plan: 02
subsystem: i18n
tags: [i18n, eslint, formatting, dictionaries, intl, shell-06, shell-09]
dependency_graph:
  requires: [06-01]
  provides: [full-i18n-dictionary, format-helpers, jsxtext-lint-guard]
  affects: [06-03, 06-04, 06-05, 06-06, 06-07, 06-08]
tech_stack:
  added: []
  patterns: [TDD-red-green, compile-time-parity-proof, explicit-Intl-locale, eslint-no-restricted-syntax]
key_files:
  created:
    - src/lib/i18n/dictionaries.ts (extended from 5 to 231 keys × 2 langs)
    - src/lib/i18n/dictionaries.test.ts (6 tests)
    - src/lib/i18n/format.ts (formatCurrency/formatNumber/formatDate)
    - src/lib/i18n/format.test.ts (8 tests)
  modified:
    - eslint.config.mjs (no-restricted-syntax block added)
    - app/page.tsx (2 hardcoded JSX literals replaced with t() calls — Rule 1 fix)
decisions:
  - "231 FR/EN keys total: 5 legacy camelCase + 166 v10 + 60 Phase 6 new (RESEARCH.md §11 expected 165; actual v10 count is 166 — within tolerance)"
  - "ESLint rule exempts app/error.tsx (D-30: bilingual fallback by design)"
  - "app/page.tsx refactored to use t('sidebar.brand') and t('shell.footer.copyright') — placeholder literals eliminated by Rule 1 auto-fix"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-08T16:19:08Z"
  tasks_completed: 3
  files_changed: 6
---

# Phase 6 Plan 02: i18n Dictionary + Format Helpers + ESLint Guard Summary

**One-liner:** Full v10 dictionary port (166 keys) + 60 Phase 6 auth/shell keys with compile-time EN parity proof, explicit fr-FR/en-GB Intl formatting helpers, and JSXText ESLint guard.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Port v10 dictionary + Phase 6 keys + EN parity test (TDD) | 85ed3d0 | dictionaries.ts, dictionaries.test.ts |
| 2 | Create format.ts with explicit Intl locales + tests (TDD) | a31a692 | format.ts, format.test.ts |
| 3 | Add ESLint no-restricted-syntax rule for JSX text | 51cf372 | eslint.config.mjs, app/page.tsx |

## Dictionary Key Count

- **FR keys:** 231 total (5 legacy camelCase + 166 v10 dot-notation + 60 Phase 6 new)
- **EN keys:** 231 total (exact parity — compile-time proof via `_EnHasAllFrKeys` type)
- **v10 key count:** 166 (RESEARCH.md §11 estimated 165; actual extraction via Python regex yielded 166 — within accepted ±5 tolerance)
- All 6 categories verified: `admin.*`, `form.*`, `proposal.*`, `result.*`, `error.*`, `banner.*`

## Format Module (SHELL-09)

`src/lib/i18n/format.ts` exports:
- `formatCurrency(value, lang)` — EUR currency with `Intl.NumberFormat(LOCALES[lang], { style: 'currency', currency: 'EUR', ... })`
- `formatNumber(value, lang, opts?)` — locale-correct grouping + decimal
- `formatDate(date, lang, opts?)` — locale-correct month/day/year
- `_LOCALES_FOR_TEST` — LOCALES map exported for test assertions
- LOCALES: `fr -> 'fr-FR'`, `en -> 'en-GB'` (never en-US per D-28)

## ESLint Rule (SHELL-06)

Rule added in `eslint.config.mjs`:
- Selector 1: `JSXText[value=/[a-zA-ZÀ-ÿ]{2,}/]` — flags hardcoded text with 2+ letters
- Selector 2: Intl no-arg call belt (SHELL-09 enforcement in JSX context)
- Files: `**/*.{tsx,jsx}` — exempt: `*.test.ts(x)`, `*.spec.ts(x)`, `app/error.tsx`

**Smoke test results (verified, files deleted before commit):**
- `<p>Bonjour le monde</p>` → ERROR: "Hardcoded text in JSX is forbidden" (rule fires)
- `<p>{t('auth.signin.title', lang)}</p>` → 0 errors (JSXExpressionContainer, not JSXText)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 2 hardcoded JSX literals in app/page.tsx**
- **Found during:** Task 3 (after adding ESLint rule, `npm run lint:check` failed)
- **Issue:** `app/page.tsx` line 36 had `Leas&#233;tic` (HTML entity) and line 97 had `Phase 5 — Bootstrap &amp; Deploy` as hardcoded JSXText nodes
- **Fix:** Replaced with `{t('sidebar.brand', lang)}` and `{t('shell.footer.copyright', lang)}` respectively
- **Files modified:** `app/page.tsx`
- **Commit:** 51cf372

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 (PASS) |
| `npm test` (42 tests) | 0 failures (PASS) |
| `npm run lint:check` | 0 warnings/errors (PASS) |
| `npm run build` | 0 errors (PASS) |
| FR/EN key count | 231 / 231 (PASS, >= 220) |
| `grep -c 'no-restricted-syntax' eslint.config.mjs` | 1 (PASS) |
| `grep -c 'fr-FR' src/lib/i18n/format.ts` | 2 (in comment + const — PASS) |
| `grep -c 'en-GB' src/lib/i18n/format.ts` | 3 (in 2 comments + const — PASS) |

## Known Stubs

None — the dictionary is fully populated with real FR and EN strings. No placeholder values.

## Threat Flags

None — this plan adds no new network endpoints, auth paths, or file access patterns.

## Self-Check: PASSED

Files verified to exist:
- src/lib/i18n/dictionaries.ts — FOUND
- src/lib/i18n/dictionaries.test.ts — FOUND
- src/lib/i18n/format.ts — FOUND
- src/lib/i18n/format.test.ts — FOUND
- eslint.config.mjs — FOUND (contains no-restricted-syntax)

Commits verified:
- 85ed3d0 — FOUND (feat(06-02): extend i18n dictionary)
- a31a692 — FOUND (feat(06-02): add format.ts)
- 51cf372 — FOUND (feat(06-02): add ESLint no-restricted-syntax)
