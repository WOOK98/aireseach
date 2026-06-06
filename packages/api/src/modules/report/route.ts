import { createOpenAI } from "@ai-sdk/openai";
import { zValidator } from "@hono/zod-validator";
import { streamText } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";
import { z } from "zod";

import { env } from "../../env";
import { fetchYahooFinance } from "./yahoo-finance";

import type { FinancialMetrics } from "@workspace/shared/types/report";

export const reportRoute = new Hono();

const openaiProvider = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const deepseekProvider = createOpenAI({
  apiKey: env.DEEPSEEK_API_KEY || env.LLM_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

const getReportModelConfig = () => {
  const providerName = env.OPENAI_API_KEY ? "OpenAI" : "DeepSeek";
  const apiKey = env.OPENAI_API_KEY || env.DEEPSEEK_API_KEY || env.LLM_API_KEY;

  if (!apiKey) {
    throw new HTTPException(500, {
      message:
        "Finance report generation is not configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY.",
    });
  }

  const invalidCharacter = Array.from(apiKey).find(
    (character) => character.charCodeAt(0) > 255,
  );

  if (invalidCharacter) {
    throw new HTTPException(500, {
      message: `${providerName} API key contains an invalid character (${invalidCharacter}). Replace the Vercel environment variable with the full raw API key, not a shortened or masked value.`,
    });
  }

  return env.OPENAI_API_KEY
    ? openaiProvider("gpt-4o-mini")
    : deepseekProvider("deepseek-chat");
};

const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null || n === 0 ? "N/A" : n.toFixed(decimals);

const fmtB = (n: number) => {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
};

// ─── GET /api/report/financials/:ticker ──────────────────────────────────────
// Proxy Yahoo Finance data — keeps API calls server-side, hides user-agent tricks
reportRoute.get(
  "/financials/:ticker",
  zValidator("param", z.object({ ticker: z.string().min(1).max(10) })),
  async (c) => {
    const { ticker } = c.req.valid("param");

    try {
      const metrics = await fetchYahooFinance(ticker.toUpperCase());
      return c.json({ ok: true, data: metrics });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ ok: false, error: message }, 422);
    }
  },
);

// ─── POST /api/report/finance/generate ───────────────────────────────────────
// Accepts pre-fetched metrics, streams AI analysis back
const generateSchema = z.object({
  ticker: z.string().min(1).max(10),
  metrics: z.custom<FinancialMetrics>(),
  language: z.enum(["zh", "en"]).default("zh"),
  mode: z
    .enum(["snapshot", "earnings", "competition", "risk", "poc"])
    .default("snapshot"),
});

