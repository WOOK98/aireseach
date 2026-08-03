"use client";

import { useQuery } from "@tanstack/react-query";

// ── Types (mirrors API response) ─────────────────────────────────────────

export interface FeedJudgment {
  id: string;
  judgment: string;
  keyNumber: string;
  wrongIf: string;
  metric: string | null;
  trigger: string | null;
  publishedAt: string;
  checkAfter: string | null;
}

export interface FeedVerification {
  id: string;
  result: string;
  dataPoint: string | null;
  evidenceUrl: string | null;
  notes: string | null;
  verifiedAt: string;
}

export type VerificationStatus =
  | "never_generated"
  | "not_due"
  | "awaiting"
  | "confirmed"
  | "invalidated"
  | "needs_manual_review"
  | "insufficient_data"
  | "degraded";

export interface FeedItem {
  watchlistId: string;
  symbol: string;
  market: string;
  note: string | null;
  addedAt: string;
  hasJudgments: boolean;
  totalJudgments: number;
  latestJudgment: FeedJudgment | null;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: string | null;
  nextCheckAfter: string | null;
  latestVerification: FeedVerification | null;
  recentVerificationCount: number;
}

interface FeedResponse {
  ok: boolean;
  authenticated: boolean;
  items: FeedItem[];
  degraded?: boolean;
}

export interface WatchlistFeedResult {
  items: FeedItem[];
  degraded: boolean;
}

// ── Fetcher ──────────────────────────────────────────────────────────────

async function fetchFeed(): Promise<WatchlistFeedResult> {
  const res = await fetch("/api/watchlist/feed");
  if (!res.ok) throw new Error(`Feed fetch failed (${res.status})`);
  const data = (await res.json()) as FeedResponse;
  if (!data.authenticated) return { items: [], degraded: false };
  return { items: data.items ?? [], degraded: data.degraded ?? false };
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useWatchlistFeed() {
  return useQuery({
    queryKey: ["watchlist-feed"],
    queryFn: fetchFeed,
    staleTime: 60_000, // 1 min — verification data doesn't change that fast
    refetchInterval: 5 * 60_000, // background refresh every 5 min
  });
}
