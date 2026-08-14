-- AleaBit: add creator_id to queue for multi-creator idempotency (#130)

ALTER TABLE "aleabit_queue" ADD COLUMN "creator_id" text;

-- Backfill existing rows (single-creator before this migration)
UPDATE "aleabit_queue" SET "creator_id" = 'aleabitoreddit' WHERE "creator_id" IS NULL;

ALTER TABLE "aleabit_queue" ALTER COLUMN "creator_id" SET NOT NULL;
ALTER TABLE "aleabit_queue" ALTER COLUMN "creator_id" SET DEFAULT 'aleabitoreddit';

-- Drop old unique index (conversation_id + edit_history_hash)
DROP INDEX IF EXISTS "aleabit_queue_idempotency_idx";

-- Create new unique index (creator_id + conversation_id + edit_history_hash)
CREATE UNIQUE INDEX IF NOT EXISTS "aleabit_queue_idempotency_idx"
  ON "aleabit_queue" ("creator_id", "conversation_id", "edit_history_hash");
