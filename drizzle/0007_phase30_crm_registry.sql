-- Plan 30-01 — Phase 30 Company & Contact Registry (CRM-01, CRM-04, CRM-05, CRM-08, ROLE-01).
-- Per 30-01-PLAN.md task 2. Hand-completed on top of `npm run db:generate` output:
--   1. Prepends the leasetic_normalize_company_name() function (must exist before
--      CREATE TABLE "companies", whose name_normalized column is GENERATED ALWAYS AS it).
--   2. Re-adds users_role_check with 'sales' BEFORE the backfill UPDATE that depends on it.
--   3. Appends the Commercial -> sales backfill UPDATE (ROLE-01/03) after the CHECK re-add.
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.
CREATE OR REPLACE FUNCTION leasetic_normalize_company_name(input text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          ' ' || regexp_replace(
            replace(
              translate(lower(input), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
              '.', ''
            ),
            '[^a-z0-9]+', ' ', 'g'
          ) || ' ',
          ' (sarl|sasu|sas|sa|eurl|sci|snc|scop) ', ' ', 'g'
        ),
        ' (sarl|sasu|sas|sa|eurl|sci|snc|scop) ', ' ', 'g'
      ),
      ' +', ' ', 'g'
    )
  )
$$;
--> statement-breakpoint
CREATE TABLE "client_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_normalized" text GENERATED ALWAYS AS (leasetic_normalize_company_name(name)) STORED NOT NULL,
	"siren" text,
	"contract_tool_customer_id" text,
	"synced_at" timestamp with time zone,
	"hubspot_company_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_siren_unique" UNIQUE("siren"),
	CONSTRAINT "companies_siren_check" CHECK ("companies"."siren" IS NULL OR "companies"."siren" ~ '^[0-9]{9}$')
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_relationship_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"phone" text,
	"email" text,
	"hubspot_contact_id" text,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_role_check";--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "client_relationship_id" uuid;--> statement-breakpoint
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_relationship_id_client_relationships_id_fk" FOREIGN KEY ("client_relationship_id") REFERENCES "public"."client_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_relationships_company_id_owner_id_uq" ON "client_relationships" USING btree ("company_id","owner_id");--> statement-breakpoint
CREATE INDEX "client_relationships_owner_id_created_at_id_idx" ON "client_relationships" USING btree ("owner_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "client_relationships_company_id_idx" ON "client_relationships" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "companies_name_normalized_idx" ON "companies" USING btree ("name_normalized");--> statement-breakpoint
CREATE INDEX "companies_created_at_id_idx" ON "companies" USING btree ("created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "companies_hubspot_company_id_uq" ON "companies" USING btree ("hubspot_company_id") WHERE "companies"."hubspot_company_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "contacts_client_relationship_id_created_at_idx" ON "contacts" USING btree ("client_relationship_id","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_hubspot_contact_id_uq" ON "contacts" USING btree ("hubspot_contact_id") WHERE "contacts"."hubspot_contact_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_relationship_id_client_relationships_id_fk" FOREIGN KEY ("client_relationship_id") REFERENCES "public"."client_relationships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposals_client_relationship_id_created_at_idx" ON "proposals" USING btree ("client_relationship_id","created_at" DESC);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" IN ('partner', 'admin', 'sales'));
--> statement-breakpoint
UPDATE "users" SET "role" = 'sales' WHERE "partner_type" = 'Commercial' AND "role" = 'partner';
