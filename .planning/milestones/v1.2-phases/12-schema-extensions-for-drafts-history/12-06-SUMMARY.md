---
phase: 12-schema-extensions-for-drafts-history
plan: 06
status: complete
completed: 2026-05-12
requirements: [DB-03]
files_changed:
  - scripts/backfill-coefficient-history.ts (new, 190 lines)
  - package.json (+1 line — db:backfill:coefficient-history script entry)
  - docs/operations/launch-checklist.md (+35 lines — v1.2 schema rollout section)
  - src/lib/db/queries/coefficient-history.integration.test.ts (new, 115 lines)
commits:
  - feat(12-06) backfill script + integration test + launch-checklist
---

# Plan 12-06 Summary — Operational tail of Phase 12

## What shipped

Four artifacts that close out the DB-03 surface:

1. **`scripts/backfill-coefficient-history.ts`** — Idempotent one-shot. Reads `global_params` ASC by `effective_from`, inserts one `coefficient_history` row per `global_params` row via `createCoefficientHistoryEntry` (auto-summary via `generateDiffSummary`). Typed-confirmation gate (`BACKFILL_CONFIRM=YES`) only fires when `DATABASE_URL` host matches `*.neon.tech` (production); local + preview Postgres skip the gate.

2. **`package.json`** — New `db:backfill:coefficient-history` script invoking the backfill via the same `_preload-mock-server-only.cjs` preload as `purge:soft-deleted` (preserves the `import 'server-only'` pattern in `coefficient-history.ts`).

3. **`docs/operations/launch-checklist.md`** — New "v1.2 schema rollout (Phase 12)" section with 3 steps: (a) apply 0004 migration via existing `gh workflow run db-migrate.yml`, (b) run the backfill with the `BACKFILL_CONFIRM=YES` instruction for Neon prod, (c) smoke-test the append-only trigger via a psql `UPDATE` that MUST fail with the exact exception message.

4. **`src/lib/db/queries/coefficient-history.integration.test.ts`** — Real-Postgres integration test. `// @vitest-environment node` overrides jsdom. `describe.skipIf(!DATABASE_URL_TEST)` keeps CI green without the env var. 4 cases:
   - `INSERT succeeds (baseline)` — seeds a row, captures its id
   - `UPDATE raises "coefficient_history is append-only"` — empirical proof of D-12 part 1
   - `DELETE raises "coefficient_history is append-only"` — empirical proof of D-12 part 2
   - `INSERT after a blocked UPDATE still succeeds` — guards against the trigger corrupting connection state

## Verification

```
$ npx vitest run src/lib/db/queries/coefficient-history.integration.test.ts
 ↓ src/lib/db/queries/coefficient-history.integration.test.ts (4 tests | 4 skipped)
 Test Files  1 skipped (1)
      Tests  4 skipped (4)
```

Skips cleanly without `DATABASE_URL_TEST` — no false failures.

```
$ npx vitest run    # full suite
 Test Files  31 passed | 1 skipped (32)
      Tests  492 passed | 4 skipped (496)

$ npx tsc --noEmit  # 0 errors
```

## Integration test against a real DB

**Not yet run in CI** — `DATABASE_URL_TEST` is not yet set on any CI workflow. The test runs locally when the operator sets the env var and points it at a Postgres that has migration 0004 applied. Documented gap; recommend follow-up to wire `DATABASE_URL_TEST` to a Neon preview branch in a future CI workflow.

## Backfill behavior contract

| Scenario | Behavior |
|---|---|
| `DATABASE_URL` unset | exit 2 with FATAL message |
| `DATABASE_URL` malformed | exit 2 with FATAL message |
| `*.neon.tech` host + `BACKFILL_CONFIRM` unset | exit 2 with "Re-run with BACKFILL_CONFIRM=YES" |
| `*.neon.tech` host + `BACKFILL_CONFIRM=YES` | gate satisfied; proceed |
| Non-prod host | gate not enforced; proceed |
| `coefficient_history` non-empty | exit 0 with "Already backfilled — N rows exist" |
| `global_params` empty | exit 0 with "No global_params rows exist — nothing to backfill" |
| Normal run | iterates rows ASC, inserts one history row per source row, exits 0 |
| Unhandled error | exit 1 with FATAL message |

## Partial-failure recovery

If the backfill aborts mid-run (network drop, etc.), the next run sees a non-empty `coefficient_history` and refuses. To force a fresh backfill, the operator manually disables the trigger via psql:

```sql
ALTER TABLE coefficient_history DISABLE TRIGGER ALL;
DELETE FROM coefficient_history;
ALTER TABLE coefficient_history ENABLE TRIGGER ALL;
```

then re-runs `npm run db:backfill:coefficient-history`. Documented in the script header.

## Threat-model dispositions (per PLAN.md, all held)

- T-12-06-01 (EoP accidental prod double-run) — mitigated by idempotency + typed-confirmation
- T-12-06-02 (Tampering trigger silently disabled) — mitigated by the integration test (run pre-prod-apply) AND by the launch-checklist v1.2-3 smoke test (post-prod-apply)
- T-12-06-03 (Repudiation wrong actor on backfilled rows) — accepted: `userId: row.createdBy ?? null` carries forward whatever was originally written
- T-12-06-04 (Info disclosure of commission_pct in test logs) — accepted: integration test runs against dev/preview only, skipped on prod by default

## Anti-pattern compliance

- ✅ No `npx drizzle-kit push` anywhere (script uses Drizzle ORM for reads/inserts only)
- ✅ Uses `createCoefficientHistoryEntry` as the sole insertion path — no raw SQL inserts that could bypass the auto-summary fallback
- ✅ `tsx -r ./scripts/_preload-mock-server-only.cjs` preload for the `import 'server-only'` transitive dependency
- ✅ Typed-confirmation gate matches `scripts/seed-admins-launch.ts` pattern (BACKFILL_CONFIRM vs CONFIRM naming is intentional — host-conditional, per CONTEXT D-15)
- ✅ Integration test does NOT modify `scripts/migrate.ts` or `vitest.config.ts` — runs out-of-band via env var

— Inline-executed by orchestrator.
