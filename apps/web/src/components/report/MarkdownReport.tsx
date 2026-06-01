"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * MarkdownReport.tsx
 *
 * Drop-in replacement for raw text display.
 * 1. Extracts numbers from text → renders metric cards + mini charts
 * 2. Splits markdown by ## headings → collapsible sections
 * 3. Renders markdown properly with react-markdown
 *
 * Usage:
 *   <MarkdownReport text={rawMarkdownText} skill="serenity" query="Tesla" />
 *
 * Install: pnpm add react-markdown remark-gfm
 */

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";
import remarkGfm from "remark-gfm";

// ── Types ────────────────────────────────────────────────────────────────────
interface Section {
  id: string;
  title: string;
  body: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface ExtractedMetric {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
}

interface ExtractedChart {
  type: "bar" | "pie";
  title: string;
  data: { label: string; value: number; color: string }[];
}

// ── Color map per skill ──────────────────────────────────────────────────────
const SKILL_COLORS: Record<string, string> = {
  serenity: "#3266ad",
  fundamental: "#639922",
  macro: "#EF9F27",
  technical: "#7c3aed",
  sentiment: "#0a5c5c",
  risk: "#E24B4A",
};

const CHART_PALETTE = [
  "#3266ad",
  "#E24B4A",
  "#639922",
  "#EF9F27",
  "#888780",
  "#7c3aed",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Split markdown string into H2/H3 sections */
function parseSections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h2 = line.match(/^#{2,3}\s+(.+)/);
    if (h2) {
      if (current) {
        sections.push(toSection(current.title, current.lines.join("\n")));
      }
      current = { title: h2[1]?.trim() ?? "", lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current)
    sections.push(toSection(current.title, current.lines.join("\n")));
  return sections;
}

function toSection(title: string, body: string): Section {
  const lower = title.toLowerCase() + body.toLowerCase();
  const sentiment: Section["sentiment"] =
    lower.includes("bull") ||
    lower.includes("strength") ||
    lower.includes("opportunity")
      ? "positive"
      : lower.includes("bear") ||
          lower.includes("risk") ||
          lower.includes("threat") ||
          lower.includes("weakness")
        ? "negative"
        : "neutral";
  return {
    id: title.replace(/\s+/g, "-").toLowerCase(),
    title,
    body: body.trim(),
    sentiment,
  };
}

/** Extract key metrics from raw text using regex patterns */
function extractMetrics(text: string): ExtractedMetric[] {
  const metrics: ExtractedMetric[] = [];
  const seen = new Set<string>();

  const patterns: [RegExp, string, ExtractedMetric["trend"]][] = [
    [/market\s*share[:\s]+~?([\d.]+)%/gi, "Market share", "neutral"],
    [/gross\s*margin[:\s]+~?([\d.]+)%/gi, "Gross margin", "neutral"],
    [/revenue.*?\$([\d.]+[BM])/gi, "Revenue", "neutral"],
    [/p\/e.*?([\d.]+)x/gi, "P/E ratio", "neutral"],
    [/ev\/ebitda.*?([\d.]+)x/gi, "EV/EBITDA", "neutral"],
    [/(\d+)\s*points?\s+checklist/gi, "Checklist points", "neutral"],
    [/\+([\d.]+)%\s*(?:yoy|year)/gi, "YoY growth", "up"],
    [/-([\d.]+)%\s*(?:yoy|year)/gi, "YoY change", "down"],
    [/short\s*interest.*?([\d.]+)%/gi, "Short interest", "neutral"],
    [/(\d+)\/14\s*(?:positive|points?|score)/gi, "Checklist score", "neutral"],
  ];

  for (const [regex, label, trend] of patterns) {
    const m = [...text.matchAll(regex)];
    if (m.length > 0 && !seen.has(label)) {
      seen.add(label);
      metrics.push({ label, value: m[0]?.[1] ?? "", trend });
    }
  }
  return metrics.slice(0, 5);
}

/** Extract competitor/market share data for charts */
function extractChartData(text: string): ExtractedChart | null {
  // Look for market share pattern: "Company X%"
  const sharePattern = /([A-Z][a-zA-Z/]+)\s+(\d{1,2}(?:\.\d)?)\s*%/g;
  const shares: { label: string; value: number }[] = [];
  const seen = new Set<string>();

  for (const m of text.matchAll(sharePattern)) {
    const label = m[1]?.trim() ?? "";
    const value = parseFloat(m[2] ?? "0");
    if (!seen.has(label) && value > 1 && value < 80 && shares.length < 6) {
      seen.add(label);
      shares.push({ label, value });
    }
  }

  if (shares.length >= 2) {
    return {
      type: "pie",
      title: "Market share distribution",
      data: shares.map((s, i) => ({
        ...s,
        color: CHART_PALETTE[i % CHART_PALETTE.length] ?? "#888780",
      })),
    };
  }

  // Look for checklist scoring table rows ✅/❌
  const passCount = (text.match(/✅/g) || []).length;
  const failCount = (text.match(/❌/g) || []).length;
  const warnCount = (text.match(/⚠️/g) || []).length;
  if (passCount + failCount + warnCount > 2) {
    return {
      type: "bar",
      title: "14-point checklist results",
      data: [
        { label: "Pass ✅", value: passCount, color: "#639922" },
        { label: "Partial ⚠️", value: warnCount, color: "#EF9F27" },
        { label: "Fail ❌", value: failCount, color: "#E24B4A" },
      ],
    };
  }

  return null;
}

// ── Markdown renderer config ─────────────────────────────────────────────────
const MD_COMPONENTS = {
  h2: ({ children }: any) => (
    <h2 className="text-foreground mt-4 mb-2 text-sm font-medium">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-muted-foreground mt-3 mb-1.5 text-xs font-medium tracking-wide uppercase">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-foreground mb-2.5 text-sm leading-relaxed">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="text-foreground mb-2.5 list-disc space-y-1 pl-4 text-sm">
      {children}
    </ul>
  ),
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  table: ({ children }: any) => (
    <div className="border-border my-3 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }: any) => (
    <th className="text-muted-foreground border-border border-b px-3 py-2 text-left font-medium whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border-border text-foreground border-b px-3 py-2 align-top">
      {children}
    </td>
  ),
  strong: ({ children }: any) => (
    <strong className="text-foreground font-medium">{children}</strong>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-muted-foreground/30 text-muted-foreground my-2 border-l-2 pl-3 text-sm italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-4" />,
  code: ({ children, className }: any) =>
    className ? (
      <pre className="bg-muted my-2 overflow-x-auto rounded p-3 text-xs">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
        {children}
      </code>
    ),
};

// ── Section sentiment badge ───────────────────────────────────────────────────
const SENTIMENT_BADGE = {
  positive:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  negative: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  neutral:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-500",
};

// ── CollapsibleSection ────────────────────────────────────────────────────────
function CollapsibleSection({
  section,
  defaultOpen = false,
}: {
  section: Section;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const wordCount = section.body.split(/\s+/).length;

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <button
        className="hover:bg-muted/40 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{section.title}</span>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${SENTIMENT_BADGE[section.sentiment]}`}
          >
            {section.sentiment}
          </span>
          <span className="text-muted-foreground text-xs">{wordCount}w</span>
          <svg
            className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
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
        <div className="border-border border-t px-4 pt-2 pb-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {section.body}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

// ── MetricCards ───────────────────────────────────────────────────────────────
function MetricCards({ metrics }: { metrics: ExtractedMetric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {metrics.map((m, i) => (
        <div key={i} className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground mb-1 text-xs">{m.label}</p>
          <p className="text-xl leading-none font-medium">
            {m.value}
            {m.label.includes("%") || m.value.includes("%") ? "" : ""}
          </p>
          {m.trend && m.trend !== "neutral" && (
            <p
              className={`mt-1 text-xs ${m.trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
            >
              {m.trend === "up" ? "↑" : "↓"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── MiniChart ─────────────────────────────────────────────────────────────────
function MiniChart({ chart }: { chart: ExtractedChart }) {
  return (
    <div className="border-border mb-4 rounded-lg border p-4">
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        {chart.title}
      </p>

      {chart.type === "pie" ? (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={60}
                paddingAngle={1}
              >
                {chart.data.map((d, i) => (
                  <Cell key={i} fill={d.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`${v}%`]}
                contentStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5">
            {chart.data.map((d, i) => (
              <div
                key={i}
                className="text-muted-foreground flex items-center gap-2 text-xs"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: d.color }}
                />
                <span className="truncate">{d.label}</span>
                <span className="text-foreground ml-auto font-medium">
                  {d.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={80}>
          <BarChart
            data={chart.data}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {chart.data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface MarkdownReportProps {
  text: string;
  skill?: string;
  query?: string;
  timestamp?: string;
  year?: number;
}

export function MarkdownReport({
  text,
  skill = "serenity",
  query,
  timestamp,
  year,
}: MarkdownReportProps) {
  const sections = useMemo(() => parseSections(text), [text]);
  const metrics = useMemo(() => extractMetrics(text), [text]);
  const chart = useMemo(() => extractChartData(text), [text]);
  const accentColor = SKILL_COLORS[skill] ?? "#3266ad";

  // First section open by default if there's only 1, otherwise all collapsed
  const alwaysOpenFirst = sections.length === 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      {query && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              {skill.charAt(0).toUpperCase() + skill.slice(1)}
            </span>
            <span className="text-sm font-medium">{query}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {timestamp && <span>{timestamp}</span>}
            {year && <span>· {year}Y</span>}
            <span>· {sections.length} sections</span>
          </div>
        </div>
      )}

      {/* Metric cards extracted from text */}
      {metrics.length > 0 && <MetricCards metrics={metrics} />}

      {/* Auto-extracted chart */}
      {chart && <MiniChart chart={chart} />}

      {/* Collapsible sections */}
      {sections.length > 0 ? (
        <div className="space-y-2">
          {sections.map((s, i) => (
            <CollapsibleSection
              key={s.id}
              section={s}
              defaultOpen={alwaysOpenFirst && i === 0}
            />
          ))}
        </div>
      ) : (
        /* Fallback: no H2 headings found, render as single collapsible */
        <CollapsibleSection
          section={{
            id: "full",
            title: "Full analysis",
            body: text,
            sentiment: "neutral",
          }}
          defaultOpen={text.length < 800}
        />
      )}
    </div>
  );
}
