# Domain Pitfalls — Leasétic Matrice v1.1 Foundation Migration

**Domain:** Single-file vanilla HTML calculator → Next.js multi-page authed B2B internal tool with persistent immutable PDF artifacts and dual-host (Vercel/OVH) portability
**Researched:** 2026-05-05
**Confidence:** MEDIUM (training-data based; verification blocked this session)

> **Tooling caveat (orchestrator-added):** Read/Bash/WebSearch denied. Pitfalls drawn from training-data knowledge of Next.js 15/16, Auth.js v5, Drizzle, Vercel Blob, and serverless PDF generation, plus the rich milestone context provided.

Severity legend: **BLOCKING** = sinks the milestone if missed · **HIGH** = hours-to-days of debugging · **MEDIUM** = annoying, recoverable · **LOW** = nuisance

---

## 1. Next.js App Router

### 1.1 `params` and `searchParams` are now Promises (BLOCKING during scaffold phase)
**What goes wrong:** In Next.js 15+, dynamic route segment props (`params`, `searchParams`) became asynchronous. Code copied from any tutorial/AI-generated snippet predating Next 15 destructures them synchronously: `export default function Page({ params: { id } })`. Build succeeds, but at runtime you get a `params should be awaited` error or silently undefined values.
**Why it happens:** Migration from sync to async API; codemod exists but doesn't catch hand-written code.
**Prevention:** Adopt the rule "every page/layout with `params` is `async` and awaits `params`" from the first commit. Add an ESLint rule or repo grep check in CI.
**Phase:** Phase 1 (scaffold) — code review checklist
**Confidence:** HIGH

### 1.2 `'use client'` placed at the wrong granularity (HIGH, recurring)
**What goes wrong:** The instinct from React+Vite is "everything is a client component." Putting `'use client'` at the top of a page that uses a `useState` for the form pulls the *entire* page — including server-only data fetching — to the client, leaking the DB query layer into the bundle and breaking it because Drizzle/Postgres clients can't run in the browser.
**Prevention:** Default to server components. Carve interactive forms into leaf `*Form.tsx` client components imported by an async server page that does the DB read.
**Phase:** Phase 2 (UI shell) and recurring code review
**Confidence:** HIGH

### 1.3 Server Action vs Route Handler for PDF generation (HIGH)
**What goes wrong:** Server Actions are tempting for "submit form → generate PDF → return blob URL" because they feel like RPC. But (a) they can't easily stream a binary response, (b) error handling for non-form callers is awkward, and (c) they're invoked through an opaque `_next/...` endpoint that's hard to call from a future OVH-side worker or a CLI test.
**Prevention:** PDF generation flow: `POST /api/proposals` (Route Handler) → returns `{ id, pdfUrl }`. Use Server Actions only for trivial mutations. The route handler must be `runtime: 'nodejs'` (not edge) — Puppeteer or @react-pdf needs Node APIs.
**Phase:** Phase 4 — captured in spec
**Confidence:** HIGH

### 1.4 Caching footguns: `fetch` defaults flipped (MEDIUM)
**What goes wrong:** Next.js 15+ changed `fetch` default from `force-cache` to `no-store`. Code authored against Next 14 examples that *relied* on automatic caching now hits Postgres on every request. Conversely, code that wraps a DB read in `unstable_cache` without a revalidate tag will stale-cache the coefficients across deploys.
**Prevention:** Pick one strategy per data type and document it: (1) global financial parameters → `unstable_cache` with `revalidateTag('financial-params')` invalidated by the admin save action; (2) proposals list → no cache (always fresh); (3) static config → request memoization only (`React.cache`).
**Phase:** Phase 3 (data layer)
**Confidence:** HIGH

### 1.5 Middleware running on every request (MEDIUM)
**What goes wrong:** Putting role checks in `middleware.ts` so that `/admin/*` is protected. By default middleware runs on *every* request including `/_next/static/*`, `/favicon.ico`, image assets. If middleware does a DB read to verify role, p95 latency goes up across the whole app.
**Prevention:** (a) Tight matcher `config.matcher = ['/admin/:path*', '/api/admin/:path*']`. (b) Role lives in the JWT/session cookie — never DB-read in middleware. (c) Edge runtime middleware uses cookie inspection only; deeper checks happen in route handlers or layout.
**Phase:** Phase 2 (auth shell)
**Confidence:** HIGH

### 1.6 Static rendering capturing dynamic data at build time (HIGH)
**What goes wrong:** Pages that read auth state via `cookies()` or `headers()` opt out of static rendering automatically. But pages that read the *database* without using those APIs can be statically rendered, capturing build-time data.
**Prevention:** Mark dashboard, proposals list, coefficients pages with `export const dynamic = 'force-dynamic'` until you've consciously designed caching.
**Phase:** Phase 2/3 — scaffold template
**Confidence:** HIGH

---

## 2. Auth (NextAuth v5 OR Better Auth — applies to either)

