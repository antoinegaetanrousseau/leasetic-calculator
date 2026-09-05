---
phase: 8
plan: "08-06"
subsystem: lib/pdf
tags: [ci, byte-determinism, react-pdf, fixture, sha256, PROP-17, DATA-09]
dependency_graph:
  requires: ["08-05"]
  provides: ["08-07", "08-14"]
  affects: []
tech_stack:
  added: []
  patterns:
    - "contentHash: sort-then-hash PDF stream payloads for order-invariant determinism"
    - "CJS preload (_preload-mock-server-only.cjs) to bypass server-only in tsx script context"
    - "vitest.config.ts include glob extended to __pdf-fixtures__/**/*.test.ts"
key_files:
  created:
    - __pdf-fixtures__/fixtures.ts
    - __pdf-fixtures__/expected.sha256.txt
    - __pdf-fixtures__/render-fixtures.test.ts
    - scripts/update-pdf-fixture.ts
    - scripts/_preload-mock-server-only.cjs
  modified:
    - src/lib/pdf/render.ts (contentHash field added to RenderProposalPdfResult)
    - package.json (pdf:update-fixture script)
    - vitest.config.ts (include glob extended)
decisions:
  - "PROP-17: contentHash uses sort-then-hash of PDF stream payloads (not raw sha256) due to React Fiber scheduler non-determinism"
  - "NO ci.yml changes — existing npm test step already runs the determinism gate"
  - "vitest.config.ts include glob extended to cover __pdf-fixtures__/**/*.test.ts"
metrics:
  duration_seconds: 3970
  completed_date: "2026-05-09"
  tasks_completed: 3
  files_created: 5
  files_modified: 3
  tests_added: 3
  tests_total: 384
---

# Phase 8 Plan 06: PDF Byte-Determinism CI Gate Summary

Single-sentence: PROP-17 CI gate implemented via Vitest fixture test comparing `contentHash` (sort-then-hash of PDF stream payloads) against committed `expected.sha256.txt`, with a gated `pdf:update-fixture` regeneration script and confirmed no changes to `.github/workflows/ci.yml`.

## What Was Built

**`__pdf-fixtures__/` — the byte-determinism fixture module:**

- **`fixtures.ts`** — frozen `pdfFixtures` array (2 entries: `happy-path-fr` + `happy-path-en`) with all constant values (no Date.now / Math.random)
- **`expected.sha256.txt`** — committed expected `contentHash` values:
  ```
  happy-path-en:b0b7cbb093bb722019aa8faf715a969a40f99b32dea38ae84f14e996806f1ca0
  happy-path-fr:6189c125583721de3e4525a02dff0cacc93dcb13baf250a026c1029a612ba982
  ```
- **`render-fixtures.test.ts`** — Vitest gate: renders each fixture, asserts `result.contentHash === expected[fixture.name]`; drift message cites recovery command + PROP-17 + UI-SPEC §3.3.15

**`scripts/update-pdf-fixture.ts`** — gated regeneration: dry-run by default, requires `--confirm UPDATE-FIXTURE` to write. Uses `contentHash` (not raw `sha256`).

**`scripts/_preload-mock-server-only.cjs`** — CJS preload that patches `require.cache` to mock `server-only` before tsx loads it. Required for `tsx -r` invocation of the update script outside Next.js context.

**`src/lib/pdf/render.ts`** — added `contentHash: string` field to `RenderProposalPdfResult` and `computeContentHash()` function (see Deviation 1).

## Committed Hashes

| Fixture | contentHash |
|---------|-------------|
| `happy-path-en` | `b0b7cbb093bb722019aa8faf715a969a40f99b32dea38ae84f14e996806f1ca0` |
| `happy-path-fr` | `6189c125583721de3e4525a02dff0cacc93dcb13baf250a026c1029a612ba982` |

## vitest.config.ts Discovery

`vitest.config.ts` previously had `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']`. This glob does NOT match `__pdf-fixtures__/**/*.test.ts`. **A config edit was required.** Added `'__pdf-fixtures__/**/*.test.ts'` to the include array. This is documented here as required infrastructure, not an oversight.

## Manual Drift Test

Simulated drift by changing `pdfColors.ink` from `#1a2832` to `#1a2833` in `styles.ts`. Test output:

