---
phase: 35-sales-motivation
plan: 02
subsystem: database
tags: [drizzle, postgres, sql, gamification, crm-02, owner-scoping]

# Dependency graph
requires:
  - phase: 35-sales-motivation (plan 01)
    provides: "src/lib/momentum/types.ts (MomentumRow, WeeklyMovements, MomentumBadgeCounts) + src/lib/momentum/window.ts (MOMENTUM_TIME_ZONE)"
provides:
  - "src/lib/db/queries/momentum.ts — the owner-scoped momentum/streak/badge read layer: listWeeklyMovementsForOwner, listProgressWeekKeysForOwner, getBadgeCountsForOwner"
  - "src/lib/db/queries/momentum.test.ts — mocked-driver composition tests + 4 source guards + the D-11 perdu-exclusion canary"
  - "barrel re-export from src/lib/db/queries/index.ts"
affects: [35-03-momentum-card, 35-04-isolation-integration-tests, 35-05-home-page-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stage order compiled into SQL via sql.join(PIPELINE_STAGES.map(...)) as a bound ARRAY[...]::text[] literal — never a hand-typed stage list, so the TypeScript union stays the single source of truth for array_position comparisons"
    - "COUNT(*) OVER () window function evaluated before LIMIT, so one statement returns both the capped page and the true window total (avoids a second COUNT query for '+ N autres')"
    - "COUNT(DISTINCT ...) FILTER (WHERE <predicate>) idiom (from getConversionRateForOwner) reused for both badge-axis aggregates in a single scan"

key-files:
  created:
    - src/lib/db/queries/momentum.ts
    - src/lib/db/queries/momentum.test.ts
  modified:
    - src/lib/db/queries/index.ts

key-decisions:
  - "isProgressEvent's final SQL shape: kind = 'proposal_finalized' OR (kind = 'stage_changed' AND payload->>'toStage' <> 'perdu' AND (payload->>'fromStage' IS NULL OR array_position(<stages>, toStage) > array_position(<stages>, fromStage))) — the toStage <> 'perdu' conjunct is load-bearing because perdu sits at a HIGHER ordinal than negociation in PIPELINE_STAGES, so a naive index comparison alone would count negociation → perdu as progress (the exact gaming route D-11 closes)."
  - "No new index added over relationship_events_relationship_id_occurred_at_idx. The owner-wide weekly-window scan and the full-history progress-week scan do not hit that composite index (it's per-relationship, not per-owner), but production holds a near-empty relationship_events table (D-14 measured constraint), so the scan cost is negligible today. Recorded here as the known future tuning point rather than added now — adding one would be a migration and reopen D-23."
  - "perdu → negociation (reopening a dead deal) does NOT count as progress — it has a lower array_position and 35-PATTERNS.md's literal rule is 'a lower index is backward/no-count'. Recorded as an accepted asymmetry rather than silently decided; it IS shown in the week's movements, per D-11."

requirements-completed: [GAME-01, GAME-02, GAME-03, GAME-04]

# Metrics
duration: ~20min
completed: 2026-09-05
---

# Phase 35 Plan 02: Momentum Query Layer Summary

**Three owner-scoped Drizzle statements over `relationship_events` — weekly movements with a COUNT(*) OVER() total, full-history progress week keys for the streak fold, and badge-axis counts — each carrying the CRM-02 owner predicate in its own statement, with zero write path and zero schema change.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-05T00:33 (approx)
- **Completed:** 2026-09-05T00:53 (approx)
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `listWeeklyMovementsForOwner`, `listProgressWeekKeysForOwner`, `getBadgeCountsForOwner` each issue exactly ONE statement, each with `eq(schema.clientRelationships.ownerId, ownerId)` as the first predicate — verified both at compile time (required parameter) and by a comment-stripped source guard (`grep` finds exactly 3 occurrences).
- `isProgressEvent`'s `perdu` exclusion closes the D-11 gaming route (a partner cycling deals to Perdu to fake a streak) — the SQL shape is recorded verbatim above per this plan's `<output>` instruction, so a future phase tuning this query finds the reasoning rather than re-deriving it.
- The stage order used for `array_position` comparisons is compiled from `PIPELINE_STAGES` via `sql.join` over bound parameters — a source guard confirms zero hand-typed stage literals (`'qualifie'` count is 0).
- `listWeeklyMovementsForOwner`'s `COUNT(*) OVER ()` window function returns the true window total alongside the capped page in the same statement, so the "+ N autres" UI line needs no second query.
- 13 mocked-driver unit tests cover owner-predicate composition (rendered to real SQL text + bind params via `PgDialect`, not string-matched), `Number(...)` coercion regressions (`'17'` → `17`, `'4'`/`'0'` → `4`/`0`), the `lt` vs `lte` window-exclusivity distinction, week-key passthrough, and 4 source guards — plus a header comment stating plainly what a mocked test cannot prove (filtering at runtime), pointing at the 35-04 integration suite.
- Full `vitest run` (2297 passed, 52 skipped) confirms the barrel change introduced zero regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: The three owner-scoped momentum statements** - `31265fc` (feat)
2. **Task 2: Barrel export + mocked-driver unit tests and source guards** - `8e12ce5` (test)

**Plan metadata:** (this commit) `docs(35-02): complete momentum-query-layer plan`

_No TDD tasks in this plan — both tasks were `type="auto"` without `tdd="true"`._

## Files Created/Modified
- `src/lib/db/queries/momentum.ts` - the three exported functions, `MOVEMENT_KINDS`, `STAGE_ORDER_ARRAY`, `IS_PROGRESS_EVENT` (module-private SQL fragments)
- `src/lib/db/queries/momentum.test.ts` - 13 tests across 7 describe blocks (join composition, total coercion, window exclusivity, week-key passthrough, badge coercion, 4 source guards, D-11 canary)
- `src/lib/db/queries/index.ts` - added the Phase 35 momentum export block (functions only; types stay imported from `@/lib/momentum/types` per the plan's "one home per contract" instruction)

## Decisions Made
- `isProgressEvent` SQL shape and the no-new-index decision recorded verbatim above (see `key-decisions`) exactly as the plan's `<output>` section asked, so 35-04 (integration tests) and any future scan-tuning phase find the reasoning rather than re-deriving it.
- Reused `getConversionRateForOwner`'s `COUNT(...) FILTER (WHERE ...)` idiom for both badge-axis aggregates rather than two separate queries — one scan answers both axes, matching the plan's explicit instruction.

## Deviations from Plan

None - plan executed exactly as written. Every acceptance-criteria grep (server-only import count, ownerId-eq count of exactly 3, zero insert/update/delete, zero requireAdmin/allOwners/isAdmin, `toStage`/`perdu`/`PIPELINE_STAGES`/`MOMENTUM_TIME_ZONE` presence, zero hand-typed `'qualifie'`/`'Europe/Paris'` literals, exactly one `COUNT(*) OVER ()`, empty `git status --porcelain src/db/schema.ts drizzle/`) passed on the first attempt, as did `npm run typecheck`, `npm run lint:check`, the new test file, and the full `vitest run` suite.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. No new dependency was installed; every import resolves to an existing workspace module (`@/lib/momentum/types`, `@/lib/momentum/window`, `@/lib/pipeline/stages`) or an existing `drizzle-orm` export.

## Next Phase Readiness
- 35-03 (`MomentumCard`) can import `@/lib/momentum/types` directly (unchanged from 35-01) and call the three functions exported here via `@/lib/db/queries` once 35-05 wires them into `page.tsx`.
- 35-04 (isolation integration tests, real Postgres) has its target file named and its scope defined by this plan's test header: prove the owner join actually FILTERS (not just composes), and behaviourally verify the `negociation → perdu` non-progress case this plan's unit test can only canary at the source level.
- No blockers. `git status --porcelain src/db/schema.ts drizzle/` remains empty — D-23 holds. No migration, no new column, no new index.

---
*Phase: 35-sales-motivation*
*Completed: 2026-09-05*
