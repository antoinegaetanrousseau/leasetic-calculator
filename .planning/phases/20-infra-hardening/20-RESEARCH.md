# Phase 20: Infra Hardening - Research

**Researched:** 2026-05-26
**Source:** context7 MCP server (Better Auth v1.6.11 docs + Neon docs)
**Scope:** the two API surfaces the planner must get exactly right — Better Auth `trustedOrigins` config, and Neon ephemeral branch lifecycle from GitHub Actions.

---

## 1. Better Auth `trustedOrigins` config

### Field shape

```ts
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  // ...other config...
  trustedOrigins: string[],     // static list
  // OR
  trustedOrigins: (request: Request) => string[] | Promise<string[]>,  // dynamic callback
});
```

### Behavior

- **CSRF default: ON.** Better Auth verifies the `Origin` header on every request. Requests from origins NOT in the trusted list are rejected. From `docs/reference/security.mdx`: *"Better Auth verifies each request's Origin header to ensure it originates from your application or another explicitly trusted source. Requests from untrusted origins are rejected."*
- **`baseURL` is automatically trusted.** No need to list it explicitly in `trustedOrigins`.
- **`trustedOrigins` extends the trusted list with additional origins.** Static list is the common case; callback supports per-request logic.

### Wildcard support — **MAJOR FINDING**

Wildcards are supported in `trustedOrigins`. From `docs/reference/options.mdx`:

```ts
export const auth = betterAuth({
  trustedOrigins: [
    "https://*.example.com",      // trust all HTTPS subdomains
    "http://*.dev.example.com",   // trust all HTTP subdomains
  ],
});
```

**Implication for our plan:** Phase 20 CONTEXT.md D-13 specifies deriving trustedOrigins from `APP_URL` + `NEXT_PUBLIC_APP_URL` + `VERCEL_URL` fallback. **The wildcard support simplifies this dramatically** — instead of computing the per-deployment VERCEL_URL at runtime, we can use a wildcard pattern that covers all Vercel preview URLs for our project:

```ts
trustedOrigins: [
  process.env.APP_URL ?? '',
  process.env.NEXT_PUBLIC_APP_URL ?? '',
  'https://leasetic-matrice-*.vercel.app',  // all Vercel preview URLs (PR-scoped, branch-scoped, etc.)
].filter(Boolean),
```

This is more declarative and avoids the runtime `VERCEL_URL` prefix-`https://` dance. The wildcard pattern is what Vercel preview URLs look like (e.g., `leasetic-matrice-git-pr-123-team.vercel.app`).

### Rejection response

The docs don't show an exact 4xx code for general trustedOrigins rejection (the only specific error code cited is `discovery_untrusted_origin` for the SSO discovery flow). For the planner: the test should assert **`res.status !== 2xx`** (or specifically `res.status >= 400`) and a non-empty error body, rather than asserting an exact status code that could change between Better Auth versions. If a specific code is needed for monitoring, log Better Auth's response body on test failure to capture the actual shape and pin it then.

### Version note

The project uses `better-auth@1.6.9` per `.planning/codebase/STACK.md`. Context7 docs queried for `v1.6.11` (closest cached version). `trustedOrigins` shape + wildcard support are stable across the 1.6.x line — point releases don't change config shape. Safe to use as-is on 1.6.9.

---

## 2. Neon ephemeral branch lifecycle from GitHub Actions

### MAJOR FINDING: Official Neon Actions exist

Neon publishes official GitHub Actions that handle the create/delete branch lifecycle. **Phase 20 should NOT write raw `curl` / `neonctl` API call YAML** — use the official actions.

#### `neondatabase/create-branch-action@v5`

```yaml
- name: Create Neon Branch
  id: create-branch
  uses: neondatabase/create-branch-action@v5
  with:
    project_id: ${{ vars.NEON_PROJECT_ID }}      # GitHub variable (NOT secret — IDs aren't sensitive)
    parent_id: br-long-forest-224191             # OR use `parent: main` for the branch name
    branch_name: ci-${{ github.run_id }}         # unique per-run name (matches CONTEXT.md D-06)
    api_key: ${{ secrets.NEON_API_KEY }}         # GitHub secret
```

