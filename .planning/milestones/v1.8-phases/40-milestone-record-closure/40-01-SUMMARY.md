---
phase: 40-milestone-record-closure
plan: 01
subsystem: planning-records
tags: [roadmap, documentation, milestone-closure, requirements-traceability]

# Dependency graph
requires: []
provides:
  - "ROADMAP.md v1.6 section header agrees with its own milestone-list bullet (SHIPPED 2026-09-04)"
  - "ROADMAP.md progress table has rows for Phase 28 (v1.6, retro-documented, no plan count) and Phase 31.1 (v1.6, 7/7)"
  - "ROADMAP.md Phase 39 progress row carries its current name (Database Guard Correctness)"
  - "ROADMAP.md Phase 20 success criterion 3 names Better Auth trustedOrigins instead of a nonexistent middleware Origin gate"
  - "40-CONTEXT.md canonical_refs no longer cite src/proxy.ts or an unqualified trusted-origins.test.ts"
affects: [40-03, 40-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Amend-in-place with dated italic parenthetical, original text preserved (D-15/Phase 36 D-36-02 convention)"

key-files:
  created: []
  modified:
    - .planning/ROADMAP.md
    - .planning/phases/40-milestone-record-closure/40-CONTEXT.md

key-decisions:
  - "Phase 28 progress row uses an em dash for Plans Complete (not 0/0 or n/a) per D-40-07 — no plan count exists for a retro-documented phase"
  - "Phase 20 criterion 3 rewrite avoids the literal substrings non-2xx, status code, and 403 even inside its own retraction parenthetical, satisfying the plan's citation-accuracy gate"
  - "40-CONTEXT.md's two wrong canonical-ref paths corrected via struck-through original + dated parenthetical (not silently swapped), matching the amend-in-place house convention"

patterns-established:
  - "Amend-in-place with dated parenthetical extended to canonical_refs bullets (previously only used for REQUIREMENTS.md text)"

requirements-completed: [CLOSE-06, CLOSE-07, OPS-02]

# Metrics
duration: ~10min
completed: 2026-09-07
---

# Phase 40 Plan 01: ROADMAP Corrections Summary

**Flipped ROADMAP.md's self-contradicting v1.6 header to SHIPPED, added the two missing v1.6 progress-table rows (Phase 28, Phase 31.1), and rewrote Phase 20's fictitious middleware Origin-gate criterion to name the real Better Auth `trustedOrigins` mechanism.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-07T21:03Z (approx, first commit)
- **Completed:** 2026-09-07T21:06Z
- **Tasks:** 3
- **Files modified:** 2 (`.planning/ROADMAP.md`, `.planning/phases/40-milestone-record-closure/40-CONTEXT.md`)

## Accomplishments

- `.planning/ROADMAP.md` line 102 now reads `### ✅ v1.6 — CRM Foundation (Phases 29-34) — SHIPPED 2026-09-04`, agreeing with the milestone-list bullet at line 11, which no longer claims v1.6 was "never formally archived" and instead points at `milestones/v1.6-ROADMAP.md`.
- Progress table gained two rows that were missing entirely: Phase 28 (line 1080: `v1.6 | — | Complete (retro-documented, outside workflow) | 2026-08-31`) and Phase 31.1 (line 1084: `v1.6 | 7/7 | Complete | 2026-09-02`). Phase 39's row (line 1092) renamed from "Operational & Credential Gates" to its current title "Database Guard Correctness".
- Phase 20 success criterion 3 (ROADMAP.md line 247) rewritten to name Better Auth's `trustedOrigins` option at `src/lib/auth/index.ts:210`, verified by `src/lib/auth/trusted-origins.test.ts` asserting allow-list membership — replacing the fictitious middleware-level Origin gate claim. Dropped the stray word "middleware" from the v1.3 phase bullet and the Phase 20 Goal line.
- `40-CONTEXT.md`'s `<canonical_refs>` block corrected in place: `src/proxy.ts` (nonexistent) and the unqualified `trusted-origins.test.ts` (previously expanded elsewhere to the nonexistent `tests/trusted-origins.test.ts`) are now struck through with a dated 2026-09-07 parenthetical pointing at the real paths (`proxy.ts` at repo root, `src/lib/auth/trusted-origins.test.ts`), originals still visible.

## Task Commits

Each task was committed atomically:

1. **Task 1: Flip the v1.6 section header and retire the "never formally archived" clause** - `12e3293` (docs)
2. **Task 2: Add the missing Phase 28 and Phase 31.1 progress-table rows and correct Phase 39's row name** - `9e3517b` (docs)
3. **Task 3: Correct Phase 20's success criterion 3, and the two wrong paths propagating from 40-CONTEXT.md** - `262d8bd` (docs)

_No plan-metadata commit yet — this SUMMARY commit follows below per the sequential-executor protocol._

## Files Created/Modified

- `.planning/ROADMAP.md` - v1.6 header flip, milestone-bullet archive pointer, Phase 28/31.1 progress rows, Phase 39 rename, Phase 20 criterion 3 rewrite, "middleware" word dropped from two lines
- `.planning/phases/40-milestone-record-closure/40-CONTEXT.md` - two canonical_refs bullets corrected in place (struck-through originals + dated parenthetical)

## Line References for Downstream Plans

Per this plan's `<output>` spec:

- **Phase 28 progress row:** `.planning/ROADMAP.md` line 1080 — `| 28. ReUI / base-maia Design-System Migration | v1.6 | — | Complete (retro-documented, outside workflow) | 2026-08-31 |`
- **Phase 31.1 progress row:** `.planning/ROADMAP.md` line 1084 — `| 31.1. App Shell Refresh (INSERTED) | v1.6 | 7/7 | Complete | 2026-09-02 |`
- **Phase 20 criterion 3, final wording** (`.planning/ROADMAP.md` line 247):
  > Better Auth's `trustedOrigins` option, configured at `src/lib/auth/index.ts:210` (Phase 20-01), rejects requests whose `Origin` header is not in the configured allow-list; verified by `src/lib/auth/trusted-origins.test.ts`, which asserts allow-list membership rather than asserting anything about the rejection response itself. *(Corrected 2026-09-07 by D-15 (Phase 39 context, executed in Phase 40): this criterion previously described a middleware-level Origin gate on `/api/auth/sign-in/*` that hard-blocks untrusted-Origin requests — no such middleware exists anywhere in `proxy.ts` (91 lines, coarse auth-cookie gate only, no Origin read), and Better Auth's rejection behavior varies between rejection paths and point releases, so verification deliberately checks allow-list membership instead — see `proxy.ts`, `src/lib/auth/index.ts:210` and `src/lib/auth/trusted-origins.test.ts`.)*

