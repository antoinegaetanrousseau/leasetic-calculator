---
phase: 11
plan: 01
subsystem: design-system-foundation
tags: [css-tokens, i18n, vitest, jsdom, testing-infra]
dependency_graph:
  requires: []
  provides:
    - "css-token: --brand-mark"
    - "css-token: --shell-sidebar-w-collapsed"
    - "css-token: --shell-sidebar-current-w"
    - "css-class: .chip-draft (gold tint)"
    - "css-rule: brand-logo theme picker (light/dark)"
    - "i18n-keys: sidebar.* × 13 new keys × 2 langs"
    - "vitest-environment: jsdom (DOM-testing capability)"
    - "vitest-setup: __tests__/setup-dom.ts (jest-dom matchers)"
  affects:
    - "css-class: .chip-expired (rewritten gold → muted; ValidityChip.tsx visually shifts)"
tech_stack:
  added:
    - "@testing-library/react@16.1.0 (devDep, exact pin)"
    - "@testing-library/jest-dom@6.6.3 (devDep, exact pin)"
    - "jsdom@25.0.1 (devDep, exact pin)"
  patterns:
    - "Per-file `// @vitest-environment node` pragma to opt PDF tests out of global jsdom (preserves PROP-17 byte-determinism)"
key_files:
  created:
    - "__tests__/setup-dom.ts"
  modified:
    - "app/globals.css"
    - "src/lib/i18n/dictionaries.ts"
    - "vitest.config.ts"
    - "package.json"
    - "package-lock.json"
    - "__pdf-fixtures__/render-fixtures.test.ts"
    - "src/lib/pdf/document.test.tsx"
decisions:
  - "PDF determinism preserved by pinning __pdf-fixtures__/render-fixtures.test.ts AND src/lib/pdf/document.test.tsx to environment node via Vitest per-file pragma (Rule 3 auto-fix)"
  - "Exact version pins enforced post-install: npm injected carets, hand-stripped and refreshed package-lock.json"
metrics:
  tasks_completed: 3
  duration_minutes: ~10
  completed_date: "2026-05-11"
  tests_before: 399
  tests_after: 399
  files_created: 1
  files_modified: 7
---

# Phase 11 Plan 01: Design System Foundation Layer Summary

**One-liner:** Token spine extension (`--brand-mark`, `--shell-sidebar-w-collapsed`, `--shell-sidebar-current-w`, `--color-brand-mark`) + chip class rewire (`.chip-draft` added; `.chip-expired` gold → muted) + brand-logo CSS picker + 13 sidebar.* i18n keys × 2 langs + Vitest jsdom environment with `@testing-library/react` infrastructure — unblocks Plans 11-02 through 11-05.

## Tasks Completed

### Task 1: Extend `app/globals.css` (commit `df19d74`)

5 edits applied:

1. **`:root` block** — appended 3 tokens after `--danger`:
   - `--brand-mark: #6DC388;` (line 22) — documents SVG mark fill, additive per D-10
   - `--shell-sidebar-w-collapsed: 72px;` (line 26) — collapsed sidebar width
   - `--shell-sidebar-current-w: 260px;` (line 27) — runtime-mutated grid column width

2. **`@theme` block** — appended Tailwind utility alias:
   - `--color-brand-mark: var(--brand-mark);` (line 71)

3. **`.chip-expired` rewritten** (line 366) — from gold tint to muted gray per UI-SPEC §6.6/§11.2:
   ```css
   .chip-expired {
     background: rgba(110, 113, 145, 0.12);
     color: var(--muted);
   }
   ```
   Visual regression: Phase 8 `ValidityChip.tsx` will visually shift expired-proposal chip from gold→muted-gray. Acceptable per UI-SPEC §11.2; smoke verification deferred to Plan 11-05 Task 4.

4. **`.chip-draft` added** (line 371) — uses the old gold/orange tint (semantic reassignment for `draft` status):
   ```css
   .chip-draft {
     background: rgba(224, 133, 48, 0.12);
     color: var(--gold);
   }
   ```

5. **Brand-logo CSS picker** (lines 538–540) — appended at end of file:
   ```css
   /* === Phase 11 brand-logo theme picker (UI-SPEC §6.1, D-09) === */
   html[data-theme="light"] .brand-logo-dark  { display: none; }
   html[data-theme="dark"]  .brand-logo-light { display: none; }
   ```

Final file size: 540 lines (was 528; +12 per plan budget). All 8 grep gates pass. `npm run build` succeeds.

### Task 2: Add 13 new sidebar.* i18n keys (commit `e608b95`)

