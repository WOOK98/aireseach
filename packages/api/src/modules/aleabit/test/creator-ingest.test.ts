/**
 * AleaBit — Multi-creator ingest tests (#130)
 *
 * Tests for:
 * - Multi-creator ingest produces items from both creators
 * - Idempotency: replay doesn't duplicate items
 * - Author-only thread merge
 * - No entity → skipped or needs_review
 * - Number without external evidence → needs_review
 * - Classification categories
 * - No X write surface
 */

import { describe, it, expect } from "vitest";

import {
  BUILTIN_CREATOR_CONFIGS,
  ALEABIT_CREATOR_CONFIG,
  SERENITY_CREATOR_CONFIG,
} from "../creator-fixtures/builtin-configs";
import {
  CreatorReplayAdapter,
  buildCreatorReplayAdapters,
} from "../creator-fixtures/multi-replay-adapter";
import { runMultiCreatorIngest } from "../creator-ingest";
import { ReviewQueue } from "../queue";
import { FakePersistentQueue } from "./fake-persistent-queue";

import type { CreatorSourceConfig } from "../creator-config";

// ── Multi-creator ingest ─────────────────────────────────────────────────────

describe("multi-creator ingest", () => {
  it("produces items from both creators", async () => {
    const adapters = buildCreatorReplayAdapters(BUILTIN_CREATOR_CONFIGS);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, adapters);

    // Should have items from both creators
    const aleabitItems = result.items.filter((i) =>
      i.id.startsWith("creator_aleabitoreddit_"),
    );
    const serenityItems = result.items.filter((i) =>
      i.id.startsWith("creator_serenity_"),
    );

    expect(aleabitItems.length).toBeGreaterThan(0);
    expect(serenityItems.length).toBeGreaterThan(0);
  });

  it("produces per-creator summaries", async () => {
    const adapters = buildCreatorReplayAdapters(BUILTIN_CREATOR_CONFIGS);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, adapters);

    expect(result.summaries).toHaveLength(2);
    expect(result.summaries.some((s) => s.creatorId === "aleabitoreddit")).toBe(
      true,
    );
    expect(result.summaries.some((s) => s.creatorId === "serenity")).toBe(true);
  });

  it("total summary matches sum of per-creator summaries", async () => {
    const adapters = buildCreatorReplayAdapters(BUILTIN_CREATOR_CONFIGS);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, adapters);

    const { totalSummary, summaries } = result;
    expect(totalSummary.fetched).toBe(
      summaries.reduce((s, c) => s + c.fetched, 0),
    );
    expect(totalSummary.classified).toBe(
      summaries.reduce((s, c) => s + c.classified, 0),
    );
    expect(totalSummary.skipped).toBe(
      summaries.reduce((s, c) => s + c.skipped, 0),
    );
    expect(totalSummary.needsReview).toBe(
      summaries.reduce((s, c) => s + c.needsReview, 0),
    );
  });

  it("every item is in a terminal state", async () => {
    const adapters = buildCreatorReplayAdapters(BUILTIN_CREATOR_CONFIGS);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, adapters);

    const terminalStatuses = [
      "ready_for_review",
      "needs_review",
      "skipped",
      "failed",
      "approved",
      "rejected",
      "archived",
    ];

    for (const item of result.items) {
      expect(terminalStatuses).toContain(item.status);
    }
  });
});

// ── Idempotency ──────────────────────────────────────────────────────────────

