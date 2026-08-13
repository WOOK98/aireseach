-- AleaBit review queue persistence + audit log (#127)

CREATE TABLE IF NOT EXISTS "aleabit_queue" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL,
  "edit_history_hash" text NOT NULL,
  "trigger_post" jsonb NOT NULL,
  "category" text,
  "classification" jsonb,
  "entity" jsonb,
  "evidence_gate" jsonb,
  "brief" jsonb,
  "rendered_html" text,
  "rendered_artifact_hash" text,
  "status" text NOT NULL DEFAULT 'detected',
  "skip_reason" text,
  "failure_reason" text,
  "version" text NOT NULL DEFAULT '1',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Idempotency: same conversation + same edit history = one item
CREATE UNIQUE INDEX IF NOT EXISTS "aleabit_queue_idempotency_idx"
  ON "aleabit_queue" ("conversation_id", "edit_history_hash");

CREATE INDEX IF NOT EXISTS "aleabit_queue_status_idx"
  ON "aleabit_queue" ("status");

CREATE INDEX IF NOT EXISTS "aleabit_queue_conversation_id_idx"
  ON "aleabit_queue" ("conversation_id");

CREATE INDEX IF NOT EXISTS "aleabit_queue_created_at_idx"
  ON "aleabit_queue" ("created_at");

-- Audit log: immutable record of every status transition
CREATE TABLE IF NOT EXISTS "aleabit_audit_log" (
  "id" text PRIMARY KEY NOT NULL,
  "item_id" text NOT NULL,
  "from_status" text NOT NULL,
  "to_status" text NOT NULL,
  "reason" text,
  "actor_id" text,
  "actor_type" text NOT NULL DEFAULT 'system',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "aleabit_audit_log_item_id_idx"
  ON "aleabit_audit_log" ("item_id");

CREATE INDEX IF NOT EXISTS "aleabit_audit_log_created_at_idx"
  ON "aleabit_audit_log" ("created_at");

CREATE INDEX IF NOT EXISTS "aleabit_audit_log_to_status_idx"
  ON "aleabit_audit_log" ("to_status");
