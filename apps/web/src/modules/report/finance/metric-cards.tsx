import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@workspace/ui";

import type {
  FinancialMetrics,
  ReportData,
} from "@workspace/shared/types/report";

// ─── Rating Badge ─────────────────────────────────────────────────────────────
const RATING_MAP = {
  Buy: {
    label: "买入",
    variant: "default" as const,
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  Hold: {
    label: "持有",
    variant: "secondary" as const,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  Sell: {
    label: "卖出",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export function RatingBadge({ rating }: { rating: ReportData["rating"] }) {
  const r = RATING_MAP[rating];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-semibold tracking-wide",
        r.className,
      )}
    >
      {rating === "Buy" && <TrendingUp className="h-3 w-3" />}
      {rating === "Sell" && <TrendingDown className="h-3 w-3" />}
      {rating === "Hold" && <Minus className="h-3 w-3" />}
      {r.label} / {rating}
    </span>
  );
}

// ─── Upside indicator ─────────────────────────────────────────────────────────
export function UpsideLabel({ upside }: { upside: number }) {
  const positive = upside >= 0;
  return (
    <span
      className={cn(
        "font-mono text-xs font-medium",
        positive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
      )}
    >
      {positive ? "+" : ""}
      {upside.toFixed(1)}%
    </span>
  );
}

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
      label: "营收增速 YoY",
      value: fmt(m.revenueGrowthYoy, 1, "%"),
      trend: m.revenueGrowthYoy > 0 ? "up" : "down",
    },
    {
      label: "毛利率",
      value: fmt(m.grossMargin, 1, "%"),
      sub: `经营利润率 ${fmt(m.operatingMargin, 1)}%`,
    },
    {
      label: "净利率",
      value: fmt(m.netMargin, 1, "%"),
      trend: m.netMargin > 0 ? "up" : "down",
    },
    {
      label: "EPS (TTM)",
      value: `$${fmt(m.eps, 2)}`,
      sub: `增速 ${fmt(m.epsGrowthYoy, 1)}%`,
      trend: m.epsGrowthYoy > 0 ? "up" : "down",
    },
    {
      label: "P/E (TTM)",
      value: m.peRatio ? `${fmt(m.peRatio, 1)}x` : "N/A",
      sub: m.forwardPE ? `远期 ${fmt(m.forwardPE, 1)}x` : undefined,
    },
    {
      label: "EV/EBITDA",
      value: m.evEbitda ? `${fmt(m.evEbitda, 1)}x` : "N/A",
    },
    {
      label: "自由现金流",
      value: fmtB(m.freeCashFlow),
      sub: `FCF率 ${fmt(m.fcfMargin, 1)}%`,
      trend: m.freeCashFlow > 0 ? "up" : "down",
    },
    {
      label: "净现金",
      value: fmtB(m.netCash),
      trend: m.netCash > 0 ? "up" : "down",
    },
    {
      label: "市值",
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
