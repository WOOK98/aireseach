"use client";

/* oxlint-disable i18next/no-literal-string */

import { useEffect, useRef } from "react";

const ACCURACY_METRICS = [
  { label: "30-day directional accuracy", value: 61, color: "#22c55e" },
  { label: "30-day ±10% hit rate", value: 41, color: "#eab308" },
  { label: "60-day ±20% favorable", value: 54, color: "#3b82f6" },
  { label: "Mature thesis validation", value: 75, color: "#8b5cf6" },
  { label: "Photonics/CPO subset", value: 85, color: "#16a34a" },
];

const VERIFIED_CALLS = [
  { ticker: "CIFR", result: "+250%", date: "2025 Q3", note: "Mining→DC pivot" },
  {
    ticker: "AXTI",
    result: "+310%",
    date: "2025-12 → 2026-04",
    note: "InP chokepoint thesis",
  },
  {
    ticker: "SIVE",
    result: "+200%+",
    date: "2026-03 → 2026-05",
    note: "#1 conviction, CPO laser",
  },
  {
    ticker: "LITE",
    result: "+85%",
    date: "2025-12 → 2026-03",
    note: "OCS monopoly for TPU",
  },
  {
    ticker: "AAOI",
    result: "+180%",
    date: "2026-02 earnings → Apr",
    note: "Blowout Q1, 900% growth",
  },
  {
    ticker: "NBIS",
    result: "+120%",
    date: "2025 Q4 → 2026 Q1",
    note: "S-tier neocloud",
  },
  {
    ticker: "XLU",
    result: "+15%",
    date: "2026-01 → 2026-04",
    note: "Power/grid macro hedge",
  },
  {
    ticker: "IREN",
    result: "⚠️ -40%",
    date: "2026-02 → 2026-04",
    note: "Reversed — financing issues",
  },
  {
    ticker: "CRWV",
    result: "⚠️ -30%",
    date: "2026-01 → 2026-03",
    note: "Reversed — ATM dilution",
  },
];

const SECTOR_COVERAGE = [
  { name: "Photonics/CPO", pct: 30, color: "#22c55e" },
  { name: "Neocloud", pct: 20, color: "#3b82f6" },
  { name: "AI Compute", pct: 15, color: "#8b5cf6" },
  { name: "Power/Grid", pct: 15, color: "#eab308" },
  { name: "Memory", pct: 10, color: "#f97316" },
  { name: "Other", pct: 10, color: "#6b7280" },
];

export const CalibrationChart = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = 80;
    const innerR = 50;

    let startAngle = -Math.PI / 2;

    SECTOR_COVERAGE.forEach((sector) => {
      const sweep = (sector.pct / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
      ctx.arc(cx, cy, innerR, startAngle + sweep, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = sector.color;
      ctx.fill();
      startAngle += sweep;
    });

    // Center text
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Sector", cx, cy - 4);
    ctx.fillText("Coverage", cx, cy + 10);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">
          Calibration & Win Rate
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Honest assessment of Serenity&apos;s public call accuracy.
          Self-reported returns, verified against Yahoo Finance adjusted-close
          data.
        </p>
      </div>

      {/* Accuracy Bars */}
      <div className="space-y-3">
        <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          Accuracy Metrics
        </h4>
        {ACCURACY_METRICS.map((m) => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{m.label}</span>
              <span className="font-mono font-bold">{m.value}%</span>
            </div>
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${m.value}%`,
                  backgroundColor: m.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Donut Chart + Legend */}
      <div>
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
          Sector Coverage Distribution
        </h4>
        <div className="flex items-center gap-6">
          <canvas ref={canvasRef} className="shrink-0" />
          <div className="space-y-1.5 text-[10px]">
            {SECTOR_COVERAGE.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-foreground">
                  {s.name} — {s.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verified Calls Timeline */}
      <div>
        <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
          Verified Calls Timeline
        </h4>
        <div className="space-y-2">
          {VERIFIED_CALLS.map((call) => (
            <div
              key={call.ticker + call.date}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                call.result.startsWith("⚠️")
                  ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                  : "border-border bg-card"
              }`}
            >
              <span className="mt-0.5 text-sm font-bold">{call.ticker}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      call.result.startsWith("⚠️")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {call.result}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {call.date}
                  </span>
                </div>
                <p className="text-muted-foreground text-[10px]">{call.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-[10px] text-amber-800 dark:text-amber-300">
          <strong>Calibration note:</strong> These are rough bands from a local
          re-score of dated public calls using Yahoo Finance data. Not
          independently verified. Survivorship bias applies — public feeds
          highlight winners. Reversed calls exist and are flagged above. Treat
          as process validation, not trading proof.
        </p>
      </div>
    </div>
  );
};
