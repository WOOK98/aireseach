"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  Activity,
  BarChart3,
  CandlestickChart,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  Gauge,
  LineChartIcon,
  RadarIcon,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  LineChart,
  Line,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";

import { cn } from "@workspace/ui";
import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import {
  Card,
  CardContent,
  CardDescription,
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

interface StructuredMetric {
  indicator: string;
  current: string;
  trend: string;
  confidence: string;
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
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(var(--primary))",
];

const CHART_LABELS = {
  metrics: "Key Metrics",
  overview: "Market Intelligence Dashboard",
  radar: "Strategic Radar",
  dimensions: "Dimension Scores",
  marketShare: "Market Share Breakdown",
  technical: "Technical Setup",
} as const;

const SIGNAL_STYLES = {
  bullish:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  bearish: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  neutral:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
} as const;

const SIGNAL_LABELS = {
  bullish: "Bullish",
  bearish: "Bearish",
  neutral: "Neutral",
} as const;

const SIGNAL_SCORES = {
  bullish: 78,
  neutral: 50,
  bearish: 28,
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

const compactText = (text: string, maxLength = 96) =>
  text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

const normalizeCell = (value: string) =>
  value
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[-:：]+|[-:：]+$/g, "")
    .trim();

const isSeparatorCell = (value: string) => /^[-—–\s]+$/.test(value.trim());

const sectionHeadingPattern =
  /(?:核心指標儀表板|核心指標|Key Metrics|Metric Dashboard|KPI Dashboard|Evidence List|Evidence|Sources?|References?|證據列表|證據|來源|參考)/i;

const getSignalIcon = (signal: TechIndicator["signal"]) => {
  if (signal === "bullish") {
    return TrendingUp;
  }

  if (signal === "bearish") {
    return TrendingDown;
  }

  return Activity;
};

const getSignalScore = (signal: TechIndicator["signal"]) =>
  signal ? SIGNAL_SCORES[signal] : SIGNAL_SCORES.neutral;

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
    "市場份額",
    "growth",
    "增長",
    "competitive",
    "競爭",
    "antifragility",
    "抗脆弱",
    "risk",
    "風險",
    "valuation",
    "估值",
    "revenue",
    "收入",
    "營收",
    "margin",
    "利潤率",
    "profit",
    "利潤",
    "cash flow",
    "現金流",
    "moat",
    "護城河",
    "pressure",
    "壓力",
    "quality",
    "質量",
    "intensity",
    "強度",
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

function extractSection(content: string, heading: RegExp) {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => heading.test(line));

  if (start === -1) {
    return "";
  }

  const collected: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const isNextSection =
      /^#{1,3}\s+/.test(line) ||
      (/^\s*\*\*[^*]+\*\*\s*$/.test(line) &&
        sectionHeadingPattern.test(line) &&
        !heading.test(line));

    if (isNextSection) {
      break;
    }

    collected.push(line);
  }

  return collected.join("\n").trim();
}

function parseStructuredMetrics(content: string): StructuredMetric[] {
  const section = extractSection(
    content,
    /(?:核心指標儀表板|核心指標|Key Metrics|Metric Dashboard|KPI Dashboard)/i,
  );

  if (!section) {
    return [];
  }

  const rows: StructuredMetric[] = [];
  const tableLines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("|"));

  for (const line of tableLines) {
    const cells = line
      .split("|")
      .map(normalizeCell)
      .filter((cell) => cell && !isSeparatorCell(cell));
    const headerText = cells.join(" ").toLowerCase();

    if (
      cells.length >= 4 &&
      !headerText.includes("indicator") &&
      !headerText.includes("current") &&
      !headerText.includes("資料可信度")
    ) {
      rows.push({
        indicator: cells[0] ?? "",
        current: cells[1] ?? "",
        trend: cells[2] ?? "",
        confidence: cells[3] ?? "",
      });
    }
  }

  if (rows.length > 0) {
    return rows.slice(0, 12);
  }

  const cells = section
    .replace(/\|\|/g, "|")
    .split("|")
    .map(normalizeCell)
    .filter((cell) => cell && !isSeparatorCell(cell));
  const dataCells = cells.filter((cell) => {
    const lower = cell.toLowerCase();
    return ![
      "指標",
      "indicator",
      "當前數值",
      "current value",
      "趨勢",
      "trend",
      "資料可信度",
      "confidence",
    ].includes(lower);
  });

  for (let index = 0; index + 3 < dataCells.length; index += 4) {
    rows.push({
      indicator: dataCells[index] ?? "",
      current: dataCells[index + 1] ?? "",
      trend: dataCells[index + 2] ?? "",
      confidence: dataCells[index + 3] ?? "",
    });
  }

  return rows.filter((row) => row.indicator && row.current).slice(0, 12);
}

