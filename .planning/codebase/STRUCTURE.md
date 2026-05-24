# Codebase Structure

**Analysis Date:** 2026-05-24

## Directory Layout

```
leasetic-calculator/
├── app/                              # Next.js 16 App Router (routes + layouts)
│   ├── layout.tsx                    # Root layout: <html>, fonts, no-flash, Toaster
│   ├── error.tsx                     # Top-level Client Component error boundary
│   ├── not-found.tsx                 # 404 page (RSC; bilingual; URL-secret)
│   ├── globals.css                   # Tailwind 4 + design tokens (`--paper`, etc.)
│   ├── (public)/                     # Route group: unauthenticated chrome
│   │   ├── layout.tsx                # Minimal centered card layout
│   │   ├── login/page.tsx
│   │   ├── invite/[token]/page.tsx
│   │   └── reset/[token]/page.tsx
│   ├── (authed)/                     # Route group: partner-authenticated chrome
│   │   ├── layout.tsx                # requireUser + Shell
│   │   ├── page.tsx                  # Home (proposals list, SSR initial fetch)
│   │   └── proposals/
│   │       ├── new/                  # 3-step wizard
│   │       │   ├── page.tsx          # /proposals/new → redirect to /parametres
│   │       │   ├── parametres/page.tsx   # Step 1
│   │       │   ├── calcul/page.tsx       # Step 2
│   │       │   ├── verification/         # Step 3
│   │       │   ├── _actions/             # Server actions (saveAsDraft, saveAndAdvance, …)
│   │       │   └── _components/          # Wizard-only client components
│   │       └── [id]/page.tsx         # Detail (PDF preview + actions)
│   ├── (admin)/                      # Route group: admin tree (hidden segment)
│   │   └── [adminSegment]/
│   │       ├── layout.tsx            # URL obscurity + requireAdmin
│   │       ├── page.tsx              # Admin home
│   │       ├── coefficients/         # Admin coefficient editor + history sidebar
│   │       ├── partners/             # Partner list + create-partner modal/form
│   │       └── history/              # Coefficient change audit viewer
│   ├── api/                          # Route Handlers (JSON / streaming)
│   │   ├── auth/[...all]/route.ts    # Better Auth catch-all
│   │   ├── internal/                 # Internal endpoints (cron, ops)
│   │   │   └── purge-soft-deleted/route.ts
│   │   └── proposals/
│   │       ├── route.ts              # GET list / POST submit (legacy single-call)
│   │       ├── finalize/route.ts     # POST wizard finalize
│   │       └── [id]/{delete,pdf,restore}/route.ts
│   ├── healthz/route.ts              # Unauthenticated health probe
│   └── dev/components/page.tsx       # Dev-only component gallery (gated by env)
├── src/                              # Domain code (alias `@/*` → `./src/*`)
│   ├── db/
│   │   └── schema.ts                 # Drizzle schema (single source of truth)
│   ├── lib/                          # Server-only and pure domain modules
│   │   ├── auth/                     # Better Auth instance + require* guards
│   │   ├── calc/                     # Pure formula kernel + Zod schemas
│   │   ├── db/                       # Drizzle client + queries barrel
│   │   │   └── queries/              # Proposals, global-params, users, audit-log
│   │   ├── pdf/                      # @react-pdf/renderer document + render
│   │   │   └── components/           # PDF subcomponents
│   │   ├── storage/                  # Driver-agnostic blob adapter (vercel | s3)
│   │   ├── admin/                    # Admin server actions + schemas
│   │   ├── api/proposals/            # submit + finalize-wizard pipelines + list helper
│   │   ├── i18n/                     # FR/EN dictionaries + cookie reader
│   │   ├── theme/                    # No-flash script + theme cookie action
│   │   ├── wizard/                   # Stepper completedSteps logic
│   │   └── health.ts                 # DB + blob health check helpers
│   └── components/                   # React components
│       ├── ui/                       # Cross-cutting UI (Shell, Topbar, Sidebar, …)
│       ├── proposal/                 # Single-proposal form inputs (LiveLoyer, …)
│       ├── proposals/                # Proposal-LIST UI (Row, SearchBar, Chips, …)
│       └── *                         # Login, SetPassword, UserMenu, etc.
├── drizzle/                          # Hand-reviewed SQL migrations (committed)
│   ├── 0000_…sql ... 0004_…sql
│   └── meta/                         # Drizzle snapshots
├── scripts/                          # tsx CLIs (migrate, seed, purge, fixtures)
├── tests/                            # Top-level integration tests (grep contracts)
├── __tests__/                        # Vitest setup file (jsdom DOM polyfills)
├── __pdf-fixtures__/                 # PDF byte-determinism fixtures + golden hashes
├── docs/                             # Operational + legal + accessibility notes
│   ├── operations/                   # migrations, deploy-ovh, purge, launch-checklist
│   ├── security/                     # STRIDE addenda
│   ├── legal/                        # Privacy coverage
│   ├── accessibility/                # Contrast audit
│   └── smoke/                        # Wizard runbook
├── public/                           # Static assets
│   ├── fonts/                        # Plus Jakarta Sans woff2 + ttf (5 weights)
│   ├── logo-light.svg
│   ├── logo-dark.svg
│   └── logo-mark.svg
├── .github/workflows/                # CI + DB migration workflows
│   ├── ci.yml
│   └── db-migrate.yml
├── .planning/                        # GSD planning artifacts (not part of runtime)
├── proxy.ts                          # Next.js 16 proxy (replaces middleware.ts)
├── next.config.ts                    # output: 'standalone', generateBuildId
├── drizzle.config.ts                 # Drizzle-kit config (no push allowed)
├── vitest.config.ts                  # jsdom env, includes app/** + src/** + tests/**
├── tsconfig.json                     # Strict, paths: @/* → ./src/*
├── eslint.config.mjs                 # Flat config, next + typescript-eslint
├── postcss.config.mjs                # Tailwind 4 PostCSS plugin
├── package.json                      # next 16.2.4 / react 19 / drizzle 0.45 / better-auth 1.6.9
└── vercel.json                       # Vercel deployment config (cron, etc.)
```

## Directory Purposes

**`app/`**
- Purpose: Next.js 16 App Router file conventions only — routes, layouts, route handlers, error/not-found boundaries.
- Contains: `layout.tsx`, `page.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`, route groups `(public)`/`(authed)`/`(admin)`, server-action files under `_actions/`, wizard-local components under `_components/`.
- Key files: `app/layout.tsx`, `app/(authed)/page.tsx`, `app/(admin)/[adminSegment]/layout.tsx`, `app/api/proposals/finalize/route.ts`.

**`app/(public)/`**
- Purpose: routes accessible without a session — login, invite-redeem, password-reset.
- Contains: minimal `layout.tsx` (centered card, no Shell), three pages.
- Key files: `app/(public)/login/page.tsx`, `app/(public)/invite/[token]/page.tsx`, `app/(public)/reset/[token]/page.tsx`.

**`app/(authed)/`**
- Purpose: partner-authenticated routes. Layout calls `requireUser()` and wraps content in `<Shell>`.
- Contains: home page (proposals list), `proposals/new/**` wizard, `proposals/[id]/page.tsx` detail.
- Key files: `app/(authed)/layout.tsx`, `app/(authed)/proposals/new/parametres/page.tsx`.

**`app/(admin)/[adminSegment]/`**
- Purpose: admin-only routes hidden behind a URL segment that must equal `process.env.ADMIN_URL_SEGMENT`. Layout calls `requireAdmin()` and falls through to `notFound()` on any failure (D-18).
- Contains: 4 admin areas — `page.tsx` (home), `coefficients/`, `partners/`, `history/`.
- Key files: `app/(admin)/[adminSegment]/layout.tsx`, `app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx`.

**`app/api/`**
- Purpose: HTTP route handlers (JSON / streaming). Each handler declares `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` where needed.
- Contains: Better Auth catch-all, proposal CRUD + finalize + PDF stream, internal purge endpoint.
- Key files: `app/api/proposals/route.ts`, `app/api/proposals/finalize/route.ts`, `app/api/proposals/[id]/pdf/route.ts`, `app/api/auth/[...all]/route.ts`.

**`src/db/`**
- Purpose: Drizzle schema source of truth.
- Contains: a single `schema.ts` exporting pgTable definitions, indexes, CHECK constraints, type aliases (`$inferSelect` / `$inferInsert`).
- Key files: `src/db/schema.ts` (all tables: `users`, `sessions`, `accounts`, `verifications`, `password_resets`, `proposals`, `global_params`, `audit_log`, `coefficient_history`, `schema_meta`).

**`src/lib/`**
- Purpose: domain layer. Every module here is either pure (`calc`, `wizard`, `i18n/dictionaries`) or starts with `import 'server-only'`.
- Contains: subfolders per concern, each with a barrel `index.ts` that re-exports the public surface. Tests co-located with `.test.ts` siblings.
- Key files:
  - `src/lib/auth/require.ts` — `requireUser` / `requireAdmin`
  - `src/lib/auth/index.ts` — Better Auth instance factory
  - `src/lib/db/index.ts` — `db()` singleton + schema re-export
  - `src/lib/db/queries/index.ts` — queries barrel
  - `src/lib/calc/index.ts` — calc engine + Zod schema barrel
  - `src/lib/pdf/render.ts` — server-only PDF render
  - `src/lib/storage/index.ts` — `storage()` driver singleton
  - `src/lib/api/proposals/submit.ts` — legacy submit pipeline
  - `src/lib/api/proposals/finalize-wizard.ts` — wizard finalize pipeline
  - `src/lib/admin/actions.ts` — admin server actions

**`src/components/`**
- Purpose: React UI components, both Server and Client (mixed).
- Contains: `ui/` shell + design-system primitives; `proposal/` form inputs; `proposals/` list/row/chip; plus standalone files (`LoginForm`, `Topbar`, `UserMenu`, `ThemeToggle`, `LocaleToggle`, `InviteUrlModal`, `SetPasswordForm`).
- Key files: `src/components/ui/Shell.tsx`, `src/components/proposal/ProposalForm.tsx`, `src/components/proposals/ProposalsList.tsx`.

**`drizzle/`**
- Purpose: committed SQL migrations + Drizzle snapshots (`meta/`). Hand-reviewed. Generated by `npm run db:generate`, applied via `npm run db:migrate` or GitHub Action.
- Contains: `NNNN_<name>.sql` files (0000-0004 currently), plus `meta/_journal.json` + per-migration snapshot JSON.
- Generated: yes (by Drizzle Kit), but committed.

**`scripts/`**
- Purpose: operational CLIs executed via `tsx`. All run server-only code; some require `-r ./scripts/_preload-mock-server-only.cjs` to bypass the `'server-only'` barrier.
- Contains: `migrate.ts`, `grant-admin.ts`, `seed-admins-launch.ts`, `seed-partner-launch.ts`, `purge-soft-deleted.ts`, `purge-test-data.ts`, `backfill-coefficient-history.ts`, `build-seed-sql.ts`, `update-pdf-fixture.ts`, `smoke-ovh.ts`, plus shell guards (`check-no-vercel-only-imports.sh`, `check-no-drizzle-push.sh`, `check-no-v10-localstorage.sh`).

**`tests/`, `__tests__/`, `__pdf-fixtures__/`**
- Purpose: test infrastructure outside the `src/` and `app/` co-location pattern.
- Contains:
  - `tests/admin-09-grep-contracts.test.ts` — structural CI gate enforcing ADMIN-09 redaction
  - `__tests__/setup-dom.ts` — Vitest jsdom setup (Testing Library matchers)
  - `__pdf-fixtures__/fixtures.ts` + `render-fixtures.test.ts` + `expected.sha256.txt` — PDF byte-determinism golden test

**`docs/`**
- Purpose: human-readable operational + compliance notes (not loaded by runtime).
- Contains: 5 subfolders (`operations/`, `security/`, `legal/`, `accessibility/`, `smoke/`); markdown only.
- Key files: `docs/operations/migrations.md`, `docs/operations/deploy-ovh.md`, `docs/operations/purge.md`, `docs/operations/launch-checklist.md`.

**`public/`**
- Purpose: Next.js static assets served at site root.
- Contains: `fonts/` (Plus Jakarta Sans woff2 + ttf, both formats required — woff2 for the browser, ttf for `@react-pdf/renderer` subsetting), 3 SVG logos.

**`.planning/`**
- Purpose: GSD workflow planning artifacts. Not part of the runtime; consumed by `/gsd-*` commands.
- Generated: yes (by GSD tooling); contains `codebase/` outputs from this mapper.

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: root SSR layout — fonts, no-flash script, Toaster.
- `proxy.ts`: Next.js 16 proxy (replaces middleware) — coarse auth gate.
- `app/healthz/route.ts`: unauthenticated DB + blob health probe.
- `app/api/auth/[...all]/route.ts`: Better Auth catch-all (sign-in, sign-out, session).
- `app/api/proposals/finalize/route.ts`: wizard finalize entrypoint (D-16 pipeline).

**Configuration:**
- `next.config.ts`: `output: 'standalone'`, `generateBuildId` pinned to `GIT_COMMIT_SHA`, v1.1→partners 308 redirect.
- `drizzle.config.ts`: schema path, output dir, no push allowed.
- `vitest.config.ts`: jsdom env, alias `@`, includes 4 directories of test files.
- `tsconfig.json`: strict TS, `@/*` alias to `./src/*`, JSX `react-jsx`.
- `eslint.config.mjs`: flat config, `next` + `typescript-eslint` + custom no-restricted-syntax rules.
- `postcss.config.mjs`: Tailwind 4 plugin.
- `vercel.json`: cron + deployment config.
- `.env.example`: documents all required env vars (DATABASE_URL, AUTH_SECRET, STORAGE_DRIVER, ADMIN_URL_SEGMENT, BLOB_READ_WRITE_TOKEN or AWS_* set, CRON_SECRET, NEXT_SERVER_ACTIONS_ENCRYPTION_KEY, APP_URL).

**Core Logic:**
- `src/db/schema.ts`: all 10 tables + types + CHECK + indexes (single source of truth).
- `src/lib/auth/index.ts`: Better Auth instance with argon2id hashing + Drizzle adapter.
- `src/lib/auth/require.ts`: `requireUser` / `requireAdmin` guards.
- `src/lib/calc/formula.ts`: frozen v10 formula kernel (`computeLoyer`, `applyFormula`, `generateLcRef`).
- `src/lib/calc/schema.ts`: Zod `proposalInputSchema` (15 fields).
- `src/lib/api/proposals/submit.ts`: legacy single-call create flow (7 steps).
- `src/lib/api/proposals/finalize-wizard.ts`: wizard finalize (8 steps).
- `src/lib/db/queries/proposals.ts`: all proposal CRUD + draft + finalize + search + soft-delete.
- `src/lib/pdf/document.tsx`: `@react-pdf/renderer` document tree (deterministic).
- `src/lib/pdf/render.ts`: render to Buffer + sha256 + contentHash.
- `src/lib/storage/{vercel-blob,s3,adapter}.ts`: blob adapter contract + 2 drivers.

**Testing:**
- `src/**/*.test.ts(x)`: co-located unit tests.
- `app/**/*.test.ts(x)`: co-located route handler + page tests.
- `__pdf-fixtures__/`: PDF byte-determinism golden test.
- `tests/admin-09-grep-contracts.test.ts`: structural redaction gate.
- `__tests__/setup-dom.ts`: jsdom + Testing Library setup.

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `ProposalForm.tsx`, `WizardActionBar.tsx`).
- Pure utility modules / hooks / non-component TS: `camelCase.ts` (e.g., `completedSteps.ts`, `useDebouncedValue.ts`, `timeAgo.ts`).
- Next.js route conventions: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`, `loading.tsx`.
- Server action files: `<verb>.action.ts` (e.g., `saveAsDraft.action.ts`, `history-load-more.action.ts`).
- Test files: `<sibling>.test.ts(x)` co-located with the file under test; integration tests `<name>.integration.test.ts`.
- SQL migrations: `NNNN_<snake_case_label>.sql` (e.g., `0004_phase12_drafts_and_history.sql`).
- Domain barrels: `src/lib/<domain>/index.ts` re-exporting public API.

