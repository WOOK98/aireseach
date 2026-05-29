"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  Zap,
  BarChart3,
  Globe,
  TrendingUp,
  MessageSquare,
  Shield,
  GitBranch,
  Grid3X3,
  Play,
  Square,
  Loader2,
  Download,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Input } from "@workspace/ui-web/input";
import { Label } from "@workspace/ui-web/label";

import { CalibrationChart } from "./serenity-tabs/calibration-chart";
import { ConvictionMatrix } from "./serenity-tabs/conviction-matrix";
import { SupplyChainMap } from "./serenity-tabs/supply-chain-map";

import type { FormEvent } from "react";

// ─── Skill Definitions ───────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  shortName: string;
  icon: typeof Zap;
  color: string;
  systemPrompt: string;
}

const SKILLS: Skill[] = [
  {
    id: "serenity",
    name: "Serenity",
    shortName: "SRTY",
    icon: GitBranch,
    color: "#22c55e",
    systemPrompt: `You are Serenity's AI analytical assistant — a supply-chain bottleneck analyst modeled after @aleabitoreddit's methodology.

CORE PRINCIPLE: Don't buy the obvious "shovel seller" (NVDA). Trace the supply chain as far upstream as possible and find the single point of failure that a hyperscaler will pay *anything* to keep flowing.

ANALYSIS STRUCTURE:
1. Supply Chain Map — Map the full chain from end-demand to raw materials
2. Bottleneck Identification — "if this layer stopped shipping, what breaks?"
3. 14-Point Checklist — Bottleneck?, Upstream & cheap?, Chain fluency?, Demand driver?, Contracts?, Real margins?, Financing quality?, Stage?, Catalyst?, Market cap headroom?, Validation lag?, Risk & sizing?, Macro overlay?, Position?
4. Key tickers: SIVE (#1), AXTI (chokepoint), LITE, COHR, AAOI, NBIS, IQE
5. Calibration: ~61% 30-day accuracy, ~75-85% on mature supply-chain theses

This is decision-support only. Never auto-trade. State disclaimers.`,
  },
  {
    id: "fundamental",
    name: "Fundamental",
    shortName: "FNDM",
    icon: BarChart3,
    color: "#3b82f6",
    systemPrompt: `You are a senior fundamental analyst. Analyze stocks through traditional financial metrics.

ANALYSIS STRUCTURE:
1. Revenue & Growth — YoY/QoQ trends, guidance accuracy, revenue quality
2. Profitability — Gross/Operating/Net margins, FCF generation, margin trajectory
3. Balance Sheet — Cash position, debt levels, current ratio, capital allocation
4. Valuation — P/E, P/S, EV/EBITDA, PEG ratio vs peers and historical range
5. Competitive Position — Market share, moat durability, switching costs
6. Management Quality — Track record, insider activity, capital allocation decisions

Provide a clear bull/bear case with price targets if applicable.`,
  },
  {
    id: "macro",
    name: "Macro",
    shortName: "MACR",
    icon: Globe,
    color: "#8b5cf6",
    systemPrompt: `You are a macro strategist analyzing stocks through the lens of global macroeconomic forces.

ANALYSIS STRUCTURE:
1. Interest Rate Environment — Fed policy trajectory, yield curve shape, real rates
2. Currency Impact — USD strength, FX exposure, hedging strategies
3. Geopolitical Risks — Trade tensions, sanctions, supply chain reshoring
4. Sector Rotation — Where is money flowing? Risk-on vs risk-off signals
5. Credit Conditions — Liquidity, spreads, refinancing risk
6. Commodity Input Costs — Energy, metals, materials impact on margins
7. Regulatory Landscape — Policy changes, subsidies, compliance costs

Frame analysis in terms of macro regime changes and their sector implications.`,
  },
  {
    id: "technical",
    name: "Technical",
    shortName: "TECH",
    icon: TrendingUp,
    color: "#f59e0b",
    systemPrompt: `You are a technical analyst. Analyze stocks through price action and chart patterns.

ANALYSIS STRUCTURE:
1. Trend Analysis — Primary/secondary trends, support/resistance levels
2. Moving Averages — 50/100/200 MA positioning, golden/death crosses
3. Momentum — RSI, MACD, Stochastic readings and divergences
4. Volume — On-balance volume, accumulation/distribution, unusual volume
5. Chart Patterns — Head & shoulders, flags, wedges, breakouts
6. Volatility — Bollinger Bands, ATR, IV rank/percentile
7. Key Levels — Major support/resistance, Fibonacci retracements

Provide entry/exit levels with risk/reward ratios.`,
  },
  {
    id: "sentiment",
    name: "Sentiment",
    shortName: "SENT",
    icon: MessageSquare,
    color: "#ec4899",
    systemPrompt: `You are a sentiment analyst. Analyze stocks through market sentiment and positioning.

ANALYSIS STRUCTURE:
1. Institutional Flow — Dark pool activity, options flow, 13F changes
2. Short Interest — Days to cover, borrow cost, squeeze potential
3. Insider Activity — Buying/selling patterns, timing relative to catalysts
4. Social Sentiment — Retail attention, Reddit/Twitter buzz, search trends
5. Analyst Consensus — Rating distribution, price target revisions, estimate momentum
6. News Flow — Sentiment of recent headlines, narrative shifts
7. Put/Call Ratio — Options positioning, skew, unusual activity

Flag when sentiment extremes suggest contrarian opportunities.`,
  },
  {
    id: "risk",
    name: "Risk Matrix",
    shortName: "RSKM",
    icon: Shield,
    color: "#ef4444",
    systemPrompt: `You are a risk analyst. Evaluate stocks through a comprehensive risk framework.

ANALYSIS STRUCTURE:
1. Business Risk — Customer concentration, cyclicality, disruption threats
2. Financial Risk — Leverage, liquidity, refinancing needs, covenant risk
3. Operational Risk — Key person dependency, supply chain vulnerability, execution risk
4. Regulatory Risk — Pending legislation, compliance costs, litigation exposure
5. Market Risk — Beta, correlation, sector sensitivity, volatility profile
6. Tail Risks — Black swan scenarios, binary event risks, bankruptcy risk
7. Risk/Reward Asymmetry — Downside scenarios vs upside potential

Provide a risk rating (Low/Medium/High/Critical) for each category.`,
  },
];

