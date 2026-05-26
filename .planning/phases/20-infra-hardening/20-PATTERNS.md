# Phase 20: Infra Hardening - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 7 (3 new, 4 modified)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/auth/index.ts` (modify) | config | request-response | self (existing file) | exact |
| `src/lib/auth/trusted-origins.test.ts` (create) | test | request-response | `src/lib/auth/index.test.ts` | exact — same module, same mock conventions |
| `.github/workflows/ci.yml` (modify) | config / CI workflow | batch | self (existing file) | exact |
| `.github/workflows/db-migrate.yml` (modify) | config / CI workflow | batch | self (existing file) | exact |
| `.env.example` (modify) | config / doc | — | self (existing file, existing comment style) | exact |
| `docs/operations/neon-branch-routing.md` (create) | runbook / doc | — | `docs/operations/deploy-ovh.md` | role-match (ops runbook, same tone) |
| `docs/operations/phase-20-rollout-checklist.md` (create) | runbook / doc | — | `docs/operations/deploy-ovh.md` + `docs/operations/launch-checklist.md` | role-match |

---

## Pattern Assignments

### `src/lib/auth/index.ts` — add `trustedOrigins` (INFRA-03)

**Analog:** self — full file already read above.

**Existing resolveBaseUrl() helper** (lines 61–69) — the `trustedOrigins` computation must reuse this pattern:

```typescript
// src/lib/auth/index.ts lines 61-69
function resolveBaseUrl(): string {
  // Prefer explicit APP_URL (works in dev + OVH portability).
  // Fall back to VERCEL_URL (Vercel-injected; needs https:// prefix).
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
```

**Existing trustedOrigins stub** (line 173) — INFRA-03 replaces this single-line stub with the full list:

```typescript
// src/lib/auth/index.ts line 173 (current — to be replaced)
trustedOrigins: [resolveBaseUrl(), 'http://localhost:3000'].filter(Boolean),
```

**INFRA-03 replacement pattern** (from CONTEXT.md D-13 + RESEARCH.md §1 wildcard finding):

```typescript
// Declare before createAuth() — or inline inside betterAuth({})
const trustedOriginsList: string[] = [
  process.env.APP_URL?.trim(),
  process.env.NEXT_PUBLIC_APP_URL?.trim(),
  // Wildcard covers all Vercel preview URLs (Better Auth 1.6.x wildcard support
  // confirmed by RESEARCH.md §1). Avoids runtime VERCEL_URL prefix-https dance.
  'https://leasetic-matrice-*.vercel.app',
  // localhost always trusted for dev
  'http://localhost:3000',
].filter((v): v is string => Boolean(v));

// Inside betterAuth({}) block (replaces line 173):
trustedOrigins: trustedOriginsList,
```

**Lazy singleton pattern** (lines 184–188) — must NOT be broken; `__resetAuthForTests` export (lines 191–193) is required for tests and must stay:

```typescript
// src/lib/auth/index.ts lines 184-193
let _auth: ReturnType<typeof createAuth> | null = null;
export function auth(): ReturnType<typeof createAuth> {
  if (_auth === null) _auth = createAuth();
  return _auth;
}

/** TEST-ONLY: clear the memoized instance. */
export function __resetAuthForTests(): void {
  _auth = null;
}
```

---

### `src/lib/auth/trusted-origins.test.ts` — new Vitest test (INFRA-03)

**Analog:** `src/lib/auth/index.test.ts` (same directory, same module conventions)

**Imports + server-only mock pattern** (lines 1–4 of analog):

```typescript
// src/lib/auth/index.test.ts lines 1-4
import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only throws in non-Next.js (Vitest) context — mock it to a no-op
vi.mock('server-only', () => ({}));
```

**DB mock pattern** (lines 30–38 of analog) — `trusted-origins.test.ts` needs a minimal db mock to allow `auth()` instantiation:

```typescript
// src/lib/auth/index.test.ts lines 30-38
vi.mock('@/lib/db', () => ({
  db: () => fakeDb,
  schema: {
    users: {
      id: 'id',
      lastLoginAt: 'last_login_at',
    },
  },
}));
```

**beforeEach reset pattern** (lines 42–46 of analog) — use `__resetAuthForTests()` to clear singleton between env-var tests:

```typescript
// src/lib/auth/index.test.ts lines 42-46
beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  shouldReject = false;
});
```

