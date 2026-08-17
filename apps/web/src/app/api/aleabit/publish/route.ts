/**
 * AleaBit — Publish API route (#141, production audit wiring)
 *
 * POST /api/aleabit/publish — trigger a publish attempt for a queue item
 *
 * This is the ONLY production path that wires executePublishAttempt
 * to recordPublishAttempt. All attempts are persisted to the audit table.
 *
 * Requires: authenticated session + owner/admin role.
 * Enforces: canary mode + approved status.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAleaBitAdmin } from "@workspace/api/aleabit/publish-auth";
import { auth } from "@workspace/auth/server";

// ── Request schema ────────────────────────────────────────────────────────────

const PublishRequestSchema = z.object({
  itemId: z.string().min(1),
});

// ── POST /api/aleabit/publish ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth gate: session + owner/admin ─────────────────────────────────────
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authorized = await isAleaBitAdmin(request.headers, session.user.id);
  if (!authorized) {
    return NextResponse.json(
      { error: "Forbidden. Owner or admin role required." },
      { status: 403 },
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: z.infer<typeof PublishRequestSchema>;
  try {
    const raw = await request.json();
    body = PublishRequestSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  // ── Execute ──────────────────────────────────────────────────────────────
  try {
    const { PersistentReviewQueue } =
      await import("@workspace/api/aleabit/queue-pg");
    const { executePublishAttempt } =
      await import("@workspace/api/aleabit/publish-executor");
    const { recordPublishAttempt } =
      await import("@workspace/api/aleabit/publish-audit");

    const queue = new PersistentReviewQueue();
    const item = await queue.get(body.itemId);

    if (!item) {
      return NextResponse.json(
        { error: "Queue item not found." },
        { status: 404 },
      );
    }

    // Read config from env (fail-closed defaults)
    const publishMode = process.env.ALEABIT_PUBLISH_MODE ?? "off"; // redline-allow: internal env lookup for publish mode
    const dryRun = process.env.ALEABIT_PUBLISH_DRY_RUN !== "false"; // redline-allow: internal env lookup for dry-run flag
    const killSwitch = process.env.ALEABIT_PUBLISH_KILL_SWITCH !== "false"; // redline-allow: internal env lookup for kill-switch
    const xWriteBearerToken = process.env.X_WRITE_BEARER_TOKEN; // redline-allow: internal env lookup for X write token

    const { attempt, publishResult } = await executePublishAttempt({
      item,
      config: {
        publishMode: publishMode as any,
        dryRun,
        killSwitch,
        xWriteBearerToken,
      },
      recordAttempt: recordPublishAttempt,
    });

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        decision: attempt.decision,
        adapter: attempt.adapter,
        dryRun: attempt.dryRun,
        failureStage: attempt.failureStage,
        externalPostId: attempt.externalPostId,
      },
      publishResult: publishResult
        ? {
            success: publishResult.success,
            dryRun: publishResult.dryRun,
            externalPostId: publishResult.externalPostId,
          }
        : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
