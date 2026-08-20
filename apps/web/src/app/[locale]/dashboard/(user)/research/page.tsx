"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  FileSearch,
  FileText,
  Globe,
  ListChecks,
  Loader2,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { parseIndustryBrief } from "@workspace/shared/industry-brief";
import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Separator } from "@workspace/ui-web/separator";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { ArticleReport } from "~/components/article/ArticleReport";
import { JPMReport } from "~/components/report/JPMReport";
import { SaveNoteButton } from "~/modules/notes/save-note-button";
import {
  FCFChart,
  MarginChart,
  RevenueChart,
} from "~/modules/report/finance/charts";
import { IndustryBriefView } from "~/modules/report/finance/industry-brief-view";
import { IndustryView } from "~/modules/report/finance/industry-view";
import { MetricsGrid } from "~/modules/report/finance/metric-cards";
import { useArticle } from "~/modules/report/finance/use-article";
import {
  useIndustryAnalyze,
  isLikelyTicker,
} from "~/modules/report/finance/use-industry";
import {
  useFinancials,
  useReportStream,
  useValidateTicker,
} from "~/modules/report/finance/use-report";
import {
  AnalysisNotice,
  getFriendlyAnalysisError,
} from "~/modules/research/analysis-notice";
import { DecisionBrief } from "~/modules/research/decision-brief";
import { FilingAnalysisResult } from "~/modules/research/filing-analysis-result";
import { FilingCandidates } from "~/modules/research/filing-candidates";
import { ReportSkeleton } from "~/modules/research/report-skeleton";
import { ScenarioMatrix } from "~/modules/research/scenario-matrix";
import { Section } from "~/modules/research/section";
import { WorkBuddyGrid } from "~/modules/research/work-buddy-grid";

import type { ChangeEvent, ElementType, KeyboardEvent } from "react";
import type { IndustryAnalyzeResult } from "~/modules/report/finance/use-industry";
import type { ResearchMode } from "~/modules/report/finance/use-report";
import type {
  FilingAnalysis,
  FilingCandidate,
  FilingSearchResponse,
  FilingStatus,
} from "~/modules/research/research-utils";

const analysisModes: Array<{
  id: ResearchMode;
  label: string;
  description: string;
  icon: ElementType;
}> = [
  {
    id: "snapshot",
    label: "Snapshot",
    description: "Decide whether it deserves deeper work",
    icon: Sparkles,
  },
  {
    id: "earnings",
    label: "Earnings",
    description: "Growth, margins, and cash flow review",
    icon: BarChart3,
  },
  {
    id: "competition",
    label: "Competition",
    description: "Moat, substitution risk, and pricing power",
    icon: BriefcaseBusiness,
  },
  {
    id: "risk",
    label: "Risk Scan",
    description: "Valuation, debt, and narrative risk",
    icon: Shield,
  },
  {
    id: "poc",
    label: "Tracking Plan",
    description: "30-90 day validation metrics",
    icon: ListChecks,
  },
  {
    id: "filings",
    label: "Filings",
    description: "Official filings with page anchors",
    icon: FileSearch,
  },
  {
    id: "article",
    label: "Article",
    description: "中文深度研报文章，带产业链图和证据矩阵",
    icon: FileText,
  },
];

