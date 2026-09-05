---
phase: 05-bootstrap-deploy
plan: "05"
subsystem: ci-gates
tags: [eslint, ci, github-actions, vitest, ovh-portability, boot-06, boot-11, defense-in-depth]
dependency_graph:
  requires:
    - phase: 05-01
      provides: package.json base + typecheck script
    - phase: 05-03
      provides: src/lib/storage/ (the legitimate home for @vercel/blob imports)
    - phase: 05-04
      provides: src/lib/db/ (the legitimate home for @neondatabase/serverless + postgres imports)
  provides:
    - eslint.config.mjs — flat config with no-restricted-imports enforcement
    - scripts/check-no-vercel-only-imports.sh — defense-in-depth grep
    - scripts/check-no-drizzle-push.sh — defense-in-depth grep
    - .github/workflows/ci.yml — full CI pipeline
  affects:
    - All future PRs — must pass ESLint + grep gates before merge
    - phase: 06+ — any code introducing @vercel/* outside adapters will fail CI
tech_stack:
  added:
    - eslint@9.18.0
    - eslint-config-next@16.2.4 (flat config array, no FlatCompat needed)
    - typescript-eslint@8.20.0
    - "@next/eslint-plugin-next@16.2.4"
    - "@eslint/eslintrc@3.2.0"
  patterns:
    - ESLint 9 flat config (eslint.config.mjs, createRequire import for CJS-exported next config)
    - Two-layer CI gate (ESLint static + grep dynamic/edge-case)
    - GitHub Actions concurrency cancellation
key_files:
  created:
    - eslint.config.mjs
    - scripts/check-no-vercel-only-imports.sh
    - scripts/check-no-drizzle-push.sh
    - .github/workflows/ci.yml
  modified:
    - package.json (new scripts: lint:check, check:no-vercel-imports, check:no-drizzle-push; lint script updated)
    - postcss.config.mjs (named export to satisfy import/no-anonymous-default-export)
    - package-lock.json (new ESLint packages)
decisions:
  - "eslint-config-next 16.x exports flat config arrays natively; FlatCompat is NOT needed and causes circular JSON errors"
  - "lint script changed from next lint (removed in Next.js 16) to eslint ."
  - "check-no-drizzle-push.sh excludes .planning/ and drizzle.config.ts to avoid self-tripping on documentation"
  - "ci.yml step name changed from 'no drizzle-kit push' to 'no-drizzle-push invocations' to avoid grep false positive"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-06"
  tasks_completed: 2
  files_created: 4
  files_modified: 3
---

# Phase 5 Plan 05: ESLint + CI Grep Gates + Vitest CI Pipeline Summary

**One-liner:** ESLint flat config + two grep scripts enforce the no-Vercel-only-primitives rule (BOOT-06); GitHub Actions CI runs typecheck + lint + grep + Vitest + build on every PR (BOOT-11). Both layers confirmed by negative test.

## What Was Built

### Task 1: ESLint Flat Config + Defense-in-Depth Grep Scripts

**ESLint packages installed (exact pins, no carets):**

| Package | Version |
|---------|---------|
| eslint | 9.18.0 |
| eslint-config-next | 16.2.4 |
| typescript-eslint | 8.20.0 |
| @next/eslint-plugin-next | 16.2.4 |
| @eslint/eslintrc | 3.2.0 |

**`eslint.config.mjs`** — flat config using `createRequire` to import the CJS-exported `eslint-config-next` flat config array. No FlatCompat needed (Next.js 16's config already exports ESLint 9-native arrays).

**7 forbidden packages blocked in `no-restricted-imports`:**

| Package | Restriction | Allowed in |
|---------|-------------|------------|
| `@vercel/blob` | OVH portability | `src/lib/storage/` only |
| `@vercel/postgres` | Discontinued | Nowhere |
| `@vercel/kv` | Vercel-only | Nowhere |
| `@vercel/edge-config` | Vercel-only | Nowhere |
| `@neondatabase/serverless` | Driver-direct | `src/lib/db/` only |
| `postgres` (npm) | Driver-direct | `src/lib/db/` only |
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | Driver-direct | `src/lib/storage/` only |

**`scripts/check-no-vercel-only-imports.sh`** — grep defense-in-depth. Searches `src/` and `app/` for the 7 forbidden package names (and bare `postgres` in import-context). Excludes `src/lib/storage/` and `src/lib/db/` from results.

**`scripts/check-no-drizzle-push.sh`** — grep defense-in-depth. Searches all source, config, YAML, and markdown files for the literal `drizzle-kit push`. Excludes `.planning/` (docs), `drizzle.config.ts` (has explanatory comment), and this script itself.

**New npm scripts:**
- `lint`: `eslint .` (replacing `next lint` which was removed in Next.js 16)
- `lint:check`: `eslint . --max-warnings=0` (zero-warning policy for CI)
- `check:no-vercel-imports`: `bash scripts/check-no-vercel-only-imports.sh`
- `check:no-drizzle-push`: `bash scripts/check-no-drizzle-push.sh`

### Task 2: .github/workflows/ci.yml

CI pipeline runs on every PR to `main` and every push to `main`:

```
checkout → Node 22 → npm ci → typecheck → lint:check → check:no-vercel-imports
→ check:no-drizzle-push → npm test (Vitest 22 tests) → npm run build → standalone check
```

- `timeout-minutes: 10` — kills runaway builds (T-05.05-05)
- `cancel-in-progress: true` — kills stale runs on new push
- `permissions: contents: read` — minimal GITHUB_TOKEN scope (T-05.05-03)
- Build step uses placeholder env vars (no real secrets needed for CI build)
- Final step verifies `.next/standalone/server.js` exists (BOOT-07 sanity)

## Negative Test Results

Both layers confirmed to catch forbidden imports:

**Layer 1 (ESLint) — output when `import { put } from '@vercel/blob'` added outside adapter:**
```
/app/__forbidden_test__.ts
  1:1  error  '@vercel/blob' import is restricted from being used. Direct @vercel/blob
               import is forbidden outside src/lib/storage/. Use `import { storage }
               from "@/lib/storage"` instead. (BOOT-05, ARCHITECTURE §9)  no-restricted-imports
✖ 2 problems (1 error, 1 warning)
```

**Layer 2 (grep script) — output for same file:**
```
ERROR: forbidden import '@vercel/blob' found outside lib/storage|lib/db:
app/__forbidden_test__.ts:1:import { put } from '@vercel/blob';

FAILED: BOOT-06 no-Vercel-only-imports rule violated.
Use 'import { storage } from "@/lib/storage"' or 'import { db } from "@/lib/db"' instead.
```

## Verification Results

All gates exit 0 on clean repo:
```
npm run lint:check          → (no output — 0 errors, 0 warnings)
npm run check:no-vercel-imports → OK: no forbidden Vercel-only / driver-direct imports found outside lib/ adapters.
npm run check:no-drizzle-push  → OK: no 'drizzle-kit push' invocations found.
npm run typecheck           → (no output)
npm test                    → 22 tests passed (4 test files)
npm run build               → Next.js 16.2.4 build success, standalone artifact present
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FlatCompat causes circular JSON error with eslint-config-next 16.x**
- **Found during:** Task 1 — first `npx eslint` run
- **Issue:** The plan specified using `FlatCompat` to extend `next/core-web-vitals`. However, `eslint-config-next@16.2.4` exports flat config arrays directly (not legacy format). `FlatCompat` fails with `TypeError: Converting circular structure to JSON` at `@eslint/eslintrc/lib/shared/config-validator.js`.
- **Fix:** Replaced `FlatCompat` with `createRequire(import.meta.url)` to directly `require()` the CJS-exported flat config arrays from `eslint-config-next`. No compat layer needed.
- **Files modified:** `eslint.config.mjs`

**2. [Rule 2 - Missing functionality] lint script used removed next lint command**
- **Found during:** Task 1 — testing `npm run lint`
- **Issue:** `next lint` does not exist as a subcommand in Next.js 16 (it was removed). Script produced: "Invalid project directory provided, no such directory: .../lint"
- **Fix:** Changed `"lint": "next lint"` to `"lint": "eslint ."` — direct ESLint invocation.
- **Files modified:** `package.json`

**3. [Rule 1 - Bug] import/no-anonymous-default-export warnings in eslint.config.mjs and postcss.config.mjs**
- **Found during:** Task 1 — `eslint . --max-warnings=0` failed with 2 warnings
- **Issue:** Both config files used anonymous `export default [...]` / `export default {...}`, which triggers `import/no-anonymous-default-export` from the next/core-web-vitals ruleset. With `--max-warnings=0` policy this causes CI failure.
- **Fix:** Assigned arrays/objects to named `const config = ...` before exporting in both files.
- **Files modified:** `eslint.config.mjs`, `postcss.config.mjs`

**4. [Rule 1 - Bug] check-no-drizzle-push.sh false-positive on .planning/ docs and drizzle.config.ts**
- **Found during:** Task 1 — `bash scripts/check-no-drizzle-push.sh` exited 1
- **Issue:** `PITFALLS.md` and `ROADMAP.md` in `.planning/` legitimately discuss "drizzle-kit push is forbidden" (documentation). `drizzle.config.ts` has an explanatory comment referencing the prohibition. The grep found these as violations.
- **Fix:** Added `--exclude-dir=.planning` and `--exclude='drizzle.config.ts'` to the grep command. The plan's script template only excluded `*-PLAN.md` and `*-SUMMARY.md` by filename; this broader exclusion is more correct.
- **Files modified:** `scripts/check-no-drizzle-push.sh`

**5. [Rule 1 - Bug] ci.yml step name contained the forbidden string "drizzle-kit push"**
- **Found during:** Task 2 — `npm run check:no-drizzle-push` exited 1 after creating ci.yml
- **Issue:** The step name "Defense-in-depth grep -- no drizzle-kit push" contained the literal forbidden string, causing the grep script to flag its own workflow file.
- **Fix:** Renamed step to "Defense-in-depth grep -- no-drizzle-push invocations" which does not contain the forbidden substring.
- **Files modified:** `.github/workflows/ci.yml`

## Manual Setup Required (post-plan)

**GitHub Branch Protection** — Antoine must enable in GitHub Settings → Branches:
- Protect `main`: require status checks to pass before merge
- Required check: the CI job `build-test`
- Require approval for workflow file changes (`.github/workflows/*` edits) — prevents a PR from disabling the CI gate it's trying to bypass (T-05.05-06)

This step cannot be automated from the repository itself and must be done once via GitHub Settings.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The CI workflow has `permissions: contents: read` only and uses no secrets beyond placeholder values. No new threat surface beyond what the plan's threat model covers.

## Self-Check: PASSED

Files verified present:
- `/Users/antoinerousseau/Developer/leasetic-calculator/eslint.config.mjs` — FOUND
- `/Users/antoinerousseau/Developer/leasetic-calculator/scripts/check-no-vercel-only-imports.sh` — FOUND
- `/Users/antoinerousseau/Developer/leasetic-calculator/scripts/check-no-drizzle-push.sh` — FOUND
- `/Users/antoinerousseau/Developer/leasetic-calculator/.github/workflows/ci.yml` — FOUND

Commits verified:
- `61b43e0` — feat(05-05): ESLint flat config + two defense-in-depth grep scripts (BOOT-06)
- `54ffa4d` — feat(05-05): CI pipeline .github/workflows/ci.yml — BOOT-06 + BOOT-11 gate
