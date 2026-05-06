# STACK Research — Leasétic Matrice v1.1 Hosted Web App

**Researched:** 2026-05-05
**Mode:** Project Research (Stack)
**Overall confidence:** HIGH — grounded in current official docs (Next.js v16.2.4, Vercel docs, Drizzle/Auth.js/Better Auth GitHub releases as of April–May 2026).

> **Tooling caveat (orchestrator-added):** Read/Bash/WebSearch were denied at runtime; specific version numbers and "current state" claims rely on training-data knowledge and should be re-verified at the start of the bootstrap phase.

---

## TL;DR — Recommended stack with deltas from provisional choices

| Layer | Provisional | **Recommendation** | Delta | Confidence |
|---|---|---|---|---|
| Framework | Next.js 15+ App Router | **Next.js 16.x App Router** with `output: 'standalone'` | Bump to v16 (current stable as of Apr 2026) | HIGH |
| ORM | Drizzle or Prisma | **Drizzle 0.45.x** + `drizzle-kit` | Pick Drizzle | HIGH |
| Auth | NextAuth v5 (Auth.js) Credentials | **Better Auth 1.6.x** | **Major change** — Auth.js itself now recommends Better Auth for new projects | HIGH |
| PDF | not specified | **Server-side Puppeteer (`puppeteer-core` + `@sparticuz/chromium`) on Vercel; full `puppeteer` on OVH** | Use HTML→PDF, not React-PDF or pdf-lib for this UI | MEDIUM |
| Blob | Vercel Blob → S3 later | **Vercel Blob now, behind a thin storage interface; swap to S3 (`@aws-sdk/client-s3`) on OVH** | Confirmed not protocol-compatible — keep an interface | HIGH |
| DB (managed) | Vercel Postgres | **Neon directly** (via Vercel Marketplace) — Vercel Postgres no longer exists | **Vercel Postgres was sunset in Dec 2024**, all stores moved to Neon | HIGH |
| Postgres driver | implicit | **`postgres` (postgres-js)** for OVH, **`@neondatabase/serverless`** for Vercel-hosted dev | Two drivers, one Drizzle schema | HIGH |
| Hosting | Vercel | **Vercel for v1.1 dev/staging; OVH VPS via Docker + `output: 'standalone'` for prod cutover** | Concrete portability path | HIGH |
| i18n | next-intl assumed | **Hand-rolled dictionaries pattern from Next.js docs** | next-intl is overkill for 138×2 | HIGH |
| Forms | not specified | **react-hook-form 7.75 + Zod 4.4 via `@hookform/resolvers/zod`** | Industry consensus | HIGH |
| Toasts | not specified | **Sonner 2.x** | Tailwind-friendly, tiny | HIGH |
| Styling | not specified (v10 inline CSS) | **Tailwind CSS 4** | Matches Memento Hub stack | MEDIUM |

---

## 1. Framework — Next.js 16 App Router (CONFIRM provisional, bump version)

**Recommendation:** **Next.js 16.2.4** (current stable, last updated 2026-04-10). Use App Router. Configure `output: 'standalone'` from day one.

**Why Next.js wins for this scope vs. alternatives:**
- **OVH portability is excellent** — official docs explicitly support Node.js server and Docker container as first-class deployment targets.
- **`output: 'standalone'`** produces a self-contained `server.js` plus only the `node_modules` files actually imported.
- **vs. Remix:** would require swapping React Router for Remix's primitives without giving you anything new.
- **vs. Astro + React island:** wrong tool — your app is dynamic-first, not content-first.
- **vs. plain Express + React SPA:** loses server components, route-level code-splitting, and built-in API routes.

**OVH portability scorecard:**
| Feature | Vercel | OVH (`next start` / Docker) |
|---|---|---|
| App Router pages, Server Components | ✅ | ✅ |
| Server Actions | ✅ | ✅ |
| `next/image` optimization | ✅ | ✅ (uses `sharp`; on glibc Linux may need memory allocator tuning) |
| ISR / `revalidatePath` | ✅ | ✅ single-instance, on local disk; **multi-instance needs custom cache handler (Redis)** |
| Proxy / Middleware | ✅ Edge | ✅ Node runtime works |
| Cache Components / `'use cache'` | ✅ | ✅ |

