---
phase: 05-bootstrap-deploy
plan: "03"
subsystem: storage
tags: [storage-adapter, vercel-blob, s3, vitest, tdd, ovh-portability, private-storage]
dependency_graph:
  requires:
    - phase: 05-01
      provides: src/lib/storage/.gitkeep skeleton + @/* path alias + package.json base
  provides:
    - StorageAdapter interface (5 methods: put, get, head, delete, signedUrl)
    - VercelBlobStorage driver (full implementation wrapping @vercel/blob@0.27.3)
    - S3Storage driver (full implementation wrapping @aws-sdk/client-s3@3.700.0 + presigner)
    - getStorage() factory selecting driver via STORAGE_DRIVER env var
    - storage() memoized singleton
    - Vitest 2.1.8 test runner configured with @/* alias
    - 13 passing unit tests across 3 test files
  affects: [05-05, 05-07, phase-8, phase-10]
tech-stack:
  added:
    - "vitest@2.1.8 (dev, exact pin)"
    - "@vercel/blob@0.27.3 (exact pin)"
    - "@aws-sdk/client-s3@3.700.0 (exact pin)"
    - "@aws-sdk/s3-request-presigner@3.700.0 (exact pin)"
  patterns:
    - "StorageAdapter interface — single import surface, all consumers use @/lib/storage"
    - "STORAGE_DRIVER=vercel|s3 env var for driver selection at runtime"
    - "Private-by-default via proxy architecture (Vercel Blob: unguessable keys + proxy; S3: ACL:private)"
    - "Typed error hierarchy (StorageError > StorageNotFoundError / StorageAuthError)"
    - "Static ESM imports in factory (not dynamic require — ESM-compatible for Vitest)"
    - "forcePathStyle: true in S3Client (OVH Object Storage compatibility)"
    - "MAX_SIGNED_URL_TTL_SECONDS = 3600 enforced in both drivers"
    - "DEFAULT_CACHE_CONTROL = 'private, max-age=0, no-store' applied to S3 puts"

key-files:
  created:
    - src/lib/storage/adapter.ts
    - src/lib/storage/errors.ts
    - src/lib/storage/index.ts
    - src/lib/storage/index.test.ts
    - src/lib/storage/vercel-blob.ts
    - src/lib/storage/vercel-blob.test.ts
    - src/lib/storage/s3.ts
    - src/lib/storage/s3.test.ts
    - vitest.config.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Static ESM imports in index.ts instead of require() — Vitest ESM context rejects dynamic require(); both drivers imported at module load, factory selects at runtime"
  - "Vercel Blob public+proxy architecture for v1.1: access:'public' on put() with cacheControlMaxAge:0; raw blob URLs never exposed; all PDF reads proxy through /api/proposals/{id}/pdf with auth+ownership check (PITFALLS §5.2)"
  - "Buffer.from(Uint8Array) coercion before @vercel/blob put() — PutBody type accepts Buffer but not bare Uint8Array in @vercel/blob@0.27.3"
  - "S3Storage exports directly from index.ts (re-exported) alongside VercelBlobStorage — enables instanceof checks in selector tests without dynamic imports"

requirements-completed: [BOOT-04, BOOT-05]

duration: 5min
completed: "2026-05-06"
---

# Phase 5 Plan 03: Storage Adapter Spine Summary

**OVH-portable lib/storage adapter with VercelBlobStorage and S3Storage drivers (5 methods each, full implementations), STORAGE_DRIVER selector factory, typed error hierarchy, and 13 passing Vitest tests confirming driver selection, error classification, and TTL enforcement.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-06T11:41:27Z
- **Completed:** 2026-05-06T11:47:00Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files created:** 9
- **Files modified:** 2

## Accomplishments

- `StorageAdapter` interface with 5 methods (put, get, head, delete, signedUrl) + `StorageObject`, `PutOptions`, `DEFAULT_CACHE_CONTROL`, `MAX_SIGNED_URL_TTL_SECONDS` constants locked the OVH-portability seam
- `VercelBlobStorage` full implementation: put() with cacheControlMaxAge:0, get() via list()+fetch proxy, head() via list(), delete() idempotent, signedUrl() with TTL guard; StorageAuthError on missing token
- `S3Storage` full implementation: S3Client with forcePathStyle:true (OVH), ACL:'private' on PutObjectCommand, getSignedUrl from @aws-sdk/s3-request-presigner, typed error discrimination via $metadata.httpStatusCode, constructor validates all 5 S3_* env vars
- Vitest 2.1.8 installed and configured; `npm test` and `npm run test:watch` scripts added; 13 tests passing across 3 files
- Zero @vercel/blob / @aws-sdk imports outside src/lib/storage/ (portability invariant confirmed)

## Installed Versions (Actual — No Carets)

| Package | Planned Pin | Installed |
|---------|------------|-----------|
| vitest | 2.1.8 | 2.1.8 |
| @vercel/blob | 0.27.3 | 0.27.3 |
| @aws-sdk/client-s3 | 3.700.0 | 3.700.0 |
| @aws-sdk/s3-request-presigner | 3.700.0 | 3.700.0 |

All planned pins matched registry exactly.

## Task Commits

| Task | Name | Commit | Type |
|------|------|--------|------|
| 1 | StorageAdapter contract + errors + factory + Vitest RED phase | 2b5af73 | test |
| 2 | Implement VercelBlobStorage + S3Storage drivers — TDD GREEN | c134955 | feat |
| docs | SUMMARY + STATE + ROADMAP + REQUIREMENTS | (below) | docs |

## Files Created/Modified

- `src/lib/storage/adapter.ts` — StorageAdapter interface, StorageObject, PutOptions, DEFAULT_CACHE_CONTROL, MAX_SIGNED_URL_TTL_SECONDS
- `src/lib/storage/errors.ts` — StorageError, StorageNotFoundError, StorageAuthError typed hierarchy
- `src/lib/storage/index.ts` — getStorage() factory (STORAGE_DRIVER selector), memoized storage() singleton, __resetStorageForTests()
- `src/lib/storage/index.test.ts` — 6 tests: 4 driver-selector tests + 2 error-hierarchy tests
- `src/lib/storage/vercel-blob.ts` — VercelBlobStorage full implementation (put/get/head/delete/signedUrl)
- `src/lib/storage/vercel-blob.test.ts` — 3 tests: missing token throws StorageAuthError, success construction, TTL guard
- `src/lib/storage/s3.ts` — S3Storage full implementation (put/get/head/delete/signedUrl)
- `src/lib/storage/s3.test.ts` — 4 tests: missing vars, partial missing, success, TTL guard
- `vitest.config.ts` — node environment, @/* alias, src/**/*.test.ts glob
- `package.json` — added test/test:watch scripts + 4 new exact-pinned dependencies

