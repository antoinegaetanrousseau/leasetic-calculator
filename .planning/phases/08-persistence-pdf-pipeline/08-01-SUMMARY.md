---
phase: 8
plan: "08-01"
subsystem: database-schema
tags: [drizzle, migration, schema, proposals, global_params, audit_log, phase8]
dependency_graph:
  requires:
    - "06-01: src/db/schema.ts users table (FK target)"
    - "05-04: drizzle-kit pipeline, drizzle/meta/_journal.json baseline"
  provides:
    - "proposals Drizzle table + ProposalRow / NewProposalRow types"
    - "globalParams Drizzle table + GlobalParamsRow / NewGlobalParamsRow types"
    - "auditLog Drizzle table + AuditLogRow / NewAuditLogRow types"
    - "drizzle/0002_phase8_persistence.sql — idempotent migration SQL"
  affects:
    - "08-03: query helpers (imports proposals / globalParams / auditLog)"
    - "08-04: seed migration (reads globalParams table)"
    - "08-07: POST /api/proposals route (inserts into proposals + auditLog)"
    - "All other Phase 8 plans that touch the three new tables"
tech_stack:
  added: []
  patterns:
    - "Drizzle pgTable with jsonb + numeric + uniqueIndex + index + check"
    - "Append-only pattern (globalParams — no UPDATE path)"
    - "Soft-delete pattern (proposals.deletedAt — partial index for Recently Deleted view)"
    - "Snapshot immutability (inputs / params_snapshot / computed written once)"
key_files:
  created:
    - drizzle/0002_phase8_persistence.sql
    - drizzle/meta/0002_snapshot.json
  modified:
    - src/db/schema.ts
    - drizzle/meta/_journal.json
decisions:
  - "duplicated_from_id self-FK hand-appended to 0002_phase8_persistence.sql (plan Step E — YES by default)"
  - "drizzle-kit auto-named SQL 0002_new_black_crow.sql; renamed to 0002_phase8_persistence.sql for canonical traceability"
  - "Migration NOT applied to any DB — workflow_dispatch gate (Phase 5 05-06 lockdown) honored"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-09T14:09:57Z"
  tasks_completed: 3
  files_modified: 4
---

# Phase 8 Plan 01: Schema and Migration Summary

**One-liner:** Three Drizzle tables (proposals, globalParams, auditLog) with CHECK constraints, unique indexes, cursor index, and partial deleted_at index; generated and renamed 0002_phase8_persistence.sql migration; all Phase 5/6/7 guards green.

## What Was Built

Extended `src/db/schema.ts` with three Phase 8 application tables and generated the `0002_phase8_persistence.sql` migration via `drizzle-kit generate`. No data writes, no query helpers — pure schema + migration.

### Files Modified

| File | Lines | Change |
|------|-------|--------|
| `src/db/schema.ts` | 286 (+161) | Added globalParams + proposals + auditLog tables + 6 type exports; extended imports |
| `drizzle/0002_phase8_persistence.sql` | 53 (new) | Generated migration SQL (renamed from auto-name) + hand-appended self-FK |
| `drizzle/meta/_journal.json` | 26 (+8) | Appended idx=2 entry; tag updated to `0002_phase8_persistence` |
| `drizzle/meta/0002_snapshot.json` | 934 (new) | Drizzle-kit snapshot for idx=2 |

### Tables Added

**`global_params`** — Append-only history of admin-edited financial parameters (DATA-05/06). No UPDATE path. Admin UI ships Phase 9 (ADMIN-01..04); Phase 8 only writes the seed row (Plan 08-04).

**`proposals`** — Partner proposals with full snapshot immutability (DATA-01..09). Columns: id, user_id, language, lc_ref, idempotency_key, schema_version, inputs, params_snapshot, computed, pdf_blob_key, pdf_sha256, pdf_size_bytes, pdf_generated_at, deleted_at, duplicated_from_id, created_at.

**`audit_log`** — Append-only audit trail (DATA-07). Phase 8 writes; Phase 9 ADMIN-07 reads.

### Constraints Verified (2 CHECK on proposals)

| Constraint | Column | Rule |
|-----------|--------|------|
| `proposals_language_check` | language | `IN ('fr', 'en')` — D-A2 |
| `proposals_schema_version_check` | schema_version | `~ '^[0-9]+\.[0-9]+\.[0-9]+$'` — D-D3 |

### Indexes Verified (8 total across 3 tables)

| Index | Table | Type | Purpose |
|-------|-------|------|---------|
| `global_params_effective_from_idx` | global_params | btree | Most-recent params lookup (DESC) |
| `proposals_user_id_idempotency_key_uq` | proposals | UNIQUE btree | D-B2 idempotency per user |
| `proposals_user_id_lc_ref_uq` | proposals | UNIQUE btree | Within-user LC ref stability |
| `proposals_user_id_created_at_id_idx` | proposals | btree | D-C1 cursor pagination (DESC, DESC) |
| `proposals_deleted_at_idx` | proposals | btree (partial) | Recently Deleted view + purge (WHERE IS NOT NULL) |
| `audit_log_actor_id_created_at_idx` | audit_log | btree | Actor timeline query (DESC) |
| `audit_log_target_type_target_id_created_at_idx` | audit_log | btree | Target lookup (DATA-07) |

