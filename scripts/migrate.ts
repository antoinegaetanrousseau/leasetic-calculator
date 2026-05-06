/**
 * Migration runner for Leasétic Matrice v1.1.
 *
 * Usage:
 *   npm run db:migrate              — applies all pending migrations
 *   npm run db:migrate:dry-run      — lists pending migrations without applying
 *   npm run db:migrate -- --dry-run — same as above
 *
 * Reads DATABASE_URL from env. Used by:
 *   - Local dev (each developer applies new migrations to their own DB)
 *   - .github/workflows/db-migrate.yml (production via DATABASE_URL_PROD secret)
 *
 * Driver choice: postgres-js (NOT @neondatabase/serverless HTTP). The Neon HTTP
 * driver is read-optimized and lacks robust DDL-in-transaction semantics. postgres-js
 * is also the OVH path, so this script works identically on both hosts.
 *
 * Per BOOT-10 + STATE.md locked decision: this script is the ONLY path through which
 * migrations apply to production. `drizzle-kit push` is forbidden in this codebase.
 */
import 'dotenv/config';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

function listMigrations(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (e) {
    console.error(`Failed to read migrations directory ${MIGRATIONS_DIR}:`, e);
    return [];
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('FATAL: DATABASE_URL is not set');
    process.exit(2);
  }

  const migrations = listMigrations();
  console.log(`Found ${migrations.length} migration file(s) in ${MIGRATIONS_DIR}:`);
  for (const f of migrations) {
    const path = join(MIGRATIONS_DIR, f);
    const size = statSync(path).size;
    console.log(`  - ${f} (${size} bytes)`);
  }

  if (migrations.length === 0) {
    console.log('No migrations to apply.');
    process.exit(0);
  }

  if (dryRun) {
    console.log('\n[dry-run] Skipping migrate() call. Set DATABASE_URL and re-run without --dry-run to apply.');
    process.exit(0);
  }

  // Mask the URL for log output (show only host, never user/password)
  try {
    const u = new URL(url);
    console.log(`\nApplying migrations to ${u.hostname} ...`);
  } catch {
    console.log('\nApplying migrations (DATABASE_URL is malformed but will be passed to postgres-js as-is) ...');
  }

  // postgres-js client. max=1 because migrations run in a single connection;
  // prepare=false for transaction-pooler compatibility (Neon pooled URL, OVH pgbouncer).
  const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log('Migrations applied successfully.');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
