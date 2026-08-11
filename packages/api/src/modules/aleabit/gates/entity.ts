/**
 * AleaBit — Entity gate (pure function) (#119)
 *
 * Extracts candidate tickers and company names from post text.
 * Returns resolution result with needsReview flag when ambiguous.
 *
 * This is a text-only extraction. Actual verification (market data lookup,
 * SEC EDGAR) happens at the route level.
 */
import type { EntityResolution } from "@workspace/shared/types/aleabit";

// ── Known ticker patterns ────────────────────────────────────────────────────

// $TICKER or $TICKER.US format
const TICKER_PATTERN = /\$([A-Z]{1,5})(?:\.([A-Z]{1,3}))?\b/g;

// Common company name → ticker mapping (curated, not exhaustive)
const KNOWN_COMPANIES: Record<string, { ticker: string; market: string }> = {
  nvidia: { ticker: "NVDA", market: "US" },
  apple: { ticker: "AAPL", market: "US" },
  microsoft: { ticker: "MSFT", market: "US" },
  tesla: { ticker: "TSLA", market: "US" },
  amazon: { ticker: "AMZN", market: "US" },
  google: { ticker: "GOOGL", market: "US" },
  alphabet: { ticker: "GOOGL", market: "US" },
  meta: { ticker: "META", market: "US" },
  tsmc: { ticker: "TSM", market: "US" },
  asml: { ticker: "ASML", market: "US" },
  broadcom: { ticker: "AVGO", market: "US" },
  amd: { ticker: "AMD", market: "US" },
  intel: { ticker: "INTC", market: "US" },
  samsung: { ticker: "005930.KS", market: "KR" },
  "sk hynix": { ticker: "000660.KS", market: "KR" },
  qualcomm: { ticker: "QCOM", market: "US" },
  oracle: { ticker: "ORCL", market: "US" },
  salesforce: { ticker: "CRM", market: "US" },
  netflix: { ticker: "NFLX", market: "US" },
  palantir: { ticker: "PLTR", market: "US" },
  snowflake: { ticker: "SNOW", market: "US" },
  crowdstrike: { ticker: "CRWD", market: "US" },
  baba: { ticker: "BABA", market: "US" },
  alibaba: { ticker: "BABA", market: "US" },
  jd: { ticker: "JD", market: "US" },
  pdd: { ticker: "PDD", market: "US" },
  byd: { ticker: "1211.HK", market: "HK" },
  nio: { ticker: "NIO", market: "US" },
  rivian: { ticker: "RIVN", market: "US" },
  lucid: { ticker: "LCID", market: "US" },
};

// ── Entity extraction ────────────────────────────────────────────────────────

export function extractEntityCandidates(
  text: string,
): Array<{ name: string; ticker: string; market: string; confidence: number }> {
  const candidates: Array<{
    name: string;
    ticker: string;
    market: string;
    confidence: number;
  }> = [];
  const seen = new Set<string>();

  // 1. Extract $TICKER mentions
  const tickerMatches = [...text.matchAll(TICKER_PATTERN)];
  for (const match of tickerMatches) {
    const ticker = match[1];
    const suffix = match[2];
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);

    const market = suffix
      ? suffix === "HK"
        ? "HK"
        : suffix === "KS"
          ? "KR"
          : "US"
      : "US";

    candidates.push({
      name: ticker,
      ticker: suffix ? `${ticker}.${suffix}` : ticker,
      market,
      confidence: 0.85,
    });
  }

  // 2. Extract known company names
  const lowerText = text.toLowerCase();
  for (const [name, info] of Object.entries(KNOWN_COMPANIES)) {
    if (seen.has(info.ticker)) continue;
    // Word boundary check
    const pattern = new RegExp(`\\b${name}\\b`, "i");
    if (pattern.test(lowerText)) {
      seen.add(info.ticker);
      candidates.push({
        name,
        ticker: info.ticker,
        market: info.market,
        confidence: 0.8,
      });
    }
  }

  return candidates;
}

// ── Entity resolution gate ────────────────────────────────────────────────────

export function resolveEntity(text: string): EntityResolution {
  const candidates = extractEntityCandidates(text);

  if (candidates.length === 0) {
    return {
      ok: false,
      confidence: 0,
      needsReview: true,
      reviewReason: "No identifiable company or ticker found in post.",
    };
  }

  if (candidates.length > 1) {
    // Multiple entities — pick highest confidence, flag for review
    const best = candidates.sort((a, b) => b.confidence - a.confidence)[0]!;
    return {
      ok: true,
      ticker: best.ticker,
      companyName: best.name,
      market: best.market,
      confidence: best.confidence * 0.7, // penalize ambiguity
      needsReview: true,
      reviewReason: `Multiple entities detected: ${candidates.map((c) => c.ticker).join(", ")}. Selected ${best.ticker} but may need manual confirmation.`,
    };
  }

  // Single entity
  const entity = candidates[0]!;
  return {
    ok: true,
    ticker: entity.ticker,
    companyName: entity.name,
    market: entity.market,
    confidence: entity.confidence,
    needsReview: entity.confidence < 0.7,
    reviewReason:
      entity.confidence < 0.7 ? "Low confidence entity match." : undefined,
  };
}
