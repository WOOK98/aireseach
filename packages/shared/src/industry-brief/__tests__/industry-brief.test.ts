import { describe, expect, it } from "vitest";

import { IndustryBriefSchema, parseIndustryBrief } from "../schema";

import type { IndustryBriefValidated } from "../schema";

// ─── Fixture: Liquid Silicone Rubber Industry Brief ───────────────────────────
// This fixture represents the expected LLM output structure.
// It is NOT live data — it validates the schema contract.

const LSR_FIXTURE: IndustryBriefValidated = {
  definition:
    "Liquid Silicone Rubber (LSR) is a two-part platinum-cured silicone elastomer " +
    "used in high-precision injection molding. Key sub-segments include medical-grade " +
    "LSR (implants, catheters), automotive LSR (seals, gaskets), electronics LSR " +
    "(keypads, connectors), and consumer LSR (bakewear, baby products). " +
    "The industry matters now because medical device miniaturization and EV thermal " +
    "management are driving demand beyond traditional automotive seals.",

  valueChain: [
    {
      layer: "End Demand",
      description:
        "Medical devices, automotive seals, electronics connectors, consumer goods. " +
        "Medical accounts for ~35% of premium LSR demand.",
      keyPlayers: [
        {
          ticker: "MDT",
          name: "Medtronic",
          exchange: "NYSE",
          role: "Medical device OEM (catheter tips, implantable components)",
        },
        {
          ticker: "JNJ",
          name: "Johnson & Johnson",
          exchange: "NYSE",
          role: "Surgical instruments, consumer health devices",
        },
      ],
      bottleneckStrength: "weak",
    },
    {
      layer: "LSR Molding & Fabrication",
      description:
        "Contract manufacturers and in-house molding operations. " +
        "Low barriers, fragmented, price-competitive.",
      keyPlayers: [
        {
          ticker: "SIMT",
          name: "Simtec Silicone Parts",
          exchange: "Private",
          role: "Pure-play LSR molder (medical, automotive)",
        },
      ],
      bottleneckStrength: "weak",
    },
    {
      layer: "LSR Raw Material",
      description:
        "Two-part platinum-cured silicone compound. " +
        "Dow (DOW), Wacker (WCH), Shin-Etsu (4063.T), Elkem (ELK) control ~80% of global capacity.",
      keyPlayers: [
        {
          ticker: "DOW",
          name: "Dow Inc.",
          exchange: "NYSE",
          role: "Silicone intermediates, LSR compounds",
        },
        {
          ticker: "WCH",
          name: "Wacker Chemie",
          exchange: "ETR",
          role: "High-purity LSR, medical-grade silicone",
        },
        {
          ticker: "4063.T",
          name: "Shin-Etsu Chemical",
          exchange: "TSE",
          role: "Specialty silicones, semiconductor-grade LSR",
        },
      ],
      bottleneckStrength: "strong",
    },
    {
      layer: "Silicon Metal & Precursors",
      description:
        "Upstream metallurgical-grade silicon from quartz + carbon reductants. " +
        "China produces ~70% of global silicon metal.",
      keyPlayers: [
        {
          ticker: "603260.SS",
          name: "Hoshine Silicon Industry",
          exchange: "SSE",
          role: "Largest silicon metal producer globally",
        },
      ],
      bottleneckStrength: "moderate",
    },
  ],

  marketSizing: {
    tam: {
      label: "Total Addressable Market",
      value: "$4.8B (2025E)",
      methodology: "top-down",
      source: "Grand View Research, 2024 report",
      confidence: "partial",
    },
    sam: {
      label: "Serviceable Addressable Market",
      value: "$3.2B (2025E)",
      methodology: "both",
      source: "Derived from TAM × medical+auto segment filter (~67%)",
      confidence: "partial",
    },
    som: {
      label: "Serviceable Obtainable Market",
      value: "$480M (2025E)",
      methodology: "bottom-up",
      source: "Based on top 5 LSR compounders' disclosed revenue",
      confidence: "verified",
    },
    crossValidationNote:
      "Top-down ($4.8B) vs bottom-up ($4.2B from company disclosures) shows ~14% gap, " +
      "within acceptable range. Gap attributed to unreported SME fabricators in China.",
  },

  marketSizeHistory: [
    {
      year: "2020",
      size: "$2.9B",
      growthRate: "—",
      source: "Grand View Research",
    },
    {
      year: "2021",
      size: "$3.1B",
      growthRate: "6.9%",
      source: "Grand View Research",
    },
    {
      year: "2022",
      size: "$3.4B",
      growthRate: "9.7%",
      source: "Grand View Research",
    },
    {
      year: "2023",
      size: "$3.7B",
      growthRate: "8.8%",
      source: "Grand View Research",
    },
    {
      year: "2024",
      size: "$4.1B",
      growthRate: "10.8%",
      source: "Grand View Research (est.)",
    },
    {
      year: "2025E",
      size: "$4.8B",
      growthRate: "17.1%",
      source: "Grand View Research (proj.)",
    },
  ],

  competition: {
    cr3: "72%",
    cr5: "85%",
    hhi: "2,180",
    trend: "stable",
    shareAttribution: {
      brand:
        "Wacker and Shin-Etsu hold premium positioning in medical-grade LSR",
      channel:
        "Direct sales to large OEMs dominate; distributors serve SME fabricators",
      price:
        "Premium pricing for medical-grade (>30% margin); commodity grades price-competitive",
      innovation:
        "Shin-Etsu leading in ultra-low-viscosity LSR for micro-molding",
    },
  },

  shareBreakdown: [
    {
      player: "Dow Inc.",
      ticker: "DOW",
      share: "28%",
      change: "-1pp",
      source: "Company filings, 2024",
    },
    {
      player: "Wacker Chemie",
      ticker: "WCH",
      share: "24%",
      change: "+2pp",
      source: "Company filings, 2024",
    },
    {
      player: "Shin-Etsu Chemical",
      ticker: "4063.T",
      share: "20%",
      change: "+1pp",
      source: "Company filings, 2024",
    },
    {
      player: "Elkem",
      ticker: "ELK",
      share: "8%",
      change: "0pp",
      source: "Company filings, 2024",
    },
    {
      player: "KCC Corporation",
      ticker: "002380.KS",
      share: "5%",
      change: "+1pp",
      source: "Industry estimates",
    },
    { player: "Others", share: "15%", change: "-3pp", source: "Derived" },
  ],

  sources: [
    {
      name: "Grand View Research — Liquid Silicone Rubber Market Report",
      tier: 4,
      tierLabel: "Research firms / consultancies / investment banks",
      url: "https://www.grandviewresearch.com/industry-analysis/liquid-silicone-rubber-market",
      claim: "Market size ($4.8B 2025E), CAGR, segment breakdown",
      date: "2024",
      confidence: "partial",
    },
    {
      name: "Wacker Chemie AG — Annual Report 2024",
      tier: 2,
      tierLabel:
        "Company filings / annual reports / prospectuses / earnings calls",
      url: "https://corporate.wacker.com/en/ir/annual-reports",
      claim: "Silicones division revenue, LSR capacity expansion, margin data",
      date: "2025-03",
      confidence: "verified",
    },
    {
      name: "Shin-Etsu Chemical — Investor Presentation Q3 FY2025",
      tier: 2,
      tierLabel:
        "Company filings / annual reports / prospectuses / earnings calls",
      claim: "Specialty silicones growth, micro-molding LSR product pipeline",
      date: "2025-02",
      confidence: "verified",
    },
    {
      name: "Dow Inc. — 10-K Filing 2024",
      tier: 2,
      tierLabel:
        "Company filings / annual reports / prospectuses / earnings calls",
      claim: "Silicones segment revenue, market share position",
      date: "2025-02",
      confidence: "verified",
    },
  ],

  limitations: [
    "China domestic LSR producers (e.g., Guangdong Polysilicon) do not publish segment-level revenue — market share for 'Others' is inferred",
    "Medical-grade LSR pricing data is not publicly available — margin estimates based on Wacker/Shin-Etsu disclosed silicones division margins",
    "Grand View Research uses a broader silicone elastomers definition — LSR-specific sizing may be 10-15% lower",
    "No independent verification of KCC Corporation's LSR-specific revenue (group silicones revenue allocated by segment estimate)",
  ],

  followUpCandidates: [
    {
      ticker: "WCH",
      name: "Wacker Chemie",
      exchange: "ETR",
      reason:
        "Pure-play silicone exposure with premium medical-grade LSR positioning; capacity expansion in Asia",
    },
    {
      ticker: "4063.T",
      name: "Shin-Etsu Chemical",
      exchange: "TSE",
      reason:
        "Leading micro-molding LSR technology; semiconductor-grade silicone crossover potential",
    },
    {
      ticker: "DOW",
      name: "Dow Inc.",
      exchange: "NYSE",
      reason:
        "Largest LSR market share; commodity-to-specialty transition thesis",
    },
    {
      ticker: "ELK",
      name: "Elkem",
      exchange: "OSE",
      reason:
        "Vertically integrated silicon metal to LSR; China capacity exposure",
    },
    {
      ticker: "603260.SS",
      name: "Hoshine Silicon Industry",
      exchange: "SSE",
      reason:
        "Upstream silicon metal bottleneck; controls ~15% of global silicon metal capacity",
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("IndustryBrief schema", () => {
  it("validates a correct fixture", () => {
    const result = IndustryBriefSchema.safeParse(LSR_FIXTURE);
    expect(result.success).toBe(true);
  });

  it("rejects empty definition", () => {
    const bad = { ...LSR_FIXTURE, definition: "" };
    const result = IndustryBriefSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects empty valueChain", () => {
    const bad = { ...LSR_FIXTURE, valueChain: [] };
    const result = IndustryBriefSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid tier (0)", () => {
    const bad = {
      ...LSR_FIXTURE,
      sources: [{ ...LSR_FIXTURE.sources[0], tier: 0 }],
    };
    const result = IndustryBriefSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid tier (8)", () => {
    const bad = {
      ...LSR_FIXTURE,
      sources: [{ ...LSR_FIXTURE.sources[0], tier: 8 }],
    };
    const result = IndustryBriefSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid confidence", () => {
    const bad = {
      ...LSR_FIXTURE,
      sources: [{ ...LSR_FIXTURE.sources[0], confidence: "maybe" }],
    };
    const result = IndustryBriefSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid bottleneck strength", () => {
    const bad = {
      ...LSR_FIXTURE,
      valueChain: [
        { ...LSR_FIXTURE.valueChain[0], bottleneckStrength: "extreme" },
      ],
    };
    const result = IndustryBriefSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid trend", () => {
    const bad = {
      ...LSR_FIXTURE,
      competition: { ...LSR_FIXTURE.competition, trend: "rising" },
    };
    const result = IndustryBriefSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("allows null cr3/cr5/hhi", () => {
    const brief = {
      ...LSR_FIXTURE,
      competition: {
        ...LSR_FIXTURE.competition,
        cr3: null,
        cr5: null,
        hhi: null,
      },
    };
    const result = IndustryBriefSchema.safeParse(brief);
    expect(result.success).toBe(true);
  });

  it("allows empty arrays for optional sections", () => {
    const brief = {
      ...LSR_FIXTURE,
      marketSizeHistory: [],
      shareBreakdown: [],
      limitations: [],
      followUpCandidates: [],
    };
    const result = IndustryBriefSchema.safeParse(brief);
    expect(result.success).toBe(true);
  });
});

describe("parseIndustryBrief", () => {
  it("returns ok for valid fixture", () => {
    const result = parseIndustryBrief(LSR_FIXTURE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.valueChain.length).toBeGreaterThanOrEqual(1);
      expect(result.data.sources.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns errors for invalid input", () => {
    const result = parseIndustryBrief({ definition: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("returns errors for non-object input", () => {
    const result = parseIndustryBrief("not an object");
    expect(result.ok).toBe(false);
  });

  it("returns errors for null input", () => {
    const result = parseIndustryBrief(null);
    expect(result.ok).toBe(false);
  });
});
