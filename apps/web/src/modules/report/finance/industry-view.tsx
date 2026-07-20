"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  AlertCircle,
  BarChart3,
  Building2,
  Globe,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@workspace/ui-web/badge";
import { Separator } from "@workspace/ui-web/separator";

import { fmtMetricValue, fmtRatio, fmtPct } from "./use-industry";

import type { ThemeConstituent, IndustryUniverse } from "./use-industry";

// ─── Value Chain Table ───────────────────────────────────────────────────────

interface ValueChainLayer {
  name: string;
  description: string;
  constituents: ThemeConstituent[];
}

interface IndustryViewProps {
  universe: IndustryUniverse;
  constituents: ThemeConstituent[];
  layers?: ValueChainLayer[];
}

function ConstituentRow({ c, rank }: { c: ThemeConstituent; rank: number }) {
  const f = c.financials;
  const hasData = f != null;

  return (
    <tr className="border-border/50 border-b last:border-0">
      <td className="py-2 pr-3 text-xs">
        <span className="text-muted-foreground mr-1.5">{rank}.</span>
        <span className="font-mono font-semibold">{c.symbol}</span>
      </td>
      <td className="py-2 pr-3">
        <p className="max-w-[160px] truncate text-xs">{c.name}</p>
      </td>
      <td className="py-2 pr-3 text-right font-mono text-xs">
        {hasData ? fmtMetricValue(f.currentPrice, f.currency) : "—"}
      </td>
      <td className="py-2 pr-3 text-right font-mono text-xs">
        {hasData ? fmtMetricValue(f.marketCap, f.currency) : "—"}
      </td>
      <td className="py-2 pr-3 text-right font-mono text-xs">
        {hasData ? fmtPct(f.revenueGrowthYoy) : "—"}
      </td>
      <td className="py-2 pr-3 text-right font-mono text-xs">
        {hasData ? fmtPct(f.grossMargin) : "—"}
      </td>
      <td className="py-2 pr-3 text-right font-mono text-xs">
        {hasData ? fmtRatio(f.peRatio) : "—"}
      </td>
      <td className="py-2 pr-3 text-right font-mono text-xs">
        {hasData ? fmtRatio(f.evEbitda) : "—"}
      </td>
      <td className="py-2 text-right">
        {c.error ? (
          <Badge variant="outline" className="text-[10px] text-amber-600">
            data unavailable
          </Badge>
        ) : f?._sanitization?.withheld.length ? (
          <Badge variant="outline" className="text-[10px] text-amber-600">
            {f._sanitization.withheld.length} field
            {f._sanitization.withheld.length > 1 ? "s" : ""} withheld
          </Badge>
        ) : null}
      </td>
    </tr>
  );
}

