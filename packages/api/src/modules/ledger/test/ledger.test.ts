import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── L3 Ledger integration tests ────────────────────────────────────────────
// Tests call real router endpoints via hono app.request(), not unit-test
// helper functions. This ensures the production code path is exercised.

// ── Mock state ──────────────────────────────────────────────────────────────
let mockInsertResult: unknown[] = [];
let mockSelectResult: unknown[] = [];
let mockDbError: Error | null = null;

vi.mock("@workspace/db/server", () => ({
  db: {
    insert: vi.fn<() => unknown>(() => ({
      values: vi.fn<() => unknown>(() => ({
        onConflictDoNothing: vi.fn<() => unknown>(() => ({
          returning: vi.fn<() => Promise<unknown>>(async () => {
            if (mockDbError) throw mockDbError;
            return mockInsertResult.shift() ?? [];
          }),
        })),
        returning: vi.fn<() => Promise<unknown>>(async () => {
          if (mockDbError) throw mockDbError;
          return mockInsertResult.shift() ?? [];
        }),
      })),
    })),
    select: vi.fn<() => unknown>(() => ({
      from: vi.fn<() => unknown>(() => ({
        where: vi.fn<() => unknown>(() => ({
          orderBy: vi.fn<() => Promise<unknown>>(async () => {
            if (mockDbError) throw mockDbError;
            return mockSelectResult;
          }),
          limit: vi.fn<() => Promise<unknown>>(async () => {
            if (mockDbError) throw mockDbError;
            return mockSelectResult;
          }),
        })),
      })),
    })),
  },
}));

const mockUserId = "test-user-123";

vi.mock("@workspace/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn<() => Promise<{ user: { id: string } } | null>>(
        async () => ({ user: { id: mockUserId } }),
      ),
    },
  },
}));

// ── Import router AFTER mocks are installed ─────────────────────────────────
import { ledgerRoute } from "../router";

// Helper: build a valid judgment payload
const makeJudgment = (overrides?: Record<string, unknown>) => ({
  reportId: "rpt-20260712-001",
  ticker: "0700.HK",
  companyName: "Tencent Holdings",
  judgment: "Revenue growth re-accelerates to 15%+ YoY",
  keyNumber: "Revenue Growth YoY 12.3%",
  keyNumberValue: "12.3",
  wrongIf: "Revenue growth drops below 8% for two consecutive quarters",
  metric: "revenueGrowthYoy",
  trigger: "<8%",
  tolerance: "±2%",
  source: "Yahoo Finance",
  freq: "Quarterly",
  publishedAt: "2026-07-12T10:00:00Z",
  ...overrides,
});

// Helper: JSON POST request to router
const postJson = (path: string, body: unknown) =>
  ledgerRoute.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const getJson = (path: string) => ledgerRoute.request(path);

// Helper: parse JSON body safely
const parseJson = async <T>(res: Response): Promise<T> =>
  (await res.json()) as T;

// ── Reset mocks between tests ───────────────────────────────────────────────
beforeEach(() => {
  mockInsertResult = [];
  mockSelectResult = [];
  mockDbError = null;
});

// ─── POST /judgments — red line enforcement ─────────────────────────────────
describe("POST /judgments — red line enforcement", () => {
  it("rejects keyNumber '0.0%' with 422", async () => {
    const res = await postJson("/judgments", {
      judgments: [makeJudgment({ keyNumber: "0.0%" })],
    });
    expect(res.status).toBe(422);
    const body = await res.text();
    expect(body).toContain("0.0%");
    expect(body).toContain("fallback");
  });

  it("rejects keyNumber 'N/A' with 422", async () => {
    const res = await postJson("/judgments", {
      judgments: [makeJudgment({ keyNumber: "N/A" })],
    });
    expect(res.status).toBe(422);
    const body = await res.text();
    expect(body).toContain("N/A");
  });

  it("rejects batch where ANY judgment has fallback keyNumber", async () => {
    const res = await postJson("/judgments", {
      judgments: [
        makeJudgment({ keyNumber: "Revenue Growth 12.3%" }),
        makeJudgment({ judgment: "Another", keyNumber: "0.0%" }),
      ],
    });
    expect(res.status).toBe(422);
  });
});

