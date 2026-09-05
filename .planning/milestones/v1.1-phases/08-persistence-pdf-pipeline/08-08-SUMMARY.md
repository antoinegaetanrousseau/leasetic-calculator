---
phase: 8
plan: "08-08"
subsystem: stream-and-list-api
tags: [stream, blob, ownership-check, list-api, cursor, pdf, server-only]
dependency_graph:
  requires:
    - "08-03: listProposalsByUser / searchProposals / encodeCursor / decodeCursor / getProposalById"
    - "08-07: POST /api/proposals route.ts (additive — GET added alongside)"
  provides:
    - "GET /api/proposals/{id}/pdf — Node-runtime stream route (PROP-13)"
    - "GET /api/proposals — JSON list with cursor + search (PROP-05, PROP-20)"
    - "buildListResponse — shared server helper (Plan 08-11 SSR + route handler)"
    - "ProposalRowDto — minimal wire shape (no jsonb leaks)"
  affects:
    - "08-09: form submit wiring (uses pdfUrl from POST, now also GET /pdf confirmed)"
    - "08-10: proposal detail page (uses getProposalById + pdfUrl pattern)"
    - "08-11: home list page (calls buildListResponse server-side; Load More calls GET /api/proposals)"
tech_stack:
  added: []
  patterns:
    - "Node-runtime stream route: Buffer-as-body passed to new NextResponse(blob.body)"
    - "X-Content-SHA256 header exposes stored pdfSha256 for transport integrity (DATA-09)"
    - "404 obscurity for not-found AND not-owned (D-18) — never leaks row existence"
    - "410 for proposals soft-deleted past 30d window (hard-purgeable by 08-14)"
    - "buildListResponse: server-only helper shared by route handler + SSR server component"
    - "Cursor encode/decode round-trip via @/lib/db/queries barrel (single source)"
    - "DTO excludes paramsSnapshot/computed/inputs jsonb fields (ADMIN-09 commission invisibility)"
    - "Route-level limit clamp [1, 50] — T-08-08-04 DoS mitigation"
key_files:
  created:
    - app/api/proposals/[id]/pdf/route.ts
    - src/lib/api/proposals/list.ts
    - app/api/proposals/route-list.test.ts
  modified:
    - app/api/proposals/route.ts
    - vitest.config.ts
decisions:
  - "Buffer-as-body stream (not ReadableStream): Phase 8 PDFs are <100KB; in-memory Buffer acceptable. Phase 11+ can switch to signed-URL redirect if size grows."
  - "X-Content-SHA256 header (DATA-09): exposes stored pdfSha256 for client-side transport integrity verification without a separate endpoint"
  - "buildListResponse shared helper: called directly by Plan 08-11 SSR server component AND by GET /api/proposals route — avoids round-trip on SSR pass"
  - "vitest include extended to app/**/*.test.ts: existing config only covered src/; app/ test files were silently skipped (Rule 3 deviation)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-09T17:31:00Z"
  tasks_completed: 5
  files_modified: 5
---

# Phase 8 Plan 08: GET /api/proposals/{id}/pdf Stream + GET /api/proposals List Summary

**One-liner:** Node-runtime PDF stream route with ownership gate + X-Content-SHA256 header, plus JSON list endpoint with cursor pagination and ILIKE search, backed by a shared `buildListResponse` server helper.

## What Was Built

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `app/api/proposals/[id]/pdf/route.ts` | 70 | Node-runtime stream route; requireUser + ownership + 404/410 semantics; X-Content-SHA256 (DATA-09) |
| `src/lib/api/proposals/list.ts` | 79 | `buildListResponse` helper; `ProposalRowDto` wire shape; encodeCursor/decodeCursor round-trip |
| `app/api/proposals/route-list.test.ts` | 100 | 6 mock-driver Vitest tests for buildListResponse |

### Files Modified

| File | Change |
|------|--------|
| `app/api/proposals/route.ts` | Added `import buildListResponse` + `export async function GET` (POST preserved; 63 → 94 lines) |
| `vitest.config.ts` | Extended `include` to cover `app/**/*.test.ts` + `app/**/*.test.tsx` |

### Route Map (from `npm run build`)

```
Route (app)
├ ƒ /api/proposals
├ ƒ /api/proposals/[id]/pdf
```

Both routes in route table. `/api/proposals` exports GET + POST.

### PDF Stream Route — Failure Mode Matrix

| Condition | Status | Body |
|-----------|--------|------|
| No session | 401 | `{ error: "unauthorized" }` |
| Proposal not found | 404 | `{ error: "not_found" }` |
| Proposal owned by different user | 404 | `{ error: "not_found" }` (D-18 obscurity) |
| `deletedAt > 30d ago` | 410 | `{ error: "gone" }` |
| `pdfBlobKey` is null | 404 | `{ error: "not_found" }` |
| Storage adapter failure | 502 | `{ error: "storage_unavailable" }` |
| Success | 200 | PDF bytes; headers below |

### PDF Stream — Response Headers (on success)

