"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  EarningsReport,
  type EarningsReportData,
} from "~/components/report/EarningsReport";
import {
  PostEarningsMove,
  type PostEarningsMoveData,
} from "~/components/report/PostEarningsMove";

type Phase = "input" | "loading-earnings" | "loading-move" | "done" | "error";

// ── JSON parser (same pattern as use-report.ts) ──────────────────────────────

function parseJsonFromStream(text: string): Record<string, unknown> | null {
  const clean = text.replace(/```json|```/g, "").trim();
  if (!clean) return null;
  try {
    const result = JSON.parse(clean);
    return typeof result === "object" && result !== null
      ? (result as Record<string, unknown>)
      : null;
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const result = JSON.parse(clean.slice(start, end + 1));
        return typeof result === "object" && result !== null
          ? (result as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Highlighter CSS ───────────────────────────────────────────────────────────

const highlighterStyles = `
  .highlight-yellow {
    background: linear-gradient(180deg, transparent 50%, rgba(250, 204, 21, 0.35) 50%);
    padding: 1px 3px;
    border-radius: 2px;
  }
  .highlight-red {
    background: linear-gradient(180deg, transparent 50%, rgba(239, 68, 68, 0.25) 50%);
    padding: 1px 3px;
    border-radius: 2px;
  }
  .highlight-green {
    background: linear-gradient(180deg, transparent 50%, rgba(16, 185, 129, 0.25) 50%);
    padding: 1px 3px;
    border-radius: 2px;
  }
  .earnings-highlighted-content p {
    margin-bottom: 0.5rem;
  }
  .earnings-highlighted-content strong {
    font-weight: 600;
  }
`;

// ── Page Component ────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const [ticker, setTicker] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsReportData | null>(
    null,
  );
  const [moveData, setMoveData] = useState<PostEarningsMoveData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleAnalyze = useCallback(async () => {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPhase("loading-earnings");
    setError(null);
    setEarningsData(null);
    setMoveData(null);

    try {
      // ── Step 1: Earnings Deep Dive ──
      const earningsRes = await fetch("/api/report/earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, language: "zh-CN" }),
        signal: ctrl.signal,
      });

      if (!earningsRes.ok || !earningsRes.body) {
        const detail = await earningsRes.text().catch(() => "");
        let message = detail || `API error ${earningsRes.status}`;
        try {
          const json = JSON.parse(detail) as { detail?: string };
          message = json.detail ?? message;
        } catch {}
        throw new Error(message);
      }

      // Stream the earnings response
      const reader = earningsRes.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      const parsed = parseJsonFromStream(accumulated);
      if (parsed) {
        setEarningsData(parsed as unknown as EarningsReportData);
      }

      // ── Step 2: Post-Earnings Move Analysis ──
      setPhase("loading-move");

      const moveRes = await fetch("/api/report/earnings/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: symbol, language: "zh-CN" }),
        signal: ctrl.signal,
      });

      if (!moveRes.ok || !moveRes.body) {
        const detail = await moveRes.text().catch(() => "");
        let message = detail || `API error ${moveRes.status}`;
        try {
          const json = JSON.parse(detail) as { detail?: string };
          message = json.detail ?? message;
        } catch {}
        throw new Error(message);
      }

      const moveReader = moveRes.body.getReader();
      let moveAccumulated = "";

      while (true) {
        const { done, value } = await moveReader.read();
        if (done) break;
        moveAccumulated += decoder.decode(value, { stream: true });
      }

      const moveParsed = parseJsonFromStream(moveAccumulated);
      if (moveParsed) {
        setMoveData(moveParsed as unknown as PostEarningsMoveData);
      }

      setPhase("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
      setPhase("error");
    }
  }, [ticker]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setTicker("");
    setPhase("input");
    setError(null);
    setEarningsData(null);
    setMoveData(null);
  }, []);

  const isLoading = phase === "loading-earnings" || phase === "loading-move";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: highlighterStyles }} />

      <div className="text-ink min-h-screen">
        {/* ── Header ── */}
        <div className="bg-paper/95 border-line sticky top-0 z-20 border-b backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
            <div>
              <p className="text-ink-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
                Earnings Intelligence
              </p>
              <h1 className="font-serif text-xl font-semibold">财报深度解读</h1>
            </div>
            {phase !== "input" && (
              <button
                type="button"
                onClick={handleReset}
                className="text-ink-2 hover:text-ink border-line rounded-full border px-3 py-1.5 text-xs transition"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>

        <main className="mx-auto w-full max-w-5xl px-4 py-8">
          {/* ── Search Input ── */}
          <div className="mb-8">
            <div className="relative">
              <Search className="text-ink-2 absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) void handleAnalyze();
                }}
                placeholder="Enter ticker symbol (e.g. TSLA, NVDA, AAPL)..."
                className="border-line bg-panel w-full rounded-xl border py-3.5 pr-32 pl-11 font-mono text-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!ticker.trim() || isLoading}
                className="bg-ink text-paper absolute top-1 right-1 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {phase === "loading-earnings"
                      ? "Analyzing Earnings..."
                      : "Analyzing Move..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Analyze
                  </>
                )}
              </button>
            </div>
            <p className="text-ink-2 mt-2 text-xs">
              输入股票代码，AI 将自动拉取最新财报数据并进行多维度深度拆解
            </p>
          </div>

          {/* ── Error ── */}
          {phase === "error" && error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Analysis Failed
                </p>
                <p className="mt-1 text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* ── Loading State ── */}
          {isLoading && (
            <div className="mb-8">
              <div className="border-line bg-panel rounded-xl border p-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="text-lock h-5 w-5 animate-spin" />
                  <div>
                    <p className="text-sm font-medium">
                      {phase === "loading-earnings"
                        ? "正在分析财报数据..."
                        : "正在分析股价异动原因..."}
                    </p>
                    <p className="text-ink-2 mt-1 text-xs">
                      {phase === "loading-earnings"
                        ? "AI 正在拆解营收、利润率、指引和管理层口径"
                        : "AI 正在分析财报发布后的市场反应"}
                    </p>
                  </div>
                </div>
                {/* Progress indicator */}
                <div className="mt-4 flex gap-2">
                  <div
                    className={`h-1 flex-1 rounded-full transition-all ${
                      phase === "loading-earnings"
                        ? "animate-pulse bg-blue-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  <div
                    className={`h-1 flex-1 rounded-full transition-all ${
                      phase === "loading-move"
                        ? "animate-pulse bg-blue-400"
                        : "bg-gray-200"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Earnings Report ── */}
          {earningsData && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-lock h-4 w-0.5 rounded-full" />
                <h2 className="font-serif text-sm font-semibold tracking-wide uppercase">
                  Earnings Deep Dive
                </h2>
                <div className="bg-line h-px flex-1" />
                <span className="text-ink-2 font-mono text-[10px]">
                  {earningsData.earningsSnapshot?.quarter}
                </span>
              </div>
              <EarningsReport
                data={earningsData}
                ticker={ticker.trim().toUpperCase()}
              />
            </section>
          )}

          {/* ── Post-Earnings Move ── */}
          {moveData && (
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-4 w-0.5 rounded-full bg-red-500" />
                <h2 className="font-serif text-sm font-semibold tracking-wide uppercase">
                  股价异动分析
                </h2>
                <div className="bg-line h-px flex-1" />
                <ArrowRight className="text-ink-2 h-3 w-3" />
              </div>
              <PostEarningsMove
                data={moveData}
                ticker={ticker.trim().toUpperCase()}
              />
            </section>
          )}

          {/* ── Empty State ── */}
          {phase === "input" && !earningsData && !moveData && (
            <div className="border-line bg-panel/50 rounded-xl border p-12 text-center">
              <div className="bg-lock/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <Sparkles className="text-lock h-5 w-5" />
              </div>
              <p className="font-serif text-base font-medium">
                输入股票代码开始分析
              </p>
              <p className="text-ink-2 mt-2 text-sm">
                AI
                将自动拉取最新财报，进行营收、利润率、管理层口径等多维度拆解，
                <br />
                并分析财报发布后的股价异动原因
              </p>
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-line border-t">
          <div className="text-ink-2 mx-auto flex w-full max-w-5xl px-4 py-6 text-xs">
            <p>Decision-support analysis only. Not investment advice.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
