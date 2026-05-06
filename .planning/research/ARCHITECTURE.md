# Architecture: Leasétic Matrice v1.1 — Hosted Web App Foundation

**Researched:** 2026-05-05
**Mode:** Project Research (Architecture)
**Confidence:** MEDIUM-HIGH

> **Tooling caveat (orchestrator-added):** Read/Write/Bash/WebSearch/WebFetch/Context7 all denied this session. Architecture is built from the milestone briefing and architectural fundamentals. Items marked MEDIUM/LOW must be re-verified at the start of the relevant phase.

---

## 1. Recommended Architecture

### 1.1 Layered overview

```
                                 ┌──────────────────────────────────┐
                                 │         Browser (React)          │
                                 │  Server Components + Client      │
                                 │  Components for entry/preview    │
                                 └────────────────┬─────────────────┘
                                                  │  HTTPS
                                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                  Next.js (App Router) — Node runtime               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │ middleware   │  │ Route groups │  │ Route handlers          │   │
│  │ (auth gate)  │  │ (public/     │  │ (PDF gen, downloads,    │   │
│  │              │  │  authed/     │  │  admin mutations)       │   │
│  │              │  │  admin)      │  │                         │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬────────────┘   │
│         │                 │                       │                │
│  ┌──────▼─────────────────▼───────────────────────▼────────────┐   │
│  │  lib/  (pure, framework-light core)                          │   │
│  │  • calc.ts  (ported v10 engine, server+client)               │   │
│  │  • i18n/   (dictionary + lookup helper)                      │   │
│  │  • pdf/    (renderer, deterministic settings)                │   │
│  │  • storage/ (blob adapter — Vercel Blob | S3-compatible)     │   │
│  │  • db/     (Drizzle client + schema)                         │   │
│  │  • auth/   (NextAuth config, session helpers)                │   │
│  └──────┬───────────────────────┬───────────────────────────────┘   │
└─────────┼───────────────────────┼───────────────────────────────────┘
          ▼                       ▼
   ┌────────────┐          ┌─────────────────┐
   │ Postgres   │          │ Blob storage    │
   │ (managed)  │          │ Vercel Blob OR  │
   │            │          │ S3-compatible   │
   └────────────┘          └─────────────────┘
```

The seam between Next.js bits and `lib/` is the OVH-portability boundary. Anything that talks to a hosting-provider primitive (blob, KV, etc.) sits behind a `lib/` adapter.

### 1.2 Component boundaries

| Component | Responsibility | Communicates with |
|---|---|---|
| `middleware.ts` | Coarse auth gate. Redirects unauthenticated users to `/login`. No role checks. | Auth session cookie |
| `app/(public)/login` | Login page. Public route. | `lib/auth` |
| `app/(authed)/*` | Authenticated user routes (home, proposal flow). | `lib/db`, `lib/calc`, `lib/pdf` |
| `app/(admin)/[adminSegment]/*` | Admin routes. Role-gated in layout. | `lib/db`, `lib/auth` |
| Route handlers | PDF generation, blob proxy, admin mutations. | `lib/pdf`, `lib/storage`, `lib/db` |
| `lib/calc` | Pure TS module, ported v10 engine. No I/O, no React. | Pure |
| `lib/i18n` | Dictionary + `t(key, lang)` helper. Server- and client-callable. | Pure |
| `lib/pdf` | Builds PDF from typed proposal input. Deterministic. | `lib/calc`, `lib/i18n` |
| `lib/storage` | Adapter interface `put/get/signedUrl`. Implementations: `vercelBlob`, `s3Compatible`. | Vercel Blob / S3 / OVH Object Storage |
| `lib/db` | Drizzle client + schema definitions + queries. | Postgres |
| `lib/auth` | Auth config, session helpers, `requireUser()` / `requireAdmin()`. | Auth lib, `lib/db` |
| `components/Theme*` | No-flash theme bootstrap + toggle. | Cookie + `<html data-theme>` |

### 1.3 Data flow: create proposal end-to-end

