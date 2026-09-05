# Phase 20: Infra Hardening - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve the three Tier-2 infrastructure deferred items from v1.1/v1.2 carry-forward:

1. **INFRA-01** — Neon 3-branch split: Vercel production scope routes to Neon `main`, preview scope routes to `preview`, development scope routes to `development`. Resolves v1.1 BOOT-03 partial (currently all 3 scopes → `main`).
2. **INFRA-02** — GitHub Actions CI gains a post-deploy DB-smoke step that runs against an ephemeral Neon branch on every PR touching `drizzle/migrations/*.sql` or `drizzle/meta/_journal.json`. Closes the recurring "generator self-evaluation blind spot" class that bit v1.1 (correlated-subquery SQL bug) and v1.2 Phase 12 (missing `_journal.json` entry → 24h prod un-applied).
3. **INFRA-03** — Better Auth `trustedOrigins` hardening: rejects requests to all Better Auth endpoints whose `Origin` header is not in the trusted list, in addition to the existing SameSite=Lax + `__Secure-` cookies CSRF defense.

**In scope:**
- Branch-selector input added to `.github/workflows/db-migrate.yml` so the existing manual migration workflow can fan migrations across all 3 branches.
- New `.github/workflows/ci.yml` step (or extension to existing) that creates an ephemeral Neon branch per CI run, applies migrations, validates, deletes the branch via `always()` cleanup.
- `trustedOrigins` clause added to `src/lib/auth/index.ts` Better Auth config, sourced from existing `APP_URL` + `NEXT_PUBLIC_APP_URL` env vars (+ `VERCEL_URL` fallback for preview deploys).
- `.env.example` extended with documented branch-routing pattern.
- New `docs/operations/neon-branch-routing.md` ops runbook capturing branch creation, fan-out, recovery procedure.
- New `docs/operations/phase-20-rollout-checklist.md` step-by-step Neon dashboard + Vercel env-var runbook for the INFRA-01 cutover (referenced from the executor checkpoint).
- Vitest test for the trustedOrigins gate (forges Origin header against `/api/auth/sign-in/*`, asserts non-2xx).
- `NEON_API_KEY` GitHub secret provisioned for the CI workflow.

