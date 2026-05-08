---
phase: "06-auth-shell"
plan: "03"
subsystem: "auth"
tags: ["better-auth", "drizzle", "argon2id", "zod", "tokens", "crypto", "sessions"]
dependency_graph:
  requires:
    - phase: "06-01"
      provides: "better-auth@1.6.9 + @node-rs/argon2@2.0.2 installed; schema.ts with 5 auth tables"
    - phase: "05-04"
      provides: "db() memoized Drizzle singleton + schema re-export"
  provides:
    - "auth() — lazy Better Auth instance with Drizzle adapter, argon2id, DB sessions"
    - "authClient — browser-side createAuthClient (NEXT_PUBLIC_APP_URL)"
    - "generateToken() / hashToken() — SHA-256 token crypto for invitation/reset URLs"
    - "loginSchema / setPasswordSchema — Zod schemas shared client+server"
    - "/api/auth/[...all] catch-all route for Better Auth endpoints"
  affects:
    - "06-04 (require.ts consumes auth().api.getSession)"
    - "06-05 (LoginForm uses authClient.signIn.email; set-password uses hashToken)"
    - "06-06 (UserMenu uses authClient.signOut)"
    - "06-07 (admin actions use auth().api + generateToken)"
    - "06-09 (grant-admin uses generateToken)"
tech_stack:
  added:
    - "better-auth/adapters/drizzle (bundled in better-auth — no separate install)"
    - "better-auth/next-js (toNextJsHandler + nextCookies)"
    - "better-auth/client (createAuthClient)"
  patterns:
    - "Lazy auth singleton: auth() function with _auth memo — mirrors db() pattern"
    - "argon2id dynamic import: await import('@node-rs/argon2') to prevent native binding at build time"
    - "Route handler lazy evaluation: exported GET/POST functions call handler() to avoid DATABASE_URL at static analysis"
    - "Token generation: randomBytes(32) → base64url plaintext, SHA-256 hex stored in DB"
    - "Shared Zod schemas: no directives, importable from both client and server"
key_files:
  created:
    - "src/lib/auth/index.ts"
    - "src/lib/auth/client.ts"
    - "src/lib/auth/tokens.ts"
    - "src/lib/auth/tokens.test.ts"
    - "src/lib/auth/schemas.ts"
    - "src/lib/auth/schemas.test.ts"
    - "app/api/auth/[...all]/route.ts"
  modified: []
key_decisions:
  - "auth() exported as lazy memoized function (not const) — defers db() call to first HTTP request; prevents DATABASE_URL errors during next build static analysis. Mirrors db() singleton pattern."
  - "Route handler uses exported GET/POST async functions wrapping toNextJsHandler(auth()) instead of module-level const destructuring — same lazy-init rationale."
  - "argon2 work factors: memoryCost:19456 (19MB), timeCost:2, parallelism:1 per RESEARCH.md §9 P10 (Vercel cold-start tuned). algorithm:2 = argon2id."
  - "revokeUserSessions is in the Better Auth ADMIN plugin (better-auth/plugins/admin) not core auth.api — Plan 06-04 must use auth().api.revokeSessions (revokes current user) or add the admin plugin to revoke another user's sessions. Confirmed via dist/plugins/admin/admin.d.mts."
  - "nextCookies() plugin added — required for Set-Cookie headers to propagate from Next.js Server Actions and Route Handlers."
  - "trustedOrigins deduplicates resolveBaseUrl() + localhost:3000 to prevent CSRF from unlisted origins."
patterns_established:
  - "Lazy Better Auth singleton: function auth() { if (_auth===null) _auth=createAuth(); return _auth; }"
  - "Argon2 dynamic import pattern to avoid native binding at module evaluation time"
  - "Token pair pattern: generateToken() returns {plaintext (URL), hash (DB)}; hashToken() for redemption lookup"
requirements_completed:
  - AUTH-01
  - AUTH-02
  - AUTH-17
  - AUTH-18
  - SHELL-11
duration: "~7 minutes"
completed: "2026-05-08"
---

# Phase 6 Plan 03: Auth Engine Wiring Summary

