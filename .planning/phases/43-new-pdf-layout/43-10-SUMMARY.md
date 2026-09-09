---
phase: 43-new-pdf-layout
plan: 10
subsystem: pdf
tags: [react-pdf, i18n, dictionaries, testing, gap-closure]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "43-08's D-15 human verdict diagnosing Gap 2 (VOTRE CONTACT card semantics) to exact fix location, dictionary-key list, and measured card-key-value-row geometry, plus 43-09's DOC-01 hyphenation fix and byte-determinism sequencing precedent"
provides:
  - "VOTRE CONTACT card restructured to two headlined entities — the partner (inputs.partnerName) headline over Partenaire/Téléphone rows, then the Leasetic advisor headline over Fonction/Téléphone/Email rows — closing the two-identically-labelled-Téléphone-rows confusion Antoine reported verbatim in 43-08-SUMMARY.md"
  - "pdf.card.contact.partner ('Partenaire'/'Partner') added to both dictionaries; pdf.card.contact.salesRep and pdf.card.contact.advisorName deleted, both landing in the same diff as their last t() consumer"
  - "A DOC-03 structural ordering guard in layout.test.ts (FR + EN) proving the partner/advisor split by render order via indexOf, with each anchor asserted present before the ordering comparison, plus absence assertions for the four deleted labels"
  - "DOC-10/DOC-11 label expectations updated to match the new dictionary; dictionaries.test.ts's key-count floor corrected for this plan's net -1-key-per-language change"
affects: [43-11, 43-12, 44-backfill]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/lib/i18n/dictionaries.ts
    - src/lib/pdf/document.tsx
    - src/lib/pdf/layout.test.ts
    - src/lib/i18n/dictionaries.test.ts

key-decisions:
  - "DOC-03 is NOT marked complete by this plan, despite this plan closing the exact card-semantics defect (Gap 2 of 43-VERIFICATION.md) that blocks it. Gap 2's own diagnosis folds in 'Finding 3' — the upstream partnerCo fallback in app/(authed)/proposals/new/parametres/page.tsx that can silently label a person as a company under the new explicit Partenaire row — and this plan's threat model (T-43-10-02) explicitly assigns that fix to plan 43-11, which is outside this plan's files_modified. Marking DOC-03 complete now, with that fallback still open, would repeat the exact 'frontmatter lists relevance, not ownership' mistake this project has been burned by before (see MEMORY.md gsd_plan_requirements_frontmatter_not_ownership and 43-09-SUMMARY.md's identical DOC-01 deferral for the same reason)."
  - "dictionaries.test.ts's key-count floor test was lowered from >=1072 to >=1071 (a file outside this plan's files_modified list). This is a Rule 3 auto-fix, not scope creep: deleting pdf.card.contact.salesRep and pdf.card.contact.advisorName while adding only pdf.card.contact.partner nets -1 key per language, which is a direct, mechanical consequence of Task 1's dictionary edit and was breaking the suite before any Task 2 work started."
  - "Two literal-grep near-misses were caught and reworded before commit, following the exact 43-09 precedent: the deletion-rationale comments in dictionaries.ts/document.tsx originally repeated the literal string 'salesRep', and the new DOC-03 describe block's header comment originally repeated its own describe() title verbatim — both made the plan's own `grep -c` acceptance gates report 2 instead of 1/0. Reworded to describe the same facts without repeating the literal string, verified with the plan's own commands before committing."

patterns-established:
  - "Ordering assertions on two indexOf() results must assert each index > -1 BEFORE comparing them — an assertion on two -1s passes vacuously. Named per-anchor error messages make the missing anchor immediately diagnosable rather than needing the test author to re-derive which side failed."

requirements-completed: []

# Metrics
duration: ~35min
completed: 2026-09-09
---

# Phase 43 Plan 10: Restructure the VOTRE CONTACT Card Into Two Headlined Entities Summary

**The VOTRE CONTACT card now renders two headlines — partner, then Leasetic advisor — over an explicitly labelled `Partenaire` row and four other key/value rows, replacing the single undifferentiated 6-row list that mixed two entities under one headline with two identically-labelled Téléphone rows.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-09T16:30:00Z (approx, from prior session context)
- **Completed:** 2026-09-09T16:33:00Z
- **Tasks:** 2
- **Files modified:** 4 (2 planned + 1 planned test file + 1 Rule-3 auto-fix)

