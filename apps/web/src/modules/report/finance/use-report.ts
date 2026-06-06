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
  _language: "zh" | "en",
): ReportData {
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
    ratingRationale:
      "The AI narrative did not return complete JSON, so this conservative snapshot is based on loaded financial data.",
    investmentThesis: `${metrics.companyName} shows revenue growth of ${fmtPct(metrics.revenueGrowthYoy)}, gross margin of ${fmtPct(metrics.grossMargin)}, and free cash flow of ${fmtMoney(metrics.freeCashFlow)}. Validate the thesis against the next earnings report, competition, and valuation range.`,
    sections: {
      overview: `This is a data-driven snapshot of ${metrics.companyName} (${ticker}) across growth, margins, cash flow, and valuation.`,
      growthDrivers: `Revenue growth is ${fmtPct(metrics.revenueGrowthYoy)}; monitor whether this pace can persist over the next quarters.`,
      profitability: `Gross margin of ${fmtPct(metrics.grossMargin)}, net margin of ${fmtPct(metrics.netMargin)}, and FCF margin of ${fmtPct(metrics.fcfMargin)} anchor the quality view.`,
      risks: [
        "The AI narrative did not complete; regenerate for full qualitative analysis.",
        "Valuation multiples can move with rates and risk appetite.",
        "A single data source may miss the latest filings or guidance.",
      ],
      valuation: `Current P/E is ${metrics.peRatio ? `${metrics.peRatio.toFixed(1)}x` : "N/A"} and EV/EBITDA is ${metrics.evEbitda ? `${metrics.evEbitda.toFixed(1)}x` : "N/A"}; compare with peers.`,
      catalysts:
        "Next earnings, guidance, margin change, and cash flow improvement are the key catalysts.",
    },
    decisionBrief: {
      action: "Monitor first and regenerate the full AI analysis",
      confidence: "Medium",
      timeHorizon: "Next 1-2 quarters",
      keyQuestion: "Can growth, margins, and free cash flow hold together?",
    },
    scenarioMatrix: [
      {
        scenario: "Bull",
        probability: 30,
        targetPrice:
          metrics.currentPrice > 0
            ? Number((metrics.currentPrice * 1.2).toFixed(2))
            : targetPrice,
        drivers: [
          "Double-digit growth persists",
          "Margins improve",
          "Free cash flow remains positive",
        ],
      },
      {
        scenario: "Base",
        probability: 50,
        targetPrice,
        drivers: [
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
        drivers: ["Growth slows", "Margins compress", "Multiples derate"],
      },
    ],
    roleBriefs: [
      {
        role: "Investor",
        takeaway:
          "Use real metrics for quality first, then regenerate AI analysis for competition and narrative.",
        concern:
          "The full AI narrative and external evidence chain are currently missing.",
      },
      {
        role: "Analyst",
        takeaway:
          "Review revenue growth, gross margin, FCF margin, and valuation multiples.",
        concern: "Peer comparison and latest filings are needed.",
      },
    ],
    watchlist: [
      {
        metric: "Revenue growth YoY",
        current: fmtPct(metrics.revenueGrowthYoy),
        threshold: "Below 10% weakens the growth story",
        whyItMatters: "It determines whether a valuation premium can hold.",
      },
      {
        metric: "FCF margin",
        current: fmtPct(metrics.fcfMargin),
        threshold: "Turning negative or declining is a warning",
        whyItMatters: "It validates growth quality.",
      },
    ],
    nextSteps: [
      "Regenerate for the full structured AI report.",
      "Compare peer valuation and margins.",
      "Review the latest filing and management guidance.",
    ],
    evidenceNeeds: [
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
