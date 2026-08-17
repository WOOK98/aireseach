-- AleaBit: publish idempotency reservation guard (#141, #142)
-- Ensures only one non-dry-run request per idempotency key can be
-- "in flight" at a time. Prevents the race where two concurrent
-- requests both pass checkIdempotency() and both call the real X adapter.

-- Partial unique index: at most one non-dry-run row per idempotency key
-- when decision is 'in_progress'. Combined with the existing
-- idx_publish_attempts_idempotency_live (decision='attempted'), this
-- ensures the full lifecycle: reservation → attempted is single-writer.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_publish_attempts_reservation"
  ON "aleabit_publish_attempts" ("idempotency_key")
  WHERE "dry_run" = false
    AND "decision" = 'in_progress';