- FR keys inserted at lines 42–54 (immediately after `'sidebar.brand': 'Leasétic'` at line 41)
- EN keys inserted at lines 559–571 (after the corresponding EN `sidebar.brand` declaration)
- Total file diff: +26 lines (13 keys × 2 namespaces)
- Total `'sidebar.` matches in file: 28 (= 14 keys × 2 langs)
- FR↔EN parity test passes (199/199 in `dictionaries.test.ts`); compile-time `_EnHasAllFrKeys` type satisfied

Key list (FR / EN):
| Key | FR | EN |
|---|---|---|
| `sidebar.collapse` | Réduire le menu | Collapse menu |
| `sidebar.expand` | Déployer le menu | Expand menu |
| `sidebar.lang.cycle` | Changer de langue | Change language |
| `sidebar.theme.cycle` | Changer de thème | Change theme |
| `sidebar.eyebrow.navigation` | NAVIGATION | NAVIGATION |
| `sidebar.nav.home` | Accueil | Home |
| `sidebar.nav.proposalsNew` | Nouvelle proposition | New proposal |
| `sidebar.nav.history` | Historique | History |
| `sidebar.nav.help` | Aide | Help |
| `sidebar.nav.adminHome` | Tableau de bord | Dashboard |
| `sidebar.nav.adminCoefficients` | Coefficients | Coefficients |
| `sidebar.nav.adminPartners` | Partenaires | Partners |
| `sidebar.nav.adminHistory` | Historique | History |

### Task 3: Install DOM-testing infra + switch Vitest to jsdom (commit `0631008`)

Final installed versions (exact pins, no carets):
- `@testing-library/react@16.1.0`
- `@testing-library/jest-dom@6.6.3`
- `jsdom@25.0.1`

**`npm install` peer-dep warnings:** None blocked the install; npm reported 64 new packages with no peer-dep conflicts requiring `--legacy-peer-deps`. (Standard `npm audit` advisory output mentions 34 transitive vulnerabilities — all pre-existing, not introduced by this plan.)

**`package-lock.json`:** Committed alongside `package.json` per project's locked-discipline. npm injected carets on first install (`^6.6.3`, `^16.1.0`, `^25.0.1`); hand-stripped and re-ran `npm install` to refresh the lockfile to no-caret semver.

**`vitest.config.ts`:** `environment: 'node'` → `environment: 'jsdom'`; added `setupFiles: ['./__tests__/setup-dom.ts']`. The `include` array, `globals: false`, and `resolve.alias` block preserved verbatim.

**`__tests__/setup-dom.ts`:** Single-line `import '@testing-library/jest-dom/vitest';` — registers DOM matchers on Vitest's `expect`. Path uses the `/vitest` subpath (jest-dom 6.x explicit Vitest-compat entry, NOT the default `@testing-library/jest-dom` which targets Jest).

**`src/lib/pdf/document.test.tsx`:** Continues to pass under jsdom — but the file is now pinned to `node` via `// @vitest-environment node` pragma for safety (PDF rendering depends on native Buffer/fs/crypto).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PDF byte-determinism regression under jsdom**

- **Found during:** Task 3 verification (`npm test` after switching to jsdom global)
- **Issue:** `__pdf-fixtures__/render-fixtures.test.ts` failed 2 tests (`happy-path-fr` and `happy-path-en` SHA-256 byte-determinism gates per PROP-17). jsdom polyfills (`URL`, `Blob`, `crypto`) shifted `@react-pdf/renderer`'s output bytes ~1KB per fixture. The plan's `<context><interfaces>` block asserted "jsdom is a superset, node-only tests still pass" — that assertion held for the previously-identified `.test.tsx` (`src/lib/pdf/document.test.tsx` — 5 tests, all green under jsdom) but failed for the byte-determinism gate file the plan did not enumerate.
- **Why this is Rule 3 (not Rule 4):** PROP-17 byte-determinism is a locked architectural invariant carried into v1.2 (STATE.md Decisions Log). Allowing the test to fail would break the CI green-bar and break PDF immutability proof. The fix surface (per-file pragma) is minimal and reversible; no schema/library/architecture changes.
- **Fix:** Added `// @vitest-environment node` pragma to the top of both PDF test files:
  - `__pdf-fixtures__/render-fixtures.test.ts` — byte-determinism gate (PROP-17/PDF-04)
  - `src/lib/pdf/document.test.tsx` — happy-path renderToBuffer test (pre-emptively pinned for symmetry, although it passed under jsdom; future-proofs against undetected jsdom-induced byte drift)
- **Files modified:** `__pdf-fixtures__/render-fixtures.test.ts`, `src/lib/pdf/document.test.tsx`
- **Commit:** `0631008`
- **Validation:** All 399/399 tests pass after the fix. The plan's AC-TEST-04 (`grep -c "environment: 'jsdom'" vitest.config.ts == 1`) is still satisfied — the global environment IS jsdom; the pragma is a per-file override that Vitest respects without disturbing the config gate.