## Test Results

```
✓ src/lib/storage/vercel-blob.test.ts (3 tests) 2ms
✓ src/lib/storage/s3.test.ts (4 tests) 6ms
✓ src/lib/storage/index.test.ts (6 tests) 6ms

Test Files  3 passed (3)
     Tests  13 passed (13)
  Duration  357ms
```

## OVH Portability Check

```bash
# Zero @vercel/blob or @aws-sdk imports outside src/lib/storage/
grep -rE "@(vercel/blob|aws-sdk)" --include="*.ts" --include="*.tsx" src app \
  | grep -v "src/lib/storage/" | wc -l
# → 0
```

The portability seam is clean. Plan 05-07's CI grep gate (PITFALLS §6.1) will enforce this going forward.

## PITFALLS Coverage

| Pitfall | Status | Implementation |
|---------|--------|----------------|
| §5.1 put() ≠ PutObject API surface | Mitigated | StorageAdapter.put() abstracts both; callers never see provider SDK |
| §5.2 Private-only access | Mitigated | Vercel: unguessable keys + proxy architecture; S3: ACL:'private' |
| §5.3 Partner key prefix isolation | Documented | Interface accepts any key; Phase 8 enforces `proposals/{userId}/{id}.pdf` prefix from authed session |
| §5.4 Cache-Control on signed URLs | Mitigated | DEFAULT_CACHE_CONTROL='private, max-age=0, no-store' on S3 puts; cacheControlMaxAge:0 on Vercel puts |
| §6.1 Vercel-only primitives leak | Mitigated | Zero leaks confirmed; Plan 05-05 CI grep gate enforces ongoing |

## Decisions Made

1. **Static ESM imports instead of dynamic require()** — Plan called for `require('./vercel-blob')` for "lazy-import driver isolation". RED phase revealed Vitest ESM context doesn't resolve `require()` for adjacent .ts modules. Fix: static imports at module top. Both SDKs are imported at module load; factory instantiates only the selected driver. This is correct for Next.js server (Node runtime) and doesn't meaningfully affect bundle optimization since the app server always needs the installed driver.

2. **Vercel Blob proxy architecture** — @vercel/blob 0.27.3 has no stable `access: 'private'` option. Per PITFALLS §5.2: using `access: 'public'` with unguessable keys + application proxy. All PDF reads route through `/api/proposals/{id}/pdf` (Phase 8) which reads server-side via `storage.get()` and re-streams with auth+ownership checks. Raw blob URLs never exposed to clients.

