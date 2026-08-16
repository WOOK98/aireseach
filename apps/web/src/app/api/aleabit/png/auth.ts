/**
 * AleaBit — PNG auth helper (#135)
 *
 * Shared session auth check for PNG endpoint.
 * Used by the route handler and tests.
 *
 * Auth: better-auth session cookie (same as dashboard).
 * No secret in URL. No Bearer token.
 */

import { auth } from "@workspace/auth/server";

import type { NextRequest } from "next/server";

export interface PngAuthResult {
  ok: boolean;
  userId?: string;
  status?: number;
  error?: string;
}

/**
 * Check session auth for PNG endpoint.
 * Returns { ok: true, userId } if authenticated, or { ok: false, status, error } if not.
 */
export async function checkPngAuth(
  request: NextRequest,
): Promise<PngAuthResult> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return { ok: false, status: 401, error: "Unauthorized." };
    }

    return { ok: true, userId: session.user.id };
  } catch {
    // Auth service unavailable → deny access
    return { ok: false, status: 401, error: "Unauthorized." };
  }
}