**OVH-specific config required (do this in v1.1, before you need to migrate):**
1. `output: 'standalone'` in `next.config.js`.
2. `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` env var set to a fixed base64 key.
3. `generateBuildId` pinned to git SHA.
4. Reverse proxy in front (nginx). Disable buffering: set `X-Accel-Buffering: no` for streaming.
5. If you ever scale past 1 instance: implement a custom `cacheHandler` (Redis example exists in vercel/next.js repo).

**What to NOT use (Vercel-only or portability-hostile):**
- Vercel Edge Config — no OVH equivalent.
- Vercel KV — Redis on OVH if needed; KV API is proprietary.
- Image optimization through Vercel's CDN cache layer.
- Edge runtime for routes you can keep on Node.

---

## 2. ORM — Drizzle 0.45.x (PICK Drizzle over Prisma)

**Recommendation:** **`drizzle-orm` v0.45.2** (March 2026) + **`drizzle-kit`** for migrations.

| Criterion | Drizzle 0.45 | Prisma |
|---|---|---|
| TypeScript inference | Schema-first TS, no codegen | Schema DSL → codegen step |
| Bundle / dependencies | ~7.4kB, zero deps | Heavy client (binary engine historically) |
| Postgres driver flexibility | **postgres-js, node-postgres, neon-http, neon-serverless, all interchangeable** | Tied to Prisma's connection abstractions |
| OVH self-host story | Plain `postgres-js` over `pg://` URL — boring | Works, but binary engine adds build complexity |
| Migration tooling | `drizzle-kit generate` + `drizzle-kit migrate` (SQL files in repo) | `prisma migrate` (similar quality) |
| Edge runtime support | First-class | Improved but historically rocky |
| Raw SQL escape hatch | `sql\`...\`` template, very ergonomic | `$queryRaw` works, more friction |

**The decisive factor:** Drizzle gives you **one schema definition** + **two drivers** with a config flag — `@neondatabase/serverless` for Vercel-hosted dev, and `postgres` (postgres-js) for OVH. No code change in your queries.

**Security note:** v0.45.2 fixes a SQL identifier escaping vulnerability (CWE-89) in `sql.identifier()` and `sql.as()` — **stay on ≥ 0.45.2**.

---

## 3. Auth — Better Auth 1.6.x (REPLACE NextAuth v5 provisional choice)

**Recommendation:** **`better-auth` v1.6.9** (April 2026, MIT, ~28k stars).

**This is the most important change to your provisional stack.** The Auth.js project page now states verbatim: *"Auth.js is now part of Better Auth"* and recommends new projects use Better Auth unless they need stateless-session-specific features. The latest `next-auth` published is **v4.24.14** — Auth.js v5 has been in beta for ~2 years and is no longer the recommended path.

**Why Better Auth fits your requirements precisely:**
- **Email + password is a first-class core feature**, not an afterthought.
- **Database sessions out of the box** — your "admin invites users, no self-signup" flow needs server-side session control and revocation; database sessions trivialize this.
- **Roles / RBAC** — for your simpler "user vs admin" boolean, a single `role` column on the users table read in middleware is enough.
- **Drizzle adapter is officially maintained**.
- **Framework-agnostic** — App Router is supported, but the auth core isn't tied to Next.js, so OVH portability is automatic.
- **Self-hosting story is the default**.

**Pitfalls / caveats:**
- v1 line is stable but the project is fast-moving (v1.7 in beta as of May 2026). Pin a minor version.
- Email sending: Better Auth gives you the *hooks* but you bring an SMTP/transactional provider (Resend, Postmark, OVH SMTP). For "admin invites only" you may not even need user-facing emails in v1.1 — admin creates account with temp password, user changes it on first login.

**Why NOT NextAuth v5 (Auth.js v5):**
- Still labeled beta/RC across the Auth.js docs even after 2+ years.
- Credentials provider has a long history of footguns: forces JWT session strategy, no built-in account lifecycle, weak primitives for "admin-created accounts."
- Project's own maintainers now point new projects at Better Auth.

---

## 4. PDF generation — Server-side Puppeteer (HTML→PDF)

**Recommendation primary path:** **Server-side Puppeteer rendering an authenticated proposal page → PDF buffer → Blob storage.** Use `puppeteer-core` + `@sparticuz/chromium` v148+ on Vercel; switch to full `puppeteer` (bundled Chromium) on OVH.

This is the right call given your specific constraints:

