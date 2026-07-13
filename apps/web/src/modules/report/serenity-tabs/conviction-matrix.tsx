"use client";

/* oxlint-disable i18next/no-literal-string */

interface ConvictionMatrixProps {
  onTickerClick: (ticker: string) => void;
}

const SECTORS = [
  {
    name: "Photonics / CPO",
    tickers: [
      {
        ticker: "SIVE",
        tier: "S",
        stance: "bull",
        reason: "#1 conviction — CW/DFB merchant laser for CPO supercycle",
      },
      {
        ticker: "AXTI",
        tier: "A",
        stance: "bull",
        reason: "InP substrate chokepoint — 'Strait of AXTI'",
      },
      {
        ticker: "LITE",
        tier: "A",
        stance: "bull",
        reason: "OCS near-monopoly for Google TPU, sold out 2028",
      },
      {
        ticker: "AAOI",
        tier: "A",
        stance: "bull",
        reason: "Only US vertically integrated transceiver maker",
      },
      {
        ticker: "COHR",
        tier: "B",
        stance: "bull",
        reason: "Safer compounder, diversified photonics",
      },
      {
        ticker: "IQE",
        tier: "B",
        stance: "mixed",
        reason: "InP epiwafer — dependent on AXTI substrate supply",
      },
    ],
  },
  {
    name: "Neocloud / AI DC",
    tickers: [
      {
        ticker: "NBIS",
        tier: "S",
        stance: "bull",
        reason: "S-tier neocloud, NVIDIA partnership",
      },
      {
        ticker: "CIFR",
        tier: "B",
        stance: "mixed",
        reason: "Mining→DC pivot, execution risk",
      },
      {
        ticker: "IREN",
        tier: "F",
        stance: "bear",
        reason: "⚠️ Downgraded — financing quality concerns",
      },
      {
        ticker: "CRWV",
        tier: "F",
        stance: "bear",
        reason: "⚠️ Reversed — dilution + ATM overhang",
      },
    ],
  },
  {
    name: "AI Compute",
    tickers: [
      {
        ticker: "NVDA",
        tier: "B",
        stance: "bull",
        reason: "Obvious shovel — not the bottleneck, but core demand driver",
      },
      {
        ticker: "MRVL",
        tier: "B",
        stance: "bull",
        reason: "Custom ASIC + Celestial CPO interconnect",
      },
      {
        ticker: "AVGO",
        tier: "B",
        stance: "bull",
        reason: "Networking infrastructure, diversified",
      },
      {
        ticker: "TSM",
        tier: "B",
        stance: "bull",
        reason: "Foundry monopoly — too big for asymmetric upside",
      },
    ],
  },
  {
    name: "Power / Grid",
    tickers: [
      {
        ticker: "VST",
        tier: "A",
        stance: "bull",
        reason: "Nuclear power for AI datacenters",
      },
      {
        ticker: "CEG",
        tier: "A",
        stance: "bull",
        reason: "Constellation — nuclear fleet, grid exposure",
      },
      {
        ticker: "XLU",
        tier: "B",
        stance: "bull",
        reason: "Utility ETF — macro hedge play",
      },
    ],
  },
  {
    name: "Memory / Storage",
    tickers: [
      {
        ticker: "MU",
        tier: "B",
        stance: "bull",
        reason: "HBM supercycle beneficiary",
      },
      {
        ticker: "SNDK",
        tier: "B",
        stance: "bull",
        reason: "NAND exposure, storage demand",
      },
    ],
  },
  {
    name: "Other",
    tickers: [
      {
        ticker: "SOI",
        tier: "B",
        stance: "mixed",
        reason: "Alternative substrate — less conviction than AXTI",
      },
      {
        ticker: "TSEM",
        tier: "B",
        stance: "mixed",
        reason: "Tower Semi — foundry, less pure-play",
      },
      {
        ticker: "EWY",
        tier: "C",
        stance: "mixed",
        reason: "South Korea ETF — Samsung/SK Hynix proxy",
      },
    ],
  },
];

const tierColors: Record<string, string> = {
  S: "bg-green-600 text-white",
  A: "bg-green-500 text-white",
  B: "bg-yellow-500 text-white",
  C: "bg-orange-500 text-white",
  F: "bg-red-600 text-white",
};

const stanceStyles: Record<string, string> = {
  bull: "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
  bear: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
  mixed:
    "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20",
};

export const ConvictionMatrix = ({ onTickerClick }: ConvictionMatrixProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">
          Serenity&apos;s Conviction Matrix
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          All tracked tickers by sector, conviction tier, and stance. Click any
          ticker to analyze.
        </p>
      </div>

      {SECTORS.map((sector) => (
        <div key={sector.name}>
          <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            {sector.name}
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sector.tickers.map((t) => (
              <button
                key={t.ticker}
                type="button"
                onClick={() => onTickerClick(t.ticker)}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all hover:shadow-sm ${stanceStyles[t.stance]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t.ticker}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tierColors[t.tier]}`}
                  >
                    {t.tier}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-[10px] leading-tight">
                  {t.reason}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 border-t pt-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-green-600 px-1 py-0.5 font-bold text-white">
            S
          </span>
          <span className="text-muted-foreground">Highest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-green-500 px-1 py-0.5 font-bold text-white">
            A
          </span>
          <span className="text-muted-foreground">High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-yellow-500 px-1 py-0.5 font-bold text-white">
            B
          </span>
          <span className="text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-red-600 px-1 py-0.5 font-bold text-white">
            F
          </span>
          <span className="text-muted-foreground">Reversed</span>
        </div>
      </div>
    </div>
  );
};
