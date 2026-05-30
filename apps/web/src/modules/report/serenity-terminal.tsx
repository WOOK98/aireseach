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
import {
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
  memo,
} from "react";

import { Input } from "@workspace/ui-web/input";

import type { FormEvent } from "react";

// ─── Types ───────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  sub: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  borderColor: string;
  prompt: string;
}

interface AnalysisResult {
  id: number;
  type: "single" | "parallel";
  skillId?: string;
  skills?: string[];
  query: string;
  content: string;
  cells?: Record<string, { text?: string; error?: string }>;
  status: "loading" | "done" | "error";
  error?: string;
  timestamp: string;
  year: number;
}

interface QuickExample {
  skill: string;
  text: string;
  query: string;
  label: string;
}

interface MatrixTicker {
  t: string;
  tier: string;
  dir: "bull" | "bear";
  desc: string;
  q: string;
}

interface CallRecord {
  date: string;
  t: string;
  desc: string;
  r: string;
  w: boolean;
}

interface ChainNode {
  x: number;
  y: number;
  w: number;
  h: number;
  fi: string;
  st: string;
  lines: string[];
  sub: string;
  c: string;
  q: string;
}

interface NeocloudNode {
  x: number;
  t: string;
  sub: string;
  fi: string;
  st: string;
  c: string;
  q: string;
}

// ─── Skills (merged SERENITY_SYS + current SKILLS structure) ─────

const SKILLS: Skill[] = [
  {
    id: "serenity",
    name: "Serenity",
    sub: "供应链",
    icon: GitBranch,
    color: "#1a3a5c",
    bgColor: "#e8eef5",
    borderColor: "#b8cedd",
    prompt: `You are an analytical assistant applying the distilled thinking framework of Serenity (@aleabitoreddit) — an AI/semiconductor supply-chain analyst with ~450K followers, built from 5,582 tweets (2025-07 to 2026-05) and 4 long-form articles.

CORE PRINCIPLE: Don't buy the obvious "shovel seller" (NVDA). Trace the supply chain as far upstream as possible and find the single point of failure a hyperscaler will pay anything to keep flowing.

Supply chain: hyperscaler capex → ASICs/TPUs → optical transceivers → CW/DFB laser (SIVE) → InP epiwafer (IQE) → InP substrate (AXTI) → indium feedstock

14 PRINCIPLES:
1. Bottleneck hunting: sole/near-sole-source chokepoint. Small BOM% = buyers pay through price hikes not redesign.
2. Multi-hop BOM/OSINT: chain conference slides, SEC filings, LinkedIn, partner pages. Ayar removed LITE/MTSI leaving only SIVE (Apr 2026) before any press release.
3. Signed-contract ARR vs market-cap mismatch: price on forward contracted ARR not trailing multiples.
4. Mag7 customer filter: positive moat signal. Single-customer = risk (POET lost MRVL).
5. GAAP-margin war: never cherry-picked non-GAAP. NBIS 71.2% GAAP GM is real.
6. Qualification cycle: enter during design wins, not after volume shows in revenue.
7. ATM/dilution disqualifier: IREN $6B ATM at $11.7B MC. SIVE 2.5% listing dilution = positive.
8. Financing quality spectrum: NBIS > CIFR/WULF > IREN > CRWV.
9. Short squeeze (profitable-grower only): 35%+ SI on profitable growing company.
10. Tariff/macro-shock-as-buy: algo risk-off on multi-year committed capex = entry.
11. Institutional lag: retail discovers chokepoints 4-6 weeks before institutions.
12. Vega/IV mispricing: EWY 2028 leaps at 32% IV vs 50%+ Samsung/SK Hynix.
13. Conviction tiering: S/A/B/C/D/F. Size to conviction AND binary risk.
14. Anti-patterns: standalone TA, conflating supply chain layers, insider sales as bear signal, Reddit/X sentiment.

KEY STANCES (May 2026 — theses decay, confirm prices):
HIGHEST CONVICTION LONGS: SIVE (#1, CW/DFB laser, ~$2.6B MC, Jabil 1.6T, MRVL Celestial, Ayar Labs), AXTI (InP substrate, ~40% global, China ban = monopoly, +310%), AAOI (only US vertically integrated transceiver, $4.35B ARR target), NBIS (S-tier neocloud, 71.2% GAAP GM, NVDA+convertibles, $17B MSFT), LITE (OCS monopoly, structural long), COHR (safer compounder), IQE (high-risk binary bull), EWY (2028 LEAPS IV mispricing), TSM (safest compounder), SNDK (NAND compounder).
BEARISH: IREN (flipped bear, $6B ATM, 51% dilution), CRWV (F-tier, heavy debt, OpenAI counterparty), ORCL (Avoid, OpenAI contagion), PLTR (Short, profit = mostly interest income), POET (downgraded, MRVL terminated Apr 27), OKLO/QBTS/IONQ (Strong Sell, pre-revenue quantum), SNAP (flipped bear, SBC masking negative FCF).

CALIBRATION: ~61% 30-day directional accuracy. ~75-85% for mature supply-chain theses. Returns self-reported, unverified, survivorship bias.

Respond in Chinese. Structure: 供应链位置 → 瓶颈测试 → Serenity已知立场 → 牛熊论点 → 不确定性声明. End with disclaimer.`,
  },
  {
    id: "fundamental",
    name: "Fundamental",
    sub: "基本面",
    icon: BarChart3,
    color: "#1a5c3a",
    bgColor: "#edf7f2",
    borderColor: "#9dcfb8",
    prompt: `You are a rigorous fundamental analyst. Analyze: revenue/earnings quality and trends, balance sheet strength, valuation multiples vs peers (P/E, EV/EBITDA, P/S), moat analysis, management quality and capital allocation. Respond in Chinese. Use specific numbers. Bold key metrics. Structure: summary → financials → valuation → moat → verdict. End with disclaimer.`,
  },
  {
    id: "macro",
    name: "Macro",
    sub: "宏观",
    icon: Globe,
    color: "#7a4f00",
    bgColor: "#fdf5e8",
    borderColor: "#e8c87a",
    prompt: `You are a macro analyst. Analyze: interest rate sensitivity and Fed policy impact, dollar/FX effects, sector rotation and capital flow dynamics, geopolitical risk exposure (tariffs, export controls), inflation/deflation regime impact. Respond in Chinese. Structure: macro backdrop → rate sensitivity → sector rotation → geopolitical overlay → positioning implication. End with disclaimer.`,
  },
  {
    id: "technical",
    name: "Technical",
    sub: "技术面",
    icon: TrendingUp,
    color: "#4a1e8a",
    bgColor: "#f2eefb",
    borderColor: "#c8b3f0",
    prompt: `You are a technical analyst. Serenity's view: "TA is snake oil without fundamentals" — so frame technical as a COMPLEMENT to fundamental. Analyze: trend structure, key support/resistance levels, momentum (RSI, MACD), volume signals, chart patterns. Respond in Chinese. Structure: trend → key levels → momentum → volume → setup trigger. End with disclaimer.`,
  },
  {
    id: "sentiment",
    name: "Sentiment",
    sub: "市场情绪",
    icon: MessageSquare,
    color: "#0a5c5c",
    bgColor: "#e8f5f5",
    borderColor: "#80cbc4",
    prompt: `You are a market sentiment analyst. Key principle: "IGNORE Reddit/X sentiment — usually wrong." Focus on: institutional vs retail positioning divergence, options market signals, analyst consensus and revision trends, dark-pool/block-trade patterns, insider activity. Respond in Chinese. Structure: retail sentiment → institutional flow → options positioning → analyst lag → contrarian opportunity. End with disclaimer.`,
  },
  {
    id: "risk",
    name: "Risk",
    sub: "风险矩阵",
    icon: Shield,
    color: "#9b2c2c",
    bgColor: "#fdf0f0",
    borderColor: "#f5b8b8",
    prompt: `You are a risk analyst. Key disqualifiers: large active ATM + SBC dilution, single-customer concentration, China export-control binary risk, pre-revenue with no qualification path. Analyze: business model risks, financial/dilution risks, market risks, tail risks, risk-adjusted sizing. Rate each: LOW/MEDIUM/HIGH. Respond in Chinese. Structure: business risks → financial risks → market risks → tail risks → sizing implication. End with disclaimer.`,
  },
];

