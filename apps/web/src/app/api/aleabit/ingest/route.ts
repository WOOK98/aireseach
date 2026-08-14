/**
 * AleaBit — Ingest API route (#130)
 *
 * POST /api/aleabit/ingest
 *
 * Triggers multi-creator ingest: fetch → classify → entity → evidence → queue.
 * Writes to PersistentReviewQueue (DB).
 * Returns ingest summary.
 *
 * This is decoupled from the page render to avoid hitting DB during build/prerender.
 * Can be triggered manually or via cron.
 *
 * NEVER publishes, replies, quotes, or uploads media.
 */

import { NextResponse } from "next/server";

import { BUILTIN_CREATOR_CONFIGS } from "@workspace/api/aleabit/creator-fixtures/builtin-configs";
import { buildCreatorReplayAdapters } from "@workspace/api/aleabit/creator-fixtures/multi-replay-adapter";
import { runMultiCreatorIngest } from "@workspace/api/aleabit/creator-ingest";
import { PersistentReviewQueue } from "@workspace/api/aleabit/queue-pg";

export async function POST() {
  try {
    const adapters = buildCreatorReplayAdapters(BUILTIN_CREATOR_CONFIGS);
    const queue = new PersistentReviewQueue();

    const result = await runMultiCreatorIngest(queue, adapters, {
      maxResultsPerCreator: 10,
    });

    return NextResponse.json({
      ok: true,
      summaries: result.summaries,
      totalSummary: result.totalSummary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