### 2.1 Adapter version skew (BLOCKING in scaffold)
**What goes wrong:** Auth library + Drizzle adapter + Next.js + React 19 alignment lag. Picking versions that don't agree leads to: build-time TS errors, runtime "Adapter is not assignable to type AdapterUser" errors, or session callbacks that silently drop fields.
**Prevention:** During Phase 1, pin all four exact versions in `package.json` (`next`, auth library, adapter, `react`/`react-dom`) — no carets — and document the matrix in `docs/dependencies.md`. When upgrading, upgrade together or not at all.
**Phase:** Phase 1 (scaffold) and ongoing
**Confidence:** MEDIUM-HIGH

### 2.2 JWT vs database session — wrong default (HIGH)
**What goes wrong:** With Credentials provider in some auth libraries you are *forced* into JWT strategy (database sessions don't work with Credentials). But putting the role in the JWT means: revoking a partner doesn't take effect until their JWT expires (default 30 days).
**Prevention:** Set short `session.maxAge` (e.g., 8 hours) and rely on the `jwt` callback to re-fetch user status from DB on each token refresh — i.e., implement "JWT with revocation" by checking `disabledAt` on every `jwt` callback invocation. Or use `session_version` field that bumps on revocation. Document the revocation latency in the security model.
**Phase:** Phase 2 (auth)
**Confidence:** HIGH

### 2.3 The `session.user.role` type-augmentation footgun (MEDIUM)
**What goes wrong:** Adding `role` to `session.user` requires module augmentation in a `auth.d.ts` file. Forgetting it leads to `session.user.role` being `any` (TS) and silently `undefined` in production for sessions issued before the field was added to the JWT callback.
**Prevention:** A single `auth.types.ts` that augments `User`, `Session`, and `JWT` simultaneously, with a runtime Zod parse on `session.user` in a `getSessionStrict()` helper that throws if `role` is missing. Use that helper in every server component instead of `auth()`.
**Phase:** Phase 2
**Confidence:** HIGH

### 2.4 bcrypt vs argon2 in serverless (MEDIUM)
**What goes wrong:** `bcrypt` (native) won't compile on Vercel without serverless-compatible builds; people switch to `bcryptjs` (pure JS, slow) or `@node-rs/argon2` (native, requires correct binary). Cold-start CPU cost for `argon2` at default work factor can push login latency to 1.5-2 s on a Vercel cold function.
**Prevention:** Use `@node-rs/argon2` with explicit work factor tuned for cold-start budget. Verify in Phase 2 by measuring p95 login latency on a cold Vercel function.
**Phase:** Phase 2
**Confidence:** MEDIUM

### 2.5 First-login forced password change — common implementations break (HIGH)
**What goes wrong:** Admin seeds a partner with a temporary password and a `mustChangePassword: true` flag. Naïve implementation: on login success, redirect to `/change-password`. Problem: if redirection is client-side after the JWT is issued, the partner can directly navigate to `/dashboard` (browser history, prefetch) and bypass the change.
**Prevention:** (a) `mustChangePassword` is checked in middleware/layout against the *fresh* JWT, but the password change action calls `update()` to refresh the JWT in the same request. (b) All other routes redirect to `/change-password` unconditionally when the flag is set. (c) Test the prefetch case.
**Phase:** Phase 2 — explicit acceptance test
**Confidence:** HIGH

### 2.6 CSRF on Credentials sign-in (MEDIUM)
**What goes wrong:** Auth.js has CSRF protection but it relies on the matching cookie + form token. If you build a custom login form that POSTs JSON via `fetch` to `/api/auth/callback/credentials` instead of using `signIn()`, you can accidentally bypass or fail CSRF.
**Prevention:** Use the auth library's official client function. Don't roll a custom POST.
**Phase:** Phase 2
**Confidence:** MEDIUM

---

## 3. Postgres + ORM (Drizzle)

### 3.1 Connection storm on Vercel cold starts (BLOCKING at scale)
**What goes wrong:** Each Vercel function instance opens its own DB connection pool. Default Postgres `max_connections` is 100. Even at small scale, a burst from a CI smoke test plus a couple of concurrent users can spike to 30+ functions × 10 pool connections = pool exhaustion.
**Prevention:** (a) Set per-function pool size to 1 (`max: 1` in pg pool config) — accept the latency. (b) For real protection, use a connection pooler in front: Neon's pooled URL (PgBouncer transaction mode), Supabase pooler, or PgCat on OVH later. (c) Long-running transactions are forbidden in transaction-pooling mode.
**Phase:** Phase 1 (DB choice) and Phase 3
**Confidence:** HIGH

### 3.2 Migrations in CI/CD: preview vs prod env divergence (HIGH)
**What goes wrong:** Vercel preview deployments default to the same env vars as production. If `DATABASE_URL` is shared, a preview deploy running `drizzle-kit push` mutates the production schema.
**Prevention:** (a) Migrations are *never* applied automatically on Vercel deploy. (b) Migrations run only via an explicit GitHub Action (`workflow_dispatch` with a confirmation input) against the prod DB. (c) Preview environments use a Neon branch DB that's seeded fresh from a migration replay. (d) `drizzle-kit push` is forbidden in production — only `drizzle-kit migrate` against versioned SQL files.
**Phase:** Phase 1
**Confidence:** HIGH

### 3.3 Schema design for "snapshot at time of creation" (BLOCKING for PDF immutability)
**What goes wrong:** The instinct: `proposals` table has FKs to `partners`, `coefficients`, `financial_parameters`. Then 6 months later admin updates a coefficient and historical proposals' "displayed values" change (if computed from joined tables) — violating immutability.
**Prevention:** Two-table pattern: (1) `proposals` stores fully-denormalized snapshot — every input, every coefficient, every computed value, the full JSON used to render the PDF, plus the immutable `pdf_blob_url` and `pdf_sha256`. (2) `coefficients` and `financial_parameters` are looked up *only* at proposal-creation time, then copied. The stored PDF is the source of truth; the DB row is the searchable index.
**Phase:** Phase 3 (schema design) — explicit invariant in spec
**Confidence:** HIGH

### 3.4 Indexing for the "recent proposals" list (LOW-MEDIUM)
**What goes wrong:** Default index is on `id`. The dashboard query is `WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 50`. Postgres falls back to a full scan + sort.
**Prevention:** Composite index `(partner_id, created_at DESC)`. Verify with `EXPLAIN ANALYZE` once seeded with 1000+ test rows.
**Phase:** Phase 3
**Confidence:** HIGH

### 3.5 `numeric`/`decimal` vs `double precision` for monetary values (HIGH)
**What goes wrong:** Storing rent amounts, coefficients, residuals as `double precision` (JS `number`) introduces float drift. v10 may have used JS numbers throughout, but persisting to a DB amplifies drift across reads.
**Prevention:** All monetary columns: `numeric(14, 4)` (or wider). All coefficients: `numeric(10, 8)`. Drizzle returns these as strings — wrap in a `Decimal` type at the boundary. Document the contract: "the calc engine accepts and returns Decimal, never number." Verify by golden-testing a v10 calculation against a v1.1 calculation with identical inputs.
**Phase:** Phase 3 — golden test required
**Confidence:** HIGH

### 3.6 Seed coefficients before first user can log in (MEDIUM)
**What goes wrong:** Day-1 production deploy: schema is migrated, but the admin hasn't logged in yet to enter coefficients. A partner logs in first, tries to create a proposal, gets a runtime error.
**Prevention:** Seed migration that inserts default coefficient rows (using the v10 baseline values) as part of the deploy. Admin-edited values overlay these. Mark seed as idempotent (`ON CONFLICT DO NOTHING`).
**Phase:** Phase 3 / cutover
**Confidence:** HIGH

---

## 4. PDF generation

### 4.1 Puppeteer + Vercel: function size limit (BLOCKING if Puppeteer chosen)
**What goes wrong:** Vercel serverless functions have a 50 MB compressed deployment package limit. Bundling regular `puppeteer` (which downloads full Chromium ~170 MB) blows the limit.
**Prevention:** Use `@sparticuz/chromium` (pre-compressed Chromium-min) + `puppeteer-core`. Mark as external in build: `serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core']`. Function memory: 1024 MB minimum, 2048 MB recommended.
**Phase:** Phase 4 — architecture decision in spec, prototype before locking
**Confidence:** HIGH

### 4.2 Cold start of Chromium-min on Vercel (HIGH if Puppeteer chosen)
**What goes wrong:** First PDF generation after idle: 4-7 seconds before HTML even loads (Chromium decompresses in /tmp). Subsequent generations on the same warm instance: ~500 ms.
**Prevention:** (a) Document expected latency in UX spec — show a progress spinner with "Génération du PDF en cours..." for up to 10 s. (b) Optionally: a cron-pinged warmer endpoint.
**Phase:** Phase 4
**Confidence:** HIGH

### 4.3 `@react-pdf/renderer` vs HTML-to-PDF feature parity (BLOCKING for "PDF identical to v10")
**What goes wrong:** `@react-pdf/renderer` does not parse CSS. Layout uses a custom subset (flexbox-ish). v10's `@media print` CSS — multi-column layouts, page-break-inside-avoid, complex backgrounds — won't survive translation. Estimating "we'll just port the styles" underestimates the work by 5-10x.
**Prevention:** Decision tree: if "PDF must look identical to v10" is the requirement → HTML-to-PDF via Puppeteer. If "PDF can look professional but different" → `@react-pdf/renderer` is fine. Lock this decision in Phase 4 design with a 1-page side-by-side comparison test against v10 output before committing.
**Phase:** Phase 4 — go/no-go gate
**Confidence:** HIGH

### 4.4 Font rendering: Plus Jakarta Sans server-side (HIGH for pixel parity)
**What goes wrong:** Browsers ship system fonts; the v10 standalone HTML loads Plus Jakarta Sans from a CDN at runtime. Server-side Chromium has *no* fonts beyond a tiny default — text falls back to a generic sans-serif. PDFs render with completely different metrics.
**Prevention:** (a) Self-host the Plus Jakarta Sans woff2 files inside the Next.js app under `public/fonts/`. (b) Embed via `@font-face` with `font-display: block`. (c) Before generating PDF: `await page.evaluateHandle('document.fonts.ready')`. (d) Test by diffing a v10 PDF vs v1.1 PDF visually for the first month.
**Phase:** Phase 4
**Confidence:** HIGH

### 4.5 Determinism: locale, timezone, generated IDs drifting (HIGH for legal artifacts)
**What goes wrong:** A "regenerate this PDF from stored inputs" check that should produce the *same* PDF binary produces a different one because: (a) `Intl.NumberFormat('fr-FR')` non-breaking space rendering differs across Node versions, (b) `new Date()` baked into the document, (c) generated UUID for an internal ref, (d) Chromium PDF metadata includes a timestamp.
**Prevention:** (a) The generated PDF binary is the source of truth — never regenerate. Store it once, serve forever. (b) For inputs visible in the PDF: `Intl` formatters are pinned (locale `fr-FR`, options frozen as constants). (c) Strip Chromium PDF metadata; use Puppeteer's `pdf({ ... })` options to control metadata. (d) Render-time = stored-time (no `new Date()` inside the React tree).
**Phase:** Phase 4 — explicit invariant
**Confidence:** HIGH

### 4.6 Memory blowup generating PDFs sequentially (MEDIUM)
**What goes wrong:** Long-lived Node process (e.g., on OVH) that generates many PDFs in a row leaks memory because pages aren't closed.
**Prevention:** `try { ... } finally { await page.close(); }` in a `withPage()` helper. Recycle the browser instance every N pages.
**Phase:** Phase 4 / OVH port phase
**Confidence:** HIGH

### 4.7 Decimal display vs decimal storage drift (MEDIUM)
**What goes wrong:** Stored: `1234.5678 €`. Displayed in PDF: `1 234,57 €` (rounded). Recomputation from displayed value differs from stored.
**Prevention:** Store full precision; display rounded. Document the rounding rule in PDF footer. Don't expose the full-precision value in the PDF unless required.
**Phase:** Phase 4 / Phase 3 — coordinated
**Confidence:** MEDIUM

---

## 5. Vercel Blob / S3 portability

### 5.1 `put()` API surface ≠ `PutObject` (HIGH for portability)
**What goes wrong:** Vercel Blob's `put(pathname, body, { access: 'public' })` returns a `{ url, downloadUrl, pathname }` object. S3's `PutObject` takes `Bucket`, `Key`, `Body`, `ACL`, etc., and returns no URL. Code written against `put()` mixes URL generation with storage and doesn't port.
**Prevention:** Define a `BlobStorage` interface from day 1. Implement `VercelBlobStorage` and `S3BlobStorage` as adapters. App code only ever sees the interface. The "URL" never leaks into business logic — it's always reconstructed via `getSignedUrl()`.
**Phase:** Phase 5 (storage layer)
**Confidence:** HIGH

### 5.2 Public vs private access mode (BLOCKING for confidentiality)
**What goes wrong:** Vercel Blob default `access: 'public'` makes the URL guessable-but-unlisted. For B2B PDF proposals containing client business data, "public unguessable URL" is *not* sufficient — anyone who once received the URL retains access forever.
**Prevention:** Private blobs only. Every download goes through `GET /api/proposals/[id]/pdf` which (a) checks auth + role + ownership, (b) mints a 60-second signed URL, (c) 302-redirects. If `access: 'private'` is unavailable in current Vercel Blob SDK, store under unguessable keys *and* never expose the raw URL.
**Phase:** Phase 5 — captured in security spec
**Confidence:** MEDIUM (verify private-mode availability)

### 5.3 Bucket-level access controls and partner data isolation (BLOCKING)
**What goes wrong:** All partners' PDFs in a single bucket. A bug in the auth check on the proxy route, or a list-blobs admin tool that leaks across partners, exposes partner A's PDFs to partner B.
**Prevention:** (a) Key prefix per partner: `proposals/{partnerId}/{proposalId}.pdf`. (b) The proxy route hard-codes the prefix from the authed user's `partnerId` claim — never from the URL parameter. (c) Admin role can override but logs the access. (d) Defense in depth: a `proposals` DB row records `(partnerId, blobKey)` and the proxy verifies the requesting user's `partnerId` matches the DB row before signing the URL.
**Phase:** Phase 5 — captured in spec, security review gate
**Confidence:** HIGH

### 5.4 Cache-control on signed URLs (LOW)
**What goes wrong:** Signed URL with no `Cache-Control` lets the browser/CDN cache the PDF *under that URL*. Same partner re-fetching weeks later may get a cached "Access Denied" if the CDN learned the expired-token response.
**Prevention:** `Cache-Control: private, no-store` on the proxy route's redirect response.
**Phase:** Phase 5
**Confidence:** MEDIUM

---

## 6. Vercel → OVH portability

### 6.1 Vercel-only primitives — what to grep for (BLOCKING for the eventual port)
**What goes wrong:** Code accumulates Vercel-specific imports/APIs that don't exist in stock Next.js running on a VPS:
- `@vercel/blob` (storage)
- `@vercel/postgres` (DB)
- `@vercel/kv`, `@vercel/edge-config` (KV)
- `import { ImageResponse } from 'next/og'` (works on edge only)
- `geo` and `ip` from request headers (Vercel-injected)
- `runtime: 'edge'` route handlers
- Cron via `vercel.json` `crons` field
**Prevention:** (a) ESLint `no-restricted-imports` rule blocking `@vercel/*` packages outside the adapter layer. (b) Pre-merge grep CI step: `git grep -E "@vercel/(blob|postgres|kv|edge-config)" -- ':!src/lib/storage/' ':!src/lib/db/'` — fail if matches outside adapter dirs. (c) `runtime: 'edge'` is forbidden anywhere.
**Phase:** Phase 1 — set up CI rules; every phase enforces
**Confidence:** HIGH

### 6.2 Image optimization on OVH (MEDIUM)
**What goes wrong:** `next/image` works on Vercel because Vercel runs an image optimizer transparently. On `next start` on OVH, image optimization requires `sharp` to be installed.
**Prevention:** Install `sharp` as a hard dependency from day 1. Test `next build && next start` locally and on a staging VPS before counting on Vercel parity.
**Phase:** Phase 1
**Confidence:** HIGH

### 6.3 Middleware behavior differences (MEDIUM)
**What goes wrong:** Vercel runs middleware at the edge. On `next start` on OVH, middleware runs in the same Node process. Differences: `geo`/`ip` headers absent, latency profile changes.
**Prevention:** Middleware uses only standard Node-compatible APIs. Test middleware behavior in `next start` mode in CI.
**Phase:** Phase 2
**Confidence:** HIGH

### 6.4 Env var differences — Vercel auto-injects, OVH won't (HIGH)
**What goes wrong:** Vercel auto-provides `VERCEL_URL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`. Code that reads these silently breaks on OVH. NextAuth specifically: `NEXTAUTH_URL` / `AUTH_URL` must be set explicitly on OVH.
**Prevention:** Wrap in an env helper: `getAppUrl()` reads `APP_URL` first, falls back to `VERCEL_URL`. Document required OVH env vars in `docs/deploy-ovh.md`.
**Phase:** Phase 1/2
**Confidence:** HIGH

### 6.5 `.next/standalone` output on OVH — what works, what doesn't (HIGH)
**What goes wrong:** `output: 'standalone'` produces a self-contained `node server.js` bundle. Gotchas: (a) doesn't include `public/` — must copy manually, (b) doesn't include `.next/static/` — must copy manually, (c) image optimization `_next/image` route still requires `sharp` separately.
**Prevention:** Set `output: 'standalone'` from Phase 1. Add a deploy script: `cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/`. Test the standalone bundle in a Docker container.
**Phase:** Phase 1 / OVH port phase
**Confidence:** HIGH

### 6.6 Cron jobs (MEDIUM if cron used)
**What goes wrong:** Vercel cron via `vercel.json` won't fire on OVH.
**Prevention:** Either avoid cron, or implement crons as standalone routes triggered by GitHub Actions schedule (works on both hosts).
**Phase:** Wherever cron is introduced
**Confidence:** HIGH

---

## 7. Role-based admin gating

### 7.1 "Hidden URL" treated as security (BLOCKING if it's the *only* layer)
**What goes wrong:** "The admin coefficients page is at `/x9k2-coefficients` so partners can't find it." This is obscurity, not security. A leaked link, a referrer header, a browser history sync — any of these reveal it.
**Prevention:** (a) The hidden URL is for UX (not in nav, not linked from anywhere) — fine. (b) Every admin route, layout, and API is independently role-gated server-side via `getSessionStrict()` + `assertRole('admin')`. (c) Even if the URL leaks publicly tomorrow, a partner role can't access. Test: log in as a partner, paste the admin URL — get 404.
**Phase:** Phase 2 — explicit acceptance test
**Confidence:** HIGH

### 7.2 Admin role accidentally assigned (HIGH)
**What goes wrong:** A migration sets `role` default to `'admin'` instead of `'partner'`. Or a seed script meant for dev runs in prod. Or admin's "create partner" form has a `role` field and a default checkbox flips it.
**Prevention:** (a) DB-level CHECK constraint: `CHECK (role IN ('partner','admin'))`. (b) `role` column default is `'partner'`. (c) Admin role is granted *only* by a CLI script run by Antoine on the production DB — never by the app's UI.
**Phase:** Phase 2 / Phase 3
**Confidence:** HIGH

### 7.3 Role check after data load (HIGH for perf, MEDIUM for security)
**What goes wrong:** Page handler does `const data = await db.query(...)` first, *then* checks role. The expensive query already ran; the early-exit was wasted. Worse: if the query throws, the error message leaks DB schema info before the redirect.
**Prevention:** Order in every protected page/handler: (1) `getSessionStrict()`, (2) `assertRole(session, 'admin')`, (3) only then run business logic. Encode in a `withAdminAuth(handler)` wrapper.
**Phase:** Phase 2
**Confidence:** HIGH

---

## 8. Migration / cutover

### 8.1 Partner confusion: same domain, new login? (HIGH for adoption)
**What goes wrong:** v10 was a URL or downloaded HTML file. v1.1 is a hosted authed app. Partners wake up Monday and the old workflow is gone with no warning, no email, no domain pointer.
**Prevention:** (a) Cutover communication plan: 2-week notice email + 1-week reminder + day-of email with login URL and temp credentials. (b) Old domain redirects to new login page. (c) French + English versions of the comms.
**Phase:** Cutover phase
**Confidence:** HIGH

### 8.2 Coefficient data loss: admin re-entering coefficients in production (BLOCKING)
**What goes wrong:** Coefficients are entered into the dev DB but never migrated to production. Admin opens the prod admin page → empty form → fills in by typing from memory or stale spreadsheet → typos in production coefficients → every proposal generated is financially wrong.
**Prevention:** (a) Coefficients live in a versioned SQL seed file (`seeds/coefficients-2026-q1.sql`) extracted from v10's frozen values. (b) The seed runs in *every* environment as part of migration apply. (c) Admin-edited values overwrite seed but the seed is the floor. (d) On first admin login post-cutover, a checklist "Vérifier les coefficients" with a diff tool.
**Phase:** Cutover — gate before opening to partners
**Confidence:** HIGH

### 8.3 Test partner accounts surviving into production (HIGH)
**What goes wrong:** Pre-launch testing creates `test1@example.com`, `partner-demo@…` accounts. After launch, these remain in the prod DB.
**Prevention:** Test accounts have a `is_test: true` column. A pre-launch checklist runs `DELETE FROM users WHERE is_test = true`.
**Phase:** Cutover
**Confidence:** HIGH

### 8.4 Calculation drift between v10 and v1.1 detected only after cutover (BLOCKING)
**What goes wrong:** v10 is JS-in-browser using IEEE 754. v1.1 calc engine is also JS but runs server-side, possibly with `Decimal`. A subtle difference (rounding mode, intermediate precision) means proposal #1 in v1.1 differs from the same inputs in v10 by 0.50 €.
**Prevention:** Golden test fixtures: take 30+ representative v10 calculations, feed inputs to v1.1 calc engine, assert outputs match to the centime. Run in CI on every PR. Parameterize tolerance per output field if needed (rent: ±0, residual: ±0).
**Phase:** Phase 3 — gate before Phase 4
**Confidence:** HIGH

---

## 9. Domain-specific (Leasétic / IT-leasing)

### 9.1 GDPR / CNIL applicability to a B2B internal tool (HIGH)
**What goes wrong:** "It's B2B, GDPR doesn't fully apply" — wrong. GDPR applies to *personal* data, and partner contact info (name, email, phone) is personal data even in a B2B context. End-client data inside proposals is also personal data.
**Prevention:** (a) Data inventory document: what personal data is stored, where, retention period, lawful basis. (b) Partner-facing privacy notice (FR + EN) accessible from app footer. (c) Right-to-erasure flow: an admin action to delete a partner's account *but* PDFs are retained as legal artifacts (legitimate interest / legal obligation). (d) Server hosted in EU only (Vercel EU regions; OVH is FR — both compliant). (e) CNIL Art. 30 register is required.
**Phase:** Phase 2 / pre-launch
**Confidence:** MEDIUM (consult Leasétic's existing GDPR posture)

### 9.2 PDF as legal document: archival period (HIGH)
**What goes wrong:** PDFs deleted after a partner is deactivated. But IT-leasing contracts have French commercial-law retention obligations — typically 10 years for commercial documents (Code de commerce art. L. 123-22).
**Prevention:** (a) PDFs are *append-only* — no UI delete button. (b) DB row for proposal has no `deleted_at`. (c) Retention policy: 10 years minimum, documented. (d) Partner deactivation does not delete PDFs. (e) Consider WORM-like guarantees: once written, blob storage policy disallows delete.
**Phase:** Phase 5 — explicit retention policy
**Confidence:** MEDIUM (legal counsel should confirm exact period)

### 9.3 PDF integrity guarantees expected in IT-leasing (MEDIUM-HIGH)
**What goes wrong:** A contested proposal six months later: client claims "the version I received showed 4.2%, your dashboard shows 4.5%." Without integrity proof, dispute resolution is "your word vs theirs."
**Prevention:** (a) SHA256 of PDF stored in DB at generation time, never recomputed. (b) PDF metadata includes proposal ID + generation timestamp (visibly in the footer). (c) Optional: digital signature with a Leasétic certificate (PAdES) — defer to v1.2. (d) Audit log: who downloaded which PDF when (IP, user, partner) — minimum 10 years.
**Phase:** Phase 4/5
**Confidence:** MEDIUM

### 9.4 "Commission invisibility" extending to admin and audit surfaces (BLOCKING for trust model)
**What goes wrong:** Calc engine computes commission internally as part of pricing. The commission value never appears in the partner-facing PDF (good). But: (a) it's logged to server logs in a debug print, (b) it's in the proposal JSON snapshot stored in DB, (c) the admin's "view proposal details" page renders it, (d) error stack traces in Sentry/log aggregator include it.
**Prevention:** (a) Commission is a derived value, not stored separately. The proposal snapshot stores partner-facing values only. (b) No `console.log(proposal)` anywhere. Use a redacting logger that strips fields tagged `@sensitive`. (c) The admin's coefficients page shows coefficients (legitimate to admin), the proposal page shows partner-facing values only. (d) If admin needs to debug "why is partner getting this number," there's a separate "explain calculation" tool that runs in admin's browser only, no DB write.
**Phase:** Phase 3 / Phase 4 / Phase 6 — explicit invariant tested in CI by grepping logs from a smoke run
**Confidence:** HIGH

### 9.5 Partner data isolation through search/admin tools (HIGH)
**What goes wrong:** Admin builds a "search proposals across all partners" tool. A test screenshot of admin's screen, or an exported CSV, accidentally shared with partner A, reveals partner B's pricing strategy.
**Prevention:** (a) Admin export/screenshot policy documented. (b) Cross-partner views in admin require an extra "I confirm cross-partner access" gesture. (c) Audit log of admin viewing partner X's data, surfaceable to partner X if requested.
**Phase:** Phase 6
**Confidence:** MEDIUM

### 9.6 French legal text in PDF (LOW-MEDIUM)
**What goes wrong:** Mandatory legal mentions present in v10's PDF footer don't survive the Phase 4 PDF rebuild.
**Prevention:** Inventory v10's legal footer text byte-for-byte; treat as an immutable string constant in v1.1; assert presence in PDF golden tests.
**Phase:** Phase 4
**Confidence:** MEDIUM

---

## 10. The "what looks obvious but bites" list — migration-specific

### 10.1 Dark mode as state vs CSS-only (MEDIUM)
**What goes wrong:** v10 likely had a CSS-only or `prefers-color-scheme` dark mode (single-file, no JS state needed). v1.1 with Next.js + theme toggle introduces hydration mismatch warnings.
**Prevention:** Use cookie-based theme set in a server component. Don't rely on `localStorage` only.
**Phase:** Phase 2
**Confidence:** HIGH

### 10.2 Print stylesheet that worked in v10 won't work in PDF generator (HIGH)
**What goes wrong:** v10's `@media print` styles assume the browser's print dialog. Server-side Puppeteer `page.pdf()` ignores some print rules and respects others differently.
**Prevention:** PDF rendering uses an explicit `format: 'A4'`, `printBackground: true`, `margin: { top: '20mm', ... }`. Test the v10 print CSS in Puppeteer specifically.
**Phase:** Phase 4
**Confidence:** HIGH

### 10.3 Multi-file means circular deps (LOW)
**What goes wrong:** v10 was one file; refactoring into `lib/calc/`, `components/`, `lib/db/` introduces circular imports easily.
**Prevention:** Layered architecture documented up front: `types` ← `calc` ← `data` ← `actions` ← `ui`. ESLint `import/no-cycle` rule on.
**Phase:** Phase 1
**Confidence:** HIGH

### 10.4 Internationalization scope creep (MEDIUM)
**What goes wrong:** "FR + EN UI" is added in scope. Half the team picks `next-intl`, half tries `react-i18next`, half hardcodes French strings.
**Prevention:** One library (or hand-rolled). One pattern: every user-facing string goes through `t()`. ESLint rule `no-restricted-syntax` flagging string literals in JSX.
**Phase:** Phase 2
**Confidence:** HIGH

### 10.5 Number/date formatting locale mismatch (MEDIUM)
**What goes wrong:** PDF generated server-side uses Node's locale (likely `en-US` on Vercel). French amounts render as `1,234.56 €` instead of `1 234,56 €`.
**Prevention:** Always pass locale explicitly: `new Intl.NumberFormat('fr-FR', ...)`, never the default. Verify by generating a test PDF in CI and asserting the formatted output.
**Phase:** Phase 3/4
**Confidence:** HIGH

### 10.6 Form library mismatch with Server Actions (MEDIUM)
**What goes wrong:** React Hook Form + Server Actions: validation logic split between Zod (server) and RHF (client) drifts.
**Prevention:** Single source of truth: Zod schema. Use `react-hook-form` + `@hookform/resolvers/zod` with the *same* schema imported on both sides.
**Phase:** Phase 2 / Phase 4
**Confidence:** HIGH

### 10.7 The "regenerate PDF" temptation (BLOCKING for immutability)
**What goes wrong:** A bug in the PDF template (typo in legal footer). Instinct: "let's regenerate all existing proposals' PDFs with the fixed template."
**Prevention:** PDFs are immutable post-creation. A fix to the template applies to *new* proposals only. Old proposals retain the buggy footer (and the bug is documented in an addendum if material). The only allowed re-render is for a proposal flagged as never-served.
**Phase:** Phase 4 — explicit invariant
**Confidence:** HIGH

### 10.8 LocalStorage-to-DB mental model mismatch (HIGH)
**What goes wrong:** v10 used localStorage for partner config — instant, per-browser, no auth. v1.1 has DB-backed config. Mental model carries over: "save it on every keystroke" → 50 DB writes per session.
**Prevention:** Explicit save buttons with debounce or explicit "Enregistrer" actions. Settings load is a server-component DB read tied to session.
**Phase:** Phase 6
**Confidence:** HIGH

### 10.9 Browser back-button on form submission (MEDIUM)
**What goes wrong:** Partner submits proposal form → server action generates PDF → redirects to `/proposals/[id]`. Partner clicks back → form is empty.
**Prevention:** Post-redirect-get pattern. Form state in URL searchParams during composition. Idempotency key on submission.
**Phase:** Phase 4
**Confidence:** MEDIUM

### 10.10 Sentry/observability bundling secrets (HIGH)
**What goes wrong:** Adding Sentry mid-project. Default config captures request bodies (which include the proposal inputs and the calc engine's internals via stack traces). Commission values, partner pricing, end-client names all go to Sentry's servers.
**Prevention:** (a) Sentry EU hosting (`https://sentry.io/eu`). (b) `beforeSend` hook redacts request body, query params, and cookies. (c) Stack traces are scrubbed for known sensitive variable names. (d) Or: skip Sentry for v1.1.
**Phase:** Whenever observability is added
**Confidence:** HIGH

### 10.11 The "I'll add tests later" trap (HIGH for calc engine specifically)
**What goes wrong:** UI/auth/PDF gets prioritized; the ported calc engine has no tests because "it's the same formula as v10." Six weeks later a refactor changes a rounding direction; nobody notices.
**Prevention:** Calc engine is the *first* code with tests, before UI. Golden fixtures (8.4) are the gate.
**Phase:** Phase 3 — gate
**Confidence:** HIGH

### 10.12 Single-developer review blind spots (MEDIUM, project-structural)
**What goes wrong:** Antoine is the sole developer. No peer code review on auth, role gates, or PDF immutability — the highest-risk areas.
**Prevention:** (a) Pre-launch external security review (paid 2-3 hour engagement) on auth + admin gating + blob isolation. (b) For Phase 4 (PDF) and Phase 5 (storage), use AI-driven security review as a structured checklist walkthrough. (c) GSD's `/gsd-review` agents on every phase.
**Phase:** Pre-launch and per-phase
**Confidence:** HIGH

---

## Phase-Specific Warnings (summary table)

| Phase | Top Pitfalls to Address |
|-------|---------------------------|
| Phase 1 (scaffold) | 1.1 async params · 1.6 force-dynamic · 6.1 Vercel-only grep CI |
| Phase 2 (auth + UI shell) | 2.1 version pinning · 2.2 JWT revocation · 7.1 hidden URL ≠ security · 2.5 first-login flow |
| Phase 3 (data + calc engine) | 3.3 snapshot pattern · 3.5 numeric not double · 10.11 calc engine tests first · 8.4 golden v10 vs v1.1 |
| Phase 4 (PDF) | 4.1 sparticuz/chromium size · 4.3 react-pdf vs HTML-to-PDF decision · 4.4 self-host fonts · 9.4 commission redaction |
| Phase 5 (blob storage) | 5.1 BlobStorage interface · 5.2 private only · 5.3 partner key prefix isolation · 9.2 retention 10y |
| Phase 6 (admin) | 7.2 admin grant CLI only · 9.4 commission invisibility everywhere · 10.8 explicit save not autosync |
| Cutover | 8.2 coefficient seed · 8.3 test account purge · 8.4 golden tests gate · 8.1 partner comms |
| OVH port | 6.1-6.6 portability · 4.6 memory leak fix · 6.5 standalone copy script |

---

## Severity Roll-Up

**BLOCKING (12):** 1.1, 3.1, 3.3, 4.1, 4.3, 5.2, 5.3, 6.1, 7.1, 8.2, 9.4, 10.7

**HIGH (~25):** see individual items

**MEDIUM (~15):** see individual items

**LOW (4):** 3.4, 5.4, 6.7 (omitted), 10.3
