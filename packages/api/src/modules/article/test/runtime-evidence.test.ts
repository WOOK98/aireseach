/**
 * Runtime evidence tests for PR #117 — success path & degradation path.
 *
 * These tests exercise the actual route handler end-to-end (with mocked
 * external services) to prove:
 *   1. Success path: real ticker → 8-section article with visuals, evidence IDs
 *   2. Degradation path: no-data query → honest degrade, no hallucinated content
 *
 * REQUIRED ENV: OPENAI_API_KEY, BETTER_AUTH_SECRET (set via CLI or vitest.config)
 */
import { describe, it, expect, vi } from "vitest";

// ── Mock workspace env presets (prevent validation cascade) ──────────────────

vi.mock("@workspace/auth/env", () => ({ preset: {} }));
vi.mock("@workspace/billing-mobile/server/env", () => ({ preset: {} }));
vi.mock("@workspace/billing-web/env", () => ({ preset: {} }));
vi.mock("@workspace/db/env", () => ({
  preset: {},
  env: { DATABASE_URL: "postgresql://test" },
}));
vi.mock("@workspace/email/env", () => ({ preset: {} }));
vi.mock("@workspace/monitoring-web/env", () => ({ preset: {} }));
vi.mock("@workspace/storage/env", () => ({ preset: {} }));

// ── Mock data sources ────────────────────────────────────────────────────────

const mockFinancials = {
  companyName: "NVIDIA Corporation",
  ticker: "NVDA",
  exchange: "NASDAQ",
  sector: "Technology",
  industry: "Semiconductors",
  description: "AI GPU leader",
  currentPrice: 130,
  marketCap: 3_000_000_000_000,
  currency: "USD",
  priceChange: 5,
  priceChangePercent: 0.04,
  marketState: "REGULAR",
  revenue: 115_000_000_000,
  revenueGrowthYoy: 1.4,
  grossProfit: 86_480_000_000,
  grossMargin: 0.752,
  operatingIncome: 71_300_000_000,
  operatingMargin: 0.62,
  netIncome: 63_250_000_000,
  netMargin: 0.55,
  ebitda: 70_000_000_000,
  eps: 2.58,
  epsGrowthYoy: 1.2,
  totalCash: 26_000_000_000,
  totalDebt: 11_000_000_000,
  netCash: 15_000_000_000,
  peRatio: 60,
  pbRatio: 40,
  psRatio: 30,
  evEbitda: 50,
  forwardPE: 45,
  freeCashFlow: 60_000_000_000,
  fcfMargin: 0.52,
  revenueHistory: [],
  grossMarginHistory: [],
  operatingMarginHistory: [],
  fcfHistory: [],
};

const mockResolveEntity = vi
  .fn<() => Promise<Record<string, unknown>>>()
  .mockResolvedValue({
    ok: true,
    mode: "ticker",
    ticker: "NVDA",
    name: "NVIDIA Corporation",
  });

const mockSanitize = vi
  .fn<() => Record<string, unknown>>()
  .mockReturnValue({ metrics: mockFinancials });
const mockFetchYahoo = vi
  .fn<() => Promise<Record<string, unknown>>>()
  .mockResolvedValue({
    quoteSummary: { result: [{}] },
  });

vi.mock("../report/data-sources", () => ({
  cachedFetchYahooFinance: mockFetchYahoo,
  sanitizeFinancialMetrics: mockSanitize,
  cachedResolveEntity: mockResolveEntity,
}));

vi.mock("../report/industry", () => ({
  buildIndustryUniverse: vi.fn<() => Promise<null>>().mockResolvedValue(null),
  expandWithAHPeers: vi.fn<() => Promise<null>>().mockResolvedValue(null),
}));

const mockSearchIma = vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
const mockFormatIma = vi.fn<() => string>().mockReturnValue("");

vi.mock("../report/knowledge", () => ({
  searchImaKnowledge: mockSearchIma,
  formatImaKnowledgeForPrompt: mockFormatIma,
}));

