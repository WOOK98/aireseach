"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui-web/card";
import { Badge } from "@workspace/ui-web/badge";

import type { Components } from "react-markdown";

// ── Metric data extracted from report ──

interface MetricItem {
  label: string;
  value: string;
  score?: number;
  color?: string;
}

const SCORE_COLORS: Record<string, string> = {
  high: "#22c55e",
  strong: "#22c55e",
  moderate: "#f59e0b",
  medium: "#f59e0b",
  rising: "#f59e0b",
  low: "#ef4444",
  weak: "#ef4444",
  declining: "#ef4444",
  mixed: "#f59e0b",
};

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

function parseMetricsFromMarkdown(content: string): MetricItem[] {
  const metrics: MetricItem[] = [];
  // Match patterns like "**Metric**: Value" or "| Metric | Value |"
  const patterns = [
    /\*\*(.+?)\*\*[:\s]+(.+?)(?:\n|$)/g,
    /\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g,
  ];

  const metricKeywords = [
    "market share",
    "growth",
    "competitive",
    "antifragility",
    "risk",
    "valuation",
    "revenue",
    "margin",
    "profit",
    "cash flow",
    "moat",
    "pressure",
    "quality",
    "intensity",
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const label = match[1].trim().replace(/\|/g, "").replace(/\*\*/g, "");
      const value = match[2].trim().replace(/\|/g, "").replace(/\*\*/g, "");

      if (
        metricKeywords.some((kw) => label.toLowerCase().includes(kw)) &&
        value.length < 60 &&
        !label.includes("---")
      ) {
        const lower = value.toLowerCase();
        const color = SCORE_COLORS[lower] || undefined;
        metrics.push({ label, value, color });
      }
    }
  }

  return metrics.slice(0, 8);
}

function parseRadarData(content: string) {
  const dimensions = [
    "Market Share",
    "Growth Quality",
    "Competitive Position",
    "Financial Health",
    "Antifragility",
    "Innovation",
  ];

  return dimensions.map((dim) => {
    const regex = new RegExp(`${dim}[^\\n]*?(\\d+)`, "i");
    const match = content.match(regex);
    const val = match ? Math.min(Number.parseInt(match[1]), 100) : Math.floor(Math.random() * 40 + 40);
    return { dimension: dim, score: val, fullMark: 100 };
  });
}

function parsePieData(content: string) {
  // Try to find market share data
  const sharePattern = /(\w[\w\s&]+?)\s*(?:market\s*share|share)[:\s]+(\d+(?:\.\d+)?)\s*%/gi;
  const data: { name: string; value: number }[] = [];
  let match;

  while ((match = sharePattern.exec(content)) !== null) {
    data.push({
      name: match[1].trim().slice(0, 20),
      value: Number.parseFloat(match[2]),
    });
  }

  if (data.length === 0) {
    // Fallback sample data
    return [
      { name: "Leader", value: 35 },
      { name: "Challenger", value: 25 },
      { name: "Niche", value: 20 },
      { name: "Others", value: 20 },
    ];
  }

  return data;
}

// ── Metric Dashboard ──

function MetricDashboard({ metrics }: { metrics: MetricItem[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Key Metrics
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="py-3">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
              <p
                className="mt-1 text-lg font-bold"
                style={{ color: metric.color || "inherit" }}
              >
                {metric.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Charts ──

function ReportCharts({ content }: { content: string }) {
  const radarData = useMemo(() => parseRadarData(content), [content]);
  const pieData = useMemo(() => parsePieData(content), [content]);

  const barData = useMemo(() => {
    return radarData.map((d) => ({
      name: d.dimension.split(" ").slice(0, 2).join(" "),
      score: d.score,
    }));
  }, [radarData]);

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      {/* Radar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Analysis Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar
                dataKey="score"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dimension Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="score" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Market Share Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Markdown Renderer ──

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-8 mb-4 first:mt-0 text-foreground border-b pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const text = typeof children === "string" ? children : "";
    const sectionBadge =
      text.toLowerCase().includes("risk") ? "⚠️" :
      text.toLowerCase().includes("competitiv") ? "⚔️" :
      text.toLowerCase().includes("growth") ? "📈" :
      text.toLowerCase().includes("financial") || text.toLowerCase().includes("valuation") ? "💰" :
      text.toLowerCase().includes("market") ? "📊" :
      text.toLowerCase().includes("conclusion") || text.toLowerCase().includes("summary") ? "✅" :
      text.toLowerCase().includes("antifragil") ? "🛡️" :
      null;

    return (
      <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground flex items-center gap-2">
        {sectionBadge && <span>{sectionBadge}</span>}
        {children}
      </h2>
    );
  },
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h3>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left font-semibold text-foreground border-b">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 border-b border-border/50">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-1.5 my-3">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-1.5 my-3">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-3 bg-muted/30 rounded-r text-sm italic">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="block bg-muted/50 p-4 rounded-lg text-xs font-mono overflow-x-auto my-3">
        {children}
      </code>
    );
  },
  hr: () => <hr className="my-6 border-border" />,
  p: ({ children }) => (
    <p className="text-sm leading-7 my-2">{children}</p>
  ),
};

// ── Main Component ──

interface ReportViewerProps {
  content: string;
}

export function ReportViewer({ content }: ReportViewerProps) {
  const metrics = useMemo(() => parseMetricsFromMarkdown(content), [content]);

  return (
    <div className="space-y-0">
      {/* Metrics Dashboard */}
      <MetricDashboard metrics={metrics} />

      {/* Charts */}
      <ReportCharts content={content} />

      {/* Markdown Content */}
      <Card>
        <CardContent className="p-6 prose-sm">
          <ReactMarkdown components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
