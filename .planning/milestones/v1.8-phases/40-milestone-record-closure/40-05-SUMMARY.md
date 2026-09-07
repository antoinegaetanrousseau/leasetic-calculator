---
phase: 40-milestone-record-closure
plan: 05
subsystem: infra
tags: [gsd, milestone-close, planning-docs, record-integrity]

requires:
  - phase: 40-03
    provides: "The fresh 2026-09-07 v1.6 milestone audit (34/34 requirements, 6/6 phases, tech_debt) whose 13 findings this plan transcribes verbatim into MILESTONES.md"
provides:
  - "A v1.6 — CRM Foundation entry in MILESTONES.md, chronologically placed between v1.7 and v1.5, with measured (not inherited) figures and a Known-gaps-at-close section"
  - "milestones/v1.6-ROADMAP.md — a v1.1-shaped, v1.6-scoped roadmap extract (399 lines vs v1.7's 779-line full-tree snapshot)"
  - "milestones/v1.6-REQUIREMENTS.md carrying the standard archive header (v1.4/v1.5 shape)"
  - "CLOSE-06 marked complete in REQUIREMENTS.md — the last two of its four clauses were this plan's job"
affects: [40-06]

tech-stack:
  added: []
  patterns: ["milestone-scoped-roadmap-extract (D-40-05): prior milestones collapse to one-line <details> bullets, only the closing milestone gets full Phase Details"]

key-files:
  created:
    - .planning/milestones/v1.6-ROADMAP.md
  modified:
    - .planning/MILESTONES.md
    - .planning/milestones/v1.6-REQUIREMENTS.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "Measured tests/typecheck/lint at the actual v1.6 git tag (bb91307) via an isolated `git worktree add --detach v1.6`, rather than reporting HEAD's current numbers or inheriting v1.5's/v1.7's — the plan explicitly required measured, not inherited, figures. Worktree removed after measurement; main tree untouched throughout."
  - "v1.6-ROADMAP.md's Archive note describes the phase-directory move as 'to be archived ... by Phase 40 plan 40-06' (future tense) rather than the plan's suggested past-tense 'were archived ... on 2026-09-07', since 40-06 had not yet run when this plan executed and CLOSE-07 (the git mv) is explicitly 40-06's job, not this plan's, per the requirements_marking_caution."
  - "CLOSE-06 marked complete: verified its full four-clause text in REQUIREMENTS.md against what now exists — (1) MILESTONES.md entry: this plan; (2) v1.6-ROADMAP.md + v1.6-REQUIREMENTS.md snapshots: this plan; (3) audit re-run against the finished milestone: already done by plan 40-03; (4) ROADMAP.md no longer shows v1.6 as IN PROGRESS: already fixed by plan 40-01 (root ROADMAP.md already reads '✅ SHIPPED 2026-09-04' at both the milestone-list and phase-detail levels). All four clauses now hold, so the requirement was marked complete rather than left pending."

patterns-established:
  - "milestone-scoped-roadmap-extract: v1.1-ROADMAP.md is the shape precedent (collapsed <details> per prior milestone, Phase Details only for the closing milestone's own phases); v1.7-ROADMAP.md/v1.7-REQUIREMENTS.md remain the known anti-pattern, explicitly not touched by this plan"

requirements-completed: [CLOSE-06]

duration: 40min
completed: 2026-09-07
---

# Phase 40 Plan 05: v1.6 Milestone Entry and Archive Pair

**Wrote v1.6's `MILESTONES.md` entry (measured figures, 13-finding Known-gaps section transcribed from the 2026-09-07 audit) and completed its archive pair — a new v1.1-shaped `v1.6-ROADMAP.md` and a standard archive header on the existing `v1.6-REQUIREMENTS.md` — closing CLOSE-06.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified — including `REQUIREMENTS.md` for the CLOSE-06 tick)

## Accomplishments

