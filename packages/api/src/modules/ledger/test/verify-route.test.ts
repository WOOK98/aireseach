/**
 * /api/ledger/verify/run — Route tests
 *
 * Covers:
 *   1. Valid Bearer token → 200
 *   2. Missing/invalid Bearer token → 401
 *   3. Session-only auth → 401 (not authorized)
 *
 * Requires SKIP_ENV_VALIDATION=1 to bypass envin validation in test env.
 */

import { Hono } from "hono";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Set env vars for the router's env module
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.LEDGER_VERIFY_TOKEN = "test-secret-token";

// Mock auth to return no session by default
vi.mock("@workspace/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn<() => Promise<null>>().mockResolvedValue(null),
    },
  },
}));

// Mock DB
vi.mock("@workspace/db/server", () => ({ db: {} }));
vi.mock("@workspace/db", () => ({
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => col,
  eq: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args,
  ne: (...args: unknown[]) => args,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));
vi.mock("@workspace/db/schema", () => ({
  ledgerJudgment: {},
  ledgerVerification: {},
}));

// Mock the verify-runner to avoid DB calls
vi.mock("../verify-runner", () => ({
  runVerificationBatch: vi
    .fn<() => Promise<Record<string, number>>>()
    .mockResolvedValue({
      processed: 5,
      confirmed: 3,
      invalidated: 1,
      needsManualReview: 1,
      insufficientData: 0,
      errors: 0,
    }),
}));

// Import router AFTER mocks are set up
const { ledgerRoute } = await import("../router");

function createApp() {
  const app = new Hono();
  app.route("/api/ledger", ledgerRoute);
  return app;
}

describe("POST /api/ledger/verify/run", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  it("accepts valid Bearer token → 200", async () => {
    const res = await app.request("/api/ledger/verify/run", {
      method: "POST",
      headers: {
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        Authorization: `Bearer ${process.env.LEDGER_VERIFY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchSize: 10 }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; processed: number };
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(5);
  });

  it("rejects missing Authorization header → 401", async () => {
    const res = await app.request("/api/ledger/verify/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("rejects invalid Bearer token → 401", async () => {
    const res = await app.request("/api/ledger/verify/run", {
      method: "POST",
      headers: {
        Authorization: "Bearer wrong-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("rejects session-only auth (no Bearer) → 401", async () => {
    const res = await app.request("/api/ledger/verify/run", {
      method: "POST",
      headers: {
        Cookie: "session=abc123",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