// Mock LLM: returns valid article JSON
vi.mock("ai", () => ({
  generateText: vi
    .fn<() => Promise<{ text: string }>>()
    .mockImplementation(async () => {
      const { VALID_ARTICLE } = await import("./fixtures/article-fixture");
      return { text: "```json\n" + JSON.stringify(VALID_ARTICLE) + "\n```" };
    }),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi
    .fn<() => () => Record<string, unknown>>()
    .mockReturnValue(() => ({})),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

import { articleRoute } from "../route";

describe("Runtime evidence — success path (NVDA)", () => {
  it("returns 200 with valid streamed article JSON", async () => {
    const res = await articleRoute.request("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "NVDA", language: "zh" }),
    });

    const text = await res.text();
    if (res.status !== 200) {
      throw new Error(
        `Expected 200 but got ${res.status}: ${text.slice(0, 500)}`,
      );
    }

    const article = JSON.parse(text) as Record<string, unknown>;

    // 8 sections present
    expect(article.schema_version).toBe(1);
    expect((article.entity as Record<string, unknown>).ticker).toBe("NVDA");
    expect(
      ((article.coreThesis as Record<string, unknown>).thesis as string).length,
    ).toBeGreaterThan(20);
    expect(
      ((article.industryChain as Record<string, unknown>).narrative as string)
        .length,
    ).toBeGreaterThan(10);
    expect(
      ((article.evidenceMatrix as Record<string, unknown>).narrative as string)
        .length,
    ).toBeGreaterThan(10);
    expect(
      ((article.companyLayer as Record<string, unknown>).narrative as string)
        .length,
    ).toBeGreaterThan(10);
    expect(
      ((article.conclusion as Record<string, unknown>).summary as string)
        .length,
    ).toBeGreaterThan(10);
    expect((article.evidence as unknown[]).length).toBeGreaterThanOrEqual(3);

    // Visuals: at least 2 non-empty
    const visuals = [
      (article.industryChain as Record<string, unknown>).visual,
      (article.evidenceMatrix as Record<string, unknown>).visual,
      (article.companyLayer as Record<string, unknown>).visual,
    ] as Array<Record<string, unknown>>;
    const nonEmptyVisuals = visuals.filter((v) => v.kind !== "empty");
    expect(nonEmptyVisuals.length).toBeGreaterThanOrEqual(2);

    // Evidence IDs linked
    expect(
      ((article.coreThesis as Record<string, unknown>).evidenceIds as string[])
        .length,
    ).toBeGreaterThan(0);
    expect(
      ((article.conclusion as Record<string, unknown>).evidenceIds as string[])
        .length,
    ).toBeGreaterThan(0);

    // Evidence items have source and date
    for (const ev of article.evidence as Array<Record<string, unknown>>) {
      expect(ev.source).toBeTruthy();
      expect(ev.date).toBeTruthy();
      expect(ev.id).toBeTruthy();
    }

    // Risks and invalidation conditions
    const conclusion = article.conclusion as Record<string, unknown>;
    expect((conclusion.risks as unknown[]).length).toBeGreaterThanOrEqual(2);
    expect(
      (conclusion.invalidationConditions as unknown[]).length,
    ).toBeGreaterThanOrEqual(2);

    // Redline: no vendor names in user-visible output
    const fullText = JSON.stringify(article);
    expect(fullText).not.toMatch(/Yahoo\s*Finance/i);
    expect(fullText).not.toMatch(/DeepSeek API/i);
    expect(fullText).not.toMatch(/Jina API/i);
  }, 15_000);
});

describe("Runtime evidence — degradation path (no data)", () => {
  it("degrades honestly when all data sources return nothing", async () => {
    // Override mocks: no entity, no financials, no IMA
    mockResolveEntity.mockResolvedValueOnce({
      ok: false,
      mode: "unknown",
      ticker: "",
      name: "",
      candidates: [],
    });
    mockSanitize.mockReturnValueOnce({ metrics: null });
    mockSearchIma.mockResolvedValueOnce([]);
    mockFormatIma.mockReturnValueOnce("");

    const res = await articleRoute.request("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "xyznonexistent123", language: "zh" }),
    });

    expect(res.status).toBe(200);

    const text = await res.text();
    const article = JSON.parse(text) as Record<string, unknown>;

    // Should be degraded (data gate caught it)
    expect(article._degraded).toBe(true);

    // Should NOT hallucinate entity or financials
    const fullText = JSON.stringify(article);
    expect(fullText).not.toMatch(/NVIDIA/i);
  });
});
