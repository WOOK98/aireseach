"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { cn } from "@workspace/ui";

import type { QuarterlyPoint } from "@workspace/shared/types/report";

interface ChartProps {
  data: QuarterlyPoint[];
  className?: string;
}

// ─── Custom tooltip shared across charts ─────────────────────────────────────
function CustomTooltip({ active, payload, label, unit = "" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-foreground mb-1 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="text-xs">
          {entry.name}:{" "}
          <span className="font-mono font-medium">
            {entry.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  );
}

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────
export function RevenueChart({ data, className }: ChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Quarterly Revenue (USD millions)
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}B`}
            width={42}
          />
          <Tooltip content={<CustomTooltip unit="M" />} />
          <Bar
            dataKey="value"
            name="Revenue"
            fill="hsl(var(--primary))"
            radius={[3, 3, 0, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Margin Combo Line Chart ──────────────────────────────────────────────────
interface MarginChartProps {
  grossMargin: QuarterlyPoint[];
  operatingMargin: QuarterlyPoint[];
  className?: string;
}

export function MarginChart({
  grossMargin,
  operatingMargin,
  className,
}: MarginChartProps) {
  // Merge two series on same period keys
  const periods = grossMargin.map((p) => p.period);
  const combined = periods.map((period, i) => ({
    period,
    gross: grossMargin[i]?.value ?? null,
    operating: operatingMargin[i]?.value ?? null,
  }));

  return (
    <div className={cn("w-full", className)}>
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Gross Margin / Operating Margin (%)
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={combined}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={38}
          />
          <Tooltip content={<CustomTooltip unit="%" />} />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Line
            type="monotone"
            dataKey="gross"
            name="Gross Margin"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="operating"
            name="Operating Margin"
            stroke="hsl(var(--chart-2, 220 70% 50%))"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={{ r: 3 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── FCF Area Chart ───────────────────────────────────────────────────────────
export function FCFChart({ data, className }: ChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
        Free Cash Flow (USD millions)
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fcfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor="hsl(var(--primary))"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}M`}
            width={52}
          />
          <Tooltip content={<CustomTooltip unit="M" />} />
          <Area
            type="monotone"
            dataKey="value"
            name="FCF"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#fcfGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
