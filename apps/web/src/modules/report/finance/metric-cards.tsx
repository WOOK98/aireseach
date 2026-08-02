import { cn } from "@workspace/ui";

import { fmt, fmtB, fmtMoney } from "./metric-format";

import type { FinancialMetrics } from "@workspace/shared/types/report";

// ─── Key Metrics Grid ─────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

function MetricCard({ label, value, sub, trend }: MetricCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg px-3.5 py-3">
      <p className="text-muted-foreground mb-1 text-[11px]">{label}</p>
      <p
        className="notranslate text-foreground font-mono text-base leading-tight font-medium"
        translate="no"
      >
        {value}
      </p>
      {sub && (
        <p
          className={cn("notranslate mt-0.5 font-mono text-[11px]", {
            "text-emerald-600 dark:text-emerald-400": trend === "up",
            "text-red-600 dark:text-red-400": trend === "down",
            "text-muted-foreground": trend === "neutral" || !trend,
          })}
          translate="no"
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function MetricsGrid({ m }: { m: FinancialMetrics }) {
  const metrics: MetricCardProps[] = [
    {
      label: "Revenue Growth YoY",
      value: fmt(m.revenueGrowthYoy, 1, "%"),
      trend:
        m.revenueGrowthYoy == null
          ? "neutral"
          : m.revenueGrowthYoy > 0
            ? "up"
            : "down",
    },
    {
      label: "Gross Margin",
      value: fmt(m.grossMargin, 1, "%"),
      sub: `Operating margin ${fmt(m.operatingMargin, 1, "%")}`,
    },
    {
      label: "Net Margin",
      value: fmt(m.netMargin, 1, "%"),
      trend: (m.netMargin ?? 0) > 0 ? "up" : "down",
    },
    {
      label: "EPS (TTM)",
      value: fmtMoney(m.eps, 2),
      sub: `Growth ${fmt(m.epsGrowthYoy, 1, "%")}`,
      trend: (m.epsGrowthYoy ?? 0) > 0 ? "up" : "down",
    },
    {
      label: "P/E (TTM)",
      value: fmt(m.peRatio, 1, "x"),
      sub:
        fmt(m.forwardPE, 1, "x") === "N/A"
          ? undefined
          : `Forward ${fmt(m.forwardPE, 1, "x")}`,
    },
    {
      label: "EV/EBITDA",
      value: fmt(m.evEbitda, 1, "x"),
    },
    {
      label: "Free Cash Flow",
      value: fmtB(m.freeCashFlow),
      sub: `FCF margin ${fmt(m.fcfMargin, 1, "%")}`,
      trend: (m.freeCashFlow ?? 0) > 0 ? "up" : "down",
    },
    {
      label: "Net Cash",
      value: fmtB(m.netCash),
      trend: (m.netCash ?? 0) > 0 ? "up" : "down",
    },
    {
      label: "Market Cap",
      value: fmtB(m.marketCap),
      sub: `P/S ${fmt(m.psRatio, 1, "x")}`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}
