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

import { fetchTickerMeta, type EntityCandidate } from "./entity-resolution";
import { getYahooCrumb } from "./yahoo-finance";

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
  source: "etf" | "search"; // provenance: ETF holdings or web search
  exchange?: string; // e.g. "SSE", "SZSE", "HKEX", "NMS"
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
      source: "etf" as const,
      exchange: inferExchange(symbol),
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

// ─── Exchange inference ──────────────────────────────────────────────────────

function inferExchange(symbol: string): string {
  if (symbol.endsWith(".SS")) return "SSE";
  if (symbol.endsWith(".SZ")) return "SZSE";
  if (symbol.endsWith(".HK")) return "HKEX";
  if (/^\d{6}$/.test(symbol)) return "A-share";
  return "US";
}

// ─── A/H cross-market expansion ──────────────────────────────────────────────

const AH_SEARCH_TIMEOUT = 6_000;
const MAX_AH_PEERS = 6;

/**
 * Yahoo Finance search result item (minimal shape).
 */
interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

/**
 * Check if a Yahoo search result is an A-share or H-share equity.
 * A-shares: .SS (Shanghai), .SZ (Shenzhen)
 * H-shares: .HK (Hong Kong)
 */
function isAHShare(quote: YahooSearchQuote): boolean {
  const sym = quote.symbol ?? "";
  return (
    /\.(SS|SZ|HK)$/.test(sym) &&
    (quote.quoteType === "EQUITY" || quote.typeDisp === "Equity")
  );
}

/**
 * Search Yahoo Finance for A-share / H-share peers of a theme.
 * Generates search queries from the theme + sector keywords.
 */
async function searchYahooForAHPeers(
  query: string,
  existingSymbols: Set<string>,
): Promise<{ symbol: string; name: string }[]> {
  // Build search queries: theme + exchange hints
  const queries = [
    `${query} A股`,
    `${query} 股票`,
    `${query} H-share`,
    `${query} Hong Kong`,
  ];

  const seen = new Set<string>();
  const results: { symbol: string; name: string }[] = [];

  for (const q of queries) {
    if (results.length >= MAX_AH_PEERS) break;
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(AH_SEARCH_TIMEOUT),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as YahooSearchResponse;
      for (const quote of json.quotes ?? []) {
        if (!isAHShare(quote)) continue;
        const sym = quote.symbol!.toUpperCase();
        if (seen.has(sym) || existingSymbols.has(sym)) continue;
        seen.add(sym);
        results.push({
          symbol: sym,
          name: quote.longname ?? quote.shortname ?? sym,
        });
        if (results.length >= MAX_AH_PEERS) break;
      }
    } catch {
      // Search failed — continue with next query
    }
  }
  return results;
}

/**
 * Verify A/H peer candidates through the entity gate.
 * Uses fetchTickerMeta (same path as resolveEntity) to confirm the ticker
 * is live and has data. Returns only verified peers.
 *
 * THIS IS THE ANTI-HALLUCINATION GATE: every A/H peer must pass through
 * here before entering the universe. Unverified = excluded.
 */
async function verifyAHpeers(
  candidates: { symbol: string; name: string }[],
): Promise<{ symbol: string; name: string; exchange: string }[]> {
  const verified: { symbol: string; name: string; exchange: string }[] = [];

  await Promise.allSettled(
    candidates.map(async (c) => {
      try {
        const meta = await fetchTickerMeta(c.symbol);
        if (meta && meta.regularMarketPrice != null) {
          verified.push({
            symbol: c.symbol,
            name: meta.longName ?? meta.shortName ?? c.name,
            exchange: inferExchange(c.symbol),
          });
        }
      } catch {
        // Verification failed — exclude
      }
    }),
  );

  return verified;
}

/**
 * Expand the industry universe with A/H cross-market peers.
 *
 * Flow: search Yahoo → entity gate (verify) → add to universe.
 * Each step is mandatory — skipping the gate = hallucination risk.
 */
export async function expandWithAHPeers(
  universe: IndustryUniverse,
): Promise<IndustryUniverse> {
  const existingSymbols = new Set(universe.constituents.map((c) => c.symbol));

  // Step 1: Search for A/H peer candidates
  const candidates = await searchYahooForAHPeers(
    universe.query,
    existingSymbols,
  );
  if (candidates.length === 0) return universe;

  // Step 2: Entity gate — verify every candidate
  const verified = await verifyAHpeers(candidates);
  if (verified.length === 0) return universe;

  // Step 3: Add verified A/H peers to the universe
  const ahPeers: ThemeConstituent[] = verified.map((v) => ({
    symbol: v.symbol,
    name: v.name,
    avgWeightPct: 0, // not from ETF holdings
    heldByEtfs: 0,
    source: "search" as const,
    exchange: v.exchange,
  }));

  return {
    ...universe,
    constituents: [...universe.constituents, ...ahPeers],
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

  // Split constituents by source
  const etfConstituents = u.constituents.filter((c) => c.source === "etf");
  const ahConstituents = u.constituents.filter((c) => c.source === "search");

  const etfRows = etfConstituents
    .map(
      (c) =>
        `  ${c.symbol.padEnd(10)} ${String(c.avgWeightPct).padStart(6)}%   held by ${c.heldByEtfs}/${u.etfs.length} ETFs   ${c.name}`,
    )
    .join("\n");

  const sections = [
    `REAL THEME DATA for "${u.query}" — as of ${u.asOf}.`,
    `Universe derived from the disclosed holdings of ${u.etfs.length} theme ETF(s):`,
    etfLines,
    "",
    "Merged top constituents (avg portfolio weight; ETF consensus):",
    etfRows,
  ];

  if (ahConstituents.length > 0) {
    const ahRows = ahConstituents
      .map(
        (c) =>
          `  ${c.symbol.padEnd(10)} ${(c.exchange ?? "?").padEnd(6)} ${c.name}`,
      )
      .join("\n");
    sections.push(
      "",
      "Cross-market A/H peers (sourced from Yahoo Finance search, verified via entity gate):",
      ahRows,
      "",
      "For each chain layer that has an A/H peer, produce a cross-market valuation gap:",
      "  same-layer US peer vs A/H peer, same multiple, both period-labeled.",
      "  State the gap as a fact and explain structural reasons (liquidity,",
      "  capital controls, governance premium, index inclusion).",
      "  Available multiples: EV/EBITDA, P/B, gross margin, revenue growth.",
      "  DO NOT compare P/E or P/S — A-shares return null for these.",
    );
  } else {
    sections.push(
      "",
      "No A-share/H-share peers found in search results for this theme.",
      "Do NOT list A/H companies from memory. If you cannot source an A/H",
      'peer, write: "No listed A-share/H-share pure play found in sources."',
    );
  }

  sections.push(
    "",
    "INDUSTRY MODE RULES:",
    "1. These constituents are the ONLY companies you may present as the",
    "   theme's listed players. Never add companies from memory.",
    "2. Your job: map the value chain, classify each constituent into a",
    "   chain layer, and identify which layers show bottleneck dynamics",
    "   (sole-source, pricing power, small % of downstream BOM).",
    "3. Do NOT output per-stock technicals, price targets, entry/stop",
    "   levels, or conviction tiers — those require a single-stock Deep",
    "   Dive. End by suggesting 2-3 constituents worth a full Deep Dive.",
    "4. A/H peers tagged [search] are verified but NOT from ETF holdings.",
    "   Include them on equal footing in the value chain and valuation gap.",
  );

  return sections.join("\n");
}