Plan 40-03's pre-flight check should read the two progress-row line numbers above (they will shift if 40-02 or later plans insert rows above line 1080 — re-grep rather than hardcode). Plan 40-04's OPS-02 amendment must agree with the criterion-3 wording above (Better Auth `trustedOrigins`, defense-in-depth framing, no status-code assertion).

## Decisions Made

- Followed the plan's exact wording constraints for criterion 3: named Better Auth `trustedOrigins` as the mechanism, cited both real file paths, and avoided asserting a status-code expectation — including avoiding the literal strings `non-2xx`, `status code`, and `403` inside the retraction parenthetical itself (the plan's acceptance criteria scope this check to the whole Phase 20 section, lines 238-250, not just the pre-existing text).
- Used the house amend-in-place convention (struck-through original + dated italic parenthetical) for the two `40-CONTEXT.md` canonical_refs corrections, matching the `REQUIREMENTS.md` lines 184-187 precedent cited in the plan, rather than silently swapping the wrong paths for the right ones.

## Deviations from Plan

None in the plan's own tasks — all three tasks' automated verify commands and acceptance criteria passed as specified; no Rule 1-4 fixes were needed.

### Auto-fixed Issues

**1. [Rule 1 - Bug] Did not mark CLOSE-06, CLOSE-07, OPS-02 complete in REQUIREMENTS.md despite the plan's `requirements:` frontmatter listing them**
- **Found during:** State-update step (after task commits, before this SUMMARY)
- **Issue:** The standard executor step runs `requirements mark-complete` against every ID in the plan's frontmatter `requirements:` field. This plan's frontmatter lists `[CLOSE-06, CLOSE-07, OPS-02]`, but this plan (40-01 of 6) only performed the ROADMAP.md corrections that are load-bearing *prerequisites* for those requirements — it did not perform the `MILESTONES.md` entry, audit re-run, or snapshots CLOSE-06's own text requires, nor the `git mv` archive CLOSE-07's own text requires, nor the requirement-text amendment (defense-in-depth reasoning) OPS-02's own text requires. I ran `gsd-sdk query requirements.mark-complete CLOSE-06 CLOSE-07 OPS-02`, saw it flip all three checkboxes to `[x]` and their traceability rows to `Complete`, recognized this was a false-completion record — exactly the record-accuracy defect this phase exists to eliminate — and reverted via `git checkout -- .planning/REQUIREMENTS.md` before it was ever committed.
- **Fix:** Left `.planning/REQUIREMENTS.md` untouched (not in this plan's `files_modified` list). CLOSE-06, CLOSE-07 and OPS-02 remain `[ ]`/`Pending` for later plans (40-02 through 40-06) to close for real once their own work lands.
- **Files modified:** none (reverted before commit)
- **Verification:** `git diff .planning/REQUIREMENTS.md` empty after revert; `git status --short .planning/REQUIREMENTS.md` empty.
- **Committed in:** n/a — never committed

---

**Total deviations:** 1 auto-fixed (1 bug — premature requirement completion caught and reverted)
**Impact on plan:** No scope creep; the plan's own task output is unaffected. This deviation only concerns the executor's post-task state-update bookkeeping and prevents REQUIREMENTS.md from asserting a false completion.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 40-03's fresh `/gsd-audit-milestone v1.6` run can now see Phase 28 already attributed to v1.6 and flagged `Complete (retro-documented, outside workflow)`, and Phase 31.1 attributed to v1.6 with `7/7` — the sequencing constraint this plan was load-bearing for is satisfied.
- Plan 40-04's OPS-02 requirement amendment has a stable, already-corrected criterion-3 wording to point at (no risk of citing the two wrong paths this plan just fixed).
- `npm run lint:check` (`eslint . --max-warnings=0`) passes clean; no source file was touched by this plan.
- `git diff --name-only HEAD~3 HEAD` lists exactly `.planning/ROADMAP.md` and `.planning/phases/40-milestone-record-closure/40-CONTEXT.md`, matching the plan's success criterion 8.

## Self-Check: PASSED

- FOUND: `.planning/ROADMAP.md`
- FOUND: `.planning/phases/40-milestone-record-closure/40-CONTEXT.md`
- FOUND commit: `12e3293`
- FOUND commit: `9e3517b`
- FOUND commit: `262d8bd`

---
*Phase: 40-milestone-record-closure*
*Completed: 2026-09-07*
