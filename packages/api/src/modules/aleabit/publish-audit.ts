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
 * Reserve an idempotency key before calling the real adapter.
 * Inserts a non-dry-run 'in_progress' row and returns its row id.
 * If another request already reserved this key, the unique index
 * violation returns null → caller must treat as duplicate.
 *
 * FIX(#145): prevents the race where two concurrent requests both pass
 * checkIdempotency() and both call the real X adapter.
 *
 * The returned id MUST be passed to finalizeIdempotencyReservation()
 * after the adapter call completes (success or failure) — otherwise the
 * reservation row would permanently block retries (#142).
 */
export async function reserveIdempotencyKey(params: {
  idempotencyKey: string;
  queueItemId: string;
  creatorId: string;
  conversationId: string;
  sourcePostId: string;
  policyVersion: number;
  rolloutMode: string;
  adapter: string;
  payloadHash: string;
  imageHashZh: string;
  imageHashEn: string;
}): Promise<string | null> {
  const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await db.insert(aleabitPublishAttempts).values({
      id: reservationId,
      queueItemId: params.queueItemId,
      creatorId: params.creatorId,
      conversationId: params.conversationId,
      sourcePostId: params.sourcePostId,
      policyVersion: params.policyVersion,
      rolloutMode: params.rolloutMode,
      dryRun: false,
      adapter: params.adapter,
      payloadHash: params.payloadHash,
      imageHashZh: params.imageHashZh,
      imageHashEn: params.imageHashEn,
      idempotencyKey: params.idempotencyKey,
      decision: "in_progress",
      failureStage: null,
      externalPostId: null,
      attemptedAt: new Date(),
    });
    return reservationId; // reservation acquired
  } catch (err: any) {
    // Unique violation → another request already reserved this key
    if (err?.code === "23505") {
      return null;
    }
    throw err; // re-throw unexpected errors
  }
}

/**
 * Finalize a reservation row after the adapter call completes.
 * Transitions the 'in_progress' row to its terminal state:
 * - success → decision='attempted' + externalPostId
 * - failure → decision='error' + neutral failureStage
 *
 * FIX(#142): without this, reservation rows permanently block retries
 * after a transient publish failure (unique index on in_progress rows).
 */
export async function finalizeIdempotencyReservation(params: {
  reservationId: string;
  decision: "attempted" | "error";
  adapter: string;
  failureStage?: string;
  externalPostId?: string;
  attemptedAt: string;
}): Promise<void> {
  await db
    .update(aleabitPublishAttempts)
    .set({
      decision: params.decision,
      adapter: params.adapter,
      failureStage: params.failureStage ?? null,
      externalPostId: params.externalPostId ?? null,
      attemptedAt: new Date(params.attemptedAt),
    })
    .where(eq(aleabitPublishAttempts.id, params.reservationId));
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
