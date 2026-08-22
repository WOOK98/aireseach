CREATE TABLE "evidence_inbox" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_type" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"author" text,
	"published_at" text,
	"raw_text" text,
	"status" text DEFAULT 'inbox' NOT NULL,
	"note_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_notes" ADD COLUMN "kind" text DEFAULT 'article' NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_inbox" ADD CONSTRAINT "evidence_inbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_inbox" ADD CONSTRAINT "evidence_inbox_note_id_research_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."research_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_inbox_user_created_idx" ON "evidence_inbox" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "evidence_inbox_user_status_idx" ON "evidence_inbox" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_inbox_user_url_uniq" ON "evidence_inbox" USING btree ("user_id","url") WHERE url is not null;