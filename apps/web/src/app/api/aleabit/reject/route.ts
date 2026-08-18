/**
 * AleaBit — Canary reject API route (#141, auth fix v2)
 *
 * POST /api/aleabit/reject — reject a queue item
 *
 * Requires: authenticated session + owner/admin role (via allowlist or org).
 * Actor ID derived from session, not client-supplied.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAleaBitAdmin } from "@workspace/api/aleabit/publish-auth";
import { auth } from "@workspace/auth/server";

// ── Request schema ────────────────────────────────────────────────────────────

const RejectRequestSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

// ── POST /api/aleabit/reject ──────────────────────────────────────────────────

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

  // ── Execute ──────────────────────────────────────────────────────────────
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
