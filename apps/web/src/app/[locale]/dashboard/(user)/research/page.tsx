"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  Activity,
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
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
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Separator } from "@workspace/ui-web/separator";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { JPMReport } from "~/components/report/JPMReport";
import {
  FCFChart,
  MarginChart,
  RevenueChart,
} from "~/modules/report/finance/charts";
import { IndustryView } from "~/modules/report/finance/industry-view";
import { MetricsGrid } from "~/modules/report/finance/metric-cards";
import {
  useIndustryAnalyze,
  isLikelyTicker,
} from "~/modules/report/finance/use-industry";
import {
  useFinancials,
  useReportStream,
  useValidateTicker,
} from "~/modules/report/finance/use-report";

import type { ChangeEvent, ElementType, KeyboardEvent, ReactNode } from "react";
import type { IndustryAnalyzeResult } from "~/modules/report/finance/use-industry";
import type { ResearchMode } from "~/modules/report/finance/use-report";

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
];

interface FilingCandidate {
  form: string;
  filingDate: string;
  periodEnding: string;
  description: string;
  url: string;
  accessionNumber: string;
  source: "sec_edgar";
  companyName: string;
  cik: string;
}

type FilingSearchResponse =
  | {
      ok: true;
      query: string;
      candidates: FilingCandidate[];
      totalResults: number;
      source: "sec_edgar";
    }
  | {
      ok: false;
      query: string;
      reason: "no_results" | "api_error" | "invalid_query";
      message: string;
    };

interface FilingKeyChange {
  area?: string;
  change?: string;
  significance?: "High" | "Medium" | "Low";
  dataPoint?: string;
}

interface FilingHighlight {
  metric?: string;
  value?: string;
  period?: string;
  change?: string;
  dataPoint?: string;
}

interface FilingRisk {
  risk?: string;
  severity?: "High" | "Medium" | "Low";
  dataPoint?: string;
}

interface FilingAnalysis {
  companyName?: string;
  filingType?: string;
  periodEnding?: string;
  executiveSummary?: string;
  keyChanges?: FilingKeyChange[];
  financialHighlights?: FilingHighlight[];
  riskFactors?: FilingRisk[];
  managementDiscussion?: string;
  topJudgments?: Array<{
    judgment?: string;
    keyNumber?: string;
    wrongIf?: string;
    dataPoint?: string;
  }>;
  monitorPanel?: {
    schema_version: 1;
    monitors: Array<{
      metric?: string;
      current?: string;
      trigger?: string;
      tolerance?: string;
      freq?: "Daily" | "Weekly" | "Quarterly" | "Event-driven";
      source?: string;
    }>;
  };
  nextSteps?: string[];
}

type FilingStatus =
  | "idle"
  | "searching"
  | "candidates"
  | "analyzing"
  | "done"
  | "error";

const hasPageRef = (value: string | undefined) =>
  /\bp\.\s*\d+/i.test(value ?? "");

const hasNumericText = (value: string | undefined) => /\d/.test(value ?? "");

const canRenderNarrative = (value: string | undefined) =>
  !!value && (!hasNumericText(value) || hasPageRef(value));

const getPageNumber = (value: string | undefined) =>
  value?.match(/\bp\.\s*(\d+)/i)?.[1] ?? null;

const withPageHash = (url: string, dataPoint?: string) => {
  const page = getPageNumber(dataPoint);
  return page ? `${url}#page=${page}` : url;
};

const officialHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "sec.gov";
  }
};

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

function getFriendlyAnalysisError(rawMessage?: string | null) {
  if (!rawMessage) {
    return "AI analysis did not return a result. Please try again.";
  }

  if (
    /api key|deepseek|openai|llm|provider|invalid character|bytestring|not configured/i.test(
      rawMessage,
    )
  ) {
    return "Base financial data is loaded, but the AI narrative is temporarily unavailable.";
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
          <p className="text-sm font-medium">AI analysis unavailable</p>
          <p className="text-xs leading-relaxed opacity-80">
            <span className="notranslate" translate="no">
              {message}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
          onClick={onRetry}
        >
          <RotateCcw className="h-3 w-3" /> Regenerate
        </Button>
      </div>
    </motion.div>
  );
}