describe("idempotency", () => {
  it("replaying same fixtures does not duplicate items", async () => {
    const adapters = buildCreatorReplayAdapters(BUILTIN_CREATOR_CONFIGS);
    const queue = new FakePersistentQueue();

    // First run
    const result1 = await runMultiCreatorIngest(queue, adapters);
    const count1 = result1.items.length;

    // Second run — should not add duplicates
    const result2 = await runMultiCreatorIngest(queue, adapters);
    const count2 = result2.items.length;

    expect(count2).toBe(count1);

    // Duplicates should be counted in summary
    expect(result2.totalSummary.duplicates).toBe(count1);
  });

  it("cross-creator same conversationId does NOT collide", async () => {
    // Two different creators with the same conversationId should produce
    // separate items — creatorId is part of the idempotency key.
    const config1: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "creator_a",
    };
    const config2: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "creator_b",
    };

    const sharedFixture = {
      shared_thread: [
        {
          postId: "shared_001",
          conversationId: "conv_shared",
          author: "Author",
          authorHandle: "author",
          text: "$NVDA earnings thread with shared conversationId.",
          postedAt: "2026-08-10T20:00:00Z",
          url: "https://x.com/author/status/shared_001",
          editHistory: ["2026-08-10T20:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    };

    const adapter1 = new CreatorReplayAdapter(config1, sharedFixture);
    const adapter2 = new CreatorReplayAdapter(config2, sharedFixture);

    const queue = new FakePersistentQueue();
    const result = await runMultiCreatorIngest(queue, [adapter1, adapter2]);

    // Should produce 2 items (one per creator), not 1
    expect(result.items).toHaveLength(2);
    expect(result.totalSummary.duplicates).toBe(0);
  });

  it("duplicate count matches total items on replay", async () => {
    const adapters = buildCreatorReplayAdapters(BUILTIN_CREATOR_CONFIGS);
    const queue = new FakePersistentQueue();

    await runMultiCreatorIngest(queue, adapters);
    const result = await runMultiCreatorIngest(queue, adapters);

    // Every item should be a duplicate
    expect(result.totalSummary.duplicates).toBe(result.items.length);
  });
});

// ── Author-only thread merge ─────────────────────────────────────────────────

describe("author-only thread merge", () => {
  it("only includes replies by the same author", async () => {
    const config: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "test_author_only",
    };

    // Create fixture with mixed-author replies
    const fixtures = {
      mixed_thread: [
        {
          postId: "root_001",
          conversationId: "conv_mixed",
          author: "AleaBit",
          authorHandle: "aleabitoreddit",
          text: "$NVDA earnings thread. Revenue $30B.",
          postedAt: "2026-08-10T20:00:00Z",
          url: "https://x.com/aleabitoreddit/status/root_001",
          editHistory: ["2026-08-10T20:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
        {
          postId: "reply_author_001",
          conversationId: "conv_mixed",
          author: "AleaBit",
          authorHandle: "aleabitoreddit",
          text: "Key driver: Blackwell ramp.",
          postedAt: "2026-08-10T20:02:00Z",
          url: "https://x.com/aleabitoreddit/status/reply_author_001",
          editHistory: ["2026-08-10T20:02:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
        {
          postId: "reply_other_001",
          conversationId: "conv_mixed",
          author: "RandomUser",
          authorHandle: "randomuser",
          text: "Great analysis!",
          postedAt: "2026-08-10T20:05:00Z",
          url: "https://x.com/randomuser/status/reply_other_001",
          editHistory: ["2026-08-10T20:05:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    };

    const adapter = new CreatorReplayAdapter(config, fixtures);
    const thread = await adapter.fetchThread("conv_mixed");

    expect(thread.ok).toBe(true);
    expect(thread.rootPost!.postId).toBe("root_001");
    // Only author's reply should be included
    expect(thread.replies).toHaveLength(1);
    expect(thread.replies![0]!.postId).toBe("reply_author_001");
  });
});

// ── No entity handling ───────────────────────────────────────────────────────

describe("no entity handling", () => {
  it("posts without identifiable entity are skipped or needs_review", async () => {
    const config: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "test_no_entity",
    };

    const fixtures = {
      no_entity: [
        {
          postId: "no_entity_001",
          conversationId: "conv_no_entity",
          author: "TestAuthor",
          authorHandle: "testauthor",
          text: "Just got back from a great vacation. The weather was amazing and the food was incredible. Highly recommend visiting if you get the chance.",
          postedAt: "2026-08-08T12:00:00Z",
          url: "https://x.com/testauthor/status/no_entity_001",
          editHistory: ["2026-08-08T12:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    };

    const adapter = new CreatorReplayAdapter(config, fixtures);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, [adapter]);

    expect(result.items).toHaveLength(1);
    // Should be skipped (no financial signals) or needs_review (no entity)
    expect(["skipped", "needs_review"]).toContain(result.items[0]!.status);
  });
});

// ── Evidence gate ────────────────────────────────────────────────────────────

describe("evidence gate", () => {
  it("numbers without external evidence → needs_review", async () => {
    const config: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "test_evidence",
    };

    const fixtures = {
      earnings_no_evidence: [
        {
          postId: "earnings_001",
          conversationId: "conv_earnings",
          author: "TestAuthor",
          authorHandle: "testauthor",
          text: "$TSLA Q2 deliveries: 443,956 units. Below consensus of 448,000. Revenue estimated at $25.5B.",
          postedAt: "2026-08-10T16:00:00Z",
          url: "https://x.com/testauthor/status/earnings_001",
          editHistory: ["2026-08-10T16:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    };

    const adapter = new CreatorReplayAdapter(config, fixtures);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, [adapter]);

    expect(result.items).toHaveLength(1);
    // With only author_claim evidence, should be needs_review
    expect(result.items[0]!.status).toBe("needs_review");
    expect(result.items[0]!.evidenceGate?.allowed).toBe(false);
  });
});

// ── Classification ───────────────────────────────────────────────────────────

describe("classification", () => {
  it("earnings content classified correctly", async () => {
    const config: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "test_classify",
    };

    const fixtures = {
      earnings: [
        {
          postId: "classify_001",
          conversationId: "conv_classify",
          author: "TestAuthor",
          authorHandle: "testauthor",
          text: "$NVDA Q2 FY2026 earnings: Revenue $30.0B (+56% YoY), beat consensus of $28.4B. EPS $0.68 vs $0.60 est.",
          postedAt: "2026-08-10T20:00:00Z",
          url: "https://x.com/testauthor/status/classify_001",
          editHistory: ["2026-08-10T20:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    };

    const adapter = new CreatorReplayAdapter(config, fixtures);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, [adapter]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.classification?.category).toBe("earnings");
  });

  it("noise content skipped", async () => {
    const config: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "test_noise",
    };

    const fixtures = {
      noise: [
        {
          postId: "noise_001",
          conversationId: "conv_noise",
          author: "TestAuthor",
          authorHandle: "testauthor",
          text: "gm everyone. follow for more updates!",
          postedAt: "2026-08-09T13:00:00Z",
          url: "https://x.com/testauthor/status/noise_001",
          editHistory: ["2026-08-09T13:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    };

    const adapter = new CreatorReplayAdapter(config, fixtures);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, [adapter]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.status).toBe("skipped");
  });
});

// ── Serenity fixtures ────────────────────────────────────────────────────────

describe("serenity fixtures", () => {
  it("serenity replay adapter serves its own fixtures", async () => {
    const adapter = new CreatorReplayAdapter(SERENITY_CREATOR_CONFIG);
    const rootPosts = await adapter.fetchRecentRootPosts({ maxResults: 10 });

    expect(rootPosts.length).toBeGreaterThan(0);
    // All posts should be from serenity
    for (const post of rootPosts) {
      expect(post.authorHandle).toBe("serenity");
    }
  });

  it("serenity macro thread classifies correctly", async () => {
    const adapter = new CreatorReplayAdapter(SERENITY_CREATOR_CONFIG);
    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, [adapter]);

    // Should have items from serenity
    const serenityItems = result.items.filter((i) =>
      i.id.startsWith("creator_serenity_"),
    );
    expect(serenityItems.length).toBeGreaterThan(0);
  });
});

// ── Disabled creator ─────────────────────────────────────────────────────────

describe("disabled creator", () => {
  it("skips disabled creators", async () => {
    const disabledConfig: CreatorSourceConfig = {
      ...ALEABIT_CREATOR_CONFIG,
      id: "disabled_creator",
      enabled: false,
    };

    const adapter = new CreatorReplayAdapter(disabledConfig, {
      test: [
        {
          postId: "disabled_001",
          conversationId: "conv_disabled",
          author: "Test",
          authorHandle: "test",
          text: "$NVDA earnings test content for disabled creator.",
          postedAt: "2026-08-10T20:00:00Z",
          url: "https://x.com/test/status/disabled_001",
          editHistory: ["2026-08-10T20:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    });

    const queue = new ReviewQueue();
    const result = await runMultiCreatorIngest(queue, [adapter]);

    expect(result.items).toHaveLength(0);
    expect(result.summaries).toHaveLength(0);
  });
});

// ── No X write surface ───────────────────────────────────────────────────────

describe("no X write surface", () => {
  it("creator-ingest module has no publish/reply/quote functions", async () => {
    // Dynamic import to inspect exports
    const mod = await import("../creator-ingest");
    const exports = Object.keys(mod);

    // Should not export anything related to X write operations
    const forbiddenPatterns = [
      "publish",
      "tweet",
      "reply",
      "quote",
      "upload",
      "media",
      "oauth",
      "token",
    ];

    for (const name of exports) {
      for (const pattern of forbiddenPatterns) {
        expect(name.toLowerCase()).not.toContain(pattern);
      }
    }
  });

  it("creator-adapter module has no write functions", async () => {
    const mod = await import("../creator-adapter");
    const exports = Object.keys(mod);

    const forbiddenPatterns = [
      "publish",
      "tweet",
      "reply",
      "quote",
      "upload",
      "media",
      "oauth",
      "token",
    ];

    for (const name of exports) {
      for (const pattern of forbiddenPatterns) {
        expect(name.toLowerCase()).not.toContain(pattern);
      }
    }
  });
});
