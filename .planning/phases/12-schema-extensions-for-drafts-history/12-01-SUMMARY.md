---
phase: 12-schema-extensions-for-drafts-history
plan: 01
subsystem: database
tags: [drizzle, postgres, migration, schema, proposals, coefficient-history, triggers]

# Dependency graph
requires:
  - phase: 08-persistence-pdf-pipeline
    provides: proposals table shape (lc_ref, idempotency_key, params_snapshot, computed, unique indexes) that this plan extends
  - phase: 06-auth
    provides: users table (users.id FK target for coefficient_history.changed_by_user_id)

provides:
  - drizzle/0004_phase12_drafts_and_history.sql — DDL migration adding proposals.status, nullability loosenings, 2 new CHECKs, 2 partial unique indexes, soft-delete alignment UPDATE, coefficient_history table + FK + index + append-only function + 2 BEFORE triggers
  - src/db/schema.ts — TypeScript source-of-truth mirroring all migration changes; exports CoefficientHistoryRow / NewCoefficientHistoryRow

affects:
  - 12-02 (draft query helpers read proposals.status, lcRef/idempotencyKey nullable)
  - 12-03 (invited partner status reads users.last_login_at — already exists)
  - 12-04 (coefficient-history query helpers write to coefficient_history table)
  - 12-05 (consumer TS fixups for lcRef/idempotencyKey/paramsSnapshot/computed nullable)
  - 12-06 (backfill script + integration test against coefficient_history triggers)
  - 13 (wizard creates draft rows via proposals.status='draft')
  - 14 (history sidebar reads coefficient_history, admin polishing)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Partial unique index pattern via .where(sql`col IS NOT NULL`) — prevents draft NULL collisions while preserving finalized-row uniqueness"
    - "DB-level append-only enforcement via BEFORE UPDATE/DELETE triggers + RAISE EXCEPTION (stronger than global_params convention-only)"
    - "Lifecycle status as stored text column with 3-value CHECK; 4th derived value ('expired') computed at read time"

key-files:
  created:
    - drizzle/0004_phase12_drafts_and_history.sql
  modified:
    - src/db/schema.ts

key-decisions:
  - "proposals.status stored as text NOT NULL DEFAULT 'active' with CHECK IN ('draft','active','deleted'); 'expired' is derived (D-01, D-07)"
  - "4 columns loosened to nullable: lcRef, idempotencyKey, paramsSnapshot, computed; inputs+language stay NOT NULL (D-03)"
  - "proposals_finalized_completeness_check prevents active/deleted rows with NULL snapshot fields (D-04)"
  - "Partial unique indexes on (user_id, idempotency_key) and (user_id, lc_ref) WHERE col IS NOT NULL — drafts coexist without collision (D-05)"
  - "Existing soft-deleted rows aligned with status='deleted' via one-shot UPDATE in same migration (D-09)"
  - "coefficient_history enforces append-only at DB via TRIGGER not ESLint convention (D-12, D-13)"
  - "DDL-only migration; backfill deferred to plan 12-06 scripts/backfill-coefficient-history.ts (D-14)"
  - "Dev DB apply deferred: DATABASE_URL not set in worktree environment; dry-run gate (SC4) satisfied; actual apply via plan 12-06 or manual npm run db:migrate"

patterns-established:
  - "Migration comment header pattern: 4-line block with plan ref, decisions refs, DDL-only note, do-not-edit warning"
  - "coefficient_history as reference for DB-level append-only enforcement vs global_params convention-only"

requirements-completed: [DB-01, DB-02, DB-03]

# Metrics
duration: 35min
completed: 2026-05-12
---

# Phase 12 Plan 01: Schema Extensions for Drafts + History — Summary

**Single Drizzle migration (0004) + schema.ts update ship the full DB foundation for draft proposals lifecycle, invited-partner status derivation, and append-only coefficient change history — all DDL-only, no app code, no data backfill.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-12T11:00:00Z
- **Completed:** 2026-05-12T11:35:00Z
- **Tasks:** 3 completed (Task 3 is verification-only, no source commit)
- **Files modified:** 2

## Accomplishments

- Authored `drizzle/0004_phase12_drafts_and_history.sql` with all 16 statements (status column, 4 nullability drops, 2 new CHECKs, 2 partial unique index rebuilds, soft-delete alignment UPDATE, coefficient_history table + FK + index + append-only function + 2 BEFORE triggers)
- Updated `src/db/schema.ts` to TypeScript-mirror all migration changes; `drizzle-kit check` reports "Everything's fine"
- SC4 satisfied: `npm run db:migrate -- --dry-run` (DATABASE_URL=placeholder) exits 0 and lists `0004_phase12_drafts_and_history.sql`
- `check:no-drizzle-push` exits 0 — no forbidden migration-runner references
- Lint exits 0 — no ESLint warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the Drizzle migration file** — `0bc6275` (feat)
2. **Task 2: Update src/db/schema.ts to mirror the migration** — `513b340` (feat)
3. **Task 3: Verify dry-run gate** — no source commit (verification-only task)

## Files Created/Modified

- `drizzle/0004_phase12_drafts_and_history.sql` — DDL migration: ALTER proposals (status + nullability + CHECKs + partial indexes) + UPDATE soft-deleted rows + CREATE coefficient_history + function + 2 triggers + index
- `src/db/schema.ts` — Extended proposals pgTable (status column, loosened nullability on 4 cols, 2 new CHECKs, 2 partial uniqueIndexes), added coefficientHistory pgTable with JSDoc, type exports CoefficientHistoryRow / NewCoefficientHistoryRow

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Known Consumer TypeScript Errors (Deferred to Plan 12-05)

The nullability loosenings on `proposals.lcRef`, `idempotencyKey`, `paramsSnapshot`, and `computed` cause 4 TypeScript errors in existing consumer files that assumed these fields are `string`/`jsonb NOT NULL`:

| File | Error |
|------|-------|
| `app/(authed)/proposals/[id]/page.tsx:125` | `string \| null` not assignable to `.replace()` callback parameter |
| `app/(authed)/proposals/[id]/page.tsx:127` | `string \| null` not assignable to `string` (lcRef prop) |
| `src/lib/api/proposals/list.ts:62` | `ProposalRowDto.lcRef` type mismatch (`string \| null` vs `string`) |
| `src/lib/api/proposals/submit.ts:148` | `string \| null` not assignable to `string` |

These are expected and documented in the plan verification section. They will be resolved in **Plan 12-05** which updates the query helpers and consumer code to handle nullable fields. The build currently fails due to these errors.

## Dev DB Apply Status

`DATABASE_URL` was not set in the worktree environment. The dry-run gate (SC4) was satisfied without a live DB connection. The actual migration apply is deferred to:
- Plan 12-06 environment (which requires a real Postgres for the integration test), or
- Manual `npm run db:migrate` with DATABASE_URL configured

PostgreSQL version of the dev DB used for dry-run: N/A (dry-run does not connect to DB).

## Known Stubs

None — this is a DDL-only plan with no UI or data stubs.

## Threat Flags

No new security surfaces beyond what the plan's threat model covers. The append-only trigger, status CHECK, completeness CHECK, and partial unique indexes are all implemented as specified in the threat register (T-12-01-01 through T-12-01-05).

## Self-Check

### Created files exist

- `drizzle/0004_phase12_drafts_and_history.sql` — FOUND
- `src/db/schema.ts` (modified) — FOUND

### Commits exist

- `0bc6275` — FOUND (Task 1: migration file)
- `513b340` — FOUND (Task 2: schema.ts)

## Self-Check: PASSED
