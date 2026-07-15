CREATE TABLE "ledger_judgment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"report_id" text NOT NULL,
	"ticker" text NOT NULL,
	"company_name" text NOT NULL,
	"judgment" text NOT NULL,
	"key_number" text NOT NULL,
	"key_number_value" text,
	"wrong_if" text NOT NULL,
	"metric" text,
	"trigger" text,
	"tolerance" text,
	"source" text,
	"freq" text,
	"schema_version" text DEFAULT '1' NOT NULL,
	"published_at" timestamp NOT NULL,
	"check_after" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_judgment" ADD CONSTRAINT "ledger_judgment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "ledger_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"judgment_id" text NOT NULL,
	"result" text NOT NULL,
	"data_point" text,
	"evidence_url" text,
	"notes" text,
	"verified_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_verification" ADD CONSTRAINT "ledger_verification_judgment_id_ledger_judgment_id_fk" FOREIGN KEY ("judgment_id") REFERENCES "public"."ledger_judgment"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ledger_judgment_ticker_idx" ON "ledger_judgment" USING btree ("ticker");
--> statement-breakpoint
CREATE INDEX "ledger_judgment_userId_idx" ON "ledger_judgment" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "ledger_judgment_reportId_idx" ON "ledger_judgment" USING btree ("report_id");
--> statement-breakpoint
CREATE INDEX "ledger_judgment_publishedAt_idx" ON "ledger_judgment" USING btree ("published_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_judgment_report_judgment_idx" ON "ledger_judgment" USING btree ("report_id","judgment");
--> statement-breakpoint
CREATE INDEX "ledger_verification_judgmentId_idx" ON "ledger_verification" USING btree ("judgment_id");
--> statement-breakpoint
CREATE INDEX "ledger_verification_verifiedAt_idx" ON "ledger_verification" USING btree ("verified_at");
--> statement-breakpoint
CREATE INDEX "ledger_verification_result_idx" ON "ledger_verification" USING btree ("result");
