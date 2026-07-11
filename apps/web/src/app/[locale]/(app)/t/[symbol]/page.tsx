/* oxlint-disable i18next/no-literal-string */

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cachedFetchYahooFinance,
  cachedResolveEntity,
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

function metricValue(
  label: string,
  value: number | null | undefined,
  formatter: (value: number) => string,
  period: string,
) {
  if (value == null || value === 0 || !Number.isFinite(value)) return null;
  return { label, value: formatter(value), period };
}

function buildMetrics(metrics: FinancialMetrics, asOf: string) {
  const source = `Market data · ${asOf}`;
  return [
    metricValue(
      "Price",
      metrics.currentPrice,
      (value) => formatMoney(value, metrics.currency),
      source,
    ),
    metricValue(
      "Market cap",
      metrics.marketCap,
      (value) => formatCompactMoney(value, metrics.currency),
      source,
    ),
    metricValue(
      "Revenue growth YoY",
      metrics.revenueGrowthYoy,
      (value) => `${formatNumber(value, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "Gross margin",
      metrics.grossMargin,
      (value) => `${formatNumber(value, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "Operating margin",
      metrics.operatingMargin,
      (value) => `${formatNumber(value, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "Net margin",
      metrics.netMargin,
      (value) => `${formatNumber(value, { maximumFractionDigits: 1 })}%`,
      source,
    ),
    metricValue(
      "EPS TTM",
      metrics.eps,
      (value) => formatMoney(value, metrics.currency),
      source,
    ),
    metricValue(
      "P/E TTM",
      metrics.peRatio,
      (value) => `${formatNumber(value, { maximumFractionDigits: 1 })}x`,
      source,
    ),
    metricValue(
      "Forward P/E",
      metrics.forwardPE,
      (value) => `${formatNumber(value, { maximumFractionDigits: 1 })}x`,
      source,
    ),
    metricValue(
      "Free cash flow",
      metrics.freeCashFlow,
      (value) => formatCompactMoney(value, metrics.currency),
      source,
    ),
    metricValue(
      "Net cash",
      metrics.netCash,
      (value) => formatCompactMoney(value, metrics.currency),
      source,
    ),
    metricValue(
      "EV/EBITDA",
      metrics.evEbitda,
      (value) => `${formatNumber(value, { maximumFractionDigits: 1 })}x`,
      source,
    ),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function getCompanyData(symbol: string) {
  const resolution = await cachedResolveEntity(symbol);
  if (!resolution.ok) return null;

  try {
    const financials = await cachedFetchYahooFinance(resolution.ticker);
    return { entity: resolution, financials };
  } catch {
    return { entity: resolution, financials: null };
  }
}

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

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <section className="border-b pb-7">
          <div className="bg-tint text-lock border-tint-line mb-4 inline-flex rounded-full border px-3 py-1 font-mono text-xs">
            ENTITY LOCK
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1
                className="notranslate font-serif text-4xl font-semibold tracking-tight md:text-6xl"
                translate="no"
              >
                {data.entity.companyName}
              </h1>
              <p
                className="notranslate text-ink-2 mt-3 font-mono text-sm"
                translate="no"
              >
                {data.entity.exchange || "Exchange unavailable"} ·{" "}
                {data.entity.ticker} · {industry}
              </p>
            </div>
            <div className="text-ink-2 font-mono text-xs">
              Market data · {asOf}
            </div>
          </div>
          <p className="text-ink-2 mt-3 font-mono text-xs">
            {sector} · {industry}
          </p>
        </section>

        <section className="py-7">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">Key metrics</h2>
            <span className="text-ink-2 font-mono text-xs">
              each figure carries source date
            </span>
          </div>
          {metrics.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="bg-panel border-line rounded-2xl border p-4"
                >
                  <p className="text-ink-2 text-xs">{metric.label}</p>
                  <p
                    className="notranslate mt-2 font-mono text-2xl font-semibold"
                    translate="no"
                  >
                    {metric.value}
                  </p>
                  <p className="text-ink-2 mt-2 font-mono text-[11px]">
                    {metric.period}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-panel text-ink-2 border-line rounded-2xl border p-5 text-sm">
              Verified entity is available, but current metrics are unavailable.
            </div>
          )}
        </section>

        <section className="grid gap-4 py-7 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-panel border-line rounded-2xl border p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Six lens</h2>
                <p className="text-ink-2 mt-1 text-sm">
                  Deep-dive summaries will appear here when a cached report
                  exists.
                </p>
              </div>
              {user ? (
                <button
                  type="button"
                  className="bg-ink text-paper rounded-full px-4 py-2 text-sm"
                >
                  Generate deep dive
                </button>
              ) : (
                <Link
                  href={`/auth/login?redirectTo=${encodeURIComponent(`/t/${data.entity.ticker}`)}`}
                  className="bg-ink text-paper rounded-full px-4 py-2 text-sm"
                >
                  Sign in to generate
                </Link>
              )}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Supply chain",
                "Fundamentals",
                "Macro",
                "Technical",
                "Sentiment",
                "Risk",
              ].map((lens) => (
                <div
                  key={lens}
                  className="bg-panel border-line rounded-xl border p-4"
                >
                  <p className="font-medium">{lens}</p>
                  <p className="text-ink-2 mt-2 text-xs">
                    Awaiting cached report.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border-line rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">Invalidation and monitors</h2>
            <p className="text-ink-2 mt-2 text-sm leading-6">
              Monitor rows are generated from deep-dive reports. When available,
              each row can be added to the company watchlist.
            </p>
            <div className="bg-muted/20 text-ink-2 border-line mt-5 rounded-xl border p-4 font-mono text-xs">
              No monitor panel cached for{" "}
              <span className="notranslate" translate="no">
                {data.entity.ticker}
              </span>
              .
            </div>
          </div>
        </section>
      </main>

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
