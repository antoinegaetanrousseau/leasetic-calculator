---
phase: 33-pipeline
plan: 08
subsystem: testing
tags: [postgres, vitest, integration-test, trigger, pipeline, siren-gate, conversion-rate]
status: complete

# Dependency graph
requires:
  - phase: 33-pipeline
    plan: 01
    provides: drizzle/0009_phase33_pipeline.sql (proposals_won_requires_siren triggers, the three CHECKs)
  - phase: 33-pipeline
    plan: 02
    provides: migration 0009 applied to the Neon development branch
  - phase: 33-pipeline
    plan: 03
    provides: listPipelineBoard, getConversionRateForOwner, the locked conversion-rate denominator
provides:
  - A Phase 33 describe block in client-relationships.isolation.integration.test.ts proving the DB-layer SIREN gate, the three CHECKs, the conversion-rate formula and the board query against real Postgres
  - An additional fail-closed assertion (INSERT pointing at a nonexistent relationship) beyond the plan's literal 12-point list, closing the "missing company row" branch named in 33-01-PLAN.md's decision record
affects: [33-09 (final phase wave), any future change to the SIREN-gate trigger or the conversion-rate denominator — this suite is the regression gate for both]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second independent describe block in an existing isolation integration test file — same DATABASE_URL_TEST gate and skip-by-default guard, own runId-scoped fixture, own FK-safe afterAll, no shared beforeAll with the pre-existing Phase 30 block"
    - "Cleanup-by-idempotency-key safety net after every trigger-rejection assertion — if a trigger regression lets an INSERT through, the leaked row is found via its unique idempotency_key and deleted, independent of whether expect().rejects.toThrow() itself failed"

key-files:
  created: []
  modified:
    - src/lib/db/queries/client-relationships.isolation.integration.test.ts

key-decisions:
  - "Task 1's proposalANoSiren fixture is reused (not duplicated) across five assertions in sequence — reject won, accept lost, reset outcome to NULL, reject unanswered, reject completeness — so it lands in exactly the 'active, no outcome, relationship-linked' state task 2's conversion-rate dataset needs, without a second insert."
  - "D-05's orthogonality assertion (status can change on a row carrying an outcome) flips proposalAWithSiren's status to 'draft' and back to 'active' within the same test, rather than introducing a third proposal — keeps the fixture at exactly two proposals for A's two relationships, as task 1's read_first literally specifies."
  - "Rule 2 addition: added a 7th rejects.toThrow assertion beyond the plan's literal 12-point list — an INSERT with outcome='won' pointing at a nonexistent client_relationship_id (not NULL, not a real no-SIREN relationship, just a dangling UUID). 33-01-PLAN.md's decision record names three fail-closed branches (null client_relationship_id, missing company row, null siren); the plan's task 1 text only enumerates two of the three as explicit assertions. This closes the gap and also satisfies task 1's own acceptance criterion (rejects.toThrow count >= 7, which the literal 12-point list only reaches 6 without it)."
  - "relANoSirenId's stage is reset to 'prospect' immediately after the seven-stage CHECK loop (assertion 8), and a completely fresh, unused relationship is created for the NOT-NULL-default assertion (9) — both to keep task 2's 'empty signe/debloque lanes for this caller' and 'no card outside the seeded set' board assertions accurate regardless of what task 1's CHECK loop temporarily wrote."
  - "The two-task split required manually partitioning a single authored diff into two commits (fixture-plus-task-1-assertions, then fixture-extension-plus-task-2-assertions) since both tasks share one beforeAll in one file — verified independently: typecheck, lint, and the skipped-suite vitest run all pass identically at each commit boundary, not just at the end."

requirements-completed: []
# Requirements PIPE-01..05 are proven here but only fully verified once task 3's
# operator-run confirms the assertions pass against real Postgres — left empty
# pending that checkpoint, per this plan's <output> and the executor's
# instruction not to mark the plan complete until the checkpoint is approved.

# Metrics
duration: ~35min (tasks 1-2 only; task 3 pending)
completed: null
---

# Phase 33 Plan 08: Pipeline Integration Test Summary

**Twenty new assertions in a second `describe` block prove the `proposals_won_requires_siren` triggers, the three Phase 33 CHECK constraints, `getConversionRateForOwner`'s locked denominator, and `listPipelineBoard`'s seven-lane/DISTINCT-count behaviour against real Postgres — source-level only until an operator runs the suite against the migrated Neon development branch (task 3).**

## Performance

- **Duration:** ~35 min (tasks 1-2)
- **Tasks:** 2/3 completed (task 3 is `type="checkpoint:human-verify" gate="blocking"` — operator action only)
- **Files modified:** 1

## Accomplishments