## Accomplishments

- Closed Gap 2 of `43-VERIFICATION.md`: the VOTRE CONTACT card now headlines the partner
  (`inputs.partnerName`, via `emDash`) over a `Partenaire` row bound to `inputs.partnerCo` and a
  `Téléphone` row, then headlines the Leasetic advisor (`advisor?.name`, via `emDash`) over
  `Fonction`, `Téléphone` and `Email` rows — the exact 7-element structure Antoine specified
  verbatim in 43-08-SUMMARY.md, after his "delete salesRep" scope reduction.
- Deleted `pdf.card.contact.salesRep` and `pdf.card.contact.advisorName` from both FR and EN
  dictionaries in the same diff as their last `t()` consumer in `document.tsx`; added
  `pdf.card.contact.partner` ('Partenaire' / 'Partner').
- Replaced the stale D-04 "do NOT fix this back" comment (which now contradicted the code) with a
  comment naming 43-08-SUMMARY.md as the amending source.
- Added a `DOC-03` structural-ordering guard to `layout.test.ts`: FR and EN cases proving
  `partnerName < Partenaire/Partner label < advisor.name < (lastIndexOf) Email` via render-order
  `indexOf`, with each anchor asserted `> -1` before the ordering comparison (so the assertion
  cannot pass vacuously on two `-1`s), plus absence assertions for the four deleted labels
  (`Conseiller`, `Commercial`, `Advisor`, `Sales rep`).
- Updated `DOC-10`'s EN/FR required and forbidden phrase arrays and `DOC-11`'s label array to
  match the new dictionary, recounting (and correcting) the em-dash floor's derivation comment.
- Confirmed `expected.sha256.txt` is byte-unchanged in git and the two byte-determinism suites
  (`render-fixtures.test.ts`, `commission-free-fixture.test.ts`) are in the exact expected-red
  state per the plan's sequencing note — 43-12 regenerates the baseline once, after 43-11 also
  lands its byte-changing work.

## Task Commits

1. **Task 1: Restructure the VOTRE CONTACT card and move its dictionary keys in the same diff** - `bf0ac18` (fix)
2. **Task 2: Update the layout proof's label expectations and add a DOC-03 structural guard** - `8b4d400` (test)

**Plan metadata:** pending (this SUMMARY's own commit)

## Files Created/Modified

- `src/lib/i18n/dictionaries.ts` - Deleted `pdf.card.contact.salesRep` and
  `pdf.card.contact.advisorName` (FR + EN); added `pdf.card.contact.partner` ('Partenaire' /
  'Partner'); rewrote the block comment above the contact-card keys to record the D-15 amendment.
- `src/lib/pdf/document.tsx` - Replaced the single-headline/6-row VOTRE CONTACT structure with two
  headlines (both now `emDash`-wrapped) over 5 `CardKeyValueRow`s; replaced the stale D-04 comment.
- `src/lib/pdf/layout.test.ts` - Updated DOC-10 EN/FR required/forbidden arrays and DOC-11's label
  array for the new dictionary; added the `DOC-03` describe block with FR/EN ordering guards.
- `src/lib/i18n/dictionaries.test.ts` - Lowered the key-count floor from 1072 to 1071 to reflect
  this plan's net -1-key-per-language dictionary change (Rule 3 auto-fix, not in `files_modified`).

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: DOC-03 is not marked complete,
because Gap 2's own diagnosis (Finding 3, the `partnerCo` fallback in
`parametres/page.tsx`) is explicitly assigned to plan 43-11 by this plan's own threat model
(T-43-10-02), not closed here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lowered the dictionaries.test.ts key-count floor from 1072 to 1071**
- **Found during:** Task 1 verification (`npx vitest run src/lib/i18n/dictionaries.test.ts`)
- **Issue:** Deleting `pdf.card.contact.salesRep` and `pdf.card.contact.advisorName` while adding
  only `pdf.card.contact.partner` nets -1 key per language, dropping the FR/EN key count from 1072
  to 1071 and failing the suite's own hardcoded floor assertion — a direct, mechanical consequence
  of this task's own edit, not a pre-existing or unrelated failure.