// ─── Data Constants ──────────────────────────────────────────────

const YEARS = [1, 2, 3, 5, 10];

const QUICK_EXAMPLES: QuickExample[] = [
  {
    skill: "serenity",
    text: "$SIVE CPO激光供应链",
    query: "$SIVE Sivers Semiconductors CPO激光瓶颈深度分析",
    label: "Serenity · #1 conviction",
  },
  {
    skill: "serenity",
    text: "$AXTI InP基板控制",
    query: "$AXTI Strait of AXTI InP基板分析",
    label: "Serenity · 旗舰瓶颈",
  },
  {
    skill: "serenity",
    text: "$NBIS Neocloud质量",
    query: "$NBIS Neocloud融资质量对比分析",
    label: "Serenity · 融资质量谱",
  },
  {
    skill: "fundamental",
    text: "$AAOI 基本面深度",
    query: "$AAOI 美国制造转录器基本面分析",
    label: "Fundamental",
  },
  {
    skill: "macro",
    text: "CPO板块资本轮动",
    query: "AI光子学CPO板块宏观叙事和资本轮动",
    label: "Macro",
  },
  {
    skill: "risk",
    text: "Neocloud稀释风险",
    query: "$IREN $CRWV ATM稀释风险矩阵对比",
    label: "Risk · ATM稀释",
  },
];

const RECENT = [
  "$SIVE CPO激光瓶颈分析",
  "$AXTI InP基板供应链",
  "$NBIS Neocloud融资质量",
  "$AAOI 美国制造转录器",
];

// ─── Conviction Matrix ───────────────────────────────────────────

