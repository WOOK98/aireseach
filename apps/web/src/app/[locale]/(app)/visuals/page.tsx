"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  BarChart3,
  FileSearch,
  HelpCircle,
  Loader2,
  RefreshCcw,
  Search,
  Shield,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useCallback, useState } from "react";

import { Button } from "@workspace/ui-web/button";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { EntitySearch } from "~/modules/company/entity-search";
import {
  VerificationFlowChart,
  TQSDistributionChart,
  FundamentalsChart,
  SourceMixChart,
} from "~/modules/visuals/panels";

// ── Types (mirrors API response) ─────────────────────────────────────────────

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

// ── fetchJson wrapper ────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ── Panel wrapper ────────────────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  tooltip,
  lastRefreshed,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  lastRefreshed?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-4 w-4" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="group relative">
            <HelpCircle className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
            <div className="bg-background text-muted-foreground pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg border p-3 text-xs leading-relaxed opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
              {tooltip}
            </div>
          </div>
        </div>
        {lastRefreshed && (
          <span
            className="notranslate text-muted-foreground font-mono text-[10px]"
            translate="no"
          >
            Updated {new Date(lastRefreshed).toLocaleDateString("en-US")}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyPanel({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Shield className="text-muted-foreground h-5 w-5" />
      <p className="text-muted-foreground text-xs">
        {message ?? "No verified data available yet"}
      </p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function VisualsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTicker, setActiveTicker] = useState<string | null>(null);

  // Data states
  const [verificationFlow, setVerificationFlow] = useState<{
    d30: VerificationFlowData | null;
    d90: VerificationFlowData | null;
  }>({ d30: null, d90: null });
  const [tqsDist, setTqsDist] = useState<TQSDistributionData | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(
    null,
  );
  const [sourceMix, setSourceMix] = useState<SourceMixData | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fetch aggregate panels on mount
  const fetchAggregatePanels = useCallback(async () => {
    setLoading(true);
    const [manifest, vf30, vf90, tqs, sm] = await Promise.all([
      fetchJson<{ lastRefreshed: string | null }>("/api/visuals/manifest"),
      fetchJson<VerificationFlowData>("/api/visuals/verification-flow?days=30"),
      fetchJson<VerificationFlowData>("/api/visuals/verification-flow?days=90"),
      fetchJson<TQSDistributionData>("/api/visuals/tqs-distribution"),
      fetchJson<SourceMixData>("/api/visuals/source-mix"),
    ]);

    setVerificationFlow({ d30: vf30, d90: vf90 });
    setTqsDist(tqs);
    setSourceMix(sm);
    setLastRefreshed(manifest?.lastRefreshed ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchAggregatePanels();
  }, [fetchAggregatePanels]);

  // EntitySearch onResolve — loads fundamentals when entity is locked
  const handleEntityResolve = useCallback(
    (entity: { ticker: string; companyName: string }) => {
      setActiveTicker(entity.ticker);
      setFundamentalsLoading(true);
      void fetchJson<FundamentalsData>(
        `/api/visuals/fundamentals?ticker=${encodeURIComponent(entity.ticker)}`,
      )
        .then((data) => setFundamentals(data))
        .finally(() => setFundamentalsLoading(false));
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    void fetchAggregatePanels();
    if (activeTicker) {
      setFundamentalsLoading(true);
      void fetchJson<FundamentalsData>(
        `/api/visuals/fundamentals?ticker=${encodeURIComponent(activeTicker)}`,
      )
        .then((data) => setFundamentals(data))
        .finally(() => setFundamentalsLoading(false));
    }
  }, [fetchAggregatePanels, activeTicker]);

  if (!mounted) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-border border-b px-4 py-4">
          <div className="mx-auto w-full max-w-5xl">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
        </div>
        <div className="flex-1 px-4 py-5">
          <div className="mx-auto w-full max-w-5xl space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-border border-b px-4 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-xl font-semibold tracking-tight">
              Research Data Atlas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Aggregate research data panels — verification flow, thesis
              quality, fundamentals, and evidence sources.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {/* ── Entity Lock search box ── */}
          <div className="bg-background/95 sticky top-0 z-10 -mx-4 -mt-5 px-4 pt-5 pb-3 backdrop-blur">
            <EntitySearch compact onResolve={handleEntityResolve} />
          </div>

          {/* ── Cold-start guidance ── */}
          {!loading &&
            !verificationFlow.d30 &&
            !verificationFlow.d90 &&
            !tqsDist &&
            !sourceMix &&
            !fundamentals && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      No research data yet
                    </h3>
                    <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                      The panels below — Verification Flow, TQS Distribution,
                      and Evidence Source Mix — populate after you generate
                      reports and write judgments to the L3 ledger. Fundamentals
                      work independently: search a ticker above to load
                      financial data.
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Research → Generate report → L3 ledger → This dashboard
                    </p>
                    <Link
                      href="/dashboard/research"
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Go to Research
                    </Link>
                  </div>
                </div>
              </div>
            )}

          {/* ── Panel 1: Watchlist Verification Flow ── */}
          <Panel
            title="Watchlist Verification Flow"
            icon={Shield}
            tooltip="Shows the distribution of L3 verification outcomes across your watchlist judgments. Each judgment goes through automated verification and lands in one of four states: confirmed (thesis held), invalidated (thesis broke), needs manual review (ambiguous), or insufficient data (source unavailable)."
            lastRefreshed={lastRefreshed}
          >
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : verificationFlow.d30 || verificationFlow.d90 ? (
              <VerificationFlowChart
                data30={verificationFlow.d30}
                data90={verificationFlow.d90}
              />
            ) : (
              <EmptyPanel />
            )}
          </Panel>

          {/* ── Panel 2: TQS Distribution ── */}
          <Panel
            title="TQS Distribution"
            icon={BarChart3}
            tooltip="Thesis Quality Score (TQS) distribution across your judgments. TQS evaluates the quality of the thesis — evidence grounding, invalidation observability, data freshness, source tier, and counter-coverage. A high-TQS bearish thesis is equally valuable as a high-TQS bullish thesis. TQS is NOT a buy/sell/hold recommendation."
            lastRefreshed={lastRefreshed}
          >
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : tqsDist && tqsDist.total > 0 ? (
              <TQSDistributionChart data={tqsDist} />
            ) : (
              <EmptyPanel />
            )}
          </Panel>

          {/* ── Panel 3: Company Fundamentals Timeline ── */}
          <Panel
            title="Company Fundamentals Timeline"
            icon={TrendingUp}
            tooltip="Quarterly history of revenue, gross margin, operating margin, and free cash flow for the selected ticker. Data is sourced from financial statements. All series respect null semantics: null means data unavailable (not zero). Empty charts mean no data exists for that metric."
            lastRefreshed={lastRefreshed}
          >
            {fundamentalsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : fundamentals ? (
              <FundamentalsChart data={fundamentals} />
            ) : (
              <EmptyPanel
                message={
                  activeTicker
                    ? `No financial data available for ${activeTicker}`
                    : "Enter a ticker symbol above to load fundamentals"
                }
              />
            )}
          </Panel>

          {/* ── Panel 4: Evidence Source Mix ── */}
          <Panel
            title="Evidence Source Mix"
            icon={FileSearch}
            tooltip="Breakdown of evidence sources by tier across all your judgments. Sources are classified into: filing (SEC filings, 10-K, 10-Q), company (investor relations, press releases), media (financial news, analyst reports), social (forums, social media), and unknown (unclassified). Primary sources carry more weight in TQS scoring."
            lastRefreshed={lastRefreshed}
          >
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : sourceMix && sourceMix.total > 0 ? (
              <SourceMixChart data={sourceMix} />
            ) : (
              <EmptyPanel />
            )}
          </Panel>

          {/* ── Footer ── */}
          <p className="text-muted-foreground/60 border-border border-t pt-4 text-[10px]">
            All data from the L3 verification ledger and financial data
            providers. TQS is thesis quality, not stock rating. For research
            only. Not investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}
