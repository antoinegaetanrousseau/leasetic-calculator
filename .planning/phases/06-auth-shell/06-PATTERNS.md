# Phase 6: Auth & Shell — Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 26 new/modified files
**Analogs found:** 20 / 26 (6 are novel — no close existing match; planner uses RESEARCH.md excerpts)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `proxy.ts` | middleware | request-response | none (novel — Next.js 16 proxy.ts) | no analog |
| `src/lib/auth/index.ts` | service (library wrapper) | request-response | `src/lib/db/index.ts` | role-match (singleton/wrapper shape) |
| `src/lib/auth/client.ts` | service (client-only) | request-response | `src/lib/storage/index.ts` | role-match (factory + export shape) |
| `src/lib/auth/require.ts` | middleware / utility | request-response | `src/lib/health.ts` (classifyError pattern) | partial |
| `src/lib/auth/schemas.ts` | utility (validation) | transform | none (novel Zod schema module) | no analog |
| `src/lib/auth/tokens.ts` | utility | transform | `src/lib/db/errors.ts` (plain TS module, no deps) | partial |
| `src/lib/auth/actions.ts` | service (server actions) | CRUD | `src/lib/theme/actions.ts` | role-match |
| `src/db/schema.ts` (extended) | model | CRUD | `src/db/schema.ts` (current 1-table version) | exact (same file, same patterns) |
| `drizzle/0001_*.sql` | migration | batch | `drizzle/0000_striped_metal_master.sql` | exact |
| `scripts/grant-admin.ts` | utility (CLI) | batch | `scripts/migrate.ts` | exact |
| `app/api/auth/[...all]/route.ts` | route handler | request-response | `app/healthz/route.ts` | role-match |
| `app/(public)/layout.tsx` | layout | request-response | `app/layout.tsx` | role-match |
| `app/(public)/login/page.tsx` | component (server shell + client island) | request-response | `app/page.tsx` | role-match (server component + cookie reads) |
| `app/(public)/invite/[token]/page.tsx` | component (server + client) | request-response | `app/page.tsx` | role-match |
| `app/(public)/reset/[token]/page.tsx` | component (server + client) | request-response | `app/page.tsx` | role-match |
| `app/(authed)/layout.tsx` | layout | request-response | `app/page.tsx` (grid shell pattern) | partial |
| `app/(authed)/page.tsx` | component (placeholder) | request-response | `app/page.tsx` | exact |
| `app/(admin)/[adminSegment]/layout.tsx` | layout | request-response | none (novel dynamic segment gate) | no analog |
| `app/error.tsx` | component (error boundary) | event-driven | none (novel Next.js error convention) | no analog |
| `app/not-found.tsx` | component (404) | request-response | none (novel Next.js 404 convention) | no analog |
| `src/components/Topbar.tsx` | component (server) | request-response | `app/page.tsx` (topbar region in grid shell) | partial |
| `src/components/UserMenu.tsx` | component (client) | event-driven | `src/components/ThemeToggle.tsx` | role-match |
| `src/components/InviteUrlModal.tsx` | component (client) | event-driven | `src/components/ThemeToggle.tsx` | partial |
| `src/lib/i18n/dictionaries.ts` (extended) | utility (data) | transform | `src/lib/i18n/dictionaries.ts` (current) | exact (same file, same shape) |
| `src/lib/i18n/format.ts` | utility | transform | `src/lib/i18n/index.ts` (pure module) | partial |
| `src/lib/theme/actions.ts` (extended) | service (server action) | CRUD | `src/lib/theme/actions.ts` (current) | exact (same file, extend) |
| `src/lib/i18n/actions.ts` (extended) | service (server action) | CRUD | `src/lib/i18n/actions.ts` (current) | exact (same file, extend) |
| `eslint.config.mjs` (extended) | config | transform | `eslint.config.mjs` (current) | exact (same file, add rules) |

---

## Pattern Assignments

---

### `proxy.ts` (middleware, request-response)

**Analog:** none — Next.js 16 renamed `middleware.ts` to `proxy.ts`. No existing analog in codebase.
**Pattern source:** RESEARCH.md §1 (verified against nextjs.org/docs 2026-05-07).

**Core pattern from RESEARCH.md §1:**
```typescript
// proxy.ts (root of project, same level as app/)
// NOT middleware.ts — deprecated in Next.js 16
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (sessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)',],
};
```

**Same vs different:**
- Same: uses `NextResponse`, matcher config shape
- Different: export name is `proxy` not `middleware`; no `export const runtime` (throws in Next.js 16 proxy files — Node is default); uses `getSessionCookie` from `better-auth/cookies` instead of custom cookie read

---

### `src/lib/auth/index.ts` (service — library wrapper, request-response)

**Analog:** `src/lib/db/index.ts`

**Singleton + re-export pattern from analog** (lines 1–23):
```typescript
import { createDb } from './client';
import * as schemaModule from '@/db/schema';

export { DbError, DbAuthError } from './errors';

let _db: ReturnType<typeof createDb> | null = null;
export function db() {
  if (_db === null) _db = createDb();
  return _db;
}

export const schema = schemaModule;

/** TEST-ONLY: clear the memoized instance. */
export function __resetDbForTests(): void {
  _db = null;
}
```

