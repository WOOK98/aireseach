/**
 * AleaBit — Canary reject API route (#141)
 *
 * POST /api/aleabit/reject — reject a queue item
 *
 * Records audit log entry via executeReviewAction.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ── Request schema ────────────────────────────────────────────────────────────

const RejectRequestSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1).max(500),
  actorId: z.string().min(1).default("dashboard-user"),
});

// ── POST /api/aleabit/reject ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: z.infer<typeof RejectRequestSchema>;
  try {
    const raw = await request.json();
    body = RejectRequestSchema.parse(raw);
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
      action: "rejected",
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