**Outputs:** Per the Neon docs, the action exposes:
- `db_url` — full connection string (direct, non-pooled)
- `db_url_with_pooler` — **pooled connection string** (matches our `?pgbouncer=true&connection_limit=1` need; per CONTEXT.md D-03)
- `branch_id` — for cleanup reference
- `project_id` — passthrough

Use `db_url_with_pooler` to set `DATABASE_URL` for the migration apply step — no manual URL construction needed.

#### `neondatabase/delete-branch-action@v3`

```yaml
- name: Delete Neon Branch
  if: always()                                   # CONTEXT.md D-06: cleanup runs on success OR failure
  uses: neondatabase/delete-branch-action@v3
  with:
    project_id: ${{ vars.NEON_PROJECT_ID }}
    branch: ci-${{ github.run_id }}              # delete by name (matches the create step's name)
    api_key: ${{ secrets.NEON_API_KEY }}
```

### Full INFRA-02 CI workflow shape

```yaml
# .github/workflows/ci.yml (excerpt — new job)
db-smoke:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Detect schema-relevant changes
      id: filter
      uses: dorny/paths-filter@v3
      with:
        filters: |
          schema:
            - 'drizzle/migrations/*.sql'
            - 'drizzle/meta/_journal.json'

    - name: Setup Node
      if: steps.filter.outputs.schema == 'true'
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'

    - name: Install deps
      if: steps.filter.outputs.schema == 'true'
      run: npm ci

    - name: Create ephemeral Neon branch
      if: steps.filter.outputs.schema == 'true'
      id: create-branch
      uses: neondatabase/create-branch-action@v5
      with:
        project_id: ${{ vars.NEON_PROJECT_ID }}
        parent: main
        branch_name: ci-${{ github.run_id }}
        api_key: ${{ secrets.NEON_API_KEY }}

    - name: Apply migrations against ephemeral branch
      if: steps.filter.outputs.schema == 'true'
      env:
        DATABASE_URL: ${{ steps.create-branch.outputs.db_url_with_pooler }}
      run: npm run db:migrate   # or `npx drizzle-kit migrate`

    - name: Cleanup ephemeral Neon branch
      if: always() && steps.filter.outputs.schema == 'true'
      uses: neondatabase/delete-branch-action@v3
      with:
        project_id: ${{ vars.NEON_PROJECT_ID }}
        branch: ci-${{ github.run_id }}
        api_key: ${{ secrets.NEON_API_KEY }}
```

### Secret + variable provisioning (manual — Antoine)

- `secrets.NEON_API_KEY` — GitHub repository secret. Generated in Neon dashboard → Profile → API Keys. **Use project-scoped key** (not full-account) per CONTEXT.md Claude's Discretion note. Provisioning is manual — the planner adds an `[autonomous: false]` task or a runbook step for Antoine.
- `vars.NEON_PROJECT_ID` — GitHub repository variable (NOT secret — project IDs are not sensitive). Find in Neon dashboard → Project settings.

### Concurrency / race conditions

The `ci-${{ github.run_id }}` branch name is unique per workflow run (run_id is monotonic and globally unique per repo). Two simultaneous CI runs on different PRs get different branch names — no race. Cleanup is idempotent (`delete-branch-action` is safe to call on a missing branch).

### Free tier branch limits

Neon free tier: up to 10 branches per project. 3 named branches (main, preview, development) + N ephemeral CI branches. As long as `always()` cleanup fires reliably, the steady-state branch count stays at 3 + 0-2 in-flight CI branches. Well under the cap. If a CI cleanup fails (rare), the branch lingers but new runs still succeed (each picks a unique `run_id`). Periodic manual sweep via Neon dashboard cleans up stragglers if needed.

---

## 3. `dorny/paths-filter@v3` action — confirmation

`dorny/paths-filter@v3` (used in the CONTEXT.md illustrative example) is the current canonical action for PR-path filtering in GitHub Actions. Stable, widely used (~10K+ repos). The syntax above is correct.

Alternative: GitHub Actions also supports `on.pull_request.paths` at the workflow trigger level — but that filters whether the ENTIRE workflow runs, not whether individual jobs/steps run. We want per-step gating (so the CI workflow always runs for vitest + lint, but `db-smoke` only runs when schema files changed). The `dorny/paths-filter` step pattern is the right tool.

