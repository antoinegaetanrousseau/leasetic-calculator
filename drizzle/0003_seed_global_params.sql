-- Plan 08-04 — seed global_params (DATA-12).
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
  5.0000::numeric(7,4),
  500000.00::numeric(12,2),
  30::integer,
  '{"t1":{"36":"3.0000","48":"2.3000","60":"1.8765"},"t2":{"36":"2.9000","48":"2.2500","60":"1.8500"},"t3":{"36":"2.8000","48":"2.2000","60":"1.8000"},"t4":{"36":"2.7000","48":"2.1500","60":"1.7500"}}'::jsonb,
  'Phase 8 seed (D-D1 placeholder; edit via Phase 9 admin before partner onboarding).'
WHERE NOT EXISTS (SELECT 1 FROM "global_params");
