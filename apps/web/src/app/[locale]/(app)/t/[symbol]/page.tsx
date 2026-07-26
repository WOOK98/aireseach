/* oxlint-disable i18next/no-literal-string */

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cachedFetchYahooFinance,
  cachedResolveEntity,
  sanitizeFinancialMetrics,
} from "@workspace/api/report/data-sources";

import { getSession } from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import { EntitySearch } from "~/modules/company/entity-search";
import { WatchlistStar } from "~/modules/company/watchlist-star";

import type { FinancialMetrics } from "@workspace/shared/types/report";
import type { Metadata } from "next";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string; symbol: string }>;
};

/* ── Formatters ─────────────────────────────────────────────────────────────── */

function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", options).format(value);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatCompactMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function marketSessionLabel(state: string): string {
  switch (state) {
    case "REGULAR":
      return "intraday";
    case "PRE":
      return "pre-market";
    case "POST":
      return "after-hours";
    default:
      return "at close";
  }
}

/* ── Sub-components ──────────────────────────────────────────────────────────── */

function PriceChangeBadge({
  change,
  changePercent,
  marketState,
}: {
  change: number | null;
  changePercent: number | null;
  marketState: string;
}) {
  if (change == null || changePercent == null) return null;
  const isUp = change >= 0;
  const sign = isUp ? "+" : "";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs ${
        isUp
          ? "border-green-line bg-green-bg text-green-ink"
          : "text-down border-red-200 bg-red-50"
      }`}
    >
      <span className="notranslate" translate="no">
        {sign}
        {formatNumber(changePercent, { maximumFractionDigits: 2 })}%
      </span>
      <span className="text-ink-2">{marketSessionLabel(marketState)}</span>
    </span>
  );
}

/** Section header with left accent bar and decorative line */
function SectionHeader({
  label,
  trailing,
}: {
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="bg-lock h-4 w-0.5 rounded-full" />
      <h2 className="font-serif text-sm font-semibold tracking-wide uppercase">
        {label}
      </h2>
      <div className="bg-line h-px flex-1" />
      {trailing && (
        <span className="text-ink-2 font-mono text-[10px]">{trailing}</span>
      )}
    </div>
  );
}

/* ── Metric card ─────────────────────────────────────────────────────────────── */

interface MetricItem {
  label: string;
  value: string;
  period: string;
}

function metricValue(
  label: string,
  value: number | null | undefined,
  formatter: (value: number) => string,
  period: string,
): MetricItem | null {
  if (value == null || value === 0 || !Number.isFinite(value)) return null;
  return { label, value: formatter(value), period };
}

function buildMetrics(metrics: FinancialMetrics, asOf: string) {
  const source = `Market data · ${asOf}`;
  return [
    metricValue(
      "Price",
      metrics.currentPrice,
      (v) => formatMoney(v, metrics.currency),
      source,
    ),
    metricValue(
      "Market cap",
      metrics.marketCap,
      (v) => formatCompactMoney(v, metrics.currency),
      source,
    ),
    metricValue(
      "Revenue growth YoY",
      metrics.revenueGrowthYoy,
      (v) => `${formatNumber(v, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "Gross margin",
      metrics.grossMargin,
      (v) => `${formatNumber(v, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "Operating margin",
      metrics.operatingMargin,
      (v) => `${formatNumber(v, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "Net margin",
      metrics.netMargin,
      (v) => `${formatNumber(v, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "EPS TTM",
      metrics.eps,
      (v) => formatMoney(v, metrics.currency),
      source,
    ),
    metricValue(
      "P/E TTM",
      metrics.peRatio,
      (v) => `${formatNumber(v, { maximumFractionDigits: 1 })}x`,
      source,
    ),
    metricValue(
      "Forward P/E",
      metrics.forwardPE,
      (v) => `${formatNumber(v, { maximumFractionDigits: 1 })}x`,
      source,
    ),
    metricValue(
      "Free cash flow",
      metrics.freeCashFlow,
      (v) => formatCompactMoney(v, metrics.currency),
      source,
    ),
    metricValue(
      "Net cash",
      metrics.netCash,
      (v) => formatCompactMoney(v, metrics.currency),
      source,
    ),
    metricValue(
      "EV/EBITDA",
      metrics.evEbitda,
      (v) => `${formatNumber(v, { maximumFractionDigits: 1 })}x`,
      source,
    ),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

/* ── Data fetching ───────────────────────────────────────────────────────────── */

async function getCompanyData(symbol: string) {
  const resolution = await cachedResolveEntity(symbol);
  if (!resolution.ok) return null;

  try {
    const raw = await cachedFetchYahooFinance(resolution.ticker);
    const { metrics: financials } = sanitizeFinancialMetrics(raw);
    return { entity: resolution, financials };
  } catch {
    return { entity: resolution, financials: null };
  }
}

/* ── Metadata ────────────────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, symbol } = await params;
  const data = await getCompanyData(symbol);
  if (!data) {
    return getMetadata({ title: "Company Research" })({
      params: Promise.resolve({ locale }),
    });
  }

  return getMetadata({
    title: `${data.entity.companyName} (${data.entity.ticker}) Research`,
    description: `Verified company page for ${data.entity.companyName}: entity lock, current metrics, lens summaries, and monitorable thesis checks.`,
  })({
    params: Promise.resolve({ locale }),
  });
}

/* ── Page ────────────────────────────────────────────────────────────────────── */

const LENS_ITEMS = [
  { name: "Supply chain", color: "var(--l1)" },
  { name: "Fundamentals", color: "var(--l2)" },
  { name: "Macro", color: "var(--l3)" },
  { name: "Technical", color: "var(--l4)" },
  { name: "Sentiment", color: "var(--l5)" },
  { name: "Risk", color: "var(--l6)" },
] as const;

export default async function CompanyPage({ params }: PageProps) {
  const { symbol } = await params;
  const data = await getCompanyData(symbol);
  if (!data) return notFound();

  const { user } = await getSession();
  const asOf = new Date().toISOString().slice(0, 10);
  const metrics = data.financials ? buildMetrics(data.financials, asOf) : [];
  const sector = data.financials?.sector || "Sector unavailable";
  const industry = data.financials?.industry || "Industry unavailable";

  return (
    <div className="text-ink">
      {/* ── Top bar ── */}
      <div className="bg-paper/95 border-line sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between">
          <div className="w-full md:max-w-2xl">
            <EntitySearch initialValue={data.entity.ticker} compact />
          </div>
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <Link
              href="/"
              className="text-ink-2 hover:text-ink border-line rounded-full border px-3 py-2 text-sm"
            >
              Home
            </Link>
            <WatchlistStar symbol={data.entity.ticker} />
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-0">
        {/* ── Hero banner (JPM gradient) ── */}
        <section className="from-lock to-lock/80 -mx-4 bg-gradient-to-r px-8 py-8 text-white md:py-10">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              {/* Equity Research tag */}
              <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase opacity-70">
                Equity Research · Company Profile
              </p>

              {/* Entity lock badge */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ENTITY LOCK
              </div>

              {/* Company name */}
              <h1
                className="notranslate font-serif text-3xl font-semibold tracking-tight md:text-5xl"
                translate="no"
              >
                {data.entity.companyName}
              </h1>

              {/* Exchange · Ticker · Industry */}
              <p
                className="notranslate mt-3 font-mono text-sm opacity-80"
                translate="no"
              >
                {data.entity.exchange || "Exchange unavailable"} ·{" "}
                {data.entity.ticker} · {industry}
              </p>

              {/* Sector */}
              <p className="mt-1 font-mono text-xs opacity-60">
                {sector} · {industry}
              </p>
            </div>

            {/* Right column: price + change */}
            <div className="hidden flex-col items-end gap-2 pt-8 md:flex">
              {data.financials && (
                <>
                  <p
                    className="notranslate font-serif text-4xl font-semibold"
                    translate="no"
                  >
                    {formatMoney(
                      data.financials.currentPrice,
                      data.financials.currency,
                    )}
                  </p>
                  <PriceChangeBadge
                    change={data.financials.priceChange}
                    changePercent={data.financials.priceChangePercent}
                    marketState={data.financials.marketState}
                  />
                </>
              )}
              <p className="mt-1 font-mono text-[10px] opacity-50">
                Market data · {asOf}
              </p>
            </div>
          </div>
        </section>

        {/* ── Key Metrics ── */}
        <section className="border-line border-b py-8">
          <SectionHeader
            label="Key Metrics"
            trailing="each figure carries source date"
          />

          {metrics.length > 0 ? (
            <div className="border-line bg-line grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="bg-panel p-4">
                  <p className="text-ink-2 text-[11px] font-medium tracking-wide uppercase">
                    {metric.label}
                  </p>
                  <p
                    className="notranslate mt-2 font-serif text-2xl font-semibold"
                    translate="no"
                  >
                    {metric.value}
                  </p>
                  <p className="text-ink-2 mt-1.5 font-mono text-[10px]">
                    {metric.period}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-panel text-ink-2 border-line rounded-xl border p-6 text-sm">
              Verified entity is available, but current metrics are unavailable.
            </div>
          )}
        </section>

        {/* ── Six Lens + Invalidation ── */}
        <section className="grid gap-8 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Six Lens */}
          <div>
            <SectionHeader label="Six Lens Analysis" />
            <div className="bg-panel border-line rounded-xl border p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="text-ink-2 text-sm">
                  Deep-dive summaries will appear here when a cached report
                  exists.
                </p>
                {user ? (
                  <button
                    type="button"
                    className="bg-ink text-paper shrink-0 rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-90"
                  >
                    Generate deep dive
                  </button>
                ) : (
                  <Link
                    href={`/auth/login?redirectTo=${encodeURIComponent(`/t/${data.entity.ticker}`)}`}
                    className="bg-ink text-paper shrink-0 rounded-full px-4 py-2 text-sm font-medium transition hover:opacity-90"
                  >
                    Sign in to generate
                  </Link>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {LENS_ITEMS.map((lens) => (
                  <div
                    key={lens.name}
                    className="group border-line hover:border-lock/30 relative overflow-hidden rounded-lg border p-4 transition"
                  >
                    {/* Color accent bar */}
                    <div
                      className="absolute top-0 left-0 h-full w-0.5"
                      style={{ backgroundColor: lens.color }}
                    />
                    <p className="font-medium">{lens.name}</p>
                    <p className="text-ink-2 mt-2 text-xs leading-relaxed">
                      Awaiting cached report.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Invalidation & Monitors */}
          <div>
            <SectionHeader label="Invalidation & Monitors" />
            <div className="bg-panel border-line rounded-xl border p-6">
              <p className="text-ink-2 text-sm leading-6">
                Monitor rows are generated from deep-dive reports. When
                available, each row can be added to the company watchlist.
              </p>
              <div className="border-line bg-tint/30 mt-5 rounded-lg border p-4">
                <p className="text-ink-2 font-mono text-xs">
                  No monitor panel cached for{" "}
                  <span className="notranslate" translate="no">
                    {data.entity.ticker}
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-line border-t">
        <div className="text-ink-2 mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>Decision-support analysis only. Not investment advice.</p>
          <p className="font-mono">
            /deep-dive{" "}
            <span className="notranslate" translate="no">
              {data.entity.ticker}
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
