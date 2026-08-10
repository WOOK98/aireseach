/**
 * Research Article Generator MVP — API Route (#116)
 *
 * POST /api/article/generate
 *
 * Input: ticker or industry query
 * Output: structured ResearchArticle JSON
 *
 * Template: fixed 8-section Chinese research article.
 * Visuals: Mermaid / matrix / real API chart / honest empty.
 * Compliance: no target prices, no ratings, no buy/sell.
 *
 * BLOCKER FIXES:
 * - Schema-enforced evidence linkage via superRefine
 * - Data gate: requires at least one verified input before LLM call
 */
import { createOpenAI } from "@ai-sdk/openai";
import { zValidator } from "@hono/zod-validator";
import { generateText } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";
import { z } from "zod";

import { researchArticleSchema } from "@workspace/shared/schema/article";
import { SHARED_HARD_RULES } from "@workspace/shared/skill-contract";

import { env } from "../../env";
import {
  cachedFetchYahooFinance,
  sanitizeFinancialMetrics,
  cachedResolveEntity,
} from "../report/data-sources";
import { buildIndustryUniverse, expandWithAHPeers } from "../report/industry";
import {
  searchImaKnowledge,
  formatImaKnowledgeForPrompt,
} from "../report/knowledge";

import type { FinancialMetrics } from "@workspace/shared/types/report";

// ── Prohibited output patterns ───────────────────────────────────────────────

const PROHIBITED_ARTICLE_PATTERN =
  /\b(target price|price target|buy rating|sell rating|strong buy|strong sell|buy-hold-sell|position sizing|portfolio weights?|entry levels?|stop levels?)\b/i;

// ── Providers ────────────────────────────────────────────────────────────────