**Better Auth 1.6.9 lazy singleton with Drizzle adapter + argon2id (memoryCost:19456/timeCost:2) + 8h DB sessions + token crypto + Zod schemas + catch-all /api/auth route registered**

## Performance

- **Duration:** ~7 minutes
- **Started:** 2026-05-08T16:23:05Z
- **Completed:** 2026-05-08T16:30:00Z
- **Tasks:** 2 (TDD task had RED + GREEN commits)
- **Files created:** 7

## Accomplishments

- `tokens.ts` + `schemas.ts` with 13 tests (6 token + 7 schema) — all passing — as foundation for invitation/reset and form validation
- `auth()` lazy Better Auth singleton with exact plan spec values: Drizzle adapter, `disableSignUp:true`, argon2id at Vercel-tuned work factors, 8h sliding DB session, 5-min cookieCache, all additionalFields, email-lowercase hook, nextCookies plugin
- `/api/auth/[...all]` catch-all route registered in Next.js build route list; `npm run build` exits 0
- 55/55 tests passing (42 pre-existing + 13 new)

## Task Commits

1. **Test(06-03) — RED: failing tests for tokens.ts + schemas.ts** — `381e02d`
2. **Feat(06-03) — GREEN: implement tokens.ts + schemas.ts** — `3e448f7`
3. **Feat(06-03): auth instance + client + catch-all route** — `0df495f`

## Files Created

- `src/lib/auth/tokens.ts` — 32-byte randomBytes → base64url plaintext + SHA-256 hex hash; exports `generateToken()` and `hashToken()`
- `src/lib/auth/tokens.test.ts` — 6 tests: shape, charset, hex length, SHA-256 derivation, roundtrip, 1000-call collision check
- `src/lib/auth/schemas.ts` — `loginSchema` (email + 8–128 char password) + `setPasswordSchema` (with confirm-match refine); pure Zod, no directives
- `src/lib/auth/schemas.test.ts` — 7 tests: login valid/email-invalid/short-password/long-password; set-password valid/mismatch/too-short
- `src/lib/auth/index.ts` — lazy `auth()` singleton; full Better Auth config including drizzleAdapter, emailAndPassword, session, user.additionalFields, databaseHooks, plugins
- `src/lib/auth/client.ts` — `'use client'`; `createAuthClient({ baseURL: process.env.NEXT_PUBLIC_APP_URL })`
- `app/api/auth/[...all]/route.ts` — `force-dynamic`; `GET`/`POST` async functions delegating to `toNextJsHandler(auth())`

## Better Auth API Methods (for Plan 06-04)

| Method | Location | Purpose |
|--------|----------|---------|
| `auth().api.getSession({ headers })` | core | Retrieve session from request headers — used in requireUser() |
| `auth().api.signUpEmail({ body })` | core | Create user account — used in createInvitation action |
| `auth().api.setPassword({ body })` | core | Update password — used in invite/reset redemption |
| `auth().api.revokeSessions({ body })` | core | Revoke ALL sessions for current user context |
| `revokeUserSession` / `revokeUserSessions` | **admin plugin only** | Per `dist/plugins/admin/admin.d.mts` — Plan 06-04 needs to add the admin plugin OR use direct Drizzle delete on sessions table to revoke another user's sessions |

**CRITICAL for Plan 06-04:** `auth().api.revokeUserSessions` (with `userId`) is NOT in the core API — it requires the Better Auth admin plugin (`adminPlugin()` in betterAuth config). Alternatively, Plan 06-04 can do `await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId))` directly via Drizzle.

## Decisions Made

1. **Lazy singleton pattern** — `auth()` function instead of `export const auth = betterAuth(...)`. The const form calls `db()` at module-evaluation time; during `next build` static analysis, the route module is loaded, which triggers the DbError ("DATABASE_URL not set"). Lazy init defers this to the first HTTP request.

2. **Route handler wraps GET/POST in functions** — `export function GET(req) { return handler().GET(req); }` rather than `export const { GET, POST } = toNextJsHandler(auth())`. The const form also runs at module-evaluation time.

3. **argon2 work factors confirmed**: `{ algorithm: 2 /*argon2id*/, memoryCost: 19456, timeCost: 2, parallelism: 1 }` per RESEARCH.md §9 P10 Vercel cold-start tuning.

