---
phase: 34-fiche-client
plan: 04
completed: 2026-09-03
tasks_completed: 1
files_modified: []
---

# Plan 34-04 Summary — Apply migration 0010

## What Happened

Antoine authorised the run ("2) run it"). The orchestrator dispatched the
existing branch-scoped workflow rather than migrating locally:

```
gh workflow run db-migrate.yml --ref phase-33-pipeline -f branch=development
```

Run [33787935947](https://github.com/antoinegaetanrousseau/leasetic-calculator/actions/runs/33787935947)
— **success**. Both jobs green: the dry run listing pending migrations, then
the apply against the Neon `development` branch.

`npm run db:migrate` and `drizzle-kit push` were not run, here or anywhere in
this phase. `.env.local`'s `DATABASE_URL` points at a live Neon branch, which
is precisely why the GitHub Action owns this step.

## Verification — read back from the live database, not from the workflow's exit code

A green workflow proves a process exited zero. It does not prove the schema is
what the plan intended, so each claim below was queried directly against the
development branch after the run.

| Claim | Verified |
|---|---|
| `companies` gains the registry tier | `headcount_band`, `legal_name`, `naf_section`, `registry_state`, `registry_status`, `registry_synced_at` all present |
| `client_relationships` gains the private tier | `description`, `lead_source`, `next_action_at`, `next_action_note` all present |
| `relationship_events` exists | `id` uuid, `client_relationship_id` uuid, `kind` text, `actor_id` **text**, `occurred_at` timestamptz, `body` text, `payload` jsonb, `created_at` timestamptz |
| `actor_id` is text, never uuid (users.id is Better Auth text) | confirmed `text` |
| No backfill — every existing company reads `pending` | all 10 companies `registry_status = 'pending'` |
| The Phase 31 provenance CHECK is untouched | `client_relationships_source_check` still admits only `proposal_extraction` and `hubspot_import` |
| The new lead-source CHECK is separate | `client_relationships_lead_source_check` admits `recommandation`, `prospection`, `salon`, `site_web`, `autre` |

The last two are the ones that mattered: the FICHE-04 column was very nearly
called `source`, which would have fused two vocabularies and broken the
Phase 31 bulk-import undo path. The live database confirms the two constraints
are independent.

## Scope

Zero files changed — `git status --porcelain` attributable to this plan is
empty. This plan is an operator action, not a code change.

## Next Phase Readiness

Waves 3 and later may now read the new columns.

**Superseded the same day.** This plan migrated `development` only, and the
paragraph here originally said production and preview would stay unmigrated
until milestone close. Both were migrated on 2026-09-04 on Antoine's explicit
instruction, ahead of a launch planned for the following Wednesday:

| Neon branch | Workflow run | Result |
|---|---|---|
| `preview` | 33860553406 | success — brought it from pre-Phase-30 to 0010 |
| `main` (production) | 33863987955 | success — 0009 and 0010, applied before the code shipped |

Production was verified by live query afterwards: 11 migrations applied, every
new column and table present, `relationship_events.actor_id` typed `text`, and
the existing rows intact. The `production` GitHub Environment's controls held —
choice-constrained branch input, the literal `MIGRATE PROD` confirmation, and
the required-reviewer gate, which the orchestrator approved using Antoine's
authenticated CLI on his instruction in chat, recorded in the approval comment.

---
*Phase: 34-fiche-client*
*Completed: 2026-09-03*

## Self-Check: PASSED

Workflow run 33787935947 reports success. Every schema claim above was read
back from the development branch with a live query after the run completed.
