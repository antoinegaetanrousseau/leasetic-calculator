---
phase: "06-auth-shell"
plan: "04"
subsystem: "auth"
tags: ["better-auth", "authorization", "proxy", "server-actions", "session-revocation"]
dependency_graph:
  requires:
    - phase: "06-03"
      provides: "auth() lazy singleton + generateToken() + DB sessions"
  provides:
    - "requireUser() — server-only guard: getSession + AUTH-16 deletedAt re-check"
    - "requireAdmin() — calls requireUser() then notFound() if not admin (D-18)"
    - "disableUser / reEnableUser / createInvitation / createPasswordReset server actions"
    - "proxy.ts — Next.js 16 coarse auth gate at project root"
  affects:
    - "06-05 (LoginForm success/failure flows; invite/reset redemption imports requireUser)"
    - "06-06 (UserMenu/Topbar: authed layout calls requireUser() in layout)"
    - "06-07 (admin layout calls requireAdmin(); admin actions import disableUser/reEnableUser)"
tech_stack:
  added:
    - "server-only@0.0.1 (build-time guard for server-only modules)"
    - "better-auth admin plugin (added to auth() plugins array — provides revokeUserSessions API)"
  patterns:
    - "require* first, then data access (PITFALLS §7.3): requireAdmin() as first await in every server action"
    - "AUTH-16 secondary in-band check: requireUser() queries DB per-request to catch stale cookieCache"
    - "D-18 URL secrecy: requireAdmin() calls notFound() (404) not redirect/403"
    - "proxy.ts convention: Next.js 16 file + named export proxy (not middleware)"
    - "getSessionCookie from better-auth/cookies: cookie-only, no DB hit in proxy"
key_files:
  created:
    - "src/lib/auth/require.ts"
    - "src/lib/auth/require.test.ts"
    - "src/lib/auth/actions.ts"
    - "src/lib/auth/actions.test.ts"
    - "proxy.ts"
  modified:
    - "src/lib/auth/index.ts (added admin plugin)"
    - "package.json (server-only installed)"
key_decisions:
  - "Better Auth admin plugin added to auth() config (not standalone): revokeUserSessions requires the admin plugin per dist/plugins/admin/admin.d.mts — Plan 06-03 SUMMARY flagged this. Chose plugin over direct Drizzle delete to keep revocation semantics in the auth layer."
  - "server-only package installed (0.0.1): import 'server-only' at top of require.ts causes build-time error if a Client Component tries to import it — prevents accidental auth guard bypass."
  - "Vitest mocks server-only as no-op: outside Next.js bundler, server-only throws; test file vi.mock('server-only', () => ({})) neutralizes it. Standard pattern for server-only modules in tests."
  - "proxy.ts uses named export `proxy` and `config` (not `middleware` / not `export const runtime`) per RESEARCH §1. Build confirms: ƒ Proxy (Middleware) entry in route list."
  - "Token ordering in createInvitation: invalidatePriorTokens() THEN generateToken() THEN insert — ensures no race where old token is deleted and then re-used before the new one is committed."
metrics:
  duration: "~6 minutes"
  completed: "2026-05-08T16:48:27Z"
  tasks: 3
  files_created: 5
  files_modified: 2
  tests_added: 21
  tests_total: 76
---

# Phase 6 Plan 04: Auth Authorization Layer Summary

**requireUser() + requireAdmin() server-only guards + 4 admin server actions + proxy.ts (Next.js 16 coarse auth gate with getSessionCookie — cookie-only, no DB lookup)**

## Performance

- **Duration:** ~6 minutes
- **Started:** 2026-05-08T16:42:22Z
- **Completed:** 2026-05-08T16:48:27Z
- **Tasks:** 3 (Tasks 1+2 used TDD RED/GREEN cycles)
- **Files created:** 5
- **Files modified:** 2 (index.ts + package.json)

## Accomplishments

- `require.ts`: `requireUser()` + `requireAdmin()` with all 3 invariants: server-only import, AUTH-16 secondary deletedAt DB check, D-18 notFound() semantics (8 tests passing)
- `actions.ts`: 4 admin server actions all starting with `await requireAdmin()` (AUTH-15 defence-in-depth): disableUser, reEnableUser, createInvitation, createPasswordReset (13 tests passing)
- `proxy.ts` at project root: Next.js 16 `proxy` named export with cookie-only check; `ƒ Proxy (Middleware)` entry confirmed in build output; no `runtime` declaration
- 76/76 tests passing (was 55 before); typecheck + lint + build all exit 0

## Task Commits

1. **test(06-04): add failing tests for requireUser + requireAdmin (RED)** — `86aaf61`
2. **feat(06-04): implement requireUser() and requireAdmin() guards (GREEN)** — `25ef355`
3. **test(06-04): add failing tests for admin server actions (RED)** — `472d744`
4. **feat(06-04): implement admin server actions + add Better Auth admin plugin (GREEN)** — `45b5ab4`
5. **feat(06-04): add proxy.ts at project root (Next.js 16 coarse auth gate)** — `71ed8ea`

## Files Created

- `src/lib/auth/require.ts` — `import 'server-only'`; `requireUser()` calls `auth().api.getSession()` + secondary `db().query.users.findFirst()` check for deletedAt; `requireAdmin()` calls notFound() on non-admin
- `src/lib/auth/require.test.ts` — 8 tests: no-session redirect, active partner, active admin, deletedAt set, DB row missing, admin success, partner 404, unknown-role 404
- `src/lib/auth/actions.ts` — `'use server'`; 4 exports each with `await requireAdmin()` first; disableUser bumps sessionVersion + deletedAt + calls `auth().api.revokeUserSessions`; createInvitation handles disabled re-enable + throws for active (D-11)
- `src/lib/auth/actions.test.ts` — 13 tests: ordering verification, revoke API call shape, deletedAt null throw, token deletion before insertion, URL shapes
- `proxy.ts` — Next.js 16 `proxy` export; `getSessionCookie(request)` cookie check; `?next=` redirect; `/login`, `/invite/*`, `/reset/*` public paths; matcher excludes `_next/static|_next/image|favicon.ico|fonts/|healthz|api/auth`

