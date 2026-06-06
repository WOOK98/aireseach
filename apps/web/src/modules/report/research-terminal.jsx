/* eslint-disable i18next/no-literal-string, jsx-a11y/no-static-element-interactions */
import { useState, useRef, useEffect, memo } from "react";

const SERENITY_SYS = `You are an analytical assistant applying Serenity (@aleabitoreddit)'s distilled framework — 5,582 tweets + 4 long-form articles (2025-07 to 2026-05).

CORE: Don't buy the obvious shovel seller (NVDA). Trace the supply chain as far upstream as possible. Find the single point of failure a hyperscaler will pay anything to keep flowing.

Chain: hyperscaler capex (GOOGL/MSFT/META/AMZN) → ASICs/TPUs → optical transceivers (LITE/AAOI/COHR) → CW/DFB laser (SIVE) → InP epiwafer (IQE) → InP substrate (AXTI) → indium feedstock

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

Respond in English. Structure: 1.Supply chain position 2.Chokepoint test 3.Serenity's known stance 4.Bull/bear case 5.Uncertainty disclaimer
Bold chokepoints/tickers with **. End with: "⚠️ Framework analysis only, not investment advice. Theses decay — always confirm current prices and fundamentals. DYOR."`;

const SKILLS = {
  serenity: {
    name: "Serenity",
    sub: "Supply chain",
    c: "#1a3a5c",
    bg: "#e8eef5",
    br: "#b8cedd",
    sys: SERENITY_SYS,
  },
  fundamental: {
    name: "Fundamental",
    sub: "Fundamentals",
    c: "#1a5c3a",
    bg: "#edf7f2",
    br: "#9dcfb8",
    sys: `You are a rigorous fundamental analyst. Analyze: revenue/earnings quality and trends, balance sheet strength, valuation multiples vs peers (P/E, EV/EBITDA, P/S), moat analysis, management and capital allocation. Respond in English. Use specific numbers. Bold key metrics. 220-300 words. Structure: summary → financials → valuation → moat → verdict. End: "⚠️ For informational purposes only, not investment advice."`,
  },
  macro: {
    name: "Macro",
    sub: "Macro",
    c: "#7a4f00",
    bg: "#fdf5e8",
    br: "#e8c87a",
    sys: `You are a macro analyst. Analyze: interest rate sensitivity, dollar/FX effects, sector rotation and capital flows, geopolitical risk (tariffs, export controls), inflation regime. Respond in English. 200-280 words. Structure: macro backdrop → rate sensitivity → sector rotation → geopolitical → positioning. End: "⚠️ Macro forecasts carry inherent uncertainty."`,
  },
  technical: {
    name: "Technical",
    sub: "Technicals",
    c: "#4a1e8a",
    bg: "#f2eefb",
    br: "#c8b3f0",
    sys: `You are a technical analyst. Note: Serenity says "TA alone is snake oil — use as complement." Analyze: trend structure, key support/resistance, momentum (RSI/MACD), volume signals, chart patterns. Respond in English. 180-250 words. End: "⚠️ Technical analysis should complement, not replace, fundamental research."`,
  },
  sentiment: {
    name: "Sentiment",
    sub: "Sentiment",
    c: "#0a5c5c",
    bg: "#e8f5f5",
    br: "#80cbc4",
    sys: `You are a sentiment analyst. Key: Serenity says "IGNORE Reddit/X sentiment — usually wrong." Focus on: institutional vs retail divergence, options signals (put/call, IV skew), analyst revision trend, dark-pool patterns, insider BUYING (not selling). Respond in English. 200-280 words. End: "⚠️ Sentiment data lags — use as supplementary signal only."`,
  },
  risk: {
    name: "Risk",
    sub: "Risk",
    c: "#9b2c2c",
    bg: "#fdf0f0",
    br: "#f5b8b8",
    sys: `You are a risk analyst. Disqualifiers: large ATM+SBC dilution, single-customer concentration, China export binary risk, no qualification path, OpenAI counterparty. Analyze: business risks, financial risks (leverage/dilution), market risks (microcap vol, thin float), tail risks. Rate each LOW/MEDIUM/HIGH. Respond in English. 200-280 words. End: "⚠️ High-volatility micro/small-caps can move 20%+ in a day. Size positions according to conviction. Not investment advice."`,
  },
};

const SafeHTML = memo(({ html }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html || "";
  }, [html]);
  return (
    <div
      ref={ref}
      style={{
        fontSize: 13.5,
        lineHeight: 1.85,
        color: "var(--color-text-primary)",
      }}
    />
  );
});

