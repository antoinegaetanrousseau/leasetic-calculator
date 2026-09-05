# Deferred items — 31.1-app-shell-refresh

## `npm run lint:check` reports 559 errors inside `.claude/worktrees/*`

**Status: CLOSED 2026-09-05** (Phase 36, HOUSE-01 — D-36-01). No code change required.

**Found during:** Plan 31.1-01, Task 3 verification (`npm run lint:check`).

**Out of scope — not caused by this plan.** Two stray, untracked git-worktree
directories exist at the repo root: `.claude/worktrees/inspiring-benz-337233/`
and `.claude/worktrees/recursing-jang-941dda/`. They are full checked-out
copies of the repo (leftover from prior parallel-executor sessions) and are
picked up by ESLint's default file discovery because they sit under the
project root and are not excluded by `.eslintignore` / the flat-config
`ignores` array.

Every reported error belongs to files inside those two directories — imports
restricted by `no-restricted-imports` (`postgres`, `@neondatabase/serverless`,
`@aws-sdk/*`, `@vercel/blob`, `exceljs`, `@react-pdf/renderer`) and one
hardcoded-JSX-text violation. None of these paths were touched by this plan
(`app/globals.css`, `tests/radius-scale.test.ts` only), and `npx eslint
tests/radius-scale.test.ts` on its own reports zero problems.

**Not fixed here** — deleting or cleaning up someone else's worktree
directories is outside this plan's file scope (`app/globals.css`,
`tests/radius-scale.test.ts`) and risks discarding in-progress work from
another agent/session. Flagging for the operator or a future housekeeping
pass: either remove the stray worktrees (`git worktree list` /
`git worktree remove`) or add `.claude/worktrees/` to the ESLint `ignores`
config so a clean project tree doesn't get flagged by unrelated work.

## Closure — 2026-09-05

Re-verified live during Phase 36 (HOUSE-01) execution. Four facts, nothing
invented beyond them:

(a) `npm run lint:check` (`eslint . --max-warnings=0`) exits `0` with no
    output on the clean tree, re-run on 2026-09-05 during Phase 36 execution.

(b) `git worktree list` reports only
    `/Users/antoinerousseau/Developer/leasetic-calculator` on `main` — both
    `inspiring-benz-337233/` and `recursing-jang-941dda/` were removed on
    2026-09-03, and `.claude/worktrees/` is now an empty directory.

(c) The recurrence guard already exists and is not being added by this
    phase: the global `ignores` array in `eslint.config.mjs` already lists
    `'.claude/**'`, which covers any future worktree under
    `.claude/worktrees/` — so the note's own second remedy above was already
    taken independently.

(d) The narrower `.claude/worktrees/**` ignores entry this note suggested
    was explicitly REJECTED by the operator (D-36-01) as redundant with
    `'.claude/**'`, and no test pinning either entry was added.

**Lesson carried into `36-CONTEXT.md` § Specific Ideas:** this finding was
written from a three-day-old deferral note describing a condition that had
already stopped holding by the time it was read — scouting the live tree
before planning from a note would have caught this without a dedicated
housekeeping phase.