function stripGeneratedSections(content: string) {
  const lines = content.split("\n");
  const output: string[] = [];
  let skip = false;

  for (const line of lines) {
    const isHeading =
      /^#{1,3}\s+/.test(line) || /^\s*\*\*[^*]+\*\*\s*$/.test(line);
    const shouldSkip =
      isHeading &&
      /(?:核心指標儀表板|核心指標|Key Metrics|Metric Dashboard|KPI Dashboard|Evidence List|Evidence|Sources?|References?|證據列表|證據|來源|參考)/i.test(
        line,
      );

    if (shouldSkip) {
      skip = true;
      continue;
    }

    if (skip && isHeading) {
      skip = false;
    }

    if (!skip) {
      output.push(line);
    }
  }

  return output.join("\n").trim();
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
  detail: string;
  numericValue?: number;
}

const TECH_PATTERNS: { name: string; icon: string; patterns: RegExp[] }[] = [
  {
    name: "MA 50/200",
    icon: "📉",
    patterns: [
      /(?:50[-\s]?day|MA50|MA\s*50|SMA\s*50)[^\n|]*?(?:above|below|golden|death|cross)[^\n]*/i,
      /(?:moving\s*average|MA)[^\n|]*(?:50|200)[^\n]*/i,
      /(?:均線|移動平均|MA\s*50|MA\s*200)[^\n|]*(?:上方|下方|金叉|死叉|交叉|突破)[^\n]*/i,
    ],
  },
  {
    name: "RSI (14)",
    icon: "⚡",
    patterns: [
      /RSI[^\n|]*?(?:\d{1,3}(?:\.\d+)?)[^\n]*/i,
      /(?:relative\s*strength)[^\n|]*?\d{1,3}[^\n]*/i,
      /(?:相對強弱|強弱指標|RSI)[^\n|]*?\d{1,3}[^\n]*/i,
    ],
  },
  {
    name: "MACD",
    icon: "🔀",
    patterns: [
      /MACD[^\n|]*?(?:bullish|bearish|signal|crossover|above|below|positive|negative)[^\n]*/i,
      /MACD[^\n|]*(?:看漲|看跌|金叉|死叉|訊號線|正值|負值)[^\n]*/i,
    ],
  },
  {
    name: "Bollinger Bands",
    icon: "📊",
    patterns: [
      /(?:bollinger|BB)[^\n|]*(?:upper|lower|squeeze|band|expand)[^\n]*/i,
      /(?:布林|BOLL|BB)[^\n|]*(?:上軌|下軌|收窄|擴張|突破)[^\n]*/i,
    ],
  },
  {
    name: "Volume",
    icon: "📶",
    patterns: [
      /(?:volume|trading\s*volume)[^\n|]*(?:increase|decrease|surge|drop|average|above|below)[^\n]*/i,
      /(?:成交量|交易量|量能)[^\n|]*(?:放大|萎縮|高於|低於|平均)[^\n]*/i,
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
          lower.includes("buy") ||
          text.includes("看漲") ||
          text.includes("金叉") ||
          text.includes("上方") ||
          text.includes("突破") ||
          text.includes("放大") ||
          text.includes("高於")
            ? ("bullish" as const)
            : lower.includes("bearish") ||
                lower.includes("below") ||
                lower.includes("death") ||
                lower.includes("negative") ||
                lower.includes("sell") ||
                text.includes("死叉") ||
                text.includes("看跌") ||
                text.includes("下方") ||
                text.includes("萎縮") ||
                text.includes("低於")
              ? ("bearish" as const)
              : ("neutral" as const);

        // Extract a short value from the match
        const valueMatch = text.match(
          /(?:\d{1,3}(?:\.\d+)?%?|above|below|bullish|bearish|neutral|positive|negative|金叉|死叉|上方|下方|看漲|看跌)/i,
        );
        const value = valueMatch?.[0] || text.slice(0, 30);
        const numericValue = valueMatch?.[0]?.match(/\d/)
          ? Number.parseFloat(valueMatch[0])
          : undefined;

        indicators.push({
          name,
          value,
          signal,
          icon,
          detail: compactText(text, 140),
          numericValue,
        });
        break;
      }
    }
  }

  return indicators;
}

