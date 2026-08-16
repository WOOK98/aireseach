/**
 * AleaBit — PNG Renderer (#135)
 *
 * Generates 1600×900 bilingual PNGs from FinancialBriefCard.
 * Uses @vercel/og (Satori + resvg) — serverless-compatible, no browser binary.
 *
 * Uses React.createElement (no JSX compilation needed).
 * Two independent images (zh-CN + en) sharing the same verified data.
 */

import { ImageResponse } from "@vercel/og";
import { createElement as h } from "react";

import type { Locale } from "./bilingual-renderer";
import type { FinancialBriefCard } from "@workspace/shared/types/aleabit";

const W = 1600;
const H = 900;

export interface BilingualPngResult {
  zhCn: Buffer;
  en: Buffer;
}

// ── i18n ─────────────────────────────────────────────────────────────────────

const STRINGS: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    keyMetrics: "核心指标",
    authorThesis: "作者论点",
    drivers: "驱动因素",
    risksFalsifiers: "风险 / 证伪条件",
    sources: "数据来源",
    guidanceChanges: "指引变动",
    yoy: "同比",
    source: "来源",
    falsifier: "证伪条件",
    na: "N/A",
    disclaimer:
      "本简报基于公开财报与社交媒体内容自动生成，仅供参考，不构成投资建议。",
  },
  en: {
    keyMetrics: "Key Metrics",
    authorThesis: "Author Thesis",
    drivers: "Drivers",
    risksFalsifiers: "Risks / Falsifiers",
    sources: "Sources",
    guidanceChanges: "Guidance Changes",
    yoy: "YoY",
    source: "Source",
    falsifier: "Falsifier",
    na: "N/A",
    disclaimer:
      "Auto-generated from public filings and social media. Not investment advice. Verify independently.",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtValue(v: number | null, unit: string, locale: Locale): string {
  if (v === null || v === undefined) return STRINGS[locale].na ?? "N/A";
  if (unit === "%") return `${v.toFixed(1)}%`;
  if (unit === "USD" && Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (unit === "USD" && Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (unit === "USD") return `$${v.toFixed(2)}`;
  if (unit === "x") return `${v.toFixed(1)}x`;
  return `${v} ${unit}`;
}

function fmtChange(c: number | null | undefined): string {
  if (c === null || c === undefined) return "";
  return `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`;
}

function s(style: Record<string, unknown>) {
  return { style };
}

// ── Build React tree ─────────────────────────────────────────────────────────

function buildCard(card: FinancialBriefCard, locale: Locale) {
  const L = STRINGS[locale];
  const isZh = locale === "zh-CN";

  return h(
    "div",
    s({
      width: W,
      height: H,
      display: "flex",
      flexDirection: "column",
      background: "#0f1419",
      color: "#e7e9ea",
      padding: "40px",
      fontFamily: "Geist",
    }),
    // ── Header ──
    h(
      "div",
      s({
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "20px",
        paddingBottom: "16px",
        borderBottom: "2px solid #2f3336",
      }),
      h(
        "div",
        s({ display: "flex", flexDirection: "column" }),
        h(
          "div",
          s({ fontSize: "30px", fontWeight: 700, color: "#ffffff" }),
          card.company,
        ),
        h(
          "div",
          s({ fontSize: "13px", color: "#71767b", marginTop: "4px" }),
          card.authorThesis,
        ),
      ),
      h(
        "div",
        s({ display: "flex", flexDirection: "column", alignItems: "flex-end" }),
        h(
          "div",
          s({
            fontSize: "20px",
            fontWeight: 700,
            color: "#1d9bf0",
            fontFamily: "monospace",
          }),
          card.ticker,
        ),
        h(
          "div",
          s({ fontSize: "11px", color: "#71767b" }),
          `${card.market} · ${card.reportPeriod}`,
        ),
      ),
    ),

    // ── Body ──
    h(
      "div",
      s({ display: "flex", flex: 1, gap: "24px" }),
      // Left column
      h(
        "div",
        s({ display: "flex", flexDirection: "column", width: "50%" }),
        h(
          "div",
          s({
            fontSize: "11px",
            color: "#71767b",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }),
          L.keyMetrics,
        ),
        // Metrics
        h(
          "div",
          s({
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "12px",
          }),
          ...card.metrics.map((m) =>
            h(
              "div",
              {
                key: m.name,
                ...s({
                  display: "flex",
                  flexDirection: "column",
                  width: "48%",
                  background: "#16202a",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #2f3336",
                }),
              },
              h("div", s({ fontSize: "10px", color: "#71767b" }), m.name),
              h(
                "div",
                s({
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#ffffff",
                  fontFamily: "monospace",
                }),
                fmtValue(m.value, m.unit, locale),
              ),
              h(
                "div",
                s({ fontSize: "8px", color: "#71767b", marginTop: "2px" }),
                `${m.period} · ${m.unit}${m.yoyChange != null ? ` · ${fmtChange(m.yoyChange)} ${L.yoy}` : ""}`,
              ),
              h(
                "div",
                s({ fontSize: "7px", color: "#6e7681", marginTop: "1px" }),
                `${L.source}: ${m.source}`,
              ),
            ),
          ),
        ),
        // Guidance
        ...(card.guidanceChanges.length > 0
          ? [
              h(
                "div",
                s({ fontSize: "10px", color: "#71767b", marginBottom: "4px" }),
                L.guidanceChanges,
              ),
              ...card.guidanceChanges.map((g) =>
                h(
                  "div",
                  {
                    key: g.metric,
                    ...s({
                      display: "flex",
                      gap: "4px",
                      fontSize: "10px",
                      background: "#16202a",
                      borderRadius: "4px",
                      padding: "3px 6px",
                      marginBottom: "3px",
                    }),
                  },
                  h("span", s({ fontWeight: 600 }), g.metric),
                  h(
                    "span",
                    s({
                      color:
                        g.direction === "raised"
                          ? "#00ba7c"
                          : g.direction === "lowered"
                            ? "#f4212e"
                            : "#71767b",
                      fontSize: "8px",
                      textTransform: "uppercase",
                    }),
                    g.direction,
                  ),
                  h("span", {}, `${g.previous} → ${g.updated}`),
                ),
              ),
            ]
          : []),
        // Supply chain
        ...(card.supplyChainBottleneck
          ? [
              h(
                "div",
                s({
                  fontSize: "11px",
                  color: "#ff7a00",
                  background: "#1a1000",
                  padding: "6px",
                  borderRadius: "4px",
                  marginBottom: "8px",
                }),
                card.supplyChainBottleneck,
              ),
            ]
          : []),
        // Limitations
        ...(card.limitations.length > 0
          ? [
              h(
                "div",
                s({ fontSize: "10px", color: "#71767b", marginBottom: "3px" }),
                "局限性",
              ),
              ...card.limitations.map((l) =>
                h("div", s({ fontSize: "9px", color: "#71767b" }), `• ${l}`),
              ),
            ]
          : []),
      ),

      // Right column
      h(
        "div",
        s({ display: "flex", flexDirection: "column", width: "50%" }),
        h(
          "div",
          s({
            fontSize: "10px",
            color: "#71767b",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }),
          L.authorThesis,
        ),
        h(
          "div",
          s({
            fontSize: "13px",
            background: "#16202a",
            borderRadius: "6px",
            padding: "10px",
            borderLeft: "3px solid #1d9bf0",
            marginBottom: "10px",
          }),
          card.authorThesis,
        ),
        h(
          "div",
          s({
            fontSize: "10px",
            color: "#71767b",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }),
          L.drivers,
        ),
        ...card.drivers.map((d) =>
          h(
            "div",
            {
              key: d.description.slice(0, 20),
              ...s({
                display: "flex",
                fontSize: "11px",
                background: "#0a1a0a",
                borderLeft: "3px solid #00ba7c",
                borderRadius: "4px",
                padding: "3px 6px",
                marginBottom: "3px",
              }),
            },
            h("span", s({ color: "#00ba7c", marginRight: "4px" }), "▸"),
            h("span", {}, d.description),
            h(
              "span",
              s({ fontSize: "8px", color: "#6e7681", marginLeft: "4px" }),
              `[${d.evidenceIds.join(", ")}]`,
            ),
          ),
        ),
        h(
          "div",
          s({
            fontSize: "10px",
            color: "#71767b",
            marginBottom: "4px",
            marginTop: "6px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }),
          L.risksFalsifiers,
        ),
        ...card.risksOrFalsifiers.map((r) =>
          h(
            "div",
            {
              key: r.description.slice(0, 20),
              ...s({
                display: "flex",
                flexDirection: "column",
                fontSize: "11px",
                background: "#1a0a0a",
                borderLeft: "3px solid #f4212e",
                borderRadius: "4px",
                padding: "3px 6px",
                marginBottom: "3px",
              }),
            },
            h("span", {}, `⚠ ${r.description}`),
            ...(r.falsifier
              ? [
                  h(
                    "span",
                    s({
                      fontSize: "9px",
                      color: "#71767b",
                      marginLeft: "16px",
                    }),
                    `${L.falsifier}: ${r.falsifier}`,
                  ),
                ]
              : []),
          ),
        ),
        h(
          "div",
          s({
            fontSize: "10px",
            color: "#71767b",
            marginBottom: "4px",
            marginTop: "6px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }),
          L.sources,
        ),
        ...card.sources.slice(0, 5).map((s_item) =>
          h(
            "div",
            {
              key: s_item.id,
              ...s({
                display: "flex",
                gap: "4px",
                fontSize: "8px",
                background: "#16202a",
                borderRadius: "3px",
                padding: "2px 4px",
                marginBottom: "2px",
                alignItems: "center",
              }),
            },
            h(
              "span",
              s({
                fontFamily: "monospace",
                fontWeight: 600,
                color: "#1d9bf0",
                minWidth: "20px",
              }),
              s_item.id,
            ),
            h("span", s({ flex: "1" }), s_item.claim),
            h(
              "span",
              s({ color: "#6e7681" }),
              `${s_item.source} · ${s_item.date}`,
            ),
            h(
              "span",
              s({
                fontSize: "7px",
                fontWeight: 600,
                color:
                  s_item.confidence === "verified"
                    ? "#00ba7c"
                    : s_item.confidence === "partial"
                      ? "#e7a000"
                      : "#f4212e",
              }),
              s_item.confidence,
            ),
          ),
        ),
      ),
    ),

    // ── Footer ──
    h(
      "div",
      s({
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "8px",
        color: "#6e7681",
        borderTop: "1px solid #2f3336",
        paddingTop: "8px",
        marginTop: "8px",
      }),
      h("span", {}, isZh ? card.disclaimer : L.disclaimer),
      h("span", {}, `v${card.schema_version}`),
    ),
  );
}

// ── Font loading ─────────────────────────────────────────────────────────────

let _cachedFont: ArrayBuffer | undefined;

async function getGeistFont(): Promise<ArrayBuffer> {
  if (_cachedFont) return _cachedFont;
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fontPath = path.join(
      process.cwd(),
      "node_modules/@vercel/og/dist/Geist-Regular.ttf",
    );
    _cachedFont = fs.readFileSync(fontPath).buffer;
    return _cachedFont;
  } catch {
    return new ArrayBuffer(0);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Render a single locale as 1600×900 PNG via @vercel/og.
 * Serverless-compatible — no browser binary.
 */
export async function renderPngBriefCardLocale(
  card: FinancialBriefCard,
  locale: Locale,
): Promise<Buffer> {
  const response = new ImageResponse(buildCard(card, locale), {
    width: W,
    height: H,
    fonts: [
      {
        name: "Geist",
        data: await getGeistFont(),
        style: "normal",
      },
    ],
  });
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Render both locales as 1600×900 PNGs.
 */
export async function renderPngBriefCard(
  card: FinancialBriefCard,
): Promise<BilingualPngResult> {
  const zhCn = await renderPngBriefCardLocale(card, "zh-CN");
  const en = await renderPngBriefCardLocale(card, "en");
  return { zhCn, en };
}
