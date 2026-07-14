import { cn } from "@workspace/ui";

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
      <p className="text-foreground font-mono text-base leading-tight font-medium">
        {value}
      </p>
      {sub && (
        <p
          className={cn("mt-0.5 font-mono text-[11px]", {
            "text-emerald-600 dark:text-emerald-400": trend === "up",
            "text-red-600 dark:text-red-400": trend === "down",
            "text-muted-foreground": trend === "neutral" || !trend,
          })}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function fmt(n: number | null | undefined, decimals = 1, suffix = "") {
  if (n == null || n === 0) return "N/A";
  return n.toFixed(decimals) + suffix;
}

function fmtB(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

export function MetricsGrid({ m }: { m: FinancialMetrics }) {
  const metrics: MetricCardProps[] = [
    {
      label: "Revenue Growth YoY",
      value: fmt(m.revenueGrowthYoy, 1, "%"),
      trend: m.revenueGrowthYoy > 0 ? "up" : "down",
    },
    {
      label: "Gross Margin",
      value: fmt(m.grossMargin, 1, "%"),
      sub: `Operating margin ${fmt(m.operatingMargin, 1)}%`,
    },
    {
      label: "Net Margin",
      value: fmt(m.netMargin, 1, "%"),
      trend: m.netMargin > 0 ? "up" : "down",
    },
    {
      label: "EPS (TTM)",
      value: `$${fmt(m.eps, 2)}`,
      sub: `Growth ${fmt(m.epsGrowthYoy, 1)}%`,
      trend: m.epsGrowthYoy > 0 ? "up" : "down",
    },
    {
      label: "P/E (TTM)",
      value: m.peRatio ? `${fmt(m.peRatio, 1)}x` : "N/A",
      sub: m.forwardPE ? `Forward ${fmt(m.forwardPE, 1)}x` : undefined,
    },
    {
      label: "EV/EBITDA",
      value: m.evEbitda ? `${fmt(m.evEbitda, 1)}x` : "N/A",
    },
    {
      label: "Free Cash Flow",
      value: fmtB(m.freeCashFlow),
      sub: `FCF margin ${fmt(m.fcfMargin, 1)}%`,
      trend: m.freeCashFlow > 0 ? "up" : "down",
    },
    {
      label: "Net Cash",
      value: fmtB(m.netCash),
      trend: m.netCash > 0 ? "up" : "down",
    },
    {
      label: "Market Cap",
      value: fmtB(m.marketCap),
      sub: `P/S ${fmt(m.psRatio, 1)}x`,
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
