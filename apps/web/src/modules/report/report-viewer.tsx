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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui-web/card";

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

const PIE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
];

const CHART_LABELS = {
  metrics: "Key Metrics",
  radar: "Analysis Radar",
  dimensions: "Dimension Scores",
  marketShare: "Market Share Breakdown",
} as const;

const RADAR_DIMENSIONS = [
  {
    dimension: "Market Share",
    aliases: ["market share", "market position", "market size"],
  },
  {
    dimension: "Growth Quality",
    aliases: ["growth quality", "growth", "revenue growth"],
  },
  {
    dimension: "Competitive Position",
    aliases: ["competitive position", "competitive pressure", "moat"],
  },
  {
    dimension: "Financial Health",
    aliases: ["financial health", "financial quality", "margin", "cash flow"],
  },
  {
    dimension: "Antifragility",
    aliases: ["antifragility", "resilience", "risk resilience"],
  },
  {
    dimension: "Innovation",
    aliases: ["innovation", "product velocity", "technology"],
  },
] as const;

const QUALITATIVE_SCORES: Record<string, number> = {
  excellent: 90,
  high: 82,
  strong: 82,
  good: 72,
  moderate: 58,
  medium: 58,
  mixed: 50,
  average: 50,
  low: 35,
  weak: 30,
  poor: 25,
  declining: 30,
};

const clampScore = (score: number) => Math.max(0, Math.min(score, 100));

function scoreFromText(value: string) {
  const numeric = value.match(
    /(?:score|rating)?\s*[:=]?\s*(\d{1,3})(?:\s*\/\s*100|\s*%)?/i,
  );

  if (numeric?.[1]) {
    return clampScore(Number.parseInt(numeric[1], 10));
  }

  const normalized = value.toLowerCase();
  const qualitative = Object.entries(QUALITATIVE_SCORES).find(([label]) =>
    normalized.includes(label),
  );

  return qualitative?.[1];
}

function findDimensionScore(content: string, aliases: readonly string[]) {
  const lines = content.split("\n");

  for (const alias of aliases) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlinePattern = new RegExp(
      `${escapedAlias}[^\\n|:]*[:|\\-–—]?\\s*([^\\n]+)`,
      "i",
    );
    const inlineMatch = content.match(inlinePattern);
    const inlineScore = inlineMatch?.[1]
      ? scoreFromText(inlineMatch[1])
      : undefined;

    if (inlineScore !== undefined) {
      return inlineScore;
    }

    const tableRow = lines.find((line) => {
      const lower = line.toLowerCase();
      return lower.includes("|") && lower.includes(alias);
    });
    const tableScore = tableRow ? scoreFromText(tableRow) : undefined;

    if (tableScore !== undefined) {
      return tableScore;
    }
  }
}

