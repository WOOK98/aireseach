/**
 * AleaBit — 16:9 Brief Renderer (#121)
 *
 * Renders a FinancialBriefCard as a 16:9 HTML artifact.
 * Every rendered number carries period + unit + source reference.
 * Missing data renders as "N/A" (never as 0).
 *
 * This is a deterministic renderer — same input always produces same output.
 */
import type { FinancialBriefCard } from "@workspace/shared/types/aleabit";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMetricValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return "N/A";
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

// ── Render brief card ────────────────────────────────────────────────────────

export function renderBriefCard(card: FinancialBriefCard): string {
  const metricsHtml = card.metrics
    .map(
      (m) => `
    <div class="metric">
      <div class="metric-name notranslate" translate="no">${escapeHtml(m.name)}</div>
      <div class="metric-value notranslate" translate="no">${fmtMetricValue(m.value, m.unit)}</div>
      <div class="metric-meta">
        <span class="metric-period notranslate" translate="no">${escapeHtml(m.period)}</span>
        <span class="metric-unit notranslate" translate="no">${escapeHtml(m.unit)}</span>
        ${m.yoyChange != null ? `<span class="metric-change ${m.yoyChange >= 0 ? "positive" : "negative"}">${fmtChange(m.yoyChange)} YoY</span>` : ""}
      </div>
      <div class="metric-source">Source: ${escapeHtml(m.source)}</div>
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
      ${r.falsifier ? `<div class="falsifier">Falsifier: ${escapeHtml(r.falsifier)}</div>` : ""}
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
      <div class="section-title">Guidance Changes</div>
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
      <div class="section-title">Supply Chain Bottleneck</div>
      <div class="supply-chain">${escapeHtml(card.supplyChainBottleneck)}</div>
    </div>`
    : "";

  const limitationsHtml =
    card.limitations.length > 0
      ? `
    <div class="section">
      <div class="section-title">Limitations</div>
      <ul class="limitations">
        ${card.limitations.map((l) => `<li>${escapeHtml(l)}</li>`).join("\n")}
      </ul>
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1920, initial-scale=1">
<title>${escapeHtml(card.company)} (${escapeHtml(card.ticker)}) — Financial Brief</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0f1419; color: #e7e9ea;
    overflow: hidden; padding: 48px;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 32px; border-bottom: 2px solid #2f3336; padding-bottom: 24px;
  }
  .header-left h1 {
    font-size: 36px; font-weight: 700; color: #ffffff;
    margin-bottom: 8px;
  }
  .header-left .subtitle {
    font-size: 18px; color: #71767b;
  }
  .header-right {
    text-align: right; font-size: 14px; color: #71767b;
  }
  .header-right .ticker {
    font-size: 24px; font-weight: 700; color: #1d9bf0;
    font-family: monospace;
  }
  .content {
    display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
    height: calc(100% - 160px);
  }
  .section {
    margin-bottom: 20px;
  }
  .section-title {
    font-size: 14px; font-weight: 600; color: #71767b;
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 12px; padding-bottom: 6px;
    border-bottom: 1px solid #2f3336;
  }
  .metrics-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  }
  .metric {
    background: #16202a; border-radius: 8px; padding: 16px;
    border: 1px solid #2f3336;
  }
  .metric-name { font-size: 12px; color: #71767b; margin-bottom: 4px; }
  .metric-value { font-size: 28px; font-weight: 700; color: #ffffff; font-family: monospace; }
  .metric-meta { font-size: 11px; color: #71767b; margin-top: 4px; display: flex; gap: 8px; }
  .metric-period { color: #1d9bf0; }
  .metric-unit { color: #6e7681; }
  .metric-change.positive { color: #00ba7c; }
  .metric-change.negative { color: #f4212e; }
  .metric-source { font-size: 10px; color: #6e7681; margin-top: 4px; }
  .thesis {
    font-size: 18px; line-height: 1.5; color: #e7e9ea;
    background: #16202a; border-radius: 8px; padding: 20px;
    border-left: 3px solid #1d9bf0;
  }
  .driver, .risk {
    font-size: 14px; line-height: 1.5; margin-bottom: 8px;
    padding: 8px 12px; border-radius: 6px;
  }
  .driver { background: #0a1a0a; border-left: 3px solid #00ba7c; }
  .driver-icon { color: #00ba7c; margin-right: 8px; }
  .driver-evidence { font-size: 11px; color: #6e7681; margin-left: 8px; }
  .risk { background: #1a0a0a; border-left: 3px solid #f4212e; }
  .risk-icon { color: #f4212e; margin-right: 8px; }
  .risk-evidence { font-size: 11px; color: #6e7681; margin-left: 8px; }
  .falsifier { font-size: 12px; color: #71767b; margin-top: 4px; margin-left: 24px; }
  .guidance {
    font-size: 13px; margin-bottom: 6px; padding: 6px 10px;
    background: #16202a; border-radius: 4px;
  }
  .guidance-metric { font-weight: 600; }
  .guidance-direction { margin: 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .direction-raised { color: #00ba7c; }
  .direction-lowered { color: #f4212e; }
  .direction-maintained { color: #71767b; }
  .guidance-detail { color: #e7e9ea; }
  .guidance-period { color: #71767b; margin-left: 8px; font-size: 11px; }
  .supply-chain { font-size: 14px; color: #ff7a00; background: #1a1000; padding: 12px; border-radius: 6px; }
  .limitations { font-size: 12px; color: #71767b; padding-left: 20px; }
  .limitations li { margin-bottom: 4px; }
  .source {
    font-size: 11px; margin-bottom: 4px; padding: 6px 8px;
    background: #16202a; border-radius: 4px; display: flex; gap: 8px; align-items: center;
  }
  .source-id { font-family: monospace; font-weight: 600; color: #1d9bf0; min-width: 32px; }
  .source-claim { flex: 1; color: #e7e9ea; }
  .source-meta { color: #6e7681; white-space: nowrap; }
  .source-confidence { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; }
  .confidence-verified { background: #0a1a0a; color: #00ba7c; }
  .confidence-partial { background: #1a1a0a; color: #e7a000; }
  .confidence-unverified { background: #1a0a0a; color: #f4212e; }
  .footer {
    position: absolute; bottom: 48px; left: 48px; right: 48px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 11px; color: #6e7681;
    border-top: 1px solid #2f3336; padding-top: 12px;
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
      <div class="notranslate" translate="no">${new Date(card.publishedAt).toLocaleDateString("zh-CN")}</div>
    </div>
  </div>

  <div class="content">
    <div class="left-col">
      <div class="section">
        <div class="section-title">Key Metrics</div>
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
        <div class="section-title">Author Thesis</div>
        <div class="thesis">${escapeHtml(card.authorThesis)}</div>
      </div>

      <div class="section">
        <div class="section-title">Drivers</div>
        ${driversHtml}
      </div>

      <div class="section">
        <div class="section-title">Risks / Falsifiers</div>
        ${risksHtml}
      </div>

      <div class="section">
        <div class="section-title">Sources</div>
        ${sourcesHtml}
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="disclaimer">${escapeHtml(card.disclaimer)}</div>
    <div class="meta">
      Generated: ${new Date(card.publishedAt).toLocaleString("zh-CN")}<br>
      Schema v${card.schema_version}
    </div>
  </div>
</body>
</html>`;
}

// ── Render degraded/skipped card ─────────────────────────────────────────────

export function renderDegradedCard(options: {
  company?: string;
  ticker?: string;
  reason: string;
  status: "skipped" | "needs_review" | "failed";
  triggerText?: string;
}): string {
  const statusColors: Record<string, string> = {
    skipped: "#71767b",
    needs_review: "#e7a000",
    failed: "#f4212e",
  };
  const color = statusColors[options.status] ?? "#71767b";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1920, initial-scale=1">
<title>Financial Brief — ${options.status}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1920px; height: 1080px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0f1419; color: #e7e9ea;
    display: flex; align-items: center; justify-content: center;
  }
  .card {
    width: 800px; background: #16202a; border-radius: 16px;
    padding: 48px; border: 2px solid ${color};
    text-align: center;
  }
  .status {
    font-size: 14px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 2px; color: ${color}; margin-bottom: 24px;
  }
  .title {
    font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 16px;
  }
  .reason {
    font-size: 16px; color: #71767b; line-height: 1.6; margin-bottom: 24px;
  }
  .trigger {
    font-size: 13px; color: #6e7681; background: #0f1419;
    padding: 16px; border-radius: 8px; text-align: left;
    max-height: 200px; overflow: hidden;
  }
  .trigger-label {
    font-size: 11px; color: #71767b; text-transform: uppercase;
    letter-spacing: 1px; margin-bottom: 8px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="status">${options.status.replace(/_/g, " ")}</div>
    <div class="title">
      ${options.company ? `<span class="notranslate" translate="no">${escapeHtml(options.company)}</span> ` : ""}
      ${options.ticker ? `(<span class="notranslate" translate="no">${escapeHtml(options.ticker)}</span>)` : "Financial Brief"}
    </div>
    <div class="reason">${escapeHtml(options.reason)}</div>
    ${
      options.triggerText
        ? `
    <div class="trigger">
      <div class="trigger-label">Trigger Post</div>
      ${escapeHtml(options.triggerText).slice(0, 500)}
    </div>`
        : ""
    }
  </div>
</body>
</html>`;
}
