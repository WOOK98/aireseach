CREATE TABLE "pdf_annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"pdf_id" text NOT NULL,
	"user_id" text NOT NULL,
	"page" integer NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_pdfs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"blob_key" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"page_count" integer,
	"ticker" text,
	"report_period" text,
	"source_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pdf_annotations" ADD CONSTRAINT "pdf_annotations_pdf_id_research_pdfs_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."research_pdfs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_annotations" ADD CONSTRAINT "pdf_annotations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_pdfs" ADD CONSTRAINT "research_pdfs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pdf_annotations_pdf_page_idx" ON "pdf_annotations" USING btree ("pdf_id","page");--> statement-breakpoint
CREATE INDEX "pdf_annotations_user_idx" ON "pdf_annotations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "research_pdfs_user_created_idx" ON "research_pdfs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "research_pdfs_user_ticker_idx" ON "research_pdfs" USING btree ("user_id","ticker");