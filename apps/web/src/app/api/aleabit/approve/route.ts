/**
 * AleaBit — Canary approval API route (#141)
 *
 * POST /api/aleabit/approve — approve a queue item for publishing (canary mode)
 * POST /api/aleabit/reject — reject a queue item
 *
 * Requires: item in ready_for_review status, canary mode active.
 * Records audit log entry via executeReviewAction.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ── Request schema ────────────────────────────────────────────────────────────

const ApproveRequestSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1).max(500),
  actorId: z.string().min(1).default("dashboard-user"),
});

// ── POST /api/aleabit/approve ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Only allow in canary mode
  const publishMode = process.env.ALEABIT_PUBLISH_MODE ?? "off";
  if (publishMode !== "canary" && publishMode !== "auto") {
    return NextResponse.json(
      { error: "Approval only available in canary or auto mode." },
      { status: 403 },
    );
  }

  let body: z.infer<typeof ApproveRequestSchema>;
  try {
    const raw = await request.json();
    body = ApproveRequestSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const { PersistentReviewQueue } =
      await import("@workspace/api/aleabit/queue-pg");
    const { executeReviewAction } =
      await import("@workspace/api/aleabit/audit");

    const queue = new PersistentReviewQueue();
    const result = await executeReviewAction(queue, {
      itemId: body.itemId,
      action: "approved",
      reason: body.reason,
      actorId: body.actorId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      item: result.item,
      auditId: result.auditId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
