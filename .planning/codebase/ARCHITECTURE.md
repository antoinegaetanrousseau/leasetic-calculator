<!-- refreshed: 2026-05-24 -->
# Architecture

**Analysis Date:** 2026-05-24

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 App Router (React 19)                   │
│                                                                              │
│  ┌────────────────────┬────────────────────┬──────────────────────────────┐ │
│  │  (public) routes   │  (authed) routes   │   (admin)/[adminSegment]/    │ │
│  │  `app/(public)/`   │  `app/(authed)/`   │   `app/(admin)/`             │ │
│  │  login / invite /  │  home + 3-step     │   coefficients / partners /  │ │
│  │  reset             │  proposal wizard   │   history (hidden URL gate)  │ │
│  └─────────┬──────────┴──────────┬─────────┴──────────────┬───────────────┘ │
│            │ session?            │ requireUser            │ requireAdmin    │
│            │                     │                        │                 │
│            └─────── proxy.ts (Better Auth cookie gate, Next 16) ────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                      ▼
┌────────────────────────────────┐   ┌──────────────────────────────────────┐
│ Route Handlers / Server Actions │   │  Server Components (RSC)             │
│ `app/api/**/route.ts`           │   │  `app/**/page.tsx` (force-dynamic)   │
│ `app/(authed)/proposals/new/    │   │                                      │
│   _actions/*.action.ts`         │   │                                      │
└────────────────┬────────────────┘   └──────────────────┬───────────────────┘
                 │                                        │
                 ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Domain Layer  `src/lib/**`                              │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┐  │
│  │  auth/   │  calc/   │  pdf/    │ storage/ │  admin/  │  i18n/        │  │
│  │ Better   │ frozen   │ react-   │ Vercel   │ admin    │ FR/EN dict +  │  │
│  │ Auth +   │ formula  │ pdf      │ Blob OR  │ server   │ cookie locale │  │
│  │ require* │ kernel   │ render   │ S3 (OVH) │ actions  │               │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴───────────────┘  │
│                                                                              │
│              `src/lib/db/queries/**`  (Drizzle ORM helpers, server-only)    │
│              `src/lib/api/proposals/**`  (submit + finalize pipelines)      │
└─────────────────────────────────────────────────────────────────────────────┘
                 │                                        │
                 ▼                                        ▼