- Inserted a full `## v1.6 — CRM Foundation` entry into `MILESTONES.md` between the v1.7 and v1.5 entries, chronologically correct, with all eight standard field labels populated from measurements taken during this plan (not copied from neighboring entries).
- Transcribed all 13 tech-debt findings from `40-03-SUMMARY.md` / `v1.6-MILESTONE-AUDIT.md` into a `### Known gaps at close` section — one bullet per finding, none added, none softened.
- Created `.planning/milestones/v1.6-ROADMAP.md` (399 lines) in the `v1.1-ROADMAP.md` scoped shape: v1.0-v1.5 collapsed into their existing one-line `<details>` blocks (lifted verbatim from root `ROADMAP.md`), full `## Phase Details` for phases 29/30/31/31.1/32(removed)/33/34 only, and a `## Progress` table carrying only the v1.6-scoped rows (28 through 34).
- Prepended the missing archive header to `.planning/milestones/v1.6-REQUIREMENTS.md`, matching `v1.5-REQUIREMENTS.md`'s exact shape, leaving its 258-line body untouched (267 lines total after the 9-line header).
- Verified CLOSE-06's full requirement text against the state of the repo after this plan's two artifacts landed, confirmed all four of its clauses now hold, and marked it complete in `REQUIREMENTS.md` (CLOSE-07 left `[ ]` — that is plan 40-06's job).

## Task Commits

1. **Task 1: Write the v1.6 entry in MILESTONES.md** - `f11c7d2` (docs)
2. **Task 2: Create milestones/v1.6-ROADMAP.md as a v1.6-scoped extract** - `7080edd` (docs)
3. **Task 3: Give milestones/v1.6-REQUIREMENTS.md the standard archive header** - `c4f74e7` (docs)

## Files Created/Modified

- `.planning/MILESTONES.md` — new `## v1.6 — CRM Foundation` entry (139 lines added, 0 deleted) plus a dated D-40-04 note below the file's H1 recording that v1.2/v1.3 still have no entry
- `.planning/milestones/v1.6-ROADMAP.md` — created, 399 lines, v1.1-shaped scoped extract
- `.planning/milestones/v1.6-REQUIREMENTS.md` — 9-line archive header prepended, body unchanged (258 → 267 lines)
- `.planning/REQUIREMENTS.md` — CLOSE-06 checkbox and traceability row flipped to complete (via `requirements.mark-complete`, outside the three plan tasks, done after verifying the requirement's full text)

## Decisions Made

See `key-decisions` in frontmatter. In addition:

- **Measurement method for Tests/typecheck/lint:** rather than either inheriting v1.5's or v1.7's numbers, or reporting the current working tree's numbers (which reflect Phase 40's own later work, not v1.6), I created a disposable `git worktree add --detach v1.6` at `/private/tmp/.../scratchpad/v16-check`, ran `npm install` + `vitest run` + `tsc --noEmit` + `eslint --max-warnings=0` there, recorded the results (2254 passing / 52 skipped / 0 failed, typecheck clean, lint clean), and removed the worktree afterward (`git worktree remove --force`). The main working tree was never touched by this measurement.
- **Git range:** `git rev-parse --short v1.5` / `v1.6` gave `14d6996` and `bb91307`; `git log --oneline v1.5..v1.6 | wc -l` gave 362 commits; `git diff --shortstat v1.5 v1.6` gave `840 files changed, 166235 insertions(+), 5059 deletions(-)`.
- **Plan↔Summary parity:** counted `*-PLAN.md` and `*-SUMMARY.md` files directly in each of the six phase directories (29, 30, 31, 31.1, 33, 34) rather than trusting ROADMAP.md's stated plan counts. Result: 48 PLAN.md / 48 SUMMARY.md in every phase, matching the ROADMAP sum (2+9+8+7+9+13=48) exactly.
- **Phase 32 / Phase 28 accounting:** the "6 phases" figure in the entry's field block counts only 29, 30, 31, 31.1, 33, 34 (the phases planned and verified through the GSD workflow). Phase 32 (removed) and Phase 28 (retro-documented, outside the workflow) are both named explicitly in the entry's prose immediately below the field block, per the plan's instruction not to fold either into the count silently.

## Deviations from Plan

**1. [Informational — safer wording, not a plan violation] Archive note uses future tense for the phase-directory move**

- **Found during:** Task 1, drafting the `### Archive` section
- **Issue:** The plan's action text suggests writing "the phase directories were archived to `milestones/v1.6-phases/` by Phase 40 plan 40-06 on 2026-09-07" — past tense, as if already done. At the time this plan (40-05) executed, plan 40-06 had not yet run; the `requirements_marking_caution` in this plan's own dispatch instructions explicitly states CLOSE-07 (the git mv) "must stay pending" and is 40-06's job.
- **Fix:** Wrote the sentence in future tense — "are to be archived ... by Phase 40 plan 40-06" — so the entry does not assert a completed action that has not happened yet. No acceptance criterion tests the exact tense of this sentence; the literal strings the automated checks require (`milestones/v1.6-ROADMAP.md`, `milestones/v1.6-REQUIREMENTS.md`, etc.) are all present.
- **Files modified:** `.planning/MILESTONES.md` (Task 1, same commit `f11c7d2`)
- **Impact:** None on the plan's automated gates. Improves factual accuracy; flagging here so a future editor updates this sentence to past tense once 40-06 actually completes the archive move, if the wording still reads oddly at that point.

**2. [Rule 2 — completed a requirement the plan's frontmatter named but a prior plan intentionally deferred] Marked CLOSE-06 complete**

- **Found during:** Task 3 wrap-up, per the `requirements_marking_caution` in this plan's dispatch
- **Issue:** Plan 40-03 explicitly left CLOSE-06 `[ ]` pending, noting "plan 40-05 transcribes the findings" and completes it. This plan's own frontmatter lists `requirements: [CLOSE-06]`.
- **Fix:** Read CLOSE-06's full text in `.planning/REQUIREMENTS.md` (not just its frontmatter mention), confirmed all four of its clauses now hold — MILESTONES.md entry (this plan), `v1.6-ROADMAP.md` + `v1.6-REQUIREMENTS.md` snapshots (this plan), audit re-run (40-03), ROADMAP.md no longer IN PROGRESS (40-01, confirmed by grep — the only remaining "IN PROGRESS" string in ROADMAP.md is inside Phase 40's own success-criteria prose, not attached to v1.6) — and ran `requirements.mark-complete CLOSE-06`.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `grep -n 'CLOSE-06\|CLOSE-07' .planning/REQUIREMENTS.md` shows CLOSE-06 as `[x]` / Complete and CLOSE-07 still `[ ]` / Pending.

**Total deviations:** 2, both informational/expected — no auto-fixed bugs or blocking issues encountered.
**Impact on plan:** None negative. Both are the plan's own caution notes being followed as instructed.

## Issues Encountered

- The `Edit` tool's exact-string match failed once on text containing an em-dash (`—`) despite Python confirming byte-identical content against the file (`scope stated above.\n\n## v1.5 ...`). Worked around by inserting the v1.6 entry via a small Python script operating on the file's UTF-8 content directly, then re-verifying with `grep`/`git diff` that the insertion was purely additive. No impact on the final file content.
- The v1.6-ROADMAP.md draft initially assembled to 403 lines, 3 over the plan's <400 requirement (v1.1's precedent is 167; v1.7's anti-pattern is 779). Trimmed the reconstruction-header prose and removed a few redundant blank lines to land at 399.
- `gsd-sdk query state.record-session` returned `{"recorded": false, "reason": "No session fields found in STATE.md"}` — non-fatal; `state.advance-plan` and `state.record-metric` both succeeded and updated STATE.md's Current Position and metrics.
- `gsd-sdk query state.update-progress` returned `{"updated": false, "reason": "Progress field not found in STATE.md"}` — non-fatal, same as above; STATE.md's frontmatter `progress:` block was left as-is.

## Next Phase Readiness

- CLOSE-06 is complete. CLOSE-07 (git-mv phases 28-35, plus attributing Phase 28 in ROADMAP.md's phase table) remains `[ ]`, correctly left for plan 40-06.
- `milestones/v1.6-ROADMAP.md` and `milestones/v1.6-REQUIREMENTS.md` now exist as a complete archive pair; plan 40-06 can move `.planning/phases/{28,29,30,31,31.1,33,34}` into `milestones/v1.6-phases/` without first needing to reconstruct either snapshot.
- `git status --porcelain .planning/milestones/v1.7-ROADMAP.md .planning/milestones/v1.7-REQUIREMENTS.md` is empty — v1.7's mis-snapshotted pair was correctly left untouched, per this phase's explicit out-of-scope note.
- No blockers.

---
*Phase: 40-milestone-record-closure*
*Completed: 2026-09-07*

## Self-Check: PASSED

- FOUND: `.planning/MILESTONES.md`
- FOUND: `.planning/milestones/v1.6-ROADMAP.md`
- FOUND: `.planning/milestones/v1.6-REQUIREMENTS.md`
- FOUND: `.planning/phases/40-milestone-record-closure/40-05-SUMMARY.md`
- FOUND commit: `f11c7d2` (Task 1 — MILESTONES.md v1.6 entry)
- FOUND commit: `7080edd` (Task 2 — v1.6-ROADMAP.md)
- FOUND commit: `c4f74e7` (Task 3 — v1.6-REQUIREMENTS.md archive header)
- FOUND commit: `0375388` (plan-metadata commit — SUMMARY + STATE + ROADMAP + REQUIREMENTS)
- Confirmed pre-existing untracked files from the prior audit session (3 `*-VALIDATION.md`, `v1.8-MILESTONE-AUDIT.md`, 8 `tests/*` files) remain untouched and unstaged throughout
