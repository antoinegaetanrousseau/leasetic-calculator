---
phase: 43-new-pdf-layout
plan: 09
subsystem: pdf
tags: [react-pdf, hyphenation, i18n, testing, gap-closure]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-08's D-15 human visual pass verdict, which diagnosed Defect 1 (title-row hyphenation) to exact fix location, plus 43-VERIFICATION.md Gap 1's full diagnosis and missing[] list"
provides:
  - "Font.registerHyphenationCallback((word) => [word]) in document.tsx — disables @react-pdf/renderer's default mid-word hyphenator, so the FR/EN title only wraps at spaces"
  - "A falsified DOC-01 guard in layout.test.ts: two new describe-block cases asserting both the clean title phrase and the absence of the wrap-hyphen artifact per language, proven capable of failing by a deliberate revert"
  - "dehyphenate() removed — reconstructVisibleTextFontAware now returns unnormalised text, so every existing DOC-10 title-phrase assertion is a real guard instead of an assertion on a laundered string"
  - "A recorded process finding (rewritten file header comment): the hyphenation break was a real defect absorbed by two prior automated passes (43-05, 43-07), not 'already accepted' behavior"
affects: [43-10, 43-11, 43-12]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/lib/pdf/document.tsx
    - src/lib/pdf/layout.test.ts

key-decisions:
  - "DOC-01 is NOT marked complete by this plan, despite this plan closing exactly the one defect 43-VERIFICATION.md Gap 1 attributed to it (title-row hyphenation). Gap 1's own missing[] list also requires __pdf-fixtures__/expected.sha256.txt regeneration, which this plan deliberately does not do — the plan's own byte-determinism sequencing note defers all fixture regeneration to 43-12, after every byte-changing plan (43-09..43-12) has landed. Marking DOC-01 complete now, with a stale fixture baseline still in place, would be the exact 'frontmatter lists relevance, not ownership' mistake this project has been burned by before (see MEMORY.md gsd_plan_requirements_frontmatter_not_ownership). Requirement completion for DOC-01 is deferred to whichever plan lands the fixture regeneration."
  - "The file header comment naming the removed dehyphenate() helper uses backtick-quoted prose ('the `dehyphenate` helper') rather than a callable-looking form ('dehyphenate()'), so the plan's own literal grep gate (`! grep -q \"dehyphenate(\"`) passes while the comment still documents why the helper was removed, per the plan's explicit allowance for that."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-09-09
---

# Phase 43 Plan 09: Fix Title Hyphenation and Convert the Test Normaliser into a Guard Summary

**`Font.registerHyphenationCallback((word) => [word])` now disables react-pdf's default mid-word hyphenator, and `dehyphenate()` — the helper that silently laundered the defect out of the test suite for two prior plans — is gone, replaced by a DOC-01 guard proven capable of failing by a real RED→GREEN revert.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-09T16:07:00Z
- **Completed:** 2026-09-09T16:27:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Closed Gap 1 of `43-VERIFICATION.md`: registered `Font.registerHyphenationCallback((word) => [word])` beside the existing `Font.register` calls in `document.tsx`, the exact fix location diagnosed in `43-08-SUMMARY.md` Defect 1.
- Deleted `dehyphenate()` from `layout.test.ts` and its call site in `reconstructVisibleTextFontAware`, so the reconstructed text now preserves any wrap-hyphen break verbatim — every existing DOC-10 title-phrase assertion is a real guard, not an assertion on a laundered string.
- Added a new `DOC-01: the title never wrap-hyphenates` describe block with two cases (FR, EN), each asserting the clean title phrase AND the absence of the wrap-hyphen artifact via both `not.toContain` and `not.toMatch`.
- Rewrote the file's header comment to record the hyphenation break as the real defect it was — caught by Antoine's D-15 human pass after two automated passes (43-05, 43-07) absorbed it — rather than "already accepted" per the stale 43-05 note.
- Falsified the guard per the plan's mandatory Task 2 step 4: commenting out the hyphenation callback reproduced 4 failing tests; uncommenting restored all 17 green. Both outputs recorded verbatim below.

