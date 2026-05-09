---
phase: 8
plan: "08-04"
subsystem: persistence
tags: [drizzle, migration, seed, idempotent, global-params, DATA-12]
dependency_graph:
  requires: ["08-01"]
  provides: ["drizzle/0003_seed_global_params.sql", "scripts/build-seed-sql.ts", "check:seed-sql CI gate"]
  affects: ["08-07 (POST /api/proposals relies on getLatestGlobalParams returning a row)"]
tech_stack:
  added: []
  patterns: ["NOT EXISTS idempotency guard", "compile-time codegen from TypeScript constant to SQL"]
key_files:
  created:
    - drizzle/0003_seed_global_params.sql
    - drizzle/meta/0003_snapshot.json
    - scripts/build-seed-sql.ts
  modified:
    - drizzle/meta/_journal.json
    - package.json
    - .github/workflows/ci.yml
    - scripts/seed-admins-launch.ts
decisions:
  - "Snapshot path A chosen: 0003_snapshot.json duplicated from 0002 with new uuid id and prevId pointing at 0002's id — drizzle-kit check passes cleanly"
  - "Timestamp 1778419200000 used as 'when' for journal entry idx=3 (2026-05-09 UTC)"
  - "Pre-existing lint warning in seed-admins-launch.ts fixed as Rule 3 (blocked lint:check guard)"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-09"
  tasks_completed: 4
  files_created: 3
  files_modified: 4
---

# Phase 8 Plan 04: Seed Migration Summary

Idempotent `global_params` seed migration generated from Phase 7's `seedParams` constant (D-D1 single source of truth), with CI drift-detection gate.

## What Was Built

**DATA-12 seed migration** — `drizzle/0003_seed_global_params.sql` inserts one `global_params` row using Phase 7's placeholder values. The INSERT uses a `WHERE NOT EXISTS (SELECT 1 FROM "global_params")` guard so re-applying the migration is a no-op. Drizzle's `__drizzle_migrations` tracking blocks re-runs at the runner layer; the NOT EXISTS guard is defence-in-depth for direct-psql or Neon branch-reset replay scenarios.

**Builder script** — `scripts/build-seed-sql.ts` reads `seedParams` from `src/lib/calc/seed-params.ts` at compile time and emits the SQL deterministically. Hand-editing the SQL is forbidden; the script is the single blessed write path. The `--check` flag compares on-disk SQL with what the script would generate and exits 1 if drift is detected.

**CI drift gate** — `.github/workflows/ci.yml` gained a "Defense-in-depth -- seed SQL in sync with seedParams (D-D1)" step running `npm run check:seed-sql`. If a future PR edits `seed-params.ts` and forgets to regenerate, CI fails loud. CI now has 9 `run:` steps (was 8).

## Seed Values (D-D1 verbatim from Phase 7)

| Field | Value |
|-------|-------|
| commission_pct | 5.0000 (numeric 7,4) |
| max_amount | 500000.00 (numeric 12,2) |
| validity_days | 30 (v10 baseline D-7-05) |
| coefficients | t1/t2/t3/t4 × 36/48/60 jsonb |

## SQL File

- Path: `drizzle/0003_seed_global_params.sql`
- Size: 894 bytes
- MD5: `1e1f5228d6afea43ec93a7554825d18f`
- Contains: 1 INSERT, 1 WHERE NOT EXISTS guard

## Drizzle Metadata

**Snapshot path chosen: Path A (full duplicate)** — `drizzle/meta/0003_snapshot.json` was copied from `0002_snapshot.json` with:
- `id` updated to a fresh uuid v4 (`325a78a4-975c-4ceb-ac0b-c177382032d5`)
- `prevId` set to `fd70322a-aa62-4e22-b639-d7fc642d8cb8` (0002's id)

`drizzle-kit check` passes cleanly with this approach. The schema is unchanged from 08-01; the snapshot is identical in content except for id/prevId.

**Journal** — `_journal.json` idx=3 appended (idx=0,1,2 from prior plans preserved intact).

## npm Scripts Added

| Script | Command |
|--------|---------|
| `build:seed-sql` | `tsx scripts/build-seed-sql.ts` |
| `check:seed-sql` | `tsx scripts/build-seed-sql.ts --check` |

## Migration NOT Applied

Per Phase 8 lockdown (BOOT-09/10, STATE.md), the migration is NOT applied to any database. Production application happens via `.github/workflows/db-migrate.yml` `workflow_dispatch` with typed-confirmation `MIGRATE PROD` + GitHub Environment `production` reviewer approval. Both 0002 (schema) and 0003 (seed) will apply in order on that single workflow run.

## Path Forward (CUT-06)

When Antoine confirms canonical coefficients before CUT-06:
1. Edit `src/lib/calc/seed-params.ts` with the canonical values
2. Run `npm run build:seed-sql` to regenerate the migration
3. Run `npm run db:check` to verify journal consistency
4. Commit and open a PR (CI will verify `check:seed-sql` passes)
5. Trigger `db-migrate.yml` workflow_dispatch after merge

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing lint warning in seed-admins-launch.ts**
- **Found during:** Task 4 (lint:check guard required to pass)
- **Issue:** `and` imported from `drizzle-orm` but never used — `@typescript-eslint/no-unused-vars` warning. Pre-existed before plan 08-04.
- **Fix:** Removed unused `and` import from line 42 of `scripts/seed-admins-launch.ts`
- **Files modified:** `scripts/seed-admins-launch.ts`
- **Commit:** `c538762`

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint:check` | PASS |
| `npm run check:no-vercel-imports` | PASS |
| `npm run check:no-drizzle-push` | PASS |
| `npm run check:seed-sql` | PASS |
| `npm run db:check` | PASS (Everything's fine) |
| `npm test` | PASS — 376/376 tests (no change) |
| `npm run build` | PASS |

## Commits

| Hash | Message |
|------|---------|
| `86d3fad` | feat(08-04): add build-seed-sql.ts generator script (DATA-12 D-D1) |
| `69b19f5` | feat(08-04): generate seed migration + register npm scripts (DATA-12) |
| `46608d8` | feat(08-04): add check:seed-sql CI step for D-D1 drift detection |
| `c538762` | fix(08-04): remove unused 'and' import from seed-admins-launch.ts |

## Self-Check: PASSED