```
1. User on /proposals/new, fills form (montantHT, commission, coefficient, ...)
2. Client component live-previews loyer using lib/calc (imported into bundle)
3. User submits → POST /api/proposals (route handler)
4. Server route handler:
   a. requireUser() → session
   b. Read current global params (most-recent global_params row)
   c. Validate input (zod)
   d. Compute final values via lib/calc (re-run server-side, never trust client)
   e. INSERT proposals row WITH inputs + params_snapshot inlined as JSONB
      (the immutability anchor — see §2.5)
   f. Render PDF via lib/pdf with deterministic settings
   g. Upload PDF to blob: key = proposals/{userId}/{proposalId}.pdf
   h. UPDATE proposals.pdf_blob_key, pdf_sha256, pdf_size_bytes
   i. Return { proposalId } to client
5. Client navigates to /proposals/{id}; PDF streams via /api/proposals/{id}/pdf
```

Invariant: **the row is the snapshot**. The PDF is a derived artifact regenerable byte-identically from the snapshot (§3.4).

---

## 2. Route Structure & Database Schema

### 2.1 Route layout (Next.js App Router)

```
app/
├── layout.tsx                         # Root layout. Theme bootstrap script (no-flash).
├── globals.css                        # Tailwind base + CSS custom properties for themes
├── (public)/
│   ├── layout.tsx                     # Minimal layout (logo, no nav)
│   └── login/
│       └── page.tsx                   # Login form (server component + client form island)
├── (authed)/
│   ├── layout.tsx                     # App shell. Calls requireUser() server-side.
│   ├── page.tsx                       # Home: list of recent proposals + "New" CTA
│   ├── proposals/
│   │   ├── new/page.tsx               # Entry form (client component for live preview)
│   │   └── [id]/
│   │       ├── page.tsx               # Result/review for an existing proposal
│   │       └── export/page.tsx        # Export controls (download PDF, share link)
│   └── settings/page.tsx              # User: language, theme, password change
├── (admin)/
│   └── [adminSegment]/                # See §2.3 — env-driven hidden admin URL
│       ├── layout.tsx                 # requireAdmin(); 404 (not 403) on mismatch
│       ├── coefficients/page.tsx      # Edit global params (writes new params row)
│       └── accounts/page.tsx          # Create partner accounts
└── api/
    ├── auth/[...auth]/route.ts
    ├── proposals/
    │   ├── route.ts                   # POST create
    │   └── [id]/
    │       ├── route.ts               # GET metadata, DELETE (soft)
    │       └── pdf/route.ts           # GET (stream or signed URL)
    └── admin/
        ├── params/route.ts            # POST new global params row
        └── accounts/route.ts          # POST create account
```

### 2.2 Auth & role enforcement (where it lives)

| Layer | Responsibility | Why here |
|---|---|---|
| `middleware.ts` | Coarse: redirect unauthenticated users away from `(authed)` and `(admin)`. Reads session cookie only. | Fast, runs before SSR. **Node runtime, not Edge.** |
| `(authed)/layout.tsx` | Calls `requireUser()` server-side. | Defence-in-depth; middleware can be bypassed. |
| `(admin)/[adminSegment]/layout.tsx` | Calls `requireAdmin()`. Returns **404 (not 403)** if not admin to keep URL hidden. | Single chokepoint for the entire admin tree. |
| `/api/admin/*` route handlers | Each handler also calls `requireAdmin()`. | Cannot rely on layout protection for API routes. |

Role-check in the admin **layout AND** every admin route handler. Don't put role logic in middleware — it bloats the middleware bundle and forces auth-DB lookups on every request.

### 2.3 Hidden admin URL — implementation

| Option | Verdict |
|---|---|
| Subdomain `admin.leasetic.tld` | Best isolation, adds DNS/cert ops. **Skip for v1.1.** |
| Static `/admin` segment | Trivially discoverable. Reject. |
| **Env-driven dynamic segment** (e.g. `/x7k9mq2/coefficients`) — value lives in `ADMIN_URL_SEGMENT`, layout 404s if `params.adminSegment !== process.env.ADMIN_URL_SEGMENT` | **Recommended.** Hides URL, rotatable, no DNS work, and the on-disk path doesn't leak the secret. |
| Slug stored in DB | Adds a query on every admin request. Avoid. |