const MATRIX: Record<string, MatrixTicker[]> = {
  "光子学 / CPO": [
    {
      t: "SIVE",
      tier: "S",
      dir: "bull",
      desc: "CW/DFB激光 · #1",
      q: "$SIVE CPO激光瓶颈分析",
    },
    {
      t: "AXTI",
      tier: "S",
      dir: "bull",
      desc: "InP基板 · 40%份额",
      q: "$AXTI InP基板供应链分析",
    },
    {
      t: "AAOI",
      tier: "A",
      dir: "bull",
      desc: "美国1.6T转录器",
      q: "$AAOI 美国制造转录器分析",
    },
    {
      t: "LITE",
      tier: "A",
      dir: "bull",
      desc: "OCS近垄断",
      q: "$LITE Lumentum OCS分析",
    },
    {
      t: "COHR",
      tier: "B",
      dir: "bull",
      desc: "多元化光子学",
      q: "$COHR Coherent分析",
    },
    {
      t: "IQE",
      tier: "B",
      dir: "bull",
      desc: "外延代工",
      q: "$IQE 外延晶圆代工分析",
    },
    {
      t: "POET",
      tier: "D",
      dir: "bear",
      desc: "MRVL终止 ⚠️",
      q: "$POET MRVL终止风险分析",
    },
  ],
  Neocloud: [
    {
      t: "NBIS",
      tier: "S",
      dir: "bull",
      desc: "NVDA融资 · 71% GM",
      q: "$NBIS Nebius S-tier分析",
    },
    {
      t: "CIFR",
      tier: "B",
      dir: "bull",
      desc: "GOOGL合同背书",
      q: "$CIFR neocloud分析",
    },
    {
      t: "WULF",
      tier: "B",
      dir: "bull",
      desc: "核能+水电",
      q: "$WULF TeraWulf分析",
    },
    {
      t: "IREN",
      tier: "D",
      dir: "bear",
      desc: "$6B ATM ⚠️ 翻空",
      q: "$IREN ATM稀释风险分析",
    },
    {
      t: "CRWV",
      tier: "F",
      dir: "bear",
      desc: "F-tier · Avoid",
      q: "$CRWV F-tier风险分析",
    },
  ],
  "AI算力 / 其他": [
    {
      t: "TSM",
      tier: "A",
      dir: "bull",
      desc: "最安全复利",
      q: "$TSM 台积电分析",
    },
    {
      t: "SNDK",
      tier: "A",
      dir: "bull",
      desc: "纯NAND复利",
      q: "$SNDK NAND内存分析",
    },
    {
      t: "EWY",
      tier: "A",
      dir: "bull",
      desc: "2028 LEAPS IV错价",
      q: "$EWY 韩国ETF LEAPS分析",
    },
    {
      t: "XLU",
      tier: "A",
      dir: "bull",
      desc: "AI电力LEAPS",
      q: "$XLU AI电力需求分析",
    },
    {
      t: "PLTR",
      tier: "D",
      dir: "bear",
      desc: "利润=利息 · Short",
      q: "$PLTR Palantir利润质量分析",
    },
    {
      t: "ORCL",
      tier: "D",
      dir: "bear",
      desc: "OpenAI传染 · Avoid",
      q: "$ORCL Oracle风险分析",
    },
  ],
};

// ─── Calibration Data ────────────────────────────────────────────

const ACCURACY_METRICS = [
  { label: "30天方向准确率", pct: 61, color: "#1a3a5c" },
  { label: "严格30天 ±10% 命中率", pct: 41, color: "#4a1e8a" },
  { label: "60天内20%+ 回报率", pct: 54, color: "#0a5c5c" },
  { label: "成熟供应链论点验证率", pct: 80, color: "#1a5c3a" },
  { label: "CPO/光子/InP 子集", pct: 83, color: "#1a5c3a" },
];

const DONUT_SECTORS = [
  { label: "光子学/CPO", pct: 35, color: "#1a3a5c" },
  { label: "AI算力/半导体", pct: 18, color: "#4a1e8a" },
  { label: "Neocloud", pct: 18, color: "#1a5c3a" },
  { label: "内存/HBM", pct: 12, color: "#0a5c5c" },
  { label: "电力/电网", pct: 10, color: "#7a4f00" },
  { label: "其他", pct: 7, color: "#9a9690" },
];

const CALLS: CallRecord[] = [
  {
    date: "25-07-21",
    t: "ALAB",
    desc: "Long ~$96，「$50B+ moonshot」",
    r: "+154%",
    w: true,
  },
  {
    date: "25-09-25",
    t: "CIFR",
    desc: "「下跌17%是好买点」",
    r: "+250%",
    w: true,
  },
  {
    date: "25-12-21",
    t: "CRCL",
    desc: "「1000%+论点」~$70入场",
    r: "+148%",
    w: true,
  },
  {
    date: "25-12-26",
    t: "AXTI",
    desc: "旗舰瓶颈发布 (570万浏览)",
    r: "+310%",
    w: true,
  },
  {
    date: "26-03-14",
    t: "SIVE",
    desc: "#1 conviction，~$140M MC",
    r: "→$2.6B",
    w: true,
  },
  {
    date: "26-05-26",
    t: "EWY",
    desc: "2028 LEAPS 32% IV",
    r: "+300%+",
    w: true,
  },
  {
    date: "25-09-26",
    t: "IREN",
    desc: "Long $40.13，后翻空",
    r: "⚠️ 翻空",
    w: false,
  },
];

