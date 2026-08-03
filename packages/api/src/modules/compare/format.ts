/**
 * Pure formatting helpers for compare dimensions.
 * No side effects, no DB dependency — safe to import in tests.
 */

export function fmtNum(
  value: number | null | undefined,
  suffix = "",
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}${suffix}`;
}

export function fmtCompactNum(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

/**
 * fmtCompactNum with ISO code prefix for absolute monetary values.
 * Always uses ISO code (e.g., "USD 1.50B") — symbols are ambiguous in
 * cross-market compare (CNY and JPY both use "¥").
 */
export function fmtCompactMoney(
  value: number | null | undefined,
  currency: string,
): string | null {
  const compact = fmtCompactNum(value);
  if (compact == null) return null;
  return `${currency} ${compact}`;
}

export function fmtMoney(
  value: number | null | undefined,
  currency: string,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function fmtRatio(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}x`;
}
