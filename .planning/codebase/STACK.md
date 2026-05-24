# Technology Stack

**Analysis Date:** 2026-05-24

## Languages

**Primary:**
- TypeScript 5.7.2 — all application code under `app/`, `src/`, `scripts/`, `tests/`, `__tests__/`, `__pdf-fixtures__/`. Strict mode enabled in `tsconfig.json` (`"strict": true`, `"noEmit": true`).
- JSX/TSX — React 19 components under `src/components/`, `app/`.

**Secondary:**
- SQL — versioned migration files under `drizzle/*.sql` (4 migrations: `0000_striped_metal_master.sql` through `0004_phase12_drafts_and_history.sql`).
- Bash — defense-in-depth grep scripts under `scripts/check-*.sh`.
- CSS — Tailwind v4 + custom properties in `app/globals.css`.

## Runtime

**Environment:**
- Node.js 22 — pinned in CI (`.github/workflows/ci.yml` line 32: `node-version: '22'`) and in `.github/workflows/db-migrate.yml`.
- No `.nvmrc`, `.node-version`, or `engines` field in `package.json` — Node 22 is enforced only via CI workflows and runtime hosts (Vercel, OVH).
- Next.js 16.2.4 App Router, served via `next dev` (local) and `next start` against the `standalone` build output (production).
- `next.config.ts` line 4 sets `output: 'standalone'` — CI gate verifies `.next/standalone/server.js` after build.

**Package Manager:**
- npm — `package-lock.json` is the committed lockfile (497 KB). CI uses `npm ci` from lockfile.
- Lockfile: present (`package-lock.json`).

## Frameworks

**Core:**
- Next.js 16.2.4 — App Router only (`app/` directory). No Pages Router.
  - Standalone build output (`next.config.ts`).
  - `proxy.ts` is the request gate (Next.js 16 replacement for deprecated `middleware.ts`; uses `export function proxy` per Next.js 16 naming).
  - `generateBuildId` pinned to `GIT_COMMIT_SHA` env var for OVH parity (`next.config.ts:9`).
- React 19.0.0 + React DOM 19.0.0.
- TypeScript 5.7.2 with `moduleResolution: 'bundler'`, `target: 'ES2022'`, JSX `react-jsx`. Path alias `@/*` → `./src/*` (`tsconfig.json:25-29`).

**Testing:**
- Vitest 2.1.8 with jsdom 25.0.1 environment (`vitest.config.ts`).
- @testing-library/react 16.1.0 + @testing-library/jest-dom 6.6.3.
- Setup file: `__tests__/setup-dom.ts` registers jest-dom matchers.
- Test glob: `src/**/*.test.{ts,tsx}`, `app/**/*.test.{ts,tsx}`, `__pdf-fixtures__/**/*.test.ts`, `tests/**/*.test.{ts,tsx}` (`vitest.config.ts:9`).

**Build/Dev:**
- Tailwind CSS v4.2.4 via `@tailwindcss/postcss` 4.2.4 (single import in `app/globals.css:1`: `@import 'tailwindcss';`).
- PostCSS 8.4.49 (`postcss.config.mjs` registers `@tailwindcss/postcss` plugin).
- tsx 4.19.2 — runs TypeScript scripts (migrations, seed, smoke tests) directly without a build step.
- drizzle-kit 0.31.10 — schema → SQL migration generator (`drizzle.config.ts`).

## Key Dependencies

**Critical (runtime):**
- `next` 16.2.4 — framework.
- `react` 19.0.0 / `react-dom` 19.0.0 — UI runtime.
- `drizzle-orm` 0.45.2 — type-safe SQL builder + schema source-of-truth (`src/db/schema.ts`).
- `@neondatabase/serverless` 0.10.4 — Neon HTTP driver, used only when host matches `*.neon.tech` / `*.neon.build` (`src/lib/db/client.ts:28`).
- `postgres` 3.4.5 — postgres-js TCP driver for OVH / localhost / non-Neon Postgres. Pool capped at `max: 1, prepare: false` (`src/lib/db/client.ts:49`).
- `better-auth` 1.6.9 — authentication core with drizzle adapter + admin plugin (`src/lib/auth/index.ts`).
- `@node-rs/argon2` 2.0.2 — password hashing (argon2id, memoryCost 19456, timeCost 2, parallelism 1; tuned for Vercel cold start per `src/lib/auth/index.ts:97-100`).
- `@vercel/blob` 2.3.3 — blob storage driver (private access only, `src/lib/storage/vercel-blob.ts:34`).
- `@aws-sdk/client-s3` 3.700.0 + `@aws-sdk/s3-request-presigner` 3.700.0 — S3-compatible driver (OVH Object Storage, R2, MinIO; `forcePathStyle: true` for OVH at `src/lib/storage/s3.ts:50`).
- `@react-pdf/renderer` 4.5.1 — PDF generation. Allowed import only from `src/lib/pdf/**` (ESLint guard at `eslint.config.mjs:77-81, 130-141`).
- `react-hook-form` 7.75.0 + `@hookform/resolvers` 5.2.2 + `zod` 4.4.3 — form validation pipeline.
- `sonner` 2.0.7 — toast notifications, mounted in `app/layout.tsx:56`.
- `lucide-react` 0.469.0 — icon components.
- `server-only` 0.0.1 — runtime guard imported at top of server-only modules (`src/lib/pdf/render.ts:1`, `src/lib/auth/tokens.ts` etc.).

**Critical (dev/CI):**
- `eslint` 9.18.0 + `eslint-config-next` 16.2.4 + `typescript-eslint` 8.20.0 — flat config in `eslint.config.mjs`.
- `dotenv` 16.4.7 — used by scripts and `drizzle.config.ts:1` to load `.env.local`.
- `jsdom` 25.0.1 — DOM polyfill for component tests.