function fmt(text) {
  return (text || "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\*([^*\n]+)\*/g,
      "<span style='color:#7a4f00;font-family:monospace;font-size:12px'>$1</span>",
    )
    .replace(
      /`(.+?)`/g,
      "<code style='font-family:monospace;font-size:12px;background:#edeae3;padding:1px 5px;border-radius:2px;color:#0a5c5c'>$1</code>",
    )
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 10px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function Skeleton() {
  return (
    <div>
      {[100, 88, 95, 78].map((w, i) => (
        <div
          key={i}
          style={{
            height: 13,
            width: w + "%",
            borderRadius: 3,
            background: "#edeae3",
            marginBottom: 10,
          }}
        />
      ))}
    </div>
  );
}

const DONUT_SECTORS = [
  { label: "Photonics/CPO", pct: 35, color: "#1a3a5c" },
  { label: "AI Compute/Semi", pct: 18, color: "#4a1e8a" },
  { label: "Neocloud", pct: 18, color: "#1a5c3a" },
  { label: "Memory/HBM", pct: 12, color: "#0a5c5c" },
  { label: "Power/Grid", pct: 10, color: "#7a4f00" },
  { label: "Other", pct: 7, color: "#9a9690" },
];

function DonutChart() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 130, 130);
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
    ctx.beginPath();
    ctx.arc(65, 65, 30, 0, Math.PI * 2);
    ctx.fillStyle = "#faf9f6";
    ctx.fill();
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <canvas ref={ref} width={130} height={130} style={{ flexShrink: 0 }} />
      <div>
        {DONUT_SECTORS.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#5a5650",
              }}
            >
              {s.label} {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccBars() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 150);
    return () => clearTimeout(t);
  }, []);
  const bars = [
    { label: "30-day directional accuracy", pct: 61, color: "#1a3a5c" },
    { label: "Strict 30-day ±10% hit rate", pct: 41, color: "#4a1e8a" },
    { label: "60-day 20%+ favorable close", pct: 54, color: "#0a5c5c" },
    { label: "Mature SC thesis validation rate", pct: 80, color: "#1a5c3a" },
    { label: "CPO/photonics/InP subset", pct: 83, color: "#1a5c3a" },
  ];
  return (
    <div>
      {bars.map((b) => (
        <div key={b.label} style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#5a5650",
              }}
            >
              {b.label}
            </span>
            <span
              style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 500 }}
            >
              {b.pct}%
            </span>
          </div>
          <div
            style={{
              height: 7,
              background: "#edeae3",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 4,
                background: b.color,
                width: loaded ? b.pct + "%" : "0%",
                transition: "width 1s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const MATRIX = {
  "Photonics / CPO": [
    {
      t: "SIVE",
      tier: "S",
      dir: "bull",
      desc: "CW/DFB laser · #1",
      q: "$SIVE CPO laser bottleneck analysis",
    },
    {
      t: "AXTI",
      tier: "S",
      dir: "bull",
      desc: "InP substrate · 40% share",
      q: "$AXTI InP substrate supply chain analysis",
    },
    {
      t: "AAOI",
      tier: "A",
      dir: "bull",
      desc: "US 1.6T transceivers",
      q: "$AAOI US-made transceiver analysis",
    },
    {
      t: "LITE",
      tier: "A",
      dir: "bull",
      desc: "OCS near-monopoly",
      q: "$LITE Lumentum OCS analysis",
    },
    {
      t: "COHR",
      tier: "B",
      dir: "bull",
      desc: "Diversified photonics",
      q: "$COHR Coherent analysis",
    },
    {
      t: "IQE",
      tier: "B",
      dir: "bull",
      desc: "Epiwafer foundry",
      q: "$IQE epiwafer foundry analysis",
    },
    {
      t: "POET",
      tier: "D",
      dir: "bear",
      desc: "MRVL terminated ⚠️",
      q: "$POET MRVL termination risk analysis",
    },
  ],
  Neocloud: [
    {
      t: "NBIS",
      tier: "S",
      dir: "bull",
      desc: "NVDA-backed · 71% GM",
      q: "$NBIS Nebius S-tier analysis",
    },
    {
      t: "CIFR",
      tier: "B",
      dir: "bull",
      desc: "GOOGL contract backstop",
      q: "$CIFR neocloud analysis",
    },
    {
      t: "WULF",
      tier: "B",
      dir: "bull",
      desc: "Nuclear + hydro",
      q: "$WULF TeraWulf analysis",
    },
    {
      t: "IREN",
      tier: "D",
      dir: "bear",
      desc: "$6B ATM ⚠️ flipped bear",
      q: "$IREN ATM dilution risk analysis",
    },
    {
      t: "CRWV",
      tier: "F",
      dir: "bear",
      desc: "F-tier · Avoid",
      q: "$CRWV F-tier risk analysis",
    },
  ],
  "AI Compute / Other": [
    {
      t: "TSM",
      tier: "A",
      dir: "bull",
      desc: "Safest compounder",
      q: "$TSM TSMC analysis",
    },
    {
      t: "SNDK",
      tier: "A",
      dir: "bull",
      desc: "Pure NAND compounder",
      q: "$SNDK NAND memory analysis",
    },
    {
      t: "EWY",
      tier: "A",
      dir: "bull",
      desc: "2028 LEAPS IV mispricing",
      q: "$EWY Korea ETF LEAPS analysis",
    },
    {
      t: "XLU",
      tier: "A",
      dir: "bull",
      desc: "AI power LEAPS",
      q: "$XLU AI power demand analysis",
    },
    {
      t: "PLTR",
      tier: "D",
      dir: "bear",
      desc: "Profit=interest · Short",
      q: "$PLTR Palantir profit quality analysis",
    },
    {
      t: "ORCL",
      tier: "D",
      dir: "bear",
      desc: "OpenAI contagion · Avoid",
      q: "$ORCL Oracle risk analysis",
    },
  ],
};

const CALLS = [
  {
    date: "25-07-21",
    t: "ALAB",
    desc: 'Long ~$96, "$50B+ moonshot" call',
    r: "+154%",
    w: true,
  },
  {
    date: "25-09-25",
    t: "CIFR",
    desc: '"17% dip is a good entry" call',
    r: "+250%",
    w: true,
  },
  {
    date: "25-12-21",
    t: "CRCL",
    desc: '"1000%+ thesis" entry ~$70',
    r: "+148%",
    w: true,
  },
  {
    date: "25-12-26",
    t: "AXTI",
    desc: "Flagship chokepoint thesis (5.7M views)",
    r: "+310%",
    w: true,
  },
  {
    date: "26-03-14",
    t: "SIVE",
    desc: "#1 conviction, ~$140M MC at entry",
    r: "→$2.6B",
    w: true,
  },
  {
    date: "26-05-26",
    t: "EWY",
    desc: "2028 LEAPS at 32% IV",
    r: "+300%+",
    w: true,
  },
  {
    date: "25-09-26",
    t: "IREN",
    desc: "Long $40.13, later flipped bear",
    r: "⚠️ Flipped",
    w: false,
  },
];

const preview = (text) => {
  if (!text) return "";
  const plain = text.replace(/\*\*?|`/g, "").replace(/\n/g, " ");
  return plain.length > 90 ? plain.slice(0, 90) + "…" : plain;
};

// ── Parallel result card with tab-style detail view ──────────────────────────
function ParallelResult({ r }) {
  const completedSkill = r.skills.find((s) => r.cells[s]?.text);
  const [activeTab, setActiveTab] = useState(
    () => completedSkill || r.skills[0],
  );
  const mono = { fontFamily: "monospace" };

  // update default tab when first result arrives
  useEffect(() => {
    if (!r.cells[activeTab]?.text) {
      const first = r.skills.find((s) => r.cells[s]?.text);
      if (first) setActiveTab(first);
    }
  }, [r.cells, activeTab, r.skills]);

  return (
    <div>
      <div
        style={{
          ...mono,
          fontSize: 9,
          letterSpacing: ".08em",
          color: "#9a9690",
          marginBottom: 8,
        }}
      >
        PARALLEL · {r.skills.length} SKILLS · {r.ts} · {r.year}Y
      </div>
      <div style={{ fontSize: 17, fontWeight: 300, marginBottom: 14 }}>
        {r.query}
      </div>

      {/* Skill summary cards row */}
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      >
        {r.skills.map((s) => {
          const cell = r.cells[s];
          const done = !!cell?.text;
          const err = !!cell?.error;
          const isActive = activeTab === s;
          return (
            <div
              key={s}
              onClick={() => done && setActiveTab(s)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "10px 14px",
                borderRadius: 8,
                cursor: done ? "pointer" : "default",
                border: `1.5px solid ${isActive ? SKILLS[s].br : done ? "#e0dbd2" : "#edeae3"}`,
                background: isActive
                  ? SKILLS[s].bg
                  : done
                    ? "#faf9f6"
                    : "#f7f5f2",
                minWidth: 140,
                flex: 1,
                maxWidth: 220,
                transition: "all .15s",
                opacity: done ? 1 : 0.65,
              }}
              onMouseEnter={(e) => {
                if (done && !isActive)
                  e.currentTarget.style.borderColor = SKILLS[s].br;
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.borderColor = done
                    ? "#e0dbd2"
                    : "#edeae3";
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: SKILLS[s].c,
                    }}
                  />
                  <span
                    style={{
                      ...mono,
                      fontSize: 11,
                      fontWeight: 500,
                      color: SKILLS[s].c,
                      letterSpacing: ".04em",
                    }}
                  >
                    {SKILLS[s].name}
                  </span>
                </div>
                {/* Status badge */}
                {done && !isActive && (
                  <span style={{ ...mono, fontSize: 9, color: "#9a9690" }}>
                    Click to view
                  </span>
                )}
                {isActive && (
                  <span
                    style={{
                      ...mono,
                      fontSize: 9,
                      color: SKILLS[s].c,
                      background: SKILLS[s].bg,
                      padding: "1px 6px",
                      borderRadius: 10,
                      border: `1px solid ${SKILLS[s].br}`,
                    }}
                  >
                    Active
                  </span>
                )}
                {!done && !err && (
                  <span style={{ ...mono, fontSize: 9, color: "#9a9690" }}>
                    Generating…
                  </span>
                )}
                {err && (
                  <span style={{ ...mono, fontSize: 9, color: "#9b2c2c" }}>
                    Error
                  </span>
                )}
              </div>
              {/* Preview text */}
              <div
                style={{
                  fontSize: 11,
                  color: "#9a9690",
                  lineHeight: 1.5,
                  ...mono,
                }}
              >
                {done ? preview(cell.text) : err ? cell.error : "▸ ▸ ▸"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {r.cells[activeTab] && (
        <div
          style={{
            border: `1px solid ${SKILLS[activeTab].br}`,
            borderRadius: 8,
            overflow: "hidden",
            animation: "fadeUp .2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: SKILLS[activeTab].bg,
              borderBottom: `1px solid ${SKILLS[activeTab].br}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: SKILLS[activeTab].c,
                }}
              />
              <span
                style={{
                  ...mono,
                  fontSize: 11,
                  fontWeight: 500,
                  color: SKILLS[activeTab].c,
                  letterSpacing: ".05em",
                }}
              >
                {SKILLS[activeTab].name.toUpperCase()} · {SKILLS[activeTab].sub}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {r.skills.map((s) => (
                <button
                  key={s}
                  onClick={() => r.cells[s]?.text && setActiveTab(s)}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "none",
                    background:
                      s === activeTab
                        ? SKILLS[s].c
                        : r.cells[s]?.text
                          ? "#ccc8be"
                          : "#edeae3",
                    cursor: r.cells[s]?.text ? "pointer" : "default",
                    padding: 0,
                  }}
                  title={SKILLS[s].name}
                />
              ))}
            </div>
          </div>
          <div style={{ padding: "18px 20px" }}>
            {r.cells[activeTab].error ? (
              <p style={{ color: "#9b2c2c", fontSize: 13 }}>
                Error: {r.cells[activeTab].error}
              </p>
            ) : (
              <SafeHTML html={fmt(r.cells[activeTab].text)} />
            )}
          </div>
        </div>
      )}
      {!r.cells[activeTab] && (
        <div
          style={{
            border: "1px solid #edeae3",
            borderRadius: 8,
            padding: "20px",
          }}
        >
          <Skeleton />
        </div>
      )}
      <div style={{ height: 1, background: "#e0dbd2", margin: "24px 0" }} />
    </div>
  );
}

