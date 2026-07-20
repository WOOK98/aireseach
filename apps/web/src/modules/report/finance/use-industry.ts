"use client";

import { useMutation } from "@tanstack/react-query";

import type { FinancialMetrics } from "@workspace/shared/types/report";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ThemeConstituent {
  symbol: string;
  name: string;
  avgWeightPct: number;
  heldByEtfs: number;
  financials:
    | (FinancialMetrics & { _sanitization?: SanitizationReport })
    | null;
  error: string | null;
}

export interface SanitizationReport {
  withheld: string[];
  reasons: Record<string, string>;
  currencyMismatch: boolean;
  financialCurrency: string | undefined;
}

export interface IndustryUniverse {
  query: string;
  asOf: string;
  etfs: { symbol: string; name: string; holdings: number }[];
  constituents: ThemeConstituent[];
}

export interface IndustryAnalyzeResult {
  ok: boolean;
  mode: "industry" | "ticker";
  message?: string;
  universe?: IndustryUniverse;
  constituents?: ThemeConstituent[];
  resolution?: unknown;
  candidates?: unknown[];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useIndustryAnalyze() {
  return useMutation<IndustryAnalyzeResult, Error, string>({
    mutationFn: async (query: string) => {
      const res = await fetch(`${API_BASE}/report/industry/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = (await res.json()) as IndustryAnalyzeResult;
      if (!json.ok && !json.message) {
        throw new Error("Industry analysis failed");
      }
      return json;
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isLikelyTicker(input: string): boolean {
  const trimmed = input.trim().toUpperCase();
  // Pure ticker: 1-5 uppercase letters, optionally followed by exchange suffix
  if (/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(trimmed)) return true;
  // Known exchange suffixes: .SS, .SZ, .HK
  if (/^\d{6}\.(SS|SZ|HK)$/.test(trimmed)) return true;
  return false;
}

export function getCurrencySymbol(currency: string | undefined): string {
  if (!currency) return "$";
  switch (currency.toUpperCase()) {
    case "USD":
      return "$";
    case "KRW":
      return "₩";
    case "CNY":
    case "CNH":
      return "¥";
    case "HKD":
      return "HK$";
    case "JPY":
      return "¥";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    default:
      return currency + " ";
  }
}

export function fmtMetricValue(
  value: number | null | undefined,
  currency?: string,
): string {
  if (value == null || value === 0) return "N/A";
  const sym = getCurrencySymbol(currency);
  if (Math.abs(value) >= 1e12) return `${sym}${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `${sym}${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${sym}${(value / 1e6).toFixed(1)}M`;
  return `${sym}${value.toFixed(0)}`;
}

export function fmtRatio(value: number | null | undefined): string {
  if (value == null || value === 0) return "N/A";
  return `${value.toFixed(1)}x`;
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}%`;
}
