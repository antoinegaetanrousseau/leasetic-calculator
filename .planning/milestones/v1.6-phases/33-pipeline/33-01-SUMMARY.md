---
phase: 33-pipeline
plan: 01
subsystem: database
tags: [drizzle, postgres, trigger, i18n, pipeline, crm]

# Dependency graph
requires:
  - phase: 30-company-contact-registry
    provides: client_relationships table, companies.siren column
  - phase: 31-reconciliation
    provides: migration hand-completion convention (0008), trigger precedent (0004)
provides:
  - clientRelationships.stage column + client_relationships_stage_check CHECK
  - proposals.outcome/outcomeDate/outcomeReason columns + their two CHECKs
  - src/lib/pipeline/stages.ts (PipelineStage vocabulary, single source of truth)
  - drizzle/0009_phase33_pipeline.sql with the DB-level SIREN gate (2 triggers + function)
  - pipeline.* + sidebar.nav.pipeline dictionary namespace (FR + EN)
affects: [33-02 (applies this migration), 33-03..33-08 (board/query/actions/UI plans that import stages.ts and the dictionary keys)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-table business-rule trigger (not a CHECK) for invariants spanning >1 table — new pattern class, first non-immutability trigger in this codebase"
    - "outcome set + outcome_date required, outcome_reason optional — nullable-pair completeness CHECK, same shape as company_pair_decisions_resolution_check"

key-files:
  created:
    - src/lib/pipeline/stages.ts
    - src/lib/pipeline/stages.test.ts
    - drizzle/0009_phase33_pipeline.sql
    - drizzle/meta/0009_snapshot.json
  modified:
    - src/db/schema.ts
    - src/lib/i18n/dictionaries.ts
    - drizzle/meta/_journal.json
    - src/lib/pdf/no-commission.test.ts

key-decisions:
  - "D-07's DB-level SIREN gate is a trigger, not a CHECK — a plain CHECK constraint cannot reference companies.siren from a proposals row (no cross-table joins/subqueries in Postgres CHECK). Two triggers (BEFORE INSERT / BEFORE UPDATE, both WHEN-gated to outcome = 'won') share one plpgsql function that resolves client_relationship_id -> client_relationships.company_id -> companies.siren, FOR SHARE, and fails closed (RAISE EXCEPTION) on a null relationship, a missing company row, or a null siren."
  - "Rule 3 auto-fix: added 0009_phase33_pipeline.sql to no-commission.test.ts's KNOWN_MIGRATIONS drift guard — the test fails loud on any unreviewed migration file, and this migration adds no commission-related column."
  - "STAGE_DICT_KEY is typed Record<PipelineStage, DictKey> (not a plain string record) per the plan spec — a type-only import from dictionaries.ts, no runtime circularity since dictionaries.ts does not import stages.ts."

patterns-established:
  - "New checks/columns appended at the END of a table's constraint array (not adjacent to the constraint they're conceptually near) to keep git diff hunks isolated from unrelated existing constraints — avoids a diff-grep false positive on an untouched CHECK."

requirements-completed: [PIPE-01, PIPE-02, PIPE-03, PIPE-05]

# Metrics
duration: ~25min
completed: 2026-09-03
---

# Phase 33 Plan 01: Pipeline Data Foundation Summary

**Stage column on client_relationships (7-value CHECK), outcome trio on proposals (2 CHECKs), a hand-completed migration carrying two SIREN-gate triggers, and the full pipeline.* FR/EN dictionary namespace — all four artifacts every later Phase 33 plan imports from.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3/3 completed
- **Files modified/created:** 8 (2 modified schema/dict files, 2 new pipeline module files, 3 migration files, 1 unrelated-guard-test fix)

## Accomplishments

- `client_relationships.stage` (`text`, `NOT NULL DEFAULT 'prospect'`) with `client_relationships_stage_check` restricting it to the seven D-01 values, plus `client_relationships_owner_id_stage_idx` for the board query.
- `proposals.outcome` / `outcome_date` / `outcome_reason` as fresh top-level columns (never touching `inputs`/`paramsSnapshot`/`computed`/`schemaVersion` — CRM-05 immutability intact), with `proposals_outcome_check` (only `'won'`/`'lost'` ever stored — `'unanswered'` is derived, D-06) and `proposals_outcome_completeness_check` (outcome set requires outcome_date set; reason stays optional per D-08).
- `src/lib/pipeline/stages.ts` — the single TypeScript source of truth for the stage vocabulary: `PIPELINE_STAGES` (7-tuple, D-01 order), `RESERVED_STAGES`/`PARTNER_SETTABLE_STAGES` (disjoint partition), `isReservedStage`, `DEFAULT_STAGE`, `STAGE_DICT_KEY`. Tested with 7 assertions.
- **Migration filename:** `drizzle/0009_phase33_pipeline.sql`, **journal idx 9** (`"tag": "0009_phase33_pipeline"`). Generated via `npm run db:generate`, renamed from drizzle-kit's random slug, hand-completed with the SIREN-gate trigger following the `drizzle/0004_phase12_drafts_and_history.sql` precedent and the `drizzle/0008_phase31_reconciliation.sql` header-comment convention.
- **Trigger/function names:** `proposals_won_requires_siren()` (plpgsql function), `proposals_won_requires_siren_ins` (`BEFORE INSERT`), `proposals_won_requires_siren_upd` (`BEFORE UPDATE`, additionally gated on `NEW.outcome IS DISTINCT FROM OLD.outcome`). Both triggers carry a `WHEN (NEW.outcome = 'won' ...)` clause so non-`won` writes (draft creation, finalization, soft-delete, restore, purge) pay zero trigger overhead.
- The complete `pipeline.*` namespace (43 keys) plus `sidebar.nav.pipeline`, in both `fr` and `en`, compiling under `_EnParityProof`.
- **Migration is authored but NOT applied** — applying it is plan 33-02's job, per the hard project constraint against running `db:migrate`/`push` locally.

## D-07: trigger over CHECK — the reasoning (for 33-08's integration test and future readers)

`33-CONTEXT.md` D-07 requires the SIREN gate enforced in both the server action and a DB constraint. A plain PostgreSQL `CHECK` constraint can only reference columns of the row being checked — no subqueries, no cross-table joins — and the predicate spans `proposals` → `client_relationships` → `companies.siren`, three tables. A CHECK is therefore not buildable for this invariant.

**Chosen: a row-level trigger** (option a in the plan's decision record), not a fallback to server-action-only enforcement (option b), because:
1. It is the only mechanism that satisfies D-07's stated intent (a second, application-independent enforcement point) and holds under concurrent writes.
2. This project has already been burned by the "one write path so a constraint is redundant" assumption once: Phase 30's single-writer grep gate on `proposals.client_relationship_id` had to be widened in Phase 31. Weakening D-07 here for convenience would repeat that mistake.
3. `coefficient_history_no_modify` (`drizzle/0004_phase12_drafts_and_history.sql:43-47`) is a shape precedent only — it guards immutability, not a cross-table business rule, so this trigger is genuinely new ground for this codebase, hand-written directly into the migration exactly as `0008`'s `LEAST/GREATEST` index and self-pair CHECK were.

**Concurrency:** the trigger function reads the company row `FOR SHARE`, so a concurrent `UPDATE companies SET siren = NULL` on that row blocks until the `proposals` write commits. The gate fails closed only — never open: a SIREN written concurrently makes a retry succeed; a SIREN removed concurrently makes the write fail.

## Task Commits

1. **Task 1: Add the stage column, the outcome trio, and their CHECKs to the Drizzle schema** — `08ffcc1` (feat)
2. **Task 2: Generate and hand-complete migration 0009 with the cross-table SIREN-gate triggers** — `c40c04b` (feat)
3. **Task 3: Add the complete pipeline.* dictionary namespace in FR and EN** — `5874343` (feat)

## Files Created/Modified

- `src/db/schema.ts` — `clientRelationships.stage` + CHECK + index; `proposals.outcome`/`outcomeDate`/`outcomeReason` + two CHECKs, appended at the end of each table's constraint array
- `src/lib/pipeline/stages.ts` — the stage vocabulary module (new)
- `src/lib/pipeline/stages.test.ts` — 7 assertions covering order, partition, `isReservedStage`, `STAGE_DICT_KEY` completeness (new)
- `drizzle/0009_phase33_pipeline.sql` — columns, CHECKs, index, and the two SIREN-gate triggers (new)
- `drizzle/meta/_journal.json` — appended idx 9 entry
- `drizzle/meta/0009_snapshot.json` — drizzle-kit generated snapshot (new)
- `src/lib/i18n/dictionaries.ts` — `pipeline.*` namespace (43 keys) + `sidebar.nav.pipeline`, FR and EN
- `src/lib/pdf/no-commission.test.ts` — added `0009_phase33_pipeline.sql` to the `KNOWN_MIGRATIONS` drift-guard allowlist (Rule 3 auto-fix, see Deviations)

## Decisions Made

See "D-07: trigger over CHECK" above for the load-bearing decision. Additionally:
- Final stage storage values (exact strings, DB and TS): `prospect`, `qualifie`, `proposition_envoyee`, `negociation`, `perdu`, `signe`, `debloque`.
- `STAGE_DICT_KEY` is typed `Record<PipelineStage, DictKey>` (a type-only import from `dictionaries.ts`), matching the plan's spec exactly rather than loosening to a plain string record — no runtime circularity results since `dictionaries.ts` never imports `stages.ts`.
- The two new `proposals` CHECKs and the `client_relationships_stage_check` were placed at the end of each table's constraint array (not immediately adjacent to the existing status/source CHECKs they're conceptually related to) so `git diff`'s context lines don't make an unrelated, unchanged CHECK appear inside the diff — keeps the diff-based acceptance criteria (`proposals_status_check` untouched) unambiguous.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added migration 0009 to `no-commission.test.ts`'s `KNOWN_MIGRATIONS` drift guard**
- **Found during:** Task 2 verification (`npm run test`)
- **Issue:** `src/lib/pdf/no-commission.test.ts` has a guard test (`no unanticipated schema migrations beyond known set`) that enumerates every `drizzle/*.sql` file against a hardcoded allowlist and fails loud on any unreviewed migration. Adding `0009_phase33_pipeline.sql` (required by this plan's Task 2) tripped that guard.
- **Fix:** Reviewed the migration for commission-related columns (none — it's stage/outcome/SIREN-gate only) and appended it to `KNOWN_MIGRATIONS` with an explanatory comment, matching the existing entries' style.
- **Files modified:** `src/lib/pdf/no-commission.test.ts`
- **Verification:** `npm run test` — 1692 passed, 0 failed.
- **Committed in:** `c40c04b` (Task 2 commit — the file this guard exists to protect is a direct consequence of that task's migration)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep the pre-existing commission-invisibility regression guard accurate; no scope creep — the fix is a one-line allowlist entry with a review comment, not a behavior change.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None — no external service configuration required. The migration is authored, not applied; applying it to Neon `main` via the `db-migrate.yml` GitHub Action is plan 33-02's responsibility.

## Next Phase Readiness

- `src/db/schema.ts`, `src/lib/i18n/dictionaries.ts`, and `drizzle/0009_phase33_pipeline.sql` are all Phase 33 is expected to need at the schema/dictionary/migration layer — per the plan's objective, no later Phase 33 plan should need to touch `src/db/schema.ts` or `src/lib/i18n/dictionaries.ts` again, which is what lets waves 2 and 3 run in parallel.
- Plan 33-02 (apply migration 0009) is unblocked.
- Plans importing `src/lib/pipeline/stages.ts` (board, actions, UI) can proceed once 33-02 applies the migration.

---
*Phase: 33-pipeline*
*Completed: 2026-09-03*

## Self-Check: PASSED

All created files verified present on disk (src/lib/pipeline/stages.ts, stages.test.ts,
drizzle/0009_phase33_pipeline.sql, drizzle/meta/0009_snapshot.json) and all task commit
hashes (08ffcc1, c40c04b, 5874343) verified present in git log.
