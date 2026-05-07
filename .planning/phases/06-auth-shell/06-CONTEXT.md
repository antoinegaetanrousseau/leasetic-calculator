# Phase 6: Auth & Shell - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the authentication system and bilingual themed app shell that wrap every authenticated route in v1.1.

**In scope (32 requirements: AUTH-01..18 + SHELL-01..14):**
- `/login` page (public, minimal layout) — email + password, generic error message (anti-enumeration), redirect to `/` on success
- Better Auth wiring: credentials provider, JWT strategy, 8-hour sliding session, `users.session_version` for forced revocation within 5 minutes
- argon2id password hashing
- `users` and `password_resets` Drizzle tables + idempotent migrations + DB CHECK constraint `role IN ('partner','admin')`
- Admin-mediated invitation flow: admin creates partner record → one-time URL with signed token → partner sets initial password
- Admin-mediated password reset flow: admin clicks reset → one-time URL with signed token (same `password_resets` table, `kind='reset'`)
- Admin disable / re-enable partner accounts (preserves data, invalidates active session via `session_version` bump)
- CLI script (`scripts/grant-admin.ts` or similar) that seeds Antoine + Emmanuel as admin role on prod DB
- middleware-level coarse auth gate (Node runtime, tight matcher) → redirects unauthenticated to `/login`
- `app/(authed)/layout.tsx` with `requireUser()` defence-in-depth
- `app/(admin)/[adminSegment]/layout.tsx` with `requireAdmin()` + `notFound()` on segment mismatch (env-driven, 404 not 403)
- Every admin route handler independently calls `requireAdmin()`
- App shell: topbar (logo + display name + locale toggle FR/EN + theme toggle light/dark/system + logout) over `(authed)` and `(admin)` route groups
- Full v10 i18n dictionary port: ~138 keys × 2 languages (replaces Phase 5's 5 sample keys); ESLint rule flags hardcoded JSX literals
- Theme + locale persisted to both `users` row and cookie (cookie wins for unauthenticated, DB wins on login)
- Sonner toast variants wired to success / info / error per Phase 5 UI-SPEC §Sonner Toast Contract
- Form validation primitives: react-hook-form + Zod, schema imported on both client and server
- Error boundary + 404 page in FR + EN
- Number / date formatting via explicit `Intl` locales (`fr-FR` / `en-GB`) — never system defaults

**Out of scope for this phase (deferred or never):**
- Self-signup / "Create an account" UI (admin-invited only — REQUIREMENTS.md "Out of Scope")
- SMTP / transactional email (deferred to v1.2; admin shares URLs out-of-band — STATE.md locked)
- Self-service password reset (admin-mediated only in v1.1 — STATE.md locked)
- Social SSO / 2FA / "Remember me" / CAPTCHA / account lockout (REQUIREMENTS.md "Out of Scope")
- The proposal form, calc engine, PDF generation (Phase 7 + 8)
- Settings page (`/settings` in ARCHITECTURE.md is not in AUTH/SHELL requirements — defer to a later phase if/when needed)
- `global_params`, `proposals`, `audit_log` tables (Phases 8 + 9 own these)
- Mobile-optimized layout (SHELL-14: degrades gracefully; deferred to v1.2)
- Admin partner-listing UI (ADMIN-05/06 = Phase 9; the `disable` *primitive* lives in Phase 6, the *UI* lives in Phase 9)

</domain>

<decisions>
## Implementation Decisions

### Auth library (re-verification accepted as locked)
- **D-01:** Use Better Auth 1.6.x with the Drizzle adapter. Soft-lock from STATE.md (2026-05-05) accepted as final on 2026-05-07. Pin exact version (no caret) per Phase 5 dependency-pinning discipline.
- **D-02:** Email + password (Credentials provider only). No social SSO, no SMTP-based flows, no built-in account-creation API exposed to the public surface.
- **D-03:** JWT strategy with 8-hour sliding session (refresh on activity). Embed `users.session_version` in the JWT and re-check on every JWT refresh — bumping `session_version` invalidates all sessions for that user within 5 minutes (AUTH-16).
- **D-04:** argon2id for password hashing via `@node-rs/argon2` (native, fast on Vercel cold start with tuned work factor; PITFALLS §2.4). Verify p95 login latency on a cold Vercel function as part of acceptance.

### Schema scope for Phase 6 (sensible default applied — user accepted "keep going")
- **D-05:** Phase 6 creates ONLY the auth-essential tables: `users`, `password_resets`. Stubs for `global_params` / `proposals` / `audit_log` are deferred to their owning phases (8 + 9). Rationale: smaller, reviewable migration; Phases 7–8 can add their tables in their own waves without conflicting with the Phase 6 baseline.
- **D-06:** `users` schema follows ARCHITECTURE §2.4 verbatim — `id uuid pk`, `email citext unique`, `password_hash text`, `role text` (CHECK `role IN ('partner','admin')`, default `'partner'`), `display_name text`, `language text default 'fr'`, `theme text default 'system'`, `session_version integer default 1`, `created_by uuid fk users(id)`, `deleted_at timestamptz`, `last_login_at timestamptz`.
- **D-07:** `password_resets` schema follows ARCHITECTURE §2.4 — `id uuid pk`, `user_id uuid fk users(id)`, `kind text` (CHECK `kind IN ('reset','invite')`), `token_hash text unique`, `expires_at timestamptz`, `used_at timestamptz`. Tokens are stored hashed (SHA-256) — never plaintext; the URL contains the plaintext, the DB stores `sha256(token)`.
- **D-08:** Index `users(email)` unique. No additional indexes on `password_resets` (table stays small; tokens are short-lived).

### Invitation & reset URL UX (sensible defaults applied)
- **D-09:** Token TTL = 24 hours for both invitation and reset (per ARCHITECTURE §4.3). Single-use: `used_at` is set on first redemption; subsequent uses fail with a generic "Lien invalide ou expiré" / "Invalid or expired link" landing page.
- **D-10:** Admin-side display: after creating an account or triggering a reset, the admin sees a modal with the URL displayed once + "Copier le lien" button + "Ce lien ne sera plus affiché" / "This link will not be shown again" warning. The URL is NOT persisted server-side beyond the hashed token — closing the modal without copying = admin must re-issue.
- **D-11:** Re-issuance: admin can re-issue an invitation/reset at any time. Re-issuing invalidates any prior unused token for that user (delete old `password_resets` rows for the user, insert new). Idempotent semantics: invitation re-issued for an already-active user is rejected — admin must use "Reset password" instead.
- **D-12:** Token format: 32 random bytes → URL-safe base64 (not UUID). Stored as `sha256(token)` hex in `password_resets.token_hash`. URL shape: `/invite/{token}` and `/reset/{token}` — separate routes so the kind is unambiguous in middleware bypass rules.

### CLI admin-grant script (sensible defaults applied)
- **D-13:** Script location: `scripts/grant-admin.ts`, runnable via `npx tsx scripts/grant-admin.ts <email> [--display-name "..."]` against the production DATABASE_URL. Same pattern as `scripts/migrate.ts` from Phase 5.
- **D-14:** Behavior: if user with that email exists → upgrade `role` from `partner` to `admin` (idempotent — re-running on an already-admin user is a no-op + green log). If user does not exist → create the row with `role='admin'`, `password_hash=NULL`, then create a `password_resets` row with `kind='invite'`, print the invitation URL to stdout. Same flow as admin-creates-partner, just bypasses the UI.
- **D-15:** Emmanuel + Antoine seeding plan: run `grant-admin.ts` twice at v1.1 launch (Antoine first, then Emmanuel). Each run prints an invitation URL the operator copies. Each admin sets their own password via the invitation URL — the script never sees plaintext passwords.
- **D-16:** Script is gated by typed-confirmation (same pattern as `db:migrate` workflow): require `CONFIRM=GRANT-ADMIN-{email}` env var or interactive `tsx --interactive` prompt before mutating prod. Defence against accidental runs against the wrong DATABASE_URL.

### Hidden admin URL (locked from architecture)
- **D-17:** Segment value lives in `ADMIN_URL_SEGMENT` env var. Generated as 12+ char URL-safe random string. Layout reads `process.env.ADMIN_URL_SEGMENT` at request time (server component, not bundled to client).
- **D-18:** Layout behavior: if `params.adminSegment !== process.env.ADMIN_URL_SEGMENT` → call `notFound()` (renders 404, not 403). If segment matches → call `requireAdmin()`. Both checks are independent; both must pass.
- **D-19:** Admin discovery UX: admins know the URL because Antoine sets `ADMIN_URL_SEGMENT` at deploy time and shares it with admins out-of-band (same channel as their initial password). The app NEVER renders a link to the admin tree from any partner-visible surface. The topbar may show an "Admin" entry only when `session.user.role === 'admin'`, computed server-side.
- **D-20:** Rotation: changing `ADMIN_URL_SEGMENT` is a redeploy + out-of-band notice to admins. No DB change needed.

### Session, redirects, error responses
- **D-21:** Unauthenticated visitor on any `(authed)` or `(admin)` route → redirect to `/login?next=<encoded-original-path>` (preserves intent). Authenticated visitor on `/login` → redirect to `/`.
- **D-22:** Login error: ALWAYS the same generic message regardless of whether email exists, password is wrong, or account is disabled — "incorrect email or password" / "email ou mot de passe incorrect". Inline below the form (not a toast). Error responses use the same HTTP status (401) and the same response body shape — no distinguishing-by-status anti-enumeration.
- **D-23:** Disabled account: `users.deleted_at IS NULL` is the active filter. Setting `deleted_at` does NOT delete the user; it bumps `session_version` (revokes existing sessions) and rejects future logins with the generic message. Admin re-enable = clear `deleted_at` (does not auto-bump `session_version` again).
- **D-24:** Logout: server action that clears the session cookie + invokes Better Auth's signOut helper. Use library official client function — do NOT roll a custom POST (PITFALLS §2.6 CSRF).

### App shell & i18n
- **D-25:** Topbar lives in `app/(authed)/layout.tsx` AND `app/(admin)/[adminSegment]/layout.tsx` (same component, both layouts mount it). Order from left to right: Leasétic logo, page-title slot, spacer, locale toggle (FR/EN), theme toggle (☀/◑/☽), display-name + caret → user menu (logout). All toggle styles per Phase 5 UI-SPEC §Component Primitives.
- **D-26:** i18n strategy: extend `src/lib/i18n/dictionaries.ts` to ~138 keys × 2 languages. Source-of-truth: read `Matrice_2026_THE_Leasetic-v10.html` and extract every `t.*` key. ESLint rule `no-restricted-syntax` (or custom rule) flags string literals in JSX outside of `t()` calls and `aria-*` props. Hardcoded literals tolerated only in test files and dev-only debug strings.
- **D-27:** Theme + locale persistence: cookie is the source of truth for unauthenticated visitors and for SSR rendering (already done in Phase 5). On login, sync `users.theme` and `users.language` → cookie if cookie was empty; cookie if cookie set → write to `users` row. On toggle when authenticated: server action writes to BOTH cookie and DB. On logout: cookie persists (next visit shows the same theme/locale).
- **D-28:** SHELL-09 explicit Intl locales: every `Intl.NumberFormat` and `Intl.DateTimeFormat` call passes `'fr-FR'` or `'en-GB'` (not `'en-US'`) explicitly. A single helper `lib/i18n/format.ts` exposes `formatCurrency(value, lang)` / `formatDate(date, lang)` so callers cannot accidentally use `undefined` locale.

### Forms, errors, 404
- **D-29:** Login form uses react-hook-form + Zod (same Zod schema imported by the `/api/auth/sign-in` route handler so client validation matches server). On submit: client validation → server action → Better Auth signIn → on success redirect via Next.js redirect helper.
- **D-30:** Error boundary: `app/error.tsx` renders a generic "Something went wrong" page with a retry button. Localized FR/EN via `t()`. No stack trace shown to the user.
- **D-31:** 404 page: `app/not-found.tsx` localized FR/EN. Used by both the env-driven admin segment mismatch and any other unmatched routes.

### Middleware (locked from PITFALLS §1.5)
- **D-32:** `middleware.ts` runs on Node runtime (not Edge — OVH portability). Tight matcher: `config.matcher = ['/((?!_next/static|_next/image|favicon.ico|fonts/|api/auth).*)']` (or equivalent — exclude static + auth callback). Reads ONLY the session cookie (no DB lookup). Redirects unauthenticated to `/login?next=...`. Role checks happen in the layouts, not middleware.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & milestone (must read for context)
- `.planning/PROJECT.md` — project overview, v1.1 milestone goal, frozen invariants
- `.planning/REQUIREMENTS.md` §AUTH (lines 26–45) and §SHELL (lines 47–62) — the 32 active requirements for this phase
- `.planning/ROADMAP.md` §"Phase 6: Auth & Shell" (lines 51–62) — phase goal and success criteria
- `.planning/STATE.md` "Locked architectural decisions" (lines 67–88) — every soft-lock relevant to Phase 6, including the Admin = Antoine + Emmanuel decision

### Architecture (must read before planning)
- `.planning/research/ARCHITECTURE.md` §1.2 — component boundaries (`lib/auth`, layouts, middleware)
- `.planning/research/ARCHITECTURE.md` §2.1 — full route layout including `(public)/login`, `(authed)/*`, `(admin)/[adminSegment]/*`
- `.planning/research/ARCHITECTURE.md` §2.2 — auth & role enforcement layers (middleware vs layout vs handler)
- `.planning/research/ARCHITECTURE.md` §2.3 — hidden admin URL implementation pattern + illustrative code
- `.planning/research/ARCHITECTURE.md` §2.4 — Drizzle schema for `users` and `password_resets` (verbatim)
- `.planning/research/ARCHITECTURE.md` §4 (4.1–4.4) — session strategy, role-check placement, admin-creates-account flow, password-reset flow
- `.planning/research/ARCHITECTURE.md` §6 — i18n strategy (hand-rolled), URL design, performance
- `.planning/research/ARCHITECTURE.md` §7 — dark mode no-flash pattern (already implemented in Phase 5; preserve invariants)

### Pitfalls (must read; each item below is a Phase 6 acceptance gate)
- `.planning/research/PITFALLS.md` §1.1 — async `params` in Next.js 16 (every layout/page that reads `params` is `async`)
- `.planning/research/PITFALLS.md` §1.2 — `'use client'` granularity (login form is a client component, the page wrapping it is server)
- `.planning/research/PITFALLS.md` §1.5 — middleware tight matcher + Node runtime
- `.planning/research/PITFALLS.md` §1.6 — `force-dynamic` on auth-aware pages
- `.planning/research/PITFALLS.md` §2.1 — adapter version skew (pin Better Auth + Drizzle adapter + Next.js + React 19 exact versions)
- `.planning/research/PITFALLS.md` §2.2 — JWT revocation latency via `session_version`
- `.planning/research/PITFALLS.md` §2.3 — `session.user.role` type augmentation (`getSessionStrict` helper)
- `.planning/research/PITFALLS.md` §2.4 — argon2 work-factor tuning on Vercel cold start
- `.planning/research/PITFALLS.md` §2.5 — first-login forced password change (NOT applicable here per D-09 since invitation IS the first set; but if reset is used later, a similar discipline applies)
- `.planning/research/PITFALLS.md` §2.6 — CSRF: use library official client functions
- `.planning/research/PITFALLS.md` §7.1 — hidden URL is NOT security; every admin route independently role-gated
- `.planning/research/PITFALLS.md` §7.2 — DB CHECK constraint on role + `default 'partner'`
- `.planning/research/PITFALLS.md` §7.3 — order: `getSessionStrict` → `assertRole` → business logic
- `.planning/research/PITFALLS.md` §10.1 — cookie-based theme (already locked Phase 5)
- `.planning/research/PITFALLS.md` §10.4 — i18n single library/pattern (hand-rolled `t()`)

### Stack research
- `.planning/research/STACK.md` §3 — Better Auth 1.6.x rationale, version notes, "why not NextAuth v5"

### Phase 5 deliverables (preserve invariants)
- `.planning/phases/05-bootstrap-deploy/05-UI-SPEC.md` — full design-token spine that Phase 6 inherits unchanged: color palette, typography scale, spacing scale, button variants (`.btn-green`, `.btn-navy`, `.btn-ghost`, `.btn-out`), theme toggle component, locale toggle component, focus ring contract, sonner toast variants, layout shell dimensions
- `.planning/phases/05-bootstrap-deploy/05-07-PLAN.md` and `05-07-SUMMARY.md` — `/healthz` patterns for Node runtime + bounded error redaction (`classifyError`) — apply same redaction discipline to auth errors

### v10 source (must read)
- `Matrice_2026_THE_Leasetic-v10.html` — source of truth for the ~138 i18n keys to port. Read the dictionary section + extract every `t.*` key referenced in the JS.

### Source code already in place (Phase 5)
- `src/lib/i18n/dictionaries.ts` — 5 sample keys; extend with full v10 dictionary
- `src/lib/i18n/index.ts` — `t()` helper + `getCurrentLang()` / `getCurrentTheme()` server-side cookie readers
- `src/lib/i18n/actions.ts` — server action for locale toggle (extend to also write to `users.language` when authenticated)
- `src/lib/theme/no-flash-script.ts` — locked, do NOT modify
- `src/lib/theme/actions.ts` — server action for theme toggle (extend similarly to write to `users.theme`)
- `src/components/ThemeToggle.tsx` and `src/components/LocaleToggle.tsx` — reuse as-is in the topbar
- `src/lib/db/index.ts` and `src/lib/db/client.ts` — Drizzle adapter; add `users` + `password_resets` schemas via new files in `src/db/`
- `src/db/schema.ts` — currently only `schema_meta`; extend with new exports for `users` and `password_resets`
- `app/layout.tsx` — root layout with no-flash script + Toaster mounted (do NOT modify; auth concerns live in child layouts)
- `scripts/migrate.ts` — pattern for the new `scripts/grant-admin.ts` (typed confirmation gate, postgres-js client, masked URL logging)
- `eslint.config.mjs` — extend with the new no-hardcoded-jsx-strings rule (D-26)

### Open questions (per STATE.md and REQUIREMENTS.md — do NOT block on these)
- Auth library version pinning matrix (Open Q4) — must be locked the moment Phase 6 plans are written. The planner must pin: `better-auth`, `@better-auth/drizzle-adapter` (or whatever the official Drizzle adapter package name is), `@node-rs/argon2`, `next` (already 16.2.4), `react` (already 19.0.0).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/i18n/index.ts` — `t()`, `getCurrentLang()`, `getCurrentTheme()` already work and are server-component-safe. Extend dictionary, do not refactor.
- `src/components/ThemeToggle.tsx`, `src/components/LocaleToggle.tsx` — Phase 5 placeholders; mount in topbar. May need a tweak to call a different server action that ALSO writes to `users.theme` / `users.language` when authenticated.
- `src/lib/theme/no-flash-script.ts` — compile-time string constant; the SSR theme bootstrap pattern is locked. Do not modify.
- `src/lib/db/index.ts` — Drizzle client memoized singleton + `__resetForTests`. Reuse for new auth tables.
- `scripts/migrate.ts` — pattern for typed-confirmation gate, masked DATABASE_URL logging, dry-run flag. Mirror in `scripts/grant-admin.ts`.
- `app/layout.tsx` — root layout with `<Toaster>` mounted; auth + shell layouts nest beneath this.

### Established Patterns
- **Adapter pattern (`lib/storage`, `lib/db`)** — every hosting-provider primitive sits behind an adapter. Better Auth's adapter for Drizzle satisfies this for auth; mount it from `lib/auth/index.ts`. No `@vercel/*` imports in auth code.
- **ESM-only, static imports** (Phase 5 lesson 05-03) — avoid `require()` in adjacent .ts; Vitest ESM context will reject it.
- **Atomic per-task commits** with phase summary as durable record (PROJECT.md §"How we work").
- **Bounded error redaction** (Phase 5 `classifyError`) — auth errors must not leak DB schema info or whether email exists. Apply the same discipline.
- **`numeric()` precision contract** (Phase 5 `lib/db`) — not relevant to auth tables, but the discipline of "string at the boundary, parse once" applies to token handling.

### Integration Points
- **Phase 5 root layout** (`app/layout.tsx`): the `<html data-theme>` and `<html lang>` already render server-side. `(authed)` and `(admin)` layouts nest beneath; do NOT duplicate the no-flash script or Toaster.
- **Phase 5 ESLint config**: extend `no-restricted-imports` (already blocks Vercel-only outside adapters) with the new auth-server-only rule if Better Auth has separate client/server entry points.
- **Phase 5 CI grep gates**: `check-no-vercel-only-imports.sh` already runs; verify Better Auth's auth code does not import `@vercel/postgres`, `@vercel/edge-config`, etc.
- **Phase 5 healthz route** (`app/healthz/route.ts`): unauthenticated, must remain accessible after middleware lands. Add `/healthz` to the middleware matcher exclusion list.
- **Phase 5 migration pipeline** (`db:migrate` GitHub Action): Phase 6's new schema generates a new SQL migration that runs through the same pipeline. No changes to the workflow file expected.
- **Existing layout shell tokens** (`--shell-sidebar-w: 260px`, `--topbar-h: 64px`, `--footer-h: 48px`) drive the topbar component sizing in Phase 6.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly accepted all soft-locks as final on 2026-05-07 with the response "none, I want to keep going with the build and commit to these changes." This means: Better Auth 1.6.x is no longer "soft-locked" — it is locked. STATE.md should be updated accordingly.
- v10's existing dark-mode + i18n + button styles are the design source of truth — Phase 5 UI-SPEC already extracted and codified them; Phase 6 must NOT introduce visual deviations. Any new UI element (login form, error state, user menu) follows the existing token spine.
- Admin role provisioning at launch: **Antoine + Emmanuel**, run `scripts/grant-admin.ts` twice (per D-15).
- Pseudo-Stripe pattern carries over: tokens are short-lived rotatable secrets, the DB stores the hash not the plaintext, and the URL is the only place the plaintext exists.

</specifics>

<deferred>
## Deferred Ideas

- **`/settings` page** (per ARCHITECTURE.md §2.1) — not in AUTH/SHELL requirements. Defer to whichever phase needs it (likely a v1.2 candidate for self-service password change). Topbar already covers locale + theme.
- **Self-service password reset via SMTP** — already deferred to v1.2 in REQUIREMENTS.md "Future Requirements".
- **Audit-log writes for AUTH-12 admin grants and partner disable actions** — `audit_log` table doesn't exist yet (Phase 9). For Phase 6, the CLI script and the `disable account` flow can either (a) skip audit log entirely until Phase 9 lands, or (b) emit structured server logs that Phase 9 can backfill into `audit_log`. Decision deferred to the planner; both are acceptable.
- **2FA / account lockout / "Remember me" / CAPTCHA** — REQUIREMENTS.md "Out of Scope" / "Future Requirements".
- **Admin partner-listing UI (ADMIN-05/06)** — Phase 9. The disable *primitive* (server action that bumps `session_version` + sets `deleted_at`) is built in Phase 6; the UI that calls it is Phase 9.
- **Cross-partner admin "view as" tool** — out of scope for v1.1 (REQUIREMENTS.md "Future Requirements").
- **Session revocation reason logging** — useful for forensics but no audit_log yet; defer to Phase 9.

</deferred>

---

*Phase: 6-auth-shell*
*Context gathered: 2026-05-07*
