/**
 * AleaBit — FinancialBriefCard schema tests (#119)
 *
 * Validates:
 * - Schema accepts valid brief cards
 * - Schema rejects missing/invalid fields
 * - Evidence linkage enforced (metric → evidence, driver → evidence)
 * - Compliance redline blocks target price / rating language
 * - validateBriefOutput handles markdown fences and invalid JSON
 */
import { describe, it, expect } from "vitest";

import {
  financialBriefCardSchema,
  validateBriefOutput,
} from "@workspace/shared/schema/aleabit";

// ── Valid fixture ────────────────────────────────────────────────────────────

const VALID_BRIEF = {
  schema_version: 1,
  triggerPost: {
    postId: "fixture_nvda_001",
    conversationId: "conv_nvda_earnings_q2",
    author: "AleaBit",
    authorHandle: "aleabitoreddit",
    text: "$NVDA Q2 FY2026 earnings beat.",
    postedAt: "2026-08-10T20:30:00Z",
    url: "https://x.com/aleabitoreddit/status/fixture_nvda_001",
    editHistory: ["2026-08-10T20:30:00Z"],
    fetchedAt: "2026-08-11T10:00:00Z",
  },
  authorThesis:
    "AI infrastructure buildout accelerating, Blackwell ramp is the key catalyst for continued growth.",
  company: "NVIDIA Corporation",
  ticker: "NVDA",
  market: "US",
  reportPeriod: "FY2026 Q2",
  publishedAt: "2026-08-11T10:00:00Z",
  metrics: [
    {
      name: "Revenue",
      value: 30_000_000_000,
      unit: "USD",
      period: "FY2026 Q2",
      yoyChange: 56,
      source: "E1",
    },
    {
      name: "Gross Margin",
      value: 75.1,
      unit: "%",
      period: "FY2026 Q2",
      source: "E2",
    },
    {
      name: "EPS",
      value: 0.68,
      unit: "USD",
      period: "FY2026 Q2",
      yoyChange: 42,
      source: "E1",
    },
  ],
  guidanceChanges: [
    {
      metric: "Revenue guidance",
      previous: "$115B",
      updated: "$125B",
      direction: "raised",
      period: "FY2026",
      source: "E1",
    },
  ],
  drivers: [
    {
      description: "Blackwell GPU shipments doubled quarter-over-quarter.",
      evidenceIds: ["E1"],
    },
    {
      description: "Hyperscaler capex continues to accelerate.",
      evidenceIds: ["E3"],
    },
  ],
  risksOrFalsifiers: [
    {
      description: "China export restrictions tightening further.",
      falsifier: "US-China trade deal easing semiconductor restrictions.",
      evidenceIds: ["E3"],
    },
    {
      description: "Custom silicon from hyperscalers gaining traction.",
      falsifier: "Google TPU/Amazon Trainium revenue exceeding $5B annually.",
      evidenceIds: ["E3"],
    },
  ],
  limitations: [
    "Segment-level breakdown not yet available from SEC filing.",
    "Forward guidance is management estimate, not audited.",
  ],
  sources: [
    {
      id: "E1",
      claim: "Q2 FY2026 revenue $30.0B, EPS $0.68",
      source: "SEC 10-Q",
      date: "2026-08-10",
      unit: "USD",
      fiscalPeriod: "FY2026 Q2",
      confidence: "verified",
    },
    {
      id: "E2",
      claim: "Gross margin 75.1%",
      source: "SEC 10-Q",
      date: "2026-08-10",
      unit: "%",
      fiscalPeriod: "FY2026 Q2",
      confidence: "verified",
    },
    {
      id: "E3",
      claim: "Industry analysis and risk factors",
      source: "author_claim",
      date: "2026-08-10",
      confidence: "unverified",
    },
  ],
  disclaimer:
    "本简报基于公开财报与社交媒体内容自动生成，仅供参考，不构成投资建议。所有数据请独立核实。",
};

// ── Schema tests ─────────────────────────────────────────────────────────────

describe("financialBriefCardSchema", () => {
  it("accepts a valid brief card", () => {
    const result = financialBriefCardSchema.safeParse(VALID_BRIEF);
    expect(result.success).toBe(true);
  });

  it("rejects missing schema_version", () => {
    const brief = { ...VALID_BRIEF };
    delete (brief as Record<string, unknown>).schema_version;
    const result = financialBriefCardSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it("rejects wrong schema_version", () => {
    const brief = { ...VALID_BRIEF, schema_version: 2 };
    const result = financialBriefCardSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it("rejects empty metrics", () => {
    const brief = { ...VALID_BRIEF, metrics: [] };
    const result = financialBriefCardSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it("rejects metric with missing source evidence ID", () => {
    const brief = {
      ...VALID_BRIEF,
      metrics: [
        {
          name: "Revenue",
          value: 30_000_000_000,
          unit: "USD",
          period: "FY2026 Q2",
          source: "E_NONEXISTENT",
        },
      ],
    };
    const result = financialBriefCardSchema.safeParse(brief);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("E_NONEXISTENT");
    }
  });

  it("rejects orphan evidence (unreferenced)", () => {
    const brief = {
      ...VALID_BRIEF,
      sources: [
        ...VALID_BRIEF.sources,
        {
          id: "E_ORPHAN",
          claim: "Nobody references this",
          source: "SEC 10-Q",
          date: "2026-08-10",
          confidence: "verified",
        },
      ],
    };
    const result = financialBriefCardSchema.safeParse(brief);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join("; ");
      expect(msg).toContain("E_ORPHAN");
    }
  });

  it("rejects driver referencing unknown evidence", () => {
    const brief = {
      ...VALID_BRIEF,
      drivers: [
        {
          description: "Some driver with bad evidence reference.",
          evidenceIds: ["E_FAKE"],
        },
      ],
    };
    const result = financialBriefCardSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it("rejects missing disclaimer", () => {
    const brief = { ...VALID_BRIEF, disclaimer: "" };
    const result = financialBriefCardSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });
});

// ── validateBriefOutput ──────────────────────────────────────────────────────

describe("validateBriefOutput", () => {
  it("passes valid JSON output", () => {
    const result = validateBriefOutput(JSON.stringify(VALID_BRIEF));
    expect(result.ok).toBe(true);
    expect(result.data?.schema_version).toBe(1);
  });

  it("rejects target price language", () => {
    const bad = JSON.stringify(VALID_BRIEF).replace(
      "AI infrastructure buildout",
      "target price $200 based on",
    );
    const result = validateBriefOutput(bad);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("compliance redline");
  });

  it("rejects buy rating language", () => {
    const bad = JSON.stringify(VALID_BRIEF).replace(
      "本简报基于公开财报",
      "We issue a strong buy rating. 本简报基于公开财报",
    );
    const result = validateBriefOutput(bad);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("compliance redline");
  });

  it("handles markdown fences", () => {
    const wrapped = "```json\n" + JSON.stringify(VALID_BRIEF) + "\n```";
    const result = validateBriefOutput(wrapped);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = validateBriefOutput("not json at all");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("No JSON object");
  });
});
