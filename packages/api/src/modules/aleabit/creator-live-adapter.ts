/**
 * AleaBit — Live X read-only adapter (#133)
 *
 * Fetches real posts from X API v2 using read-only endpoints.
 * Never writes/replies/quotes/uploads/publishes.
 *
 * Uses Bearer token auth (app-level, read-only).
 * Gracefully handles: missing token, rate limits, malformed responses,
 * empty results, network errors.
 */

import type { ThreadFetchResult } from "./adapter";
import type { CreatorSourceAdapter } from "./creator-adapter";
import type { CreatorSourceConfig } from "./creator-config";
import type { TriggerPost } from "@workspace/shared/types/aleabit";

// ── X API v2 response types (minimal) ────────────────────────────────────────

interface XUserResponse {
  data?: { id: string; username: string };
  errors?: Array<{ message: string; type: string }>;
}

interface XTweet {
  id: string;
  text: string;
  author_id: string;
  conversation_id?: string;
  created_at?: string;
  edit_history_tweet_ids?: string[];
  in_reply_to_user_id?: string;
  referenced_tweets?: Array<{ type: string; id: string }>;
}

interface XTweetsResponse {
  data?: XTweet[];
  includes?: {
    users?: Array<{ id: string; username: string; name: string }>;
  };
  meta?: { result_count: number; next_token?: string };
  errors?: Array<{ message: string; type: string; code?: string }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const X_API_BASE = "https://api.x.com/2";

const READ_ONLY_ENDPOINTS = [
  "/tweets/search/recent",
  "/tweets",
  "/users",
  "/users/by/username",
];

/**
 * Verify a URL path only targets read-only endpoints.
 */
function assertReadOnly(path: string): void {
  const clean = path.split("?")[0]!;
  if (!READ_ONLY_ENDPOINTS.some((e) => clean.startsWith(e))) {
    throw new Error(`Blocked non-read-only endpoint: ${clean}`);
  }
}

function buildAuthorUrl(handle: string, postId: string): string {
  return `https://x.com/${handle}/status/${postId}`;
}

function mapTweetToTriggerPost(
  tweet: XTweet,
  authorHandle: string,
  authorName: string,
): TriggerPost {
  return {
    postId: tweet.id,
    conversationId: tweet.conversation_id ?? tweet.id,
    author: authorName,
    authorHandle,
    text: tweet.text,
    postedAt: tweet.created_at ?? new Date().toISOString(),
    url: buildAuthorUrl(authorHandle, tweet.id),
    editHistory: tweet.edit_history_tweet_ids ?? [tweet.id],
    fetchedAt: new Date().toISOString(),
  };
}

// ── Rate limit error ─────────────────────────────────────────────────────────

export class XRateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`X API rate limited. Retry after ${retryAfterMs}ms.`);
    this.name = "XRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

// ── Live adapter ─────────────────────────────────────────────────────────────

/**
 * Live X read-only adapter. Uses X API v2 with app-level Bearer token.
 *
 * Read-only by design:
 * - Only calls search/recent, user lookup, and tweet lookup endpoints.
 * - `assertReadOnly()` guards every fetch call.
 * - No tweet/reply/quote/upload/media/publish/delete/follow/like code path.
 */
export class CreatorLiveAdapter implements CreatorSourceAdapter {
  readonly config: CreatorSourceConfig;
  private readonly bearerToken: string;
  private userId: string | null = null;

  constructor(config: CreatorSourceConfig, bearerToken: string) {
    this.config = config;
    this.bearerToken = bearerToken;
  }

  /**
   * Resolve the numeric user ID from the handle.
   * Cached after first call.
   */
  private async getUserId(): Promise<string> {
    if (this.userId) return this.userId;

    const path = `/users/by/username/${this.config.handle}`;
    assertReadOnly(path);

    const data = await this.fetchJson<XUserResponse>(path);

    if (!data.data?.id) {
      throw new Error(`User not found: ${this.config.handle}`);
    }

    this.userId = data.data.id;
    return this.userId;
  }

  async fetchRecentRootPosts(options: {
    maxResults: number;
    sinceId?: string;
  }): Promise<TriggerPost[]> {
    const userId = await this.getUserId();

    // Search for root posts (not retweets, not replies) from this user.
    const params = new URLSearchParams({
      query: `from:${this.config.handle} -is:retweet -is:reply`,
      max_results: String(Math.min(options.maxResults, 100)),
      "tweet.fields":
        "author_id,conversation_id,created_at,edit_history_tweet_ids,in_reply_to_user_id,referenced_tweets",
      expansions: "author_id",
      "user.fields": "username,name",
    });

    if (options.sinceId) {
      params.set("since_id", options.sinceId);
    }

    const path = `/tweets/search/recent?${params.toString()}`;
    assertReadOnly(path);

    const data = await this.fetchJson<XTweetsResponse>(path);

    if (!data.data || data.data.length === 0) {
      return [];
    }

    // Resolve author name from includes
    const authorName =
      data.includes?.users?.find((u) => u.id === userId)?.name ??
      this.config.displayName;

    return data.data
      .filter((t) => !t.in_reply_to_user_id) // exclude replies
      .filter((t) => {
        // exclude retweets
        return !t.referenced_tweets?.some((r) => r.type === "retweeted");
      })
      .map((t) => mapTweetToTriggerPost(t, this.config.handle, authorName));
  }

  async fetchThread(conversationId: string): Promise<ThreadFetchResult> {
    const userId = await this.getUserId();

    // Search for all tweets in this conversation by the author.
    const params = new URLSearchParams({
      query: `conversation_id:${conversationId} from:${this.config.handle}`,
      max_results: "100",
      "tweet.fields":
        "author_id,conversation_id,created_at,edit_history_tweet_ids,in_reply_to_user_id,referenced_tweets",
      expansions: "author_id",
      "user.fields": "username,name",
    });

    const path = `/tweets/search/recent?${params.toString()}`;
    assertReadOnly(path);

    const data = await this.fetchJson<XTweetsResponse>(path);

    if (!data.data || data.data.length === 0) {
      return { ok: false, error: "Thread not found or empty." };
    }

    const authorName =
      data.includes?.users?.find((u) => u.id === userId)?.name ??
      this.config.displayName;

    // Find root post (earliest, or the one that's not a reply)
    const authorTweets = data.data.filter((t) => t.author_id === userId);

    if (authorTweets.length === 0) {
      return { ok: false, error: "No author tweets in thread." };
    }

    // Root = the tweet that is NOT an in_reply_to of another tweet in the set
    const tweetIds = new Set(authorTweets.map((t) => t.id));
    const root =
      authorTweets.find(
        (t) =>
          !t.referenced_tweets?.some(
            (r) => r.type === "replied_to" && tweetIds.has(r.id),
          ),
      ) ?? authorTweets[0]!;

    // Author replies = all others
    const replies = authorTweets
      .filter((t) => t.id !== root.id)
      .map((t) => mapTweetToTriggerPost(t, this.config.handle, authorName));

    return {
      ok: true,
      rootPost: mapTweetToTriggerPost(root, this.config.handle, authorName),
      replies,
    };
  }

  // ── HTTP ────────────────────────────────────────────────────────────────

  private async fetchJson<T>(path: string): Promise<T> {
    const url = path.startsWith("http") ? path : `${X_API_BASE}${path}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("x-rate-limit-reset");
      const retryAfterMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000 - Date.now()
        : 60_000;
      throw new XRateLimitError(Math.max(retryAfterMs, 1_000));
    }

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error("X API returned malformed response.");
    }
  }
}
