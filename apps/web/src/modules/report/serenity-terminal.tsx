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
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

import { Input } from "@workspace/ui-web/input";

import { CalibrationChart } from "./serenity-tabs/calibration-chart";
import { ConvictionMatrix } from "./serenity-tabs/conviction-matrix";
import { SupplyChainMap } from "./serenity-tabs/supply-chain-map";

import type { FormEvent } from "react";

// ─── Skills ──────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  sub: string;
  icon: typeof Zap;
  color: string;
  prompt: string;
}

const SKILLS: Skill[] = [
  {
    id: "serenity",
    name: "Serenity",
    sub: "供应链",
    icon: GitBranch,
    color: "#1a3a5c",
    prompt: `You are an analytical assistant applying the distilled thinking framework of Serenity (@aleabitoreddit) — an AI/semiconductor supply-chain analyst with ~450K followers, built from 5,582 tweets (2025-07 to 2026-05) and 4 long-form articles.

CORE PRINCIPLE: Don't buy the obvious "shovel seller" (NVDA). Trace the supply chain as far upstream as possible and find the single point of failure a hyperscaler will pay anything to keep flowing.

Supply chain: hyperscaler capex → ASICs/TPUs → optical transceivers → CW/DFB laser (SIVE) → InP epiwafer (IQE) → InP substrate (AXTI) → indium feedstock

14 PRINCIPLES: 1) Bottleneck hunting 2) Multi-hop BOM/OSINT mapping 3) Signed-contract ARR vs market-cap mismatch 4) Mag7 customer-concentration filter 5) GAAP-margin war 6) Qualification cycle vs TTM revenue 7) Dilution/ATM as disqualifier 8) Counterparty/financing-quality spectrum 9) Short-squeeze setup (profitable-grower only) 10) Tariff/macro-shock-as-buy 11) Institutional lag/dark-pool reading 12) Vega/IV mispricing 13) Conviction tiering and sizing 14) Anti-patterns

KEY STANCES (May 2026): SIVE #1 conviction, AXTI flagship chokepoint, AAOI high conviction, NBIS S-tier, LITE structural long. IREN/CRWV bear. PLTR short. POET downgraded.

Calibration: ~61% 30-day accuracy, ~75-85% mature supply-chain theses. Self-reported, unverified.

Respond in Chinese. Structure: 供应链位置 → 瓶颈测试 → Serenity已知立场 → 牛熊论点 → 不确定性声明. End with disclaimer.`,
  },
  {
    id: "fundamental",
    name: "Fundamental",
    sub: "基本面",
    icon: BarChart3,
    color: "#1a5c3a",
    prompt: `You are a rigorous fundamental analyst. Analyze: revenue/earnings quality and trends, balance sheet strength, valuation multiples vs peers (P/E, EV/EBITDA, P/S), moat analysis, management quality and capital allocation. Respond in Chinese. Use specific numbers. Bold key metrics. Structure: summary → financials → valuation → moat → verdict. End with disclaimer.`,
  },
  {
    id: "macro",
    name: "Macro",
    sub: "宏观",
    icon: Globe,
    color: "#7a4f00",
    prompt: `You are a macro analyst. Analyze: interest rate sensitivity and Fed policy impact, dollar/FX effects, sector rotation and capital flow dynamics, geopolitical risk exposure (tariffs, export controls), inflation/deflation regime impact. Respond in Chinese. Structure: macro backdrop → rate sensitivity → sector rotation → geopolitical overlay → positioning implication. End with disclaimer.`,
  },
  {
    id: "technical",
    name: "Technical",
    sub: "技术面",
    icon: TrendingUp,
    color: "#4a1e8a",
    prompt: `You are a technical analyst. Serenity's view: "TA is snake oil without fundamentals" — so frame technical as a COMPLEMENT to fundamental. Analyze: trend structure, key support/resistance levels, momentum (RSI, MACD), volume signals, chart patterns. Respond in Chinese. Structure: trend → key levels → momentum → volume → setup trigger. End with disclaimer.`,
  },
  {
    id: "sentiment",
    name: "Sentiment",
    sub: "市场情绪",
    icon: MessageSquare,
    color: "#0a5c5c",
    prompt: `You are a market sentiment analyst. Key principle: "IGNORE Reddit/X sentiment — usually wrong." Focus on: institutional vs retail positioning divergence, options market signals, analyst consensus and revision trends, dark-pool/block-trade patterns, insider activity. Respond in Chinese. Structure: retail sentiment → institutional flow → options positioning → analyst lag → contrarian opportunity. End with disclaimer.`,
  },
  {
    id: "risk",
    name: "Risk",
    sub: "风险矩阵",
    icon: Shield,
    color: "#9b2c2c",
    prompt: `You are a risk analyst. Key disqualifiers: large active ATM + SBC dilution, single-customer concentration, China export-control binary risk, pre-revenue with no qualification path. Analyze: business model risks, financial/dilution risks, market risks, tail risks, risk-adjusted sizing. Rate each: LOW/MEDIUM/HIGH. Respond in Chinese. Structure: business risks → financial risks → market risks → tail risks → sizing implication. End with disclaimer.`,
  },
];

