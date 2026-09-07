---
phase: 40-milestone-record-closure
plan: 03
subsystem: infra
tags: [gsd, milestone-audit, planning-docs, record-integrity]

requires:
  - phase: 40-01
    provides: "ROADMAP.md corrections (v1.6 SHIPPED header, Phase 28 retro-documented flag, Phase 31.1 row) that the auditor reads before scoring the milestone"
provides:
  - "A v1.6 milestone audit measured 2026-09-07 against the finished milestone (34/34 requirements, 6/6 phases, 27/27 integration, 6/6 flows, status tech_debt)"
  - "The 2026-09-01 stale audit preserved verbatim at .planning/milestones/v1.6-MILESTONE-AUDIT-SUPERSEDED.md with a dated supersede header"
  - "`.planning/` root holding exactly one *-MILESTONE-AUDIT.md file: v1.8's (in-progress)"
affects: [40-05, 40-06]

tech-stack:
  added: []
  patterns: ["amend-in-place-with-dated-parenthetical, reused for a supersede header (no prior precedent in this repo for a superseded-audit marker)"]

key-files:
  created:
    - .planning/milestones/v1.6-MILESTONE-AUDIT-SUPERSEDED.md
  modified:
    - .planning/v1.6-MILESTONE-AUDIT.md (auditor overwrite, then git mv to .planning/milestones/v1.6-MILESTONE-AUDIT.md)

key-decisions:
  - "Inserted the supersede header immediately below the stale audit's closing frontmatter `---` rather than above it, per the plan's fallback instruction, to keep the file's YAML frontmatter parseable at position 1."
  - "Recovered the stale 2026-09-01 body via `git show HEAD:.planning/v1.6-MILESTONE-AUDIT.md` rather than the plan's suggested `c34aa3c` — confirmed identical (`git diff c34aa3c:... HEAD:...` empty) before use, since no commit touched the file between c34aa3c and HEAD."

patterns-established: []

requirements-completed: [CLOSE-06]

duration: 25min
completed: 2026-09-07
---

# Phase 40 Plan 03: v1.6 Milestone Audit Re-run and Custody Summary

**Fresh `/gsd-audit-milestone v1.6` scores the finished milestone at 34/34 requirements, 6/6 phases, 27/27 integration, 6/6 flows — status `tech_debt` (record-keeping debt only, zero functional gaps) — filed beside v1.1's and v1.4's audits with the stale 2026-09-01 run preserved and marked superseded.**

## Performance

- **Duration:** ~25 min (continuation from Task 2 checkpoint)
- **Tasks:** 3 (1 pre-flight guard, 1 human-action checkpoint, 1 custody)
- **Files modified:** 2 (1 created, 1 moved+modified)

## Accomplishments
- Confirmed (Task 1, prior executor) that plan 40-01's ROADMAP.md corrections were in place before the auditor ran, so the audit measured the corrected roadmap state.
- Operator ran `/gsd-audit-milestone v1.6` (Task 2) in the main session — the auditor overwrote `.planning/v1.6-MILESTONE-AUDIT.md` in place with a fresh 2026-09-07 measurement.
- Filed both the fresh and superseded audits into `.planning/milestones/`, recovering the stale body from git history and leaving `.planning/` root holding only the in-progress v1.8 audit.

## Task Commits

1. **Task 1: Pre-flight guard** - (prior executor turn, no commit — read-only assertion task)
2. **Task 2: Operator runs `/gsd-audit-milestone v1.6`** - `e796ecb` (docs) — commits the auditor's fresh output
3. **Task 3: Audit custody** - `25e9cd0` (docs) — files both audits into `.planning/milestones/`

## Files Created/Modified
- `.planning/milestones/v1.6-MILESTONE-AUDIT.md` — the fresh audit (moved from `.planning/` root via `git mv`)
- `.planning/milestones/v1.6-MILESTONE-AUDIT-SUPERSEDED.md` — the recovered 2026-09-01 audit body, verbatim, with a dated supersede header inserted below its frontmatter

## Decisions Made
- Supersede header placement: below the frontmatter's closing `---`, not above it, so any tool that expects YAML frontmatter at file position 1 still parses correctly. Header states the supersession date (2026-09-07), cites `D-40-01 (Phase 40)`, links to the replacement file, and gives a one-sentence reason (written before Phases 31/33/34 completed).
- Confirmed the recovery source (`HEAD` vs. the plan-suggested `c34aa3c`) were byte-identical before using `HEAD` for the `git show` recovery, since no intervening commit had touched the file.

