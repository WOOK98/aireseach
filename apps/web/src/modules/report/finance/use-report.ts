"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";

import type {
  FinancialMetrics,
  ReportData,
} from "@workspace/shared/types/report";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

// ─── Fetch real financial data via our backend proxy ─────────────────────────
export function useFinancials(ticker: string | null) {
  return useQuery<FinancialMetrics>({
    queryKey: ["financials", ticker],
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/report/financials/${ticker}`);
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        data?: FinancialMetrics;
      };
      if (!json.ok) throw new Error(json.error ?? "Failed to fetch financials");
      return json.data as FinancialMetrics;
    },
  });
}

// ─── Validate ticker exists ───────────────────────────────────────────────────
export function useValidateTicker() {
  return useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`${API_BASE}/report/validate/${ticker}`);
      return res.json() as Promise<{
        valid: boolean;
        name?: string;
        price?: number;
      }>;
    },
  });
}

// ─── Stream AI report generation ─────────────────────────────────────────────
export type StreamStatus = "idle" | "loading" | "streaming" | "done" | "error";
export type ResearchMode =
  | "snapshot"
  | "earnings"
  | "competition"
  | "risk"
  | "poc";

const fmtPct = (value: number) =>
  `${Number.isFinite(value) ? value.toFixed(1) : "N/A"}%`;

const fmtMoney = (value: number) => {
  if (!Number.isFinite(value) || value === 0) return "N/A";
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
};

function buildFallbackReport(
  ticker: string,
  metrics: FinancialMetrics,
  language: "zh" | "en",
): ReportData {
  const isZh = language === "zh";
  const growthHealthy = metrics.revenueGrowthYoy >= 10;
  const cashGenerative = metrics.freeCashFlow > 0 && metrics.fcfMargin > 0;
  const profitable = metrics.netMargin > 0;
  const rating: ReportData["rating"] =
    growthHealthy && cashGenerative && profitable ? "Buy" : "Hold";
  const targetPrice =
    metrics.currentPrice > 0
      ? Number(
          (metrics.currentPrice * (rating === "Buy" ? 1.12 : 1.03)).toFixed(2),
        )
      : 0;
  const upside =
    metrics.currentPrice > 0
      ? Number(
          (
            ((targetPrice - metrics.currentPrice) / metrics.currentPrice) *
            100
          ).toFixed(1),
        )
      : 0;

  return {
    ticker,
    companyName: metrics.companyName,
    rating,
    targetPrice,
    upside,
    ratingRationale: isZh
      ? "AI 文字生成暂时未返回完整 JSON，本报告基于已加载的真实财务数据生成保守快照。"
      : "The AI narrative did not return complete JSON, so this conservative snapshot is based on loaded financial data.",
    investmentThesis: isZh
      ? `${metrics.companyName} 的当前快照显示营收增速为 ${fmtPct(metrics.revenueGrowthYoy)}，毛利率为 ${fmtPct(metrics.grossMargin)}，自由现金流为 ${fmtMoney(metrics.freeCashFlow)}。需要结合下一份财报、行业竞争和估值区间继续验证。`
      : `${metrics.companyName} shows revenue growth of ${fmtPct(metrics.revenueGrowthYoy)}, gross margin of ${fmtPct(metrics.grossMargin)}, and free cash flow of ${fmtMoney(metrics.freeCashFlow)}. Validate the thesis against the next earnings report, competition, and valuation range.`,
    sections: {
      overview: isZh
        ? `这是 ${metrics.companyName} (${ticker}) 的数据驱动快照，覆盖增长、利润率、现金流和估值。`
        : `This is a data-driven snapshot of ${metrics.companyName} (${ticker}) across growth, margins, cash flow, and valuation.`,
      growthDrivers: isZh
        ? `营收同比增速为 ${fmtPct(metrics.revenueGrowthYoy)}，需要观察该增速是否能在未来几个季度延续。`
        : `Revenue growth is ${fmtPct(metrics.revenueGrowthYoy)}; monitor whether this pace can persist over the next quarters.`,
      profitability: isZh
        ? `毛利率 ${fmtPct(metrics.grossMargin)}、净利率 ${fmtPct(metrics.netMargin)}、FCF 率 ${fmtPct(metrics.fcfMargin)} 是当前质量判断的核心。`
        : `Gross margin of ${fmtPct(metrics.grossMargin)}, net margin of ${fmtPct(metrics.netMargin)}, and FCF margin of ${fmtPct(metrics.fcfMargin)} anchor the quality view.`,
      risks: isZh
        ? [
            "AI 生成内容未完整返回，需要重新生成以获取完整主观分析。",
            "估值倍数可能受市场利率和风险偏好影响。",
            "单一数据源可能遗漏最新公告或管理层指引。",
          ]
        : [
            "The AI narrative did not complete; regenerate for full qualitative analysis.",
            "Valuation multiples can move with rates and risk appetite.",
            "A single data source may miss the latest filings or guidance.",
          ],
      valuation: isZh
        ? `当前 P/E 为 ${metrics.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "N/A"}，EV/EBITDA 为 ${metrics.evEbitda ? `${metrics.evEbitda.toFixed(1)}x` : "N/A"}，需与同业比较。`
        : `Current P/E is ${metrics.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "N/A"} and EV/EBITDA is ${metrics.evEbitda ? `${metrics.evEbitda.toFixed(1)}x` : "N/A"}; compare with peers.`,
      catalysts: isZh
        ? "下一份财报、管理层指引、利润率变化和现金流改善是主要观察点。"
        : "Next earnings, guidance, margin change, and cash flow improvement are the key catalysts.",
    },
    decisionBrief: {
      action: isZh
        ? "先列入观察，重新生成完整 AI 分析"
        : "Monitor first and regenerate the full AI analysis",
      confidence: "Medium",
      timeHorizon: isZh ? "未来 1-2 个季度" : "Next 1-2 quarters",
      keyQuestion: isZh
        ? "增长、利润率和自由现金流能否同时维持？"
        : "Can growth, margins, and free cash flow hold together?",
    },
    scenarioMatrix: [
      {
        scenario: "Bull",
        probability: 30,
        targetPrice:
          metrics.currentPrice > 0
            ? Number((metrics.currentPrice * 1.2).toFixed(2))
            : targetPrice,
        drivers: isZh
          ? ["增长维持双位数", "利润率改善", "现金流继续为正"]
          : [
              "Double-digit growth persists",
              "Margins improve",
              "Free cash flow remains positive",
            ],
      },
      {
        scenario: "Base",
        probability: 50,
        targetPrice,
        drivers: isZh
          ? ["增长正常化", "估值维持当前区间", "现金流稳定"]
          : [
              "Growth normalizes",
              "Valuation holds current range",
              "Cash flow stays stable",
            ],
      },
      {
        scenario: "Bear",
        probability: 20,
        targetPrice:
          metrics.currentPrice > 0
            ? Number((metrics.currentPrice * 0.85).toFixed(2))
            : targetPrice,
        drivers: isZh
          ? ["增长放缓", "利润率承压", "估值倍数下修"]
          : ["Growth slows", "Margins compress", "Multiples derate"],
      },
    ],
    roleBriefs: [
      {
        role: isZh ? "投资者" : "Investor",
        takeaway: isZh
          ? "先用真实财务指标判断质量，再等待完整 AI 分析补充竞争和叙事。"
          : "Use real metrics for quality first, then regenerate AI analysis for competition and narrative.",
        concern: isZh
          ? "当前缺少完整的模型生成文本和外部证据链。"
          : "The full AI narrative and external evidence chain are currently missing.",
      },
      {
        role: isZh ? "分析师" : "Analyst",
        takeaway: isZh
          ? "重点复核收入增速、毛利率、FCF 率和估值倍数。"
          : "Review revenue growth, gross margin, FCF margin, and valuation multiples.",
        concern: isZh
          ? "需要同业比较和最新公告验证。"
          : "Peer comparison and latest filings are needed.",
      },
    ],
    watchlist: [
      {
        metric: isZh ? "营收增速 YoY" : "Revenue growth YoY",
        current: fmtPct(metrics.revenueGrowthYoy),
        threshold: isZh
          ? "低于 10% 需复核增长叙事"
          : "Below 10% weakens the growth story",
        whyItMatters: isZh
          ? "决定估值能否维持溢价。"
          : "It determines whether a valuation premium can hold.",
      },
      {
        metric: isZh ? "自由现金流率" : "FCF margin",
        current: fmtPct(metrics.fcfMargin),
        threshold: isZh
          ? "转负或连续下降需警惕"
          : "Turning negative or declining is a warning",
        whyItMatters: isZh ? "验证增长质量。" : "It validates growth quality.",
      },
    ],
    nextSteps: isZh
      ? [
          "点击重新生成，获取完整 AI 结构化报告。",
          "对比同业估值和利润率。",
          "查看最近财报与管理层指引。",
        ]
      : [
          "Regenerate for the full structured AI report.",
          "Compare peer valuation and margins.",
          "Review the latest filing and management guidance.",
        ],
    evidenceNeeds: isZh
      ? ["最近季度财报或 10-Q/10-K", "管理层电话会纪要", "主要竞品财务指标"]
      : [
          "Latest quarterly filing or 10-Q/10-K",
          "Management earnings call transcript",
          "Key peer financial metrics",
        ],
    generatedAt: new Date().toISOString(),
  };
}

function parseReportJson(text: string) {
  const clean = text.replace(/```json|```/g, "").trim();
  if (!clean) return null;

  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    return null;
  }
}

export function useReportStream() {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [rawText, setRawText] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function generate(
    ticker: string,
    metrics: FinancialMetrics,
    language: "zh" | "en" = "zh",
    mode: ResearchMode = "snapshot",
  ) {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("loading");
    setRawText("");
    setReport(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/report/finance/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, metrics, language, mode }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        let message = detail || `API error ${res.status}`;

        try {
          const json = JSON.parse(detail) as {
            message?: string;
            detail?: string;
          };
          message = json.message ?? json.detail ?? message;
        } catch {}

        throw new Error(message);
      }

      setStatus("streaming");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setRawText(accumulated);
      }

      const parsed =
        parseReportJson(accumulated) ??
        buildFallbackReport(ticker, metrics, language);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Report response was not valid JSON");
      }

      setReport({
        ticker,
        companyName: metrics.companyName,
        generatedAt: new Date().toISOString(),
        ...(parsed as Omit<
          ReportData,
          "ticker" | "companyName" | "generatedAt"
        >),
      } satisfies ReportData);
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setStatus("idle");
    setRawText("");
    setReport(null);
    setError(null);
  }

  return { status, rawText, report, error, generate, reset };
}
