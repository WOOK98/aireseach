/**
 * AleaBit — Persistence + audit tests (#121 #126)
 *
 * Tests for:
 * - Human review status transitions (pure function)
 * - PersistentReviewQueue operations (requires DB — integration)
 * - Audit log recording and retrieval
 * - Idempotency: same fixture replayed doesn't duplicate items
 *
 * Pure function tests run without DB.
 * Integration tests are tagged and need a test database.
 */
import { describe, it, expect, vi } from "vitest";

import { isValidAleabitTransition } from "@workspace/db/schema";

import { executeReviewAction, getAuditTrail } from "../audit";
import { buildIdempotencyKey, checkIdempotency } from "../idempotency";

import type { IdempotencyRecord } from "../idempotency";
import type { PersistentReviewQueue } from "../queue-pg";

// ── Human review status transitions (pure) ──────────────────────────────────

describe("isValidAleabitTransition — human review states", () => {
  it("ready_for_review → approved", () => {
    expect(isValidAleabitTransition("ready_for_review", "approved")).toBe(true);
  });

  it("ready_for_review → rejected", () => {
    expect(isValidAleabitTransition("ready_for_review", "rejected")).toBe(true);
  });

  it("ready_for_review → needs_more_evidence", () => {
    expect(
      isValidAleabitTransition("ready_for_review", "needs_more_evidence"),
    ).toBe(true);
  });

  it("ready_for_review → archived", () => {
    expect(isValidAleabitTransition("ready_for_review", "archived")).toBe(true);
  });

  it("needs_review → approved", () => {
    expect(isValidAleabitTransition("needs_review", "approved")).toBe(true);
  });

  it("needs_review → rejected", () => {
    expect(isValidAleabitTransition("needs_review", "rejected")).toBe(true);
  });

  it("needs_more_evidence → ready_for_review (re-enter review)", () => {
    expect(
      isValidAleabitTransition("needs_more_evidence", "ready_for_review"),
    ).toBe(true);
  });

  it("needs_more_evidence → archived", () => {
    expect(isValidAleabitTransition("needs_more_evidence", "archived")).toBe(
      true,
    );
  });

  it("approved → archived", () => {
    expect(isValidAleabitTransition("approved", "archived")).toBe(true);
  });

  it("rejected → archived", () => {
    expect(isValidAleabitTransition("rejected", "archived")).toBe(true);
  });

  it("blocks approved → rejected (no flip-flop)", () => {
    expect(isValidAleabitTransition("approved", "rejected")).toBe(false);
  });

  it("blocks rejected → approved (no flip-flop)", () => {
    expect(isValidAleabitTransition("rejected", "approved")).toBe(false);
  });

  it("blocks archived → anything", () => {
    expect(isValidAleabitTransition("archived", "approved")).toBe(false);
    expect(isValidAleabitTransition("archived", "detected")).toBe(false);
  });

  it("blocks detected → approved (must go through review)", () => {
    expect(isValidAleabitTransition("detected", "approved")).toBe(false);
  });

  it("blocks skipped → approved", () => {
    expect(isValidAleabitTransition("skipped", "approved")).toBe(false);
  });
});

// ── Machine state transitions (existing, extended) ──────────────────────────

describe("isValidAleabitTransition — machine states", () => {
  it("detected → researching", () => {
    expect(isValidAleabitTransition("detected", "researching")).toBe(true);
  });

  it("detected → skipped", () => {
    expect(isValidAleabitTransition("detected", "skipped")).toBe(true);
  });

  it("researching → ready_for_review", () => {
    expect(isValidAleabitTransition("researching", "ready_for_review")).toBe(
      true,
    );
  });

  it("researching → needs_review", () => {
    expect(isValidAleabitTransition("researching", "needs_review")).toBe(true);
  });

  it("blocks skipped → researching", () => {
    expect(isValidAleabitTransition("skipped", "researching")).toBe(false);
  });

  it("blocks ready_for_review → failed", () => {
    expect(isValidAleabitTransition("ready_for_review", "failed")).toBe(false);
  });

  it("skipped → archived (cleanup path)", () => {
    expect(isValidAleabitTransition("skipped", "archived")).toBe(true);
  });

  it("failed → archived (cleanup path)", () => {
    expect(isValidAleabitTransition("failed", "archived")).toBe(true);
  });
});

// ── Audit action (mocked queue) ─────────────────────────────────────────────

function createMockQueue(items: Map<string, any>): PersistentReviewQueue {
  return {
    get: vi.fn<(id: string) => Promise<any>>(async (id: string) =>
      items.get(id),
    ),
    updateStatus: vi.fn<
      (id: string, status: string, _reason?: string) => Promise<any>
    >(async (id: string, status: string, _reason?: string) => {
      const item = items.get(id);
      if (!item) return null;
      item.status = status;
      return item;
    }),
    getAuditLog: vi.fn<() => Promise<any[]>>(async () => []),
  } as unknown as PersistentReviewQueue;
}

