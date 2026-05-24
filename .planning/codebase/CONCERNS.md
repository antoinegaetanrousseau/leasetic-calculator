# Codebase Concerns

**Analysis Date:** 2026-05-24

> Scope: full repo (Next.js 16 / TypeScript / Drizzle ORM). Severity tags: **HIGH** (blocks partner onboarding or has security impact), **MEDIUM** (correctness/maintainability risk that hasn't bitten yet), **LOW** (polish, future cleanup). Area tags: security / perf / maintainability / correctness.

---

## Tech Debt

### [HIGH · security] Launch-day shared admin password still in place

- **Issue:** Both production admins (Antoine + Emmanuel) were seeded with a single shared password via `scripts/seed-admins-launch.ts:47-59` (`INITIAL_PASSWORD` env). `.planning/v1.3-CARRYFORWARD.md:11` flags this as Tier-1 — MUST rotate before first real partner is onboarded.
- **Files:** `scripts/seed-admins-launch.ts:47-59`, `scripts/grant-admin.ts` (rotation path)
- **Impact:** Two-person shared secret over the only admin role on production. Any leak compromises full coefficient + audit-log control.
- **Fix approach:** Use the admin↔admin password reset flow at `/[adminSegment]/partners/page.tsx` to rotate each admin to a distinct strong password. Then delete or gate `scripts/seed-admins-launch.ts` behind a `--allow-shared-password` flag so the pattern can't be reused.

### [HIGH · security] Privacy policy not yet confirmed with Leasétic counsel

- **Issue:** Vercel/Neon EU hosting + 10-year PDF retention has not been confirmed against Leasétic's published privacy policy (per `.planning/v1.3-CARRYFORWARD.md:12`, Phase 10 cutover follow-up).
- **Files:** `.planning/v1.3-CARRYFORWARD.md:12`, fallback URL hardcoded in `src/components/LoginForm.tsx:238-239`
- **Impact:** GDPR exposure. Real partner data cannot be collected until confirmed by Thomas Heufke.
- **Fix approach:** Out-of-band review with Thomas; once confirmed, set `NEXT_PUBLIC_PRIVACY_URL_FR` / `_EN` in Vercel prod env (current fallback `https://leasetic.fr/mentions-legales` is hardcoded).

### [HIGH · security] Better Auth CSRF defense relies on cookie attributes only

- **Issue:** `trustedOrigins` in `src/lib/auth/index.ts:173` does NOT hard-block based on Origin header alone. Production probe confirmed this in Phase 6 follow-up. CSRF protection currently relies on SameSite=Lax + `__Secure-` cookie flags.
- **Files:** `src/lib/auth/index.ts:173`, custom auth client `src/lib/auth/client.ts:7` (which explicitly bypasses CSRF on a custom POST path)
- **Impact:** Cross-site mutation on `/api/auth/sign-in/*` may be possible from a malicious site if the user is signed in and a browser sends cookies on top-level POST. Not exploitable today (SameSite=Lax catches it for the common nav cases) but not defense-in-depth.
- **Fix approach:** Add a middleware-level Origin check on `/api/auth/sign-in/*` mutations or wait for Better Auth upstream fix (see issue tracker per `.planning/v1.3-CARRYFORWARD.md:21`).

### [MEDIUM · security] No rate limiting on auth or mutation endpoints

- **Issue:** No rate-limit middleware visible anywhere in `app/api/**`. Login, password-reset redemption (`src/lib/auth/redeem.ts`), proposal create (`app/api/proposals/route.ts`), and admin user-create can all be hammered.
- **Files:** `app/api/auth/[...all]/route.ts` (forwards to Better Auth — no rate limit configured), `app/api/proposals/route.ts:13`, `app/api/proposals/finalize/route.ts:52`
- **Impact:** Credential-stuffing, invitation-token brute force, PDF-render DoS (each request burns ~argon2id work-factor on signin + a 19MB-mem-cost hash).
- **Fix approach:** Either configure Better Auth's built-in rate limit plugin, or add Upstash/Redis token-bucket middleware in `proxy.ts`. Argon2id parameters in `src/lib/auth/index.ts:97-100` already make brute-force costly but don't prevent service-level DoS.

### [MEDIUM · security] No security headers (CSP, HSTS, X-Frame-Options) configured

- **Issue:** `next.config.ts` has no `headers()` block. Only `Cache-Control` is set per-route. There is no global CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy.
- **Files:** `next.config.ts:1-22` (no headers configured)
- **Impact:** Missing defense-in-depth against XSS, clickjacking, mixed-content downgrades. The hidden admin tree is especially exposed — a CSP `frame-ancestors 'none'` would defeat URL-segment-leak-via-iframe attacks.
- **Fix approach:** Add a `headers()` block in `next.config.ts` with a baseline CSP (Plus Jakarta is self-hosted so script-src can stay tight) + HSTS preload + X-Frame-Options DENY for admin paths.

### [MEDIUM · maintainability] Drizzle journal/migration tooling has a known ship-gap

- **Issue:** Phase 12 (2026-05-12) shipped `drizzle/0004_phase12_drafts_and_history.sql` without an entry in `drizzle/meta/_journal.json` — production DB went un-applied for ~24h until Phase 13's wizard hit the missing column. Tracked in `.planning/v1.3-CARRYFORWARD.md:20`.
- **Files:** `drizzle/meta/_journal.json`, `scripts/migrate.ts`, `.github/workflows/db-migrate.yml`
- **Impact:** Same class of bug as v1.1's Drizzle correlated-subquery footgun (per RETROSPECTIVE.md §What Was Inefficient). CI doesn't catch SQL-execution bugs because it runs against a placeholder DATABASE_URL (`.github/workflows/ci.yml:65`).
- **Fix approach:** Add a post-deploy DB-smoke step against a Neon ephemeral branch on any PR touching `drizzle/*.sql`. Already on the v1.3 carry-forward list.

### [MEDIUM · correctness] Drizzle migrations contain destructive operations without down-migrations

- **Issue:** `drizzle-kit` only generates forward SQL. Several migrations have hard-to-reverse operations:
  - `drizzle/0004_phase12_drafts_and_history.sql:8-12` drops NOT NULL constraints on 4 columns. Reversing requires backfilling NULLs.
  - `drizzle/0004_phase12_drafts_and_history.sql:18` UPDATE proposals SET status='deleted' — no reverse.
  - `drizzle/0004_phase12_drafts_and_history.sql:33-37` creates an APPEND-ONLY trigger function `coefficient_history_no_modify` that explicitly raises on UPDATE/DELETE — manual `DROP TRIGGER` required to undo.
- **Files:** All 5 files in `drizzle/*.sql`
- **Impact:** No rollback path if a migration breaks production. The append-only triggers are by design (immutability invariant) but should be documented in a runbook.
- **Fix approach:** Add `docs/operations/migration-rollback.md` documenting manual reverse-SQL for each migration. Consider switching to a tool that generates down-migrations (atlas, sqitch) if the rollback gap bites.

### [MEDIUM · maintainability] `.git.corrupted-backup/` directory shipped in repo (3.9 MB)

- **Issue:** `.git.corrupted-backup/` is a 3.9 MB backup of a corrupted `.git` directory from before 2026-04-28. It is `.gitignore`d (line 2) so it doesn't ship in commits, but it lives in the working tree forever.
- **Files:** `/Users/antoinerousseau/Developer/leasetic-calculator/.git.corrupted-backup/` (3.9 MB, mode `drwx------`)
- **Impact:** Confusing to new contributors. Eats disk on every clone of a clean checkout if someone copies the workdir. If the corruption recovery is unverified, this is also a forensic dependency on a single developer's local machine.
- **Fix approach:** Once 100% confident the live `.git` has all needed history (any preserved branches/tags merged into main), delete `.git.corrupted-backup/`. Document the recovery in a one-line incident note if not already in the planning archive.

### [MEDIUM · maintainability] Two large files concentrate risk

- **Issue:** Two source files dominate the LOC distribution:
  - `src/lib/i18n/dictionaries.ts` (1357 lines, 263 keys × 2 langs). Top churn file in 30-day window with 21 commits.
  - `src/components/proposal/ProposalForm.tsx` (582 lines). 4 commits in 30-day window.
  - `src/lib/db/queries/proposals.ts` (568 lines). 4 commits.
- **Files:** `src/lib/i18n/dictionaries.ts:1`, `src/components/proposal/ProposalForm.tsx:1`, `src/lib/db/queries/proposals.ts:1`, `app/(admin)/[adminSegment]/partners/AccountsList.tsx:1` (520 lines)
- **Impact:** Merge conflicts on the dictionaries file every time strings change. The proposal form is the main partner-facing surface — any regression here is user-visible.
- **Fix approach:** Split `dictionaries.ts` by namespace (auth / admin / wizard / shell / public) into co-located dict files; the `t()` consumer can fan-in. `ProposalForm.tsx` could extract `<ParametresFormCard>`-style sub-sections (Phase 13 already started this pattern at `app/(authed)/proposals/new/parametres/ParametresFormCard.tsx`).

### [MEDIUM · maintainability] `AccountsList` naming drift in partner directory

- **Issue:** Phase 14 renamed the directory `accounts/` → `partners/` but kept the component filename `AccountsList.tsx`. The export and the page that consumes it still say "AccountsList".
- **Files:** `app/(admin)/[adminSegment]/partners/AccountsList.tsx:37,57,63`, `app/(admin)/[adminSegment]/partners/page.tsx:6,60`
- **Impact:** Confusing — partner terminology is the documented direction (`.planning/v1.3-CARRYFORWARD.md:33` lists this as deferred). Future contributors must learn that the file is misnamed.
- **Fix approach:** Rename file + export to `PartnersList`. Mechanical refactor; one PR.

### [MEDIUM · maintainability] CreatePartnerModal kept as "shelf code"

- **Issue:** `app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx` (302 lines) is explicitly preserved as shelf code (`AccountsList.tsx:29,292,507` comments). The CTA was rewired to a Link in Phase 14; the modal is imported but never rendered.
- **Files:** `app/(admin)/[adminSegment]/partners/CreatePartnerModal.tsx`, `app/(admin)/[adminSegment]/partners/AccountsList.tsx:33-34` (import line with `eslint-disable-next-line @typescript-eslint/no-unused-vars`)
- **Impact:** 302 lines of dead code that lint had to be silenced for. `src/lib/admin/actions.ts:260` still carries a backward-compat branch for "legacy 3-field call site (CreatePartnerModal, D-10 shelf code)" that no live caller exercises.
- **Fix approach:** Delete `CreatePartnerModal.tsx` + drop the legacy branch in `src/lib/admin/actions.ts` + remove the lint suppression. Per `.planning/v1.3-CARRYFORWARD.md:55` this is "indefinite defer" — but if it stays, mark with a clear `@deprecated` JSDoc to stop future readers from thinking it's live.

### [LOW · maintainability] `/accounts` → `/partners` 308 redirect on indefinite hold

- **Issue:** `next.config.ts:11-19` 308-redirects `/:adminSegment/accounts/:path*` → `/:adminSegment/partners/:path*` for "warm-cache time" per `.planning/v1.3-CARRYFORWARD.md:62`.
- **Files:** `next.config.ts:11-19`
- **Impact:** Lives forever until someone makes the call. Low cost (one regex match per request matching `/:segment/accounts`), but represents a v1.2→v1.3+ debt that should sunset at v1.4 per the carry-forward note.
- **Fix approach:** Calendar a v1.4 cleanup ticket to drop the redirect block.

### [LOW · maintainability] `Math.random()` for healthz blob key + LC reference

- **Issue:**
  - `src/lib/health.ts:69` uses `Math.random()` to generate a probe blob key for the healthz round-trip. Collision unlikely but not crypto-safe.
  - `src/lib/calc/formula.ts:93-94` uses `Math.random()` for the LC reference (`LC-XXXXX`). Documented as collision-tolerant by construction at `formula.ts:88-92`; the row's UUID PK is the canonical identity. Per-partner uniqueness is enforced by `proposals_user_id_lc_ref_uq` index (`drizzle/0002_phase8_persistence.sql`).
- **Files:** `src/lib/health.ts:69`, `src/lib/calc/formula.ts:93-94`
- **Impact:** Correct, documented, and bounded — keeping as LOW for completeness. Don't tighten unless a partner reports a "LC-XXXXX collision" friction.
- **Fix approach:** None needed today. If revisited, replace with `crypto.randomBytes(...).toString('base64url').slice(0, N)` for both.

### [LOW · maintainability] 14 ESLint/TS suppressions across the codebase

- **Issue:** 14 ESLint-disable / @ts-expect-error / @ts-ignore directives in non-test code. None are abusive but each is a latent fragility point.
- **Files:**
  - `src/lib/db/queries/proposals.ts:90,462` and `src/lib/db/queries/coefficient-history.ts:79,81` — `as any` casts for Drizzle `jsonb` `$type` (architecturally necessary; documented)
  - `src/lib/storage/s3.ts:87` — `@ts-expect-error` on `Body[Symbol.asyncIterator]` (AWS SDK type bug; documented)
  - `app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx:66`, `src/components/LoginForm.tsx:46`, `src/components/proposals/SearchBar.tsx:31` — `react-hooks/exhaustive-deps` exemptions (mount-only effect pattern)
  - `app/dev/components/page.tsx:59`, `src/components/ui/RetractableSidebar.tsx:224`, `src/components/ui/BrandLogo.tsx:36,44` — `@next/next/no-img-element` (intentional CSS-picker theme switch)
  - `app/(admin)/[adminSegment]/partners/AccountsList.tsx:33`, `src/lib/i18n/dictionaries.ts:1356` — unused-vars (shelf code + reserved key)
- **Impact:** All justified inline. The aggregate is small and audit-able.
- **Fix approach:** Periodic sweep to verify each suppression's comment is still true. As Drizzle's jsonb story improves, the `as any` casts may become unnecessary.

---

## Known Bugs

### [LOW · correctness] Re-issue invitation requires temporary disable workaround

- **Issue:** `adminReissueInvitation` in `src/lib/admin/actions.ts:357-446` works around Phase 6's `createInvitation` which throws "already active" for users with `deletedAt IS NULL`. The workaround temporarily sets `deletedAt` to `now()` so the re-enable path triggers, then either lets it stand (re-invite continues) or rolls back if `createInvitation` throws.
- **Files:** `src/lib/admin/actions.ts:339-446` (esp. the limitation comment at lines 345-355)
- **Symptoms:** No user-visible bug today — the audit trail captures both the temporary disable and the restore. If the operator opens a re-issue UI while another request is concurrently sliding the same user's `deletedAt`, the race is undefined.
- **Workaround:** Documented in-code. Future work flagged in the file: "A cleaner Phase 6 primitive (e.g., `reissueInvitation`) is a Plan 03 follow-up task."
- **Fix approach:** Add a first-class `reissueInvitation(userId)` primitive in `src/lib/auth/actions.ts` that does the re-invitation atomically (no temporary `deletedAt` flip).

---

## Security Considerations

### [MEDIUM · security] `INITIAL_PASSWORD` env var must never end up in shell history or logs

- **Risk:** `scripts/seed-admins-launch.ts:59` reads `process.env.INITIAL_PASSWORD`. If an operator runs `INITIAL_PASSWORD=… npx tsx scripts/seed-admins-launch.ts`, the password lives in their shell history.
- **Files:** `scripts/seed-admins-launch.ts:59`
- **Current mitigation:** The script masks the DATABASE_URL in logs (`maskUrl()` at line 68) and never logs the password. The typed `CONFIRM=SEED-LAUNCH-ADMINS` gate (line 79) prevents accidental invocation.
- **Recommendations:** Document an `.envrc` / `read -s` pattern in the script header — operators should pipe the password through stdin or a temp file, not the command line.

### [LOW · security] Hardcoded fallback privacy URLs in client bundle

- **Risk:** `src/components/LoginForm.tsx:238-239` falls back to literal `https://leasetic.fr/mentions-legales` / `/privacy-policy` if the env vars are unset. If those URLs ever 404 or move, the public login page links break silently.
- **Files:** `src/components/LoginForm.tsx:238-239`
- **Current mitigation:** Documented in `.env.example:76-81` that the env vars should be set in production.
- **Recommendations:** Confirm Vercel production env has `NEXT_PUBLIC_PRIVACY_URL_FR/_EN` populated (independent gate before partner onboarding). Add to the `/healthz` env-presence check (open in `.planning/v1.3-CARRYFORWARD.md` per RETROSPECTIVE.md Key Lesson 2).

### [LOW · security] No SQL injection vectors detected, but `ilike` search uses unescaped user input

- **Risk:** `src/lib/db/queries/proposals.ts` (search functions) accept a `q` parameter and pass it through Drizzle's parameterized `ilike`. Drizzle escapes the SQL parameter, so injection is not exploitable, but the % wildcard semantics are exposed to the user.
- **Files:** `src/lib/db/queries/proposals.ts:36-38` (SearchProposalsArgs), `app/api/proposals/route.ts:80` (q param flows in)
- **Current mitigation:** Parameterized query via Drizzle. Length-limit on incoming `q` is not visible in the route handler — only `limit` is bounded (`route.ts:84`).
- **Recommendations:** Add `q.slice(0, 200)` length cap at the route handler. Optional: strip `%` and `_` from `q` before wrapping (currently any partner can search for `%` and match all their rows — informational disclosure only).

### [LOW · security] Hidden admin tree relies on env var + 404 obscurity

- **Risk:** `app/(admin)/[adminSegment]/layout.tsx:41-43` returns `notFound()` when `params.adminSegment !== process.env.ADMIN_URL_SEGMENT`. This is by design (D-18 obscurity gate, Layer 1) layered on top of the `requireAdmin()` role check (Layer 2). A leak of the segment to a partner would not grant access (Layer 2 catches it) but would expose that an admin tree exists.
- **Files:** `app/(admin)/[adminSegment]/layout.tsx:41-43`, `app/(admin)/[adminSegment]/layout.tsx:48` (Layer 2 comment), proxy at `proxy.ts`
- **Current mitigation:** Two-layer design documented in `layout.tsx:17-29`. The segment is never logged (`scripts/seed-admins-launch.ts:68-75` MASK pattern is replicated).
- **Recommendations:** Rotate `ADMIN_URL_SEGMENT` periodically (quarterly?) and notify both admins out-of-band. Today there's no rotation reminder.

---

## Performance Bottlenecks

### [LOW · perf] Argon2id work factors are high per request

- **Issue:** `src/lib/auth/index.ts:96-100` uses argon2id with `memoryCost: 19456 KB`, `timeCost: 2`, `parallelism: 1` per login + per redemption. Per RESEARCH.md §9 P10, this is tuned for Vercel cold-start; on warm starts each hash burn is ~50-100ms + 19MB heap.
- **Files:** `src/lib/auth/index.ts:96-100` (both hash + verify use the same factors)
- **Cause:** Intentional — protects against credential stuffing. With no rate limit (see HIGH §3 above), an attacker can still amplify this into a memory-DoS.
- **Improvement path:** Add a rate limit FIRST, then consider if work factors can be lowered (would require security review).

### [LOW · perf] Drizzle `findFirst` followed by `update` in `adminReissueInvitation`

- **Issue:** `src/lib/admin/actions.ts:366-403` runs N+1 queries (findFirst → conditional update → createInvitation → conditional update → conditional audit_log writes). Re-issuing one invitation is up to 5 round-trips against Neon.
- **Files:** `src/lib/admin/actions.ts:357-446`
- **Cause:** Workaround around Phase 6's "already active" throw — must check state before deciding to flip `deletedAt`.
- **Improvement path:** Bundled inside the LOW correctness bug above (add `reissueInvitation()` primitive). Replacing the workaround simplifies + reduces round-trips.

---

## Fragile Areas

### [MEDIUM · maintainability] Drizzle template-literal SQL (correlated subqueries)

- **Files:** Anywhere `sql\`…${schema.table.column}…\`` template literals are used. Notable example pattern flagged in RETROSPECTIVE.md §What Was Inefficient — Phase 6 had `${schema.users.id}` interpolating unqualified `"id"` which Postgres bound to a sibling table column.
- **Why fragile:** Typecheck does not catch it (template-literal type erasure), unit tests use fixtures (no real Drizzle SQL), lint has no static signal, build doesn't execute against Postgres.
- **Safe modification:** When writing template-literal SQL with column refs, always test against a real Postgres (Neon ephemeral branch). Prefer Drizzle's typed query builder (`db.select().from().where(eq(...))`) over raw `sql\`\`` when possible.
- **Test coverage:** No DB-smoke step in CI. v1.3 carry-forward.

### [MEDIUM · maintainability] Drizzle `as any` jsonb casts at INSERT/UPDATE sites

- **Files:** `src/lib/db/queries/proposals.ts:90-91`, `src/lib/db/queries/proposals.ts:462-463`, `src/lib/db/queries/coefficient-history.ts:79-82`
- **Why fragile:** Drizzle's jsonb `$type<T>()` annotation forces the caller to cast to `any` at the insert site. If the caller's TS type drifts from the `$type` declaration in `src/db/schema.ts`, the runtime SQL still succeeds but `params_snapshot` / `coefficients` shape becomes inconsistent. Detected only at read time.
- **Safe modification:** Always update both `src/db/schema.ts` `$type<...>` AND the caller types together. Add a Zod schema for `params_snapshot` shape and assert-parse at the write boundary if shape drift is observed.
- **Test coverage:** Reasonable — `src/lib/db/queries/proposals.test.ts` (408 lines) covers happy path; deep shape assertions on `params_snapshot` would harden against drift.

### [LOW · correctness] `last_login_at` write swallows failures silently

- **Files:** `src/lib/auth/index.ts:47-59`
- **Why fragile:** The session.create.after hook (`updateLastLoginAt`) is best-effort — DB errors log to `console.error` and the function returns. If a DB outage persists, `last_login_at` stays NULL for the affected logins, which corrupts the DB-02 "invited but not yet logged in" derivation used by the partners list.
- **Safe modification:** Adding a fallback `last_login_at` write (e.g., on the next authenticated request) would close the gap. Today, only a brand-new login writes it.
- **Test coverage:** Unit-test exists for the helper (`src/lib/auth/index.ts` exports `updateLastLoginAt` "for unit testing").

### [LOW · maintainability] `Topbar.tsx` + `Shell.tsx` + `RetractableSidebar.tsx` know admin URL via props

- **Files:** `src/components/ui/Shell.tsx:13-16`, `src/components/ui/RetractableSidebar.tsx:17-21`
- **Why fragile:** Client components cannot read `process.env.ADMIN_URL_SEGMENT` (it's not `NEXT_PUBLIC_`). The admin layout passes the segment as a prop. Forgetting to pass it on a new admin sub-page would render broken sidebar links. Sidebar `adminHrefs` is hardcoded at `RetractableSidebar.tsx:224`-ish (per `.planning/v1.3-CARRYFORWARD.md:61`).
- **Safe modification:** Any new admin nav item requires editing `RetractableSidebar.tsx` AND wiring it into the prop chain from the layout. v1.3 carry-forward includes "refactor to config-driven sidebar" if admin nav grows beyond 4 items.
- **Test coverage:** `src/components/ui/RetractableSidebar.test.tsx` exists; unclear if it covers the missing-prop case.

---

## Scaling Limits

### [LOW · perf] Cursor pagination but no full-text search index

- **Resource:** Proposals list (`src/lib/db/queries/proposals.ts:155-187`, `app/api/proposals/route.ts:70-94`).
- **Current capacity:** `(user_id, created_at desc, id desc)` composite index per `drizzle/0002_phase8_persistence.sql`. Search is `ilike '%q%'` — sequential scan over the user's partition.
- **Limit:** A single partner with 10k+ rows would feel `ilike` cost (linear in their row count). Today no partner has even 100 rows.
- **Scaling path:** Add `pg_trgm` GIN index on (user_id, lower(lc_ref || ' ' || ...searchable text)) when a partner crosses ~1k rows. Not blocking.

### [LOW · perf] PDF render is synchronous on the request thread

- **Resource:** PDF render via `@react-pdf/renderer` in `src/lib/api/proposals/submit.ts:146-154` and `src/lib/api/proposals/finalize-wizard.ts`.
- **Current capacity:** One PDF render per request, holding the Node runtime + memory until upload completes. Empirically fast (sub-second) but bounded only by the Vercel function timeout.
- **Limit:** A pathological input that triggers font fallback or a giant table could exceed the timeout. There is no defensive timeout in `renderProposalPdf`.
- **Scaling path:** Move PDF render to a background queue (e.g., Vercel Queue, Upstash QStash) with a `proposal.status='generating'` row state. Today's volume doesn't justify this; documented for the v1.4+ horizon.

---

## Dependencies at Risk

### [LOW · maintainability] `react@19.0.0` + `next@16.2.4` on first-release dot-zero

- **Risk:** `package.json` pins React 19.0.0 + Next 16.2.4. These are recent major releases with first-iteration ecosystem fit.
- **Files:** `package.json:42-45`
- **Impact:** Plugin/library compat surprises (e.g., RHF + zodResolver was sensitive to the React 19 ref handoff during Phase 13).
- **Migration plan:** Track Next.js release notes; upgrade to next minor when tooling (RHF, sonner, lucide-react) all confirm support.

### [LOW · maintainability] Better Auth `1.6.9` — single-vendor auth dependency

- **Risk:** Better Auth is the only authentication path. If the project is abandoned or breaks compat in 2.x, migration would be invasive (DB schema for sessions/accounts/verifications is shaped by Better Auth's `usePlural: true` adapter, see `src/lib/auth/index.ts:80`).
- **Files:** `src/lib/auth/index.ts:24-194`, `src/db/schema.ts` (users, sessions, accounts, verifications tables)
- **Impact:** Lock-in. Today's argument is "OVH-portable adapter discipline mechanically enforced" but the auth provider is not behind an adapter.
- **Migration plan:** None today. Document the auth boundary clearly in `ARCHITECTURE.md` so a future migration knows exactly which DB rows and route handlers must be reconstructed.

---

## Missing Critical Features

### [HIGH · maintainability] No post-deploy DB-smoke step in CI

- **Problem:** CI (`.github/workflows/ci.yml`) runs typecheck + lint + grep gates + vitest + production build against a placeholder DATABASE_URL. It does NOT execute any SQL against a real Postgres.
- **Blocks:** Catching the bug classes documented in RETROSPECTIVE.md §Key Lesson 1 (ORM template emission, env-var contract with runtime, correlated subquery name resolution, JSONB key-order assumptions). Phase 12's missing `_journal.json` entry would have been caught.
- **Fix path:** Add a CI job that boots a Neon ephemeral branch, runs `npm run db:migrate`, and exercises a smoke list of critical queries (auth, list proposals, finalize draft).

### [MEDIUM · perf] No production observability (Sentry, APM, log aggregation)

- **Problem:** Production errors surface only via Vercel runtime logs. No alerting, no error rate dashboards, no per-route p95 latency tracking.
- **Blocks:** Quiet bugs (the v1.1 partner-page 500 was caught only because the user happened to click; per RETROSPECTIVE.md the bug ran for 4 days before discovery). The `console.error('[error.tsx]', error)` in `app/error.tsx:82` is operator-only and ephemeral.
- **Fix path:** Sentry (or similar) wired into both `app/error.tsx` and the API route catch-blocks. v1.3 carry-forward Tier 5.

### [MEDIUM · maintainability] No Playwright / E2E tests

- **Problem:** All 876 tests are Vitest unit + integration with mocked DB / Better Auth. No browser-driven flow exercises login → create proposal → download PDF.
- **Blocks:** Cross-cutting regressions — esp. the wizard 3-step flow + the partner home → proposals navigation. Manual smoke is the substitute today.
- **Fix path:** Playwright suite covering the partner happy path + the admin coefficient-update flow. v1.3 carry-forward Tier 5.

### [LOW · maintainability] No generic audit-log viewer

- **Problem:** `audit_log` table captures `proposal.create`, `proposal.delete`, `proposal.restore`, `proposal.purge`, `global_params.update`, `user.create`, `user.disable`, `user.re_enable`, `invitation.create`, `password_reset.create` — but Phase 14 only shipped a coefficient-history viewer (`/[adminSegment]/history`). The broader audit_log has no UI.
- **Blocks:** Forensics on a partner account ("who disabled this account?"). Admins must query the DB directly.
- **Fix path:** A `/[adminSegment]/audit-log` route with filter-by-actor + filter-by-target. v1.3 carry-forward Tier 5.

---

## Test Coverage Gaps

### [MEDIUM · correctness] DB-level migrations are not tested

- **What's not tested:** SQL migrations in `drizzle/*.sql` do not have an "apply against fresh Postgres" CI gate.
- **Files:** `drizzle/0000_striped_metal_master.sql`, `drizzle/0001_kind_doctor_faustus.sql`, `drizzle/0002_phase8_persistence.sql`, `drizzle/0003_seed_global_params.sql`, `drizzle/0004_phase12_drafts_and_history.sql`
- **Risk:** Phase 12 already shipped a migration without a journal entry — production was un-applied for 24h. Triggers (`coefficient_history_no_modify`) and CHECK constraints (`proposals_finalized_completeness_check`) only matter at execution time.
- **Priority:** High — already on v1.3 Tier 2 carry-forward.

### [MEDIUM · correctness] `proxy.ts` cookie auth boundary has thin coverage

- **What's not tested:** No test files visible for `proxy.ts`. The matcher, public-path whitelist, and redirect behavior are not unit-tested.
- **Files:** `proxy.ts` (top-level), `isPublicPath` referenced but not visible in the file head
- **Risk:** A regression in the matcher (e.g., accidentally protecting `/healthz` or unprotecting an authed route) would not be caught.
- **Priority:** Medium.

### [LOW · correctness] PDF byte-determinism gate covers only happy path

- **What's not tested:** The PDF SHA-256 fixture (`__pdf-fixtures__/expected.sha256.txt`) verifies byte-equality across renders but only for the canonical fixture inputs.
- **Files:** `__pdf-fixtures__/fixtures.ts`, `__pdf-fixtures__/render-fixtures.test.ts`, `__pdf-fixtures__/expected.sha256.txt`
- **Risk:** A subtle change in `@react-pdf/renderer` font subsetting that affects only multi-page renders would slip through.
- **Priority:** Low.

### [LOW · maintainability] No test for `proxy.ts` public path whitelist edge cases

- **What's not tested:** What if a partner crafts `/login?next=https://attacker.com/`? The `next` param is `decodeURIComponent`'d in the login page but the redirect target should be same-origin.
- **Files:** `proxy.ts:39-42` (encodes `next`), `app/(public)/login/page.tsx` (consumer not deeply audited here)
- **Risk:** Open-redirect on post-login if same-origin check is missing.
- **Priority:** Low (worth confirming once).

---

*Concerns audit: 2026-05-24*
