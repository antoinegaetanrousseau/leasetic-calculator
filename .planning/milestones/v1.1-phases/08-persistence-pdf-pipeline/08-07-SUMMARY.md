---
phase: 8
plan: "08-07"
subsystem: api-route
tags: [route-handler, server, idempotency, snapshot, fail-loud, pdf, blob-storage]
dependency_graph:
  requires:
    - "08-01: proposals table (INSERT target)"
    - "08-03: createProposal / findByIdempotencyKey / finalizePdfBlobOnProposal / softDeleteProposal / writeAuditLog / getLatestGlobalParams"
    - "08-04: global_params seed row (getLatestGlobalParams must return non-null)"
    - "08-05: renderProposalPdf({ data }) → { buffer, sha256, contentHash, sizeBytes }"
  provides:
    - "POST /api/proposals — the create-proposal route"
    - "submitProposal() orchestrator — testable without HTTP harness"
    - "SubmitError + SubmitErrorCode — bounded client-facing error codes"
  affects:
    - "08-08: GET /api/proposals/{id}/pdf (reads pdf_blob_key written here)"
    - "08-09: form submit wiring (calls this route on Generate)"
    - "08-10: proposal detail page (reads the row created here)"
tech_stack:
  added: []
  patterns:
    - "D-B1 fail-loud: INSERT → TRY(render+upload+finalize) CATCH(tombstone+audit+500)"
    - "D-B2 idempotency: (user_id, idempotency_key) unique index short-circuits duplicate requests"
    - "CALC-07: server-side recompute via computeLoyer (snapshot params injected)"
    - "DATA-09: sha256 = raw buffer hash (not contentHash) stored on proposals row"
    - "PROP-23 snapshot immutability: paramsSnapshot written at INSERT time, never updated"
key_files:
  created:
    - src/lib/api/proposals/errors.ts
    - src/lib/api/proposals/submit.ts
    - src/lib/api/proposals/submit.test.ts
    - app/api/proposals/route.ts
  modified: []
decisions:
  - "Server-side computeLoyer uses snapshot coefficients from global_params at submit time (not seedParams defaults) — ensures server-recompute and stored snapshot are consistent"
  - "paramsSnapshot stores {commissionPct, maxAmount, validityDays, coefficients} — full coefficients table included for complete audit trail"
  - "D-B1 error classification: StorageError name pattern → pdf_upload_failed; 'finalize' message → finalize_failed; all others → pdf_render_failed"
  - "Tombstone-on-failure honors the (user_id, idempotency_key) non-partial unique index — same key cannot be reused after failure (T-08-07-06 accepted risk; client regenerates UUID on form remount)"
  - "Idempotency returns existing row for ALL states (including tombstoned) — consistent with findByIdempotencyKey including soft-deleted rows (08-03 decision)"
metrics:
  duration_minutes: 25
  completed: "2026-05-09"
  tasks_completed: 4
  files_created: 4
  files_modified: 0
  tests_added: 9
  tests_total: 393
---

# Phase 8 Plan 07: POST /api/proposals Route Summary

Single-sentence: Node-runtime `POST /api/proposals` with UUIDv4 idempotency gate, server-side `computeLoyer` recompute using snapshot global params, D-B1 fail-loud tombstone-on-failure, and 9 mock-driver Vitest tests covering happy path, idempotency hit, seed-not-applied, and two D-B1 failure modes.

## What Was Built

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/api/proposals/errors.ts` | 34 | `SubmitErrorCode` type (8 codes) + `SubmitError` class + `errorHttpStatus` map |
| `src/lib/api/proposals/submit.ts` | 283 | `submitProposal()` orchestrator — the full D-B1/D-B2 create flow |
| `src/lib/api/proposals/submit.test.ts` | 194 | 9 mock-driver Vitest tests |
| `app/api/proposals/route.ts` | 63 | Node-runtime POST handler (thin HTTP adapter) |

### Request/Response Cycle

```bash
# Happy path
curl -X POST https://leasetic.vercel.app/api/proposals \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 11111111-2222-4333-9444-555555555555" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "partnerCo": "Memento IT",
    "partnerName": "Antoine Rousseau",
    "clientCo": "Société Cliente Alpha",
    "amountHT": "75000",
    "durationMonths": 48,
    "validityDays": 30
  }'
