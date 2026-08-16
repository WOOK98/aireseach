/**
 * AleaBit — Publish policy evaluator tests (#137)
 *
 * Validates all policy conditions:
 * - happy path: ready item + valid brief + bilingual PNG → allowed
 * - missing PNG → blocked
 * - metric missing period/source/unit → blocked
 * - needs_review/skipped/failed → blocked
 * - target price/rating words → blocked
 * - off/shadow/canary/auto four modes
 */

import { describe, expect, it } from "vitest";

import {
  evaluatePublishPolicy,
  CURRENT_POLICY_VERSION,
} from "../publish-policy";

import type { QueueItem } from "../queue-interface";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_ENTITY = {
  ok: true,
  companyName: "NVIDIA Corporation",
  ticker: "NVDA",
  market: "US",
  needsReview: false,
};

const BASE_BRIEF = {
  schema_version: 1 as const,
  triggerPost: {
    postId: "p1",
    id: "p1",
    conversationId: "conv_nvda",
    author: "test",
    authorHandle: "test",
    authorId: "u1",
    authorName: "Test",
    text: "NVDA earnings",
    postedAt: "2026-08-10T00:00:00Z",
    url: "https://x.com/test/p1",
    editHistory: ["v1"],
    fetchedAt: "2026-08-10T00:00:00Z",
    metrics: [],
    citations: [],
  },
  authorThesis: "AI infrastructure buildout accelerating.",
  company: "NVIDIA Corporation",
  ticker: "NVDA",
  market: "US",
  reportPeriod: "FY2026 Q2",
  publishedAt: "2026-08-10T00:00:00Z",
  metrics: [
    {
      name: "Revenue",
      value: 30_000_000_000,
      unit: "USD",
      period: "FY2026 Q2",
      yoyChange: 56,
      source: "E1",
    },
  ],
  guidanceChanges: [],
  drivers: [
    {
      description: "Blackwell GPU shipments doubled.",
      evidenceIds: ["E1"],
    },
  ],
  risksOrFalsifiers: [
    {
      description: "China export restrictions.",
      falsifier: "US-China trade deal.",
      evidenceIds: ["E1"],
    },
  ],
  limitations: [],
  sources: [
    {
      id: "E1",
      claim: "Q2 revenue $30B",
      source: "SEC 10-Q",
      date: "2026-08-10",
      confidence: "verified" as const,
    },
  ],
  disclaimer: "本简报基于公开财报自动生成，仅供参考，不构成投资建议。",
};

function makeItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "q1",
    creatorId: "aleabitoreddit",
    conversationId: "conv_nvda",
    triggerPost: BASE_BRIEF.triggerPost,
    status: "ready_for_review",
    entity: BASE_ENTITY as any,
    brief: BASE_BRIEF as any,
    renderedPngHashZh: "abc123",
    renderedPngHashEn: "def456",
    createdAt: "2026-08-10T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
    version: 1,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("evaluatePublishPolicy", () => {
  describe("happy path", () => {
    it("allowed when all conditions met (canary mode)", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "canary",
      });
      expect(decision.verdict).toBe("allowed");
      expect(decision.blockingReasons).toHaveLength(0);
      expect(decision.policyVersion).toBe(CURRENT_POLICY_VERSION);
    });

    it("allowed when all conditions met (auto mode)", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("allowed");
      expect(decision.blockingReasons).toHaveLength(0);
    });

    it("allowed for approved status", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ status: "approved" }),
        rolloutMode: "canary",
      });
      expect(decision.verdict).toBe("allowed");
    });
  });

  describe("rollout modes", () => {
    it("off → blocked even when all conditions met", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "off",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons).toContain("Rollout mode is 'off'.");
    });

    it("shadow → shadow_only when all conditions met", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "shadow",
      });
      expect(decision.verdict).toBe("shadow_only");
      expect(decision.blockingReasons).toHaveLength(0);
    });

    it("canary → allowed when all conditions met", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "canary",
      });
      expect(decision.verdict).toBe("allowed");
    });
  });

  describe("blocked conditions", () => {
    it("blocked when status is needs_review", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ status: "needs_review" }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(
        decision.blockingReasons.some((r) => r.includes("needs_review")),
      ).toBe(true);
    });

    it("blocked when status is skipped", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ status: "skipped" }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
    });

    it("blocked when status is failed", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ status: "failed" }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
    });

    it("blocked when brief missing", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ brief: undefined }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons.some((r) => r.includes("brief"))).toBe(
        true,
      );
    });

    it("blocked when zh-CN PNG missing", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ renderedPngHashZh: undefined }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons.some((r) => r.includes("zh-CN"))).toBe(
        true,
      );
    });

    it("blocked when en PNG missing", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ renderedPngHashEn: undefined }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons.some((r) => r.includes("en PNG"))).toBe(
        true,
      );
    });

    it("blocked when entity missing", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({ entity: undefined }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons.some((r) => r.includes("Entity"))).toBe(
        true,
      );
    });

    it("blocked when entity needs review", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem({
          entity: {
            ...BASE_ENTITY,
            needsReview: true,
            reviewReason: "ambiguous",
          } as any,
        }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(
        decision.blockingReasons.some((r) => r.includes("needs review")),
      ).toBe(true);
    });
  });

  describe("metric metadata", () => {
    it("blocked when metric missing source", () => {
      const brief = {
        ...BASE_BRIEF,
        metrics: [{ ...BASE_BRIEF.metrics[0], source: "" }],
      };
      const decision = evaluatePublishPolicy({
        item: makeItem({ brief: brief as any }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons.some((r) => r.includes("source"))).toBe(
        true,
      );
    });

    it("blocked when metric missing period", () => {
      const brief = {
        ...BASE_BRIEF,
        metrics: [{ ...BASE_BRIEF.metrics[0], period: "" }],
      };
      const decision = evaluatePublishPolicy({
        item: makeItem({ brief: brief as any }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons.some((r) => r.includes("period"))).toBe(
        true,
      );
    });

    it("blocked when metric missing unit", () => {
      const brief = {
        ...BASE_BRIEF,
        metrics: [{ ...BASE_BRIEF.metrics[0], unit: "" }],
      };
      const decision = evaluatePublishPolicy({
        item: makeItem({ brief: brief as any }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(decision.blockingReasons.some((r) => r.includes("unit"))).toBe(
        true,
      );
    });
  });

  describe("prohibited content", () => {
    it("blocked when authorThesis contains price target", () => {
      const brief = {
        ...BASE_BRIEF,
        authorThesis: "Price target $200, strong buy rating.",
      };
      const decision = evaluatePublishPolicy({
        item: makeItem({ brief: brief as any }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(
        decision.blockingReasons.some((r) => r.includes("prohibited")),
      ).toBe(true);
    });

    it("blocked when driver contains position sizing", () => {
      const brief = {
        ...BASE_BRIEF,
        drivers: [
          {
            description: "Allocate 20% of portfolio to this position.",
            evidenceIds: ["E1"],
          },
        ],
      };
      const decision = evaluatePublishPolicy({
        item: makeItem({ brief: brief as any }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
    });
  });

  describe("disclaimer", () => {
    it("blocked when disclaimer missing", () => {
      const brief = { ...BASE_BRIEF, disclaimer: "" };
      const decision = evaluatePublishPolicy({
        item: makeItem({ brief: brief as any }),
        rolloutMode: "auto",
      });
      expect(decision.verdict).toBe("blocked");
      expect(
        decision.blockingReasons.some((r) => r.includes("Disclaimer")),
      ).toBe(true);
    });
  });

  describe("decision metadata", () => {
    it("includes queueItemId, creatorId, conversationId", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "canary",
      });
      expect(decision.queueItemId).toBe("q1");
      expect(decision.creatorId).toBe("aleabitoreddit");
      expect(decision.conversationId).toBe("conv_nvda");
    });

    it("includes checkedAt timestamp", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "canary",
      });
      expect(decision.checkedAt).toBeTruthy();
      expect(new Date(decision.checkedAt).getTime()).not.toBeNaN();
    });

    it("includes rolloutMode", () => {
      const decision = evaluatePublishPolicy({
        item: makeItem(),
        rolloutMode: "shadow",
      });
      expect(decision.rolloutMode).toBe("shadow");
    });
  });
});

// ── Integration: NVDA fixture through shadow-run with canary mode ────────────

import { ReviewQueue } from "../queue";
import { runShadowRunWithQueue } from "../shadow-run";

describe("NVDA integration — canary mode", () => {
  it("NVDA fixture gets allowed verdict under canary", async () => {
    // Override env for shadow-run to use canary mode
    const origMode = process.env.ALEABIT_ROLLOUT_MODE;
    process.env.ALEABIT_ROLLOUT_MODE = "canary";

    try {
      const queue = new ReviewQueue();
      const result = await runShadowRunWithQueue(queue);

      // NVDA should be ready_for_review
      const nvda = result.items.find(
        (i) => i.conversationId === "conv_nvda_earnings_q2",
      );
      expect(nvda).toBeTruthy();
      expect(nvda!.status).toBe("ready_for_review");

      // Policy decision should exist and be allowed
      expect(nvda!.policyDecision).toBeTruthy();
      expect(nvda!.policyDecision!.verdict).toBe("allowed");
      expect(nvda!.policyDecision!.blockingReasons).toHaveLength(0);
      expect(nvda!.policyDecision!.rolloutMode).toBe("canary");

      // Bilingual PNG hashes should exist
      expect(nvda!.renderedPngHashZh).toBeTruthy();
      expect(nvda!.renderedPngHashEn).toBeTruthy();
    } finally {
      process.env.ALEABIT_ROLLOUT_MODE = origMode;
    }
  }, 60_000);

  it("NVDA fixture blocked under off mode", async () => {
    const origMode = process.env.ALEABIT_ROLLOUT_MODE;
    process.env.ALEABIT_ROLLOUT_MODE = "off";

    try {
      const queue = new ReviewQueue();
      const result = await runShadowRunWithQueue(queue);

      const nvda = result.items.find(
        (i) => i.conversationId === "conv_nvda_earnings_q2",
      );
      expect(nvda).toBeTruthy();
      expect(nvda!.policyDecision).toBeTruthy();
      expect(nvda!.policyDecision!.verdict).toBe("blocked");
      expect(
        nvda!.policyDecision!.blockingReasons.some((r) => r.includes("off")),
      ).toBe(true);
    } finally {
      process.env.ALEABIT_ROLLOUT_MODE = origMode;
    }
  }, 60_000);
});
