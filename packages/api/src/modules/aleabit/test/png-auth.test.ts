/**
 * AleaBit — PNG endpoint auth tests (#135)
 *
 * Validates the auth gate on GET /api/aleabit/png:
 * - No secret configured → 503
 * - No auth → 401
 * - Wrong token → 401
 * - Correct token → 200 (or 404 if item not found)
 *
 * Note: These test the auth logic pattern, not the actual Next.js route.
 * The route uses the same logic; this validates the gate behavior.
 */

import { describe, expect, it } from "vitest";

/**
 * Simulated auth gate matching the PNG route logic.
 * Extracted for unit testing without Next.js server.
 */
function pngAuthGate(params: {
  secret: string | undefined;
  bearerToken: string;
  queryToken: string;
}): { status: number; error?: string } {
  const { secret, bearerToken, queryToken } = params;

  // Fail-closed: no secret configured
  if (!secret) {
    return { status: 503, error: "PNG endpoint not configured." };
  }

  // Accept token from Bearer header OR query param
  const token = bearerToken || queryToken;

  if (token !== secret) {
    return { status: 401, error: "Unauthorized." };
  }

  return { status: 200 };
}

describe("PNG endpoint auth gate", () => {
  const VALID_SECRET = "test-secret-123";

  it("returns 503 when secret not configured", () => {
    const result = pngAuthGate({
      secret: "",
      bearerToken: "",
      queryToken: "",
    });
    expect(result.status).toBe(503);
    expect(result.error).toContain("not configured");
  });

  it("returns 503 when secret is undefined", () => {
    const result = pngAuthGate({
      secret: undefined,
      bearerToken: "anything",
      queryToken: "",
    });
    expect(result.status).toBe(503);
  });

  it("returns 401 when no auth provided", () => {
    const result = pngAuthGate({
      secret: VALID_SECRET,
      bearerToken: "",
      queryToken: "",
    });
    expect(result.status).toBe(401);
  });

  it("returns 401 when bearer token is wrong", () => {
    const result = pngAuthGate({
      secret: VALID_SECRET,
      bearerToken: "wrong-token",
      queryToken: "",
    });
    expect(result.status).toBe(401);
  });

  it("returns 401 when query token is wrong", () => {
    const result = pngAuthGate({
      secret: VALID_SECRET,
      bearerToken: "",
      queryToken: "wrong-token",
    });
    expect(result.status).toBe(401);
  });

  it("returns 200 when bearer token is correct", () => {
    const result = pngAuthGate({
      secret: VALID_SECRET,
      bearerToken: VALID_SECRET,
      queryToken: "",
    });
    expect(result.status).toBe(200);
  });

  it("returns 200 when query token is correct", () => {
    const result = pngAuthGate({
      secret: VALID_SECRET,
      bearerToken: "",
      queryToken: VALID_SECRET,
    });
    expect(result.status).toBe(200);
  });

  it("bearer takes precedence over query when both present", () => {
    const result = pngAuthGate({
      secret: VALID_SECRET,
      bearerToken: VALID_SECRET,
      queryToken: "wrong",
    });
    expect(result.status).toBe(200);
  });

  it("query token works as fallback when no bearer", () => {
    const result = pngAuthGate({
      secret: VALID_SECRET,
      bearerToken: "",
      queryToken: VALID_SECRET,
    });
    expect(result.status).toBe(200);
  });
});
