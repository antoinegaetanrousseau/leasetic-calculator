CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_params" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"commission_pct" numeric(7, 4) NOT NULL,
	"max_amount" numeric(12, 2) NOT NULL,
	"validity_days" integer NOT NULL,
	"coefficients" jsonb NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"lc_ref" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"schema_version" text DEFAULT '1.0.0' NOT NULL,
	"inputs" jsonb NOT NULL,
	"params_snapshot" jsonb NOT NULL,
	"computed" jsonb NOT NULL,
	"pdf_blob_key" text,
	"pdf_sha256" text,
	"pdf_size_bytes" integer,
	"pdf_generated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"duplicated_from_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_language_check" CHECK ("proposals"."language" IN ('fr', 'en')),
	CONSTRAINT "proposals_schema_version_check" CHECK ("proposals"."schema_version" ~ '^[0-9]+\.[0-9]+\.[0-9]+$')
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_params" ADD CONSTRAINT "global_params_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "audit_log" USING btree ("actor_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "audit_log_target_type_target_id_created_at_idx" ON "audit_log" USING btree ("target_type","target_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "global_params_effective_from_idx" ON "global_params" USING btree ("effective_from" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_user_id_idempotency_key_uq" ON "proposals" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_user_id_lc_ref_uq" ON "proposals" USING btree ("user_id","lc_ref");--> statement-breakpoint
CREATE INDEX "proposals_user_id_created_at_id_idx" ON "proposals" USING btree ("user_id","created_at" DESC,"id" DESC);--> statement-breakpoint
CREATE INDEX "proposals_deleted_at_idx" ON "proposals" USING btree ("deleted_at") WHERE "proposals"."deleted_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_duplicated_from_id_fkey"
  FOREIGN KEY ("duplicated_from_id") REFERENCES "proposals"("id") ON DELETE SET NULL;