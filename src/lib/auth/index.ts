/**
 * Better Auth server-side instance.
 *
 * Per D-01..D-04 + 06-RESEARCH.md §2:
 *  - Drizzle adapter against the project's memoized DB singleton (src/lib/db).
 *  - Provider: email + password ONLY (no SSO, no OAuth — D-02).
 *  - disableSignUp: true — admin-mediated invitation only (REQUIREMENTS.md "Out of Scope").
 *  - Hashing: argon2id via @node-rs/argon2; tuned work factors for Vercel cold-start
 *    (memoryCost: 19456, timeCost: 2, parallelism: 1) per 06-RESEARCH.md §9 P10.
 *  - Session: DB-backed, 8h sliding (updateAge: 1h), cookieCache 5min (D-03 / AUTH-16
 *    revocation window).
 *  - additionalFields: role, displayName, language, theme, sessionVersion, createdBy,
 *    deletedAt, lastLoginAt — registered with Better Auth so it includes them in
 *    session.user (input: false on role + sessionVersion to prevent self-elevation).
 *  - databaseHooks.user.create.before: lowercase email (P9 case-insensitive matching).
 *
 * Server-only — never importable from Client Components. Use src/lib/auth/client.ts
 * for browser code (PITFALLS §P8 / RESEARCH.md §9 P8).
 *
 * LAZY SINGLETON: The `auth()` function defers DB connection until first call,
 * preventing DATABASE_URL errors during `next build` static analysis. Mirrors
 * the `db()` memoized singleton pattern from src/lib/db/index.ts.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db, schema } from '@/lib/db';

function resolveBaseUrl(): string {
  // Prefer explicit APP_URL (works in dev + OVH portability).
  // Fall back to VERCEL_URL (Vercel-injected; needs https:// prefix).
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

function createAuth() {
  return betterAuth({
    baseURL: resolveBaseUrl(),
    secret: process.env.AUTH_SECRET ?? '',

    database: drizzleAdapter(db(), {
      provider: 'pg',
      // Maps Better Auth internal model names (user, session, account, verification)
      // to our pluralized table names (users, sessions, accounts, verifications).
      usePlural: true,
      schema: { ...schema },
    }),

    emailAndPassword: {
      enabled: true,
      // D-02: no public sign-up. Admin-mediated invitation only.
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        // 06-RESEARCH.md §9 P10: tuned work factors for Vercel cold-start.
        // algorithm: 2 = argon2id (per @node-rs/argon2 Algorithm enum).
        hash: async (password: string) => {
          const { hash } = await import('@node-rs/argon2');
          return hash(password, {
            algorithm: 2, // argon2id
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
          });
        },
        verify: async ({ hash: h, password }: { hash: string; password: string }) => {
          const { verify } = await import('@node-rs/argon2');
          return verify(h, password);
        },
      },
    },

    session: {
      // D-03: 8-hour sliding lifetime
      expiresIn: 60 * 60 * 8,
      // Slide on activity (extend whenever the session is >1h old at request time)
      updateAge: 60 * 60,
      // 5-minute cookie cache (D-03 / AUTH-16): bound revocation latency.
      // requireUser() does a secondary in-band session_version check (Plan 06-04)
      // to catch the 5-min stale-cookie window when admin disables an account.
      cookieCache: {
        enabled: true,
        maxAge: 300,
      },
    },

    user: {
      // Register the columns we own on the `users` table so Better Auth includes
      // them in session.user. input: false locks the field against client-side
      // updates via /api/auth/update-user.
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'partner', input: false },
        displayName: { type: 'string', required: false, input: true },
        language: { type: 'string', required: false, defaultValue: 'fr', input: true },
        theme: { type: 'string', required: false, defaultValue: 'system', input: true },
        sessionVersion: { type: 'number', required: false, defaultValue: 1, input: false },
        createdBy: { type: 'string', required: false, input: false },
        deletedAt: { type: 'date', required: false, input: false },
        lastLoginAt: { type: 'date', required: false, input: false },
      },
    },

    databaseHooks: {
      user: {
        create: {
          // P9 mitigation: normalize email to lowercase to prevent case-sensitive
          // duplicate accounts (User@example.com vs user@example.com).
          before: async (user) => ({
            data: { ...user, email: user.email.toLowerCase() },
          }),
        },
      },
    },

    plugins: [
      // Required for Better Auth to set Set-Cookie headers from Next.js Server
      // Actions and Route Handlers.
      nextCookies(),
    ],

    trustedOrigins: [resolveBaseUrl(), 'http://localhost:3000'].filter(Boolean),
  });
}

/**
 * Memoized Better Auth instance. Called lazily on first use so that `db()`
 * (which requires DATABASE_URL) is not invoked at module-evaluation time
 * during `next build` static analysis. Mirrors the `db()` singleton pattern.
 *
 * Usage: `auth().api.getSession(...)`, `toNextJsHandler(auth())`
 */
let _auth: ReturnType<typeof createAuth> | null = null;
export function auth(): ReturnType<typeof createAuth> {
  if (_auth === null) _auth = createAuth();
  return _auth;
}

/** TEST-ONLY: clear the memoized instance. */
export function __resetAuthForTests(): void {
  _auth = null;
}