**Core pattern for auth/index.ts (from RESEARCH.md §2):**
```typescript
// src/lib/auth/index.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/lib/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  baseURL: process.env.APP_URL ?? `https://${process.env.VERCEL_URL}`,
  secret: process.env.AUTH_SECRET,
  database: drizzleAdapter(db(), {
    provider: 'pg',
    usePlural: true,     // user→users, session→sessions, etc.
    schema: { ...schema },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // D-02: no self-signup
    password: {
      hash: async (password: string) => { /* @node-rs/argon2 */ },
      verify: async ({ hash: h, password }) => { /* @node-rs/argon2 */ },
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
    cookieCache: { enabled: true, maxAge: 300 },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'partner', input: false },
      sessionVersion: { type: 'number', defaultValue: 1, input: false },
      // ... displayName, language, theme, createdBy, deletedAt, lastLoginAt
    },
  },
  plugins: [nextCookies()],
});
```

**Same vs different:**
- Same: module with named export, imports from `@/lib/db`, imports `* as schema`
- Different: `betterAuth()` creates its own singleton internally — no memoization wrapper needed; uses external library constructor; `db()` is called once at module load (not lazily)

---

### `src/lib/auth/client.ts` (service — client-only, request-response)

**Analog:** `src/lib/storage/index.ts`

**Factory + re-export pattern from analog** (lines 1–10):
```typescript
import type { StorageAdapter } from './adapter';
import { StorageError } from './errors';
import { VercelBlobStorage } from './vercel-blob';
import { S3Storage } from './s3';

export type { StorageAdapter, StorageObject, PutOptions } from './adapter';
export { StorageError, StorageNotFoundError, StorageAuthError } from './errors';

export function getStorage(): StorageAdapter { /* ... */ }
export function storage(): StorageAdapter { /* ... */ }
```

**Core pattern for auth/client.ts (from RESEARCH.md §5):**
```typescript
// src/lib/auth/client.ts — CLIENT-SIDE ONLY
'use client';
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? '',
});
```

**Same vs different:**
- Same: named export from `src/lib/auth/`, provider-neutral wrapper
- Different: add `'use client'` directive at top (NEVER import from Server Components — see RESEARCH.md P8); much simpler, no driver selection; note `NEXT_PUBLIC_APP_URL` (public env var) not `APP_URL`

---

### `src/lib/auth/require.ts` (middleware/utility, request-response)

**Analog:** `src/lib/health.ts` (guard + early-return pattern)

**Guard pattern from analog** (lines 51–62):
```typescript
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    const d = db();
    await d.select({ id: schemaMeta.id }).from(schemaMeta).limit(0);
    return { ok: true };
  } catch (e) {
    console.error('[healthz] db check failed:', e);
    return { ok: false, message: classifyError(e) };
  }
}
```

**Core pattern for require.ts (from RESEARCH.md §4):**
```typescript
// src/lib/auth/require.ts
import { auth } from './index';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { redirect, notFound } from 'next/navigation';

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const user = await db().query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: { sessionVersion: true, deletedAt: true, role: true },
  });
  if (!user || user.deletedAt !== null) {
    redirect('/api/auth/sign-out?redirect=/login');
  }
  return { session, role: user.role as 'partner' | 'admin' };
}

export async function requireAdmin() {
  const { session, role } = await requireUser();
  if (role !== 'admin') notFound();   // 404 not 403 (PITFALLS §7.1)
  return { session };
}
```

**Same vs different:**
- Same: async function, guard with early return, bounded behavior
- Different: uses `redirect()` / `notFound()` from Next.js (these throw internally — no catch needed); calls `auth.api.getSession` not a DB helper; order is mandatory: `requireAdmin()` always calls `requireUser()` first (PITFALLS §7.3)

---

### `src/lib/auth/schemas.ts` (utility — Zod schemas, transform)

**Analog:** none close. Novel module. Use RESEARCH.md §15 pattern directly.

**Pattern from RESEARCH.md §15:**
```typescript
// src/lib/auth/schemas.ts — shared by client AND server, no framework imports
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

**Same vs different:** No existing analog. Pure Zod module — no I/O, no `'use server'`, no `'use client'`, importable from both sides.

---

### `src/lib/auth/tokens.ts` (utility, transform)

**Analog:** `src/lib/db/errors.ts` — plain TypeScript module, no framework imports, exported named functions

**Plain module pattern from analog** (lines 1–14):
```typescript
export class DbError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DbError';
  }
}

export class DbAuthError extends DbError {
  constructor(message = 'Database authentication failed', cause?: unknown) {
    super(message, cause);
    this.name = 'DbAuthError';
  }
}
```

**Core pattern for tokens.ts (from RESEARCH.md §3):**
```typescript
// src/lib/auth/tokens.ts — server-only (uses node:crypto)
import { randomBytes, createHash } from 'node:crypto';

export function generateToken(): { plaintext: string; hash: string } {
  const bytes = randomBytes(32);
  const plaintext = bytes.toString('base64url');     // URL-safe, no padding issues
  const hash = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, hash };
}
```

**Same vs different:** Same shape (plain module, named exports, no framework), different purpose. Uses `node:crypto` — server-only. Do NOT import from client components.

---

### `src/lib/auth/actions.ts` (service — server actions, CRUD)

**Analog:** `src/lib/theme/actions.ts`

**Server action pattern from analog** (all 23 lines):
```typescript
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const ALLOWED_THEMES = ['light', 'dark', 'system'] as const;
type Theme = typeof ALLOWED_THEMES[number];

export async function setTheme(theme: Theme) {
  if (!ALLOWED_THEMES.includes(theme as Theme)) {
    return; // silently reject — no error surface
  }
  const c = await cookies();
  c.set('lt_theme', theme, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/');
}
```