┌──────────────────────────────┐         ┌──────────────────────────────────┐
│ Postgres (Neon / Vercel)     │         │  Blob Storage                    │
│ Drizzle schema:              │         │  STORAGE_DRIVER=vercel → @vercel │
│ `src/db/schema.ts`           │         │  STORAGE_DRIVER=s3 → AWS SDK (OVH)│
│ migrations: `drizzle/*.sql`  │         │                                  │
└──────────────────────────────┘         └──────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Proxy auth gate | Coarse logged-in vs not (cookie-only, no DB) — Next.js 16 `proxy.ts` naming | `proxy.ts` |
| Root layout | `<html>`, font registration, no-flash theme script, `<Toaster>` | `app/layout.tsx` |
| Authed layout | `requireUser()` + `Shell` chrome (topbar + sidebar) | `app/(authed)/layout.tsx` |
| Admin layout | URL-segment obscurity check + `requireAdmin()` + admin nav | `app/(admin)/[adminSegment]/layout.tsx` |
| Public layout | Login/invite/reset chrome (no shell) | `app/(public)/layout.tsx` |
| Home page (RSC) | SSR initial proposals list via `buildListResponse` | `app/(authed)/page.tsx` |
| Wizard step 1 RSC | Mint/hydrate draft, redirect to bookmarkable `?draft_id=` URL | `app/(authed)/proposals/new/parametres/page.tsx` |
| Wizard server actions | `saveAsDraft` / `saveAndAdvance` / `persistAccordionOpen` | `app/(authed)/proposals/new/_actions/*.action.ts` |
| Submit API | Legacy single-call create proposal (auth → validate → snapshot → render → upload → finalize) | `app/api/proposals/route.ts` → `src/lib/api/proposals/submit.ts` |
| Finalize API | 3-step wizard finalize endpoint (atomic draft → active flip) | `app/api/proposals/finalize/route.ts` → `src/lib/api/proposals/finalize-wizard.ts` |
| PDF stream | Auth + own-row check + range-stream PDF blob | `app/api/proposals/[id]/pdf/route.ts` |
| Better Auth catch-all | Sign-in / sign-out / session HTTP endpoints | `app/api/auth/[...all]/route.ts` |
| Purge endpoint | Dual auth (cron secret OR admin session) hard-purge of soft-deleted rows | `app/api/internal/purge-soft-deleted/route.ts` |
| Health probe | Unauthenticated DB + blob round-trip | `app/healthz/route.ts` |
| Auth guards | `requireUser()` / `requireAdmin()` (server-only) | `src/lib/auth/require.ts` |
| Better Auth instance | Lazy singleton wrapping Drizzle adapter + argon2id hashing | `src/lib/auth/index.ts` |
| Drizzle DB singleton | Lazy memoized client (Neon HTTP OR postgres-js) | `src/lib/db/index.ts`, `src/lib/db/client.ts` |
| Drizzle schema | Single source of truth for tables, types, checks, indexes | `src/db/schema.ts` |
| Query helpers | Proposal/global-params/users/audit-log/coefficient-history barrel | `src/lib/db/queries/index.ts` |
| Calc engine | Pure formula kernel + Zod schema, frozen invariant | `src/lib/calc/index.ts` |
| PDF renderer | `@react-pdf/renderer` server-only render to Buffer + SHA-256 | `src/lib/pdf/render.ts`, `src/lib/pdf/document.tsx` |
| Storage adapter | Driver-agnostic `put/get/head/delete/signedUrl` interface | `src/lib/storage/adapter.ts`, `src/lib/storage/index.ts` |
| Admin actions | `requireAdmin` + DB write + audit-log write wrappers | `src/lib/admin/actions.ts` |
| i18n | FR/EN dictionary + `t()` + cookie reader | `src/lib/i18n/index.ts`, `src/lib/i18n/dictionaries.ts` |
| Shell | Sidebar + topbar grid layout (server component) | `src/components/ui/Shell.tsx` |

## Pattern Overview

**Overall:** Next.js 16 App Router monolith with a layered server/client split — Server Components for SSR + initial render, Route Handlers for JSON APIs, Server Actions for mutation forms, and a thin `src/lib/**` domain layer holding all business logic behind `'server-only'` barriers.

**Key Characteristics:**
- Server-first: every page/layout that reads cookies declares `export const dynamic = 'force-dynamic'` (per `PITFALLS §1.6`); static rendering is opted out wherever auth is read.
- `'server-only'` import barrier guards every domain module that touches DB, storage, PDF, or auth — accidental client imports fail at build time.
- Lazy singletons everywhere: `db()`, `auth()`, `storage()` defer environment-variable reads until first use so `next build` static analysis succeeds without env vars.
- Pure-kernel calc engine: `src/lib/calc/**` has no I/O, no React, no env reads — safely importable on any runtime (Node, Edge, browser, Vitest).
- Snapshot immutability: every finalized proposal stores `params_snapshot` + `computed` + `schema_version` jsonb at INSERT time; never UPDATE'd later (DATA-01).
- Append-only history: `global_params` and `coefficient_history` tables are never UPDATE'd — admin edits INSERT new rows; reads use `ORDER BY effective_from DESC LIMIT 1` for "current".
- Defence-in-depth auth: proxy gate (cookie presence) → layout gate (`requireUser`/`requireAdmin`) → route/action gate (re-run on every entry) → DB FK + `WHERE userId = $1` predicates.

## Layers

**Proxy / middleware layer:**
- Purpose: coarse "logged in vs not" gate; redirects unauth visitors to `/login?next=…`; redirects auth visitors away from `/login`.
- Location: `proxy.ts` (Next.js 16 replaces deprecated `middleware.ts` — export name `proxy`).
- Contains: cookie-only check via Better Auth `getSessionCookie`; whitelist of public paths (`/login`, `/invite/<token>`, `/reset/<token>`).
- Depends on: `better-auth/cookies` only — never DB.
- Used by: every request not excluded by the matcher (excludes `/_next/static`, `/_next/image`, `/favicon.ico`, `/fonts/`, `/healthz`, `/api/auth`).

