import { describe, expect, it, vi } from "vitest";

// Mock the ai module before importing the generator
vi.mock("ai", () => ({
  generateText: vi.fn<() => unknown>(),
}));

import { generateText } from "ai";

import { generateIndustryBrief } from "../industry-brief-generator";

import type { IndustryUniverse } from "../industry";

const mockGenerateText = vi.mocked(generateText);

const MOCK_UNIVERSE: IndustryUniverse = {
  query: "liquid silicone rubber",
  asOf: "2026-08-09",
  etfs: [{ symbol: "SILC", name: "Silicone Materials ETF", holdings: 15 }],
  constituents: [
    {
      symbol: "DOW",
      name: "Dow Inc.",
      avgWeightPct: 8.5,
      heldByEtfs: 1,
      source: "etf",
      exchange: "US",
    },
    {
      symbol: "WCH",
      name: "Wacker Chemie",
      avgWeightPct: 6.2,
      heldByEtfs: 1,
      source: "etf",
      exchange: "ETR",
    },
  ],
};

const VALID_BRIEF_JSON = {
  definition:
    "Liquid Silicone Rubber (LSR) is a two-part platinum-cured silicone elastomer used in high-precision injection molding.",
  valueChain: [
    {
      layer: "LSR Raw Material",
      description: "Two-part platinum-cured silicone compound.",
      keyPlayers: [
        {
          ticker: "DOW",
          name: "Dow Inc.",
          exchange: "NYSE",
          role: "Silicone intermediates",
        },
      ],
      bottleneckStrength: "strong",
    },
  ],
  marketSizing: {
    tam: {
      label: "Total Addressable Market",
      value: "$4.8B (2025E)",
      methodology: "top-down",
      source: "Grand View Research",
      confidence: "partial",
    },
    sam: {
      label: "Serviceable Addressable Market",
      value: "$3.2B (2025E)",
      methodology: "both",
      source: "Derived",
      confidence: "partial",
    },
    som: {
      label: "Serviceable Obtainable Market",
      value: "$480M (2025E)",
      methodology: "bottom-up",
      source: "Company filings",
      confidence: "verified",
    },
  },
  marketSizeHistory: [
    { year: "2024", size: "$4.1B", growthRate: "10.8%", source: "GVR" },
  ],
  competition: {
    cr3: "72%",
    cr5: "85%",
    hhi: "2,180",
    trend: "stable",
  },
  shareBreakdown: [
    {
      player: "Dow",
      ticker: "DOW",
      share: "28%",
      change: "-1pp",
      source: "10-K",
    },
  ],
  sources: [
    {
      name: "Grand View Research",
      tier: 4,
      tierLabel: "Research firms",
      claim: "Market size",
      confidence: "partial",
    },
  ],
  limitations: ["China domestic data unavailable"],
  followUpCandidates: [
    {
      ticker: "DOW",
      name: "Dow Inc.",
      exchange: "NYSE",
      reason: "Largest share",
    },
  ],
};

const MOCK_MODEL = {} as Parameters<typeof generateIndustryBrief>[2];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateIndustryBrief", () => {
  it("returns validated brief for valid JSON output", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(VALID_BRIEF_JSON),
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    expect(result).not.toBeNull();
    expect(result!.definition).toContain("Liquid Silicone Rubber");
    expect(result!.valueChain.length).toBeGreaterThanOrEqual(1);
    expect(result!.sources.length).toBeGreaterThanOrEqual(1);
  });

  it("strips code fences before parsing", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "```json\n" + JSON.stringify(VALID_BRIEF_JSON) + "\n```",
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    expect(result).not.toBeNull();
    expect(result!.definition).toContain("Liquid Silicone Rubber");
  });

  it("returns null for malformed JSON", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "This is not JSON at all, just some text.",
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    expect(result).toBeNull();
  });

  it("returns null for valid JSON but schema-invalid data", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({ definition: "", valueChain: [] }),
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    expect(result).toBeNull();
  });

  it("returns null when LLM throws an error", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("API key invalid"));

    const result = await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    expect(result).toBeNull();
  });

  it("returns null for JSON with missing required fields", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        definition: "Some industry",
        // missing valueChain, marketSizing, competition, sources, etc.
      }),
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    expect(result).toBeNull();
  });

  it("returns null for JSON with invalid enum values", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_BRIEF_JSON,
        competition: { ...VALID_BRIEF_JSON.competition, trend: "rising" },
      }),
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    expect(result).toBeNull();
  });

  it("passes universe data to LLM in prompt", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify(VALID_BRIEF_JSON),
    } as Awaited<ReturnType<typeof generateText>>);

    await generateIndustryBrief(
      "liquid silicone rubber",
      MOCK_UNIVERSE,
      MOCK_MODEL,
    );

    const call = mockGenerateText.mock.calls[0]![0];
    expect(call.prompt).toContain("liquid silicone rubber");
    expect(call.prompt).toContain("DOW");
    expect(call.prompt).toContain("WCH");
    expect(call.system).toContain("7-Tier");
    expect(call.system).toContain("TAM / SAM / SOM");
  });
});
