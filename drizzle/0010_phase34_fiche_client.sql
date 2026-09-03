-- Plan 34-01 — Phase 34 Fiche client: the registry + shared-display tiers on
-- companies, the private tier on client_relationships, and the relationship_events
-- timeline table.
-- Per 34-01-PLAN.md task 2. This file is `npm run db:generate` output with a
-- hand-written header ONLY — unlike 0009, there is no hand-written DDL below.
-- What the header records, because the SQL cannot say it:
--   1. NO TRIGGER WRITES TIMELINE EVENTS, AND THAT IS DELIBERATE (D-15). A trigger
--      is the obvious way to append a relationship_events row on a stage change,
--      and it is the wrong way: a trigger cannot see the session, so every event it
--      wrote would carry actor_id = NULL — which in this table means "the system did
--      it" — and ACTV-02 requires the timeline to attribute a human action to the
--      human who took it. System events are written by the server actions that cause
--      them instead. The absence of a CREATE TRIGGER below is the design, not an
--      omission, and re-adding one would silently launder partner actions into
--      system events. (Same reasoning that put the Phase 33 SIREN gate in an action
--      rather than only in a trigger; the two triggers this repo does have,
--      proposals_won_requires_siren and coefficient_history_no_modify, are both
--      validators that reject writes — neither writes a row.)
--   2. The new lead-source column is "lead_source", NOT "source".
--      client_relationships.source and companies.source are the Phase 31 D-08
--      provenance markers (NULL | proposal_extraction | hubspot_import), whose
--      purpose is to let a bad bulk import be undone by deleting every row carrying
--      its value. Neither companies_source_check nor
--      client_relationships_source_check is touched by this migration, and the two
--      vocabularies must never be merged.
--   3. registry_status is NOT NULL DEFAULT 'pending', so this DDL backfills every
--      existing company to "not yet synced" in one statement. That is D-01's
--      deferred-backfill decision — there is no separate data migration and none is
--      needed.
--   4. relationship_events.actor_id is TEXT, not uuid, because users.id is a Better
--      Auth text id. It is nullable with ON DELETE SET NULL.
--   5. Additive only. Nothing here touches proposals.inputs, params_snapshot,
--      computed or schema_version — the CRM-05 / DATA-01..04 immutable snapshot
--      backing every generated PDF.
-- Applied ONLY through .github/workflows/db-migrate.yml (plan 34-04). Never locally:
-- .env.local points at a live Neon branch (D-12).
-- DO NOT EDIT BY HAND once committed — superseded by a follow-up migration if changes needed.

CREATE TABLE "relationship_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_relationship_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"actor_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationship_events_kind_check" CHECK ("relationship_events"."kind" IN ('note','stage_changed','proposal_finalized','outcome_set','registry_synced','next_action_set'))
);
--> statement-breakpoint
ALTER TABLE "client_relationships" ADD COLUMN "lead_source" text;--> statement-breakpoint
ALTER TABLE "client_relationships" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "client_relationships" ADD COLUMN "next_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client_relationships" ADD COLUMN "next_action_note" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address_line" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "legal_form" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "naf_code" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "naf_section" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "headcount_band" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "founded_on" date;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "registry_state" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "registry_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "registry_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "relationship_events" ADD CONSTRAINT "relationship_events_client_relationship_id_client_relationships_id_fk" FOREIGN KEY ("client_relationship_id") REFERENCES "public"."client_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_events" ADD CONSTRAINT "relationship_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "relationship_events_relationship_id_occurred_at_idx" ON "relationship_events" USING btree ("client_relationship_id","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX "client_relationships_owner_id_next_action_at_idx" ON "client_relationships" USING btree ("owner_id","next_action_at");--> statement-breakpoint
ALTER TABLE "client_relationships" ADD CONSTRAINT "client_relationships_lead_source_check" CHECK ("client_relationships"."lead_source" IS NULL OR "client_relationships"."lead_source" IN ('recommandation','prospection','salon','site_web','autre'));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_registry_status_check" CHECK ("companies"."registry_status" IN ('synced','pending','not_found','error'));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_registry_state_check" CHECK ("companies"."registry_state" IS NULL OR "companies"."registry_state" IN ('A','C'));