function parseMetricsFromMarkdown(content: string): MetricItem[] {
  const metrics: MetricItem[] = [];
  // Match patterns like "**Metric**: Value" or "| Metric | Value |"
  const patterns = [
    /\*\*(.+?)\*\*[:\s]+(.+?)(?:\n|$)/g,
    /\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g,
  ];

  const metricKeywords = [
    "market share",
    "市场份额",
    "growth",
    "增长",
    "competitive",
    "竞争",
    "antifragility",
    "抗脆弱",
    "risk",
    "风险",
    "valuation",
    "估值",
    "revenue",
    "收入",
    "营收",
    "margin",
    "利润率",
    "profit",
    "利润",
    "cash flow",
    "现金流",
    "moat",
    "护城河",
    "pressure",
    "压力",
    "quality",
    "质量",
    "intensity",
    "强度",
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const [, rawLabel, rawValue] = match;

      if (!rawLabel || !rawValue) {
        continue;
      }

      const label = rawLabel.trim().replace(/\|/g, "").replace(/\*\*/g, "");
      const value = rawValue.trim().replace(/\|/g, "").replace(/\*\*/g, "");

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
  return RADAR_DIMENSIONS.flatMap(({ dimension, aliases }) => {
    const score = findDimensionScore(content, aliases);

    return score === undefined ? [] : [{ dimension, score, fullMark: 100 }];
  });
}

function parsePieData(content: string) {
  // Try to find market share data
  const sharePattern =
    /(\w[\w\s&]+?)\s*(?:market\s*share|share)[:\s]+(\d+(?:\.\d+)?)\s*%/gi;
  const data: { name: string; value: number }[] = [];
  let match;

  while ((match = sharePattern.exec(content)) !== null) {
    const [, rawName, rawValue] = match;

    if (!rawName || !rawValue) {
      continue;
    }

    data.push({
      name: rawName.trim().slice(0, 20),
      value: Number.parseFloat(rawValue),
    });
  }

  return data;
}

// ── Technical Indicators ──

interface TechIndicator {
  name: string;
  value: string;
  signal?: "bullish" | "bearish" | "neutral";
  icon: string;
}

const TECH_PATTERNS: { name: string; icon: string; patterns: RegExp[] }[] = [
  {
    name: "MA 50/200",
    icon: "📉",
    patterns: [
      /(?:50[-\s]?day|MA50|MA\s*50|SMA\s*50)[^\n|]*?(?:above|below|golden|death|cross)[^\n]*/i,
      /(?:moving\s*average|MA)[^\n|]*(?:50|200)[^\n]*/i,
    ],
  },
  {
    name: "RSI (14)",
    icon: "⚡",
    patterns: [
      /RSI[^\n|]*?(?:\d{1,3}(?:\.\d+)?)[^\n]*/i,
      /(?:relative\s*strength)[^\n|]*?\d{1,3}[^\n]*/i,
    ],
  },
  {
    name: "MACD",
    icon: "🔀",
    patterns: [
      /MACD[^\n|]*?(?:bullish|bearish|signal|crossover|above|below|positive|negative)[^\n]*/i,
    ],
  },
  {
    name: "Bollinger Bands",
    icon: "📊",
    patterns: [
      /(?:bollinger|BB)[^\n|]*(?:upper|lower|squeeze|band|expand)[^\n]*/i,
    ],
  },
  {
    name: "Volume",
    icon: "📶",
    patterns: [
      /(?:volume|trading\s*volume)[^\n|]*(?:increase|decrease|surge|drop|average|above|below)[^\n]*/i,
    ],
  },
];

function parseTechIndicators(content: string): TechIndicator[] {
  const indicators: TechIndicator[] = [];

  for (const { name, icon, patterns } of TECH_PATTERNS) {
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match?.[0]) {
        const text = match[0].trim();
        const lower = text.toLowerCase();
        const signal =
          lower.includes("bullish") ||
          lower.includes("above") ||
          lower.includes("golden") ||
          lower.includes("positive") ||
          lower.includes("buy")
            ? ("bullish" as const)
            : lower.includes("bearish") ||
                lower.includes("below") ||
                lower.includes("death") ||
                lower.includes("negative") ||
                lower.includes("sell")
              ? ("bearish" as const)
              : ("neutral" as const);

        // Extract a short value from the match
        const valueMatch = text.match(
          /(?:\d{1,3}(?:\.\d+)?%?|above|below|bullish|bearish|neutral|positive|negative)/i,
        );
        const value = valueMatch?.[0] || text.slice(0, 30);

        indicators.push({ name, value, signal, icon });
        break;
      }
    }
  }

  return indicators;
}

