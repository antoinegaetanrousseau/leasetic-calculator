-- Plan 33-01 — Phase 33 Pipeline: stage column, outcome trio, and the D-07 SIREN gate.
-- Per 33-01-PLAN.md task 2. Hand-completed on top of `npm run db:generate` output:
--   1. Appends the trigger function `proposals_won_requires_siren()` and its two
--      triggers (`proposals_won_requires_siren_ins` / `_upd`) — D-07's DB-level half
--      of "marking a proposal won requires the company to carry a SIREN" spans
--      proposals -> client_relationships -> companies.siren, and a PostgreSQL CHECK
--      constraint may only reference columns of the row being checked (no subqueries,
--      no cross-table joins). Not expressible as a CHECK, and not expressible via
--      Drizzle's schema builder either — hand-written directly, following the shape
--      of the one existing trigger precedent in this repo
--      (coefficient_history_no_modify, drizzle/0004_phase12_drafts_and_history.sql).
--      See 33-01-PLAN.md's <decision_record> for the full option analysis.
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.

ALTER TABLE "client_relationships" ADD COLUMN "stage" text DEFAULT 'prospect' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "outcome_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "outcome_reason" text;--> statement-breakpoint
CREATE INDEX "client_relationships_owner_id_stage_idx" ON "client_relationships" USING btree ("owner_id","stage");--> statement-breakpoint
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_stage_check" CHECK ("client_relationships"."stage" IN ('prospect','qualifie','proposition_envoyee','negociation','perdu','signe','debloque'));--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_outcome_check" CHECK ("proposals"."outcome" IS NULL OR "proposals"."outcome" IN ('won','lost'));--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_outcome_completeness_check" CHECK (("proposals"."outcome" IS NULL AND "proposals"."outcome_date" IS NULL AND "proposals"."outcome_reason" IS NULL) OR ("proposals"."outcome" IS NOT NULL AND "proposals"."outcome_date" IS NOT NULL));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "proposals_won_requires_siren"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  resolved_siren text;
BEGIN
  IF NEW."client_relationship_id" IS NULL THEN
    RAISE EXCEPTION 'proposals.outcome = ''won'' requires a SIREN on the owning company (PIPE-05)';
  END IF;

  SELECT "companies"."siren" INTO resolved_siren
  FROM "client_relationships"
  JOIN "companies" ON "companies"."id" = "client_relationships"."company_id"
  WHERE "client_relationships"."id" = NEW."client_relationship_id"
  FOR SHARE OF "companies";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposals.outcome = ''won'' requires a SIREN on the owning company (PIPE-05)';
  END IF;

  IF resolved_siren IS NULL THEN
    RAISE EXCEPTION 'proposals.outcome = ''won'' requires a SIREN on the owning company (PIPE-05)';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "proposals_won_requires_siren_ins" BEFORE INSERT ON "proposals" FOR EACH ROW WHEN (NEW."outcome" = 'won') EXECUTE FUNCTION "proposals_won_requires_siren"();--> statement-breakpoint
CREATE TRIGGER "proposals_won_requires_siren_upd" BEFORE UPDATE ON "proposals" FOR EACH ROW WHEN (NEW."outcome" = 'won' AND NEW."outcome" IS DISTINCT FROM OLD."outcome") EXECUTE FUNCTION "proposals_won_requires_siren"();