// ─── SVG Supply Chain Nodes ──────────────────────────────────────

const CHAIN_NODES: ChainNode[] = [
  {
    x: 10,
    y: 30,
    w: 110,
    h: 52,
    fi: "#e8eef5",
    st: "#b8cedd",
    lines: ["GOOGL·MSFT", "META·AMZN"],
    sub: "$10T+ capex",
    c: "#1a3a5c",
    q: "GOOGL MSFT META AMZN AI算力投资",
  },
  {
    x: 147,
    y: 30,
    w: 118,
    h: 52,
    fi: "#e8eef5",
    st: "#b8cedd",
    lines: ["NVDA·TSM", "MRVL·AVGO"],
    sub: "数万亿 TAM",
    c: "#1a3a5c",
    q: "NVDA TSM MRVL AVGO AI芯片分析",
  },
  {
    x: 287,
    y: 24,
    w: 82,
    h: 32,
    fi: "#edf7f2",
    st: "#9dcfb8",
    lines: ["LITE"],
    sub: "OCS近垄断",
    c: "#1a5c3a",
    q: "$LITE OCS光学转发器分析",
  },
  {
    x: 287,
    y: 60,
    w: 82,
    h: 32,
    fi: "#edf7f2",
    st: "#9dcfb8",
    lines: ["AAOI"],
    sub: "美国制造",
    c: "#1a5c3a",
    q: "$AAOI 美国制造转录器分析",
  },
  {
    x: 287,
    y: 96,
    w: 82,
    h: 32,
    fi: "#edf7f2",
    st: "#9dcfb8",
    lines: ["COHR"],
    sub: "多元化",
    c: "#1a5c3a",
    q: "$COHR Coherent光子学分析",
  },
  {
    x: 422,
    y: 42,
    w: 100,
    h: 46,
    fi: "#edf7f2",
    st: "#1a5c3a",
    lines: ["SIVE"],
    sub: "~$2.6B · #1",
    c: "#1a5c3a",
    q: "$SIVE CPO激光瓶颈分析",
  },
  {
    x: 556,
    y: 42,
    w: 92,
    h: 46,
    fi: "#edf7f2",
    st: "#9dcfb8",
    lines: ["IQE"],
    sub: "外延晶圆代工",
    c: "#1a5c3a",
    q: "$IQE 外延晶圆代工分析",
  },
  {
    x: 674,
    y: 30,
    w: 94,
    h: 70,
    fi: "#fdf0f0",
    st: "#f5b8b8",
    lines: ["AXTI"],
    sub: "InP基板 40%",
    c: "#9b2c2c",
    q: "$AXTI Strait of AXTI InP基板瓶颈分析",
  },
  {
    x: 794,
    y: 42,
    w: 60,
    h: 46,
    fi: "#f2eefb",
    st: "#c8b3f0",
    lines: ["Vital"],
    sub: "铟原料",
    c: "#4a1e8a",
    q: "铟原料 Vital Materials 分析",
  },
];

const NEOCLOUD_NODES: NeocloudNode[] = [
  {
    x: 10,
    t: "NBIS",
    sub: "S-tier · NVDA",
    fi: "#edf7f2",
    st: "#9dcfb8",
    c: "#1a5c3a",
    q: "$NBIS Nebius S-tier neocloud分析",
  },
  {
    x: 130,
    t: "CIFR",
    sub: "GOOGL背书",
    fi: "#edf7f2",
    st: "#9dcfb8",
    c: "#1a5c3a",
    q: "$CIFR neocloud分析",
  },
  {
    x: 250,
    t: "IREN",
    sub: "51% ATM ⚠️",
    fi: "#fdf0f0",
    st: "#f5b8b8",
    c: "#9b2c2c",
    q: "$IREN ATM稀释风险分析",
  },
  {
    x: 370,
    t: "CRWV",
    sub: "F-tier · Avoid",
    fi: "#fdf0f0",
    st: "#f5b8b8",
    c: "#9b2c2c",
    q: "$CRWV F-tier风险分析",
  },
];

type SubTab = "examples" | "chain" | "matrix" | "calibration";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "examples", label: "快速开始" },
  { id: "chain", label: "供应链图谱" },
  { id: "matrix", label: "持仓矩阵" },
  { id: "calibration", label: "胜率数据" },
];

// ─── Helpers ─────────────────────────────────────────────────────

function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

function formatContent(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .split(/\n\n+/)
    .map((p) => (p.trim() ? `<p>${p.replace(/\n/g, "<br>")}</p>` : ""))
    .join("");
}

function mcStyle(dir: "bull" | "bear") {
  return dir === "bear"
    ? { bg: "#fdf0f0", bd: "#f5b8b8", c: "#9b2c2c" }
    : { bg: "#edf7f2", bd: "#9dcfb8", c: "#1a5c3a" };
}