```ts
// app/(admin)/[adminSegment]/layout.tsx (illustrative)
export default async function AdminLayout({ params, children }) {
  if (params.adminSegment !== process.env.ADMIN_URL_SEGMENT) notFound();
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
```

### 2.4 Database schema (Postgres + Drizzle)

```
users
├─ id              uuid pk
├─ email           citext unique not null
├─ password_hash   text not null              -- argon2id preferred, bcrypt acceptable
├─ role            text not null              -- 'partner' | 'admin'
├─ display_name    text
├─ language        text not null default 'fr'
├─ theme           text not null default 'system'
├─ session_version integer not null default 1 -- bump to invalidate JWTs
├─ created_by      uuid references users(id)  -- admin who created this account
├─ deleted_at      timestamptz                -- soft delete
└─ last_login_at   timestamptz

global_params         -- append-only history of admin-edited coefficients
├─ id                  uuid pk
├─ effective_from      timestamptz not null
├─ created_by          uuid references users(id) not null
├─ commission_pct      numeric(7,4) not null
├─ max_amount          numeric(12,2) not null
├─ validity_days       integer not null
├─ coefficients        jsonb not null         -- [{ qtr, value }, ...]
└─ note                text                    -- optional admin note

proposals
├─ id                  uuid pk
├─ user_id             uuid references users(id) not null
├─ created_at          timestamptz not null   -- "in force" timestamp
├─ inputs              jsonb not null         -- { montantHT, durée, qtr, locataire, ... }
├─ params_snapshot     jsonb not null         -- DEEP COPY of global_params at create time
├─ computed            jsonb not null         -- { loyer, totalHT, ... } recomputed server-side
├─ pdf_blob_key        text                    -- nullable until PDF written
├─ pdf_sha256          text                    -- 64-hex
├─ pdf_size_bytes      integer
├─ pdf_generated_at    timestamptz
├─ deleted_at          timestamptz             -- soft delete (GDPR purge later)
└─ schema_version      integer not null default 1   -- bump on calc/PDF formula change

password_resets        -- short-lived one-time tokens (also used for invitations)
├─ id                  uuid pk
├─ user_id             uuid references users(id)
├─ kind                text  -- 'reset' | 'invite'
├─ token_hash          text unique
├─ expires_at          timestamptz
└─ used_at             timestamptz

audit_log
├─ id                  uuid pk
├─ actor_user_id       uuid references users(id)
├─ action              text  -- 'params.update' | 'account.create' | 'proposal.delete' | ...
├─ target_type         text
├─ target_id           uuid
├─ payload             jsonb
└─ created_at          timestamptz
```

**Indexes:**
- `proposals (user_id, created_at desc)` — drives home page list
- `proposals (deleted_at)` partial — purge job
- `users (email)` unique
- `global_params (effective_from desc)` — "current" lookup
- `audit_log (created_at desc)`, `audit_log (actor_user_id, created_at desc)`

**Constraints:**
- `users.role IN ('partner', 'admin')`
- `proposals.schema_version >= 1`
- jsonb shape validated in app layer (zod), not DB

### 2.5 The PDF immutability decision — RESOLVED

| | (A) Snapshot inputs+params into row | (B) Append-only history table joined by date | (C) PDF binary is sole truth |
|---|---|---|---|
| Queryable past proposals | Yes (jsonb) | Yes (joins) | No |
| Storage cost | +small jsonb per row | tiny | smallest |
| Audit clarity | Self-contained per proposal | Cross-table reasoning | Opaque |
| Re-render PDF byte-identically | Possible | Possible if effective-from logic is correct forever | Impossible |
| Future migration risk | Low (`schema_version`) | Medium | High |
| Coefficient-change blast radius | Zero | Zero | Zero |
| Display past proposal as HTML | Yes | Yes | No |

**Recommendation: (A) — snapshot `params_snapshot` and `inputs` jsonb directly into the `proposals` row at creation time.**