function TechIndicatorPanel({ content }: { content: string }) {
  const indicators = useMemo(() => parseTechIndicators(content), [content]);
  const [view, setView] = useState<"strength" | "details">("strength");

  if (indicators.length === 0) return null;

  const bullishCount = indicators.filter(
    (item) => item.signal === "bullish",
  ).length;
  const bearishCount = indicators.filter(
    (item) => item.signal === "bearish",
  ).length;
  const overallSignal =
    bullishCount > bearishCount
      ? "bullish"
      : bearishCount > bullishCount
        ? "bearish"
        : "neutral";
  const overallScore = Math.round(
    indicators.reduce((sum, item) => sum + getSignalScore(item.signal), 0) /
      indicators.length,
  );
  const chartData = indicators.map((item) => ({
    name: item.name.replace("Bollinger Bands", "Bollinger"),
    signal: getSignalScore(item.signal),
    value: item.numericValue ?? getSignalScore(item.signal),
  }));

  return (
    <Card className="border-primary/15 bg-card/95 mb-6 overflow-hidden shadow-sm">
      <CardHeader className="border-border/60 flex flex-row items-start justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
              <CandlestickChart className="size-4" />
            </div>
            <CardTitle className="text-base">
              {CHART_LABELS.technical}
            </CardTitle>
          </div>
          <CardDescription className="mt-2">
            Classic market indicators extracted from the report narrative.
          </CardDescription>
        </div>
        <Badge className={SIGNAL_STYLES[overallSignal]} variant="outline">
          {SIGNAL_LABELS[overallSignal]} {overallScore}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <span className="text-muted-foreground block">Bullish</span>
              <span className="font-semibold text-emerald-600">
                {bullishCount}
              </span>
            </div>
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2">
              <span className="text-muted-foreground block">Neutral</span>
              <span className="font-semibold text-amber-600">
                {indicators.filter((item) => item.signal === "neutral").length}
              </span>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2">
              <span className="text-muted-foreground block">Bearish</span>
              <span className="font-semibold text-red-600">{bearishCount}</span>
            </div>
          </div>
          <div className="bg-muted/40 inline-flex rounded-md border p-1">
            {(["strength", "details"] as const).map((item) => (
              <Button
                key={item}
                size="xs"
                variant={view === item ? "secondary" : "ghost"}
                onClick={() => setView(item)}
              >
                {item === "strength" ? "Signal chart" : "Indicator cards"}
              </Button>
            ))}
          </div>
        </div>

        {view === "strength" ? (
          <div className="bg-background/70 h-[260px] rounded-lg border p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 4, right: 16 }}>
                <defs>
                  <linearGradient id="signalFill" x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.34}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                  width={32}
                />
                <ReferenceLine
                  y={50}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 12px 40px rgb(0 0 0 / 0.12)",
                    fontSize: 12,
                  }}
                />
                <Area
                  dataKey="signal"
                  fill="url(#signalFill)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {indicators.map((ind) => {
              const SignalIcon = getSignalIcon(ind.signal);

              return (
                <div
                  key={ind.name}
                  className="border-border/70 bg-background/70 hover:border-primary/30 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex size-9 items-center justify-center rounded-md text-base">
                        {ind.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{ind.name}</p>
                        <p className="text-muted-foreground text-xs">
                          Current read: {ind.value}
                        </p>
                      </div>
                    </div>
                    {ind.signal && (
                      <Badge
                        className={SIGNAL_STYLES[ind.signal]}
                        variant="outline"
                      >
                        <SignalIcon className="size-3" />
                        {SIGNAL_LABELS[ind.signal]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                    {ind.detail}
                  </p>
                  <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        ind.signal === "bullish"
                          ? "bg-emerald-500"
                          : ind.signal === "bearish"
                            ? "bg-red-500"
                            : "bg-amber-500",
                      )}
                      style={{ width: `${getSignalScore(ind.signal)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Metric Dashboard ──

function MetricDashboard({ metrics }: { metrics: MetricItem[] }) {
  if (metrics.length === 0) return null;

  return (
    <Card className="border-primary/15 mb-6 overflow-hidden shadow-sm">
      <CardHeader className="border-border/60 flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="text-primary size-4" />
            {CHART_LABELS.metrics}
          </CardTitle>
          <CardDescription>
            Extracted signals, operating metrics, and risk markers.
          </CardDescription>
        </div>
        <Badge variant="outline">{metrics.length} signals</Badge>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="group border-border/70 bg-background/70 hover:border-primary/30 rounded-lg border p-4 transition-colors"
            >
              <p className="text-muted-foreground truncate text-xs">
                {metric.label}
              </p>
              <p
                className="mt-2 truncate text-xl font-semibold tracking-tight"
                style={{ color: metric.color || "inherit" }}
              >
                {metric.value}
              </p>
              <div className="bg-muted mt-3 h-1 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all group-hover:w-full"
                  style={{
                    width: `${metric.score ?? scoreFromText(metric.value) ?? 54}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StructuredMetricTable({ metrics }: { metrics: StructuredMetric[] }) {
  const [layout, setLayout] = useState<"cards" | "table">("cards");

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/15 mb-6 overflow-hidden shadow-sm">
      <CardHeader className="border-border/60 flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="text-primary size-4" />
            Core Metrics Dashboard
          </CardTitle>
          <CardDescription>
            Normalized from the generated markdown into scan-friendly data.
          </CardDescription>
        </div>
        <div className="bg-muted/40 inline-flex rounded-md border p-1">
          {(["cards", "table"] as const).map((item) => (
            <Button
              key={item}
              onClick={() => setLayout(item)}
              size="xs"
              variant={layout === item ? "secondary" : "ghost"}
            >
              {item === "cards" ? "Cards" : "Table"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {layout === "cards" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => {
              const score = scoreFromText(
                `${metric.current} ${metric.trend} ${metric.confidence}`,
              );
              const confidenceTone =
                metric.confidence.includes("高") ||
                metric.confidence.toLowerCase().includes("high")
                  ? "success"
                  : "outline";

              return (
                <div
                  key={`${metric.indicator}-${metric.current}`}
                  className="border-border/70 bg-background/70 hover:border-primary/30 rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {metric.indicator}
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-tight">
                        {metric.current}
                      </p>
                    </div>
                    <Badge variant={confidenceTone}>{metric.confidence}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {metric.trend}
                  </p>
                  <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${score ?? 68}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="border-b px-4 py-3 text-left font-semibold">
                    Indicator
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold">
                    Current
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold">
                    Trend
                  </th>
                  <th className="border-b px-4 py-3 text-left font-semibold">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr
                    key={`${metric.indicator}-${metric.current}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="border-border/50 border-b px-4 py-3 font-medium">
                      {metric.indicator}
                    </td>
                    <td className="border-border/50 border-b px-4 py-3">
                      {metric.current}
                    </td>
                    <td className="border-border/50 border-b px-4 py-3">
                      {metric.trend}
                    </td>
                    <td className="border-border/50 border-b px-4 py-3">
                      {metric.confidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Charts ──

function ReportCharts({ content }: { content: string }) {
  const radarData = useMemo(() => parseRadarData(content), [content]);
  const pieData = useMemo(() => parsePieData(content), [content]);
  const [activeChart, setActiveChart] = useState<"radar" | "bars" | "share">(
    "radar",
  );

  const barData = useMemo(() => {
    return radarData.map((d) => ({
      name: d.dimension.split(" ").slice(0, 2).join(" "),
      score: d.score,
    }));
  }, [radarData]);

  if (radarData.length === 0 && pieData.length === 0) {
    return null;
  }

  const averageScore =
    radarData.length > 0
      ? Math.round(
          radarData.reduce((sum, item) => sum + item.score, 0) /
            radarData.length,
        )
      : null;
  const strongestDimension = [...radarData].sort(
    (a, b) => b.score - a.score,
  )[0];
  const hasMarketShare = pieData.length > 0;
  const tabs = [
    {
      id: "radar",
      label: "Radar",
      icon: RadarIcon,
      disabled: radarData.length === 0,
    },
    {
      id: "bars",
      label: "Scores",
      icon: BarChart3,
      disabled: barData.length === 0,
    },
    {
      id: "share",
      label: "Share",
      icon: CircleDollarSign,
      disabled: !hasMarketShare,
    },
  ] as const;

  return (
    <Card className="border-primary/15 mb-6 overflow-hidden shadow-sm">
      <CardHeader className="border-border/60 border-b pb-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="text-primary size-4" />
              {CHART_LABELS.overview}
            </CardTitle>
            <CardDescription>
              Interactive views of strategic scores and market composition.
            </CardDescription>
          </div>
          <div className="bg-muted/40 inline-flex w-fit rounded-md border p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeChart === tab.id;

              return (
                <Button
                  key={tab.id}
                  disabled={tab.disabled}
                  size="xs"
                  variant={selected ? "secondary" : "ghost"}
                  onClick={() => setActiveChart(tab.id)}
                >
                  <Icon className="size-3" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[260px_1fr]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="bg-background/70 rounded-lg border p-4">
            <span className="text-muted-foreground text-xs">
              Composite score
            </span>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold">
                {averageScore ?? "N/A"}
              </span>
              {averageScore !== null && (
                <span className="text-muted-foreground pb-1 text-xs">/100</span>
              )}
            </div>
          </div>
          <div className="bg-background/70 rounded-lg border p-4">
            <span className="text-muted-foreground text-xs">
              Strongest dimension
            </span>
            <p className="mt-2 text-sm font-semibold">
              {strongestDimension?.dimension ?? "Awaiting data"}
            </p>
          </div>
          <div className="bg-background/70 rounded-lg border p-4">
            <span className="text-muted-foreground text-xs">Coverage</span>
            <p className="mt-2 text-sm font-semibold">
              {radarData.length} dimensions
            </p>
          </div>
        </div>

        <div className="bg-background/70 min-h-[340px] rounded-lg border p-3">
          {activeChart === "radar" && radarData.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar
                  dataKey="score"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.24}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 12px 40px rgb(0 0 0 / 0.12)",
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}

          {activeChart === "bars" && barData.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} layout="vertical" margin={{ right: 18 }}>
                <CartesianGrid
                  horizontal={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  type="number"
                />
                <YAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  type="category"
                  width={96}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 12px 40px rgb(0 0 0 / 0.12)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="score"
                  fill="hsl(var(--primary))"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {activeChart === "share" && pieData.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  cx="50%"
                  cy="48%"
                  data={pieData}
                  dataKey="value"
                  innerRadius={72}
                  outerRadius={104}
                  paddingAngle={3}
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
                    boxShadow: "0 12px 40px rgb(0 0 0 / 0.12)",
                    fontSize: 12,
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportExecutiveHeader({
  content,
  metrics,
}: {
  content: string;
  metrics: MetricItem[];
}) {
  const techIndicators = useMemo(() => parseTechIndicators(content), [content]);
  const evidenceItems = useMemo(() => parseEvidenceList(content), [content]);
  const radarData = useMemo(() => parseRadarData(content), [content]);
  const sections = (content.match(/^#{1,3}\s+/gm) ?? []).length;
  const words = content
    .replace(/[#*_`>|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const sparklineData =
    radarData.length > 0
      ? radarData.map((item) => ({
          name: item.dimension.split(" ")[0],
          score: item.score,
        }))
      : metrics.slice(0, 6).map((item, index) => ({
          name: String(index + 1),
          score: scoreFromText(item.value) ?? 50,
        }));
  const signal =
    techIndicators.filter((item) => item.signal === "bullish").length >=
    techIndicators.filter((item) => item.signal === "bearish").length
      ? "bullish"
      : "bearish";

  return (
    <Card className="border-primary/20 bg-card/95 mb-6 overflow-hidden shadow-sm">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-border/60 space-y-5 border-b p-5 lg:border-r lg:border-b-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1" variant="outline">
                <Sparkles className="size-3" />
                AI research report
              </Badge>
              {techIndicators.length > 0 && (
                <Badge className={SIGNAL_STYLES[signal]} variant="outline">
                  {SIGNAL_LABELS[signal]} technical bias
                </Badge>
              )}
            </div>
            <div>
              <h2 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
                Research Intelligence Workspace
              </h2>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                A structured reading layer for strategy scores, market charts,
                technical signals, and source evidence.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Sections", value: sections || "N/A" },
                { label: "Metrics", value: metrics.length },
                { label: "Sources", value: evidenceItems.length },
                { label: "Words", value: words.toLocaleString() },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Signal contour</p>
                <p className="text-muted-foreground text-xs">
                  Derived from extracted scores
                </p>
              </div>
              <Activity className="text-primary size-4" />
            </div>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    tickLine={false}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 12px 40px rgb(0 0 0 / 0.12)",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    dataKey="score"
                    dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
    /(?:^|\n)(?:#+\s*(?:Evidence|Sources?|References?|證據列表|證據|來源|參考)[^\n]*|\*\*(?:Evidence|Sources?|References?|證據列表|證據|來源|參考)[^*]*\*\*)\n([\s\S]*?)(?=\n(?:#{1,3}\s|\*\*(?!(?:Evidence|Sources?|References?|證據|來源|參考)))|$)/i,
  );

  if (!evidenceSection?.[1]) return items;

  const lines = evidenceSection[1].split("\n");

  let previousItem: EvidenceItem | null = null;

  for (const line of lines) {
    const trimmed = line.replace(/^\s*[-*\d.]+\s*/, "").trim();
    if (!trimmed) continue;

    const mdLinkMatch = trimmed.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const plainUrlMatch = trimmed.match(/(https?:\/\/[^\s|)\]]+)/);
    const url = mdLinkMatch?.[2] || plainUrlMatch?.[1];

    if (!url && previousItem && /^[-*•]\s*/.test(line.trim())) {
      previousItem.claim = previousItem.claim
        ? `${previousItem.claim} ${trimmed}`
        : trimmed;
      continue;
    }

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
      const item = { title, date, url, claim };
      items.push(item);
      previousItem = item;
    }
  }

  return items;
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  return (
    <div className="group border-border/70 bg-background/70 hover:border-primary/30 flex items-start gap-3 rounded-lg border p-4 transition-colors">
      <div className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
        <ClipboardCheck className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex min-w-0 items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
            >
              <span className="truncate">{item.title}</span>
              <ExternalLink className="size-3 shrink-0" />
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
            className="text-primary/70 hover:text-primary mt-2 inline-flex max-w-full items-center gap-1 text-xs"
          >
            <span className="truncate">
              {item.url.replace(/^https?:\/\//, "").slice(0, 50)}
            </span>
            <ExternalLink className="size-3 shrink-0" />
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
    <Card className="border-primary/15 mb-6 overflow-hidden shadow-sm">
      <CardHeader className="border-border/60 flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="text-primary size-4" />
            Evidence List
          </CardTitle>
          <CardDescription>
            Traceable sources extracted from the generated report.
          </CardDescription>
        </div>
        <Badge variant="outline">{items.length} sources</Badge>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
        {items.map((item, i) => (
          <EvidenceCard key={i} item={item} />
        ))}
      </CardContent>
    </Card>
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
  const structuredMetrics = useMemo(
    () => parseStructuredMetrics(content),
    [content],
  );
  const cleanedContent = useMemo(
    () => stripGeneratedSections(content),
    [content],
  );
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="space-y-0">
      {/* Executive research workspace */}
      <ReportExecutiveHeader content={content} metrics={metrics} />

      {/* Normalized metric table */}
      <StructuredMetricTable metrics={structuredMetrics} />

      {/* Metrics Dashboard */}
      <MetricDashboard metrics={metrics} />

      {/* Charts */}
      <ReportCharts content={content} />

      {/* Technical Indicators */}
      <TechIndicatorPanel content={content} />

      {/* Evidence List - clickable links */}
      <EvidenceSection content={content} />

      {/* Markdown Content */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-border/60 flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="text-primary size-4" />
              Report Narrative
            </CardTitle>
            <CardDescription>
              Cleaned narrative after extracting metrics and source evidence
              into structured UI.
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowOriginal((value) => !value)}
            size="xs"
            variant="outline"
          >
            {showOriginal ? "Show organized view" : "Show original markdown"}
          </Button>
        </CardHeader>
        <CardContent className="prose-sm p-6">
          <ReactMarkdown components={markdownComponents}>
            {showOriginal ? content : cleanedContent || content}
          </ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