**Test shape for INFRA-03** — the new test file should follow this structure (derived from D-13, RESEARCH.md §1, and the mock conventions above). The test cannot issue a real HTTP request against `/api/auth/sign-in/*` in Vitest jsdom; instead it tests the `trustedOriginsList` derivation directly at the config level (approach B — cheaper unit-level, still validates the logic):

```typescript
// src/lib/auth/trusted-origins.test.ts — target shape
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  db: () => ({ /* minimal stub — drizzleAdapter needs db() */ }),
  schema: {},
}));

import { __resetAuthForTests } from './index';

afterEach(() => {
  __resetAuthForTests();
  vi.unstubAllEnvs();
});

describe('trustedOrigins derivation', () => {
  it('includes APP_URL when set', () => { /* ... */ });
  it('includes NEXT_PUBLIC_APP_URL when set', () => { /* ... */ });
  it('always includes wildcard preview pattern', () => { /* ... */ });
  it('always includes http://localhost:3000', () => { /* ... */ });
  it('excludes undefined env vars (no falsy strings in list)', () => { /* ... */ });
  it('VERCEL_URL fallback: when APP_URL is unset, resolveBaseUrl uses VERCEL_URL', () => { /* ... */ });
});
```

Note: `vi.stubEnv()` / `vi.unstubAllEnvs()` (Vitest 2.x) is the correct way to mutate `process.env` per-test without leaking across tests. Do NOT use `process.env.X = ...` directly.

---

### `.github/workflows/ci.yml` — add `db-smoke` job (INFRA-02)

**Analog:** self — full file already read above.

**Existing job header pattern** (lines 18–22) — mirror for the new `db-smoke` job:

```yaml
# .github/workflows/ci.yml lines 18-22
jobs:
  build-test:
    name: typecheck / lint / grep / test / build
    runs-on: ubuntu-24.04
    timeout-minutes: 10
```

**Existing checkout + Node setup steps** (lines 23–36) — copy verbatim into `db-smoke`; same node-version, same cache, same `persist-credentials: false`:

```yaml
# .github/workflows/ci.yml lines 23-36
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies (clean install from lockfile)
        run: npm ci
```

**INFRA-02 new job pattern** (from RESEARCH.md §2 + CONTEXT.md D-05/06/07/08, Pattern B):

```yaml
# .github/workflows/ci.yml — append after build-test job
  db-smoke:
    name: db-smoke — migration apply gate
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    # Pattern B (RESEARCH.md §5): job always runs so the required status check
    # is always satisfied. Internal steps are gated on the paths-filter output.
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Detect schema-relevant changes
        id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            schema:
              - 'drizzle/migrations/*.sql'
              - 'drizzle/meta/_journal.json'

      - name: Setup Node.js
        if: steps.filter.outputs.schema == 'true'
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
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
        run: npm run db:migrate

      - name: Cleanup ephemeral Neon branch
        # always() ensures cleanup fires on success AND failure (D-06)
        if: always() && steps.filter.outputs.schema == 'true'
        uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          branch: ci-${{ github.run_id }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

**Required permissions note:** The existing workflow has `permissions: contents: read` (line 14). The Neon actions only call the Neon REST API (external), so no additional GitHub token permissions are needed.

---

### `.github/workflows/db-migrate.yml` — add branch-selector input (INFRA-01)

**Analog:** self — full file already read above.

**Existing `workflow_dispatch` inputs block** (lines 6–11) — extend with `branch` input:

```yaml
# .github/workflows/db-migrate.yml lines 5-11 (current)
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "MIGRATE PROD" exactly to confirm you intend to apply migrations to production'
        required: true
        type: string
```

**INFRA-01 extended inputs pattern** (from RESEARCH.md §4 + CONTEXT.md D-01):

```yaml
# .github/workflows/db-migrate.yml — replace the on: block
on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'Neon branch to apply migrations to'
        type: choice
        default: main
        options:
          - main
          - preview
          - development
      confirm:
        description: 'Type "MIGRATE PROD" to confirm (required for main; any string for preview/development)'
        required: true
        type: string
```

**Existing `apply` job DATABASE_URL wiring** (lines 84–95) — current pattern reads from `secrets.DATABASE_URL_PROD`; INFRA-01 adds per-branch secret selection:

```yaml
# .github/workflows/db-migrate.yml lines 84-95 (current apply step)
      - name: Apply migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo "ERROR: DATABASE_URL_PROD secret is not set on the 'production' environment."
            exit 2
          fi
          npm run db:migrate