## Better Auth API Methods — Resolved for This Plan (RESEARCH §Assumptions A4)

| Method | Location | Status |
|--------|----------|--------|
| `auth().api.getSession({ headers })` | core | Used in requireUser() |
| `auth().api.revokeUserSessions({ body: { userId } })` | **admin plugin** | Used in disableUser() — requires `admin()` plugin added to betterAuth config |

**CRITICAL resolved:** `revokeUserSessions` with `userId` is NOT in the core API — it lives in the Better Auth admin plugin (`better-auth/plugins/admin`). The admin plugin was added to `src/lib/auth/index.ts` as part of this plan. This was anticipated in Plan 06-03's SUMMARY and flagged as a blocker for Plan 06-04.

## Cookie Name (RESEARCH §9 P11)

Better Auth's default cookie name `better-auth.session_token` was used without customization. `getSessionCookie(request)` in proxy.ts requires no `cookieName` arg — the default matches. Plan 06-03 did not rename the cookie. No deviation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `server-only` package not installed**
- **Found during:** Task 1 GREEN (tests failed loading `server-only`)
- **Issue:** `import 'server-only'` in require.ts could not be resolved by Vitest — package not in node_modules
- **Fix:** `npm install server-only --save-exact --legacy-peer-deps` (version 0.0.1, same as Next.js ecosystem standard); added `vi.mock('server-only', () => ({}))` to require.test.ts and actions.test.ts so Vitest can import the module without the throw
- **Files modified:** `package.json`, `src/lib/auth/require.test.ts`, `src/lib/auth/actions.test.ts`
- **Commit:** `25ef355`

**2. [Rule 2 - Missing Critical Functionality] Better Auth admin plugin needed for revokeUserSessions**
- **Found during:** Task 2 (investigating API surface)
- **Issue:** `auth().api.revokeUserSessions({ body: { userId } })` is not in Better Auth core — it is only available when the `admin()` plugin is registered in the betterAuth config. Without the plugin, the call would throw at runtime.
- **Fix:** Added `import { admin } from 'better-auth/plugins/admin'` and `admin()` to the plugins array in `src/lib/auth/index.ts`. This was flagged by Plan 06-03's SUMMARY as a known blocker for Plan 06-04.
- **Files modified:** `src/lib/auth/index.ts`
- **Commit:** `45b5ab4`

## Known Stubs

None — this plan creates authorization infrastructure. No data flows to UI, no placeholder text.

## Threat Flags

None beyond what was already scoped in the plan's threat model (T-06-04-01 through T-06-04-09). All mitigations implemented:
- T-06-04-02: requireAdmin() uses notFound() (D-18, AUTH-15) — every admin server action guards with requireAdmin() first
- T-06-04-03: requireAdmin() reads server-side session — client invocation source irrelevant
- T-06-04-05: proxy.ts is cookie-only — no DB lookup (PITFALLS §1.5)
- T-06-04-06: createInvitation throws for active users (D-11) — tested
- T-06-04-07: invalidatePriorTokens() before insert — tested by ordering assertions
- T-06-04-08: revokeUserSessions verified via TypeScript types + test mock assertion

## p95 Session_version DB Latency Note

requireUser() performs one `db().query.users.findFirst()` per request (the AUTH-16 secondary check). On local Postgres this is sub-1ms. On Neon HTTP (production) over the internet, expect 10–30ms p95 (single row by primary key on indexed `id` column). The 5-min cookieCache already bounds the worst case — this check only runs on cache miss or first request. No materialized caching needed at this scale.

## Next Phase Readiness

- Plan 06-05 (login/invite/reset forms): can import `requireUser`, `requireAdmin`, `createInvitation`, `createPasswordReset`, `hashToken`
- Plan 06-06 (authed shell layout): imports `requireUser`; `proxy.ts` unconditionally redirects unauthenticated traffic so 06-06 only needs requireUser in the layout
- Plan 06-07 (admin layout + admin actions): imports `requireAdmin`; admin server actions are ready

---

## Self-Check: PASSED

- [x] `src/lib/auth/require.ts` exists with exports `requireUser`, `requireAdmin`, `Role`, `RequireUserResult`
- [x] First non-comment line of require.ts is `import 'server-only';`
- [x] require.ts contains `redirect('/login')` exactly once
- [x] require.ts contains `notFound()` exactly once
- [x] require.ts contains `/api/auth/sign-out?redirect=/login` exactly once
- [x] `src/lib/auth/actions.ts` starts with `'use server'` on first line
- [x] `src/lib/auth/actions.ts` has exactly 4 `await requireAdmin()` calls (one per exported function)
- [x] `proxy.ts` exists at project root (NOT inside app/)
- [x] `proxy.ts` exports `proxy` function and `config` constant
- [x] `proxy.ts` does NOT export `middleware`
- [x] `proxy.ts` does NOT contain `runtime` declaration
- [x] `proxy.ts` contains `getSessionCookie` and `?next=`
- [x] Commits `86aaf61`, `25ef355`, `472d744`, `45b5ab4`, `71ed8ea` exist in git log
- [x] `npm run typecheck` exits 0
- [x] `npm test` 76/76 passing
- [x] `npm run lint:check` exits 0
- [x] `npm run build` exits 0 — `ƒ Proxy (Middleware)` in route list

*Phase: 06-auth-shell*
*Completed: 2026-05-08*
