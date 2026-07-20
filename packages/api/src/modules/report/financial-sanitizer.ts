// ─── Financial data quality gate ─────────────────────────────────────────────
// Validates Yahoo Finance data before rendering. Rules:
// 1. Impossible relationships → withhold affected field pair
// 2. Cross-currency derived ratios → null when currencies mismatch
// 3. Extreme value sentinels → null when magnitude is implausible
// 4. Margin bounds → null when outside [-100, 100]
//
// Design: this module runs server-side in the data layer.
// The UI consumes nulls as "N/A" (honest empty state, no fallback values).

import type { FinancialMetrics } from "@workspace/shared/types/report";

export interface SanitizationReport {
  /** Fields that were nullified */
  withheld: string[];
  /** Reasons for each withheld field */
  reasons: Record<string, string>;
  /** Whether quoteCurrency differs from financialCurrency */
  currencyMismatch: boolean;
  /** The reporting currency (financial statements) */
  financialCurrency: string | undefined;
}

export interface SanitizedResult {
  metrics: FinancialMetrics;
  report: SanitizationReport;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFiniteNonZero(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n !== 0;
}

/**
 * Detect if two currency codes represent different currencies.
 * Handles common Yahoo Finance patterns: USD, KRW, CNY, HKD, JPY, EUR, GBP, etc.
 */
function currenciesDiffer(
  quote: string | undefined,
  financial: string | undefined,
): boolean {
  if (!quote || !financial) return false;
  return quote.toUpperCase().trim() !== financial.toUpperCase().trim();
}

// ─── Core sanitizer ─────────────────────────────────────────────────────────

export function sanitizeFinancialMetrics(
  raw: FinancialMetrics,
): SanitizedResult {
  const withheld: string[] = [];
  const reasons: Record<string, string> = {};

  const withhold = (field: string, reason: string) => {
    withheld.push(field);
    reasons[field] = reason;
  };

  // Work on a shallow copy
  const m = { ...raw };

  const hasCurrencyMismatch = currenciesDiffer(m.currency, m.financialCurrency);

  // ── 1. Impossible margin relationships ────────────────────────────────────
  // operatingMargin must be ≤ grossMargin (operating income = gross profit - OpEx)
  if (
    isFiniteNonZero(m.grossMargin) &&
    isFiniteNonZero(m.operatingMargin) &&
    m.operatingMargin > m.grossMargin
  ) {
    withhold(
      "operatingMargin",
      `Operating margin (${m.operatingMargin.toFixed(1)}%) exceeds gross margin (${m.grossMargin.toFixed(1)}%) — mathematically impossible`,
    );
    m.operatingMargin = 0; // will render as N/A via fmt()
  }

  // ── 2. Margin bounds check ────────────────────────────────────────────────
  const marginFields: Array<{
    key: "grossMargin" | "operatingMargin" | "netMargin" | "fcfMargin";
    label: string;
  }> = [
    { key: "grossMargin", label: "Gross margin" },
    { key: "operatingMargin", label: "Operating margin" },
    { key: "netMargin", label: "Net margin" },
    { key: "fcfMargin", label: "FCF margin" },
  ];

  for (const { key, label } of marginFields) {
    const val = m[key];
    if (typeof val === "number" && (val < -100 || val > 100)) {
      withhold(key, `${label} out of bounds: ${val.toFixed(1)}%`);
      m[key] = 0;
    }
  }

  // ── 3. Cross-currency derived ratios ──────────────────────────────────────
  // When quoteCurrency ≠ financialCurrency, ratios that divide a price-metric
  // by a financial-statement-metric produce garbage (e.g., SKHY: USD price / KRW earnings).
  if (hasCurrencyMismatch) {
    const crossCurrencyFields: Array<{
      key: "peRatio" | "forwardPE" | "pbRatio" | "psRatio" | "evEbitda";
      label: string;
    }> = [
      { key: "peRatio", label: "P/E (TTM)" },
      { key: "forwardPE", label: "Forward P/E" },
      { key: "pbRatio", label: "P/B" },
      { key: "psRatio", label: "P/S" },
      { key: "evEbitda", label: "EV/EBITDA" },
    ];

    for (const { key, label } of crossCurrencyFields) {
      const val = m[key];
      if (isFiniteNonZero(val)) {
        withhold(
          key,
          `${label} nullified: quote currency (${m.currency}) ≠ reporting currency (${m.financialCurrency})`,
        );
        m[key] = null;
      }
    }
  }

  // ── 4. Extreme value sentinels ─────────────────────────────────────────────
  // FCF or netCash exceeding 50% of marketCap is almost certainly a currency
  // magnitude error (e.g., KRW values with USD marketCap).
  if (isFiniteNonZero(m.marketCap) && m.marketCap > 0) {
    const absoluteFields: Array<{
      key: "freeCashFlow" | "netCash" | "ebitda";
      label: string;
      threshold: number;
    }> = [
      {
        key: "freeCashFlow",
        label: "FCF",
        threshold: Math.abs(m.marketCap) * 0.5,
      },
      {
        key: "netCash",
        label: "Net Cash",
        threshold: Math.abs(m.marketCap) * 0.5,
      },
      {
        key: "ebitda",
        label: "EBITDA",
        threshold: Math.abs(m.marketCap) * 2,
      },
    ];

    for (const { key, label, threshold } of absoluteFields) {
      const val = m[key];
      if (typeof val === "number" && Math.abs(val) > threshold) {
        withhold(
          key,
          `${label} (${fmtCompact(val)}) exceeds sanity threshold vs market cap (${fmtCompact(m.marketCap)}) — likely currency magnitude error`,
        );
        m[key] = 0;
      }
    }
  }

  // ── 5. EPS sanity: |EPS| > |price| is implausible for most stocks ────────
  if (
    isFiniteNonZero(m.currentPrice) &&
    isFiniteNonZero(m.eps) &&
    Math.abs(m.eps) > Math.abs(m.currentPrice) * 2
  ) {
    withhold(
      "eps",
      `EPS (${m.eps.toFixed(2)}) exceeds 2× current price (${m.currentPrice.toFixed(2)}) — likely magnitude error`,
    );
    m.eps = 0;
  }

  return {
    metrics: m,
    report: {
      withheld,
      reasons,
      currencyMismatch: hasCurrencyMismatch,
      financialCurrency: m.financialCurrency,
    },
  };
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toFixed(0);
}
