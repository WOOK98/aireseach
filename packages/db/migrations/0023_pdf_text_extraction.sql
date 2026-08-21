ALTER TABLE "research_pdfs" ADD COLUMN "extracted_text" text;--> statement-breakpoint
ALTER TABLE "research_pdfs" ADD COLUMN "extracted_at" timestamp;--> statement-breakpoint
ALTER TABLE "research_pdfs" ADD COLUMN "extraction_status" text DEFAULT 'pending' NOT NULL;