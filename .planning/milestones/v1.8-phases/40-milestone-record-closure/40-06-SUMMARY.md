---
phase: 40-milestone-record-closure
plan: 06
subsystem: planning-record
tags: [git-mv, archive, vitest, resolvePhaseDoc, requirements-closure]

requires:
  - phase: 40-milestone-record-closure
    provides: "40-04 (OPS/GAP/HOUSE ticks) and 40-05 (v1.6 MILESTONES.md entry + v1.6-ROADMAP.md/v1.6-REQUIREMENTS.md snapshots) — the closed-milestone record this plan archives phases against"
provides:
  - "Phases 28, 29, 30, 31, 31.1, 33, 34 archived under .planning/milestones/v1.6-phases/; phase 35 under .planning/milestones/v1.7-phases/"
  - ".planning/phases/40-milestone-record-closure/40-ARCHIVE-MAP.md — the phase→milestone map plus the path-reference rewrite disposition"
  - "Three test suites (planning-docs-resolver, phase-38-closure-artifacts, probe-write-isolation-contracts) repaired to assert the post-archive layout"
  - "D-40-09 amended in place in 40-CONTEXT.md, narrowing the path-rewrite scope with dated, measured evidence"
  - "CLOSE-06 and CLOSE-07 both closed in REQUIREMENTS.md — no traceability row reads Pending"
affects: [future-milestone-planning, v1.9-audit]

tech-stack:
  added: []
  patterns: ["git mv against a written-first phase→milestone map", "resolvePhaseDoc() phase-number resolution instead of literal path assertions", "amend-in-place with dated parenthetical, original preserved"]

key-files:
  created:
    - .planning/phases/40-milestone-record-closure/40-ARCHIVE-MAP.md
    - .planning/milestones/v1.6-phases/ (7 archived phase directories)
    - .planning/milestones/v1.7-phases/ (1 archived phase directory)
  modified:
    - tests/planning-docs-resolver.test.ts
    - tests/phase-38-closure-artifacts.test.ts
    - tests/probe-write-isolation-contracts.test.ts
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md
    - .planning/phases/40-milestone-record-closure/40-CONTEXT.md

key-decisions:
  - "Phases moved by hand git mv against an explicit map written first, not the GSD archiving CLI (D-40-08 — the CLI mis-attributed every phase on disk in v1.7)."
  - "D-40-09 amended in place (not merely disclosed): rewrite scope narrowed to Phase 40's own live documents plus forward-read references in phases 36-39, excluding already-executed PLAN/SUMMARY/VERIFICATION/PATTERNS records in 36-39."
  - "Measured 258 hits/32 files at Task 3 (vs. the 225/21 planning-time figure) — the gap is this plan's own 40-06-PLAN.md and 40-ARCHIVE-MAP.md, both of which cite pre-move paths by design and did not exist at planning time."

patterns-established:
  - "Archive-resilient tests resolve by phase number (resolvePhaseDoc) rather than asserting a literal .planning/phases/<slug> path, so a future archive move does not require another test repair."

requirements-completed: [CLOSE-07, CLOSE-06]

duration: ~55min
completed: 2026-09-07
---

# Phase 40 Plan 06: Archive Phases 28-35, Repair Three Test Suites, Close CLOSE-06/CLOSE-07 Summary

**Eight phase directories moved by hand `git mv` into their milestone archives, three tests
repaired to assert the post-move layout, D-40-09 amended in place with measured evidence, and
CLOSE-06/CLOSE-07 both ticked — leaving no `Pending` row in the requirements traceability table.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3/3 completed
- **Files modified/moved:** 152 files renamed (8 directories) + 3 test files + 5 planning docs (1 new)

## Accomplishments

- Archived phases 28, 29, 30, 31, 31.1, 33, 34 to `.planning/milestones/v1.6-phases/` and phase
  35 to `.planning/milestones/v1.7-phases/` via `git mv`, preserving every file (renames, not
  add+delete pairs) and leaving `.planning/phases/` holding exactly the five phases (36-40) a
  current/future milestone still needs.
- Repaired the four assertions across three test suites that hardcoded the pre-archive path;
  `npm test` (2572 passed / 61 skipped / 0 failed) is standing proof `resolvePhaseDoc()` found no
  document left behind in both the old and new locations.
