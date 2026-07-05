import { ttlMemoize } from "./cache";
import { resolveEntity } from "./entity-resolution";
import { fetchTechnicalMetrics } from "./technicals";
import { fetchYahooFinance } from "./yahoo-finance";

const FIVE_MINUTES = 5 * 60 * 1000;

const normalizeTicker = (ticker: string) => ticker.trim().toUpperCase();
const normalizeQuery = (query: string) => query.trim();

export const cachedResolveEntity = ttlMemoize(resolveEntity, {
  ttlMs: FIVE_MINUTES,
  key: (input) => normalizeQuery(input).toLowerCase(),
});

export const cachedFetchYahooFinance = ttlMemoize(fetchYahooFinance, {
  ttlMs: FIVE_MINUTES,
  key: (ticker) => normalizeTicker(ticker),
});

export const cachedFetchTechnicalMetrics = ttlMemoize(fetchTechnicalMetrics, {
  ttlMs: FIVE_MINUTES,
  key: (ticker) => normalizeTicker(ticker),
});