**Core pattern for auth/actions.ts (from RESEARCH.md §4):**
```typescript
'use server';
import { auth } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from './require';

export async function disableUser(userId: string) {
  await requireAdmin();   // ALWAYS FIRST — never after data access (PITFALLS §7.3)

  await db().update(schema.users).set({
    deletedAt: sql`NOW()`,
    sessionVersion: sql`session_version + 1`,
  }).where(eq(schema.users.id, userId));

  // Immediate session revocation (primary mechanism)
  await auth.api.revokeUserSessions({ body: { userId } });
}
```

**Same vs different:**
- Same: `'use server'` directive, runtime guard before mutation, named async exports
- Different: calls `requireAdmin()` as first guard (role-check before data access); uses `db().update()` not cookie manipulation; calls external library API for session revocation

---

### `src/db/schema.ts` (model — extended, CRUD)

**Analog:** `src/db/schema.ts` (current version — same file, extend it)

**Current schema pattern** (lines 19–29):
```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const schemaMeta = pgTable('schema_meta', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SchemaMetaRow = typeof schemaMeta.$inferSelect;
export type NewSchemaMetaRow = typeof schemaMeta.$inferInsert;
```

**Extension pattern from RESEARCH.md §2:**
```typescript
// Add to existing src/db/schema.ts imports:
import { pgTable, text, integer, timestamp, uuid, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// users: id is text (Better Auth nanoid) — NOT uuid (P4 critical)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified').notNull().default(0),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Our custom additionalFields:
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

// password_resets: uuid pk — our own table, we control IDs
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

**Same vs different:**
- Same: `pgTable`, column builders, `.notNull()`, `.defaultNow()`, `$inferSelect`/`$inferInsert` type exports, `{ withTimezone: true }` on all timestamps
- Different: add `check()` constraint via second array arg to `pgTable`; `users.id` is `text` not `serial`/`uuid` (P4); no `password_hash` column on `users` (P5 — stored in `accounts.password` by Better Auth); new `sql` import from `drizzle-orm` for CHECK expressions; also add `sessions`, `accounts`, `verifications` tables (see RESEARCH.md §2 for full definitions)

---

### `drizzle/0001_*.sql` (migration, batch)

**Analog:** `drizzle/0000_striped_metal_master.sql`

**Migration format from analog** (all 6 lines):
```sql
CREATE TABLE "schema_meta" (
  "id" serial PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Same vs different:**
- Same: plain DDL SQL; applied by `scripts/migrate.ts` (unchanged); stored in `drizzle/` directory; filename generated by `drizzle-kit generate`
- Different: much larger (5 new tables); CHECK constraints (`role IN ('partner','admin')`); FK references; `text PRIMARY KEY` for Better Auth tables; `uuid DEFAULT gen_random_uuid()` for `password_resets`
- Process: run `npx drizzle-kit generate` after extending schema.ts — do NOT hand-write SQL

---

### `scripts/grant-admin.ts` (utility — CLI, batch)

**Analog:** `scripts/migrate.ts`

**CLI boilerplate pattern from analog** (lines 1–92, key sections):
```typescript
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('FATAL: DATABASE_URL is not set');
    process.exit(2);
  }
  // Mask URL for logging — show only hostname, never credentials
  try {
    const u = new URL(url);
    console.log(`Connecting to ${u.hostname} ...`);
  } catch {
    console.log('Connecting (DATABASE_URL malformed) ...');
  }
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    // ... do work
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

**Additional pattern for grant-admin.ts (D-16 typed-confirmation gate + RESEARCH.md §8):**
```typescript
import * as schema from '../src/db/schema';
import { generateToken } from '../src/lib/auth/tokens';
import { eq } from 'drizzle-orm';

async function main() {
  const email = process.argv[2];
  if (!email) { console.error('Usage: npx tsx scripts/grant-admin.ts <email>'); process.exit(1); }

  // D-16: typed-confirmation gate before any mutation
  const expectedConfirm = `GRANT-ADMIN-${email}`;
  if (process.env.CONFIRM !== expectedConfirm) {
    console.error(`FATAL: Set CONFIRM=${expectedConfirm} to proceed`);
    process.exit(2);
  }
  // ... then same URL masking + postgres-js pattern as migrate.ts
  const db = drizzle(client, { schema });
  // idempotent: find user → upgrade OR create + emit invite URL
}
```

**Same vs different:**
- Same: `import 'dotenv/config'`, `postgres(url, { max: 1, prepare: false })`, hostname masking, `main().catch()`, `process.exit(1|2)` on failure
- Different: adds `CONFIRM=GRANT-ADMIN-{email}` gate (D-16); uses `drizzle(client, { schema })` with schema import; imports `generateToken`; idempotent upsert logic; prints invitation URL to stdout on new user creation

---

### `app/api/auth/[...all]/route.ts` (route handler, request-response)

**Analog:** `app/healthz/route.ts`

**Route handler pattern from analog** (lines 20–42):
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const [dbResult, blobResult] = await Promise.all([...]);
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
```

**Core pattern for auth catch-all (from RESEARCH.md §6):**
```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

**Same vs different:**
- Same: named HTTP verb exports, `export const dynamic = 'force-dynamic'`
- Different: delegates entirely to `toNextJsHandler(auth)` — no custom logic; no `export const runtime = 'nodejs'` needed (Better Auth handles runtime); much shorter (2 lines of actual code)

---

### `app/(public)/layout.tsx` (layout, request-response)

**Analog:** `app/layout.tsx`

**Root layout structure from analog** (lines 38–59):
```typescript
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getCurrentLang();
  const themeCookie = await getCurrentTheme();
  const ssrTheme = themeCookie === 'system' ? 'light' : themeCookie;

  return (
    <html lang={lang} data-theme={ssrTheme} className={plusJakartaSans.variable}>
      <head>
        <script suppressHydrationWarning /* inline no-flash script */ />
      </head>
      <body>
        {children}
        {/* Toaster already mounted here */}
      </body>
    </html>
  );
}
```

**Core pattern for (public)/layout.tsx:**
```typescript
// app/(public)/layout.tsx — nested layout, NOT root
// Does NOT render html/head/body (those are in app/layout.tsx)
// Does NOT mount Toaster or no-flash script (already in root)

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
                  background: 'var(--paper)' }}>
      {children}
    </div>
  );
}
```

**Same vs different:**
- Same: `children` prop, async server component pattern
- Different: nested layout — no `<html>`/`<body>`; no font variable, no Toaster, no no-flash script (already in root); minimal wrapper only

---

### `app/(public)/login/page.tsx` (server shell + client island, request-response)

**Analog:** `app/page.tsx`

**Server component + cookie reads pattern from analog** (lines 1–13):
```typescript
import { getCurrentLang, getCurrentTheme, t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const lang = await getCurrentLang();
  const themeCookie = await getCurrentTheme();
  return (
    <div style={{ ... }}>
      <LocaleToggle current={lang} />
      <ThemeToggle current={themeForToggle} />
    </div>
  );
}
```

**Core pattern for login/page.tsx:**
```typescript
import { getCurrentLang, getCurrentTheme } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { LoginForm } from '@/components/LoginForm';   // 'use client' island
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';   // PITFALLS §1.6

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;  // PITFALL §1.1
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/');    // D-21: already-authenticated → redirect home

  const lang = await getCurrentLang();
  const theme = await getCurrentTheme();
  const sp = await searchParams;   // PITFALL §1.1 — must await

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
                   justifyContent: 'center', alignItems: 'center', background: 'var(--paper)' }}>
      {/* Top-right: absolute positioned toggles */}
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 12 }}>
        <LocaleToggle current={lang} />
        <ThemeToggle current={theme} />
      </div>
      {/* Login card — client component handles form state + Better Auth signIn call */}
      <LoginForm lang={lang} successQuery={sp.invited ?? sp.reset ?? sp.logged_out} />
    </main>
  );
}
```

**Same vs different:**
- Same: `export const dynamic = 'force-dynamic'`, `getCurrentLang()`, `getCurrentTheme()`, mounts `<LocaleToggle current={lang}>` and `<ThemeToggle current={theme}>`
- Different: awaits `searchParams` (PITFALL §1.1); checks session for already-authenticated redirect; delegates form to a `<LoginForm>` client component (PITFALL §1.2 — react-hook-form requires `'use client'`); top-right toggles are absolutely positioned (not in the grid topbar)

---

### `app/(public)/invite/[token]/page.tsx` and `app/(public)/reset/[token]/page.tsx` (server + client, request-response)

**Analog:** `app/page.tsx`

**Same patterns as login/page.tsx** with these differences:
- `params: Promise<{ token: string }>` instead of `searchParams` — must `await params` (PITFALL §1.1)
- Server-side token lookup via Drizzle before rendering (hash the token with SHA-256, query `passwordResets`)
- If token invalid/expired/used → render inline expired-token content (no `<form>`)
- If valid → render `<SetPasswordForm token={token} kind="invite"|"reset" lang={lang}>` client island
- No session check needed (these are public, unauthenticated pages by design)

---

### `app/(authed)/layout.tsx` (layout, request-response)

**Analog:** `app/page.tsx` (grid shell pattern, lines 17–100)

**Grid shell CSS pattern from analog** (lines 17–30):
```typescript
return (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'var(--shell-sidebar-w) 1fr',
    gridTemplateRows: 'var(--topbar-h) 1fr var(--footer-h)',
    minHeight: '100vh',
  }}>
    <aside style={{ gridRow: '1 / 4', gridColumn: '1',
                    background: 'var(--surface)', borderRight: '1px solid var(--border)',
                    padding: '1.5rem 1rem', position: 'sticky', top: 0, height: '100vh' }}>
      <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '16.5px' }}>Leasétic</div>
    </aside>
    <header style={{ gridRow: '1', gridColumn: '2', background: 'var(--surface)',
                     borderBottom: '1px solid var(--border)', height: 'var(--topbar-h)',
                     display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                     padding: '0 1.5rem', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 100 }}>
      <LocaleToggle current={lang} />
      <ThemeToggle current={themeForToggle} />
    </header>
    <main style={{ gridRow: '2', gridColumn: '2', background: 'var(--paper)', ... }}>
      {/* content */}
    </main>
    <footer style={{ gridRow: '3', gridColumn: '2', ... }}>...</footer>
  </div>
);
```

**Core pattern for (authed)/layout.tsx:**
```typescript
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, getCurrentTheme } from '@/lib/i18n';
import { Topbar } from '@/components/Topbar';

