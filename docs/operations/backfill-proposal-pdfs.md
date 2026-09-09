# Proposal PDF Backfill — Operations Runbook

Phase 44 built a one-time, operator-run migration that re-renders every
stored proposal PDF into the Phase 43 design, driven entirely by each
proposal's own committed data, and overwrites the stored blob in place.
This runbook documents how an operator runs that migration end to end.

> **This write is IRREVERSIBLE.** The blob key is a pure function of
> `(userId, proposalId)`, `VercelBlobStorage.put()` passes
> `addRandomSuffix: false`, and the store has no versioning. A `put()` at
> that key IS a replacement. There is no sidecar copy of the retired
> layout anywhere — once the apply job runs, the pre-Phase-43 document
> does not exist any more (D-01). The dry-run report and the two approval
> gates below are the only safety net.

## Locked rules

1. **Do not run this locally.** `scripts/backfill-proposal-pdfs.ts` begins
   with `import './_load-env'`, which arms `assertSafeDatabaseTarget()` at
   module scope. That guard classifies Neon `main` as `refuse-production`
   and exits before any other statement runs, so a developer machine
   holding a `.env*` candidate file cannot reach apply mode at all. No
   bypass env var exists for this script, and none is to be added — a
   bypass built for a bulk irreversible blob mutation would outlive this
   phase (D-07). Apply runs only from
   `.github/workflows/backfill-proposal-pdfs.yml`.
2. **Never approve the apply job without reading the dry-run report
   first.** The approval on that job's deployment IS MIG-02's explicit
   confirmation (D-08) — it is what makes "the run I approved" and "the
   run that happened" the same run by construction, because job 2
   downloads the exact artifact job 1 produced rather than re-planning.
3. **`--allow-drift` (the `allow_drift` dispatch input) accepts a
   difference between the reviewed report and the current world.** Use it
   only after reading the printed `+`/`-` drift lines and deciding, change
   by change, that each one is expected (for example, a handful of new
   proposals created since the dry run). If a change looks unexplained,
   stop, re-dispatch instead, and review the fresh report.
4. **This workflow applies no database migration.** Phase 44 creates none.
   Any schema change this milestone needed already landed and was applied
   through `.github/workflows/db-migrate.yml` in an earlier phase.

## Scope

- Rows with `status IN ('active', 'deleted')` are in scope. Drafts are
  excluded structurally — they have no blob to overwrite.
- Soft-deleted rows are included with **no 30-day window filter**: a
  partner can restore a soft-deleted proposal within that window, and an
  unmigrated row would resurrect a retired-layout document after the
  migration had already reported success.

## What changes and what does not

- **Figures do not change.** The PDF's `computed` prop is the proposal's
  own stored `computed` jsonb, printed verbatim — nothing is recomputed,
  and `params_snapshot` is never read at render time (D-05). Every
  re-rendered document therefore shows the exact figures it always showed
  (MIG-04).
- **Language does not change.** Each document is re-rendered in its own
  committed `language` column, so no delivered document changes language
  at its existing reference (MIG-03).
- **The advisor block and the partner company telephone are live reads**
  and MAY legitimately differ from the document the client originally
  received — by design, not a defect. Neither is snapshotted, and nothing
  in this migration detects or reports that delta (D-02).
- **A row whose blob object is missing from storage is not a special
  case.** It is processed like any other row; the render writes a valid
  PDF at the expected key and repairs the row as a side effect (D-04).

## Prerequisites (one-time GitHub setup)

Before dispatching, confirm in GitHub → Settings → Environments →
`production`:

- **Environment secrets** `STORAGE_DRIVER` and `BLOB_READ_WRITE_TOKEN`
  exist (the driver value matches what the Vercel production deployment
  uses, currently `vercel`; the token comes from Vercel → Storage → the
  proposals Blob store → Tokens).
- **`DATABASE_URL_MAIN`** is present (it already is — `db-migrate.yml`
  uses the same secret). Do not copy it to any other Environment.
