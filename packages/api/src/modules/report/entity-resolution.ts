interface YahooSearchQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
  score?: number;
}

interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
}

interface YahooChartMeta {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  currency?: string;
  exchangeName?: string;
  fullExchangeName?: string;
  instrumentType?: string;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
    }>;
  };
}

export interface ResolvedEntity {
  ok: true;
  mode: "ticker";
  input: string;
  ticker: string;
  companyName: string;
  exchange: string;
  quoteType: string;
  price: number | null;
  currency: string | null;
  entityLock: string;
}

export interface EntityCandidate {
  ticker: string;
  companyName: string;
  exchange: string;
  quoteType: string;
}

export interface UnresolvedEntity {
  ok: false;
  mode: "clarify" | "industry";
  input: string;
  reason: string;
  candidates: EntityCandidate[];
  message: string;
}

export type EntityResolution = ResolvedEntity | UnresolvedEntity;

const tickerPattern = /^[A-Z0-9][A-Z0-9.-]{0,14}$/;

const normalizeInput = (input: string) => input.trim();

const normalizeTicker = (input: string) =>
  normalizeInput(input).replace(/\s+/g, "").toUpperCase();

const isLikelyTicker = (input: string) =>
  tickerPattern.test(normalizeTicker(input));

const toCandidate = (quote: YahooSearchQuote): EntityCandidate | null => {
  if (!quote.symbol) return null;
  if (quote.quoteType && !["EQUITY", "ETF"].includes(quote.quoteType)) {
    return null;
  }

  return {
    ticker: quote.symbol.toUpperCase(),
    companyName: quote.longname ?? quote.shortname ?? quote.symbol,
    exchange: quote.exchange ?? "",
    quoteType: quote.quoteType ?? quote.typeDisp ?? "EQUITY",
  };
};

export const fetchYahooSearchCandidates = async (
  query: string,
): Promise<EntityCandidate[]> => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return [];

  const json = (await response.json()) as YahooSearchResponse;
  const candidates = (json.quotes ?? [])
    .map(toCandidate)
    .filter((candidate): candidate is EntityCandidate => !!candidate);

  return Array.from(
    new Map(
      candidates.map((candidate) => [candidate.ticker, candidate]),
    ).values(),
  );
};

const fetchTickerMeta = async (
  ticker: string,
): Promise<YahooChartMeta | null> => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) return null;

  const json = (await response.json()) as YahooChartResponse;
  const meta = json.chart?.result?.[0]?.meta;
  if (!meta?.symbol) return null;

  return meta;
};

export const buildEntityLock = (entity: {
  ticker: string;
  companyName: string;
  exchange: string;
  quoteType: string;
}) =>
  [
    "ENTITY LOCK",
    `Ticker: ${entity.ticker}`,
    `Company: ${entity.companyName}`,
    `Exchange: ${entity.exchange || "unknown"}`,
    `Quote type: ${entity.quoteType || "unknown"}`,
    "All analysis sections must analyze this exact entity. Do not reinterpret the user input, substitute a similar company, or invent a ticker. If data is missing, say the data is unavailable.",
  ].join("\n");

export const resolveEntity = async (
  input: string,
): Promise<EntityResolution> => {
  const query = normalizeInput(input);
  if (!query) {
    return {
      ok: false,
      mode: "clarify",
      input,
      reason: "empty_input",
      candidates: [],
      message: "Enter a listed ticker or a clear company name.",
    };
  }

  const candidates = await fetchYahooSearchCandidates(query);

  if (isLikelyTicker(query)) {
    const ticker = normalizeTicker(query);
    const meta = await fetchTickerMeta(ticker);

    if (meta) {
      const entity = {
        ticker: (meta.symbol ?? ticker).toUpperCase(),
        companyName: meta.longName ?? meta.shortName ?? ticker,
        exchange: meta.fullExchangeName ?? meta.exchangeName ?? "",
        quoteType: meta.instrumentType ?? "EQUITY",
        price:
          typeof meta.regularMarketPrice === "number"
            ? meta.regularMarketPrice
            : null,
        currency: meta.currency ?? null,
      };

      return {
        ok: true,
        mode: "ticker",
        input: query,
        ...entity,
        entityLock: buildEntityLock(entity),
      };
    }

    return {
      ok: false,
      mode: "clarify",
      input: query,
      reason: "invalid_ticker",
      candidates,
      message:
        candidates.length > 0
          ? `No listed ticker matched "${query}". Choose one of the candidates or enter a valid symbol.`
          : `No listed ticker matched "${query}". Enter a valid symbol or switch to industry research mode.`,
    };
  }

  const exactCandidate =
    candidates.length === 1
      ? candidates[0]
      : candidates.find((candidate) => {
          const name = candidate.companyName.toLowerCase();
          return name === query.toLowerCase();
        });

  if (exactCandidate) {
    const meta = await fetchTickerMeta(exactCandidate.ticker);
    if (meta) {
      const entity = {
        ticker: (meta.symbol ?? exactCandidate.ticker).toUpperCase(),
        companyName:
          meta.longName ?? meta.shortName ?? exactCandidate.companyName,
        exchange:
          meta.fullExchangeName ?? meta.exchangeName ?? exactCandidate.exchange,
        quoteType: meta.instrumentType ?? exactCandidate.quoteType,
        price:
          typeof meta.regularMarketPrice === "number"
            ? meta.regularMarketPrice
            : null,
        currency: meta.currency ?? null,
      };

      return {
        ok: true,
        mode: "ticker",
        input: query,
        ...entity,
        entityLock: buildEntityLock(entity),
      };
    }
  }

  return {
    ok: false,
    mode: "industry",
    input: query,
    reason: "not_a_unique_ticker",
    candidates,
    message:
      candidates.length > 0
        ? `"${query}" is not a unique listed ticker. Choose a candidate ticker, or run an industry/material research workflow.`
        : `"${query}" looks like an industry, material, or theme rather than a listed ticker. Use industry research mode instead of stock technical analysis.`,
  };
};

export const validateSymbol = async (ticker: string) => {
  const resolution = await resolveEntity(ticker);
  return resolution.ok ? resolution : null;
};
