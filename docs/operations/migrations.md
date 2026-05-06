# Database Migrations — Operator Runbook

Leasétic Matrice v1.1 uses Drizzle ORM with versioned SQL migration files committed to git. This runbook covers:
- The full migration lifecycle (dev → review → prod)
- One-time GitHub setup (Antoine, before first prod migration)
- How to apply a migration to production
- What to do if a migration fails

## Locked rules

1. **Never `drizzle-kit generate --push` or any push variant.** Push silently mutates schemas and is forbidden in this codebase. CI grep enforces this on every PR (`scripts/check-no-drizzle-push.sh`).
2. **Migrations apply to production ONLY via `.github/workflows/db-migrate.yml`** — no Vercel auto-deploy hook, no local script run against prod.
3. **Forward-only.** v1.1 has no automated rollback. If a migration ships a bug, write a fix migration and apply it.
4. **Generate-then-commit.** All migration SQL files in `drizzle/` are reviewed in PRs before they can apply to production.

## Lifecycle: developer → production

```
(developer)                                     (CI)                          (operator: Antoine)
     │                                             │                                  │
     ├─ Edit src/db/schema.ts                      │                                  │
     ├─ npm run db:generate                        │                                  │
     │   → drizzle/{NNNN}_*.sql created            │                                  │
     ├─ Test locally: npm run db:migrate           │                                  │
     │   (against own dev DATABASE_URL)            │                                  │
     ├─ Commit src/db/schema.ts + drizzle/*        │                                  │
     ├─ Open PR                                    │                                  │
     │                                             ├─ Lint, test, build, grep gates   │
     │                                             ├─ PR review                       │
     ├─ Merge to main                              │                                  │
     │                                             │                                  ├─ Open Actions tab
     │                                             │                                  ├─ Run "DB Migrate (Production)"
     │                                             │                                  ├─ Type "MIGRATE PROD" in confirm input
     │                                             │                                  ├─ Approve in production environment
     │                                             │                                  ├─ Migration applies; review job logs
```

## One-time GitHub setup (Antoine, before first prod migration)

1. Open the repo on GitHub → **Settings** → **Environments** → **New environment**
2. Name: `production`
3. **Deployment protection rules:** check **Required reviewers**, add `antoine.rousseau` (yourself). Limit to 1 reviewer.
4. (Optional) Set a **wait timer** of 1-5 minutes if you want a "cooling off" period between approval and apply.
5. **Environment secrets** → **Add secret**:
   - Name: `DATABASE_URL_PROD`
   - Value: the production Neon connection string (from plan 05-07's Vercel/Neon provisioning — use the unpooled `DIRECT_URL` if Neon offers one, since DDL with prepared statements off needs a stable connection)
6. Save. The workflow can now find the secret only when running against the `production` environment.

Branch protection (also one-time): **Settings** → **Branches** → main → require PR review + require CI to pass before merge.

## How to apply a migration

After a PR with new files in `drizzle/` is merged to main:

1. Open the repo's **Actions** tab on GitHub
2. Select **DB Migrate (Production)** in the left sidebar
3. Click **Run workflow** in the top right
4. In the form: type `MIGRATE PROD` exactly in the confirm field
5. Click **Run workflow**
6. The `dry-run` job runs first and lists pending migration files. Review the output.
7. The `apply` job pauses on the `production` environment waiting for approval. Approve.
8. The `apply` job runs `npm run db:migrate`, which calls scripts/migrate.ts → drizzle-orm/postgres-js migrator. Logs show each migration applied.

Expected behavior on a clean prod (after the schema_meta baseline applies once): subsequent runs with no new migrations log "0 pending migrations to apply" and exit 0.

## What to do if a migration fails

1. **Don't panic.** drizzle-orm runs each migration in a transaction; a failure rolls back the partial migration. The `__drizzle_migrations` tracking table is updated only after a migration succeeds.
2. **Check the failure log** in the Actions UI. Common causes:
   - Missing column referenced by a constraint → fix the schema, generate a new migration
   - SQL dialect issue (e.g., a Postgres feature not available in the prod major version) → adjust schema and regenerate
   - Connection timeout → re-run the workflow; idempotency makes this safe
3. **Write a fix migration**. NEVER edit the failed `drizzle/{NNNN}_*.sql` file in-place after it has been committed and reviewed; instead, write a new migration that brings the schema to the desired state.
4. **Re-apply.** The drizzle migrator will skip already-applied migrations and apply only new ones.

## Why postgres-js (and not Neon HTTP)?

The Neon HTTP driver (`@neondatabase/serverless` `neon-http`) is read-optimized and lacks robust DDL-in-transaction semantics. The migration runner uses `postgres` (postgres-js) over the standard wire protocol because:
- Real DDL transactions (CREATE TABLE rolled back atomically on error)
- Same driver works against OVH managed Postgres in v1.2+ (zero code change)
- PgBouncer-compatible (`prepare: false`) so it works with Neon's pooled URL too

The application runtime (`src/lib/db/client.ts`) still uses Neon HTTP for read paths because they're cheaper and faster on Vercel's serverless functions.

## Why no rollback automation?

1. **Pretend rollback is dangerous.** A "rollback" that drops a column the app's old version still queries against breaks both versions.
2. **Forward-only matches the immutability model.** Phase 8's PDF immutability invariant (params_snapshot, schema_version) means old data must continue to render under the schema in force at its creation time. Schema versions can grow but should never shrink in a way that breaks history.
3. **For incidents:** the runbook above (write a fix migration) is faster than authoring + testing a tested rollback path.

v1.2 may add `pg-down`-style rollback files if needed, but it's a non-goal for v1.1.