# → 200 { "id": "b3a2f1...", "pdfUrl": "/api/proposals/b3a2f1.../pdf", "idempotent": false }

# Idempotency hit (same key, same user, any subsequent call)
# → 200 { "id": "b3a2f1...", "pdfUrl": "/api/proposals/b3a2f1.../pdf", "idempotent": true }

# Missing idempotency key
# → 400 { "error": "invalid_idempotency_key" }

# Invalid body
# → 400 { "error": "invalid_body" }

# No session
# → 401 { "error": "unauthorized" }

# Seed not applied
# → 503 { "error": "seed_not_applied" }

# PDF render / blob upload failure after INSERT
# → 500 { "error": "pdf_render_failed" | "pdf_upload_failed" | "finalize_failed" }
#   (row tombstoned via softDeleteProposal; audit_log entry with action='proposal.create_failed')
```

### submitProposal() Flow (D-B1 + D-B2)

```
1. Validate idempotencyKey shape (UUIDv4 regex) → 400 if invalid
2. proposalInputSchema.safeParse(body)           → 400 if invalid
3. findByIdempotencyKey(userId, key)             → return existing if found (idempotent: true)
4. getLatestGlobalParams()                       → 503 if null (seed required)
5. Build paramsSnapshot = {commissionPct, maxAmount, validityDays, coefficients}
6. computeLoyer with snapshot params             → server-side authoritative recompute (CALC-07)
7. createProposal(...)                           → INSERT row (pdf cols null)
8. TRY:
     a. renderProposalPdf({ data })              → { buffer, sha256, sizeBytes }
     b. storage().put(`proposals/{uid}/{id}.pdf`)
     c. finalizePdfBlobOnProposal(...)           → UPDATE row with sha256 + blobKey + size
     d. writeAuditLog('proposal.create')
   CATCH:
     - softDeleteProposal(row.id, userId)        → tombstone
     - writeAuditLog('proposal.create_failed')
     - throw SubmitError(errorCode, 500)
9. return { id, pdfUrl, idempotent: false }
```

### Key Implementation Detail: paramsSnapshot vs computeLoyer

The server-side recompute passes snapshot coefficients/commissionPct/maxAmount to `computeLoyer()` so the stored `computed` field is guaranteed to be derived from the same params as `paramsSnapshot`. This ensures the PDF and the DB row are consistent for any given global_params version.

### DATA-09: sha256 vs contentHash

`renderProposalPdf()` returns both `sha256` (raw buffer hash) and `contentHash` (order-invariant determinism hash for CI gate — Plan 08-06). Plan 08-07 stores **only `sha256`** in `proposals.pdf_sha256`. This is the transport integrity value — it verifies the blob in storage matches what was generated. `contentHash` is CI-only and never stored.

### Unique Index Non-Partial Trade-off (T-08-07-06)

`proposals_user_id_idempotency_key_uq` is **not** filtered `WHERE deleted_at IS NULL`. Tombstoned rows (D-B1 failures) block re-use of the same idempotency key. This is **intentional for v1.1**:

- Client generates a new UUIDv4 on form remount (`useState(() => crypto.randomUUID())`)
- Prevents retry loops from accumulating orphan rows (same key collapses to existing tombstone)
- Accepted risk: client must know to show a retry UI with a fresh key

A v1.2 option: make the index partial (`WHERE deleted_at IS NULL`), which would allow the same key to be retried after a failure. Not needed at current partner-proposal scale.

## Test Results

| Test | Coverage |
|------|----------|
| `rejects invalid idempotency key` | 400 on non-UUID string |
| `rejects missing idempotency key` | 400 on empty string |
| `rejects invalid body via Zod` | 400 on shape mismatch |
| `rejects missing required clientCo` | 400 on required field empty |
| `returns existing row on idempotency hit` | D-B2: no re-render, idempotent: true |
| `returns 503 when seed not applied` | getLatestGlobalParams() → null |
| `full happy-path` | INSERT → render → upload → finalize → audit; sha256 verified |
| `D-B1 fail-loud: render failure` | tombstone + proposal.create_failed audit |
| `D-B1 fail-loud: storage failure` | StorageAuthError → pdf_upload_failed + tombstone |

**Test count delta:** 384 → 393 (+9)

## Guards Passed

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint:check` | ✅ 0 errors (pre-existing warning in scripts/ out of scope) |
| `npm run check:no-vercel-imports` | ✅ OK — storage adapter discipline preserved |
| `npm run check:no-drizzle-push` | ✅ OK |
| `npm run check:seed-sql` | ✅ OK |
| `npm test` | ✅ 393/393 pass |
| `npm run build` | ✅ `/api/proposals` appears in route table |

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | `ea9ad4d` | feat(08-07): error codes module + submitProposal orchestrator (D-B1/D-B2 flow) |
| Task 2 | `d8598a7` | feat(08-07): POST /api/proposals Node-runtime route handler |
| Task 3 | `b9d2c32` | test(08-07): mock-driver Vitest coverage for submitProposal orchestrator |