- **Fix:** Lowered the floor to 1071 and rewrote its derivation comment to record the -1 from this
  plan (net two deletions, one addition) alongside the existing 43-05/43-06 derivation history.
- **Files modified:** `src/lib/i18n/dictionaries.test.ts`
- **Verification:** `npx vitest run src/lib/i18n/dictionaries.test.ts` — 393 tests pass.
- **Committed in:** `bf0ac18` (Task 1 commit)

**2. [Rule 1 - Bug] Reworded two comments that made the plan's own literal grep gates fail**
- **Found during:** Task 1 and Task 2 acceptance-criteria verification, before committing either
- **Issue:** (a) The dictionary/document.tsx deletion-rationale comments explaining why the sales-
  rep field was removed originally repeated the literal string `salesRep`, making
  `! grep -q "salesRep" ...` report a match on the comment itself rather than on dead code. (b) The
  new DOC-03 section-divider comment in `layout.test.ts` repeated its own `describe()` title
  verbatim, making `grep -c "DOC-03: the VOTRE CONTACT card separates" ...` report 2 instead of 1
  — the same class of near-miss 43-09 hit and fixed for `dehyphenate(` and the DOC-01 title.
- **Fix:** Reworded both comments to describe the same facts (a deleted sales-representative
  field/row; the DOC-03 guard's purpose) without repeating the literal grepped string, then
  re-verified the plan's own acceptance-criteria commands directly before committing.
- **Files modified:** `src/lib/i18n/dictionaries.ts`, `src/lib/pdf/document.tsx`,
  `src/lib/pdf/layout.test.ts`
- **Verification:** `! grep -q "salesRep" src/lib/i18n/dictionaries.ts`,
  `! grep -q "salesRep" src/lib/pdf/document.tsx`, and
  `grep -c "DOC-03: the VOTRE CONTACT card separates" src/lib/pdf/layout.test.ts` all now report
  the exact values the plan's acceptance criteria require.
- **Committed in:** `bf0ac18` (Task 1), `8b4d400` (Task 2)

**3. [Rule 1 - Bug] Corrected the DOC-03 EN test's `indexOf('Partner')` to search from the partner-name anchor, not from 0**
- **Found during:** Writing the DOC-03 EN ordering case (Task 2), before running the test
- **Issue:** The EN dictionary already contains the substring "Partner" inside the header's
  `pdf.pill.partnerRef` value ("Partner ref. · {0}"), which renders before the contact card. A
  naive `text.indexOf('Partner')` would match that header occurrence instead of the new
  `pdf.card.contact.partner` label, silently defeating the ordering assertion the task exists to
  add.
- **Fix:** Search for the label starting at `partnerNameIndex` (`text.indexOf('Partner',
  partnerNameIndex)`) instead of from the start of the string, with a comment explaining why.
- **Files modified:** `src/lib/pdf/layout.test.ts`
- **Verification:** `npx vitest run src/lib/pdf/layout.test.ts` — the new DOC-03 EN case passes
  and was manually confirmed to compare the correct occurrence.
- **Committed in:** `8b4d400` (Task 2)

**4. [Rule 1 - Bug] Corrected an inaccurate em-dash recount comment before committing**
- **Found during:** Task 2, drafting the DOC-11 em-dash floor comment update the plan's action
  section required
- **Issue:** A first draft of the recount claimed the new two-headline structure added one more
  em dash than before (12 -> 13), reasoning that both headlines are now `emDash`-wrapped. Tracing
  the actual max-absence fixture showed `partnerName`/`partnerCo` are never nulled by that test
  case, so the VOTRE CONTACT card's em-dash contribution is unchanged at 5 (only the advisor's
  four fields plus the merged phone row null out) — the total stays 12, matching the pre-existing
  comment, not 13.
- **Fix:** Corrected the comment to state the true count (12, unchanged) with the reasoning for
  why it didn't move, rather than leaving a plausible-sounding but wrong derivation in the test
  file. The floor assertion itself (`toBeGreaterThanOrEqual(10)`) was never changed.
