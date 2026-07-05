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
  Download,
  FileDown,
  Menu,
  X,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

import { Input } from "@workspace/ui-web/input";

import { MarkdownReport } from "~/components/report/MarkdownReport";
import { ParallelReport } from "~/components/report/ParallelReport";
import {
  VisualReport,
  type ReportData,
} from "~/components/report/VisualReport";

import { useUserPlan } from "./use-user-plan";

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
  blocked?: boolean;
  blockMode?: "clarify" | "industry";
  candidates?: ResolutionCandidate[];
  timestamp: string;
  year: number;
}

interface ResolutionCandidate {
  ticker: string;
  companyName: string;
  exchange: string;
  quoteType?: string;
}

interface SerenityErrorPayload {
  message: string;
  resolution?: {
    ok: false;
    mode: "clarify" | "industry";
    message?: string;
    input?: string;
    candidates?: ResolutionCandidate[];
  };
}

interface QuickExample {
  skill: string;
  text: string;
  query: string;
  label: string;
  mode?: "single" | "industry";
}

const HOSTED_KEY_BALANCE_ERROR =
  "Hosted model credits are temporarily unavailable. Recharge the platform key or enter your own compatible API key below, then run the analysis again.";

const extractSerenityError = (text: string) => {
  if (!text.includes("Analysis failed:")) return null;

  if (/insufficient balance|402|quota|billing|credit/i.test(text)) {
    return HOSTED_KEY_BALANCE_ERROR;
  }

  return text.replace(/^.*Analysis failed:\s*/s, "").trim();
};

const readSerenityErrorPayload = async (
  response: Response,
): Promise<SerenityErrorPayload> => {
  const data = await response.json().catch(() => null);
  const fallback = `Serenity analysis error: HTTP ${response.status}`;

  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    const resolution = (data as { resolution?: unknown }).resolution;
    return {
      message: typeof detail === "string" ? detail : fallback,
      resolution:
        resolution &&
        typeof resolution === "object" &&
        "ok" in resolution &&
        (resolution as { ok?: unknown }).ok === false
          ? (resolution as SerenityErrorPayload["resolution"])
          : undefined,
    };
  }

  return { message: fallback };
};

const readSerenityError = async (response: Response) =>
  (await readSerenityErrorPayload(response)).message;

const getSafeReportFilename = (result: AnalysisResult, extension: string) => {
  const safeQuery = result.query
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${safeQuery || "airesearch-report"}-${result.timestamp.replace(/[:\s]/g, "")}.${extension}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderInlineMarkdown = (value: string) => {
  const links: string[] = [];
  const withMarkdownLinks = escapeHtml(value).replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    (_match, label: string, href: string) => {
      const token = `__AIRESEARCH_LINK_${links.length}__`;
      links.push(
        `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`,
      );
      return token;
    },
  );

  return withMarkdownLinks
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/__AIRESEARCH_LINK_(\d+)__/g, (_match, index: string) => {
      return links[Number(index)] ?? "";
    });
};

const renderMarkdownTable = (rows: string[]) => {
  const cells = rows
    .filter((row) => !/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row))
    .map((row) =>
      row
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => renderInlineMarkdown(cell.trim())),
    );

  if (!cells.length) return "";

  const [head, ...body] = cells;
  return `<table><thead><tr>${(head ?? [])
    .map((cell) => `<th>${cell}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
};

const renderPrintableMarkdown = (markdown: string) => {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let table: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    html.push(
      `<ul>${list.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`,
    );
    list = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    html.push(renderMarkdownTable(table));
    table = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        flushTable();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (line.trim().startsWith("|")) {
      flushParagraph();
      flushList();
      table.push(line);
      continue;
    }

    flushTable();

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1]?.length ?? 2, 4);
      html.push(
        `<h${level}>${renderInlineMarkdown(heading[2] ?? "")}</h${level}>`,
      );
      continue;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1] ?? "");
      continue;
    }

    const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();
      list.push(orderedItem[1] ?? "");
      continue;
    }

    if (line.trim().startsWith(">")) {
      flushParagraph();
      flushList();
      html.push(
        `<blockquote>${renderInlineMarkdown(line.replace(/^>\s*/, ""))}</blockquote>`,
      );
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushTable();

  return html.join("\n");
};