export const dynamic = 'force-dynamic';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireUser();   // redirects to /login if not authenticated
  const lang = await getCurrentLang();
  const theme = await getCurrentTheme();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'var(--shell-sidebar-w) 1fr',
      gridTemplateRows: 'var(--topbar-h) 1fr var(--footer-h)',
      minHeight: '100vh',
    }}>
      <aside style={{ gridRow: '1 / 4', gridColumn: '1', ... }}>
        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '22px' }}>Leasétic</div>
      </aside>
      <Topbar displayName={session.user.displayName ?? session.user.email}
              lang={lang} theme={theme} isAdmin={false} />
      <main style={{ gridRow: '2', gridColumn: '2' }}>{children}</main>
      <footer style={{ gridRow: '3', gridColumn: '2', ... }}>
        {/* t('shell.footer.copyright', lang) */}
      </footer>
    </div>
  );
}
```

**Same vs different:**
- Same: same three CSS variables (`--shell-sidebar-w`, `--topbar-h`, `--footer-h`), same grid template, same CSS variable colors, same sidebar/main/footer grid assignment
- Different: calls `requireUser()` as first action; `<header>` region is now `<Topbar>` component (extracted); passes `session` data to Topbar; this is a layout (`children` prop) not a page

---

### `app/(admin)/[adminSegment]/layout.tsx` (layout — dynamic segment gate, request-response)

**Analog:** none exactly. Nearest shape is `app/(authed)/layout.tsx` + dynamic params.

**Core pattern from RESEARCH.md §7:**
```typescript
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  params,
  children,
}: {
  params: Promise<{ adminSegment: string }>;  // PITFALL §1.1: always Promise in Next.js 16
  children: React.ReactNode;
}) {
  const { adminSegment } = await params;   // MUST await

  // Step 1: URL obscurity — 404 on mismatch (D-18: NOT 403, preserves secrecy)
  if (adminSegment !== process.env.ADMIN_URL_SEGMENT) {
    notFound();
  }

  // Step 2: role gate — actual security (AUTH-15, PITFALLS §7.1)
  await requireAdmin();

  return (
    /* Same grid shell as AuthedLayout but Topbar receives isAdmin={true} */
    <div style={{ /* same grid CSS */ }}>
      <aside>...</aside>
      <Topbar displayName={...} lang={lang} theme={theme} isAdmin={true} />
      <main>{children}</main>
      <footer>...</footer>
    </div>
  );
}
```

**Same vs different:**
- Same as authed layout: `export const dynamic = 'force-dynamic'`, `requireAdmin()`, grid shell, Topbar
- Different: `params: Promise<{ adminSegment: string }>` must be awaited; segment check (`notFound()`) comes BEFORE `requireAdmin()` (URL obscurity first); Topbar receives `isAdmin={true}` to show ADMIN badge

---

### `app/error.tsx` (component — error boundary, event-driven)

**Analog:** none. Novel Next.js App Router convention. Pattern from RESEARCH.md §16.

**Core pattern from RESEARCH.md §16:**
```typescript
'use client';   // error.tsx MUST be a Client Component in Next.js App Router