function ConstituentTable({
  title,
  icon: Icon,
  constituents,
}: {
  title: string;
  icon: typeof Building2;
  constituents: ThemeConstituent[];
}) {
  if (constituents.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          {title}
        </span>
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-[10px]">
          {constituents.length} constituents
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-[10px] tracking-wider uppercase">
              <th className="py-1.5 pr-3 text-left font-medium">#</th>
              <th className="py-1.5 pr-3 text-left font-medium">Name</th>
              <th className="py-1.5 pr-3 text-right font-medium">Price</th>
              <th className="py-1.5 pr-3 text-right font-medium">Mkt Cap</th>
              <th className="py-1.5 pr-3 text-right font-medium">Rev Gr</th>
              <th className="py-1.5 pr-3 text-right font-medium">GM</th>
              <th className="py-1.5 pr-3 text-right font-medium">P/E</th>
              <th className="py-1.5 pr-3 text-right font-medium">EV/EBITDA</th>
              <th className="py-1.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {constituents.map((c, i) => (
              <ConstituentRow key={c.symbol} c={c} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Cross-Market Valuation Comparison ───────────────────────────────────────

interface ValuationDiff {
  symbol: string;
  name: string;
  currency: string;
  peRatio: number | null;
  evEbitda: number | null;
  pbRatio: number | null;
  grossMargin: number | null;
  note?: string;
}

function ValuationDiffTable({ diffs }: { diffs: ValuationDiff[] }) {
  if (diffs.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Globe className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          Cross-Market Valuation Comparison
        </span>
        <div className="bg-border h-px flex-1" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-[10px] tracking-wider uppercase">
              <th className="py-1.5 pr-3 text-left font-medium">Ticker</th>
              <th className="py-1.5 pr-3 text-left font-medium">Name</th>
              <th className="py-1.5 pr-3 text-right font-medium">Currency</th>
              <th className="py-1.5 pr-3 text-right font-medium">P/E</th>
              <th className="py-1.5 pr-3 text-right font-medium">EV/EBITDA</th>
              <th className="py-1.5 pr-3 text-right font-medium">P/B</th>
              <th className="py-1.5 pr-3 text-right font-medium">GM</th>
              <th className="py-1.5 text-left font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) => (
              <tr
                key={d.symbol}
                className="border-border/50 border-b last:border-0"
              >
                <td className="py-2 pr-3 font-mono font-semibold">
                  {d.symbol}
                </td>
                <td className="max-w-[120px] truncate py-2 pr-3">{d.name}</td>
                <td className="py-2 pr-3 text-right font-mono">{d.currency}</td>
                <td className="py-2 pr-3 text-right font-mono">
                  {fmtRatio(d.peRatio)}
                </td>
                <td className="py-2 pr-3 text-right font-mono">
                  {fmtRatio(d.evEbitda)}
                </td>
                <td className="py-2 pr-3 text-right font-mono">
                  {fmtRatio(d.pbRatio)}
                </td>
                <td className="py-2 pr-3 text-right font-mono">
                  {fmtPct(d.grossMargin)}
                </td>
                <td className="text-muted-foreground py-2 text-[10px]">
                  {d.note ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-2 text-[10px]">
        ⚠ Cross-currency ratios (P/E, EV/EBITDA, P/B) are nullified when quote
        and reporting currencies differ. Compare only within same-currency
        groups.
      </p>
    </div>
  );
}

// ─── Main Industry View ──────────────────────────────────────────────────────

export function IndustryView({
  universe,
  constituents,
  layers,
}: IndustryViewProps) {
  // Build valuation diffs from constituents with valid financials
  const valuationDiffs: ValuationDiff[] = constituents
    .filter((c) => c.financials != null)
    .map((c) => {
      const f = c.financials!;
      const withheld = f._sanitization?.withheld ?? [];
      return {
        symbol: c.symbol,
        name: c.name,
        currency: f.currency ?? "USD",
        peRatio: withheld.includes("peRatio") ? null : f.peRatio,
        evEbitda: withheld.includes("evEbitda") ? null : f.evEbitda,
        pbRatio: withheld.includes("pbRatio") ? null : f.pbRatio,
        grossMargin: f.grossMargin,
        note: f._sanitization?.currencyMismatch
          ? `Reporting: ${f._sanitization.financialCurrency ?? "?"}`
          : undefined,
      };
    });

  // Group by currency for comparison
  const byCurrency = new Map<string, ValuationDiff[]>();
  for (const d of valuationDiffs) {
    const group = byCurrency.get(d.currency) ?? [];
    group.push(d);
    byCurrency.set(d.currency, group);
  }

  return (
    <div className="space-y-6">
      {/* ETF Sources */}
      <div className="bg-muted/30 rounded-lg border p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <Building2 className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold tracking-widest uppercase">
            Data Sources
          </span>
        </div>
        <div className="space-y-1">
          {universe.etfs.map((etf) => (
            <p key={etf.symbol} className="text-xs">
              <span className="font-mono font-semibold">{etf.symbol}</span>
              <span className="text-muted-foreground"> — {etf.name}</span>
              <span className="text-muted-foreground ml-1">
                ({etf.holdings} holdings)
              </span>
            </p>
          ))}
        </div>
        <p className="text-muted-foreground mt-1.5 text-[10px]">
          Universe as of {universe.asOf} · Top {constituents.length}{" "}
          constituents by ETF consensus
        </p>
      </div>

      {/* Value chain layers or flat table */}
      {layers && layers.length > 0 ? (
        <div className="space-y-4">
          {layers.map((layer) => (
            <ConstituentTable
              key={layer.name}
              title={layer.name}
              icon={BarChart3}
              constituents={layer.constituents}
            />
          ))}
        </div>
      ) : (
        <ConstituentTable
          title="Theme Constituents"
          icon={TrendingUp}
          constituents={constituents}
        />
      )}

      <Separator />

      {/* Cross-market valuation comparison */}
      <ValuationDiffTable diffs={valuationDiffs} />

      {/* Empty state for layers without A/H data */}
      <div className="text-muted-foreground flex items-start gap-2 text-xs">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          A/H stock expansion requires web search for cross-market supply chain
          mapping. Layer-level valuation comparisons are available for
          constituents with Yahoo Finance data. Cross-currency ratios are
          automatically withheld when quote and reporting currencies differ.
        </p>
      </div>
    </div>
  );
}