- **Files modified:** `src/lib/pdf/layout.test.ts`
- **Verification:** `npx vitest run src/lib/pdf/layout.test.ts` passes; reasoning re-traced against
  `document.tsx`'s actual `emDash(...)` call sites and the fixture's actual nulled fields.
- **Committed in:** `8b4d400` (Task 2)

---

**Total deviations:** 4 auto-fixed (1 blocking test-floor fix, 2 literal-grep comment rewordings,
1 test-correctness fix caught before the test was ever run green on the wrong anchor)
**Impact on plan:** All four were direct, mechanical consequences of this plan's own edits,
caught and fixed before any task commit. No scope creep — no file outside the causal chain of
Task 1/Task 2's own changes was touched.

## Issues Encountered

None beyond the four auto-fixed items above, all resolved before their respective task commits.

## User Setup Required

None - no external service configuration required.

## Expected-Red Fixtures (D-16 sequencing, informational — not fixed here)

Per the plan's explicit instruction, `npm run pdf:update-fixture` was NOT run. Confirmed both
byte-determinism fixture suites are in the exact expected state — `render-fixtures.test.ts` red
(this plan moves rendered bytes further), `commission-free-fixture.test.ts` still green:

```
npx vitest run __pdf-fixtures__/render-fixtures.test.ts __pdf-fixtures__/commission-free-fixture.test.ts

 ✓ __pdf-fixtures__/commission-free-fixture.test.ts (5 tests) 208ms
 ❯ __pdf-fixtures__/render-fixtures.test.ts (4 tests | 3 failed) 934ms
   × PDF byte-determinism gate (PROP-17) > fixture "happy-path-fr" contentHash matches committed expected.sha256.txt
   × PDF byte-determinism gate (PROP-17) > fixture "happy-path-en" contentHash matches committed expected.sha256.txt
   × PDF byte-determinism gate (PROP-17) > fixture "agent-commission-free" contentHash matches committed expected.sha256.txt

 Test Files  1 failed | 1 passed (2)
      Tests  3 failed | 6 passed (9)
```

`git diff --exit-code __pdf-fixtures__/expected.sha256.txt` exits 0 — the committed baseline is
byte-unchanged. Fixture regeneration happens exactly once, in plan 43-12, after 43-11 also lands
its byte-changing work.

## Next Phase Readiness

- Gap 2 (VOTRE CONTACT card semantics) of `43-VERIFICATION.md` is code-fixed and test-guarded by
  the new DOC-03 ordering guard. Its remaining `missing[]` item — Finding 3's `partnerCo` fallback
  in `parametres/page.tsx` — is intentionally deferred to plan 43-11 per this plan's own threat
  model, not forgotten.
- `npm run lint:check`, `npx tsc --noEmit`, and every non-fixture test suite touched by this
  plan's acceptance criteria (`layout.test.ts`, `document.test.tsx`, `dictionaries.test.ts`,
  `no-commission.test.ts`, `admin-09-grep-contracts.test.ts`) are green (475 tests total across
  those five files).
- Phase 43 remains NOT closed — plan 43-11 (the `partnerCo` fallback decision) and the fixture
  regeneration plan (43-12) are still required before Phase 44's backfill can run.

## Self-Check: PASSED

- `bf0ac18` confirmed in `git log --oneline --all`.
- `8b4d400` confirmed in `git log --oneline --all`.
- `src/lib/i18n/dictionaries.ts` confirmed on disk: `salesRep`/`advisorName` absent as dictionary
  keys; `pdf.card.contact.partner` present twice (`'Partenaire'` FR, `'Partner'` EN).
- `src/lib/pdf/document.tsx` confirmed on disk: `salesRep`/`advisorName` absent; two `emDash(...)`
  headlines and 5 `CardKeyValueRow`s present in the VOTRE CONTACT block; stale D-04 "fix this back"
  comment absent.
- `src/lib/pdf/layout.test.ts` confirmed on disk: `'Conseiller'`/`'Sales rep'` absent as string
  literals; the DOC-03 describe block present exactly once.
- `git diff --exit-code __pdf-fixtures__/expected.sha256.txt` confirmed exit 0.

---
*Phase: 43-new-pdf-layout*
*Completed: 2026-09-09*