**Infrastructure:**
- `drizzle-kit` (devDep) — `db:generate` and `db:check` only. `drizzle-kit push` is explicitly forbidden (`drizzle.config.ts:15-18`); enforced by `scripts/check-no-drizzle-push.sh` in CI.

## Configuration

**Environment:**
- `.env.example` is the canonical contract (root). `.env.local` (gitignored) holds dev values; `.env.production.local` mirrors Vercel Production scope locally for offline reference (both excluded by `.gitignore:10-11, 19`).
- Drizzle config loads `.env` via `dotenv/config` at the top of `drizzle.config.ts:1`.
- Required vars consumed by app code (grep of `process.env.*` in `src/`, `app/`, `scripts/`, `proxy.ts`, `next.config.ts`, `drizzle.config.ts`):
  - `DATABASE_URL` — Postgres connection string. Driver chosen by host pattern.
  - `STORAGE_DRIVER` — `vercel` | `s3`. Selects blob adapter.
  - `BLOB_READ_WRITE_TOKEN` — Vercel Blob token (when `STORAGE_DRIVER=vercel`).
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — S3 driver credentials.
  - `AUTH_SECRET` — Better Auth HMAC key (min 32 chars).
  - `APP_URL` — server-side base URL for Better Auth callbacks (`src/lib/auth/index.ts:64`, `src/lib/auth/actions.ts:34`).
  - `NEXT_PUBLIC_APP_URL` — client-side base URL for `createAuthClient` (`src/lib/auth/client.ts:18`).
  - `ADMIN_URL_SEGMENT` — random URL-safe slug gating the `/[adminSegment]/...` admin tree.
  - `CRON_SECRET` — Vercel-reserved name; bearer token for `/api/internal/purge-soft-deleted`.
  - `NEXT_PUBLIC_PRIVACY_URL_FR` / `NEXT_PUBLIC_PRIVACY_URL_EN` — public privacy links on `/login` footer (fallback to `https://leasetic.fr/mentions-legales` / `.../privacy-policy`).
  - `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` — required for multi-instance Server Actions (OVH).
  - `GIT_COMMIT_SHA` — Vercel auto-injects; OVH deploy script must set explicitly (pins `generateBuildId`).
  - `VERCEL_URL` — Vercel-only fallback when `APP_URL` is unset (`src/lib/auth/index.ts:66`).
  - `NODE_ENV` — gate for `app/dev/**` diagnostic routes (`eslint.config.mjs:107`).
- Script-only env vars: `DATABASE_URL_TEST`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `INITIAL_PASSWORD`, `BACKFILL_CONFIRM`, `CONFIRM`.

**Build:**
- `next.config.ts` — standalone output, redirect `/[adminSegment]/accounts/*` → `/[adminSegment]/partners/*` 308 permanent.
- `tsconfig.json` — bundler resolution, `noEmit: true`, `incremental: true`.
- `vitest.config.ts` — jsdom environment, `@` alias mirror.
- `vercel.json` — single cron entry: `POST /api/internal/purge-soft-deleted` at `0 3 1,15 * *` (2x/month at 03:00 UTC).
- `eslint.config.mjs` — flat config; two layers of OVH-portability protection:
  - Layer 1: `no-restricted-imports` blocks direct `@vercel/blob`, `@vercel/postgres`, `@vercel/kv`, `@vercel/edge-config`, `@neondatabase/serverless`, `postgres`, `@react-pdf/renderer`, `@aws-sdk/*` outside their respective adapter directories.
  - Layer 2: `scripts/check-no-vercel-only-imports.sh` CI grep — defense in depth against dynamic imports.
  - Also blocks hardcoded JSX text (`no-restricted-syntax` with i18n selector) and zero-arg `Intl.NumberFormat()` / `Intl.DateTimeFormat()` (locale must be explicit).

## Platform Requirements

**Development:**
- Node.js 22.x (matches CI; not pinned via `.nvmrc`).
- npm (lockfile-based install: `npm ci`).
- A reachable Postgres instance for `DATABASE_URL` (local Postgres, Neon dev branch, etc.).
- A reachable blob store: Vercel Blob (token in `.env.local`) or S3-compatible.

**Production:**
- **Primary host:** Vercel (project ID `prj_Th9bJEtzUvmtov2eTtnKas9g6Xxf`, org `team_b22P56dgh6tYIkM8mgRASgN2`, project name `leasetic-matrice` per `.vercel/project.json`).
- **Portability target:** OVH Web Hosting (Node.js standalone output + S3-compatible storage + managed Postgres). All Vercel-specific SDKs are isolated behind adapters in `src/lib/storage/` and `src/lib/db/`. Smoke harness: `scripts/smoke-ovh.ts`.
- **Database:** Neon Postgres on Vercel (`?pgbouncer=true&connection_limit=1`); OVH managed Postgres via postgres-js.
- **Storage:** Vercel Blob (private access store) on Vercel; OVH Object Storage on OVH.
- **Cron:** Vercel Cron auto-injects `Authorization: Bearer $CRON_SECRET` per `vercel.json`. OVH crontab must wire bearer header manually (see `docs/operations/deploy-ovh.md`).
- **Migrations:** Production migrations apply ONLY through the manual GitHub Actions workflow `.github/workflows/db-migrate.yml` (requires typing `MIGRATE PROD` confirmation + the `production` GitHub Environment approval gate). `drizzle-kit push` is forbidden codebase-wide.

---

*Stack analysis: 2026-05-24*
