---
phase: 08-persistence-pdf-pipeline
plan: "08-09"
subsystem: form-submit-wiring
tags: [react-hook-form, sonner, idempotency, fetch, server-component, next-navigation]

dependency_graph:
  requires:
    - "08-02: proposal.toast.submit.* i18n keys (loading, success, error)"
    - "08-07: POST /api/proposals route + SubmitErrorCode — the endpoint being called"
  provides:
    - "Real ProposalForm.onSubmit: fetch POST /api/proposals with Idempotency-Key header"
    - "Server-side freshness probe in page.tsx (getLatestGlobalParams → coefficientsExpired)"
  affects:
    - "08-10: destination of router.push('/proposals/${id}') redirect"

tech-stack:
  added: []
  patterns:
    - "D-B2 idempotency: useState lazy-init via crypto.randomUUID() — stable across re-renders, reset on unmount"
    - "D-B3 sonner.promise: loading → success (lcRef display + redirect) → error (bounded code)"
    - "PROP-10 post-redirect-get: router.push inside promise success callback"
    - "D-7-12 freshness probe: getLatestGlobalParams() === null → coefficientsExpired = true"

key-files:
  created: []
  modified:
    - src/components/proposal/ProposalForm.tsx
    - app/(authed)/proposals/new/page.tsx

key-decisions:
  - "proposal.toast.phase8.placeholder key left in dictionaries.ts — no consumer remains in ProposalForm.tsx; kept per plan guidance (low cost, future cleanup)"
  - "coefficientsExpired semantics remain binary: params === null = stale (seed absent); Phase 9 admin-edit adds richer freshness threshold (effective_from age)"
  - "Error toast uses generic copy (proposal.toast.submit.error) — bounded SubmitErrorCode stays in DevTools Network tab only, not surfaced to user (T-08-09-03 mitigation)"

metrics:
  duration_minutes: 8
  completed: "2026-05-09"
  tasks_completed: 3
  files_modified: 2
  lines_added: 65
  lines_removed: 18
  tests_added: 0
  tests_total: 399

requirements-completed:
  - PROP-09
  - PROP-10
---

# Phase 8 Plan 09: Form Submit Wiring Summary

Replaced Phase 7's no-op `onSubmit` with a real `fetch POST /api/proposals`, wrapped in `sonner.promise`, with `useState(() => crypto.randomUUID())` idempotency key and `router.push('/proposals/${id}')` on success; also wired the server-side freshness probe replacing the `coefficientsExpired={false}` stub.

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-09
- **Completed:** 2026-05-09
- **Tasks:** 3/3
- **Files modified:** 2

## Accomplishments

- Wired real `onSubmit` in `ProposalForm.tsx`: `fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(data) })`
- `idempotencyKey` generated once per form mount via `useState<string>(() => crypto.randomUUID())` — persists across re-renders, double-clicks, and browser-back-then-resubmit
- `toast.promise(...)` wraps the fetch with `proposal.toast.submit.loading` / `proposal.toast.submit.success` / `proposal.toast.submit.error` keys (08-02 bilingual copy)
- On success: `router.push('/proposals/${result.id}')` called inside promise success callback (PROP-10 post-redirect-get)
- On error: bounded `SubmitErrorCode` extracted from `json.error` field; generic French/English error toast shown (T-08-09-03 minimum-leak pattern)
- Replaced hardcoded `coefficientsExpired={false}` stub in `page.tsx` with `await getLatestGlobalParams()` + `params === null` binary check (D-7-12 → Phase 8 wiring)
- `npm run typecheck`, `npm run lint:check`, `npm run check:no-vercel-imports`, `npm test` (399/399), `npm run build` all exit 0
- Test count unchanged at 399 (no regressions; this plan adds no new tests — form's onSubmit is fetch-orchestration; E2E tests are v1.2 scope per REQUIREMENTS.md)

## Task Commits

1. **Task 1: Wire ProposalForm.onSubmit** — `3d14da2` (feat) — `src/components/proposal/ProposalForm.tsx`
2. **Task 2: Server-side freshness probe in page.tsx** — `872bcfc` (feat) — `app/(authed)/proposals/new/page.tsx`
3. **Task 3: Final guard + smoke** — covered by commits above; all guards passed

## Files Modified

| File | Lines added | Lines removed | Net |
|------|-------------|---------------|-----|
| `src/components/proposal/ProposalForm.tsx` | +53 | -14 | +39 |
| `app/(authed)/proposals/new/page.tsx` | +12 | -4 | +8 |

## Idempotency Key

`[idempotencyKey]` is initialized via `useState<string>(() => crypto.randomUUID())`:

- Generated exactly once per form mount (lazy init runs on mount only)
- Persists across re-renders within the form lifetime — double-click collapses to same proposal
- Regenerated on form unmount / page re-navigation (component teardown)
- Same key on retry after network error: server's `(user_id, idempotency_key)` unique index returns existing row (D-B2 short-circuit)

## proposal.toast.phase8.placeholder Key

**Kept** in `dictionaries.ts` (no consumer remains in `ProposalForm.tsx` after this plan). Per plan spec: low cost, no harm, future cleanup if dictionary bloat becomes a concern.

## Freshness Probe

**Implemented.** `page.tsx` now calls `await getLatestGlobalParams()` server-side on every navigation (page is `force-dynamic`). `coefficientsExpired = params === null` — binary check: stale only when seed migration hasn't been applied. Phase 9 admin-edit will add richer semantics (e.g., `effective_from` age threshold).

## Manual Smoke

Not executed (no gating requirement). The destination route `/proposals/${id}` is the subject of Plan 08-10 (Wave 5); before 08-10 ships, the redirect would 404. Smoke verification is deferred to 08-10's integration test.

## Deviations from Plan

None — plan executed exactly as written. All 3 tasks completed per spec.

## Known Stubs

None — the form's submit is now fully wired. The only pending item is the destination route `/proposals/${id}` which Plan 08-10 will implement.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The two `fetch` call patterns (POST body + Idempotency-Key header) were already in the threat model (T-08-09-01 through T-08-09-05).

## Self-Check

- `3d14da2` present in git log: confirmed
- `872bcfc` present in git log: confirmed
- `src/components/proposal/ProposalForm.tsx` modified: confirmed
- `app/(authed)/proposals/new/page.tsx` modified: confirmed
- `useState(() => crypto.randomUUID())` in ProposalForm.tsx: confirmed (grep count 1)
- `Idempotency-Key` header in ProposalForm.tsx: confirmed (grep count 1)
- `toast.promise` in ProposalForm.tsx: confirmed
- `router.push` in ProposalForm.tsx: confirmed
- `coefficientsExpired={false}` gone from page.tsx: confirmed (grep count 0)
- `getLatestGlobalParams` in page.tsx: confirmed (grep count 3 — import + call + type)
- `npm run typecheck` exits 0: confirmed
- `npm run lint:check` exits 0: confirmed
- `npm test` 399/399: confirmed
- `npm run build` succeeds: confirmed

## Self-Check: PASSED

---
*Phase: 08-persistence-pdf-pipeline*
*Completed: 2026-05-09*
