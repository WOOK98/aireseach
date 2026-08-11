/**
 * AleaBit — X ingestion adapter interface (#119)
 *
 * Abstraction for fetching X threads. Production implementation uses
 * X API v2; test/shadow-run uses replay fixtures.
 *
 * Design: interface-first so tests never depend on production tokens.
 */
import type { TriggerPost } from "@workspace/shared/types/aleabit";

export interface ThreadFetchResult {
  ok: boolean;
  rootPost?: TriggerPost;
  replies?: TriggerPost[]; // author-only replies in the thread
  error?: string;
}

export interface XIngestionAdapter {
  /**
   * Fetch recent root posts from the target account.
   * Root posts = original posts (not retweets, not replies).
   */
  fetchRecentRootPosts(options: {
    maxResults: number;
    sinceId?: string;
  }): Promise<TriggerPost[]>;

  /**
   * Fetch a full thread by conversation ID.
   * Returns the root post + all replies by the same author.
   * Excludes other users' replies.
   */
  fetchThread(conversationId: string): Promise<ThreadFetchResult>;

  /**
   * Fetch a single post by ID.
   */
  fetchPost(postId: string): Promise<TriggerPost | null>;
}
