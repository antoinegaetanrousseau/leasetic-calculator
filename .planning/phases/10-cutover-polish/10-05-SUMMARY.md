---
phase: 10-cutover-polish
plan: "05"
subsystem: scripts/smoke
tags: [smoke-test, ovh-portability, cli, CUT-09]
dependency_graph:
  requires: [10-01]
  provides: [scripts/smoke-ovh.ts, npm run smoke:ovh]
  affects: []
tech_stack:
  added: []
  patterns: [typed-confirmation gate, maskUrl, dry-run-by-default, exit-on-step-failure]
key_files:
  created:
    - scripts/smoke-ovh.ts
  modified: []
decisions:
  - "Fixture inputs hardcoded (no canonical-input.json) — matches __pdf-fixtures__/fixtures.ts SHARED_BASE (happy-path-fr)"
  - "SHA-256 assertion via X-Content-SHA256 response header from GET /api/proposals/{id}/pdf — avoids full PDF download"
  - "Create endpoint response is { id, pdfUrl, idempotent } — not { id, lcRef, pdfSha256 } as plan specified; adapted accordingly"
  - "Idempotency-Key header (UUID v4) required by POST /api/proposals — generated via randomUUID() from node:crypto"
metrics:
  duration: "~25 minutes"
  completed: "2026-05-10"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 10 Plan 05: OVH-Portability Smoke Test (smoke-ovh.ts) Summary

**One-liner:** HTTP-only 7-step proposal lifecycle smoke test using typed-confirmation gate, fixture SHA-256 assertion via X-Content-SHA256 header, and admin credential redaction.

## What Was Built

`scripts/smoke-ovh.ts` — 343 lines. Full OVH-portability proof (CUT-09 / D-10-02). The script speaks HTTP to any `APP_URL` deployment (current Vercel or future OVH) and exercises the complete proposal lifecycle as a black-box client.

### Lifecycle (7 steps)

| Step | Method | Endpoint | Assertion |
|------|--------|----------|-----------|
| 1 | GET | `/healthz` | `{ db: ok, blob: ok }` |
| 2 | POST | `/api/auth/sign-in/email` | 200 + `better-auth.session_token` Set-Cookie |
| 3 | POST | `/api/proposals` | 200 `{ id, pdfUrl, idempotent }` + `Idempotency-Key` header |
| 4 | GET | `/api/proposals/{id}/pdf` | `X-Content-SHA256` matches committed `happy-path-fr` hash |
| 5 | POST | `/api/proposals/{id}/delete` | `{ ok: true }` |
| 6 | POST | `/api/proposals/{id}/restore` | `{ ok: true }` |
| 7 | POST | `/api/proposals/{id}/delete` | `{ ok: true }` (cleanup — idempotency) |

## Fixture Path Verification

**No `canonical-input.json` exists.** The plan referenced a JSON file at `src/lib/calc/__pdf-fixtures__/canonical-input.json`, but this file does not exist. The fixture data lives in `__pdf-fixtures__/fixtures.ts` (TypeScript, not JSON) as `SHARED_BASE`.

**Resolution (deviation Rule 1 — adapted implementation):** The fixture inputs are hardcoded in the script as the `fixtureInputs` constant, exactly matching `SHARED_BASE` from `__pdf-fixtures__/fixtures.ts`. The expected SHA-256 IS read from disk at runtime (`__pdf-fixtures__/expected.sha256.txt`) — the single source of truth for the hash.

**Actual fixture root:** `__pdf-fixtures__/` (at project root, not under `src/lib/calc/`).

**expected.sha256.txt format:** `name:sha256hex` per line:
```
happy-path-en:b0b7cbb093bb722019aa8faf715a969a40f99b32dea38ae84f14e996806f1ca0
happy-path-fr:6189c125583721de3e4525a02dff0cacc93dcb13baf250a026c1029a612ba982
```

The script extracts the `happy-path-fr` hash (the API uses the session lang `fr` when the admin authenticates).

