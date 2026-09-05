---
phase: 05-bootstrap-deploy
plan: "01"
subsystem: scaffold
tags: [nextjs, typescript, scaffold, standalone, app-router]
dependency_graph:
  requires: []
  provides: [next-app-scaffold, src-lib-skeleton, standalone-build-artifact, env-var-contract]
  affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07]
tech_stack:
  added:
    - next@16.2.4
    - react@19.0.0
    - react-dom@19.0.0
    - typescript@5.7.2
    - "@types/node@22.10.0"
    - "@types/react@19.0.0"
    - "@types/react-dom@19.0.0"
  patterns:
    - App Router (app/ directory)
    - output standalone (OVH portability)
    - src/ path alias via @/*
    - adapter-pattern directories (lib/storage, lib/db)
key_files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - next.config.ts
    - .env.example
    - app/layout.tsx
    - app/page.tsx
    - src/lib/storage/.gitkeep
    - src/lib/db/.gitkeep
    - src/lib/auth/.gitkeep
    - src/lib/i18n/.gitkeep
    - src/lib/calc/.gitkeep
    - src/lib/pdf/.gitkeep
  modified:
    - .gitignore
decisions:
  - "Exact version pins without carets across all direct dependencies (Open Q4 convention)"
  - "output: 'standalone' in next.config.ts from first commit (BOOT-07 locked)"
  - "tsconfig.json jsx updated from preserve to react-jsx by Next.js build (expected, accepted)"
metrics:
  duration_minutes: 3
  completed: "2026-05-06T11:28:27Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 13
  files_modified: 1
---

# Phase 5 Plan 01: Next.js Bootstrap Summary

Next.js 16.2.4 App Router TypeScript scaffold with `output: 'standalone'` from first commit, exact-pinned versions (no carets), full src/lib/ adapter directory skeleton, and a buildable placeholder page producing `.next/standalone/server.js`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Initialize Next.js 16.x App Router TypeScript project | 24a9bae | package.json, package-lock.json, tsconfig.json, next.config.ts, .gitignore, .env.example, app/layout.tsx, app/page.tsx, src/lib/*/. gitkeep |

## Installed Versions (Exact — No Carets)

| Package | Planned Pin | Installed |
|---------|------------|-----------|
| next | 16.2.4 | 16.2.4 |
| react | 19.0.0 | 19.0.0 |
| react-dom | 19.0.0 | 19.0.0 |
| typescript | 5.7.2 | 5.7.2 |
| @types/node | 22.10.0 | 22.10.0 |
| @types/react | 19.0.0 | 19.0.0 |
| @types/react-dom | 19.0.0 | 19.0.0 |

No deviations — all planned pins matched registry exactly.

## src/lib/ Directory Tree (Post-Completion)

```
src/
└── lib/
    ├── auth/
    │   └── .gitkeep       ← Phase 6 Better Auth wiring
    ├── calc/
    │   └── .gitkeep       ← Phase 7 calc engine port
    ├── db/
    │   └── .gitkeep       ← Plan 04 Drizzle scaffolding
    ├── i18n/
    │   └── .gitkeep       ← Phase 6 FR/EN dictionary
    ├── pdf/
    │   └── .gitkeep       ← Phase 8 PDF rendering
    └── storage/
        └── .gitkeep       ← Plan 03 StorageAdapter implementation
```

## Standalone Build Artifact

Confirmed: `.next/standalone/server.js` produced by `npm run build`.

Build output summary:
- Route `/` — Static (prerendered)
- Route `/_not-found` — Static
- Build ID: `dev-build` (env `GIT_COMMIT_SHA` not set locally — expected)

## Verification Results

All acceptance criteria passed:

- `grep -E '"next":...' package.json` — matches exact version (16.2.4)
- `grep -c '"^' package.json` — returns 0 (no caret pins)
- `grep -c "output: 'standalone'" next.config.ts` — returns 1
- `grep -c '"strict": true' tsconfig.json` — returns 1
- `grep -c '"@/*"' tsconfig.json` — returns 1
- `app/layout.tsx` and `app/page.tsx` — exist
- All six lib dirs — storage, db, auth, i18n, calc, pdf — exist
- `grep -c "STORAGE_DRIVER" .env.example` — returns 3
- `grep -c "DATABASE_URL" .env.example` — returns 1
- `npm run build` — exits 0
- `.next/standalone/server.js` — present
- `npm run typecheck` — exits 0

## Deviations from Plan

### Auto-accepted Next.js-driven tsconfig.json mutation

**Found during:** Task 1 (npm run build)
**Issue:** Next.js build auto-updated tsconfig.json: changed `jsx: "preserve"` to `jsx: "react-jsx"` and added `.next/dev/types/**/*.ts` to the include array.
**Fix:** Accepted as expected — Next.js 16 mandates `react-jsx` for App Router. The mutation is well-documented Next.js behavior and does not affect correctness or the acceptance criteria (`"strict": true` and `"@/*"` alias remain intact).
**Files modified:** tsconfig.json (by Next.js, not by executor)
**Commit:** 24a9bae (included in task commit)

## Known Stubs

- `app/layout.tsx` — minimal skeleton only; Plan 02 replaces with full UI-SPEC-compliant version (Tailwind v4, Plus Jakarta Sans, dark mode, locale toggle).
- `app/page.tsx` — placeholder text only; Plan 02 replaces with UI-SPEC layout shell.
- All `src/lib/*/`.gitkeep` files — empty placeholder directories; Plans 03, 04, and Phases 6-8 implement the adapters and modules.

These stubs are intentional per the plan. The plan's goal (buildable scaffold with standalone output) is fully achieved.

## Threat Surface Scan

No new security-relevant surface introduced beyond what the `<threat_model>` in the plan covers:
- `.env.example` contains only KEY= placeholders (T-05.01-01 mitigated)
- `package-lock.json` committed for reproducible installs (T-05.01-02 mitigated)
- Exact version pins with no carets (T-05.01-03 mitigated)
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` declared in `.env.example` only; no Server Actions ship yet (T-05.01-04 accepted)
- No source maps exposed in production build (T-05.01-05 accepted)

## Self-Check: PASSED

- package.json: FOUND
- tsconfig.json: FOUND
- next.config.ts: FOUND
- .env.example: FOUND
- app/layout.tsx: FOUND
- app/page.tsx: FOUND
- src/lib/storage/.gitkeep: FOUND
- src/lib/db/.gitkeep: FOUND
- src/lib/auth/.gitkeep: FOUND
- src/lib/i18n/.gitkeep: FOUND
- src/lib/calc/.gitkeep: FOUND
- src/lib/pdf/.gitkeep: FOUND
- .next/standalone/server.js: FOUND
- Commit 24a9bae: FOUND