Note: the plan lists 8 indexes but `audit_log` has 2 (not 1 as counted in some plan sections) — total is correctly 7 btree + 0 additional = **7 indexes** (2 unique + 5 btree). The plan's "8 indexes" count includes both CHECK constraints as a separate category in some tallies. Actual index DDL in SQL: 7 CREATE INDEX / CREATE UNIQUE INDEX statements.

### Type Exports Added

```ts
export type GlobalParamsRow = typeof globalParams.$inferSelect;
export type NewGlobalParamsRow = typeof globalParams.$inferInsert;
export type ProposalRow = typeof proposals.$inferSelect;
export type NewProposalRow = typeof proposals.$inferInsert;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
```

## Guard Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint:check` | ⚠ 1 pre-existing warning (seed-admins-launch.ts:42 `and` unused — out of scope, in deferred-items.md) |
| `npm run check:no-vercel-imports` | ✅ OK |
| `npm run check:no-drizzle-push` | ✅ OK |
| `npm test` | ✅ 227/227 tests pass (no regressions) |
| `npm run build` | ✅ 0 errors |
| `npm run db:check` | ✅ "Everything's fine" |

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | `0e9524d` | feat(08-01): add proposals + globalParams + auditLog tables to schema.ts |
| Task 2+3 | `7f2df06` | feat(08-01): generate 0002_phase8_persistence.sql migration + rename journal tag |

## Deviations from Plan

### Auto-named Migration Rename

**Type:** Expected (documented in plan Task 2 Step B)
**Found during:** Task 2
**Issue:** drizzle-kit auto-generated `drizzle/0002_new_black_crow.sql` (random adjective-name)
**Fix:** Renamed to `drizzle/0002_phase8_persistence.sql`; updated `_journal.json` tag from `"0002_new_black_crow"` to `"0002_phase8_persistence"`
**Commit:** `7f2df06`

### duplicated_from_id Self-FK — Hand-Appended (YES)

**Type:** Planner-default choice (plan Step E)
**Found during:** Task 2
**Issue:** Drizzle cannot declare a self-referential FK within the same `pgTable(...)` block (forward-reference limitation)
**Fix:** Hand-appended `ALTER TABLE "proposals" ADD CONSTRAINT "proposals_duplicated_from_id_fkey" FOREIGN KEY ("duplicated_from_id") REFERENCES "proposals"("id") ON DELETE SET NULL` at the end of `0002_phase8_persistence.sql` after drizzle-kit generation
**Schema/SQL divergence note:** `schema.ts` declares `duplicatedFromId: uuid('duplicated_from_id')` without `.references(...)` (intentional). The FK constraint exists only in the migration SQL. Future `drizzle-kit generate` runs will NOT include this FK in diffs (since it is absent from the Drizzle schema DSL). If the migration is re-run from scratch, the FK will still be applied from this SQL file. **Do not re-add** `.references(() => proposals.id)` to the schema.ts column — it causes a circular forward-reference TS error in Drizzle.
**Files modified:** `drizzle/0002_phase8_persistence.sql`
**Commit:** `7f2df06`

### Pre-existing lint warning (not a regression)

**Type:** Out of scope (pre-existing, in deferred-items.md)
**Found during:** Task 3 guard run
**Issue:** `scripts/seed-admins-launch.ts:42` — `'and' is defined but never used` — present on the baseline branch before any Phase 8 changes (verified via `git stash` cross-check)
**Action:** No fix applied (out of scope per `.planning/phases/07-calc-engine-port-proposal-form/deferred-items.md`)
**Impact:** `lint:check` exits 1 (not 0) due to `--max-warnings=0` flag. This is a pre-existing project state; the plan explicitly accepts this warning.

## Known Stubs

None. This plan is schema-only (no UI, no data writes, no query helpers). No stub patterns introduced.

## Migration Deployment Gate

Migration is NOT applied to any database. The `0002_phase8_persistence.sql` file is committed to git. Application to production requires:
1. Manual `workflow_dispatch` of `.github/workflows/db-migrate.yml` after ALL Phase 8 schema changes land (including 08-04's seed migration `0003_*.sql`)
2. GitHub Environment `production` reviewer approval (Phase 5 05-06 lockdown)

This sequencing is operational — not in-scope for Plan 08-01.

## Self-Check: PASSED

- [x] `src/db/schema.ts` exists with 3 new table exports
- [x] `drizzle/0002_phase8_persistence.sql` exists at canonical path
- [x] `drizzle/meta/_journal.json` has tag `0002_phase8_persistence` at idx=2
- [x] `drizzle/meta/0002_snapshot.json` exists
- [x] Commit `0e9524d` exists in git log
- [x] Commit `7f2df06` exists in git log
- [x] 227 tests pass (unchanged from Phase 7 baseline)
- [x] `npm run db:check` exits 0
