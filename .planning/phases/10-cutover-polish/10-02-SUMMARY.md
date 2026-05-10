---
phase: 10-cutover-polish
plan: "02"
subsystem: operations
tags: [purge, cron, dual-auth, security, vercel]
dependency_graph:
  requires:
    - "10-01: PURGE_CRON_SECRET declared in .env.example"
    - "10-01: purge:soft-deleted npm script registered with _preload-mock-server-only.cjs"
    - "src/lib/db/queries: listPurgeCandidates, hardPurgeProposal, writeAuditLog (Phase 8)"
    - "src/lib/storage: storage() adapter with idempotent delete (Phase 5)"
    - "src/lib/auth/require: requireAdmin() (Phase 6)"
  provides:
    - "purgeSoftDeleted() pure function (consumed by CLI + HTTP route)"
    - "/api/internal/purge-soft-deleted HTTP route (triggered by Vercel Cron)"
    - "vercel.json cron schedule entry (triggers route twice-monthly)"
  affects:
    - src/lib/admin/purge.ts
    - scripts/purge-soft-deleted.ts
    - app/api/internal/purge-soft-deleted/route.ts
    - vercel.json
tech_stack:
  added:
    - "node:crypto timingSafeEqual (constant-time secret comparison)"
    - "vercel.json cron configuration"
  patterns:
    - "server-only guard on src/lib/admin/* service modules"
    - "dual-auth gate pattern: cron bearer OR admin session"
    - "constant-time comparison via timingSafeEqual (T-10-02-02)"
    - "best-effort per-row errors with { purged, errors[] } return type"
    - "fire-and-forget audit log write (same pattern as app/api/proposals/[id]/delete/route.ts)"
    - "force-dynamic + nodejs runtime on session-reading routes (PITFALLS §1.6)"
key_files:
  created:
    - src/lib/admin/purge.ts
    - app/api/internal/purge-soft-deleted/route.ts
    - vercel.json
  modified:
    - scripts/purge-soft-deleted.ts
decisions:
  - "purgeSoftDeleted() placed in src/lib/admin/ (server-only service layer) per D-10-07 single-source-of-truth"
  - "timingSafeEqual used for cron secret comparison to mitigate T-10-02-02 timing side-channel"
  - "Generic 401 on auth failure — no gate disclosure (T-10-02-03)"
  - "Route-level audit log captures source: 'cron' | 'admin-manual' for T-10-02-08 repudiation trail"
  - "vercel.json has no secrets — PURGE_CRON_SECRET lives only in Vercel env vars (T-10-02-04)"
  - "Dry-run branch in CLI still calls listPurgeCandidates() directly for candidate display (thin wrapper preserves full dry-run UX)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-10"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 10 Plan 02: Soft-Delete Purge Cron — Backend

**One-liner:** Extracts per-row purge loop into server-only `purgeSoftDeleted()` pure function, refactors CLI to thin wrapper, creates dual-auth HTTP route with `timingSafeEqual` cron-secret gate, and wires Vercel Cron schedule twice-monthly at 03:00 UTC.

## Tasks Completed

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 | Extract purgeSoftDeleted() pure function + refactor CLI | 2cdd202 | purge.ts (new), purge-soft-deleted.ts (refactor) | +78, -51 |
| 2 | Create dual-auth HTTP route at /api/internal/purge-soft-deleted | c678468 | route.ts (new) | +80 |
| 3 | Wire Vercel Cron schedule via vercel.json | 31003ab | vercel.json (new) | +9 |

## File Diff Summary

| File | Lines Added | Lines Removed | Notes |
|------|-------------|---------------|-------|
| `src/lib/admin/purge.ts` | +68 | 0 | NEW — server-only pure function with blob→row→audit loop |
| `app/api/internal/purge-soft-deleted/route.ts` | +80 | 0 | NEW — dual-auth POST route with timingSafeEqual |
| `vercel.json` | +9 | 0 | NEW — cron schedule entry |
| `scripts/purge-soft-deleted.ts` | +11 | -52 | Apply branch replaced with purgeSoftDeleted() delegation |

## Dual-Auth Gate Behavior

The route at `/api/internal/purge-soft-deleted` accepts either gate:

**Gate A — Cron secret (Vercel Cron unattended invocation):**
```bash
curl -X POST https://leasetic.vercel.app/api/internal/purge-soft-deleted \
  -H "Authorization: Bearer <PURGE_CRON_SECRET value from Vercel env>"
```
Expected: 200 `{ purged: N, errors: 0 }` (or 500 if all rows fail)

**Gate B — Admin session (manual ad-hoc invocation):**
```bash
# Requires active admin browser session (cookies)
curl -X POST https://leasetic.vercel.app/api/internal/purge-soft-deleted \
  -H "Cookie: <admin session cookies>"
```
Expected: same response shape as Gate A.

**Unauthorized probe (no gate):**
```bash
curl -X POST https://leasetic.vercel.app/api/internal/purge-soft-deleted
```
Expected: 401 `{ error: "unauthorized" }` — no disclosure of which gate was evaluated.

