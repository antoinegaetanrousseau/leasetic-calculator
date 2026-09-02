# Reconciliation Import — Operations Runbook

Phase 31 built a dry-run-first dedup engine that turns every client already
implied by an existing proposal into a real `companies` + `client_relationships`
record. This runbook documents how an operator runs that import end to end,
what to look for at each step, and how to undo a bad run.

> This is a one-time historical migration, not a product feature. There is
> deliberately no UI trigger — an operator runs it from a terminal, once,
> against `proposals.inputs`.

## Locked rules

1. **Never run the real mode without a dry run first.** The tool enforces
   this — a real run reads the last dry-run report and refuses to proceed
   without one — but do not try to circumvent it by deleting or hand-editing
   files under `.reconcile/` to fake a passing check.
2. **Never point this script at a branch you have not first dry-run
   against.** The fingerprint guard aborts in that case, and that abort is
   correct — it is the tool refusing to apply a report generated against a
   different database.
3. **This script applies no migrations.** `drizzle/0008_phase31_reconciliation.sql`
   reaches a real branch only through `.github/workflows/db-migrate.yml` —
   see [`docs/operations/neon-branch-routing.md`](./neon-branch-routing.md)
   locked rule 3. There is no local migration path here, and this runbook
   never asks you to run one.
4. **`--allow-drift` accepts a difference between the reviewed report and
   the current world.** Use it only after reading the printed drift output
   and deciding, change by change, that each one is expected (for example,
   a handful of new proposals created since the dry run). If a change looks
   unexplained, stop and investigate before re-running with the flag.

## Prerequisites

- `drizzle/0008_phase31_reconciliation.sql` already applied to the target
  branch (via `db-migrate.yml` — see rule 3 above).
- `DATABASE_URL` in `.env.local` (or the shell environment) pointing at the
  target branch's pooled connection string.
- Admin access to `/[adminSegment]/companies/review` for Step 4, since the
  review queue is where a human resolves anything the engine could not
  auto-merge.

## Step 1 — dry run

```bash
npm run db:reconcile:dry-run
```

This plans the entire import — every company to create, every relationship,
every pair the engine would flag for human review — and writes it to disk.
**Zero rows are written to the database in this mode.**

It writes four files under `.reconcile/` in the project root:

- `dry-run-<timestamp>.md` / `dry-run-<timestamp>.json` — an archived,
  never-overwritten copy of this run.
- `dry-run-latest.md` / `dry-run-latest.json` — overwritten on every dry
  run; `dry-run-latest.json` is what a subsequent real run reads back to
  diff against.

`.reconcile/` is git-ignored on purpose — the Markdown and JSON reports
contain live client names and SIRENs, and that data must never land in
version control.

Read `dry-run-latest.md` in this order:

1. **The counts table** at the top — a fast sanity check on the overall
   shape of the run (how many companies, relationships, contacts, flagged
   pairs, skipped rows).
2. **"Pairs flagged for review"** — every pair the engine could not
   auto-merge on SIREN and instead wants a human to resolve in Step 4.
3. **"Skipped rows"** — every source proposal the engine could not extract
   a client from, each listed with its proposal id and the reason it was
   skipped, so a suspicious skip is traceable back to one specific proposal.

## Step 2 — review the report

Before running the real import, actually read the report from Step 1:

- An unexpectedly large flagged-pair count usually means the source data
  has more name collisions or missing SIRENs than expected — not a bug in
  the engine. Spot-check a few flagged pairs against the underlying
  proposals before proceeding.
- Every skipped row carries its source proposal id and a reason. If a skip
  looks wrong (a proposal that clearly has a client name being skipped),
  trace it back via that proposal id before running the real import — the
  real run will skip it identically.

## Step 3 — real run

```bash
npm run db:reconcile
```

If the target database's hostname ends in `.neon.tech`, the script requires
an explicit typed confirmation before it will write anything:

```bash
RECONCILE_CONFIRM=YES npm run db:reconcile
```

Without `RECONCILE_CONFIRM=YES` set to exactly that value, a real run
against any `*.neon.tech` host exits immediately with no write attempted.
Non-Neon hosts (e.g. a local Postgres for testing) do not require this
confirmation.

Before writing, the real run recomputes a fresh plan and compares it
against the stored dry-run report (D-15). If the two differ — for example,
new proposals were created between Step 1 and Step 3 — the run aborts and
prints the drift instead of writing. Re-run Step 1's dry run, review the
new report, and either proceed with a fresh `npm run db:reconcile`, or, if
you have already reviewed the printed drift and judge every change
expected, append `-- --allow-drift` to proceed past it (see Locked rule 4).

### Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Success — the dry run wrote its report, or the real run applied cleanly. |
| `1`  | Crash — an uncaught error. |
| `2`  | Environment refusal — `DATABASE_URL` missing or malformed, or a real run against a `*.neon.tech` host without `RECONCILE_CONFIRM=YES`. |
| `3`  | Guard refusal — the real run aborted: no dry-run report on disk, a database-fingerprint mismatch, a source mismatch, or unaccepted drift. |

## Step 4 — resolve the queue

Log in as an admin and open `/[adminSegment]/companies/review`. Each card
shows both companies side by side, with their SIRENs, relationship owners
and counts.

- **Merge** picks a survivor company and deletes the other, moving every
  relationship, contact and proposal link onto the survivor.
- **Keep separate** is permanent — that specific pair is never flagged
  again on a later run.

The queue is **admin-only by design**. A flagged pair frequently has its
two sides held by different partners, and showing the queue to a partner
would reveal that another partner is working a company that looks like
theirs — exactly the cross-partner leakage the relationship model exists
to prevent.

## Step 5 — confirm

Re-run the dry run:

```bash
npm run db:reconcile:dry-run
```

A converged import reports **zero** companies to create, **zero**
relationships to create, and **zero** new flagged pairs. Any non-zero count
here means either new proposals were added since Step 3, or the queue in
Step 4 was not fully drained — resolve the remaining pairs and re-check.

## Rolling back a bad import

Every row this tool creates carries `source = 'proposal_extraction'` on
`companies`, `client_relationships` and `contacts`, so a bad run is
removable by provenance. Delete in this dependency order — contacts first,
then client relationships, then companies:

```sql
DELETE FROM contacts
WHERE client_relationship_id IN (
  SELECT id FROM client_relationships WHERE source = 'proposal_extraction'
);

DELETE FROM client_relationships
WHERE source = 'proposal_extraction';

DELETE FROM companies
WHERE source = 'proposal_extraction';
```

**Warning:** these statements match *every* row this tool has ever
written, including rows from an earlier, already-good run — not just the
run you are trying to undo. In practice, narrow each `DELETE` with an
additional `created_at` window (e.g. `AND created_at >= '<run start
timestamp>'`) before running it, so a rollback of today's bad run cannot
also erase last month's good one.

## Cross-references

- [`docs/operations/neon-branch-routing.md`](./neon-branch-routing.md) —
  the branch-routing model and locked rule 3 (migrations fan out only via
  `db-migrate.yml`).
- [`docs/operations/migrations.md`](./migrations.md) — general migration
  mechanics.

---

*Runbook added: 2026-09-02. Phase 31 / IMPORT-01, IMPORT-03, IMPORT-04,
IMPORT-05, IMPORT-06 (Antoine).*
