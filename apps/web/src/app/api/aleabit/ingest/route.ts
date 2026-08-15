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

import { type NextRequest, NextResponse } from "next/server";

import {
  buildCreatorAdapters,
  parseLiveCreators,
} from "@workspace/api/aleabit/creator-adapter-factory";
import { BUILTIN_CREATOR_CONFIGS } from "@workspace/api/aleabit/creator-fixtures/builtin-configs";
import { runMultiCreatorIngest } from "@workspace/api/aleabit/creator-ingest";
import { PersistentReviewQueue } from "@workspace/api/aleabit/queue-pg";

const INGEST_SECRET = process.env.ALEABIT_INGEST_SECRET ?? ""; // redline-allow: internal env lookup, not user-visible
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN ?? ""; // redline-allow: internal env lookup, not user-visible
const LIVE_CREATORS = parseLiveCreators(process.env.ALEABIT_LIVE_CREATORS); // redline-allow: internal env lookup, not user-visible

export async function POST(request: NextRequest) {
  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!INGEST_SECRET) {
    // No secret configured → deny by default (fail-closed).
    return NextResponse.json(
      { ok: false, error: "Ingest not configured." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (token !== INGEST_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  // ── Ingest ────────────────────────────────────────────────────────────────
  try {
    const { adapters, skipped } = buildCreatorAdapters(
      BUILTIN_CREATOR_CONFIGS,
      { liveToken: X_BEARER_TOKEN, liveCreators: LIVE_CREATORS },
    );

    const queue = new PersistentReviewQueue();

    const result = await runMultiCreatorIngest(queue, adapters, {
      maxResultsPerCreator: 10,
    });

    return NextResponse.json({
      ok: true,
      summaries: result.summaries,
      totalSummary: result.totalSummary,
      skipped,
    });
  } catch {
    // Neutral error — never leak internal details.
    return NextResponse.json(
      { ok: false, error: "Ingest failed. Check server logs." },
      { status: 500 },
    );
  }
}