## Deviations from Plan

### Refinement: computeLoyer receives snapshot params

**Type:** [Rule 2 - Missing critical functionality] Snapshot consistency
**Found during:** Task 1
**Issue:** The plan's orchestrator skeleton called `computeLoyer` before `getLatestGlobalParams()`, passing no explicit coefficients. This means the server-side recompute would use hardcoded `seedParams.coefficients` while the stored `paramsSnapshot` would contain the live global_params row — a mismatch if an admin has updated coefficients.
**Fix:** Moved `getLatestGlobalParams()` call to happen before `computeLoyer`, then passed `params.coefficients`, `parseNumeric(params.commissionPct)`, and `parseNumeric(params.maxAmount)` to `computeLoyer()`. The stored `computed` field and `paramsSnapshot` are now derived from the same global_params row.
**Files modified:** `src/lib/api/proposals/submit.ts`
**Commit:** `ea9ad4d`

### Test count: +9 instead of +7

**Type:** Expected expansion
**Found during:** Task 3
**Issue:** Added 2 extra boundary tests (missing idempotency key as empty string, and missing required `clientCo`) beyond the plan's 7 specified tests for better coverage.
**Impact:** None — 9 > 7 minimum; all pass.

## Known Stubs

None — this plan wires the complete create flow. No placeholder data, no hardcoded values in the render path.

## Threat Surface Scan

New network endpoint added: `POST /api/proposals`. This was declared in the plan's threat model (T-08-07-01 through T-08-07-08). No undeclared new surface.

| Threat | Mitigation |
|--------|------------|
| T-08-07-01 | Client `computed` field ignored; server always recomputes via `computeLoyer` |
| T-08-07-02 | (user_id, idempotency_key) unique index + idempotency cache |
| T-08-07-03 | Only `{ error: code }` returned; server logs full error |
| T-08-07-04 | `requireUser()` rejects unauth before any work |
| T-08-07-05 | `duplicatedFromId` is informational only (Plan 08-13 hardens) |
| T-08-07-06 | Non-partial index accepted; client generates fresh UUID on remount |
| T-08-07-07 | `console.error` is server-only (Vercel admin logs) |
| T-08-07-08 | `language` comes from session cookie, not body |

## Self-Check: PASSED

- [x] `app/api/proposals/route.ts` exists (63 lines, exports POST, runtime nodejs, force-dynamic)
- [x] `src/lib/api/proposals/submit.ts` exists (283 lines ≥ 200 min, contains submitProposal)
- [x] `src/lib/api/proposals/errors.ts` exists (34 lines, contains type SubmitErrorCode)
- [x] `src/lib/api/proposals/submit.test.ts` exists (194 lines ≥ 120 min, contains describe('submitProposal'))
- [x] Commit `ea9ad4d` exists in git log
- [x] Commit `d8598a7` exists in git log
- [x] Commit `b9d2c32` exists in git log
- [x] 393 tests pass (384 + 9 new)
- [x] `npm run build` exits 0 with `/api/proposals` in route table
- [x] Storage adapter discipline preserved (no @vercel/blob import outside lib/storage)