**Directories:**
- App Router route groups: `(<name>)` parentheses for non-URL grouping (`(public)`, `(authed)`, `(admin)`).
- App Router private folders: `_<name>` underscore prefix for non-routable code (`_actions`, `_components`).
- Dynamic segments: `[name]` brackets (`[id]`, `[token]`, `[adminSegment]`, `[...all]` catch-all).
- Wizard step folders: lowercase French slugs (`parametres`, `calcul`, `verification`).

**Code identifiers:**
- React components / types / classes: `PascalCase`.
- Functions / variables / props: `camelCase`.
- Constants: `UPPER_SNAKE` for top-level (`SCHEMA_VERSION`, `UUID_V4_REGEX`, `DEFAULT_LIMIT`); `camelCase` for local consts.
- Server actions: `<verb>Action` suffix (`saveAsDraftAction`, `createPartnerInvitationAction`).
- Admin actions: `admin<Verb>` prefix (`adminUpdateGlobalParams`, `adminDisableUser`).
- Auth guards: `require<Role>` (`requireUser`, `requireAdmin`).

## Where to Add New Code

**New page (RSC):**
- Primary code: `app/(authed)/<segment>/page.tsx` or `app/(admin)/[adminSegment]/<segment>/page.tsx`.
- Must declare `export const dynamic = 'force-dynamic'` if it reads cookies.
- Must call `requireUser()` (or `requireAdmin()`) as the FIRST `await`.
- Tests: co-locate `page.test.tsx` next to it (see `app/(admin)/[adminSegment]/page.test.tsx`).

