import type { XIngestionAdapter, ThreadFetchResult } from "../adapter";
/**
 * AleaBit — Replay fixture adapter (#119)
 *
 * Implements XIngestionAdapter using local fixture data.
 * Used in tests and shadow-runs — never in production.
 */
import type { TriggerPost } from "@workspace/shared/types/aleabit";

// ── Fixture data ─────────────────────────────────────────────────────────────

/**
 * Fixture 1: NVIDIA earnings thread (valid — should generate brief)
 */
const NVIDIA_EARNINGS_THREAD: TriggerPost[] = [
  {
    postId: "fixture_nvda_001",
    conversationId: "conv_nvda_earnings_q2",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: `$NVDA Q2 FY2026 earnings just dropped:

Revenue: $30.0B (+56% YoY) — beat consensus of $28.4B
Data Center: $26.3B (+62% YoY)
Gross Margin: 75.1%
EPS: $0.68 vs $0.60 est

The AI infrastructure buildout is accelerating. Blackwell ramp is the real story here — management raised full-year guidance.

Thread 🧵👇`,
    postedAt: "2026-08-10T20:30:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_nvda_001",
    editHistory: ["2026-08-10T20:30:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
  {
    postId: "fixture_nvda_002",
    conversationId: "conv_nvda_earnings_q2",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: "Key drivers: 1) Blackwell GPU shipments doubled QoQ. 2) Hyperscaler capex continues. 3) Inference demand now exceeding training. 4) CUDA ecosystem lock-in deepening.",
    postedAt: "2026-08-10T20:32:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_nvda_002",
    editHistory: ["2026-08-10T20:32:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
  {
    postId: "fixture_nvda_003",
    conversationId: "conv_nvda_earnings_q2",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: "Risks to watch: 1) China export restrictions tightening further. 2) Custom silicon from GOOG/AMZN/META gaining traction. 3) Margin pressure if competition heats up. But for now — dominant position intact.",
    postedAt: "2026-08-10T20:34:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_nvda_003",
    editHistory: ["2026-08-10T20:34:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
];

/**
 * Fixture 2: SK Hynix supply chain thread (valid — supply chain category)
 */
const SKHYNIX_SUPPLY_CHAIN_THREAD: TriggerPost[] = [
  {
    postId: "fixture_skhynix_001",
    conversationId: "conv_skhynix_hbm",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: `SK Hynix (000660.KS) HBM bottleneck analysis:

The entire AI GPU supply chain runs through SK Hynix HBM3E. Lead times now extended to 52+ weeks. This is the real constraint on $NVDA Blackwell shipments.

Capacity expansion at Icheon campus won't hit volume until Q1 2027.

Thread 🧵👇`,
    postedAt: "2026-08-09T14:00:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_skhynix_001",
    editHistory: ["2026-08-09T14:00:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
  {
    postId: "fixture_skhynix_002",
    conversationId: "conv_skhynix_hbm",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: "TSMC CoWoS packaging is the second bottleneck. Advanced packaging capacity fully booked through 2027. ASML EUV tools delivery also constrained. The whole supply chain is stretched.",
    postedAt: "2026-08-09T14:02:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_skhynix_002",
    editHistory: ["2026-08-09T14:02:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
];

/**
 * Fixture 3: No-entity post (should skip — no identifiable company)
 */
const NO_ENTITY_POST: TriggerPost[] = [
  {
    postId: "fixture_macro_001",
    conversationId: "conv_macro_generic",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: "Just got back from a great vacation. The weather was amazing and the food was incredible. Highly recommend visiting if you get the chance.",
    postedAt: "2026-08-08T12:00:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_macro_001",
    editHistory: ["2026-08-08T12:00:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
];

/**
 * Fixture 4: Edited post (tests version bumping)
 */
const EDITED_POST: TriggerPost[] = [
  {
    postId: "fixture_edit_001",
    conversationId: "conv_edit_test",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: `$TSLA Q2 deliveries: 443,956 units. Below consensus of 448,000.

Updated with revised numbers — initial report had wrong figure.`,
    postedAt: "2026-08-07T16:00:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_edit_001",
    editHistory: ["2026-08-07T16:00:00Z", "2026-08-07T16:30:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
];

// ── Fixture registry ─────────────────────────────────────────────────────────

export const REPLAY_FIXTURES: Record<string, TriggerPost[]> = {
  nvda_earnings: NVIDIA_EARNINGS_THREAD,
  skhynix_supply_chain: SKHYNIX_SUPPLY_CHAIN_THREAD,
  no_entity_macro: NO_ENTITY_POST,
  edited_post: EDITED_POST,
};

// ── Replay adapter ───────────────────────────────────────────────────────────

export class ReplayAdapter implements XIngestionAdapter {
  private fixtures: Record<string, TriggerPost[]>;

  constructor(fixtures?: Record<string, TriggerPost[]>) {
    this.fixtures = fixtures ?? REPLAY_FIXTURES;
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
    // Search across all fixtures for matching conversationId
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

  async fetchPost(postId: string): Promise<TriggerPost | null> {
    for (const posts of Object.values(this.fixtures)) {
      const found = posts.find((p) => p.postId === postId);
      if (found) return found;
    }
    return null;
  }
}
