---
phase: 8
plan: "08-03"
subsystem: db-queries
tags: [drizzle, queries, cursor-pagination, ilike-search, soft-delete, audit-log, server-only]
dependency_graph:
  requires:
    - "08-01: proposals + globalParams + auditLog Drizzle tables in src/db/schema.ts"
    - "05-04: db() singleton in src/lib/db/index.ts"
  provides:
    - "createProposal / finalizePdfBlobOnProposal / findByIdempotencyKey / getProposalById"
    - "listProposalsByUser (D-C1 cursor pagination)"
    - "searchProposals (D-C2 ILIKE on lcRef + inputs->>'clientCo')"
    - "softDeleteProposal / restoreProposal / hardPurgeProposal / listPurgeCandidates"
    - "writeAuditLog (DATA-07 audit trail)"
    - "getLatestGlobalParams / insertGlobalParams (DATA-06 seed/read)"
    - "encodeCursor / decodeCursor (base64url JSON tuple — D-C1 URL-stable)"
    - "@/lib/db/queries barrel re-exporting all symbols + types"
  affects:
    - "08-07: POST /api/proposals route (calls createProposal + findByIdempotencyKey + finalizePdfBlobOnProposal + writeAuditLog + getLatestGlobalParams)"
    - "08-08: GET /api/proposals list (calls listProposalsByUser + searchProposals)"
    - "08-10: proposal detail page (calls getProposalById)"
    - "08-11: home list page (calls listProposalsByUser + searchProposals)"
    - "08-12: delete/restore actions (calls softDeleteProposal + restoreProposal + writeAuditLog)"
    - "08-13: duplicate flow (calls createProposal + writeAuditLog)"
    - "08-14: hard purge CLI (calls hardPurgeProposal + listPurgeCandidates)"
tech_stack:
  added: []
  patterns:
    - "server-only guard on every query module (build-time client-bundle protection)"
    - "Drizzle db() singleton injection via first-call (matches Phase 5/6 pattern)"
    - "Cursor = base64url(JSON({createdAt: ISO8601, id: uuid})) — D-C1 URL-stable"
    - "Tuple cursor compare via raw sql template (Drizzle has no native row-tuple compare)"
    - "ILIKE search via ilike() + sql template for jsonb ->> extraction (D-C2)"
    - "Soft-delete ownership in WHERE clause (defence-in-depth alongside route-level requireUser)"
    - ".returning() no-arg on update chains (Drizzle 0.45.2 partial-returning type constraint)"
key_files:
  created:
    - src/lib/db/queries/proposals.ts
    - src/lib/db/queries/global-params.ts
    - src/lib/db/queries/audit-log.ts
    - src/lib/db/queries/index.ts
    - src/lib/db/queries/proposals.test.ts
    - src/lib/db/queries/global-params.test.ts
decisions:
  - "Cursor encoding: base64url JSON tuple {createdAt: ISO8601, id: uuid} — URL-safe, decodable without schema change"
  - ".returning() with no field selector on update chains — Drizzle 0.45.2 type constraint: PgUpdateBase after .set().where() only exposes the no-arg returning() overload at the type level; partial-field returning() triggers TS2554"
  - "ILIKE pattern wrapping (%q%) happens in helper code — user cannot escape LIKE special chars to widen the pattern beyond intent"
  - "findByIdempotencyKey includes soft-deleted rows — D-B1 tombstones must block duplicate INSERTs even after deletion; caller (Plan 08-07) surfaces row state"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-09T15:13:00Z"
  tasks_completed: 3
  files_modified: 6
---

# Phase 8 Plan 03: DB Queries Summary

**One-liner:** Typed Drizzle query helpers for proposals/globalParams/auditLog with base64url cursor pagination, ILIKE search, ownership-gated soft-delete/restore/purge, and 21 mock-driver Vitest tests.

## What Was Built

Created `src/lib/db/queries/` with 4 source files and 2 test files. Every Phase 8 caller can now import from the single `@/lib/db/queries` barrel instead of writing raw Drizzle SQL.

### Files Created

| File | Lines | Exports |
|------|-------|---------|
| `src/lib/db/queries/proposals.ts` | 308 | 11 functions + 6 types (Cursor, CreateProposalArgs, FinalizePdfArgs, ListProposalsArgs, SearchProposalsArgs, ListResult) |
| `src/lib/db/queries/global-params.ts` | 36 | getLatestGlobalParams, insertGlobalParams |
| `src/lib/db/queries/audit-log.ts` | 42 | writeAuditLog + AuditAction + AuditTargetType + WriteAuditLogArgs |
| `src/lib/db/queries/index.ts` | 34 | barrel re-exporting all of the above |
| `src/lib/db/queries/proposals.test.ts` | 182 | 18 tests |
| `src/lib/db/queries/global-params.test.ts` | 79 | 3 tests |

### Proposals Query Helpers

| Function | Purpose | Requirement |
|----------|---------|-------------|
| `createProposal` | INSERT row (PDF cols null) | PROP-02 |
| `finalizePdfBlobOnProposal` | UPDATE pdf_blob_key+sha256+size+generated_at | PROP-05, PROP-09 |
| `findByIdempotencyKey` | D-B2 idempotency check (includes tombstoned rows) | PROP-02 |
| `getProposalById` | Single-row fetch by id | PROP-20 |
| `listProposalsByUser` | D-C1 cursor pagination (active or 30d deleted window) | PROP-20, PROP-21 |
| `searchProposals` | D-C2 ILIKE on lcRef + inputs->>'clientCo' | PROP-22 |
| `softDeleteProposal` | Set deleted_at=now() WHERE id+userId+deleted_at IS NULL | PROP-22, DATA-08 |
| `restoreProposal` | Set deleted_at=NULL (30d window only) | PROP-22, DATA-08 |
| `hardPurgeProposal` | DELETE WHERE deleted_at < 30d ago; returns row for blob cleanup | DATA-08 |
| `listPurgeCandidates` | LIST WHERE deleted_at < 30d ago (CLI helper) | DATA-08 |
| `encodeCursor` / `decodeCursor` | base64url JSON tuple; decodeCursor returns null on malformed | DATA-06, DATA-07 |

