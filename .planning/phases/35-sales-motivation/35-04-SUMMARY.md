---
phase: 35-sales-motivation
plan: 04
subsystem: testing
tags: [postgres, integration-test, drizzle, owner-isolation, jsonb, group-by]

# Dependency graph
requires:
  - phase: 35-sales-motivation (plan 02)
    provides: "src/lib/db/queries/momentum.ts — listWeeklyMovementsForOwner, listProgressWeekKeysForOwner, getBadgeCountsForOwner"
provides:
  - "src/lib/db/queries/momentum.isolation.integration.test.ts — skip-by-default real-Postgres proof of owner isolation, the half-open week window, D-11's Perdu exclusion, and D-01's note/next-action vocabulary exclusion"
  - "Two real bugs in momentum.ts (35-02), found and fixed only because this suite ran against real Postgres"
  - "Mutation evidence (3/3) that the suite is load-bearing, not incidental"
affects: [35-05-home-page-wiring, any-future-phase-touching-momentum-ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GROUP BY ordinal position (sql`1`), not a repeated sql fragment object — reusing the same JS sql chunk in SELECT and GROUP BY still emits two separate bind parameters at the wire level; Postgres's functional-dependency check compares parameter nodes, not runtime values, so it rejects the column as ungrouped even when both parameters hold the same value"
    - "sql.json(obj), never JSON.stringify(obj) + '::jsonb' cast — the postgres driver JSON-encodes an object parameter once when told the target is JSON; pre-stringifying and casting the resulting TEXT double-encodes it into a jsonb STRING SCALAR, and every ->> extraction on it silently returns NULL"

key-files:
  created:
    - src/lib/db/queries/momentum.isolation.integration.test.ts
  modified:
    - src/lib/db/queries/momentum.ts

key-decisions:
  - "Both bugs found while running this suite for real were fixed in place (Rule 1) rather than deferred: momentum.ts is the exact module this plan exists to validate, and Task 3's own mutation-testing step requires editing this same file, so both fixes are squarely in this plan's scope."
  - "GROUP BY 1 (ordinal) chosen over re-deriving the timezone as a raw SQL literal — the existing code comment explicitly justifies binding MOMENTUM_TIME_ZONE as a parameter (D-10's 'one window definition' across the SQL/TS boundary), so the fix preserves that intent instead of overriding it."

requirements-completed: [GAME-01, GAME-02, GAME-04]

# Metrics
duration: ~30min active (across a human-action checkpoint pause for a non-production DB URL)
completed: 2026-09-05
---

# Phase 35 Plan 04: Momentum Isolation Integration Tests Summary

**Skip-by-default real-Postgres suite proving owner isolation, the half-open week window, and D-11/D-01's progress vocabulary for the three momentum queries — which, on its first real run, caught two production-shipping bugs in `momentum.ts` that 2297 mocked-driver tests never could.**

## Performance

- **Duration:** ~30 min of active work, split by a `checkpoint:human-action` pause (Task 2) while the operator supplied a non-production `DATABASE_URL_TEST`
- **Started:** 2026-09-05T00:07 (approx, Task 1)
- **Completed:** 2026-09-05T10:34
- **Tasks:** 3 (1 auto, 1 checkpoint:human-action, 1 auto)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- New sibling integration file `momentum.isolation.integration.test.ts` (`describe.skipIf(!DATABASE_URL_TEST)`), never wired into `npm test`, CI, or any package script — confirmed by an unset-env-var run reporting 9/9 skipped and a `git diff --name-only` showing zero changes to `package.json`, `.github/`, or `vitest.config.*`.
- Nine `it(...)` blocks proving, against real Postgres: owner isolation including through a company two partners both hold (assertions 1–2); the half-open `[start, end)` week window (assertion 3); total-vs-capped row semantics (assertion 4); D-11's Perdu-shown-but-not-counted rule via a dedicated single-purpose fixture relationship three weeks back (assertion 5); D-01's note/next-action-set exclusion via a second dedicated fixture two weeks back (assertion 6); owner-scoped badge counts (assertion 7); admin/nonexistent-id indistinguishability (assertion 8); and D-03's no-write-side-effects guarantee (assertion 9).
- **Two real production bugs found and fixed**, both invisible to `momentum.test.ts`'s mocked driver — see Deviations below.
- **Full mutation evidence collected (3/3)**: each of the three required mutations (owner predicate, Perdu exclusion, window exclusivity) produced a named test failure, then was reverted with `git diff --exit-code src/lib/db/queries/momentum.ts` confirmed clean before moving to the next.
- Final state: `npm run lint:check`, `npm run typecheck`, and a full `npx vitest run` **without** the env file sourced all pass clean (172 files / 2308 tests passed, 6 files / 61 tests skipped) — CI stays green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the skip-by-default isolation + week-window suite** - `baa77ed` (test)
2. **Task 2: Operator supplies a non-production DATABASE_URL_TEST** - checkpoint, no code commit (operator supplied `.env.test.local`, gitignored, never committed)
3. **Task 3: Run the suite and collect mutation evidence** - no commit (all three mutations reverted; verified via `git diff --exit-code`)

**Fix commits found while executing Task 1/3 against real Postgres** (Rule 1 — auto-fixed bugs):
- `06197fc` (fix) — `listProgressWeekKeysForOwner`'s `GROUP BY` ordinal fix
- `ada695e` (fix) — isolation suite's jsonb double-encoding fix

**Plan metadata:** (this commit) `docs(35-04): complete momentum-isolation-integration-tests plan`

_No TDD tasks in this plan — Task 1 and Task 3 were `type="auto"` without `tdd="true"`; Task 2 was `checkpoint:human-action`._

## Files Created/Modified

- `src/lib/db/queries/momentum.isolation.integration.test.ts` - the 9-assertion skip-by-default suite (created in Task 1, corrected in a follow-up commit once run for real)
- `src/lib/db/queries/momentum.ts` - one-line `GROUP BY 1` fix in `listProgressWeekKeysForOwner` (all other code unchanged after the three mutation/revert cycles — `git diff --exit-code` confirmed clean)

## Decisions Made

- Both real bugs discovered while running the suite were fixed in place rather than deferred to `deferred-items.md` — `momentum.ts` is the exact file this plan exists to validate, and Task 3's own instructions already require editing it for mutation testing, so this stayed squarely in-plan (Rule 1: auto-fix bugs; see `<deviation_rules>` in the executor workflow).
- Chose `GROUP BY 1` (ordinal) over hardcoding `MOMENTUM_TIME_ZONE` as a raw SQL literal in the `GROUP BY` clause, preserving the existing code comment's explicit reasoning for binding it as a parameter (D-10's "one window definition" across the SQL/TypeScript boundary).
- Fixture design: two dedicated single-event relationships (Perdu-only, three weeks back; note+next_action_set-only, two weeks back) rather than relying only on mixed-event weeks, so assertions 5 and 6 are decisive rather than incidental — a broken exclusion rule fails a *specific*, isolated week key, not a week key that would also be produced by other legitimate events.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `listProgressWeekKeysForOwner` threw on every real call**
- **Found during:** Task 1's first real run against `DATABASE_URL_TEST` (development branch)
- **Issue:** `NeonDbError: column "relationship_events.occurred_at" must appear in the GROUP BY clause or be used in an aggregate function`. The function reused the same JS `sql` fragment (`weekKeyExpr`, itself parameterizing `MOMENTUM_TIME_ZONE`) in both `.select()` and `.groupBy()`. The `postgres`/Drizzle stack still emits **two separate bind parameters** for that reused fragment at the wire level (`$1` in the SELECT list, `$17` in the GROUP BY clause). Postgres's GROUP BY functional-dependency check compares parsed parameter *nodes*, not the runtime values they'll carry, so it saw two syntactically distinct expressions and rejected `occurred_at` as ungrouped — even though both parameters always hold `'Europe/Paris'`. This is a genuine production defect from Plan 35-02, invisible to `momentum.test.ts`'s mocked driver (which never executes real SQL through Postgres's planner) and to the 2297-test full `vitest run` reported clean at 35-02's close.
- **Fix:** Changed `.groupBy(weekKeyExpr)` to `.groupBy(sql\`1\`)` (grouping by the SELECT list's ordinal position instead of re-evaluating the expression). Documented in a code comment at the function.
- **Files modified:** `src/lib/db/queries/momentum.ts`
- **Verification:** Re-ran the isolation suite against real Postgres — `listProgressWeekKeysForOwner` executes without error and assertions 5/7/8 (which all call it) pass. Confirmed `momentum.test.ts`'s 13 mocked-driver unit tests still pass unchanged (no test asserted on the specific `.groupBy()` argument).
- **Committed in:** `06197fc`

**2. [Rule 1 - Bug] The isolation suite's own jsonb payloads were silently empty**
- **Found during:** Task 1's first real run, immediately after fixing #1 above — assertions 5 and 7 still failed (`perduRow` undefined; `distinctClients` off by one)
- **Issue:** `insertEvent`'s helper built the payload as `JSON.stringify(opts.payload)` then interpolated it as `${payloadJson}::jsonb`. The `postgres` driver JSON-encodes an object bind parameter exactly once when the target type is `jsonb`; handing it an **already-stringified string** made it encode a second time, storing a jsonb **STRING SCALAR** (e.g. `"{\"toStage\":\"perdu\"}"` as a JSON string, not an object) rather than a JSON object. Every `payload->>'toStage'` extraction on such a row silently returns `NULL` — the rows existed and counted correctly by `kind`, but every stage-derived assertion saw `null` where it expected a stage name. This is a bug in the test file authored in Task 1 of *this* plan, not in production code.
- **Fix:** Switched to `sql.json(opts.payload ?? null)` and narrowed the `insertEvent` payload parameter type from `Record<string, unknown> | null` to `Record<string, string> | null` (matching actual fixture usage and resolving a TypeScript inference conflict with the `postgres` package's `JSONValue` type).
- **Files modified:** `src/lib/db/queries/momentum.isolation.integration.test.ts`
- **Verification:** Re-ran the full suite against real Postgres — all 9 assertions pass; `npm run typecheck` and `npm run lint:check` both exit 0.
- **Committed in:** `ada695e`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs surfaced only by running real SQL, which is this plan's entire reason for existing)
**Impact on plan:** Both fixes are necessary for the suite to prove anything at all — an unfixed `momentum.ts` would have made this plan's own Task 3 impossible (mutation-testing a query that already throws is meaningless), and an unfixed test file would have silently passed assertions that were actually checking `undefined`/`null` against `undefined`/`null`. No scope creep: both files are already in this plan's declared scope (`momentum.isolation.integration.test.ts` is the plan's sole `files_modified` entry; `momentum.ts` is the file Task 3 explicitly mutates and reverts).

## Mutation Evidence (Task 3)

Run against the Neon `development` branch (`ep-polished-band-alphc576-pooler...`, confirmed NOT the production `ep-icy-boat-alx5o1tz-pooler` endpoint via an independent hostname check before any mutation work began). Each mutation was applied, the suite re-run, the failure recorded, then reverted with `git checkout -- src/lib/db/queries/momentum.ts` and the suite re-confirmed green before the next mutation.

| Mutation | Change | Expected failing block | Observed failing block(s) | Verdict |
|---|---|---|---|---|
| **M1 — owner predicate** | Deleted `eq(schema.clientRelationships.ownerId, ownerId)` from `listWeeklyMovementsForOwner`'s WHERE | Owner-isolation block | `assertion 1 (THE HEADLINE CLAIM)` — `expected false to be true` at `aResult.rows.every(r => [relAOnlyId, relASharedId].includes(r.relationshipId))` (A's own query now also returned B's rows); also failed `assertion 2`, `assertion 4`, `assertion 8` | **PASS** — isolation proven load-bearing |
| **M2 — Perdu exclusion** | Deleted `AND ${TO_STAGE_EXPR} <> 'perdu'` from `IS_PROGRESS_EVENT` | D-11 block | `assertion 5 (D-11)` — `expected [ '2026-08-17', '2026-08-31', …(2) ] to not include '2026-08-17'` (the dedicated Perdu-only week's key now appeared); also failed `assertion 7` (badge count inflated) | **PASS** — Perdu exclusion proven load-bearing |
| **M3 — window exclusivity** | Changed `lt(occurredAt, window.end)` to `lte(...)` (added `lte` import) | Half-open-window block | `assertion 3` — `expected [ 1789336800000, 1789336799999, …(2) ] to not include 1789336800000` (the event seeded at exactly `win.end` was now included); also failed `assertion 4` | **PASS** — window exclusivity proven load-bearing |

Final state confirmed: `git diff --exit-code src/lib/db/queries/momentum.ts` exits 0 (all mutations reverted), and the suite re-ran green (9/9 passed) immediately after the last revert. No connection string appears anywhere in this file, the test file, or any command output above.

## Issues Encountered

Two genuine bugs surfaced on the suite's first real run — see Deviations above. Both were fixed and re-verified before proceeding to mutation testing; no issues remained unresolved.

## User Setup Required

None for future runs beyond what Task 2 already covers: this suite is hand-invoked only. To run it again, export `DATABASE_URL` and `DATABASE_URL_TEST` to the same non-production Postgres URL (e.g. source a local `.env.test.local`, which is gitignored) and run:

```
DATABASE_URL=$DEV_DB_URL DATABASE_URL_TEST=$DEV_DB_URL npx vitest run \
  src/lib/db/queries/momentum.isolation.integration.test.ts
```

`DATABASE_URL_TEST` is deliberately not wired into CI (per this plan's `<objective>` — explicitly out of scope).

## Next Phase Readiness

- Phase 35's momentum query layer (`momentum.ts`) is now verified against real Postgres, with two real bugs fixed that would otherwise have shipped silently (the streak feature would have thrown on every real page load — `listProgressWeekKeysForOwner` is on the direct path for GAME-02's streak computation).
- 35-05 (home-page wiring) can proceed without further changes to `momentum.ts`; the query layer's contract (owner isolation, half-open window, D-11/D-01 vocabulary, D-03 no-write) is now proven, not just asserted.
- No blockers. `git status --short` is clean; the isolation suite remains skip-by-default and untouched by CI.

---
*Phase: 35-sales-motivation*
*Completed: 2026-09-05*