function FilingCandidates({
  candidates,
  selectedUrl,
  onSelect,
  onAnalyze,
  isAnalyzing,
}: {
  candidates: FilingCandidate[];
  selectedUrl: string | null;
  onSelect: (candidate: FilingCandidate) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}) {
  return (
    <Section label="Official Filing Candidates" icon={FileSearch}>
      <div
        className="notranslate overflow-hidden rounded-xl border"
        translate="no"
      >
        <div className="bg-muted/30 text-muted-foreground hidden grid-cols-[0.7fr_1fr_1fr_1fr_2fr] gap-3 border-b px-4 py-2 font-mono text-[10px] tracking-widest uppercase md:grid">
          <span>Form</span>
          <span>Filed</span>
          <span>Period</span>
          <span>Source</span>
          <span>Title</span>
        </div>
        <div className="divide-y">
          {candidates.map((candidate, index) => {
            const selected = selectedUrl === candidate.url;
            return (
              <button
                key={candidate.accessionNumber}
                type="button"
                onClick={() => onSelect(candidate)}
                className={`grid w-full gap-2 px-4 py-3 text-left transition md:grid-cols-[0.7fr_1fr_1fr_1fr_2fr] md:items-center md:gap-3 ${
                  selected ? "bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="notranslate rounded-full border px-2 py-0.5 font-mono text-xs font-semibold"
                    translate="no"
                  >
                    {candidate.form}
                  </span>
                  {index === 0 && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800">
                      Latest
                    </span>
                  )}
                </div>
                <span
                  className="notranslate text-muted-foreground font-mono text-xs"
                  translate="no"
                >
                  {candidate.filingDate || "N/A"}
                </span>
                <span
                  className="notranslate text-muted-foreground font-mono text-xs"
                  translate="no"
                >
                  {candidate.periodEnding || "N/A"}
                </span>
                <span
                  className="notranslate text-muted-foreground font-mono text-xs"
                  translate="no"
                >
                  {officialHost(candidate.url)}
                </span>
                <span
                  className="notranslate text-sm leading-snug"
                  translate="no"
                >
                  {candidate.description}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Latest filing is highlighted, but analysis starts only after you
            select a filing and confirm.
          </p>
          <Button
            onClick={onAnalyze}
            disabled={!selectedUrl || isAnalyzing}
            size="sm"
            className="gap-1.5"
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSearch className="h-3.5 w-3.5" />
            )}
            Analyze selected filing
          </Button>
        </div>
      </div>
    </Section>
  );
}

function PageAnchor({
  filingUrl,
  dataPoint,
}: {
  filingUrl: string;
  dataPoint?: string;
}) {
  if (!hasPageRef(dataPoint)) return null;

  return (
    <a
      href={withPageHash(filingUrl, dataPoint)}
      target="_blank"
      rel="noreferrer"
      className="notranslate inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] text-blue-800 hover:bg-blue-100"
      translate="no"
    >
      {dataPoint?.match(/\bp\.\s*\d+/i)?.[0] ?? "p.NN"}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function FilingAnalysisResult({
  analysis,
  filingUrl,
}: {
  analysis: FilingAnalysis;
  filingUrl: string;
}) {
  const keyChanges = (analysis.keyChanges ?? []).filter((item) =>
    hasPageRef(item.dataPoint),
  );
  const highlights = (analysis.financialHighlights ?? []).filter((item) =>
    hasPageRef(item.dataPoint),
  );
  const risks = (analysis.riskFactors ?? []).filter((item) =>
    hasPageRef(item.dataPoint),
  );
  const judgments = (analysis.topJudgments ?? []).filter(
    (item) =>
      item.judgment &&
      item.keyNumber &&
      item.wrongIf &&
      hasPageRef(item.dataPoint),
  );
  const monitors = (analysis.monitorPanel?.monitors ?? []).filter(
    (item) =>
      item.metric && item.current && item.trigger && hasPageRef(item.source),
  );
  const hasAnchoredAnalysis =
    keyChanges.length > 0 ||
    highlights.length > 0 ||
    risks.length > 0 ||
    judgments.length > 0 ||
    monitors.length > 0;

  return (
    <div className="notranslate space-y-6" translate="no">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
        <p className="mb-1 font-mono text-[10px] tracking-widest text-blue-900 uppercase dark:text-blue-100">
          Filing Source Lock
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              {analysis.companyName ?? "Company filing"}
            </h3>
            <p
              className="notranslate text-muted-foreground mt-1 font-mono text-xs"
              translate="no"
            >
              {analysis.filingType ?? "SEC filing"} · Period{" "}
              {analysis.periodEnding ?? "N/A"} · {officialHost(filingUrl)}
            </p>
          </div>
          <a
            href={filingUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
          >
            Open original <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {canRenderNarrative(analysis.executiveSummary) && (
          <p className="mt-3 text-sm leading-relaxed">
            {analysis.executiveSummary}
          </p>
        )}
      </div>

      {!hasAnchoredAnalysis && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm font-medium">Anchored analysis withheld</p>
          <p className="mt-1 text-xs leading-relaxed opacity-80">
            The model did not return page-anchored numeric claims. Rerun the
            analysis or open the original filing.
          </p>
        </div>
      )}

      {judgments.length > 0 && (
        <Section label="Three Falsifiable Judgments" icon={Target}>
          <div className="grid gap-3 md:grid-cols-3">
            {judgments.slice(0, 3).map((item, index) => (
              <div
                key={`${item.judgment}-${index}`}
                className="rounded-xl border p-4"
              >
                <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest">
                  {["I", "II", "III"][index]}
                </p>
                <p
                  className="notranslate text-sm leading-relaxed font-medium"
                  translate="no"
                >
                  {item.judgment}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className="notranslate font-mono text-sm font-semibold"
                    translate="no"
                  >
                    {item.keyNumber}
                  </span>
                  <PageAnchor
                    filingUrl={filingUrl}
                    dataPoint={item.dataPoint}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  <span>Wrong if: </span>
                  <span className="notranslate" translate="no">
                    {item.wrongIf}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {highlights.length > 0 && (
        <Section label="Anchored Financial Highlights" icon={BarChart3}>
          <div className="grid gap-2 md:grid-cols-2">
            {highlights.map((item) => (
              <div
                key={`${item.metric}-${item.dataPoint}`}
                className="rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.metric}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      <span className="notranslate" translate="no">
                        {item.period} · {item.change}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="notranslate font-mono text-sm font-semibold"
                      translate="no"
                    >
                      {item.value}
                    </p>
                    <PageAnchor
                      filingUrl={filingUrl}
                      dataPoint={item.dataPoint}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {keyChanges.length > 0 && (
        <Section label="Key Changes" icon={TrendingUp}>
          <div className="space-y-2">
            {keyChanges.map((item) => (
              <div
                key={`${item.area}-${item.dataPoint}`}
                className="rounded-lg border p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.area}</p>
                  {item.significance && (
                    <span className="rounded-full border px-2 py-0.5 text-[10px]">
                      {item.significance}
                    </span>
                  )}
                  <PageAnchor
                    filingUrl={filingUrl}
                    dataPoint={item.dataPoint}
                  />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <span className="notranslate" translate="no">
                    {item.change}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {risks.length > 0 && (
        <Section label="Risk Factors" icon={Shield}>
          <div className="space-y-2">
            {risks.map((item) => (
              <div
                key={`${item.risk}-${item.dataPoint}`}
                className="flex gap-3 rounded-lg border p-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {item.severity ?? "Risk"}
                    </span>
                    <PageAnchor
                      filingUrl={filingUrl}
                      dataPoint={item.dataPoint}
                    />
                  </div>
                  <p
                    className="notranslate text-sm leading-relaxed"
                    translate="no"
                  >
                    {item.risk}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {monitors.length > 0 && (
        <Section label="Monitor Panel" icon={ListChecks}>
          <div className="overflow-hidden rounded-xl border">
            <div className="bg-muted/30 text-muted-foreground grid grid-cols-[1fr_1fr_1fr] gap-3 border-b px-3 py-2 font-mono text-[10px] tracking-widest uppercase md:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr]">
              <span>Metric</span>
              <span>Current</span>
              <span>Trigger</span>
              <span className="hidden md:block">Freq</span>
              <span className="hidden md:block">Source</span>
            </div>
            {monitors.map((item) => (
              <div
                key={`${item.metric}-${item.source}`}
                className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b px-3 py-3 text-sm last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr]"
              >
                <span>{item.metric}</span>
                <span className="notranslate font-mono" translate="no">
                  {item.current}
                </span>
                <span className="notranslate font-mono" translate="no">
                  {item.trigger}
                </span>
                <span className="text-muted-foreground hidden md:block">
                  {item.freq ?? "Quarterly"}
                </span>
                <span className="hidden md:block">
                  <PageAnchor filingUrl={filingUrl} dataPoint={item.source} />
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {canRenderNarrative(analysis.managementDiscussion) && (
        <Section label="Management Discussion" icon={FileText}>
          <p className="text-foreground/90 text-sm leading-relaxed">
            {analysis.managementDiscussion}
          </p>
        </Section>
      )}

      <p className="text-muted-foreground/70 border-t pt-2 text-[10px]">
        Numeric claims without page anchors are withheld. For research only. Not
        investment advice.
      </p>
    </div>
  );
}

function DecisionBrief({
  action,
  confidence,
  timeHorizon,
  keyQuestion,
}: {
  action: string;
  confidence: string;
  timeHorizon: string;
  keyQuestion: string;
}) {
  return (
    <div className="border-primary/30 bg-primary/5 grid gap-4 rounded-xl border p-4 md:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="text-primary mb-2 font-mono text-[10px] tracking-widest uppercase">
          Decision Brief
        </p>
        <h3 className="text-foreground text-lg font-semibold">{action}</h3>
        <div className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
          <span className="bg-background rounded-full border px-2.5 py-1">
            Confidence: {confidence}
          </span>
          <span className="bg-background rounded-full border px-2.5 py-1">
            Horizon: {timeHorizon}
          </span>
        </div>
      </div>
      <div className="bg-background/80 rounded-lg border px-3 py-3">
        <div className="mb-1 flex items-center gap-2">
          <Target className="text-primary h-3.5 w-3.5" />
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Key Question
          </p>
        </div>
        <p className="text-sm leading-relaxed">{keyQuestion}</p>
      </div>
    </div>
  );
}

function ScenarioMatrix({
  scenarios,
}: {
  scenarios: NonNullable<
    import("@workspace/shared/types/report").ReportData["scenarioMatrix"]
  >;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {scenarios.map((scenario) => (
        <div
          key={`${scenario.scenario}-${scenario.keyMetric}`}
          className="bg-muted/30 rounded-xl border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{scenario.scenario}</p>
              <p className="text-muted-foreground text-xs">
                Probability {scenario.probability}%
              </p>
            </div>
            <p className="max-w-[9rem] text-right font-mono text-xs leading-snug font-semibold">
              {scenario.keyMetric}
            </p>
          </div>
          <div className="bg-background mt-3 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.max(4, scenario.probability)}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1.5">
            {scenario.drivers.slice(0, 3).map((driver) => (
              <li
                key={driver}
                className="text-muted-foreground flex gap-2 text-xs leading-relaxed"
              >
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                {driver}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WorkBuddyGrid({
  report,
}: {
  report: import("@workspace/shared/types/report").ReportData;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {report.roleBriefs && report.roleBriefs.length > 0 && (
        <Section label="Role Briefs" icon={Users}>
          <div className="space-y-2">
            {report.roleBriefs.slice(0, 4).map((item) => (
              <div key={item.role} className="rounded-lg border px-3 py-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.role}</p>
                  <span className="text-muted-foreground text-[10px] uppercase">
                    Concern
                  </span>
                </div>
                <p className="text-foreground/90 text-xs leading-relaxed">
                  {item.takeaway}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  {item.concern}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.watchlist && report.watchlist.length > 0 && (
        <Section label="Watchlist" icon={Activity}>
          <div className="space-y-2">
            {report.watchlist.slice(0, 5).map((item) => (
              <div
                key={item.metric}
                className="bg-muted/20 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.metric}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.whyItMatters}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold">
                      {item.current}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {item.threshold}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResearchPage() {
  const [mounted, setMounted] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ResearchMode>("snapshot");
  const [language] = useState<"zh" | "en">("en");
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
                      resetFilings();
                      return;
                    }
                    if (
                      financials.data &&
                      activeTicker &&
                      status !== "loading"
                    ) {
                      reset();
                      void generate(
                        activeTicker,
                        financials.data,
                        language,
                        mode.id,
                      );
                    }
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
            {/* Empty state */}
            {!activeTicker &&
              !hasIndustryResult &&
              !isIndustryLoading &&
              filingStatus === "idle" && (
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
                      Enter a ticker symbol or a theme (e.g. AI, semiconductors)
                      to get started.
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