### Guard Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npx eslint src/lib/db/queries/ --max-warnings=0` | ✅ 0 errors/warnings |
| `npm run lint:check` | ⚠ pre-existing warning (scripts/seed-admins-launch.ts:42 — out of scope, logged in deferred-items.md from Phase 6) |
| `npm run check:no-vercel-imports` | ✅ OK — no forbidden imports |
| `npm test` | ✅ 376/376 tests pass (+21 from 355 baseline) |
| `npm run build` | ✅ 0 errors — all 9 routes compile |

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | `89d478d` | feat(08-03): add proposals + global-params + audit-log query helpers + barrel index |
| Task 2 | `9ce8120` | test(08-03): mock-driver Vitest coverage for proposals + global-params query helpers |

## Deviations from Plan

### `.returning()` No-Arg on Update Chains

**Type:** [Rule 1 - Bug] Drizzle 0.45.2 type constraint on update returning
**Found during:** Task 1 (typecheck after writing softDeleteProposal/restoreProposal)
**Issue:** TS2554 "Expected 0 arguments, but got 1" on `.returning({ id: schema.proposals.id })`. After `.set().where()` on a `PgUpdateBase`, TypeScript only sees the no-arg `returning()` overload at that narrowed type. The partial-fields overload is present in the type declaration but not reachable from that chain state.
**Fix:** Changed both calls to `.returning()` (no args). Returns the full row; `result.length` still correctly counts affected rows. The only cost is a slightly larger result payload — acceptable since the result is only used for count.
**Files modified:** `src/lib/db/queries/proposals.ts`
**Commit:** `89d478d`

### No `paramsSnapshot as never` Cast (Used `as any` Instead)

**Type:** Minor Drizzle jsonb $type cast workaround
**Found during:** Task 1
**Issue:** Plan spec suggested `as never` for the jsonb `$type<>` cast on `paramsSnapshot` in `createProposal`. `as never` caused a TS error because `Record<string, unknown>` is not assignable to `never`. Used `as any` instead (with ESLint disable comment) which is the established escape hatch for Drizzle jsonb $type cast mismatches.
**Files modified:** `src/lib/db/queries/proposals.ts`
**Commit:** `89d478d`

## Plan 08-07 Usage Example

Plan 08-07 (POST /api/proposals) will call these helpers in this sequence:

```ts
import {
  findByIdempotencyKey, getLatestGlobalParams,
  createProposal, finalizePdfBlobOnProposal, writeAuditLog,
} from '@/lib/db/queries';

// 1. Idempotency check (D-B2)
const existing = await findByIdempotencyKey(userId, idempotencyKey);
if (existing) return Response.json({ id: existing.id }, { status: 200 });

// 2. Read global params snapshot (DATA-06)
const params = await getLatestGlobalParams();
if (!params) return new Response('No global params seeded', { status: 500 });

// 3. Insert proposal row
const row = await createProposal({
  userId, language, lcRef, idempotencyKey,
  schemaVersion: '1.0.0',
  inputs: validatedInputs,
  paramsSnapshot: { commissionPct: params.commissionPct, ... },
  computed: serverComputedValues,
});

// 4. Generate PDF (Plan 08-05) + upload blob (Plan 08-06)
const { blobKey, sha256, sizeBytes } = await generateAndUploadPdf(row);

// 5. Finalize PDF columns on the row
await finalizePdfBlobOnProposal({
  proposalId: row.id, pdfBlobKey: blobKey,
  pdfSha256: sha256, pdfSizeBytes: sizeBytes, pdfGeneratedAt: new Date(),
});

// 6. Write audit log (DATA-07)
await writeAuditLog({ actorId: userId, action: 'proposal.create', targetType: 'proposal', targetId: row.id });
```

## Known Stubs

None. This plan is query-layer only (no UI, no render). No stub patterns introduced.

## Threat Flags

No new network endpoints, auth paths, or file access patterns introduced. All query helpers are server-only imports; no new trust boundaries beyond those declared in the plan's threat model.

## Self-Check: PASSED

- [x] `src/lib/db/queries/proposals.ts` exists (308 lines, ≥200 min)
- [x] `src/lib/db/queries/global-params.ts` exists (36 lines, contains getLatestGlobalParams)
- [x] `src/lib/db/queries/audit-log.ts` exists (42 lines, contains writeAuditLog)
- [x] `src/lib/db/queries/index.ts` exists (34 lines, contains "export * from" pattern — actually named re-exports)
- [x] `src/lib/db/queries/proposals.test.ts` exists (182 lines, ≥120 min, contains describe('listProposalsByUser'))
- [x] `src/lib/db/queries/global-params.test.ts` exists (79 lines)
- [x] Commit `89d478d` exists in git log
- [x] Commit `9ce8120` exists in git log
- [x] 376 tests pass (21 new, 355 baseline preserved)
- [x] `npm run build` exits 0
- [x] No forbidden imports (no @vercel/blob, no direct driver imports)
