/**
 * AleaBit — Renderer tests (#121)
 *
 * Validates:
 * - Missing data renders as N/A (never as 0)
 * - Every rendered metric has source + period + unit
 * - Skipped/no-entity generates degraded card, not full brief
 * - needs_review shows reason
 * - notranslate guards on dynamic text
 * - No vendor names in output
 */
import { describe, it, expect } from "vitest";

import { renderBriefCard, renderDegradedCard } from "../renderer";

import type { FinancialBriefCard } from "@workspace/shared/types/aleabit";

// ── Valid brief fixture ──────────────────────────────────────────────────────

const VALID_BRIEF: FinancialBriefCard = {
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
  authorThesis: "AI infrastructure buildout accelerating.",
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
      value: null, // missing data
      unit: "USD",
      period: "FY2026 Q2",
      source: "E1",
    },
  ],
  guidanceChanges: [
    {
      metric: "Revenue",
      previous: "$115B",
      updated: "$125B",
      direction: "raised",
      period: "FY2026",
      source: "E1",
    },
  ],
  drivers: [
    {
      description: "Blackwell GPU shipments doubled QoQ.",
      evidenceIds: ["E1"],
    },
  ],
  risksOrFalsifiers: [
    {
      description: "China export restrictions tightening.",
      falsifier: "US-China trade deal.",
      evidenceIds: ["E3"],
    },
  ],
  limitations: ["Segment breakdown not yet available."],
  sources: [
    {
      id: "E1",
      claim: "Q2 revenue $30B",
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
      claim: "Industry analysis",
      source: "author_claim",
      date: "2026-08-10",
      confidence: "unverified",
    },
  ],
  disclaimer: "本简报基于公开财报自动生成，仅供参考，不构成投资建议。",
};

// ── Renderer tests ───────────────────────────────────────────────────────────

describe("renderBriefCard", () => {
  it("renders valid brief as HTML", () => {
    const html = renderBriefCard(VALID_BRIEF);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("NVIDIA Corporation");
    expect(html).toContain("NVDA");
    expect(html).toContain("FY2026 Q2");
  });

  it("renders null value as N/A, not 0", () => {
    const html = renderBriefCard(VALID_BRIEF);
    // EPS has null value — should show N/A
    expect(html).toContain("N/A");
    expect(html).not.toMatch(/0\.00 USD/);
  });

  it("every metric has period + unit + source", () => {
    const html = renderBriefCard(VALID_BRIEF);
    for (const metric of VALID_BRIEF.metrics) {
      expect(html).toContain(metric.period);
      expect(html).toContain(metric.unit);
      expect(html).toContain(metric.source);
    }
  });

  it("renders YoY change with sign", () => {
    const html = renderBriefCard(VALID_BRIEF);
    expect(html).toContain("+56.0% YoY");
  });

  it("includes disclaimer", () => {
    const html = renderBriefCard(VALID_BRIEF);
    expect(html).toContain(VALID_BRIEF.disclaimer);
  });

  it("includes notranslate guards", () => {
    const html = renderBriefCard(VALID_BRIEF);
    expect(html).toContain("notranslate");
    expect(html).toContain('translate="no"');
  });

  it("renders sources with confidence badges", () => {
    const html = renderBriefCard(VALID_BRIEF);
    expect(html).toContain("verified");
    expect(html).toContain("unverified");
    expect(html).toContain("SEC 10-Q");
  });

  it("renders falsifier", () => {
    const html = renderBriefCard(VALID_BRIEF);
    expect(html).toContain("US-China trade deal");
  });

  it("no vendor names in output", () => {
    const html = renderBriefCard(VALID_BRIEF);
    expect(html).not.toMatch(/Yahoo\s*Finance/i);
    expect(html).not.toMatch(/DeepSeek/i);
    expect(html).not.toMatch(/Jina/i);
  });
});

describe("renderDegradedCard", () => {
  it("renders skipped card", () => {
    const html = renderDegradedCard({
      status: "skipped",
      reason: "No identifiable company found.",
    });
    expect(html).toContain("skipped");
    expect(html).toContain("No identifiable company");
    expect(html).not.toContain("NVIDIA");
  });

  it("renders needs_review card with entity", () => {
    const html = renderDegradedCard({
      company: "NVIDIA",
      ticker: "NVDA",
      status: "needs_review",
      reason: "Multiple entities detected.",
      triggerText: "$NVDA vs $AMD earnings comparison.",
    });
    expect(html).toContain("needs review");
    expect(html).toContain("NVIDIA");
    expect(html).toContain("Multiple entities");
  });

  it("renders failed card", () => {
    const html = renderDegradedCard({
      status: "failed",
      reason: "SEC EDGAR API timeout.",
    });
    expect(html).toContain("failed");
    expect(html).toContain("SEC EDGAR API timeout");
  });

  it("no vendor names in degraded output", () => {
    const html = renderDegradedCard({
      status: "skipped",
      reason: "Test reason.",
    });
    expect(html).not.toMatch(/Yahoo\s*Finance/i);
  });
});
