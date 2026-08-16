/**
 * AleaBit — Bilingual Brief Renderer (#135)
 *
 * Locale-aware HTML renderer for FinancialBriefCard.
 * Generates zh-CN or en HTML suitable for 1600×900 PNG capture.
 * Same verified data for both locales — only labels/titles differ.
 *
 * This is a deterministic renderer — same input always produces same output.
 * Every number traces to brief.metrics[]. No AI-generated numbers.
 * Missing data renders as "N/A" (never as 0).
 */

import type { FinancialBriefCard } from "@workspace/shared/types/aleabit";

export type Locale = "zh-CN" | "en";

// ── i18n strings ─────────────────────────────────────────────────────────────

const STRINGS: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    keyMetrics: "核心指标",
    authorThesis: "作者论点",
    drivers: "驱动因素",
    risksFalsifiers: "风险 / 证伪条件",
    sources: "数据来源",
    guidanceChanges: "指引变动",
    supplyChainBottleneck: "供应链瓶颈",
    limitations: "局限性",
    financialBrief: "财务简报",
    generated: "生成时间",
    schema: "版本",
    source: "来源",
    yoy: "同比",
    falsifier: "证伪条件",
    na: "N/A",
    disclaimer:
      "本简报基于公开财报与社交媒体内容自动生成，仅供参考，不构成投资建议。所有数据请独立核实。",
  },
  en: {
    keyMetrics: "Key Metrics",
    authorThesis: "Author Thesis",
    drivers: "Drivers",
    risksFalsifiers: "Risks / Falsifiers",
    sources: "Sources",
    guidanceChanges: "Guidance Changes",
    supplyChainBottleneck: "Supply Chain Bottleneck",
    limitations: "Limitations",
    financialBrief: "Financial Brief",
    generated: "Generated",
    schema: "Schema",
    source: "Source",
    yoy: "YoY",
    falsifier: "Falsifier",
    na: "N/A",
    disclaimer:
      "This brief is auto-generated from public filings and social media for reference only. It does not constitute investment advice. Verify all data independently.",
  },
};

function t(locale: Locale, key: string): string {
  return STRINGS[locale][key] ?? key;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMetricValue(
  value: number | null,
  unit: string,
  locale: Locale,
): string {
  if (value === null || value === undefined) return t(locale, "na");
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "USD" && Math.abs(value) >= 1e9)
    return `$${(value / 1e9).toFixed(2)}B`;
  if (unit === "USD" && Math.abs(value) >= 1e6)
    return `$${(value / 1e6).toFixed(1)}M`;
  if (unit === "USD") return `$${value.toFixed(2)}`;
  if (unit === "x") return `${value.toFixed(1)}x`;
  return `${value} ${unit}`;
}

