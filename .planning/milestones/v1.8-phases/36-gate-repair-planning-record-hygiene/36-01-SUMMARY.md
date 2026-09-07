---
phase: 36-gate-repair-planning-record-hygiene
plan: 01
subsystem: docs
tags: [planning-hygiene, lint-gate, audit-detector, requirements-traceability]

# Dependency graph
requires: []
provides:
  - "HOUSE-01 closed in place with re-run evidence (lint:check, git worktree list, .claude/worktrees/ empty), zero code diff"
  - "06/07/08-CONTEXT.md v1.1-era open questions annotated RESOLVED/DEFERRED with full relative refs"
  - "31-CONTEXT.md's five open questions annotated RESOLVED, traced to shipped 31-*-SUMMARY.md evidence"
  - "scanContextQuestions false positives on 31-CONTEXT.md and 36-CONTEXT.md eliminated (verified before/after against the real detector)"
affects: [37-crm-stack-closure, 38-shell-dialogs-visual-conventions, 39-operational-credential-gates, 40-milestone-record-closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-place annotation on stale planning markers: append '— RESOLVED <date> — see <full relative ref>.' or '— DEFERRED — see <full relative ref>.' to the end of the existing bullet body, never a separate section"
    - "Retitle (not append-to) a heading when the detector's match target is the heading text itself — appending a suffix leaves the literal substring intact and the regex still matches"

key-files:
  created: []
  modified:
    - ".planning/phases/31.1-app-shell-refresh/deferred-items.md"
    - ".planning/milestones/v1.1-phases/06-auth-shell/06-CONTEXT.md"
    - ".planning/milestones/v1.1-phases/07-calc-engine-port-proposal-form/07-CONTEXT.md"
    - ".planning/milestones/v1.1-phases/08-persistence-pdf-pipeline/08-CONTEXT.md"
    - ".planning/phases/31-reconciliation-engine-proposal-extraction/31-CONTEXT.md"
    - ".planning/phases/36-gate-repair-planning-record-hygiene/36-CONTEXT.md"

key-decisions:
  - "31-CONTEXT.md's 5 open questions (not the 3 named in D-36-05) were all annotated — the live file has 5, and annotating only 3 would leave the file half-true"
  - "Question 1 (re-run idempotency) verdict is RESOLVED, not DEFERRED, even though its own body text cites 'IMPORT-07 ... lands in Phase 32' (which never shipped) — the actual behavior was designed in 31-02-SUMMARY.md and independently confirmed against real Postgres data in 31-08-SUMMARY.md, which settles the question regardless of IMPORT-07's fate"
  - "31-CONTEXT.md's heading was retitled, not suffixed, per the plan's explicit operator decision — appending to '## Open Questions' would leave the literal substring intact and the unanchored, case-insensitive detector regex would still match"
  - "36-CONTEXT.md's D-36-05 paragraph, which quoted '### Open questions' while describing the three container shapes, was reworded to 'an Open-questions markdown heading' — a one-token change that removes the same regex false-positive without touching any decision text"

patterns-established:
  - "Full-relative-path annotation on stale CONTEXT.md markers, stricter than the file's own pre-existing bare-ref precedent (07-CONTEXT.md's original Q2 annotation)"

requirements-completed: [HOUSE-01, HOUSE-02]

# Metrics
duration: ~35min
completed: 2026-09-05
---

# Phase 36 Plan 01: Gate Repair & Planning-Record Hygiene Summary

**HOUSE-01 closed by re-run evidence with zero code diff; HOUSE-02's four stale CONTEXT.md files now carry inline RESOLVED/DEFERRED verdicts, and the real `scanContextQuestions` detector confirmed clean before/after on both files it was falsely flagging.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-05T14:09:27Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Re-ran the two HOUSE-01 evidence commands (`npm run lint:check` exits 0; `git worktree list` shows only `main`; `.claude/worktrees/` empty) and recorded a dated closure note in place in the origin `deferred-items.md`, with zero change to `eslint.config.mjs`.
- Annotated all seven v1.1-era open questions across `06-CONTEXT.md` (1), `07-CONTEXT.md` (2), and `08-CONTEXT.md` (4), copying every verdict from `.planning/STATE.md`'s v1.1-close resolution table — no status invented.
- Annotated all five of `31-CONTEXT.md`'s open questions (not the 3 named in the phase's own `36-CONTEXT.md`), tracing each verdict to a specific `31-*-SUMMARY.md`, and retitled the heading so it no longer trips the audit's unanchored `##\s*Open Questions` regex.
- Found and fixed a second false-positive trip of the same regex inside `36-CONTEXT.md` itself (a prose quotation of the literal `### Open questions`), confirmed by running the real detector function before and after the edit.

## Task Commits

Each task was committed atomically:

1. **Task 1: Close HOUSE-01 in place with dated evidence, changing no code** - `d92d070` (docs)
2. **Task 2: Annotate the v1.1-era open questions in 06/07/08 CONTEXT.md** - `06cc928` (docs)
3. **Task 3: Annotate all five open questions in 31-CONTEXT.md** - `3ef1829` (docs)

**Plan metadata:** (this commit, see below)

## Files Created/Modified

