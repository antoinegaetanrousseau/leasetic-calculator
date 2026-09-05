# Phase 10: Cutover & Polish — Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Inherits from:** Phase 9 CONTEXT (admin surface), Phase 8 CONTEXT (persistence + PDF), Phase 6 CONTEXT (auth + shell), Phase 5 architecture (OVH-portable adapter discipline), milestone v1.1

<domain>
## Phase Boundary

The cutover and operational-readiness phase. **Phase 10 produces no new partner-facing features.** It produces the operational artifacts that turn the demo-ready Vercel deployment into a launch-ready, OVH-portable, legally-cleared surface for v1.1's first real partners. Specifically: a comprehensive OVH deployment runbook, a scripted full-lifecycle smoke-test for portability proof, a scheduled cron for the soft-delete purge, a pre-launch test-data scrub, a first-login coefficient-verification banner for the admin, and the privacy/legal hookups that gate launch. The phase explicitly **defers OVH provisioning and the actual smoke-deploy execution to September 2026 (post-v1.1-launch)** — Phase 10 ships the *capability*, September runs the *proof*.

**In scope (9 requirements: CUT-01..09):**

- **OVH portability runbook + smoke script (D-10-01..04):**
  - `docs/operations/deploy-ovh.md` — comprehensive runbook covering env vars, build steps, migration application (mirrors `docs/operations/migrations.md` pattern), blob bucket provisioning, smoke verification, rollback. Written for *Antoine* as the operator (D-10-21 — Antoine owns cutover comms; runbook can assume Antoine-context).
  - `scripts/smoke-ovh.ts` — full-lifecycle scripted smoke: log in (admin-seeded credential via env), create a proposal (form-equivalent server-action call → calc → row INSERT → PDF render → blob upload), download the PDF (assert SHA-256 matches a committed expected hash for the fixture inputs), soft-delete + restore, exit non-zero on any step failure. Same lifecycle ROADMAP success criterion #2 reads as "smoke run creates a proposal, generates a PDF, and the SHA-256 matches the Vercel-rendered fixture."
  - The script is also runnable against the current Vercel deployment as a sanity check (D-10-03) — a dry-run against APP_URL today proves the script itself isn't a dead artifact when September comes.
  - Open Q5 (OVH provider — Managed PG vs Scaleway vs self-host) **stays open** in CONTEXT. Runbook describes the generic shape (managed Postgres + S3-compatible blob); specific provisioning commands are TBD before September. Documented as a v1.2 follow-up.

- **Soft-delete purge cron (D-10-05..08):**
  - Vercel Cron entry in `vercel.json` triggers a new admin-only HTTP route at `/api/internal/purge-soft-deleted` (Phase 10 creates this route). The route handler invokes the existing `scripts/purge-soft-deleted.ts` logic via a shared pure function (refactor: extract the loop into `src/lib/admin/purge.ts` so the CLI script and the HTTP handler call the same code — single source of truth).
  - **Cadence:** twice-monthly (1st and 15th of each month, 03:00 UTC) — picked over daily/weekly to minimize ops surface. Worst-case post-soft-delete persistence: ~46 days (deleted just after a cron run, satisfies `≥30 days` predicate at next-after-30-days run). DATA-10's "after 30 days, hard-purged" reads as a *minimum*, so twice-monthly is compliant.
  - **Failure semantics:** best-effort + log. Per-row failures continue to next row (existing CLI behavior); cron success/failure visible in Vercel dashboard logs. No alerting in v1.1 — Sentry/email/Slack alerting is a CUT-07-deferred item.
  - **OVH swap-out path documented in deploy-ovh.md:** when September provisions OVH, the Vercel cron is replaced with an OVH-side scheduler (cron job, systemd timer, or OVH Cloud Scheduler) hitting the same `/api/internal/purge-soft-deleted` route. App code stays unchanged.
  - **Internal route security:** `/api/internal/purge-soft-deleted` requires either an admin session OR a shared-secret header (`Authorization: Bearer ${PURGE_CRON_SECRET}`) for unattended cron invocation. Cron config in `vercel.json` injects the secret via Vercel env. Defense-in-depth: even if the secret leaks, the route only invokes the purge logic — no destructive admin actions exposed.