- Amended D-40-09 in `40-CONTEXT.md` in place (original sentence preserved verbatim) to narrow
  the path-reference rewrite boundary, with the measured hit-count evidence recorded both in the
  decision itself and in `40-ARCHIVE-MAP.md`'s new disposition section.
- Closed CLOSE-06 and CLOSE-07 in `REQUIREMENTS.md` with dated D-ref pointers; the traceability
  table now has zero `Pending` rows.

## Task Commits

1. **Task 1a: Write the archive map before any move** - `e3a5306` (docs)
2. **Task 1b: git mv the eight phase directories** - `c3f3df1` (docs)
3. **Task 2: Repair the three test suites** - `16c60bc` (test)
4. **Task 3: Sweep live references, amend D-40-09, close CLOSE-06/CLOSE-07** - `7033582` (docs)

_Task 1 split across two commits per the plan's own sequencing requirement (map must precede the
move in git history, verified by `git log --diff-filter=A`)._

## Files Created/Modified

- `.planning/phases/40-milestone-record-closure/40-ARCHIVE-MAP.md` - phase→milestone map (written
  before the move) plus the Path-reference rewrite disposition section (added in Task 3)
- `.planning/milestones/v1.6-phases/{28,29,30,31,31.1,33,34}-*/` - 7 archived phase directories,
  135 files, full file sets intact (Phase 28's 2-file shape preserved, not fabricated)
- `.planning/milestones/v1.7-phases/35-sales-motivation/` - 1 archived phase directory, 17 files
- `tests/planning-docs-resolver.test.ts` - four-real-documents test renamed to describe the
  post-CLOSE-07 layout; both it and the decimal test's real-repo half now expect
  `MILESTONE_ARCHIVES_DIR/v1.6-phases/...` instead of `LEGACY_PHASES_DIR/...`
- `tests/phase-38-closure-artifacts.test.ts` - the 31.1-VERIFICATION.md literal-path expectation
  flipped to `MILESTONE_ARCHIVES_DIR/v1.6-phases/...`; failure-message prose updated to name the
  archive directory
- `tests/probe-write-isolation-contracts.test.ts` - contract H now calls
  `resolvePhaseDoc(29, '29-VALIDATION.md')` instead of a literal pre-move path, making the
  contract survive any future archive move
- `.planning/ROADMAP.md` - line ~746's `.planning/phases/33-pipeline/...` reference repointed to
  the archive
- `.planning/STATE.md` - the stale "do not touch phases 28..35" instruction replaced with a dated
  record of the 2026-09-07 archive move, pointing at `40-ARCHIVE-MAP.md`
- `.planning/REQUIREMENTS.md` - CLOSE-06 and CLOSE-07 both ticked with dated D-ref pointers;
  CLOSE-07's traceability row flipped `Pending` → `Complete`
- `.planning/phases/40-milestone-record-closure/40-CONTEXT.md` - D-40-09 amended in place (append
  only — `git diff` shows no `-` line removing original prose)

## Decisions Made

- **The `tests/_planning-docs.ts` shared helper needed no change.** It imports nothing from the
  three repaired test files and was already archive-resilient by design (its own docblock
  forbids "simplifying" it back to a literal path). `git diff --name-only tests/_planning-docs.ts`
  is empty.
- **`tests/phase-37-closure-artifacts.test.ts` needed no repair** — it already used
  `readPhaseDoc()`/`resolvePhaseDoc()` rather than a literal path, per its own precedent role.
  `git diff --name-only tests/phase-37-closure-artifacts.test.ts` is empty.
- **The nine untracked files not named in this plan's `files_modified` were left untouched**,
  per the working-tree note: `36/37/38-VALIDATION.md`, `v1.8-MILESTONE-AUDIT.md`, and five other
  test files (`tests/_planning-docs.ts` itself needed no edit so it stayed untracked;
  `button-focus-conventions.test.ts`, `phase-37-closure-artifacts.test.ts`,
  `reui-blocks-deletion.test.ts`, `seed-script-registration.test.ts`) remain untracked and
  uncommitted, as instructed — they belong to a different, prior audit session's scope.
- **Measured path-reference population differs from the planning-time estimate (258/32 vs.
  225/21)** because this plan's own `40-06-PLAN.md` (21 hits — instructions describing the
  pre-move git-mv map) and the newly created `40-ARCHIVE-MAP.md` (8 hits — a deliberate
  before/after table) did not exist when the 225/21 figure was measured. Recorded both in the
  D-40-09 amendment and in `40-ARCHIVE-MAP.md`'s disposition section, with the real number stated
  and the discrepancy explained rather than silently using the stale figure.