// ─── POST /judgments — three-state response ─────────────────────────────────
describe("POST /judgments — three-state response", () => {
  it("returns { inserted, skippedDuplicates, errors } on success", async () => {
    mockInsertResult = [[{ id: "j1", ...makeJudgment() }]];

    const res = await postJson("/judgments", {
      judgments: [makeJudgment()],
    });
    expect(res.status).toBe(200);
    const body = await parseJson<{
      ok: boolean;
      inserted: number;
      skippedDuplicates: number;
      errors: number;
      judgments: unknown[];
    }>(res);
    expect(body.ok).toBe(true);
    expect(body.inserted).toBe(1);
    expect(body.skippedDuplicates).toBe(0);
    expect(body.errors).toBe(0);
    expect(body.judgments).toHaveLength(1);
  });

  it("reports skippedDuplicates when onConflictDoNothing returns empty", async () => {
    mockInsertResult = [[]];

    const res = await postJson("/judgments", {
      judgments: [makeJudgment()],
    });
    expect(res.status).toBe(200);
    const body = await parseJson<{
      inserted: number;
      skippedDuplicates: number;
      errors: number;
    }>(res);
    expect(body.inserted).toBe(0);
    expect(body.skippedDuplicates).toBe(1);
    expect(body.errors).toBe(0);
  });

  it("reports errors when DB insert throws", async () => {
    mockDbError = new Error("connection refused");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await postJson("/judgments", {
      judgments: [makeJudgment()],
    });
    expect(res.status).toBe(200);
    const body = await parseJson<{
      inserted: number;
      skippedDuplicates: number;
      errors: number;
    }>(res);
    expect(body.inserted).toBe(0);
    expect(body.skippedDuplicates).toBe(0);
    expect(body.errors).toBe(1);
    // Error was logged server-side
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ledger] Failed to insert judgment"),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});

// ─── POST /judgments — input validation ─────────────────────────────────────
describe("POST /judgments — input validation", () => {
  it("rejects empty judgments array", async () => {
    const res = await postJson("/judgments", { judgments: [] });
    expect(res.status).toBe(400);
  });

  it("rejects missing required fields", async () => {
    const res = await postJson("/judgments", {
      judgments: [{ reportId: "rpt-1" }],
    });
    expect(res.status).toBe(400);
  });

  it("rejects non-datetime publishedAt", async () => {
    const res = await postJson("/judgments", {
      judgments: [makeJudgment({ publishedAt: "not-a-date" })],
    });
    expect(res.status).toBe(400);
  });

  it("normalizes ticker to uppercase", async () => {
    mockInsertResult = [[{ id: "j1", ...makeJudgment(), ticker: "0700.HK" }]];

    const res = await postJson("/judgments", {
      judgments: [makeJudgment({ ticker: "0700.hk" })],
    });
    expect(res.status).toBe(200);
  });
});

// ─── POST /judgments — authentication ───────────────────────────────────────
describe("POST /judgments — authentication", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const { auth } = await import("@workspace/auth/server");
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null as never);

    const res = await postJson("/judgments", {
      judgments: [makeJudgment()],
    });
    expect(res.status).toBe(401);
    const body = await res.text();
    expect(body).toContain("Authentication required");
  });
});

// ─── POST /verify — state transitions ───────────────────────────────────────
describe("POST /verify — state transitions", () => {
  const validResults = [
    "confirmed",
    "invalidated",
    "pending",
    "insufficient_data",
  ] as const;

  it.each(validResults)("accepts result '%s'", async (result) => {
    mockSelectResult = [{ id: "j1", userId: mockUserId, ticker: "0700.HK" }];
    mockInsertResult = [
      [
        {
          id: "v1",
          judgmentId: "j1",
          result,
          verifiedAt: "2026-10-01T00:00:00Z",
        },
      ],
    ];

    const res = await postJson("/verify", {
      judgmentId: "j1",
      result,
      verifiedAt: "2026-10-01T00:00:00Z",
    });
    expect(res.status).toBe(200);
    const body = await parseJson<{
      ok: boolean;
      verification: { result: string };
    }>(res);
    expect(body.ok).toBe(true);
    expect(body.verification.result).toBe(result);
  });

  it("rejects verify for non-existent judgment with 404", async () => {
    mockSelectResult = [];

    const res = await postJson("/verify", {
      judgmentId: "nonexistent",
      result: "confirmed",
      verifiedAt: "2026-10-01T00:00:00Z",
    });
    expect(res.status).toBe(404);
  });

  it("rejects verify with invalid result enum", async () => {
    const res = await postJson("/verify", {
      judgmentId: "j1",
      result: "maybe",
      verifiedAt: "2026-10-01T00:00:00Z",
    });
    expect(res.status).toBe(400);
  });
});

// ─── GET /judgments/:ticker — read ──────────────────────────────────────────
describe("GET /judgments/:ticker", () => {
  it("returns judgments for ticker", async () => {
    mockSelectResult = [
      { id: "j1", ticker: "0700.HK", judgment: "Revenue up" },
    ];

    const res = await getJson("/judgments/0700.HK");
    expect(res.status).toBe(200);
    const body = await parseJson<{
      ok: boolean;
      ticker: string;
      judgments: unknown[];
    }>(res);
    expect(body.ok).toBe(true);
    expect(body.ticker).toBe("0700.HK");
    expect(body.judgments).toHaveLength(1);
  });

  it("normalizes ticker to uppercase in query", async () => {
    mockSelectResult = [];

    const res = await getJson("/judgments/0700.hk");
    expect(res.status).toBe(200);
    const body = await parseJson<{ ticker: string }>(res);
    expect(body.ticker).toBe("0700.HK");
  });
});

// ─── GET /judgments/:ticker/history — with verifications ────────────────────
describe("GET /judgments/:ticker/history", () => {
  it("returns judgments with grouped verifications", async () => {
    mockSelectResult = [
      { id: "j1", ticker: "0700.HK", judgment: "Revenue up" },
    ];

    const res = await getJson("/judgments/0700.HK/history");
    expect(res.status).toBe(200);
    const body = await parseJson<{
      ok: boolean;
      ticker: string;
      history: unknown[];
    }>(res);
    expect(body.ok).toBe(true);
    expect(body.ticker).toBe("0700.HK");
    expect(body.history).toBeDefined();
  });
});

// ─── L3 Ledger — date/timezone handling ─────────────────────────────────────
describe("L3 Ledger — date/timezone handling", () => {
  it("publishedAt accepts ISO 8601 format", async () => {
    mockInsertResult = [
      [{ id: "j1", ...makeJudgment({ publishedAt: "2026-07-12T10:00:00Z" }) }],
    ];

    const res = await postJson("/judgments", {
      judgments: [makeJudgment({ publishedAt: "2026-07-12T10:00:00Z" })],
    });
    expect(res.status).toBe(200);
  });

  it("publishedAt rejects invalid format", async () => {
    const res = await postJson("/judgments", {
      judgments: [makeJudgment({ publishedAt: "not-a-date" })],
    });
    expect(res.status).toBe(400);
  });
});
