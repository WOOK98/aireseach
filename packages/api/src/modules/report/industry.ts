// Industry Mode grounding: turn a theme query ("Humanoid robot", "液态硅胶")
// into a REAL, verifiable universe of listed companies — instead of letting
// the LLM invent the player list.
//
// The trick: theme ETFs. resolveEntity() already surfaces them as candidates
// (quoteType === "ETF"). An ETF's holdings table IS a professionally curated
// list of listed companies for that theme, with weights. Merge the holdings
// of 2-3 theme ETFs and you get:
//   - the constituent universe (real tickers, real names)
//   - portfolio weights (importance proxy)
//   - how many theme ETFs hold each name (consensus proxy)
//
// The LLM's job shrinks to classification (chain layers) and judgment
// (bottlenecks) — the facts all come from here.

import { getYahooCrumb } from "./yahoo-finance";

import type { EntityCandidate } from "./entity-resolution";

const UA = { "User-Agent": "Mozilla/5.0" };
const TIMEOUT = 8000;

// ─── ETF holdings ────────────────────────────────────────────────────────────

export interface EtfHolding {
  symbol: string;
  name: string;
  weightPct: number; // 0-100
}

export async function getEtfHoldings(etfSymbol: string): Promise<EtfHolding[]> {
  const { crumb, cookies } = await getYahooCrumb();
  const params = new URLSearchParams({ modules: "topHoldings" });
  if (crumb) params.set("crumb", crumb);
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(etfSymbol)}?${params}`;
  const res = await fetch(url, {
    headers: cookies ? { ...UA, Cookie: cookies } : UA,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    quoteSummary?: {
      result?: Array<{
        topHoldings?: {
          holdings?: Array<{
            symbol?: string;
            holdingName?: string;
            holdingPercent?: { raw?: number };
          }>;
        };
      }>;
    };
  };
  const holdings = json.quoteSummary?.result?.[0]?.topHoldings?.holdings ?? [];
  return holdings
    .filter((h) => h.symbol)
    .map((h) => ({
      symbol: h.symbol!.toUpperCase(),
      name: h.holdingName ?? h.symbol!,
      weightPct: Math.round((h.holdingPercent?.raw ?? 0) * 10000) / 100,
    }));
}

// ─── Universe merge ──────────────────────────────────────────────────────────

export interface ThemeConstituent {
  symbol: string;
  name: string;
  avgWeightPct: number;
  heldByEtfs: number; // consensus: how many theme ETFs hold it
}

export interface IndustryUniverse {
  query: string;
  asOf: string;
  etfs: { symbol: string; name: string; holdings: number }[];
  constituents: ThemeConstituent[]; // sorted: consensus desc, weight desc
}

export function mergeHoldings(
  query: string,
  etfHoldings: { etf: EntityCandidate; holdings: EtfHolding[] }[],
): IndustryUniverse {
  const bySymbol = new Map<
    string,
    { name: string; weights: number[]; count: number }
  >();
  for (const { holdings } of etfHoldings) {
    for (const h of holdings) {
      const cur = bySymbol.get(h.symbol);
      if (cur) {
        cur.weights.push(h.weightPct);
        cur.count += 1;
      } else {
        bySymbol.set(h.symbol, {
          name: h.name,
          weights: [h.weightPct],
          count: 1,
        });
      }
    }
  }
  const constituents: ThemeConstituent[] = [...bySymbol.entries()]
    .map(([symbol, v]) => ({
      symbol,
      name: v.name,
      avgWeightPct:
        Math.round(
          (v.weights.reduce((a, b) => a + b, 0) / v.weights.length) * 100,
        ) / 100,
      heldByEtfs: v.count,
    }))
    .sort(
      (a, b) => b.heldByEtfs - a.heldByEtfs || b.avgWeightPct - a.avgWeightPct,
    )
    .slice(0, 20);

  return {
    query,
    asOf: new Date().toISOString().slice(0, 10),
    etfs: etfHoldings.map(({ etf, holdings }) => ({
      symbol: etf.ticker,
      name: etf.companyName,
      holdings: holdings.length,
    })),
    constituents,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

const MAX_ETFS = 3;

/**
 * Build the real-data universe for a theme query from the ETF candidates
 * that resolveEntity() already found. Returns null when no ETF candidate
 * yields holdings (caller falls back to search-context-only industry mode).
 *
 * `fetchHoldings` is injectable for testing / caching.
 */
export async function buildIndustryUniverse(
  query: string,
  candidates: EntityCandidate[],
  fetchHoldings: (symbol: string) => Promise<EtfHolding[]> = getEtfHoldings,
): Promise<IndustryUniverse | null> {
  const etfs = candidates
    .filter((c) => c.quoteType === "ETF")
    .slice(0, MAX_ETFS);
  if (etfs.length === 0) return null;

  const settled = await Promise.allSettled(
    etfs.map(async (etf) => ({
      etf,
      holdings: await fetchHoldings(etf.ticker),
    })),
  );
  const withHoldings = settled
    .filter(
      (
        s,
      ): s is PromiseFulfilledResult<{
        etf: EntityCandidate;
        holdings: EtfHolding[];
      }> => s.status === "fulfilled" && s.value.holdings.length > 0,
    )
    .map((s) => s.value);
  if (withHoldings.length === 0) return null;

  return mergeHoldings(query, withHoldings);
}

/** Render the universe as an authoritative prompt block for Industry Mode. */
export function formatIndustryContext(u: IndustryUniverse): string {
  const etfLines = u.etfs
    .map(
      (e) => `  - ${e.symbol} — ${e.name} (${e.holdings} disclosed holdings)`,
    )
    .join("\n");
  const rows = u.constituents
    .map(
      (c) =>
        `  ${c.symbol.padEnd(10)} ${String(c.avgWeightPct).padStart(6)}%   held by ${c.heldByEtfs}/${u.etfs.length} ETFs   ${c.name}`,
    )
    .join("\n");
  return [
    `REAL THEME DATA for "${u.query}" — as of ${u.asOf}.`,
    `Universe derived from the disclosed holdings of ${u.etfs.length} theme ETF(s):`,
    etfLines,
    "",
    "Merged top constituents (avg portfolio weight; ETF consensus):",
    rows,
    "",
    "INDUSTRY MODE RULES:",
    "1. These constituents are the ONLY companies you may present as the",
    "   theme's listed players, unless additional names come from the",
    "   provided search context — never from memory alone.",
    "2. Your job: map the value chain, classify each constituent into a",
    "   chain layer, and identify which layers show bottleneck dynamics",
    "   (sole-source, pricing power, small % of downstream BOM).",
    "3. Do NOT output per-stock technicals, price targets, entry/stop",
    "   levels, or conviction tiers — those require a single-stock Deep",
    "   Dive. End by suggesting 2-3 constituents worth a full Deep Dive.",
  ].join("\n");
}