// ─── Constants ───────────────────────────────────────────────────

const YEARS = [1, 2, 3, 5, 10];

const QUICK_EXAMPLES = [
  {
    skill: "serenity",
    text: "$SIVE CPO激光供应链",
    query: "$SIVE Sivers Semiconductors CPO激光瓶颈深度分析",
  },
  {
    skill: "serenity",
    text: "$AXTI InP基板控制",
    query: "$AXTI InP基板 Strait of AXTI 供应链控制分析",
  },
  {
    skill: "serenity",
    text: "$NBIS Neocloud质量",
    query: "$NBIS Neocloud融资质量对比分析",
  },
  {
    skill: "fundamental",
    text: "$AAOI 基本面深度",
    query: "$AAOI 美国制造转录器基本面分析",
  },
  {
    skill: "macro",
    text: "CPO板块资本轮动",
    query: "AI光子学CPO板块宏观叙事和资本轮动",
  },
  {
    skill: "risk",
    text: "Neocloud稀释风险",
    query: "$IREN $CRWV 稀释/ATM风险矩阵对比",
  },
];

const RECENT = [
  "$SIVE CPO激光瓶颈",
  "$AXTI InP供应链",
  "$NBIS Neocloud质量",
  "$AAOI 美国制造转录器",
];

type SubTab = "examples" | "chain" | "matrix" | "calibration";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "examples", label: "快速开始" },
  { id: "chain", label: "供应链图谱" },
  { id: "matrix", label: "持仓矩阵" },
  { id: "calibration", label: "胜率数据" },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatContent(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .split(/\n\n+/)
    .map((p) => (p.trim() ? `<p>${p.replace(/\n/g, "<br>")}</p>` : ""))
    .join("");
}

// ─── Streaming content renderer (ref-based, skips React reconciliation) ──

function StreamingContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);

  return <div ref={ref} className={className} />;
}

// ─── Component ───────────────────────────────────────────────────

interface AnalysisResult {
  skillId: string;
  query: string;
  content: string;
  status: "loading" | "done" | "error";
  error?: string;
  timestamp: string;
}

