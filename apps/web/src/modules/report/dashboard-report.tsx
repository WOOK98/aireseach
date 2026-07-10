"use client";

/* oxlint-disable i18next/no-literal-string */

import { AlertTriangle, LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { authClient } from "~/lib/auth/client";
import {
  derivePageState,
  formatDate,
  getHkStatus,
  getKrxStatus,
  getNyseStatus,
} from "~/modules/report/market-sessions";

import type { KeyboardEvent } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = "pre" | "us" | "asia" | "weekend";
type EntityLockState = "empty" | "locked" | "ambiguous" | "theme" | "no-match";

// ─── Market status labels ────────────────────────────────────────────────────

const SESSION_META: Record<
  SessionState,
  {
    label: string;
    briefLabel: string;
    attentionLabel: string;
    quietLine: string;
    buttons: { label: string; primary: boolean }[];
  }
> = {
  pre: {
    label: "Morning brief",
    briefLabel: "watchlist overnight",
    attentionLabel: "Needs attention",
    quietLine: "Watchlist quiet — no overnight movers to flag.",
    buttons: [
      { label: "Run morning brief", primary: true },
      { label: "Snapshot", primary: false },
    ],
  },
  us: {
    label: "US session",
    briefLabel: "live",
    attentionLabel: "Biggest mover on your list",
    quietLine: "Watchlist quiet — no intraday movers to flag.",
    buttons: [
      { label: "Snapshot", primary: true },
      { label: "Deep dive", primary: false },
    ],
  },
  asia: {
    label: "Asia session",
    briefLabel: "HKEX / A股 / KRX open",
    attentionLabel: "Your Asia listings",
    quietLine: "Watchlist quiet — no Asia session movers to flag.",
    buttons: [{ label: "Run Asia brief", primary: true }],
  },
  weekend: {
    label: "Portfolio review",
    briefLabel: "markets closed",
    attentionLabel: "This week on your list",
    quietLine: "Markets closed — review your week.",
    buttons: [
      { label: "Review portfolio", primary: true },
      { label: "Update holdings", primary: false },
    ],
  },
};

// ─── Entity resolver ──────────────────────────────────────────────────────────

function resolveEntity(query: string): {
  state: EntityLockState;
  label?: string;
  options?: [string, string];
} {
  const q = query.trim();
  if (!q) return { state: "empty" };
  if (q.includes(" ") || q.length > 6) {
    return { state: "theme", label: q };
  }
  // No hardcoded ticker knowledge — all resolution goes through the API.
  return { state: "no-match" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function phaseLabel(p: string) {
  return p === "open" ? "OPEN" : p === "pre" ? "PRE-MARKET" : "CLOSED ✓";
}

function phaseCls(p: string) {
  return p === "open" ? "open" : p === "pre" ? "pre" : "closed";
}

function SessionRail({
  sessionState: _sessionState,
}: {
  sessionState: SessionState;
}) {
  const [markets, setMarkets] = useState<
    { key: string; label: string; phase: string; clock: string; cls: string }[]
  >([]);

  useEffect(() => {
    function tick() {
      const nyse = getNyseStatus();
      const hk = getHkStatus();
      const kr = getKrxStatus();

      setMarkets([
        {
          key: "us",
          label: "NYSE·NASDAQ",
          phase: phaseLabel(nyse.phase),
          clock: nyse.clock,
          cls: phaseCls(nyse.phase),
        },
        {
          key: "hk",
          label: "HKEX·A股",
          phase: phaseLabel(hk.phase),
          clock: hk.clock,
          cls: phaseCls(hk.phase),
        },
        {
          key: "kr",
          label: "KRX",
          phase: phaseLabel(kr.phase),
          clock: kr.clock,
          cls: phaseCls(kr.phase),
        },
      ]);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex overflow-x-auto border-b border-[#e5e0d6] bg-white">
      {markets.map((m) => (
        <div
          key={m.key}
          className="flex min-w-0 flex-1 items-baseline gap-2 border-r border-[#e5e0d6] px-4 py-3 whitespace-nowrap last:border-r-0"
        >
          <span className="font-mono text-xs tracking-wide text-[#1c1b18]">
            {m.label}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] ${
              m.cls === "open"
                ? "border-emerald-600 text-emerald-700"
                : m.cls === "pre"
                  ? "border-amber-600 text-amber-800"
                  : "border-[#e5e0d6] text-[#6b675e]"
            }`}
          >
            {m.phase}
          </span>
          <span className="ml-auto font-mono text-[11.5px] text-[#6b675e]">
            {m.clock}
          </span>
        </div>
      ))}
    </div>
  );
}

function WatchlistSidebar({ isAnonymous }: { isAnonymous: boolean }) {
  if (isAnonymous) {
    return (
      <aside className="w-[260px] border-r border-[#e5e0d6] bg-white py-4">
        <h2 className="mb-2 px-5 font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
          Watchlist
        </h2>
        <div className="px-5 py-6 text-center">
          <p className="mb-3 text-[13px] text-[#6b675e]">
            Sign in to build your watchlist
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1c1b18] px-4 py-2 text-sm text-[#f5f2ea]"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] border-r border-[#e5e0d6] bg-white py-4">
      <h2 className="mb-2 px-5 font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
        Watchlist · 0
      </h2>
      <div className="px-5 py-6 text-center">
        <p className="mb-3 text-[13px] text-[#6b675e]">No tickers yet</p>
      </div>
      <button
        type="button"
        className="mx-5 mt-3 flex w-[calc(100%-40px)] items-center justify-center gap-1.5 rounded-md border border-dashed border-[#e5e0d6] bg-transparent px-3 py-2 text-[13px] text-[#6b675e]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add ticker
      </button>
    </aside>
  );
}

function BriefCard({ sessionState }: { sessionState: SessionState }) {
  const meta = SESSION_META[sessionState];
  const date = formatDate();

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h1 className="font-serif text-[29px] font-semibold tracking-tight text-[#1c1b18]">
          {meta.label}
        </h1>
        <span className="font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
          {date} · {meta.briefLabel}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e5e0d6] bg-white">
        <header className="border-b border-[#e5e0d6] px-4 py-3">
          <span className="font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
            {meta.attentionLabel}
          </span>
        </header>
        {/* Brief content — empty until API is wired */}
        <div className="px-4 py-6 text-center">
          <p className="text-[13px] text-[#6b675e]">
            Add tickers to your watchlist, then run a brief.
          </p>
        </div>
        <div className="px-4 py-2.5 font-mono text-xs text-[#6b675e]">
          {meta.quietLine}
        </div>
        <footer className="flex flex-wrap items-center gap-2.5 border-t border-[#e5e0d6] px-4 py-3">
          {meta.buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              disabled
              className={`rounded-lg px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                btn.primary
                  ? "bg-[#1c1b18] text-[#f5f2ea]"
                  : "border border-[#e5e0d6] bg-transparent text-[#1c1b18]"
              }`}
            >
              {btn.label}
            </button>
          ))}
          {sessionState === "pre" && (
            <span className="ml-auto text-[12.5px] text-[#6b675e]">
              Get this at 5:30 automatically — plugin + scheduled task →
            </span>
          )}
        </footer>
      </div>
    </section>
  );
}

function AsiaDegradationNotice() {
  return (
    <div className="mt-3 rounded-lg border border-[#c9d6ec] bg-[#edf2fa] px-3.5 py-2.5 text-[13px] text-[#2c4a73]">
      HK · China-A · Korea real-time quotes roll out in plugin v0.4 — this panel
      currently shows filings and news, with prices at session close.
    </div>
  );
}

function EntityLockChip({
  entity,
  onSelect,
}: {
  entity: ReturnType<typeof resolveEntity>;
  onSelect: (label: string) => void;
}) {
  if (entity.state === "empty") return null;

  if (entity.state === "locked" && entity.label) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#c9d6ec] bg-[#edf2fa] px-3.5 py-1.5 font-mono text-[12.5px] text-[#1e3a5f]">
        <span className="h-[7px] w-[7px] rounded-full bg-[#1e5aa8]" />
        ENTITY LOCK · {entity.label} ✓
      </div>
    );
  }

  if (entity.state === "ambiguous" && entity.options) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#e3cd9a] bg-[#fbf3e2] px-3.5 py-1.5 font-mono text-[12.5px] text-[#7a5a16]">
        DID YOU MEAN ·
        <button
          type="button"
          onClick={() => onSelect(entity.options![0])}
          className="rounded-full border border-[#e3cd9a] bg-white px-2.5 py-0.5 font-mono text-[11.5px] text-[#7a5a16]"
        >
          {entity.options[0]}
        </button>
        <button
          type="button"
          onClick={() => onSelect(entity.options![1])}
          className="rounded-full border border-[#e3cd9a] bg-white px-2.5 py-0.5 font-mono text-[11.5px] text-[#7a5a16]"
        >
          {entity.options[1]}
        </button>
      </div>
    );
  }

  if (entity.state === "theme") {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#bddcc6] bg-[#edf6ef] px-3.5 py-1.5 font-mono text-[12.5px] text-[#1e5a38]">
        THEME · &quot;{entity.label}&quot; is a material or topic → Industry
        Mode: resolve ETFs, build the value-chain universe
      </div>
    );
  }

  // no-match
  return (
    <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border border-[#e3cd9a] bg-[#fbf3e2] px-3.5 py-1.5 font-mono text-[12.5px] text-[#7a5a16]">
      <AlertTriangle className="h-3.5 w-3.5" />
      NO MATCH · check the ticker, or press space to search as a theme
    </div>
  );
}

const LENS_COLORS = [
  { name: "Supply chain", color: "bg-emerald-600" },
  { name: "Fundamentals", color: "bg-amber-700" },
  { name: "Macro", color: "bg-amber-600" },
  { name: "Technicals", color: "bg-slate-500" },
  { name: "Sentiment", color: "bg-purple-600" },
  { name: "Risk matrix", color: "bg-red-600" },
];

function ResearchSection() {
  const [query, setQuery] = useState("");
  const [resolved, setResolved] = useState<ReturnType<typeof resolveEntity>>({
    state: "empty",
  });
  const [runLabel, setRunLabel] = useState("Run deep dive · all six lenses");

  const debouncedResolve = useCallback((val: string) => {
    const result = resolveEntity(val);
    setResolved(result);
    setRunLabel(
      result.state === "theme"
        ? "Run industry deep dive"
        : "Run deep dive · all six lenses",
    );
  }, []);

  const handleInput = useCallback(
    (val: string) => {
      setQuery(val);
      requestAnimationFrame(() => debouncedResolve(val));
    },
    [debouncedResolve],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Enter" &&
        (resolved.state === "locked" || resolved.state === "theme")
      ) {
        // TODO: trigger deep dive
      }
    },
    [resolved.state],
  );

  // P0: only locked entities can run. Theme stays disabled until resolve_entity API is wired (P1-1).
  const canRun = resolved.state === "locked";

  return (
    <section className="mt-8">
      <p className="mb-2 font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
        Research anything
      </p>
      <div className="rounded-xl border border-[#e5e0d6] bg-white px-5 py-4">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ticker, theme, or question"
          className="w-full border-b border-[#1c1b18] bg-transparent pb-1.5 font-serif text-[21px] text-[#1c1b18] outline-none placeholder:text-[#b8b2a4]"
        />
        <div className="mt-2 font-mono text-[11px] text-[#6b675e]">
          Try:{" "}
          {["MU", "LITE", "liquid silicone rubber"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleInput(t)}
              className="bg-none px-0.5 font-mono text-[11px] text-[#6b675e] underline"
            >
              {t}
            </button>
          ))}
        </div>
        <EntityLockChip
          entity={resolved}
          onSelect={(label) => {
            if (label.startsWith("Continue as theme")) {
              const result = resolveEntity(query.toLowerCase());
              setResolved(result);
              setRunLabel("Run industry deep dive");
            } else {
              setResolved({ state: "locked", label });
              setRunLabel("Run deep dive · all six lenses");
            }
          }}
        />
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!canRun}
            title={
              resolved.state === "theme"
                ? "Entity resolution接入中，暂不可用"
                : canRun
                  ? undefined
                  : "Enter a ticker or theme first"
            }
            className="rounded-lg bg-[#1c1b18] px-4 py-2 text-sm text-[#f5f2ea] disabled:cursor-not-allowed disabled:bg-[#c9c4b8] disabled:text-[#8a8578]"
          >
            {runLabel}
          </button>
          <button
            type="button"
            disabled={!canRun}
            title={
              resolved.state === "theme"
                ? "Entity resolution接入中，暂不可用"
                : canRun
                  ? undefined
                  : "Enter a ticker or theme first"
            }
            className="rounded-lg border border-[#e5e0d6] bg-transparent px-4 py-2 text-sm text-[#1c1b18] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Run snapshot
          </button>
        </div>
        <details className="mt-3.5">
          <summary className="cursor-pointer font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
            Advanced · lens subset & lookback
          </summary>
          <div className="mt-3 flex flex-wrap gap-4">
            {LENS_COLORS.map((lens) => (
              <span
                key={lens.name}
                className="flex items-center gap-1.5 text-[13px] text-[#6b675e]"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${lens.color}`}
                />
                {lens.name}
              </span>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}

function TrackRecord() {
  const cards = [
    { label: "30-day directional accuracy", value: "—" },
    { label: "Mature supply-chain theses", value: "—" },
    { label: "Recent reports", value: "—" },
  ];
  return (
    <section className="mt-8 flex flex-wrap gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="min-w-[170px] flex-1 rounded-xl border border-[#e5e0d6] bg-white px-4 py-3"
        >
          <span className="font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
            {card.label}
          </span>
          <div className="mt-1.5 font-mono text-lg text-[#1c1b18]">
            {card.value}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DashboardReport() {
  const { data: session } = authClient.useSession();
  const isAnonymous = session?.user?.isAnonymous ?? !session?.user;

  const sessionState = useMemo(() => derivePageState(), []);

  return (
    <div className="flex h-full flex-col">
      {/* Session rail — real market status */}
      <SessionRail sessionState={sessionState} />

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <WatchlistSidebar isAnonymous={isAnonymous} />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <BriefCard sessionState={sessionState} />
          {sessionState === "asia" && <AsiaDegradationNotice />}
          <ResearchSection />
          <TrackRecord />
          {/* Footer */}
          <div className="mt-9 flex flex-wrap items-center gap-3.5 border-t border-[#e5e0d6] px-0 pt-4 text-[12.5px] text-[#6b675e]">
            <span>Decision-support analysis, not investment advice.</span>
            <span>
              Run any report in Claude Code:{" "}
              <span className="font-mono">/deep-dive TICKER</span> · Install
              plugin →
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
