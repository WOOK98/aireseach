/**
 * AleaBit — Serenity replay fixtures (#130)
 *
 * Fixture data for Serenity creator testing.
 * Macro/sector thesis content — exercises different classification paths.
 */

import type { TriggerPost } from "@workspace/shared/types/aleabit";

/**
 * Fixture 1: Macro thesis thread (should classify as company/macro)
 */
const SERENITY_MACRO_THREAD: TriggerPost[] = [
  {
    postId: "fixture_serenity_001",
    conversationId: "conv_serenity_macro_ai",
    author: "Serenity",
    authorHandle: "serenity",
    text: `The AI infrastructure cycle is entering phase 2.

Phase 1 was training — $NVDA dominated.
Phase 2 is inference — this is where custom silicon ($GOOGL TPU, $AMZN Trainium) gains traction.

Watch for margin compression in GPU-heavy names as inference workloads diversify across chips.

Thread 🧵👇`,
    postedAt: "2026-08-11T09:00:00Z",
    url: "https://x.com/serenity/status/fixture_serenity_001",
    editHistory: ["2026-08-11T09:00:00Z"],
    fetchedAt: "2026-08-11T12:00:00Z",
  },
  {
    postId: "fixture_serenity_002",
    conversationId: "conv_serenity_macro_ai",
    author: "Serenity",
    authorHandle: "serenity",
    text: "Key data points: Google TPU v5p inference throughput now competitive with H100 for specific workloads. AWS Trainium2 shipping in volume Q4. Microsoft Maia still in preview but Azure demand signals strong.",
    postedAt: "2026-08-11T09:02:00Z",
    url: "https://x.com/serenity/status/fixture_serenity_002",
    editHistory: ["2026-08-11T09:02:00Z"],
    fetchedAt: "2026-08-11T12:00:00Z",
  },
];

/**
 * Fixture 2: Earnings thread with numbers (needs external evidence)
 */
const SERENITY_EARNINGS_THREAD: TriggerPost[] = [
  {
    postId: "fixture_serenity_003",
    conversationId: "conv_serenity_tsla_earnings",
    author: "Serenity",
    authorHandle: "serenity",
    text: `$TSLA Q2 2026 quick take:

Revenue: ~$25.5B (est)
Deliveries: 443,956 units
Energy storage: record quarter

Margins still under pressure from price cuts. FSD licensing deal with a major OEM rumored but unconfirmed.

Thread 🧵👇`,
    postedAt: "2026-08-10T18:00:00Z",
    url: "https://x.com/serenity/status/fixture_serenity_003",
    editHistory: ["2026-08-10T18:00:00Z"],
    fetchedAt: "2026-08-11T12:00:00Z",
  },
];

/**
 * Fixture 3: Short noise (should skip)
 */
const SERENITY_NOISE: TriggerPost[] = [
  {
    postId: "fixture_serenity_004",
    conversationId: "conv_serenity_noise",
    author: "Serenity",
    authorHandle: "serenity",
    text: "gm everyone. markets looking green today. follow for more updates!",
    postedAt: "2026-08-09T13:00:00Z",
    url: "https://x.com/serenity/status/fixture_serenity_004",
    editHistory: ["2026-08-09T13:00:00Z"],
    fetchedAt: "2026-08-11T12:00:00Z",
  },
];

// ── Fixture registry ─────────────────────────────────────────────────────────

export const SERENITY_FIXTURES: Record<string, TriggerPost[]> = {
  serenity_macro_ai: SERENITY_MACRO_THREAD,
  serenity_tsla_earnings: SERENITY_EARNINGS_THREAD,
  serenity_noise: SERENITY_NOISE,
};
