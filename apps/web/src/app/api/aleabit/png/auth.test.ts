/**
 * AleaBit — PNG endpoint auth tests (#135)
 *
 * Tests the actual checkPngAuth helper used by the route handler.
 * Mocks auth.api.getSession since we can't run full better-auth in unit tests.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn<() => Promise<unknown>>(),
    },
  },
}));

import { auth } from "@workspace/auth/server";

import { checkPngAuth } from "./auth";

import type { NextRequest } from "next/server";

function mockRequest(): NextRequest {
  return { headers: new Headers() } as unknown as NextRequest;
}

describe("checkPngAuth (shared helper)", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(undefined as never);
    const result = await checkPngAuth(mockRequest());
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 401 when session has no user", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: null,
    } as never);
    const result = await checkPngAuth(mockRequest());
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 401 when session.user.id is empty", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "" },
    } as never);
    const result = await checkPngAuth(mockRequest());
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 200 with userId when session is valid", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user_abc" },
    } as never);
    const result = await checkPngAuth(mockRequest());
    expect(result.ok).toBe(true);
    expect(result.userId).toBe("user_abc");
  });

  it("returns 401 when getSession throws", async () => {
    vi.mocked(auth.api.getSession).mockRejectedValue(new Error("DB down"));
    const result = await checkPngAuth(mockRequest());
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});
