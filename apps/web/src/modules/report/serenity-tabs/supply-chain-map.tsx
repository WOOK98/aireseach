"use client";

/* oxlint-disable i18next/no-literal-string */

import { useCallback } from "react";

interface SupplyChainMapProps {
  onTickerClick: (ticker: string) => void;
}

interface ChainNode {
  id: string;
  label: string;
  sub: string;
  highlight?: boolean;
  chokepoint?: boolean;
  noTicker?: boolean;
  tier?: "bull" | "bear" | "neutral";
}

interface ChainLayer {
  label: string;
  nodes: ChainNode[];
}

const CHAIN_LAYERS: ChainLayer[] = [
  {
    label: "Hyperscaler Capex",
    nodes: [
      { id: "GOOGL", label: "GOOGL", sub: "Google" },
      { id: "MSFT", label: "MSFT", sub: "Microsoft" },
      { id: "AMZN", label: "AMZN", sub: "Amazon" },
      { id: "META", label: "META", sub: "Meta" },
    ],
  },
  {
    label: "ASIC / TPU",
    nodes: [
      { id: "NVDA", label: "NVDA", sub: "GPU/TPU" },
      { id: "MRVL", label: "MRVL", sub: "Custom ASIC" },
      { id: "AVGO", label: "AVGO", sub: "Networking" },
    ],
  },
  {
    label: "Optical Transceivers",
    nodes: [
      { id: "LITE", label: "LITE", sub: "OCS/Laser" },
      { id: "COHR", label: "COHR", sub: "Diversified" },
      { id: "AAOI", label: "AAOI", sub: "US Vert-Int" },
    ],
  },
  {
    label: "CW/DFB Lasers",
    nodes: [{ id: "SIVE", label: "SIVE", sub: "Merchant CW", highlight: true }],
  },
  {
    label: "Epitaxial Wafer",
    nodes: [{ id: "IQE", label: "IQE", sub: "InP Epi" }],
  },
  {
    label: "InP Substrate",
    nodes: [
      { id: "AXTI", label: "AXTI", sub: "CHOKEPOINT", chokepoint: true },
      { id: "SOI", label: "SOI", sub: "Alt Substrate" },
    ],
  },
  {
    label: "Raw Materials",
    nodes: [
      { id: "INDIUM", label: "Indium", sub: "Feedstock", noTicker: true },
    ],
  },
];

const NEOCLOUD_LAYER: ChainLayer = {
  label: "Neocloud / AI Datacenter",
  nodes: [
    { id: "NBIS", label: "NBIS", sub: "S-tier", tier: "bull" },
    { id: "IREN", label: "IREN", sub: "Downgraded ⚠️", tier: "bear" },
    { id: "CRWV", label: "CRWV", sub: "Reversed ⚠️", tier: "bear" },
    { id: "CIFR", label: "CIFR", sub: "Mining→DC", tier: "neutral" },
  ],
};

export const SupplyChainMap = ({ onTickerClick }: SupplyChainMapProps) => {
  const handleNodeClick = useCallback(
    (node: ChainNode) => {
      if (!node.noTicker) {
        onTickerClick(node.label);
      }
    },
    [onTickerClick],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold tracking-tight">
          AI / Semiconductor Supply Chain
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Serenity&apos;s multi-hop BOM mapping — trace upstream to find the
          chokepoint. Click any node to analyze.
        </p>
      </div>

      {/* Main Chain */}
      <div className="space-y-3">
        {CHAIN_LAYERS.map((layer, layerIdx) => (
          <div key={layer.label}>
            {/* Layer label */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {layer.label}
              </span>
              {layerIdx < CHAIN_LAYERS.length - 1 && (
                <div className="border-border/50 flex-1 border-b border-dashed" />
              )}
            </div>

            {/* Nodes */}
            <div className="flex flex-wrap gap-3">
              {layer.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => handleNodeClick(node)}
                  disabled={node.noTicker}
                  className={`group relative flex flex-col items-center rounded-lg border px-4 py-3 transition-all ${
                    node.chokepoint
                      ? "border-dashed border-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50"
                      : node.highlight
                        ? "border-primary bg-primary/5 hover:bg-primary/10"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
                  } ${node.noTicker ? "cursor-default" : "cursor-pointer"}`}
                >
                  {node.chokepoint && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      ⚡ CHOKEPOINT
                    </span>
                  )}
                  <span
                    className={`text-sm font-bold ${
                      node.chokepoint
                        ? "text-red-600 dark:text-red-400"
                        : node.highlight
                          ? "text-primary"
                          : "text-foreground"
                    }`}
                  >
                    {node.label}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {node.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Arrow connector */}
            {layerIdx < CHAIN_LAYERS.length - 1 && (
              <div className="flex justify-center py-1">
                <svg
                  width="16"
                  height="20"
                  viewBox="0 0 16 20"
                  fill="none"
                  className="text-border"
                >
                  <path
                    d="M8 0 L8 14 M3 10 L8 16 L13 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Neocloud Layer */}
      <div className="border-t pt-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {NEOCLOUD_LAYER.label}
          </span>
          <div className="border-border/50 flex-1 border-b border-dashed" />
        </div>
        <div className="flex flex-wrap gap-3">
          {NEOCLOUD_LAYER.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => handleNodeClick(node)}
              className={`flex flex-col items-center rounded-lg border px-4 py-3 transition-all ${
                node.tier === "bull"
                  ? "border-green-300 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30"
                  : node.tier === "bear"
                    ? "border-red-300 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30"
                    : "border-border bg-card hover:border-primary/50"
              } cursor-pointer`}
            >
              <span
                className={`text-sm font-bold ${
                  node.tier === "bull"
                    ? "text-green-600 dark:text-green-400"
                    : node.tier === "bear"
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                }`}
              >
                {node.label}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {node.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 border-t pt-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded border border-dashed border-red-500 bg-red-50" />
          <span className="text-muted-foreground">Chokepoint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded border border-green-300 bg-green-50" />
          <span className="text-muted-foreground">Bull / S-tier</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded border border-red-300 bg-red-50" />
          <span className="text-muted-foreground">Bear / Reversed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="border-primary bg-primary/5 size-3 rounded border" />
          <span className="text-muted-foreground">High conviction</span>
        </div>
      </div>
    </div>
  );
};