**Layout / page layer (Server Components):**
- Purpose: SSR rendering + auth gating + per-segment chrome.
- Location: `app/(authed)/**`, `app/(admin)/[adminSegment]/**`, `app/(public)/**`.
- Contains: `async` RSCs that `await requireUser()` / `await requireAdmin()` then await data via `src/lib/db/queries`.
- Depends on: `src/lib/auth/require.ts`, `src/lib/i18n`, `src/lib/db/queries/**`, `src/components/ui/Shell.tsx`.
- Used by: end-user navigation.

**Route Handlers (HTTP JSON / streaming):**
- Purpose: JSON API endpoints + PDF stream + Better Auth + health probe.
- Location: `app/api/**/route.ts`, `app/healthz/route.ts`.
- Contains: thin HTTP shell — auth → parse → delegate to `src/lib/api/**` or `src/lib/db/queries/**` → translate to NextResponse.
- Depends on: domain layer in `src/lib/**`.
- Used by: client JS (search, load-more, finalize POST, PDF inline viewer), Better Auth client SDK, cron, monitors.

**Server Actions (form mutations):**
- Purpose: progressive-enhancement form submissions; co-located with the wizard.
- Location: `app/(authed)/proposals/new/_actions/*.action.ts`, `app/(admin)/[adminSegment]/coefficients/*.action.ts`.
- Contains: `'use server'` directive at top; `requireUser()` first; delegates to `src/lib/db/queries` or `src/lib/admin/actions`; `redirect()` on success.
- Depends on: domain layer in `src/lib/**`.
- Used by: form components inside the wizard and admin pages.

**Domain layer (`src/lib/**`):**
- Purpose: all business logic — pure (`calc`), or server-only (`auth`, `db`, `pdf`, `storage`, `admin`, `api`).
- Location: `src/lib/auth/`, `src/lib/calc/`, `src/lib/db/`, `src/lib/pdf/`, `src/lib/storage/`, `src/lib/admin/`, `src/lib/i18n/`, `src/lib/api/proposals/`, `src/lib/wizard/`, `src/lib/theme/`.
- Contains: pure modules + `'server-only'`-guarded modules + barrel `index.ts` files.
- Depends on: `src/db/schema.ts` (Drizzle types), env vars (`process.env.*`), third-party SDKs.
- Used by: route handlers, server actions, server components, scripts in `scripts/`.

**Data layer:**
- Purpose: Drizzle schema + SQL migrations + DB driver selection.
- Location: `src/db/schema.ts` (schema), `drizzle/*.sql` (migrations, hand-reviewed), `src/lib/db/client.ts` (driver factory).
- Contains: pgTable definitions; CHECK constraints; partial unique indexes; type exports via `$inferSelect` / `$inferInsert`.
- Depends on: `drizzle-orm/pg-core`, `@neondatabase/serverless`, `postgres`.
- Used by: every `src/lib/db/queries/**` helper.

## Data Flow

### Primary Request Path — partner creates a proposal (3-step wizard)

1. Partner clicks "Nouvelle proposition" on home (`app/(authed)/page.tsx:102`).
2. Browser navigates to `/proposals/new/parametres`. Server component runs (`app/(authed)/proposals/new/parametres/page.tsx:64`):
   - `requireUser()` (line 68); reject if no session.
   - If no `?draft_id=`, call `createDraft({ userId, language })` (line 97); 302 to `/proposals/new/parametres?draft_id=<id>` (line 123).
   - If `?draft_id=` present, `getDraftById(sp.draft_id, userId)` (line 127); self-heal redirect if cross-user / missing / non-draft.
   - Hydrate RHF prefill from `draft.inputs` jsonb and render `<ParametresFormCard>` + `<WizardActionBar>`.
