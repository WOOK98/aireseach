/**
 * AleaBit — Live X adapter + factory tests (#133)
 *
 * Tests:
 * - Live adapter: valid root post + thread → queue item
 * - Live adapter: duplicate run → no duplicate
 * - Factory: missing live token → creator skipped
 * - Live adapter: non-author replies excluded
 * - Live adapter: malformed response → graceful failure
 * - No X write surface in live adapter code
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { buildCreatorAdapters } from "../creator-adapter-factory";
import { runMultiCreatorIngest } from "../creator-ingest";
import { CreatorLiveAdapter, XRateLimitError } from "../creator-live-adapter";
import { FakePersistentQueue } from "./fake-persistent-queue";

import type { CreatorSourceConfig } from "../creator-config";

// ── Mock X API responses ─────────────────────────────────────────────────────

const MOCK_ROOT_TWEET = {
  id: "t100",
  text: "NVDA Q2 revenue $30B, beating consensus by 15%",
  author_id: "12345",
  conversation_id: "t100",
  created_at: "2026-08-10T12:00:00.000Z",
  edit_history_tweet_ids: ["t100"],
};

const MOCK_AUTHOR_REPLY = {
  id: "t101",
  text: "Breakdown: Data Center $25B, Gaming $5B",
  author_id: "12345",
  conversation_id: "t100",
  created_at: "2026-08-10T12:05:00.000Z",
  edit_history_tweet_ids: ["t101"],
  in_reply_to_user_id: "12345",
  referenced_tweets: [{ type: "replied_to", id: "t100" }],
};

const MOCK_OTHER_REPLY = {
  id: "t102",
  text: "Great analysis!",
  author_id: "99999", // different author
  conversation_id: "t100",
  created_at: "2026-08-10T12:10:00.000Z",
  edit_history_tweet_ids: ["t102"],
  in_reply_to_user_id: "12345",
  referenced_tweets: [{ type: "replied_to", id: "t100" }],
};

const LIVE_CONFIG: CreatorSourceConfig = {
  id: "aleabitoreddit",
  platform: "x",
  handle: "aleabitoreddit",
  displayName: "AleaBit",
  language: "en",
  domains: ["equity", "semiconductor", "ai", "supply_chain"],
  trackedSignals: ["earnings", "guidance", "supply_chain"],
  trustedClaimTypes: ["factual_citation", "data_reference"],
  requiresExternalEvidenceFor: ["any_financial_metric"],
  outputFormats: ["financial_brief"],
  enabled: true,
  ingestMode: "live",
};

// ── Mock fetch helper ────────────────────────────────────────────────────────

function setupMockFetch(options?: {
  searchResults?: unknown[];
  threadResults?: unknown[];
  users?: unknown[];
  failSearch?: boolean;
  rateLimit?: boolean;
  malformed?: boolean;
}) {
  // eslint-disable-next-line vitest/require-mock-type-parameters
  const mockFetch = vi.fn(async (url: string): Promise<Response> => {
    const urlStr = url;

    if (options?.rateLimit) {
      return new Response(JSON.stringify({}), {
        status: 429,
        headers: {
          "x-rate-limit-reset": String(Math.floor(Date.now() / 1000) + 60),
        },
      });
    }

    if (options?.malformed) {
      // User lookup succeeds, but search returns malformed
      if (
        urlStr.includes("/users/by/") ||
        urlStr.includes("%2Fusers%2Fby%2F")
      ) {
        return new Response(
          JSON.stringify({ data: { id: "12345", username: "aleabitoreddit" } }),
          { status: 200 },
        );
      }
      return new Response("not json", { status: 200 });
    }

    if (options?.failSearch) {
      return new Response(
        JSON.stringify({ errors: [{ message: "Forbidden", type: "oauth" }] }),
        { status: 403 },
      );
    }

    // User lookup
    if (
      urlStr.includes("/users/by/username/") ||
      urlStr.includes("%2Fusers%2Fby%2Fusername%2F")
    ) {
      return new Response(
        JSON.stringify({ data: { id: "12345", username: "aleabitoreddit" } }),
        { status: 200 },
      );
    }

    // Search recent
    if (
      urlStr.includes("search/recent") ||
      urlStr.includes("search%2Frecent")
    ) {
      // conversation_id in tweet.fields is NOT a thread search.
      // Thread search has conversation_id: in the query param.
      const isThread =
        urlStr.includes("conversation_id%3A") ||
        urlStr.includes("conversation%5Fid%3A");

      if (isThread) {
        const threadData =
          options && "threadResults" in options
            ? options.threadResults
            : [MOCK_ROOT_TWEET, MOCK_AUTHOR_REPLY, MOCK_OTHER_REPLY];
        return new Response(
          JSON.stringify({
            data: threadData,
            includes: {
              users: [
                { id: "12345", username: "aleabitoreddit", name: "AleaBit" },
              ],
            },
          }),
          { status: 200 },
        );
      }

      const searchData =
        options && "searchResults" in options
          ? options.searchResults
          : [MOCK_ROOT_TWEET];
      return new Response(
        JSON.stringify({
          data: searchData,
          includes: {
            users: [
              { id: "12345", username: "aleabitoreddit", name: "AleaBit" },
            ],
          },
          meta: { result_count: 1 },
        }),
        { status: 200 },
      );
    }

    return new Response(JSON.stringify({}), { status: 404 });
  });

  vi.stubGlobal("fetch", mockFetch);
  return mockFetch;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CreatorLiveAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches root posts from live X API", async () => {
    setupMockFetch();
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    const posts = await adapter.fetchRecentRootPosts({ maxResults: 10 });

    expect(posts).toHaveLength(1);
    expect(posts[0]!.postId).toBe("t100");
    expect(posts[0]!.authorHandle).toBe("aleabitoreddit");
    expect(posts[0]!.text).toContain("NVDA");
  });

  it("fetches thread with author-only replies", async () => {
    setupMockFetch();
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    const thread = await adapter.fetchThread("t100");

    expect(thread.ok).toBe(true);
    expect(thread.rootPost?.postId).toBe("t100");
    // Should include author reply, exclude other user's reply
    expect(thread.replies).toHaveLength(1);
    expect(thread.replies![0]!.postId).toBe("t101");
  });

  it("returns empty posts when search returns nothing", async () => {
    setupMockFetch({ searchResults: [] });
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    const posts = await adapter.fetchRecentRootPosts({ maxResults: 10 });

    expect(posts).toHaveLength(0);
  });

  it("throws on rate limit", async () => {
    setupMockFetch({ rateLimit: true });
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    await expect(
      adapter.fetchRecentRootPosts({ maxResults: 10 }),
    ).rejects.toThrow(XRateLimitError);
  });

  it("throws on API error", async () => {
    setupMockFetch({ failSearch: true });
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    await expect(
      adapter.fetchRecentRootPosts({ maxResults: 10 }),
    ).rejects.toThrow("X API error");
  });

  it("throws on malformed response", async () => {
    setupMockFetch({ malformed: true });
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    await expect(
      adapter.fetchRecentRootPosts({ maxResults: 10 }),
    ).rejects.toThrow("malformed");
  });

  it("returns error when thread not found", async () => {
    setupMockFetch({ threadResults: [] });
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    const thread = await adapter.fetchThread("nonexistent");

    expect(thread.ok).toBe(false);
    expect(thread.error).toBeDefined();
  });

  it("excludes retweets from root posts", async () => {
    setupMockFetch({
      searchResults: [
        MOCK_ROOT_TWEET,
        {
          ...MOCK_ROOT_TWEET,
          id: "t200",
          text: "RT something",
          referenced_tweets: [{ type: "retweeted", id: "t300" }],
        },
      ],
    });
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");

    const posts = await adapter.fetchRecentRootPosts({ maxResults: 10 });

    expect(posts).toHaveLength(1);
    expect(posts[0]!.postId).toBe("t100");
  });
});

describe("buildCreatorAdapters", () => {
  it("uses live adapter when mode=live and token present", () => {
    const config: CreatorSourceConfig = { ...LIVE_CONFIG, ingestMode: "live" };
    const { adapters, skipped } = buildCreatorAdapters([config], "test-token");

    expect(adapters).toHaveLength(1);
    expect(adapters[0]!.constructor.name).toBe("CreatorLiveAdapter");
    expect(skipped).toHaveLength(0);
  });

  it("skips live creator when no token", () => {
    const config: CreatorSourceConfig = { ...LIVE_CONFIG, ingestMode: "live" };
    const { adapters, skipped } = buildCreatorAdapters([config], "");

    expect(adapters).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.creatorId).toBe("aleabitoreddit");
    expect(skipped[0]!.reason).toContain("no X API token");
  });

  it("uses replay adapter for replay mode", () => {
    const config: CreatorSourceConfig = {
      ...LIVE_CONFIG,
      ingestMode: "replay",
    };
    const { adapters, skipped } = buildCreatorAdapters([config], "test-token");

    expect(adapters).toHaveLength(1);
    expect(adapters[0]!.constructor.name).toBe("CreatorReplayAdapter");
    expect(skipped).toHaveLength(0);
  });

  it("skips disabled creators", () => {
    const config: CreatorSourceConfig = { ...LIVE_CONFIG, enabled: false };
    const { adapters, skipped } = buildCreatorAdapters([config], "test-token");

    expect(adapters).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });

  it("handles mixed live + replay configs", () => {
    const liveConfig: CreatorSourceConfig = {
      ...LIVE_CONFIG,
      ingestMode: "live",
    };
    const replayConfig: CreatorSourceConfig = {
      ...LIVE_CONFIG,
      id: "serenity",
      handle: "serenity",
      ingestMode: "replay",
    };
    const { adapters, skipped } = buildCreatorAdapters(
      [liveConfig, replayConfig],
      "test-token",
    );

    expect(adapters).toHaveLength(2);
    expect(skipped).toHaveLength(0);
  });
});

describe("Live ingest → queue integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("live ingest creates queue items", async () => {
    setupMockFetch();
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");
    const queue = new FakePersistentQueue();

    const result = await runMultiCreatorIngest(queue, [adapter], {
      maxResultsPerCreator: 5,
    });

    expect(result.totalSummary.classified).toBeGreaterThanOrEqual(1);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it("duplicate live run does not create duplicate items", async () => {
    setupMockFetch();
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");
    const queue = new FakePersistentQueue();

    await runMultiCreatorIngest(queue, [adapter], { maxResultsPerCreator: 5 });
    const result2 = await runMultiCreatorIngest(queue, [adapter], {
      maxResultsPerCreator: 5,
    });

    // Second run should detect duplicates
    expect(result2.totalSummary.duplicates).toBeGreaterThanOrEqual(1);
  });

  it("malformed API response does not crash whole ingest", async () => {
    setupMockFetch({ malformed: true });
    const adapter = new CreatorLiveAdapter(LIVE_CONFIG, "test-token");
    const queue = new FakePersistentQueue();

    // Should not throw — errors are caught per-creator
    const result = await runMultiCreatorIngest(queue, [adapter], {
      maxResultsPerCreator: 5,
    });

    // All items failed due to malformed response
    expect(result.totalSummary.fetched).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe("No X write surface", () => {
  it("live adapter source has no write API paths", () => {
    const sourcePath = resolve(__dirname, "../creator-live-adapter.ts");
    const source = readFileSync(sourcePath, "utf-8");

    // These are write-only X API path strings (in quotes).
    // Read-only paths like /tweets/search/recent, /users/by/username are allowed.
    const writePatterns = [
      /"\/[0-9.]*\/media/i, // media upload endpoint
      /oauth\/access_token/i, // OAuth token exchange
      /"\/[0-9.]*\/retweet/i, // retweet endpoint
      /"\/[0-9.]*\/like/i, // like endpoint
      /"\/[0-9.]*\/follow/i, // follow endpoint
      /"\/[0-9.]*\/tweets"[^,]*\.post/i, // POST to tweets endpoint (create)
      /"\/[0-9.]*\/delete/i, // delete endpoint
    ];

    for (const pattern of writePatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
});
