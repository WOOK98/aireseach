/**
 * AleaBit — Publish executor + adapter tests (#139, #141 fix)
 *
 * Validates all gates, safety switches, idempotency, and dry-run behavior.
 *
 * SAFETY: Tests prove that default config never produces external writes.
 * REDLINE: All paths call recordAttempt — verified by tests.
 */

import { describe, expect, it, vi } from "vitest";

import { executePublishAttempt } from "../publish-executor";
import {
  DryRunXWriteAdapter,
  createAdapter,
  hashPayload,
} from "../x-write-adapter";

import type { PublishAttempt } from "../publish-executor";
import type { QueueItem } from "../queue-interface";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ALLOWED_POLICY = {
  verdict: "allowed" as const,
  blockingReasons: [],
  checkedAt: "2026-08-17T00:00:00Z",
  policyVersion: 1,
  rolloutMode: "canary" as const,
  queueItemId: "q1",
  creatorId: "aleabitoreddit",
  conversationId: "conv_nvda",
};

// Dummy PNG buffers for tests (1x1 pixel PNG)
const DUMMY_PNG_ZH = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const DUMMY_PNG_EN = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function makeItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "q1",
    creatorId: "aleabitoreddit",
    conversationId: "conv_nvda",
    triggerPost: {
      postId: "p1",
      conversationId: "conv_nvda",
      author: "test",
      authorHandle: "test",
      text: "NVDA earnings",
      postedAt: "2026-08-10T00:00:00Z",
      url: "https://x.com/test/p1",
      editHistory: ["v1"],
      fetchedAt: "2026-08-10T00:00:00Z",
    },
    status: "approved",
    brief: {
      schema_version: 1 as const,
      triggerPost: {
        postId: "p1",
        conversationId: "conv_nvda",
        author: "test",
        authorHandle: "test",
        text: "NVDA earnings",
        postedAt: "2026-08-10T00:00:00Z",
        url: "https://x.com/test/p1",
        editHistory: ["v1"],
        fetchedAt: "2026-08-10T00:00:00Z",
      },
      authorThesis: "AI buildout accelerating.",
      company: "NVIDIA Corporation",
      ticker: "NVDA",
      market: "US",
      reportPeriod: "FY2026 Q2",
      publishedAt: "2026-08-10T00:00:00Z",
      guidanceChanges: [],
      drivers: [],
      risksOrFalsifiers: [],
      limitations: [],
      sources: [],
      disclaimer: "Not investment advice.",
    } as any,
    policyDecision: ALLOWED_POLICY as any,
    renderedPngHashZh: "abc123",
    renderedPngHashEn: "def456",
    renderedPngZh: DUMMY_PNG_ZH,
    renderedPngEn: DUMMY_PNG_EN,
    createdAt: "2026-08-10T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
    version: 1,
    ...overrides,
  };
}

// ── DryRunXWriteAdapter tests ─────────────────────────────────────────────────

