"use client";

/* oxlint-disable i18next/no-literal-string */

import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function WatchlistStar({ symbol }: { symbol: string }) {
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/watchlist/${encodeURIComponent(symbol)}`,
        );
        const data = (await response.json());
        if (cancelled) return;
        const payload = data as {
          authenticated?: boolean;
          item?: { symbol: string } | null;
        };
        setAuthenticated(Boolean(payload.authenticated));
        setSaved(Boolean(payload.item));
      } catch {
        if (cancelled) return;
        setAuthenticated(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border"
        aria-label="Watchlist"
      >
        <Star className="h-4 w-4" />
      </button>
    );
  }

  if (authenticated === false) {
    return (
      <Link
        href={`/auth/login?redirectTo=${encodeURIComponent(`/t/${symbol}`)}`}
        className="hover:bg-muted inline-flex h-10 w-10 items-center justify-center rounded-full border"
        aria-label="Sign in to save this company"
      >
        <Star className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={busy || authenticated === null}
      aria-pressed={saved}
      aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
      onClick={async () => {
        setBusy(true);
        try {
          if (saved) {
            await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
              method: "DELETE",
            });
            setSaved(false);
            toast.success("Removed from watchlist");
          } else {
            const response = await fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbol }),
            });
            if (!response.ok) throw new Error("save failed");
            setSaved(true);
            toast.success("Added to watchlist");
          }
        } catch {
          toast.error("Watchlist update failed. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
      className="hover:bg-muted inline-flex h-10 w-10 items-center justify-center rounded-full border disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Star
          className={
            saved ? "h-4 w-4 fill-amber-400 text-amber-500" : "h-4 w-4"
          }
        />
      )}
    </button>
  );
}