**New API route handler:**
- Primary code: `app/api/<path>/route.ts`.
- Declare `export const runtime = 'nodejs'` if touching `@react-pdf/renderer` or `@aws-sdk/client-s3`.
- Declare `export const dynamic = 'force-dynamic'`.
- Wrap `requireUser()` in `try/catch` and translate to 401 JSON (don't let `redirect()` propagate).
- Delegate business logic to `src/lib/api/<feature>/` or `src/lib/db/queries/`.
- Tests: `route.test.ts` co-located.

**New server action:**
- Primary code: `app/(authed)/<route>/_actions/<verb>.action.ts` (wizard scope) OR `src/lib/admin/actions.ts` (admin scope).
- Must start with `'use server'` directive.
- First `await` must be `requireUser()` or `requireAdmin()`.
- Tests: `<verb>.action.test.ts` co-located.

**New shared client component:**
- Primary code: `src/components/<area>/<Name>.tsx`.
- Areas: `ui/` (cross-cutting), `proposal/` (wizard form inputs), `proposals/` (list UI), or root-level `src/components/` for top-level forms (Login, SetPassword).
- Must declare `'use client'` at top if it uses hooks / browser APIs.
- Tests: `<Name>.test.tsx` co-located.

**New domain module:**
- Primary code: `src/lib/<domain>/<name>.ts`.
- Add `import 'server-only'` at the top if it touches DB, env vars, storage, or auth.
- Update `src/lib/<domain>/index.ts` barrel to re-export the public surface.
- Tests: `<name>.test.ts` co-located.

**New DB table / schema change:**
- Primary code: edit `src/db/schema.ts`.
- Run `npm run db:generate` to produce `drizzle/NNNN_<label>.sql`.
- Hand-review the generated SQL. Commit BOTH the schema and the SQL.
- Apply locally via `npm run db:migrate`; production via `.github/workflows/db-migrate.yml`.
- NEVER use `drizzle-kit push`.

**New query helper:**
- Primary code: `src/lib/db/queries/<feature>.ts`.
- Update `src/lib/db/queries/index.ts` barrel.
- Always filter by `userId` in the WHERE clause for partner-scoped data.
- Tests: `<feature>.test.ts` for unit + `<feature>.integration.test.ts` if it needs a real DB.

**New audit-loggable action:**
- Caller calls `writeAuditLog({ actorId, action, targetType, targetId, payload })` from `src/lib/db/queries/audit-log.ts`.
- The literal substring `commission` may appear in `payload` ONLY when `action === 'global_params.update'` (ADMIN-09; enforced by `tests/admin-09-grep-contracts.test.ts`).

**New i18n string:**
- Add the key/value pair to `src/lib/i18n/dictionaries.ts` (both `fr` and `en` branches).
- Reference via `t('your.key', lang)`.
- Client components: import `t` from `@/lib/i18n/dictionaries` (NOT `@/lib/i18n` — the latter pulls in `next/headers`).

**New script / CLI:**
- Primary code: `scripts/<name>.ts`.
- Add an `npm run <verb>` entry to `package.json`.
- If it imports anything from `src/lib/**` marked `'server-only'`, prefix the command with `tsx -r ./scripts/_preload-mock-server-only.cjs scripts/<name>.ts`.

**New env var:**
- Document it in `.env.example` (with a one-line comment).
- Read it inside a factory function (lazy), not at module top-level — keeps `next build` static analysis happy.

## Special Directories

**`.next/`**
- Purpose: Next.js build output (compiled bundles, server build, types).
- Generated: yes.
- Committed: no (`.gitignore`).

**`node_modules/`**
- Purpose: npm dependencies.
- Generated: yes.
- Committed: no.

**`.vercel/`**
- Purpose: Vercel CLI link cache.
- Generated: yes.
- Committed: no.

**`drizzle/`**
- Purpose: SQL migrations + Drizzle snapshots.
- Generated: yes (by `npm run db:generate`).
- Committed: **yes** — hand-reviewed and applied to production via GitHub Action.

**`.planning/`**
- Purpose: GSD workflow artifacts (this very file lives here).
- Generated: yes (by GSD commands).
- Committed: typically yes (project decision).

**`public/fonts/`**
- Purpose: self-hosted Plus Jakarta Sans (woff2 for browser + ttf for `@react-pdf/renderer`).
- Generated: no.
- Committed: yes — required for PDF font subsetting determinism.

**`__pdf-fixtures__/`**
- Purpose: PDF byte-determinism CI gate.
- Generated: `expected.sha256.txt` updated by `npm run pdf:update-fixture`; reviewed.
- Committed: yes.

**`Matrice_2026_THE_Leasetic-v10.html`**
- Purpose: the historical v10 standalone HTML calculator (~370KB) — reference source of truth for the frozen formula.
- Generated: no.
- Committed: yes (read-only reference).

---

*Structure analysis: 2026-05-24*
