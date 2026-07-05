interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketPrice?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

export interface PriceBar {
  date: string;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface TechnicalLevels {
  support: number[];
  resistance: number[];
}

export interface TechnicalMetrics {
  ticker: string;
  asOf: string;
  currency: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macd: {
    value: number | null;
    signal: number | null;
    histogram: number | null;
    trend: "bullish" | "bearish" | "neutral";
  };
  levels: TechnicalLevels;
  week52: {
    low: number;
    high: number;
    percentFromLow: number;
    percentFromHigh: number;
  };
  volume: {
    latest: number;
    average20: number | null;
    ratio20: number | null;
  };
}

const round = (value: number, digits = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value;

const compactNumber = (value: number | null) =>
  value == null ? "N/A" : String(round(value));

const average = (values: number[]) => {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const sma = (values: number[], period: number) => {
  if (values.length < period) return null;
  return average(values.slice(-period));
};

const emaSeries = (values: number[], period: number) => {
  if (values.length < period) return [];

  const smoothing = 2 / (period + 1);
  const seed = average(values.slice(0, period));
  if (seed == null) return [];

  const series: number[] = [seed];
  for (const value of values.slice(period)) {
    const previous = series.at(-1) ?? seed;
    series.push(value * smoothing + previous * (1 - smoothing));
  }

  return series;
};

const rsiWilder = (values: number[], period = 14) => {
  if (values.length <= period) return null;

  const changes = values
    .slice(1)
    .map((value, index) => value - (values[index] ?? value));
  let averageGain =
    changes
      .slice(0, period)
      .filter((change) => change > 0)
      .reduce((sum, change) => sum + change, 0) / period;
  let averageLoss =
    Math.abs(
      changes
        .slice(0, period)
        .filter((change) => change < 0)
        .reduce((sum, change) => sum + change, 0),
    ) / period;

  for (const change of changes.slice(period)) {
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;
  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
};

const macdMetrics = (values: number[]): TechnicalMetrics["macd"] => {
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  if (!ema12.length || !ema26.length) {
    return { value: null, signal: null, histogram: null, trend: "neutral" };
  }

  const alignedEma12 = ema12.slice(ema12.length - ema26.length);
  const macdLine = ema26.map(
    (value, index) => (alignedEma12[index] ?? value) - value,
  );
  const signalLine = emaSeries(macdLine, 9);
  if (!signalLine.length) {
    return { value: null, signal: null, histogram: null, trend: "neutral" };
  }

  const value = macdLine.at(-1) ?? null;
  const signal = signalLine.at(-1) ?? null;
  const histogram = value != null && signal != null ? value - signal : null;
  const trend =
    histogram == null
      ? "neutral"
      : histogram > 0
        ? "bullish"
        : histogram < 0
          ? "bearish"
          : "neutral";

  return { value, signal, histogram, trend };
};

const dedupeLevels = (levels: number[], threshold = 0.015) => {
  const sorted = levels.sort((a, b) => a - b);
  const deduped: number[] = [];

  for (const level of sorted) {
    const previous = deduped.at(-1);
    if (!previous || Math.abs(level - previous) / previous > threshold) {
      deduped.push(level);
    }
  }

  return deduped;
};

const pivotLevels = (bars: PriceBar[], close: number): TechnicalLevels => {
  const support: number[] = [];
  const resistance: number[] = [];

  for (let index = 2; index < bars.length - 2; index += 1) {
    const window = bars.slice(index - 2, index + 3);
    const bar = bars[index];
    if (!bar) continue;

    const isPivotLow = window.every((item) => bar.low <= item.low);
    const isPivotHigh = window.every((item) => bar.high >= item.high);

    if (isPivotLow && bar.low < close) support.push(bar.low);
    if (isPivotHigh && bar.high > close) resistance.push(bar.high);
  }

  return {
    support: dedupeLevels(support)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .map((value) => round(value)),
    resistance: dedupeLevels(resistance)
      .sort((a, b) => a - b)
      .slice(0, 3)
      .map((value) => round(value)),
  };
};

export const calculateTechnicalMetrics = (
  ticker: string,
  bars: PriceBar[],
  currency = "USD",
): TechnicalMetrics => {
  if (bars.length < 30) {
    throw new Error(`Insufficient price history for ${ticker}`);
  }

  const closes = bars.map((bar) => bar.close);
  const volumes = bars.map((bar) => bar.volume);
  const latest = bars.at(-1);
  if (!latest) throw new Error(`No price history for ${ticker}`);

  const high52 = Math.max(...bars.map((bar) => bar.high));
  const low52 = Math.min(...bars.map((bar) => bar.low));
  const volumeAverage20 = average(volumes.slice(-20));
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsi14 = rsiWilder(closes);
  const macd = macdMetrics(closes);

  return {
    ticker: ticker.toUpperCase(),
    asOf: latest.date,
    currency,
    close: round(latest.close),
    sma20: sma20 == null ? null : round(sma20),
    sma50: sma50 == null ? null : round(sma50),
    sma200: sma200 == null ? null : round(sma200),
    rsi14: rsi14 == null ? null : round(rsi14),
    macd: {
      value: macd.value == null ? null : round(macd.value, 4),
      signal: macd.signal == null ? null : round(macd.signal, 4),
      histogram: macd.histogram == null ? null : round(macd.histogram, 4),
      trend: macd.trend,
    },
    levels: pivotLevels(bars, latest.close),
    week52: {
      low: round(low52),
      high: round(high52),
      percentFromLow: round(((latest.close - low52) / low52) * 100, 1),
      percentFromHigh: round(((latest.close - high52) / high52) * 100, 1),
    },
    volume: {
      latest: latest.volume,
      average20: volumeAverage20 == null ? null : Math.round(volumeAverage20),
      ratio20:
        volumeAverage20 == null || volumeAverage20 === 0
          ? null
          : round(latest.volume / volumeAverage20, 2),
    },
  };
};

export const fetchYahooDailyBars = async (
  ticker: string,
): Promise<{
  bars: PriceBar[];
  currency: string;
}> => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(
      `Yahoo Finance chart returned ${response.status} for ${ticker}`,
    );
  }

  const json = (await response.json()) as YahooChartResponse;
  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = quote?.close ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const volumes = quote?.volume ?? [];

  const bars = timestamps
    .map((timestamp, index): PriceBar | null => {
      const close = closes[index];
      const high = highs[index];
      const low = lows[index];
      const volume = volumes[index];
      if (
        typeof close !== "number" ||
        typeof high !== "number" ||
        typeof low !== "number" ||
        typeof volume !== "number"
      ) {
        return null;
      }

      return {
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        close,
        high,
        low,
        volume,
      };
    })
    .filter((bar): bar is PriceBar => !!bar);

  return {
    bars,
    currency: result?.meta?.currency ?? "USD",
  };
};

export const fetchTechnicalMetrics = async (
  ticker: string,
): Promise<TechnicalMetrics> => {
  const { bars, currency } = await fetchYahooDailyBars(ticker);
  return calculateTechnicalMetrics(ticker, bars, currency);
};

export const formatTechnicalContext = (metrics: TechnicalMetrics) =>
  [
    "TECHNICAL DATA LOCK",
    `As of: ${metrics.asOf}`,
    `Ticker: ${metrics.ticker}`,
    `Close: ${metrics.currency} ${compactNumber(metrics.close)}`,
    `SMA20/SMA50/SMA200: ${compactNumber(metrics.sma20)} / ${compactNumber(metrics.sma50)} / ${compactNumber(metrics.sma200)}`,
    `RSI14: ${compactNumber(metrics.rsi14)}`,
    `MACD: value ${compactNumber(metrics.macd.value)}, signal ${compactNumber(metrics.macd.signal)}, histogram ${compactNumber(metrics.macd.histogram)} (${metrics.macd.trend})`,
    `Support: ${metrics.levels.support.join(", ") || "N/A"}`,
    `Resistance: ${metrics.levels.resistance.join(", ") || "N/A"}`,
    `52-week range: ${compactNumber(metrics.week52.low)} - ${compactNumber(metrics.week52.high)} (${metrics.week52.percentFromHigh}% from high)`,
    `Volume: ${metrics.volume.latest}; 20-day average ${compactNumber(metrics.volume.average20)}; ratio ${compactNumber(metrics.volume.ratio20)}`,
    "Use only these technical numbers. Do not invent entry prices, stop losses, support/resistance, RSI, MACD, or chart patterns. If the supplied data is insufficient for a claim, say so.",
  ].join("\n");
