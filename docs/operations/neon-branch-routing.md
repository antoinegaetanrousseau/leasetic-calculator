# Neon Branch Routing — Operations Runbook

Phase 20 (INFRA-01) split Vercel's three deployment scopes onto three isolated
Neon branches. This runbook documents the steady-state operational model:
which branch each scope reads from, how migrations fan out across branches,
how to recover a lagging branch, and the free-tier limits to stay under.

> This runbook covers **ongoing operations** after the cutover. For the
> first-time cutover steps (or future re-runs like adding a 4th branch for
> partner-tier isolation), see
> [`docs/operations/phase-20-rollout-checklist.md`](./phase-20-rollout-checklist.md).

## Locked rules

1. **One Neon branch per Vercel scope.** The 3-to-3 mapping is permanent; no
   cross-scope DB sharing without an explicit ADR.
2. **Pooled connection only.** Every `DATABASE_URL` uses the `-pooler` hostname
   suffix. Neon's pooler routes through their managed PgBouncer-equivalent;
   neither `?pgbouncer=true` nor `connection_limit=1` query params are needed
   (the `-pooler` host substitutes for those params; per D-03).
3. **Migrations fan out via the `db-migrate.yml` GitHub workflow.** No
   ad-hoc `npm run db:migrate` against a real branch; always go through the
   approved workflow path (which keeps an audit trail and respects the
   `production` GitHub Environment's required-reviewer gate for `branch=main`).
4. **No `drizzle-kit push` against any branch.** Migrations are generated +
   committed (`npm run db:generate`); applied only via the workflow.
5. **Each branch keeps its own `lc_ref` sequence.** Don't copy or restore
   data between branches; an LC reference is meaningful only in the branch
   that issued it.

## Lifecycle

| Vercel scope | Neon branch | Branch ID                       | Endpoint (host pattern)                                        |
|--------------|-------------|---------------------------------|----------------------------------------------------------------|
| Production   | `main`      | `br-frosty-poetry-ali0f4eu`     | `ep-icy-boat-alx5o1tz-pooler.c-3.eu-central-1.aws.neon.tech`     |
| Preview      | `preview`   | `br-noisy-frost-alyzvg2s`       | `ep-delicate-night-als4ogpc-pooler.c-3.eu-central-1.aws.neon.tech` |
| Development  | `development` | `br-tiny-hat-alk1dent`        | `ep-polished-band-alphc576-pooler.c-3.eu-central-1.aws.neon.tech` |

```
                    ┌─────────────────────────────────┐
                    │  Vercel project: leasetic-matrice │
                    └────────────────┬────────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
            ┌─────▼─────┐      ┌────▼─────┐      ┌────▼──────────┐
            │ Production │      │ Preview  │      │ Development   │
            │   scope    │      │   scope  │      │   scope       │
            └─────┬─────┘      └────┬─────┘      └────┬──────────┘
                  │                 │                 │
            ┌─────▼─────┐      ┌────▼─────┐      ┌────▼──────────┐
            │ Neon main │      │ Neon     │      │ Neon          │
            │  branch   │      │ preview  │      │ development   │
            │           │      │ branch   │      │ branch        │
            └───────────┘      └──────────┘      └───────────────┘
```

## Prerequisites

These were configured during the Phase 20 cutover and only need re-doing if
the GitHub repo is migrated or the Neon project is recreated:

- **Vercel side:** `DATABASE_URL` env var set on each of the three scopes,
  pointing to the matching Neon branch's pooled URL.
- **GitHub side:**
  - `Production` environment with secret `DATABASE_URL_MAIN`
  - `Preview` environment with secret `DATABASE_URL_PREVIEW`
  - `Development` environment with secret `DATABASE_URL_DEVELOPMENT`
  - Repo-level variable `NEON_PROJECT_ID = calm-wave-22626395`
  - Repo-level secret `NEON_API_KEY` (project-scoped Neon API key for CI's
    ephemeral branch creation in `ci.yml`'s `db-smoke` job)
- **Branch protection on `main`:** `db-smoke — migration apply gate` and
  `typecheck / lint / grep / test / build` are both required status checks.

## Branch creation procedure (re-do or 4th branch)

If a named branch is accidentally deleted or you need to add a 4th branch
(e.g., a tenant-specific isolation tier per the deferred ADR):

1. Open [Neon Console](https://console.neon.tech) → project `leasetic-matrice`
   → **Branches** → **New branch**.
2. Name: the lowercase scope identifier (`preview`, `development`, etc.).
3. Source: `main` (always fork from main so the new branch starts on the
   current schema).
4. Open the new branch → **Settings** → **Connection details** → enable
   "Pooled connection" → copy the URL ending in `-pooler...neon.tech/neondb?...`.
5. Add the URL to:
   - Vercel env var on the matching scope (`DATABASE_URL`)
   - GitHub Environment secret (`DATABASE_URL_<SCOPE>`)
6. Run `gh workflow run db-migrate.yml --field branch=<scope> --field confirm=""`
   to apply the latest migration set to the new branch (it starts identical
   to main; this is a no-op unless main has unmigrated SQL).

## Migration fan-out via db-migrate.yml

The `db-migrate.yml` workflow accepts a `branch` choice input
(`main | preview | development`) and routes the corresponding `DATABASE_URL_*`
secret as the connection target. The flow:

```bash
gh workflow run db-migrate.yml \
  --field branch=preview \
  --field confirm=""        # confirm phrase only required when branch=main
```

For `branch=main`, the `confirm` input must be the literal string
`MIGRATE PROD` AND the `production` GitHub Environment's required-reviewer
gate must approve. For `preview` and `development`, no confirmation phrase
and no required reviewer — the workflow runs as soon as you dispatch it.

The `production` environment's required-reviewer gate stays on `main` only
(by design — non-prod branches are isolated environments that don't need the
heavy approval flow).

## Recovery procedure (lagging branch)

If a non-main branch falls behind on migrations (e.g., a CI flake skipped
an apply, or the branch sat archived past a migration release):

1. Dispatch `db-migrate.yml` with `branch=<lagging-scope>` + `confirm=""`.
2. Approve any required-reviewer gate (only for `main`; others apply
   immediately).
3. Verify by visiting the matching Vercel deployment OR running the project's
   smoke check against that branch's pooled URL.

If the branch's data drifted from main (e.g., test inserts on `development`
that don't belong on production), use Neon's **Reset from parent** action in
the dashboard instead — this re-snapshots the branch from current `main`
(keeps the branch ID + endpoint URL stable; Vercel + GitHub config don't
need updating).

For general migration mechanics (Drizzle commands, schema generation,
journal file maintenance), see [`docs/operations/migrations.md`](./migrations.md).

## Free-tier branch limits

Neon's free tier caps at **10 branches per project**. Steady state:

- 3 named branches (`main`, `preview`, `development`)
- 0–2 ephemeral CI branches (created + deleted per PR by `ci.yml`'s
  `db-smoke` job; cleanup runs on success AND failure)
- Vercel may auto-create per-PR preview branches via their Neon integration
  (named `preview/<branch-name>`); these auto-archive after ~14 days of no
  activity and don't count against compute usage but do count against the
  branch slot limit.

If the branch count gets close to 10, periodically sweep stale branches in
the Neon dashboard (look for archived branches with no recent activity).

## Adding a 4th branch (forward-looking)

The v1.4+ "partner-tier branch" deferred ADR contemplates a 4th named
branch for high-isolation tenant data. The mechanism is identical to the
3-branch model: pick a name, fork from `main`, wire it to a corresponding
Vercel scope (Vercel supports custom branch-to-scope mappings beyond the
default 3) + a GitHub Environment + secret. The 10-branch free-tier cap
is the limiting factor; expect to upgrade to a paid Neon tier before
shipping the 4th branch.

## OVH-side equivalent (out of scope)

Phase 20 brackets the OVH-portability discipline for this feature. The OVH
equivalent of the 3-branch model is **three separate managed Postgres
instances** (one per scope) with the same `DATABASE_URL_*` per-scope routing
pattern. The migration fan-out workflow would target a different
`DATABASE_URL_*` secret per instance but otherwise stay identical. Tracked
in `<deferred>` of `.planning/phases/20-infra-hardening/20-CONTEXT.md`.

## Cross-references

- [`docs/operations/migrations.md`](./migrations.md) — general migration mechanics
- [`docs/operations/deploy-ovh.md`](./deploy-ovh.md) — OVH portability runbook (target for v1.4+ parity)
- [`docs/operations/phase-20-rollout-checklist.md`](./phase-20-rollout-checklist.md) — first-time cutover or 4th-branch addition
- [`.env.example`](../../.env.example) — DATABASE_URL placeholder + 3-branch routing comment block

---

*Runbook last updated: 2026-05-27. Phase 20 / INFRA-01 — Antoine*
