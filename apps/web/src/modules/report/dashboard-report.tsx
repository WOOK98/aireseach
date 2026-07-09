"use client";

/* oxlint-disable i18next/no-literal-string */

import { AlertTriangle, Plus } from "lucide-react";
import { useCallback, useState } from "react";

import type { KeyboardEvent } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionState = "pre" | "us" | "asia" | "weekend";
type EntityLockState = "empty" | "locked" | "ambiguous" | "theme" | "no-match";

interface WatchlistRow {
  symbol: string;
  flag: string;
  change: number; // percent
}

interface BriefRow {
  symbol: string;
  change: number;
  reason: string;
  source: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const WATCHLIST: WatchlistRow[] = [
  { symbol: "NVDA", flag: "US", change: 0.4 },
  { symbol: "MU", flag: "US", change: -5.2 },
  { symbol: "AXTI", flag: "US", change: 1.1 },
  { symbol: "0700.HK", flag: "HK", change: 0.9 },
  { symbol: "000660.KS", flag: "KR", change: 2.8 },
  { symbol: "600519.SS", flag: "A股", change: -0.3 },
];

const BRIEF_PRE: BriefRow[] = [
  {
    symbol: "MU",
    change: -5.2,
    reason:
      "Samsung preliminary Q2 operating profit up ~19× — memory capacity fears hit the sector.",
    source: "news · 07-08",
  },
  {
    symbol: "000660.KS",
    change: 2.8,
    reason:
      "$28B US listing raise draws heavy demand; watch supply-ramp read-through to MU.",
    source: "filing · 07-08 KST",
  },
];

const BRIEF_US: BriefRow[] = [
  {
    symbol: "MU",
    change: -4.1,
    reason: "Below pre-earnings level; memory sell-off continues.",
    source: "10:12 PST",
  },
];

const BRIEF_ASIA: BriefRow[] = [
  {
    symbol: "000660.KS",
    change: 3.4,
    reason: "Continued demand for the $28B raise; DART filing 09:02 KST.",
    source: "DART · live",
  },
  {
    symbol: "0700.HK",
    change: 1.2,
    reason: "HKEX announcement: buyback resumed.",
    source: "披露易 · 09:41 HKT",
  },
  {
    symbol: "600519.SS",
    change: -0.5,
    reason: "No new filings.",
    source: "巨潮 · —",
  },
];

const BRIEF_WEEKEND: BriefRow[] = [
  {
    symbol: "MU",
    change: -14.9,
    reason: "Worst week on your list — memory capacity narrative flipped.",
    source: "",
  },
  {
    symbol: "000660.KS",
    change: 6.2,
    reason:
      "Your list is 48% memory-sector by weight. Concentration worth a look.",
    source: "",
  },
];

const SESSION_META: Record<
  SessionState,
  {
    label: string;
    date: string;
    brief: BriefRow[];
    attentionLabel: string;
    quietLine?: string;
    buttons: { label: string; primary: boolean }[];
  }
> = {
  pre: {
    label: "Morning brief",
    date: "Thu Jul 9 · watchlist overnight",
    brief: BRIEF_PRE,
    attentionLabel: "Needs attention · 2",
    quietLine:
      "QUIET · NVDA +0.4 · AXTI +1.1 · 0700.HK +0.9 · 600519.SS −0.3 (pre-market / last close)",
    buttons: [
      { label: "Run morning brief", primary: true },
      { label: "Snapshot MU", primary: false },
    ],
  },
  us: {
    label: "US session",
    date: "Thu Jul 9 · live",
    brief: BRIEF_US,
    attentionLabel: "Biggest mover on your list",
    quietLine:
      "NVDA +0.7 · AXTI +0.6 · Asia closed — session moves frozen at close",
    buttons: [
      { label: "Snapshot MU", primary: true },
      { label: "Deep dive MU", primary: false },
    ],
  },
  asia: {
    label: "Asia session",
    date: "Thu Jul 9 evening · HKEX / A股 / KRX open",
    brief: BRIEF_ASIA,
    attentionLabel: "Your Asia listings · 3",
    buttons: [{ label: "Run Asia brief", primary: true }],
  },
  weekend: {
    label: "Portfolio review",
    date: "Weekend · markets closed",
    brief: BRIEF_WEEKEND,
    attentionLabel: "This week on your list",
    buttons: [
      { label: "Review portfolio", primary: true },
      { label: "Update holdings CSV", primary: false },
    ],
  },
};

const SESSION_RAIL: Record<
  SessionState,
  {
    us: [string, string, string];
    hk: [string, string, string];
    kr: [string, string, string];
  }
> = {
  pre: {
    us: ["PRE-MARKET", "pre", "05:31 PST"],
    hk: ["CLOSED ✓", "", "20:31 HKT"],
    kr: ["CLOSED ✓", "", "21:31 KST"],
  },
  us: {
    us: ["OPEN", "open", "10:12 PST"],
    hk: ["CLOSED ✓", "", "01:12 HKT"],
    kr: ["CLOSED ✓", "", "02:12 KST"],
  },
  asia: {
    us: ["CLOSED ✓", "", "18:45 PST"],
    hk: ["OPEN", "open", "09:45 HKT"],
    kr: ["OPEN", "open", "10:45 KST"],
  },
  weekend: {
    us: ["CLOSED ✓", "", "Sat"],
    hk: ["CLOSED ✓", "", "Sun"],
    kr: ["CLOSED ✓", "", "Sun"],
  },
};

// Known tickers for entity lock demo
const KNOWN_TICKERS: Record<string, string> = {
  MU: "Micron Technology, Inc. · NASDAQ MU · Semiconductors — Memory",
  NVDA: "NVIDIA Corporation · NASDAQ NVDA · Semiconductors",
  AXTI: "AXT, Inc. · NASDAQ AXTI · Semiconductors — Materials",
  "0700.HK": "Tencent Holdings Ltd. · HKEX 0700 · Internet — Platforms",
  "000660.KS": "SK hynix Inc. · KRX 000660 · Semiconductors — Memory",
  "600519.SS": "Kweichow Moutai Co. · SSE 600519 · Beverages",
};

const AMBIGUOUS: Record<string, [string, string]> = {
  LITE: [
    "Lumentum Holdings, Inc. · NASDAQ LITE · Photonics",
    'Continue as theme: "lite"',
  ],
};

const LENS_COLORS = [
  { name: "Supply chain", color: "bg-emerald-600" },
  { name: "Fundamentals", color: "bg-amber-700" },
  { name: "Macro", color: "bg-amber-600" },
  { name: "Technicals", color: "bg-slate-500" },
  { name: "Sentiment", color: "bg-purple-600" },
  { name: "Risk matrix", color: "bg-red-600" },
];

// ─── Entity resolver ──────────────────────────────────────────────────────────

function resolveEntity(query: string): {
  state: EntityLockState;
  label?: string;
  options?: [string, string];
} {
  const q = query.trim();
  if (!q) return { state: "empty" };
  const upper = q.toUpperCase();
  if (KNOWN_TICKERS[upper]) {
    return { state: "locked", label: KNOWN_TICKERS[upper] };
  }
  if (AMBIGUOUS[upper]) {
    return { state: "ambiguous", options: AMBIGUOUS[upper] };
  }
  if (q.includes(" ") || q.length > 6) {
    return { state: "theme", label: q };
  }
  return { state: "no-match" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SessionRail({ state }: { state: SessionState }) {
  const rail = SESSION_RAIL[state];
  const markets = [
    { key: "us" as const, label: "NYSE·NASDAQ", data: rail.us },
    { key: "hk" as const, label: "HKEX·A股", data: rail.hk },
    { key: "kr" as const, label: "KRX", data: rail.kr },
  ];
  return (
    <div className="flex overflow-x-auto border-b border-[#e5e0d6] bg-white">
      {markets.map((m) => {
        const [text, cls, clock] = m.data;
        return (
          <div
            key={m.key}
            className="flex min-w-[200px] flex-1 items-baseline gap-2 border-r border-[#e5e0d6] px-4 py-3 whitespace-nowrap last:border-r-0"
          >
            <span className="font-mono text-xs tracking-wide text-[#1c1b18]">
              {m.label}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10.5px] ${
                cls === "open"
                  ? "border-emerald-600 text-emerald-700"
                  : cls === "pre"
                    ? "border-amber-600 text-amber-800"
                    : "border-[#e5e0d6] text-[#6b675e]"
              }`}
            >
              {text}
            </span>
            <span className="ml-auto font-mono text-[11.5px] text-[#6b675e]">
              {clock}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WatchlistSidebar() {
  return (
    <aside className="w-[260px] border-r border-[#e5e0d6] bg-white py-4">
      <h2 className="mb-2 px-5 font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
        Watchlist · {WATCHLIST.length}
      </h2>
      <div>
        {WATCHLIST.map((row) => (
          <button
            key={row.symbol}
            type="button"
            className="flex w-full items-baseline gap-2 border-b border-[#e5e0d6] bg-transparent px-5 py-2.5 text-left hover:bg-[#faf8f3]"
          >
            <span className="min-w-[84px] font-mono text-[13px] text-[#1c1b18]">
              {row.symbol}
            </span>
            <span className="font-mono text-[11px] text-[#6b675e]">
              {row.flag}
            </span>
            <span
              className={`ml-auto font-mono text-[13px] ${
                row.change >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {row.change >= 0 ? "+" : ""}
              {row.change.toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mx-5 mt-3 flex w-[calc(100%-40px)] items-center justify-center gap-1.5 rounded-md border border-dashed border-[#e5e0d6] bg-transparent px-3 py-2 text-[13px] text-[#6b675e]"
      >
        <Plus className="h-3.5 w-3.5" />
        Add ticker or import CSV
      </button>
    </aside>
  );
}

function BriefCard({ state }: { state: SessionState }) {
  const meta = SESSION_META[state];
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h1 className="font-serif text-[29px] font-semibold tracking-tight text-[#1c1b18]">
          {meta.label}
        </h1>
        <span className="font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
          {meta.date}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#e5e0d6] bg-white">
        <header className="border-b border-[#e5e0d6] px-4 py-3">
          <span className="font-mono text-[11px] tracking-[0.12em] text-[#6b675e] uppercase">
            {meta.attentionLabel}
          </span>
        </header>
        {meta.brief.map((row) => (
          <div
            key={row.symbol}
            className="flex flex-wrap items-baseline gap-3 border-b border-[#e5e0d6] px-4 py-3 last:border-b-0"
          >
            <span className="min-w-[84px] font-mono text-[13px] text-[#1c1b18]">
              {row.symbol}
            </span>
            <span
              className={`min-w-[58px] font-mono text-[13px] ${
                row.change >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {row.change >= 0 ? "+" : ""}
              {row.change.toFixed(1)}%
            </span>
            <span className="min-w-[200px] flex-1 text-sm text-[#1c1b18]">
              {row.reason}
              {row.source && (
                <span className="ml-1.5 font-mono text-[11px] text-[#6b675e]">
                  {row.source}
                </span>
              )}
            </span>
          </div>
        ))}
        {meta.quietLine && (
          <div className="px-4 py-2.5 font-mono text-xs text-[#6b675e]">
            {meta.quietLine}
          </div>
        )}
        <footer className="flex flex-wrap items-center gap-2.5 border-t border-[#e5e0d6] px-4 py-3">
          {meta.buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              className={`rounded-lg px-4 py-2 text-sm ${
                btn.primary
                  ? "bg-[#1c1b18] text-[#f5f2ea]"
                  : "border border-[#e5e0d6] bg-transparent text-[#1c1b18]"
              }`}
            >
              {btn.label}
            </button>
          ))}
          {state === "pre" && (
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

  if (entity.state === "locked") {
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
      // Simple debounce via requestAnimationFrame
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

  const canRun = resolved.state === "locked" || resolved.state === "theme";

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
            // If user selects the theme option, re-resolve as theme
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
            className="rounded-lg bg-[#1c1b18] px-4 py-2 text-sm text-[#f5f2ea] disabled:cursor-not-allowed disabled:bg-[#c9c4b8]"
          >
            {runLabel}
          </button>
          <button
            type="button"
            disabled={!canRun}
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
    { label: "30-day directional accuracy", value: "~61%" },
    { label: "Mature supply-chain theses", value: "~75–85%" },
    { label: "Recent reports", value: "MU · AXTI · 0700.HK" },
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
  const [sessionState, setSessionState] = useState<SessionState>("pre");

  const previewButtons: { key: SessionState; label: string }[] = [
    { key: "pre", label: "Pre-market 05:31" },
    { key: "us", label: "US 10:12" },
    { key: "asia", label: "Asia 18:45" },
    { key: "weekend", label: "Weekend" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Preview state toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-[#1c1b18] px-4 py-2 text-[#ede9e0]">
        <span className="font-mono text-[11px] tracking-[0.12em] text-[#b8b2a4] uppercase">
          Mockup · page state
        </span>
        {previewButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            aria-pressed={sessionState === btn.key}
            onClick={() => setSessionState(btn.key)}
            className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide ${
              sessionState === btn.key
                ? "border-[#ede9e0] bg-[#ede9e0] text-[#1c1b18]"
                : "border-[#4a463e] bg-transparent text-[#ede9e0]"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Session rail */}
      <SessionRail state={sessionState} />

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <WatchlistSidebar />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <BriefCard state={sessionState} />
          {sessionState === "asia" && <AsiaDegradationNotice />}
          <ResearchSection />
          <TrackRecord />
          {/* Footer disclaimer */}
          <div className="mt-9 flex flex-wrap items-center gap-3.5 border-t border-[#e5e0d6] px-0 pt-4 text-[12.5px] text-[#6b675e]">
            <span>Decision-support analysis, not investment advice.</span>
            <span>
              Run any report in Claude Code:{" "}
              <span className="font-mono">/deep-dive TICKER</span> · Install
              plugin →
            </span>
            <span className="ml-auto font-mono text-[11px]">
              MOCKUP · ALL FIGURES ARE STATIC PLACEHOLDERS
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
