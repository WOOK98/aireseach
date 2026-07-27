"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock,
  Crosshair,
  GitCompare,
  Minus,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MoveVerdict {
  direction: "up" | "down" | "flat";
  magnitude: string;
  impliedMove: string;
  exceededImplied: boolean;
  oneLineExplanation: string;
}

interface PrimaryDriver {
  factor: string;
  impact: "high" | "medium" | "low";
  direction: "positive" | "negative";
  explanation: string;
}

interface EarningsVsExpectations {
  eps: { actual: string; estimate: string; surprise: string; verdict: string };
  revenue: {
    actual: string;
    estimate: string;
    surprise: string;
    verdict: string;
  };
  guidance: { status: string; details: string };
  narrative: string;
}

interface TechnicalContext {
  preEarningsRun: string;
  optionsImplied: string;
  volumeAnalysis: string;
}

interface ComparableReaction {
  company: string;
  event: string;
  move: string;
  relevance: string;
}

interface ForwardImplications {
  shortTerm: string;
  mediumTerm: string;
  thesisImpact: string;
}

interface KeyLevels {
  support: string;
  resistance: string;
  nextCatalyst: string;
}

export interface PostEarningsMoveData {
  moveVerdict: MoveVerdict;
  primaryDrivers: PrimaryDriver[];
  earningsVsExpectations: EarningsVsExpectations;
  whatTheMarketFocusedOn: string;
  technicalContext: TechnicalContext;
  comparableReactions: ComparableReaction[];
  forwardImplications: ForwardImplications;
  keyLevels: KeyLevels;
}

// ── Highlighted Content ───────────────────────────────────────────────────────

