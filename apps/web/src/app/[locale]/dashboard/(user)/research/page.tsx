"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  AlertCircle,
  BarChart3,
  FileText,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Separator } from "@workspace/ui-web/separator";
import { Skeleton } from "@workspace/ui-web/skeleton";

import {
  FCFChart,
  MarginChart,
  RevenueChart,
} from "~/modules/report/finance/charts";
import {
  MetricsGrid,
  RatingBadge,
  UpsideLabel,
} from "~/modules/report/finance/metric-cards";
import {
  useFinancials,
  useReportStream,
  useValidateTicker,
} from "~/modules/report/finance/use-report";

import type { ChangeEvent, ElementType, KeyboardEvent, ReactNode } from "react";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          {label}
        </span>
        <div className="bg-border h-px flex-1" />
      </div>
      {children}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-lg" />
      <Skeleton className="h-44 rounded-lg" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Streaming indicator ─────────────────────────────────────────────────────
function StreamingIndicator({ text }: { text: string }) {
  const charCount = text.length;
  return (
    <div className="border-border bg-muted/30 space-y-2 rounded-lg border border-dashed px-4 py-8 text-center">
      <Sparkles className="text-primary mx-auto h-5 w-5 animate-pulse" />
      <p className="text-muted-foreground text-sm">AI 正在分析数据...</p>
      <p className="text-muted-foreground/60 font-mono text-[11px]">
        已接收 {charCount} 字符
      </p>
    </div>
  );
}

function getFriendlyAnalysisError(rawMessage?: string | null) {
  if (!rawMessage) {
    return "AI 分析暂时没有返回结果，请稍后重试。";
  }

  if (
    /api key|deepseek|invalid character|bytestring|not configured/i.test(
      rawMessage,
    )
  ) {
    return "基础财务数据已加载；AI 文字研报暂不可用，需要管理员更新模型 API Key 后恢复。";
  }

  return rawMessage;
}

function AnalysisNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      key="analysis-warning"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">AI 分析暂不可用</p>
          <p className="text-xs leading-relaxed opacity-80">{message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
          onClick={onRetry}
        >
          <RotateCcw className="h-3 w-3" /> 重新生成
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const [inputVal, setInputVal] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [language] = useState<"zh" | "en">("zh");

  const validate = useValidateTicker();
  const financials = useFinancials(activeTicker);
  const { status, rawText, report, error, generate, reset } = useReportStream();

  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch() {
    const ticker = inputVal.trim().toUpperCase();
    if (!ticker) return;

    const result = await validate.mutateAsync(ticker).catch(() => ({
      valid: false,
    }));
    if (!result.valid) {
      toast.error(`找不到股票代码 "${ticker}"，请检查后重试`);
      return;
    }

    reset();
    setActiveTicker(ticker);
  }

  // Once financials load, auto-trigger AI generation
  const prevTickerRef = useRef<string | null>(null);
  if (
    financials.data &&
    activeTicker &&
    prevTickerRef.current !== activeTicker &&
    status === "idle"
  ) {
    prevTickerRef.current = activeTicker;
    void generate(activeTicker, financials.data, language);
  }

  const isLoading = financials.isLoading || status === "loading";
  const isStreaming = status === "streaming";
  const isDone = status === "done" && report;
  const financialError = financials.isError
    ? financials.error?.message
    : undefined;
  const analysisError =
    !financials.isError && status === "error" ? error : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* ── Search bar ── */}
      <div className="border-border border-b px-4 py-4">
        <div className="mx-auto flex w-full max-w-5xl gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              ref={inputRef}
              value={inputVal}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setInputVal(e.target.value.toUpperCase())
              }
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && handleSearch()
              }
              placeholder="输入股票代码（TSLA、AAPL）"
              className="pl-9 font-mono text-sm uppercase placeholder:font-sans placeholder:normal-case"
              maxLength={10}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={
              !inputVal.trim() || isLoading || isStreaming || validate.isPending
            }
            size="sm"
            className="shrink-0 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            生成
          </Button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <AnimatePresence mode="wait">
            {/* Empty state */}
            {!activeTicker && (
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
                    Snapshot
                  </p>
                  <p className="text-muted-foreground max-w-[200px] text-xs leading-relaxed">
                    输入股票代码，3秒生成一份快速研报
                  </p>
                </div>
              </motion.div>
            )}

            {/* Loading skeleton */}
            {(isLoading || (activeTicker && financials.isLoading)) && (
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
            {financialError && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-destructive/30 bg-destructive/5 flex gap-3 rounded-lg border px-4 py-4"
              >
                <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="text-destructive text-sm font-medium">
                    加载失败
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {financialError ?? "请稍后重试"}
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
                    <RotateCcw className="h-3 w-3" /> 重置
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Report content */}
            {financials.data && !financials.isLoading && (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
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
                    {isDone && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <RatingBadge rating={report.rating} />
                        <div className="text-right">
                          <p className="text-muted-foreground text-[10px]">
                            目标价
                          </p>
                          <p className="font-mono text-sm font-medium">
                            ${report.targetPrice}{" "}
                            <UpsideLabel upside={report.upside} />
                          </p>
                        </div>
                      </div>
                    )}
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
                      );
                    }}
                  />
                )}

                {/* Metrics grid */}
                <Section label="关键指标" icon={BarChart3}>
                  <MetricsGrid m={financials.data} />
                </Section>

                {/* Revenue chart */}
                {financials.data.revenueHistory.length > 0 && (
                  <RevenueChart data={financials.data.revenueHistory} />
                )}

                {/* Margin chart */}
                {financials.data.grossMarginHistory.length > 0 && (
                  <MarginChart
                    grossMargin={financials.data.grossMarginHistory}
                    operatingMargin={financials.data.operatingMarginHistory}
                  />
                )}

                {/* FCF chart */}
                {financials.data.fcfHistory.length > 0 && (
                  <FCFChart data={financials.data.fcfHistory} />
                )}

                <Separator />

                {/* AI Analysis */}
                {isStreaming && <StreamingIndicator text={rawText} />}

                {isDone && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-5"
                  >
                    {/* Investment thesis */}
                    <div className="border-primary bg-primary/5 rounded-lg border-l-2 px-4 py-3">
                      <p className="text-primary mb-1.5 font-mono text-[10px] tracking-widest uppercase">
                        核心投资逻辑
                      </p>
                      <p className="text-foreground text-sm leading-relaxed">
                        {report.sections.overview}
                      </p>
                    </div>

                    <Section label="增长驱动" icon={TrendingUp}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.growthDrivers}
                      </p>
                    </Section>

                    <Section label="盈利分析" icon={BarChart3}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.profitability}
                      </p>
                    </Section>

                    <Section label="近期催化剂" icon={Zap}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.catalysts}
                      </p>
                    </Section>

                    <Section label="估值" icon={BarChart3}>
                      <p className="text-foreground/90 text-sm leading-relaxed">
                        {report.sections.valuation}
                      </p>
                    </Section>

                    <Section label="主要风险" icon={Shield}>
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

                    {/* Footer */}
                    <p className="text-muted-foreground/60 border-border border-t pt-2 text-[10px]">
                      由 AI 生成 ·{" "}
                      {new Date(report.generatedAt).toLocaleString("zh-CN")} ·
                      仅供参考，不构成投资建议
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
