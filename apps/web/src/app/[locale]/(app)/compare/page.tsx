"use client";

/* oxlint-disable i18next/no-literal-string */

import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Skeleton } from "@workspace/ui-web/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui-web/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui-web/tooltip";

// Types mirror the API response
type CompareTickerData = {
  ticker: string;
  companyName: string;
  currency: string;
  financialCurrency: string | undefined;
  hasJudgment: boolean;
  judgmentError: string | null;
};

type CompareDimension = {
  key: string;
  label: string;
  values: Record<string, string | null>;
  rawValues: Record<string, number | null>;
  periodLabels: Record<string, string | null>;
  periodMismatch: boolean;
  crossCurrencyBlocked: boolean;
  category: "judgment" | "financial" | "valuation" | "cashflow";
};

type CompareResponse = {
  ok: boolean;
  tickers: CompareTickerData[];
  dimensions: CompareDimension[];
  crossCurrencyWarning: boolean;
  currencies: string[];
};

// ── Types ────────────────────────────────────────────────────────────────────

// ── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchCompare(tickers: string[]): Promise<CompareResponse> {
  const res = await fetch(`/api/compare?tickers=${tickers.join(",")}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string })?.message ??
        `Compare failed (${res.status})`,
    );
  }
  return res.json() as Promise<CompareResponse>;
}

// ── Cell renderer ────────────────────────────────────────────────────────────

function EmptyCell({ reason }: { reason?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="text-muted-foreground cursor-help font-mono text-sm"
        render={<span />}
      >
        —
      </TooltipTrigger>
      <TooltipContent>{reason ?? "Data unavailable"}</TooltipContent>
    </Tooltip>
  );
}

function DimensionCell({
  value,
  ticker,
  dimension,
}: {
  value: string | null;
  ticker: string;
  dimension: CompareDimension;
}) {
  if (dimension.crossCurrencyBlocked) {
    return (
      <Tooltip>
        <TooltipTrigger
          className="text-muted-foreground cursor-help font-mono text-sm"
          render={<span />}
        >
          —
        </TooltipTrigger>
        <TooltipContent>Cross-currency comparison not available</TooltipContent>
      </Tooltip>
    );
  }

  if (value == null) {
    return <EmptyCell />;
  }

  return (
    <span className="notranslate text-sm" translate="no" data-ticker={ticker}>
      {value}
    </span>
  );
}

// ── Period mismatch badge ────────────────────────────────────────────────────

function PeriodMismatchBadge({ dimension }: { dimension: CompareDimension }) {
  if (!dimension.periodMismatch) return null;

  const periods = Object.entries(dimension.periodLabels)
    .filter(([, v]) => v != null)
    .map(([, v]) => v as string);
  const unique = [...new Set(periods)];

  return (
    <Badge variant="destructive" className="ml-2 font-mono text-[10px]">
      {unique.join(" vs ")}
    </Badge>
  );
}

// ── Category header row ──────────────────────────────────────────────────────

function CategoryRow({ label, colCount }: { label: string; colCount: number }) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell
        colSpan={colCount + 1}
        className="text-muted-foreground px-4 py-2 text-[11px] font-semibold tracking-wide uppercase"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

// ── Comparison table ─────────────────────────────────────────────────────────

function ComparisonTable({ data }: { data: CompareResponse }) {
  const { tickers, dimensions } = data;

  // Group dimensions by category
  const categories: Array<{
    key: string;
    label: string;
    dims: CompareDimension[];
  }> = [
    {
      key: "judgment",
      label: "Judgment & Thesis",
      dims: dimensions.filter((d) => d.category === "judgment"),
    },
    {
      key: "financial",
      label: "Financial Metrics",
      dims: dimensions.filter((d) => d.category === "financial"),
    },
    {
      key: "valuation",
      label: "Valuation",
      dims: dimensions.filter((d) => d.category === "valuation"),
    },
    {
      key: "cashflow",
      label: "Cash Flow",
      dims: dimensions.filter((d) => d.category === "cashflow"),
    },
  ].filter((cat) => cat.dims.length > 0);

  const colCount = tickers.length;

  return (
    <div className="border-line overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="bg-panel sticky left-0 z-10 w-48 min-w-[180px] border-r font-semibold">
                Dimension
              </TableHead>
              {tickers.map((t) => (
                <TableHead key={t.ticker} className="min-w-[160px] text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <Link
                      href={`/t/${t.ticker}`}
                      className="notranslate font-serif text-sm font-semibold hover:underline"
                      translate="no"
                    >
                      {t.ticker}
                    </Link>
                    <span className="text-muted-foreground text-[10px] font-normal">
                      {t.companyName}
                    </span>
                    {!t.hasJudgment && (
                      <span className="text-muted-foreground font-mono text-[9px] italic">
                        No judgment
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <Suspense key={cat.key} fallback={null}>
                <CategoryRow label={cat.label} colCount={colCount} />
                {cat.dims.map((dim) => (
                  <TableRow key={dim.key}>
                    <TableCell className="bg-panel sticky left-0 z-10 border-r">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{dim.label}</span>
                        <PeriodMismatchBadge dimension={dim} />
                      </div>
                    </TableCell>
                    {tickers.map((t) => (
                      <TableCell key={t.ticker} className="text-center">
                        <DimensionCell
                          value={dim.values[t.ticker] ?? null}
                          ticker={t.ticker}
                          dimension={dim}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Suspense>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function CompareSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="border-line overflow-hidden rounded-xl border">
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-line flex items-center gap-4 border-b px-4 py-3"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main content ─────────────────────────────────────────────────────────────

function CompareContent() {
  const searchParams = useSearchParams();
  const tickersParam = searchParams.get("tickers");

  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tickers = tickersParam
      ? tickersParam
          .split(",")
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean)
      : [];
    if (tickers.length < 2) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchCompare(tickers)
      .then((result) => {
        if (!cancelled) setData(result);
        return result;
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load comparison",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tickersParam]);

  const tickers = tickersParam
    ? tickersParam
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
    : [];

  // ── Invalid tickers ──
  if (tickers.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="bg-muted rounded-full p-5">
          <AlertTriangle className="text-muted-foreground h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-foreground text-lg font-semibold">
            Select Tickers to Compare
          </h3>
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
            Go to your watchlist and select 2–4 tickers using the checkboxes,
            then click Compare.
          </p>
        </div>
        <Link
          href="/dashboard/watchlist"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Watchlist
        </Link>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            {error}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 h-7 gap-1 px-2 text-xs"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading || !data) {
    return <CompareSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Ticker badges */}
      <div className="flex flex-wrap items-center gap-2">
        {data.tickers.map((t) => (
          <Link
            key={t.ticker}
            href={`/t/${t.ticker}`}
            className="border-line hover:bg-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition"
          >
            <span
              className="notranslate font-mono text-sm font-semibold"
              translate="no"
            >
              {t.ticker}
            </span>
            <span className="text-muted-foreground text-xs">
              {t.companyName}
            </span>
          </Link>
        ))}
      </div>

      {/* Cross-currency warning */}
      {data.crossCurrencyWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Cross-currency comparison
            </p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
              These tickers report in different currencies (
              {data.currencies.join(", ")}). Ratio metrics (P/E, EV/EBITDA) are
              hidden because cross-currency multiples are not directly
              comparable. Percentage metrics (margins) remain valid.
            </p>
          </div>
        </div>
      )}

      {/* Comparison table */}
      <ComparisonTable data={data} />

      {/* Footer */}
      <p className="text-muted-foreground/60 border-border border-t pt-4 text-[10px]">
        Financial data from market data providers. Judgment data from L3 ledger.
        Missing values are shown as "—" — never filled with 0 or other tickers'
        values. TQS evaluates thesis quality, not stock quality.
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  return (
    <div className="text-ink">
      {/* ── Top bar ── */}
      <div className="bg-paper/95 border-line sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/watchlist"
              className="text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-serif text-xl font-semibold tracking-tight">
                Compare
              </h1>
              <p className="text-muted-foreground text-xs">
                Dimension-aligned ticker comparison
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground border-line rounded-full border px-3 py-2 text-sm transition"
          >
            Home
          </Link>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Suspense fallback={<CompareSkeleton />}>
          <CompareContent />
        </Suspense>
      </main>

      {/* ── Footer ── */}
      <footer className="border-line border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>Decision-support analysis only. Not investment advice.</p>
          <p className="font-mono">/compare</p>
        </div>
      </footer>
    </div>
  );
}
