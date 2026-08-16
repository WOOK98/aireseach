/**
 * AleaBit — Publish attempt audit persistence (#141)
 *
 * Stores PublishAttempt records to DB for audit trail.
 * All attempts (dry-run, blocked, error, success) are recorded.
 */

import { eq } from "drizzle-orm";

import { aleabitPublishAttempts } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import type { PublishAttempt } from "./publish-executor";

// ── Insert ────────────────────────────────────────────────────────────────────

/**
 * Persist a PublishAttempt to the audit table.
 * Idempotent: duplicate id is silently ignored.
 */
export async function recordPublishAttempt(
  attempt: PublishAttempt,
): Promise<void> {
  await db
    .insert(aleabitPublishAttempts)
    .values({
      id: attempt.id,
      queueItemId: attempt.queueItemId,
      creatorId: attempt.creatorId,
      conversationId: attempt.conversationId,
      sourcePostId: attempt.sourcePostId,
      policyVersion: attempt.policyVersion,
      rolloutMode: attempt.rolloutMode,
      dryRun: attempt.dryRun,
      adapter: attempt.adapter,
      payloadHash: attempt.payloadHash,
      imageHashZh: attempt.imageHashZh,
      imageHashEn: attempt.imageHashEn,
      idempotencyKey: attempt.idempotencyKey,
      decision: attempt.decision,
      failureStage: attempt.failureStage ?? null,
      externalPostId: attempt.externalPostId ?? null,
      attemptedAt: new Date(attempt.attemptedAt),
    })
    .onConflictDoNothing();
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * Get all publish attempts for a queue item, ordered by time.
 */
export async function getAttemptsForItem(
  queueItemId: string,
): Promise<PublishAttempt[]> {
  const rows = await db
    .select()
    .from(aleabitPublishAttempts)
    .where(eq(aleabitPublishAttempts.queueItemId, queueItemId))
    .orderBy(aleabitPublishAttempts.attemptedAt);

  return rows.map(rowToAttempt);
}

/**
 * Get all publish attempts for a creator, ordered by time.
 */
export async function getAttemptsForCreator(
  creatorId: string,
): Promise<PublishAttempt[]> {
  const rows = await db
    .select()
    .from(aleabitPublishAttempts)
    .where(eq(aleabitPublishAttempts.creatorId, creatorId))
    .orderBy(aleabitPublishAttempts.attemptedAt);

  return rows.map(rowToAttempt);
}

/**
 * Check if an idempotency key has already been published (non-dry-run success).
 * Returns the existing attempt if found, null otherwise.
 */
export async function checkIdempotency(
  idempotencyKey: string,
): Promise<PublishAttempt | null> {
  const rows = await db
    .select()
    .from(aleabitPublishAttempts)
    .where(eq(aleabitPublishAttempts.idempotencyKey, idempotencyKey));

  // Find a non-dry-run successful attempt
  const existing = rows.find(
    (r: typeof aleabitPublishAttempts.$inferSelect) =>
      !r.dryRun && r.decision === "attempted" && r.externalPostId,
  );

  return existing ? rowToAttempt(existing) : null;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function rowToAttempt(
  row: typeof aleabitPublishAttempts.$inferSelect,
): PublishAttempt {
  return {
    id: row.id,
    queueItemId: row.queueItemId,
    creatorId: row.creatorId,
    conversationId: row.conversationId,
    sourcePostId: row.sourcePostId,
    policyVersion: row.policyVersion,
    rolloutMode: row.rolloutMode as PublishAttempt["rolloutMode"],
    dryRun: row.dryRun,
    adapter: row.adapter,
    payloadHash: row.payloadHash,
    imageHashZh: row.imageHashZh,
    imageHashEn: row.imageHashEn,
    idempotencyKey: row.idempotencyKey,
    decision: row.decision as PublishAttempt["decision"],
    failureStage: row.failureStage ?? undefined,
    externalPostId: row.externalPostId ?? undefined,
    attemptedAt: row.attemptedAt.toISOString(),
  };
}