export default function ErrorPage({
  error,
  reset,
}: { error: Error; reset: () => void }) {
  // Cannot use server-side t() or getCurrentLang() — 'use client' component
  // D-30: show no stack trace, no error.message to the user
  // console.error(error) for server logs only (in a useEffect to avoid SSR)
  return (
    <div style={{ /* UI-SPEC: same centered card as login, top-right toggles, retry button */ }}>
      <h1>Une erreur s'est produite. / Something went wrong.</h1>
      <button onClick={reset} className="btn-green">Réessayer / Retry</button>
    </div>
  );
}
```

**Same vs different:** No existing analog. Key constraints: must be `'use client'`; `reset` prop is the Next.js-provided retry function; cannot use `getCurrentLang()` (server-only) — either hardcode bilingual strings or read `document.cookie` client-side for `lt_lang`.

---

### `app/not-found.tsx` (component — 404, request-response)

**Analog:** none exact. Pattern from RESEARCH.md §16.

**Core pattern from RESEARCH.md §16:**
```typescript
// app/not-found.tsx — Server Component (unlike error.tsx)
import { getCurrentLang, t } from '@/lib/i18n';

export default async function NotFoundPage() {
  const lang = await getCurrentLang();
  return (
    <main style={{ /* UI-SPEC: centered, top-right toggles */ }}>
      <span style={{ fontSize: 48, fontWeight: 700, color: 'var(--navy)' }}>404</span>
      <h1 style={{ fontSize: '16.5px', fontWeight: 600 }}>{t('error.404.title', lang)}</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>{t('error.404.body', lang)}</p>
      <a href="/" className="btn-green">{t('error.404.button.home', lang)}</a>
    </main>
  );
}
```

**Same vs different:** Can be a Server Component (unlike error.tsx) so `getCurrentLang()` and `t()` work normally. No `'use client'` needed. Same top-right toggles layout pattern as login page.

---

### `src/components/Topbar.tsx` (component — server, request-response)

**Analog:** `app/page.tsx` topbar region (lines 43–60)

**Topbar region from analog:**
```typescript
<header style={{
  gridRow: '1', gridColumn: '2',
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  height: 'var(--topbar-h)',
  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
  padding: '0 1.5rem', gap: '0.75rem',
  position: 'sticky', top: 0, zIndex: 100,
}}>
  <LocaleToggle current={lang} />
  <ThemeToggle current={themeForToggle} />
</header>
```

**Core pattern for Topbar.tsx:**
```typescript
// src/components/Topbar.tsx — Server Component (renders display name server-side)
import { LocaleToggle } from './LocaleToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';   // 'use client' sub-component
import type { Lang } from '@/lib/i18n/dictionaries';