describe("executeReviewAction", () => {
  it("approves an item in ready_for_review", async () => {
    const items = new Map([
      ["item_1", { id: "item_1", status: "ready_for_review" }],
    ]);
    const queue = createMockQueue(items);

    const result = await executeReviewAction(queue, {
      itemId: "item_1",
      action: "approved",
      reason: "Verified by analyst",
      actorId: "user_123",
    });

    expect(result.item).toBeTruthy();
    expect(result.error).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const updateFn = queue.updateStatus as ReturnType<typeof vi.fn>;
    expect(updateFn).toHaveBeenCalledWith(
      "item_1",
      "approved",
      "Verified by analyst",
      "user_123",
      "human",
    );
  });

  it("returns error for non-existent item", async () => {
    const queue = createMockQueue(new Map());

    const result = await executeReviewAction(queue, {
      itemId: "missing",
      action: "approved",
      reason: "test",
      actorId: "user_123",
    });

    expect(result.item).toBeNull();
    expect(result.error).toContain("not found");
  });

  it("returns error for invalid transition", async () => {
    const items = new Map([["item_1", { id: "item_1", status: "approved" }]]);
    const queue = createMockQueue(items);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const updateFn = queue.updateStatus as ReturnType<typeof vi.fn>;
    updateFn.mockRejectedValue(
      new Error("Invalid transition: approved → rejected"),
    );

    const result = await executeReviewAction(queue, {
      itemId: "item_1",
      action: "rejected",
      reason: "changed mind",
      actorId: "user_123",
    });

    expect(result.error).toContain("Invalid transition");
  });
});

// ── Audit trail formatting ───────────────────────────────────────────────────

describe("getAuditTrail", () => {
  it("formats audit entries for display", async () => {
    const queue = {
      getAuditLog: vi.fn<() => Promise<any[]>>(async () => [
        {
          id: "audit_1",
          itemId: "item_1",
          fromStatus: "detected",
          toStatus: "researching",
          actorType: "system",
          createdAt: "2026-08-13T00:00:00Z",
        },
        {
          id: "audit_2",
          itemId: "item_1",
          fromStatus: "ready_for_review",
          toStatus: "approved",
          reason: "Looks good",
          actorId: "user_123",
          actorType: "human",
          createdAt: "2026-08-13T01:00:00Z",
        },
      ]),
    } as unknown as PersistentReviewQueue;

    const trail = await getAuditTrail(queue, "item_1");

    expect(trail).toHaveLength(2);
    expect(trail[0]!.from).toBe("detected");
    expect(trail[0]!.actor).toBe("system");
    expect(trail[1]!.to).toBe("approved");
    expect(trail[1]!.actor).toBe("user:user_123");
    expect(trail[1]!.reason).toBe("Looks good");
  });
});

// ── Idempotency with persistent queue ────────────────────────────────────────

describe("idempotency key persistence", () => {
  it("same conversationId + editHistory produces same key", () => {
    const key1 = buildIdempotencyKey("conv_123", ["2026-08-13T00:00:00Z"]);
    const key2 = buildIdempotencyKey("conv_123", ["2026-08-13T00:00:00Z"]);

    expect(key1.conversationId).toBe(key2.conversationId);
    expect(key1.editHistoryHash).toBe(key2.editHistoryHash);
  });

  it("different editHistory produces different key", () => {
    const key1 = buildIdempotencyKey("conv_123", ["2026-08-13T00:00:00Z"]);
    const key2 = buildIdempotencyKey("conv_123", [
      "2026-08-13T00:00:00Z",
      "2026-08-13T01:00:00Z",
    ]);

    expect(key1.conversationId).toBe(key2.conversationId);
    expect(key1.editHistoryHash).not.toBe(key2.editHistoryHash);
  });

  it("checkIdempotency skips exact duplicate", () => {
    const key = buildIdempotencyKey("conv_123", ["2026-08-13T00:00:00Z"]);
    const existing: IdempotencyRecord[] = [
      {
        key,
        version: 1,
        firstSeenAt: "2026-08-13T00:00:00Z",
        lastUpdatedAt: "2026-08-13T00:00:00Z",
        status: "ready_for_review",
      },
    ];

    const result = checkIdempotency(key, existing);
    expect(result.action).toBe("skip_duplicate");
  });

  it("checkIdempotency allows update for edited post", () => {
    const key1 = buildIdempotencyKey("conv_123", ["2026-08-13T00:00:00Z"]);
    const key2 = buildIdempotencyKey("conv_123", [
      "2026-08-13T00:00:00Z",
      "2026-08-13T02:00:00Z",
    ]);
    const existing: IdempotencyRecord[] = [
      {
        key: key1,
        version: 1,
        firstSeenAt: "2026-08-13T00:00:00Z",
        lastUpdatedAt: "2026-08-13T00:00:00Z",
        status: "ready_for_review",
      },
    ];

    const result = checkIdempotency(key2, existing);
    expect(result.action).toBe("update");
    expect(
      "existingVersion" in result ? result.existingVersion : undefined,
    ).toBe(1);
  });
});