const callAPI = async (sys, msg) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: sys,
      messages: [{ role: "user", content: msg }],
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.content[0].text;
};

const mcStyle = (dir) =>
  dir === "bear"
    ? { bg: "#fdf0f0", bd: "#f5b8b8", c: "#9b2c2c" }
    : { bg: "#edf7f2", bd: "#9dcfb8", c: "#1a5c3a" };

export default function App() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(3);
  const [parMode, setParMode] = useState(false);
  const [active, setActive] = useState("serenity");
  const [parSet, setParSet] = useState(new Set());
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [heroTab, setHeroTab] = useState("start");
  const [showHero, setShowHero] = useState(true);
  const inputRef = useRef(null);

  const toggleSkill = (k) => {
    if (parMode) {
      setParSet((prev) => {
        const n = new Set(prev);
        if (n.has(k)) {
          n.delete(k);
        } else {
          n.add(k);
        }
        return n;
      });
    } else {
      setActive(k);
    }
  };

  const run = async () => {
    const q = query.trim();
    if (!q || running) return;
    const skills = parMode ? Array.from(parSet) : [active];
    if (!skills.length) {
      alert("Please select a skill first");
      return;
    }
    setRunning(true);
    setShowHero(false);
    const id = Date.now();
    const ts = new Date().toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const prompt = `Research target: ${q} (Lookback: ${year} year${year > 1 ? "s" : ""})`;
    if (!parMode) {
      setResults((r) => [
        {
          id,
          type: "single",
          skill: active,
          query: q,
          ts,
          year,
          text: null,
          error: null,
        },
        ...r,
      ]);
      try {
        const text = await callAPI(SKILLS[active].sys, prompt);
        setResults((r) => r.map((x) => (x.id === id ? { ...x, text } : x)));
      } catch (e) {
        setResults((r) =>
          r.map((x) => (x.id === id ? { ...x, error: e.message } : x)),
        );
      }
    } else {
      setResults((r) => [
        { id, type: "parallel", skills, query: q, ts, year, cells: {} },
        ...r,
      ]);
      await Promise.all(
        skills.map(async (s) => {
          try {
            const text = await callAPI(SKILLS[s].sys, prompt);
            setResults((r) =>
              r.map((x) =>
                x.id === id
                  ? { ...x, cells: { ...x.cells, [s]: { text } } }
                  : x,
              ),
            );
          } catch (e) {
            setResults((r) =>
              r.map((x) =>
                x.id === id
                  ? { ...x, cells: { ...x.cells, [s]: { error: e.message } } }
                  : x,
              ),
            );
          }
        }),
      );
    }
    setRunning(false);
  };

  const fill = (q, sk) => {
    setQuery(q);
    if (sk && !parMode) setActive(sk);
    setShowHero(false);
    inputRef.current?.focus();
  };

  const tagStyle = (s) => ({
    fontFamily: "monospace",
    fontSize: 10,
    padding: "2px 8px",
    borderRadius: 20,
    background: SKILLS[s].bg,
    border: `1px solid ${SKILLS[s].br}`,
    color: SKILLS[s].c,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  });

  const mono = { fontFamily: "monospace" };

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        background: "#faf9f6",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 48,
          borderBottom: "1px solid #e0dbd2",
          background: "#faf9f6",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              background: "#1a1814",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...mono,
              fontSize: 9,
              color: "#faf9f6",
              fontWeight: 500,
            }}
          >
            RT
          </div>
          <span style={{ fontSize: 15, fontWeight: 500 }}>
            Research Terminal
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span
            style={{
              ...mono,
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: "#e8eef5",
              color: "#1a3a5c",
              border: "1px solid #b8cedd",
            }}
          >
            Serenity Skill v2
          </span>
          <span
            style={{
              ...mono,
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 20,
              background: parMode ? "#edf7f2" : "#f4f2ee",
              color: parMode ? "#1a5c3a" : "#5a5650",
              border: `1px solid ${parMode ? "#9dcfb8" : "#ccc8be"}`,
            }}
          >
            {parMode ? "Parallel" : "Single skill"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* SIDEBAR */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            borderRight: "1px solid #e0dbd2",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            overflowY: "auto",
            position: "sticky",
            top: 48,
            maxHeight: "calc(100vh - 48px)",
          }}
        >
          <div>
            <div
              style={{
                ...mono,
                fontSize: 9,
                letterSpacing: ".1em",
                color: "#9a9690",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Research target
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Ticker / sector / question"
              style={{
                fontSize: 18,
                fontWeight: 300,
                background: "transparent",
                border: "none",
                borderBottom: "1.5px solid #ccc8be",
                outline: "none",
                padding: "4px 0",
                width: "100%",
                color: "#1a1814",
              }}
            />
          </div>
          <div>
            <div
              style={{
                ...mono,
                fontSize: 9,
                letterSpacing: ".1em",
                color: "#9a9690",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Lookback window
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5,1fr)",
                gap: 4,
              }}
            >
              {[1, 2, 3, 5, 10].map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  style={{
                    height: 28,
                    border: `1px solid ${year === y ? "#1a1814" : "#ccc8be"}`,
                    borderRadius: 3,
                    background: year === y ? "#1a1814" : "transparent",
                    color: year === y ? "#faf9f6" : "#5a5650",
                    ...mono,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div
              style={{
                ...mono,
                fontSize: 9,
                letterSpacing: ".1em",
                color: "#9a9690",
                textTransform: "uppercase",
                marginBottom: 7,
              }}
            >
              Analysis lens · Skill
            </div>
            {Object.entries(SKILLS).map(([k, v]) => {
              const isActive = !parMode && active === k;
              const isChecked = parMode && parSet.has(k);
              return (
                <div
                  key={k}
                  onClick={() => toggleSkill(k)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    marginBottom: 2,
                    border: `1px solid ${isActive ? "#ccc8be" : isChecked ? "#9dcfb8" : "transparent"}`,
                    background: isActive
                      ? "#f4f2ee"
                      : isChecked
                        ? "#edf7f2"
                        : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: v.c,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, flex: 1 }}>{v.name}</span>
                  <span style={{ ...mono, fontSize: 9, color: v.c }}>
                    {v.sub}
                  </span>
                  {parMode && (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: `1px solid ${isChecked ? "#1a5c3a" : "#ccc8be"}`,
                        borderRadius: 2,
                        background: isChecked ? "#1a5c3a" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {isChecked ? "✓" : ""}
                    </div>
                  )}
                </div>
              );
            })}
            <div
              onClick={() => {
                setParMode((p) => !p);
                setParSet(new Set());
                setActive("serenity");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 6,
                border: `1px solid ${parMode ? "#9dcfb8" : "#e0dbd2"}`,
                background: parMode ? "#edf7f2" : "#f4f2ee",
                cursor: "pointer",
                marginTop: 7,
              }}
            >
              <span
                style={{ fontSize: 12, color: parMode ? "#1a5c3a" : "#5a5650" }}
              >
                Multi-skill parallel
              </span>
              <div
                style={{
                  width: 30,
                  height: 16,
                  background: parMode ? "#1a5c3a" : "#ccc8be",
                  borderRadius: 8,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 10,
                    height: 10,
                    background: "white",
                    borderRadius: "50%",
                    top: 3,
                    left: parMode ? 17 : 3,
                    transition: "left .2s",
                  }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={run}
            disabled={running}
            style={{
              height: 40,
              background: running ? "transparent" : "#1a1814",
              color: running ? "#1a1814" : "white",
              border: running ? "1.5px solid #1a1814" : "none",
              borderRadius: 4,
              ...mono,
              fontSize: 11,
              letterSpacing: ".08em",
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running ? "Analyzing…" : "Run analysis"}
          </button>
          <div>
            <div
              style={{
                ...mono,
                fontSize: 9,
                letterSpacing: ".1em",
                color: "#9a9690",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Recent
            </div>
            {[
              "$SIVE CPO laser chokepoint analysis",
              "$AXTI InP substrate supply chain",
              "$NBIS neocloud financing quality",
              "$AAOI US-made transceiver deep-dive",
            ].map((q) => (
              <div
                key={q}
                onClick={() => fill(q)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "4px 5px",
                  borderRadius: 3,
                  cursor: "pointer",
                  fontSize: 11,
                  color: "#5a5650",
                  ...mono,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f4f2ee")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#9a9690",
                    flexShrink: 0,
                  }}
                />
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <main style={{ flex: 1, padding: "28px 36px", overflowY: "auto" }}>
          {showHero && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 300, marginBottom: 6 }}>
                Supply Chain Bottleneck Analysis · AI · Semiconductors ·
                Photonics
              </h1>
              <p
                style={{
                  ...mono,
                  fontSize: 11,
                  color: "#9a9690",
                  marginBottom: query ? 12 : 18,
                }}
              >
                Serenity (@aleabitoreddit) framework · 5,582 tweets · For
                decision-support only, not investment advice
              </p>

              {/* Query ready banner */}
              {query && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: "#f4f2ee",
                    border: "1px solid #e0dbd2",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#1a5c3a",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: "#1a1814" }}>
                      Target: <strong>{query}</strong>
                    </span>
                    <span style={{ ...mono, fontSize: 10, color: "#9a9690" }}>
                      · Charts below show Serenity's fixed framework, not
                      target-specific
                    </span>
                  </div>
                  <button
                    onClick={run}
                    disabled={running}
                    style={{
                      height: 30,
                      padding: "0 16px",
                      background: "#1a1814",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      ...mono,
                      fontSize: 11,
                      cursor: "pointer",
                      letterSpacing: ".06em",
                      flexShrink: 0,
                    }}
                  >
                    {running ? "Analyzing…" : "Run analysis →"}
                  </button>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #e0dbd2",
                  marginBottom: 20,
                  alignItems: "center",
                }}
              >
                {[
                  ["start", "Quick start", false],
                  ["chain", "Supply chain", true],
                  ["matrix", "Conviction matrix", true],
                  ["stats", "Track record", false],
                ].map(([k, l, isStatic]) => (
                  <div
                    key={k}
                    onClick={() => setHeroTab(k)}
                    style={{
                      ...mono,
                      fontSize: 10,
                      letterSpacing: ".06em",
                      padding: "6px 14px 7px",
                      cursor: "pointer",
                      borderBottom: `2px solid ${heroTab === k ? "#1a1814" : "transparent"}`,
                      color: heroTab === k ? "#1a1814" : "#9a9690",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {l}
                    {isStatic && (
                      <span
                        style={{
                          fontSize: 8,
                          background: "#f4f2ee",
                          color: "#9a9690",
                          padding: "1px 4px",
                          borderRadius: 3,
                          border: "1px solid #e0dbd2",
                        }}
                      >
                        static
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {heroTab === "start" && (
                <div>
                  <div
                    style={{
                      border: "1px solid #b8cedd",
                      borderRadius: 8,
                      padding: "14px 16px",
                      background: "#e8eef5",
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        ...mono,
                        fontSize: 9,
                        letterSpacing: ".1em",
                        color: "#1a3a5c",
                        textTransform: "uppercase",
                        marginBottom: 7,
                      }}
                    >
                      Core supply chain
                    </div>
                    <div
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: "#1a3a5c",
                        lineHeight: 2.2,
                      }}
                    >
                      Hyperscaler capex → ASIC/TPU → Optical transceivers
                      (LITE/AAOI/COHR) → CW/DFB laser <strong>(SIVE)</strong> →
                      InP epiwafer (IQE) →{" "}
                      <strong style={{ color: "#9b2c2c" }}>
                        InP substrate (AXTI) ← ⚡ Chokepoint
                      </strong>{" "}
                      → Indium feedstock
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        ["5,582 tweets", "Data source"],
                        ["~61%", "30-day accuracy"],
                        ["~75-85%", "Mature SC theses"],
                      ].map(([v, l]) => (
                        <div
                          key={l}
                          style={{
                            background: "white",
                            borderRadius: 4,
                            padding: "6px 10px",
                            border: "1px solid #b8cedd",
                          }}
                        >
                          <div
                            style={{
                              ...mono,
                              fontSize: 9,
                              color: "#9a9690",
                              marginBottom: 2,
                            }}
                          >
                            {l}
                          </div>
                          <div
                            style={{
                              ...mono,
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#1a3a5c",
                            }}
                          >
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: 9,
                    }}
                  >
                    {[
                      [
                        "$SIVE CPO laser chokepoint deep-dive",
                        "serenity",
                        "Serenity · #1 conviction",
                      ],
                      [
                        "$AXTI Strait of AXTI InP substrate",
                        "serenity",
                        "Serenity · flagship chokepoint",
                      ],
                      [
                        "$NBIS neocloud financing quality",
                        "serenity",
                        "Serenity · financing spectrum",
                      ],
                      [
                        "$AAOI US-made transceiver fundamentals",
                        "fundamental",
                        "Fundamental",
                      ],
                      [
                        "AI photonics CPO macro capital rotation",
                        "macro",
                        "Macro",
                      ],
                      [
                        "$IREN $CRWV ATM dilution risk matrix",
                        "risk",
                        "Risk · ATM dilution",
                      ],
                    ].map(([q, sk, lbl]) => (
                      <div
                        key={q}
                        onClick={() => fill(q, sk)}
                        style={{
                          border: "1px solid #e0dbd2",
                          borderRadius: 6,
                          padding: "12px 13px",
                          cursor: "pointer",
                          background: "#faf9f6",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f4f2ee")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#faf9f6")
                        }
                      >
                        <div
                          style={{
                            ...mono,
                            fontSize: 9,
                            color: "#9a9690",
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                            marginBottom: 5,
                          }}
                        >
                          {lbl}
                        </div>
                        <div style={{ fontSize: 12, color: "#1a1814" }}>
                          {q}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9a9690",
                            marginTop: 4,
                          }}
                        >
                          →
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {heroTab === "chain" && (
                <div>
                  {/* Dynamic generation banner when query is set */}
                  {query && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 6,
                        background: "#fdf5e8",
                        border: "1px solid #e8c87a",
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ ...mono, fontSize: 11, color: "#7a4f00" }}>
                        ⚠️ Chart below shows Serenity's fixed AI/semi universe,
                        not "{query}"'s supply chain
                      </span>
                      <button
                        onClick={() => {
                          fill(
                            `${query} supply chain bottleneck analysis`,
                            "serenity",
                          );
                          void run();
                        }}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          background: "#7a4f00",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          ...mono,
                          fontSize: 10,
                          cursor: "pointer",
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        Analyze {query} supply chain →
                      </button>
                    </div>
                  )}
                  <div
                    style={{
                      border: "1px solid #e0dbd2",
                      borderRadius: 8,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          ...mono,
                          fontSize: 9,
                          letterSpacing: ".1em",
                          color: "#9a9690",
                          textTransform: "uppercase",
                        }}
                      >
                        Serenity's investment universe · AI photonics supply
                        chain · Fixed reference
                      </div>
                      <span
                        style={{
                          ...mono,
                          fontSize: 9,
                          color: "#9a9690",
                          background: "#f4f2ee",
                          padding: "2px 7px",
                          borderRadius: 3,
                          border: "1px solid #e0dbd2",
                        }}
                      >
                        Not target-specific
                      </span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <svg
                        viewBox="0 0 860 270"
                        style={{ minWidth: 760, height: 270 }}
                      >
                        <defs>
                          <marker
                            id="a2"
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
                        {[
                          ["Hyperscaler", 60],
                          ["ASIC/TPU", 206],
                          ["Optical Transceivers", 348],
                          ["CW/DFB Laser", 494],
                          ["InP Epi", 606],
                          ["⚡ Bottleneck", 716],
                          ["Indium Feedstock", 814],
                        ].map(([l, x]) => (
                          <text
                            key={l}
                            x={x}
                            y={13}
                            textAnchor="middle"
                            style={{
                              fontFamily: "monospace",
                              fontSize: 9,
                              fill: l.includes("⚡") ? "#9b2c2c" : "#9a9690",
                              fontWeight: l.includes("⚡") ? "600" : "400",
                            }}
                          >
                            {l}
                          </text>
                        ))}
                        {[
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
                        ].map(([x1, y1, x2, y2], i) => (
                          <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#ccc8be"
                            strokeWidth="1"
                            markerEnd="url(#a2)"
                          />
                        ))}
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
                        {[
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
                            q: "GOOGL MSFT META AMZN AI compute investment",
                          },
                          {
                            x: 147,
                            y: 30,
                            w: 118,
                            h: 52,
                            fi: "#e8eef5",
                            st: "#b8cedd",
                            lines: ["NVDA·TSM", "MRVL·AVGO"],
                            sub: "$T TAM",
                            c: "#1a3a5c",
                            q: "NVDA TSM MRVL AVGO AI chip analysis",
                          },
                          {
                            x: 287,
                            y: 24,
                            w: 82,
                            h: 32,
                            fi: "#edf7f2",
                            st: "#9dcfb8",
                            lines: ["LITE"],
                            sub: "OCS near-monopoly",
                            c: "#1a5c3a",
                            q: "$LITE OCS transceiver analysis",
                          },
                          {
                            x: 287,
                            y: 60,
                            w: 82,
                            h: 32,
                            fi: "#edf7f2",
                            st: "#9dcfb8",
                            lines: ["AAOI"],
                            sub: "US-made",
                            c: "#1a5c3a",
                            q: "$AAOI US-made transceiver analysis",
                          },
                          {
                            x: 287,
                            y: 96,
                            w: 82,
                            h: 32,
                            fi: "#edf7f2",
                            st: "#9dcfb8",
                            lines: ["COHR"],
                            sub: "Diversified",
                            c: "#1a5c3a",
                            q: "$COHR Coherent photonics analysis",
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
                            q: "$SIVE CPO laser bottleneck analysis",
                          },
                          {
                            x: 556,
                            y: 42,
                            w: 92,
                            h: 46,
                            fi: "#edf7f2",
                            st: "#9dcfb8",
                            lines: ["IQE"],
                            sub: "Epiwafer foundry",
                            c: "#1a5c3a",
                            q: "$IQE epiwafer foundry analysis",
                          },
                          {
                            x: 674,
                            y: 30,
                            w: 94,
                            h: 70,
                            fi: "#fdf0f0",
                            st: "#f5b8b8",
                            lines: ["AXTI"],
                            sub: "InP substrate 40%",
                            c: "#9b2c2c",
                            q: "$AXTI Strait of AXTI InP substrate chokepoint",
                          },
                          {
                            x: 794,
                            y: 42,
                            w: 60,
                            h: 46,
                            fi: "#f2eefb",
                            st: "#c8b3f0",
                            lines: ["Vital"],
                            sub: "Indium feedstock",
                            c: "#4a1e8a",
                            q: "Indium feedstock Vital Materials analysis",
                          },
                        ].map((n, i) => {
                          const cx = n.x + n.w / 2,
                            my = n.y + n.h / 2;
                          return (
                            <g
                              key={i}
                              style={{ cursor: "pointer" }}
                              onClick={() => fill(n.q)}
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
                        <line
                          x1="10"
                          y1="160"
                          x2="850"
                          y2="160"
                          stroke="#e0dbd2"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                          markerEnd="url(#a2)"
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
                          Capital flow →
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
                          Pricing power here
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
                          NEOCLOUD LAYER
                        </text>
                        {[
                          {
                            x: 10,
                            t: "NBIS",
                            sub: "S-tier · NVDA",
                            fi: "#edf7f2",
                            st: "#9dcfb8",
                            c: "#1a5c3a",
                            q: "$NBIS Nebius S-tier neocloud analysis",
                          },
                          {
                            x: 130,
                            t: "CIFR",
                            sub: "GOOGL backstop",
                            fi: "#edf7f2",
                            st: "#9dcfb8",
                            c: "#1a5c3a",
                            q: "$CIFR neocloud analysis",
                          },
                          {
                            x: 250,
                            t: "IREN",
                            sub: "51% ATM ⚠️",
                            fi: "#fdf0f0",
                            st: "#f5b8b8",
                            c: "#9b2c2c",
                            q: "$IREN ATM dilution risk analysis",
                          },
                          {
                            x: 370,
                            t: "CRWV",
                            sub: "F-tier · Avoid",
                            fi: "#fdf0f0",
                            st: "#f5b8b8",
                            c: "#9b2c2c",
                            q: "$CRWV F-tier risk analysis",
                          },
                        ].map((n, i) => (
                          <g
                            key={i}
                            style={{ cursor: "pointer" }}
                            onClick={() => fill(n.q)}
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

              {heroTab === "matrix" && (
                <div>
                  {query && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 6,
                        background: "#fdf5e8",
                        border: "1px solid #e8c87a",
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ ...mono, fontSize: 11, color: "#7a4f00" }}>
                        ⚠️ This is Serenity's fixed conviction universe, not "
                        {query}"-specific
                      </span>
                      <button
                        onClick={() => {
                          fill(
                            `${query} supply chain related tickers analysis`,
                            "serenity",
                          );
                          void run();
                        }}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          background: "#7a4f00",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          ...mono,
                          fontSize: 10,
                          cursor: "pointer",
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        Find {query} related tickers →
                      </button>
                    </div>
                  )}
                  <p
                    style={{
                      ...mono,
                      fontSize: 10,
                      color: "#9a9690",
                      marginBottom: 14,
                    }}
                  >
                    Serenity's conviction universe · As of May 2026 · Click
                    ticker to fill input · Not target-specific
                  </p>
                  {Object.entries(MATRIX).map(([sec, tickers]) => (
                    <div key={sec} style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          ...mono,
                          fontSize: 9,
                          letterSpacing: ".1em",
                          color: "#9a9690",
                          textTransform: "uppercase",
                          borderBottom: "1px solid #e0dbd2",
                          paddingBottom: 5,
                          marginBottom: 9,
                        }}
                      >
                        {sec}
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                      >
                        {tickers.map((t) => {
                          const s = mcStyle(t.dir);
                          return (
                            <div
                              key={t.t}
                              onClick={() => fill(t.q)}
                              style={{
                                background: s.bg,
                                border: `1px solid ${s.bd}`,
                                color: s.c,
                                borderRadius: 5,
                                padding: "7px 10px",
                                cursor: "pointer",
                                minWidth: 70,
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.transform =
                                  "translateY(-1px)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.transform = "none")
                              }
                            >
                              <div
                                style={{
                                  ...mono,
                                  fontSize: 9,
                                  marginBottom: 2,
                                }}
                              >
                                {t.tier}
                              </div>
                              <div
                                style={{
                                  ...mono,
                                  fontSize: 13,
                                  fontWeight: 500,
                                  marginBottom: 2,
                                }}
                              >
                                {t.t}
                              </div>
                              <div style={{ fontSize: 10, lineHeight: 1.3 }}>
                                {t.desc}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {heroTab === "stats" && (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #e0dbd2",
                        borderRadius: 8,
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          ...mono,
                          fontSize: 9,
                          letterSpacing: ".1em",
                          color: "#9a9690",
                          textTransform: "uppercase",
                          marginBottom: 12,
                        }}
                      >
                        Prediction accuracy calibration
                      </div>
                      <AccBars />
                    </div>
                    <div
                      style={{
                        border: "1px solid #e0dbd2",
                        borderRadius: 8,
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          ...mono,
                          fontSize: 9,
                          letterSpacing: ".1em",
                          color: "#9a9690",
                          textTransform: "uppercase",
                          marginBottom: 12,
                        }}
                      >
                        Sector coverage
                      </div>
                      <DonutChart />
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #e0dbd2",
                      borderRadius: 8,
                      padding: "14px 16px",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        ...mono,
                        fontSize: 9,
                        letterSpacing: ".1em",
                        color: "#9a9690",
                        textTransform: "uppercase",
                        marginBottom: 9,
                      }}
                    >
                      Representative calls
                    </div>
                    {CALLS.map((c) => (
                      <div
                        key={c.t + c.date}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "56px 46px 1fr 58px",
                          gap: 10,
                          alignItems: "center",
                          padding: "5px 0",
                          borderBottom: "1px solid #f0ece5",
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{ ...mono, fontSize: 10, color: "#9a9690" }}
                        >
                          {c.date}
                        </span>
                        <span
                          style={{ ...mono, fontSize: 11, fontWeight: 500 }}
                        >
                          {c.t}
                        </span>
                        <span style={{ color: "#5a5650", lineHeight: 1.4 }}>
                          {c.desc}
                        </span>
                        <span
                          style={{
                            ...mono,
                            fontSize: 11,
                            textAlign: "right",
                            color: c.w ? "#1a5c3a" : "#9b2c2c",
                          }}
                        >
                          {c.r}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      padding: "9px 13px",
                      background: "#fdf5e8",
                      borderRadius: 6,
                      borderLeft: "3px solid #e8c87a",
                      ...mono,
                      fontSize: 11,
                      color: "#7a4f00",
                      lineHeight: 1.7,
                    }}
                  >
                    ⚠️ All return data is self-reported, unverified by third
                    parties. 61% accuracy from 49 recorded public predictions.
                    Mature supply chain theses (75-85%) ≠ replicable trading
                    returns.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESULTS */}
          {results.map((r) => (
            <div key={r.id}>
              {r.type === "single" ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={tagStyle(r.skill)}>
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: SKILLS[r.skill].c,
                        }}
                      />
                      {SKILLS[r.skill].name}
                    </span>
                    <span style={{ fontSize: 13, color: "#5a5650" }}>
                      {r.query}
                    </span>
                    <span
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: "#9a9690",
                        marginLeft: "auto",
                      }}
                    >
                      {r.ts} · {r.year}Y
                    </span>
                  </div>
                  <div
                    style={{
                      paddingLeft: 16,
                      borderLeft: `2px solid ${r.skill === "serenity" ? "#b8cedd" : "#ccc8be"}`,
                      marginTop: 12,
                    }}
                  >
                    {r.text ? (
                      <SafeHTML html={fmt(r.text)} />
                    ) : r.error ? (
                      <p style={{ color: "#9b2c2c", fontSize: 13 }}>
                        Error: {r.error}
                      </p>
                    ) : (
                      <Skeleton />
                    )}
                  </div>
                  <div
                    style={{
                      height: 1,
                      background: "#e0dbd2",
                      margin: "24px 0",
                    }}
                  />
                </div>
              ) : (
                <ParallelResult key={r.id} r={r} />
              )}
            </div>
          ))}
        </main>
      </div>

      {/* FOOTER */}
      <div
        style={{
          borderTop: "1px solid #e0dbd2",
          padding: "7px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#faf9f6",
        }}
      >
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(parMode ? Array.from(parSet) : [active]).map((s) => (
            <span key={s} style={tagStyle(s)}>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: SKILLS[s].c,
                }}
              />
              {SKILLS[s].name}
            </span>
          ))}
        </div>
        <span style={{ ...mono, fontSize: 10, color: "#9a9690" }}>
          Claude Sonnet 4 ·{" "}
          {parMode
            ? `Parallel ${parSet.size} skills`
            : `${SKILLS[active]?.name}`}{" "}
          · {year}Y
        </span>
      </div>
    </div>
  );
}