```
Content-Type: application/pdf
Content-Length: {blob.size}
Content-Disposition: inline; filename="Leasetic_Proposition_{lcRef}.pdf"
Cache-Control: private, max-age=0, no-store
X-Content-SHA256: {proposal.pdfSha256}   ← DATA-09 transport integrity
```

### ProposalRowDto Wire Shape

```ts
{
  id: string;
  lcRef: string;
  clientCo: string;        // inputs.clientCo (safe field from jsonb)
  amountHT: string;        // inputs.amountHT (safe field from jsonb)
  createdAt: string;       // ISO 8601
  validityDays: 15|30|60;
  language: "fr"|"en";
  deletedAt: string|null;
}
```

**Excluded:** `paramsSnapshot`, `computed`, `inputs` (full jsonb), `idempotencyKey`, `schemaVersion`, `pdfBlobKey`, `pdfSha256`, `pdfSizeBytes`, `pdfGeneratedAt`, `duplicatedFromId` — none needed by the list row UI (ADMIN-09 commission invisibility).

## Test Results

| Test | Coverage |
|------|----------|
| `returns rows + hasMore + nextCursor for empty q` | DTO mapping, hasMore/nextCursor null |
| `routes to searchProposals when q is non-empty` | Non-empty q → searchProposals |
| `routes to listProposalsByUser when q is whitespace` | Whitespace q trimmed → listProposalsByUser |
| `clamps limit to [1, 50]` | buildListResponse passes limit through faithfully |
| `encodes nextCursor when query reports hasMore` | Cursor is base64url string |
| `serializes deletedAt to ISO when present` | deletedAt → ISO 8601 string |

**Test count delta:** 393 → 399 (+6 new tests)

## Guards Passed

| Check | Result |
|-------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint:check` | 0 errors (pre-existing warning in scripts/ out of scope) |
| `npm run check:no-vercel-imports` | OK — storage adapter discipline preserved |
| `npm test` | 399/399 pass (+6 from 393 baseline) |
| `npm run build` | 0 errors — both routes in table |

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | `3d4c9d5` | feat(08-08): GET /api/proposals/[id]/pdf stream route (PROP-13, DATA-09) |
| Task 2 | `cab7f0b` | feat(08-08): buildListResponse helper — ProposalRowDto wire shape (PROP-05/20) |
| Task 3 | `554d607` | feat(08-08): GET /api/proposals list endpoint (PROP-05, PROP-20) |
| Task 4 | `5b46dd5` | test(08-08): buildListResponse mock-driver Vitest tests + extend vitest include to app/ |

## Deviations from Plan

### [Rule 3 - Blocking Issue] vitest.config.ts include did not cover app/

**Found during:** Task 4
**Issue:** The vitest `include` array only had `src/**/*.test.ts` and `__pdf-fixtures__/**/*.test.ts`. The plan specified placing the test file at `app/api/proposals/route-list.test.ts` "for proximity", but the test file was silently skipped — 393 tests after npm test, not 399.
**Fix:** Extended `vitest.config.ts` include to also cover `app/**/*.test.ts` and `app/**/*.test.tsx` so all future app/ test files are discovered automatically.
**Files modified:** `vitest.config.ts`
**Commit:** `5b46dd5`

## Known Stubs

None. Both endpoints wire to real query helpers and storage adapter. No placeholder data.

## Threat Surface Scan

New network endpoints added: `GET /api/proposals` and `GET /api/proposals/{id}/pdf`. Both were declared in the plan's threat model (T-08-08-01 through T-08-08-08). No undeclared new surface.

| Threat | Mitigation Applied |
|--------|--------------------|
| T-08-08-01 | All "no access" cases (not-found + not-owned) return 404 |
| T-08-08-02 | `Cache-Control: private, max-age=0, no-store` set on stream route and list endpoint |
| T-08-08-03 | DTO includes only 8 safe fields; paramsSnapshot.commissionPct excluded |
| T-08-08-04 | Route handler clamps limit to [1, 50] before passing to buildListResponse |
| T-08-08-05 | Cursor leakage accepted; user_id WHERE clause still filters correctly |

## Self-Check: PASSED

- [x] `app/api/proposals/[id]/pdf/route.ts` exists (70 lines, exports GET, runtime nodejs)
- [x] `src/lib/api/proposals/list.ts` exists (79 lines, exports buildListResponse + ProposalRowDto)
- [x] `app/api/proposals/route-list.test.ts` exists (100 lines, 6 tests)
- [x] `app/api/proposals/route.ts` exports BOTH GET and POST
- [x] `vitest.config.ts` includes app/**/*.test.ts
- [x] Commit `3d4c9d5` exists in git log
- [x] Commit `cab7f0b` exists in git log
- [x] Commit `554d607` exists in git log
- [x] Commit `5b46dd5` exists in git log
- [x] 399 tests pass (393 + 6 new)
- [x] `npm run build` exits 0 with both routes in table
- [x] X-Content-SHA256 header set from `proposal.pdfSha256` (DATA-09)
- [x] DTO does NOT expose paramsSnapshot or computed