## Deviations from Plan

**1. [Plan acceptance-criteria discrepancy, not a code defect] "Phase 31 does not exist" line count**

The plan's Task 3 acceptance criteria state `grep -c 'Phase 31 does not exist' .planning/milestones/v1.6-MILESTONE-AUDIT-SUPERSEDED.md` should return `1`. The actual, unedited stale-audit body contains that exact phrase on **5** separate lines (once each for IMPORT-01, IMPORT-03, IMPORT-04, IMPORT-05, and the corresponding gap-summary line) — `grep -c` counts matching lines, and the original document genuinely repeats the phrase five times across its four orphaned-requirement gap entries plus a rollup line. Editing the file to force a count of 1 would violate the same task's explicit, higher-priority instruction: "Do not edit the original audit body" / "the original text is preserved word-for-word." I preserved the body verbatim (5 occurrences) rather than truncating it to satisfy a miscounted acceptance criterion. The plan's own `<verify><automated>` block (the actual gate) does not check this count — it only checks `grep -q 'SUPERSEDED'` (presence, not count) — so the automated gate passes. This is a plan-authoring assumption that didn't match the real file content, not a fix I applied.

All other acceptance criteria and the plan's `<verification>` block items were checked directly and pass:
- `ls .planning/*-MILESTONE-AUDIT.md` → exactly `.planning/v1.8-MILESTONE-AUDIT.md`
- `ls .planning/milestones/*-MILESTONE-AUDIT*.md` → `v1.1-`, `v1.4-`, `v1.6-`, `v1.6-...-SUPERSEDED`
- `grep -c 'audited: 2026-09-07' .planning/milestones/v1.6-MILESTONE-AUDIT.md` → `1`
- `grep -c 'Phase 31 does not exist' .planning/milestones/v1.6-MILESTONE-AUDIT.md` → `0`
- `git diff --name-only -- src app scripts tests` → empty (no code touched)

**Total deviations:** 1, informational only (plan acceptance-criteria miscount, not auto-fixed and not requiring a fix — the file is correct as-is).
**Impact on plan:** None. The plan's real gate (the `<verify><automated>` block) passes as written.

## Issues Encountered

None beyond the acceptance-criteria discrepancy noted above.

## Auth Gates

Task 2 was a `checkpoint:human-action` by design — `/gsd-audit-milestone` is a GSD slash command that a subagent cannot invoke. The orchestrator ran it in the main session and reported results back via the checkpoint-resolution payload. This is normal flow for this plan type, not a deviation.

## Milestone Audit Findings — verbatim transcription for plan 40-05

Per this plan's `<output>` instruction, the following is recorded in full so plan 40-05 can lift it into `MILESTONES.md § Known gaps at close` (D-40-02):

### Scores

- **Requirements:** 34/34 satisfied (three-source agreement: phase VERIFICATION.md × SUMMARY.md `requirements-completed` frontmatter × `v1.6-REQUIREMENTS.md` checkbox)
- **Phases:** 6/6 verified (28 recorded as retro-documented, outside workflow — accepted by design, not scored as a gap)
- **Integration:** 27/27 cross-phase checks WIRED, 0 blockers
- **Flows:** 6/6 E2E flows complete
- **Nyquist:** 1 phase compliant (30), 1 partial/not-derivable (29), 5 missing (28, 31, 31.1, 33, 34) — overall `partial`, discovery-only, not a blocker on closing the milestone record
- **Status:** `tech_debt`

### Every gap / tech-debt finding (verbatim)

**Record-integrity (milestone-level):**
1. `v1.6-REQUIREMENTS.md` § Traceability claims "Coverage: 31/31 (100%)" but the table lists 39 rows. The real v1.6 count is 34.
2. GAME-01..GAME-05 appear in BOTH `.planning/milestones/v1.6-REQUIREMENTS.md` and `v1.7-REQUIREMENTS.md`, mapped to Phase 35 in each. `ROADMAP.md` assigns Phase 35 to v1.7, so the v1.6 ledger over-scopes by five requirements.
3. Phase 31.1 (App Shell Refresh) delivered SHELL-C1..SHELL-C7 as phase-local success criteria with no REQ-ID in either milestone ledger. Work is delivered and consumed; it is simply invisible to milestone coverage accounting.
4. Phase 28 has no VERIFICATION.md and no PLAN files — retro-documented outside the GSD workflow, recorded as such in ROADMAP.md. Accepted by design, not a defect; noted so future audits do not re-raise it.
5. `.planning/milestones/v1.6-ROADMAP.md` does not exist — the v1.6 archive pair is incomplete (`v1.6-REQUIREMENTS.md` is present). Plan 40-05 closes this.