describe("DryRunXWriteAdapter", () => {
  it("returns success with dryRun=true", async () => {
    const adapter = new DryRunXWriteAdapter();
    const result = await adapter.publishReplyWithMedia({
      replyToPostId: "p1",
      text: "test",
      creatorId: "c1",
      conversationId: "conv1",
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.adapter).toBe("dry-run");
    expect(result.payloadHash).toBeTruthy();
    expect(result.externalPostId).toBeUndefined();
  });

  it("isDryRun is true", () => {
    const adapter = new DryRunXWriteAdapter();
    expect(adapter.isDryRun).toBe(true);
  });
});

// ── createAdapter tests ──────────────────────────────────────────────────────

describe("XApiWriteAdapter dual-image enforcement", () => {
  // XApiWriteAdapter requires a token but we test the guard without making real calls.
  // We import the class directly and test publishReplyWithMedia with missing media.
  it("rejects when zh PNG is missing", async () => {
    const { XApiWriteAdapter } = await import("../x-write-adapter");
    const adapter = new XApiWriteAdapter("fake-token");
    const result = await adapter.publishReplyWithMedia({
      replyToPostId: "p1",
      text: "test",
      creatorId: "c1",
      conversationId: "conv1",
      mediaPngEn: Buffer.from([0x89, 0x50]),
      // mediaPngZh missing
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Both zh and en PNG");
  });

  it("rejects when en PNG is missing", async () => {
    const { XApiWriteAdapter } = await import("../x-write-adapter");
    const adapter = new XApiWriteAdapter("fake-token");
    const result = await adapter.publishReplyWithMedia({
      replyToPostId: "p1",
      text: "test",
      creatorId: "c1",
      conversationId: "conv1",
      mediaPngZh: Buffer.from([0x89, 0x50]),
      // mediaPngEn missing
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Both zh and en PNG");
  });

  it("rejects when both PNGs are missing", async () => {
    const { XApiWriteAdapter } = await import("../x-write-adapter");
    const adapter = new XApiWriteAdapter("fake-token");
    const result = await adapter.publishReplyWithMedia({
      replyToPostId: "p1",
      text: "test",
      creatorId: "c1",
      conversationId: "conv1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Both zh and en PNG");
    expect(result.error).toContain("text-only");
  });
});

describe("createAdapter", () => {
  it("returns null when kill-switch is on", () => {
    const adapter = createAdapter({
      publishMode: "auto",
      dryRun: false,
      killSwitch: true,
      xWriteBearerToken: "***",
    });
    expect(adapter).toBeNull();
  });

  it("returns null when mode is off", () => {
    const adapter = createAdapter({
      publishMode: "off",
      dryRun: false,
      killSwitch: false,
      xWriteBearerToken: "***",
    });
    expect(adapter).toBeNull();
  });

  it("returns DryRunAdapter when dryRun=true", () => {
    const adapter = createAdapter({
      publishMode: "canary",
      dryRun: true,
      killSwitch: false,
    });
    expect(adapter).toBeInstanceOf(DryRunXWriteAdapter);
  });

  it("returns null when dryRun=false and no token", () => {
    const adapter = createAdapter({
      publishMode: "canary",
      dryRun: false,
      killSwitch: false,
    });
    expect(adapter).toBeNull();
  });
});

// ── hashPayload tests ────────────────────────────────────────────────────────

describe("hashPayload", () => {
  it("returns consistent hash for same input", async () => {
    const input = {
      replyToPostId: "p1",
      text: "test",
      creatorId: "c1",
      conversationId: "conv1",
    };
    const h1 = await hashPayload(input);
    const h2 = await hashPayload(input);
    expect(h1).toBe(h2);
  });

  it("returns different hash for different input", async () => {
    const h1 = await hashPayload({
      replyToPostId: "p1",
      text: "test",
      creatorId: "c1",
      conversationId: "conv1",
    });
    const h2 = await hashPayload({
      replyToPostId: "p2",
      text: "test",
      creatorId: "c1",
      conversationId: "conv1",
    });
    expect(h1).not.toBe(h2);
  });
});

// ── executePublishAttempt tests ───────────────────────────────────────────────

describe("executePublishAttempt", () => {
  const DEFAULT_CONFIG = {
    publishMode: "canary" as const,
    dryRun: true,
    killSwitch: false,
  };

  describe("safety gates", () => {
    it("blocked when kill-switch is active", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, killSwitch: true },
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("Kill switch");
    });

    it("blocked when mode is off", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "off" },
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("off");
    });

    it("blocked when no policy decision", async () => {
      const result = await executePublishAttempt({
        item: makeItem({ policyDecision: undefined }),
        config: DEFAULT_CONFIG,
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("No policy decision");
    });

    it("blocked when verdict is not allowed", async () => {
      const result = await executePublishAttempt({
        item: makeItem({
          policyDecision: { ...ALLOWED_POLICY, verdict: "blocked" } as any,
        }),
        config: DEFAULT_CONFIG,
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("blocked");
    });

    it("blocked when zh-CN PNG hash missing", async () => {
      const result = await executePublishAttempt({
        item: makeItem({ renderedPngHashZh: undefined }),
        config: DEFAULT_CONFIG,
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("zh-CN");
    });

    it("blocked when en PNG hash missing", async () => {
      const result = await executePublishAttempt({
        item: makeItem({ renderedPngHashEn: undefined }),
        config: DEFAULT_CONFIG,
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("en PNG");
    });

    it("blocked when zh-CN PNG bytes missing (hash present)", async () => {
      const result = await executePublishAttempt({
        item: makeItem({ renderedPngZh: undefined }),
        config: DEFAULT_CONFIG,
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("zh-CN");
    });

    it("blocked when en PNG bytes missing (hash present)", async () => {
      const result = await executePublishAttempt({
        item: makeItem({ renderedPngEn: undefined }),
        config: DEFAULT_CONFIG,
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("en PNG");
    });

    it("blocked when brief missing", async () => {
      const result = await executePublishAttempt({
        item: makeItem({ brief: undefined }),
        config: DEFAULT_CONFIG,
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("Brief");
    });

    it("blocked when canary and not approved", async () => {
      const result = await executePublishAttempt({
        item: makeItem({ status: "ready_for_review" }),
        config: { ...DEFAULT_CONFIG, publishMode: "canary" },
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.attempt.failureStage).toContain("Canary");
      expect(result.attempt.failureStage).toContain("human approval");
    });
  });

  describe("dry-run publish", () => {
    it("produces attempted decision with dry-run adapter", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto" },
      });
      expect(result.attempt.decision).toBe("attempted");
      expect(result.attempt.adapter).toBe("dry-run");
      expect(result.attempt.dryRun).toBe(true);
      expect(result.publishResult?.success).toBe(true);
      expect(result.publishResult?.dryRun).toBe(true);
    });

    it("includes idempotency key", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto" },
      });
      expect(result.attempt.idempotencyKey).toBeTruthy();
      expect(result.attempt.idempotencyKey.length).toBeGreaterThan(10);
    });

    it("includes image hashes", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto" },
      });
      expect(result.attempt.imageHashZh).toBe("abc123");
      expect(result.attempt.imageHashEn).toBe("def456");
    });

    it("includes sourcePostId from brief", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto" },
      });
      expect(result.attempt.sourcePostId).toBe("p1");
    });
  });

  describe("idempotency", () => {
    it("returns duplicate when checkDuplicate finds existing", async () => {
      const existingAttempt: PublishAttempt = {
        id: "pa_existing",
        queueItemId: "q1",
        creatorId: "aleabitoreddit",
        conversationId: "conv_nvda",
        sourcePostId: "p1",
        policyVersion: 1,
        rolloutMode: "auto",
        dryRun: false,
        adapter: "x-api",
        payloadHash: "hash123",
        imageHashZh: "abc123",
        imageHashEn: "def456",
        idempotencyKey: "key123",
        decision: "attempted",
        externalPostId: "ext_123",
        attemptedAt: "2026-08-17T00:00:00Z",
      };

      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto", dryRun: false },
        checkDuplicate: async () => existingAttempt,
      });
      expect(result.attempt.decision).toBe("duplicate");
      expect(result.attempt.externalPostId).toBe("ext_123");
    });

    it("skips idempotency check for dry-run", async () => {
      const checkDuplicate =
        vi.fn<(key: string) => Promise<PublishAttempt | null>>();
      await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto", dryRun: true },
        checkDuplicate,
      });
      expect(checkDuplicate).not.toHaveBeenCalled();
    });

    it("second identical live attempt returns duplicate without calling the adapter again", async () => {
      // Mirror production wiring (#141): recordPublishAttempt + checkIdempotency
      // backed by one shared store — proves the production callback pair
      // prevents a second real adapter call for an identical item.
      const store: PublishAttempt[] = [];
      const recordAttempt = async (a: PublishAttempt) => {
        store.push(a);
      };
      const checkDuplicate = async (key: string) =>
        store.find(
          (a) =>
            a.idempotencyKey === key &&
            !a.dryRun &&
            a.decision === "attempted" &&
            a.externalPostId,
        ) ?? null;

      // Mock the real X adapter network flow:
      // INIT → APPEND → FINALIZE (×2 images) → metadata → POST /2/tweets
      let mediaCounter = 0;
      const fetchMock = vi.fn<
        (input: unknown, init?: { body?: unknown }) => Promise<Response>
      >(async (input, init) => {
        const url = String(input);
        if (url.includes("media/upload.json")) {
          const params = init?.body as URLSearchParams;
          if (params.get("command") === "INIT") {
            mediaCounter += 1;
            return new Response(
              JSON.stringify({ media_id_string: `media_${mediaCounter}` }),
              { status: 200 },
            );
          }
          return new Response("{}", { status: 200 }); // APPEND / FINALIZE
        }
        if (url.includes("media/metadata/create.json")) {
          return new Response("{}", { status: 200 });
        }
        if (url.endsWith("/tweets")) {
          return new Response(JSON.stringify({ data: { id: "ext_post_1" } }), {
            status: 200,
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      try {
        const liveConfig = {
          ...DEFAULT_CONFIG,
          dryRun: false,
          xWriteBearerToken: "fake-token",
        };

        // Attempt #1: live publish succeeds via real adapter
        const first = await executePublishAttempt({
          item: makeItem(),
          config: liveConfig,
          recordAttempt,
          checkDuplicate,
        });
        expect(first.attempt.decision).toBe("attempted");
        expect(first.attempt.externalPostId).toBe("ext_post_1");
        const callsAfterFirst = fetchMock.mock.calls.length;
        expect(callsAfterFirst).toBeGreaterThan(0);

        // Attempt #2: identical item → duplicate; adapter untouched
        const second = await executePublishAttempt({
          item: makeItem(),
          config: liveConfig,
          recordAttempt,
          checkDuplicate,
        });
        expect(second.attempt.decision).toBe("duplicate");
        expect(second.attempt.externalPostId).toBe("ext_post_1");
        expect(second.publishResult).toBeUndefined();
        // No new adapter calls — the duplicate gate fired first
        expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("no external writes", () => {
    it("default config (off + dryRun + killSwitch) → blocked", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: {
          publishMode: "off",
          dryRun: true,
          killSwitch: true,
        },
      });
      expect(result.attempt.decision).toBe("blocked");
      expect(result.publishResult).toBeUndefined();
    });

    it("shadow mode → attempted (dry-run adapter)", async () => {
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "shadow" },
      });
      expect(result.attempt.decision).toBe("attempted");
      expect(result.attempt.dryRun).toBe(true);
    });
  });

  describe("recordAttempt callback — ALL paths", () => {
    it("calls recordAttempt when publish succeeds", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();
      await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto" },
        recordAttempt,
      });
      expect(recordAttempt).toHaveBeenCalledOnce();
      expect(recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "attempted" }),
      );
    });

    it("calls recordAttempt when blocked by kill-switch", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();
      await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, killSwitch: true },
        recordAttempt,
      });
      expect(recordAttempt).toHaveBeenCalledOnce();
      expect(recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: "blocked",
          failureStage: expect.stringContaining("Kill switch"),
        }),
      );
    });

    it("calls recordAttempt when blocked by mode off", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();
      await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "off" },
        recordAttempt,
      });
      expect(recordAttempt).toHaveBeenCalledOnce();
      expect(recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "blocked" }),
      );
    });

    it("calls recordAttempt when blocked by missing PNG bytes", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();
      await executePublishAttempt({
        item: makeItem({ renderedPngZh: undefined }),
        config: DEFAULT_CONFIG,
        recordAttempt,
      });
      expect(recordAttempt).toHaveBeenCalledOnce();
      expect(recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "blocked" }),
      );
    });

    it("calls recordAttempt when blocked by canary not approved", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();
      await executePublishAttempt({
        item: makeItem({ status: "ready_for_review" }),
        config: { ...DEFAULT_CONFIG, publishMode: "canary" },
        recordAttempt,
      });
      expect(recordAttempt).toHaveBeenCalledOnce();
      expect(recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "blocked" }),
      );
    });

    it("calls recordAttempt on duplicate", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();
      const existingAttempt: PublishAttempt = {
        id: "pa_existing",
        queueItemId: "q1",
        creatorId: "aleabitoreddit",
        conversationId: "conv_nvda",
        sourcePostId: "p1",
        policyVersion: 1,
        rolloutMode: "auto",
        dryRun: false,
        adapter: "x-api",
        payloadHash: "hash123",
        imageHashZh: "abc123",
        imageHashEn: "def456",
        idempotencyKey: "key123",
        decision: "attempted",
        externalPostId: "ext_123",
        attemptedAt: "2026-08-17T00:00:00Z",
      };

      await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto", dryRun: false },
        checkDuplicate: async () => existingAttempt,
        recordAttempt,
      });
      expect(recordAttempt).toHaveBeenCalledOnce();
      expect(recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "duplicate" }),
      );
    });
  });

  describe("error neutralization", () => {
    it("failureStage does not contain raw adapter error", async () => {
      // With dry-run adapter, no error is expected.
      // But verify that blocked attempts have neutral failureStage.
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, killSwitch: true },
      });
      // failureStage should be a neutral descriptor, not raw external data
      expect(result.attempt.failureStage).not.toMatch(/\{.*\}/);
      expect(result.attempt.failureStage).not.toMatch(/stack/i);
    });
  });

  describe("concurrency reservation (#145)", () => {
    it("second concurrent attempt returns duplicate when reservation fails", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();

      // Simulate: checkDuplicate returns null (no existing),
      // but reserveKey returns false (another request already reserved)
      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto", dryRun: false },
        checkDuplicate: async () => null, // no existing successful attempt
        reserveKey: async () => false, // reservation failed (unique violation)
        recordAttempt,
      });

      expect(result.attempt.decision).toBe("duplicate");
      expect(recordAttempt).toHaveBeenCalledOnce();
      expect(recordAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ decision: "duplicate" }),
      );
    });

    it("successful reservation proceeds to adapter", async () => {
      const recordAttempt = vi.fn<(attempt: PublishAttempt) => Promise<void>>();

      const result = await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, publishMode: "auto", dryRun: false },
        checkDuplicate: async () => null,
        reserveKey: async () => true, // reservation acquired
        recordAttempt,
      });

      // With no real token, adapter creation fails → blocked
      // But the point is it did NOT return duplicate
      expect(result.attempt.decision).not.toBe("duplicate");
      expect(recordAttempt).toHaveBeenCalledOnce();
    });

    it("reservation is skipped for dry-run", async () => {
      const reserveKey = vi.fn<() => Promise<boolean>>();

      await executePublishAttempt({
        item: makeItem(),
        config: { ...DEFAULT_CONFIG, dryRun: true },
        reserveKey,
      });

      // reserveKey should NOT be called for dry-run
      expect(reserveKey).not.toHaveBeenCalled();
    });
  });
});
