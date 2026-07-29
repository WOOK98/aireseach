export function fmt(n: number | null | undefined, decimals = 1, suffix = "") {
  if (n == null || n === 0 || !Number.isFinite(n)) return "N/A";
  return n.toFixed(decimals) + suffix;
}

export function fmtB(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "N/A";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

export function fmtMoney(n: number | null | undefined, decimals = 2) {
  const value = fmt(n, decimals);
  return value === "N/A" ? value : `$${value}`;
}