function fmtChange(change: number | null | undefined): string {
  if (change === null || change === undefined) return "";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Render bilingual brief card ──────────────────────────────────────────────

export function renderBilingualBriefCard(
  card: FinancialBriefCard,
  locale: Locale,
): string {
  const L = STRINGS[locale];

  const metricsHtml = card.metrics
    .map(
      (m) => `
    <div class="metric">
      <div class="metric-name notranslate" translate="no">${escapeHtml(m.name)}</div>
      <div class="metric-value notranslate" translate="no">${fmtMetricValue(m.value, m.unit, locale)}</div>
      <div class="metric-meta">
        <span class="metric-period notranslate" translate="no">${escapeHtml(m.period)}</span>
        <span class="metric-unit notranslate" translate="no">${escapeHtml(m.unit)}</span>
        ${m.yoyChange != null ? `<span class="metric-change ${m.yoyChange >= 0 ? "positive" : "negative"}">${fmtChange(m.yoyChange)} ${L.yoy}</span>` : ""}
      </div>
      <div class="metric-source">${L.source}: ${escapeHtml(m.source)}</div>
    </div>`,
    )
    .join("\n");

  const driversHtml = card.drivers
    .map(
      (d) => `
    <div class="driver">
      <span class="driver-icon">▸</span>
      <span>${escapeHtml(d.description)}</span>
      <span class="driver-evidence">[${d.evidenceIds.join(", ")}]</span>
    </div>`,
    )
    .join("\n");

  const risksHtml = card.risksOrFalsifiers
    .map(
      (r) => `
    <div class="risk">
      <span class="risk-icon">⚠</span>
      <span>${escapeHtml(r.description)}</span>
      ${r.falsifier ? `<div class="falsifier">${L.falsifier}: ${escapeHtml(r.falsifier)}</div>` : ""}
      <span class="risk-evidence">[${r.evidenceIds.join(", ")}]</span>
    </div>`,
    )
    .join("\n");

  const sourcesHtml = card.sources
    .map(
      (s) => `
    <div class="source">
      <span class="source-id notranslate" translate="no">${escapeHtml(s.id)}</span>
      <span class="source-claim">${escapeHtml(s.claim)}</span>
      <span class="source-meta notranslate" translate="no">${escapeHtml(s.source)} · ${escapeHtml(s.date)}${s.unit ? ` · ${escapeHtml(s.unit)}` : ""}${s.fiscalPeriod ? ` · ${escapeHtml(s.fiscalPeriod)}` : ""}</span>
      <span class="source-confidence confidence-${s.confidence}">${s.confidence}</span>
    </div>`,
    )
    .join("\n");

  const guidanceHtml =
    card.guidanceChanges.length > 0
      ? `
    <div class="section">
      <div class="section-title">${L.guidanceChanges}</div>
      ${card.guidanceChanges
        .map(
          (g) => `
        <div class="guidance">
          <span class="guidance-metric notranslate" translate="no">${escapeHtml(g.metric)}</span>
          <span class="guidance-direction direction-${g.direction}">${g.direction}</span>
          <span class="guidance-detail notranslate" translate="no">${escapeHtml(g.previous)} → ${escapeHtml(g.updated)}</span>
          <span class="guidance-period notranslate" translate="no">${escapeHtml(g.period)}</span>
        </div>`,
        )
        .join("\n")}
    </div>`
      : "";

  const supplyChainHtml = card.supplyChainBottleneck
    ? `
    <div class="section">
      <div class="section-title">${L.supplyChainBottleneck}</div>
      <div class="supply-chain">${escapeHtml(card.supplyChainBottleneck)}</div>
    </div>`
    : "";

  const limitationsHtml =
    card.limitations.length > 0
      ? `
    <div class="section">
      <div class="section-title">${L.limitations}</div>
      <ul class="limitations">
        ${card.limitations.map((l) => `<li>${escapeHtml(l)}</li>`).join("\n")}
      </ul>
    </div>`
      : "";

  const langAttr = locale === "zh-CN" ? "zh-CN" : "en";

  return `<!DOCTYPE html>
<html lang="${langAttr}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1600, initial-scale=1">
<title>${escapeHtml(card.company)} (${escapeHtml(card.ticker)}) — ${L.financialBrief}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1600px; height: 900px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", sans-serif;
    background: #0f1419; color: #e7e9ea;
    overflow: hidden; padding: 40px;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 24px; border-bottom: 2px solid #2f3336; padding-bottom: 20px;
  }
  .header-left h1 {
    font-size: 32px; font-weight: 700; color: #ffffff;
    margin-bottom: 6px;
  }
  .header-left .subtitle {
    font-size: 16px; color: #71767b;
  }
  .header-right {
    text-align: right; font-size: 13px; color: #71767b;
  }
  .header-right .ticker {
    font-size: 22px; font-weight: 700; color: #1d9bf0;
    font-family: monospace;
  }
  .content {
    display: grid; grid-template-columns: 1fr 1fr; gap: 28px;
    height: calc(100% - 140px);
  }
  .section { margin-bottom: 16px; }
  .section-title {
    font-size: 13px; font-weight: 600; color: #71767b;
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 10px; padding-bottom: 5px;
    border-bottom: 1px solid #2f3336;
  }
  .metrics-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
  }
  .metric {
    background: #16202a; border-radius: 8px; padding: 14px;
    border: 1px solid #2f3336;
  }
  .metric-name { font-size: 11px; color: #71767b; margin-bottom: 4px; }
  .metric-value { font-size: 24px; font-weight: 700; color: #ffffff; font-family: monospace; }
  .metric-meta { font-size: 10px; color: #71767b; margin-top: 4px; display: flex; gap: 6px; }
  .metric-period { color: #1d9bf0; }
  .metric-unit { color: #6e7681; }
  .metric-change.positive { color: #00ba7c; }
  .metric-change.negative { color: #f4212e; }
  .metric-source { font-size: 9px; color: #6e7681; margin-top: 3px; }
  .thesis {
    font-size: 16px; line-height: 1.5; color: #e7e9ea;
    background: #16202a; border-radius: 8px; padding: 16px;
    border-left: 3px solid #1d9bf0;
  }
  .driver, .risk {
    font-size: 13px; line-height: 1.5; margin-bottom: 6px;
    padding: 6px 10px; border-radius: 6px;
  }
  .driver { background: #0a1a0a; border-left: 3px solid #00ba7c; }
  .driver-icon { color: #00ba7c; margin-right: 6px; }
  .driver-evidence { font-size: 10px; color: #6e7681; margin-left: 6px; }
  .risk { background: #1a0a0a; border-left: 3px solid #f4212e; }
  .risk-icon { color: #f4212e; margin-right: 6px; }
  .risk-evidence { font-size: 10px; color: #6e7681; margin-left: 6px; }
  .falsifier { font-size: 11px; color: #71767b; margin-top: 3px; margin-left: 22px; }
  .guidance {
    font-size: 12px; margin-bottom: 5px; padding: 5px 8px;
    background: #16202a; border-radius: 4px;
  }
  .guidance-metric { font-weight: 600; }
  .guidance-direction { margin: 0 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .direction-raised { color: #00ba7c; }
  .direction-lowered { color: #f4212e; }
  .direction-maintained { color: #71767b; }
  .guidance-detail { color: #e7e9ea; }
  .guidance-period { color: #71767b; margin-left: 6px; font-size: 10px; }
  .supply-chain { font-size: 13px; color: #ff7a00; background: #1a1000; padding: 10px; border-radius: 6px; }
  .limitations { font-size: 11px; color: #71767b; padding-left: 18px; }
  .limitations li { margin-bottom: 3px; }
  .source {
    font-size: 10px; margin-bottom: 3px; padding: 5px 6px;
    background: #16202a; border-radius: 4px; display: flex; gap: 6px; align-items: center;
  }
  .source-id { font-family: monospace; font-weight: 600; color: #1d9bf0; min-width: 28px; }
  .source-claim { flex: 1; color: #e7e9ea; }
  .source-meta { color: #6e7681; white-space: nowrap; }
  .source-confidence { font-size: 9px; font-weight: 600; padding: 2px 5px; border-radius: 3px; }
  .confidence-verified { background: #0a1a0a; color: #00ba7c; }
  .confidence-partial { background: #1a1a0a; color: #e7a000; }
  .confidence-unverified { background: #1a0a0a; color: #f4212e; }
  .footer {
    position: absolute; bottom: 40px; left: 40px; right: 40px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; color: #6e7681;
    border-top: 1px solid #2f3336; padding-top: 10px;
  }
  .footer .disclaimer { max-width: 70%; line-height: 1.4; }
  .footer .meta { text-align: right; }
  .notranslate { /* Chrome translator guard */ }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1 class="notranslate" translate="no">${escapeHtml(card.company)}</h1>
      <div class="subtitle">${escapeHtml(card.authorThesis)}</div>
    </div>
    <div class="header-right">
      <div class="ticker notranslate" translate="no">${escapeHtml(card.ticker)}</div>
      <div class="notranslate" translate="no">${escapeHtml(card.market)} · ${escapeHtml(card.reportPeriod)}</div>
      <div class="notranslate" translate="no">${new Date(card.publishedAt).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US")}</div>
    </div>
  </div>

  <div class="content">
    <div class="left-col">
      <div class="section">
        <div class="section-title">${L.keyMetrics}</div>
        <div class="metrics-grid">
          ${metricsHtml}
        </div>
      </div>

      ${guidanceHtml}
      ${supplyChainHtml}
      ${limitationsHtml}
    </div>

    <div class="right-col">
      <div class="section">
        <div class="section-title">${L.authorThesis}</div>
        <div class="thesis">${escapeHtml(card.authorThesis)}</div>
      </div>

      <div class="section">
        <div class="section-title">${L.drivers}</div>
        ${driversHtml}
      </div>

      <div class="section">
        <div class="section-title">${L.risksFalsifiers}</div>
        ${risksHtml}
      </div>

      <div class="section">
        <div class="section-title">${L.sources}</div>
        ${sourcesHtml}
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="disclaimer">${escapeHtml(locale === "zh-CN" ? (card.disclaimer ?? "") : (L.disclaimer ?? ""))}</div>
    <div class="meta">
      ${L.generated}: ${new Date(card.publishedAt).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US")}<br>
      ${L.schema} v${card.schema_version}
    </div>
  </div>
</body>
</html>`;
}
