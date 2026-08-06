"use client";

/* oxlint-disable i18next/no-literal-string */

import { BarChart3, Loader2, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Separator } from "@workspace/ui-web/separator";
import { Skeleton } from "@workspace/ui-web/skeleton";

import {
  JudgmentCard,
  EmptyStateAllNotDue,
  EmptyStateNoJudgments,
  EmptyStateNoWatchlist,
} from "~/modules/watchlist/judgment-card";
import { useWatchlistFeed } from "~/modules/watchlist/use-feed";

import type { FeedItem } from "~/modules/watchlist/use-feed";

// ── Loading skeleton ─────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter bar ───────────────────────────────────────────────────────────

type FilterStatus = "all" | "action_needed" | "confirmed" | "invalidated";

const FILTERS: Array<{ id: FilterStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "action_needed", label: "Needs Action" },
  { id: "confirmed", label: "Confirmed" },
  { id: "invalidated", label: "Invalidated" },
];

function filterItems(items: FeedItem[], filter: FilterStatus): FeedItem[] {
  if (filter === "all") return items;
  if (filter === "action_needed") {
    return items.filter(
      (i) =>
        i.verificationStatus === "awaiting" ||
        i.verificationStatus === "needs_manual_review" ||
        i.verificationStatus === "insufficient_data" ||
        i.verificationStatus === "invalidated",
    );
  }
  return items.filter((i) => i.verificationStatus === filter);
}

// ── Summary stats ────────────────────────────────────────────────────────

function FeedSummary({ items }: { items: FeedItem[] }) {
  const counts = {
    total: items.length,
    confirmed: items.filter((i) => i.verificationStatus === "confirmed").length,
    invalidated: items.filter((i) => i.verificationStatus === "invalidated")
      .length,
    awaiting: items.filter((i) => i.verificationStatus === "awaiting").length,
    needsReview: items.filter(
      (i) => i.verificationStatus === "needs_manual_review",
    ).length,
  };

  return (
    <div className="border-line bg-line grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-panel p-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Watching
        </p>
        <p className="mt-1 font-serif text-2xl font-semibold">{counts.total}</p>
      </div>
      <div className="bg-panel p-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Confirmed
        </p>
        <p
          className="notranslate mt-1 font-serif text-2xl font-semibold text-emerald-700 dark:text-emerald-400"
          translate="no"
        >
          {counts.confirmed}
        </p>
      </div>
      <div className="bg-panel p-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Awaiting Check
        </p>
        <p
          className="notranslate mt-1 font-serif text-2xl font-semibold text-amber-700 dark:text-amber-400"
          translate="no"
        >
          {counts.awaiting}
        </p>
      </div>
      <div className="bg-panel p-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Invalidated
        </p>
        <p
          className="notranslate mt-1 font-serif text-2xl font-semibold text-red-700 dark:text-red-400"
          translate="no"
        >
          {counts.invalidated}
        </p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else if (next.size < 4) {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  const compareHref =
    selected.size >= 2 ? `/compare?tickers=${[...selected].join(",")}` : null;

  const { data, isLoading, isError, refetch, isFetching } = useWatchlistFeed();

  const allItems = data?.items ?? [];
  const degraded = data?.degraded ?? false;

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-border border-b px-4 py-4">
          <div className="mx-auto w-full max-w-5xl">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-72" />
          </div>
        </div>
        <div className="flex-1 px-4 py-5">
          <div className="mx-auto w-full max-w-5xl">
            <FeedSkeleton />
          </div>
        </div>
      </div>
    );
  }
  const hasWatchlist = allItems.length > 0;
  const hasJudgments = allItems.some((i) => i.hasJudgments);
  const allNotDue =
    hasJudgments &&
    allItems.every(
      (i) =>
        !i.hasJudgments ||
        i.verificationStatus === "not_due" ||
        i.verificationStatus === "never_generated",
    );

  // Apply filters
  const filtered = filterItems(allItems, filter).filter((i) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      i.symbol.toLowerCase().includes(q) ||
      i.latestJudgment?.judgment.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-border border-b px-4 py-4">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-xl font-semibold tracking-tight">
                Watchlist
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Judgment change feed — what changed, why it changed, and whether
                it matters.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="gap-1.5"
              >
                {isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-3.5 w-3.5" />
                )}
                Refresh
              </Button>
              <Link
                href="/dashboard/research"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition"
              >
                <Search className="h-3.5 w-3.5" />
                Research
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-5xl space-y-5">
          {/* Error state */}
          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
              <p className="text-sm font-medium">Failed to load watchlist</p>
              <p className="mt-1 text-xs opacity-80">
                Please try again. If the problem persists, check your
                connection.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 gap-1 px-2 text-xs"
                onClick={() => void refetch()}
              >
                <RefreshCcw className="h-3 w-3" /> Retry
              </Button>
            </div>
          )}

          {/* Degraded state — ledger unavailable but basic watchlist visible */}
          {!isError && !isLoading && degraded && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="text-sm font-medium">
                Judgment verification temporarily unavailable
              </p>
              <p className="mt-1 text-xs opacity-80">
                Your watchlist items are shown below, but judgment and
                verification data could not be loaded. Status indicators are not
                available until the ledger recovers.
              </p>
            </div>
          )}

          {/* Empty states */}
          {!isError && !isLoading && !hasWatchlist && <EmptyStateNoWatchlist />}
          {!isError &&
            !isLoading &&
            hasWatchlist &&
            !hasJudgments &&
            !degraded && (
              <EmptyStateNoJudgments
                count={allItems.length}
                symbols={allItems.map((i) => i.symbol)}
              />
            )}
          {!isError && !isLoading && hasJudgments && allNotDue && !degraded && (
            <EmptyStateAllNotDue />
          )}

          {/* Loading */}
          {isLoading && <FeedSkeleton />}

          {/* Feed content */}
          {!isError &&
            !isLoading &&
            hasWatchlist &&
            (hasJudgments || degraded) && (
              <>
                {/* Summary */}
                <FeedSummary items={allItems} />

                {/* Filters + search */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-1">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          filter === f.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-56">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter by symbol..."
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <Separator />

                {/* Cards */}
                {filtered.length > 0 ? (
                  <div className="space-y-3">
                    {filtered.map((item) => (
                      <JudgmentCard
                        key={item.watchlistId}
                        item={item}
                        selectable
                        selected={selected.has(item.symbol)}
                        onToggle={() => toggleSelect(item.symbol)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-muted-foreground text-sm">
                      No items match the current filter.
                    </p>
                  </div>
                )}
              </>
            )}

          {/* Footer */}
          {!isError && !isLoading && hasWatchlist && (
            <p className="text-muted-foreground/60 border-border border-t pt-4 text-[10px]">
              Judgment data is sourced from the L3 ledger. Verification status
              reflects the most recent automated or manual check. "No change" is
              never fabricated — unverified items show as awaiting.
            </p>
          )}

          {/* Selection hint */}
          {!isError && !isLoading && hasWatchlist && hasJudgments && (
            <p className="text-muted-foreground/50 text-[10px]">
              Select 2–4 tickers to compare them side by side.
            </p>
          )}
        </div>
      </div>

      {/* ── Floating compare button ── */}
      {compareHref && (
        <div className="fixed right-6 bottom-6 z-30">
          <Link
            href={compareHref}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition"
          >
            <BarChart3 className="h-4 w-4" />
            Compare {selected.size} tickers
          </Link>
        </div>
      )}
    </div>
  );
}
