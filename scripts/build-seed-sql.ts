#!/usr/bin/env tsx
/**
 * Generates drizzle/0003_seed_global_params.sql from src/lib/calc/seed-params.ts.
 *
 * D-D1: Phase 7's seedParams constant is the SINGLE SOURCE OF TRUTH for the
 * coefficient table + commission + max amount. Hand-editing the SQL is
 * forbidden; instead, edit seed-params.ts then re-run this script.
 *
 * Usage:
 *   npm run build:seed-sql            → writes the SQL file
 *   npm run build:seed-sql -- --check → exits 1 if SQL would change (CI guard)
 *
 * The generated SQL is idempotent: it uses a NOT EXISTS guard so re-applying
 * the migration is a no-op. Drizzle's migrate runner runs each numbered SQL
 * file in order; running twice would normally produce a duplicate INSERT,
 * but the guard collapses it to zero rows.
 *
 * NOTE: drizzle-kit's migration runner tracks applied migrations in its own
 * `__drizzle_migrations` table — re-applying drizzle/0003_*.sql is normally
 * blocked at that layer. The NOT EXISTS guard is defence-in-depth in case the
 * file is ever re-run via direct psql or a migration-replay scenario (Neon
 * branch reset).
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { seedParams } from '../src/lib/calc/seed-params';

const OUTPUT_PATH = join(process.cwd(), 'drizzle', '0003_seed_global_params.sql');

function buildSql(): string {
  // numeric(7,4) commission_pct: '5' → '5.0000' literal-form for Postgres
  const commissionPct = seedParams.commissionPct.toFixed(4);
  // numeric(12,2) max_amount: 500000 → '500000.00'
  const maxAmount = seedParams.maxAmount.toFixed(2);
  const validityDays = 30; // v10 baseline (Phase 7 D-7-05)

  const coefficientsJson = JSON.stringify(seedParams.coefficients);
  // Postgres jsonb literal: single-quoted JSON string with single-quote escaping.
  // Pg-jsonb only requires '' to escape an apostrophe; our coefficients are
  // pure digits + dots so no escape needed. Belt + suspenders: replace ' with ''.
  const coefficientsLiteral = coefficientsJson.replace(/'/g, "''");

  const sql = `-- Plan 08-04 — seed global_params (DATA-12).
-- Source of truth: src/lib/calc/seed-params.ts (D-D1, Phase 7).
-- Regenerate via: npm run build:seed-sql
-- Idempotent guard: NOT EXISTS prevents duplicate seed rows on replay.
-- See 08-CONTEXT.md D-D1 + REQUIREMENTS.md DATA-12.
-- DO NOT EDIT BY HAND — re-run the generator after editing seed-params.ts.

INSERT INTO "global_params" (
  "commission_pct",
  "max_amount",
  "validity_days",
  "coefficients",
  "note"
)
SELECT
  ${commissionPct}::numeric(7,4),
  ${maxAmount}::numeric(12,2),
  ${validityDays}::integer,
  '${coefficientsLiteral}'::jsonb,
  'Phase 8 seed (D-D1 placeholder; edit via Phase 9 admin before partner onboarding).'
WHERE NOT EXISTS (SELECT 1 FROM "global_params");
`;

  return sql;
}

function main() {
  const flag = process.argv[2];
  const sql = buildSql();

  if (flag === '--check') {
    if (!existsSync(OUTPUT_PATH)) {
      console.error(`[build-seed-sql] FAIL: ${OUTPUT_PATH} does not exist. Run 'npm run build:seed-sql' to create it.`);
      process.exit(1);
    }
    const onDisk = readFileSync(OUTPUT_PATH, 'utf8');
    if (onDisk.trim() !== sql.trim()) {
      console.error(`[build-seed-sql] FAIL: ${OUTPUT_PATH} is out of sync with src/lib/calc/seed-params.ts. Run 'npm run build:seed-sql'.`);
      process.exit(1);
    }
    console.log(`[build-seed-sql] OK: ${OUTPUT_PATH} is in sync.`);
    return;
  }

  writeFileSync(OUTPUT_PATH, sql, 'utf8');
  console.log(`[build-seed-sql] wrote ${OUTPUT_PATH} (${sql.length} bytes).`);
}

main();
