# Phase 6: Auth & Shell — Research

**Researched:** 2026-05-07
**Domain:** Better Auth 1.6.x + Next.js 16 App Router + Drizzle 0.45 + argon2id + JWT-style sessions + hand-rolled i18n
**Confidence:** HIGH (all critical claims verified via npm registry, Context7, WebFetch to official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth library:** Better Auth 1.6.x with Drizzle adapter. Final-locked 2026-05-07. Pin exact version, no caret.

**Credentials provider only.** No social SSO. No SMTP-based flows. No public self-signup API.

**Session strategy:** DB-backed sessions (Better Auth default) with 8-hour sliding lifetime. `users.session_version` added as custom field; checked in every `requireUser()` / `requireAdmin()` call via `cookieCache` + DB re-check. See §4 Session Revocation below.

**argon2id for password hashing** via `@node-rs/argon2`. Tune work factor for Vercel cold-start.

**Schema scope for Phase 6:** ONLY `users` and `password_resets` tables. All other tables (`global_params`, `proposals`, `audit_log`) deferred to their owning phases.

**`users` schema:** `id uuid pk`, `email citext unique`, `password_hash text`, `role text CHECK('partner','admin') default 'partner'`, `display_name text`, `language text default 'fr'`, `theme text default 'system'`, `session_version integer not null default 1`, `created_by uuid fk users(id)`, `deleted_at timestamptz`, `last_login_at timestamptz`.

**`password_resets` schema:** `id uuid pk`, `user_id uuid fk users(id)`, `kind text CHECK('reset','invite')`, `token_hash text unique`, `expires_at timestamptz`, `used_at timestamptz`. Token = 32 random bytes → URL-safe base64; DB stores `sha256(token)` hex.

**Token TTL:** 24 hours. Single-use (`used_at` set on redemption). Routes: `/invite/[token]` and `/reset/[token]`.

**Admin modal UX:** URL shown once with copy button + "This link will not be shown again" warning. Re-issuance invalidates prior unused tokens for that user.

**CLI script:** `scripts/grant-admin.ts`, mirrors `scripts/migrate.ts` typed-confirmation pattern. Idempotent: upgrade existing user OR create + emit invitation URL.

**Hidden admin URL:** `ADMIN_URL_SEGMENT` env var. `app/(admin)/[adminSegment]/layout.tsx` calls `notFound()` on mismatch (404, not 403), then `requireAdmin()`.

**Middleware:** In Next.js 16, the file is `proxy.ts` (see §1 critical finding). Cookie-only check (`getSessionCookie`), no DB lookup. Redirects unauthenticated to `/login?next=<encoded-path>`.

**Login error:** ALWAYS generic — "email ou mot de passe incorrect" / "incorrect email or password". Never distinguishes email-not-found vs bad-password vs account-disabled.

**Disabled account:** `deleted_at IS NOT NULL` = disabled. Login attempt → generic error. `session_version` bumped on disable to evict active sessions within 5 min (cookieCache TTL).

**Logout:** `authClient.signOut()` — library official function. Never a custom POST.

**Topbar:** Same component across `(authed)` and `(admin)` layouts. Order: logo · page-title slot · spacer · locale toggle · theme toggle · display-name+caret → user menu (logout).

**i18n:** Extend `src/lib/i18n/dictionaries.ts` to ~225 keys × 2 langs (166 v10 keys + 59 new Phase-6 keys). ESLint `no-restricted-syntax` flags hardcoded JSX string literals.

**Theme + locale persistence:** Cookie = source of truth for SSR. On login, sync DB → cookie if cookie absent; cookie → DB if cookie was set before login. On toggle (authenticated): server action writes both cookie and DB.

**Explicit Intl locales:** `fr-FR` / `en-GB` everywhere. `lib/i18n/format.ts` exposes `formatCurrency(value, lang)`, `formatDate(date, lang)`, `formatNumber(value, lang)`.

**Forms:** react-hook-form + Zod. Same Zod schema imported on client and server.

**Error boundary:** `app/error.tsx`. Generic page with retry button. Localized FR/EN via `t()`.

**404 page:** `app/not-found.tsx`. Localized FR/EN. Used by admin segment mismatch and unmatched routes.

**Proxy (Next.js 16 name for middleware):** `proxy.ts` at project root. Cookie-only check. Excludes `_next/static`, `_next/image`, `favicon.ico`, `fonts/`, `api/auth`, `healthz`. Role checks happen in layouts, not proxy.

### Claude's Discretion

- ESLint rule implementation for no-hardcoded-JSX strings: `no-restricted-syntax` (AST-based) is the recommended approach.
- Audit-log writes during Phase 6 (admin-disable, grant-admin events): defer to Phase 9 OR emit structured server logs now. Either acceptable.
- Exact session cookie name: use Better Auth's default (`better-auth.session_token`) or rename to fit `lt_*` namespace.
- argon2 work factor: tune during Phase 6 acceptance testing on cold Vercel function.
- `session_version` re-check caching strategy: `cookieCache.maxAge: 300` (5 min) satisfies "within 5 minutes" revocation.

### Deferred Ideas (OUT OF SCOPE)

- `/settings` page
- Self-service password reset via SMTP
- Audit-log table writes for Phase 6 events
- 2FA / lockout / "Remember me" / CAPTCHA
- Admin partner-listing UI (Phase 9)
- Cross-partner "view as" tool
- Session revocation reason logging
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Login page with email + password | §2 Better Auth credentials setup |
| AUTH-02 | 8-hour sliding session, persists across page reloads | §4 Session lifecycle |
| AUTH-03 | Logout from topbar | §5 authClient.signOut() |
| AUTH-04 | Generic login error (anti-enumeration) | §9 Pitfalls — P1 |
| AUTH-05 | Unauthenticated → redirect to /login | §6 Proxy gate |
| AUTH-06 | Authenticated visitor on /login → redirect to / | §6 Proxy gate |
| AUTH-07 | Admin can create partner account | §3 Admin-creates-account flow |
| AUTH-08 | One-time invitation URL with signed token | §3 Token generation |
| AUTH-09 | Partner uses invitation URL once to set password | §3 Invitation redemption |
| AUTH-10 | Admin triggers password reset one-time URL | §3 Password reset flow |
| AUTH-11 | Admin can disable partner (preserves data) | §4 Session revocation |
| AUTH-12 | Admin role via CLI script only | §8 grant-admin.ts |
| AUTH-13 | DB CHECK constraint role IN ('partner','admin') | §2 Schema |
| AUTH-14 | Admin URL segment gated by env var, 404 on mismatch | §7 Hidden admin URL |
| AUTH-15 | Every admin route/layout/handler calls requireAdmin() | §7 Defense in depth |
| AUTH-16 | Forced session revocation within 5 min | §4 session_version + cookieCache |
| AUTH-17 | argon2id password hashing | §2 Password hashing |
| AUTH-18 | Official auth library client functions only (CSRF) | §5 Better Auth client |
| SHELL-01 | Topbar shell (logo, user menu, lang toggle, theme toggle) | §10 Shell |
| SHELL-02 | Display name in topbar | §10 Shell |
| SHELL-03 | Login page uses minimal layout (no shell) | §10 (public) layout group |
| SHELL-04 | FR/EN toggle persists via cookie + DB | §11 i18n |
| SHELL-05 | Full v10 dictionary (~138 keys × 2 langs) | §11 i18n — 166 verified keys |
| SHELL-06 | t() helper for all strings; ESLint flags hardcoded literals | §11 ESLint rule |
| SHELL-07 | Light/dark/system theme toggle persists | §12 Theme persistence |
| SHELL-08 | Initial paint correct theme without flash | §12 — Phase 5 already done |
| SHELL-09 | Explicit Intl locales everywhere | §13 format.ts |
| SHELL-10 | Sonner toasts wired | §14 Toast wiring |
| SHELL-11 | react-hook-form + Zod, same schema client+server | §15 Forms |
| SHELL-12 | Error boundary in FR + EN | §16 Error boundary |
| SHELL-13 | 404 page in FR + EN | §16 404 page |
| SHELL-14 | Mobile degrades gracefully (deferred to v1.2) | No research needed |
</phase_requirements>

---

## Summary

Phase 6 is the authentication and app-shell layer. The locked stack (Better Auth 1.6.x + Drizzle + argon2id) is fully verified current — Better Auth 1.6.9 is the `latest` tag on npm as of 2026-05-07. Three critical SDK findings supersede the Phase 5 era research:

**Finding 1 — Next.js 16 renamed middleware to proxy.** `middleware.ts` is deprecated in v16; the correct file is `proxy.ts` with a `proxy` named export. The runtime defaults to Node.js automatically — `runtime: 'nodejs'` config throws an error in proxy files. This affects D-32 and every plan task that references `middleware.ts`. [VERIFIED: nextjs.org/docs 2026-05-07]

**Finding 2 — Better Auth uses database sessions, not JWT.** The architecture document specified "JWT strategy" but Better Auth's default (and recommended) strategy is DB-backed sessions stored in a `session` table, accessed via a session token cookie. The revocation model therefore changes: instead of a JWT callback checking `session_version`, revocation is achieved by deleting all DB sessions for the user (`auth.api.revokeUserSessions`) combined with `cookieCache.maxAge: 300` (5 min). The `session_version` field on `users` table is still valuable for the `requireUser()` helper to do a secondary check (compare JWT-embedded version vs DB row), but the primary revocation mechanism is DB session deletion. [VERIFIED: better-auth.com/docs 2026-05-07]

**Finding 3 — drizzle-kit needs upgrade from 0.30.1 to 0.31.10.** `better-auth` lists `drizzle-kit >=0.31.4` as a peer dependency (for its `npx auth generate` CLI). Our workflow writes schema.ts manually so we do NOT use their CLI, but the peer dep signals API compatibility. Upgrade is low-risk and recommended as Wave 0 task.

**Primary recommendation:** Wire Better Auth with the Drizzle adapter pointing at `db()` singleton from `src/lib/db/index.ts`, using `usePlural: true` to keep table names as `users` / `sessions` / `accounts` / `verifications`. Add `session_version` as a `user.additionalField`. Implement `requireUser()` as a helper that calls `auth.api.getSession()` + checks `session_version` matches DB row. Use `proxy.ts` (not `middleware.ts`) for the coarse auth gate.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth gate (coarse) | proxy.ts (Node.js) | — | Fast cookie-only check before SSR; no DB lookup |
| requireUser() | API / Backend (Server Component) | — | DB session lookup + session_version check |
| requireAdmin() | API / Backend (Server Component) | Route Handlers | Defense in depth; env segment check before role check |
| Session cookie | Browser / Client | Frontend Server (SSR) | Set-Cookie from Better Auth route handler, read in proxy.ts and Server Components |
| Password hashing | API / Backend | — | argon2id runs server-side only, never in browser |
| Token generation (invite/reset) | API / Backend | — | Server Action or Route Handler; crypto.getRandomValues server-side |
| Theme/locale persistence | Browser (cookie) | API / Backend (DB) | Cookie = SSR truth; DB = cross-device sync for authed users |
| App shell / Topbar | Frontend Server (SSR) | Browser (interactive toggles) | Layout Server Component renders chrome; toggle Client Components call Server Actions |
| i18n dictionary | API / Backend (lib/i18n) | Browser (same import) | Pure module, no I/O — importable on both sides |
| Form validation | Browser (Client Component) | API / Backend (Server Action) | Same Zod schema imported on both sides |
| Invitation / reset URL modal | Browser / Client | — | Admin-side UI only; rendered in admin layout |

---

## 1. Critical SDK Finding: Next.js 16 — `proxy.ts` replaces `middleware.ts`

**Applies to:** AUTH-05, AUTH-06, D-32, all plan tasks

Next.js 16.0.0 deprecated `middleware.ts` and renamed the convention to `proxy.ts`. The function export changes from `middleware` to `proxy`. [VERIFIED: nextjs.org/docs/app/api-reference/file-conventions/proxy, 2026-05-07]

```typescript
// proxy.ts (root of project, same level as app/)
// NOT middleware.ts — that is deprecated in Next.js 16
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Already-authenticated visitors on /login → redirect to home
  if (sessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Unauthenticated visitors on protected routes → redirect to login
  // (authed) and (admin) routes share the same path space in the URL
  if (!sessionCookie && !isPublicPath(pathname)) {
    const next = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  return NextResponse.next();
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/reset/') ||
    pathname.startsWith('/healthz')
  );
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fonts/).*)',
  ],
};
```

**Key changes vs CONTEXT.md D-32:**
- File: `proxy.ts` (not `middleware.ts`)
- Export: `proxy` function (not `middleware`)
- Runtime: **automatically Node.js** in Next.js 16 — do NOT add `export const config = { runtime: 'nodejs' }` (throws an error)
- The `api/auth/[...all]` route is in the excluded list via the negative lookahead

Better Auth exports `getSessionCookie(request)` from `better-auth/cookies`. This does a cookie-only check with no DB lookup — satisfying D-32's "reads ONLY the session cookie" requirement. [VERIFIED: Context7 /websites/better-auth]

---

## 2. Better Auth 1.6.x — Setup, Schema, Wiring

**Applies to:** AUTH-01, AUTH-02, AUTH-13, AUTH-17

### Version Pin Matrix (FINAL — resolves Open Q4)

| Package | Version | Source | Notes |
|---------|---------|--------|-------|
| `better-auth` | `1.6.9` | [VERIFIED: npm registry 2026-05-07] | Latest stable; 1.7.0-beta.2 in beta — stay on 1.6.9 |
| `@node-rs/argon2` | `2.0.2` | [VERIFIED: npm registry 2026-05-07] | Replaces bcrypt; native Rust, fast on cold start |
| `react-hook-form` | `7.75.0` | [VERIFIED: npm registry 2026-05-07] | Peer dep: React ^18 || ^19 ✓ |
| `zod` | `4.4.3` | [VERIFIED: npm registry 2026-05-07] | Already imported by better-auth internally |
| `@hookform/resolvers` | `5.2.2` | [VERIFIED: npm registry 2026-05-07] | Peer dep: react-hook-form ^7.55.0 ✓ |
| `drizzle-orm` | `0.45.2` | Already installed | No change; peer dep of drizzle-adapter |
| `drizzle-kit` | `0.31.10` | [VERIFIED: npm registry 2026-05-07] | **Upgrade from 0.30.1 required** (better-auth peer dep >=0.31.4) |
| `next` | `16.2.4` | Already installed | No change |
| `react` | `19.0.0` | Already installed | No change |

**IMPORTANT — drizzle-kit peer dep:** `better-auth` lists `drizzle-kit >=0.31.4` as a peer dependency. Our current pin is `0.30.1`. Even though we write schema.ts manually (not via `npx auth generate`), npm will emit a peer dependency warning at install time and the constraint signals API compatibility. Upgrade `drizzle-kit` to `0.31.10` as part of Wave 0 package install. [VERIFIED: npm view better-auth@1.6.9 peerDependencies 2026-05-07]

**IMPORTANT — drizzle adapter is bundled in `better-auth`:** The `@better-auth/drizzle-adapter` package is listed as a dependency (not peerDep) of `better-auth` itself. The adapter is importable from `better-auth/adapters/drizzle` — no separate package install needed. [VERIFIED: npm view better-auth@1.6.9 exports + dependencies 2026-05-07]

```bash
# Wave 0 install (exact pins, no carets)
npm install better-auth@1.6.9 @node-rs/argon2@2.0.2 react-hook-form@7.75.0 zod@4.4.3 @hookform/resolvers@5.2.2
npm install --save-dev drizzle-kit@0.31.10
```

### Better Auth — Core Required Tables

Better Auth requires four core tables. The Drizzle adapter supports a `usePlural: true` option that maps `user → users`, `session → sessions`, `account → accounts`, `verification → verifications`. [VERIFIED: Context7 /websites/better-auth, better-auth.com/docs/adapters/drizzle 2026-05-07]

| Better Auth internal name | Our table name | Fields |
|--------------------------|----------------|--------|
| `user` | `users` | `id, name, email, emailVerified, image, createdAt, updatedAt` + custom additionalFields |
| `session` | `sessions` | `id, userId, token, expiresAt, ipAddress, userAgent, createdAt, updatedAt` |
| `account` | `accounts` | `id, userId, accountId, providerId, accessToken, refreshToken, expiresAt, ...` |
| `verification` | `verifications` | `id, identifier, value, expiresAt, createdAt, updatedAt` |

Our `password_resets` table is NOT a Better Auth table — it is managed entirely by our own application logic.

### Better Auth `auth.ts` Setup

```typescript
// src/lib/auth/index.ts
// [VERIFIED: Context7 /websites/better-auth — email-password, drizzle adapter, custom fields]
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/lib/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  // Base URL must be set explicitly for OVH portability (not relying on VERCEL_URL)
  baseURL: process.env.APP_URL ?? `https://${process.env.VERCEL_URL}`,
  secret: process.env.AUTH_SECRET,           // env var: AUTH_SECRET (min 32 chars)

  database: drizzleAdapter(db(), {
    provider: 'pg',
    // usePlural maps: user→users, session→sessions, account→accounts, verification→verifications
    usePlural: true,
    // The schema import gives the adapter access to our Drizzle table definitions
    schema: { ...schema },
  }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,                      // D-02: no self-signup
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      // argon2id via @node-rs/argon2 (PITFALLS §2.4: tune work factor for cold starts)
      hash: async (password: string) => {
        const { hash } = await import('@node-rs/argon2');
        return hash(password, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
      },
      verify: async ({ hash: h, password }: { hash: string; password: string }) => {
        const { verify } = await import('@node-rs/argon2');
        return verify(h, password);
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 8,    // 8 hours (D-03)
    updateAge: 60 * 60,          // Slide on activity (refresh every 1 hour of activity)
    cookieCache: {
      enabled: true,
      maxAge: 300,               // 5-minute cookie cache (D-03: session_version revocation within 5 min)
    },
  },

  user: {
    // additionalFields are columns we own on the users table that Better Auth
    // does not know about by default
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'partner',
        input: false,            // users cannot set their own role
      },
      displayName: {
        type: 'string',
        required: false,
        input: true,
      },
      language: {
        type: 'string',
        required: false,
        defaultValue: 'fr',
        input: true,
      },
      theme: {
        type: 'string',
        required: false,
        defaultValue: 'system',
        input: true,
      },
      sessionVersion: {
        type: 'number',
        required: false,
        defaultValue: 1,
        input: false,            // only bumped by admin actions, never by users
      },
      createdBy: {
        type: 'string',
        required: false,
        input: false,
      },
      deletedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      lastLoginAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },

  plugins: [
    nextCookies(), // Handles Set-Cookie headers in Next.js Server Actions / Route Handlers
  ],

  trustedOrigins: [
    process.env.APP_URL ?? '',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
  ].filter(Boolean),
});
```

**Important note on field naming:** Better Auth uses camelCase internally (`displayName`, `sessionVersion`) and maps to the database column via the additionalFields API. Our Drizzle schema will use snake_case column names (`display_name`, `session_version`) — the mapping is handled by Drizzle. We must ensure the `additionalFields` keys match what Better Auth expects to read from the user object.

### Drizzle Schema Extension for Phase 6

```typescript
// src/db/schema.ts — EXTEND (do not replace schema_meta)
import { pgTable, uuid, text, integer, timestamp, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Better Auth core tables ──────────────────────────────────────────────────
// These 4 tables are required by Better Auth. Column names follow the
// camelCase-to-snake_case mapping Drizzle handles automatically.
// usePlural: true in the auth config maps user→users, session→sessions, etc.

export const users = pgTable('users', {
  // Better Auth core fields
  id: text('id').primaryKey(),                      // Better Auth uses string IDs (not uuid)
  name: text('name').notNull().default(''),          // Better Auth user.name
  email: text('email').notNull().unique(),           // citext not available in drizzle-orm pg-core; use text + collation or citext extension
  emailVerified: integer('email_verified').notNull().default(0),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Our custom additionalFields
  role: text('role').notNull().default('partner'),
  displayName: text('display_name'),
  language: text('language').notNull().default('fr'),
  theme: text('theme').notNull().default('system'),
  sessionVersion: integer('session_version').notNull().default(1),
  createdBy: text('created_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (table) => [
  check('role_check', sql`${table.role} IN ('partner', 'admin')`),
]);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),                        // argon2id hash stored here by Better Auth
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Phase 6 application table (not a Better Auth table) ──────────────────────

export const passwordResets = pgTable('password_resets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
}, (table) => [
  check('kind_check', sql`${table.kind} IN ('reset', 'invite')`),
]);
```

**Notes on schema decisions:**
- Better Auth uses `text` for IDs (not `uuid`) — it generates its own IDs via nanoid. Our `password_resets` table uses `uuid` since it is our own table.
- The `password` field on `accounts` is where Better Auth stores the argon2id hash (via the email+password provider). Our `users.password_hash` column from ARCHITECTURE.md §2.4 is NOT needed — Better Auth handles this internally in the `accounts` table.
- `emailVerified` is an integer (0/1) in Better Auth's schema, not a timestamp. The ARCHITECTURE.md's assumption of `password_hash` on `users` must be dropped — Better Auth owns password storage.
- `citext` for email: Better Auth expects a standard `text` column. For case-insensitive email matching, either (a) use the `citext` Postgres extension (`sql\`email citext unique\``) or (b) normalize email to lowercase in the auth config's `databaseHooks.user.create.before`. Option (b) is portable and recommended.