- `.planning/phases/31.1-app-shell-refresh/deferred-items.md` - Added `**Status: CLOSED 2026-09-05**` line under the H2 heading and a `## Closure — 2026-09-05` section recording the four re-run evidence facts; original "Out of scope" / "Not fixed here" prose untouched.
- `.planning/milestones/v1.1-phases/06-auth-shell/06-CONTEXT.md` - Q4 (auth version pinning) annotated `RESOLVED 2026-05-08`; heading amended to note "all resolved, see annotations".
- `.planning/milestones/v1.1-phases/07-calc-engine-port-proposal-form/07-CONTEXT.md` - Q2's existing bare ref upgraded to a full relative path; the D-2 seed-coefficients bullet annotated `DEFERRED`.
- `.planning/milestones/v1.1-phases/08-persistence-pdf-pipeline/08-CONTEXT.md` - All four `<open_questions>` bullets (Q1, Q3, Q5, Phase-7 carry-over) annotated; heading amended with a dated inline-status note.
- `.planning/phases/31-reconciliation-engine-proposal-extraction/31-CONTEXT.md` - All five numbered questions annotated `RESOLVED 2026-09-02`, each traced to a specific `31-*-SUMMARY.md`; heading retitled from `## Open Questions (recorded, not guessed)` to `## Questions recorded at planning time — all statuses resolved inline 2026-09-05 (Phase 36, HOUSE-02)`.
- `.planning/phases/36-gate-repair-planning-record-hygiene/36-CONTEXT.md` - One-token wording fix in the D-36-05 paragraph (`` `### Open questions` `` → "an Open-questions markdown heading") to stop it tripping the same detector regex; no decision text changed.

## Decisions Made

- **All five of 31-CONTEXT.md's open questions turned out to be genuinely RESOLVED**, not a mix of resolved/deferred as might be assumed from the question text's own forward-references to Phase 32 (which never ran). Reading the eight `31-*-SUMMARY.md` files directly (rather than trusting the questions' own stated resolution paths) showed each was actually settled during Phase 31 execution:
  - Q1 (re-run idempotency): row-level skip on already-linked proposals + entity-level dedup keys (31-02), confirmed against real Postgres data (31-08).
  - Q2 (canonical name selection): most-frequent-spelling-wins with deterministic tie-breaking (31-02).
  - Q3 (engine granularity): one global pass across all partners (31-02).
  - Q4 (provenance scope): `source` column added to all three CRM tables, not contacts-only (31-01), confirmed in real data (31-08).
  - Q5 (contact conflict across provenance): partner-entered contacts are never touched, reported as a skip (31-05).
- **The heading was retitled, not suffixed**, per the plan's explicit instruction — this is the mechanism that actually clears the detector; annotating the bullets alone would not have.
- **`36-CONTEXT.md` needed its own one-token fix** — its own prose about the three container shapes quoted the literal string that trips the detector's regex. This was discovered by running the real `scanContextQuestions` regex against the file (not by inspection) and fixed with the least invasive possible edit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] First-draft annotation wrapping broke the "see `<path>`" acceptance grep and exceeded the 100-char line-length budget**
- **Found during:** Task 3, self-verification of acceptance criteria before committing
- **Issue:** My first pass wrapped `— RESOLVED <date> — see` at the end of one line and the file path on the next line. This (a) made `grep -o 'see \.planning/[^ ]*'` return 0 instead of ≥5, since grep matches within a single line, and (b) pushed one line to 101 characters, increasing the file's `awk 'length > 100'` count by 2 relative to HEAD instead of the 1 that the plan-mandated heading retitle unavoidably introduces.
- **Fix:** Rewrapped all five annotations so `— see <full-path>:` always starts and stays on one line, with the description text wrapped afterward. Verified `grep -o 'see \.planning/[^ ]*' | wc -l` returns 5 and the file's long-line count is 22 vs. HEAD's 21 — the single unavoidable +1 being the plan-mandated verbatim heading text (`## Questions recorded at planning time — all statuses resolved inline 2026-09-05 (Phase 36, HOUSE-02)`, 103 chars), which the plan required word-for-word.
- **Files modified:** `.planning/phases/31-reconciliation-engine-proposal-extraction/31-CONTEXT.md`
- **Verification:** `grep -o 'see \.planning/[^ ]*' <file> | wc -l` → 5; `awk 'length > 100' <file> | wc -l` → 22 (HEAD: 21); before/after detector gate both pass.
- **Committed in:** `3ef1829` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in my own draft, caught by self-verification before commit)
**Impact on plan:** No scope creep — the fix only corrected line-wrapping mechanics of the exact annotation content the plan specified.

## Issues Encountered

None beyond the self-caught wrapping bug above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `eslint.config.mjs` is byte-identical to HEAD (verified via `git status --porcelain eslint.config.mjs` returning empty both mid-plan and at completion) — HOUSE-01 is closed by evidence only, as D-36-01 required.
- The real `auditOpenArtifacts().items.context_questions` detector is confirmed clean for both `31-CONTEXT.md` and `36-CONTEXT.md` — Phase 40's milestone-close audit will not re-report either.
- `06/07/08-CONTEXT.md` still live under `.planning/milestones/v1.1-phases/` and are already outside the detector's `.planning/phases/*/` scan scope (moved there 2026-09-05, independent of this plan); their annotations exist purely for human-reader truthfulness per D-36-05, not to clear an audit finding — this distinction is stated explicitly per the plan's instruction not to overclaim.
- No blockers for `36-02` or `36-03`, which run in the same wave and working tree; this plan's `git status --porcelain` scoped checks confirm it touched only its own six `files_modified` targets.

---
*Phase: 36-gate-repair-planning-record-hygiene*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 6 modified planning files and this SUMMARY.md verified present on disk. All 3 task commit
hashes (`d92d070`, `06cc928`, `3ef1829`) verified present in `git log --oneline --all`.
