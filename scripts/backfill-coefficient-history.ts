/**
 * Phase 12 — One-shot, idempotent backfill of `coefficient_history` from
 * existing `global_params` rows.
 *
 * Per `.planning/phases/12-schema-extensions-for-drafts-history/12-CONTEXT.md`
 * decisions D-14 and D-15. Without this script, the Phase 14 History sidebar
 * would render only post-launch coefficient edits — the pre-launch
 * `global_params` history (seed + any v1.1 edits) would be invisible.
 *
 * Prerequisites:
 *   - Migration `drizzle/0004_phase12_drafts_and_history.sql` MUST be applied
 *     to the target DB before running this script (it creates the
 *     `coefficient_history` table + append-only trigger).
 *
 * Run:
 *   # Local / preview Postgres:
 *   DATABASE_URL=postgres://... npm run db:backfill:coefficient-history
 *
 *   # Production Neon (gate triggers when host matches *.neon.tech):
 *   DATABASE_URL=$NEON_PROD BACKFILL_CONFIRM=YES npm run db:backfill:coefficient-history
 *
 * Idempotency (D-15):
 *   - Before any insert, `SELECT count(*) FROM coefficient_history`. If > 0,
 *     exit 0 with "Already backfilled — N rows exist" message. Safe to re-run.
 *
 * Partial-failure recovery:
 *   If a backfill aborts mid-run (network drop, etc.), the next run sees a
 *   non-empty `coefficient_history` and refuses. To force a fresh backfill,
 *   manually clean the table via psql with triggers disabled:
 *     ALTER TABLE coefficient_history DISABLE TRIGGER ALL;
 *     DELETE FROM coefficient_history;
 *     ALTER TABLE coefficient_history ENABLE TRIGGER ALL;
 *   then re-run this script.
 *
 * Auto-summary:
 *   - First row (seed): `before = null` → generateDiffSummary returns
 *     `"Configuration initiale"`.
 *   - Subsequent rows: `before = previous row's snapshot` → semicolon-joined
 *     FR diff, e.g. `"Commission: 5.0000% → 5.5000%"`.
 */
import 'dotenv/config';

const REQUIRED_CONFIRM_VALUE = 'YES';

interface GlobalParamsRowLite {
  id: string;
  effectiveFrom: Date;
  createdBy: string | null;
  commissionPct: string;
  maxAmount: string;
  validityDays: number;
  coefficients: {
    t1: { '36': string; '48': string; '60': string };
    t2: { '36': string; '48': string; '60': string };
    t3: { '36': string; '48': string; '60': string };
    t4: { '36': string; '48': string; '60': string };
  };
}

function extractSnapshot(row: GlobalParamsRowLite): {
  commissionPct: string;
  maxAmount: string;
  validityDays: number;
  coefficients: GlobalParamsRowLite['coefficients'];
} {
  return {
    commissionPct: row.commissionPct,
    maxAmount: row.maxAmount,
    validityDays: row.validityDays,
    coefficients: row.coefficients,
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[backfill] FATAL: DATABASE_URL is not set');
    process.exit(2);
  }

  // Typed-confirmation gate: only fires for Neon production (*.neon.tech).
  let host: string;
  try {
    host = new URL(databaseUrl).host;
  } catch {
    console.error('[backfill] FATAL: DATABASE_URL is malformed');
    process.exit(2);
  }
  const isNeonProd = host.endsWith('.neon.tech');
  if (isNeonProd) {
    if (process.env.BACKFILL_CONFIRM !== REQUIRED_CONFIRM_VALUE) {
      console.error(
        `[backfill] FATAL: Production Neon DB detected (${host}). ` +
          `Re-run with BACKFILL_CONFIRM=YES to confirm.`,
      );
      process.exit(2);
    }
    console.log(`[backfill] Production Neon (${host}) — gate satisfied.`);
  } else {
    console.log(
      `[backfill] Non-prod DB (${host}) — typed-confirmation gate not enforced.`,
    );
  }

  // Lazy imports — env validation runs first.
  const { db, schema } = await import('../src/lib/db/index');
  const dbi = db();

  // Idempotency check (D-15).
  const countRows = (await dbi
    .select()
    .from(schema.coefficientHistory)
    .limit(1)) as unknown[];
  if (countRows.length > 0) {
    // Use a SQL count for the exact number.
    const { sql } = await import('drizzle-orm');
    const result = (await dbi.execute(
      sql`SELECT COUNT(*)::int AS count FROM coefficient_history`,
    )) as unknown as Array<{ count: number }> | { rows: Array<{ count: number }> };
    // postgres-js returns rows directly; @neondatabase/serverless returns { rows }.
    const rows = Array.isArray(result) ? result : result.rows;
    const n = rows[0]?.count ?? 0;
    console.log(`[backfill] Already backfilled — ${n} rows exist. Exiting 0.`);
    process.exit(0);
  }

  const { createCoefficientHistoryEntry } = await import(
    '../src/lib/db/queries/coefficient-history'
  );

  // Read all global_params rows ordered by effective_from ASC.
  const allRows = (await dbi
    .select()
    .from(schema.globalParams)
    .orderBy(schema.globalParams.effectiveFrom)) as unknown as GlobalParamsRowLite[];

  if (allRows.length === 0) {
    console.log('[backfill] No global_params rows exist — nothing to backfill.');
    process.exit(0);
  }

  console.log(`[backfill] Found ${allRows.length} global_params row(s). Inserting...`);

  let inserted = 0;
  for (let i = 0; i < allRows.length; i++) {
    const current = allRows[i];
    const before = i === 0 ? null : extractSnapshot(allRows[i - 1]);
    const after = extractSnapshot(current);
    const userId = current.createdBy ?? null;
    const result = await createCoefficientHistoryEntry({
      before,
      after,
      userId,
      summary: undefined,
      // bug_003: preserve the original global_params.effective_from as the
      // history row's changed_at so chronology survives backfill. Without
      // this, the schema's defaultNow() would cluster every row at backfill
      // execution time and the Phase 14 History sidebar's ORDER BY changed_at
      // DESC would render pre-launch history as one simultaneous moment.
      // The append-only trigger blocks any post-hoc UPDATE fix.
      changedAt: current.effectiveFrom,
    });
    inserted++;
    console.log(
      `[backfill] + inserted history row for global_params id=${current.id} ` +
        `changed_at=${current.effectiveFrom.toISOString()} ` +
        `summary="${result.summary}"`,
    );
  }

  console.log(`[backfill] Done. Inserted ${inserted} rows.`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('[backfill] FATAL:', err);
  process.exit(1);
});
