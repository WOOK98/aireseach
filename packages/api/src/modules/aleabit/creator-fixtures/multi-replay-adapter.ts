/**
 * AleaBit — Multi-creator replay adapter (#130)
 *
 * Serves fixture data for multiple creators.
 * Combines AleaBit fixtures (existing) + Serenity fixtures (new).
 * Used in tests and shadow-runs — never in production.
 */

import { REPLAY_FIXTURES } from "../fixtures/replay-adapter";
import { SERENITY_FIXTURES } from "./serenity-fixtures";

import type { ThreadFetchResult } from "../adapter";
import type { CreatorSourceAdapter } from "../creator-adapter";
import type { CreatorSourceConfig } from "../creator-config";
import type { TriggerPost } from "@workspace/shared/types/aleabit";

// ── Fixture registry per creator ─────────────────────────────────────────────

const CREATOR_FIXTURE_MAP: Record<string, Record<string, TriggerPost[]>> = {
  aleabitoreddit: REPLAY_FIXTURES,
  serenity: SERENITY_FIXTURES,
};

/**
 * Get fixture data for a creator. Falls back to empty if no fixtures.
 */
export function getCreatorFixtures(
  creatorId: string,
): Record<string, TriggerPost[]> {
  return CREATOR_FIXTURE_MAP[creatorId] ?? {};
}

/**
 * Register fixture data for a creator (for testing).
 */
export function registerCreatorFixtures(
  creatorId: string,
  fixtures: Record<string, TriggerPost[]>,
): void {
  CREATOR_FIXTURE_MAP[creatorId] = fixtures;
}

// ── Creator replay adapter ───────────────────────────────────────────────────

/**
 * Replay adapter scoped to a specific creator config.
 * Fetches from fixture data matching the creator's id.
 */
export class CreatorReplayAdapter implements CreatorSourceAdapter {
  readonly config: CreatorSourceConfig;
  private fixtures: Record<string, TriggerPost[]>;

  constructor(
    config: CreatorSourceConfig,
    fixtures?: Record<string, TriggerPost[]>,
  ) {
    this.config = config;
    this.fixtures = fixtures ?? getCreatorFixtures(config.id);
  }

  async fetchRecentRootPosts(options: {
    maxResults: number;
    sinceId?: string;
  }): Promise<TriggerPost[]> {
    const rootPosts: TriggerPost[] = [];

    for (const posts of Object.values(this.fixtures)) {
      const root = posts[0];
      if (root) {
        if (options.sinceId && root.postId <= options.sinceId) continue;
        rootPosts.push(root);
      }
    }

    return rootPosts.slice(0, options.maxResults);
  }

  async fetchThread(conversationId: string): Promise<ThreadFetchResult> {
    for (const posts of Object.values(this.fixtures)) {
      if (posts[0]?.conversationId === conversationId) {
        const root = posts[0];
        const authorHandle = root.authorHandle;
        // STRICT: only include replies by the same author
        const authorReplies = posts
          .slice(1)
          .filter((p) => p.authorHandle === authorHandle);
        return {
          ok: true,
          rootPost: root,
          replies: authorReplies,
        };
      }
    }

    return {
      ok: false,
      error: `No fixture found for conversationId: ${conversationId}`,
    };
  }
}

// ── Convenience: build adapters for all enabled creators ─────────────────────

/**
 * Build replay adapters for a list of creator configs.
 * Only returns adapters for enabled configs.
 */
export function buildCreatorReplayAdapters(
  configs: CreatorSourceConfig[],
): CreatorReplayAdapter[] {
  return configs
    .filter((c) => c.enabled)
    .map((c) => new CreatorReplayAdapter(c));
}
