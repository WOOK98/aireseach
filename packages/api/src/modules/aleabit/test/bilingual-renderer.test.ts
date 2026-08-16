/**
 * AleaBit — Bilingual renderer tests (#135)
 *
 * Validates:
 * - i18n strings correct per locale
 * - notranslate guards present for dynamic values
 * - null metrics render as N/A (not 0)
 * - Every metric has period/unit/source metadata
 * - HTML structure is valid
 * - No vendor/internal env leakage
 */

import { describe, expect, it } from "vitest";

import { renderBilingualBriefCard } from "../bilingual-renderer";
import { buildNVDABrief } from "../fixtures/fixture-evidence";

const FIXTURE_POST = {
  id: "p1",
  postId: "p1",
  conversationId: "conv_nvda_earnings_q2",
  authorId: "u1",
  author: "AleaBit",
  authorHandle: "aleabitoreddit",
  authorName: "AleaBit",
  text: "NVDA earnings analysis",
  postedAt: "2026-08-10T00:00:00Z",
  url: "https://x.com/aleabitoreddit/status/p1",
  editHistory: ["v1"],
  fetchedAt: "2026-08-10T00:00:00Z",
  metrics: [],
  citations: [],
};

const brief = buildNVDABrief(FIXTURE_POST);

function renderBoth() {
  return {
    zh: renderBilingualBriefCard(brief, "zh-CN"),
    en: renderBilingualBriefCard(brief, "en"),
  };
}

describe("bilingual-renderer", () => {
  describe("i18n strings", () => {
    it("zh-CN uses Chinese labels", () => {
      const { zh } = renderBoth();
      expect(zh).toContain("核心指标");
      expect(zh).toContain("作者论点");
      expect(zh).toContain("驱动因素");
      expect(zh).toContain("风险 / 证伪条件");
      expect(zh).toContain("数据来源");
    });

    it("en uses English labels", () => {
      const { en } = renderBoth();
      expect(en).toContain("Key Metrics");
      expect(en).toContain("Author Thesis");
      expect(en).toContain("Drivers");
      expect(en).toContain("Risks / Falsifiers");
      expect(en).toContain("Sources");
    });

    it("lang attribute matches locale", () => {
      const { zh, en } = renderBoth();
      expect(zh).toContain('lang="zh-CN"');
      expect(en).toContain('lang="en"');
    });
  });

  describe("notranslate guards", () => {
    it("ticker and company have notranslate", () => {
      const { zh } = renderBoth();
      expect(zh).toContain('class="ticker notranslate"');
      expect(zh).toContain('translate="no"');
    });

    it("metric names have notranslate", () => {
      const { en } = renderBoth();
      expect(en).toContain('class="metric-name notranslate"');
    });

    it("metric periods have notranslate", () => {
      const { zh } = renderBoth();
      expect(zh).toContain('class="metric-period notranslate"');
    });

    it("source IDs have notranslate", () => {
      const { en } = renderBoth();
      expect(en).toContain('class="source-id notranslate"');
    });
  });

  describe("null → N/A", () => {
    it("renders null metric value as N/A", () => {
      const cardWithNull = {
        ...brief,
        metrics: [
          {
            name: "Revenue",
            value: null,
            unit: "USD",
            period: "FY2026 Q2",
            source: "E1",
          },
        ],
      };
      const html = renderBilingualBriefCard(cardWithNull, "en");
      expect(html).toContain("N/A");
    });

    it("renders null metric value as N/A in zh-CN", () => {
      const cardWithNull = {
        ...brief,
        metrics: [
          {
            name: "Revenue",
            value: null,
            unit: "USD",
            period: "FY2026 Q2",
            source: "E1",
          },
        ],
      };
      const html = renderBilingualBriefCard(cardWithNull, "zh-CN");
      expect(html).toContain("N/A");
    });
  });

  describe("metric metadata", () => {
    it("every metric has period, unit, and source", () => {
      const { zh } = renderBoth();
      // NVDA fixture has 4 metrics
      const periodMatches = zh.match(/class="metric-period/g);
      expect(periodMatches?.length).toBeGreaterThanOrEqual(4);

      const unitMatches = zh.match(/class="metric-unit/g);
      expect(unitMatches?.length).toBeGreaterThanOrEqual(4);

      const sourceMatches = zh.match(/metric-source/g);
      expect(sourceMatches?.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("HTML structure", () => {
    it("has proper DOCTYPE and html tag", () => {
      const { en } = renderBoth();
      expect(en).toContain("<!DOCTYPE html>");
      expect(en).toContain("<html");
    });

    it("has 1600px width in body style", () => {
      const { zh } = renderBoth();
      expect(zh).toContain("width: 1600px");
      expect(zh).toContain("height: 900px");
    });

    it("has disclaimer text", () => {
      const { zh, en } = renderBoth();
      expect(zh).toContain("不构成投资建议");
      expect(en).toContain("does not constitute investment advice");
    });
  });

  describe("no vendor/env leakage", () => {
    it("does not contain internal env vars", () => {
      const { zh, en } = renderBoth();
      const combined = zh + en;
      expect(combined).not.toContain("OPENAI");
      expect(combined).not.toContain("X_BEARER");
      expect(combined).not.toContain("INGEST_SECRET");
      expect(combined).not.toContain("process.env");
    });

    it("does not contain vendor names in output", () => {
      const { zh, en } = renderBoth();
      const combined = zh + en;
      expect(combined).not.toMatch(/Perplexity|Jina|DeepSeek/i);
    });
  });

  describe("deterministic output", () => {
    it("same input produces identical output", () => {
      const a = renderBilingualBriefCard(brief, "zh-CN");
      const b = renderBilingualBriefCard(brief, "zh-CN");
      expect(a).toBe(b);
    });
  });
});