- **Test data discriminator + pre-launch purge (D-10-09..12):**
  - **Email-pattern discrimination — no schema change.** Test partners are created with emails matching a specific pattern: `*@test.leasetic.com` (decision: this domain — easy to recognize, no risk of colliding with real Leasétic emails). `scripts/seed-partner-launch.ts` validates the email matches the pattern and refuses to seed otherwise (small amendment to the existing script).
  - **Pre-launch purge:** new `scripts/purge-test-data.ts` (modeled on existing purge scripts: typed-confirmation gate, dry-run by default, --confirm flag for apply). Predicate: `users.email LIKE '%@test.leasetic.com'`; cascade-deletes their `proposals`, `password_resets`, `sessions`, `accounts` rows; writes audit log entries (`actorId: null`, `action: 'user.purge'` — new audit action). package.json script: `npm run purge:test-data`.
  - **CUT-04 reads**: "All test partner accounts deleted from production DB before launch (rows with `is_test=true` are purged in a pre-launch checklist step)." We're satisfying the *intent* (test rows purged) without the literal `is_test=true` mechanism, since email-pattern discrimination leaves no schema artifact post-launch. **REQUIREMENTS.md text should be updated** to reflect the email-pattern decision (or kept literal with a note that the discriminator is realized via email-pattern instead of column). Planner discretion which.

- **Coefficient verification banner (D-10-13..14):**
  - Yellow banner on `/[adminSegment]/coefficients` (top of the page, above the editor card). Visible when the latest `global_params` row's coefficients are byte-equal to `seedParams` from `src/lib/calc/seed-params.ts` (i.e., admin hasn't yet customized — still on the placeholder D-D1 values). Banner text: *"Les coefficients sont actuellement les valeurs par défaut. Vérifiez et confirmez avant d'inviter des partenaires."* / *"Coefficients are currently default values. Verify and confirm before inviting partners."*
  - Banner disappears once admin saves any edit (which creates a new `global_params` row with `effective_from > seed row's effective_from` and content potentially different from `seedParams`). Logic: server-component computes `params.coefficients === seedParams.coefficients` (deep equal on the jsonb shape) and passes `isStillSeed: boolean` as a prop to the page client.
  - **Closes the long-standing `seed-params.ts` TODO comment** (`// TODO: confirm against v10 baseline before CUT-06`). The verification mechanism *is* the banner; once admin confirms (saves a non-seed row), the TODO is resolved by data, not code edit.
  - **No new diff tool needed** — the existing Phase 9 `<HistoryDiff>` and `<SaveConfirmModal>` already render diffs. The banner just makes "you're still on placeholder values" *visible* until admin acts.

- **v10 retirement + redirect (D-10-15..16):**
  - **CUT-02 collapses vacuously.** Per PROJECT.md, v10 was a "prepared but undistributed prototype" — partners receive it as an emailed HTML file, not at a hosted URL. There is no v10 hosted URL to redirect from. Phase 10 satisfies CUT-02 by adding a one-line note to `docs/operations/deploy-ovh.md` and `CHANGELOG.md` (or PROJECT.md) explicitly stating "v10 was never hosted; CUT-02 vacuous."
  - **CUT-01 (v10 retirement)** is satisfied by communicating to partners (Antoine's responsibility per D-10-21) that v1.1 has launched and the v10 file should not be used going forward. The technical retirement is just stop-distributing-the-file.
  - **CUT-03 (no localStorage migration)** is already implicit in Phase 6's clean-slate partner onboarding flow — the v1.1 login page doesn't read v10's `lt_*` localStorage keys at all. Confirm via a one-line grep gate in CI: `grep -r "lt_pw\|lt_coeffs\|lt_commission\|lt_max\|lt_partner" app/ src/` must return zero. Adds a small CI script if not already present.

- **Privacy + legal hookup (D-10-17..18):**
  - **CUT-05** satisfied by linking the existing Leasétic privacy policy on the login page (FR + EN URLs). Antoine asks Thomas to confirm the existing policy covers (a) v1.1 hosting partner data on Vercel/Neon EU regions and (b) 10-year PDF retention as a new processing activity. Confirmation captured in a new `docs/legal/privacy-coverage-confirmation.md` (signed-off by Thomas; date-stamped) — defensive paper trail.
  - **Open Q3 (legal counsel sign-off on 10-year retention) escalation:** If Thomas's response is "needs legal counsel review," that becomes a v1.2 launch blocker; Phase 10 launch path adjusts to either delay launch or proceed with documented "legal review pending" stance (Antoine's call at the time).
  - Privacy URLs to be supplied by Thomas. Configured via env vars `NEXT_PUBLIC_PRIVACY_URL_FR` and `NEXT_PUBLIC_PRIVACY_URL_EN` so they can be updated without code changes.

