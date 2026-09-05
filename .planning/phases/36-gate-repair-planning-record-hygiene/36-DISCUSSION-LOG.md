# Phase 36: Gate Repair & Planning-Record Hygiene — Discussion Log

**Date:** 2026-09-05
**Mode:** default (interactive)
**Areas discussed:** 4 of 4 offered — all selected

> Human reference only. Downstream agents read `36-CONTEXT.md`, not this file.

---

## Pre-discussion scouting

Codebase was scouted before gray areas were generated. Four findings changed the shape of
the discussion:

| Finding | How it was established |
|---|---|
| **HOUSE-01 already satisfied.** `npm run lint:check` exits 0 with no output; `git worktree list` shows only the main repo; `.claude/worktrees/` is an empty directory, mtime `Sep 3 00:28`. | Ran both commands |
| **HOUSE-02 partly resolved by accident.** 06/07/08-CONTEXT.md moved into `milestones/v1.1-phases/` during the 2026-09-05 `/gsd-cleanup`; only `31-CONTEXT.md` remains under `.planning/phases/`. | `find` |
| **HOUSE-03 is precise.** `scripts/seed-partner-launch.ts` exists with no npm script; `package.json` already carries the naming pattern. `[~]` markers are at `milestones/v1.1-REQUIREMENTS.md` lines 81, 86, 283. | `grep` |
| **HOUSE-04's audit argues against keeping.** `docs/design/reui-blocks-audit.md` closes with "there is no cost to deleting one later, and no value in keeping a block 'just in case'", while also naming `auth-1` + `wizard-1` as the two worth wiring. | Read the doc |

The blocks live at `src/components/blocks/` (not `src/components/reui/blocks/`), and
`src/components/reui/` holds live, wired primitives.

---

## Area 1 — Lint gate recurrence guard

**Options presented:**
1. Add `.claude/worktrees/**` to `eslint.config.mjs` ignores AND a test pinning the entry
   (recommended at the time, on the `tests/radius-scale.test.ts` precedent)
2. Add the ignores entry only
3. Record closed, change nothing

**Selected: 3 — record closed, change nothing.**

**Notes.** With `lint:check` already green and the worktrees already removed, the
requirement's own criterion is met. The phase closes HOUSE-01 with evidence rather than a
change. Captured as D-36-01, which explicitly instructs the planner *not* to add the
ignores entry or a test — otherwise a planner reading the original deferred-items note
would reintroduce them.

---

## Area 2 — ReUI blocks disposition

**Options presented:**
1. Delete all 18 (recommended — the audit's own argument)
2. Delete 16, keep `auth-1` + `wizard-1`
3. Keep all 18, record the decision

**Selected: 1 — delete all 18.**

**Notes.** Supersedes the provisional "Delete nothing yet" of 2026-08-31. The two blocks
the audit named as worth wiring are equally reinstallable, and both still import
`lucide-react`, which the app no longer uses — so keeping them would carry a conversion
cost as well as the "is this live?" ambiguity. `docs/design/reui-blocks-audit.md` is kept
and gains a dated decision record; that file is what makes the deletion reversible.
Captured as D-36-02.

---

## Area 3 — INFRA-05 evidence standard (CLOSE-05)

Two questions in this area.

### 3a — How to settle write isolation

**Correction surfaced during the discussion:** the original probe was not simply "skipped at
user request" as `v1.6-MILESTONE-AUDIT.md` summarises. Per `29-VERIFICATION.md` § Known Weak
Link, it was skipped *and then attempted and blocked* — app-level login against the
`development` branch fails with `[Better Auth]: Invalid password`, because that branch is a
copy-on-write fork frozen at 2026-05-27 whose credential hashes predate later rotations.
That blocker is app-level only.

**Options presented:**
1. SQL-level sentinel probe — bypasses Better Auth entirely (recommended)
2. Close on architectural inference, restate the limitation
3. Re-seed the development branch, then do the full app-level walk

**Selected: 1 — SQL-level sentinel probe.**

**Notes.** Claude flagged, unprompted, that the probe's "confirm absent" step reads the
`main` branch — the exact action INFRA-05 forbids from a local machine. Constraints were
therefore written into D-36-03: explicit inline connection strings only (never `.env.local`,
never `source`), a single `SELECT count(*)` existence check against `main` returning a count
and never rows, sentinel deleted in the same run, hostnames-only logging. The probe is
permissible only because it reads nothing but its own sentinel's absence.

### 3b — The missing `29-VALIDATION.md`

**Options presented:**
1. Hand-write it retroactively from 29's plans and verification
2. Record why it is not derivable (recommended)
3. Skip — treat the probe as CLOSE-05's whole content

**Selected: 2 — record why it is not derivable.**

**Notes.** Phase 29 ran with `workflow.research: false` and produced no `29-RESEARCH.md`,
and `VALIDATION.md` derives its dimensions from `RESEARCH.md`. The note records a
measurement gap rather than a coverage gap. Filing it *as* `29-VALIDATION.md` was left to
Claude's discretion with a stated preference, since the audit's finding is a file-existence
check that a note filed elsewhere would not clear. Captured as D-36-04.

---

## Area 4 — Stale-marker method (HOUSE-02 / HOUSE-03)

**Options presented:**
1. Annotate in place — edit each `<open_questions>` block to carry its real status inline
   (recommended)
2. Append a dated resolution note below each, leaving the original text untouched
3. Rely on archiving — three of four are already outside `.planning/phases/`

**Selected: 1 — annotate in place.**

**Notes.** The stated principle: the file should tell the truth to a human reader, not
merely fall outside a scanner's path. Archiving was explicitly rejected as a substitute.
The same in-place treatment applies to the two `[~]` markers. Captured as D-36-05 and
D-36-06; the npm script for `seed-partner-launch.ts` as D-36-07.

---

## Claude's Discretion

Recorded in `36-CONTEXT.md` § Claude's Discretion: the npm script name, the exact wording of
each annotation, where the Phase 29 Nyquist note is filed, the sentinel table/column shape,
and whether the probe ships as a repeatable script or a documented one-shot.

## Deferred Ideas

None. No scope creep occurred — no new capability was proposed at any point.

---

*Phase: 36-gate-repair-planning-record-hygiene*
*Logged: 2026-09-05*