## Task Commits

1. **Task 1: Register the hyphenation callback that disables mid-word breaking** - `e2060ba` (fix)
2. **Task 2: Convert dehyphenate() from a normaliser into a DOC-01 guard, and falsify it** - `c3dd27b` (test)

**Plan metadata:** pending (this SUMMARY's own commit)

## Files Created/Modified

- `src/lib/pdf/document.tsx` - Added `Font.registerHyphenationCallback((word) => [word])` immediately after the existing `Font.register` call, with a comment block explaining the DOC-01/Gap-1 rationale, the module-load-global-state discipline, and the determinism guarantee.
- `src/lib/pdf/layout.test.ts` - Deleted `dehyphenate()` and its call site; added the `DOC-01: the title never wrap-hyphenates` describe block immediately before the `DOC-10` block; rewrote the file header comment recording the hyphenation break as a real, now-fixed defect instead of accepted behavior.

## RED→GREEN Falsification (Task 2 step 4, mandatory)

**RED — with `Font.registerHyphenationCallback` temporarily commented out in `document.tsx`:**

```
npx vitest run src/lib/pdf/layout.test.ts

 ❯ src/lib/pdf/layout.test.ts (10 tests | 4 failed) 999ms
   × DOC-01: the title never wrap-hyphenates (Gap 1, 43-VERIFICATION.md) > FR title renders "Proposition de location financière" with no wrap-hyphen break
     → DOC-01: FR title is missing the clean, unbroken phrase "Proposition de location financière":
       expected 'PROPOSITION N° LC-12345 Établie le 09…' to contain 'Proposition de location financière'
       Received: "...Proposition de location finan- cière Renouvellement postes commerciaux 2026..."
   × DOC-01: the title never wrap-hyphenates (Gap 1, 43-VERIFICATION.md) > EN title renders "Equipment lease financing proposal" with no wrap-hyphen break
     → DOC-01: EN title is missing the clean, unbroken phrase "Equipment lease financing proposal":
       Received: "...Equipment lease financing pro- posal Renouvellement postes commerciaux 2026..."
   × DOC-10: language parity ... > EN fixture renders every English label and the English legal paragraph, never an FR string
     → EN render is missing required phrase "Equipment lease financing proposal"
   × DOC-10: language parity ... > FR fixture renders every French label and the French legal paragraph, never an EN string
     → FR render is missing required phrase "Proposition de location financière"

 Test Files  1 failed (1)
      Tests  4 failed | 6 passed (10)
```

**GREEN — after reverting the comment-out (callback restored):**

```
npx vitest run src/lib/pdf/layout.test.ts src/lib/pdf/document.test.tsx

 ✓ src/lib/pdf/document.test.tsx (7 tests) 719ms
 ✓ src/lib/pdf/layout.test.ts (10 tests) 1155ms

 Test Files  2 passed (2)
      Tests  17 passed (17)
```

`git diff --stat src/lib/pdf/document.tsx` after the revert showed zero diff — confirming the temporary comment-out left no trace in the committed Task 1 state.

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: DOC-01 is not marked complete despite this plan closing its one attributed gap, because Gap 1's own `missing[]` list also requires the byte-determinism fixture regeneration that this plan deliberately defers to 43-12 (per the plan's own sequencing note). Marking the requirement complete now would misrepresent a partially-closed gap as fully closed.

## Deviations from Plan

None - both tasks executed exactly as written, including the mandatory falsification step. One wording adjustment was needed to satisfy the plan's own literal grep-based acceptance criteria (see second key-decision above) — not a deviation from the plan's intent, just a more precise way of satisfying a criterion the plan itself specified.

## Issues Encountered

