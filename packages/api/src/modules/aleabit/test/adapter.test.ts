/**
 * AleaBit — Replay adapter tests (#119)
 *
 * Validates:
 * - Fixture adapter returns correct thread data
 * - Author-only reply filtering
 * - Missing conversation returns error
 * - Single post fetch works
 * - All 4 fixtures are accessible
 */
import { describe, it, expect } from "vitest";

import { ReplayAdapter, REPLAY_FIXTURES } from "../fixtures/replay-adapter";

// ── Replay adapter ───────────────────────────────────────────────────────────

describe("ReplayAdapter", () => {
  const adapter = new ReplayAdapter();

  it("fetches NVIDIA earnings thread", async () => {
    const result = await adapter.fetchThread("conv_nvda_earnings_q2");
    expect(result.ok).toBe(true);
    expect(result.rootPost?.postId).toBe("fixture_nvda_001");
    expect(result.rootPost?.authorHandle).toBe("aleabitoreddit");
    expect(result.replies?.length).toBe(2);
  });

  it("fetches SK Hynix supply chain thread", async () => {
    const result = await adapter.fetchThread("conv_skhynix_hbm");
    expect(result.ok).toBe(true);
    expect(result.rootPost?.postId).toBe("fixture_skhynix_001");
    expect(result.replies?.length).toBe(1);
  });

  it("returns error for missing conversation", async () => {
    const result = await adapter.fetchThread("nonexistent_conv");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("No fixture found");
  });

  it("fetches single post by ID", async () => {
    const post = await adapter.fetchPost("fixture_nvda_001");
    expect(post).not.toBeNull();
    expect(post?.conversationId).toBe("conv_nvda_earnings_q2");
  });

  it("returns null for missing post", async () => {
    const post = await adapter.fetchPost("nonexistent_post");
    expect(post).toBeNull();
  });

  it("fetches recent root posts", async () => {
    const posts = await adapter.fetchRecentRootPosts({ maxResults: 10 });
    expect(posts.length).toBe(4); // 4 fixture threads
    expect(posts.every((p) => p.authorHandle === "aleabitoreddit")).toBe(true);
  });

  it("respects maxResults limit", async () => {
    const posts = await adapter.fetchRecentRootPosts({ maxResults: 2 });
    expect(posts.length).toBe(2);
  });

  it("respects sinceId filter", async () => {
    const posts = await adapter.fetchRecentRootPosts({
      maxResults: 10,
      sinceId: "fixture_nvda_001",
    });
    // Only posts with postId > "fixture_nvda_001" alphabetically
    expect(posts.every((p) => p.postId > "fixture_nvda_001")).toBe(true);
  });

  it("filters non-author replies from thread", async () => {
    // Create a fixture with mixed author replies
    const mixedFixtures = {
      mixed_thread: [
        {
          postId: "mixed_001",
          conversationId: "conv_mixed",
          author: "AleaBit",
          authorHandle: "aleabitoreddit",
          text: "Original post about $NVDA.",
          postedAt: "2026-08-10T20:00:00Z",
          url: "https://x.com/aleabitoreddit/status/mixed_001",
          editHistory: ["2026-08-10T20:00:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
        {
          postId: "mixed_002",
          conversationId: "conv_mixed",
          author: "AleaBit",
          authorHandle: "aleabitoreddit",
          text: "Author's own follow-up.",
          postedAt: "2026-08-10T20:02:00Z",
          url: "https://x.com/aleabitoreddit/status/mixed_002",
          editHistory: ["2026-08-10T20:02:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
        {
          postId: "mixed_003",
          conversationId: "conv_mixed",
          author: "RandomUser",
          authorHandle: "randomuser",
          text: "Random reply from another user.",
          postedAt: "2026-08-10T20:05:00Z",
          url: "https://x.com/randomuser/status/mixed_003",
          editHistory: ["2026-08-10T20:05:00Z"],
          fetchedAt: "2026-08-11T10:00:00Z",
        },
      ],
    };
    const adapter = new ReplayAdapter(mixedFixtures);
    const result = await adapter.fetchThread("conv_mixed");
    expect(result.ok).toBe(true);
    expect(result.replies?.length).toBe(1);
    expect(result.replies?.[0]?.authorHandle).toBe("aleabitoreddit");
  });

  it("all 4 fixtures are accessible", () => {
    expect(Object.keys(REPLAY_FIXTURES).length).toBe(4);
    expect(REPLAY_FIXTURES["nvda_earnings"]).toBeDefined();
    expect(REPLAY_FIXTURES["skhynix_supply_chain"]).toBeDefined();
    expect(REPLAY_FIXTURES["no_entity_macro"]).toBeDefined();
    expect(REPLAY_FIXTURES["edited_post"]).toBeDefined();
  });
});

describe("Fixture content validity", () => {
  it("NVIDIA fixture has earnings signals", async () => {
    const adapter = new ReplayAdapter();
    const result = await adapter.fetchThread("conv_nvda_earnings_q2");
    expect(result.rootPost?.text).toMatch(/earnings|revenue|EPS/i);
  });

  it("SK Hynix fixture has supply chain signals", async () => {
    const adapter = new ReplayAdapter();
    const result = await adapter.fetchThread("conv_skhynix_hbm");
    expect(result.rootPost?.text).toMatch(/supply|bottleneck|HBM/i);
  });

  it("no-entity fixture has no company/ticker", async () => {
    const adapter = new ReplayAdapter();
    const result = await adapter.fetchThread("conv_macro_generic");
    expect(result.rootPost?.text).not.toMatch(/\$[A-Z]{2,5}\b/);
    expect(result.rootPost?.text).not.toMatch(
      /\b(NVIDIA|Apple|Tesla|Microsoft)\b/i,
    );
  });

  it("edited fixture has multiple edit timestamps", async () => {
    const adapter = new ReplayAdapter();
    const post = await adapter.fetchPost("fixture_edit_001");
    expect(post?.editHistory.length).toBe(2);
  });
});