**Phase 29 — Migration Safety Net:**
6. INFRA-05 was verified on an architectural-inference basis; the empirical write-isolation proof was explicitly not obtained at the time (29-VERIFICATION.md). Closed retroactively outside v1.6 by Phase 36's `scripts/probe-write-isolation.ts` (live-fire probe against Neon main) and hardened again by Phase 39 (OPS-05).
7. 29-VALIDATION.md records `nyquist_compliant: not-derivable`.

**Phase 30 — Company & Contact Registry:**
8. 30-UAT.md frontmatter status is still "testing"; its "Current Test" block is stale (parked at test 2) and its Summary counts (passed 8 / issues 3 / pending 4) do not reconcile with the 13 itemized results (12 pass + 1 fixed). Documentation-quality only.
9. `admin.companies.search` placeholder copy reads "client ou référence" on a surface that searches company name and SIREN. Reviewed by Antoine 2026-09-02 and accepted as shipped (recorded in REQUIREMENTS.md § Out of Scope).

**Phase 31.1 — App Shell Refresh:**
10. SHELL-C7 (dark-theme shell + PDF surface, visual) could not be closed inside v1.6 — the browser session dropped mid-check. Closed 2026-09-06 by Phase 38 CLOSE-02, evidenced in 38-UAT.md and `38-shell-dialogs-visual-conventions/evidence/`.

**Phase 33 — Pipeline:**
11. 33-VERIFICATION.md scores 5/5 must-haves in code but records 2 with voided acceptance evidence — the 33-09 acceptance table was not trusted and the criteria were re-derived from ROADMAP.md.
12. A production-build human_verification item (SIREN gate dialog behaviour against a real Neon dev branch with seeded fixtures) is recorded in 33-VERIFICATION.md and was never performed.

**Nyquist coverage:**
13. 5 of 7 v1.6 phases have no VALIDATION.md: 28, 31, 31.1, 33, 34. Phase 30 is compliant; Phase 29 is partial (not-derivable).

### Unperformed verification carried forward (from audit body, not `tech_debt` frontmatter block)

- Phase 33 — a production-build check of the SIREN-gate dialog (dialog stays open, retains typed date and reason, reveals the SIREN field) against a seeded Neon development branch. Recorded in 33-VERIFICATION.md under `human_verification`; never run.
- Phase 33 — two of five must-haves passed on code inspection with the 33-09 acceptance evidence explicitly voided; the criteria were re-derived from ROADMAP.md instead.
- (For contrast: Phase 31.1's equivalent item, SHELL-C7, WAS closed later on 2026-09-06 by Phase 38 CLOSE-02 — not carried forward as open debt.)

### D-40-07 check (Phase 28 retro-documented flag read correctly)

Confirmed NO — the audit does not raise a false missing-plans gap against Phase 28. Its missing VERIFICATION.md is explicitly recorded in the fresh audit as "accepted by design, not a defect" (finding #4 above), citing the ROADMAP.md flag directly. D-40-07's ordering (40-01 before this audit) worked as intended.

## Next Phase Readiness

- Plan 40-05 has everything it needs to write the v1.6 `MILESTONES.md § Known gaps at close` section — all 13 tech-debt findings plus the 2 unperformed-verification items are transcribed above in full, each traceable to its source phase.
- Plan 40-06 (archive move of phases 28-35 into `.planning/milestones/v1.6-phases/`) is unblocked — this plan's Task 3 explicitly left that move for 40-06 and did not touch phase directories.
- `.planning/` root is clean of stale audits — only the in-progress v1.8 audit remains, satisfying D-40-03.
- No blockers.

---
*Phase: 40-milestone-record-closure*
*Completed: 2026-09-07*

## Self-Check: PASSED

- FOUND: `.planning/milestones/v1.6-MILESTONE-AUDIT.md`
- FOUND: `.planning/milestones/v1.6-MILESTONE-AUDIT-SUPERSEDED.md`
- FOUND: `.planning/phases/40-milestone-record-closure/40-03-SUMMARY.md`
- FOUND commit: `e796ecb` (Task 2 — fresh audit committed)
- FOUND commit: `25e9cd0` (Task 3 — audit custody)
- FOUND commit: `c8700bf` (this summary)