Why (A) beats (B): self-contained rows are simpler to back up, simpler to export per-account for GDPR, and remove a class of "did the join return the right effective row?" bugs. Effective-from logic is a known footgun (clock skew, DST, reorderings of admin edits). Storage cost is trivial — params jsonb is ~hundreds of bytes; 100k proposals < 100 MB.

Why (A) beats (C): the home page lists proposals (date, customer, amount, loyer) — without queryable inputs we'd parse PDFs or duplicate data anyway. Re-rendering an HTML view of an old proposal becomes possible. "PDF is truth" makes the PDF a database, which is a category error.

**The PDF is a derived artifact.** With deterministic rendering (§3.4) we can regenerate byte-identically from `(inputs, params_snapshot, schema_version)`. The stored PDF is a cache + legal artifact, not the canonical record.

`schema_version` is **non-negotiable**. When the calc formula or PDF layout ever changes, this field lets us route old proposals to the old renderer. Cheap now, expensive to retrofit.

This is the standard pattern for invoice/proposal systems (Stripe stores price snapshots on each invoice line item exactly this way). Confidence on the resolution: HIGH.

### 2.6 Soft vs hard delete

Soft delete (`deleted_at`) for proposals and users. GDPR right-to-erasure handled by a periodic purge job that hard-deletes rows where `deleted_at < now() - INTERVAL '30 days'` and removes the corresponding blob. Two-stage delete prevents accidental data loss and gives a recovery window. Audit log entries remain (legal basis: legitimate interest in fraud prevention) but personal fields are nulled at hard-delete time.

---

## 3. PDF Generation Pipeline

### 3.1 Where PDF gets rendered

**Server route handler, Node runtime, NOT edge.** Reasons:
- v10 used `window.print()` + `@media print` CSS — that's client-side and produces non-deterministic output.
- Edge runtime can't run PDF libraries with native deps and is Vercel-specific.
- Server-rendered PDFs let us version-lock fonts, set deterministic metadata, and SHA-256 the bytes.

### 3.2 Library choice — UNRESOLVED CONFLICT WITH STACK RESEARCH

> **Cross-research conflict requiring user resolution:**

| | `@react-pdf/renderer` (this agent's pick) | Puppeteer/Playwright (STACK agent's pick) |
|---|---|---|
| Determinism | High (synthetic layout, embedded fonts) | Medium (Chromium version drift) |
| Bundle weight | Small | Heavy (Chromium ~150 MB on Vercel via @sparticuz/chromium) |
| OVH portability | Trivial (pure Node + npm) | Requires Chromium install + sandbox config |
| Reuse v10 print CSS | No (different layout model) | Yes (literally re-uses HTML) |
| Layout fidelity to v10 | Must rebuild from scratch | Pixel-equivalent |

**This research recommends `@react-pdf/renderer`** for byte-determinism, smaller bundle, and easier OVH portability — accepting the layout-rebuild cost. **The STACK research recommends Puppeteer** for visual fidelity to v10 with carefully managed determinism. User must choose; see synthesizer SUMMARY.md.

### 3.3 When PDF is generated

**Eagerly, on proposal save:**
```
POST /api/proposals
1. INSERT row (no pdf yet, pdf_blob_key NULL)
2. Render PDF
3. Upload to blob
4. UPDATE row with pdf_blob_key + pdf_sha256
5. Return
```

If steps 2–4 fail, the row exists without a PDF and a background job (or next view) regenerates. Acceptable because regeneration is deterministic.

### 3.4 Storage scheme

**Blob key:** `proposals/{user_id}/{proposal_id}.pdf`

- `user_id` segment makes per-account export trivial
- `proposal_id` is uuid → no collisions, no enumerability
- No version suffix — we don't store multiple versions

**Access pattern:** always proxy through `/api/proposals/{id}/pdf` which:
1. `requireUser()` and verifies ownership (or admin)
2. Reads `pdf_blob_key` from DB
3. Returns either a streamed body (default) or a short-lived signed URL

Never expose blob URLs directly. The Next handler is the gate.

### 3.5 Byte-identical re-rendering — the determinism contract