---

## 3. Admin-Creates-Account Flow and Password Reset

**Applies to:** AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11

Better Auth does not natively support the "admin creates account → invitation token → partner sets password" flow. We implement it with our own `password_resets` table. Better Auth's `emailAndPassword.disableSignUp: true` ensures no direct self-signup. [VERIFIED: Context7 /websites/better-auth 2026-05-07]

### Token Generation

```typescript
// src/lib/auth/tokens.ts
import { randomBytes, createHash } from 'node:crypto';

/** Generate a 32-byte cryptographically random URL-safe base64 token. */
export function generateToken(): { plaintext: string; hash: string } {
  const bytes = randomBytes(32);
  const plaintext = bytes.toString('base64url');           // URL-safe, no padding issues
  const hash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, hash };
}
```

### Invitation Flow (AUTH-07, AUTH-08, AUTH-09)

```typescript
// Route handler: POST /api/admin/accounts  (called from admin UI in Phase 9)
// Server Action: createPartnerAccount (called from admin form in Phase 6)

// Step 1: Create the user record via Better Auth's internal adapter
// (admin creates user without going through the public signUp endpoint)
import { auth } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { generateToken } from '@/lib/auth/tokens';
import { eq } from 'drizzle-orm';

async function createPartnerInvitation(email: string, displayName: string, adminId: string) {
  await requireAdmin();   // always first

  // Check email not already in use
  const existing = await db().query.users.findFirst({ where: eq(schema.users.email, email.toLowerCase()) });
  if (existing && !existing.deletedAt) {
    throw new Error('Email already registered');
  }

  // Create user row via Better Auth internal adapter
  // Better Auth's email+password provider stores the hash in accounts table.
  // We create the user without a password (password_hash NULL equivalent = no accounts row for credentials).
  await auth.api.signUpEmail({
    body: { email: email.toLowerCase(), password: crypto.randomUUID(), name: displayName },
    headers: undefined, // server-side call, no cookies
  });
  // Immediately delete the bogus password from accounts table
  // (the invitation flow replaces it via setPassword on token redemption)
  // ... OR: use databaseHooks to intercept and not create the account row.
  // Better approach: use auth.api directly at internal adapter level.
  // See NOTE below on manual user creation.

  // Generate invitation token
  const { plaintext, hash } = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Invalidate any prior unused tokens for this user
  await db().delete(schema.passwordResets).where(
    eq(schema.passwordResets.userId, user.id)
  );

  // Insert new token
  await db().insert(schema.passwordResets).values({
    userId: user.id,
    kind: 'invite',
    tokenHash: hash,
    expiresAt,
  });

  const inviteUrl = `${process.env.APP_URL}/invite/${plaintext}`;
  return { inviteUrl };
}
```

