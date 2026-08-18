CREATE TABLE "research_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"note" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"entity_ticker" text,
	"entity_name" text,
	"artifact" jsonb NOT NULL,
	"schema_version" integer NOT NULL,
	"evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"as_of" text NOT NULL,
	"source_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "research_notes_user_created_idx" ON "research_notes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "research_notes_user_ticker_idx" ON "research_notes" USING btree ("user_id","entity_ticker");