export const SerenityTerminal = () => {
  const [ticker, setTicker] = useState("");
  const [year, setYear] = useState(3);
  const [multiMode, setMultiMode] = useState(false);
  const [activeSkill, setActiveSkill] = useState("serenity");
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SubTab>("examples");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController[]>([]);

  const handleSkillClick = useCallback(
    (skillId: string) => {
      if (multiMode) {
        setCheckedSkills((prev) => {
          const next = new Set(prev);
          if (next.has(skillId)) next.delete(skillId);
          else next.add(skillId);
          return next;
        });
      } else {
        setActiveSkill(skillId);
      }
    },
    [multiMode],
  );

  const runSingle = useCallback(
    async (query: string, skillId: string) => {
      if (!apiKey) return;

      const skill = SKILLS.find((s) => s.id === skillId);
      if (!skill) return;

      const ts = new Date().toLocaleTimeString("zh", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const result: AnalysisResult = {
        skillId,
        query,
        content: "",
        status: "loading",
        timestamp: ts,
      };

      setResults((prev) => [result, ...prev]);

      const controller = new AbortController();
      abortRef.current.push(controller);

      try {
        const response = await fetch("/api/report/serenity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: query.split(" ")[0],
            mode: "single",
            language: "zh-CN",
            api_key: apiKey,
            base_url: baseUrl,
            model,
            skill_prompt: skill.prompt,
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
          setResults((prev) => {
            const next = [...prev];
            const idx = next.findIndex(
              (r) => r.skillId === skillId && r.timestamp === ts,
            );
            if (idx >= 0)
              next[idx] = { ...next[idx], content } as AnalysisResult;
            return next;
          });
        }

        setResults((prev) => {
          const next = [...prev];
          const idx = next.findIndex(
            (r) => r.skillId === skillId && r.timestamp === ts,
          );
          if (idx >= 0)
            next[idx] = {
              ...next[idx],
              content,
              status: "done",
            } as AnalysisResult;
          return next;
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResults((prev) => {
          const next = [...prev];
          const idx = next.findIndex(
            (r) => r.skillId === skillId && r.timestamp === ts,
          );
          if (idx >= 0)
            next[idx] = {
              ...next[idx],
              status: "error",
              error: err instanceof Error ? err.message : "Unknown error",
            } as AnalysisResult;
          return next;
        });
      }
    },
    [apiKey, baseUrl, model],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!ticker.trim() || !apiKey || running) return;

      setRunning(true);
      setActiveTab("examples");
      abortRef.current = [];

      if (multiMode && checkedSkills.size > 0) {
        await Promise.all(
          Array.from(checkedSkills).map((sid) => runSingle(ticker, sid)),
        );
      } else {
        await runSingle(ticker, activeSkill);
      }

      setRunning(false);
    },
    [ticker, apiKey, running, multiMode, checkedSkills, activeSkill, runSingle],
  );

  const handleQuickRun = useCallback(
    (query: string, skillId: string) => {
      if (!apiKey) return;
      setTicker(query);
      setActiveTab("examples");
      void runSingle(query, skillId);
    },
    [apiKey, runSingle],
  );

  const handleStop = () => {
    abortRef.current.forEach((c) => c.abort());
    abortRef.current = [];
    setRunning(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Left Panel */}
      <aside className="w-[280px] shrink-0 border-r border-[#e0dbd2] bg-[#faf9f6] p-6">
        <div className="space-y-6">
          {/* Ticker Input */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              分析目标
            </div>
            <input
              placeholder="代码 / 行业 / 问题"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit(e as never)}
              disabled={running}
              className="w-full border-b border-[#ccc8be] bg-transparent pb-1.5 font-serif text-xl font-light text-[#1a1814] transition-colors outline-none focus:border-[#1a3a5c]"
            />
          </div>

          {/* Year Grid */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              分析年限
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`flex h-8 items-center justify-center rounded border font-mono text-xs transition-all ${
                    year === y
                      ? "border-[#1a1814] bg-[#1a1814] text-[#faf9f6]"
                      : "border-[#ccc8be] text-[#5a5650] hover:border-[#5a5650]"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              分析视角 · Skill
            </div>
            <div className="space-y-0.5">
              {SKILLS.map((skill) => {
                const isActive = multiMode
                  ? checkedSkills.has(skill.id)
                  : activeSkill === skill.id;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSkillClick(skill.id)}
                    className={`flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left transition-all ${
                      isActive
                        ? skill.id === "serenity"
                          ? "border border-[#b8cedd] bg-[#e8eef5]"
                          : "border border-[#e0dbd2] bg-[#f4f2ee]"
                        : "border border-transparent hover:bg-[#f4f2ee]"
                    }`}
                  >
                    {multiMode && (
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                          checkedSkills.has(skill.id)
                            ? "border-[#1a5c3a] bg-[#1a5c3a] text-white"
                            : "border-[#ccc8be]"
                        }`}
                      >
                        {checkedSkills.has(skill.id) && "✓"}
                      </div>
                    )}
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: skill.color }}
                    />
                    <span className="flex-1 text-[13px] text-[#1a1814]">
                      {skill.name}
                    </span>
                    <span className="font-mono text-[11px] text-[#9a9690]">
                      {skill.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Parallel toggle */}
            <div
              className={`mt-3 flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-all ${
                multiMode
                  ? "border-[#9dcfb8] bg-[#edf7f2]"
                  : "border-[#e0dbd2] bg-[#f4f2ee]"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setMultiMode(!multiMode);
                if (multiMode) setCheckedSkills(new Set());
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setMultiMode(!multiMode);
                  if (multiMode) setCheckedSkills(new Set());
                }
              }}
            >
              <span className="text-xs text-[#5a5650]">多 Skill 并行分析</span>
              <div
                className={`relative h-[18px] w-[34px] rounded-full transition-colors ${
                  multiMode ? "bg-[#1a5c3a]" : "bg-[#ccc8be]"
                }`}
              >
                <div
                  className="absolute top-[3px] left-[3px] h-3 w-3 rounded-full bg-white shadow-sm transition-all"
                  style={{ left: multiMode ? 19 : 3 }}
                />
              </div>
            </div>
          </div>

          {/* Run Button */}
          <button
            type="button"
            onClick={running ? handleStop : handleSubmit}
            disabled={!ticker.trim() || !apiKey}
            className={`w-full rounded py-3 font-mono text-xs tracking-[.08em] transition-all ${
              running
                ? "border border-[#1a1814] bg-[#faf9f6] text-[#1a1814]"
                : "bg-[#1a1814] text-[#faf9f6] hover:bg-[#2d2b28] disabled:bg-[#9a9690]"
            }`}
          >
            {running ? "分析中…" : "开始分析"}
          </button>

          {/* API Key */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              API Key
            </div>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="border-[#ccc8be] bg-transparent font-mono text-xs"
            />
          </div>

          {/* Model */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              Model
            </div>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border-[#ccc8be] bg-transparent font-mono text-xs"
            />
          </div>

          {/* Base URL */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              Base URL
            </div>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="border-[#ccc8be] bg-transparent font-mono text-xs"
            />
          </div>

          {/* Recent */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              最近查询
            </div>
            <div className="space-y-1">
              {RECENT.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTicker(r)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-[#f4f2ee]"
                >
                  <div className="h-1 w-1 rounded-full bg-[#9a9690]" />
                  <span className="font-mono text-xs text-[#5a5650]">{r}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Right Panel */}
      <main className="flex-1 overflow-y-auto bg-[#faf9f6] p-10">
        {/* Hero / Tabs */}
        {results.length === 0 && (
          <div>
            <h1 className="mb-2 font-serif text-[30px] leading-tight font-light text-[#1a1814]">
              供应链瓶颈分析
              <br />
              AI · 半导体 · 光子学
            </h1>
            <p className="mb-7 font-mono text-[13px] text-[#9a9690]">
              <span className="text-[#5a5650]">
                Serenity (@aleabitoreddit) 框架
              </span>{" "}
              · 5,582 tweets · 4 长文蒸馏 · 仅供决策参考，非投资建议
            </p>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="mb-7 flex gap-0 border-b border-[#e0dbd2]">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`mr-4 border-b-2 pb-2.5 font-mono text-[11px] tracking-[.06em] transition-all ${
                activeTab === tab.id
                  ? "border-[#1a1814] text-[#1a1814]"
                  : "border-transparent text-[#9a9690] hover:text-[#5a5650]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Quick Start */}
        {activeTab === "examples" && results.length === 0 && (
          <div>
            {/* Serenity Info Card */}
            <div className="mb-7 rounded-lg border border-[#b8cedd] bg-[#e8eef5] p-4">
              <div className="mb-2.5 font-mono text-[10px] tracking-[.1em] text-[#1a3a5c] uppercase">
                Serenity 核心供应链
              </div>
              <div className="mb-2.5 font-mono text-[11px] leading-[2] text-[#1a3a5c]">
                超大规模资本 (GOOGL/MSFT/META/AMZN)
                <span className="text-[#9a9690]"> → </span>ASIC/TPU
                <span className="text-[#9a9690]"> → </span>光学转发器
                (LITE/AAOI/COHR)
                <span className="text-[#9a9690]"> → </span>CW/DFB激光 (SIVE)
                <span className="text-[#9a9690]"> → </span>InP外延 (IQE)
                <span className="text-[#9a9690]"> → </span>
                <strong>InP基板 (AXTI)</strong> ← 瓶颈
                <span className="text-[#9a9690]"> → </span>铟原料 (Vital)
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "数据来源", value: "5,582 tweets" },
                  { label: "30天方向准确率", value: "~61%" },
                  { label: "成熟供应链论点", value: "~75-85%" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded border border-[#b8cedd] bg-white px-2.5 py-2"
                  >
                    <div className="font-mono text-[9px] tracking-[.06em] text-[#9a9690] uppercase">
                      {s.label}
                    </div>
                    <div className="font-mono text-[13px] font-medium text-[#1a3a5c]">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Examples */}
            <div className="mb-2 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              快速分析示例
            </div>
            <div className="mb-8 grid grid-cols-3 gap-2.5">
              {QUICK_EXAMPLES.map((ex) => (
                <button
                  key={ex.query}
                  type="button"
                  onClick={() => handleQuickRun(ex.query, ex.skill)}
                  className="group rounded-lg border border-[#e0dbd2] bg-[#faf9f6] p-3.5 text-left transition-all hover:border-[#ccc8be] hover:bg-[#f4f2ee]"
                >
                  <div className="mb-1.5 font-mono text-[9px] tracking-[.1em] text-[#9a9690] uppercase">
                    {SKILLS.find((s) => s.id === ex.skill)?.name} ·{" "}
                    {SKILLS.find((s) => s.id === ex.skill)?.sub}
                  </div>
                  <div className="font-serif text-[13px] text-[#1a1814]">
                    {ex.text}
                  </div>
                  <span className="mt-1 block text-[11px] text-[#9a9690] opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Supply Chain */}
        {activeTab === "chain" && (
          <SupplyChainMap
            onTickerClick={(t) => {
              setTicker(t);
              setActiveTab("examples");
            }}
          />
        )}

        {/* Tab: Conviction Matrix */}
        {activeTab === "matrix" && (
          <ConvictionMatrix
            onTickerClick={(t) => {
              setTicker(t);
              setActiveTab("examples");
            }}
          />
        )}

        {/* Tab: Calibration */}
        {activeTab === "calibration" && <CalibrationChart />}

        {/* Results */}
        {results.map((result, idx) => {
          const skill = SKILLS.find((s) => s.id === result.skillId);
          if (!skill) return null;

          return (
            <div key={`${result.skillId}-${result.timestamp}`} className="mb-8">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-[.05em]"
                  style={{
                    backgroundColor:
                      skill.id === "serenity" ? "#e8eef5" : "#f4f2ee",
                    color: skill.color,
                  }}
                >
                  {skill.name}
                </span>
                <span className="font-serif text-[13px] text-[#5a5650]">
                  {result.query}
                </span>
                <span className="ml-auto font-mono text-[10px] text-[#9a9690]">
                  {result.timestamp} · {year}Y
                </span>
              </div>

              {result.status === "loading" && !result.content && (
                <div className="space-y-2.5 py-4">
                  {[100, 90, 95, 80].map((w, i) => (
                    <div
                      key={i}
                      className="h-3.5 animate-pulse rounded"
                      style={{
                        width: `${w}%`,
                        background: `linear-gradient(90deg, #edeae3 25%, #f4f2ee 50%, #edeae3 75%)`,
                        backgroundSize: "200% 100%",
                      }}
                    />
                  ))}
                </div>
              )}

              {result.error && (
                <div className="rounded bg-[#fdf0f0] p-3 font-mono text-xs text-[#9b2c2c]">
                  {result.error}
                </div>
              )}

              {result.content && (
                <StreamingContent
                  html={formatContent(result.content)}
                  className={`mt-4 border-l-2 py-1 pl-5 font-serif text-sm leading-[1.9] text-[#1a1814] [&_code]:rounded [&_code]:bg-[#edeae3] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[#0a5c5c] [&_em]:font-mono [&_em]:text-sm [&_em]:text-[#7a4f00] [&_em]:not-italic [&_p]:mb-3 [&_strong]:font-medium ${
                    result.skillId === "serenity"
                      ? "border-[#b8cedd]"
                      : "border-[#ccc8be]"
                  }`}
                />
              )}

              {result.status === "done" && result.skillId === "serenity" && (
                <div className="mt-3 rounded border-l-[3px] border-[#7a4f00] bg-[#fdf5e8] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-[#7a4f00]">
                  ⚠️
                  这是框架分析，不是投资建议。论点有时效性，请自行确认当前价格和基本面。DYOR。
                </div>
              )}

              {idx < results.length - 1 && (
                <div className="my-8 h-px bg-[#e0dbd2]" />
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};
