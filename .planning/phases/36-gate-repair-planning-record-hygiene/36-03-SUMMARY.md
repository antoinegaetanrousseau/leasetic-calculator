---
phase: 36-gate-repair-planning-record-hygiene
plan: 03
subsystem: infra
tags: [reui, shadcn, cleanup, eslint, vitest, requirements-hygiene]

# Dependency graph
requires:
  - phase: 34-crm-stack-vendored-blocks
    provides: seven additional vendored ReUI blocks (solution-crm-1..6, solution-users-2) that inflated the 2026-08-31 audit count
provides:
  - Dated delete decision record at the head of docs/design/reui-blocks-audit.md
  - Deletion of src/components/blocks/ (25 directories, 152 files, 1.1M)
  - Cleaned exclusion references in two directory-walking tests
  - Corrected HOUSE-04 figures and an amended § Out of Scope record in .planning/REQUIREMENTS.md
affects: [40-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns: ["decision-record-before-deletion: write the reversibility artifact first, delete second"]

key-files:
  created: []
  modified:
    - docs/design/reui-blocks-audit.md
    - tests/container-radius.test.ts
    - tests/server-action-error-contracts.test.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "D-36-02 executed: deleted all 25 dead vendored ReUI block directories (152 files, 1.1M) rather than deferring, since reinstall is one command"
  - "Decision record prepended to docs/design/reui-blocks-audit.md before deletion, per the plan's ordering constraint, so the mapping stays reversible"
  - "eslint.config.mjs left untouched; its two now-inert 'src/components/blocks/**' ignores entries are recorded as a known residual rather than removed"
  - ".planning/REQUIREMENTS.md § Out of Scope amended in place (original sentence preserved) rather than rewritten, since D-36-02 is later and authoritative"

requirements-completed: [HOUSE-04]

# Metrics
duration: ~12min
completed: 2026-09-05
---

# Phase 36 Plan 03: Delete dead vendored ReUI blocks Summary

**Deleted 152 files (25 directories, 1.1M) of dead vendored ReUI blocks after recording a reversible decision record, with all four CI gates passing at an unchanged test count.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-05T16:18Z (approx, CEST)
- **Completed:** 2026-09-05T16:30Z (CEST)
- **Tasks:** 3 completed
- **Files modified:** 155 (152 deleted + 3 modified: 2 test files, 1 requirements doc) + 1 audit doc edit

## Accomplishments
- Prepended a dated, attributed decision record to `docs/design/reui-blocks-audit.md` stating the measured 25/152/1.1M scope (vs. the stale 2026-08-31 audit's 18/104/816K), the reinstall command, the untouched-`reui/` boundary, and the recorded `eslint.config.mjs` residual — written and committed *before* the deletion, as the plan required.
- Re-ran the zero-importer sweep at execution time: exactly the four expected non-import hits (`eslint.config.mjs:37`, `eslint.config.mjs:139`, `tests/container-radius.test.ts:72`, `tests/server-action-error-contracts.test.ts:45`), confirming the deletion was safe.
- Deleted `src/components/blocks/` via `git rm -r` (152 files staged as tracked deletions), leaving `src/components/reui/` (13 entries) and `src/components/ui/` byte-identical.
- Cleaned the two dead test references: `tests/container-radius.test.ts`'s `EXCLUDED_DIRS` no longer names a directory that doesn't exist (kept as an empty typed array with an updated comment); `tests/server-action-error-contracts.test.ts`'s skip condition keeps only the `components/reui` half.
- Ran the full four-gate battery (`typecheck`, `lint:check`, `test`, `build`) — all pass, with the test count unchanged (172 files / 2320 passed / 61 skipped, before and after).
- Amended `.planning/REQUIREMENTS.md` § Out of Scope in place (original sentence preserved) with a dated D-36-02 amendment, and corrected HOUSE-04's stale figures to the measured 25/152/1.1M with provenance of the old numbers.

## Task Commits

Each task was committed atomically (one extra fix-up commit was needed for Task 2 — see Deviations):

1. **Task 1: Prepend the dated delete decision record** - `b03de7d` (docs)
2. **Task 2: Delete src/components/blocks/** - `85c7304` (chore) + `226df5f` (test, fix-up)
3. **Task 3: Amend .planning/REQUIREMENTS.md** - `40fa3ba` (docs)

_No plan-metadata commit hash yet — created after this SUMMARY via the final_commit step._

## Files Created/Modified
- `docs/design/reui-blocks-audit.md` - Dated decision record prepended; "Nothing was deleted" sentence amended in place as historical
- `src/components/blocks/` (152 files) - Deleted (25 vendored ReUI block directories)
- `tests/container-radius.test.ts` - `EXCLUDED_DIRS` emptied, comment updated to point at the decision record
- `tests/server-action-error-contracts.test.ts` - Skip condition's `components/blocks` half removed; `components/reui` half intact
- `.planning/REQUIREMENTS.md` - § Out of Scope amended with dated D-36-02 clause; HOUSE-04 figures corrected with provenance

## Decisions Made
- Executed D-36-02 as locked in `36-CONTEXT.md`: delete rather than defer, because reinstall is a single `npx shadcn@latest add @reui/<block-name>` command per block.
- Left `eslint.config.mjs` untouched per the plan's explicit constraint; the two inert `ignores` entries are recorded as a known residual in the audit doc rather than removed.
- Amended (not rewrote) the `.planning/REQUIREMENTS.md` § Out of Scope sentence, preserving the original as history alongside the dated correction — consistent with how `.planning/ROADMAP.md` § Phase 36 criterion 4 was already amended.
- Left HOUSE-04's checkbox unflipped in Task 3's commit per the plan's own instruction ("marking HOUSE-04 complete is execute-phase's job, not this task's"); flipped separately in this executor's state-update step via the standard requirements-tracking mechanism, per the orchestrator's explicit instruction for this run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fix-up commit for dropped test-file staging in Task 2**
- **Found during:** Task 2 (verifying acceptance criteria after commit)
- **Issue:** `git add -A src/components/blocks tests/container-radius.test.ts tests/server-action-error-contracts.test.ts` was run as a single multi-pathspec command. The first pathspec (`src/components/blocks`) no longer matched any files on disk (already staged as deletions by the prior `git rm -r`), and `git add` aborted the entire invocation with a `fatal: pathspec ... did not match any files` error *before* staging the two trailing test-file pathspecs. The Task 2 commit therefore captured only the 152 deletions, silently dropping the two test-file edits the task required.
- **Fix:** Re-ran `git add` scoped only to the two test files and created a new commit (`226df5f`) carrying them, rather than amending the prior commit.
- **Files modified:** `tests/container-radius.test.ts`, `tests/server-action-error-contracts.test.ts`
- **Verification:** Post-commit `git status --short` clean; all Task 2 acceptance criteria (blocks gone, reui/ui untouched at 13 entries, zero `components/blocks` hits in `tests/`, `components/reui` half intact, eslint/package files untouched) re-verified against final HEAD.
- **Committed in:** `226df5f`

**2. [Rule 1 - Bug] Removed the literal string "components/blocks" from an explanatory code comment**
- **Found during:** Task 2 (acceptance criteria verification)
- **Issue:** My first draft of the updated skip-condition comment in `tests/server-action-error-contracts.test.ts` used the literal phrase "components/blocks" to explain what was removed. This tripped the plan's own acceptance grep (`grep -rn "components/blocks" tests/` must return no match), since a literal-string sweep can't distinguish a comment from a live reference.
- **Fix:** Reworded the comment to describe the change without using the `components/blocks` substring (e.g. "the vendored blocks half of this skip").
- **Files modified:** `tests/server-action-error-contracts.test.ts`
- **Verification:** `grep -rn "components/blocks" tests/` returns 0; `grep -c "components/blocks" tests/server-action-error-contracts.test.ts` returns 0.
- **Committed in:** `226df5f`

---

**Total deviations:** 2 auto-fixed (1 blocking staging error, 1 self-inflicted literal-string bug)
**Impact on plan:** Both were caused by my own execution missteps rather than gaps in the plan. No scope creep; final state matches every acceptance criterion in the plan.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Importer Sweep Result

Re-ran at execution time (2026-09-05), before deletion:
```
eslint.config.mjs:37:      'src/components/blocks/**',
eslint.config.mjs:139:      'src/components/blocks/**',
tests/container-radius.test.ts:72:const EXCLUDED_DIRS = ['src/components/blocks'];
tests/server-action-error-contracts.test.ts:45:    if (full.includes('components/reui') || full.includes('components/blocks')) continue;
```
Exactly the four expected hits, none an `import`/`from` statement. Deletion proceeded.

## Before/After `src/components/reui` Count

- **Before:** 13 entries
- **After:** 13 entries (untouched; `git status --porcelain src/components/reui src/components/ui` prints nothing)

## Deleted File Count

152 files across 25 block directories (`git status --porcelain -- src/components/blocks | grep -c '^D '` returned 152; `git rm -r` staged them as tracked deletions, confirmed in `git show --stat` for commit `85c7304`).

## Four Gate Results

| Gate | Result |
|---|---|
| `npm run typecheck` | Pass (exit 0, no output) |
| `npm run lint:check` | Pass (exit 0, no output — `eslint . --max-warnings=0`) |
| `npm test` | Pass — 172 test files (6 skipped, 178) / 2320 tests passed (61 skipped, 2381), identical before and after the deletion |
| `npm run build` | Pass (exit 0, full route manifest produced) |

## Next Phase Readiness
- HOUSE-04 is functionally closed: the decision record exists, the tree is deleted, gates are green, and `.planning/REQUIREMENTS.md` no longer contradicts the deletion.
- `eslint.config.mjs`'s two now-inert `'src/components/blocks/**'` globs remain as a recorded, deliberate residual — a future maintainer (not scoped to this phase) should remove them.
- No blockers for Phase 37 or later; this plan touched no product code, only vendored/dead assets and planning records.

---
*Phase: 36-gate-repair-planning-record-hygiene*
*Completed: 2026-09-05*

## Self-Check: PASSED

All claimed files exist and all claimed commits are present in git history:
- FOUND: docs/design/reui-blocks-audit.md
- FOUND: .planning/REQUIREMENTS.md
- FOUND: tests/container-radius.test.ts
- FOUND: tests/server-action-error-contracts.test.ts
- FOUND: src/components/blocks absent (expected)
- FOUND: b03de7d, 85c7304, 226df5f, 40fa3ba