**Out of scope:**
- Custom error-shape for Origin-rejected requests (use Better Auth's default response — D-13).
- Origin gate on non-Better-Auth routes (e.g., `/api/proposals/finalize` — already covered by SameSite=Lax cookies + `__Secure-` discipline; D-12).
- proxy.ts modifications (Origin check lives in Better Auth config — D-11).
- Long-lived shared CI branch (per-run lifecycle — D-06).
- Integration test execution in CI db-smoke (just `migrate + assert no error` per spec — D-07).
- New TRUSTED_ORIGINS env var (derive from existing APP_URL + NEXT_PUBLIC_APP_URL — D-13).
- Per-partner subdomain allowlisting (v1.4+ scope).
- OVH-side equivalent of these features (Phase 20 formally accepts the OVH-portability tradeoff for these Vercel/Neon-specific mechanisms — `<deferred>` for OVH parity).

</domain>

<decisions>
## Implementation Decisions

### INFRA-01 Neon branch split (D-01..D-04)

- **D-01 (branch model):** Create `preview` and `development` as one-time snapshots of current `main`. After that, every migration PR runs against ALL 3 branches via the extended `db-migrate.yml` workflow. Branches stay isolated for data but always-converged for schema. The db-migrate workflow learns a new `branch` input (default `main`, options `main|preview|development|all`).

- **D-02 (Vercel cutover order):** **Development first → Preview → Production last.** Each scope flip is a separate Vercel env-var edit + redeploy. Least-risk-first: dev scope misconfig is recoverable; preview catches PR-by-PR validation before prod cutover; production touches last with the safety net of two validated scopes.

- **D-03 (pooling config):** **All 3 branches use identical `?pgbouncer=true&connection_limit=1`** (matches current production config per `.planning/codebase/STACK.md`). The serverless driver enforces `connection_limit=1` for serverless functions anyway — same setting on all 3 keeps connection-pool math predictable across scopes.

- **D-04 (documentation):** Update **`.env.example`** with documented branch-routing comments showing prod/preview/dev DATABASE_URL examples (branch names placeholdered) AND add **`docs/operations/neon-branch-routing.md`** ops runbook capturing: 3-branch-to-3-scope mapping, branch creation procedure, db-migrate.yml fan-out semantics, recovery procedure if a branch falls behind.

### INFRA-02 CI db-smoke design (D-05..D-08)

- **D-05 (trigger):** **Only on PRs touching `drizzle/migrations/*.sql` or `drizzle/meta/_journal.json`** (spec-literal). GitHub Actions `paths:` filter on the `pull_request` event. Cheapest path — ephemeral Neon branches only spin up when needed. Catches the Phase 12 `_journal.json` incident class exactly.

- **D-06 (ephemeral branch lifecycle):** **Per-CI-run: create at job start, delete at job end** via `always()` workflow step so failures don't leak branches. Branch name `ci-${{ github.run_id }}` for traceability. Zero residual state between runs.

- **D-07 (validation depth):** **Run migrations + assert apply succeeds** (`npx drizzle-kit migrate` or equivalent) — matches spec literal ("fails if the schema cannot be applied cleanly"). Catches missing `_journal.json` entries, syntax errors, constraint violations on existing data. Integration-test execution against ephemeral branch is deferred to v1.4+ (would require unblocking the currently-skipped `*.integration.test.ts` files — out of scope for this phase).

- **D-08 (failure semantics):** **Required status check that blocks PR merge.** Configure as a required check in GitHub branch protection on `main`. Matches existing CI gate philosophy (vitest, lint, type-check are already required) and honors the spec's "fails (and blocks merge)" wording.

### INFRA-03 middleware Origin gate (D-09..D-13)

- **D-09 (layer):** **Better Auth `trustedOrigins` config** in `src/lib/auth/index.ts` — the library's built-in mechanism. Zero new middleware code, single source of truth, matches the spec's wording "Better Auth `trustedOrigins`". The `proxy.ts` file is NOT modified.

- **D-10 (enforcement scope — via Better Auth):** trustedOrigins automatically covers **all Better Auth mutation endpoints** (sign-in, sign-out, password reset, callback, etc.) — broader than the spec's literal `/api/auth/sign-in/*` wording but objectively safer with no extra effort. The spec is a floor, not a ceiling.

- **D-11 (no proxy.ts modifications):** proxy.ts currently EXCLUDES `/api/auth/*` from its matcher (Better Auth owns those). Phase 20 preserves that exclusion. The trustedOrigins check happens inside Better Auth's request handler, downstream of the Next.js matcher.

- **D-12 (no Origin gate on non-Better-Auth routes):** Routes like `/api/proposals/finalize`, `/api/proposals/export` are NOT gated by Origin. They're already protected by SameSite=Lax cookies + the `__Secure-` cookie discipline (Phase 6). Adding an Origin check to them would be scope creep against the spec's intent.

- **D-13 (trustedOrigins source + response):** Derived from existing env vars: `[process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL].filter(Boolean)`. For Vercel preview deployments where APP_URL may be unset, fall back to `process.env.VERCEL_URL` (already wired per Phase 6 auth config). Rejected requests return **Better Auth's default response** (likely 403 + bounded JSON error) — no custom error-shape maintenance. Tests assert non-2xx + non-empty error body.

### Phase mechanics + plan split (D-14..D-17)

- **D-14 (plan split):** **3 plans:**
  - `20-01-PLAN.md` = INFRA-03 (smallest, pure config; ~30 min): adds `trustedOrigins` to `src/lib/auth/index.ts` + Vitest forge-Origin test against `/api/auth/sign-in/*`.
  - `20-02-PLAN.md` = INFRA-02 (~1-2h): adds CI db-smoke step + extends `db-migrate.yml` with branch-selector + provisions `NEON_API_KEY` secret instructions (Antoine provisions the secret value manually).
  - `20-03-PLAN.md` = INFRA-01 (longest, dashboard work; ~1h Antoine + ~30 min code): generates the Neon dashboard + Vercel runbook, executes via checkpoint pause, updates `.env.example` + writes `docs/operations/neon-branch-routing.md` + verifies via smoke query.

- **D-15 (wave order):** **Wave 1 = 20-01 + 20-02 in parallel** (they share zero files). Wave 2 = 20-03 last (after the safety net is in place; the db-smoke gate from 20-02 catches issues before the INFRA-01 cutover changes hit production migration paths). Ships code-only safety net BEFORE the high-blast-radius env-var changes.

- **D-16 (INFRA-01 autonomous gating):** **`autonomous: false`** on 20-03. The plan pauses at the checkpoint with step-by-step Neon dashboard + Vercel env-var runbook (D-17). Antoine executes the dashboard work, pastes connection strings or confirms "done", executor verifies via smoke query + continues with code-side changes (docs, .env.example updates).

- **D-17 (INFRA-01 checkpoint format):** Step-by-step runbook **inline in the checkpoint message** with: (1) numbered Neon dashboard clicks (create `preview` branch from `main`, copy pooled connection string; create `development` branch from `main`, copy pooled connection string), (2) Vercel env-var edits per scope in order dev→preview→prod with exact env var names and URL format, (3) prompt for Antoine to paste the connection strings (or just confirm "done"). Same content additionally written to `docs/operations/phase-20-rollout-checklist.md` so the runbook is a persistent artifact for future re-runs (e.g., adding a 4th partner-tier branch later).

- **D-18 (skip UI-SPEC):** **No `/gsd-ui-phase 20`** — Phase 20 has zero UI surfaces. Plan-phase will detect no frontend indicators and not gate on UI-SPEC.

### Claude's Discretion

- **NEON_API_KEY GitHub secret provisioning** — planner instructs Antoine to provision via Neon dashboard (project-scoped recommended, not full-account) and add to GitHub repo secrets. The plan can't automate this.
- **Branch naming convention** in Neon (`preview` + `development` vs `leasetic-preview` + `leasetic-dev`) — recommend the short form; project ID disambiguates. Planner confirms by reading current Neon project naming.
- **db-migrate.yml `branch` input default** (`main` vs `all`) — recommend `main` default to preserve current production-only manual workflow semantics; `all` is opt-in for migrations that have been pre-tested.
- **Exact format of the rollout checklist Markdown** (table vs ordered list vs collapsible details) — planner picks; the existing `docs/operations/deploy-ovh.md` is the closest analog for tone.
- **Test approach for INFRA-03 trustedOrigins** — planner picks between (a) Vitest that forges Origin header against a real route via supertest-like helper, (b) Vitest that asserts the Better Auth config object includes the right list. Recommend (a) for end-to-end coverage; (b) is the cheaper unit-level fallback.
- **Whether to also test that VERCEL_URL fallback resolves correctly when APP_URL is unset** — recommend yes, covers the preview deploy edge case.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 20: Infra Hardening" — phase scope, 3 success criteria, dependencies
- `.planning/REQUIREMENTS.md` — INFRA-01, INFRA-02, INFRA-03 full text
- `.planning/MILESTONES.md` §v1.3 — milestone goals + carry-forward provenance

### Codebase analysis (Phase 20 baseline)
- `.planning/codebase/STACK.md` §Configuration §Environment — current `DATABASE_URL` pgbouncer params + driver-by-host pattern (Neon HTTP for `*.neon.tech`, postgres-js TCP otherwise)
- `.planning/codebase/STACK.md` §Build — `eslint.config.mjs` OVH-portability rules (no impact on Phase 20 since auth/CI config are explicitly Vercel/Neon-scoped)
- `.env.example` — current canonical env var contract (extends with INFRA-01 branch routing comments)
- `src/lib/db/client.ts` — current driver-selection logic; verify the Neon branch host pattern (`*.neon.tech`) still matches all 3 new branches
- `src/lib/auth/index.ts` — current Better Auth config (no `trustedOrigins` clause today; INFRA-03 adds it)
- `proxy.ts` — Next.js 16 proxy with `/api/auth/*` matcher exclusion; INFRA-03 does NOT modify this file
- `.github/workflows/ci.yml` — current CI workflow (target for INFRA-02 db-smoke step addition)
- `.github/workflows/db-migrate.yml` — existing manual migration workflow (target for INFRA-01 branch-selector extension)
- `drizzle/migrations/*.sql` + `drizzle/meta/_journal.json` — paths filter scope for INFRA-02
- `vercel.json` — current minimal config (no scope-routing config; INFRA-01 changes are entirely Vercel dashboard env vars)

### Carry-forward decisions from prior phases (Phase 20 must respect)
- `.planning/phases/05-bootstrap-deploy/05-CONTEXT.md` — BOOT-03 partial (Vercel scope env-var pattern; INFRA-01 resolves)
- `.planning/phases/06-auth-shell/06-CONTEXT.md` — Better Auth APP_URL + NEXT_PUBLIC_APP_URL env-var contract (INFRA-03 derives trustedOrigins from these); proxy.ts D-21 redirect pattern (INFRA-03 preserves, does NOT modify proxy.ts); SameSite=Lax + `__Secure-` cookie discipline (D-12 rationale: non-Better-Auth routes don't need Origin gate)
- `.planning/phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — `/api/proposals/*` route patterns (informs INFRA-02 test surface; not modified by Phase 20)
- `.planning/phases/12-schema-extensions-for-drafts-history/12-CONTEXT.md` — `_journal.json` migration sequencing pattern (INFRA-02 catches the missing-entry incident class)
- `.planning/v1.3-CARRYFORWARD.md` — Tier-2 carry-forward provenance for INFRA-01/02/03

### Operational + ops runbooks
- `docs/operations/deploy-ovh.md` — existing ops runbook tone/format (closest analog for new `neon-branch-routing.md` + `phase-20-rollout-checklist.md`)
- `docs/legal/privacy-coverage-confirmation.md` — pre-existing Phase 21 GATE-02 stub (not modified by Phase 20)

### External documentation (planner may need to verify during execution)
- Better Auth `trustedOrigins` config docs — confirm exact response shape on Origin rejection (D-13 assumes 403 + bounded JSON)
- Neon ephemeral branch API docs — required for INFRA-02 CI step (create + delete via REST API or `neonctl` CLI)
- GitHub Actions `paths:` filter syntax — required for INFRA-02 trigger (D-05)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/auth/index.ts`** — Better Auth config; INFRA-03 adds a `trustedOrigins` field to the existing config object. No new file.
- **`proxy.ts`** — Phase 6 Next 16 proxy. Read-only reference; INFRA-03 does NOT touch.
- **`.github/workflows/db-migrate.yml`** — Phase 8 manual prod migration workflow. INFRA-01 extends with a `branch` input + parameterized DATABASE_URL.
- **`.github/workflows/ci.yml`** — Current CI workflow (vitest + lint + type-check). INFRA-02 adds a new conditional job/step that runs only when `paths:` filter matches.
- **`src/lib/db/client.ts`** — Driver selection by host pattern. Phase 20 verifies all 3 new Neon branches match the `*.neon.tech` pattern (no code change needed if branch URLs stay in that namespace).
- **`.env.example`** — Phase 5 canonical env var contract. INFRA-01 extends with branch-routing comments.

### Established Patterns
- **OVH-portability discipline** (`eslint.config.mjs:77-81, 130-141`): Phase 20 work is explicitly Vercel/Neon-specific. The auth config, CI workflow, and Vercel env vars are not gated by the OVH-portability rules (those rules guard adapter code under `src/lib/db/`, `src/lib/storage/`, etc.). Phase 20 formally documents this acceptance.
- **Required-status-check CI gate philosophy** (Phase 5+): vitest, lint, type-check are all required-blocking. INFRA-02 follows: db-smoke = required when its paths filter matches.
- **Server Action / Route Handler request-handling pattern** (Phase 13 + 19 hotfix): not directly relevant to Phase 20 but the trustedOrigins gate sits upstream of these.
- **Cookie-only proxy.ts auth gate** (Phase 6 PITFALLS §1.5): INFRA-03 preserves this; the Origin check happens in Better Auth's handler, not in proxy.ts.
- **Bounded error code response shape** (Phase 13 + 19): if planner customizes the rejection response, follow this convention (`{ error: 'forbidden_origin' }`). Default Better Auth response acceptable per D-13.

### Integration Points
- **MODIFY:** `src/lib/auth/index.ts` — add `trustedOrigins: [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null].filter(Boolean)` to the Better Auth config (INFRA-03 D-09).
- **CREATE:** `src/lib/auth/trusted-origins.test.ts` (or equivalent) — Vitest that forges Origin header against `/api/auth/sign-in/*`, asserts non-2xx response (INFRA-03 D-13 test).
- **MODIFY:** `.github/workflows/ci.yml` — add db-smoke step with `paths:` filter (INFRA-02 D-05) + ephemeral-branch lifecycle (INFRA-02 D-06) + migration application (INFRA-02 D-07) + required-check configuration in branch protection (INFRA-02 D-08).
- **MODIFY:** `.github/workflows/db-migrate.yml` — add `branch` workflow_dispatch input + parameterize DATABASE_URL based on input (INFRA-01 D-01 fan-out).
- **MODIFY:** `.env.example` — add branch-routing comments documenting prod/preview/dev DATABASE_URL pattern (INFRA-01 D-04).
- **CREATE:** `docs/operations/neon-branch-routing.md` — ops runbook (INFRA-01 D-04).
- **CREATE:** `docs/operations/phase-20-rollout-checklist.md` — INFRA-01 cutover runbook used by the executor checkpoint (D-17).
- **MANUAL (Antoine):** Provision `NEON_API_KEY` GitHub repo secret (project-scoped); create `preview` + `development` Neon branches from `main`; update Vercel env vars per scope in order dev→preview→prod; verify each scope with a deployed smoke check.

</code_context>

<specifics>
## Specific Ideas

- **trustedOrigins literal** (D-09 + D-13 illustrative):
  ```ts
  // src/lib/auth/index.ts (excerpt)
  const trustedOriginsList: string[] = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter((v): v is string => Boolean(v));

  export const auth = betterAuth({
    // ...existing config...
    trustedOrigins: trustedOriginsList,
  });
  ```

- **INFRA-02 CI step shape** (illustrative, planner refines):
  ```yaml
  # .github/workflows/ci.yml (new job)
  db-smoke:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Filter paths
        id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            schema:
              - 'drizzle/migrations/*.sql'
              - 'drizzle/meta/_journal.json'
      - name: Create ephemeral Neon branch
        if: steps.filter.outputs.schema == 'true'
        id: neon-branch
        run: |
          BRANCH_NAME="ci-${{ github.run_id }}"
          # Use neonctl or curl to Neon API to create branch from main
          # Capture branch connection string into output
      - name: Apply migrations
        if: steps.filter.outputs.schema == 'true'
        env:
          DATABASE_URL: ${{ steps.neon-branch.outputs.connection_string }}
        run: npm run db:migrate
      - name: Always cleanup ephemeral branch
        if: always() && steps.filter.outputs.schema == 'true'
        run: |
          # Delete the branch via Neon API
  ```

- **db-migrate.yml branch-selector** (illustrative):
  ```yaml
  workflow_dispatch:
    inputs:
      branch:
        type: choice
        default: main
        options: [main, preview, development, all]
  ```
  When `all`, the job loops over the 3 branch names, applying migrations to each in sequence (or fans out to a matrix).

- **INFRA-01 checkpoint runbook content** (D-17 — what the executor pauses with):
  ```
  ## INFRA-01 Manual Step Required

  Please complete the following in order, then type "done" when finished:

  ### Step 1: Create `preview` Neon branch from `main`
  1. Go to https://console.neon.tech → project leasetic-matrice → Branches
  2. Click "New branch"
  3. Name: `preview`
  4. Source: `main` (current branch)
  5. Click Create
  6. Copy the pooled connection string (Settings → Connection details → enable "Pooled connection" toggle, copy URL)

  ### Step 2: Create `development` Neon branch from `main`
  (Repeat Step 1 with name `development`)

  ### Step 3: Update Vercel env vars — DEVELOPMENT scope FIRST
  1. Go to https://vercel.com/team_b22P56dgh6tYIkM8mgRASgN2/leasetic-matrice/settings/environment-variables
  2. Find DATABASE_URL → Edit → Select "Development" scope
  3. Paste the `development` branch's pooled connection string
  4. Save
  5. Trigger a development-scope redeploy or wait for next push

  ### Step 4: Verify development scope
  - Visit a dev preview URL OR run `vercel dev` locally
  - Smoke check: log in, view /proposals, confirm no DB errors

  ### Step 5: Update Vercel env vars — PREVIEW scope
  (Repeat Step 3 with `preview` branch's connection string + Preview scope)

  ### Step 6: Verify preview scope
  - Open a draft PR or visit a recent preview deployment
  - Smoke check: log in, view /proposals

  ### Step 7: Update Vercel env vars — PRODUCTION scope LAST
  (Repeat Step 3 with `main` branch's connection string + Production scope)
  - Note: production was already on main, but the URL may differ (you're now explicitly pinning vs implicit default)

  ### Step 8: Verify production scope
  - https://leasetic-matrice.vercel.app — log in, smoke check, /coefficients page (sanity)

  ### Step 9: Confirm "done" + paste the 3 connection strings (optional — for the executor to verify host pattern matches)
  ```

- **.env.example branch-routing addition** (illustrative):
  ```bash
  # DATABASE_URL — Postgres connection string. Driver chosen by host pattern.
  # Production (Vercel prod scope):   pooled endpoint of the `main` Neon branch
  # Preview    (Vercel preview scope): pooled endpoint of the `preview` Neon branch
  # Development (Vercel dev scope):    pooled endpoint of the `development` Neon branch
  # Local dev: either a local Postgres or any Neon branch (typically `development`)
  DATABASE_URL=postgresql://USER:PASS@HOST.neon.tech/leasetic?pgbouncer=true&connection_limit=1
  ```

- **Neon free-tier branch limits:** Neon free tier supports up to 10 branches per project. 3 named branches + occasional ephemeral CI branches stays well under the cap.

- **VERCEL_URL preview fallback** (D-13): Vercel sets `VERCEL_URL` per-deployment with the dynamic preview URL (`leasetic-matrice-git-pr-abc-team.vercel.app`). Without including this in `trustedOrigins`, preview deployments would reject their own sign-in requests. The trustedOrigins computation prepends `https://` because VERCEL_URL is the bare hostname.

</specifics>

<deferred>
## Deferred Ideas

- **OVH-side equivalent** of Phase 20 features (branch isolation, post-deploy smoke gate, Origin gate via Apache/nginx) — out of scope for this milestone. Documented in `docs/operations/deploy-ovh.md` as a v1.4+ migration item. The OVH path uses entirely different mechanisms (separate managed Postgres instances, cron-based smoke checks, web-server config).
- **Integration test execution in CI db-smoke** — currently-skipped `*.integration.test.ts` files require `DATABASE_URL_TEST`. INFRA-02 could unlock these by passing the ephemeral branch URL as `DATABASE_URL_TEST`, but the spec is "migrations apply cleanly" not "all integration tests pass". v1.4+ enhancement candidate.
- **Origin gate on non-Better-Auth routes** (e.g., `/api/proposals/finalize`, `/api/proposals/export`) — already covered by SameSite=Lax cookies + `__Secure-` discipline (Phase 6). Revisit only if a real CSRF surface emerges.
- **Custom trustedOrigins rejection response** (`{ error: 'forbidden_origin' }` bounded code) — Better Auth's default is acceptable; customize only if monitoring/logging needs require structured codes.
- **Per-partner subdomain allowlisting** for Better Auth trustedOrigins (e.g., `partner.leasetic.fr`) — v1.4+ if/when partner-branded subdomains become a product feature.
- **4th + Nth Neon branches** for partner-tier data isolation — currently 3 branches suffice for environment isolation. If multi-tenant data isolation becomes a need, the `neon-branch-routing.md` runbook documents the pattern for adding more.
- **Permanent dev-data seeding** in the `development` Neon branch — currently the branch starts as a snapshot of `main` (production-like data). If we want clean repeatable dev data, add a `scripts/seed-dev.ts` and run it post-fork. Out of scope here; tracked for v1.4+.
- **Slack/email notification on db-smoke failure** — useful if PR volume grows, but the GitHub PR check UI is sufficient for v1.3 cadence.
- **Auto-generation of the rollout checklist** (templated from Neon project + Vercel project metadata) — manually-curated runbook is fine for one-shot operations.
- **`neon-pr-preview` style: per-PR ephemeral branch lifecycle for `development` scope** — would replace static `development` with PR-scoped branches. Major DX win for parallel feature work; out of scope here, v1.4+ candidate.

</deferred>

---

*Phase: 20-infra-hardening*
*Context gathered: 2026-05-26*
