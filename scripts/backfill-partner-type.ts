/**
 * Phase 22 (PTYPE-02) — One-shot, idempotent backfill of `users.partner_type`.
 *
 * The migration adds `partner_type text NOT NULL DEFAULT 'Partenaire'`, so on a
 * standard ADD COLUMN every existing row already receives 'Partenaire' and this
 * script is a no-op. It exists as a defensive guarantee: if any account is ever
 * observed with a NULL partner_type (e.g. an out-of-band insert that bypassed
 * the default, or a column re-added without a default in a recovery scenario),
 * this script repairs them to the PTYPE-02 invariant value.
 *
 * Prerequisites:
 *   - Migration adding `users.partner_type` MUST be applied to the target DB
 *     before running this script.
 *
 * Run:
 *   # Local / preview Postgres:
 *   DATABASE_URL=postgres://... npm run db:backfill:partner-type
 *
 *   # Production Neon (gate triggers when host matches *.neon.tech):
 *   DATABASE_URL=$NEON_PROD BACKFILL_CONFIRM=YES npm run db:backfill:partner-type
 *
 * Idempotency:
 *   - Before any write, `SELECT count(*) FROM users WHERE partner_type IS NULL`.
 *     If 0, log "Already backfilled" and exit 0. Safe to re-run.
 */
import 'dotenv/config';

const REQUIRED_CONFIRM_VALUE = 'YES';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[backfill] FATAL: DATABASE_URL is not set');
    process.exit(2);
  }

  // Typed-confirmation gate: only fires for Neon production (*.neon.tech).
  //
  // bug_011: use URL.hostname (bare DNS name) NOT URL.host (which includes the
  // port). Neon's pgbouncer endpoint is on :6543 and operator-pasted connection
  // strings often include :5432; `host` for those URLs is
  // 'db.us-east.neon.tech:5432' which does NOT endsWith('.neon.tech') —
  // silently bypassing the gate. `hostname` strips the port.
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    console.error('[backfill] FATAL: DATABASE_URL is malformed');
    process.exit(2);
  }
  const isNeonProd = hostname.endsWith('.neon.tech');
  if (isNeonProd) {
    if (process.env.BACKFILL_CONFIRM !== REQUIRED_CONFIRM_VALUE) {
      console.error(
        `[backfill] FATAL: Production Neon DB detected (${hostname}). ` +
          `Re-run with BACKFILL_CONFIRM=YES to confirm.`,
      );
      process.exit(2);
    }
    console.log(`[backfill] Production Neon (${hostname}) — gate satisfied.`);
  } else {
    console.log(
      `[backfill] Non-prod DB (${hostname}) — typed-confirmation gate not enforced.`,
    );
  }

  // Lazy imports — env validation runs first.
  const { db } = await import('../src/lib/db/index');
  const { sql } = await import('drizzle-orm');
  const dbi = db();

  // postgres-js returns rows directly; @neondatabase/serverless returns { rows }.
  const unwrap = <T>(result: unknown): T[] => {
    if (Array.isArray(result)) return result as T[];
    return (result as { rows: T[] }).rows;
  };

  // Idempotency check.
  const countResult = await dbi.execute(
    sql`SELECT COUNT(*)::int AS count FROM users WHERE partner_type IS NULL`,
  );
  const nullCount = unwrap<{ count: number }>(countResult)[0]?.count ?? 0;

  if (nullCount === 0) {
    console.log('[backfill] Already backfilled — 0 users with NULL partner_type. Exiting 0.');
    process.exit(0);
  }

  console.log(
    `[backfill] Found ${nullCount} user(s) with NULL partner_type. Setting to 'Partenaire'...`,
  );

  await dbi.execute(
    sql`UPDATE users SET partner_type = 'Partenaire' WHERE partner_type IS NULL`,
  );

  console.log(`[backfill] Done. Updated ${nullCount} user(s) to 'Partenaire'.`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('[backfill] FATAL:', err);
  process.exit(1);
});