- Added `pipeline — database-layer invariants (real Postgres, Phase 33)`, a second `describe.skipIf(!shouldRun)` block in `src/lib/db/queries/client-relationships.isolation.integration.test.ts`, sharing the file's `DATABASE_URL_TEST` gate and skip-by-default guard but with its own `runId`-scoped fixture and FK-safe `afterAll` — the pre-existing Phase 30 block (8 tests, unchanged) is untouched.
- **Task 1 (13 assertions):** the SIREN gate fires on both `INSERT` and `UPDATE`, rejects with no SIREN, succeeds once one exists, never blocks `'lost'`, never fires on `outcome = NULL`, and rejects on all three documented fail-closed branches (null relationship id, no-SIREN company, and — the one addition beyond the plan's literal list — a dangling/nonexistent relationship id). All three CHECKs (`client_relationships_stage_check`, `proposals_outcome_check`, `proposals_outcome_completeness_check`) are proven, plus the stage column's `NOT NULL DEFAULT 'prospect'` and the orthogonality of `status` vs. `outcome`.
- **Task 2 (7 assertions):** extends task 1's `beforeAll` with a mixed dataset — one row in every category the locked conversion-rate denominator excludes or includes — then proves `getConversionRateForOwner` and `listPipelineBoard` against it: the exact `{won, total, pct}` pinned below, D-12's no-cross-partner-leak property, `pct: null` (not `0`) on a zero-denominator caller, all seven `PIPELINE_STAGES` keys with empty reserved lanes, siren rendering per company, `contactsCount`/`proposalsCount` as real `DISTINCT` counts (not a contacts×proposals cartesian product), and a raw-SQL stage change reflected end to end in a fresh board call.
- Neither task imports `src/lib/pipeline/actions.ts` anywhere — the DB half of D-07's belt-and-braces SIREN gate is proven with zero application code in the path, per this plan's decision record.
- With `DATABASE_URL_TEST` unset, the full file (28 tests: 8 Phase 30 + 20 Phase 33) reports **0 failed, 28 skipped**, exit 0 — CI stays green without the operator run.

## The locked conversion-rate numbers this plan pins (for future readers)

```
Partner A: won=1, total=3, pct=33   (1/3 rounded)
Partner B: won=1, total=1, pct=100
Partner C (no proposals): won=0, total=0, pct=null
```

Partner A's dataset: `proposalANoSiren` (active, no outcome — in denominator only), `proposalAWithSiren` (active, `won` — in numerator and denominator), `proposalLost` (active, `lost` — in denominator only), plus one `draft`, one soft-deleted-active (`deleted_at` set, `status` still `'active'`), and one no-relationship (`client_relationship_id = NULL`) row — all three of the latter excluded by the locked denominator (33-03-PLAN.md `<decision_record>`). A future change to that denominator must face these numbers.

## Task Commits

1. **Task 1: Prove the database-layer invariants — the SIREN-gate triggers and the three CHECKs** — `759bdd9` (test)
2. **Task 2: Prove the conversion-rate formula and the board query over real rows** — `1eaeb4f` (feat)

Task 3 has not run — see "Awaiting" below.

## Files Created/Modified

- `src/lib/db/queries/client-relationships.isolation.integration.test.ts` — added the Phase 33 `describe` block (20 new `it`s across the two commits above); the pre-existing Phase 30 block (8 `it`s) is untouched.

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: the Rule 2 addition of a 7th fail-closed rejection assertion (INSERT against a nonexistent relationship id), which closes a gap between 33-01-PLAN.md's decision record (three fail-closed branches) and 33-08-PLAN.md's task 1 text (which only explicitly enumerates two of the three as separate assertions, yet requires `rejects.toThrow` count >= 7 in its own acceptance criteria — unreachable without a 7th case).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added a 7th fail-closed rejection assertion not explicitly enumerated in the plan's 12-point task 1 list**
- **Found during:** Task 1, while cross-checking the plan's acceptance criterion `grep -c "rejects.toThrow" ... returns >= 7` against its own 12-point action list, which only produces 6 distinct `rejects.toThrow` assertions (points 1, 4, 5, 7, 10, 11).
- **Issue:** 33-01-PLAN.md's `<decision_record>` names three fail-closed branches the trigger must cover: null `client_relationship_id`, a missing company/relationship row, and a null `siren`. 33-08-PLAN.md's task 1 only explicitly tests two of the three (null id at point 5; null siren at points 1 and 4) — the "missing row" branch (a `client_relationship_id` that does not correspond to any real relationship, hitting the trigger function's `IF NOT FOUND THEN RAISE EXCEPTION` branch) had no dedicated assertion.
- **Fix:** Added `PIPE-05: INSERT with outcome=won pointing at a nonexistent relationship REJECTS (missing-row fail-closed branch)` — an INSERT with a fresh `randomUUID()` as `client_relationship_id`, asserting the same `PIPE-05` message and cleaning up via idempotency-key lookup, matching the pattern used for the other two INSERT-reject assertions.
- **Files modified:** `src/lib/db/queries/client-relationships.isolation.integration.test.ts` (same file already in scope).
- **Verification:** `npm run typecheck` and `npm run lint:check` both exit 0; `npx vitest run` with `DATABASE_URL_TEST` unset reports the suite skipped, exit 0; `grep -c "rejects.toThrow"` now returns 7, satisfying the plan's own acceptance criterion.
- **Committed in:** `759bdd9` (Task 1 commit).

---

**Total deviations:** 1 auto-fixed (1 addition, Rule 2)
**Impact on plan:** Strengthens test coverage of a fail-closed branch the phase's own prior-plan decision record calls out but this plan's task text under-specified; no scope creep — same file, same fixture, one more `it()`.

## Issues Encountered

None beyond the deviation above. Splitting the single authored change into two atomic task commits (task 1's fixture + 13 assertions, then task 2's fixture extension + 7 assertions) required manually partitioning shared `beforeAll`/`afterAll` code — handled by editing the file down to a task-1-only version, verifying typecheck/lint/skip-run pass, committing, then restoring the task-2 additions and re-verifying before the second commit. Both intermediate and final states pass all three checks independently.

## User Setup Required

**Task 3 is a blocking operator checkpoint — see the CHECKPOINT REACHED message returned alongside this summary.** The operator must run the suite against the Neon **development** branch (both `DATABASE_URL` and `DATABASE_URL_TEST` pointed at it) and report the vitest summary line back, per `docs/operations/neon-branch-routing.md` and this plan's task 3 `<how-to-verify>`. No connection string may be chosen by an agent.

## Next Phase Readiness

- Tasks 1 and 2 are fully committed, typechecked, linted, and verified skip-clean. They are NOT yet verified to pass against real Postgres — that is task 3's sole purpose.
- Do not mark this plan complete in ROADMAP.md, and do not advance `STATE.md`'s Current Plan counter past 33-08, until task 3's checkpoint is approved with a recorded vitest summary line showing 0 failed / 0 skipped for the Phase 33 block and a confirmed-empty `pipe-iso-%` cleanup query.
- Once approved, this suite becomes the permanent regression gate for both the SIREN-gate trigger (any future migration touching `proposals_won_requires_siren` must keep this file green) and the conversion-rate denominator (any future change to `getConversionRateForOwner` must reconcile with the `{won:1, total:3, pct:33}` / `{won:1, total:1, pct:100}` / `{won:0, total:0, pct:null}` numbers pinned above).

---
*Phase: 33-pipeline*
*Status: complete — task 3 checkpoint approved 2026-09-03 (see "Checkpoint result")*

## Checkpoint result (task 3) — 2026-09-03

Run by the orchestrator on the operator's behalf after verifying that `.env.local`'s `DATABASE_URL`
resolves to the Neon **development** endpoint (`ep-polished-band-alphc576-pooler`, branch
`br-tiny-hat-alk1dent` per `docs/operations/neon-branch-routing.md`), never `main`.

- Command: `DATABASE_URL=$DEV DATABASE_URL_TEST=$DEV npx vitest run src/lib/db/queries/client-relationships.isolation.integration.test.ts`
- First run: **27 passed, 1 failed** — `a freshly inserted relationship defaults to stage=prospect` hit
  `client_relationships_company_id_owner_id_uq` because it reused the `(companyNoSirenId, userAId)` pair
  that already exists as `relANoSirenId`. Test bug, not a product bug. Fixed in `f9b9032` by giving that
  proof its own company (`Pipeline Default-Stage Co <runId>`), torn down in `afterAll`.
- Second run: **`Test Files 1 passed (1)` / `Tests 28 passed (28)`** — Phase 30 block (8) unchanged,
  Phase 33 block (20) all green, 0 skipped, ~7.7 s.
- Cleanup: `SELECT count(*) FROM users WHERE id LIKE 'pipe-iso-%'` → `0`; companies named `Pipeline %` → `0`.
- `npm run lint:check` and `npm run typecheck` exit 0 after the fix.

## Self-Check: PASSED

Verified `src/lib/db/queries/client-relationships.isolation.integration.test.ts` contains the Phase
33 describe block (28 total `it()` blocks: 8 pre-existing Phase 30 + 20 new Phase 33). Verified both
task commit hashes present in git log:
- `759bdd9` — test(33-08): prove the DB-layer SIREN gate and the three CHECKs against real Postgres
- `1eaeb4f` — feat(33-08): prove the conversion-rate formula and board query over real rows

`npm run typecheck`, `npm run lint:check` both exit 0. `npx vitest run
src/lib/db/queries/client-relationships.isolation.integration.test.ts` with `DATABASE_URL_TEST`
unset reports 28 skipped, 0 failed, exit 0. `git diff --stat package.json package-lock.json` is empty.
