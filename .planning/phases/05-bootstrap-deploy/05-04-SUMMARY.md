---
phase: 05-bootstrap-deploy
plan: "04"
subsystem: database
tags: [drizzle-orm, drizzle-kit, neon, postgres-js, ovh-portability, tdd, migrations, generate-only]
dependency_graph:
  requires:
    - phase: 05-01
      provides: src/lib/db/.gitkeep skeleton + @/* path alias + package.json base
    - phase: 05-03
      provides: lib/storage adapter pattern (mirrored for lib/db)
  provides:
    - Drizzle ORM 0.45.2 + drizzle-kit 0.30.1 installed at exact pins
    - src/db/schema.ts — schema source of truth (schema_meta baseline marker table)
    - drizzle.config.ts — drizzle-kit config (dialect postgresql, out ./drizzle, never push)
    - src/lib/db/client.ts — createDb() factory + parseDatabaseUrl() with Neon/postgres-js driver selection
    - src/lib/db/index.ts — db() memoized singleton + schema re-exports + __resetDbForTests()
    - src/lib/db/errors.ts — DbError + DbAuthError typed hierarchy
    - drizzle/0000_striped_metal_master.sql — baseline migration CREATE TABLE schema_meta (committed to git)
    - drizzle/meta/_journal.json + 0000_snapshot.json — drizzle-kit internal metadata
    - 9 Vitest tests for driver selection + URL parsing + singleton behavior
  affects: [05-05, 05-06, 05-07, phase-6, phase-8, phase-10]
tech-stack:
  added:
    - "drizzle-orm@0.45.2 (exact pin)"
    - "drizzle-kit@0.30.1 (dev, exact pin)"
    - "@neondatabase/serverless@0.10.4 (exact pin)"
    - "postgres@3.4.5 (postgres-js, exact pin)"
    - "dotenv@16.4.7 (dev, exact pin)"
  patterns:
    - "Driver selected at runtime by DATABASE_URL host pattern (*.neon.tech/neon.build → neon-http, else → postgres-js)"
    - "db() memoized singleton — single import surface, never import drivers directly"
    - "drizzle-kit generate ONLY (never push) — versioned SQL files committed to git"
    - "postgres-js: max=1 + prepare=false (PITFALLS §3.1 — Vercel function pool + pgbouncer compat)"
    - "__driverKind discriminator on returned db object for test inspection"
    - "TDD RED/GREEN pattern (test commit 1b9fc8c → implementation commit c9ab5e6)"

key-files:
  created:
    - src/db/schema.ts
    - drizzle.config.ts
    - src/lib/db/client.ts
    - src/lib/db/index.ts
    - src/lib/db/errors.ts
    - src/lib/db/index.test.ts
    - drizzle/0000_striped_metal_master.sql
    - drizzle/meta/_journal.json
    - drizzle/meta/0000_snapshot.json
  modified:
    - package.json
    - package-lock.json
    - .env.example

key-decisions:
  - "parseDatabaseUrl error message uses 'invalid URL' (not 'not a valid URL') to match test expectation from plan spec — Rule 1 auto-fix during GREEN phase"
  - "generate-only discipline locked: db:generate + db:check scripts in package.json; db:push absent; drizzle.config.ts documents the no-push rule prominently"
  - "schema_meta marker table chosen over empty schema (Option A) to produce a non-empty baseline migration proving the pipeline works end-to-end"
  - "prepare: false on postgres-js for pgbouncer transaction-pooling compatibility (OVH + Neon pooled URLs)"

requirements-completed: [BOOT-09]

duration: 8min
completed: "2026-05-06"
---

# Phase 5 Plan 04: Drizzle ORM DB Adapter Spine Summary

**Drizzle ORM 0.45.2 + drizzle-kit 0.30.1 installed at exact pins; DB adapter spine (src/lib/db/) with Neon HTTP / postgres-js driver selection by DATABASE_URL host pattern; schema_meta baseline migration committed to git; generate-only discipline locked; 9 Vitest tests passing alongside 13 storage tests.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-06T13:52:00Z
- **Completed:** 2026-05-06T14:00:00Z
- **Tasks:** 2 (TDD Task 1: RED+GREEN + Task 2: drizzle-kit config + generate)
- **Files created:** 9
- **Files modified:** 3 (package.json, package-lock.json, .env.example)

## Accomplishments

- `drizzle-orm@0.45.2`, `@neondatabase/serverless@0.10.4`, `postgres@3.4.5`, `drizzle-kit@0.30.1`, `dotenv@16.4.7` installed — all exact pins, zero carets in package.json
- `src/lib/db/errors.ts` — DbError + DbAuthError typed error hierarchy (mirrors StorageError pattern from 05-03)
- `src/lib/db/client.ts` — `parseDatabaseUrl()` (exported, unit-tested) determines `neon-http` vs `postgres-js` driver from URL host; `createDb()` factory builds Drizzle instance with correct driver; `__driverKind` discriminator enables test inspection without real DB connection
- `src/lib/db/index.ts` — `db()` memoized singleton (mirrors `storage()` from 05-03); `schema` re-exports; `__resetDbForTests()` for test isolation
- `src/db/schema.ts` — `schema_meta` marker table (id serial PK, label text, note text, created_at timestamptz) establishing the migration pipeline
- `drizzle.config.ts` — `dialect: 'postgresql'`, `schema: './src/db/schema.ts'`, `out: './drizzle'`, `strict: true`, `verbose: true`; prominently documents the no-push rule
- `drizzle/0000_striped_metal_master.sql` — baseline CREATE TABLE migration committed to git
- `npm run db:generate` and `npm run db:check` scripts added; `db:push` absent from package.json
- 9 Vitest tests: 5 for `parseDatabaseUrl` (neon.tech, neon.build, localhost, OVH host, malformed URL) + 4 for `createDb` / `db()` (unset URL, neon driver, postgres-js driver, singleton identity)

## Installed Versions (Actual — No Carets)

| Package | Planned Pin | Installed |
|---------|------------|-----------|
| drizzle-orm | 0.45.2 | 0.45.2 |
| drizzle-kit | 0.30.1 | 0.30.1 |
| @neondatabase/serverless | 0.10.4 | 0.10.4 |
| postgres | 3.4.5 | 3.4.5 |
| dotenv | 16.4.7 | 16.4.7 |

All planned pins matched exactly.

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| 1 RED | DB adapter test file + schema + errors + package.json | 1b9fc8c | test |
| 1 GREEN | Implement client.ts + index.ts — TDD GREEN | c9ab5e6 | feat |
| 2 | drizzle-kit config + baseline migration SQL | a4ddfe9 | feat |
| docs | SUMMARY + STATE + ROADMAP + REQUIREMENTS | (below) | docs |

## Generated Migration SQL

Filename: `drizzle/0000_striped_metal_master.sql`

```sql
CREATE TABLE "schema_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

Matches `src/db/schema.ts` definition exactly. Validated by `npm run db:check` (exit 0).

## Test Results

```
✓ src/lib/storage/vercel-blob.test.ts (3 tests) 2ms
✓ src/lib/storage/s3.test.ts (4 tests) 6ms
✓ src/lib/storage/index.test.ts (6 tests) 5ms
✓ src/lib/db/index.test.ts (9 tests) 5ms

Test Files  4 passed (4)
     Tests  22 passed (22)
  Duration  654ms
```

## Driver Discrimination Confirmation

- `parseDatabaseUrl('postgres://u:p@ep-xxx.us-east-1.aws.neon.tech:5432/db')` → `kind: 'neon-http'`
- `parseDatabaseUrl('postgres://u:p@ep-yyy.neon.build:5432/db')` → `kind: 'neon-http'`
- `parseDatabaseUrl('postgres://u:p@localhost:5432/db')` → `kind: 'postgres-js'`
- `parseDatabaseUrl('postgres://u:p@pg-12345.gra3.databases.cloud.ovh.net:5432/db')` → `kind: 'postgres-js'`
- `createDb()` with neon.tech URL → `d.__driverKind === 'neon-http'`
- `createDb()` with localhost URL → `d.__driverKind === 'postgres-js'`

## OVH Portability Check

```bash
# Zero @neondatabase/serverless or postgres imports outside src/lib/db/
grep -rE "@(neondatabase/serverless|postgres)" --include="*.ts" --include="*.tsx" src app \
  | grep -v "src/lib/db/" | wc -l
# → 0
```

The portability seam is clean. Plan 05-05's CI grep gate will enforce this going forward.

## Generate-Only Discipline Verification

```bash
grep '"db:generate"' package.json  # → "db:generate": "drizzle-kit generate"
grep '"db:push"' package.json      # → (empty — db:push does NOT exist)
grep "drizzle-kit push" package.json  # → (empty — push is NEVER invoked)
```

PITFALLS §3.2 + STATE.md locked decision + BOOT-09/10 mandate all honored.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed error message to match test expectation ('invalid URL' vs 'not a valid URL')**
- **Found during:** Task 1 GREEN phase — first test run
- **Issue:** Plan's `parseDatabaseUrl` implementation used "DATABASE_URL is not a valid URL (got: ...)" but the test file (plan spec Test 4) expects `/invalid URL/` regex to match. The words "not a valid URL" do not match the regex "invalid URL".
- **Fix:** Changed error message to "DATABASE_URL is an invalid URL (got: ...)" — both the DbError type assertion (Test 3) and the regex assertion (Test 4) now pass.
- **Files modified:** src/lib/db/client.ts
- **Verification:** All 9 db tests pass
- **Committed in:** c9ab5e6 (Task 1 GREEN commit)

No other deviations.

## Known Stubs

None. The DB adapter is a full implementation with real driver selection logic. No business tables are defined yet (those land in Phase 6+), but the `schema_meta` marker table satisfies the requirement to produce a non-empty baseline migration. Plan 05-07's healthz will INSERT+SELECT against `schema_meta` with a live Neon connection.

## Threat Surface Scan

All threat mitigations from the plan's threat model implemented:

| Threat ID | Status | Evidence |
|-----------|--------|---------|
| T-05.04-01 — drizzle-kit push silently mutating prod | Mitigated | db:push script absent from package.json; drizzle.config.ts documents prohibition; CI grep in plan 05-05 will enforce |
| T-05.04-02 — DATABASE_URL leaking via error messages | Mitigated | parseDatabaseUrl truncates URL to 30 chars in error; createDb error contains no URL value |
| T-05.04-03 — Connection storm on Vercel cold starts | Mitigated | postgres-js: max=1; neon-http is stateless (no pool) |
| T-05.04-04 — Migration SQL with elevation primitives | Mitigated | schema_meta migration is CREATE TABLE only — no GRANT, DROP, or privilege changes |
| T-05.04-05 — DATABASE_URL substitution via env injection | Accepted | Platform-level env-var integrity trusted |
| T-05.04-06 — drizzle-kit verbose printing schema details | Accepted | Schema is in git, not secret; output goes to CLI/CI only |
| T-05.04-07 — Misclassified URL routing through wrong driver | Mitigated | parseDatabaseUrl is deterministic + unit-tested for both host families |

No additional threat surface found beyond what the plan covered.

## Next Phase Readiness

- `import { db } from '@/lib/db'` pattern ready for plan 05-07 healthz SELECT 1 round-trip
- `import { schema } from '@/lib/db'` ready for Phase 6 auth Drizzle queries
- `drizzle/0000_striped_metal_master.sql` ready for plan 05-06 GitHub Action (`drizzle-orm/postgres-js/migrator`)
- Phase 6 will add users + password_resets + sessions tables to `src/db/schema.ts` and run `npm run db:generate` to produce migration 0001

## Self-Check: PASSED

Files verified present:
- src/db/schema.ts: FOUND
- drizzle.config.ts: FOUND
- src/lib/db/client.ts: FOUND
- src/lib/db/index.ts: FOUND
- src/lib/db/errors.ts: FOUND
- src/lib/db/index.test.ts: FOUND
- drizzle/0000_striped_metal_master.sql: FOUND
- drizzle/meta/_journal.json: FOUND
- drizzle/meta/0000_snapshot.json: FOUND

Commits verified:
- 1b9fc8c: Task 1 RED (test — schema + errors + tests)
- c9ab5e6: Task 1 GREEN (feat — client.ts + index.ts)
- a4ddfe9: Task 2 (feat — drizzle-kit config + baseline migration)