4. **revokeUserSessions in admin plugin only** — documented above. Plan 06-04 planner must account for this.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy auth singleton to fix next build DATABASE_URL error**
- **Found during:** Task 2 (build verification)
- **Issue:** `export const auth = betterAuth({ database: drizzleAdapter(db(), ...) })` calls `db()` at module-evaluation time. During `next build`, Next.js evaluates the route module to collect page data, triggering `createDb()` which throws `DbError: DATABASE_URL env var is not set`. Build failed with "Failed to collect page data for /api/auth/[...all]".
- **Fix:** Wrapped `betterAuth(...)` in `createAuth()` function, exported `auth()` as a lazy memoized function (mirrors `db()` pattern). Route uses `GET/POST` async wrapper functions instead of const destructuring. No callers exist yet (first time this module is created), so no cascading changes needed.
- **Files modified:** `src/lib/auth/index.ts`, `app/api/auth/[...all]/route.ts`
- **Verification:** `npm run build` exits 0; `/api/auth/[...all]` visible in route list
- **Committed in:** `0df495f`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug preventing build)
**Impact on plan:** Necessary for correctness. The lazy pattern is consistent with the existing `db()` singleton pattern. No scope creep. Plan 06-04 must call `auth().api.getSession()` (function call) not `auth.api.getSession()`.

## Issues Encountered

- `revokeUserSessions` (to revoke another user's sessions) requires the Better Auth admin plugin, which is not configured in this plan's spec. Plan 06-04's `disableUser` action will need to either add the admin plugin or use direct Drizzle delete. Documented as CRITICAL note for Plan 06-04.

## Known Stubs

None — this plan creates infrastructure only (auth instance, token crypto, Zod schemas). No UI or data-flow code.

## Threat Flags

None beyond what was already scoped in the plan's threat model (T-06-03-01 through T-06-03-09). All mitigations implemented:
- T-06-03-01: `disableSignUp: true` + Better Auth generic error response
- T-06-03-02: `role.input=false` + `sessionVersion.input=false` in additionalFields
- T-06-03-03: `nextCookies()` plugin + SameSite cookie from Better Auth
- T-06-03-05: argon2 tuned work factors (19MB/2 rounds)
- T-06-03-07: `email.toLowerCase()` in databaseHooks.user.create.before

## Next Phase Readiness

- Plan 06-04 (`require.ts` + `proxy.ts` + auth actions): can import `auth()`, call `auth().api.getSession()`, call `generateToken()`, `hashToken()`. **Must handle revokeUserSessions via admin plugin or direct Drizzle delete.**
- Plan 06-05 (login/invite/reset forms): can import `authClient`, `loginSchema`, `setPasswordSchema`, `hashToken`
- Plan 06-06 (UserMenu logout): can import `authClient.signOut`
- All downstream plans unblocked.

---

## Self-Check: PASSED

- [x] `src/lib/auth/index.ts` exists and exports `auth`
- [x] `src/lib/auth/client.ts` exists and exports `authClient`
- [x] `src/lib/auth/tokens.ts` exists and exports `generateToken`, `hashToken`, `TokenPair`
- [x] `src/lib/auth/schemas.ts` exists and exports `loginSchema`, `setPasswordSchema`, `LoginInput`, `SetPasswordInput`
- [x] `app/api/auth/[...all]/route.ts` exists and exports `GET`, `POST`
- [x] Commits `381e02d`, `3e448f7`, `0df495f` exist in git log
- [x] `npm run typecheck` exits 0
- [x] `npm test` 55/55 passing
- [x] `npm run lint:check` exits 0
- [x] `npm run check:no-vercel-imports` exits 0
- [x] `npm run build` exits 0 — `/api/auth/[...all]` in route list
- [x] `grep -c "memoryCost: 19456" src/lib/auth/index.ts` = 2 (comment + code)
- [x] `grep -c "disableSignUp: true" src/lib/auth/index.ts` = 2 (comment + code)
- [x] `grep -c "expiresIn: 60 \* 60 \* 8" src/lib/auth/index.ts` = 1

*Phase: 06-auth-shell*
*Completed: 2026-05-08*
