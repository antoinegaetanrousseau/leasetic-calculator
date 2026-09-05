# Phase 7 Deferred Items

Out-of-scope discoveries logged during plan execution. These are not bugs in the current plan's work — they are pre-existing issues to address in a future plan.

## Plan 07-01 (calc-engine-core)

### Pre-existing lint warning in `scripts/seed-admins-launch.ts`

**Discovered:** 2026-05-08 during 07-01 verification (`npm run lint:check`)
**File:** `scripts/seed-admins-launch.ts:42`
**Issue:** `'and' is defined but never used` (`@typescript-eslint/no-unused-vars`) — the `and` operator is imported from drizzle-orm but never referenced.
**Origin:** Phase 6 launch commit `d5a8a54` (one-off admin seeding script).
**Why deferred:** Out of Plan 07-01's scope (lint warning is in scripts/, not in src/lib/calc/). Per executor scope boundary rules, I do NOT auto-fix issues unrelated to the current task's changes.
**Suggested resolution:** Trivial one-line fix — remove `and` from the import. Address as a Phase 9 cleanup pass, OR roll into the next script touch. Not blocking since `npm run lint` (without `--max-warnings=0`) still passes.

**Note for Plan 07-01 SUMMARY:** Plan 07-01 verification used `npm run lint` (zero errors) instead of `npm run lint:check` (which fails on the pre-existing warning). The calc-engine code itself produces zero lint warnings.
