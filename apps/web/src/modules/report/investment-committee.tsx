"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  CircleDot,
  ExternalLink,
  Gauge,
  LineChart,
  RefreshCcw,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Separator } from "@workspace/ui-web/separator";
import { Skeleton } from "@workspace/ui-web/skeleton";

import {
  useFinancials,
  useValidateTicker,
} from "~/modules/report/finance/use-report";

import type { FinancialMetrics } from "@workspace/shared/types/report";
import type { ElementType } from "react";

type ClaimKind = "Fact" | "Inference" | "View";
type LensStance = "Positive" | "Neutral" | "Negative";
type LensId = "value" | "growth" | "macro" | "trend" | "quant" | "skeptic";

type CommitteeLens = {
  id: LensId;
  label: string;
  stance: LensStance;
  confidence: number;
  summary: string;
  observations: Array<{
    text: string;
    kind: ClaimKind;
    sourceIds: string[];
  }>;
  numericConclusion?: string;
  howToReadThisNumber?: string;
  whatChangesTheView: string;
};

type CommitteeReport = {
  verdict: "Investigate" | "Watch" | "Avoid";
  stance: "Bullish" | "Mixed" | "Bearish";
  confidence: number;
  dataAsOf: string;
  oneLineDecision: string;
  keyQuestion: string;
  topJudgments?: Array<{
    numeral: "I" | "II" | "III";
    judgment: string;
    keyNumber: string;
    evidence: string;
    wrongIf: string;
    sourceIds: string[];
  }>;
  bullCase: string[];
  bearCase: string[];
  lenses: CommitteeLens[];
  consensus: string[];
  divergences: Array<{
    topic: string;
    supportingLenses: string[];
    opposingLenses: string[];
    why: string;
  }>;
  thesisBreakers: Array<{
    condition: string;
    metric: string;
    threshold: string;
    sourceIds: string[];
  }>;
  monitorPanel?: {
    schema_version: 1;
    monitors: Array<{
      metric: string;
      current: string;
      trigger: string;
      tolerance?: string;
      freq: "Daily" | "Weekly" | "Quarterly" | "Event-driven";
      source: string;
      sourceIds: string[];
    }>;
  };
  convictionTier?: {
    tier: "S" | "A" | "B" | "C" | "D" | "F";
    definition: string;
    why: string;
  };
  investorFit: Array<{
    profile: string;
    fit: "Good" | "Conditional" | "Poor";
    reason: string;
  }>;
  evidence: Array<{
    id: string;
    title: string;
    publisher: string;
    date: string;
    url: string;
    supports: string;
    quality: "Primary" | "Secondary" | "Archive";
  }>;
  limitations: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const lensMeta: Record<
  LensId,
  { label: string; short: string; icon: ElementType; color: string }
> = {
  value: {
    label: "Value",
    short: "Moat & margin of safety",
    icon: Scale,
    color: "#2563eb",
  },
  growth: {
    label: "Growth",
    short: "Runway & unit economics",
    icon: TrendingUp,
    color: "#059669",
  },
  macro: {
    label: "Macro",
    short: "Cycle & liquidity",
    icon: Gauge,
    color: "#b45309",
  },
  trend: {
    label: "Trend",
    short: "Price & risk control",
    icon: LineChart,
    color: "#7c3aed",
  },
  quant: {
    label: "Quant",
    short: "Evidence & stability",
    icon: BarChart3,
    color: "#0891b2",
  },
  skeptic: {
    label: "Skeptic",
    short: "Countercase & falsifiers",
    icon: ShieldAlert,
    color: "#dc2626",
  },
};

const orderedLensIds = Object.keys(lensMeta) as LensId[];

function parseCommitteeJson(text: string): CommitteeReport {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start)
    throw new Error("The committee response was incomplete.");
  return JSON.parse(clean.slice(start, end + 1)) as CommitteeReport;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function formatMarketCap(value: number) {
  if (!value) return "N/A";
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  return `$${(value / 1e6).toFixed(0)}M`;
}

function getSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function stanceClasses(stance: LensStance | CommitteeReport["stance"]) {
  if (stance === "Positive" || stance === "Bullish") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (stance === "Negative" || stance === "Bearish") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
}

function kindClasses(kind: ClaimKind) {
  if (kind === "Fact")
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  if (kind === "Inference")
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function CommitteeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {orderedLensIds.map((id) => (
          <Skeleton key={id} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

function SourceLink({ id, report }: { id: string; report: CommitteeReport }) {
  const source = report.evidence.find((item) => item.id === id);
  const sourceUrl = source?.url ? getSafeHttpUrl(source.url) : null;
  if (!sourceUrl) {
    return <span className="font-mono text-[10px] text-slate-500">{id}</span>;
  }
  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 font-mono text-[10px] text-blue-600 hover:underline dark:text-blue-400"
    >
      {id} <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

export function InvestmentCommittee() {
  const [query, setQuery] = useState("");
  const [ticker, setTicker] = useState<string | null>(null);
  const [report, setReport] = useState<CommitteeReport | null>(null);
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "streaming" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<LensId>("value");
  const abortRef = useRef<AbortController | null>(null);
  const generatedTickerRef = useRef<string | null>(null);

  const validate = useValidateTicker();
  const financials = useFinancials(ticker);

  const generate = useCallback(
    async (symbol: string, metrics: FinancialMetrics) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setReport(null);
      setRawText("");
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/report/committee/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: symbol, metrics }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const body = await response.text().catch(() => "");
          let message = body || `API error ${response.status}`;
          try {
            const parsed = JSON.parse(body) as { message?: string };
            message = parsed.message ?? message;
          } catch {}
          throw new Error(message);
        }

        setStatus("streaming");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setRawText(accumulated);
        }

        const parsed = parseCommitteeJson(accumulated);
        setReport(parsed);
        setActiveLens(parsed.lenses[0]?.id ?? "value");
        setStatus("done");
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError(
          caught instanceof Error ? caught.message : "Committee review failed.",
        );
        setStatus("error");
      }
    },
    [],
  );

  useEffect(() => {
    if (!ticker || !financials.data || generatedTickerRef.current === ticker)
      return;
    generatedTickerRef.current = ticker;
    void generate(ticker, financials.data);
  }, [financials.data, generate, ticker]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function submit() {
    const symbol = query.trim().toUpperCase();
    if (!symbol || status === "loading" || status === "streaming") return;

    const validation = await validate
      .mutateAsync(symbol)
      .catch(() => ({ valid: false }));
    if (!validation.valid) {
      toast.error(`Ticker "${symbol}" was not found.`);
      return;
    }

    if (ticker === symbol && financials.data) {
      generatedTickerRef.current = symbol;
      void generate(symbol, financials.data);
      return;
    }

    generatedTickerRef.current = null;
    setTicker(symbol);
    setReport(null);
    setError(null);
  }

  const selectedLens = useMemo(
    () => report?.lenses.find((lens) => lens.id === activeLens) ?? null,
    [activeLens, report],
  );
  const isBusy =
    status === "loading" || status === "streaming" || financials.isLoading;

  return (
    <div className="bg-background flex h-full min-h-[calc(100vh-56px)] flex-col">
      <div className="bg-background border-b px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3 md:w-64">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Scale className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">
                Investment Committee
              </h1>
              <p className="text-muted-foreground text-xs">
                Six-lens evidence review
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                onKeyDown={(event) => event.key === "Enter" && void submit()}
                placeholder="Ticker symbol"
                maxLength={10}
                className="h-10 pl-9 font-mono uppercase placeholder:font-sans placeholder:normal-case"
              />
            </div>
            <Button
              className="h-10 gap-2"
              disabled={!query.trim() || isBusy || validate.isPending}
              onClick={() => void submit()}
            >
              <Sparkles className="h-4 w-4" />
              Review
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-6xl space-y-7">
          {!ticker && status === "idle" && (
            <div className="py-8">
              <div className="bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-3">
                {orderedLensIds.map((id) => {
                  const meta = lensMeta[id];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={id}
                      className="bg-background flex min-h-28 items-start gap-3 p-5"
                    >
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: meta.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          {meta.short}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isBusy && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="h-4 w-4 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Committee in session</p>
                    <p className="text-xs opacity-70">
                      {status === "streaming"
                        ? "Reconciling evidence and disagreements"
                        : "Loading market data and source material"}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-[11px] opacity-70">
                  {rawText.length.toLocaleString()} chars
                </span>
              </div>
              <CommitteeSkeleton />
            </div>
          )}

          {(financials.isError || status === "error") && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Review unavailable</p>
                  <p className="mt-1 text-xs opacity-75">
                    {financials.error?.message ?? error ?? "Please try again."}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  financials.data &&
                  ticker &&
                  void generate(ticker, financials.data)
                }
              >
                <RefreshCcw className="h-3.5 w-3.5" /> Retry
              </Button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {report && financials.data && status === "done" && (
              <motion.div
                key={`${ticker}-${report.dataAsOf}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <section className="grid gap-6 border-b pb-7 lg:grid-cols-[1.4fr_0.8fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stanceClasses(report.stance)}`}
                      >
                        {report.stance}
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {financials.data.exchange} · {ticker}
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        Data {report.dataAsOf}
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold tracking-normal sm:text-3xl">
                      {financials.data.companyName}
                    </h2>
                    <p className="text-foreground/80 mt-3 max-w-3xl text-base leading-relaxed">
                      {report.oneLineDecision}
                    </p>
                    <div className="mt-5 flex items-start gap-2 border-l-2 border-slate-300 pl-3 dark:border-slate-700">
                      <Target className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-sm leading-relaxed">
                        <span className="font-medium">Key question:</span>{" "}
                        {report.keyQuestion}
                      </p>
                    </div>
                  </div>
                  <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
                    <div className="bg-background p-4">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                        Verdict
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {report.verdict}
                      </p>
                    </div>
                    <div className="bg-background p-4">
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                        Confidence
                      </p>
                      <p className="mt-2 font-mono text-xl font-semibold">
                        {clampPercent(report.confidence)}%
                      </p>
                    </div>
                    <div className="bg-background col-span-2 p-4">
                      <div className="text-muted-foreground flex items-center justify-between text-xs">
                        <span>Committee confidence</span>
                        <span>{clampPercent(report.confidence)}/100</span>
                      </div>
                      <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-slate-900 dark:bg-slate-100"
                          style={{
                            width: `${clampPercent(report.confidence)}%`,
                          }}
                        />
                      </div>
                      <div className="text-muted-foreground mt-3 flex justify-between font-mono text-[11px]">
                        <span>${financials.data.currentPrice.toFixed(2)}</span>
                        <span>
                          {formatMarketCap(financials.data.marketCap)}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {report.topJudgments && report.topJudgments.length > 0 && (
                  <section>
                    <div className="mb-3">
                      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                        Three falsifiable judgments
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        Every claim has a number
                      </h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {report.topJudgments.slice(0, 3).map((item) => (
                        <div
                          key={item.numeral}
                          className="rounded-lg border p-4"
                        >
                          <p className="text-muted-foreground font-serif text-2xl">
                            {item.numeral}
                          </p>
                          <p className="mt-3 font-mono text-xl font-semibold">
                            {item.keyNumber}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed">
                            {item.judgment}
                          </p>
                          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                            Wrong if: {item.wrongIf}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.sourceIds.map((id) => (
                              <SourceLink key={id} id={id} report={report} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                        Committee table
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        Six-lens review
                      </h3>
                    </div>
                    <span className="text-muted-foreground hidden text-xs sm:block">
                      Select a lens to inspect its evidence
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
                    {orderedLensIds.map((id) => {
                      const meta = lensMeta[id];
                      const lens = report.lenses.find((item) => item.id === id);
                      const Icon = meta.icon;
                      const active = activeLens === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setActiveLens(id)}
                          className={`min-h-24 rounded-lg border p-3 text-left transition ${active ? "border-foreground bg-muted/60 shadow-sm" : "hover:bg-muted/40"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Icon
                              className="h-4 w-4"
                              style={{ color: meta.color }}
                            />
                            <span className="text-muted-foreground font-mono text-[10px]">
                              {lens?.confidence ?? 0}%
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-medium">
                            {meta.label}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${lens?.stance === "Positive" ? "text-emerald-600" : lens?.stance === "Negative" ? "text-rose-600" : "text-amber-600"}`}
                          >
                            {lens?.stance ?? "Pending"}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {selectedLens && (
                    <motion.div
                      key={selectedLens.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 rounded-lg border p-5"
                    >
                      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-3xl">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {selectedLens.label} conclusion
                            </h4>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${stanceClasses(selectedLens.stance)}`}
                            >
                              {selectedLens.stance}
                            </span>
                          </div>
                          <p className="text-foreground/80 mt-2 text-sm leading-relaxed">
                            {selectedLens.summary}
                          </p>
                        </div>
                        <div className="bg-muted shrink-0 rounded-md px-3 py-2 text-right">
                          <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                            Lens confidence
                          </p>
                          <p className="font-mono text-lg font-semibold">
                            {clampPercent(selectedLens.confidence)}%
                          </p>
                        </div>
                      </div>
                      <div className="divide-y">
                        {selectedLens.observations.map((observation, index) => (
                          <div
                            key={`${observation.text}-${index}`}
                            className="grid gap-2 py-3 md:grid-cols-[84px_1fr_auto] md:items-start"
                          >
                            <span
                              className={`w-fit rounded px-2 py-1 text-[10px] font-semibold ${kindClasses(observation.kind)}`}
                            >
                              {observation.kind}
                            </span>
                            <p className="text-sm leading-relaxed">
                              {observation.text}
                            </p>
                            <div className="flex gap-1.5">
                              {observation.sourceIds.map((id) => (
                                <SourceLink key={id} id={id} report={report} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {(selectedLens.numericConclusion ||
                        selectedLens.howToReadThisNumber) && (
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {selectedLens.numericConclusion && (
                            <div className="rounded-md border bg-slate-50 p-3 dark:bg-slate-900/60">
                              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                                Lens number
                              </p>
                              <p className="mt-1 text-xs leading-relaxed">
                                {selectedLens.numericConclusion}
                              </p>
                            </div>
                          )}
                          {selectedLens.howToReadThisNumber && (
                            <div className="rounded-md border bg-blue-50 p-3 dark:bg-blue-950/20">
                              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                                How to read this number
                              </p>
                              <p className="mt-1 text-xs leading-relaxed">
                                {selectedLens.howToReadThisNumber}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex gap-2 rounded-md bg-slate-50 p-3 dark:bg-slate-900/60">
                        <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        <p className="text-xs leading-relaxed">
                          <span className="font-medium">
                            What changes this view:
                          </span>{" "}
                          {selectedLens.whatChangesTheView}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </section>

                <section className="bg-border grid gap-px overflow-hidden rounded-lg border md:grid-cols-2">
                  <div className="bg-background p-5">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <ArrowUpRight className="h-4 w-4" />
                      <h3 className="font-semibold">Bull case</h3>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {report.bullCase.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-background p-5">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                      <ArrowDownRight className="h-4 w-4" />
                      <h3 className="font-semibold">Bear case</h3>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {report.bearCase.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm leading-relaxed"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                      Consensus & disagreement
                    </p>
                    <div className="mt-4 space-y-3">
                      {report.consensus.map((item) => (
                        <div
                          key={item}
                          className="flex gap-2 border-b pb-3 text-sm leading-relaxed"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          {item}
                        </div>
                      ))}
                      {report.divergences.map((item) => (
                        <div key={item.topic} className="rounded-lg border p-4">
                          <p className="text-sm font-semibold">{item.topic}</p>
                          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                            {item.why}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                            <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              Supports: {item.supportingLenses.join(", ")}
                            </span>
                            <span className="rounded bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                              Opposes: {item.opposingLenses.join(", ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                      Thesis breakers
                    </p>
                    <div className="mt-4 overflow-hidden rounded-lg border">
                      {report.thesisBreakers.map((item, index) => (
                        <div
                          key={item.condition}
                          className={`grid gap-2 p-4 md:grid-cols-[1fr_150px] ${index ? "border-t" : ""}`}
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {item.condition}
                            </p>
                            <div className="mt-2 flex gap-1.5">
                              {item.sourceIds.map((id) => (
                                <SourceLink key={id} id={id} report={report} />
                              ))}
                            </div>
                          </div>
                          <div className="md:text-right">
                            <p className="font-mono text-xs font-semibold">
                              {item.threshold}
                            </p>
                            <p className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">
                              {item.metric}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {(report.monitorPanel?.monitors.length ||
                  report.convictionTier) && (
                  <section className="grid gap-4 lg:grid-cols-[1fr_260px]">
                    {report.monitorPanel &&
                      report.monitorPanel.monitors.length > 0 && (
                        <div>
                          <div className="mb-3">
                            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                              Monitor panel
                            </p>
                            <h3 className="mt-1 text-lg font-semibold">
                              Thesis checks for morning brief
                            </h3>
                          </div>
                          <div className="overflow-hidden rounded-lg border">
                            {report.monitorPanel.monitors
                              .slice(0, 6)
                              .map((item, index) => (
                                <div
                                  key={`${item.metric}-${index}`}
                                  className={`grid gap-3 p-4 md:grid-cols-[1fr_120px_120px_auto] md:items-center ${index ? "border-t" : ""}`}
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {item.metric}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      {item.source} · {item.freq}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                                      Current
                                    </p>
                                    <p className="font-mono text-xs">
                                      {item.current}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                                      Trigger
                                    </p>
                                    <p className="font-mono text-xs">
                                      {item.trigger}
                                    </p>
                                  </div>
                                  <Button variant="outline" size="sm">
                                    Add monitor
                                  </Button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    {report.convictionTier && (
                      <div className="h-fit rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                          Thesis quality
                        </p>
                        <p className="mt-3 font-mono text-4xl font-semibold">
                          {report.convictionTier.tier}
                        </p>
                        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                          {report.convictionTier.definition}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed">
                          {report.convictionTier.why}
                        </p>
                      </div>
                    )}
                  </section>
                )}

                <Separator />

                <section className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
                  <div>
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4" />
                      <h3 className="font-semibold">Investor fit</h3>
                    </div>
                    <div className="mt-4 divide-y rounded-lg border">
                      {report.investorFit.map((item) => (
                        <div key={item.profile} className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">
                              {item.profile}
                            </p>
                            <span className="bg-muted rounded-full px-2 py-1 text-[10px] font-semibold">
                              {item.fit}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                            {item.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <h3 className="font-semibold">Evidence ledger</h3>
                    </div>
                    <div className="mt-4 divide-y rounded-lg border">
                      {report.evidence.map((source) => {
                        const sourceUrl = getSafeHttpUrl(source.url);
                        return (
                          <div
                            key={source.id}
                            className="grid gap-3 p-4 sm:grid-cols-[40px_1fr_auto] sm:items-start"
                          >
                            <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {source.id}
                            </span>
                            <div>
                              <p className="text-sm font-medium">
                                {source.title}
                              </p>
                              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                {source.supports}
                              </p>
                              <p className="text-muted-foreground mt-2 font-mono text-[10px]">
                                {source.publisher} · {source.date} ·{" "}
                                {source.quality}
                              </p>
                            </div>
                            {sourceUrl ? (
                              <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                Source <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">
                                Local archive
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="flex gap-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                    <div>
                      <p className="text-sm font-medium">
                        Limits of this review
                      </p>
                      <ul className="text-muted-foreground mt-2 space-y-1 text-xs leading-relaxed">
                        {report.limitations.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                        For informational purposes only. Not investment advice.
                      </p>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
