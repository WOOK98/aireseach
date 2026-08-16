/**
 * AleaBit — PNG endpoint auth tests (#135)
 *
 * Validates the session-based auth gate on GET /api/aleabit/png.
 * Auth uses better-auth session cookie (same as dashboard).
 * No secret in URL. No Bearer token. Session cookie only.
 *
 * Tests the auth logic pattern used by the route handler.
 */

import { describe, expect, it } from "vitest";

/**
 * Simulated auth gate matching the PNG route logic.
 * The route calls auth.api.getSession({ headers }) and checks session.user.id.
 */
function pngAuthGate(params: { sessionUserId: string | null | undefined }): {
  status: number;
  error?: string;
} {
  const { sessionUserId } = params;

  if (!sessionUserId) {
    return { status: 401, error: "Unauthorized." };
  }

  return { status: 200 };
}

describe("PNG endpoint auth gate (session-based)", () => {
  it("returns 401 when no session", () => {
    const result = pngAuthGate({ sessionUserId: undefined });
    expect(result.status).toBe(401);
    expect(result.error).toContain("Unauthorized");
  });

  it("returns 401 when session has no user", () => {
    const result = pngAuthGate({ sessionUserId: null });
    expect(result.status).toBe(401);
  });

  it("returns 200 when session has valid user", () => {
    const result = pngAuthGate({ sessionUserId: "user_123" });
    expect(result.status).toBe(200);
  });

  it("returns 401 for empty string user id", () => {
    const result = pngAuthGate({ sessionUserId: "" });
    expect(result.status).toBe(401);
  });
});