interface TopbarProps {
  displayName: string;
  lang: Lang;
  theme: 'light' | 'dark' | 'system';
  isAdmin?: boolean;
}

export function Topbar({ displayName, lang, theme, isAdmin }: TopbarProps) {
  return (
    <header style={{
      gridRow: '1', gridColumn: '2',
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      height: 'var(--topbar-h)',
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* page title slot — filled by child pages via context or slot prop */}
      {isAdmin && <span style={{ /* ADMIN badge: navy bg, white text, 9px uppercase pill */ }}>ADMIN</span>}
      <div style={{ flex: 1 }} />
      <LocaleToggle current={lang} />
      <ThemeToggle current={theme} />
      <UserMenu displayName={displayName} lang={lang} />
    </header>
  );
}
```

**Same vs different:**
- Same: all CSS variables (`var(--topbar-h)`, `var(--surface)`, `var(--border)`), `sticky`/`zIndex: 100`, mounts `<LocaleToggle current={...}>` and `<ThemeToggle current={...}>`
- Different: extracted into a named component (was inline); adds `<UserMenu>` client island; adds `isAdmin` ADMIN badge; right-side controls preceded by `flex: 1` spacer (not `justifyContent: flex-end`)

---

### `src/components/UserMenu.tsx` (component — client, event-driven)

**Analog:** `src/components/ThemeToggle.tsx`

**Client component with CSS variable colors from analog** (lines 1–45):
```typescript
'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { setTheme } from '@/lib/theme/actions';
import { startTransition } from 'react';

export function ThemeToggle({ current }: { current: ThemeOption }) {
  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ];

  return (
    <div className="inline-flex items-center rounded-full border p-1"
         style={{ background: 'var(--paper)', borderColor: 'var(--border)' }}
         role="radiogroup" aria-label="Theme">
      {options.map(({ value, icon: Icon, label }) => {
        const active = current === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={active}
                  aria-label={label}
                  onClick={() => startTransition(() => { void setTheme(value); })}
                  className="rounded-full px-3 py-1.5 transition-colors"
                  style={{
                    background: active ? 'var(--gd)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--muted)',
                  }}>
            <Icon size={17} strokeWidth={1.6} />
          </button>
        );
      })}
    </div>
  );
}
```

**Core pattern for UserMenu.tsx:**
```typescript
'use client';

import { LogOut, ChevronDown } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { useState, useEffect, useRef } from 'react';
import type { Lang } from '@/lib/i18n/dictionaries';

