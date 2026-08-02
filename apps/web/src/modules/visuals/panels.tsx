"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Visualization Atlas — Chart Panels
 *
 * Uses existing Recharts primitives. No new chart libraries.
 * All dynamic numbers carry notranslate + translate="no".
 * #57 null semantics: null = missing, 0 = real zero.
 */

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

interface VerificationFlowData {
  states: {
    confirmed: number;
    invalidated: number;
    needs_manual_review: number;
    insufficient_data: number;
  };
  period: string;
  total: number;
}

interface TQSDistributionData {
  tiers: Record<string, number>;
  total: number;
  disclaimer: string;
}

interface FundamentalsData {
  ticker: string;
  companyName: string;
  revenueHistory: Array<{ period: string; value: number | null }>;
  grossMarginHistory: Array<{ period: string; value: number | null }>;
  operatingMarginHistory: Array<{ period: string; value: number | null }>;
  fcfHistory: Array<{ period: string; value: number | null }>;
}

interface SourceMixData {
  tiers: Record<string, number>;
  total: number;
}

// ── Shared tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm shadow-md">
      {label && <p className="text-foreground mb-1 font-medium">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="text-xs">
          {entry.name}:{" "}
          <span className="notranslate font-mono font-medium" translate="no">
            {entry.value.toLocaleString()}
            {unit ?? ""}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Colors ───────────────────────────────────────────────────────────────────

const STATE_LABELS = {
  confirmed: "Confirmed",
  invalidated: "Invalidated",
  needs_manual_review: "Needs Review",
  insufficient_data: "Insufficient Data",
} as const;

const TIER_COLORS: Record<string, string> = {
  S: "#10b981",
  A: "#22c55e",
  B: "#3b82f6",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

const SOURCE_COLORS: Record<string, string> = {
  filing: "#10b981",
  company: "#3b82f6",
  media: "#f59e0b",
  social: "#f97316",
  unknown: "#6b7280",
};

const SOURCE_LABELS: Record<string, string> = {
  filing: "Filings",
  company: "Company",
  media: "Media",
  social: "Social",
  unknown: "Unknown",
};

// ── Panel 1: Verification Flow ───────────────────────────────────────────────

export function VerificationFlowChart({
  data30,
  data90,
}: {
  data30: VerificationFlowData | null;
  data90: VerificationFlowData | null;
}) {
  // Build grouped bar data
  const states = [
    "confirmed",
    "invalidated",
    "needs_manual_review",
    "insufficient_data",
  ] as const;

  const chartData = states.map((state) => ({
    name: STATE_LABELS[state],
    "30 days": data30?.states[state] ?? 0,
    "90 days": data90?.states[state] ?? 0,
  }));

  const hasAnyData =
    (data30 && data30.total > 0) || (data90 && data90.total > 0);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-muted-foreground text-xs">
          No verified data available yet
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-4">
        {data30 && (
          <span
            className="notranslate text-muted-foreground font-mono text-[10px]"
            translate="no"
          >
            30d: {data30.total} verifications
          </span>
        )}
        {data90 && (
          <span
            className="notranslate text-muted-foreground font-mono text-[10px]"
            translate="no"
          >
            90d: {data90.total} verifications
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="30 days" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="90 days" fill="#93c5fd" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Panel 2: TQS Distribution ────────────────────────────────────────────────

export function TQSDistributionChart({ data }: { data: TQSDistributionData }) {
  const pieData = Object.entries(data.tiers)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({
      name: `Tier ${tier}`,
      value: count,
      fill: TIER_COLORS[tier] ?? "#6b7280",
    }));

  return (
    <div>
      <div className="mb-3">
        <span
          className="notranslate text-muted-foreground font-mono text-[10px]"
          translate="no"
        >
          {data.total} scored judgments
        </span>
      </div>
      <div className="flex flex-col items-center gap-4 md:flex-row">
        <ResponsiveContainer width="100%" height={200} className="max-w-xs">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]!;
                return (
                  <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{item.name}</p>
                    <p className="notranslate font-mono text-xs" translate="no">
                      {item.value} judgments
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(data.tiers).map(([tier, count]) => (
            <div key={tier} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: TIER_COLORS[tier] ?? "#6b7280" }}
              />
              <span className="text-xs">
                {tier}:{" "}
                <span
                  className="notranslate font-mono font-medium"
                  translate="no"
                >
                  {count}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-muted-foreground mt-4 text-[10px] leading-relaxed">
        {data.disclaimer}
      </p>
    </div>
  );
}

// ── Panel 3: Fundamentals Timeline ───────────────────────────────────────────

function hasNonNullValues(history: Array<{ value: number | null }>): boolean {
  return history.some((p) => p.value != null);
}

function FundamentalsSubChart({
  title,
  data,
  color,
  unit,
}: {
  title: string;
  data: Array<{ period: string; value: number | null }>;
  color: string;
  unit?: string;
}) {
  // #57: all-null series shows honest empty state, never renders 0
  if (!hasNonNullValues(data)) {
    return (
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          {title}
        </p>
        <div className="flex h-[140px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground text-xs">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const val = payload[0]?.value;
              return (
                <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm shadow-md">
                  <p className="mb-1 font-medium">{label}</p>
                  <p className="text-xs">
                    <span
                      className="notranslate font-mono font-medium"
                      translate="no"
                    >
                      {val != null ? `${String(val)}${unit ?? ""}` : "N/A"}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FundamentalsChart({ data }: { data: FundamentalsData }) {
  const hasAnyData =
    hasNonNullValues(data.revenueHistory) ||
    hasNonNullValues(data.grossMarginHistory) ||
    hasNonNullValues(data.operatingMarginHistory) ||
    hasNonNullValues(data.fcfHistory);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-muted-foreground text-xs">
          No financial data available for {data.ticker}
        </p>
      </div>
    );
  }

  return (
    <div className="notranslate space-y-6" translate="no">
      <div>
        <span className="text-muted-foreground font-mono text-[10px]">
          {data.ticker} · {data.companyName}
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <FundamentalsSubChart
          title="Revenue (USD millions)"
          data={data.revenueHistory}
          color="hsl(var(--primary))"
          unit="M"
        />
        <FundamentalsSubChart
          title="Gross Margin (%)"
          data={data.grossMarginHistory}
          color="#10b981"
          unit="%"
        />
        <FundamentalsSubChart
          title="Operating Margin (%)"
          data={data.operatingMarginHistory}
          color="#3b82f6"
          unit="%"
        />
        <FundamentalsSubChart
          title="Free Cash Flow (USD millions)"
          data={data.fcfHistory}
          color="#8b5cf6"
          unit="M"
        />
      </div>
    </div>
  );
}

// ── Panel 4: Source Mix ──────────────────────────────────────────────────────

export function SourceMixChart({ data }: { data: SourceMixData }) {
  const pieData = Object.entries(data.tiers)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => ({
      name: SOURCE_LABELS[tier] ?? tier,
      value: count,
      fill: SOURCE_COLORS[tier] ?? "#6b7280",
    }));

  return (
    <div>
      <div className="mb-3">
        <span
          className="notranslate text-muted-foreground font-mono text-[10px]"
          translate="no"
        >
          {data.total} judgments with source info
        </span>
      </div>
      <div className="flex flex-col items-center gap-4 md:flex-row">
        <ResponsiveContainer width="100%" height={200} className="max-w-xs">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]!;
                return (
                  <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{item.name}</p>
                    <p className="notranslate font-mono text-xs" translate="no">
                      {item.value} sources
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.tiers).map(([tier, count]) => (
            <div key={tier} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  backgroundColor: SOURCE_COLORS[tier] ?? "#6b7280",
                }}
              />
              <span className="text-xs">
                {SOURCE_LABELS[tier] ?? tier}:{" "}
                <span
                  className="notranslate font-mono font-medium"
                  translate="no"
                >
                  {count}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
