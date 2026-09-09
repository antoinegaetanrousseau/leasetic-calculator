---
phase: 44-backfill-migration
plan: 01
subsystem: database
tags: [drizzle, postgres, audit-log, backfill, idempotence]

# Dependency graph
requires:
  - phase: 43-new-pdf-layout
    provides: "ProposalDocumentProps['data'] shape (advisor block, partner block) the backfill's render loop will construct"
  - phase: 42-captured-data-fields-advisor-profile
    provides: "users.companyTelephone column and the getAdvisor() live-read pattern"
provides:
  - "'proposal.pdf_backfill' AuditAction union member — the MIG-05 idempotence marker"
  - "listBackfillCandidates() — the anti-joined, status-scoped row set (D-03/D-06)"
  - "listBackfilledProposalIds() — the marked-id set for plan 03's drift check (D-09)"
  - "src/lib/backfill/types.ts — 13 exported contracts plans 02-04 import against"
affects: [44-02, 44-03, 44-04, 44-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Filtering anti-join: leftJoin + isNull(joined.id) to select rows NOT already marked, distinct from every prior leftJoin in this file family (which decorate, never filter)"
    - "Per-file recording stubBuilder with an awaitable `then`, copied for query functions whose real caller awaits mid-chain (orderBy/where), not just after a terminal .limit()"
    - "Type-only cross-boundary import (`import type ... from '@/lib/pdf'`) to consume a server-only module's exported types without triggering its runtime guard in unit tests"

key-files:
  created:
    - src/lib/db/queries/proposals.backfill.test.ts
    - src/lib/backfill/types.ts
  modified:
    - src/lib/db/queries/audit-log.ts
    - src/lib/db/queries/proposals.ts
    - src/lib/db/queries/index.ts

key-decisions:
  - "Idempotence is an audit_log row per migrated proposal (action='proposal.pdf_backfill'), never a pdf_sha256 comparison — the raw render hash is not stable across calls (D-06)"
  - "listBackfillCandidates row scope is status IN ('active','deleted') with NO deleted_at window filter — a restorable soft-deleted proposal must not be skipped (D-03)"
  - "BackfillDriftResult is declared in types.ts rather than plan 03's drift.ts to avoid a circular import between drift.ts and types.ts"

patterns-established:
  - "New backfill query functions live in the existing proposals.ts file (not a new module) since they extend the same table's row-scope query family"

requirements-completed: [MIG-05]

# Metrics
duration: ~9min
completed: 2026-09-09
---

# Phase 44 Plan 01: Backfill Data-Layer Contracts Summary

**Added the 'proposal.pdf_backfill' audit marker, an anti-joined row-scope query pair (`listBackfillCandidates` / `listBackfilledProposalIds`), and a 13-contract `src/lib/backfill/types.ts` module — no schema migration, no rendering code yet.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-09-09T21:45:47Z
- **Completed:** 2026-09-09T21:54:27Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `AuditAction` union gained `'proposal.pdf_backfill'` with a section comment recording the four payload/lifecycle facts and the `pdf_sha256`-is-not-stable warning (D-06), with no change to `AuditTargetType` and no migration generated.
- `listBackfillCandidates()` selects the in-scope proposal set (`status IN ('active','deleted')`, no `deleted_at` window filter) anti-joined against the audit-log marker, projecting the creating user's live company telephone alongside the proposal's own stored data.
- `listBackfilledProposalIds()` returns the distinct set of already-migrated proposal ids for plan 03's resumed-run drift check.
- `src/lib/backfill/types.ts` declares and exports all 13 contracts (`BackfillCandidate`, `AdvisorIdentity`, `RowFailureReason`, `RowOutcome`, `BackfillCounts`, `BackfillReportRow`, `BackfillReportEnvelope`, `BackfillDeps`, `BackfillMode`, `BackfillAbortReason`, `BackfillDriftResult`, `RunBackfillArgs`, `RunBackfillResult`) with a single type-only import and zero runtime imports.
- New `proposals.backfill.test.ts` (9 tests) structurally pins the anti-join, the row scope, the excluded `deleted_at` predicate, and the projection shape via a per-file recording stub and SQL-object walkers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the 'proposal.pdf_backfill' audit action (D-06)** - `cb608b6` (feat)
2. **Task 2: listBackfillCandidates + listBackfilledProposalIds (D-03, D-06)** - `7cc6a25` (feat)
3. **Task 3: src/lib/backfill/types.ts — the contracts plans 02-04 are written against** - `82c4612` (feat)

_No TDD tasks in this plan — all three were `type="auto"`._

## Files Created/Modified

- `src/lib/db/queries/audit-log.ts` - Adds the `'proposal.pdf_backfill'` union member + section comment; no other change
- `src/lib/db/queries/proposals.ts` - Adds `BackfillCandidateRow`, `listBackfillCandidates`, `listBackfilledProposalIds`; extends the `drizzle-orm` import with `inArray`
- `src/lib/db/queries/index.ts` - Barrel-exports the two new functions + `BackfillCandidateRow` type from the existing `./proposals` block
- `src/lib/db/queries/proposals.backfill.test.ts` (new) - 9 structural tests: projection shape, join count/targets, WHERE predicate presence/absence, isNull-on-audit-log-id, and row/id mapping
- `src/lib/backfill/types.ts` (new) - 13 exported type contracts for plans 02-04, single type-only import, module docstring recording D-05 and D-01 interpretations

## Decisions Made

- Followed the plan's explicit query shape verbatim (two `leftJoin`s, `inArray(status, [...])`, `isNull(auditLog.id)`) — no deviation from the prescribed predicates.
- `RunBackfillResult`'s dry-run `reportPaths` field is typed inline as a 4-path object mirroring reconcile's `WriteDryRunReportResult` shape (archived/latest × md/json), since CONTEXT.md leaves the exact report format to Claude's discretion and no separate named export was required by the acceptance criteria's 13-identifier list.
- Test file's `sqlHasIsNullOnColumnRef` helper checks column-object identity (`schema.auditLog.id`) alongside an `' is null'` SQL text fragment in the same `queryChunks` array, rather than a looser name-based check — this proves the anti-join targets `audit_log.id` specifically, not just any `id` column in the query (both `users.id` and `auditLog.id` appear in the built SQL).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed literal "server-only" substring from types.ts docstring**

- **Found during:** Task 3 acceptance-criteria verification
- **Issue:** The module docstring's prose used the literal string "server-only" twice (describing why the type-only import doesn't trigger the runtime guard inside `@/lib/pdf`), which made `grep -c "server-only" src/lib/backfill/types.ts` print `2` instead of the required `0`.
- **Fix:** Reworded the two sentences to describe the mechanism ("runtime import guard", "runtime-guard shim") without using the literal token, preserving the same meaning.
- **Files modified:** `src/lib/backfill/types.ts`
- **Verification:** `grep -c "server-only" src/lib/backfill/types.ts` now prints `0`; `npx tsc --noEmit` and `npx eslint --max-warnings=0` still pass.
- **Committed in:** `82c4612` (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — acceptance-criteria grep)
**Impact on plan:** Cosmetic wording fix only; no change to types, exports, or behavior. No scope creep.

## Issues Encountered

None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 02 (data mapping), 03 (report/drift), and 04 (orchestration) can now import `listBackfillCandidates`, `listBackfilledProposalIds`, and every type in `src/lib/backfill/types.ts` without re-deriving any shape from the codebase.
- No blockers. No schema migration was created or applied, consistent with D-06's design (idempotence lives in `audit_log`, not a new column).
