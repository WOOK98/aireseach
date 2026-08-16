-- AleaBit: add policy_decision column for publish policy gate (#137)

ALTER TABLE "aleabit_queue" ADD COLUMN "policy_decision" jsonb;