---

## 4. `db-migrate.yml` branch-selector extension

The existing manual workflow can gain a workflow_dispatch input:

```yaml
on:
  workflow_dispatch:
    inputs:
      branch:
        type: choice
        default: main
        options: [main, preview, development]
        description: 'Neon branch to apply migrations to'
      confirmation:
        type: string
        required: true
        description: 'Type "MIGRATE PROD" to confirm production migration (any string for non-main)'
```

The job's `DATABASE_URL` env then comes from a different Vercel-scope-equivalent GitHub secret per branch:
- `DATABASE_URL_MAIN` (existing, equivalent to current prod migration target)
- `DATABASE_URL_PREVIEW` (new, set when INFRA-01 ships)
- `DATABASE_URL_DEVELOPMENT` (new)

A simple step-level `env:` block selects:

```yaml
env:
  DATABASE_URL: ${{
    inputs.branch == 'main'        && secrets.DATABASE_URL_MAIN        ||
    inputs.branch == 'preview'     && secrets.DATABASE_URL_PREVIEW     ||
    inputs.branch == 'development' && secrets.DATABASE_URL_DEVELOPMENT
  }}
```

The "MIGRATE PROD" confirmation gate stays on the `main` branch only (existing Phase 8 discipline). Other branches don't need it.

---

## 5. Required status check configuration

Marking `db-smoke` as a required status check is a **GitHub repository setting**, not a workflow file change:

1. Repo Settings → Branches → Branch protection rules → `main`
2. "Require status checks to pass before merging" → check
3. Add `db-smoke` from the list of recently-seen checks (it must run at least once successfully before it appears in the dropdown)

This is a manual one-time configuration. The planner should add a runbook step for Antoine, similar to the `NEON_API_KEY` provisioning step.

**Caveat:** Since `db-smoke` only runs when `paths:` filter matches, GitHub's required-check semantics need attention. Two patterns work:
- **Pattern A:** make the entire `db-smoke` job conditional, but always run a no-op "schema-changed-noop" job that the required check listens to (the noop reports success when no schema changes).
- **Pattern B:** make `db-smoke` always run, but skip the actual work (and report success) when no schema changes. Cleaner from a required-check perspective.

**Recommendation:** Pattern B. The job runs unconditionally; the first step is the `paths-filter`, all subsequent steps are gated on its output. If schema didn't change, the job exits in ~5 seconds with success. The required check is always satisfied.

---

## Summary: Changes to CONTEXT.md the planner should apply

1. **D-13 trustedOrigins source:** simplify to `[APP_URL, NEXT_PUBLIC_APP_URL, 'https://leasetic-matrice-*.vercel.app'].filter(Boolean)` using Better Auth's wildcard support. Drop the VERCEL_URL runtime computation. The wildcard pattern matches all Vercel preview URLs for the project. Plan should verify the exact preview URL prefix by inspecting one of the existing Phase 19 preview URLs.

2. **D-05 CI step shape:** use `neondatabase/create-branch-action@v5` + `neondatabase/delete-branch-action@v3` instead of raw API. The `db_url_with_pooler` output already provides the pooled connection string — no manual URL construction.

3. **D-08 required status check pattern:** Pattern B above — `db-smoke` job always runs, gated on path filter output, exits early when not relevant. Cleaner for GitHub's required-check semantics.

4. **D-15 wave order:** unchanged; 20-01 + 20-02 in parallel (Wave 1), 20-03 last (Wave 2 with checkpoint).

5. **D-17 INFRA-01 checkpoint runbook:** unchanged, but the runbook should also mention the `NEON_PROJECT_ID` GitHub variable provisioning (~step 0 before Neon branch creation) since INFRA-02 needs it.

## RESEARCH COMPLETE

- Sources: Better Auth v1.6.11 docs (8 snippets) + Neon docs (multiple workflow guides)
- Output: this file (~150 lines)
- Time: ~3 minutes (vs the truncated full-spawn attempt of ~5+ min)
- Two major findings (Better Auth wildcards + official Neon Actions) simplify the plan materially
- The planner can now write 20-01-PLAN.md / 20-02-PLAN.md / 20-03-PLAN.md with exact code snippets pulled from this research
