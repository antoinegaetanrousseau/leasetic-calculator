---
phase: 22-partner-types-commission-free-proposals
plan: 01
subsystem: database
tags: [drizzle, better-auth, postgres, neon, migration, backfill, partner-type]

# Dependency graph
requires:
  - phase: 06-auth-shell
    provides: Better Auth user.additionalFields registration pattern
  - phase: 08-persistence-pdf-pipeline
    provides: proposals.params_snapshot jsonb column + global_params schema
  - phase: 12-schema-extensions-for-drafts-history
    provides: idempotent backfill script pattern (Neon-prod hostname gate)
provides:
  - users.partner_type column (text NOT NULL DEFAULT 'Partenaire') + CHECK constraint (Agent/Commercial/Partenaire)
  - session.user.partnerType via Better Auth additionalFields (input:false, client-immutable)
  - proposals.params_snapshot type extension carrying partnerType + commissionApplied
  - drizzle migration 0005_workable_yellow_claw.sql
  - idempotent PTYPE-02 backfill script (scripts/backfill-partner-type.ts) + npm script
affects: [22-02, 22-03, partner-surfaces, commission-free-proposals]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Enum-constrained text column via Drizzle CHECK constraint (no native PG enum)"
    - "Better Auth additionalFields with input:false to lock client-side mutation (anti privilege-escalation)"
    - "Idempotent backfill keyed on a NULL count-check + Neon-prod URL.hostname typed-confirmation gate"

key-files:
  created:
    - scripts/backfill-partner-type.ts
    - drizzle/0005_workable_yellow_claw.sql
    - drizzle/meta/0005_snapshot.json
  modified:
    - src/db/schema.ts
    - src/lib/auth/index.ts
    - package.json
    - src/lib/pdf/no-commission.test.ts
    - drizzle/meta/_journal.json

key-decisions:
  - "Migration ordinal is 0005 (0005_workable_yellow_claw.sql) — drizzle-kit auto-assigned after journal repair"
  - "Removed orphaned 0005_partner_company_name journal entry whose snapshot was deleted in revert 57a1984 (would have broken db:generate)"
  - "partner_type registered with input:false so partners cannot self-escalate via /api/auth/update-user (T-22-01-E)"

patterns-established:
  - "Schema-sync is generate→migrate→backfill; drizzle-kit push is forbidden (CI guard)"
  - "Journal/disk drift from a reverted migration must be repaired before db:generate"

requirements-completed: [PTYPE-01, PTYPE-02, PTYPE-06]

# Metrics
duration: ~25min
completed: 2026-05-29
---

# Phase 22 Plan 01: Partner-Type Data Layer Summary

**Added the `users.partner_type` enum-constrained column (default 'Partenaire'), wired it into `session.user.partnerType` as a client-immutable Better Auth field, extended the proposals snapshot type with `partnerType` + `commissionApplied`, and generated migration `0005_workable_yellow_claw.sql` with an idempotent backfill — the schema foundation Wave 2 builds on.**

## Generated migration filename (canonical reference)

**`drizzle/0005_workable_yellow_claw.sql`** — this is the EXACT ordinal/filename drizzle-kit produced. Downstream plans and the verifier must reference this name. Contents:

```sql
ALTER TABLE "users" ADD COLUMN "partner_type" text DEFAULT 'Partenaire' NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_partner_type_check" CHECK ("users"."partner_type" IN ('Agent', 'Commercial', 'Partenaire'));
```

It adds ONLY the partner_type column + CHECK (no proposals DDL — the snapshot type widening is jsonb/TypeScript-only).

## Deferred to production apply

The migration was generated via `npm run db:generate` ONLY. Per the plan's `autonomous: false` gate and the carry-forward constraints, `npm run db:migrate` and `npm run db:backfill:partner-type` were **NOT** run locally — they are deferred to the GitHub Action prod apply (`.github/workflows/db-migrate.yml`).

Consequently the success criterion **"after backfill, `SELECT count(*) FROM users WHERE partner_type IS NULL OR partner_type NOT IN ('Agent','Commercial','Partenaire')` returns 0"** is **DEFERRED** — it will be satisfied when the migration is applied in prod (the `DEFAULT 'Partenaire'` on ADD COLUMN sets every existing row, and the backfill is a defensive no-op confirming the invariant). It was not and could not be verified locally without a DB.

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-05-29
- **Tasks:** 3 (Task 1 completed in prior session, Tasks 2-3 this session)
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- `users.partner_type` column with CHECK constraint enforcing Agent/Commercial/Partenaire
- `session.user.partnerType` populated by Better Auth, locked against client mutation (input:false)
- `proposals.params_snapshot` type carries `partnerType` + `commissionApplied` for future snapshots
- Generated, reviewed, committed migration `0005_workable_yellow_claw.sql`
- Idempotent backfill script with Neon-prod typed-confirmation gate + NULL count-check

## Task Commits

