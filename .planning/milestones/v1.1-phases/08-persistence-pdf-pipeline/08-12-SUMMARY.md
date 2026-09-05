---
phase: 08-persistence-pdf-pipeline
plan: "08-12"
subsystem: api
tags: [soft-delete, restore, sonner, audit-log, next-route-handler, client-component]

# Dependency graph
requires:
  - phase: 08-10
    provides: DeleteButtonClient + RestoreButtonClient stubs (shape of props interface)
  - phase: 08-11
    provides: app/(authed)/page.tsx home page (DeleteJustToast mount target)
  - phase: 08-03
    provides: softDeleteProposal, restoreProposal, writeAuditLog query helpers

provides:
  - POST /api/proposals/[id]/delete — requireUser + softDeleteProposal + writeAuditLog(proposal.delete)
  - POST /api/proposals/[id]/restore — requireUser + restoreProposal + writeAuditLog(proposal.restore)
  - DeleteButtonClient real implementation (window.confirm + fetch + sonner + redirect /?deleted_just=1)
  - RestoreButtonClient real implementation (fetch + sonner.success + router.push + router.refresh)
  - DeleteJustToast client component (reads ?deleted_just=1, fires toast, strips URL flag)

affects:
  - 08-14 (hard-purge CLI — shares soft-delete schema)
  - phase-9 admin audit log viewer (proposal.delete / proposal.restore actions in audit_log)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fired ref pattern: prevents double-toast on React Strict Mode double-invoke (mirrors DuplicatePrefillToast from 08-13)"
    - "D-18 obscurity: affected=0 collapses not-found / not-owned / already-deleted into identical 404"
    - "Ownership defence-in-depth: requireUser at route layer + WHERE userId= in queries layer"

key-files:
  created:
    - app/api/proposals/[id]/delete/route.ts
    - app/api/proposals/[id]/restore/route.ts
    - src/components/proposals/DeleteJustToast.tsx
  modified:
    - src/components/proposals/DeleteButtonClient.tsx
    - src/components/proposals/RestoreButtonClient.tsx
    - app/(authed)/page.tsx

key-decisions:
  - "affected=0 on delete/restore both return 404 (not 200): D-18 obscurity means we cannot distinguish not-found from already-deleted; the queries layer's isNull/isNotNull WHERE enforces idempotency via 'do nothing' semantics"
  - "fired ref added to DeleteJustToast to prevent React Strict Mode double-toast (same pattern as DuplicatePrefillToast in 08-13)"
  - "router.replace with qs.length>0 guard avoids leaving bare '?' in URL when no other params exist"

patterns-established:
  - "URL-flag toast pattern: client component reads ?flag=1 → fires toast → strips URL via router.replace (DuplicatePrefillToast, DeleteJustToast)"

requirements-completed:
  - PROP-22
  - DATA-07
  - DATA-10

# Metrics
duration: 18min
completed: 2026-05-09
---

# Phase 08-12: Delete + Restore Actions Summary

**Full soft-delete/restore lifecycle wired end-to-end: two ownership-gated route handlers + real button client components + discoverable delete-success toast on home page redirect**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-09T21:42:00Z
- **Completed:** 2026-05-09T21:59:00Z
- **Tasks:** 4/4
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- POST `/api/proposals/[id]/delete` and `/api/proposals/[id]/restore` route handlers — both requireUser-gated, ownership enforced by queries layer WHERE clause, writeAuditLog on success, D-18 obscurity (affected=0 → 404)
- `DeleteButtonClient` and `RestoreButtonClient` stubs from 08-10 replaced with real implementations — confirm dialog, fetch POST, sonner toast variants, redirect/refresh
- `DeleteJustToast` new client component mounts on home page, reads `?deleted_just=1`, fires delete-success toast with "Voir" action button, strips URL flag via router.replace
- All 399 tests pass; typecheck/lint/build all green

## Task Commits

