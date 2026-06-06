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

      // Parse final JSON
      const clean = accumulated.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

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