3. **Buffer coercion for Vercel Blob put()** — `@vercel/blob@0.27.3`'s `PutBody` type accepts `Buffer | File | ArrayBuffer` but not bare `Uint8Array`. The put() method coerces via `Buffer.from(body)` before passing to the SDK.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Switched from require() to static ESM imports in index.ts**
- **Found during:** Task 1 RED phase test run
- **Issue:** Plan called for `require('./vercel-blob')` and `require('./s3')` in getStorage(). Vitest ESM context cannot resolve `require()` for adjacent TypeScript modules — tests failed with `Cannot find module './vercel-blob'` at the `require()` call site.
- **Fix:** Changed index.ts to use top-level static imports: `import { VercelBlobStorage } from './vercel-blob'` and `import { S3Storage } from './s3'`. Factory function instantiates the selected class synchronously. Re-exported both classes from index.ts for the instanceof checks in tests.
- **Files modified:** src/lib/storage/index.ts, src/lib/storage/index.test.ts (removed dynamic `await import()` in favor of direct imports from index)
- **Verification:** All 13 tests pass, typecheck exits 0, build exits 0
- **Committed in:** c134955 (Task 2 commit)

**2. [Rule 1 - Bug] Added Buffer coercion in VercelBlobStorage.put()**
- **Found during:** Task 2 typecheck
- **Issue:** TypeScript error TS2345: `Uint8Array` is not assignable to `PutBody` in @vercel/blob@0.27.3. StorageAdapter.put() accepts `Buffer | Uint8Array`; Vercel Blob's SDK only accepts `Buffer | File | ArrayBuffer`.
- **Fix:** Added `const bodyBuf = Buffer.isBuffer(body) ? body : Buffer.from(body)` before passing to `put()`. Zero-copy when already a Buffer.
- **Files modified:** src/lib/storage/vercel-blob.ts
- **Verification:** typecheck exits 0
- **Committed in:** c134955 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 — Bug)
**Impact on plan:** Both fixes necessary for ESM correctness and type safety. The require() → static import change is architecturally equivalent (both are module-isolation patterns); static imports are actually preferable for ESM codebases. No scope creep.

## Known Stubs

None. Both drivers are full implementations satisfying all 5 StorageAdapter methods. Plan 05-07's healthz will exercise put/get/delete end-to-end with real credentials.

## Threat Surface Scan

All threat mitigations from the plan's threat model implemented as required:

| Threat ID | Status | Evidence |
|-----------|--------|---------|
| T-05.03-01 — signedUrl TTL ceiling | Mitigated | MAX_SIGNED_URL_TTL_SECONDS enforced in both drivers; tested in vercel-blob.test.ts + s3.test.ts |
| T-05.03-02 — Cache-Control on objects | Mitigated | DEFAULT_CACHE_CONTROL='private,max-age=0,no-store' on S3 PutObjectCommand; cacheControlMaxAge:0 on Vercel put |
| T-05.03-03 — Public Vercel Blob URLs | Mitigated | Proxy architecture documented in vercel-blob.ts; raw URLs never returned from public API |
| T-05.03-04 — Cross-tenant access | Documented | Interface is key-agnostic; Phase 8 enforces user-scoped key prefix from authed session |
| T-05.03-05 — Object integrity | Accepted | Phase 8 adds pdf_sha256 to proposals row |
| T-05.03-06 — Credential validation at construction | Mitigated | Both constructors throw on missing env vars; tested |
| T-05.03-07 — Provider errors leaking | Mitigated | All SDK errors wrapped in StorageError/StorageNotFoundError/StorageAuthError |
| T-05.03-08 — OVH path-style drift | Mitigated | forcePathStyle:true hardcoded in S3Client constructor |

No additional threat surface found beyond what the plan covered.

## Next Phase Readiness

- `import { storage } from '@/lib/storage'` pattern is ready for all downstream consumers (05-07 healthz, Phase 8 PDF pipeline, Phase 10 OVH cutover)
- STORAGE_DRIVER=vercel selects VercelBlobStorage; STORAGE_DRIVER=s3 selects S3Storage
- Plan 05-07's healthz round-trip will provision real BLOB_READ_WRITE_TOKEN and exercise put/get/delete/signedUrl against live Vercel Blob
- Plan 05-05's CI grep gate will enforce zero @vercel/blob/@aws-sdk imports outside src/lib/storage/

## Self-Check: PASSED

Files verified present:
- src/lib/storage/adapter.ts: FOUND
- src/lib/storage/errors.ts: FOUND
- src/lib/storage/index.ts: FOUND
- src/lib/storage/index.test.ts: FOUND
- src/lib/storage/vercel-blob.ts: FOUND
- src/lib/storage/vercel-blob.test.ts: FOUND
- src/lib/storage/s3.ts: FOUND
- src/lib/storage/s3.test.ts: FOUND
- vitest.config.ts: FOUND

Commits verified:
- 2b5af73: Task 1 (test — RED phase)
- c134955: Task 2 (feat — GREEN phase)