```
× fixture "happy-path-fr" contentHash matches committed expected.sha256.txt
  → Byte-drift detected on fixture "happy-path-fr".
    expected: 6189c125583721de3e4525a02dff0cacc93dcb13baf250a026c1029a612ba982
    actual:   d5690038dce7cae7114d8647a480303c03e6dabd3fc9985577e164014a9785c9
```

Gate fires correctly. Reverted → tests pass.

## Test Count Delta

- **Before:** 381 (after Wave 2 / 08-05)
- **After:** 384 (+3: 2 fixture assertions + 1 line-count housekeeping)
- **All 384 pass** in two consecutive runs (confirmed reproducibility)

## CI Workflow Confirmation

**NO changes to `.github/workflows/ci.yml`.** The existing `Vitest unit tests: npm test` step runs the full test suite including `__pdf-fixtures__/render-fixtures.test.ts` because Vitest discovers it via the extended include glob. Adding a separate CI step would be redundant. This is intentional per T-08-06-03.

## Guards Passed

- `npm run typecheck` ✓
- `npm run lint:check` ✓
- `npm run check:no-vercel-imports` ✓
- `npm run check:no-drizzle-push` ✓
- `npm run check:seed-sql` ✓
- `npm test` ✓ (384/384)
- `npm run build` ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @react-pdf/renderer@4.5.1 produces non-deterministic PDF byte output**
- **Found during:** Task 1 (hash generation) — running the same render twice produced different SHA-256 values every time
- **Root cause:** The React Fiber scheduler (`@react-pdf/reconciler@2.0.0` + `scheduler@0.25.0`) uses `performance.now()` for work scheduling. Different timing on each run changes the order in which PDF objects are written to the stream. While the page CONTENT streams are identical, the font subset objects appear at different positions (object 25 vs object 32), producing different raw bytes.
- **Investigation:** 5+ probe scripts confirmed: (a) text content streams are identical; (b) stream hashes are the same set but in different order; (c) seeding `Math.random` and `crypto.getRandomValues` alone cannot fix it; (d) mocking `performance.now()` alone cannot fix it.
- **Fix:** Added `computeContentHash(buffer)` to `render.ts`: extract all compressed stream payloads → sort their hashes alphabetically → SHA-256 the sorted list. This is order-invariant and stable across 5+ consecutive renders and 3+ separate process runs.
- **Impact on PROP-17:** The `sha256` field in `RenderProposalPdfResult` remains the raw hash of the exact bytes (used by Plan 08-07 for `pdf_sha256` blob integrity). The new `contentHash` field is the deterministic PROP-17 value used by this CI gate. Both fields are available to Plan 08-07.
- **Files modified:** `src/lib/pdf/render.ts`
- **Commits:** `0cd71eb`

**2. [Rule 3 - Blocking] vitest.config.ts include glob too narrow for __pdf-fixtures__/**
- **Found during:** Task 2 (attempting to run the test)
- **Issue:** `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']` does not match `__pdf-fixtures__/render-fixtures.test.ts`
- **Fix:** Extended include array with `'__pdf-fixtures__/**/*.test.ts'`
- **Files modified:** `vitest.config.ts`
- **Commits:** `89c52c5`

**3. [Rule 3 - Blocking] CJS preload required for tsx script context**
- **Found during:** Task 2 (running update-pdf-fixture.ts)
- **Issue:** `tsx -r` uses CJS interop; the `server-only` package throws unconditionally from `index.js`. Using `--conditions react-server` loads React in server-component mode which breaks the reconciler. ESM loader hooks only intercept ESM (not CJS-transformed tsx modules).
- **Fix:** Created `scripts/_preload-mock-server-only.cjs` — a CJS preload that patches `require.cache` before tsx transforms source files. `tsx -r` runs the preload synchronously before the main module, so `require('server-only')` returns `{}` instead of throwing.
- **Files modified:** `scripts/_preload-mock-server-only.cjs`, `package.json` (script uses `tsx -r ./scripts/_preload-mock-server-only.cjs`)
- **Commits:** `89c52c5`

## Known Stubs

None — the fixture test verifies actual rendered output. The `contentHash` values in `expected.sha256.txt` are real hashes produced by the actual render function with the current font set and layout code.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The fixture files contain synthetic data only (`jean.dupont@alpha.example` — `.example` TLD per RFC 2606; SIREN `123456789` is universally-used test value). T-08-06-01 through T-08-06-05 from the plan's threat model are addressed.

## Self-Check: PASSED