reportRoute.post(
  "/finance/generate",
  zValidator("json", generateSchema),
  async (c) => {
    const { ticker, metrics: m, language, mode } = c.req.valid("json");
    const model = getReportModelConfig();

    const isZh = language === "zh";
    const hasFundamentals =
      m.revenue > 0 ||
      m.marketCap > 0 ||
      m.grossMargin > 0 ||
      m.eps !== 0 ||
      m.revenueHistory.length > 0;

    const systemPrompt = isZh
      ? `你是一名专业的股票研究分析师，擅长撰写机构级研究报告。
风格要求：
- 数据驱动，每个论点都要引用真实财务数据
- 客观中立，同时呈现多空两方观点
- 专业但易读，避免过于学术化
- 结论明确，给出明确的投资评级理由
- 借鉴售前方案专家工作流：先给决策摘要，再给情景推演、角色化解读、可跟踪指标和下一步动作
请严格按照 JSON 格式输出，不要输出任何 markdown 代码块标记。`
      : `You are a professional equity research analyst. Write institutional-quality research reports.
Style: data-driven (cite actual figures), balanced bull/bear, professional yet readable.
Use a solution-consulting workflow: decision brief first, then scenarios, role-based takeaways, monitorable metrics, and next actions.
Output strict JSON only — no markdown fences.`;

    const modeLabel = {
      snapshot: isZh
        ? "快速投资快照：适合3分钟内判断是否值得继续研究"
        : "Investment snapshot: decide in 3 minutes whether the stock deserves deeper work",
      earnings: isZh
        ? "财报复盘：聚焦增长质量、利润率、现金流与管理层执行"
        : "Earnings review: focus on growth quality, margins, cash flow, and execution",
      competition: isZh
        ? "竞争格局：聚焦护城河、替代风险、定价权与行业位置"
        : "Competitive landscape: moat, substitution risk, pricing power, and industry position",
      risk: isZh
        ? "风险排雷：聚焦估值、资产负债表、现金流、周期和叙事过热"
        : "Risk scan: valuation, balance sheet, cash flow, cyclicality, and crowded narrative risk",
      poc: isZh
        ? "跟踪计划：把投资假设转成未来30-90天可验证指标"
        : "Tracking plan: convert the thesis into 30-90 day measurable validation points",
    }[mode];

    const userPrompt = `
Analyze ${m.companyName} (${ticker}) and generate a research report based on the following REAL financial data:

## Analysis Mode
${modeLabel}

${hasFundamentals ? "" : "Important: Yahoo Finance fundamentals are temporarily unavailable for this request. Base the report on the live price data below, clearly state that full fundamentals are unavailable, and avoid inventing revenue, margin, EPS, cash flow, or valuation metrics."}

## Company
- Sector: ${m.sector} / ${m.industry}
- Description: ${m.description?.slice(0, 400)}

## Current Financials
- Price: $${fmt(m.currentPrice, 2)} | Market Cap: ${fmtB(m.marketCap)}
- Revenue Growth YoY: ${fmt(m.revenueGrowthYoy)}%
- Gross Margin: ${fmt(m.grossMargin)}%
- Operating Margin: ${fmt(m.operatingMargin)}%
- Net Margin: ${fmt(m.netMargin)}%
- EPS: $${fmt(m.eps, 2)} | EPS Growth: ${fmt(m.epsGrowthYoy)}%
- Free Cash Flow: ${fmtB(m.freeCashFlow)} (FCF Margin: ${fmt(m.fcfMargin)}%)

## Valuation
- P/E (TTM): ${fmt(m.peRatio, 1)}x | Forward P/E: ${fmt(m.forwardPE, 1)}x
- P/B: ${fmt(m.pbRatio, 1)}x | P/S: ${fmt(m.psRatio, 1)}x
- EV/EBITDA: ${fmt(m.evEbitda, 1)}x

## Balance Sheet
- Cash: ${fmtB(m.totalCash)} | Debt: ${fmtB(m.totalDebt)} | Net Cash: ${fmtB(m.netCash)}

## Quarterly Revenue Trend (millions)
${m.revenueHistory.map((p) => `${p.period}: $${p.value}M`).join(" | ")}

## Quarterly Gross Margin Trend
${m.grossMarginHistory.map((p) => `${p.period}: ${p.value}%`).join(" | ")}

Return ONLY this JSON structure (${isZh ? "所有文字用中文" : "all text in English"}):
{
  "rating": "Buy" | "Hold" | "Sell",
  "targetPrice": <number>,
  "upside": <number>,
  "ratingRationale": "<one sentence>",
  "investmentThesis": "<2-3 sentences core thesis>",
  "sections": {
    "overview": "<2-3 sentences>",
    "growthDrivers": "<2-3 sentences citing actual growth metrics>",
    "profitability": "<2-3 sentences on margin trends>",
    "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
    "valuation": "<2 sentences on valuation vs peers>",
    "catalysts": "<2 sentences on near-term catalysts>"
  },
  "decisionBrief": {
    "action": "<one clear action: start research / wait / avoid / monitor>",
    "confidence": "Low" | "Medium" | "High",
    "timeHorizon": "<time horizon>",
    "keyQuestion": "<the one question that decides whether the thesis works>"
  },
  "scenarioMatrix": [
    {
      "scenario": "Bull",
      "probability": <number 0-100>,
      "targetPrice": <number>,
      "drivers": ["<driver 1>", "<driver 2>"]
    },
    {
      "scenario": "Base",
      "probability": <number 0-100>,
      "targetPrice": <number>,
      "drivers": ["<driver 1>", "<driver 2>"]
    },
    {
      "scenario": "Bear",
      "probability": <number 0-100>,
      "targetPrice": <number>,
      "drivers": ["<driver 1>", "<driver 2>"]
    }
  ],
  "roleBriefs": [
    {
      "role": "<Founder / Analyst / Investor / CFO or equivalent>",
      "takeaway": "<role-specific takeaway>",
      "concern": "<role-specific concern>"
    }
  ],
  "watchlist": [
    {
      "metric": "<metric to monitor>",
      "current": "<current value from data or N/A>",
      "threshold": "<threshold that changes the view>",
      "whyItMatters": "<why this metric matters>"
    }
  ],
  "nextSteps": ["<concrete next action 1>", "<concrete next action 2>", "<concrete next action 3>"],
  "evidenceNeeds": ["<source or evidence needed to verify claim 1>", "<source or evidence needed to verify claim 2>"]
}
`;

    return stream(c, async (s) => {
      const result = streamText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
        maxOutputTokens: 2600,
      });

      for await (const chunk of result.textStream) {
        await s.write(chunk);
      }
    });
  },
);

// ─── GET /api/report/financials/:ticker/validate ─────────────────────────────
// Quick check if ticker exists before full report generation
reportRoute.get(
  "/validate/:ticker",
  zValidator("param", z.object({ ticker: z.string().min(1).max(10) })),
  async (c) => {
    const { ticker } = c.req.valid("param");
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      const json = (await res.json()) as {
        chart?: {
          result?: Array<{
            meta?: {
              shortName?: string;
              longName?: string;
              regularMarketPrice?: number;
            };
          }>;
        };
      };
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) return c.json({ valid: false });
      return c.json({
        valid: true,
        name: meta.longName ?? meta.shortName,
        price: meta.regularMarketPrice,
      });
    } catch {
      return c.json({ valid: false });
    }
  },
);