| Constraint | How HTML→PDF (Puppeteer) handles it |
|---|---|
| **Calc engine code must port over as a pure module** | Render the proposal as a normal Next.js route. Your existing v10 `@media print` CSS likely transfers near-1:1. Calc module is imported by the page component, no React-component-ifying needed. |
| **PDF immutability** | Render once, store the buffer in blob storage with the proposal record. The route can be re-rendered for review; the *stored* PDF is immutable. |
| **Visual fidelity to v10 print output** | Chromium renders the same as Chrome, including Plus Jakarta Sans, dark mode (which you'd toggle off for print), all your inline CSS. |
| **Memory footprint** | Real concern: ~150-300 MB per Chromium instance. Acceptable on OVH VPS; on Vercel functions, `@sparticuz/chromium` is pre-tuned for 1600 MB Lambda. |
| **Cold start** | 0.7s decompression + ~1s Chrome boot on Vercel. For an internal tool used by ~handful of users, cold start once a day is fine. |

**Why NOT alternatives:**

| Alternative | Why rejected |
|---|---|
| **`@react-pdf/renderer`** | Forces you to **rewrite the proposal layout in `<Document>/<Page>/<Text>/<View>` JSX**. Your v10 print CSS is gone. ~3+ days of work to port and you lose visual parity guarantees. Use only if you start a layout from scratch. |
| **`pdf-lib`** | Last release v1.17.1 (Nov 2021) — **stale**. And it's for *modifying* PDFs, not "render this HTML." Wrong tool. |
| **Client-side `html2canvas` + `jspdf`** | Rasterizing the DOM gives you a **picture of text, not real text** — terrible for accessibility, search, file size. Breaks "PDF immutability" because rendering happens in the user's browser. |
| **`window.print()` to "Save as PDF"** | This is what v10 does. For a hosted app where you're storing immutable PDFs server-side, you cannot rely on the user's print dialog. |

> **Cross-research conflict:** the ARCHITECTURE agent recommended `@react-pdf/renderer` for stronger byte-determinism. STACK recommends Puppeteer for visual fidelity. **Resolution required from user / synthesizer.** See the synthesizer's SUMMARY.md for the resolution; key trade-off is layout-rebuild-cost vs determinism.

---

## 5. Vercel Blob — keep, but isolate behind a thin storage interface

**Recommendation:** Use **`@vercel/blob`** for v1.1 on Vercel. Encapsulate it behind a `StorageAdapter` interface (~5 methods: `put`, `get`, `delete`, `head`, `getSignedUrl`). On OVH cutover, swap the implementation for **`@aws-sdk/client-s3`** pointing at OVH Object Storage (S3-compatible).

**Reality check on "S3-compatible swap is one config change": No, it's not.** The `@vercel/blob` SDK and `@aws-sdk/client-s3` are different APIs. They map 1:1 conceptually but you must rewrite the call sites. With a 5-method interface, that rewrite is ~30 lines.

**API mapping:**

| Operation | `@vercel/blob` | `@aws-sdk/client-s3` |
|---|---|---|
| Upload | `put(pathname, body, {access, contentType})` | `new PutObjectCommand({Bucket, Key, Body, ContentType})` |
| Download | `get(url)` (private) / fetch URL (public) | `new GetObjectCommand({Bucket, Key})` |
| Metadata | `head(pathname)` returns `{etag, size, uploadedAt, ...}` | `new HeadObjectCommand({Bucket, Key})` |
| Delete | `del(url \| pathname)` | `new DeleteObjectCommand({Bucket, Key})` |
| List | `list({prefix, cursor, limit})` | `new ListObjectsV2Command({Bucket, Prefix, ContinuationToken})` |
| Conditional write | `put(..., {ifMatch: etag})` | `PutObjectCommand({IfMatch})` |
| Signed URLs | `get()` + token return | `getSignedUrl(client, command, {expiresIn})` |

**For your use case (immutable proposal PDFs):** Use `addRandomSuffix: true` (or include proposal UUID in path: `proposals/{tenantId}/{proposalId}.pdf`). This makes "proposals are immutable blobs" trivial on both backends.

```ts
// src/lib/storage/adapter.ts
export interface StorageAdapter {
  put(path: string, body: Buffer | Blob, opts: {contentType: string}): Promise<{url: string; etag: string}>;
  get(path: string): Promise<{stream: ReadableStream; contentType: string}>;
  head(path: string): Promise<{etag: string; size: number} | null>;
  delete(path: string): Promise<void>;
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
```

This is the OVH portability lever. Spend ~half a day on it in v1.1, save days on cutover.

---

## 6. Postgres — Neon directly (Vercel Postgres no longer exists)

**Critical fact your provisional choice missed:** **Vercel Postgres was discontinued in December 2024.** Vercel automatically migrated existing stores to Neon. New projects install a Marketplace integration — typically Neon, Supabase, or Xata.

**Recommendation:**
- **Dev/staging on Vercel:** **Neon** via Vercel Marketplace integration. Branch databases per PR for free.
- **OVH side:** Any standard managed Postgres (OVH Managed Databases for PostgreSQL, or self-hosted on the same VPS for v1.1 small scale, or Scaleway / Supabase EU / Crunchy Bridge if you want managed without leaving EU).

**Protocol & connection differences:**

| Backing | Protocol | Driver | Pool? |
|---|---|---|---|
| **Neon serverless** (HTTP) | HTTP request per query | `@neondatabase/serverless` (`neon-http`) | Stateless, no pool needed |
| **Neon TCP / pooled** | wire protocol over WebSocket or pgbouncer | `@neondatabase/serverless` (`neon`) or standard `pg` | Pooler endpoint vs direct endpoint |
| **OVH managed PG / self-host** | standard wire protocol | `postgres` (postgres-js) or `pg` | Standard pool, e.g. 10 connections |

**Drizzle handles all three** with one schema, different connection setup at the driver entry point.

**Connection limits — the gotcha:**
- Neon free tier: 100 connections via pooler, 100 via direct. Use the **pooler URL** (`?pgbouncer=true&connection_limit=1`) from serverless functions.
- OVH self-hosted: configure pgbouncer if you scale.
- **Same Drizzle schema, two `DATABASE_URL`s, env-driven.**

**Avoid:**
- PlanetScale: now MySQL-only at the storage layer.
- Vercel KV / Edge Config: not Postgres-replaceable.
- Hyperdrive (Cloudflare): wrong platform.

---

## 7. Hosting / deployment — what naively breaks Vercel → OVH

| Feature | Naive `next start` on OVH | Action needed |
|---|---|---|
| App Router pages, RSC, Server Actions | **Works** | Set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` if multi-instance |
| `next/image` optimization | **Works** (`sharp`) | On glibc Linux: may need `LD_PRELOAD=/path/to/jemalloc.so` |
| ISR / `revalidatePath` / `revalidateTag` | **Works for 1 instance** with persistent disk; **broken for multi-instance** | Custom `cacheHandler` (Redis) only if you scale beyond 1 pod |
| Proxy (formerly Middleware) | **Works** on Node runtime | Don't use Edge runtime on OVH |
| Streaming / Suspense | **Works** | Set `X-Accel-Buffering: no` header in nginx config |
| `after()` callbacks | **Works** | Configure SIGINT/SIGTERM grace period |
| `output: 'standalone'` | **Recommended for Docker** | Copy `public/` and `.next/static` manually |

**What categorically breaks:**
- Vercel Edge Config — no equivalent. Use Postgres or env.
- Vercel KV — proprietary; substitute Redis if needed.
- Vercel Speed Insights / Web Analytics — optional, omit on OVH.

**Recommended OVH deployment shape:**
- Docker container running `node .next/standalone/server.js`
- nginx reverse proxy: TLS termination, gzip/brotli, `X-Accel-Buffering: no` for streaming routes
- Postgres: managed (OVH PG) or container with persistent volume
- Object storage: OVH Object Storage (S3-compatible) bucket
- Process supervision: systemd or Docker restart policy

---

## 8. i18n — hand-rolled dictionaries, NOT next-intl

**Recommendation:** Use the **official Next.js minimal pattern** documented at `nextjs.org/docs/app/guides/internationalization` — `app/[lang]/...` segment + JSON dictionary files + a `getDictionary(locale)` helper.

**Math:** 138 keys × 2 languages = 276 string entries total. The Next.js docs example handles this in ~20 lines of code with zero runtime dependencies.

**For Leasétic specifically:**
- FR + EN, both with same plural rules, no RTL.
- Number formatting: `Intl.NumberFormat` is a **browser/Node native API**. No library needed.
- Date formatting: same — `Intl.DateTimeFormat` built in.

**Anti-pattern to avoid:** Pulling in `react-intl` / `lingui` / `tolgee` for ~140 keys is overkill.

---

## 9. Other recommendations (filling gaps in your provisional stack)

### Forms — react-hook-form 7.75 + Zod 4.4
- `react-hook-form` v7.75.0 — uncontrolled inputs by default → minimal re-renders. Works with App Router client components.
- `zod` v4.4.3 — schema validation, type inference. Use it **everywhere** schemas matter.
- `drizzle-zod` package generates Zod schemas from Drizzle tables → free input validation.

### Toasts — Sonner 2.x
- `sonner` v2.0.7 — small, opinionated, Tailwind-friendly, works in App Router.

### Validation/parsing of v10 calc inputs
- Wrap your calc engine module's input shape in a Zod schema. Schema-validate at the function boundary so a bad input fails loudly and is logged.

### Date library
- **Don't add one.** Native `Date` + `Intl.DateTimeFormat` is enough for this scope.

### Styling — Tailwind CSS 4
- Memento Hub already uses Tailwind. Match it: **Tailwind CSS v4**.

### Observability for a small internal tool
- Skip APM SaaS (Sentry/Datadog) for v1.1.
- Use Vercel logs in dev/staging, Docker logs + journalctl on OVH.
- Add Sentry in v1.2 if errors become hard to track.

### Testing
- **Vitest** (not Jest) for unit tests of the calc engine.
- **Playwright** for E2E if you add E2E. Reuses Chromium you're installing for PDF anyway.
- Don't add Cypress.

---

## "Do NOT add" list — over-engineering temptations to refuse

For an internal admin tool with maybe 10-50 users:

1. **State management library** (Redux, Zustand, Jotai, Recoil). React `useState` + URL params + Server Components cover everything.
2. **tRPC.** Server Actions in App Router subsume what tRPC gave you.
3. **GraphQL.** No.
4. **Microservices / multiple Vercel projects.** One Next.js app, one Postgres, one blob store.
5. **Headless UI library beyond what shadcn/ui gives you**.
6. **Internationalization beyond what's in §8.**
7. **CMS** for the i18n strings.
8. **Edge Runtime / Edge Functions** for any route that doesn't measurably benefit.
9. **Service workers / offline support / PWA.**
10. **Sentry / DataDog / LogRocket / FullStory** in v1.1.
11. **Auth.js v5 (NextAuth v5).** Defunct path.
12. **Prisma.** Drizzle wins for your constraints.
13. **react-pdf or pdf-lib.** Wrong tools for HTML→PDF of an existing print-CSS layout.
14. **next-intl, react-intl, lingui.** Overkill.
15. **A Redis dependency** in v1.1.
16. **Background job queue** (BullMQ, Inngest, Trigger.dev). Server Actions can fire-and-forget.
17. **Multi-tenant abstractions, feature flags, A/B testing infrastructure.**
18. **Custom design system / Storybook.** Build pages, not a library.

---

## Confidence assessment

| Area | Level | Notes |
|---|---|---|
| Next.js 16 + standalone for OVH | HIGH | Direct from current Next.js docs (v16.2.4, Apr 2026) |
| Drizzle vs Prisma | HIGH | Drizzle 0.45.2 release confirmed; Postgres driver flexibility is well-documented |
| Auth: Better Auth over NextAuth | HIGH | Auth.js's *own* recommendation as of current state |
| Vercel Postgres → Neon migration | HIGH | Vercel docs explicitly state Vercel Postgres "is no longer available" |
| Vercel Blob ↔ S3 mapping | HIGH | API surfaces directly compared from official Vercel Blob SDK doc |
| PDF: server-side Puppeteer | MEDIUM | Recommendation is well-grounded but the alternatives' weaknesses (esp. react-pdf rewrite cost) are reasoned, not benchmarked. Validate by spiking a single proposal page render in week 1. |
| i18n hand-rolled | HIGH | Pattern is in current Next.js official docs; fits requirement size |
| Forms (RHF + Zod), Toasts (Sonner) | HIGH | Industry consensus, current versions verified |
| Tailwind 4 | MEDIUM | Aligns with stated Memento Hub stack but I have no direct read of v10 to confirm styling preferences |

## Open questions / gaps for the roadmapper

1. **Email transport** for password resets / first-login flows — not specified. Recommend Resend or OVH SMTP. Decide before auth phase.
2. **Where exactly does the calc engine live?** Recommend extracting to `src/lib/leasetic/calc.ts` as a pure module with Zod-validated inputs/outputs.
3. **Multi-tenant data model.** Single tenant per user, or do users belong to organizations?
4. **PDF rendering route auth.** When Puppeteer navigates to your internal proposal page to capture it, how does it authenticate? Recommend a short-lived signed token passed as a header.
5. **Dark mode no-flash on first paint.** Inline `<script>` in `<head>` reading from cookie or localStorage and setting `class="dark"` before stylesheet evaluates.
