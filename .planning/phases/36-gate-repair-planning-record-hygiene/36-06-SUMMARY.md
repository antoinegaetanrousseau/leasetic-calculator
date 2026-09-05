---
phase: 36-gate-repair-planning-record-hygiene
plan: 06
subsystem: planning-records
tags: [nyquist, security-audit, migration-safety, honest-failure-register]

# Dependency graph
requires:
  - phase: 36-gate-repair-planning-record-hygiene
    plan: 05
    provides: "Real INFRA-05 write-isolation probe run — verdict ISOLATED, transcript in 36-PROBE-TRANSCRIPT.md"
provides:
  - "29-VERIFICATION.md's Known Weak Link section updated with the observed probe outcome, honestly scoped"
  - "29-SECURITY.md's T-29-06 revisited and re-disposed from accept to mitigate — empirically closed"
  - "29-VALIDATION.md — Phase 29's first Nyquist coverage record, explaining non-derivability rather than fabricating it"
  - "CLOSE-05 marked complete in .planning/REQUIREMENTS.md"
affects: [40-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive, dated amendment to a closed phase's artifacts: append new sections/clauses, never delete or rewrite the historical record"
    - "Disposition re-classification recorded as a decision (who/when/why), not a silent table-cell flip"

key-files:
  created:
    - .planning/phases/29-migration-safety-net/29-VALIDATION.md
  modified:
    - .planning/phases/29-migration-safety-net/29-VERIFICATION.md
    - .planning/phases/29-migration-safety-net/29-SECURITY.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "T-29-06 moved from accept to mitigate — empirically closed, based on the 2026-09-05 SQL-level sentinel probe (verdict ISOLATED). The residual is scoped precisely: one instant, one table (schema_meta), pooled-endpoint observation only — no storage-layer audit, no Vercel-runtime exercise beyond the shared main endpoint."
  - "29-VALIDATION.md sets nyquist_compliant: not-derivable (not true, not false) — Phase 29 ran with workflow.research: false and produced no 29-RESEARCH.md, so no sampling dimensions exist to reconstruct honestly."
  - "August 2026-08-31 record preserved verbatim in both amended files; every new clause is additively appended and dated 2026-09-05 / Phase 36 / CLOSE-05."

requirements-completed: [CLOSE-05]

# Metrics
duration: ~35min
completed: 2026-09-05
---

# Phase 36 Plan 06: Fold Probe Outcome into Phase 29's Records Summary

**Amended `29-VERIFICATION.md` and `29-SECURITY.md` with the 2026-09-05 sentinel-probe outcome (verdict ISOLATED), and created `29-VALIDATION.md` recording why Phase 29's Nyquist dimensions are not derivable — closing CLOSE-05.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-05
- **Tasks:** 3/3
- **Files modified:** 3 (1 created, 2 modified) + REQUIREMENTS.md checkbox flip

## Accomplishments

- `29-VERIFICATION.md` § "Known Weak Link — INFRA-05 Evidentiary Basis" gained a
  `### Update 2026-09-05` subsection recording the probe's verdict (ISOLATED, exit 0), why the
  original app-level blocker did not apply to this SQL-level probe, and a precise re-statement of
  the residual (one instant, one table, pooled-endpoint observation only — not a storage-layer
  audit, not an exercise of the Vercel runtime). Residual severity re-classified from
  WARNING-level to INFORMATIONAL-level. The Score line, "Human Verification Required" and "Gaps
  Summary" sections each gained a dated pointer to the new subsection. The August 2026-08-31
  account is untouched.
- `29-SECURITY.md` gained a `## T-29-06 Revisit — 2026-09-05` section naming the second, cheaper
  upgrade path actually taken (a SQL-level probe that never touches Better Auth, distinct from the
  Accepted Risks Log's blocked `grant-admin.ts` path), the resulting disposition
  (`accept` → `mitigate — empirically closed`), and the attribution `Antoine (plan owner),
  2026-09-05`. The T-29-06 register row, its Accepted Risks Log row, and the Summary block each
  gained dated pointers/clauses; the `~~mitigate~~ → accept (re-classified 2026-08-31)` notation
  and the August rationale survive verbatim.
- `29-VALIDATION.md` created (136 lines) — Phase 29's first Nyquist coverage record. It does not
  invent sampling dimensions; it explains why none can be derived (no `29-RESEARCH.md`,
  `workflow.research: false`), cites the 5/5 verified must-have score from `29-VERIFICATION.md`,
  classifies the gap as measurement rather than coverage, and documents the nine supporting gates
  (three shipped by Phase 29 itself) and both plans' per-task automated verification.
- `.planning/REQUIREMENTS.md`: CLOSE-05 flipped to `[x]` and its traceability-table row to
  `Complete`, via `gsd-sdk query requirements.mark-complete CLOSE-05`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update 29-VERIFICATION.md § Known Weak Link with the probe outcome** - `09c92c2` (docs)
2. **Task 2: Revisit T-29-06's disposition in 29-SECURITY.md against the observed result** - `9e1fa08` (docs)
3. **Task 3: Create 29-VALIDATION.md recording why Phase 29's Nyquist dimensions are not derivable** - `8ecd1c1` (docs)

**Requirement checkbox:** `e31f07a` (docs) — CLOSE-05 flipped in `.planning/REQUIREMENTS.md`.

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `.planning/phases/29-migration-safety-net/29-VERIFICATION.md` — Known Weak Link section, Score
  line, Human Verification Required, and Gaps Summary all amended additively with the 2026-09-05
  probe outcome
- `.planning/phases/29-migration-safety-net/29-SECURITY.md` — new `## T-29-06 Revisit` section;
  T-29-06 register row, Accepted Risks Log row, and Summary block amended additively
- `.planning/phases/29-migration-safety-net/29-VALIDATION.md` — created; records Nyquist
  non-derivability, the 9 supporting gates, per-plan automated verification, manual-only items,
  and a Validation Sign-Off
- `.planning/REQUIREMENTS.md` — CLOSE-05 checkbox and traceability row flipped to complete

## Decisions Made

- **T-29-06 disposition:** re-classified from `accept` to `mitigate — empirically closed` on the
  strength of the ISOLATED verdict, with the residual stated precisely rather than claimed as a
  blanket isolation guarantee. This is the honest scope: the probe observed one instant, one
  table, through the pooled Neon endpoints — it did not audit Neon's storage layer, and it did not
  exercise the Vercel production runtime's own routing beyond the shared `main` endpoint.
- **29-VALIDATION.md's `nyquist_compliant` value:** `not-derivable`, matching D-36-04's explicit
  instruction — not `true` (unearned, since no sampling dimensions were ever planned) and not
  `false` (would misrepresent a measurement gap as a coverage failure).
- **Amendment style:** every edit across both Phase 29 files is additive and dated
  `2026-09-05` / `Phase 36 / CLOSE-05`; nothing from the 2026-08-31 record was deleted or rewritten
  (verified by grepping stable literals — `ISOLATION-PROBE-29`, `Invalid password`,
  `re-classified 2026-08-31` — and confirming identical counts against `git show HEAD:<file>`
  before each commit).

## Deviations from Plan

None — plan executed exactly as written. All three tasks' acceptance criteria (grep counts,
frontmatter parse, threat-ID stability, gate-existence checks, ROADMAP.md content-signature check)
passed on the first attempt.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. This plan folded an already-completed probe
run (plan 36-05) into Phase 29's own records; it did not run or re-run the probe, and it did not
touch any migration path.

## Verification

- `git diff --numstat` on both amended Phase 29 files showed deletions capped at the number of
  amended lines (2 each) — every other line added was pure addition.
- `sort -u` on `T-29-[0-9A-Z]*` occurrences in `29-SECURITY.md` before/after the edit matched
  exactly — no threat ID was added, removed, or renumbered.
- The verdict string `ISOLATED` appears consistently across `29-VERIFICATION.md`, `29-SECURITY.md`,
  `29-VALIDATION.md`, and the source `36-PROBE-TRANSCRIPT.md`.
- `git diff -- eslint.config.mjs` is empty.
- `git status --porcelain -- package.json package-lock.json eslint.config.mjs src/ app/ scripts/ .planning/v1.6-MILESTONE-AUDIT.md` printed nothing throughout.
- `git diff -U0 -- .planning/ROADMAP.md` contains no line matching
  `IN PROGRESS|^\+?\*\*Milestone:|Success Criteria|criterion 4` — ROADMAP.md was not touched by
  this plan at all (no diff exists), so Phase 40's scope (CLOSE-06/CLOSE-07) was not encroached on.
- Every `npm run X` named in `29-VALIDATION.md`'s supporting-gates table resolves to a real
  `package.json` script (checked programmatically for all 9).

## Next Phase Readiness

- CLOSE-05 is closed: Phase 29 has a real `29-VALIDATION.md`, and INFRA-05's write-isolation is
  now empirically probed (not merely architectural inference), with the residual honestly scoped
  in both `29-VERIFICATION.md` and `29-SECURITY.md`.
- Phase 36 (Gate Repair & Planning-Record Hygiene) is now fully executed — plans 36-01 through
  36-06 all complete. HOUSE-01 through HOUSE-04 and CLOSE-05 are all closed.
- Phase 40 (v1.6 formal close, CLOSE-06/CLOSE-07) can proceed against a clean Phase 29 record;
  nothing in this plan touched `.planning/v1.6-MILESTONE-AUDIT.md` or `ROADMAP.md`'s milestone
  status.

---
*Phase: 36-gate-repair-planning-record-hygiene*
*Completed: 2026-09-05*

## Self-Check: PASSED

- `test -f .planning/phases/29-migration-safety-net/29-VALIDATION.md` → FOUND (136 lines)
- `git log --oneline --all | grep -q 09c92c2` → FOUND
- `git log --oneline --all | grep -q 9e1fa08` → FOUND
- `git log --oneline --all | grep -q 8ecd1c1` → FOUND
- `git log --oneline --all | grep -q e31f07a` → FOUND
