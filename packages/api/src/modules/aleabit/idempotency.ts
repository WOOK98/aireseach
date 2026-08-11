/**
 * AleaBit — Idempotency model (pure function) (#119)
 *
 * Prevents duplicate processing of the same post.
 * Uses conversationId + edit_history for dedup.
 * Edited posts trigger version updates with audit trail.
 */

export interface IdempotencyKey {
  conversationId: string;
  editHistoryHash: string; // hash of sorted edit timestamps
}

export interface IdempotencyRecord {
  key: IdempotencyKey;
  version: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
  status: string;
}

// ── Key generation ───────────────────────────────────────────────────────────

function hashEditHistory(editHistory: string[]): string {
  // Sort to handle out-of-order timestamps, then join
  const sorted = [...editHistory].sort();
  const raw = sorted.join("|");
  // Simple hash (not crypto — just dedup key)
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `eh_${Math.abs(hash).toString(36)}`;
}

export function buildIdempotencyKey(
  conversationId: string,
  editHistory: string[],
): IdempotencyKey {
  return {
    conversationId,
    editHistoryHash: hashEditHistory(editHistory),
  };
}

// ── Dedup decision ───────────────────────────────────────────────────────────

export type DedupResult =
  | { action: "process"; reason: string }
  | { action: "skip_duplicate"; reason: string; existingVersion: number }
  | { action: "update"; reason: string; existingVersion: number };

export function checkIdempotency(
  key: IdempotencyKey,
  existingRecords: IdempotencyRecord[],
): DedupResult {
  const matchingConversation = existingRecords.filter(
    (r) => r.key.conversationId === key.conversationId,
  );

  if (matchingConversation.length === 0) {
    return {
      action: "process",
      reason: "New conversation — no existing record.",
    };
  }

  // Check exact edit history match
  const exactMatch = matchingConversation.find(
    (r) => r.key.editHistoryHash === key.editHistoryHash,
  );

  if (exactMatch) {
    return {
      action: "skip_duplicate",
      reason: `Exact match: conversationId + editHistory already processed (version ${exactMatch.version}).`,
      existingVersion: exactMatch.version,
    };
  }

  // Same conversation, different edit history → update
  const latestVersion = Math.max(...matchingConversation.map((r) => r.version));

  return {
    action: "update",
    reason: `Same conversation but edit history changed. Bumping version ${latestVersion} → ${latestVersion + 1}.`,
    existingVersion: latestVersion,
  };
}
