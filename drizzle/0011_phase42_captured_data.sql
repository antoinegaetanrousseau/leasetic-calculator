-- Plan 42-02 — Phase 42 Captured Data: users.telephone, users.company_telephone
-- and the leasetic_advisor singleton table.
-- The DDL body below is `drizzle-kit generate` output and must never be
-- hand-edited; only this header comment block and the trailing seed INSERT are
-- hand-added. The trailing INSERT is a hand-added seed following the
-- `0003_seed_global_params.sql` precedent (idempotent guard, no data churn on
-- replay).
-- What the header records, because the SQL cannot say it:
--   1. leasetic_advisor is a single-row settings table read live at proposal-render
--      time (D-09) and deliberately NOT append-only like global_params (D-08).
--      There is exactly one row, at the fixed id seeded below, and every future
--      admin save UPDATEs that row in place — it is never INSERTed again.
--   2. Both new `users` columns (company_telephone, telephone) are nullable, so
--      every existing account is unaffected. Neither carries a CHECK constraint —
--      phone shape is validated at the Zod layer (optionalPhoneSchema), not the DB.
-- Applied ONLY through .github/workflows/db-migrate.yml (MIGRATE PROD). Never
-- locally: .env.local resolves to the production Neon branch (see
-- docs/operations/migrations.md).
-- DO NOT EDIT THE DDL BY HAND once committed — superseded by a follow-up
-- migration if changes are needed.

CREATE TABLE "leasetic_advisor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"fonction" text,
	"telephone" text,
	"email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_telephone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telephone" text;--> statement-breakpoint
ALTER TABLE "leasetic_advisor" ADD CONSTRAINT "leasetic_advisor_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Seed the single leasetic_advisor row (D-07/D-08) at a fixed literal id. The
-- four content columns are left NULL — an admin fills them via Plan 42-06's
-- screen. ON CONFLICT DO NOTHING makes replay a no-op, matching 0003's
-- defence-in-depth rationale.
INSERT INTO "leasetic_advisor" ("id") VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT ("id") DO NOTHING;
