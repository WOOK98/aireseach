/**
 * AleaBit — Multi-creator source adapter (#130)
 *
 * Wraps XIngestionAdapter with creator config context.
 * Supports multiple creators with per-creator fixture data.
 * Read-only: fetch only, never write/reply/quote/publish.
 */

import type { ThreadFetchResult } from "./adapter";
import type { CreatorSourceConfig } from "./creator-config";
import type { TriggerPost } from "@workspace/shared/types/aleabit";

// ── Creator-scoped adapter interface ─────────────────────────────────────────

export interface CreatorIngestResult {
  creatorId: string;
  handle: string;
  rootPosts: TriggerPost[];
  threads: Map<string, ThreadFetchResult>;
  fetchedAt: string;
}

/**
 * Adapter that fetches content for a specific creator.
 * Production impl uses X API v2; test/shadow uses replay fixtures.
 */
export interface CreatorSourceAdapter {
  /** The creator config this adapter serves */
  readonly config: CreatorSourceConfig;

  /** Fetch recent root posts for this creator */
  fetchRecentRootPosts(options: {
    maxResults: number;
    sinceId?: string;
  }): Promise<TriggerPost[]>;

  /** Fetch a thread by conversation ID */
  fetchThread(conversationId: string): Promise<ThreadFetchResult>;
}

// ── Multi-creator adapter ────────────────────────────────────────────────────

/**
 * Fetches content for multiple creators in sequence.
 * Returns per-creator results with timestamps.
 */
export async function fetchAllCreators(
  adapters: CreatorSourceAdapter[],
  options: { maxResultsPerCreator: number },
): Promise<CreatorIngestResult[]> {
  const results: CreatorIngestResult[] = [];

  for (const adapter of adapters) {
    if (!adapter.config.enabled) continue;

    const rootPosts = await adapter.fetchRecentRootPosts({
      maxResults: options.maxResultsPerCreator,
    });

    const threads = new Map<string, ThreadFetchResult>();
    for (const root of rootPosts) {
      const thread = await adapter.fetchThread(root.conversationId);
      threads.set(root.conversationId, thread);
    }

    results.push({
      creatorId: adapter.config.id,
      handle: adapter.config.handle,
      rootPosts,
      threads,
      fetchedAt: new Date().toISOString(),
    });
  }

  return results;
}