**2. [Rule 1 - Bug] npm injected caret semver ranges**

- **Found during:** Task 3 step 1 (after `npm install --save-dev`)
- **Issue:** npm wrote `^6.6.3`, `^16.1.0`, `^25.0.1` despite explicit-version install args. Conflicts with STATE.md Decisions Log "Exact version pins without carets" (carried from Phase 5).
- **Fix:** Hand-edited `package.json` to strip carets; re-ran `npm install` to refresh `package-lock.json` against the no-caret semver.
- **Commit:** `0631008` (included in the same commit as the DOM-infra install)
- **Verified:** `grep -E '"(@testing-library/react|@testing-library/jest-dom|jsdom)":\s*"\^' package.json` returns 0 matches per AC-TEST-02.

## Verification Results

All gates pass:

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint:check` | 0 warnings (max-warnings=0) |
| `npm test` | 399/399 passed (21 files; baseline preserved) |
| `npm run build` | success, all 14 routes built |
| `npm run check:no-vercel-imports` | OK: no forbidden imports |
| Task 1 grep gates | 8/8 pass |
| Task 2 grep gates | 4/4 pass |
| Task 3 grep gates | 10/10 pass |

`git status` post-execution shows the expected 6 plan-modified files + 1 new file:
- ✅ `app/globals.css` (modified)
- ✅ `src/lib/i18n/dictionaries.ts` (modified)
- ✅ `vitest.config.ts` (modified)
- ✅ `package.json` (modified)
- ✅ `package-lock.json` (modified)
- ✅ `__tests__/setup-dom.ts` (new)
- 🔄 `__pdf-fixtures__/render-fixtures.test.ts` (modified — Rule 3 auto-fix)
- 🔄 `src/lib/pdf/document.test.tsx` (modified — Rule 3 auto-fix)

## Downstream Impact

This plan unblocks Plans 11-02 through 11-05:

- **Plan 11-02 (BrandLogo + SVG assets):** `--brand-mark` token + brand-logo CSS picker rules ready for `<BrandLogo />` consumption
- **Plan 11-03 (AdminNavCard + StatusChip + MetricTile):** `.chip-draft` + rewritten `.chip-expired` ready; chip variant set is now complete (active/draft/expired/disabled per UI-SPEC §6.6)
- **Plan 11-04 (RetractableSidebar + Shell):** all 13 sidebar.* i18n keys present (FR+EN parity); `--shell-sidebar-w-collapsed` + `--shell-sidebar-current-w` tokens ready for grid-column mutation
- **Plans 11-02..11-04 component tests:** Vitest jsdom environment + `@testing-library/react` + jest-dom matchers ready; `render()` calls will work in `.test.tsx` files

PDF tests (Plans 8 byte-determinism gate + 11-05 PDF regression check) protected by per-file `node` environment pragma.

## Threat Flags

None — this plan introduces no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Known Stubs

None — every artifact is fully wired:
- The new CSS tokens are declared in `:root` AND `@theme`
- The new chip class has full property values (no `TODO`/`FIXME`)
- The new i18n keys have substantive translations in both languages
- The Vitest setup file has a working import (not placeholder)

The `--brand-mark` token has no current TypeScript consumer — that is intentional per UI-SPEC §4.4 (declared for SVG-asset intent documentation; Plan 11-02's `<BrandLogo />` will consume it indirectly via the SVG file contents `#6DC388`).

## TDD Gate Compliance

N/A — this plan is `type: execute` (not `type: tdd`), and no task has `tdd="true"`. Three tasks all `type="auto" tdd="false"` — TDD gate sequence not required.

## Self-Check: PASSED

- ✅ `app/globals.css` modified — `git diff aa45f19..HEAD -- app/globals.css` shows 12 insertions
- ✅ `src/lib/i18n/dictionaries.ts` modified — 26 insertions (13 keys × 2 namespaces)
- ✅ `vitest.config.ts` modified — environment + setupFiles changes
- ✅ `package.json` modified — 3 new devDependencies (exact pins)
- ✅ `package-lock.json` modified — refreshed against no-caret semver
- ✅ `__tests__/setup-dom.ts` created — exists, contains jest-dom/vitest import
- ✅ `__pdf-fixtures__/render-fixtures.test.ts` modified — `// @vitest-environment node` pragma at top
- ✅ `src/lib/pdf/document.test.tsx` modified — `// @vitest-environment node` pragma at top

Commit hashes verified in `git log --oneline -4`:
- ✅ `df19d74 feat(11-01): extend globals.css token spine + chip classes + brand-logo picker`
- ✅ `e608b95 feat(11-01): add 13 sidebar.* i18n keys (FR + EN parity)`
- ✅ `0631008 chore(11-01): install @testing-library/react + jsdom; switch Vitest to jsdom`
