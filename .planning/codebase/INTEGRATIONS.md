# External Integrations

**Analysis Date:** 2026-05-24

## APIs & External Services

**Hosting / Compute:**
- **Vercel** — primary production host. Project metadata at `.vercel/project.json` (project ID `prj_Th9bJEtzUvmtov2eTtnKas9g6Xxf`).
  - Purpose: serverless Node.js functions, edge static delivery, build pipeline, environment-var management.
  - Env vars consumed: `VERCEL_URL` (auto-injected fallback for `APP_URL` at `src/lib/auth/index.ts:66`), `GIT_COMMIT_SHA` (auto-injected; pinned into `generateBuildId` at `next.config.ts:9`).
  - Files: `next.config.ts` (`output: 'standalone'`), `vercel.json` (cron schedule).
  - Auth model: Vercel team OAuth (out-of-band; not used by app at runtime).
  - Portability: every Vercel-only SDK is isolated behind an adapter; `eslint.config.mjs:47-91` enforces that direct `@vercel/blob`, `@vercel/postgres`, `@vercel/kv`, `@vercel/edge-config` imports outside adapter dirs fail lint. CI grep `scripts/check-no-vercel-only-imports.sh` is the second layer.

**Database:**
- **Neon Postgres** — serverless Postgres (production + preview branches on Vercel).
  - Purpose: primary application datastore (users, sessions, accounts, verifications, password_resets, proposals, global_params, audit_log, coefficient_history; schema in `src/db/schema.ts`).
  - SDK: `@neondatabase/serverless` 0.10.4 (HTTP driver, stateless).
  - Driver selection: automatic via host pattern — hosts ending in `.neon.tech` or `.neon.build` get the Neon HTTP driver, anything else gets postgres-js (`src/lib/db/client.ts:19-30`).
  - Env vars: `DATABASE_URL` (with `?pgbouncer=true&connection_limit=1` recommended by `.env.example:5`).
  - Files using it: `src/lib/db/client.ts:3,44` (only allowed location; all other code goes through `import { db } from '@/lib/db'`).
  - Auth model: connection-string credentials (user:pass in URL).
  - **Forbidden alternatives:** `@vercel/postgres` is explicitly blocked at lint level (`eslint.config.mjs:54-56`) — package is discontinued.

- **Postgres (postgres-js driver)** — used for OVH managed Postgres, localhost, CI placeholder, and migration script.
  - Purpose: same as above, but for non-Neon hosts.
  - SDK: `postgres` 3.4.5.
  - Files using it: `src/lib/db/client.ts:4,49` and `scripts/migrate.ts:23` (migrations always go through postgres-js, even against Neon, because the Neon HTTP driver lacks DDL-in-transaction semantics per `scripts/migrate.ts:13-16`).
  - Pool: `max: 1, prepare: false` (PgBouncer transaction-pooling compatibility, `src/lib/db/client.ts:49`).

## Data Storage

**Databases:**
- Postgres (provider above) — Drizzle ORM schema source-of-truth at `src/db/schema.ts` (336 lines).
- Migration files: `drizzle/0000_*.sql` through `drizzle/0004_phase12_drafts_and_history.sql` (versioned, committed to git).
- Migration runner: `scripts/migrate.ts` (production: gated GitHub Action `.github/workflows/db-migrate.yml`).
- Health probe: `app/healthz/route.ts` SELECTs from `schema_meta` via the db adapter (`src/lib/health.ts:51-62`).
- Tables (defined in `src/db/schema.ts`):
  - `schema_meta` — baseline + healthz target.
  - Better Auth core: `users`, `sessions`, `accounts`, `verifications` (Better Auth `usePlural: true` maps internal singular names).
  - App-owned: `password_resets`, `proposals`, `global_params`, `audit_log`, `coefficient_history`.

**File Storage (Blob):**
- **Vercel Blob** (Vercel scope; STORAGE_DRIVER=vercel).
  - Purpose: store generated proposal PDFs (`pdf_blob_key` column on `proposals`).
  - SDK: `@vercel/blob` 2.3.3.
  - Env vars: `BLOB_READ_WRITE_TOKEN` (auto-injected by Vercel when a Blob store is connected; `src/lib/storage/vercel-blob.ts:40-46`).
  - Access mode: private only (`access: 'private'` hardcoded at `src/lib/storage/vercel-blob.ts:34`). Direct unauthed fetches return 403. Reads must go through the SDK with the token.
  - Cache: `cacheControlMaxAge: 0` enforced (`src/lib/storage/vercel-blob.ts:69`).
  - Files using it: `src/lib/storage/vercel-blob.ts` (only allowed location; outside this dir, ESLint blocks the import per `eslint.config.mjs:48-51`).
  - Application proxy: PDF reads always go through `app/api/proposals/[id]/pdf/` (auth + ownership checks).