function HighlightedContent({ text }: { text: string }) {
  const processed = text
    .replace(/==([^=]+)==/g, '<mark class="highlight-red">$1</mark>')
    .replace(/~~([^~]+)~~/g, '<mark class="highlight-green">$1</mark>')
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

// ── Impact Badge ──────────────────────────────────────────────────────────────

function ImpactBadge({ impact }: { impact: string }) {
  const config = {
    high: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
    medium: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    low: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      border: "border-gray-200",
    },
  }[impact] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${config.bg} ${config.text} ${config.border}`}
    >
      {impact}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface PostEarningsMoveProps {
  data: PostEarningsMoveData;
  ticker: string;
}

export function PostEarningsMove({
  data,
  ticker: _ticker,
}: PostEarningsMoveProps) {
  const verdict = data.moveVerdict;
  const isDown = verdict.direction === "down";
  const isUp = verdict.direction === "up";

  return (
    <div className="space-y-6">
      {/* ── Move Verdict Banner ── */}
      <div
        className={`relative overflow-hidden rounded-xl border-2 ${
          isDown
            ? "border-red-300 bg-gradient-to-br from-red-50 via-white to-red-50/30"
            : isUp
              ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30"
              : "border-gray-300 bg-gradient-to-br from-gray-50 via-white to-gray-50/30"
        }`}
      >
        <div className="p-6">
          {/* Label */}
          <p className="text-ink-2 mb-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
            Post-Earnings Price Move Analysis
          </p>

          {/* Big move number */}
          <div className="mb-3 flex items-center gap-4">
            <div
              className={`flex items-center gap-2 rounded-xl px-5 py-3 font-serif text-4xl font-bold ${
                isDown
                  ? "bg-red-100 text-red-700"
                  : isUp
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {isDown ? (
                <ArrowDown className="h-8 w-8" />
              ) : isUp ? (
                <ArrowUp className="h-8 w-8" />
              ) : (
                <Minus className="h-8 w-8" />
              )}
              {verdict.magnitude}
            </div>
            <div className="space-y-1">
              <p className="text-ink-2 text-xs">
                Implied: {verdict.impliedMove}
              </p>
              {verdict.exceededImplied && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  <Zap className="h-3 w-3" />
                  Exceeded implied move
                </span>
              )}
            </div>
          </div>

          {/* One-liner */}
          <p className="font-serif text-lg leading-snug font-semibold">
            {verdict.oneLineExplanation}
          </p>
        </div>
      </div>

      {/* ── Primary Drivers ── */}
      <div className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="text-lock h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">
            Primary Drivers
          </h3>
        </div>
        <div className="space-y-3">
          {data.primaryDrivers.map((driver, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-lg border p-4 ${
                driver.direction === "negative"
                  ? "border-red-200 bg-red-50/30"
                  : "border-emerald-200 bg-emerald-50/30"
              }`}
            >
              <div
                className={`absolute top-0 left-0 h-full w-1 ${
                  driver.direction === "negative"
                    ? "bg-red-400"
                    : "bg-emerald-400"
                }`}
              />
              <div className="flex items-center justify-between pl-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-gray-400">
                    #{i + 1}
                  </span>
                  <span className="text-sm font-semibold">{driver.factor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImpactBadge impact={driver.impact} />
                  {driver.direction === "negative" ? (
                    <ArrowDown className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
              </div>
              <div className="mt-2 pl-3">
                <HighlightedContent text={driver.explanation} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Earnings vs Expectations ── */}
      <div className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Target className="text-lock h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">
            Earnings vs Expectations
          </h3>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {/* EPS */}
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
              EPS
            </p>
            <p className="font-serif text-xl font-bold">
              {data.earningsVsExpectations.eps.actual}
            </p>
            <p className="text-ink-2 text-xs">
              vs {data.earningsVsExpectations.eps.estimate} est.
            </p>
            <span
              className={`mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                data.earningsVsExpectations.eps.verdict === "beat"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {data.earningsVsExpectations.eps.surprise}
            </span>
          </div>

          {/* Revenue */}
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
              Revenue
            </p>
            <p className="font-serif text-xl font-bold">
              {data.earningsVsExpectations.revenue.actual}
            </p>
            <p className="text-ink-2 text-xs">
              vs {data.earningsVsExpectations.revenue.estimate} est.
            </p>
            <span
              className={`mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                data.earningsVsExpectations.revenue.verdict === "beat"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {data.earningsVsExpectations.revenue.surprise}
            </span>
          </div>

          {/* Guidance */}
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
              Guidance
            </p>
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                data.earningsVsExpectations.guidance.status === "raised"
                  ? "bg-emerald-100 text-emerald-700"
                  : data.earningsVsExpectations.guidance.status === "cut"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {data.earningsVsExpectations.guidance.status}
            </span>
            <p className="text-ink-2 mt-1 text-xs">
              {data.earningsVsExpectations.guidance.details}
            </p>
          </div>
        </div>

        <HighlightedContent text={data.earningsVsExpectations.narrative} />
      </div>

      {/* ── What the Market Focused On ── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Crosshair className="text-lock h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">
            What the Market Focused On
          </h3>
        </div>
        <HighlightedContent text={data.whatTheMarketFocusedOn} />
      </div>

      {/* ── Technical Context ── */}
      <div className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="text-lock h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">
            Technical Context
          </h3>
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Pre-Earnings Run",
              value: data.technicalContext.preEarningsRun,
            },
            {
              label: "Options Implied Move",
              value: data.technicalContext.optionsImplied,
            },
            {
              label: "Volume Analysis",
              value: data.technicalContext.volumeAnalysis,
            },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
                {item.label}
              </p>
              <HighlightedContent text={item.value} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Comparable Reactions ── */}
      <div className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <GitCompare className="text-lock h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">
            Comparable Reactions
          </h3>
        </div>
        <div className="space-y-3">
          {data.comparableReactions.map((comp, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-bold">
                  {comp.company}
                </span>
                <span
                  className={`font-mono text-xs font-bold ${
                    comp.move.startsWith("-")
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {comp.move}
                </span>
              </div>
              <p className="text-sm">{comp.event}</p>
              <p className="text-ink-2 mt-1 text-xs">{comp.relevance}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Forward Implications ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Short Term (1-4 weeks)",
            value: data.forwardImplications.shortTerm,
            icon: Clock,
          },
          {
            label: "Medium Term (1-3 months)",
            value: data.forwardImplications.mediumTerm,
            icon: Target,
          },
          {
            label: "Thesis Impact",
            value: data.forwardImplications.thesisImpact,
            icon: TrendingDown,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <Icon className="text-ink-2 h-3.5 w-3.5" />
                <p className="text-[10px] font-semibold tracking-wide uppercase">
                  {item.label}
                </p>
              </div>
              <HighlightedContent text={item.value} />
            </div>
          );
        })}
      </div>

      {/* ── Key Levels ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Crosshair className="text-amber-ink h-4 w-4" />
          <h3 className="font-serif text-base font-semibold">Key Levels</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
              Support
            </p>
            <HighlightedContent text={data.keyLevels.support} />
          </div>
          <div>
            <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
              Resistance
            </p>
            <HighlightedContent text={data.keyLevels.resistance} />
          </div>
          <div>
            <p className="text-ink-2 mb-1 text-[10px] font-semibold tracking-widest uppercase">
              Next Catalyst
            </p>
            <HighlightedContent text={data.keyLevels.nextCatalyst} />
          </div>
        </div>
      </div>
    </div>
  );
}