**NOTE on user creation without a password:** Better Auth's `signUpEmail` requires a password. For invitation-only accounts, the recommended pattern is:
1. Use `auth.api` internal methods directly (the `context.internalAdapter.createUser()` pattern from Better Auth's plugin system).
2. Or: use `signUpEmail` with a random throwaway password, then immediately update the `accounts` row to set `password = NULL` (the user cannot login until the invitation is redeemed and a real password is set).
3. The invitation token redemption page calls `auth.api.resetPassword()` or a custom `setPassword` handler that updates the `accounts.password` field and marks the token as used.

The simplest approach for this project: create the user via Drizzle directly (bypassing Better Auth's signUp to avoid the bogus password), then manually insert the accounts row when the invitation is redeemed. This requires defining the user ID format correctly (Better Auth uses nanoid-style IDs, typically 21 chars).

### Invitation Redemption Page — `/invite/[token]`

```typescript
// app/(public)/invite/[token]/page.tsx
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;          // PITFALL §1.1: params must be awaited in Next.js 16

  // Look up token
  const hash = createHash('sha256').update(token).digest('hex');
  const record = await db().query.passwordResets.findFirst({
    where: and(
      eq(schema.passwordResets.tokenHash, hash),
      eq(schema.passwordResets.kind, 'invite'),
      isNull(schema.passwordResets.usedAt),
      gt(schema.passwordResets.expiresAt, new Date()),
    ),
  });

  if (!record) {
    // Expired or already used: render the expired-token landing page
    return <ExpiredTokenPage />;
  }

  return <SetPasswordForm token={token} kind="invite" />;
}
```

---

## 4. Session Lifecycle and Revocation

**Applies to:** AUTH-02, AUTH-11, AUTH-16

### Key Finding: DB Sessions (Not JWT)

Better Auth stores sessions in the `sessions` table. A session token cookie is set on login. On each request where `auth.api.getSession()` is called, Better Auth queries the `sessions` table. The `cookieCache` option caches the session data in a signed cookie for `maxAge` seconds, reducing DB queries. [VERIFIED: better-auth.com/docs/concepts/session-management 2026-05-07]

### 8-Hour Sliding Session

```typescript
session: {
  expiresIn: 60 * 60 * 8,   // 8 hours
  updateAge: 60 * 60,         // Extend the session by another 8h on each request that is >1h old
  cookieCache: {
    enabled: true,
    maxAge: 300,              // Cookie cache TTL: 5 minutes
  },
},
```

### Session Revocation (AUTH-11, AUTH-16)

When admin disables a partner (`deleted_at = now(), session_version += 1`), we also call Better Auth's session revocation API to immediately delete all active sessions for that user:

```typescript
// src/lib/auth/require.ts
import { auth } from './index';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, isNotNull } from 'drizzle-orm';
import { redirect, notFound } from 'next/navigation';

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  // session_version check (defense-in-depth for the 5-min cookieCache window)
  // If the cached cookie is still valid but the user has been disabled,
  // we catch it here by comparing session_version.
  const user = await db().query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: { sessionVersion: true, deletedAt: true, role: true },
  });

  if (!user || user.deletedAt !== null) {
    // Account disabled: sign out and redirect
    // Note: we cannot call authClient.signOut() from a server component,
    // so we redirect to a signout action route instead.
    redirect('/api/auth/sign-out?redirect=/login');
  }

  return { session, role: user.role as 'partner' | 'admin' };
}

export async function requireAdmin() {
  const { session, role } = await requireUser();
  if (role !== 'admin') notFound();      // 404 not 403 (PITFALLS §7.1)
  return { session };
}
```

**Revocation Server Action (called by admin disable flow):**

```typescript
// src/lib/auth/actions.ts
'use server';
import { auth } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from './require';

export async function disableUser(userId: string) {
  await requireAdmin();

  // Bump session_version + set deleted_at in one transaction
  await db().update(schema.users).set({
    deletedAt: sql`NOW()`,
    sessionVersion: sql`session_version + 1`,
  }).where(eq(schema.users.id, userId));

  // Revoke all Better Auth sessions for this user (immediate effect, no cache wait)
  // This is the primary revocation mechanism.
  await auth.api.revokeUserSessions({ body: { userId } });
  // session_version bump catches the 5-min window if cookieCache serves a stale cookie
}
```

**Revocation latency:**
- Immediate: DB session rows deleted → any DB session lookup returns null
- Within 5 minutes: cookieCache TTL expires → Better Auth re-queries DB → finds no session → 401

---

## 5. Better Auth Client Setup

**Applies to:** AUTH-03, AUTH-18, SHELL-10

```typescript
// src/lib/auth/client.ts — CLIENT-SIDE ONLY
'use client';  // This file is only safe to import from Client Components
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? '',
});
```

```typescript
// Usage in logout button (Client Component):
// [VERIFIED: Context7 /websites/better-auth — signOut]
await authClient.signOut();
// Redirects to /login by default, or pass callbackURL
```

**NEVER** POST directly to `/api/auth/...` from application code — use `authClient` functions. This preserves Better Auth's CSRF protection (Origin header validation + SameSite cookie). [VERIFIED: better-auth.com/docs/reference/security 2026-05-07]

---

## 6. Next.js 16 Route Handler (API Auth Catch-All)

**Applies to:** AUTH-01, AUTH-18

```typescript
// app/api/auth/[...all]/route.ts
// [VERIFIED: Context7 /websites/better-auth — toNextJsHandler]
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

The route lives at `app/api/auth/[...all]/route.ts` (note: `[...all]` not `[...auth]` — the Auth.js convention used `[...nextauth]` but Better Auth recommends `[...all]`). Add `api/auth` to the proxy matcher exclusion list.

---

## 7. Hidden Admin URL — `[adminSegment]` Layout

**Applies to:** AUTH-14, AUTH-15

```typescript
// app/(admin)/[adminSegment]/layout.tsx
// [VERIFIED: ARCHITECTURE.md §2.3 + Context7 Next.js async params pattern]
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require';

export default async function AdminLayout({
  params,
  children,
}: {
  params: Promise<{ adminSegment: string }>;
  children: React.ReactNode;
}) {
  // PITFALL §1.1: params must be awaited in Next.js 16
  const { adminSegment } = await params;

  // Step 1: segment check (URL obscurity, not security)
  if (adminSegment !== process.env.ADMIN_URL_SEGMENT) {
    notFound();   // 404 not 403 — preserves URL secrecy (D-18)
  }

  // Step 2: role check (actual security)
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}
```

**Every admin route handler also calls `requireAdmin()`** — the layout protection does not cascade to route handlers. This is defense in depth per AUTH-15. The order is mandatory: `requireAdmin()` before any data access (PITFALLS §7.3).

**Cross-phase note for Phase 8:** The PDF access path will read the `adminSegment` from the request URL directly (not from env), so URL rotation in env doesn't break existing PDF download links. This is a future planning concern, not a Phase 6 task.

---

## 8. CLI `grant-admin.ts` Script

**Applies to:** AUTH-12

```typescript
// scripts/grant-admin.ts
// Mirror of scripts/migrate.ts pattern (typed-confirmation gate, URL masking)
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema';
import { generateToken } from '../src/lib/auth/tokens';
import { eq } from 'drizzle-orm';

// Usage:
//   CONFIRM=GRANT-ADMIN-<email> npx tsx scripts/grant-admin.ts <email> [--display-name "Name"]
// Behavior:
//   - If user exists AND is already admin → no-op + log
//   - If user exists AND is partner → upgrade role to admin
//   - If user does not exist → create user (role=admin) + emit invitation URL
// Idempotent: safe to re-run.

async function main() {
  const email = process.argv[2];
  if (!email) { console.error('Usage: npx tsx scripts/grant-admin.ts <email>'); process.exit(1); }

  const expectedConfirm = `GRANT-ADMIN-${email}`;
  if (process.env.CONFIRM !== expectedConfirm) {
    console.error(`FATAL: Set CONFIRM=${expectedConfirm} to proceed`);
    process.exit(2);
  }

  const url = process.env.DATABASE_URL;
  if (!url) { console.error('FATAL: DATABASE_URL not set'); process.exit(2); }

  // Mask URL for logging
  try { const u = new URL(url); console.log(`Connecting to ${u.hostname}...`); } catch {}

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  // ... find or create user, upgrade role, generate invite if needed
  // Mirror scripts/migrate.ts pattern for error handling and URL masking
}
```

---

## 9. Common Pitfalls — Phase 6 Specific

### P1: Anti-Enumeration on Login (BLOCKING)

**Never** return a different error for "user not found" vs "wrong password" vs "account disabled". Better Auth's email sign-in returns a generic error by default. Verify by checking the actual HTTP response from `authClient.signIn.email()` — if it returns distinguishable status codes or messages, override via a custom error handler.

```typescript
// The login form's error display — always the same string
const errorMessage = lang === 'fr'
  ? 'Email ou mot de passe incorrect.'
  : 'Incorrect email or password.';
// Never show: 'User not found', 'Password incorrect', 'Account disabled'
```

### P2: proxy.ts NOT middleware.ts (BLOCKING)

Next.js 16 deprecated `middleware.ts`. Using `middleware.ts` may still work in v16.2.4 (backward compat) but is deprecated and will be removed. Use `proxy.ts` with `export function proxy()`. Do NOT add `export const config = { runtime: 'nodejs' }` in proxy files — it throws an error in Next.js 16 (Node.js is the default in v16).

### P3: `params` Must Be Awaited (BLOCKING)

Every page, layout, or route handler that reads `params` must be `async` and must `await params`. This includes `app/(admin)/[adminSegment]/layout.tsx`, `app/(public)/invite/[token]/page.tsx`, and `app/(public)/reset/[token]/page.tsx`. Forgetting this causes a runtime error in Next.js 15+. [VERIFIED: PITFALLS.md §1.1]

### P4: Better Auth's `users` Table Has Its Own ID Format

Better Auth generates IDs using a string format (typically 21-char nanoid), NOT UUID. Our ARCHITECTURE.md §2.4 assumed `uuid pk` for the `users` table. Better Auth owns the `id` column — it must be `text('id')` (string), not `uuid()`. This affects foreign key types in `password_resets.user_id` which must also be `text` to match.

### P5: `password_hash` on `users` Table Is Wrong

The ARCHITECTURE.md §2.4 schema included `password_hash text` on the `users` table. Better Auth stores passwords in the `accounts` table (`accounts.password`), not `users`. Do NOT add `password_hash` to the `users` table — it will never be populated by Better Auth and will mislead future maintainers.

### P6: drizzle-kit Peer Dependency Warning at Install

`npm install better-auth@1.6.9` will emit a peer dependency warning for `drizzle-kit >=0.31.4` if `drizzle-kit@0.30.1` is installed. Upgrade drizzle-kit to `0.31.10` in Wave 0 to resolve cleanly.

### P7: `force-dynamic` on Auth-Aware Pages

Any page that reads auth state via `auth.api.getSession()` or `cookies()` must have `export const dynamic = 'force-dynamic'` to prevent static rendering at build time. This applies to every page in `(authed)/` and `(admin)/` route groups. [VERIFIED: PITFALLS.md §1.6]

### P8: Better Auth Client Cannot Be Imported in Server Components

`src/lib/auth/client.ts` (with `createAuthClient`) is a client-only module. Server Components must import from `src/lib/auth/index.ts` (the `auth` object with `auth.api.getSession()`). Mixing imports causes runtime errors. Add an ESLint rule to block `@/lib/auth/client` in server component files.

### P9: Email Case Sensitivity

Better Auth does not normalize email case by default. Two users could register `User@example.com` and `user@example.com` as different accounts. Use either the Postgres `citext` extension for the email column, or normalize in `databaseHooks.user.create.before`:

```typescript
databaseHooks: {
  user: {
    create: {
      before: async (user) => {
        return { data: { ...user, email: user.email.toLowerCase() } };
      },
    },
  },
},
```

### P10: argon2 Work Factor Tuning

`@node-rs/argon2` default work factors (memoryCost: 65536, timeCost: 3) can push login latency to 1.5–2s on a cold Vercel function. Use reduced factors for serverless: `memoryCost: 19456, timeCost: 2, parallelism: 1`. Benchmark against a cold Vercel invocation before locking in. [VERIFIED: PITFALLS.md §2.4]

### P11: Better Auth Cookie vs Phase 5 Cookie Namespace

Phase 5 uses `lt_theme` and `lt_lang` cookies. Better Auth's session cookie is named `better-auth.session_token` by default. The two cookie namespaces do not conflict, but if we want a consistent `lt_*` namespace, we can rename via:

```typescript
advanced: {
  cookies: {
    session_token: { name: 'lt_session' }
  }
}
```

This affects `getSessionCookie(request)` call in `proxy.ts` — must pass the custom name:

```typescript
const sessionCookie = getSessionCookie(request, { cookieName: 'lt_session' });
```

Decide in Wave 0 task. Either choice is fine; the default works.

---

## 10. App Shell — Topbar Architecture

**Applies to:** SHELL-01, SHELL-02, SHELL-03

The Topbar is a Server Component mounted in both `(authed)/layout.tsx` and `(admin)/[adminSegment]/layout.tsx`. The locale toggle and theme toggle are Client Components (they call Server Actions on click). The user menu (display name + logout) is a mixed pattern: the display name is read server-side; the dropdown and logout button are a Client Component.

```typescript
// app/(authed)/layout.tsx (simplified)
import { requireUser } from '@/lib/auth/require';
import { Topbar } from '@/components/Topbar';

export const dynamic = 'force-dynamic';   // PITFALLS §1.6

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar displayName={session.user.displayName ?? session.user.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

The `app/(public)/login/page.tsx` does NOT mount the Topbar — it uses a separate minimal layout (SHELL-03).

---

## 11. i18n Dictionary Expansion

**Applies to:** SHELL-04, SHELL-05, SHELL-06

### v10 Key Count (Verified)

The v10 HTML contains **166 unique FR keys** in the `I18N.fr` object. [VERIFIED: grep count on `Matrice_2026_THE_Leasetic-v10.html` 2026-05-07]

The UI-SPEC scoped 225 keys × 2 langs = 450 entries (165 v10 + 60 new Phase-6 keys). The discrepancy (166 counted vs 165 stated) is within rounding; the actual extraction determines the final count.

### Dictionary Structure

```typescript
// src/lib/i18n/dictionaries.ts — expanded structure
// The current 5-key sample is replaced with the full dictionary.
// Pattern: flat key map, no nesting.

export const dictionaries = {
  fr: {
    // ── Auth screens ──────────────────────────────
    'auth.login.title': 'Connexion',
    'auth.login.email': 'Adresse email',
    'auth.login.password': 'Mot de passe',
    'auth.login.submit': 'Se connecter',
    'auth.login.error': 'Email ou mot de passe incorrect.',
    'auth.invite.title': 'Définir votre mot de passe',
    'auth.invite.submit': 'Créer mon mot de passe',
    'auth.reset.title': 'Réinitialiser votre mot de passe',
    'auth.expired.title': 'Lien invalide ou expiré',
    // ── Shell ──────────────────────────────────────
    'shell.logout': 'Se déconnecter',
    'shell.locale.fr': 'FR',
    'shell.locale.en': 'EN',
    'shell.theme.light': 'Clair',
    'shell.theme.dark': 'Sombre',
    'shell.theme.system': 'Système',
    // ── v10 keys (166 total, extracted) ───────────
    // ... (full extraction per v10 I18N.fr object)
  },
  en: {
    // ... (full extraction per v10 I18N.en object)
  },
} as const;

export type Lang = keyof typeof dictionaries;
export type DictKey = keyof typeof dictionaries.fr;
```

### Type Safety

The existing `t(key: DictKey, lang: Lang): string` pattern is already type-safe. TypeScript will error at compile time if a key is used that doesn't exist in `dictionaries.fr`. The English dictionary must have exactly the same keys as French (enforce with a type-level check):

```typescript
// Type-level check: EN must have every key that FR has
type EnHasAllFrKeys = {
  [K in DictKey]: K extends keyof typeof dictionaries.en ? true : never;
};
```

### ESLint Rule for Hardcoded JSX Strings (SHELL-06)

```javascript
// eslint.config.mjs — add to the rules block
{
  files: ['**/*.{tsx,jsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXText[value=/[a-zA-ZÀ-ÿ]{2,}/]',
        message: 'Hardcoded text in JSX is forbidden. Use t(key, lang) instead.',
      },
    ],
  },
},
```

Note: `no-restricted-syntax` with a JSX selector catches string literals inside JSX elements. This does not catch string attributes like `placeholder="..."` — those need a separate rule or the convention that translatable attributes use `{t('key', lang)}` with curly braces. Test the rule in Wave 0 to confirm it fires on `<p>Bonjour</p>` but not on `<p>{t('greeting', lang)}</p>`.

---

## 12. Theme Persistence to DB

**Applies to:** SHELL-07, SHELL-08

Phase 5 already implements cookie-based theme. Phase 6 adds DB persistence for authenticated users.

```typescript
// src/lib/theme/actions.ts — EXTEND (keep existing cookie logic, add DB write)
'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

const ALLOWED_THEMES = ['light', 'dark', 'system'] as const;
type Theme = typeof ALLOWED_THEMES[number];

export async function setTheme(theme: Theme) {
  if (!ALLOWED_THEMES.includes(theme as Theme)) return;

  // 1. Always write cookie (SSR + unauthenticated users)
  const c = await cookies();
  c.set('lt_theme', theme, { path: '/', sameSite: 'lax', httpOnly: false,
    secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 365 });

  // 2. If authenticated, also write to DB
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    await db().update(schema.users)
      .set({ theme })
      .where(eq(schema.users.id, session.user.id));
  }

  revalidatePath('/');
}
```

**Locale persistence follows the same pattern** — extend `src/lib/i18n/actions.ts` to write to `users.language` when authenticated.

**Login reconciliation (D-27):**

```typescript
// In the server action that handles post-login session establishment:
// 1. Read the user's DB theme and language
// 2. If cookie is absent → write DB value to cookie
// 3. If cookie is set → write cookie value to DB (cookie wins for the first login)
// This runs in the auth callback or a server action triggered after login.
```

---

## 13. Explicit Intl Locales (SHELL-09)

**Applies to:** SHELL-09

```typescript
// src/lib/i18n/format.ts — NEW FILE
// [VERIFIED: REQUIREMENTS.md SHELL-09 + ARCHITECTURE §6]
type Lang = 'fr' | 'en';

const LOCALES: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',    // GB not US (per CONTEXT.md D-28)
};

export function formatCurrency(value: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, lang: Lang, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALES[lang], opts).format(value);
}

export function formatDate(date: Date, lang: Lang, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALES[lang], opts).format(date);
}
```

Never call `new Intl.NumberFormat()` or `new Intl.DateTimeFormat()` without the locale argument. The ESLint `no-restricted-syntax` rule can enforce this:

```javascript
{
  selector: 'NewExpression[callee.name="Intl.NumberFormat"][arguments.length=0]',
  message: 'Intl.NumberFormat requires an explicit locale. Use formatNumber() from @/lib/i18n/format.',
}
```

---

## 14. Sonner Toast Wiring (SHELL-10)

**Applies to:** SHELL-10

Sonner `2.0.7` is already installed (Phase 5). The `<Toaster>` is mounted in `app/layout.tsx` — do not duplicate it.

```typescript
// Client Component pattern for toast after server action
'use client';
import { toast } from 'sonner';

// Success toast (login, logout, password set)
toast.success(t('toast.login.success', lang));

// Error toast (network error, server error)
toast.error(t('toast.error.generic', lang));

// Info toast (session revoked notice)
toast.info(t('toast.session.revoked', lang));
```

**Server-action → toast challenge:** Next.js server actions cannot directly trigger client-side toasts. The pattern is:
1. Server action returns `{ success: true }` or `{ error: '...' }`
2. Client Component reads the return value and calls `toast()` on the client side
3. Or: use `useFormState` / `useActionState` to plumb server action return values back to the client

For the session-revoked case: the middleware (proxy.ts) redirects to `/login?reason=revoked`. The login page reads `reason=revoked` from searchParams and shows a toast.

---

## 15. Form Validation — react-hook-form + Zod (SHELL-11)

**Applies to:** SHELL-11

```typescript
// src/lib/auth/schemas.ts — shared Zod schemas (client + server)
// [VERIFIED: STACK.md §9 forms section + npm versions]
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const setPasswordSchema = z.object({
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
```

```typescript
// Login form (Client Component)
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/auth/schemas';
import { authClient } from '@/lib/auth/client';

export function LoginForm({ lang }: { lang: Lang }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });
    if (error) {
      // Always show the same generic message (D-22 anti-enumeration)
      setError('root', { message: t('auth.login.error', lang) });
    }
    // On success, Better Auth redirects automatically
  };

  // ...
}
```

**Server action input validation:**

```typescript
// Server actions validate with the same schema before processing
import { loginSchema } from '@/lib/auth/schemas';

export async function loginAction(formData: FormData) {
  const result = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!result.success) {
    return { error: 'Invalid input' };  // never leaks validation details
  }
  // ...
}
```

---

## 16. Error Boundary and 404 Page (SHELL-12, SHELL-13)

**Applies to:** SHELL-12, SHELL-13

```typescript
// app/error.tsx — Next.js error boundary
// [VERIFIED: Next.js App Router error.tsx convention]
'use client';

export default function ErrorPage({
  error, reset,
}: { error: Error; reset: () => void }) {
  // Cannot call server-side t() here — use a hardcoded bilingual fallback
  // or accept the current lang from a client context
  return (
    <div>
      <h1>Une erreur s'est produite / Something went wrong</h1>
      <button onClick={reset}>Réessayer / Retry</button>
    </div>
  );
}
```

```typescript
// app/not-found.tsx — Next.js 404 convention
// This is a Server Component — can use t() with cookie-based lang
import { getCurrentLang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export default async function NotFoundPage() {
  const lang = await getCurrentLang();
  return (
    <main>
      <h1>{t('error.404.title', lang)}</h1>
      <p>{t('error.404.body', lang)}</p>
    </main>
  );
}
```

---

## Standard Stack

### Core (Phase 6 additions)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `better-auth` | `1.6.9` | Auth engine (credentials, session, DB adapter) | Already includes `@better-auth/drizzle-adapter` |
| `@node-rs/argon2` | `2.0.2` | argon2id password hashing | Native Rust, fast; tune work factor |
| `react-hook-form` | `7.75.0` | Form state management | Uncontrolled inputs, minimal re-renders |
| `zod` | `4.4.3` | Schema validation (client + server) | Shared schemas |
| `@hookform/resolvers` | `5.2.2` | RHF + Zod bridge | `zodResolver` wrapper |

### Already Installed (Phase 5, no version change)

| Library | Version | Usage in Phase 6 |
|---------|---------|-----------------|
| `drizzle-orm` | `0.45.2` | DB access for all auth and custom tables |
| `sonner` | `2.0.7` | Toasts for auth events |
| `lucide-react` | `0.469.0` | Icons in Topbar and forms |
| `next` | `16.2.4` | Framework; `proxy.ts` for auth gate |
| `react` / `react-dom` | `19.0.0` | No change |

### Upgrade (Wave 0)

| Library | From | To | Reason |
|---------|------|----|--------|
| `drizzle-kit` | `0.30.1` | `0.31.10` | Better Auth peer dep >=0.31.4 |

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request
    │
    ▼
proxy.ts (Node.js, cookie-only check)
    │  sessionCookie absent? → redirect /login?next=...
    │  sessionCookie present? → pass through
    ▼
Route Group Layout
    ├── (public)/layout.tsx         → minimal layout, no auth
    ├── (authed)/layout.tsx         → requireUser() → Topbar + main
    └── (admin)/[adminSegment]/layout.tsx
              │  adminSegment !== env? → notFound()
              │  requireAdmin() → Topbar + admin chrome
              ▼
Better Auth (auth.api.getSession)
    │  reads session cookie
    │  DB lookup: sessions table
    │  [cookieCache hit: skip DB for 5 min]
    ▼
DB (Neon / postgres-js)
    ├── sessions table (Better Auth managed)
    ├── users table (our custom fields + Better Auth core)
    ├── accounts table (Better Auth, stores argon2id hash)
    ├── verifications table (Better Auth)
    └── password_resets table (our own, not Better Auth)
```

### Recommended File Structure (Phase 6 additions)

```
app/
├── proxy.ts                             # Auth gate (replaces middleware.ts)
├── error.tsx                            # Error boundary (FR+EN fallback)
├── not-found.tsx                        # 404 page (FR+EN)
├── api/auth/[...all]/route.ts           # Better Auth handler
├── (public)/
│   ├── layout.tsx                       # Minimal layout (no shell)
│   ├── login/page.tsx                   # Login form (Server wrapper + Client form island)
│   ├── invite/[token]/page.tsx          # Invitation redemption
│   └── reset/[token]/page.tsx          # Password reset redemption
├── (authed)/
│   ├── layout.tsx                       # requireUser() + Topbar
│   └── page.tsx                         # Home placeholder (Phase 7 will add content)
└── (admin)/
    └── [adminSegment]/
        ├── layout.tsx                   # Segment check + requireAdmin() + Topbar
        └── page.tsx                     # Admin home placeholder

src/
├── db/
│   └── schema.ts                        # EXTEND: users, sessions, accounts, verifications, password_resets
├── lib/
│   ├── auth/
│   │   ├── index.ts                     # auth = betterAuth(...) server instance
│   │   ├── client.ts                    # authClient (client-side only, 'use client')
│   │   ├── require.ts                   # requireUser(), requireAdmin()
│   │   ├── schemas.ts                   # Zod schemas (loginSchema, setPasswordSchema)
│   │   ├── tokens.ts                    # generateToken() — invite/reset token generation
│   │   └── actions.ts                   # Server actions: disableUser, createInvitation, etc.
│   ├── i18n/
│   │   ├── dictionaries.ts              # EXTEND: 225 keys × 2 langs
│   │   ├── index.ts                     # t(), getCurrentLang(), getCurrentTheme() — NO CHANGE
│   │   ├── actions.ts                   # EXTEND: write to DB on toggle when authenticated
│   │   └── format.ts                    # NEW: formatCurrency, formatDate, formatNumber
│   └── theme/
│       └── actions.ts                   # EXTEND: write to DB on toggle when authenticated
├── components/
│   ├── Topbar.tsx                       # NEW: Server Component + client sub-components
│   ├── UserMenu.tsx                     # NEW: Client Component (dropdown + logout)
│   ├── InviteUrlModal.tsx               # NEW: Admin one-time URL display modal
│   ├── ThemeToggle.tsx                  # Phase 5, reuse as-is in Topbar
│   └── LocaleToggle.tsx                 # Phase 5, reuse as-is in Topbar

scripts/
└── grant-admin.ts                       # NEW: CLI admin-grant script
```

### Anti-Patterns to Avoid

- **Never use `middleware.ts`** in Next.js 16 — it is deprecated. Use `proxy.ts`.
- **Never do a DB lookup in `proxy.ts`** — cookie-only check; DB lookups belong in layouts.
- **Never import `@/lib/auth/client` in a Server Component** — crashes at runtime.
- **Never call `requireAdmin()` after data fetching** — always check role first.
- **Never show different login error messages** based on which credential is wrong.
- **Never modify `src/lib/theme/no-flash-script.ts`** — locked, Phase 5.
- **Never add `password_hash` to the `users` table** — Better Auth stores passwords in `accounts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt/SHA | `@node-rs/argon2` | OWASP argon2id standard; handles tuning |
| CSRF protection | Custom token | `authClient` official methods | Better Auth's Origin validation + SameSite handles this |
| Session token generation | `Math.random()` or UUID | Better Auth internal (nanoid) | Better Auth manages session IDs; use `generateToken()` only for invite/reset |
| Password token generation | `Math.random()` | `crypto.getRandomValues` / `node:crypto.randomBytes` | Must be cryptographically random |
| Token storage | Plaintext in DB | SHA-256 hash in DB, plaintext in URL | Pseudo-Stripe pattern — DB breach doesn't expose tokens |
| Form validation | Manual checks | `zod` + `react-hook-form` | Type inference, centralized schema |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | (Next.js runtime) | — |
| Postgres (Neon) | DB sessions, schema | ✓ | — (Neon, Phase 5 setup) | — |
| `AUTH_SECRET` env var | Better Auth | ✗ (must add) | — | Generate: `openssl rand -base64 32` |
| `APP_URL` env var | Better Auth baseURL, invite URLs | ✗ (must add) | — | Fallback to `VERCEL_URL` |
| `ADMIN_URL_SEGMENT` env var | Hidden admin URL | ✗ (must add) | — | Generate: `openssl rand -base64 9 \| tr -d '='` |
| `drizzle-kit@0.31.10` | Better Auth peer dep | ✗ (0.30.1 installed) | — | Upgrade in Wave 0 |

**New environment variables to document in `.env.example`:**

```bash
# Better Auth
AUTH_SECRET=<32+ char random string — openssl rand -base64 32>
APP_URL=https://leasetic-matrice.vercel.app   # or http://localhost:3000 for dev

# Admin URL (rotate to invalidate current admin URLs)
ADMIN_URL_SEGMENT=<12+ char URL-safe random — openssl rand -base64 9 | tr -d '+=/>

# Client-side (exposed to browser)
NEXT_PUBLIC_APP_URL=https://leasetic-matrice.vercel.app
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.8 |
| Config file | vitest.config.ts (or inferred from vite config) |
| Quick run command | `npx vitest run src/lib/auth/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| AUTH-04 | Login error is generic regardless of failure reason | unit | `vitest run src/lib/auth/require.test.ts` | Test that same error string returned for bad email, bad password, disabled account |
| AUTH-13 | DB CHECK constraint on role | integration | Verify via migration SQL review | CHECK constraint is in SQL; runtime behavior tested by attempting invalid INSERT |
| AUTH-16 | session_version bump invalidates session | integration | `vitest run src/lib/auth/actions.test.ts` | Mock DB, verify session deletion called |
| AUTH-17 | argon2id hashing produces valid hash | unit | `vitest run src/lib/auth/tokens.test.ts` | Verify hash/verify roundtrip |
| SHELL-06 | ESLint rule fires on hardcoded JSX strings | lint | `npm run lint` | No vitest needed; eslint catches it |
| SHELL-09 | format.ts always uses explicit locale | unit | `vitest run src/lib/i18n/format.test.ts` | Verify fr-FR and en-GB formatting |
| SHELL-11 | Zod schema rejects invalid login inputs | unit | `vitest run src/lib/auth/schemas.test.ts` | Test loginSchema with invalid email, short password |
| AUTH-14 | Segment mismatch → 404 | manual/smoke | Manual test with wrong segment URL | Hard to unit-test notFound() in Next.js without integration infra |

### Wave 0 Gaps

- [ ] `src/lib/auth/tokens.test.ts` — token generation + SHA-256 hash roundtrip
- [ ] `src/lib/auth/schemas.test.ts` — Zod schema validation cases
- [ ] `src/lib/auth/require.test.ts` — requireUser() + requireAdmin() with mock sessions
- [ ] `src/lib/auth/actions.test.ts` — disableUser() session revocation
- [ ] `src/lib/i18n/format.test.ts` — formatCurrency, formatDate, formatNumber with both locales
- [ ] `src/lib/i18n/dictionaries.test.ts` — type-level check that EN has all FR keys

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Better Auth credentials; argon2id; generic error messages |
| V3 Session Management | Yes | DB sessions; 8h expiry; `revokeUserSessions()` on disable |
| V4 Access Control | Yes | `requireUser()` / `requireAdmin()` before every data access |
| V5 Input Validation | Yes | Zod schemas at every boundary |
| V6 Cryptography | Yes | `@node-rs/argon2` (argon2id); `node:crypto.randomBytes` for tokens |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Login enumeration | Information Disclosure | Generic error message regardless of failure reason (D-22) |
| Session fixation | Elevation of Privilege | Better Auth regenerates session token on login |
| CSRF on sign-in/sign-out | Tampering | Use `authClient` official methods; Better Auth validates Origin header |
| Admin URL discovery | Information Disclosure | URL obscurity (secondary); `requireAdmin()` role check is primary defence |
| Token theft (invite/reset) | Spoofing | Short-lived (24h); single-use; stored as SHA-256 hash |
| Role escalation via form | Elevation of Privilege | `input: false` on role field; DB CHECK constraint; CLI-only grant |
| Stale session after account disable | Elevation of Privilege | `revokeUserSessions()` (immediate) + cookieCache TTL (≤5 min) + session_version check |
| Password hash exposure | Information Disclosure | Better Auth stores in `accounts.password`; `classifyError()` redaction pattern |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Better Auth's `usePlural: true` maps `user→users`, `session→sessions`, etc. correctly | §2 schema | If `usePlural` option doesn't exist in this version, must use manual `schema` mapping |
| A2 | `drizzle-kit 0.30.1 → 0.31.10` upgrade is non-breaking for our generate-only workflow | §2 version pins | If 0.31.x introduces breaking changes to `drizzle-kit generate`, need a migration step |
| A3 | `better-auth/adapters/drizzle` (bundled) works identically to installing `@better-auth/drizzle-adapter` separately | §2 | Minor API surface difference possible; verify at install time |
| A4 | `auth.api.revokeUserSessions({ body: { userId } })` exists as a server-side API | §4 | Name may differ; check better-auth TypeScript types after install |
| A5 | `disableSignUp: true` on `emailAndPassword` prevents public sign-up (no bypass via `/api/auth/sign-up`) | §2 | If incomplete, must add `databaseHooks.user.create.before` guard |

**Items A1, A3, A4, A5 should be verified in Wave 0 by reading the installed TypeScript types** after `npm install better-auth@1.6.9`.

---

## Open Questions

1. **User ID format conflict:** Better Auth generates `text` IDs (nanoid, ~21 chars). Our ARCHITECTURE.md assumed `uuid`. The `password_resets.user_id` FK must be `text`, not `uuid`. Confirm with planner that this is acceptable and document the change.
   - What we know: Better Auth uses string IDs internally; this is non-negotiable.
   - What's unclear: Whether any future phase (Phase 9 audit_log) assumed `uuid` for user_id FK. If so, those phases need updating too.
   - Recommendation: Accept `text` IDs consistently. Document in STATE.md.

2. **Manual user creation pattern for invitations:** The cleanest way to create a user without going through `signUpEmail` (which requires a password) is to insert directly into `users` and `accounts` tables. Requires knowing Better Auth's exact internal structure.
   - What we know: Better Auth uses `accounts.password` for credential passwords.
   - What's unclear: Whether `auth.api` has a first-party "create user without password" endpoint.
   - Recommendation: After install, check `auth.api` TypeScript types for `createUser` or equivalent. If absent, insert via Drizzle directly using the known schema.

---

## Recommended Plan Structure

The phase has ~32 requirements spanning schema, auth wiring, shell, i18n, forms, and error pages. Suggested wave breakdown:

### Wave 0 — Foundation (no UI, unblocks everything else)

- **06-01:** Package installs + `drizzle-kit` upgrade + env var skeleton (`.env.example`)
- **06-02:** Drizzle schema extension (`users`, `sessions`, `accounts`, `verifications`, `password_resets`) + `db:generate` + migration SQL review
- **06-03:** `src/lib/auth/index.ts` (Better Auth wiring) + `app/api/auth/[...all]/route.ts` + `src/lib/auth/client.ts`
- **06-04:** `src/lib/auth/require.ts` (`requireUser`, `requireAdmin`) + `src/lib/auth/tokens.ts` + Vitest tests

### Wave 1 — Auth Flows (login, invite, reset, proxy)

- **06-05:** `proxy.ts` coarse auth gate (replaces deprecated `middleware.ts`) + matcher config
- **06-06:** Login page (`app/(public)/login/`) — Server wrapper + Client form island + Zod schema
- **06-07:** Invitation redemption (`app/(public)/invite/[token]/`) + `setPassword` server action
- **06-08:** Password reset redemption (`app/(public)/reset/[token]/`) + admin `createReset` action
- **06-09:** Disable/re-enable partner server actions + `grant-admin.ts` CLI script

### Wave 2 — Shell + i18n

- **06-10:** Full i18n dictionary port (166 v10 keys + 59 new Phase-6 keys) + ESLint rule + Vitest type check
- **06-11:** `(authed)/layout.tsx` + `(admin)/[adminSegment]/layout.tsx` + `Topbar` component + `UserMenu`
- **06-12:** Theme/locale persistence to DB (extend `setTheme`, `setLang` server actions)
- **06-13:** `InviteUrlModal` component + admin-side invitation/reset URL display

### Wave 3 — Format, Error Pages, Toasts, Acceptance

- **06-14:** `lib/i18n/format.ts` (formatCurrency, formatDate, formatNumber)
- **06-15:** `app/error.tsx` + `app/not-found.tsx` localized
- **06-16:** Sonner toast wiring for auth events + session-revoked flow
- **06-17:** ESLint rule smoke test + acceptance tests (manual: login flow, session revocation, admin URL mismatch, disabled account, expired invite)

---

## Sources

### Primary (HIGH confidence)

- `npm view better-auth@1.6.9` — version, dependencies, peerDependencies, exports [VERIFIED 2026-05-07]
- `npm view @better-auth/drizzle-adapter@1.6.9` — peer deps confirmed as `drizzle-orm ^0.45.2` [VERIFIED 2026-05-07]
- `npm view @node-rs/argon2`, `react-hook-form`, `zod`, `@hookform/resolvers`, `drizzle-kit` — version pins [VERIFIED 2026-05-07]
- Context7 `/websites/better-auth` — auth setup, session management, custom fields, drizzle adapter, Next.js integration [VERIFIED 2026-05-07]
- `nextjs.org/docs/app/api-reference/file-conventions/proxy` — `proxy.ts` replaces `middleware.ts` in Next.js 16 [VERIFIED 2026-05-07 via WebFetch]
- `better-auth.com/docs/concepts/session-management` — DB sessions, cookieCache, `expiresIn` [VERIFIED 2026-05-07 via WebFetch]
- `better-auth.com/docs/adapters/drizzle` — `drizzleAdapter`, `usePlural`, `generate` CLI [VERIFIED 2026-05-07 via WebFetch]
- Grep on `Matrice_2026_THE_Leasetic-v10.html` — 166 unique FR i18n keys [VERIFIED 2026-05-07]

### Secondary (MEDIUM confidence)

- Context7 `/websites/better-auth` — `revokeUserSessions` API (name inferred from session management docs; verify TypeScript types after install) [CITED: better-auth.com/docs/concepts/session-management]
- Context7 `/websites/better-auth` — `usePlural` option existence (mentioned in Drizzle adapter docs; verify at runtime) [CITED: better-auth.com/docs/adapters/drizzle]

### Tertiary (LOW confidence)

- (None — no unverified claims)

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Version pins | HIGH | All verified via npm registry 2026-05-07 |
| Better Auth setup | HIGH | Verified via Context7 + official docs WebFetch |
| Next.js 16 `proxy.ts` | HIGH | Verified via official Next.js docs WebFetch 2026-05-07 |
| DB sessions (not JWT) | HIGH | Verified via official Better Auth session docs |
| Schema design | MEDIUM | Core tables verified; exact field mapping for additionalFields needs runtime confirmation |
| Session revocation API name | MEDIUM | Pattern verified; exact API method name needs TypeScript type check after install |
| argon2 work factor values | MEDIUM | PITFALLS.md values; requires cold-start benchmarking during acceptance |

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable library, but Better Auth is fast-moving — re-check if 1.7.x ships to `latest` before Phase 6 starts)
