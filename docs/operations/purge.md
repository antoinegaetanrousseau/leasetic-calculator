# Operations — Manual Purge of Soft-Deleted Proposals

## Overview

Phase 8 ships a manual purge CLI that hard-deletes proposals whose
`deleted_at` is older than 30 days. The blob (PDF) is deleted first, then
the row, then an `audit_log` entry is written. The script is best-effort
per row: a single row failure does not abort the whole run.

This is Phase 8's data-correctness commitment to DATA-10. Phase 10 will
add a scheduled cron that runs this CLI from CI; until then, an operator
runs it manually before each release.

## When to run

- **Before each Phase 8/9/10 production release** (catch-up on accumulated soft-deletes).
- **On demand** when a partner asks "is my deleted proposal really gone?"

## Prerequisites

Same credentials as `db:migrate`:

- `DATABASE_URL` — production Neon pooled URL (read + write privileges)
- `STORAGE_DRIVER` — `vercel` or `s3`
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob) or `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_S3_BUCKET` (S3)

Run from a workstation with access to the production-DB credentials (pull from
Vercel env or 1Password).

## Workflow

### 1. Dry-run (always first)

```bash
npm run purge:soft-deleted
```

Output: list of up to 20 candidates + total count. **No writes.** Inspect
the output; if anything looks wrong (e.g., recent rows incorrectly flagged),
STOP and investigate before proceeding to the apply step.

### 2. Apply

```bash
CONFIRM=PURGE-SOFT-DELETED npm run purge:soft-deleted
```

OR equivalently:

```bash
npm run purge:soft-deleted -- --confirm PURGE-SOFT-DELETED
```

Output: per-row `[ok]` / `[fail]` / `[skip]` lines; final tally.

- `[ok]` — blob + row deleted, audit log written.
- `[skip]` — row disappeared between dry-run and apply (race condition, harmless).
- `[fail]` — error during this row; logged and skipped; row remains for next run.

Exit code is `0` if all rows succeeded, `1` if any row failed.

### 3. Verify after apply

- **Row gone:** `psql $DATABASE_URL -c "SELECT id FROM proposals WHERE id = '<purged-id>'"` — should return zero rows.
- **Blob gone:** depends on driver:
  - Vercel Blob: `npx vercel blob head <blob-key>` — should 404.
  - S3: `aws s3api head-object --bucket $AWS_S3_BUCKET --key '<blob-key>'` — should 404.
- **Audit log written:** `psql $DATABASE_URL -c "SELECT id, action, target_id, created_at FROM audit_log WHERE action = 'proposal.purge' ORDER BY created_at DESC LIMIT 10"`

## The 30-day window

Hard purge is only allowed for proposals whose `deleted_at` is strictly older
than **30 days** from now. This matches the restore window (D-C3): a partner
cannot restore a proposal that is a purge candidate, and a purge candidate
cannot be restored once it has been hard-purged.

The constant is defined in `src/lib/db/queries/proposals.ts`:

```ts
const SOFT_DELETE_WINDOW = sql`now() - interval '30 days'`;
```

A future v1.2 can expose this as an operator-configurable env var if Leasétic
legal requires a longer retention window.

## Failure modes

| Mode | Symptom | Recovery |
|------|---------|----------|
| Blob delete fails (storage 503/timeout) | `[fail]` row; blob and row both still exist | Re-run the CLI — blob delete is idempotent (404 → no-op in both Vercel Blob and S3) |
| Row delete fails (DB connection) | `[fail]` row; blob may be gone, row still exists | Re-run; `hardPurgeProposal` re-checks the 30-day WHERE, so no double-delete risk |
| Audit log write fails | `[fail]` row logged; blob + row may already be deleted | Worst case: no audit trace for that row. Log the warning, continue. v1.2 candidate for redo log |
| Script crashes mid-run | Some rows purged, some not | Re-run; already-purged rows show `[skip]` (race-condition path); remaining candidates are processed |
| Ran against wrong DATABASE_URL | Wrong-env purge | Always inspect `DATABASE_URL: ...@hostname/...` in the banner before typing PURGE-SOFT-DELETED |

## Rationale for the manual gate

Hard-purging proposals is **irreversible**. The typed-confirmation token
`PURGE-SOFT-DELETED` mirrors Phase 5's `MIGRATE PROD` and Phase 6's
`GRANT-ADMIN-<email>` discipline so the operator is forced to type the
magic string explicitly and cannot fat-finger an apply via shell history
or env-var injection.

The banner prints the masked `DATABASE_URL` hostname before any write
happens, giving the operator a final visual confirmation that they are
targeting the correct environment.

## Phase 10 integration

CUT-08 will wire this CLI into a scheduled GitHub Actions cron. No Phase 8
changes will be needed; the CLI is the single source of truth:

```yaml
# .github/workflows/purge-proposals.yml (Phase 10 — not yet created)
on:
  schedule:
    - cron: '0 2 * * *'   # daily at 02:00 UTC
jobs:
  purge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run purge:soft-deleted -- --confirm PURGE-SOFT-DELETED
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          STORAGE_DRIVER: ${{ secrets.STORAGE_DRIVER }}
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
```

The scheduled job will pass `--confirm PURGE-SOFT-DELETED` directly;
no interactive human step required in CI.
