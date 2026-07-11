"use client";

/* oxlint-disable i18next/no-literal-string */

import { AlertTriangle, CheckCircle2, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type EntityLockState =
  | "empty"
  | "loading"
  | "locked"
  | "ambiguous"
  | "theme"
  | "no-match";

interface EntityCandidate {
  ticker: string;
  companyName: string;
  exchange: string;
  quoteType: string;
}

interface ResolvedEntity {
  ok: true;
  mode: "ticker";
  input: string;
  ticker: string;
  companyName: string;
  exchange: string;
  quoteType: string;
}

interface UnresolvedEntity {
  ok: false;
  mode: "clarify" | "industry";
  input: string;
  reason: string;
  candidates: EntityCandidate[];
  message: string;
}

type EntityResolution = ResolvedEntity | UnresolvedEntity;

function normalizeSymbol(value: string) {
  return value.trim().replace(/^\$/, "").toUpperCase();
}

export function EntitySearch({
  initialValue = "",
  compact = false,
}: {
  initialValue?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState(initialValue);
  const [state, setState] = useState<EntityLockState>(
    initialValue ? "locked" : "empty",
  );
  const [entity, setEntity] = useState<ResolvedEntity | null>(null);
  const [candidates, setCandidates] = useState<EntityCandidate[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const navigateTo = useCallback(
    (ticker: string) => {
      router.push(`/t/${encodeURIComponent(normalizeSymbol(ticker))}`);
    },
    [router],
  );

  const resolve = useCallback(async (value: string) => {
    const next = value.trim();
    if (!next) {
      setState("empty");
      setEntity(null);
      setCandidates([]);
      return;
    }

    setState("loading");
    try {
      const response = await fetch(
        `/api/report/resolve/${encodeURIComponent(next)}`,
      );
      const result = (await response.json()) as EntityResolution;

      if (result.ok) {
        setState("locked");
        setEntity(result);
        setCandidates([]);
        return;
      }

      setEntity(null);
      if (result.mode === "clarify" && result.candidates.length > 0) {
        setState("ambiguous");
        setCandidates(result.candidates);
        return;
      }
      if (result.mode === "industry") {
        setState("theme");
        setCandidates(result.candidates);
        return;
      }
      setState("no-match");
      setCandidates([]);
    } catch {
      setState("no-match");
      setEntity(null);
      setCandidates([]);
    }
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => resolve(value), 400);
    },
    [resolve],
  );

  if (!mounted) {
    return (
      <div className="border-border bg-background h-14 rounded-2xl border" />
    );
  }

  const canRun = state === "locked" && entity;

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canRun) navigateTo(entity.ticker);
          }}
          placeholder="Enter a company or ticker"
          className={`notranslate border-border bg-background text-foreground focus:border-foreground w-full rounded-2xl border pr-4 pl-11 transition outline-none ${
            compact ? "h-12 text-base" : "h-14 text-lg md:text-xl"
          }`}
          translate="no"
        />
      </div>

      <div className="mt-3 min-h-9">
        {state === "loading" && (
          <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            resolving
          </div>
        )}

        {state === "locked" && entity && (
          <button
            type="button"
            onClick={() => navigateTo(entity.ticker)}
            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-mono text-xs text-blue-900 hover:bg-blue-100"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="notranslate" translate="no">
              ENTITY LOCK · {entity.companyName} · {entity.exchange}{" "}
              {entity.ticker}
            </span>
          </button>
        )}

        {state === "ambiguous" && candidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-900">
            <span>choose entity</span>
            {candidates.slice(0, 4).map((candidate) => (
              <button
                type="button"
                key={candidate.ticker}
                onClick={() => navigateTo(candidate.ticker)}
                className="notranslate bg-background rounded-full border border-amber-300 px-2.5 py-1 hover:bg-amber-100"
                translate="no"
              >
                {candidate.ticker} · {candidate.companyName}
              </button>
            ))}
          </div>
        )}

        {state === "theme" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-xs text-emerald-900">
            industry mode will unlock in the report layer
          </div>
        )}

        {state === "no-match" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-mono text-xs text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5" />
            no match
          </div>
        )}
      </div>
    </div>
  );
}
