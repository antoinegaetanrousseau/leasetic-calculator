# Deferred items — 31.1-app-shell-refresh

## `npm run lint:check` reports 559 errors inside `.claude/worktrees/*`

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
