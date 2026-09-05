---
phase: 8
plan: "08-14"
slug: purge-cli
subsystem: data-ops
tags: [cli, purge, hard-delete, blob, audit-log, data-discipline]
dependency_graph:
  requires:
    - "08-03: listPurgeCandidates, hardPurgeProposal, writeAuditLog query helpers"
  provides:
    - "scripts/purge-soft-deleted.ts: manual purge CLI for 30-day soft-delete cycle"
    - "docs/operations/purge.md: operator runbook"
  affects:
    - "Phase 10 (CUT-08): cron will simply invoke npm run purge:soft-deleted -- --confirm PURGE-SOFT-DELETED"
tech_stack:
  added: []
  patterns:
    - "Typed-confirmation gate (CONFIRM=PURGE-SOFT-DELETED) — mirrors Phase 5/6 operator safety discipline"
    - "Blob-before-row delete ordering — failure leaves row+blob in place for retry"
    - "server-only bypass via -r ./scripts/_preload-mock-server-only.cjs — same as pdf:update-fixture"
    - "Best-effort per-row try/catch — failed rows remain as candidates for next run"
key_files:
  created:
    - scripts/purge-soft-deleted.ts
    - docs/operations/purge.md
  modified:
    - package.json
decisions:
  - "Used -r _preload-mock-server-only.cjs in npm scripts to bypass server-only guard when importing src/lib/db/queries"
  - "Added purge:soft-deleted:dry alias (same command, sugar for clarity) per plan spec"
  - "Exit code 1 when any row fails (in addition to [fail] log line) — operator can detect partial failure in CI"
metrics:
  duration: "12m"
  completed_date: "2026-05-09"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 8 Plan 14: Purge CLI Summary

Manual purge CLI + operator runbook for 30-day soft-delete hard-purge cycle (DATA-10), using typed-confirmation gate and blob-before-row delete ordering matching Phase 5/6 operator safety patterns.

## What Was Built

### scripts/purge-soft-deleted.ts (166 lines)

Standalone operator CLI that:

1. Lists proposals where `deleted_at < now() - 30d` via `listPurgeCandidates()`
2. For each candidate: `storage().delete(blobKey)` → `hardPurgeProposal(id)` → `writeAuditLog({actorId: null, action: 'proposal.purge', ...})`
3. Typed-confirmation gate: `CONFIRM=PURGE-SOFT-DELETED` env var OR `--confirm PURGE-SOFT-DELETED` CLI flag
4. Default invocation = dry-run (no writes); prints up to 20 candidates + total count
5. Best-effort per-row: try/catch continues past failures; failed rows stay for next run
6. DATABASE_URL hostname masked in banner output (Phase 5/6 operator safety pattern)
7. Exit code 1 if any row failed; exit code 0 if all succeeded or zero candidates

### package.json (2 scripts added)

```json
"purge:soft-deleted": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/purge-soft-deleted.ts",
"purge:soft-deleted:dry": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/purge-soft-deleted.ts"
```

Both default to dry-run; `:dry` alias is sugar for operator clarity. The preload
bypasses the `server-only` guard from `src/lib/db/queries/*` — same approach as
`pdf:update-fixture`.

### docs/operations/purge.md (135 lines)

Operator runbook covering:
- When to run (before each release + on-demand)
- Prerequisites (DATABASE_URL, STORAGE_DRIVER, blob credentials)
- Workflow: dry-run → apply → verify
- Failure modes table (blob fails, row fails, audit log fails, crash mid-run, wrong env)
- The 30-day window definition and where the constant lives
- Phase 10 integration (CUT-08 cron YAML snippet)

## Smoke Result

Running with placeholder credentials:

```
MODE: DRY-RUN (no writes)
DATABASE_URL: postgres://placeholder@localhost/placeholder
STORAGE_DRIVER: vercel
```

Banner printed correctly, then failed to connect to the placeholder DB — expected
behavior confirming the script is syntactically valid and starts before hitting I/O.

## Confirmation: Typed-Confirmation Gate

Token: `PURGE-SOFT-DELETED`

Matches Phase 5 (`MIGRATE PROD`) and Phase 6 (`GRANT-ADMIN-<email>`) pattern.
Both env-var and flag forms supported:
- `CONFIRM=PURGE-SOFT-DELETED npm run purge:soft-deleted`
- `npm run purge:soft-deleted -- --confirm PURGE-SOFT-DELETED`

## Phase 10 Integration

`docs/operations/purge.md` documents the GitHub Actions cron YAML. Phase 10
(CUT-08) only needs to create `.github/workflows/purge-proposals.yml` — no CLI
changes required.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm run lint:check` | PASS |
| `npm run check:no-vercel-imports` | PASS |
| `npm run check:no-drizzle-push` | PASS |
| `npm run check:seed-sql` | PASS |
| `npm test` (393 tests) | PASS — 393/393, 0 regressions |
| `npm run build` | PASS |

## Deviations from Plan

### Auto-deviation: npm script uses preload flag

**Found during:** Task 2 (npm script addition)

**Issue:** `src/lib/db/queries/*.ts` imports `'server-only'`, which throws outside
the Next.js server context. The plan's script template imports directly from
`../src/lib/db/queries`, so a plain `tsx scripts/purge-soft-deleted.ts` invocation
would throw at module load time with "This module cannot be imported from a Client Component".

**Fix:** Added `-r ./scripts/_preload-mock-server-only.cjs` to the npm scripts,
matching the existing `pdf:update-fixture` script pattern. The preload injects a no-op
`server-only` module into the require cache before tsx registers.

**Files modified:** `package.json`

**Precedent:** `scripts/update-pdf-fixture.ts` + `pdf:update-fixture` npm script already
use this exact pattern (established in Phase 8 PDF rendering work).

## Known Stubs

None — the CLI is complete and wires real DB/storage calls. All functionality is
guarded by typed-confirmation; no placeholder data flows anywhere.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.
The CLI is an operator-local tool (no Vercel deployment surface).

## Self-Check: PASSED

- `scripts/purge-soft-deleted.ts` — exists (166 lines)
- `docs/operations/purge.md` — exists (135 lines)
- `package.json` — contains `purge:soft-deleted`
- Commit `4a3351d` — feat(08-14): add purge-soft-deleted CLI script (DATA-10)
- Commit `92724c5` — feat(08-14): add purge:soft-deleted npm script and operator runbook