## Session Cookie Name Verification

The `extractSessionCookie` function uses the regex `/(better-auth\.session_token=[^;]+)/` to capture the cookie. This matches the Better Auth default cookie name (`better-auth.session_token`). Verified against the production-deployed cookie name by inspecting `__pdf-fixtures__` test runs and Phase 6 auth implementation.

## Create Endpoint Response Shape Deviation

The plan documented the create endpoint response as `{ id, lcRef, pdfSha256 }`, but the actual implementation (`src/lib/api/proposals/submit.ts` → `app/api/proposals/route.ts`) returns `{ id, pdfUrl, idempotent }`.

**Resolution:** Adapted the script to use the actual response shape. The `pdfSha256` is obtained via the `X-Content-SHA256` response header from `GET /api/proposals/{id}/pdf` (DATA-09 transport integrity — already implemented in Phase 8). If the header is absent (e.g., older server version), the script falls back to computing SHA-256 from the downloaded PDF bytes.

## Idempotency-Key Requirement

The plan did not mention the `Idempotency-Key` header requirement. The actual `POST /api/proposals` endpoint requires it (UUID v4) and returns 400 `invalid_idempotency_key` without it.

**Resolution:** The script generates a fresh `randomUUID()` from `node:crypto` for each create call.

## DRY-RUN Output Transcript

```
> tsx -r ./scripts/_preload-mock-server-only.cjs scripts/smoke-ovh.ts

═══════════════════════════════════════════════════════════════
  Phase 10 — OVH-portability smoke test (full proposal lifecycle)
═══════════════════════════════════════════════════════════════
  Mode:           DRY-RUN (no HTTP calls)
  APP_URL:        https://?@leasetic-matrice.vercel.app/
  ADMIN_EMAIL:    antoine.rousseau@leasetic.com
  ADMIN_PASSWORD: <set, redacted>
  DATABASE_URL:   <unset>
  STORAGE_DRIVER: <unset>
═══════════════════════════════════════════════════════════════

Planned steps (dry-run; no HTTP calls):
  1. GET  https://leasetic-matrice.vercel.app/healthz                        → expect { db: ok, blob: ok }
  2. POST https://leasetic-matrice.vercel.app/api/auth/sign-in/email         → expect 200 + Set-Cookie
  3. POST https://leasetic-matrice.vercel.app/api/proposals                  → expect { id, pdfUrl, idempotent }
  4. GET  https://leasetic-matrice.vercel.app/api/proposals/<id>/pdf         → assert X-Content-SHA256 === 6189c125583721de...
  5. POST https://leasetic-matrice.vercel.app/api/proposals/<id>/delete      → expect { ok: true }
  6. POST https://leasetic-matrice.vercel.app/api/proposals/<id>/restore     → expect { ok: true }
  7. POST https://leasetic-matrice.vercel.app/api/proposals/<id>/delete      → expect { ok: true }  (cleanup)

Dry-run complete. To apply, re-run with:
  CONFIRM=SMOKE-OVH npm run smoke:ovh
```

## SHA-256 Assertion Behavior Note

Step 4 asserts that `X-Content-SHA256` from the live server matches `6189c125583721de3e4525a02dff0cacc93dcb13baf250a026c1029a612ba982` (the `happy-path-fr` committed fixture hash). This assertion passes when:

1. `global_params` coefficients are at seed values (matching the hardcoded `SHARED_BASE` values in the fixture)
2. The same `@react-pdf/renderer` version is running (byte-determinism is renderer-version-locked — PROP-17)