function TechIndicatorPanel({ content }: { content: string }) {
  const indicators = useMemo(() => parseTechIndicators(content), [content]);

  if (indicators.length === 0) return null;

  const signalColors = {
    bullish: "text-green-600 bg-green-50 border-green-200",
    bearish: "text-red-600 bg-red-50 border-red-200",
    neutral: "text-amber-600 bg-amber-50 border-amber-200",
  };

  return (
    <div className="mb-6">
      <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
        {/* oxlint-disable-next-line i18next/no-literal-string */}
        <span>📐</span> Technical Indicators
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {indicators.map((ind) => (
          <div
            key={ind.name}
            className="border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
          >
            <span className="text-lg">{ind.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{ind.name}</p>
              <p className="text-muted-foreground truncate text-xs">
                {ind.value}
              </p>
            </div>
            {ind.signal && (
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${signalColors[ind.signal]}`}
              >
                {ind.signal}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metric Dashboard ──

function MetricDashboard({ metrics }: { metrics: MetricItem[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
        {CHART_LABELS.metrics}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="py-3">
            <CardContent className="px-4">
              <p className="text-muted-foreground truncate text-xs">
                {metric.label}
              </p>
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

  if (radarData.length === 0 && pieData.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      {/* Radar Chart */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{CHART_LABELS.radar}</CardTitle>
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
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{CHART_LABELS.dimensions}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
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
                <Bar
                  dataKey="score"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {CHART_LABELS.marketShare}
            </CardTitle>
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
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Evidence list parser ──

interface EvidenceItem {
  title: string;
  date?: string;
  url?: string;
  claim?: string;
}

function parseEvidenceList(content: string): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  // Find the evidence list section — supports:
  // - ## Evidence List / ## Sources / ## References (heading)
  // - **Evidence List** (bold text)
  const evidenceSection = content.match(
    /(?:^|\n)(?:#+\s*(?:Evidence|Sources?|References?)[^\n]*|\*\*Evidence[^*]*\*\*)\n([\s\S]*?)(?=\n(?:#{1,3}\s|\*\*(?!Eviden))|$)/i,
  );

  if (!evidenceSection?.[1]) return items;

  const lines = evidenceSection[1].split("\n");

  for (const line of lines) {
    const trimmed = line.replace(/^\s*[-*\d.]+\s*/, "").trim();
    if (!trimmed) continue;

    const mdLinkMatch = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const plainUrlMatch = trimmed.match(/(https?:\/\/[^\s|)\]]+)/);
    const url = mdLinkMatch?.[2] || plainUrlMatch?.[1];

    const dateMatch = trimmed.match(/\((\d{4}[-/]\d{2}(?:[-/]\d{2})?)\)/);
    const date = dateMatch?.[1];

    let title = "";
    if (mdLinkMatch?.[1]) {
      title = mdLinkMatch[1];
    } else {
      title = trimmed
        .replace(/https?:\/\/[^\s|)\]]+/g, "")
        .replace(/\([^)]*\d{4}[^)]*\)/g, "")
        .replace(/\*\*/g, "")
        .replace(/[—–\-:]+\s*$/, "")
        .trim();
      const parts = title.split(/[—–:]\s+/);
      if (parts.length > 1 && parts[0]) {
        title = parts[0].trim();
      }
    }

    const claimMatch = trimmed.match(/[—–:]\s*(.+?)(?:\s*https?:|$)/);
    const claim = claimMatch?.[1]?.trim();

    if (title) {
      items.push({ title, date, url, claim });
    }
  }

  return items;
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  return (
    <div className="group border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-3 transition-colors">
      <div className="bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold">
        📄
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary truncate text-sm font-medium underline-offset-2 hover:underline"
            >
              {item.title}
            </a>
          ) : (
            <span className="truncate text-sm font-medium">{item.title}</span>
          )}
          {item.date && (
            <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
              {item.date}
            </span>
          )}
        </div>
        {item.claim && (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {item.claim}
          </p>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/70 hover:text-primary mt-1.5 inline-flex items-center gap-1 text-xs"
          >
            <span className="truncate">
              {item.url.replace(/^https?:\/\//, "").slice(0, 50)}
            </span>
            <span className="shrink-0">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}

function EvidenceSection({ content }: { content: string }) {
  const items = useMemo(() => parseEvidenceList(content), [content]);

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
        {/* oxlint-disable-next-line i18next/no-literal-string */}
        <span>📎</span> Evidence List
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <EvidenceCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

// ── URL auto-linkifier for inline text ──

function linkifyText(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={match.index}
        href={match[1]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        {match[1]}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ── Markdown Renderer ──

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-foreground mt-8 mb-4 border-b pb-2 text-2xl font-bold first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const text = typeof children === "string" ? children : "";
    const sectionBadge = text.toLowerCase().includes("risk")
      ? "⚠️"
      : text.toLowerCase().includes("competitiv")
        ? "⚔️"
        : text.toLowerCase().includes("growth")
          ? "📈"
          : text.toLowerCase().includes("financial") ||
              text.toLowerCase().includes("valuation")
            ? "💰"
            : text.toLowerCase().includes("market")
              ? "📊"
              : text.toLowerCase().includes("conclusion") ||
                  text.toLowerCase().includes("summary")
                ? "✅"
                : text.toLowerCase().includes("antifragil")
                  ? "🛡️"
                  : text.toLowerCase().includes("evidence") ||
                      text.toLowerCase().includes("source")
                    ? "📎"
                    : null;

    return (
      <h2 className="text-foreground mt-6 mb-3 flex items-center gap-2 text-xl font-semibold">
        {sectionBadge && <span>{sectionBadge}</span>}
        {children}
      </h2>
    );
  },
  h3: ({ children }) => (
    <h3 className="text-foreground mt-4 mb-2 text-lg font-semibold">
      {children}
    </h3>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="text-foreground border-b px-4 py-2.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border/50 border-b px-4 py-2">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1.5 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-primary/30 bg-muted/30 my-3 rounded-r border-l-4 py-1 pl-4 text-sm italic">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="text-foreground font-semibold">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary font-medium underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-muted/50 my-3 block overflow-x-auto rounded-lg p-4 font-mono text-xs">
        {children}
      </code>
    );
  },
  hr: () => <hr className="border-border my-6" />,
  p: ({ children }) => {
    if (typeof children === "string") {
      const linked = linkifyText(children);
      return <p className="my-2 text-sm leading-7">{linked}</p>;
    }
    return <p className="my-2 text-sm leading-7">{children}</p>;
  },
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

      {/* Evidence List - clickable links */}
      <EvidenceSection content={content} />

      {/* Technical Indicators */}
      <TechIndicatorPanel content={content} />

      {/* Markdown Content */}
      <Card>
        <CardContent className="prose-sm p-6">
          <ReactMarkdown components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