- **None of Phase 40's own 36 hits/7 files were rewritten.** `40-01-PLAN.md` and `40-03-PLAN.md`
  are already-executed dated records accurate to the pre-move layout at their own execution time;
  `40-06-PLAN.md` is this plan's own executing instructions, not a forward pointer that must stay
  resolvable; `40-ARCHIVE-MAP.md` deliberately lists both old and new paths per row; and the
  remaining hits in `40-CONTEXT.md`/`40-DISCUSSION-LOG.md`/`40-PATTERNS.md` are the pre-existing
  stale `30-crm-foundation` mention, already flagged out of scope by D-40-09 itself.

## Deviations from Plan

None — plan executed exactly as written. All measured file counts (28→2, 29→10, 30→24, 31→22,
31.1→20, 33→24, 34→32, 35→17) matched the plan's predicted counts exactly, with no discrepancy to
record for Task 1. The only number that diverged from the plan's stated figure was the Task 3
path-reference population (258/32 vs. the plan's stated 225/21), which the plan itself
anticipated might differ ("record the real one; do not force it to match" / "if it differs, and
say so") — handled as instructed, not as a deviation from the plan's process.

## Verification

- `ls .planning/phases/` → exactly `36-gate-repair-planning-record-hygiene`,
  `37-crm-stack-closure`, `38-shell-dialogs-visual-conventions`, `39-database-guard-correctness`,
  `40-milestone-record-closure`
- `ls .planning/milestones/v1.6-phases/` → 7 directories; `ls .planning/milestones/v1.7-phases/`
  → 1 directory
- `npm test` → 193 test files passed, 6 skipped; 2572 tests passed, 61 skipped, 0 failed — run
  AFTER the archive move, confirming `resolvePhaseDoc()` found no document in both the pre- and
  post-move locations
- `npx tsc --noEmit` → clean
- `npm run lint:check` (`eslint . --max-warnings=0`) → clean
- `git status --porcelain` → all 152 moved files show as `R` (rename), none as add+delete pairs
- `grep -cE '\.planning/phases/(2[89]|3[0-5])' .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md` → `0` for each file
- `grep -cE '^\| [A-Z]+-[0-9]+ \| Phase [0-9]+ .* \| Pending \|' .planning/REQUIREMENTS.md` → `0`
- `git diff --name-only -- src app scripts` → empty
- `git diff .planning/MILESTONES.md` → empty (the v1.7 Archive note is an untouched dated record)

## Known Stubs

None. This plan touches only planning documents and test assertions; no application code or UI
surface was created.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or schema change was introduced —
this plan relocates markdown and repairs three test files' path expectations, matching the
threat model's own framing ("No runtime code path, route, database query or dependency changes").

## Note on STATE.md progress frontmatter

Running the standard `state.advance-plan` SDK command dropped STATE.md's frontmatter
`completed_phases` (11→5) and `total_plans`/`completed_plans` (79/77→26/26) as a side effect of
archiving phases 28-35 out of `.planning/phases/` — the progress scanner counts phase/plan
SUMMARY files under that directory and no longer sees the archived ones under
`.planning/milestones/*-phases/`. `total_phases` (25) was left unchanged, so the two fields are
now inconsistent with each other. This mirrors, in the SDK's own state tracker, the same class of
attribution bug D-40-08 already routes around in the GSD archiving CLI — it lives in the
toolchain, not this repo, and fixing it is out of this record-closure plan's scope. Not
hand-edited to avoid asserting an invented number; recorded here for a future milestone-tooling
fix to pick up.

## Self-Check: PASSED

All 8 created/modified artifacts verified present on disk (40-ARCHIVE-MAP.md, 28-01-SUMMARY.md
at its new archive path, 31.1-VERIFICATION.md at its new archive path, 35-CONTEXT.md at its new
archive path, all 3 repaired test files, this SUMMARY). All 4 task commit hashes (`e3a5306`,
`c3f3df1`, `16c60bc`, `7033582`) confirmed present in `git log --oneline --all`.