**Wrong secret (length match enforced before timingSafeEqual):**
```bash
curl -X POST https://leasetic.vercel.app/api/internal/purge-soft-deleted \
  -H "Authorization: Bearer wrong-value"
```
Expected: 401 — constant-time comparison prevents timing oracle even on length mismatch (short-circuit exits without `timingSafeEqual` call when lengths differ, which is safe because length mismatch itself reveals nothing beyond "wrong secret").

## Vercel Cron Header-Injection Mechanism

**Note for deploy-ovh.md (Plan 10-07):** Vercel Cron invokes the configured `path` via HTTPS POST. Vercel does NOT automatically inject custom Authorization headers from `vercel.json` — the `crons` JSON schema only accepts `path` and `schedule`. To pass `PURGE_CRON_SECRET` to the route:

1. Set `PURGE_CRON_SECRET` as a Vercel Environment Variable (Production scope) in the Vercel dashboard
2. Configure the Cron job to send the header: Vercel Project Settings → Crons → (select the cron) → Headers → Add `Authorization: Bearer {{PURGE_CRON_SECRET}}`

**Alternative:** Vercel Cron automatically injects a `x-vercel-signature` HMAC (if configured). Our route currently only validates the `Authorization: Bearer` pattern — no changes needed to the route for this alternate mechanism; Antoine chooses the header injection approach in Step 2 above when deploying. This is documented as a deploy-ovh.md step (Plan 10-07).

## Cron Schedule Decoded

```
0 3 1,15 * *
│ │ └─── day of month: 1st and 15th
│ └───── hour: 03 UTC
└─────── minute: :00
```

**Runs:** 03:00 UTC on the 1st and 15th of every month (twice-monthly).

**Worst-case post-soft-delete persistence calculation:**
- Soft-delete happens 1 second after the 1st-of-month cron run
- Next cron: 15th of month = 14 days later
- After 30-day wait: cron on 15th-next-month = 14 + 30 = 44 days later
- **Total: ~44-46 days** (compliant with DATA-10's "after 30 days minimum" threshold)

## Verification Gates

All gates green at completion:

- `npm run typecheck` — exits 0
- `npm run lint:check` — exits 0 (0 warnings, 0 errors)
- `npm run check:no-vercel-imports` — exits 0 (purge.ts uses `@/lib/storage` adapter, not raw `@vercel/blob`)
- `npm run build` — exits 0 (`/api/internal/purge-soft-deleted` appears in build output as dynamic route)
- `npm test` — 399/399 tests pass across 21 test files (no regressions)
- `grep -c "import 'server-only'" src/lib/admin/purge.ts` — returns 1
- `grep -c "timingSafeEqual" app/api/internal/purge-soft-deleted/route.ts` — returns 3
- `grep -c "PURGE_CRON_SECRET" app/api/internal/purge-soft-deleted/route.ts` — returns 2
- `grep -iE "secret|password|token|bearer" vercel.json` — returns 0 (no secrets committed)
- `node -e "const c = require('./vercel.json'); console.log(c.crons[0].schedule)"` — outputs `0 3 1,15 * *`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All wiring is complete and functional.

## Threat Surface Scan

New network endpoint introduced: `POST /api/internal/purge-soft-deleted`

All threats in the plan's `<threat_model>` are mitigated as specified:

| Threat ID | Mitigation Implemented |
|-----------|----------------------|
| T-10-02-01 | Dual auth gate: timingSafeEqual + requireAdmin() |
| T-10-02-02 | timingSafeEqual from node:crypto; length pre-check before compare |
| T-10-02-03 | Secret/authHeader never logged; console.error only on audit-write failure |
| T-10-02-04 | grep vercel.json for secrets returns 0 matches |
| T-10-02-05 | Accepted; Vercel platform DDoS covers; early 401 exit (no DB read) |
| T-10-02-06 | Accepted; requireAdmin() enforces admin role |
| T-10-02-07 | vercel.json path locked to exact string in acceptance criterion |
| T-10-02-08 | payload.source: 'cron' | 'admin-manual' disambiguates in audit_log |
| T-10-02-09 | errors.length (count only) in HTTP response; per-row messages in server logs only |
| T-10-02-10 | Single source of truth (purgeSoftDeleted) IS the mitigation |

## Self-Check: PASSED

- `src/lib/admin/purge.ts` — exists, contains `import 'server-only'` (line 1), exports `purgeSoftDeleted`
- `app/api/internal/purge-soft-deleted/route.ts` — exists, exports POST, runtime, dynamic
- `vercel.json` — exists, valid JSON, crons[0].schedule = "0 3 1,15 * *", no secrets
- `scripts/purge-soft-deleted.ts` — refactored, contains `import { purgeSoftDeleted }`, no for-loop over candidates in apply branch
- Commits 2cdd202, c678468, 31003ab — all present in git log