export default function ResearchPage() {
  const [mounted, setMounted] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ResearchMode>("snapshot");
  const [language] = useState<"zh" | "en">("zh");
  const [industryResult, setIndustryResult] =
    useState<IndustryAnalyzeResult | null>(null);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("idle");
  const [filingCandidates, setFilingCandidates] = useState<FilingCandidate[]>(
    [],
  );
  const [selectedFiling, setSelectedFiling] = useState<FilingCandidate | null>(
    null,
  );
  const [filingAnalysis, setFilingAnalysis] = useState<FilingAnalysis | null>(
    null,
  );
  const [filingError, setFilingError] = useState<string | null>(null);

  const validate = useValidateTicker();
  const financials = useFinancials(activeTicker);
  const { status, rawText, report, error, generate, reset } = useReportStream();
  const industryAnalyze = useIndustryAnalyze();
  const article = useArticle();

  const inputRef = useRef<HTMLInputElement>(null);
  const filingAbortRef = useRef<AbortController | null>(null);

  useEffect(() => setMounted(true), []);

  function resetFilings() {
    filingAbortRef.current?.abort();
    setFilingStatus("idle");
    setFilingCandidates([]);
    setSelectedFiling(null);
    setFilingAnalysis(null);
    setFilingError(null);
  }

  async function handleFilingSearch(query: string) {
    filingAbortRef.current?.abort();
    const ctrl = new AbortController();
    filingAbortRef.current = ctrl;

    setActiveTicker(null);
    setIndustryResult(null);
    reset();
    setFilingStatus("searching");
    setFilingCandidates([]);
    setSelectedFiling(null);
    setFilingAnalysis(null);
    setFilingError(null);

    try {
      const params = new URLSearchParams({
        query,
        forms: "10-K,10-Q,20-F,6-K",
        limit: "8",
      });
      const response = await fetch(`/api/report/filings/search?${params}`, {
        signal: ctrl.signal,
      });
      const result = (await response.json()) as FilingSearchResponse;

      if (!result.ok) {
        setFilingStatus("error");
        setFilingError(result.message);
        return;
      }

      setFilingCandidates(result.candidates);
      setSelectedFiling(result.candidates[0] ?? null);
      setFilingStatus("candidates");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFilingStatus("error");
      setFilingError(
        err instanceof Error ? err.message : "Filing search failed.",
      );
    }
  }

  async function handleFilingAnalyze(candidate = selectedFiling) {
    if (!candidate) return;

    filingAbortRef.current?.abort();
    const ctrl = new AbortController();
    filingAbortRef.current = ctrl;

    setSelectedFiling(candidate);
    setFilingStatus("analyzing");
    setFilingAnalysis(null);
    setFilingError(null);

    try {
      const response = await fetch("/api/report/filing/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: inputVal.trim().toUpperCase(),
          filingUrl: candidate.url,
          language,
        }),
        signal: ctrl.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        let message = text || `Filing analysis failed (${response.status}).`;

        try {
          const json = JSON.parse(text) as {
            message?: string;
            detail?: string;
          };
          message = json.message ?? json.detail ?? message;
        } catch {}

        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      const parsed = JSON.parse(accumulated) as FilingAnalysis;
      setFilingAnalysis(parsed);
      setFilingStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFilingStatus("error");
      setFilingError(
        err instanceof Error ? err.message : "Filing analysis failed.",
      );
    }
  }

  async function handleSearch() {
    const query = inputVal.trim();
    if (!query) return;

    if (activeMode === "filings") {
      await handleFilingSearch(query);
      return;
    }

    if (activeMode === "article") {
      await article.generate(query, "zh");
      return;
    }

    resetFilings();

    if (isLikelyTicker(query)) {
      const ticker = query.toUpperCase();
      setIndustryResult(null);

      const result = await validate.mutateAsync(ticker).catch(() => ({
        valid: false,
      }));
      if (!result.valid) {
        toast.error(
          `Ticker "${ticker}" was not found. Please check and try again.`,
        );
        return;
      }

      reset();
      setActiveTicker(ticker);
    } else {
      setActiveTicker(null);
      reset();
      setIndustryResult(null);

      try {
        const result = await industryAnalyze.mutateAsync(query);
        setIndustryResult(result);

        if (!result.ok) {
          toast.error(
            result.message ?? "Industry analysis returned no results.",
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Industry analysis failed.",
        );
      }
    }
  }

  // Once financials load, auto-trigger AI generation
  const prevTickerRef = useRef<string | null>(null);
  if (
    financials.data &&
    activeTicker &&
    activeMode !== "filings" &&
    prevTickerRef.current !== activeTicker &&
    status === "idle"
  ) {
    prevTickerRef.current = activeTicker;
    void generate(activeTicker, financials.data, language, activeMode);
  }

  const isLoading = financials.isLoading || status === "loading";
  const isStreaming = status === "streaming";
  const isDone = status === "done" && report;
  const isIndustryLoading = industryAnalyze.isPending;
  const isFilingMode = activeMode === "filings";
  const isFilingBusy =
    filingStatus === "searching" || filingStatus === "analyzing";
  const hasIndustryResult =
    industryResult?.ok &&
    industryResult.universe &&
    industryResult.constituents;
  const financialError = financials.isError
    ? financials.error?.message
    : undefined;
  const analysisError =
    !financials.isError && status === "error" ? error : undefined;

  if (!mounted) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-border border-b px-4 py-4">
          <div className="mx-auto w-full max-w-5xl">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex-1 px-4 py-5">
          <div className="mx-auto w-full max-w-5xl">
            <ReportSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Search bar ── */}
      <div className="border-border border-b px-4 py-4">
        <div className="mx-auto w-full max-w-5xl space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <Input
                ref={inputRef}
                value={inputVal}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setInputVal(e.target.value)
                }
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleSearch()
                }
                placeholder="Ticker (TSLA, AAPL) or theme (AI, semiconductors)"
                className="pl-9 font-mono text-sm uppercase placeholder:font-sans placeholder:normal-case"
                maxLength={40}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={
                !inputVal.trim() ||
                isLoading ||
                isStreaming ||
                isIndustryLoading ||
                isFilingBusy ||
                validate.isPending
              }
              size="sm"
              className="shrink-0 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            {analysisModes.map((mode) => {
              const Icon = mode.icon;
              const selected = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setActiveMode(mode.id);
                    if (mode.id === "filings") {
                      setActiveTicker(null);
                      setIndustryResult(null);
                      reset();
                      article.reset();
                      resetFilings();
                      return;
                    }
                    if (mode.id === "article") {
                      setActiveTicker(null);
                      setIndustryResult(null);
                      reset();
                      resetFilings();
                      // Article mode triggers on search
                      return;
                    }
                    if (
                      financials.data &&
                      activeTicker &&
                      status !== "loading"
                    ) {
                      article.reset();
                      reset();
                      void generate(
                        activeTicker,
                        financials.data,
                        language,
                        mode.id,
                      );
                    }
                    article.reset();
                    resetFilings();
                  }}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        selected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-xs font-semibold">{mode.label}</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-snug">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <AnimatePresence mode="wait">
            {/* Empty state — mode-aware */}
            {!activeTicker &&
              !hasIndustryResult &&
              !isIndustryLoading &&
              filingStatus === "idle" &&
              article.status === "idle" && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                >
                  <div className="bg-muted rounded-full p-4">
                    <FileText className="text-muted-foreground h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-foreground text-sm font-medium">
                      {activeMode === "article" ? "研报文章" : "Snapshot"}
                    </p>
                    <p className="text-muted-foreground max-w-[280px] text-xs leading-relaxed">
                      {activeMode === "article"
                        ? "输入 ticker 或产业关键词，生成带产业链图和证据矩阵的中文研报文章。"
                        : "Enter a ticker symbol or a theme (e.g. AI, semiconductors) to get started."}
                    </p>
                  </div>
                </motion.div>
              )}

            {isFilingMode && filingStatus === "searching" && (
              <motion.div
                key="filing-searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Loader2 className="text-primary h-4 w-4 animate-spin" />
                    <p className="text-sm font-medium">
                      Searching official filings...
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                  </div>
                </div>
              </motion.div>
            )}

            {isFilingMode &&
              (filingStatus === "candidates" ||
                filingStatus === "analyzing" ||
                filingStatus === "done") &&
              filingCandidates.length > 0 && (
                <motion.div
                  key="filing-flow"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="notranslate space-y-6"
                  translate="no"
                >
                  <div>
                    <p className="text-muted-foreground mb-0.5 font-mono text-[10px] tracking-widest uppercase">
                      SEC EDGAR only
                    </p>
                    <h2 className="text-foreground text-lg leading-tight font-semibold">
                      Primary-source filing analysis
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      Select one official filing before analysis. Numbers are
                      shown only when the model returns a page anchor.
                    </p>
                  </div>
                  <FilingCandidates
                    candidates={filingCandidates}
                    selectedUrl={selectedFiling?.url ?? null}
                    onSelect={setSelectedFiling}
                    onAnalyze={() => void handleFilingAnalyze()}
                    isAnalyzing={filingStatus === "analyzing"}
                  />

                  {filingStatus === "analyzing" && (
                    <div className="rounded-xl border p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Loader2 className="text-primary h-4 w-4 animate-spin" />
                        <p className="text-sm font-medium">
                          Reading filing pages and checking anchors...
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                      </div>
                    </div>
                  )}

                  {filingStatus === "done" &&
                    filingAnalysis &&
                    selectedFiling && (
                      <FilingAnalysisResult
                        analysis={filingAnalysis}
                        filingUrl={selectedFiling.url}
                      />
                    )}
                </motion.div>
              )}

            {/* Article mode result */}
            {activeMode === "article" && article.status === "loading" && (
              <motion.div
                key="article-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-16 text-center"
              >
                <div className="bg-muted rounded-full p-4">
                  <FileText className="text-primary h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium">
                    正在生成研报文章...
                  </p>
                  <p className="text-muted-foreground max-w-[280px] text-xs leading-relaxed">
                    解析实体、获取数据、构建产业链图和证据矩阵
                  </p>
                </div>
              </motion.div>
            )}

            {activeMode === "article" &&
              article.status === "done" &&
              article.article && (
                <motion.div
                  key="article-done"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-4 flex justify-end">
                    <SaveNoteButton
                      article={article.article}
                      query={inputVal.trim()}
                      language={language}
                    />
                  </div>
                  <ArticleReport article={article.article} />
                </motion.div>
              )}

            {activeMode === "article" && article.status === "error" && (
              <motion.div
                key="article-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">研报生成失败</p>
                  <p className="text-xs leading-relaxed opacity-80">
                    {article.error ?? "请重试"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
                      onClick={() => {
                        article.reset();
                        const query = inputVal.trim();
                        if (query) void article.generate(query, "zh");
                      }}
                    >
                      <RotateCcw className="h-3 w-3" /> 重新生成
                    </Button>
                    {article.article && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => {
                          /* Show degraded article anyway */
                        }}
                      >
                        查看降级版本
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {isFilingMode && filingStatus === "error" && filingError && (
              <motion.div
                key="filing-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="notranslate flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                translate="no"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">No filing analysis</p>
                  <p className="text-xs leading-relaxed opacity-80">
                    <span className="notranslate" translate="no">
                      {filingError}
                    </span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
                    onClick={() => {
                      const query = inputVal.trim();
                      if (query) void handleFilingSearch(query);
                    }}
                  >
                    <RotateCcw className="h-3 w-3" /> Retry search
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Industry loading */}
            {isIndustryLoading && (
              <motion.div
                key="industry-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-16 text-center"
              >
                <div className="bg-muted rounded-full p-4">
                  <Globe className="text-primary h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium">
                    Analyzing theme...
                  </p>
                  <p className="text-muted-foreground max-w-[200px] text-xs leading-relaxed">
                    Resolving ETFs, fetching holdings, and building constituent
                    universe.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Industry result */}
            {hasIndustryResult && (
              <motion.div
                key="industry"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="notranslate space-y-4"
                translate="no"
              >
                <div>
                  <p className="text-muted-foreground mb-0.5 font-mono text-[10px] tracking-widest uppercase">
                    Industry Mode
                  </p>
                  <h2 className="text-foreground text-lg leading-tight font-semibold">
                    {industryResult.universe!.query}
                  </h2>
                </div>
                <Separator />
                <IndustryView
                  universe={industryResult.universe!}
                  constituents={industryResult.constituents!}
                />
                {(() => {
                  if (!industryResult.brief) return null;
                  const parsed = parseIndustryBrief(industryResult.brief);
                  if (!parsed.ok) return null;
                  return (
                    <>
                      <Separator />
                      <IndustryBriefView brief={parsed.data} />
                    </>
                  );
                })()}
              </motion.div>
            )}

            {/* Loading skeleton */}
            {!isFilingMode &&
              (isLoading || (activeTicker && financials.isLoading)) && (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ReportSkeleton />
                </motion.div>
              )}

            {/* Blocking data error */}
            {!isFilingMode && financialError && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-destructive/30 bg-destructive/5 flex gap-3 rounded-lg border px-4 py-4"
              >
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="text-destructive text-sm font-medium">
                    Loading failed
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {financialError ?? "Please try again later."}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 gap-1 px-2 text-xs"
                    onClick={() => {
                      reset();
                      setActiveTicker(null);
                      setInputVal("");
                    }}
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Report content */}
            {!isFilingMode && financials.data && !financials.isLoading && (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="notranslate space-y-6"
                translate="no"
              >
                {/* Header */}
                <div>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-muted-foreground mb-0.5 font-mono text-[10px] tracking-widest uppercase">
                        {financials.data.exchange} · {financials.data.ticker}
                      </p>
                      <h2 className="text-foreground text-lg leading-tight font-semibold">
                        {financials.data.companyName}
                      </h2>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {financials.data.sector} · {financials.data.industry}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {analysisError && (
                  <AnalysisNotice
                    message={getFriendlyAnalysisError(analysisError)}
                    onRetry={() => {
                      reset();
                      void generate(
                        activeTicker ?? financials.data.ticker,
                        financials.data,
                        language,
                        activeMode,
                      );
                    }}
                  />
                )}

                {/* Metrics grid */}
                <Section label="Key Metrics" icon={BarChart3}>
                  <MetricsGrid m={financials.data} />
                </Section>

                {/* Revenue chart — hide when all values are null (data unavailable) */}
                {financials.data.revenueHistory.length > 0 &&
                  financials.data.revenueHistory.some(
                    (p) => p.value != null,
                  ) && <RevenueChart data={financials.data.revenueHistory} />}

                {/* Margin chart */}
                {financials.data.grossMarginHistory.length > 0 &&
                  financials.data.grossMarginHistory.some(
                    (p) => p.value != null,
                  ) && (
                    <MarginChart
                      grossMargin={financials.data.grossMarginHistory}
                      operatingMargin={financials.data.operatingMarginHistory}
                    />
                  )}

                {/* FCF chart */}
                {financials.data.fcfHistory.length > 0 &&
                  financials.data.fcfHistory.some((p) => p.value != null) && (
                    <FCFChart data={financials.data.fcfHistory} />
                  )}

                <Separator />

                {/* AI Analysis — JPM Markdown mode (Kimi output) */}
                {isStreaming && rawText.length > 0 && (
                  <motion.div
                    key="jpm-streaming"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <JPMReport
                      content={rawText}
                      ticker={activeTicker ?? undefined}
                      companyName={financials.data.companyName}
                    />
                  </motion.div>
                )}

                {/* JPM Markdown mode — done (Kimi output with headers) */}
                {isDone && rawText.includes("## ") && (
                  <motion.div
                    key="jpm-done"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <JPMReport
                      content={rawText}
                      ticker={activeTicker ?? undefined}
                      companyName={financials.data.companyName}
                      generatedAt={report?.generatedAt}
                    />
                  </motion.div>
                )}

                {/* Fallback: structured JSON report (DeepSeek / legacy) */}
                {isDone && !rawText.includes("## ") && report && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-5"
                  >
                    {/* Investment thesis */}
                    <div className="border-primary bg-primary/5 rounded-lg border-l-2 px-4 py-3">
                      <p className="text-primary mb-1.5 font-mono text-[10px] tracking-widest uppercase">
                        Investment Thesis
                      </p>
                      <p className="text-foreground text-sm leading-relaxed">
                        {report.sections.overview}
                      </p>
                    </div>

                    {report.decisionBrief && (
                      <DecisionBrief
                        action={report.decisionBrief.action}
                        confidence={report.decisionBrief.confidence}
                        timeHorizon={report.decisionBrief.timeHorizon}
                        keyQuestion={report.decisionBrief.keyQuestion}
                      />
                    )}

                    {report.scenarioMatrix &&
                      report.scenarioMatrix.length > 0 && (
                        <Section label="Scenario Matrix" icon={Target}>
                          <ScenarioMatrix scenarios={report.scenarioMatrix} />
                        </Section>
                      )}

                    <Section label="Growth Drivers" icon={TrendingUp}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.growthDrivers}
                      </p>
                    </Section>

                    <Section label="Profitability" icon={BarChart3}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.profitability}
                      </p>
                    </Section>

                    <Section label="Near-Term Catalysts" icon={Zap}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.catalysts}
                      </p>
                    </Section>

                    <Section label="Valuation" icon={BarChart3}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.valuation}
                      </p>
                    </Section>

                    <Section label="Key Risks" icon={Shield}>
                      <ul className="space-y-2">
                        {report.sections.risks.map((risk, i) => (
                          <li
                            key={i}
                            className="text-foreground/90 flex gap-2 text-sm"
                          >
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </Section>

                    <WorkBuddyGrid report={report} />

                    {report.nextSteps && report.nextSteps.length > 0 && (
                      <Section label="Next Steps" icon={ListChecks}>
                        <div className="grid gap-2 md:grid-cols-3">
                          {report.nextSteps.slice(0, 3).map((step, index) => (
                            <div
                              key={step}
                              className="rounded-lg border px-3 py-3"
                            >
                              <p className="text-primary mb-2 font-mono text-[10px] font-semibold">
                                STEP {index + 1}
                              </p>
                              <p className="text-sm leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {report.evidenceNeeds &&
                      report.evidenceNeeds.length > 0 && (
                        <Section label="Evidence To Verify" icon={FileText}>
                          <div className="bg-muted/20 rounded-lg border p-3">
                            <ul className="space-y-2">
                              {report.evidenceNeeds
                                .slice(0, 4)
                                .map((evidence) => (
                                  <li
                                    key={evidence}
                                    className="text-muted-foreground flex gap-2 text-xs leading-relaxed"
                                  >
                                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                    {evidence}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </Section>
                      )}

                    {/* Footer */}
                    <p className="text-muted-foreground/60 border-border border-t pt-2 text-[10px]">
                      Generated by AI ·{" "}
                      {new Date(report.generatedAt).toLocaleString("en-US")} ·
                      For research only. Not investment advice.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