3. Partner clicks "Continuer →" Link → navigates to `/proposals/new/calcul?draft_id=...` (same RSC pattern in `calcul/page.tsx`).
4. Partner clicks "Enregistrer comme brouillon" anywhere — `WizardActionBar.handleSave` (`_components/WizardActionBar.tsx:74`) calls bound server action `saveAsDraftAction(draftId, values)` (`_actions/saveAsDraft.action.ts:30`) → `updateDraft(...)` → `redirect('/')`.
5. On step 3 (verification), partner clicks "Confirmer & Générer le PDF" → `FinalizeButton.tsx` POSTs `{ draftId }` to `/api/proposals/finalize`.
6. Route handler (`app/api/proposals/finalize/route.ts:52`):
   - `requireUser()` (line 59); translate `NEXT_REDIRECT` to 401 JSON.
   - Parse body, read `lang` from cookie, call `finalizeWizard({ userId, draftId, language })` (line 81).
7. `finalizeWizard` (`src/lib/api/proposals/finalize-wizard.ts:135`) executes the 8-step pipeline:
   - `getDraftById` + `proposalInputSchema.parse(draft.inputs)`.
   - `getLatestGlobalParams()` (DATA-06).
   - `computeLoyer(...)` server-side recompute (CALC-07).
   - `renderProposalPdf({ data })` → `@react-pdf/renderer` returns Buffer + sha256.
   - `storage().put('proposals/<userId>/<draftId>.pdf', buffer, ...)`.
   - `finalizeDraft(...)` — atomic single-tx UPDATE flipping status `draft` → `active`, writing the audit_log entry inline.
8. Route handler returns `{ id }`; client navigates to `/proposals/[id]` detail page.
9. Detail page renders `<EmbeddedPdfPreview>` → `<iframe src="/api/proposals/[id]/pdf">`.
10. PDF route handler (`app/api/proposals/[id]/pdf/route.ts:13`) auth-checks, own-row-checks, then `storage().get(blobKey)` and streams bytes with `X-Content-SHA256` header.

### Legacy single-call submit flow (still active for non-wizard callers)

1. POST `/api/proposals` with body + `Idempotency-Key` header (`app/api/proposals/route.ts:13`).
2. `submitProposal(...)` (`src/lib/api/proposals/submit.ts:60`) executes 7 steps: validate idempotency UUID → parse body → idempotency lookup → recompute → INSERT row → render PDF → upload blob → UPDATE row → audit log.
3. On any failure inside the PDF/upload/finalize block, soft-delete the row and write `proposal.create_failed` audit entry (D-B1 fail-loud, `submit.ts:180`).

### Authentication flow

1. Visitor lands on any protected URL → `proxy.ts` redirects to `/login?next=<encoded>` (`proxy.ts:43`).
2. `app/(public)/login/page.tsx` renders `<LoginForm>` (client component using Better Auth client SDK).
3. Form POSTs to `/api/auth/sign-in/email` (handled by Better Auth catch-all `app/api/auth/[...all]/route.ts`).
4. Better Auth verifies argon2id hash via `@node-rs/argon2`, sets session cookie, fires `databaseHooks.session.create.after` → `updateLastLoginAt(userId)` (`src/lib/auth/index.ts:156`).
5. Browser redirected to `?next=` target or `/` if absent.
6. On every subsequent request, `proxy.ts` checks cookie presence; `requireUser()` in layouts/actions verifies the session AND re-reads `users.deletedAt` from DB (AUTH-16 secondary check, `src/lib/auth/require.ts:54`).

### Admin coefficient edit flow

1. Admin navigates to `/<ADMIN_URL_SEGMENT>/coefficients` (segment from env var).
2. `app/(admin)/[adminSegment]/layout.tsx:34` runs URL-obscurity check + `requireAdmin()` (404 not 403 for both failures).
3. `coefficients/page.tsx` renders `<CoefficientsEditor>` (client) with current `globalParams` row.
4. Admin edits and submits → server action `adminUpdateGlobalParams(...)` (`src/lib/admin/actions.ts:100`).
5. Action calls `requireAdmin()`, `insertGlobalParams(...)` (INSERT, never UPDATE), then `writeAuditLog({ action: 'global_params.update', payload: diff })`.
6. Phase 12: a separate `createCoefficientHistoryEntry` writes to `coefficient_history` (DB-level UPDATE/DELETE triggers forbid mutation).