// ─── Sub-tabs for visualization ──────────────────────────────────

type SubTab = "analysis" | "chain" | "matrix" | "calibration";

const SUB_TABS: { id: SubTab; label: string; icon: typeof Zap }[] = [
  { id: "analysis", label: "Analysis", icon: Zap },
  { id: "chain", label: "Supply Chain", icon: GitBranch },
  { id: "matrix", label: "Conviction", icon: Grid3X3 },
  { id: "calibration", label: "Win Rate", icon: TrendingUp },
];

// ─── Main Component ──────────────────────────────────────────────

interface SkillResult {
  skillId: string;
  content: string;
  status: "loading" | "done" | "error";
  error?: string;
}

export const SerenityTerminal = () => {
  const [ticker, setTicker] = useState("");
  const [multiMode, setMultiMode] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(
    new Set(["serenity"]),
  );
  const [activeSkill, setActiveSkill] = useState("serenity");
  const [subTab, setSubTab] = useState<SubTab>("analysis");
  const [results, setResults] = useState<Map<string, SkillResult>>(new Map());
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const abortRef = useRef<AbortController[]>([]);

  const isLoading = Array.from(results.values()).some(
    (r) => r.status === "loading",
  );

  const toggleSkill = useCallback(
    (skillId: string) => {
      if (multiMode) {
        setSelectedSkills((prev) => {
          const next = new Set(prev);
          if (next.has(skillId)) {
            next.delete(skillId);
          } else {
            next.add(skillId);
          }
          return next;
        });
      } else {
        setActiveSkill(skillId);
        setSelectedSkills(new Set([skillId]));
      }
    },
    [multiMode],
  );

  const runAnalysis = useCallback(
    async (skill: Skill, ticker: string) => {
      if (!apiKey) return;

      setResults(
        (prev) =>
          new Map(
            prev.set(skill.id, {
              skillId: skill.id,
              content: "",
              status: "loading",
            }),
          ),
      );

      const controller = new AbortController();
      abortRef.current.push(controller);

      try {
        const response = await fetch("/api/report/serenity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            mode: "single",
            language: "en",
            api_key: apiKey,
            base_url: baseUrl,
            model,
            skill_prompt: skill.systemPrompt,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let content = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value, { stream: true });
          setResults(
            (prev) =>
              new Map(
                prev.set(skill.id, {
                  skillId: skill.id,
                  content,
                  status: "loading",
                }),
              ),
          );
        }

        setResults(
          (prev) =>
            new Map(
              prev.set(skill.id, {
                skillId: skill.id,
                content,
                status: "done",
              }),
            ),
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults(
          (prev) =>
            new Map(
              prev.set(skill.id, {
                skillId: skill.id,
                content: "",
                status: "error",
                error: err instanceof Error ? err.message : "Unknown error",
              }),
            ),
        );
      }
    },
    [apiKey, baseUrl, model],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!ticker.trim() || !apiKey) return;

      setSubTab("analysis");
      abortRef.current = [];

      const skillsToRun = SKILLS.filter((s) => selectedSkills.has(s.id));

      if (multiMode) {
        await Promise.all(skillsToRun.map((s) => runAnalysis(s, ticker)));
      } else {
        const skill = skillsToRun[0];
        if (skill) await runAnalysis(skill, ticker);
      }
    },
    [ticker, apiKey, multiMode, selectedSkills, runAnalysis],
  );

  const handleStop = () => {
    abortRef.current.forEach((c) => c.abort());
    abortRef.current = [];
    setResults(new Map());
  };

  const handleTickerFromTab = useCallback((t: string) => {
    setTicker(t);
    setSubTab("analysis");
  }, []);

  const activeResults = multiMode
    ? Array.from(results.values()).filter((r) => r.status !== "loading" || r.content)
    : results.has(activeSkill)
      ? [results.get(activeSkill)!]
      : [];

  const gridCols =
    activeResults.length <= 1
      ? "grid-cols-1"
      : activeResults.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <div className="flex h-[calc(100vh-200px)] gap-0 overflow-hidden rounded-lg border bg-[#0a0e17]">
      {/* Left sidebar — Skill selector */}
      <div className="w-56 shrink-0 border-r border-white/10 bg-[#0d1220] p-4">
        <div className="mb-4">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-green-400">
            Skills
          </h3>
        </div>

        {/* Multi-mode toggle */}
        <button
          type="button"
          onClick={() => setMultiMode(!multiMode)}
          className="mb-4 flex w-full items-center justify-between rounded border border-white/10 px-3 py-2 text-xs transition-colors hover:border-white/20"
        >
          <span className="text-white/70">Multi-Skill</span>
          {multiMode ? (
            <ToggleRight className="size-4 text-green-400" />
          ) : (
            <ToggleLeft className="size-4 text-white/30" />
          )}
        </button>

        {/* Skill list */}
        <div className="space-y-1">
          {SKILLS.map((skill) => {
            const isActive = multiMode
              ? selectedSkills.has(skill.id)
              : activeSkill === skill.id;
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs transition-all ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                {multiMode && (
                  <input
                    type="checkbox"
                    checked={selectedSkills.has(skill.id)}
                    onChange={() => toggleSkill(skill.id)}
                    className="accent-green-500"
                  />
                )}
                <skill.icon
                  className="size-3.5 shrink-0"
                  style={{ color: isActive ? skill.color : undefined }}
                />
                <span className="font-mono font-medium">{skill.shortName}</span>
                <span className="text-white/30">{skill.name}</span>
              </button>
            );
          })}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div>
            <Label className="font-mono text-[10px] uppercase text-white/40">
              Ticker
            </Label>
            <Input
              placeholder="NVDA"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              disabled={isLoading}
              className="mt-1 border-white/10 bg-white/5 font-mono text-white placeholder:text-white/20"
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase text-white/40">
              API Key
            </Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
              className="mt-1 border-white/10 bg-white/5 font-mono text-white placeholder:text-white/20"
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase text-white/40">
              Model
            </Label>
            <Input
              placeholder="deepseek-v4-flash"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLoading}
              className="mt-1 border-white/10 bg-white/5 font-mono text-white placeholder:text-white/20"
            />
          </div>

          <div>
            <Label className="font-mono text-[10px] uppercase text-white/40">
              Base URL
            </Label>
            <Input
              placeholder="https://api.deepseek.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={isLoading}
              className="mt-1 border-white/10 bg-white/5 font-mono text-white placeholder:text-white/20"
            />
          </div>

          <div className="flex gap-2">
            {isLoading ? (
              <Button
                type="button"
                variant="destructive"
                className="flex-1 font-mono text-xs"
                onClick={handleStop}
              >
                <Square className="mr-1 size-3" /> STOP
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 bg-green-600 font-mono text-xs hover:bg-green-700"
                disabled={!ticker.trim() || !apiKey || selectedSkills.size === 0}
              >
                <Play className="mr-1 size-3" /> RUN
              </Button>
            )}
          </div>
        </form>

        {/* Status */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="font-mono text-[10px] text-white/30">
            <div>
              MODE: {multiMode ? "MULTI" : "SINGLE"}
            </div>
            <div>TICKER: {ticker || "—"}</div>
            <div>SKILLS: {selectedSkills.size}</div>
          </div>
        </div>
      </div>

      {/* Right side — Sub-tabs + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sub-tab bar */}
        <div className="flex gap-0 border-b border-white/10 bg-[#0d1220]">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs transition-colors ${
                subTab === tab.id
                  ? "border-b-2 border-green-400 bg-white/5 text-green-400"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <tab.icon className="size-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-4">
          {/* Visualization tabs */}
          {subTab === "chain" && (
            <div className="text-white">
              <SupplyChainMap onTickerClick={handleTickerFromTab} />
            </div>
          )}
          {subTab === "matrix" && (
            <div className="text-white">
              <ConvictionMatrix onTickerClick={handleTickerFromTab} />
            </div>
          )}
          {subTab === "calibration" && (
            <div className="text-white">
              <CalibrationChart />
            </div>
          )}

          {/* Analysis tab */}
          {subTab === "analysis" && (
            <>
              {/* Empty state */}
              {results.size === 0 && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-2 font-mono text-2xl text-green-400/20">
                      ▮
                    </div>
                    <p className="font-mono text-sm text-white/30">
                      Enter a ticker and click RUN
                    </p>
                    <p className="mt-1 font-mono text-xs text-white/20">
                      {multiMode
                        ? "Select skills on the left, results will appear in grid"
                        : "Click a skill on the left, then RUN"}
                    </p>
                  </div>
                </div>
              )}

              {/* Results grid */}
              {results.size > 0 && (
                <div className={`grid gap-4 ${gridCols}`}>
                  {SKILLS.filter((s) => results.has(s.id)).map((skill) => {
                    const result = results.get(skill.id)!;
                    return (
                      <div
                        key={skill.id}
                        className="rounded border border-white/10 bg-[#0d1220]"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                          <skill.icon
                            className="size-3.5"
                            style={{ color: skill.color }}
                          />
                          <span className="font-mono text-xs font-bold text-white/80">
                            {skill.shortName}
                          </span>
                          <span className="font-mono text-[10px] text-white/30">
                            {skill.name}
                          </span>
                          {result.status === "loading" && (
                            <Loader2 className="ml-auto size-3 animate-spin text-green-400" />
                          )}
                          {result.status === "done" && (
                            <Badge className="ml-auto bg-green-600 font-mono text-[10px]">
                              DONE
                            </Badge>
                          )}
                          {result.status === "error" && (
                            <Badge className="ml-auto bg-red-600 font-mono text-[10px]">
                              ERR
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="max-h-[500px] overflow-auto p-3">
                          {result.error && (
                            <p className="font-mono text-xs text-red-400">
                              {result.error}
                            </p>
                          )}
                          {result.content && (
                            <div className="prose prose-invert prose-xs max-w-none font-mono text-xs leading-relaxed text-white/70">
                              {result.content.split("\n").map((line, i) => (
                                <p key={i} className="mb-1">
                                  {line}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0d1220] px-4 py-1.5">
          <div className="flex gap-4 font-mono text-[10px] text-white/30">
            <span>
              SERENITY TERMINAL v1.0
            </span>
            <span>
              {new Date().toLocaleTimeString("en-US", { hour12: false })}
            </span>
          </div>
          <div className="flex gap-4 font-mono text-[10px] text-white/30">
            <span>SKILLS: {SKILLS.length}</span>
            <span>
              MODE: {multiMode ? "PARALLEL" : "SINGLE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