| Source of nondeterminism | Mitigation |
|---|---|
| Font version drift | Embed fonts as files in repo. Pin file hash in CI. |
| PDF metadata timestamps (`/CreationDate`, `/ModDate`) | Set to `proposal.created_at`, not `Date.now()`. |
| PDF object IDs / xref randomness | Verify with CI test that re-renders a fixture and SHA-256-compares. |
| Locale-dependent number/date formatting | Always pass explicit locale to `Intl.NumberFormat`/`Intl.DateTimeFormat`. |
| Floating-point in calc | Single named helper in `lib/calc` does all rounding; documented. |
| Library version bump | Bumping the renderer may change bytes. **This is what `schema_version` is for** — increment it and pin the old renderer for old rows. |

**CI determinism test:** render a fixed proposal fixture, SHA-256 the bytes, compare against committed expected hash. If it diverges, either the fix is intentional (bump `schema_version`) or it's a regression.

---

## 4. Auth Integration

### 4.1 Session strategy: JWT vs database

**Recommendation: JWT strategy with sliding 7-day lifetime, plus `users.session_version` for forced revocation.**

For an internal-partner app with admin-managed accounts, forced revocation is a real requirement (offboarding). Embed `users.session_version` in the JWT; bumping it invalidates all sessions for that user. Cache the lookup (single DB read per request only when token age > N minutes).

DB sessions are also fine — one extra query per request, negligible.

### 4.2 Where role check happens

| Place | Use? | Why |
|---|---|---|
| Middleware | No, beyond "logged in" | Avoids DB lookups in middleware; preserves OVH+Vercel parity. |
| `(admin)` layout | **Primary gate.** | Single chokepoint, server component, can hit DB. |
| Admin route handlers | **Defence in depth.** | Cannot trust caller in API routes. |
| Page components | Optional | Belt-and-suspenders. |

### 4.3 Admin-creates-account flow

```
1. Admin opens /[adminSegment]/accounts → "Create partner"
2. Submits { email, displayName, language }
3. POST /api/admin/accounts:
   a. requireAdmin()
   b. INSERT users { email, password_hash=NULL, role='partner', created_by=admin.id }
   c. INSERT password_resets { user_id, kind='invite', token_hash, expires_at = now() + 24h }
   d. INSERT audit_log
   e. Return one-time invitation URL containing the token (admin shares it out-of-band)
4. Partner opens URL, sets initial password → password_resets.used_at = now()
5. Partner can log in.
```

Recommended: **signed invitation tokens** so the admin never knows the partner's password.

### 4.4 Password reset

**v1.1: admin-mediated only.** Admin clicks "Reset password" → generates one-time token → URL shown once to admin to share out-of-band. Reasons:
- No SMTP / mail service to set up in v1.1
- All accounts are pre-vetted partners — admin already has a secure channel
- Avoids spam/abuse vectors

**v1.2+: self-service via SMTP.** Same `password_resets` table works for both.

---

## 5. v10 Calc Engine Port

### 5.1 Module shape

`lib/calc.ts` — pure TS, zero deps, no React, no I/O.

```ts
export interface CalcInput {
  montantHT: number;        // > 0
  commissionPct: number;    // 0..10 typically
  coefficient: number;      // from coefficients table for the chosen quarter
}

export interface CalcResult {
  loyer: number;            // = montantHT * (1 + commissionPct/100) * coefficient / 100
}

export function computeLoyer(input: CalcInput): CalcResult { /* ... */ }

export function lookupCoefficient(
  coefficients: Array<{ qtr: number; value: number }>,
  qtr: number
): number { /* ... */ }
```

- Direct port of v10 formula. Status: **modified** (rewritten as TS module, behaviour preserved).
- All inputs validated at the **boundary** (zod schemas in route handlers); calc module assumes valid input.
- Numeric precision: plain `number`. Preserve v10's float behaviour identically. If exact decimals are required later, swap to `decimal.js` behind the same interface.

### 5.2 Reuse points