**State Management:**
- Server-side: cookies (`lt_lang`, `lt_theme`, Better Auth session); DB (Postgres) is the only durable store.
- Client-side: React Hook Form for wizard inputs; Sonner for toasts; `useTransition` for pending action states; minimal `useState` for accordion/sidebar collapse.
- URL is the wizard's source of truth: `?draft_id=<uuid>` is the bookmarkable resume token (D-02). `?duplicate=<sourceId>` triggers same-user prefill (D-25). `?q=`, `?deleted=`, `?cursor=` on the home page drive list filtering.

## Key Abstractions

**Draft ↔ Active proposal (single row, status enum):**
- Purpose: a `proposals` row has stored status `'draft' | 'active' | 'deleted'`; `'expired'` is derived at render time, never stored.
- Examples: `src/db/schema.ts:192` CHECK constraint; `src/lib/db/queries/proposals.ts:172` status predicate.
- Pattern: a draft INSERT has NULL `lc_ref`/`idempotency_key`/`params_snapshot`/`computed` (enforced via partial unique indexes + CHECK `proposals_finalized_completeness_check`). `finalizeDraft` is the atomic flip.

**Snapshot triple (inputs / params_snapshot / computed):**
- Purpose: every finalized proposal stores 3 jsonb snapshots so future formula or coefficient changes never mutate historical proposals (DATA-01..03).
- Examples: `src/db/schema.ts:210`-225; `src/lib/api/proposals/finalize-helpers.ts:35` `buildParamsSnapshot`.
- Pattern: server reads the *latest* `global_params` row at finalize time, copies it verbatim into `proposals.params_snapshot`, never UPDATE'd later.

**Storage adapter (driver-agnostic):**
- Purpose: `STORAGE_DRIVER=vercel` → `@vercel/blob`; `STORAGE_DRIVER=s3` → AWS SDK (OVH-compat). Same `put/get/head/delete/signedUrl` surface.
- Examples: `src/lib/storage/adapter.ts:23` interface; `src/lib/storage/vercel-blob.ts`, `src/lib/storage/s3.ts` drivers.
- Pattern: `storage()` memoized singleton — first call inspects env var and instantiates the right driver; subsequent calls reuse it.

**DB lazy singleton + driver discrimination:**
- Purpose: `db()` instantiates Drizzle once with the correct driver based on `DATABASE_URL` host (`*.neon.tech` → `neon-http`, else `postgres-js`).
- Examples: `src/lib/db/index.ts:13`, `src/lib/db/client.ts:37`.
- Pattern: `postgres-js` capped at `max: 1, prepare: false` for pgbouncer/Vercel function compat (`PITFALLS §3.1`).

**Pure calc kernel + Zod schema:**
- Purpose: `src/lib/calc/**` has zero I/O — same code runs client (live preview), server (recompute), and CI golden tests.
- Examples: `src/lib/calc/formula.ts:142` `computeLoyer`; `src/lib/calc/schema.ts:94` `proposalInputSchema`.
- Pattern: state machine returns `{ state: 'idle' | 'on-demand' | 'missing' | 'computed' }`; string-typed amount boundary (`"75000"`) for Postgres-numeric compatibility.

**Audit log fan-in:**
- Purpose: every state-changing admin/partner action appends one `audit_log` row inside the same transaction (or immediately after) the underlying write.
- Examples: `src/lib/db/queries/audit-log.ts`; `src/lib/admin/actions.ts:114`.
- Pattern: `actorId` + `action` + `targetType` + `targetId` + `payload` jsonb; payload **never** contains `commissionPct` outside `action='global_params.update'` (ADMIN-09 redaction).