export function UserMenu({ displayName, lang }: { displayName: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      <button ref={triggerRef} type="button"
              aria-haspopup="menu" aria-expanded={open}
              onClick={() => setOpen(o => !o)}
              style={{ padding: '6px 12px', borderRadius: 9999,
                       background: 'transparent', color: 'var(--ink)' }}>
        {/* Avatar initials circle + display name + ChevronDown */}
        <ChevronDown size={14} strokeWidth={1.6} style={{ color: 'var(--muted)' }} />
      </button>
      {open && (
        <div role="menu"
             style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                      width: 240, background: 'var(--surface)',
                      border: '1px solid var(--border)', borderRadius: 12,
                      boxShadow: 'var(--shadow-card)' }}>
          {/* Header: display name + email (non-clickable) */}
          <button role="menuitem"
                  onClick={() => void authClient.signOut()}
                  style={{ /* hover: var(--hover-overlay) */ }}>
            <LogOut size={17} strokeWidth={1.6} style={{ color: 'var(--muted)' }} />
            {lang === 'fr' ? 'Se déconnecter' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Same vs different:**
- Same: `'use client'`, Lucide icons with `size={17} strokeWidth={1.6}`, CSS variable colors, `var(--surface)`, `var(--border)`, `var(--hover-overlay)`
- Different: uses `useState`/`useRef`/`useEffect` for dropdown state (toggle is stateless); calls `authClient.signOut()` on logout (NEVER direct POST — D-24/PITFALLS §2.6); implements Escape + outside-click close (UI-SPEC accessibility floor); no `startTransition` (logout is a user-initiated navigation)

---

### `src/components/InviteUrlModal.tsx` (component — client, event-driven)

**Analog:** `src/components/ThemeToggle.tsx` (client component shape)

**Same `'use client'` + CSS variable + Lucide icon pattern as UserMenu.tsx.** Key specifics:

```typescript
'use client';
import { Copy, Check, X, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Lang } from '@/lib/i18n/dictionaries';

interface InviteUrlModalProps {
  url: string;
  kind: 'invite' | 'reset';
  lang: Lang;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;  // for focus restoration on close
}

export function InviteUrlModal({ url, kind, lang, onClose, triggerRef }: InviteUrlModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Escape close + focus trap
  useEffect(() => { /* same pattern as UserMenu */ }, []);

  return (
    <>
      {/* Backdrop: fixed inset-0, rgba(17,44,59,0.5), backdrop-filter blur(4px) */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,44,59,0.5)',
                    backdropFilter: 'blur(4px)', zIndex: 200 }}
           onClick={onClose} aria-hidden="true" />
      {/* Panel: fixed centered transform */}
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title"
           style={{ position: 'fixed', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--surface)', borderRadius: 16, padding: 28,
                    width: '100%', maxWidth: 520, zIndex: 201 }}>
        {/* Header + warning banner (gold, AlertTriangle) + URL block + Copy/Close buttons */}
        <button onClick={handleCopy} className="btn-green">
          {copied
            ? <><Check size={17} strokeWidth={1.6} /> {lang === 'fr' ? 'Lien copié' : 'Link copied'}</>
            : <><Copy size={17} strokeWidth={1.6} /> {lang === 'fr' ? 'Copier le lien' : 'Copy link'}</>
          }
        </button>
      </div>
    </>
  );
}
```

**Same vs different:**
- Same: `'use client'`, CSS variables, Lucide icons at `size={17} strokeWidth={1.6}`
- Different: renders a backdrop overlay + centered dialog panel (not a dropdown); focus trap must cycle X → URL block → Copy → Close; focus restores to `triggerRef.current` on close; `navigator.clipboard.writeText()` for copy

---

### `src/lib/i18n/dictionaries.ts` (utility — data, extended)

**Analog:** `src/lib/i18n/dictionaries.ts` (current — same file, extend it)

**Current shape to preserve** (all 20 lines):
```typescript
export const dictionaries = {
  fr: {
    welcomeHeading: 'Bienvenue sur Leasétic Matrice',
    welcomeSubtext: 'Application en cours de déploiement.',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    themeSystem: 'Système',
  },
  en: {
    welcomeHeading: 'Welcome to Leasétic Matrice',
    welcomeSubtext: 'Application deployment in progress.',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
  },
} as const;

export type Lang = keyof typeof dictionaries;
export type DictKey = keyof typeof dictionaries.fr;
```

**What changes:**
- The `dictionaries` object grows from 5 keys to 225 keys (166 v10 keys + 59 new Phase-6 keys)
- Key names switch to dot-notation strings (`'auth.signin.title'`, `'shell.footer.copyright'`, etc.) per D-26 — keep existing 5 keys OR replace them; the planner decides (existing keys used in `app/page.tsx` which will be retired anyway)
- `DictKey` becomes `keyof typeof dictionaries.fr` automatically (TypeScript union of all 225 keys)
- Add type-level parity check: `type _EnHasAllFrKeys = { [K in DictKey]: K extends keyof typeof dictionaries.en ? true : never }`
- `Lang` type unchanged (`'fr' | 'en'`)
- `t()` helper in `src/lib/i18n/index.ts` requires NO changes
- Key source: extract from `Matrice_2026_THE_Leasetic-v10.html` I18N object (~lines 870–1108) for v10 keys; add Phase-6-specific keys from UI-SPEC §i18n Dictionary Expansion table

---

### `src/lib/i18n/format.ts` (utility, transform)

**Analog:** `src/lib/i18n/index.ts` (pure module, no I/O)

**Pure module pattern from analog** (lines 1–29):
```typescript
import { cookies } from 'next/headers';
import { dictionaries, type Lang, type DictKey } from './dictionaries';

export function t(key: DictKey, lang: Lang): string {
  return dictionaries[lang][key] ?? dictionaries.fr[key];
}
```

**Core pattern for format.ts (from RESEARCH.md §13):**
```typescript
// src/lib/i18n/format.ts — no I/O, no framework imports
// Importable from both client and server
type Lang = 'fr' | 'en';

const LOCALES: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',    // D-28: GB not US
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

**Same vs different:**
- Same: pure named function exports, no I/O, no framework imports, `type Lang`
- Different: wraps `Intl` not a dictionary lookup; always passes explicit locale (never `undefined` — SHELL-09 requirement)

---

### `src/lib/theme/actions.ts` (server action — extended, CRUD)

**Analog:** `src/lib/theme/actions.ts` (current — same file, extend it)

**Current pattern to preserve** (lines 1–23 already read above — `'use server'`, allowlist guard, cookie write, `revalidatePath('/')`)

**Extension from RESEARCH.md §12 — add after cookie write:**
```typescript
// ADD to existing setTheme() — after the cookie set:
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

// (inside setTheme, after c.set(...)):
const session = await auth.api.getSession({ headers: await headers() });
if (session) {
  await db().update(schema.users)
    .set({ theme })
    .where(eq(schema.users.id, session.user.id));
}
```

**Same vs different:** Same file structure, same `'use server'` guard, same cookie logic; add imports for `auth`, `headers`, `db`, `schema`, `eq`; add conditional DB write after the cookie write.

---

### `src/lib/i18n/actions.ts` (server action — extended, CRUD)

**Analog:** `src/lib/i18n/actions.ts` (current — same file, same pattern as theme/actions.ts extension)

**Mirror the theme/actions.ts extension exactly:** after `c.set('lt_lang', ...)`, add `auth.api.getSession()` call and `db().update(schema.users).set({ language: lang })` when authenticated. Same imports, same pattern, different field (`language` not `theme`).

---

## Shared Patterns

### `'use server'` Server Action Pattern

**Source:** `src/lib/theme/actions.ts` (lines 1–23) and `src/lib/i18n/actions.ts` (lines 1–24)
**Apply to:** `src/lib/auth/actions.ts`, extended `src/lib/theme/actions.ts`, extended `src/lib/i18n/actions.ts`

```typescript
'use server';
// Runtime allowlist guard before any mutation
const ALLOWED = [...] as const;
export async function doSomething(value: AllowedType) {
  if (!ALLOWED.includes(value as AllowedType)) return; // silent reject
  // ... mutation
  revalidatePath('/');
}
```

**Contract:** `'use server'` first; runtime allowlist guard; `revalidatePath('/')` at end; return `void` or `{ error: string }` — never throw to the client.

---

### Bounded Error Redaction Pattern

**Source:** `src/lib/health.ts` `classifyError()` (lines 28–44)
**Apply to:** `src/lib/auth/require.ts`, login form error handling

```typescript
function classifyError(e: unknown): string {
  if (e instanceof DbAuthError) return 'auth failed';
  if (e && typeof e === 'object' && 'code' in e) {
    const code = String((e as { code?: unknown }).code ?? '');
    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') return 'connection failed';
  }
  return 'unknown error';
}
```

**Auth variant (D-22):** Login form ALWAYS returns the same generic string regardless of failure reason. Never distinguish "user not found" from "bad password" from "account disabled" at the HTTP response level.

---

### `export const dynamic = 'force-dynamic'`

**Source:** `app/page.tsx` (line 6), `app/healthz/route.ts` (line 22)
**Apply to:** ALL pages and layouts in `(authed)/`, `(admin)/`, `(public)/login/`, `(public)/invite/`, `(public)/reset/`, `app/api/auth/[...all]/route.ts`, `app/not-found.tsx`

Any page/route that reads cookies (`auth.api.getSession`, `getCurrentLang`, `getCurrentTheme`) must opt out of static rendering. Forgetting this causes stale SSR renders (PITFALLS §1.6).

---

### `await params` / `await searchParams` — PITFALL §1.1

**Source:** RESEARCH.md §9 P3
**Apply to:** `app/(admin)/[adminSegment]/layout.tsx`, `app/(public)/invite/[token]/page.tsx`, `app/(public)/reset/[token]/page.tsx`, `app/(public)/login/page.tsx`

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;  // typed as Promise in Next.js 16
}) {
  const { token } = await params;  // MUST await — runtime error if not
}
```

---

### CSS Variable Color Usage

**Source:** `src/components/ThemeToggle.tsx` (lines 17–44), `app/page.tsx` (throughout)
**Apply to:** ALL new components in Phase 6

```typescript
// Always use CSS variables — never hardcoded hex except #ffffff in active buttons
style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink)' }}
style={{ color: 'var(--muted)' }}                           // muted text
style={{ background: 'var(--gd)', color: '#ffffff' }}       // primary action
style={{ background: 'var(--hover-overlay)' }}              // hover state
// Danger inline error (D-22 login error banner):
style={{ background: 'rgba(220,38,38,0.06)', borderLeft: '1px solid var(--danger)', color: 'var(--danger)' }}
```

---

### Lucide Icon Usage

**Source:** `src/components/ThemeToggle.tsx` (lines 3, 39)
**Apply to:** `src/components/Topbar.tsx`, `src/components/UserMenu.tsx`, `src/components/InviteUrlModal.tsx`, login/invite/reset form client components

```typescript
import { LogOut, ChevronDown, Copy, Check, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
// UI icons: size={17} strokeWidth={1.6}
// Decorative/empty-state: size={38} strokeWidth={1.3} (error boundary icon)
<LogOut size={17} strokeWidth={1.6} />
```

---

### `startTransition` for Server Action Calls

**Source:** `src/components/ThemeToggle.tsx` (line 32), `src/components/LocaleToggle.tsx` (line 20)
**Apply to:** Extended `<ThemeToggle>` and `<LocaleToggle>` when they write to DB; any Client Component calling a Server Action non-navigationally

```typescript
onClick={() => startTransition(() => { void setTheme(value); })}
```

---

## No Analog Found

Files with no close match in the codebase (planner uses RESEARCH.md excerpts directly):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `proxy.ts` | middleware | request-response | Next.js 16 `proxy.ts` convention — no existing middleware in codebase |
| `src/lib/auth/schemas.ts` | utility (Zod) | transform | No existing Zod schema modules in codebase yet |
| `app/(admin)/[adminSegment]/layout.tsx` | layout | request-response | No dynamic segment layout exists; novel pattern |
| `app/error.tsx` | component | event-driven | Next.js error boundary convention — no existing error.tsx |
| `app/not-found.tsx` | component | request-response | Next.js 404 convention — no existing not-found.tsx |

---

## Critical Research Overrides (RESEARCH.md supersedes CONTEXT.md on facts)

| CONTEXT.md assumption | RESEARCH.md finding | Impact on planner |
|---|---|---|
| `middleware.ts` | `proxy.ts` — Next.js 16 renamed convention; export is `proxy` not `middleware` | All plan tasks must reference `proxy.ts`, not `middleware.ts` |
| JWT sessions | DB sessions — Better Auth default; revocation via `auth.api.revokeUserSessions()` + `session_version` secondary check | `requireUser()` calls `auth.api.getSession()`, not JWT decode |
| `users.id uuid pk` | `users.id text pk` — Better Auth uses nanoid string IDs | `password_resets.user_id` is `text` FK not `uuid` |
| `users.password_hash text` | Password stored in `accounts.password` — Better Auth owns this | Do NOT add `password_hash` to `users` table |
| `drizzle-kit 0.30.1` | Upgrade to `0.31.10` — Better Auth peer dep `>=0.31.4` | Wave 0 task before any schema generation |
| `@better-auth/drizzle-adapter` (separate package) | Bundled in `better-auth` — import from `better-auth/adapters/drizzle` | No separate install needed |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/components/`, `src/db/`, `app/`, `scripts/`, `drizzle/`
**Files scanned:** 28 existing source files read
**Pattern extraction date:** 2026-05-07