```

**INFRA-01 parameterized DATABASE_URL pattern** (from RESEARCH.md §4):

```yaml
# Replace the apply step env block:
      - name: Apply migrations
        env:
          DATABASE_URL: ${{
            inputs.branch == 'main'        && secrets.DATABASE_URL_MAIN        ||
            inputs.branch == 'preview'     && secrets.DATABASE_URL_PREVIEW     ||
            inputs.branch == 'development' && secrets.DATABASE_URL_DEVELOPMENT
          }}
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo "ERROR: DATABASE_URL secret for branch '${{ inputs.branch }}' is not set."
            exit 2
          fi
          npm run db:migrate
```

**Confirmation gate pattern** — keep the existing `Verify confirmation phrase` step in `dry-run` job unchanged; it already uses `env:` injection to avoid shell interpolation (lines 36–44), which is the correct security pattern to preserve.

**Rename secret note:** `DATABASE_URL_PROD` (existing) should be aliased or renamed to `DATABASE_URL_MAIN` for consistency with the new naming scheme. The `production` GitHub Environment keeps its existing required-reviewer protection.

---

### `.env.example` — add branch-routing comments (INFRA-01)

**Analog:** self — full file already read above.

**Existing comment style for multi-scope env vars** (lines 1–6 and 44–53) — the INFRA-01 addition must match this exact style: `# Comment: explanation. Scope-specific callouts inline.`

```bash
# .env.example lines 1-6 (existing Vercel wiring comment style)
# === Vercel + Neon production wiring (plan 05-07) ===
# In Vercel Project Settings → Environment Variables, set per-scope (Production / Preview / Development):
#   STORAGE_DRIVER=vercel
#   BLOB_READ_WRITE_TOKEN=<auto-injected when you connect a Blob store via Vercel UI>
#   DATABASE_URL=<Neon connection string for the matching branch — use ?pgbouncer=true&connection_limit=1>
```

```bash
# .env.example lines 12-19 (existing DATABASE_URL block to extend)
# === Database (BOOT-03, BOOT-09) ===
# Postgres connection string. Plan 07 wires Neon (Vercel side).
# Driver is selected automatically by host pattern:
#   - *.neon.tech / *.neon.build → @neondatabase/serverless (HTTP, stateless)
#   - anything else (OVH managed PG, localhost, etc.) → postgres-js (TCP, pooled, max=1 per function)
# Migrations: ONLY apply via `npm run db:generate` (writes versioned SQL to drizzle/) +
# the prod GitHub Action (plan 05-06). NEVER `drizzle-kit push` against a real DB.
DATABASE_URL=postgres://user:pass@host:5432/db
```

**INFRA-01 addition pattern** — insert extended comment block immediately after line 19:

```bash
# Phase 20 (INFRA-01): 3-branch Neon split. Each Vercel scope routes to its own branch.
#   Production  (Vercel prod scope):    pooled endpoint of the `main` Neon branch
#   Preview     (Vercel preview scope): pooled endpoint of the `preview` Neon branch
#   Development (Vercel dev scope):     pooled endpoint of the `development` Neon branch
#   Local dev:  use either `development` branch or a local Postgres instance
# All 3 branches use ?pgbouncer=true&connection_limit=1 (D-03).
# Example format: postgresql://USER:PASS@ep-XXXX-YYYY.us-east-2.aws.neon.tech/neondb?pgbouncer=true&connection_limit=1
# Branch cutover runbook: docs/operations/neon-branch-routing.md
DATABASE_URL=postgres://user:pass@host:5432/db
```

Note: the existing `DATABASE_URL=postgres://user:pass@host:5432/db` placeholder line stays; the new comment block replaces the equivalent comment lines above it (keep the line, extend the comment).

---

### `docs/operations/neon-branch-routing.md` — new ops runbook (INFRA-01)

**Analog:** `docs/operations/deploy-ovh.md`

**Tone and structure pattern** (lines 1–45 of analog):