1. **Task 1: partner_type column + auth registration + snapshot type** - `88f1ab1` (feat, prior session)
2. **Task 2: backfill script + npm script + KNOWN_MIGRATIONS** - `ca03133` (feat)
3. **Task 3: generate + commit migration 0005** - `f14541f` (feat)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified
- `src/db/schema.ts` - partner_type column + CHECK; paramsSnapshot type extension (Task 1)
- `src/lib/auth/index.ts` - partnerType additionalField, input:false (Task 1)
- `scripts/backfill-partner-type.ts` - idempotent PTYPE-02 backfill, Neon-prod hostname gate
- `package.json` - db:backfill:partner-type npm script
- `src/lib/pdf/no-commission.test.ts` - KNOWN_MIGRATIONS updated to 0005_workable_yellow_claw.sql
- `drizzle/0005_workable_yellow_claw.sql` - the generated migration
- `drizzle/meta/0005_snapshot.json` - regenerated snapshot
- `drizzle/meta/_journal.json` - removed orphaned idx:5 entry; re-pointed at real migration

## Decisions Made
- Migration ordinal is **0005**, not 0006. The journal had an orphaned idx:5 (`0005_partner_company_name`) whose `.sql` + snapshot were deleted in revert `57a1984` (Phase 18/19 never-deployed work). Removing that orphaned entry made the journal's latest snapshot `0004`, so drizzle-kit correctly assigned `0005` to the new migration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired orphaned drizzle journal entry**
- **Found during:** Task 3 (db:generate)
- **Issue:** `drizzle/meta/_journal.json` referenced `idx:5 / 0005_partner_company_name`, but both `drizzle/0005_partner_company_name.sql` and `drizzle/meta/0005_snapshot.json` had been deleted in revert commit `57a1984` ("revert accidental Phase 19 draft files"). drizzle-kit reads the journal's latest snapshot to compute the diff; with that snapshot missing, `db:generate` would fail (or generate against stale state).
- **Fix:** Removed the orphaned idx:5 journal entry so the journal's latest entry is `0004` (snapshot present). `db:generate` then produced `0005_workable_yellow_claw.sql` and a fresh, consistent idx:5 entry + `0005_snapshot.json`.
- **Files modified:** drizzle/meta/_journal.json
- **Verification:** `npm run db:generate` succeeded; new migration + snapshot written; `npm run test -- no-commission` drizzle-guard passes; `npm run check:no-drizzle-push` passes.
- **Committed in:** `f14541f` (Task 3 commit)

**2. [Rule 3 - Blocking] Replaced stale KNOWN_MIGRATIONS entry**
- **Found during:** Task 2 / confirmed in Task 3
- **Issue:** KNOWN_MIGRATIONS listed `0005_partner_company_name.sql` (Phase 18, never on disk after the revert). The plan instructed adding the actual generated filename.
- **Fix:** Replaced it with `0005_workable_yellow_claw.sql`. Harmless to the guard (it only flags on-disk `.sql` files absent from the set), but corrects a misleading reference.
- **Files modified:** src/lib/pdf/no-commission.test.ts
- **Verification:** `npm run test -- no-commission` — 36/36 pass.
- **Committed in:** `ca03133` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking, both stemming from the same reverted-migration drift)
**Impact on plan:** Both fixes were prerequisites for a clean `db:generate`. No scope creep; no schema behavior changed beyond the planned partner_type column.

## Issues Encountered
- `scripts/backfill-partner-company-name.ts` is referenced in package.json (`db:backfill:partner-company-name`) but does not exist on disk — same Phase 18/19 revert fallout. **Out of scope** for this plan (pre-existing, unrelated to partner_type); logged here for visibility, not fixed.

## Verifications Run (no DB required)
- `npm run typecheck` — exit 0
- `npm run test -- no-commission` — 36/36 pass (drizzle-guard recognizes the new migration)
- `npm run check:no-drizzle-push` — OK, no push usage
- Generated SQL inspected: adds only partner_type column + CHECK

## User Setup Required
None for this plan. Production schema sync (migration apply + backfill) is performed via the existing GitHub Action `db-migrate.yml` (manual trigger).

## Next Phase Readiness
- Schema foundation complete: `session.user.partnerType` available for the Wave 2 selector and commission-free proposal logic.
- **Blocker for prod parity:** migration `0005_workable_yellow_claw.sql` must be applied via the GitHub Action before partner-type behavior is live; the PTYPE-02 zero-NULL invariant is verified there.

## Self-Check: PASSED

- Created files verified on disk: scripts/backfill-partner-type.ts, drizzle/0005_workable_yellow_claw.sql, drizzle/meta/0005_snapshot.json, 22-01-SUMMARY.md
- Commits verified in git: ca03133 (Task 2), f14541f (Task 3); Task 1 88f1ab1 (prior session)
- Acceptance greps: URL.hostname gate, BACKFILL_CONFIRM gate, partner_type IS NULL (count-check + UPDATE), db:backfill:partner-type x1, KNOWN_MIGRATIONS lists 0005_workable_yellow_claw.sql

---
*Phase: 22-partner-types-commission-free-proposals*
*Completed: 2026-05-29*