**Idempotency key + LC ref split:**
- Purpose: client-generated UUIDv4 in `Idempotency-Key` header → row's unique key. `LC-NNNNN` is a presentation-layer reference (collision-tolerant by design).
- Examples: `src/lib/calc/formula.ts:93` `generateLcRef`; `src/lib/api/proposals/submit.ts:62` UUIDv4 regex.
- Pattern: partial unique index on `(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.

## Entry Points

**Browser (Next.js dev server / `npm run dev`):**
- Location: `app/layout.tsx` (RootLayout) → matched route group `(public)` / `(authed)` / `(admin)`.
- Triggers: HTTP request.
- Responsibilities: SSR HTML, attach session/lang/theme to chrome, run auth guards.

**Auth catch-all:**
- Location: `app/api/auth/[...all]/route.ts`.
- Triggers: any `/api/auth/*` request (sign-in, sign-out, get-session, refresh, callback).
- Responsibilities: delegate fully to Better Auth's `toNextJsHandler(auth())`.

**Proposal lifecycle APIs:**
- Location: `app/api/proposals/route.ts` (GET list, POST create), `app/api/proposals/finalize/route.ts` (POST finalize), `app/api/proposals/[id]/{delete,pdf,restore}/route.ts`.
- Triggers: client JSON POST/GET, browser `<iframe src=>` for PDF.
- Responsibilities: auth → validate → delegate to `src/lib/api/proposals/**` → JSON response.

**Health probe:**
- Location: `app/healthz/route.ts`.
- Triggers: Vercel deployment health, uptime monitor.
- Responsibilities: parallel DB read + blob round-trip; 503 on either failure with bounded message.

**Cron / manual purge:**
- Location: `app/api/internal/purge-soft-deleted/route.ts`.
- Triggers: Vercel Cron (`Authorization: Bearer ${CRON_SECRET}`) OR admin session.
- Responsibilities: hard-delete `proposals` rows + blobs aged > 30 days past `deleted_at`.

**Scripts (tsx CLI):**
- Location: `scripts/*.ts` (e.g., `migrate.ts`, `grant-admin.ts`, `backfill-coefficient-history.ts`, `update-pdf-fixture.ts`, `seed-partner-launch.ts`).
- Triggers: `npm run` scripts in `package.json`.
- Responsibilities: ops tasks executed via `tsx`; some preload `scripts/_preload-mock-server-only.cjs` to neutralise the `'server-only'` import barrier.

## Architectural Constraints

- **Runtime:** every route handler that touches `@react-pdf/renderer` or `@aws-sdk/client-s3` must declare `export const runtime = 'nodejs'` — Edge runtime cannot host these deps (`app/api/proposals/route.ts:10`, `app/healthz/route.ts:20`, `app/api/proposals/[id]/pdf/route.ts:8`).
- **Threading:** single Node process per Vercel/OVH function instance. `postgres-js` connection pool capped at `max: 1` to avoid exhausting pgbouncer transaction-pool slots (`src/lib/db/client.ts:49`, `PITFALLS §3.1`).
- **Static rendering:** every layout/page that reads cookies (locale, theme, Better Auth session) declares `export const dynamic = 'force-dynamic'`. Without this declaration Next.js attempts SSG and renders stale cookies.
- **`'server-only'` barrier:** `src/lib/auth/**`, `src/lib/db/**`, `src/lib/pdf/**`, `src/lib/storage/**`, `src/lib/admin/actions.ts`, `src/lib/api/proposals/**` all start with `import 'server-only'` — Next.js fails the build if any of these are imported from a Client Component.
- **No `drizzle-kit push`:** `package.json` exposes only `db:generate` + `db:check` + `db:migrate`. Push is forbidden (locked decision, `drizzle.config.ts:14`). Migrations are reviewed SQL committed under `drizzle/` and applied via GitHub Action `.github/workflows/db-migrate.yml`.
- **Append-only tables:** `global_params` has no UPDATE callers; `coefficient_history` has DB-level triggers `coefficient_history_no_update` + `coefficient_history_no_delete` (defined in `drizzle/0004_phase12_drafts_and_history.sql`).
- **ADMIN-09 commission redaction:** the literal substring `commission` may appear only in `src/lib/api/proposals/finalize-helpers.ts` (not in `finalize-wizard.ts`) per a structural grep gate; audit payloads only include commission values for `action='global_params.update'`. Enforced by `tests/admin-09-grep-contracts.test.ts`.
- **Determinism contract for PDF:** `src/lib/pdf/document.tsx` uses no `Date.now()` / `Math.random()`; fonts are file:// absolute paths; `contentHash` (zlib-stream-sorted SHA-256) is used for CI regression, not raw `sha256`.
- **Lazy env reads:** `db()`, `auth()`, `storage()`, and `toNextJsHandler(auth())` are wrapped in factory functions so `next build` static analysis does not require `DATABASE_URL` / `AUTH_SECRET` at compile time.
- **Two `next.config.ts` invariants:** `output: 'standalone'` (for OVH portability); `generateBuildId` pinned to `GIT_COMMIT_SHA` for build parity (`next.config.ts:9`).

## Anti-Patterns

### Importing from `src/lib/auth/index.ts` in a Client Component

**What happens:** developer reaches for `import { auth } from '@/lib/auth'` inside a `'use client'` file to inspect session.
**Why it's wrong:** `src/lib/auth/index.ts` is server-only (Drizzle adapter, env vars, argon2id). It must never enter the client bundle.
**Do this instead:** import the Better Auth client from `src/lib/auth/client.ts` (which is browser-safe), or pass session-derived fields as props from a server component (the existing pattern in `app/(authed)/layout.tsx:24`).

### Reading session by calling Better Auth before `requireUser()`

**What happens:** route handler calls `auth().api.getSession(...)` directly and then queries DB.
**Why it's wrong:** skips the AUTH-16 secondary in-band check (`users.deletedAt`); a 5-minute cookie cache window could leak to a disabled account. Also violates the PITFALLS §7.3 ordering rule.
**Do this instead:** always `const { session } = await requireUser()` (or `requireAdmin()`) as the FIRST `await` in any route handler / server action / RSC. Example: `app/api/proposals/route.ts:20`.

### Mutating an existing `proposals` row instead of using `finalizeDraft`

**What happens:** developer writes a direct `UPDATE proposals SET status='active', lc_ref=…` in a custom action.
**Why it's wrong:** breaks DATA-01 immutability + audit-log atomicity. `finalizeDraft` writes the `audit_log` entry inside the same transaction as the UPDATE.
**Do this instead:** call `finalizeDraft(...)` from `src/lib/db/queries/proposals.ts`. Both flows (`submit.ts` for legacy single-call and `finalize-wizard.ts` for the 3-step wizard) go through the same primitive.

### Logging caught DB errors directly (`console.error(e)`)

**What happens:** action's catch block does `console.error(e)` where `e` is a Drizzle/postgres.js error.
**Why it's wrong:** Drizzle/postgres-js errors embed query parameters in `e` — including `commission_pct` values that violate ADMIN-09 redaction.
**Do this instead:** extract the message only (`e instanceof Error ? e.message : String(e)`) then `console.error('[scope] failed:', msg)`. Example: `src/lib/admin/actions.ts:126`.

### Writing `drizzle-kit push` against any DB

**What happens:** developer types `npx drizzle-kit push` to avoid editing migrations.
**Why it's wrong:** pushes silently diff and modify production schema — bypasses code review and audit. Locked decision per `drizzle.config.ts:14`.
**Do this instead:** edit `src/db/schema.ts`, run `npm run db:generate`, hand-review the new `drizzle/NNNN_*.sql`, commit, and rely on `.github/workflows/db-migrate.yml` (or `npm run db:migrate`) to apply.

### Calling `redirect()` inside a route handler

**What happens:** a route handler under `app/api/**` reuses `requireUser()` and lets the embedded `redirect('/login')` propagate.
**Why it's wrong:** `redirect()` throws `NEXT_REDIRECT`, which serialises as a 307 in route handlers — API consumers cannot follow HTML redirects.
**Do this instead:** wrap the `requireUser()` call in `try/catch` and translate the thrown error to a 401 JSON. Pattern: `app/api/proposals/route.ts:19`.

### Reading `process.env.ADMIN_URL_SEGMENT` inside a client component

**What happens:** client sidebar tries to build admin links by reading env directly.
**Why it's wrong:** Next.js inlines only `NEXT_PUBLIC_*` env vars into the client bundle; non-public vars are `undefined` client-side.
**Do this instead:** server-side admin layout resolves `params.adminSegment` and passes the resolved href map down via prop (`src/components/ui/Shell.tsx:50`).

## Error Handling

**Strategy:** server boundaries translate exceptions to bounded codes; clients receive enums, never raw messages.

**Patterns:**
- `SubmitError` class with `code: SubmitErrorCode` enum and `httpStatus` (`src/lib/api/proposals/errors.ts:18`). Route handler maps `code` to JSON `{ error: code }`.
- `finalizeWizard` throws `new Error('DraftNotFound' | 'NoGlobalParams' | 'ValidationFailed' | 'FinalizeFailed')`; route handler whitelists via `SAFE_ERROR_CODES` set; everything else collapses to `finalize_failed` (`app/api/proposals/finalize/route.ts:45`).
- Admin actions catch DB errors, log message-only (never the error object), throw a stable i18n key like `'admin.coefficients.error.save'` (`src/lib/admin/actions.ts:128`).
- Anti-enumeration: PDF route returns 404 for both "not found" and "not your row" (`app/api/proposals/[id]/pdf/route.ts:28`). Admin URL miss returns 404, never 403 (`requireAdmin` → `notFound()`, `src/lib/auth/require.ts:78`).
- `app/error.tsx` (Client Component error boundary) renders a static bilingual message with NO stack trace, NO `error.message`, NO `error.digest` (D-30). Vercel logs capture the actual error via `console.error('[error.tsx]', error)`.
- D-B1 fail-loud: on PDF/upload/finalize failure mid-submit, `submitProposal` soft-deletes the row and writes a `proposal.create_failed` audit entry before throwing (`src/lib/api/proposals/submit.ts:180`).

## Cross-Cutting Concerns

**Logging:** `console.error('[scope]', ...)` only — Vercel runtime captures stdout/stderr. No structured logger; the project deliberately omits one in v1.1 (CUT decision).

**Validation:** every external input goes through a Zod schema in `src/lib/calc/schema.ts` (`proposalInputSchema`) or `src/lib/admin/schemas.ts` (`createPartnerFormSchema`, `coeffEditorSchema`). The SAME schema is consumed by RHF (`@hookform/resolvers/zod`) on the client and `.parse()` on the server — single source of truth per D-29.

**Authentication:** Better Auth (`better-auth@1.6.9`) with email+password only, `disableSignUp: true`, argon2id hashing tuned for Vercel cold-start (`memoryCost: 19456, timeCost: 2`). 8-hour sliding session with 5-min cookie cache; AUTH-16 secondary in-band check tightens revocation latency.

**Authorisation:** two-tier — `requireUser()` (any authenticated partner) and `requireAdmin()` (role === 'admin'). Admin tree additionally gated by hidden URL segment matching `process.env.ADMIN_URL_SEGMENT` (404 on mismatch, never 403). Per-row ownership enforced at the query layer via `WHERE userId = $1` in every helper that returns a partner-scoped row.

**i18n:** FR (default) + EN. Server reads `lt_lang` cookie via `getCurrentLang()`; client reads via `document.cookie` regex in error.tsx. `t(key, lang)` is the only render-time accessor. Locked once on the proposal row (`language` column) so historical proposals never re-render in a different language.

**Theming:** `lt_theme` cookie (`light` | `dark` | `system`); inline no-flash script at top of `<head>` resolves `system` to light/dark via `prefers-color-scheme` before paint; root layout sets `data-theme` attr on `<html>`. CSS variables (`--paper`, `--ink`, `--navy`, `--gold`, `--gd`, `--muted`) defined in `app/globals.css` drive both themes.

---

*Architecture analysis: 2026-05-24*
