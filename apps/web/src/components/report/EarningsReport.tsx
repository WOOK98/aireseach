"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EarningsSnapshot {
  quarter: string;
  reportDate: string;
  epsActual: string;
  epsEstimate: string;
  epsSurprise: string;
  revenueActual: string;
  revenueEstimate: string;
  revenueSurprise: string;
  stockMoveAfterHours: string;
  verdict: string;
}

interface AnalysisSection {
  title: string;
  content: string;
  highlights: string[];
  sentiment: "positive" | "negative" | "mixed";
}

export interface EarningsReportData {
  earningsSnapshot: EarningsSnapshot;
  revenueAnalysis: AnalysisSection;
  marginAnalysis: AnalysisSection;
  cashFlowAnalysis: AnalysisSection;
  guidanceAnalysis: AnalysisSection;
  managementTone: AnalysisSection;
  analystReaction: AnalysisSection;
  keyTakeaways: string[];
  watchNext: string[];
}

// ── Highlighter Markdown ──────────────────────────────────────────────────────
// Renders **bold** text with a yellow highlighter effect
// Renders ==text== with a red highlighter effect
// Renders ~~text~~ with a green highlighter effect

function HighlightedMarkdown({ content }: { content: string }) {
  // Process the content to add highlighter effects
  const processed = content
    // ==text== → red highlighter
    .replace(/==([^=]+)==/g, '<mark class="highlight-red">$1</mark>')
    // ~~text~~ → green highlighter
    .replace(/~~([^~]+)~~/g, '<mark class="highlight-green">$1</mark>')
    // **text** → yellow highlighter (bold + highlight)
    .replace(
      /\*\*([^*]+)\*\*/g,
      '<mark class="highlight-yellow"><strong>$1</strong></mark>',
    );

  return (
    <div
      className="earnings-highlighted-content text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}

// ── Sentiment Badge ───────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config = {
    positive: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      icon: TrendingUp,
      label: "Positive",
    },
    negative: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      icon: TrendingDown,
      label: "Negative",
    },
    mixed: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      icon: Minus,
      label: "Mixed",
    },
  }[sentiment] ?? {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    icon: Minus,
    label: sentiment,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.border} ${config.text}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ── Surprise Badge ────────────────────────────────────────────────────────────

function SurpriseBadge({ value }: { value: string }) {
  const isBeat = value.toLowerCase().includes("beat");
  const isMiss = value.toLowerCase().includes("miss");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-bold ${
        isBeat
          ? "bg-emerald-100 text-emerald-800"
          : isMiss
            ? "bg-red-100 text-red-800"
            : "bg-gray-100 text-gray-800"
      }`}
    >
      {isBeat ? (
        <ArrowUp className="h-3 w-3" />
      ) : isMiss ? (
        <ArrowDown className="h-3 w-3" />
      ) : null}
      {value}
    </span>
  );
}

// ── Analysis Section Card ─────────────────────────────────────────────────────

const sectionIcons: Record<string, React.ElementType> = {
  revenueAnalysis: BarChart3,
  marginAnalysis: TrendingUp,
  cashFlowAnalysis: DollarSign,
  guidanceAnalysis: Target,
  managementTone: Users,
  analystReaction: FileText,
};

function AnalysisSectionCard({
  id,
  section,
}: {
  id: string;
  section: AnalysisSection;
}) {
  const Icon = sectionIcons[id] ?? FileText;

  return (
    <div className="group border-line hover:border-lock/30 relative overflow-hidden rounded-xl border bg-white transition-all">
      {/* Accent bar */}
      <div
        className={`absolute top-0 left-0 h-full w-1 ${
          section.sentiment === "positive"
            ? "bg-emerald-500"
            : section.sentiment === "negative"
              ? "bg-red-500"
              : "bg-amber-500"
        }`}
      />

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="text-ink-2 h-4 w-4" />
            <h3 className="font-serif text-base font-semibold">
              {section.title}
            </h3>
          </div>
          <SentimentBadge sentiment={section.sentiment} />
        </div>

        {/* Content with highlighter */}
        <HighlightedMarkdown content={section.content} />

        {/* Key highlights */}
        {section.highlights.length > 0 && (
          <div className="mt-4 border-t border-dashed border-gray-200 pt-3">
            <p className="text-ink-2 mb-2 text-[10px] font-semibold tracking-widest uppercase">
              Key Highlights
            </p>
            <ul className="space-y-1.5">
              {section.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                  <HighlightedMarkdown content={h} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Earnings Report Component ────────────────────────────────────────────

interface EarningsReportProps {
  data: EarningsReportData;
  ticker: string;
}

export function EarningsReport({ data, ticker: _ticker }: EarningsReportProps) {
  const snap = data.earningsSnapshot;
  const moveNum = parseFloat(snap.stockMoveAfterHours);
  const isDown = moveNum < 0;

  return (
    <div className="space-y-6">
      {/* ── Earnings Snapshot Banner ── */}
      <div
        className={`relative overflow-hidden rounded-xl border ${
          isDown
            ? "border-red-200 bg-gradient-to-br from-red-50 to-white"
            : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
        }`}
      >
        <div className="p-6">
          {/* Top row: quarter + date */}
          <div className="mb-4 flex items-center gap-3">
            <span className="bg-lock/10 text-lock inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold">
              <Calendar className="h-3 w-3" />
              {snap.quarter} Earnings
            </span>
            <span className="text-ink-2 font-mono text-xs">
              Reported {snap.reportDate}
            </span>
          </div>

          {/* Move badge */}
          <div className="mb-5 flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-2 font-serif text-3xl font-bold ${
                isDown
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isDown ? (
                <ArrowDown className="h-6 w-6" />
              ) : (
                <ArrowUp className="h-6 w-6" />
              )}
              {snap.stockMoveAfterHours}
            </div>
            <span className="text-ink-2 text-xs">after-hours move</span>
          </div>

          {/* Verdict */}
          <p className="font-serif text-lg leading-snug font-semibold">
            {snap.verdict}
          </p>

          {/* EPS / Revenue grid */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* EPS */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
                EPS
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold">
                  {snap.epsActual}
                </span>
                <span className="text-ink-2 text-xs">
                  est. {snap.epsEstimate}
                </span>
              </div>
              <div className="mt-2">
                <SurpriseBadge value={snap.epsSurprise} />
              </div>
            </div>

            {/* Revenue */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
                Revenue
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold">
                  {snap.revenueActual}
                </span>
                <span className="text-ink-2 text-xs">
                  est. {snap.revenueEstimate}
                </span>
              </div>
              <div className="mt-2">
                <SurpriseBadge value={snap.revenueSurprise} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analysis Sections ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {(
          [
            "revenueAnalysis",
            "marginAnalysis",
            "cashFlowAnalysis",
            "guidanceAnalysis",
            "managementTone",
            "analystReaction",
          ] as const
        ).map((id) => (
          <AnalysisSectionCard key={id} id={id} section={data[id]} />
        ))}
      </div>

      {/* ── Key Takeaways ── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="text-lock h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">Key Takeaways</h3>
        </div>
        <ol className="space-y-2">
          {data.keyTakeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="bg-lock/10 text-lock flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold">
                {i + 1}
              </span>
              <HighlightedMarkdown content={t} />
            </li>
          ))}
        </ol>
      </div>

      {/* ── Watch Next ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="text-amber-ink h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">
            What to Watch Next
          </h3>
        </div>
        <ul className="space-y-2">
          {data.watchNext.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <HighlightedMarkdown content={w} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
