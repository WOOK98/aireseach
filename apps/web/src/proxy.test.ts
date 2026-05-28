import { describe, expect, it } from "vitest";

import { getAuthRedirectResponse } from "./auth-proxy";

import type { NextRequest } from "next/server";

const createRequest = (pathname: string, authenticated = false) =>
  ({
    nextUrl: new URL(`https://airesearchs.com${pathname}`),
    url: `https://airesearchs.com${pathname}`,
    cookies: {
      get: (name: string) =>
        authenticated &&
        [
          "better-auth.session_token",
          "__Secure-better-auth.session_token",
        ].includes(name)
          ? { value: "session-token" }
          : undefined,
    },
  }) as unknown as NextRequest;

describe("proxy auth redirects", () => {
  it("redirects unauthenticated dashboard requests to login", () => {
    const response = getAuthRedirectResponse(
      createRequest("/dashboard/report"),
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://airesearchs.com/auth/login?redirectTo=%2Fdashboard%2Freport",
    );
  });

  it("keeps the locale path in redirectTo for localized dashboard requests", () => {
    const response = getAuthRedirectResponse(
      createRequest("/en/dashboard/report"),
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://airesearchs.com/auth/login?redirectTo=%2Fen%2Fdashboard%2Freport",
    );
  });

  it("allows authenticated dashboard requests", () => {
    const response = getAuthRedirectResponse(
      createRequest("/dashboard/report", true),
    );

    expect(response).toBeNull();
  });

  it("redirects authenticated users away from auth pages", () => {
    const response = getAuthRedirectResponse(
      createRequest("/auth/login", true),
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://airesearchs.com/dashboard",
    );
  });

  it("allows public marketing pages", () => {
    const response = getAuthRedirectResponse(createRequest("/report"));

    expect(response).toBeNull();
  });
});