1. **Task 1: Action route handlers (delete + restore)** - `2ebc60a` (feat)
2. **Task 2: Real DeleteButtonClient + RestoreButtonClient** - `f3866d5` (feat)
3. **Task 3: DeleteJustToast + home page mount** - `6865aed` (feat)
4. **Task 4: Final guard** — validated inline (no extra commit; all guards passed after Task 3)

## Files Created/Modified

- `app/api/proposals/[id]/delete/route.ts` — POST soft-delete handler; requireUser + softDeleteProposal + writeAuditLog('proposal.delete')
- `app/api/proposals/[id]/restore/route.ts` — POST restore handler; requireUser + restoreProposal + writeAuditLog('proposal.restore')
- `src/components/proposals/DeleteButtonClient.tsx` — Real impl: window.confirm + fetch POST + toast.success with "Voir" action button + router.push('/?deleted_just=1') on success
- `src/components/proposals/RestoreButtonClient.tsx` — Real impl: fetch POST + toast.success + router.push(/proposals/{id}) + router.refresh()
- `src/components/proposals/DeleteJustToast.tsx` — NEW: 'use client'; reads ?deleted_just=1, fires toast with action, strips URL flag; fired ref prevents double-invoke
- `app/(authed)/page.tsx` — Added `<DeleteJustToast lang={lang} />` as first child of home page return

## Decisions Made

- **affected=0 on both routes → 404**: D-18 obscurity — identical surface for not-found / not-owned / already-deleted / outside-30d-window. The queries layer's WHERE clauses (isNull for delete, isNotNull + 30d window for restore) do the real gating.
- **fired ref in DeleteJustToast**: Mirrors the DuplicatePrefillToast pattern from 08-13 to prevent double-toast on React Strict Mode's double-invoke of useEffect.
- **router.replace qs guard**: `qs.length > 0 ? '?${qs}' : '?'` avoids a bare `?` lingering in the URL when deleted_just is the only param. Uses the identical pattern from DuplicatePrefillToast.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added fired ref to DeleteJustToast**
- **Found during:** Task 3 (DeleteJustToast creation)
- **Issue:** Plan's action code block showed a simpler useEffect without a fired ref, but React Strict Mode double-invokes effects in dev, causing double-toast
- **Fix:** Added `useRef(false)` + early return pattern, matching DuplicatePrefillToast (08-13)
- **Files modified:** src/components/proposals/DeleteJustToast.tsx
- **Verification:** Pattern identical to existing component; typecheck + lint pass
- **Committed in:** 6865aed (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — double-invoke guard)
**Impact on plan:** Small correctness improvement. No scope creep.

## Verification Results

- `npm run typecheck` — exit 0
- `npm run lint:check` — exit 0 (0 warnings)
- `npm run check:no-vercel-imports` — OK
- `npm test` — 399 passed (0 regressions, same as Wave 6 baseline)
- `npm run build` — success; both `/api/proposals/[id]/delete` and `/api/proposals/[id]/restore` appear in build manifest

## Audit log confirmation

Both routes call `writeAuditLog()` only on `affected > 0` (i.e., the mutation actually landed). This means:
- Deleting an already-deleted proposal → 404, no audit_log row (D-18 obscurity)
- Restoring a non-deleted proposal → 404, no audit_log row
- Successful delete → `proposal.delete` row with `source: 'partner-detail-page'`
- Successful restore → `proposal.restore` row with `source: 'partner-detail-page'`

## D-18 Obscurity confirmation

`affected === 0` collapses: not found / not owned / already-deleted / outside-30d-window → same `404 { error: 'not_found' }`. No information leak about which case applies.

## Issues Encountered

None.

## Next Phase Readiness

- Phase 8 is now complete: all 14 plans shipped
- 08-14 (hard-purge CLI) already shipped (Wave 6); it shares the same schema and softDelete/restore helpers
- Phase 9 admin audit log viewer can now read `proposal.delete` and `proposal.restore` actions from audit_log

---
*Phase: 08-persistence-pdf-pipeline*
*Completed: 2026-05-09*