- Initial comment wording above the hyphenation callback in `document.tsx` literally repeated the string `Font.registerHyphenationCallback`, which made `grep -c "Font.registerHyphenationCallback" src/lib/pdf/document.tsx` report `2` instead of the required `1`. Reworded the comment header to describe the callback without repeating the literal API name. Re-verified: `grep -c` now reports `1`.
- Similarly, the `DOC-01: the title never wrap-hyphenates` section-divider comment in `layout.test.ts` duplicated the describe block's title string, making `grep -c "DOC-01: the title never wrap-hyphenates"` report `2`. Reworded the comment to `DOC-01 guard: title wrap-hyphenation` so the literal phrase appears exactly once, in the `describe()` call itself. Re-verified: `grep -c` now reports `1`.
- Both were caught by running the plan's own acceptance-criteria commands before committing, not discovered after the fact.

## User Setup Required

None - no external service configuration required.

## Expected-Red Fixtures (D-16 sequencing, informational — not fixed here)

Per the plan's explicit instruction, `npm run pdf:update-fixture` was NOT run in this plan. Confirmed both byte-determinism fixture suites are now red as expected, because the hyphenation fix moves rendered bytes:

```
npx vitest run __pdf-fixtures__/render-fixtures.test.ts __pdf-fixtures__/commission-free-fixture.test.ts

 ✓ __pdf-fixtures__/commission-free-fixture.test.ts (5 tests) 208ms
 ❯ __pdf-fixtures__/render-fixtures.test.ts (4 tests | 3 failed) 347ms
   × PDF byte-determinism gate (PROP-17) > fixture "happy-path-fr" contentHash matches committed expected.sha256.txt
     → Byte-drift detected on fixture "happy-path-fr".
   × PDF byte-determinism gate (PROP-17) > fixture "happy-path-en" contentHash matches committed expected.sha256.txt
     → Byte-drift detected on fixture "happy-path-en".
   × PDF byte-determinism gate (PROP-17) > fixture "agent-commission-free" contentHash matches committed expected.sha256.txt
     → Byte-drift detected on fixture "agent-commission-free".

 Test Files  1 failed | 1 passed (2)
      Tests  3 failed | 6 passed (9)
```

This is the exact expected state per the plan's `<verification>` section. `commission-free-fixture.test.ts` (a separate suite from `render-fixtures.test.ts`) passed unaffected. `__pdf-fixtures__/expected.sha256.txt` remains byte-unchanged in git (`git diff --exit-code` exits 0) — confirmed after both task commits. Fixture regeneration happens exactly once, in plan 43-12, after 43-10 and 43-11 also land their byte-changing work.

## Next Phase Readiness

- Gap 1 (title hyphenation) of `43-VERIFICATION.md` is code-fixed and test-guarded. Its remaining `missing[]` item — fixture regeneration — is intentionally deferred to 43-12, not forgotten.
- Gap 2 (VOTRE CONTACT card semantics, DOC-03) and the clientSiret fixture/coverage gap (DOC-02/FIELD-01) from `43-VERIFICATION.md` remain fully open — untouched by this plan, as scoped.
- `npm run lint:check`, `npx tsc --noEmit`, and every non-fixture test suite touched by this plan's acceptance criteria (`layout.test.ts`, `document.test.tsx`, `no-commission.test.ts`, `admin-09-grep-contracts.test.ts`) are green.
- Phase 43 remains NOT closed — two more gap-closure plans (VOTRE CONTACT semantics, clientSiret coverage) and the fixture regeneration plan are still required before Phase 44's backfill can run.

## Self-Check: PASSED

- `e2060ba` confirmed in `git log --oneline --all`.
- `c3dd27b` confirmed in `git log --oneline --all`.
- `src/lib/pdf/document.tsx` confirmed on disk with `Font.registerHyphenationCallback((word) => [word]);` present exactly once.
- `src/lib/pdf/layout.test.ts` confirmed on disk with `dehyphenate(` absent (as a callable) and the `DOC-01: the title never wrap-hyphenates` describe block present exactly once.
- `git diff --exit-code __pdf-fixtures__/expected.sha256.txt` confirmed exit 0 after both commits — baseline untouched, per plan.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-09*
