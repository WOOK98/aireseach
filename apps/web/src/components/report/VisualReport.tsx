"use client";

/* oxlint-disable i18next/no-literal-string */

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ReportMetric {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
}

export interface ReportFinding {
  text: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface ReportSection {
  id: string;
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  icon?: string;
  findings: ReportFinding[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface ReportData {
  target: string;
  summary: string;
  metrics: ReportMetric[];
  marketShare?: ChartDataPoint[];
  revenueBreakdown?: ChartDataPoint[];
  competitorComparison?: ChartDataPoint[];
  sections: ReportSection[];
  swot?: SwotData;
  generatedAt?: string;
  sources?: string;
  lookbackYears?: number;
}

// ── Color palette ─────────────────────────────────────────────────────────────
const COLORS = [
  "#3266ad",
  "#E24B4A",
  "#639922",
  "#EF9F27",
  "#888780",
  "#7c3aed",
];

const SENTIMENT_STYLES = {
  positive: {
    dot: "#639922",
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
  },
  negative: {
    dot: "#E24B4A",
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-300",
  },
  neutral: {
    dot: "#EF9F27",
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
  },
};

const TREND_STYLES = {
  up: "text-green-600 dark:text-green-400",
  down: "text-red-500 dark:text-red-400",
  neutral: "text-amber-500 dark:text-amber-400",
};

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, delta, trend }: ReportMetric) {
  return (
    <div className="bg-muted/50 flex flex-col gap-1 rounded-lg p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl leading-none font-medium">{value}</p>
      {delta && (
        <p className={`text-xs ${TREND_STYLES[trend ?? "neutral"]}`}>{delta}</p>
      )}
    </div>
  );
}

function CollapsibleSection({ title, sentiment, findings }: ReportSection) {
  const [open, setOpen] = useState(false);
  const styles = SENTIMENT_STYLES[sentiment];
  const count = findings.length;
  const label =
    sentiment === "positive"
      ? `${count} positive`
      : sentiment === "negative"
        ? `${count} risks`
        : `${count} signals`;

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <button
        className="hover:bg-muted/40 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${styles.bg} ${styles.text}`}
          >
            {label}
          </span>
          <svg
            className={`text-muted-foreground h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-border divide-border divide-y border-t px-4 pb-3">
          {findings.map((f, i) => {
            const dot = SENTIMENT_STYLES[f.sentiment].dot;
            return (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <span
                  className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: dot }}
                />
                <p
                  className="text-foreground text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: f.text.replace(
                      /\*\*(.+?)\*\*/g,
                      "<strong>$1</strong>",
                    ),
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SwotGrid({ data }: { data: SwotData }) {
  const cells = [
    {
      label: "Strengths",
      items: data.strengths,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Weaknesses",
      items: data.weaknesses,
      color: "text-red-500 dark:text-red-400",
    },
    {
      label: "Opportunities",
      items: data.opportunities,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Threats",
      items: data.threats,
      color: "text-amber-600 dark:text-amber-400",
    },
  ];
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg">
      {cells.map((c) => (
        <div key={c.label} className="bg-background p-3">
          <p
            className={`mb-2 text-xs font-medium tracking-widest uppercase ${c.color}`}
          >
            {c.label}
          </p>
          <ul className="space-y-1">
            {c.items.map((item, i) => (
              <li
                key={i}
                className="text-muted-foreground text-xs leading-relaxed before:content-['·_']"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  data,
  title,
}: {
  data: ChartDataPoint[];
  title: string;
}) {
  return (
    <div className="border-border rounded-lg border p-4">
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        {title}
      </p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={1}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color ?? COLORS[i % COLORS.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`${v}%`, ""]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "0.5px solid var(--border)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {data.map((d, i) => (
            <div
              key={i}
              className="text-muted-foreground flex items-center gap-1.5 text-xs"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                style={{
                  backgroundColor: d.color ?? COLORS[i % COLORS.length],
                }}
              />
              <span className="truncate">{d.label}</span>
              <span className="text-foreground ml-auto font-medium">
                {d.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompetitorBars({ data }: { data: ChartDataPoint[] }) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }));
  return (
    <div className="border-border rounded-lg border p-4">
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Competitor comparison
      </p>
      <ResponsiveContainer width="100%" height={data.length * 44 + 20}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "0.5px solid var(--border)",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={data[i]?.color ?? COLORS[i % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
export function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="bg-muted h-6 w-48 rounded" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-muted h-16 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted h-44 rounded-lg" />
        <div className="bg-muted h-44 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-muted h-12 rounded-lg" />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function VisualReport({ data }: { data: ReportData }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-medium">{data.target}</h2>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
            {data.lookbackYears && (
              <span>↩ {data.lookbackYears}-year lookback</span>
            )}
            {data.sources && <span>· {data.sources}</span>}
            {data.generatedAt && <span>· {data.generatedAt}</span>}
          </div>
        </div>
        <button
          className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-xs transition-colors"
          onClick={() => window.print()}
        >
          ↓ Export PDF
        </button>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-muted-foreground border-border border-l-2 pl-3 text-sm leading-relaxed">
          {data.summary}
        </p>
      )}

      {/* Metric cards */}
      {data.metrics?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {data.metrics.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      )}

      {/* Charts row */}
      {(data.marketShare ||
        data.revenueBreakdown ||
        data.competitorComparison) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.marketShare && (
            <DonutChart data={data.marketShare} title="Market share" />
          )}
          {data.revenueBreakdown && (
            <DonutChart
              data={data.revenueBreakdown}
              title="Revenue breakdown"
            />
          )}
          {data.competitorComparison && (
            <div className="md:col-span-2">
              <CompetitorBars data={data.competitorComparison} />
            </div>
          )}
        </div>
      )}

      {/* Collapsible analysis sections */}
      {data.sections?.length > 0 && (
        <div className="space-y-2">
          {data.sections.map((s) => (
            <CollapsibleSection key={s.id} {...s} />
          ))}
        </div>
      )}

      {/* SWOT */}
      {data.swot && <SwotGrid data={data.swot} />}
    </div>
  );
}
