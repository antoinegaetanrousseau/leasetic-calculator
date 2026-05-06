CREATE TABLE "schema_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