- H1 title with subtitle dash and milestone reference
- Short 1–2 sentence framing paragraph (what problem this solves, when it applies)
- `## Locked rules` section with numbered constraints (bold term + explanation)
- `## Lifecycle` section with ASCII diagram or table showing before/after state
- `## Prerequisites` section listing manual one-time setup steps
- Inline code blocks for commands (bash) and env var values
- Cross-references to related runbooks with backtick paths: `docs/operations/migrations.md`

**Content to cover** (from CONTEXT.md D-04):
1. 3-branch-to-3-scope mapping (main→prod, preview→preview, development→dev)
2. Branch creation procedure (one-time snapshot from `main`)
3. `db-migrate.yml` fan-out semantics (branch input + per-branch secrets)
4. Recovery procedure if a branch falls behind (re-apply migrations via fan-out workflow)
5. Free-tier branch limits note (10 branches; 3 named + ephemeral CI = safe headroom)

---

### `docs/operations/phase-20-rollout-checklist.md` — INFRA-01 cutover runbook (INFRA-01)

**Analog:** `docs/operations/launch-checklist.md` (checklist style) + `docs/operations/deploy-ovh.md` (tone)

**Checklist style pattern** — each step is a numbered action with:
- Bold step title
- Numbered sub-steps for clicks/commands
- Inline code for exact values (`MIGRATE PROD`, env var names)
- Verification step at the end of each phase (smoke check before proceeding)

**Content to cover** (from CONTEXT.md D-17 checkpoint runbook):
1. Pre-step: provision `NEON_PROJECT_ID` GitHub variable + `NEON_API_KEY` GitHub secret
2. Create `preview` Neon branch from `main` (Neon dashboard clicks)
3. Create `development` Neon branch from `main`
4. Vercel env var edits in order: Development → Preview → Production (each with verify smoke check)
5. Add `DATABASE_URL_PREVIEW` + `DATABASE_URL_DEVELOPMENT` GitHub Environment secrets
6. Rename/add `DATABASE_URL_MAIN` alongside existing `DATABASE_URL_PROD`
7. Configure `db-smoke` as required status check in GitHub branch protection
8. Verify production scope last

---

## Shared Patterns

### `server-only` mock (all auth-adjacent tests)

**Source:** `src/lib/auth/index.test.ts` line 4, `src/lib/auth/require.test.ts` line 4
**Apply to:** `src/lib/auth/trusted-origins.test.ts`

```typescript
// Must appear before any import that transitively imports 'server-only'
vi.mock('server-only', () => ({}));
```

### `vi.stubEnv` for process.env mutation in tests

**Source:** Vitest 2.x API (project uses Vitest 2.1.8 per STACK.md)
**Apply to:** `src/lib/auth/trusted-origins.test.ts`

```typescript
// Preferred over direct process.env mutation — automatically restored by vi.unstubAllEnvs()
vi.stubEnv('APP_URL', 'https://leasetic-matrice.vercel.app');
// In afterEach:
vi.unstubAllEnvs();
```

### GitHub Actions Node + checkout step block

**Source:** `.github/workflows/ci.yml` lines 23–36, `.github/workflows/db-migrate.yml` lines 29–51
**Apply to:** `db-smoke` job in `ci.yml`

```yaml
      - name: Checkout
        uses: actions/checkout@v4
        with:
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
```

### `env:` injection for secret inputs in shell steps

**Source:** `.github/workflows/db-migrate.yml` lines 36–43 (confirm phrase verification)
**Apply to:** any step in `db-migrate.yml` that interpolates user input into shell

```yaml
      - name: Verify confirmation phrase
        env:
          CONFIRM_INPUT: ${{ github.event.inputs.confirm }}
        run: |
          if [ "$CONFIRM_INPUT" != "MIGRATE PROD" ]; then
            echo "ERROR: ..."
            exit 1
          fi
```

### Ops runbook section ordering

**Source:** `docs/operations/deploy-ovh.md` lines 1–60
**Apply to:** `docs/operations/neon-branch-routing.md`, `docs/operations/phase-20-rollout-checklist.md`

Section order: title → framing paragraph → Locked rules → Lifecycle diagram → Prerequisites → Step-by-step procedure → Verification → Recovery

---

## No Analog Found

None. All 7 files have direct analogs in the codebase.

---

## Metadata

**Analog search scope:** `src/lib/auth/`, `app/api/proposals/`, `.github/workflows/`, `docs/operations/`, `.env.example`
**Files scanned:** 10 (7 target files + 3 analog reads)
**Pattern extraction date:** 2026-05-26