// ─── Streaming Content Renderer (useLayoutEffect) ────────────────

function StreamingContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);

  return <div ref={ref} className={className} />;
}

// ─── SafeHTML (memo + useLayoutEffect) ───────────────────────────

const SafeHTML = memo(function SafeHTML({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html || "";
    }
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ fontSize: 13.5, lineHeight: 1.85, color: "#1a1814" }}
    />
  );
});

// ─── Skeleton Loader ─────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2.5 py-4">
      {[100, 88, 95, 78].map((w, i) => (
        <div
          key={i}
          className="h-3.5 animate-pulse rounded"
          style={{
            width: `${w}%`,
            background:
              "linear-gradient(90deg, #edeae3 25%, #f4f2ee 50%, #edeae3 75%)",
            backgroundSize: "200% 100%",
          }}
        />
      ))}
    </div>
  );
}

// ─── AccBars (Accuracy Bars with animation) ──────────────────────

function AccBars() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      {ACCURACY_METRICS.map((b) => (
        <div key={b.label} className="mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#5a5650]">
              {b.label}
            </span>
            <span className="font-mono text-xs font-medium">{b.pct}%</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded bg-[#edeae3]">
            <div
              className="h-full rounded transition-all duration-1000 ease-out"
              style={{
                background: b.color,
                width: loaded ? `${b.pct}%` : "0%",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DonutChart (Sector Coverage) ────────────────────────────────

function DonutChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 130;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    let angle = -Math.PI / 2;
    DONUT_SECTORS.forEach((s) => {
      const sweep = (s.pct / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(65, 65);
      ctx.arc(65, 65, 52, angle, angle + sweep);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      angle += sweep;
    });

    // Center hole
    ctx.beginPath();
    ctx.arc(65, 65, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#faf9f6";
    ctx.fill();
  }, []);

  return (
    <div className="flex items-center gap-4">
      <canvas ref={canvasRef} className="shrink-0" />
      <div>
        {DONUT_SECTORS.map((s) => (
          <div key={s.label} className="mb-1.5 flex items-center gap-1.5">
            <div
              className="h-[9px] w-[9px] shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-mono text-[10px] text-[#5a5650]">
              {s.label} {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────

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
  const resultIdRef = useRef(0);

  // ─── Skill toggle (single vs parallel) ───────────────────────

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

  // ─── Single analysis via backend streaming ───────────────────

  const runSingle = useCallback(
    async (query: string, skillId: string, resultId: number) => {
      if (!apiKey) return;

      const skill = getSkillById(skillId);
      if (!skill) return;

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
            const idx = next.findIndex((r) => r.id === resultId);
            if (idx >= 0)
              next[idx] = { ...next[idx], content } as AnalysisResult;
            return next;
          });
        }

        setResults((prev) => {
          const next = [...prev];
          const idx = next.findIndex((r) => r.id === resultId);
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
          const idx = next.findIndex((r) => r.id === resultId);
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

  // ─── Submit handler ──────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      if (!ticker.trim() || !apiKey || running) return;

      setRunning(true);
      abortRef.current = [];

      const ts = new Date().toLocaleTimeString("zh", {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (multiMode && checkedSkills.size > 0) {
        // Parallel mode
        const id = ++resultIdRef.current;
        const skills = Array.from(checkedSkills);
        setResults((prev) => [
          {
            id,
            type: "parallel",
            skills,
            query: ticker,
            content: "",
            cells: {},
            status: "loading",
            timestamp: ts,
            year,
          },
          ...prev,
        ]);

        await Promise.all(
          skills.map(async (sid) => {
            const skill = getSkillById(sid);
            if (!skill) return;
            const controller = new AbortController();
            abortRef.current.push(controller);

            try {
              const response = await fetch("/api/report/serenity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ticker: ticker.split(" ")[0],
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
              let text = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                text += decoder.decode(value, { stream: true });
                setResults((prev) => {
                  const next = [...prev];
                  const idx = next.findIndex((r) => r.id === id);
                  if (idx >= 0)
                    next[idx] = {
                      ...next[idx],
                      cells: { ...next[idx]!.cells, [sid]: { text } },
                    } as AnalysisResult;
                  return next;
                });
              }

              setResults((prev) => {
                const next = [...prev];
                const idx = next.findIndex((r) => r.id === id);
                if (idx >= 0)
                  next[idx] = {
                    ...next[idx],
                    cells: { ...next[idx]!.cells, [sid]: { text } },
                  } as AnalysisResult;
                return next;
              });
            } catch (err: unknown) {
              if (err instanceof Error && err.name === "AbortError") return;
              setResults((prev) => {
                const next = [...prev];
                const idx = next.findIndex((r) => r.id === id);
                if (idx >= 0)
                  next[idx] = {
                    ...next[idx],
                    cells: {
                      ...next[idx]!.cells,
                      [sid]: {
                        error:
                          err instanceof Error ? err.message : "Unknown error",
                      },
                    },
                  } as AnalysisResult;
                return next;
              });
            }
          }),
        );

        setResults((prev) => {
          const next = [...prev];
          const idx = next.findIndex((r) => r.id === id);
          if (idx >= 0)
            next[idx] = { ...next[idx], status: "done" } as AnalysisResult;
          return next;
        });
      } else {
        // Single mode
        const id = ++resultIdRef.current;
        setResults((prev) => [
          {
            id,
            type: "single",
            skillId: activeSkill,
            query: ticker,
            content: "",
            status: "loading",
            timestamp: ts,
            year,
          },
          ...prev,
        ]);
        await runSingle(ticker, activeSkill, id);
      }

      setRunning(false);
    },
    [
      ticker,
      apiKey,
      running,
      multiMode,
      checkedSkills,
      activeSkill,
      year,
      baseUrl,
      model,
      runSingle,
    ],
  );

  // ─── Quick run (fill & execute) ──────────────────────────────

  const handleQuickRun = useCallback(
    (query: string, skillId: string) => {
      if (!apiKey) return;
      setTicker(query);
      if (!multiMode) setActiveSkill(skillId);
      // Run directly
      const ts = new Date().toLocaleTimeString("zh", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const id = ++resultIdRef.current;
      setResults((prev) => [
        {
          id,
          type: "single",
          skillId,
          query,
          content: "",
          status: "loading",
          timestamp: ts,
          year,
        },
        ...prev,
      ]);
      void runSingle(query, skillId, id);
    },
    [apiKey, multiMode, year, runSingle],
  );

  // ─── Fill ticker (from matrix/chain) ─────────────────────────

  const fillTicker = useCallback((q: string) => {
    setTicker(q);
  }, []);

  // ─── Stop all ────────────────────────────────────────────────

  const handleStop = () => {
    abortRef.current.forEach((c) => c.abort());
    abortRef.current = [];
    setRunning(false);
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* ── Left Panel ─────────────────────────────────────── */}
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
                  className="absolute top-[3px] h-3 w-3 rounded-full bg-white shadow-sm transition-all"
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

      {/* ── Right Panel ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[#faf9f6] p-10">
        {/* Hero */}
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

        {/* ── Tab: Quick Start ─────────────────────────────── */}
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
                    {ex.label}
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

        {/* ── Tab: Supply Chain (SVG inline) ────────────────── */}
        {activeTab === "chain" && (
          <div>
            <div className="mb-4 rounded-lg border border-[#e0dbd2] bg-[#faf9f6] p-4">
              <div className="mb-3 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                AI 光子学供应链 · 点击节点填入分析框
              </div>
              <div className="overflow-x-auto">
                <svg
                  viewBox="0 0 860 270"
                  style={{ minWidth: 760, height: 270 }}
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path
                        d="M2 1L8 5L2 9"
                        fill="none"
                        stroke="#ccc8be"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </marker>
                  </defs>

                  {/* Layer labels */}
                  {(
                    [
                      ["超大规模", 60],
                      ["ASIC/TPU", 206],
                      ["光学转发器", 348],
                      ["CW/DFB激光", 494],
                      ["InP外延", 606],
                      ["⚡ 瓶颈", 716],
                      ["铟原料", 814],
                    ] as [string, number][]
                  ).map(([l, x]) => (
                    <text
                      key={l}
                      x={x}
                      y={13}
                      textAnchor="middle"
                      style={{
                        fontFamily: "monospace",
                        fontSize: 9,
                        fill: l.includes("⚡") ? "#9b2c2c" : "#9a9690",
                        fontWeight: l.includes("⚡") ? 600 : 400,
                      }}
                    >
                      {l}
                    </text>
                  ))}

                  {/* Arrows between layers */}
                  {(
                    [
                      ["120", "56", "145", "56"],
                      ["265", "56", "285", "40"],
                      ["265", "56", "285", "70"],
                      ["265", "56", "285", "100"],
                      ["370", "40", "420", "62"],
                      ["370", "70", "420", "62"],
                      ["370", "100", "420", "68"],
                      ["524", "65", "554", "65"],
                      ["650", "65", "672", "65"],
                      ["770", "65", "792", "65"],
                    ] as [string, string, string, string][]
                  ).map(([x1, y1, x2, y2], i) => (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#ccc8be"
                      strokeWidth="1"
                      markerEnd="url(#arrowhead)"
                    />
                  ))}

                  {/* Chokepoint highlight */}
                  <rect
                    x="667"
                    y="24"
                    width="104"
                    height="82"
                    rx="7"
                    fill="none"
                    stroke="#9b2c2c"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <text
                    x={721}
                    y={21}
                    textAnchor="middle"
                    style={{
                      fontFamily: "monospace",
                      fontSize: 8,
                      fill: "#9b2c2c",
                      fontWeight: 600,
                    }}
                  >
                    ⚡ CHOKEPOINT
                  </text>

                  {/* Chain nodes */}
                  {CHAIN_NODES.map((n, i) => {
                    const cx = n.x + n.w / 2;
                    const my = n.y + n.h / 2;
                    return (
                      <g
                        key={i}
                        style={{ cursor: "pointer" }}
                        onClick={() => fillTicker(n.q)}
                      >
                        <rect
                          x={n.x}
                          y={n.y}
                          width={n.w}
                          height={n.h}
                          rx={5}
                          fill={n.fi}
                          stroke={n.st}
                          strokeWidth={1}
                        />
                        {n.lines.map((l, j) => (
                          <text
                            key={j}
                            x={cx}
                            y={my + (j - n.lines.length / 2 + 0.5) * 15}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              fontFamily: "monospace",
                              fontSize: n.lines.length > 1 ? 11 : 12,
                              fontWeight: 500,
                              fill: n.c,
                            }}
                          >
                            {l}
                          </text>
                        ))}
                        <text
                          x={cx}
                          y={n.y + n.h - 8}
                          textAnchor="middle"
                          style={{
                            fontFamily: "monospace",
                            fontSize: 9,
                            fill: n.c,
                            opacity: 0.8,
                          }}
                        >
                          {n.sub}
                        </text>
                      </g>
                    );
                  })}

                  {/* Divider */}
                  <line
                    x1="10"
                    y1="160"
                    x2="850"
                    y2="160"
                    stroke="#e0dbd2"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={12}
                    y={172}
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9,
                      fill: "#9a9690",
                    }}
                  >
                    资本流向 →
                  </text>
                  <text
                    x={655}
                    y={172}
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9,
                      fill: "#9b2c2c",
                    }}
                  >
                    定价权在此
                  </text>
                  <text
                    x={10}
                    y={192}
                    style={{
                      fontFamily: "monospace",
                      fontSize: 8,
                      fill: "#9a9690",
                      letterSpacing: ".06em",
                    }}
                  >
                    NEOCLOUD 层
                  </text>

                  {/* Neocloud nodes */}
                  {NEOCLOUD_NODES.map((n, i) => (
                    <g
                      key={i}
                      style={{ cursor: "pointer" }}
                      onClick={() => fillTicker(n.q)}
                    >
                      <rect
                        x={n.x}
                        y={200}
                        width={114}
                        height={42}
                        rx={4}
                        fill={n.fi}
                        stroke={n.st}
                        strokeWidth={1}
                      />
                      <text
                        x={n.x + 57}
                        y={219}
                        textAnchor="middle"
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          fontWeight: 500,
                          fill: n.c,
                        }}
                      >
                        {n.t}
                      </text>
                      <text
                        x={n.x + 57}
                        y={234}
                        textAnchor="middle"
                        style={{
                          fontFamily: "monospace",
                          fontSize: 9,
                          fill: n.c,
                        }}
                      >
                        {n.sub}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Conviction Matrix (inline) ───────────────── */}
        {activeTab === "matrix" && (
          <div>
            <p className="mb-4 font-mono text-[10px] text-[#9a9690]">
              点击标的 → 填入输入框 · 截至 2026年5月 · 论点有时效性
            </p>
            {Object.entries(MATRIX).map(([sec, tickers]) => (
              <div key={sec} className="mb-4">
                <div className="mb-2.5 border-b border-[#e0dbd2] pb-1.5 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                  {sec}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tickers.map((t) => {
                    const s = mcStyle(t.dir);
                    return (
                      <button
                        key={t.t}
                        type="button"
                        onClick={() => fillTicker(t.q)}
                        className="min-w-[70px] cursor-pointer rounded-md border px-2.5 py-2 text-left transition-all hover:-translate-y-px"
                        style={{
                          backgroundColor: s.bg,
                          borderColor: s.bd,
                          color: s.c,
                        }}
                      >
                        <div className="font-mono text-[9px]">{t.tier}</div>
                        <div className="font-mono text-[13px] font-medium">
                          {t.t}
                        </div>
                        <div className="text-[10px] leading-tight">
                          {t.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Calibration (inline) ─────────────────────── */}
        {activeTab === "calibration" && (
          <div>
            {/* Accuracy Bars + Donut Chart */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#e0dbd2] p-4">
                <div className="mb-3 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                  预测准确率校准
                </div>
                <AccBars />
              </div>
              <div className="rounded-lg border border-[#e0dbd2] p-4">
                <div className="mb-3 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                  覆盖板块分布
                </div>
                <DonutChart />
              </div>
            </div>

            {/* Representative Calls */}
            <div className="mb-3 rounded-lg border border-[#e0dbd2] p-4">
              <div className="mb-2.5 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                代表性记录
              </div>
              {CALLS.map((c) => (
                <div
                  key={c.t + c.date}
                  className="grid grid-cols-[56px_46px_1fr_58px] items-center gap-2.5 border-b border-[#f0ece5] py-1.5 text-xs last:border-b-0"
                >
                  <span className="font-mono text-[10px] text-[#9a9690]">
                    {c.date}
                  </span>
                  <span className="font-mono text-[11px] font-medium">
                    {c.t}
                  </span>
                  <span className="leading-snug text-[#5a5650]">{c.desc}</span>
                  <span
                    className={`text-right font-mono text-[11px] ${
                      c.w ? "text-[#1a5c3a]" : "text-[#9b2c2c]"
                    }`}
                  >
                    {c.r}
                  </span>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="rounded-md border-l-[3px] border-[#e8c87a] bg-[#fdf5e8] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-[#7a4f00]">
              ⚠️
              所有回报数据均为自报告，未经第三方核实。61%准确率来自49个有记录的公开预测。成熟供应链论点(75-85%)≠可复制的交易回报。
            </div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────── */}
        {results.map((result, idx) => {
          const separator = idx < results.length - 1;

          if (result.type === "single") {
            const skill = getSkillById(result.skillId!);
            if (!skill) return null;

            const isLoading = result.status === "loading" && !result.content;
            const isError = !!result.error;
            const isDone =
              result.status === "done" && result.skillId === "serenity";

            return (
              <div key={result.id} className="mb-8">
                <div className="mb-1 flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-[.05em]"
                    style={{
                      backgroundColor:
                        skill.id === "serenity" ? "#e8eef5" : "#f4f2ee",
                      border: `1px solid ${skill.borderColor}`,
                      color: skill.color,
                    }}
                  >
                    <div
                      className="h-[5px] w-[5px] rounded-full"
                      style={{ backgroundColor: skill.color }}
                    />
                    {skill.name}
                  </span>
                  <span className="font-serif text-[13px] text-[#5a5650]">
                    {result.query}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-[#9a9690]">
                    {result.timestamp} · {result.year}Y
                  </span>
                </div>

                {isLoading && <Skeleton />}

                {isError && (
                  <div className="rounded bg-[#fdf0f0] p-3 font-mono text-xs text-[#9b2c2c]">
                    {result.error}
                  </div>
                )}

                <StreamingContent
                  html={formatContent(result.content)}
                  className={`mt-4 border-l-2 py-1 pl-5 font-serif text-sm leading-[1.9] text-[#1a1814] [&_code]:rounded [&_code]:bg-[#edeae3] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[#0a5c5c] [&_em]:font-mono [&_em]:text-sm [&_em]:text-[#7a4f00] [&_em]:not-italic [&_p]:mb-3 [&_strong]:font-medium ${
                    result.skillId === "serenity"
                      ? "border-[#b8cedd]"
                      : "border-[#ccc8be]"
                  } ${result.content ? "" : "hidden"}`}
                />

                {isDone && (
                  <div className="mt-3 rounded border-l-[3px] border-[#7a4f00] bg-[#fdf5e8] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-[#7a4f00]">
                    ⚠️
                    这是框架分析，不是投资建议。论点有时效性，请自行确认当前价格和基本面。DYOR。
                  </div>
                )}

                {separator && <div className="my-8 h-px bg-[#e0dbd2]" />}
              </div>
            );
          }

          // Parallel mode result
          const skills = result.skills || [];
          return (
            <div key={result.id} className="mb-8">
              <div className="mb-1.5 font-mono text-[10px] tracking-[.08em] text-[#9a9690]">
                PARALLEL · {skills.length} SKILLS · {result.timestamp} ·{" "}
                {result.year}Y
              </div>
              <div className="mb-3 font-serif text-[17px] font-light">
                {result.query}
              </div>
              <div
                className="grid gap-3.5"
                style={{
                  gridTemplateColumns:
                    skills.length >= 3 ? "1fr 1fr 1fr" : "1fr 1fr",
                }}
              >
                {skills.map((sid) => {
                  const skill = getSkillById(sid);
                  if (!skill) return null;
                  const cell = result.cells?.[sid];
                  const hasError = !!cell?.error;
                  const hasText = !!cell?.text;

                  return (
                    <div
                      key={sid}
                      className="overflow-hidden rounded-lg border border-[#e0dbd2]"
                    >
                      <div className="flex items-center gap-2 border-b border-[#e0dbd2] bg-[#f4f2ee] px-3 py-2">
                        <div
                          className="h-[7px] w-[7px] shrink-0 rounded-full"
                          style={{ backgroundColor: skill.color }}
                        />
                        <span
                          className="font-mono text-[10px] font-medium tracking-[.05em]"
                          style={{ color: skill.color }}
                        >
                          {skill.name.toUpperCase()} · {skill.sub}
                        </span>
                      </div>
                      <div className="p-3">
                        {hasError ? (
                          <p className="text-xs text-[#9b2c2c]">
                            错误：{cell.error}
                          </p>
                        ) : hasText ? (
                          <SafeHTML
                            html={formatContent(cell.text ?? "")}
                            className="font-serif text-[13px] leading-[1.85] text-[#1a1814] [&_code]:rounded [&_code]:bg-[#edeae3] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[#0a5c5c] [&_em]:font-mono [&_em]:text-sm [&_em]:text-[#7a4f00] [&_em]:not-italic [&_p]:mb-3 [&_strong]:font-medium"
                          />
                        ) : (
                          <Skeleton />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {separator && <div className="my-8 h-px bg-[#e0dbd2]" />}
            </div>
          );
        })}
      </main>
    </div>
  );
};