- **Launch checklist + cutover comms (D-10-19..21):**
  - **Antoine (you) owns partner comms.** Direct involvement, not delegated to Thomas. The deploy-ovh.md runbook is written assuming Antoine-context (technical voice, not generic operator). Antoine drafts the partner email (technical content: invitation URL flow, password setup steps, "Leasétic Matrice has moved to a hosted version" framing). Thomas reviewed for tone/relationship sensitivity if needed.
  - **Phased pilot rollout.** Launch with 2-3 trusted partners first (Thomas's most engaged + responsive contacts). 1-2 weeks of pilot observation. Then onboard the rest in a single batch. v10 stays accessible (file already in their possession) during pilot — partners on v1.1 are explicit early adopters. Post-pilot, Antoine sends the batch-onboard email to the rest.
  - **Pre-launch checklist landed in `docs/operations/launch-checklist.md`:** ordered list of pre-launch operator actions: (1) apply migrations 0002+0003 to prod (already pending — see Phase 9 follow-up), (2) verify `/healthz` green, (3) admin login + Vérifier les coefficients banner check + customize, (4) seed pilot partners via existing invitation flow, (5) confirm Thomas privacy-coverage signoff, (6) send pilot partner comms, (7) post-pilot batch-onboard.
  - **Post-launch test-data purge** (D-10-12) appears as a launch-checklist item: run `npm run purge:test-data` post-pilot, before the batch-onboard step.

**Out of scope for this phase (deferred to v1.2 / September):**

- **Actual OVH provisioning + smoke-deploy execution** — September 2026; Phase 10 ships the capability (runbook + script), September runs the proof. v1.2 follow-up.
- **Sentry / APM observability beyond Vercel logs** — explicit CUT-07 defer to v1.2; no application-level observability infra in v1.1.
- **Email/Slack alerting for cron failures** — paired with CUT-07 defer; v1.1 cron failures are visible only in Vercel dashboard logs (Antoine spot-checks weekly during pilot).
- **Legal counsel formal sign-off** if Thomas escalates per Open Q3 — potential v1.2 blocker. Phase 10 launch path adjusts at the time based on Thomas's response.
- **OVH provider lock-in (Open Q5 — Managed PG vs Scaleway vs self-host)** — runbook describes generic shape; specific provider TBD before September.
- **Phase 5 follow-up: Neon branch split** (per-scope DATABASE_URL routing) — separate ops task; can be done before or after Phase 10 launch. Out of Phase 10 plan scope.
- **Phase 6 follow-ups** (admin password rotation, Better Auth trustedOrigins hardening, APP_URL env-var documentation) — separate ops items; out of Phase 10 plan scope.
- **Audit log viewer beyond coefficient history** — explicit v1.2 per Phase 9 deferred list.
- **Mobile-optimized layouts** — v1.2 per PROJECT.md.

</domain>

<decisions>
## Implementation Decisions

### OVH portability runbook + smoke script (D-10-01..04)

- **D-10-01 (Phase 10's CUT-09 deliverable is documentation + scripted capability, NOT execution):** Phase 10 ships `docs/operations/deploy-ovh.md` (runbook) + `scripts/smoke-ovh.ts` (full-lifecycle scripted smoke). The actual OVH provisioning, deployment, and smoke-test run is **deferred to September 2026** (post-v1.1-launch, v1.2 territory). User decision 2026-05-10. Phase 10 can declare CUT-09 complete because it ships the *capability*; the *execution* is a documented v1.2 follow-up.
- **D-10-02 (Smoke scope):** Full proposal lifecycle. Smoke script must: log in via admin-seeded credentials (env-supplied), create a proposal (form-equivalent server-action call exercising calc + row INSERT + PDF render + blob upload), download the PDF and assert SHA-256 matches a committed expected hash for the fixture inputs, soft-delete + restore, exit non-zero on any step failure. ROADMAP success criterion #2: "smoke run creates a proposal, generates a PDF, and the SHA-256 matches the Vercel-rendered fixture."
- **D-10-03 (Script is runnable against current Vercel today):** `scripts/smoke-ovh.ts` is parametrized via `APP_URL` + `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars; can be dry-run against the current Vercel deployment as a sanity check (verifies the script itself works) before September swap-in. The `package.json` script `npm run smoke:ovh` invokes it. Adds resilience: by September the script has been exercised at least once.
- **D-10-04 (Open Q5 stays open; runbook is generic):** Runbook describes the generic shape — "managed Postgres provider supporting standard `postgres://` URL + S3-compatible blob store with `accessKeyId`/`secretAccessKey`/`bucketName` config" — and lists OVH Managed PG, Scaleway, and self-host as candidate providers without committing. Specific commands (e.g., OVH CLI invocations) TBD before September. v1.2 hardening item.

### Soft-delete purge cron (D-10-05..08)

- **D-10-05 (Scheduler — Vercel Cron):** Add a Vercel Cron entry to `vercel.json`. Cron triggers a new HTTP route at `/api/internal/purge-soft-deleted`. Native Vercel mechanism. *Operational* tier — does not violate the no-Vercel-only-primitives rule (which applies to `lib/`, not to `vercel.json` cron config or `app/api/internal/*` ops routes). OVH swap-out path documented in deploy-ovh.md.
- **D-10-06 (Cadence — twice-monthly 1st + 15th, 03:00 UTC):** Cron runs on the 1st and 15th of each month at 03:00 UTC. Vercel cron syntax: `"0 3 1,15 * *"`. Worst-case post-soft-delete persistence: 30 days + 16-day cron gap = ~46 days. DATA-10's "after 30 days" reads as a minimum threshold; twice-monthly is compliant. Less ops noise than daily; tighter than weekly.
- **D-10-07 (Trigger — refactor to shared pure function):** Extract the per-row purge loop from `scripts/purge-soft-deleted.ts` into `src/lib/admin/purge.ts` as a pure function:
  ```
  export async function purgeSoftDeleted(opts?: {
    olderThanDays?: number;  // default 30
    actorId?: string | null;  // default null (system-initiated)
  }): Promise<{ purged: number; errors: Array<{ id: string; error: string }> }>;
  ```
  Both `scripts/purge-soft-deleted.ts` (CLI) and `app/api/internal/purge-soft-deleted/route.ts` (HTTP) call this single function. Single source of truth; both surfaces tested. Existing CLI script becomes a thin wrapper that adds the typed-confirmation gate + dry-run handling.
- **D-10-08 (Failure semantics — best-effort + log):** Per-row failures continue to next row (existing behavior preserved). The pure function returns `{ purged, errors }`; the cron HTTP handler logs the result and returns HTTP 200 if at least one row succeeded, HTTP 500 if all rows failed. Vercel cron sees the status code and logs failures in the dashboard. No alerting in v1.1 (CUT-07 defer).

### Test data discriminator + pre-launch purge (D-10-09..12)

- **D-10-09 (Email-pattern discrimination, no schema change):** Test partners are tagged via email pattern: `<anything>@test.leasetic.com`. The `@test.leasetic.com` domain is reserved for test partners only; production partners use real Leasétic-network domains. No `is_test` column added to schema. CUT-04's literal "is_test=true" wording is satisfied by the equivalent email-pattern predicate. **REQUIREMENTS.md update:** add a note to CUT-04 that the discriminator is realized via email pattern (planner can do this inline or as a separate REQ doc edit).
- **D-10-10 (`scripts/seed-partner-launch.ts` validates pattern):** The script (just committed in this session) is amended to refuse seeding when the email does NOT match `^.+@test\.leasetic\.com$` (regex). Small change: 3-5 line guard at the top of the script. Production partners are seeded via the regular invitation flow (`createInvitation` from Phase 6) which does not call this script.
- **D-10-11 (Pre-launch purge script):** New `scripts/purge-test-data.ts` (modeled on `scripts/purge-soft-deleted.ts`):
  - Typed-confirmation gate (`CONFIRM=PURGE-TEST-DATA` env or `--confirm PURGE-TEST-DATA` flag).
  - Dry-run by default; lists candidate rows (count of test users + their proposals + sessions etc.).
  - Predicate: `users.email LIKE '%@test.leasetic.com'`.
  - Cascade-delete: proposals (and their pdf blobs via `storage().delete()`), password_resets, sessions, accounts. The `users.id` FK references in audit_log get `ON DELETE SET NULL` (Phase 8 schema already does this via `actorId: 'set null'`).
  - Each row write to audit_log: `actorId: null, action: 'user.purge', targetType: 'user', targetId: <id>, payload: { email, reason: 'pre_launch_test_data_cleanup' }`.
  - **New `AuditAction` union member:** `'user.purge'` added to `src/lib/db/queries/audit-log.ts`.
  - package.json script: `npm run purge:test-data`.
- **D-10-12 (Operator runs the purge — pre-launch checklist item):** Antoine runs `CONFIRM=PURGE-TEST-DATA npm run purge:test-data` against production `DATABASE_URL` post-pilot, before the batch-onboard step. Documented in `docs/operations/launch-checklist.md` as a numbered pre-launch action.

### Coefficient verification banner (D-10-13..14)

- **D-10-13 (Banner on `/[adminSegment]/coefficients`):** Yellow banner at the top of the coefficients page, above the editor card. Bilingual (FR primary, EN parallel). Visible when the latest `global_params` row's coefficients are deep-equal to `seedParams.coefficients`. Banner copy:
  - FR: *"Les coefficients sont actuellement les valeurs par défaut. Vérifiez et confirmez avant d'inviter des partenaires."*
  - EN: *"Coefficients are currently default values. Verify and confirm before inviting partners."*
- **D-10-14 (Banner logic + seed-params TODO closure):** Server component `app/(admin)/[adminSegment]/coefficients/page.tsx` (Phase 9 file) computes a new `isStillSeed: boolean` prop:
  ```
  const seedCoefficients = seedParams.coefficients;
  const isStillSeed =
    JSON.stringify(latestParams.coefficients) === JSON.stringify(seedCoefficients);
  ```
  Pass `isStillSeed` to a new `<SeedBanner lang={lang} visible={isStillSeed}/>` client component rendered above the editor card. **Closes the existing TODO** at `src/lib/calc/seed-params.ts` (`// TODO: confirm against v10 baseline before CUT-06`) — the verification mechanism is the banner; the TODO comment can be removed once the banner ships, or replaced with a reference to D-10-14. Banner CSS class: new `.seed-banner` in globals.css (yellow background `var(--gold)` from Phase 4 dark-mode palette, dark text, rounded corners).

### v10 retirement + redirect (D-10-15..16)

- **D-10-15 (CUT-02 vacuous):** v10 was never hosted at a URL — partners received it as an emailed HTML file. No redirect needed. Phase 10 satisfies CUT-02 by adding a single line to either `docs/operations/launch-checklist.md` or `PROJECT.md`: *"CUT-02 — Resolved vacuously: v10 was never deployed at a hosted URL; CUT-02's redirect requirement is moot."* This is a **REQUIREMENTS.md update** opportunity too.
- **D-10-16 (CUT-03 — clean-slate localStorage):** Phase 6's clean-slate partner onboarding flow already satisfies CUT-03 (no v10 localStorage read paths exist in v1.1 code). Phase 10 adds a small CI-grep gate to formalize: `scripts/check-no-v10-localstorage.sh` greps `app/ src/` for any of `lt_pw`, `lt_coeffs`, `lt_commission`, `lt_max`, `lt_partner` and exits non-zero if any are found. Wire into `.github/workflows/ci.yml` after the existing grep gates. Cheap defense against accidental future regressions.

### Privacy + legal hookup (D-10-17..18)

- **D-10-17 (Privacy URLs configured via env vars):** Login page links to existing Leasétic privacy policy URLs supplied by Thomas, set via `NEXT_PUBLIC_PRIVACY_URL_FR` and `NEXT_PUBLIC_PRIVACY_URL_EN` env vars (Vercel + future OVH). Login page reads them via `process.env.NEXT_PUBLIC_PRIVACY_URL_FR ?? '<fallback>'` (fallback: `https://leasetic.fr/mentions-legales` or whatever is canonical). Adds 1 line to `app/(public)/login/LoginForm.tsx` (Phase 6 file) — a `<Link>` at the bottom of the form: `t('login.privacy.label')` → URL.
- **D-10-18 (Legal counsel ask + paper trail):** Antoine asks Thomas via email this week (action item, not Phase 10 code work):
  > *"Thomas — quick legal check before we onboard pilot partners on v1.1: does Leasétic's existing privacy notice cover (a) hosting partner data on Vercel/Neon EU regions and (b) 10-year PDF retention as a new processing activity tied to commercial-document compliance? If yes, please reply confirming. If your read is 'needs counsel review,' flag and we'll route to legal."*
  Thomas's reply gets archived in `docs/legal/privacy-coverage-confirmation.md` (date-stamped, signed-off by Thomas). If Thomas escalates → legal counsel review becomes a launch blocker; Phase 10 launch shifts to either "delay" or "launch with documented review-pending stance" — Antoine's call at the time. Open Q3 stays open in CONTEXT until Thomas's reply.

### Launch checklist + cutover comms (D-10-19..21)

- **D-10-19 (Launch checklist runbook):** New `docs/operations/launch-checklist.md` — ordered pre-launch operator actions:
  1. Apply migrations 0002 + 0003 to prod via `gh workflow run db-migrate.yml --field confirm="MIGRATE PROD"` (Phase 9 follow-up, see prod-migration-pending issue).
  2. Verify production `/healthz` returns `{db: ok, blob: ok}`.
  3. Admin login at `/${ADMIN_URL_SEGMENT}` → "Vérifier les coefficients" banner visible → admin customizes coefficients → banner disappears → first non-seed `global_params` row inserted.
  4. Seed 2-3 pilot partners via the regular invitation flow (NOT `seed-partner-launch.ts` which is for `@test.leasetic.com` only).
  5. Confirm Thomas's privacy-coverage signoff at `docs/legal/privacy-coverage-confirmation.md`.
  6. Send pilot partner comms (Antoine drafts; Thomas reviewed if needed).
  7. Pilot observation period (1-2 weeks): admin spot-checks `/healthz`, Vercel logs, audit_log row counts, soft-delete activity.
  8. Post-pilot: run `npm run purge:test-data` (D-10-12) to scrub any test users created during pilot debugging.
  9. Send batch-onboard email to remaining channel partners (Antoine).
- **D-10-20 (Phased pilot rollout):** Launch with 2-3 trusted partners first (Thomas's most engaged + responsive contacts). 1-2 weeks of pilot observation. Then batch-onboard the rest. v10 stays accessible (file in their possession) during pilot — partners on v1.1 are explicit early adopters.
- **D-10-21 (Antoine owns partner comms):** Antoine (you) directly sends partner comms during cutover. Thomas reviewed for tone/relationship sensitivity if needed but doesn't send. Direct involvement reflects your preference for technical voice during the change. **Implication for `docs/operations/deploy-ovh.md`:** runbook is written assuming Antoine-context (technical voice, can skip basic-operator hand-holding).

### Implicit decisions (planner discretion — not asked)

- **Cron secret naming:** `PURGE_CRON_SECRET` — added to Vercel env vars (Production scope only). Minimum 32 random bytes (`openssl rand -hex 32`). Documented in `docs/operations/deploy-ovh.md` env vars section.
- **`/api/internal/*` route convention:** All Vercel-cron-callable routes live under `app/api/internal/`. Ops routes — never linked from any UI surface; never exposed to partner sessions; documented in deploy-ovh.md as "ops-only routes." First member: `purge-soft-deleted/route.ts`. Future Phase 10/v1.2 cron jobs land here.
- **Env var documentation:** `.env.example` gets new entries for `NEXT_PUBLIC_PRIVACY_URL_FR`, `NEXT_PUBLIC_PRIVACY_URL_EN`, `PURGE_CRON_SECRET` — keep .env.example in lockstep with what production needs. Phase 5/6 pattern continues.
- **Banner accessibility:** `.seed-banner` includes `role="status"` + `aria-live="polite"` so screen readers announce it on page load. No focus management — banner is informational, not interactive.
- **Smoke script idempotency:** `scripts/smoke-ovh.ts` cleans up after itself — soft-deletes the proposal it created. The cleanup commits enable re-runs without polluting the target DB. Documented behavior.
- **Migration application as launch-checklist item, not Phase 10 plan:** Phase 9 follow-up issue (prod migrations 0002+0003 not yet applied) is acknowledged in the launch-checklist as step 1, but actually applying them is an ops task — not in any Phase 10 plan. Antoine triggers the workflow before pilot launch.
- **Post-launch checklist:** Brief mirror checklist for *during* and *after* pilot (e.g., "monitor /healthz daily for first week", "review audit_log for unexpected actions"). Optional planner addition.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & milestone
- `.planning/PROJECT.md` — milestone goal, v10 distribution model ("send the file"), locked decisions, OVH portability invariant
- `.planning/REQUIREMENTS.md` — CUT-01..09 (9 reqs); CUT-04 reads "is_test=true" but Phase 10 satisfies it via email-pattern (D-10-09)
- `.planning/STATE.md` — open follow-ups (Neon branch split, admin password rotation, APP_URL env-var docs); Open Q1/Q3/Q5 standing items
- `.planning/ROADMAP.md` — Phase 10 goal + 5 success criteria

### Phase 9 deliverables (preserve invariants — DO NOT modify)
- `.planning/phases/09-admin-surface/09-CONTEXT.md` — D-09-01..14 admin surface decisions
- `.planning/phases/09-admin-surface/09-SECURITY.md` — 42 threats verified closed; ADMIN-09 commission invisibility scope (Phase 10's banner doesn't render commission_pct)
- `app/(admin)/[adminSegment]/coefficients/page.tsx` — Phase 9 file; Phase 10 ADDS `<SeedBanner>` above editor card (D-10-13/14)
- `src/lib/admin/actions.ts` — Phase 9 wrappers; Phase 10 may add a thin wrapper for the purge cron's audit log writes
- `src/lib/db/queries/audit-log.ts` — Phase 10 EXTENDS `AuditAction` union with `'user.purge'` (D-10-11)

### Phase 8 deliverables (preserve invariants)
- `.planning/phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — D-A1..A3 (PDF byte-determinism — smoke script asserts SHA-256 match), D-C3 (soft-delete behavior), D-D1 (placeholder coefficients in seed migration)
- `scripts/purge-soft-deleted.ts` — Phase 10 refactors to share pure function with HTTP route (D-10-07)
- `docs/operations/purge.md` — Phase 8 runbook for manual purge; Phase 10 SUPERSEDES (or extends) with cron-aware version
- `__pdf-fixtures__/expected.sha256.txt` — committed expected SHA-256 hashes; smoke script asserts current PDF bytes match

### Phase 6 deliverables (preserve invariants)
- `.planning/phases/06-auth-shell/06-CONTEXT.md` — D-09 (24h token TTL + InviteUrlModal), D-23 (users never hard-deleted — but Phase 10's `purge-test-data.ts` is the EXCEPTION: legitimate hard-delete of test rows pre-launch)
- `app/(public)/login/LoginForm.tsx` — Phase 10 ADDS privacy-policy link at form footer (D-10-17)
- `src/lib/auth/require.ts` — `requireAdmin()` for the new `/api/internal/*` routes
- `scripts/seed-admins-launch.ts` — Phase 10 amends `seed-partner-launch.ts` to the same typed-confirmation pattern + email validation

### Phase 5 deliverables
- `src/lib/db/index.ts` — Drizzle adapter; smoke script uses this via env-var DATABASE_URL
- `src/lib/storage/index.ts` — StorageAdapter; smoke script uses this via STORAGE_DRIVER env
- `eslint.config.mjs` — `no-restricted-imports` rules; Phase 10 stays inside the adapter discipline. New `app/api/internal/*` files MUST NOT import `@vercel/*` directly.
- `.github/workflows/db-migrate.yml` — pattern for typed-confirmation gated GH Actions (`scripts/purge-test-data.ts` mirrors but is run locally, not via CI)
- `.github/workflows/ci.yml` — Phase 10 adds the `check-no-v10-localstorage.sh` grep gate

### Architecture & pitfalls
- `.planning/research/SUMMARY.md` — §10 cutover & polish row, §OVH portability resolved, §Email transport defer
- `.planning/research/ARCHITECTURE.md` — §9 (OVH portability adapter discipline), §4.4 (no-SMTP / admin-mediated)
- `.planning/research/PITFALLS.md` — §1.6 (`force-dynamic` on cron-triggered routes), §9.4 (error redaction at boundaries — applies to smoke script too)

### v10 source
- `Matrice_2026_THE_Leasetic-v10.html` — visual reference; lines 1922-1929 cited as the canonical v10 fixture coefficients (D-D1 / D-10-14 baseline)

### External documentation
- Vercel Cron docs: cron syntax, env-var injection, `vercel.json` schema
- Postgres `LIKE` predicate semantics for the email-pattern purge
- OVH provider neutral docs: Managed PG product page, Object Storage S3-compat docs (TBD before September)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scripts/purge-soft-deleted.ts`** — manual CLI shipped in Phase 8 plan 08-13; Phase 10 refactors loop into `src/lib/admin/purge.ts` and the CLI becomes a thin wrapper.
- **`scripts/migrate.ts` + `db-migrate.yml`** — reference pattern for the `npm run purge:test-data` script's typed-confirmation gate (Phase 10 mirrors).
- **`scripts/seed-admins-launch.ts`** — pattern for a typed-confirmation, env-required, idempotent seed script — `seed-partner-launch.ts` (just committed) and `purge-test-data.ts` follow the same shape.
- **`writeAuditLog`** (`src/lib/db/queries/audit-log.ts`) — existing API; Phase 10 extends `AuditAction` union with `'user.purge'`.
- **`requireAdmin`** (`src/lib/auth/require.ts`) — Phase 10's `/api/internal/purge-soft-deleted` HTTP route uses this in addition to the cron-secret bearer-token check.
- **`<SeedBanner>` content composition** mirrors Phase 8's `<EmptyProposalsState>` empty-state card pattern — yellow card chrome already styled.
- **Phase 6 admin segment gate** (`app/(admin)/[adminSegment]/layout.tsx`) — Phase 10 doesn't add admin-segment routes, but the `/api/internal/*` routes do their own `requireAdmin()` call independently (defense in depth).

### Established Patterns
- **Typed-confirmation gates on destructive prod operations** (Phase 5 plan 05-06 + Phase 8 plan 08-13). Phase 10's `purge-test-data.ts` follows.
- **Drizzle schema-on-disk + migrations via GH Actions only** (BOOT-10). Phase 10 needs ZERO new migrations — uses existing schema.
- **`force-dynamic` on session-reading routes** (PITFALLS §1.6). Phase 10's `/api/internal/purge-soft-deleted/route.ts` declares `dynamic = 'force-dynamic'`.
- **Adapter discipline** (`lib/storage`, `lib/db`) — smoke script uses these via env vars; OVH runbook documents env-var-only swap as the portability invariant.
- **i18n via `t()` for all user-facing strings** — `<SeedBanner>` and `LoginForm` privacy link follow.
- **Sonner toast discipline** — N/A in Phase 10 (no new partner-facing UI).

### Integration Points
- **Phase 9 coefficients page** (`app/(admin)/[adminSegment]/coefficients/page.tsx`): Phase 10 adds `<SeedBanner>` above the existing editor card. Server component computes `isStillSeed` and passes as prop.
- **Phase 6 login form** (`app/(public)/login/LoginForm.tsx`): Phase 10 adds privacy-policy link at form footer.
- **Phase 8 purge CLI** (`scripts/purge-soft-deleted.ts`): refactored to share pure function with new HTTP route.
- **Phase 5 CI workflow** (`.github/workflows/ci.yml`): Phase 10 adds the `check-no-v10-localstorage.sh` grep gate.
- **Vercel cron entry** (`vercel.json`): NEW in Phase 10. Cron schedule + headers (PURGE_CRON_SECRET) + path.
- **`.env.example`**: NEW entries for privacy URLs + cron secret.
- **`docs/operations/`**: NEW files: `deploy-ovh.md`, `launch-checklist.md`, `legal/privacy-coverage-confirmation.md` (after Thomas reply).

</code_context>

<specifics>
## Specific Ideas

- **Banner color/styling:** Reuse the existing `--gold` token from Phase 4's dark-mode palette (already used for "warning" surfaces). Light mode: gold background + dark navy text + 12px rounded corners + 16px padding. Dark mode: muted gold, lighter text. Keep visual weight low — it's informational, not alarming.
- **Privacy link copy:** FR `"Politique de confidentialité"`, EN `"Privacy policy"`. Place at form footer below the "Forgot password?" link (or where Phase 6 placed footer affordances). Underlined on hover; no icon.
- **OVH runbook structure (mirroring `docs/operations/migrations.md`):**
  ```
  # OVH Deployment Runbook (Phase 10 / September 2026 Target)

  ## Overview
  ## Prerequisites
  ## Provisioning
    - Managed Postgres (provider TBD; OVH Managed PG, Scaleway, self-host)
    - S3-compatible Blob (provider TBD; OVH Object Storage, Scaleway, self-host)
  ## Configuration
    - Env vars (DATABASE_URL, STORAGE_DRIVER, S3 creds, AUTH_SECRET, ADMIN_URL_SEGMENT, ...)
  ## Build & Deploy
    - Build: `npm ci && npm run build`
    - Run: `node .next/standalone/server.js`
  ## Migration Application
    - Local: `DATABASE_URL=<ovh-url> npm run db:migrate -- --confirm`
  ## Smoke Test
    - `APP_URL=<ovh-url> ADMIN_EMAIL=<seed> ADMIN_PASSWORD=<seed> npm run smoke:ovh`
    - Asserts: log in, create proposal, PDF SHA-256 match, soft-delete + restore
  ## Cron Setup (replaces Vercel Cron)
    - Option A: cron job (crontab -e: `0 3 1,15 * * curl -H "Authorization: Bearer $PURGE_CRON_SECRET" $APP_URL/api/internal/purge-soft-deleted`)
    - Option B: systemd timer (template provided)
    - Option C: OVH Cloud Scheduler (TBD)
  ## Rollback
  ## Smoke Test Failure Diagnosis
  ```
- **Launch-checklist structure:** numbered list with checkboxes (`- [ ]`); Antoine ticks them off in order; commits the checked file as a launch-day artifact for the audit trail.

</specifics>

<deferred>
## Deferred Ideas

- **Actual OVH provisioning + smoke-deploy execution** — September 2026 (post-v1.1-launch); v1.2 work
- **Sentry / APM observability** — explicit CUT-07 defer; v1.2
- **Email/Slack alerting on cron failures** — pairs with CUT-07; v1.2
- **Legal counsel formal sign-off path** — escalation depends on Thomas's reply (Open Q3); could become v1.2 blocker
- **OVH provider lock-in** (Managed PG vs Scaleway vs self-host) — runbook generic; specific provider before September
- **Phase 5 follow-up: Neon branch split** — separate ops task, not in Phase 10 plan
- **Phase 6 follow-ups** (admin password rotation, Better Auth `trustedOrigins`, APP_URL env-var docs) — separate ops items
- **Audit log viewer beyond coefficient history** — explicit Phase 9 deferred; v1.2
- **Mobile-optimized layouts** — v1.2 per PROJECT.md
- **`is_test boolean` schema column** — explicitly chosen against in D-10-09; future need (e.g., staging vs prod sharing one DB) might revisit
- **Per-partner pricing comms differentiation** — out of scope; one comms message for all pilot partners
- **Email transport (Resend, OVH SMTP) for partner self-service password reset** — explicit defer per research SUMMARY §3; v1.2
- **Detailed CHANGELOG.md format** — Phase 10 adds the v1.0 → v1.1 entry; future versioning conventions are a v1.2+ housekeeping decision

</deferred>

---

*Phase: 10-cutover-polish*
*Context gathered: 2026-05-10*