| Caller | How |
|---|---|
| Server route handler | `import { computeLoyer } from '@/lib/calc'`. Run server-side on save — never trust client-computed values. |
| Client live-preview | Same import, bundled into client component. Zero deps means small bundle impact. |
| PDF renderer | Same import inside `lib/pdf`. |
| Admin coefficients preview | Server component imports it for "what would proposal X look like with new coefs". |

### 5.3 Tests

- **Vitest** (over Jest, for native ESM and TS speed).
- v10 self-checks (`assertCalc 6/6`, `assertEscape 8/8`, `assertValidity 6/6`) become Vitest fixtures.
- Add the **golden-PDF determinism test** (§3.5).
- v10 ran self-checks on every page load — replace that with CI gating so production users never see an in-page failure.

---

## 6. i18n

### 6.1 Strategy

v10 ships ~138 keys × 2 langs as a hand-rolled JS dictionary with instant DOM re-render on toggle. Port faithfully.

Two viable paths:
- **`next-intl`** — conventional App Router choice.
- **Hand-rolled** dictionary — given 138 keys, two locales, no plural/ICU complexity, this is legitimate:
  - `lib/i18n/dictionaries/{fr,en}.ts` — typed const objects
  - `lib/i18n/index.ts` — `t(key: keyof Dict, lang: Lang)` helper
  - Server component reads `lang` from cookie, calls `t()` directly
  - Client provider passes the active dictionary slice via React context

The hand-rolled path keeps zero deps and stays portable. If pluralisation/ICU is needed later, swap to `next-intl` behind the same `t()` interface.

### 6.2 URL design

| Option | Verdict |
|---|---|
| Path-based `/fr/...` `/en/...` | SEO + shareable lang URLs; adds route group complexity. Overkill for an internal partner tool. |
| **Cookie-based, single URL space** | **Recommended.** Simpler routes, partner toggles once and it sticks. SSR reads cookie. |
| `?lang=fr` query string | Awkward, leaks language into every URL. |

Cookie name `lt_lang`, values `fr`/`en`, default `fr`. Set from server action when user toggles. Read in root layout to pick dictionary for SSR.

### 6.3 Performance

138 keys × 2 langs ≈ a few KB. Ship the user's active dictionary in initial HTML and only that one in the client bundle. No measurable latency.

---

## 7. Dark Mode (No-Flash)

### 7.1 The pattern

v10's no-flash trick: inline `<head>` script reads localStorage and sets `data-theme` on `<html>` *before* paint. Critical UX detail — must preserve.

**Recommendation: hand-rolled, NOT `next-themes`.**
- Read from a **cookie** (not localStorage) so SSR can render the right theme classes on first paint — true zero flash even on slow networks, which localStorage cannot achieve.
- Cookie-driven SSR theming with `next-themes` is doable but its default storage is localStorage; getting full SSR parity needs custom config that's nearly as much code as doing it directly.
- The script is ~10 lines.