const openaiProvider = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const deepseekProvider = createOpenAI({
  apiKey: env.DEEPSEEK_API_KEY || env.LLM_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

const ARTICLE_MAX_OUTPUT_TOKENS = 8000;

const getArticleModelConfig = () => {
  const apiKey = env.OPENAI_API_KEY || env.DEEPSEEK_API_KEY || env.LLM_API_KEY;
  if (!apiKey) {
    throw new HTTPException(500, {
      message: "Article generation is temporarily unavailable.",
    });
  }
  return env.OPENAI_API_KEY
    ? openaiProvider("gpt-4o-mini")
    : deepseekProvider.chat("deepseek-chat");
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null || n === 0 ? "N/A" : n.toFixed(decimals);

const fmtB = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return "N/A";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
};

const parseArticleJson = (text: string) => {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object found in model output.");
  }
  return JSON.parse(clean.slice(start, end + 1));
};

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildArticleSystemPrompt(): string {
  return `${SHARED_HARD_RULES}

你是一名资深产业研究分析师，擅长撰写中文深度研报文章。你的文章风格：数据驱动、逻辑清晰、结构固定、可读性强。

## 输出要求

返回严格的 JSON 对象（不要 markdown fences）。JSON 结构如下：

{
  "schema_version": 1,
  "entity": {
    "resolvedName": "<公司/产业名称>",
    "ticker": "<ticker，如果是公司>",
    "exchange": "<交易所>",
    "sector": "<行业>",
    "industry": "<细分行业>",
    "mode": "ticker" | "industry",
    "dataTimestamp": "<YYYY-MM-DD>"
  },
  "coreThesis": {
    "thesis": "<一句话核心判断>",
    "keyDriver": "<最关键的驱动因素>",
    "nonConsensus": "<市场可能忽略的点（可选）>",
    "evidenceIds": ["E1", "E2"]
  },
  "industryChain": {
    "narrative": "<产业链分析正文，200-400字>",
    "visual": {
      "kind": "mermaid",
      "title": "<图表标题>",
      "diagram": "<Mermaid flowchart/graph 定义>",
      "source": "<数据来源，必填>",
      "date": "<数据日期，必填>",
      "evidenceIds": ["E1"]
    },
    "evidenceIds": ["E1"]
  },
  "evidenceMatrix": {
    "narrative": "<证据矩阵分析正文，200-400字>",
    "visual": {
      "kind": "matrix",
      "title": "<表格标题>",
      "columns": ["指标", "当前值", "同比变化", "来源", "日期"],
      "rows": [
        {"指标": "<指标名>", "当前值": "<值>", "同比变化": "<变化>", "来源": "<来源>", "日期": "<日期>"}
      ],
      "source": "<数据来源，必填>",
      "date": "<数据日期，必填>",
      "evidenceIds": ["E2"]
    },
    "evidenceIds": ["E2"]
  },
  "companyLayer": {
    "narrative": "<公司分层分析正文，200-400字>",
    "visual": {
      "kind": "chart",
      "title": "<图表标题>",
      "chartType": "bar" | "line" | "area",
      "labels": ["<标签1>", "<标签2>", ...],
      "series": [{"name": "<系列名>", "values": [数值1, 数值2, ...]}],
      "source": "<数据来源，必填>",
      "date": "<数据日期，必填>",
      "evidenceIds": ["E3"]
    },
    "evidenceIds": ["E3"]
  },
  "conclusion": {
    "summary": "<总结，100-200字>",
    "risks": [
      {"risk": "<风险描述>", "explanation": "<简要解释>", "evidenceIds": ["E2"]}
    ],
    "invalidationConditions": [
      {"condition": "<失效条件>", "metric": "<观测指标>", "threshold": "<数值阈值>"}
    ],
    "evidenceIds": ["E1", "E2", "E3"]
  },
  "evidence": [
    {"id": "E1", "claim": "<支撑的论点>", "source": "<来源名称>", "date": "<日期>", "url": "<URL或空字符串>", "confidence": "verified" | "partial" | "unverified"}
  ],
  "generatedAt": "<ISO timestamp>",
  "language": "zh",
  "disclaimer": "本报告仅供研究参考，不构成投资建议。所有数据请独立核实后再做决策。"
}

## 关键约束

1. **evidenceIds 强制关联**：每个 section（coreThesis、industryChain、evidenceMatrix、companyLayer、conclusion）和每个 visual（非 empty）和每个 risk 都必须有 evidenceIds 数组，引用 evidence[] 中的 id。
2. **双向校验**：evidence[] 中每条必须被至少一个 section 引用；引用的 id 必须在 evidence[] 中存在。
3. **source/date 必填**：所有非 empty visual 必须有 source 和 date。
4. **无数据 = empty visual**：没有可靠来源的维度用 kind: "empty" 并说明原因。
5. **禁止虚构数字**：找不到数据就写"数据不可用"，不要编造。
6. **不输出目标价、评级、买卖建议。**
7. **全文中文。**
8. **不暴露模型名称或 provider 信息。**`;
}

function buildArticleUserPrompt(
  query: string,
  financials: FinancialMetrics | null,
  industryData: string,
  imaContext: string,
  verifiedSources: string[],
): string {
  let dataSection = "";

  if (financials) {
    const m = financials;
    dataSection = `
## 公司财务数据

- 公司: ${m.companyName} (${m.ticker ?? "N/A"})
- 行业: ${m.sector ?? "N/A"} / ${m.industry ?? "N/A"}
- 股价: $${fmt(m.currentPrice, 2)} | 市值: ${fmtB(m.marketCap)}
- 收入增长 YoY: ${fmt(m.revenueGrowthYoy)}%
- 毛利率: ${fmt(m.grossMargin)}% | 营业利润率: ${fmt(m.operatingMargin)}% | 净利率: ${fmt(m.netMargin)}%
- EPS: $${fmt(m.eps, 2)} | EPS 增长: ${fmt(m.epsGrowthYoy)}%
- 自由现金流: ${fmtB(m.freeCashFlow)} (FCF 利润率: ${fmt(m.fcfMargin)}%)
- 现金: ${fmtB(m.totalCash)} | 负债: ${fmtB(m.totalDebt)} | 净现金: ${fmtB(m.netCash)}
- P/E: ${fmt(m.peRatio)}x | Forward P/E: ${fmt(m.forwardPE)}x | P/S: ${fmt(m.psRatio)}x | EV/EBITDA: ${fmt(m.evEbitda)}x

### 收入趋势 (百万美元)
${
  m.revenueHistory
    .filter((p) => p.value != null)
    .map((p) => `${p.period}: $${p.value}M`)
    .join(" | ") || "N/A"
}

### 毛利率趋势
${
  m.grossMarginHistory
    .filter((p) => p.value != null)
    .map((p) => `${p.period}: ${p.value}%`)
    .join(" | ") || "N/A"
}

### 公司简介
${m.description?.slice(0, 500) || "N/A"}`;
  }

  const sourcesBlock =
    verifiedSources.length > 0
      ? `\n## 已验证数据来源\n${verifiedSources.map((s, i) => `[S${i + 1}] ${s}`).join("\n")}\n\n请基于以上已验证数据生成研报。evidence[] 中的 source 字段必须引用上述来源。`
      : "";

  return `
分析目标: ${query}

${dataSection}

${industryData ? `## 产业数据\n${industryData}` : ""}

${imaContext ? `## 知识库参考\n${imaContext}` : ""}

${sourcesBlock}

请根据以上数据，生成一篇完整的中文研报文章。严格遵循 8 段固定结构，返回 JSON。

关键约束：
- 每个 section / visual / risk 的 evidenceIds 必须引用 evidence[] 中的 id
- evidence[] 中每条必须被至少一个 evidenceIds 引用
- 所有 visual 的 source 和 date 必填
- 没有可靠来源的维度用 kind: "empty"`;
}

// ── Degraded fallback ────────────────────────────────────────────────────────

function buildDegradedArticle(query: string) {
  const now = new Date().toISOString();
  return {
    schema_version: 1 as const,
    entity: {
      resolvedName: query,
      mode: "ticker" as const,
      dataTimestamp: now.slice(0, 10),
    },
    coreThesis: {
      thesis: `未能为 "${query}" 生成完整研报。缺少可验证的数据来源。`,
      keyDriver: "需要提供有效的 ticker 或产业关键词",
      evidenceIds: ["E1"],
    },
    industryChain: {
      narrative: "产业链分析不可用。缺少可验证的数据来源。",
      visual: {
        kind: "empty" as const,
        title: "产业链图",
        reason: "无法获取可验证的产业数据",
      },
      evidenceIds: ["E1"],
    },
    evidenceMatrix: {
      narrative: "证据矩阵不可用。缺少可验证的数据来源。",
      visual: {
        kind: "empty" as const,
        title: "关键数据表",
        reason: "无法获取可验证的财务数据",
      },
      evidenceIds: ["E1"],
    },
    companyLayer: {
      narrative: "公司分层分析不可用。缺少可验证的数据来源。",
      evidenceIds: ["E1"],
    },
    conclusion: {
      summary:
        "无法生成研报：未找到可验证的数据来源。请确认输入的 ticker 或产业关键词是否正确。",
      risks: [
        {
          risk: "无可用数据源",
          explanation: "未解析到有效的公司实体或产业数据",
          evidenceIds: ["E1"],
        },
        {
          risk: "输出不可用于研究决策",
          explanation: "降级报告不包含任何可验证的数据",
          evidenceIds: ["E1"],
        },
      ],
      invalidationConditions: [
        { condition: "提供有效的 ticker 后重新生成" },
        { condition: "产业关键词能解析到 ETF 成分股" },
      ],
      evidenceIds: ["E1"],
    },
    evidence: [
      {
        id: "E1",
        claim: "未找到可验证的数据来源，报告降级",
        source: "系统",
        date: now.slice(0, 10),
        url: "",
        confidence: "unverified" as const,
      },
    ],
    generatedAt: now,
    language: "zh" as const,
    disclaimer:
      "本报告仅供研究参考，不构成投资建议。所有数据请独立核实后再做决策。",
    _degraded: true,
  };
}

// ── Data gate: require at least one verified input ───────────────────────────

interface InputSpine {
  hasFinancials: boolean;
  hasIndustryData: boolean;
  hasImaKnowledge: boolean;
  verifiedSources: string[];
}

function buildInputSpine(
  financials: FinancialMetrics | null,
  industryData: string,
  imaContext: string,
): InputSpine {
  const sources: string[] = [];

  if (financials) {
    sources.push(
      `${financials.companyName} (${financials.ticker ?? "N/A"}) 财务数据 via Yahoo Finance`,
    );
  }
  if (industryData) {
    sources.push("产业 ETF 成分股数据");
  }
  if (imaContext) {
    sources.push("IMA 知识库文献");
  }

  return {
    hasFinancials: !!financials,
    hasIndustryData: !!industryData,
    hasImaKnowledge: !!imaContext,
    verifiedSources: sources,
  };
}

function hasVerifiedInput(spine: InputSpine): boolean {
  // At least one of: financials, industry data, or IMA knowledge
  return spine.hasFinancials || spine.hasIndustryData || spine.hasImaKnowledge;
}

// ── Route ────────────────────────────────────────────────────────────────────

export const articleRoute = new Hono();

const generateArticleSchema = z.object({
  query: z.string().min(1).max(120),
  language: z.enum(["zh", "en"]).default("zh"),
});

articleRoute.post(
  "/generate",
  zValidator("json", generateArticleSchema),
  async (c) => {
    const { query } = c.req.valid("json");

    // 1. Resolve entity
    const resolution = await cachedResolveEntity(query);
    let financials: FinancialMetrics | null = null;
    let industryData = "";

    if (resolution.ok && resolution.mode === "ticker") {
      try {
        const raw = await cachedFetchYahooFinance(resolution.ticker);
        const { metrics } = sanitizeFinancialMetrics(raw);
        financials = metrics;
      } catch {
        // Financials unavailable
      }
    } else if (!resolution.ok && resolution.mode === "industry") {
      try {
        const baseUniverse = await buildIndustryUniverse(
          query,
          resolution.candidates,
        );
        if (baseUniverse) {
          const universe = await expandWithAHPeers(baseUniverse);
          const etfInfo = universe.etfs
            .map((e) => `${e.symbol} (${e.name})`)
            .join(", ");
          industryData = [
            `产业: ${universe.query}`,
            `ETF: ${etfInfo}`,
            `成分股: ${universe.constituents.map((c) => `${c.symbol} (${c.name})`).join(", ")}`,
          ].join("\n");
        }
      } catch {
        // Industry data unavailable
      }
    }

    // 2. IMA knowledge
    const symbol = resolution.ok ? resolution.ticker : query;
    const imaKnowledge = await searchImaKnowledge(symbol, {
      limit: 6,
      market: symbol.match(/^\d{6}$/) ? "a-stocks" : "us-stocks",
    });
    const imaContext = formatImaKnowledgeForPrompt(imaKnowledge);

    // 3. Data gate: require at least one verified input
    const spine = buildInputSpine(financials, industryData, imaContext);

    if (!hasVerifiedInput(spine)) {
      // No verified data — degrade immediately, don't call LLM
      return stream(c, async (s) => {
        const degraded = buildDegradedArticle(query);
        await s.write(JSON.stringify(degraded));
      });
    }

    // 4. Build prompt & generate
    const model = getArticleModelConfig();
    const systemPrompt = buildArticleSystemPrompt();
    const userPrompt = buildArticleUserPrompt(
      query,
      financials,
      industryData,
      imaContext,
      spine.verifiedSources,
    );

    return stream(c, async (s) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = await generateText({
            model,
            system: systemPrompt,
            prompt:
              attempt === 0
                ? userPrompt
                : `${userPrompt}\n\n上一次输出验证失败（${lastError?.message ?? "schema error"}）。请修正：\n1. 确保每个 section/visual/risk 的 evidenceIds 引用 evidence[] 中存在的 id\n2. 确保 evidence[] 中每条都被至少一个 evidenceIds 引用\n3. 确保非 empty visual 的 source/date 必填`,
            temperature: 0.3,
            maxOutputTokens: ARTICLE_MAX_OUTPUT_TOKENS,
          });

          const text = result.text;

          // Compliance redline
          if (PROHIBITED_ARTICLE_PATTERN.test(text)) {
            lastError = new Error("Output crossed compliance redline.");
            continue;
          }

          // Parse & validate against shared schema (with superRefine)
          const parsed = parseArticleJson(text);
          const validation = researchArticleSchema.safeParse(parsed);

          if (!validation.success) {
            const errMsgs = validation.error.issues
              .map((i) => i.message)
              .join("; ");
            lastError = new Error(errMsgs);
            continue;
          }

          // Attach metadata
          const article = {
            ...validation.data,
            generatedAt: new Date().toISOString(),
            language: "zh" as const,
          };

          await s.write(JSON.stringify(article));
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      // All attempts failed — degrade gracefully
      console.error(`[article] generation failed for "${query}":`, lastError);
      const degraded = buildDegradedArticle(query);
      await s.write(JSON.stringify(degraded));
    });
  },
);

// ─── GET /api/article/preview/:query ────────────────────────────────────────
articleRoute.get(
  "/preview/:query",
  zValidator("param", z.object({ query: z.string().min(1).max(120) })),
  async (c) => {
    const { query } = c.req.valid("param");
    const resolution = await cachedResolveEntity(query);

    if (!resolution.ok) {
      return c.json({ ok: false, message: resolution.message }, 422);
    }

    if (resolution.mode === "ticker") {
      try {
        const raw = await cachedFetchYahooFinance(resolution.ticker);
        const { metrics } = sanitizeFinancialMetrics(raw);
        return c.json({
          ok: true,
          mode: "ticker",
          entity: resolution,
          metrics: {
            companyName: metrics.companyName,
            ticker: metrics.ticker,
            sector: metrics.sector,
            industry: metrics.industry,
            currentPrice: metrics.currentPrice,
            marketCap: metrics.marketCap,
            revenueGrowthYoy: metrics.revenueGrowthYoy,
            grossMargin: metrics.grossMargin,
            peRatio: metrics.peRatio,
          },
        });
      } catch {
        return c.json({
          ok: true,
          mode: "ticker",
          entity: resolution,
          metrics: null,
          warning: "Financial data temporarily unavailable.",
        });
      }
    }

    return c.json({
      ok: true,
      mode: "industry",
      entity: resolution,
    });
  },
);