- **Deployment protection rules → Required reviewers** is still
  configured. This required-reviewer gate is what makes the approval
  click MIG-02's confirmation — without it, the apply job would run
  unattended.

## Step-by-step

1. Open GitHub → Actions → **Backfill Proposal PDFs (One-Time
   Migration)** → Run workflow.
2. Type `BACKFILL PROD PDFS` exactly in the `confirm` field. Leave
   `allow_drift` unchecked unless you are deliberately re-running past a
   reviewed drift. Dispatch.
3. Approve the **first** pending deployment. This only lets the dry-run
   job READ production — it writes zero blobs and zero rows. Watch it
   finish green.
4. Download the `backfill-dry-run-report` artifact and open
   `dry-run-latest.md`. Read, in order:
   - **Counts** — a plausible number of candidates.
   - **Would re-render** / **Would fail to render** — check the failure
     list is empty or explainable.
   - Confirm no financial figure, no client amount, no blob key, no user
     id and no connection string appears anywhere in the file — the
     report is a closed, safe projection by construction, but this is
     the human check that it held.
5. **Decision point.** Approving the **second** pending deployment starts
   the irreversible overwrite (Locked rule 2). If anything in the report
   looks wrong, cancel the run instead — cancelling costs nothing, and a
   fresh dispatch produces a fresh report.
6. If you approve: watch the apply job.
   - **Green** — every listed proposal was re-rendered and marked.
   - **Red with exit code `4`** — some rows failed. Read the
     `[fail] id=<proposalId>: <reason>` lines in the job log, then
     re-dispatch; a re-run retries exactly those rows, because they
     remain unmarked in `audit_log` (D-06, MIG-05).
7. Spot-check the result: open two or three proposals in the extranet —
   at least one French, one English, and one soft-deleted if you have
   one — and confirm each PDF now shows the Phase 43 layout, its own
   language, and the same loyer, coefficient and amount it always showed.

## Exit codes

| Code | Meaning | What to do |
|------|---------|------------|
| `0` | Success — the dry run wrote its report, or apply completed with zero failed rows. | Nothing — proceed to the next step in the runbook. |
| `1` | Crash — an uncaught error. | Read the job log's `FATAL:` line; this is a bug to investigate, not a guard refusal. |
| `2` | Environment refusal — `DATABASE_URL` missing/malformed, or (apply mode only) a required storage env var is missing. | Check the `production` Environment's secrets against the Prerequisites section above. |
| `3` | Guard refusal — apply aborted: no dry-run report was found, the report's database fingerprint does not match, or drift was detected and `allow_drift` was not set. | Re-dispatch to produce a fresh dry run, review it, and either approve that run or re-dispatch with `allow_drift` after reviewing the printed drift. |
| `4` | Partial failure — the run completed but at least one row failed to render, upload or persist. | Read the `[fail] id=...` lines, then re-dispatch; the re-run retries exactly the failed rows (D-10, MIG-05). |

## Drift refusals

If the apply job exits `3` with `reason: drift`, the job log prints one
`+`/`-` line per proposal that entered or left scope since the approved
dry run, plus a summary count of rows already migrated (which is normal
on a resumed run and is never treated as drift). Read every `+`/`-` line:
if each one is explained (for example, a proposal finalized after the dry
run), re-dispatch with `allow_drift` checked. If anything is unexplained,
stop and investigate before proceeding — do not set `allow_drift` to make
a refusal go away without understanding why it fired.

## Cross-references

- [`docs/operations/neon-branch-routing.md`](./neon-branch-routing.md) —
  the locked rule that real branches are reached only through a gated
  workflow.
- [`docs/operations/reconciliation-import.md`](./reconciliation-import.md)
  and [`docs/operations/purge.md`](./purge.md) — the dry-run/report/apply
  shape and typed-confirmation precedent this migration follows.
- `.planning/phases/44-backfill-migration/44-CONTEXT.md` — D-01 through
  D-11, the full reasoning behind every locked rule above.

---

*Runbook added: 2026-09-10. Phase 44 / MIG-01, MIG-02 (Antoine).*