```ts
const NO_FLASH = `
  (function() {
    try {
      var m = document.cookie.match(/(?:^|;\\s*)lt_theme=([^;]+)/);
      var t = m ? m[1] : 'system';
      if (t === 'system') {
        t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', t);
    } catch (_) {}
  })();
`;
```

Server component reads the cookie too and sets `<html data-theme={t}>` so users with JS disabled or slow first paint still see correct theme.

### 7.2 Persistence: cookie

- Cookie name `lt_theme`, values `light` | `dark` | `system`
- Set via server action on toggle
- Cookie chosen over localStorage so SSR can render correct theme — eliminates flash entirely
- Synced to `users.theme` on logged-in users so theme follows account across devices

---

## 8. Build Order — Phase Decomposition

Six phases. Each phase ends in a deployable, demoable artifact. Dependencies flow downward.

```
Phase 1: Bootstrap & Deploy
  └─ Phase 2: Auth & Account Skeleton
       └─ Phase 3: Calc Engine Port + Proposal Form (no persistence)
            └─ Phase 4: Persistence + PDF Pipeline
                 └─ Phase 5: Admin Surface
                      └─ Phase 6: Cutover & Polish
```

| Phase | Goal | New components | Modified (ported v10) | Exit criterion |
|---|---|---|---|---|
| **1. Bootstrap** | Deployable empty shell on Vercel + Postgres + blob configured. | Next.js scaffold, Tailwind, Drizzle, env structure, storage adapter interface, CI, root layout, theme bootstrap, i18n harness with 5 sample keys, "hello world" page that writes/reads one DB row and one blob object | — | Production URL serves a page; round-trip DB+blob test green; CI runs Vitest |
| **2. Auth** | Login, session, role gating. No real features yet. | `app/(public)/login`, `lib/auth`, auth config, `users` table, `requireUser` / `requireAdmin`, middleware, admin URL secret, `(authed)` + `(admin)` layout shells with placeholder pages | — | Admin can log in, reach hidden admin page; partner can log in, reach `/`; URL-tampering returns 404/redirect |
| **3. Calc + Form** | Pure-front-end working calculator that matches v10 outputs. No DB writes yet. | Proposal entry form, live preview client component, **all i18n keys ported**, **dark mode toggle**, results view (HTML, no PDF) | **`lib/calc`**, **`lib/i18n` dictionaries** (full 138 keys × 2), **dark-mode pattern** | All v10 self-check fixtures pass in Vitest; manual parity check against v10 for ≥5 scenarios; UI matches v10 visual design |
| **4. Persistence + PDF** | Real proposals saved, PDF generated and stored, list on home page, download works. | `proposals` + `global_params` tables, `lib/pdf` with deterministic config, `lib/storage` Vercel Blob impl, route handlers for create/list/download, home page list, PDF determinism CI test, golden fixture | — | Create proposal → row exists → PDF in blob → SHA-256 stable across re-renders → home page lists it → download streams it |
| **5. Admin** | Admin can edit global params and create accounts. Audit log writes. | Admin coefficients form (writes new `global_params` row), admin accounts page (creates partner), `audit_log` table, password reset flow (admin-mediated) | — | Admin updates coefficients → new proposal uses new values → old proposals unchanged (params_snapshot proves it); admin creates partner → partner can log in; admin resets partner password |
| **6. Cutover & Polish** | Production-ready. v10 sunset. | OVH-portable storage adapter (S3-compatible) + smoke-test deploy, GDPR purge job, error pages, observability, README, runbook | — | Full app works on Vercel; same artifact deploys on a portable Node + Postgres + S3 stack with only env var changes; v10 standalone redirected/decommissioned |

Why this order:
- Phase 1 first because **a deployable empty shell catches half of all infra problems early.**
- Auth before features because every authed page depends on session shape.
- Calc + form before persistence because the calc engine port is high-leverage and self-contained; can be reviewed, tested, and demo'd against v10 without any DB.
- Persistence + PDF together because they're coupled (immutability invariant requires schema and PDF determinism in lockstep).
- Admin last among features because partners need to be productive first; admin is internal-only.
- Cutover at the end so OVH portability is **proven** by actually deploying once.

---

## 9. OVH-Portability Red Lines

Architecture must work on Vercel **and** on a generic Node + Postgres + S3-compatible host with no rewrite. Vercel-only primitives to **avoid**:

| Avoid | Why it blocks OVH | Portable equivalent |
|---|---|---|
| **Edge runtime** | OVH has no edge workers; many Node APIs unavailable in Edge anyway | **Node runtime everywhere.** |
| **Vercel KV** | Vercel-managed Redis | Self-hosted Redis OR Postgres-as-cache. v1.1 needs neither. |
| **Vercel Edge Config** | Vercel-only | Env vars + `global_params` DB table. |
| **Vercel Postgres / Neon-only features** | Tied to provider | **Standard Postgres 15+.** Drizzle migrations on any Postgres. |
| **Vercel Blob direct in app code** | Provider-specific SDK | **`lib/storage` adapter interface.** |
| **Vercel-specific image loaders** | Tied to provider | `next/image` with `loader: 'default'`. |
| **Vercel Cron** | Vercel-only scheduler | OVH: systemd timer or cron. Same script wired to Vercel Cron on Vercel. |
| **Middleware default Edge runtime** | OVH doesn't run Edge | Force Node runtime in middleware. |
| **`@vercel/analytics`, `@vercel/speed-insights`** | Vercel-only telemetry | Wrap behind `lib/telemetry`. |

### 9.1 The "swap one config to deploy to OVH" path

```
Vercel:                        OVH (same code):
  STORAGE_DRIVER=vercel          STORAGE_DRIVER=s3
  BLOB_READ_WRITE_TOKEN=…        S3_ENDPOINT=https://s3.gra.cloud.ovh.net
  DATABASE_URL=postgres://…      S3_REGION=gra
  AUTH_SECRET=…                  S3_BUCKET=leasetic-proposals
  ADMIN_URL_SEGMENT=…            S3_ACCESS_KEY_ID=…
                                 S3_SECRET_ACCESS_KEY=…
                                 DATABASE_URL=postgres://…
                                 AUTH_SECRET=…
                                 ADMIN_URL_SEGMENT=…
```

Plus on OVH: process manager (systemd unit running `next start` behind nginx), Postgres (managed or self-hosted), an S3-compatible bucket (OVH Object Storage is S3-compatible), and a cron entry for the purge job.

**Phase 6 explicitly executes this swap as a smoke test** so portability is observed, not assumed.

### 9.2 Anti-patterns to avoid (architecture-level)

- **Storing PDFs in Postgres as bytea** — kills connection memory, bloats backups, makes streaming awkward.
- **Computing loyer client-side and trusting it on save** — always recompute on the server.
- **Rendering PDFs at view time** — creates surprise latency. Eager generation is the right model.
- **Skipping `schema_version`** — without it, you cannot migrate the calc formula or PDF layout without breaking history.
- **Mixing the admin URL secret into source files / file paths** — keep it in env.

---

## 10. Confidence Assessment

| Decision | Confidence | Notes |
|---|---|---|
| Route layout (App Router groups) | HIGH | Conventional pattern. |
| Hidden admin via env-driven dynamic segment | MEDIUM | Pattern is sound; verify Next dynamic-segment ergonomics. |
| Postgres + Drizzle + jsonb snapshots | HIGH | Standard. |
| **PDF immutability via `params_snapshot` (option A)** | HIGH | Stripe-style pattern. |
| `@react-pdf/renderer` | MEDIUM | Conflicts with STACK research; user must pick. |
| JWT with `session_version` revocation | MEDIUM-HIGH | Common pattern; revocation impl needs care. |
| Hand-rolled i18n vs `next-intl` | MEDIUM | Either viable. |
| Cookie-based no-flash dark mode | HIGH | Battle-tested. |
| Six-phase build order | HIGH | Each phase demoable, dependencies linear. |
| OVH-portable storage adapter pattern | HIGH | Standard adapter pattern. |

**Verification blocked this session (re-verify at start of relevant phase):**
- v10 source HTML (calc, exact i18n keys, exact print-CSS).
- Next.js minor specifics: Node-runtime middleware, dynamic segment APIs.
- `@react-pdf/renderer` current state and determinism guarantees (or Puppeteer choice if STACK wins).
- `next-intl` vs alternatives.
- Vercel Blob ↔ S3-compatible adapter shape and OVH Object Storage exact endpoint config.

---

## 11. Implications for the Roadmap

1. **Phase 1 must produce a deployable empty shell that exercises Postgres + blob + auth-config wiring** — not just a Next.js scaffold. Highest-leverage risk reduction.
2. **The `params_snapshot + schema_version` decision (§2.5) is the spine of the data model** — every persistence/PDF/admin task depends on it. Lock it in early.
3. **PDF determinism (§3.5) needs a CI gate from day one of PDF generation** — add the golden-fixture test in the same PR that introduces `lib/pdf`.
4. **OVH portability is a Phase 6 deliverable, not a hope.** Schedule an actual OVH smoke deploy or "portable" is an untested claim.
5. **Calc engine port (Phase 3) is the highest-leverage de-risking** — TS module matching v10 behaviour with v10 self-checks as Vitest fixtures closes the door on calc regressions.
6. **No SMTP in v1.1.** Account creation and password reset are admin-mediated. v1.2+ adds email.
