---
phase: 38-shell-dialogs-visual-conventions
plan: 01
subsystem: ui
tags: [i18n, accessibility, a11y, dialog, sheet, vendored-primitives, vitest]

# Dependency graph
requires:
  - phase: 06-auth
    provides: "src/lib/i18n/dictionaries.ts's t()/Lang/DictKey machinery and the .aria key naming convention"
provides:
  - "common.close.aria FR/EN dictionary key"
  - "resolveDomLang(): SSR-safe <html lang> -> Lang narrowing helper (src/lib/i18n/dom-lang.ts)"
  - "dialog.tsx / sheet.tsx close-button accessible name now locale-correct"
  - "tests/dialog-close-label.test.ts pinning gate against re-import clobber"
affects: [38-02, 38-03, 38-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolveDomLang() as the SSR-safe way to read <html lang> from a vendored primitive with no lang prop and no locale context"
    - "Source-assertion test (readFileSync + stripComments, no jsdom) as the durability mechanism for a fix inside an ESLint-excluded vendored directory"

key-files:
  created:
    - src/lib/i18n/dom-lang.ts
    - tests/dialog-close-label.test.ts
  modified:
    - src/lib/i18n/dictionaries.ts
    - src/components/ui/dialog.tsx
    - src/components/ui/sheet.tsx
    - .planning/codebase/UI-CONVENTIONS.md

key-decisions:
  - "common.close.aria added as a generic .aria-suffixed key rather than reusing auth.modal.button.close, per 38-CONTEXT.md's Claude's-Discretion resolution"
  - "resolveDomLang() lives in src/lib/ (ESLint-covered, non-vendored) rather than being duplicated inline in each primitive, keeping the vendored diff to 3 changed lines per file"
  - "No lang prop and no locale context introduced (D-38-09 explicitly rejected both)"

requirements-completed: [GAP-02]

# Metrics
duration: 8min
completed: 2026-09-06
---

# Phase 38 Plan 01: Dialog/Sheet Close Button i18n Summary

**Vendored `dialog.tsx`/`sheet.tsx` close-button accessible name now reads `common.close.aria` via a new SSR-safe `resolveDomLang()` helper instead of hardcoding English "Close", pinned against re-import clobber by a new source-assertion test.**

## Performance

- **Duration:** 8 min (10:36:31 CEST commit 1 → 10:38:52 CEST commit 2, plus setup/verification time)
- **Started:** 2026-09-06T08:32:25Z (session start per STATE.md)
- **Completed:** 2026-09-06T08:39:19Z
- **Tasks:** 2/2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Closed GAP-02: the dialog-family close button no longer announces an English accessible name to French screen-reader users
- New `resolveDomLang()` helper reads `document.documentElement.lang` safely under SSR (the `sheet.tsx` primitive has no `"use client"` directive)
- Both vendored primitives changed by exactly 3 lines each (2 imports + 1 edited span) — icon, position, size and variant byte-identical to before
- Durability closed on two fronts per D-38-11: a pinning test (`tests/dialog-close-label.test.ts`) AND two new rows in `UI-CONVENTIONS.md`'s re-import table
- Non-vacuity of the new test empirically demonstrated, not assumed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add common.close.aria and consume it in dialog.tsx and sheet.tsx** - `f3d5680` (fix)
2. **Task 2: Pin the fix against re-import — test + UI-CONVENTIONS re-import rows** - `cdaa900` (test)

**Plan metadata:** (pending — final commit below)

## Files Created/Modified
- `src/lib/i18n/dictionaries.ts` - added `'common.close.aria': 'Fermer'` (FR) and `'common.close.aria': 'Close'` (EN), immediately after the existing `common.ht` key in each block
- `src/lib/i18n/dom-lang.ts` (new) - `resolveDomLang(): Lang`, SSR-guarded (`typeof document === 'undefined'` → `'fr'`), lowercases and narrows `document.documentElement.lang` to `'en' | 'fr'`
- `src/components/ui/dialog.tsx` - imports `t` and `resolveDomLang`; `<span className="sr-only">Close</span>` → `<span className="sr-only">{t('common.close.aria', resolveDomLang())}</span>`
- `src/components/ui/sheet.tsx` - identical change to dialog.tsx; file still carries no `"use client"` directive (unchanged, by design)
- `tests/dialog-close-label.test.ts` (new) - 5 source-assertion tests: no hardcoded `className="sr-only">Close<` in either file, both call `t('common.close.aria', resolveDomLang())`, and `dictionaries.ts` carries both FR and EN values
- `.planning/codebase/UI-CONVENTIONS.md` - two new rows in the "Vendored ReUI modifications to re-apply after any re-import" table (one per file), naming `tests/dialog-close-label.test.ts` as the after-the-fact gate. UIC-11 was deliberately NOT added here — that is plan 38-02's deliverable.

## Decisions Made
- Followed 38-CONTEXT.md's Claude's-Discretion resolution: `common.close.aria` as the key name, `.aria` suffix convention, `Fermer`/`Close` values (matching the existing `auth.modal.button.close` FR string without reusing that key).
- `resolveDomLang()` placed in `src/lib/i18n/` (non-vendored, ESLint-covered) rather than duplicated inline in each primitive — keeps the vendored diff minimal and the re-import row cheap to re-apply, per the plan's stated rationale.
- Test anchors on the code shape `className="sr-only">Close<` rather than the bare word `Close`, since both files legitimately contain `DialogClose`/`SheetClose`/`showCloseButton`/`data-slot` values containing that substring.

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 auto-fixes were needed; typecheck, lint, and the full test suite passed on the first attempt for both tasks.

## Issues Encountered

None.

**Build step explicitly skipped, per project constraint (not a deviation from this plan's own verification, which only requires typecheck/lint/test):** `.planning/phases/38-shell-dialogs-visual-conventions` execution context names `npm run build` in its `<verification>` block, but this repo's `.env.production.local` exists un-neutralised on disk, and the harness's `critical_project_constraints` explicitly forbid running `npm run build`/`npm run start` in that state (OPS-05: `@next/env` resolves `.env.production.local` at higher precedence than `.env.local`, silently pointing any NODE_ENV=production command at the production Neon database) — and state this specific plan "should not need a production build at all." `npm run typecheck`, `npm run lint:check`, and `npm run test` (full suite, 175 files / 2356 tests) all exit 0, which is the verification this plan's own `<acceptance_criteria>` blocks actually require per-task. Flagging rather than silently skipping, per instructions.

## Non-Vacuity Demonstration (D-38-11 requirement)

Per the plan's acceptance criteria: temporarily restored the literal `<span className="sr-only">Close</span>` in `src/components/ui/dialog.tsx`, re-ran the new suite, confirmed a non-zero exit, then reverted.

- **Before restoring the literal:** `npx vitest run tests/dialog-close-label.test.ts` → exit 0, 5/5 tests passing.
- **With the literal restored:** same command → **exit 1**, 2 failed / 3 passed. The two failures were exactly the expected ones: "dialog.tsx does not hardcode the English 'Close' sr-only span" and "dialog.tsx reads the close label from the FR/EN dictionary via resolveDomLang()". The `sheet.tsx` and `dictionaries.ts` assertions correctly kept passing (only `dialog.tsx` was mutated).
- **After reverting** (`cp` from a pre-mutation backup): `git diff --stat src/components/ui/dialog.tsx` showed zero changes, and the suite returned to exit 0, 5/5 passing.

This is empirical evidence the gate is not vacuous — it has been observed to fail on exactly the regression it exists to catch.

## FR/EN Verification Scope (D-38-12) — what this plan can and cannot claim

This plan is a **source-level** fix and test, not a browser-rendered verification. It can state with certainty (verified in code):
- `app/layout.tsx:56` sets `<html lang={lang}>` where `lang` comes from `getCurrentLang(): Promise<Lang>` (`src/lib/i18n/index.ts:19`) — so the DOM attribute is always exactly `'fr'` or `'en'`, matching `resolveDomLang()`'s expected input shape.
- `resolveDomLang()`'s narrowing logic (`document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'fr'`) correctly maps both possible values of that attribute to the corresponding `Lang`.
- The dictionary lookup `t('common.close.aria', 'fr')` returns `'Fermer'` and `t('common.close.aria', 'en')` returns `'Close'` — verified via the source-assertion test (both string literals are present and correctly paired in `dictionaries.ts`), not via a runtime `t()` call in this plan's test.

This plan does **not** claim to have observed the rendered FR/EN announcement in an actual browser (e.g., a screen reader or DevTools accessibility-tree inspection of a live dialog/sheet). Per `38-CONTEXT.md` D-38-12, that browser-level observation is explicitly plan 38-04's leg (one representative dialog + the mobile sidebar sheet, as part of the CLOSE-02 walk). Saying so here rather than claiming more than was verified.

## Verification Results

- `npm run typecheck` — exit 0
- `npm run lint:check` — exit 0 (run after both tasks; also independently confirmed after Task 1)
- `npx vitest run tests/dialog-close-label.test.ts` — exit 0, 5/5 passing (and exit 1 under the non-vacuity mutation, see above)
- `npm run test` (full suite) — exit 0, 175 files passed / 6 skipped, 2356 tests passed / 61 skipped
- `git diff --stat` on `dialog.tsx`/`sheet.tsx` — 3 changed lines per file (2 import additions + 1 edited span), matching the plan's acceptance criteria exactly
- All grep-based acceptance criteria in the plan (key counts, table row counts, UIC-11 absence, icon/use-client preservation) verified individually and matched expected values

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

GAP-02 is closed at the source level. Plan 38-04's browser walk (D-38-12) is the remaining leg that observes the rendered FR/EN announcement live — this plan supplies the fix and the durability gate it needs to certify. No blockers for 38-02/38-03/38-04.

---
*Phase: 38-shell-dialogs-visual-conventions*
*Completed: 2026-09-06*

## Self-Check: PASSED

- FOUND: src/lib/i18n/dom-lang.ts
- FOUND: tests/dialog-close-label.test.ts
- FOUND: .planning/phases/38-shell-dialogs-visual-conventions/38-01-SUMMARY.md
- FOUND: f3d5680 (Task 1 commit)
- FOUND: cdaa900 (Task 2 commit)
- FOUND: 09d5975 (Summary commit)
