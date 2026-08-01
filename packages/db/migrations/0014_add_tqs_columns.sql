ALTER TABLE "ledger_judgment" ADD COLUMN "tqs_score" integer;--> statement-breakpoint
ALTER TABLE "ledger_judgment" ADD COLUMN "tqs_tier" text;--> statement-breakpoint
ALTER TABLE "ledger_judgment" ADD COLUMN "tqs_factors" jsonb;--> statement-breakpoint
ALTER TABLE "ledger_judgment" ADD COLUMN "tqs_factor_details" jsonb;
