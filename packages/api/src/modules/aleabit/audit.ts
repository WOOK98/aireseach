/**
 * AleaBit — Human review audit actions (#127)
 *
 * Provides functions for human reviewers to approve/reject/flag items.
 * Each action records an audit log entry with actor + reason.
 *
 * These are the ONLY entry points for human review state changes.
 * Machine transitions (detected → researching → etc.) go through
 * PersistentReviewQueue.updateStatus() directly.
 */

import { PersistentReviewQueue } from "./queue-pg";

import type { HumanReviewStatus, QueueItem } from "./queue-pg";

// ── Human review action ──────────────────────────────────────────────────────

export interface ReviewAction {
  itemId: string;
  action: HumanReviewStatus;
  reason: string;
  actorId: string; // user id of the reviewer
}

export interface ReviewResult {
  item: QueueItem | null;
  auditId?: string;
  error?: string;
}

/**
 * Execute a human review action.
 * Validates the transition, updates status, and records audit log.
 */
export async function executeReviewAction(
  queue: PersistentReviewQueue,
  action: ReviewAction,
): Promise<ReviewResult> {
  const item = await queue.get(action.itemId);
  if (!item) {
    return { item: null, error: `Item ${action.itemId} not found.` };
  }

  try {
    const updated = await queue.updateStatus(
      action.itemId,
      action.action,
      action.reason,
      action.actorId,
      "human",
    );

    return { item: updated };
  } catch (err) {
    return {
      item,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get full audit trail for an item, formatted for display.
 */
export async function getAuditTrail(
  queue: PersistentReviewQueue,
  itemId: string,
): Promise<
  Array<{
    timestamp: string;
    from: string;
    to: string;
    actor: string;
    reason?: string;
  }>
> {
  const entries = await queue.getAuditLog(itemId);
  return entries.map((e) => ({
    timestamp: e.createdAt,
    from: e.fromStatus,
    to: e.toStatus,
    actor:
      e.actorType === "human" ? `user:${e.actorId ?? "unknown"}` : "system",
    reason: e.reason,
  }));
}
