-- Plan 12-01 — schema extensions for drafts (DB-01) + invited derivation prep (DB-02) + coefficient_history append-only history (DB-03).
-- Per 12-CONTEXT.md decisions D-01..D-09, D-12..D-13, D-18.
-- DDL ONLY. The coefficient_history backfill of existing global_params rows is performed by scripts/backfill-coefficient-history.ts (plan 12-06) AFTER this migration applies.
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.

ALTER TABLE "proposals" ADD COLUMN "status" text NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_status_check" CHECK ("status" IN ('draft','active','deleted'));
--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "lc_ref" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "idempotency_key" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "params_snapshot" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "computed" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_finalized_completeness_check" CHECK ("status" = 'draft' OR ("lc_ref" IS NOT NULL AND "idempotency_key" IS NOT NULL AND "params_snapshot" IS NOT NULL AND "computed" IS NOT NULL));
--> statement-breakpoint
DROP INDEX "proposals_user_id_idempotency_key_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_user_id_idempotency_key_uq" ON "proposals" USING btree ("user_id","idempotency_key") WHERE "idempotency_key" IS NOT NULL;
--> statement-breakpoint
DROP INDEX "proposals_user_id_lc_ref_uq";
--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_user_id_lc_ref_uq" ON "proposals" USING btree ("user_id","lc_ref") WHERE "lc_ref" IS NOT NULL;
--> statement-breakpoint
UPDATE "proposals" SET "status" = 'deleted' WHERE "deleted_at" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE "coefficient_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by_user_id" text,
	"before_json" jsonb,
	"after_json" jsonb NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coefficient_history" ADD CONSTRAINT "coefficient_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "coefficient_history_changed_at_idx" ON "coefficient_history" USING btree ("changed_at" DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "coefficient_history_no_modify"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'coefficient_history is append-only — UPDATE and DELETE forbidden'; END; $$;
--> statement-breakpoint
CREATE TRIGGER "coefficient_history_no_update" BEFORE UPDATE ON "coefficient_history" FOR EACH ROW EXECUTE FUNCTION "coefficient_history_no_modify"();
--> statement-breakpoint
CREATE TRIGGER "coefficient_history_no_delete" BEFORE DELETE ON "coefficient_history" FOR EACH ROW EXECUTE FUNCTION "coefficient_history_no_modify"();
