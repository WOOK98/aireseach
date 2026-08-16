-- AleaBit: publish attempts audit table (#141)
-- Records every publish attempt (dry-run or real) for audit trail.

CREATE TABLE IF NOT EXISTS "aleabit_publish_attempts" (
  "id" text PRIMARY KEY,
  "queue_item_id" text NOT NULL,
  "creator_id" text NOT NULL,
  "conversation_id" text NOT NULL,
  "source_post_id" text NOT NULL,
  "policy_version" integer NOT NULL,
  "rollout_mode" text NOT NULL,
  "dry_run" boolean NOT NULL DEFAULT true,
  "adapter" text NOT NULL,
  "payload_hash" text NOT NULL,
  "image_hash_zh" text NOT NULL,
  "image_hash_en" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "decision" text NOT NULL,
  "failure_stage" text,
  "external_post_id" text,
  "attempted_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_publish_attempts_queue_item"
  ON "aleabit_publish_attempts" ("queue_item_id");

CREATE INDEX IF NOT EXISTS "idx_publish_attempts_idempotency"
  ON "aleabit_publish_attempts" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "idx_publish_attempts_creator"
  ON "aleabit_publish_attempts" ("creator_id");
