-- Plan 31-01 — Phase 31 Reconciliation Engine & Proposal Extraction (D-08, D-09, D-10).
-- Per 31-01-PLAN.md task 2. Hand-completed on top of `npm run db:generate` output:
--   1. Appends the unordered-pair unique index `company_pair_decisions_pair_uq` on
--      (LEAST(side_a_key, side_b_key), GREATEST(side_a_key, side_b_key)) — drizzle-kit
--      cannot generate a LEAST/GREATEST expression index from a schema definition, and
--      this is the D-10 constraint that makes (A,B) and (B,A) collide.
--   2. Appends a CHECK guarding against a degenerate self-pair
--      (company_pair_decisions_distinct_sides_check) — not expressible as a Drizzle
--      column-level check across two sibling columns without a raw SQL escape hatch,
--      so added by hand alongside the unique index it protects.
--   3. Appends a partial FIFO-pending index (company_pair_decisions_pending_fifo_idx,
--      WHERE verdict IS NULL) that the review queue query plans against — narrower than
--      the generated company_pair_decisions_pending_idx, which is kept as-is.
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.
CREATE TABLE "company_pair_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"side_a_key" text NOT NULL,
	"side_b_key" text NOT NULL,
	"name_normalized" text NOT NULL,
	"reason" text NOT NULL,
	"company_a_id" uuid,
	"company_b_id" uuid,
	"verdict" text,
	"survivor_company_id" uuid,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"first_flagged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_pair_decisions_reason_check" CHECK ("company_pair_decisions"."reason" IN ('differing','one_missing','both_missing')),
	CONSTRAINT "company_pair_decisions_verdict_check" CHECK ("company_pair_decisions"."verdict" IS NULL OR "company_pair_decisions"."verdict" IN ('merged','kept_separate')),
	CONSTRAINT "company_pair_decisions_resolution_check" CHECK (("company_pair_decisions"."verdict" IS NULL AND "company_pair_decisions"."decided_by" IS NULL AND "company_pair_decisions"."decided_at" IS NULL) OR ("company_pair_decisions"."verdict" IS NOT NULL AND "company_pair_decisions"."decided_by" IS NOT NULL AND "company_pair_decisions"."decided_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "client_relationships" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "company_pair_decisions" ADD CONSTRAINT "company_pair_decisions_company_a_id_companies_id_fk" FOREIGN KEY ("company_a_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pair_decisions" ADD CONSTRAINT "company_pair_decisions_company_b_id_companies_id_fk" FOREIGN KEY ("company_b_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pair_decisions" ADD CONSTRAINT "company_pair_decisions_survivor_company_id_companies_id_fk" FOREIGN KEY ("survivor_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_pair_decisions" ADD CONSTRAINT "company_pair_decisions_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_pair_decisions_pending_idx" ON "company_pair_decisions" USING btree ("first_flagged_at","id");--> statement-breakpoint
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_source_check" CHECK ("client_relationships"."source" IS NULL OR "client_relationships"."source" IN ('proposal_extraction','hubspot_import'));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_source_check" CHECK ("companies"."source" IS NULL OR "companies"."source" IN ('proposal_extraction','hubspot_import'));--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_source_check" CHECK ("contacts"."source" IS NULL OR "contacts"."source" IN ('proposal_extraction','hubspot_import'));--> statement-breakpoint
CREATE UNIQUE INDEX "company_pair_decisions_pair_uq" ON "company_pair_decisions" USING btree (LEAST("side_a_key","side_b_key"), GREATEST("side_a_key","side_b_key"));--> statement-breakpoint
ALTER TABLE "company_pair_decisions" ADD CONSTRAINT "company_pair_decisions_distinct_sides_check" CHECK ("side_a_key" <> "side_b_key");--> statement-breakpoint
CREATE INDEX "company_pair_decisions_pending_fifo_idx" ON "company_pair_decisions" USING btree ("first_flagged_at","id") WHERE "verdict" IS NULL;