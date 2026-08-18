CREATE TABLE "aleabit_publish_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"queue_item_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"source_post_id" text NOT NULL,
	"policy_version" integer NOT NULL,
	"rollout_mode" text NOT NULL,
	"dry_run" boolean DEFAULT true NOT NULL,
	"adapter" text NOT NULL,
	"payload_hash" text NOT NULL,
	"image_hash_zh" text NOT NULL,
	"image_hash_en" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"decision" text NOT NULL,
	"failure_stage" text,
	"external_post_id" text,
	"attempted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_publish_attempts_queue_item" ON "aleabit_publish_attempts" USING btree ("queue_item_id");--> statement-breakpoint
CREATE INDEX "idx_publish_attempts_idempotency" ON "aleabit_publish_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_publish_attempts_creator" ON "aleabit_publish_attempts" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_publish_attempts_idempotency_live" ON "aleabit_publish_attempts" USING btree ("idempotency_key") WHERE dry_run = false AND decision = 'attempted' AND external_post_id IS NOT NULL;