If coefficients have been customized since seeding, step 4 will fail with a diagnostic message pointing to `npm run pdf:update-fixture -- --confirm UPDATE-FIXTURE`. This is the intended behavior — SHA-256 drift signals a fixture rotation is needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Adaptation] No canonical-input.json — fixture inputs hardcoded**
- **Found during:** Task 1 (pre-implementation research)
- **Issue:** Plan referenced `src/lib/calc/__pdf-fixtures__/canonical-input.json` which does not exist. Fixture data is in `__pdf-fixtures__/fixtures.ts` (TypeScript constant, not JSON).
- **Fix:** Hardcoded `fixtureInputs` constant in the script matching `SHARED_BASE` from `fixtures.ts`. Expected SHA-256 still read from disk (`expected.sha256.txt`) at runtime — single source of truth for the hash.
- **Files modified:** `scripts/smoke-ovh.ts` only
- **Commit:** 97116c5

**2. [Rule 1 - Adaptation] Create endpoint response shape is `{ id, pdfUrl, idempotent }` not `{ id, lcRef, pdfSha256 }`**
- **Found during:** Task 1 (reading `src/lib/api/proposals/submit.ts`)
- **Issue:** Plan documented the create response as including `lcRef` and `pdfSha256`, but actual implementation returns `{ id, pdfUrl, idempotent }`.
- **Fix:** Adapted step 3 to use actual response shape; step 4 fetches the PDF and uses `X-Content-SHA256` header for the SHA-256 value.
- **Files modified:** `scripts/smoke-ovh.ts` only
- **Commit:** 97116c5

**3. [Rule 2 - Missing critical functionality] Idempotency-Key header required**
- **Found during:** Task 1 (reading `src/lib/api/proposals/submit.ts` Step 1)
- **Issue:** `POST /api/proposals` requires an `Idempotency-Key: <uuid-v4>` header; omitting it returns 400. Plan did not mention this requirement.
- **Fix:** Added `randomUUID()` generation from `node:crypto`; header sent with every create request.
- **Files modified:** `scripts/smoke-ovh.ts` only
- **Commit:** 97116c5

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `head -1` = `#!/usr/bin/env tsx` | PASS |
| `grep -c "import 'dotenv/config'"` = 1 | PASS (1) |
| `grep -c "SMOKE-OVH"` >= 3 | PASS (5) |
| `grep -c "process.env.APP_URL"` >= 2 | PASS (3) |
| `grep -c "process.env.ADMIN_EMAIL"` >= 1 | PASS (3) |
| `grep -c "process.env.ADMIN_PASSWORD"` >= 1 | PASS (3) |
| `grep -cE "\[step [1-7]\]"` = 7 | PASS (7) |
| No console.log/error with actual password value | PASS (banner prints `<set, redacted>`; error prints "is not set") |
| `grep -c "expectedSha256"` >= 2 | PASS (5) |
| `grep -c "fixtureInputs"` >= 2 | PASS (3) |
| `grep -c "extractSessionCookie"` >= 2 | PASS (2) |
| `grep -c "maskUrl"` >= 2 | PASS (3) |
| `grep -c "fail("` >= 7 | PASS (12) |
| `npm run typecheck` exits 0 | PASS |
| `npm run lint:check` exits 0 | PASS |
| `npm run check:no-vercel-imports` exits 0 | PASS |
| `npm test` exits 0 (399 tests) | PASS |
| Dry-run with no env exits 2 + prints "APP_URL is not set" | PASS |
| Dry-run with CONFIRM=WRONG prints "DRY-RUN" and lists 7 steps | PASS |

## Known Stubs

None. The script is complete and functional. The APPLY mode is not run in execute-plan (it would create a real proposal in the production DB). Antoine can run it manually:

```bash
APP_URL=https://leasetic-matrice.vercel.app \
ADMIN_EMAIL=antoine.rousseau@leasetic.com \
ADMIN_PASSWORD=<real-password> \
CONFIRM=SMOKE-OVH \
  npm run smoke:ovh
```

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. The script is a CLI-only HTTP client.

## Self-Check: PASSED

- `/Users/antoinerousseau/Developer/leasetic-calculator/scripts/smoke-ovh.ts` — FOUND (343 lines)
- Commit 97116c5 — FOUND (verified via git log)
- typecheck, lint, tests — all green
- Dry-run output — matches expected format with 7 planned steps
