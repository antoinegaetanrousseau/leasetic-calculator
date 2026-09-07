---
phase: 33-pipeline
plan: 02
status: complete
completed: 2026-09-03
duration: ~4 min (workflow run) + operator dispatch
tasks_completed: 1
tasks_total: 1
requirements: [PIPE-01, PIPE-02, PIPE-03, PIPE-05]
---

# Plan 33-02 Summary — Apply migration 0009 to the Neon development branch

## What happened

Migration `drizzle/0009_phase33_pipeline.sql` (journal idx 9, authored by plan 33-01) was applied to the
Neon **development** branch (`br-tiny-hat-alk1dent`, endpoint `ep-polished-band-alphc576-pooler`) through
the gated `.github/workflows/db-migrate.yml` workflow. No local `db:migrate`, no `drizzle-kit push`.

- **Pushed ref:** `phase-33-pipeline` at `fe8f281` (pushed from local `main` on 2026-09-03; `origin/main`
  untouched so the production deploy does not pick up a schema the production database lacks)
- **Workflow run:** https://github.com/antoinegaetanrousseau/leasetic-calculator/actions/runs/33741438925
- **Dispatched:** 2026-09-03T09:54:42Z with inputs `branch = development`, `confirm` blank
- **Jobs:** `Dry run — list pending migrations: success`, `Apply migrations to development: success`
- **Trigger for doing it now:** local `npm run dev` rendered the app error boundary on every page because
  the Drizzle schema (plan 33-01) selects `client_relationships.stage`, which the branch did not have yet
  (`column "stage" does not exist`). This is the exact false-positive that makes this plan `[BLOCKING]`:
  typecheck/lint/build/tests were all green against a database missing the columns.

## Live verification (read-only, against the development connection string)

Step 5 — columns:

```
SELECT column_name FROM information_schema.columns
 WHERE table_name IN ('client_relationships','proposals')
   AND column_name IN ('stage','outcome','outcome_date','outcome_reason') ORDER BY column_name;
→ outcome, outcome_date, outcome_reason, stage        (exactly four rows)
```

Step 6 — triggers:

```
SELECT tgname FROM pg_trigger WHERE tgrelid = 'proposals'::regclass AND NOT tgisinternal;
→ proposals_won_requires_siren_ins, proposals_won_requires_siren_upd
```

`drizzle.__drizzle_migrations` last row: `id = 10, created_at = 1788393391934` (Drizzle numbers rows from 1,
so row 10 is journal idx 9). Before the run the last row was `id = 9` and the column query returned zero rows.

## Acceptance criteria

- [x] Workflow run with `branch = development` concluded `success`; URL recorded above
- [x] information_schema query returns exactly `outcome`, `outcome_date`, `outcome_reason`, `stage`
- [x] pg_trigger query returns both `proposals_won_requires_siren_ins` and `_upd`
- [x] No run of this workflow with `branch = main` was triggered during this phase
- [x] `git status --porcelain` shows no source-file change attributable to this plan

## Explicitly NOT done

**Production (`main`) has NOT been migrated.** The Neon `preview` branch has not been migrated either, so the
Vercel preview for `phase-33-pipeline` will show the same error page until the workflow is run with
`branch = preview`. Applying 0009 to `main` is a separate, deliberate milestone-close decision that must
happen before `phase-33-pipeline` is merged into `origin/main`.

## Self-Check: PASSED