const downloadMarkdown = (result: AnalysisResult) => {
  if (!result.content.trim()) return;

  const filename = getSafeReportFilename(result, "md");
  const blob = new Blob([result.content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const printReportPdf = (result: AnalysisResult) => {
  if (!result.content.trim()) return;

  const title = escapeHtml(result.query || "Airesearch Report");
  const filename = getSafeReportFilename(result, "pdf");
  const body = renderPrintableMarkdown(result.content);

  const printableHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title} - Airesearch</title>
    <style>
      @page { size: A4; margin: 18mm 16mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #171717;
        background: #fff;
        font-family: ui-serif, Georgia, "Times New Roman", "Noto Serif SC", serif;
        line-height: 1.58;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page { max-width: 820px; margin: 0 auto; }
      .brand {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        border-bottom: 2px solid #111;
        padding-bottom: 18px;
        margin-bottom: 28px;
      }
      .eyebrow {
        margin: 0 0 8px;
        color: #137a3f;
        font: 700 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      h1.title {
        margin: 0;
        font-size: 34px;
        line-height: 1.08;
        letter-spacing: 0;
      }
      .meta {
        min-width: 150px;
        color: #666;
        text-align: right;
        font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      h1:not(.title), h2, h3, h4 {
        break-after: avoid;
        color: #111;
        line-height: 1.2;
      }
      h1:not(.title) { font-size: 25px; margin: 28px 0 12px; }
      h2 {
        border-top: 1px solid #ddd;
        margin: 26px 0 12px;
        padding-top: 16px;
        font-size: 21px;
      }
      h3 { margin: 18px 0 8px; font-size: 16px; }
      h4 {
        margin: 14px 0 8px;
        color: #444;
        font: 700 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      p { margin: 0 0 10px; font-size: 13.5px; }
      strong { font-weight: 700; }
      code {
        border: 1px solid #e2e2e2;
        border-radius: 4px;
        background: #f7f7f4;
        padding: 1px 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }
      pre {
        break-inside: avoid;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #f7f7f4;
        padding: 12px;
        white-space: pre-wrap;
      }
      ul, ol { margin: 0 0 12px 20px; padding: 0; }
      li { margin: 4px 0; font-size: 13.5px; }
      blockquote {
        margin: 14px 0;
        border-left: 4px solid #4ac66d;
        background: #f1fbf4;
        padding: 10px 14px;
        color: #245334;
        break-inside: avoid;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0 18px;
        font-size: 11.5px;
        break-inside: avoid;
      }
      th {
        background: #f3f5f2;
        color: #333;
        text-align: left;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10.5px;
        letter-spacing: .04em;
      }
      th, td { border: 1px solid #ddd; padding: 7px 8px; vertical-align: top; }
      tr:nth-child(even) td { background: #fbfbfa; }
      a { color: #126a3a; text-decoration: none; overflow-wrap: anywhere; }
      .disclaimer {
        margin-top: 28px;
        border-top: 1px solid #ddd;
        padding-top: 12px;
        color: #777;
        font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      @media print {
        .no-print { display: none; }
        a[href]::after { content: " (" attr(href) ")"; color: #777; font-size: 10px; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="brand">
        <div>
          <p class="eyebrow">Airesearch Deep Dive</p>
          <h1 class="title">${title}</h1>
        </div>
        <div class="meta">
          <div>${escapeHtml(result.timestamp)} · ${result.year}Y</div>
          <div>${escapeHtml(filename)}</div>
        </div>
      </section>
      <article>${body}</article>
      <section class="disclaimer">
        This report is framework analysis for research workflow support only. It is not investment advice. Verify live prices, filings, and fundamentals before making decisions.
      </section>
    </main>
    <script>
      window.addEventListener("load", () => {
        setTimeout(() => window.print(), 250);
        setTimeout(() => URL.revokeObjectURL(window.location.href), 5000);
      });
    </script>
  </body>
</html>`;
  const blob = new Blob([printableHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (!printWindow) {
    URL.revokeObjectURL(url);
  }
};

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
    sub: "Supply Chain",
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

Respond in English. Structure: Supply Chain Position → Bottleneck Test → Serenity Known Stance → Bull/Bear Arguments → Uncertainty Statement. End with disclaimer.`,
  },
  {
    id: "fundamental",
    name: "Fundamental",
    sub: "Fundamentals",
    icon: BarChart3,
    color: "#1a5c3a",
    bgColor: "#edf7f2",
    borderColor: "#9dcfb8",
    prompt: `You are a rigorous fundamental analyst. Analyze: revenue/earnings quality and trends, balance sheet strength, valuation multiples vs peers (P/E, EV/EBITDA, P/S), moat analysis, management quality and capital allocation. Respond in English. Use specific numbers. Bold key metrics. Structure: summary → financials → valuation → moat → verdict. End with disclaimer.`,
  },
  {
    id: "macro",
    name: "Macro",
    sub: "Macro",
    icon: Globe,
    color: "#7a4f00",
    bgColor: "#fdf5e8",
    borderColor: "#e8c87a",
    prompt: `You are a macro analyst. Analyze: interest rate sensitivity and Fed policy impact, dollar/FX effects, sector rotation and capital flow dynamics, geopolitical risk exposure (tariffs, export controls), inflation/deflation regime impact. Respond in English. Structure: macro backdrop → rate sensitivity → sector rotation → geopolitical overlay → positioning implication. End with disclaimer.`,
  },
  {
    id: "technical",
    name: "Technical",
    sub: "Technicals",
    icon: TrendingUp,
    color: "#4a1e8a",
    bgColor: "#f2eefb",
    borderColor: "#c8b3f0",
    prompt: `You are a technical analyst. Serenity's view: "TA is snake oil without fundamentals" — so frame technical as a COMPLEMENT to fundamental. Analyze: trend structure, key support/resistance levels, momentum (RSI, MACD), volume signals, chart patterns. Respond in English. Structure: trend → key levels → momentum → volume → setup trigger. End with disclaimer.`,
  },
  {
    id: "sentiment",
    name: "Sentiment",
    sub: "Sentiment",
    icon: MessageSquare,
    color: "#0a5c5c",
    bgColor: "#e8f5f5",
    borderColor: "#80cbc4",
    prompt: `You are a market sentiment analyst. Key principle: "IGNORE Reddit/X sentiment — usually wrong." Focus on: institutional vs retail positioning divergence, options market signals, analyst consensus and revision trends, dark-pool/block-trade patterns, insider activity. Respond in English. Structure: retail sentiment → institutional flow → options positioning → analyst lag → contrarian opportunity. End with disclaimer.`,
  },
  {
    id: "risk",
    name: "Risk",
    sub: "Risk Matrix",
    icon: Shield,
    color: "#9b2c2c",
    bgColor: "#fdf0f0",
    borderColor: "#f5b8b8",
    prompt: `You are a risk analyst. Key disqualifiers: large active ATM + SBC dilution, single-customer concentration, China export-control binary risk, pre-revenue with no qualification path. Analyze: business model risks, financial/dilution risks, market risks, tail risks, risk-adjusted sizing. Rate each: LOW/MEDIUM/HIGH. Respond in English. Structure: business risks → financial risks → market risks → tail risks → sizing implication. End with disclaimer.`,
  },
];

// ─── Data Constants ──────────────────────────────────────────────

const YEARS = [1, 2, 3, 5, 10];

const QUICK_EXAMPLES: QuickExample[] = [
  {
    skill: "serenity",
    text: "$SIVE CPO laser supply chain",
    query: "$SIVE Sivers Semiconductors CPO laser bottleneck deep dive",
    label: "Serenity · #1 conviction",
  },
  {
    skill: "serenity",
    text: "$AXTI InP substrate control",
    query: "$AXTI Strait of AXTI InP substrate analysis",
    label: "Serenity · Flagship bottleneck",
  },
  {
    skill: "serenity",
    text: "$NBIS Neocloud quality",
    query: "$NBIS Neocloud financing quality comparison",
    label: "Serenity · Financing spectrum",
  },
  {
    skill: "fundamental",
    text: "$AAOI fundamental deep dive",
    query: "$AAOI US-manufactured transceiver fundamentals",
    label: "Fundamental",
  },
  {
    skill: "macro",
    text: "CPO sector capital rotation",
    query: "AI photonics CPO sector macro narrative and capital rotation",
    label: "Macro",
    mode: "industry",
  },
  {
    skill: "risk",
    text: "Neocloud dilution risk",
    query: "$IREN $CRWV ATM dilution risk matrix comparison",
    label: "Risk · ATM dilution",
    mode: "industry",
  },
];

const RECENT = [
  "$SIVE CPO laser bottleneck analysis",
  "$AXTI InP substrate supply chain",
  "$NBIS Neocloud financing quality",
  "$AAOI US-manufactured transceiver",
];

// ─── Conviction Matrix ───────────────────────────────────────────

const MATRIX: Record<string, MatrixTicker[]> = {
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
      desc: "US 1.6T transceiver",
      q: "$AAOI US-manufactured transceiver analysis",
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
      desc: "NVDA financing · 71% GM",
      q: "$NBIS Nebius S-tier analysis",
    },
    {
      t: "CIFR",
      tier: "B",
      dir: "bull",
      desc: "GOOGL contract endorsement",
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
      desc: "$6B ATM ⚠️ Flipped bear",
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
      desc: "2028 LEAPS IV mispriced",
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
      desc: "Profit = interest · Short",
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

// ─── Calibration Data ────────────────────────────────────────────

const ACCURACY_METRICS = [
  { label: "30-day directional accuracy", pct: 61, color: "#1a3a5c" },
  { label: "Strict 30-day ±10% hit rate", pct: 41, color: "#4a1e8a" },
  { label: "60-day 20%+ return rate", pct: 54, color: "#0a5c5c" },
  { label: "Mature supply chain thesis validation", pct: 80, color: "#1a5c3a" },
  { label: "CPO/Photonics/InP subset", pct: 83, color: "#1a5c3a" },
];

const DONUT_SECTORS = [
  { label: "Photonics/CPO", pct: 35, color: "#1a3a5c" },
  { label: "AI Compute/Semi", pct: 18, color: "#4a1e8a" },
  { label: "Neocloud", pct: 18, color: "#1a5c3a" },
  { label: "Memory/HBM", pct: 12, color: "#0a5c5c" },
  { label: "Power/Grid", pct: 10, color: "#7a4f00" },
  { label: "Other", pct: 7, color: "#9a9690" },
];

const CALLS: CallRecord[] = [
  {
    date: "25-07-21",
    t: "ALAB",
    desc: "Long ~$96, '$50B+ moonshot'",
    r: "+154%",
    w: true,
  },
  {
    date: "25-09-25",
    t: "CIFR",
    desc: "'17% dip is a buy'",
    r: "+250%",
    w: true,
  },
  {
    date: "25-12-21",
    t: "CRCL",
    desc: "'1000%+ thesis' ~$70 entry",
    r: "+148%",
    w: true,
  },
  {
    date: "25-12-26",
    t: "AXTI",
    desc: "Flagship bottleneck post (5.7M views)",
    r: "+310%",
    w: true,
  },
  {
    date: "26-03-14",
    t: "SIVE",
    desc: "#1 conviction, ~$140M MC",
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
    desc: "Long $40.13, later flipped bear",
    r: "⚠️ Flipped",
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
    q: "$LITE OCS optical transceiver analysis",
  },
  {
    x: 287,
    y: 60,
    w: 82,
    h: 32,
    fi: "#edf7f2",
    st: "#9dcfb8",
    lines: ["AAOI"],
    sub: "US made",
    c: "#1a5c3a",
    q: "$AAOI US-manufactured transceiver analysis",
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
    q: "$AXTI Strait of AXTI InP substrate bottleneck analysis",
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
];

const NEOCLOUD_NODES: NeocloudNode[] = [
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
    sub: "GOOGL endorsement",
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
];

type SubTab = "examples" | "chain" | "matrix" | "calibration";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "examples", label: "Quick Start" },
  { id: "chain", label: "Supply Chain (Fixed)" },
  { id: "matrix", label: "Conviction Matrix (Fixed)" },
  { id: "calibration", label: "Track Record" },
];

// ─── Helpers ─────────────────────────────────────────────────────

function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

function buildParallelExportMarkdown(
  result: AnalysisResult,
  skillIds: string[],
) {
  const sections = skillIds.map((skillId) => {
    const skill = getSkillById(skillId);
    const cell = result.cells?.[skillId];
    const body =
      cell?.text?.trim() ||
      (cell?.error ? `Analysis failed: ${cell.error}` : "No output yet.");

    return `## ${skill?.name ?? skillId}\n\n${body}`;
  });

  return [
    `# ${result.query}`,
    "",
    `Parallel analysis · ${skillIds.length} skills · ${result.timestamp} · ${result.year}Y`,
    "",
    ...sections,
  ].join("\n\n");
}

function mcStyle(dir: "bull" | "bear") {
  return dir === "bear"
    ? { bg: "#fdf0f0", bd: "#f5b8b8", c: "#9b2c2c" }
    : { bg: "#edf7f2", bd: "#9dcfb8", c: "#1a5c3a" };
}

function tryParseReportData(text: string): ReportData | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "target" in parsed &&
      "summary" in parsed &&
      "sections" in parsed &&
      Array.isArray((parsed as ReportData).sections)
    ) {
      return parsed as ReportData;
    }
    return null;
  } catch {
    return null;
  }
}

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
  const { plan, isPaid } = useUserPlan();
  const [ticker, setTicker] = useState("");
  const [year, setYear] = useState(3);
  const [multiMode, setMultiMode] = useState(false);
  const [activeSkill, setActiveSkill] = useState("serenity");
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<SubTab>("examples");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [running, setRunning] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
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
    async (
      query: string,
      skillId: string,
      resultId: number,
      options: { mode?: "single" | "industry" } = {},
    ) => {
      if (!apiKey && !isPaid) return;

      const skill = getSkillById(skillId);
      if (!skill) return;

      const controller = new AbortController();
      abortRef.current.push(controller);

      try {
        const response = await fetch("/api/report/serenity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: query,
            mode: options.mode ?? "single",
            language: "en-US",
            api_key: apiKey,
            base_url: baseUrl,
            model,
            skill_id: skillId,
            skill_prompt: skill.prompt,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await readSerenityErrorPayload(response);
          const resolution = payload.resolution;
          if (response.status === 422 && resolution) {
            setResults((prev) => {
              const next = [...prev];
              const idx = next.findIndex((r) => r.id === resultId);
              if (idx >= 0)
                next[idx] = {
                  ...next[idx],
                  content: "",
                  status: "done",
                  error: payload.message,
                  blocked: true,
                  blockMode: resolution.mode,
                  candidates: resolution.candidates ?? [],
                } as AnalysisResult;
              return next;
            });
            return;
          }
          throw new Error(payload.message);
        }

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

        const streamedError = extractSerenityError(content);
        setResults((prev) => {
          const next = [...prev];
          const idx = next.findIndex((r) => r.id === resultId);
          if (idx >= 0)
            next[idx] = {
              ...next[idx],
              content,
              status: streamedError ? "error" : "done",
              error: streamedError ?? undefined,
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
    [apiKey, isPaid, baseUrl, model],
  );

  // ─── Submit handler ──────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) e.preventDefault();
      if (!ticker.trim() || (!apiKey && !isPaid) || running) return;

      setMobileSidebar(false);
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
                  ticker,
                  mode: "single",
                  language: "en-US",
                  api_key: apiKey,
                  base_url: baseUrl,
                  model,
                  skill_id: sid,
                  skill_prompt: skill.prompt,
                }),
                signal: controller.signal,
              });

              if (!response.ok)
                throw new Error(await readSerenityError(response));
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

              const streamedError = extractSerenityError(text);
              setResults((prev) => {
                const next = [...prev];
                const idx = next.findIndex((r) => r.id === id);
                if (idx >= 0)
                  next[idx] = {
                    ...next[idx],
                    cells: {
                      ...next[idx]!.cells,
                      [sid]: streamedError
                        ? { text, error: streamedError }
                        : { text },
                    },
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
      isPaid,
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
    (
      query: string,
      skillId: string,
      mode: "single" | "industry" = "single",
    ) => {
      if (!apiKey && !isPaid) return;
      setMobileSidebar(false);
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
      void runSingle(query, skillId, id, { mode });
    },
    [apiKey, isPaid, multiMode, year, runSingle],
  );

  const runIndustryQuery = useCallback(
    (query: string) => {
      if (!apiKey && !isPaid) return;
      setMobileSidebar(false);
      setTicker(query);
      setActiveTab("examples");

      const ts = new Date().toLocaleTimeString("zh", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const id = ++resultIdRef.current;
      setResults((prev) => [
        {
          id,
          type: "single",
          skillId: "serenity",
          query,
          content: "",
          status: "loading",
          timestamp: ts,
          year,
        },
        ...prev,
      ]);
      void runSingle(query, "serenity", id, { mode: "industry" });
    },
    [apiKey, isPaid, year, runSingle],
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
      {/* ── Mobile Menu Button ────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMobileSidebar(!mobileSidebar)}
        className="fixed top-4 left-4 z-50 rounded-md border border-[#d8d2c8] bg-[#fffdf8] p-2 md:hidden"
      >
        {mobileSidebar ? (
          <X className="size-5 text-[#1a1814]" />
        ) : (
          <Menu className="size-5 text-[#1a1814]" />
        )}
      </button>

      {/* ── Mobile Backdrop ─────────────────────────────────── */}
      {mobileSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileSidebar(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileSidebar(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* ── Left Panel ─────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] shrink-0 border-r border-[#e0dbd2] bg-[#faf9f6] p-6 transition-transform md:relative md:translate-x-0 ${
          mobileSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Ticker Input */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
              Research target
            </div>
            <input
              placeholder="Ticker / Sector / Question"
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
              Lookback window
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
              Analysis Lens · Skill
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
              <span className="text-xs text-[#5a5650]">
                Multi-Skill Parallel
              </span>
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
            disabled={!ticker.trim() || (!apiKey && !isPaid)}
            className={`w-full rounded py-3 font-mono text-xs tracking-[.08em] transition-all ${
              running
                ? "border border-[#1a1814] bg-[#faf9f6] text-[#1a1814]"
                : "bg-[#1a1814] text-[#faf9f6] hover:bg-[#2d2b28] disabled:bg-[#9a9690]"
            }`}
          >
            {running ? "Analyzing…" : "Run Analysis"}
          </button>

          {/* API Key */}
          {isPaid ? (
            <div>
              <div className="mb-1.5 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                API Key
              </div>
              <div className="mb-2 flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-2">
                <span className="font-mono text-xs text-green-700">
                  {apiKey
                    ? "Using your request key"
                    : `Using hosted ${plan === "business" ? "Business" : "Pro"} key`}
                </span>
              </div>
              <Input
                type="password"
                placeholder="Optional fallback key, e.g. sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="border-[#ccc8be] bg-transparent font-mono text-xs"
              />
              <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-[#9a9690]">
                Leave blank to use the hosted key. Add your own key only when
                the hosted provider is temporarily unavailable.
              </p>
            </div>
          ) : (
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
          )}

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
              Recent
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
      <main className="flex-1 overflow-y-auto bg-[#faf9f6] p-4 sm:p-6 lg:p-10">
        {/* Hero */}
        {results.length === 0 && (
          <div>
            <h1 className="mb-2 font-serif text-2xl leading-tight font-light text-[#1a1814] sm:text-[30px]">
              Supply Chain Bottleneck Analysis
              <br />
              AI · Semiconductors · Photonics
            </h1>
            <p className="mb-7 font-mono text-[13px] text-[#9a9690]">
              <span className="text-[#5a5650]">
                Serenity (@aleabitoreddit) framework
              </span>{" "}
              · 5,582 tweets · 4 articles distilled · For decision support only,
              not investment advice
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
                Serenity Core Supply Chain
              </div>
              <div className="mb-2.5 font-mono text-[11px] leading-[2] text-[#1a3a5c]">
                Hyperscaler CapEx (GOOGL/MSFT/META/AMZN)
                <span className="text-[#9a9690]"> → </span>ASIC/TPU
                <span className="text-[#9a9690]"> → </span>Optical Transceivers
                (LITE/AAOI/COHR)
                <span className="text-[#9a9690]"> → </span>CW/DFB Laser (SIVE)
                <span className="text-[#9a9690]"> → </span>InP Epi (IQE)
                <span className="text-[#9a9690]"> → </span>
                <strong>InP Substrate (AXTI)</strong> ← Bottleneck
                <span className="text-[#9a9690]"> → </span>Indium Feedstock
                (Vital)
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { label: "Data source", value: "5,582 tweets" },
                  { label: "30-day directional accuracy", value: "~61%" },
                  { label: "Mature supply chain theses", value: "~75-85%" },
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
              Quick Analysis Examples
            </div>
            <div className="mb-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_EXAMPLES.map((ex) => (
                <button
                  key={ex.query}
                  type="button"
                  onClick={() => handleQuickRun(ex.query, ex.skill, ex.mode)}
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
            {ticker.trim() && (
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-[#e8c87a] bg-[#fdf5e8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-mono text-[11px] text-[#7a4f00]">
                  ⚠️ Below is Serenity's AI/semiconductor fixed universe, not
                  the supply chain for "{ticker.trim()}"
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const q = `${ticker.trim()} supply chain bottleneck analysis`;
                    runIndustryQuery(q);
                  }}
                  className="shrink-0 rounded-md bg-[#7a4f00] px-3 py-1.5 font-mono text-[11px] text-white transition-colors hover:bg-[#5a3a00]"
                >
                  Analyze {ticker.trim()} Supply Chain with AI →
                </button>
              </div>
            )}
            <div className="mb-4 rounded-lg border border-[#e0dbd2] bg-[#faf9f6] p-4">
              <div className="mb-3 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                AI Photonics Supply Chain · Click node to fill analysis box
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
                      ["Hyperscaler", 60],
                      ["ASIC/TPU", 206],
                      ["Optical Transceivers", 348],
                      ["CW/DFB Laser", 494],
                      ["InP Epi", 606],
                      ["⚡ Bottleneck", 716],
                      ["Indium Feedstock", 814],
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
            {ticker.trim() && (
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-[#e8c87a] bg-[#fdf5e8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-mono text-[11px] text-[#7a4f00]">
                  ⚠️ Below is Serenity's fixed conviction matrix, not related
                  tickers for "{ticker.trim()}"
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const q = `${ticker.trim()} competitive landscape analysis`;
                    runIndustryQuery(q);
                  }}
                  className="shrink-0 rounded-md bg-[#7a4f00] px-3 py-1.5 font-mono text-[11px] text-white transition-colors hover:bg-[#5a3a00]"
                >
                  Analyze {ticker.trim()} Competitive Landscape with AI →
                </button>
              </div>
            )}
            <p className="mb-4 font-mono text-[10px] text-[#9a9690]">
              Click ticker → fills input box · As of May 2026 · Theses have time
              decay
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
                  Prediction Accuracy Calibration
                </div>
                <AccBars />
              </div>
              <div className="rounded-lg border border-[#e0dbd2] p-4">
                <div className="mb-3 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                  Sector Coverage Distribution
                </div>
                <DonutChart />
              </div>
            </div>

            {/* Representative Calls */}
            <div className="mb-3 rounded-lg border border-[#e0dbd2] p-4">
              <div className="mb-2.5 font-mono text-[10px] tracking-[.1em] text-[#9a9690] uppercase">
                Representative Calls
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
              ⚠️ All return data is self-reported, unverified by third parties.
              61% accuracy from 49 recorded public predictions. Mature supply
              chain theses (75-85%) ≠ replicable trading returns.
            </div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────── */}
        {results.map((result, idx) => {
          const separator = idx < results.length - 1;

          if (result.type === "single") {
            const skill = getSkillById(result.skillId!);
            if (!skill) return null;

            const isBlocked = !!result.blocked;
            const isLoading = result.status === "loading" && !result.content;
            const isError = !!result.error && !isBlocked;
            const isDone =
              !isBlocked &&
              result.status === "done" &&
              result.skillId === "serenity";

            return (
              <div key={result.id} className="mb-8">
                <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
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
                  <div className="ml-auto flex items-center gap-2">
                    {result.content.trim() && (
                      <>
                        <button
                          type="button"
                          onClick={() => printReportPdf(result)}
                          className="inline-flex items-center gap-1 rounded border border-[#d8d2c8] bg-[#fffdf8] px-2 py-1 font-mono text-[10px] text-[#5a5650] transition-colors hover:border-[#1a1814] hover:text-[#1a1814]"
                        >
                          <FileDown className="size-3" />
                          保存 PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadMarkdown(result)}
                          className="inline-flex items-center gap-1 rounded border border-[#d8d2c8] bg-[#fffdf8] px-2 py-1 font-mono text-[10px] text-[#5a5650] transition-colors hover:border-[#1a1814] hover:text-[#1a1814]"
                        >
                          <Download className="size-3" />
                          保存 Markdown
                        </button>
                      </>
                    )}
                    <span className="font-mono text-[10px] text-[#9a9690]">
                      {result.timestamp} · {result.year}Y
                    </span>
                  </div>
                </div>

                {isLoading && <Skeleton />}

                {isError && (
                  <div className="rounded bg-[#fdf0f0] p-3 font-mono text-xs text-[#9b2c2c]">
                    {result.error}
                  </div>
                )}

                {isBlocked && (
                  <div className="rounded border border-[#d8d2c8] bg-[#fffdf8] p-3">
                    <div className="font-mono text-xs leading-relaxed text-[#5a5650]">
                      {result.blockMode === "industry"
                        ? "This looks like an industry or theme. Choose one listed candidate for single-asset analysis, or run industry research."
                        : (result.error ??
                          "Choose one listed candidate to continue.")}
                    </div>

                    {!!result.candidates?.length && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.candidates.map((candidate) => (
                          <button
                            key={`${candidate.ticker}-${candidate.exchange}`}
                            type="button"
                            onClick={() =>
                              handleQuickRun(
                                candidate.ticker,
                                result.skillId ?? "serenity",
                              )
                            }
                            className="inline-flex max-w-full items-center gap-1 rounded border border-[#d8d2c8] bg-[#fffaf0] px-2 py-1 font-mono text-[11px] text-[#1a1814] transition-colors hover:border-[#1a1814]"
                            title={`${candidate.companyName} (${candidate.exchange || "unknown exchange"})`}
                          >
                            <span>{candidate.ticker}</span>
                            <span className="truncate text-[#9a9690]">
                              {candidate.companyName.slice(0, 28)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {result.blockMode === "industry" && (
                      <button
                        type="button"
                        onClick={() => runIndustryQuery(result.query)}
                        className="mt-3 w-full rounded border border-[#1a1814] bg-[#1a1814] px-3 py-2 font-mono text-[11px] text-[#fffdf8] transition-colors hover:bg-[#3a332a] sm:w-auto sm:py-1.5"
                      >
                        Run industry research on "{result.query}" →
                      </button>
                    )}
                  </div>
                )}

                {!isBlocked &&
                  !isError &&
                  (() => {
                    const reportData = isDone
                      ? tryParseReportData(result.content)
                      : null;
                    if (reportData) {
                      return (
                        <div className="mt-4">
                          <VisualReport data={reportData} />
                        </div>
                      );
                    }
                    if (!result.content.trim()) return null;
                    return (
                      <div className="mt-4">
                        <MarkdownReport
                          text={result.content}
                          skill={result.skillId}
                          query={result.query}
                          timestamp={result.timestamp}
                          year={result.year}
                        />
                      </div>
                    );
                  })()}

                {isDone && (
                  <div className="mt-3 rounded border-l-[3px] border-[#7a4f00] bg-[#fdf5e8] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-[#7a4f00]">
                    ⚠️ This is framework analysis, not investment advice. Theses
                    have time decay — confirm current prices and fundamentals
                    yourself. DYOR.
                  </div>
                )}

                {separator && <div className="my-8 h-px bg-[#e0dbd2]" />}
              </div>
            );
          }

          // Parallel mode result
          const skills = result.skills || [];
          const exportableParallelResult = {
            ...result,
            content: buildParallelExportMarkdown(result, skills),
          };
          const hasParallelOutput = Object.values(result.cells ?? {}).some(
            (cell) => cell.text?.trim() || cell.error?.trim(),
          );

          return (
            <div key={result.id} className="mb-8">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <div className="font-mono text-[10px] tracking-[.08em] text-[#9a9690]">
                  PARALLEL · {skills.length} SKILLS · {result.timestamp} ·{" "}
                  {result.year}Y
                </div>
                {hasParallelOutput && (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => printReportPdf(exportableParallelResult)}
                      className="inline-flex items-center gap-1 rounded border border-[#d8d2c8] bg-[#fffdf8] px-2 py-1 font-mono text-[10px] text-[#5a5650] transition-colors hover:border-[#1a1814] hover:text-[#1a1814]"
                    >
                      <FileDown className="size-3" />
                      保存 PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadMarkdown(exportableParallelResult)}
                      className="inline-flex items-center gap-1 rounded border border-[#d8d2c8] bg-[#fffdf8] px-2 py-1 font-mono text-[10px] text-[#5a5650] transition-colors hover:border-[#1a1814] hover:text-[#1a1814]"
                    >
                      <Download className="size-3" />
                      保存 Markdown
                    </button>
                  </div>
                )}
              </div>
              <div className="mb-3 font-serif text-[17px] font-light">
                {result.query}
              </div>
              <ParallelReport
                r={{
                  type: "parallel",
                  skills,
                  query: result.query,
                  cells: result.cells ?? {},
                  ts: result.timestamp,
                  year: result.year,
                  status: result.status,
                }}
              />
              {separator && <div className="my-8 h-px bg-[#e0dbd2]" />}
            </div>
          );
        })}
      </main>
    </div>
  );
};
