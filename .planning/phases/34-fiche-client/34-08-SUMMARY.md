---
phase: 34-fiche-client
plan: 08
subsystem: api
tags: [server-actions, route-handler, audit-log, timeline, drizzle, owner-scoping, toctou]

# Dependency graph
requires:
  - phase: 33-pipeline
    provides: advanceRelationshipStageAction / markProposalWonAction / markProposalLostAction, their mock-db test harness, the CR-01 returned-result contract and the WR-16 finding closed here
  - phase: 34-fiche-client (plan 01)
    provides: the relationship_events table, migration 0010 and the RELATIONSHIP_EVENT_KINDS vocabulary
  - phase: 34-fiche-client (plan 05)
    provides: insertRelationshipEventForOwner and its barrel export from '@/lib/db/queries'
provides:
  - D-21 / 33-REVIEW WR-16 closed — the stage-change audit payload carries fromStage AND toStage
  - stage_changed timeline events, attributed, written by advanceRelationshipStageAction (ACTV-02)
  - outcome_set timeline events on both markProposalWonAction and markProposalLostAction (ACTV-02)
  - proposal_finalized timeline events on POST /api/proposals/finalize (ACTV-02)
  - the best-effort event-write convention — after the fact, null/throw tolerant, logged
affects: [34-06 (timeline UI renders these payload shapes), 34-07, 34-10, 34-11, 34-12 (acceptance walkthrough drives all three events)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A DATA READ FOR THE AUDIT PAYLOAD, NOT THE AUTHORIZATION STEP: an owner-scoped SELECT placed before an owner-scoped UPDATE whose own WHERE still carries both predicates, with the action deliberately NOT branching on whether the read returned a row. The test that walks the UPDATE's WHERE starts its search AFTER the `update` call so it cannot accidentally certify the pre-read instead."
    - "Best-effort narration: a timeline event written after the row write it narrates, inside its own try/catch, tolerating both null and throw, logged either way — deliberately inverting the module's 'zero rows is the only failure signal' rule for exactly these writes."
    - "Reusing an owner-scoped UPDATE's own .returning() row to supply a downstream write's foreign key, so an event hook adds no read at all — and above all no new authorization read."
    - "Asserting a jsonb payload's key set EXACTLY (Object.keys().sort()) rather than with objectContaining, so a future amount/commission/rate key fails the suite (D-26 / ADMIN-09)."
    - "A mocked helper that records itself into the db harness's shared ordered call log, making 'the event lands after the UPDATE' assertable on a driver with no transactions."

key-files:
  created: []
  modified:
    - src/lib/pipeline/actions.ts
    - src/lib/pipeline/actions.test.ts
    - app/api/proposals/finalize/route.ts
    - app/api/proposals/finalize/route.test.ts

key-decisions:
  - "fromStage is obtained via <decision_record> implementation (a) — one plain owner-scoped SELECT before the UPDATE — not (b)'s RETURNING variant, because (b) is functionally identical while adding a second shape to a module that has exactly one write idiom, and because the mock-db harness records a plain select as its own builder chain, which is what lets the tests prove the pre-read is NOT the gate."
  - "Each event write is wrapped in its OWN try/catch, not merely null-checked as the plan's snippet showed. A thrown driver error would otherwise reach the action's outer catch and collapse to BOUNDED_ERROR, failing the very stage change or outcome the event only narrates — the exact outcome <decision_record> section two forbids."
  - "The outcome events take client_relationship_id from each action's existing owner-scoped UPDATE .returning() row, so neither outcome action gained a read of any kind."
  - "The finalize hook keeps the [id]/pdf route's `proposal.userId !== userId` shape as defence in depth, explicitly commented as NOT the gate — ownership is proved inside insertRelationshipEventForOwner's INSERT … SELECT by the ownerId argument."
  - "src/lib/db/queries/audit-log.ts was NOT edited even though its Phase 34 NOTE ('34-08 closes WR-16 by writing fromStage too') is now historical rather than pending. Plan 34-01 owns that file and the plan's verification requires its diff to be empty."

patterns-established:
  - "Every system event in this codebase is written by the action or route handler that causes it, with an explicit actorId — never by a database trigger (D-15)."
  - "A narration write may never fail the fact it narrates."

requirements-completed: [ACTV-02]

# Metrics
duration: 12min
completed: 2026-09-03
---

# Phase 34 Plan 08: ACTV-02 system events + D-21 Summary

**Stage changes, recorded outcomes and finalized proposals now each append an attributed, timestamped event to the owning partner's timeline — and the stage-change audit payload finally carries the `fromStage` that `audit-log.ts` has documented since Phase 33.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2/2
- **Files modified:** 4
- **Tests:** 31/31 (pipeline actions), 17/17 (finalize route), 3/3 (server-action error contracts), 2075 passed repo-wide

## Accomplishments

- **D-21 / 33-REVIEW WR-16 closed.** `advanceRelationshipStageAction` writes `{ fromStage, toStage }` to both the audit row and the timeline event. The doc comment that used to justify the omission ("recoverable from the previous audit row, which is what Phase 34's timeline will read") is replaced by the reason that prediction failed: walking `audit_log` backwards joins a table with no relationship index, breaks on the first purge, and yields nothing at all for a relationship's first stage change.
- **Three attributed event hooks.** `stage_changed`, `outcome_set` (won and lost) and `proposal_finalized`, each passing the session user id explicitly — D-15's no-trigger rule is what makes attribution possible at all.
- **No event write can fail the operation it narrates.** Each hook runs after its fact has committed and swallows both a null result and a thrown one.
- **The CR-01 contract survived untouched.** `return { ok: false, reason: 'siren_required' }` is byte-for-byte unchanged, `src/lib/pipeline/actions.ts` was neither moved nor renamed, and `tests/server-action-error-contracts.test.ts` passes.

## Task Commits

1. **Task 1 (RED): pin fromStage and the pipeline timeline events** — `0552cea` (test) — 9 failing, 22 passing
2. **Task 1 (GREEN): fromStage + stage_changed + outcome_set** — `9b3ea14` (feat) — 31/31
3. **Task 2 (RED): pin the proposal_finalized hook's payload, ordering and 200 contract** — `f80244e` (test) — 2 failing, 15 passing
4. **Task 2 (GREEN): the proposal_finalized hook** — `2aa621b` (feat) — 17/17

## Which `fromStage` implementation shipped, and why

**Implementation (a)** from the plan's `<decision_record>`: one plain owner-scoped `SELECT stage … WHERE id = $1 AND owner_id = $2 LIMIT 1`, issued immediately after the parse and before the UPDATE. (b) — `UPDATE … RETURNING id` preceded by the same SELECT — is functionally identical, and that is precisely why it lost: it would add a second write idiom to a module that today has exactly one (`.update().set().where().returning()`), for no behavioural gain.

The deciding factor was testability of the security claim. The mock-db harness records each builder chain in one ordered call log, so with (a) the pre-read and the UPDATE are two distinguishable entries and the predicate-walk test can start its search **after** the `update` entry. That is what makes "the UPDATE's own WHERE still carries both predicates" a real assertion instead of one that would pass just as happily against the pre-read's WHERE (T-34-08-02).

The read is a **data read for the audit payload, not the authorization step**, and the code says so in those words. Three things hold it there:

- the action never branches on whether the read returned a row — `fromStage` falls back to `null`;
- the UPDATE keeps `id = relationshipId AND owner_id = session.user.id` in its own WHERE;
- a zero-row UPDATE is still the only failure signal, and still throws `pipeline.toast.error`.

A test asserts the third point specifically with a queue where the pre-read **succeeds** and the UPDATE matches zero rows. Deleting the pre-read entirely would leave the action exactly as safe — which is the definition of "not the gate".

## The four payload key sets

| Write | Where | Key set (asserted exactly) |
|---|---|---|
| `writeAuditLog` `relationship.stage_change` | `advanceRelationshipStageAction` | `{ fromStage, toStage }` |
| `stage_changed` event | `advanceRelationshipStageAction` | `{ fromStage, toStage }` |
| `outcome_set` event | `markProposalWonAction` / `markProposalLostAction` | `{ proposalId, outcome, outcomeDate }` |
| `proposal_finalized` event | `POST /api/proposals/finalize` | `{ proposalId, lcRef }` |

Every one is asserted with `Object.keys(payload).sort()`, never `objectContaining`. The point of WR-16 is that a half-populated payload passed review once already; and T-34-08-05 needs a future amount, rate or commission key to **fail the suite** rather than slip into a jsonb column that later feeds admin or analytics surfaces (D-26 / ADMIN-09). The `outcome_set` payload deliberately omits the partner's free-text `reason`: it does not belong in a payload beside ids.

The two pre-existing `writeAuditLog` payloads on the outcome actions (`{ outcomeDate }`) were left exactly as Phase 33 wrote them — this plan owns the stage-change payload only.

## Null-tolerant handling — read the missing `throw` as the contract

Four places in the diff call an event write and then do **not** throw when it fails. That is deliberate, and it is the single most likely thing a future reviewer will file as a bug.

The Neon HTTP driver has no transactions (34-PATTERNS trap 1), so every hook here runs **after** the fact it narrates has already committed:

- the stage UPDATE commits, then the event is written;
- the outcome UPDATE commits, then the event is written;
- `finalizeWizard` returns `{ id }` — PDF rendered, uploaded, row finalized — then the event is written.

By that point the only thing a `throw` could achieve is to report a success as a failure. The stage has moved; the outcome is recorded; the PDF exists. A missing timeline entry is a narration gap, and failing the operation to preserve narration completeness would be strictly worse. Each hook therefore logs and continues, and the module header in `src/lib/pipeline/actions.ts` states this inversion of its own "zero rows is the only failure signal" rule explicitly.

**Beyond the plan:** the plan's snippet only handled a `null` return. Each hook is additionally wrapped in its own `try/catch`, because a *thrown* driver error would otherwise reach the action's outer catch and be collapsed into `BOUNDED_ERROR` — failing the stage change or the outcome for exactly the reason `<decision_record>` section two forbids. Tests assert both the null and the thrown path for all four hooks.

## Deviations from Plan

### 1. Each event write got its own `try/catch` (not only a null check)

- **Found during:** Task 1
- **Issue:** the plan's action snippet showed `const event = await insert…; if (!event) console.error(…)` with no `try/catch`. Inside `advanceRelationshipStageAction`'s existing outer `try`, a thrown event write would have been caught, logged and re-thrown as `pipeline.toast.error` — surfacing a successful stage change to the partner as a failed one.
- **Fix:** wrapped each of the three action hooks (and the route hook, which the plan already specified this way) in its own `try/catch`. Rule 2 — the plan's stated intent ("a failed event write never fails the operation that caused it") is only actually delivered this way.
- **Files:** `src/lib/pipeline/actions.ts`, `app/api/proposals/finalize/route.ts`
- **Commits:** `9b3ea14`, `2aa621b`

### 2. Three pre-existing `advanceRelationshipStageAction` tests had their result queues extended

- **Found during:** Task 1
- **Issue:** the mock db serves results from a queue, so adding the D-21 pre-read shifts every subsequent result by one. The three existing stage tests would otherwise have fed the pre-read's row to the UPDATE.
- **Fix:** each queue gained an explicit `[{ stage: 'prospect' }]` pre-read entry, commented as such. The `composes the UPDATE with both … predicates` test additionally now starts its predicate walk after the `update` call — a strengthening, not a weakening: as written it would have passed against the pre-read's WHERE and certified nothing. No assertion was removed or loosened.
- **Files:** `src/lib/pipeline/actions.test.ts`
- **Commit:** `0552cea`

### 3. Three acceptance-criteria `grep -c` counts are higher than the literal numbers in the plan

Every criterion's *intent* holds; the literal counts were written without accounting for import lines and doc comments, which `grep -c` counts as matching lines.

| Criterion | Expected | Actual | Why |
|---|---|---|---|
| `grep -c "insertRelationshipEventForOwner" src/lib/pipeline/actions.ts` | 3 | 5 | 3 call sites (stage, won, lost) + the `import` line + one mention in the module header comment. |
| `grep -c "actorId: session.user.id" src/lib/pipeline/actions.ts` | 3 | 7 | 3 event writes + the 4 pre-existing `writeAuditLog` calls, which already used that identical line since Phase 33. No event is written with a null actor. |
| `grep -c "proposal_finalized" app/api/proposals/finalize/route.ts` | 1 | 3 | 1 `kind:` value + 2 mentions in the extended threat-model doc comment. |

The criteria that discriminate anything all pass exactly: `fromStage` ≥ 3 (3), `siren_required` return = 1, `actorId: userId` = 1, and both `git diff` guards on the finalize route = 0.

### 4. `src/lib/db/queries/audit-log.ts` left untouched despite a now-historical NOTE

Its Phase 34 comment reads "Phase 34 plan 34-08 closes WR-16 by writing `fromStage` too" — accurate but now past tense. Plan 34-01 owns that file and this plan's `<verification>` requires its diff to be empty, so it was not edited. Worth one line from whoever next touches that file.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change; the finalize route's `git diff` shows no line touching `SAFE_ERROR_CODES` or any `status: 500` path, and `package.json` / `package-lock.json` are unchanged (T-34-08-SC).

## Known Stubs

None.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run src/lib/pipeline/actions.test.ts` | 31/31 passed |
| `npx vitest run tests/server-action-error-contracts.test.ts` | 3/3 passed |
| `npx vitest run "app/api/proposals/finalize"` | 17/17 passed |
| `npm run typecheck` | exit 0 |
| `npm run lint:check` (`eslint . --max-warnings=0`) | exit 0 |
| `npm run test` | 156 files, 2075 passed, 38 skipped, 0 failed |
| `git diff package.json package-lock.json` | empty |
| `git diff src/db/schema.ts src/lib/i18n/dictionaries.ts src/lib/db/queries/audit-log.ts` | empty |
| `npm run build` | NOT run — the wave orchestrator builds once when all four parallel plans land |

## Self-Check: PASSED

**Files claimed, verified on disk:**

- `src/lib/pipeline/actions.ts` — FOUND
- `src/lib/pipeline/actions.test.ts` — FOUND
- `app/api/proposals/finalize/route.ts` — FOUND
- `app/api/proposals/finalize/route.test.ts` — FOUND

**Commits claimed, verified in `git log`:**

- `0552cea` — FOUND (test, task 1 RED)
- `9b3ea14` — FOUND (feat, task 1 GREEN)
- `f80244e` — FOUND (test, task 2 RED)
- `2aa621b` — FOUND (feat, task 2 GREEN)

**TDD gate compliance:** both tasks show a `test(…)` commit followed by a `feat(…)` commit, each RED commit verified failing (9 and 2 failures respectively) before its GREEN. No REFACTOR gate was needed.

**Must-haves, verified:**

- `src/lib/pipeline/actions.ts` contains `fromStage` — yes (3 lines)
- `app/api/proposals/finalize/route.ts` contains `proposal_finalized` — yes
- `insertRelationshipEventForOwner` linked from `src/lib/pipeline/actions.ts` — yes (3 call sites)
- no event write carries a null actor — verified by test for all four hooks
