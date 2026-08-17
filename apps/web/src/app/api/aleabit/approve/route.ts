/**
 * AleaBit — Canary approval API route (#141, auth fix v2)
 *
 * POST /api/aleabit/approve — approve a queue item for publishing (canary mode)
 *
 * Requires: authenticated session + owner/admin role (via allowlist or org).
 * Actor ID derived from session, not client-supplied.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAleaBitAdmin } from "@workspace/api/aleabit/publish-auth";
import { auth } from "@workspace/auth/server";

// ── Request schema ────────────────────────────────────────────────────────────

const ApproveRequestSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

// ── POST /api/aleabit/approve ─────────────────────────────────────────────────

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

  // ── Mode gate ────────────────────────────────────────────────────────────
  const publishMode = process.env.ALEABIT_PUBLISH_MODE ?? "off";
  if (publishMode !== "canary" && publishMode !== "auto") {
    return NextResponse.json(
      { error: "Approval only available in canary or auto mode." },
      { status: 403 },
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────
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

  // ── Execute ──────────────────────────────────────────────────────────────
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
      actorId: session.user.id,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, item: result.item });
  } catch {
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
