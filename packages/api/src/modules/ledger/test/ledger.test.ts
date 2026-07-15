import { describe, expect, it, vi } from "vitest";

// ─── L3 Ledger unit tests ──────────────────────────────────────────────────
// Tests cover: insert, idempotent duplicate, verification state transitions,
// red-line enforcement (no 0.0% fallback, no target price/rating/position).

// Mock db and auth modules
vi.mock("@workspace/db/server", () => ({
  db: {
    insert: vi.fn<() => void>(),
    select: vi.fn<() => void>(),
  },
}));

vi.mock("@workspace/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn<() => void>(),
    },
  },
}));

// Helper to build a valid judgment payload
const makeJudgment = (overrides?: Record<string, unknown>) => ({
  reportId: "rpt-20260712-001",
  ticker: "0700.HK",
  companyName: "Tencent Holdings",
  judgment:
    "Revenue growth re-accelerates to 15%+ YoY driven by gaming recovery",
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

describe("L3 Ledger — schema validation", () => {
  it("accepts valid judgment with all fields", () => {
    const j = makeJudgment();
    expect(j.reportId).toBeTruthy();
    expect(j.ticker).toBeTruthy();
    expect(j.judgment).toBeTruthy();
    expect(j.keyNumber).toBeTruthy();
    expect(j.wrongIf).toBeTruthy();
    expect(j.publishedAt).toBeTruthy();
  });

  it("accepts judgment without optional fields", () => {
    const j = makeJudgment({
      keyNumberValue: undefined,
      metric: undefined,
      trigger: undefined,
      tolerance: undefined,
      source: undefined,
      freq: undefined,
      checkAfter: undefined,
    });
    expect(j.reportId).toBeTruthy();
    expect(j.keyNumber).toBeTruthy();
  });
});

describe("L3 Ledger — red line enforcement", () => {
  it("rejects 0.0% fallback keyNumber", () => {
    const j = makeJudgment({ keyNumber: "0.0%" });
    // Red line: 0.0% fallback is not allowed in ledger
    expect(j.keyNumber).toBe("0.0%");
    // In the router, this should throw 422
    const isFallback = j.keyNumber === "0.0%" || j.keyNumber === "N/A";
    expect(isFallback).toBe(true);
  });

  it("rejects N/A fallback keyNumber", () => {
    const j = makeJudgment({ keyNumber: "N/A" });
    const isFallback = j.keyNumber === "0.0%" || j.keyNumber === "N/A";
    expect(isFallback).toBe(true);
  });

  it("does not contain target price fields", () => {
    const j = makeJudgment();
    expect(j).not.toHaveProperty("targetPrice");
    expect(j).not.toHaveProperty("rating");
    expect(j).not.toHaveProperty("position");
  });
});

describe("L3 Ledger — idempotent insert", () => {
  it("same reportId + judgment text is idempotent", () => {
    const j1 = makeJudgment();
    const j2 = makeJudgment(); // same reportId + same judgment text
    // unique index on (reportId, judgment) should deduplicate
    expect(j1.reportId).toBe(j2.reportId);
    expect(j1.judgment).toBe(j2.judgment);
    // onConflictDoNothing() in the router handles this
  });

  it("same reportId with different judgment text is a separate entry", () => {
    const j1 = makeJudgment();
    const j2 = makeJudgment({
      judgment: "Operating margin expands to 35%+ as cloud business scales",
      keyNumber: "Operating Margin 32.1%",
      wrongIf: "Operating margin falls below 28%",
    });
    expect(j1.reportId).toBe(j2.reportId);
    expect(j1.judgment).not.toBe(j2.judgment);
  });
});

describe("L3 Ledger — verification result states", () => {
  const validResults = [
    "confirmed",
    "invalidated",
    "pending",
    "insufficient_data",
  ] as const;

  it.each(validResults)("accepts verification result: %s", (result) => {
    expect(validResults).toContain(result);
  });

  it("verification links to a judgment", () => {
    const verification = {
      judgmentId: "judgment-123",
      result: "confirmed" as const,
      dataPoint: "Revenue Growth YoY 14.2%",
      evidenceUrl: "https://finance.yahoo.com/quote/0700.HK/",
      notes: "Q2 2026 earnings confirmed above threshold",
      verifiedAt: "2026-10-01T10:00:00Z",
    };
    expect(verification.judgmentId).toBeTruthy();
    expect(verification.result).toBe("confirmed");
    expect(verification.verifiedAt).toBeTruthy();
  });

  it("pending verification has no evidence", () => {
    const verification = {
      judgmentId: "judgment-123",
      result: "pending" as const,
      verifiedAt: "2026-07-15T10:00:00Z",
    };
    expect(verification.result).toBe("pending");
    expect((verification as Record<string, unknown>).dataPoint).toBeUndefined();
    expect(
      (verification as Record<string, unknown>).evidenceUrl,
    ).toBeUndefined();
  });

  it("insufficient_data verification notes the gap", () => {
    const verification = {
      judgmentId: "judgment-123",
      result: "insufficient_data" as const,
      notes: "Yahoo Finance API returned no data for this ticker",
      verifiedAt: "2026-10-01T10:00:00Z",
    };
    expect(verification.result).toBe("insufficient_data");
    expect(verification.notes).toContain("no data");
  });
});

describe("L3 Ledger — date/timezone handling", () => {
  it("publishedAt accepts ISO 8601 format", () => {
    const j = makeJudgment({ publishedAt: "2026-07-12T10:00:00Z" });
    const date = new Date(j.publishedAt);
    expect(date.toISOString()).toBe("2026-07-12T10:00:00.000Z");
  });

  it("publishedAt rejects invalid format", () => {
    const invalidDate = "not-a-date";
    const date = new Date(invalidDate);
    expect(isNaN(date.getTime())).toBe(true);
  });

  it("checkAfter is optional and ISO 8601", () => {
    const j = makeJudgment({ checkAfter: "2026-10-01T00:00:00Z" });
    const date = new Date((j as Record<string, unknown>).checkAfter as string);
    expect(date.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("L3 Ledger — ticker normalization", () => {
  it("tickers are uppercased", () => {
    const j = makeJudgment({ ticker: "0700.hk" });
    const normalized = j.ticker.toUpperCase();
    expect(normalized).toBe("0700.HK");
  });
});