- **OVH Object Storage / S3-compatible** (OVH scope; STORAGE_DRIVER=s3).
  - Purpose: same as above, for the OVH portability target.
  - SDK: `@aws-sdk/client-s3` 3.700.0 + `@aws-sdk/s3-request-presigner` 3.700.0.
  - Env vars: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (all 5 required; missing-var diagnostic at `src/lib/storage/s3.ts:33-43`).
  - Critical setting: `forcePathStyle: true` (`src/lib/storage/s3.ts:50`) — required for OVH and most non-AWS S3-compatible providers.
  - ACL: `private` on every PUT.
  - Compatibility note: works with AWS S3, OVH Object Storage, Scaleway, MinIO, Cloudflare R2 (any S3-compatible endpoint).
  - Files using it: `src/lib/storage/s3.ts` (only allowed location).
  - Auth model: access key + secret key.

**Caching:**
- None — no Redis, no `@vercel/kv` (latter explicitly blocked at lint level, `eslint.config.mjs:57-60`).
- In-process memoized singletons: `db()` (`src/lib/db/index.ts:13`), `storage()` (`src/lib/storage/index.ts:43`), `auth()` (`src/lib/auth/index.ts:185`). All have `__resetForTests()` escape hatches.

## Authentication & Identity

**Auth Provider:**
- **Better Auth 1.6.9** — self-hosted, DB-backed (Drizzle adapter).
  - Implementation: `src/lib/auth/index.ts` (server, lazy singleton); `src/lib/auth/client.ts` (browser, `createAuthClient`).
  - Provider: email + password ONLY. `disableSignUp: true` — admin-mediated invitation only (`src/lib/auth/index.ts:87`).
  - No SSO, no OAuth.
  - Hashing: argon2id via `@node-rs/argon2` 2.0.2; work factors tuned for Vercel cold-start (`memoryCost: 19456, timeCost: 2, parallelism: 1` at `src/lib/auth/index.ts:97-100`).
  - Session: DB-backed, 8h sliding lifetime (`expiresIn: 60*60*8`), 1h sliding refresh, 5-minute cookie cache for revocation latency bound (`src/lib/auth/index.ts:111-121`).
  - Roles: `partner` (default) | `admin` — `users.role` column with CHECK constraint (`src/db/schema.ts:63`).
  - Additional fields registered on Better Auth: `role`, `displayName`, `language`, `theme`, `sessionVersion`, `createdBy`, `deletedAt`, `lastLoginAt` (`src/lib/auth/index.ts:127-136`); `role` and `sessionVersion` are `input: false` to prevent self-elevation via `/api/auth/update-user`.
  - Database hooks: lowercase email on user.create.before; write `users.last_login_at` on session.create.after (best-effort, `src/lib/auth/index.ts:140-162`).
  - Plugins: `nextCookies()` (Server Action / Route Handler cookie integration) and `admin()` (provides `auth().api.revokeUserSessions`).
  - Trusted origins: `[APP_URL, http://localhost:3000]`.
  - Env vars consumed: `AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `VERCEL_URL` (fallback only).
  - HTTP endpoints: catch-all at `app/api/auth/[...all]/route.ts` delegates to `toNextJsHandler(auth())` (excluded from the proxy matcher at `proxy.ts:80`).
  - Auth gate: `proxy.ts` does cookie-only check via `getSessionCookie` from `better-auth/cookies` (no DB lookup); role checks live in `src/lib/auth/require.ts` (`requireUser` / `requireAdmin`).
  - Client-side rule: **always** use `authClient.signIn.email(...)` etc.; never POST directly to `/api/auth/...` (skips CSRF protections per `src/lib/auth/client.ts:5-8`).

**Invitation / Reset Tokens:**
- Application-owned, NOT Better Auth (`password_resets` table).
- 32 random bytes via `node:crypto.randomBytes`, URL-safe base64 plaintext shared with partner; SHA-256 hex stored in DB (`src/lib/auth/tokens.ts:25-29`).
- Distribution: pseudo-Stripe pattern — admin copies the invite/reset URL from the UI (`src/components/InviteUrlModal.tsx`) and sends it out-of-band (no automated email).
- Public routes whitelisted in `proxy.ts:55-62`: `/login`, `/invite/<token>`, `/reset/<token>`.

## Monitoring & Observability

**Error Tracking:**
- None integrated (no Sentry, Datadog, etc.).
- Server errors: `console.error` with bounded messages; raw error objects logged to Vercel logs but never returned in responses (per `src/lib/health.ts` redaction pattern).
- Health probe: `GET /healthz` (`app/healthz/route.ts`) exercises DB SELECT + blob round-trip; returns 200/503 with bounded message strings.

**Logs:**
- `console.log` / `console.error` to Vercel runtime logs (the production observability surface per `app/api/internal/purge-soft-deleted/route.ts:25` comment).
- No structured logging library.
- Application audit trail: `audit_log` table (`src/db/schema.ts:285-298`) records `proposal.create`, `proposal.create_failed`, `proposal.delete`, `proposal.restore`, `proposal.purge`, `global_params.update`, `user.create`, `user.disable`, `user.re_enable`, `role.grant`.
- Append-only coefficient history: `coefficient_history` table with DB-level UPDATE/DELETE triggers (`drizzle/0004_phase12_drafts_and_history.sql`).

## CI/CD & Deployment

**Hosting:**
- Vercel (production) — `.vercel/project.json`.
- OVH (portability target) — see `docs/operations/deploy-ovh.md`.

**CI Pipeline:**
- GitHub Actions:
  - `.github/workflows/ci.yml` — runs on PR + push to `main`. Steps: `npm ci` → `typecheck` → `lint:check` (max-warnings=0) → `check:no-vercel-imports` → `check:no-drizzle-push` → `check:seed-sql` → `check:no-v10-localstorage` → `vitest` → `next build` (with placeholder env vars) → verify `.next/standalone/server.js`.
  - `.github/workflows/db-migrate.yml` — manual `workflow_dispatch` only. Requires typing `MIGRATE PROD` exactly. Two jobs: `dry-run` lists pending migrations; `apply` runs against the `production` GitHub Environment (human-approval gate). Reads `DATABASE_URL_PROD` secret.
- Both workflows pin Node.js 22 and use `actions/setup-node@v4` with npm cache.

**Deployment:**
- Vercel: automatic on push to main; build runs `next build` and emits `.next/standalone/`.
- OVH: smoke harness at `scripts/smoke-ovh.ts`; deploy script must export `GIT_COMMIT_SHA` explicitly (`next.config.ts:9` falls back to `'dev-build'`).

## Environment Configuration

**Required env vars (production):**
- `DATABASE_URL` (Neon prod connection string).
- `STORAGE_DRIVER` = `vercel`.
- `BLOB_READ_WRITE_TOKEN` (auto-injected by Vercel Blob).
- `AUTH_SECRET` (min 32 chars; generate with `openssl rand -base64 32`).
- `APP_URL` + `NEXT_PUBLIC_APP_URL` (same value; production URL).
- `ADMIN_URL_SEGMENT` (random ~12-char URL-safe slug; gates `/[adminSegment]/...` admin tree).
- `CRON_SECRET` (Vercel-reserved name; auto-injected as `Authorization: Bearer ...` by Vercel Cron).
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (required if multi-instance).
- `NEXT_PUBLIC_PRIVACY_URL_FR` / `NEXT_PUBLIC_PRIVACY_URL_EN` (optional; fallbacks documented in `.env.example:73-81`).

**Required env vars (OVH cutover, Phase 10):**
- `STORAGE_DRIVER` = `s3`.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- `GIT_COMMIT_SHA` (set by deploy script).
- All other production vars unchanged.

**Required env vars (GitHub Actions production):**
- `DATABASE_URL_PROD` secret on `production` environment (consumed by `db-migrate.yml:88`).

**Secrets location:**
- Vercel Project Settings → Environment Variables (per scope: Production / Preview / Development).
- GitHub Settings → Environments → `production` → Environment secrets (for `DATABASE_URL_PROD`).
- Local: `.env.local` and `.env.production.local` (gitignored at `.gitignore:10-11, 19`).
- `.env.example` is the canonical contract (committed; documents every var with comments).

## Webhooks & Callbacks

**Incoming:**
- `POST /api/auth/[...all]` (`app/api/auth/[...all]/route.ts`) — Better Auth's internal sign-in / sign-out / get-session / refresh endpoints; delegated entirely to `toNextJsHandler(auth())`. Excluded from the proxy matcher (`proxy.ts:80`).
- `POST /api/proposals` (`app/api/proposals/route.ts`) — proposal submission. Reads `Idempotency-Key` header. Auth-gated via `requireUser()`.
- `GET /api/proposals` — list/search proposals (cursor pagination).
- `POST /api/proposals/[id]/delete`, `POST /api/proposals/[id]/restore`, `POST /api/proposals/finalize`, `GET /api/proposals/[id]/pdf`, `GET /api/proposals/[id]` — proposal CRUD + PDF download (all auth-gated).
- `POST /api/internal/purge-soft-deleted` (`app/api/internal/purge-soft-deleted/route.ts`) — dual-auth:
  - Gate A: `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron; `timingSafeEqual` comparison at line 36).
  - Gate B: admin session (manual ad-hoc invocation).
  - Either alone is sufficient; 401 on neither.
  - Scheduled by `vercel.json:4-7`: cron `0 3 1,15 * *` (2x/month at 03:00 UTC).
- `GET /healthz` (`app/healthz/route.ts`) — unauthenticated health probe. DB SELECT + blob round-trip. Returns 200/503.

**Outgoing:**
- No outbound HTTP integrations.
- No email sending (no SMTP, no SendGrid, no Resend, no Postmark — confirmed by grep).
- Invitation/reset URLs are surfaced in the admin UI for out-of-band delivery (`src/components/InviteUrlModal.tsx`); admin sends them to the partner manually.

---

*Integration audit: 2026-05-24*
