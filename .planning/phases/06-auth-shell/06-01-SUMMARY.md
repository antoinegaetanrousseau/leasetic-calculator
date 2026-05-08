---
phase: "06-auth-shell"
plan: "01"
subsystem: "auth"
tags: ["better-auth", "drizzle", "schema", "dependencies", "migration"]
dependency_graph:
  requires: ["05-07"]
  provides: ["06-03", "06-04", "06-05", "06-06", "06-07", "06-08", "06-09"]
  affects: ["src/db/schema.ts", "drizzle/", "package.json"]
tech_stack:
  added:
    - "better-auth@1.6.9"
    - "@node-rs/argon2@2.0.2"
    - "react-hook-form@7.75.0"
    - "zod@4.4.3"
    - "@hookform/resolvers@5.2.2"
  upgraded:
    - "drizzle-kit@0.30.1 → @0.31.10"
  patterns:
    - "Better Auth Drizzle adapter (bundled in better-auth/adapters/drizzle)"
    - "Drizzle generate-only migration discipline (never push)"
    - "text id for Better Auth tables, uuid id for application tables"
key_files:
  created:
    - "drizzle/0001_kind_doctor_faustus.sql"
    - "drizzle/meta/0001_snapshot.json"
  modified:
    - "package.json"
    - "package-lock.json"
    - ".env.example"
    - "src/db/schema.ts"
    - "drizzle/meta/_journal.json"
decisions:
  - "Used --legacy-peer-deps to install better-auth@1.6.9: optional @tanstack/react-start peerDep pulls vite@>=7, conflicting with vitest@2.1.8's vite@5. All conflicting peerDeps are optional; --legacy-peer-deps is safe and appropriate."
  - "Constraint names: users_role_check and password_resets_kind_check (plan spec names, more explicit than RESEARCH.md's role_check/kind_check)"
  - "Migration file: drizzle/0001_kind_doctor_faustus.sql (drizzle-kit auto-names; kept as-is per plan spec)"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 5
---

# Phase 6 Plan 01: Auth Foundation — Dependencies + Schema + Migration Summary

Phase 6 auth foundation: Better Auth 1.6.9 + argon2id + form libs installed at exact pins, drizzle-kit upgraded, 5 auth tables in schema.ts with CHECK constraints, and versioned SQL migration generated via db:generate.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Phase 6 deps + document env vars | 8d36edc | package.json, package-lock.json, .env.example |
| 2 | Extend schema.ts + generate 0001 migration | 0d176fb | src/db/schema.ts, drizzle/0001_kind_doctor_faustus.sql, drizzle/meta/ |

## Installed Versions (Verified via npm list)

| Package | Version | Role |
|---------|---------|------|
| `better-auth` | `1.6.9` | Auth library (DB-backed sessions, email+password, Drizzle adapter bundled) |
| `@node-rs/argon2` | `2.0.2` | argon2id password hashing (AUTH-17 dep) |
| `react-hook-form` | `7.75.0` | Form state management (SHELL-11) |
| `zod` | `4.4.3` | Schema validation (SHELL-11) |
| `@hookform/resolvers` | `5.2.2` | RHF+Zod bridge (SHELL-11) |
| `drizzle-kit` | `0.31.10` | Upgraded from 0.30.1 (Better Auth peer dep >=0.31.4) |

## Schema Tables Created

| Table | Key Properties |
|-------|---------------|
| `users` | `id text` (Better Auth nanoid), `email text UNIQUE`, `role text CHECK IN('partner','admin')`, no `password_hash` |
| `sessions` | `id text`, `token text UNIQUE`, FK → users ON DELETE CASCADE |
| `accounts` | `id text`, `password text` (argon2id hash, Better Auth-managed), FK → users ON DELETE CASCADE |
| `verifications` | `id text`, Better Auth verification flow support |
| `passwordResets` | `id uuid` (our table), `kind text CHECK IN('reset','invite')`, `token_hash text UNIQUE`, FK → users ON DELETE CASCADE |

## Generated Migration

**File:** `drizzle/0001_kind_doctor_faustus.sql`
**Method:** `npm run db:generate` (drizzle-kit generate — never push)
**Content:** 5 CREATE TABLE statements + 3 ALTER TABLE ADD CONSTRAINT (FK) statements
**Application:** Via existing GitHub Action `.github/workflows/db-migrate.yml` on prod; `npm run db:migrate` for local dev

## Requirements Satisfied

| Req | Status | Notes |
|-----|--------|-------|
| AUTH-13 | Schema-layer DONE | `role IN('partner','admin')` CHECK constraint in users table + SQL migration |
| AUTH-17 | Dep installed | `@node-rs/argon2@2.0.2` installed; wiring (memoryCost/timeCost config) in Plan 06-03 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Optional peer dep conflict resolved with --legacy-peer-deps**
- **Found during:** Task 1 (npm install)
- **Issue:** `better-auth@1.6.9` has an optional peerDep on `@tanstack/react-start@^1.0.0`. This package's dependency tree requires `vite@>=7.0.0`, conflicting with `vitest@2.1.8`'s requirement of `vite@^5.0.0`. npm@10 treats this as an unresolvable conflict.
- **Fix:** `npm install --legacy-peer-deps` — appropriate since `@tanstack/react-start` is an optional peer dep and is not used in this project (we use Next.js). All package versions installed as intended.
- **Files modified:** None (install flag only; package-lock.json reflects correct resolution)
- **Commit:** 8d36edc

## Known Stubs

None — this plan creates infrastructure only (deps + schema + migration SQL). No UI or data-flow code that could have stub issues.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth-surface | `src/db/schema.ts` | 5 new auth tables introduce user/session/account management surface. Mitigated by CHECK constraints (AUTH-13), no password_hash on users (T-06-01-05), and generate-only migration discipline (T-06-01-01). |

## Self-Check: PASSED

- [x] `src/db/schema.ts` exports 5 new tables: `users`, `sessions`, `accounts`, `verifications`, `passwordResets`
- [x] `drizzle/0001_kind_doctor_faustus.sql` exists
- [x] `grep -cE 'export const (users|...)' src/db/schema.ts` = 5
- [x] `better-auth@1.6.9` in package.json (no caret)
- [x] `drizzle-kit@0.31.10` in package.json (no caret)
- [x] No `password_hash` in SQL or schema
- [x] `users.id text PRIMARY KEY` confirmed in generated SQL
- [x] `npm run typecheck` = 0
- [x] `npm run lint:check` = 0 (max-warnings=0)
- [x] `npm run check:no-drizzle-push` = 0
- [x] `npm test` = 28/28 passing
- [x] `npm run build` = 0
- [x] Commits 8d36edc + 0d176fb exist in git log
