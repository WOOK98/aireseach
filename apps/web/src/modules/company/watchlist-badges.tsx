"use client";

/* oxlint-disable i18next/no-literal-string */

import Link from "next/link";
import { useEffect, useState } from "react";

interface WatchlistItem {
  symbol: string;
  market: string;
}

export function WatchlistBadges() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/watchlist");
        const data = (await response.json());
        if (cancelled) return;
        const payload = data as { items?: WatchlistItem[] };
        setItems((payload.items ?? []).slice(0, 12));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted || items.length === 0) {
    return (
      <div className="text-muted-foreground rounded-full border px-3 py-1.5 text-sm">
        Search TSLA, MU, NVDA, or any listed company.
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <Link
          href={`/t/${item.symbol}`}
          key={item.symbol}
          className="notranslate hover:bg-muted rounded-full border px-3 py-1.5 font-mono text-xs"
          translate="no"
        >
          {item.symbol} · {item.market}
        </Link>
      ))}
    </>
  );
}
