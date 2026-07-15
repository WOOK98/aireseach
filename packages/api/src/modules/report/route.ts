import { createOpenAI } from "@ai-sdk/openai";
import { zValidator } from "@hono/zod-validator";
import { generateText } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";
import { z } from "zod";

import { auth } from "@workspace/auth/server";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  BillingPlan,
  config as billingConfig,
} from "@workspace/billing";
import { getCustomersWithPurchasesByReferenceId } from "@workspace/billing/server";
import { and, count, eq, gte } from "@workspace/db";
import { aiUsageLog, ledgerJudgment } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import { env } from "../../env";
import {
  cachedFetchTechnicalMetrics,
  cachedFetchYahooFinance,
  cachedResolveEntity,
} from "./data-sources";
import { formatImaKnowledgeForPrompt, searchImaKnowledge } from "./knowledge";

import type { FinancialMetrics } from "@workspace/shared/types/report";

// ── L3 Ledger: shared auto-insert helper ────────────────────────────────────
// Best-effort: logs errors but never blocks the report stream response.
async function autoInsertLedgerJudgments(opts: {
  userId: string;
  reportId: string;
  ticker: string;
  companyName: string;
  rawJson: string;
}) {
  try {
    const parsed = JSON.parse(opts.rawJson) as {
      topJudgments?: Array<{
        judgment?: string;
        keyNumber?: string;
        keyNumberValue?: string;
        wrongIf?: string;
        metric?: string;
        trigger?: string;
        tolerance?: string;
        source?: string;
        freq?: string;
      }>;
    };
    const judgments = parsed.topJudgments;
    if (!Array.isArray(judgments) || judgments.length === 0) return;

    const now = new Date();
    for (const j of judgments) {
      if (!j.judgment || !j.keyNumber || !j.wrongIf) continue;
      if (j.keyNumber === "0.0%" || j.keyNumber === "N/A") continue;
      try {
        await db
          .insert(ledgerJudgment)
          .values({
            userId: opts.userId,
            reportId: opts.reportId,
            ticker: opts.ticker,
            companyName: opts.companyName,
            judgment: j.judgment,
            keyNumber: j.keyNumber,
            keyNumberValue: j.keyNumberValue ?? null,
            wrongIf: j.wrongIf,
            metric: j.metric ?? null,
            trigger: j.trigger ?? null,
            tolerance: j.tolerance ?? null,
            source: j.source ?? null,
            freq: j.freq ?? null,
            publishedAt: now,
          })
          .onConflictDoNothing();
      } catch (err) {
        console.error(
          `[ledger] auto-insert failed report=${opts.reportId} ticker=${opts.ticker}:`,
          err,
        );
      }
    }
  } catch (err) {
    console.error(
      `[ledger] auto-insert parse/init failed report=${opts.reportId}:`,
      err,
    );
  }
}

export const reportRoute = new Hono();

const openaiProvider = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const deepseekProvider = createOpenAI({
  apiKey: env.DEEPSEEK_API_KEY || env.LLM_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

const FREE_REPORT_MONTHLY_LIMIT = 3;
const REPORT_MAX_OUTPUT_TOKENS = 2600;
const COMMITTEE_MAX_OUTPUT_TOKENS = 4600;

const PRO_PLAN_VARIANTS: string[] =
  billingConfig.plans
    .find((p: { id: string }) => p.id === BillingPlan.PRO)
    ?.variants.map((v: { id: string }) => v.id) ?? [];

const BUSINESS_PLAN_VARIANTS: string[] =
  billingConfig.plans
    .find((p: { id: string }) => p.id === BillingPlan.BUSINESS)
    ?.variants.map((v: { id: string }) => v.id) ?? [];

const PAID_VARIANTS = new Set([
  ...PRO_PLAN_VARIANTS,
  ...BUSINESS_PLAN_VARIANTS,
]);

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
    : deepseekProvider.chat("deepseek-chat");
};

const getReportModelName = () =>
  env.OPENAI_API_KEY ? "gpt-4o-mini" : "deepseek-chat";

const fmt = (n: number | null | undefined, decimals = 1) =>
  n == null || n === 0 ? "N/A" : n.toFixed(decimals);

const fmtB = (n: number) => {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
};

const reportMonitorSchema = z.object({
  metric: z.string().min(1),
  current: z.string().min(1),
  trigger: z.string().min(1),
  tolerance: z.string().optional(),
  freq: z.enum(["Daily", "Weekly", "Quarterly", "Event-driven"]),
  source: z.string().min(1),
});

const reportMonitorPanelSchema = z.object({
  schema_version: z.literal(1),
  monitors: z.array(reportMonitorSchema).min(3).max(6),
});

const financeReportOutputSchema = z
  .object({
    thesisQuality: z.object({
      tier: z.enum(["S", "A", "B", "C", "D", "F"]),
      rationale: z.string().min(1),
      disclaimer: z.string().min(1),
    }),
    topJudgments: z
      .array(
        z.object({
          judgment: z.string().min(1),
          keyNumber: z.string().regex(/\d/),
          wrongIf: z.string().regex(/\d/),
        }),
      )
      .length(3),
    monitorPanel: reportMonitorPanelSchema,
  })
  .passthrough();

const committeeReportOutputSchema = z
  .object({
    verdict: z.enum(["Investigate", "Watch", "Defer"]),
    topJudgments: z
      .array(
        z.object({
          numeral: z.enum(["I", "II", "III"]),
          judgment: z.string().min(1),
          keyNumber: z.string().regex(/\d/),
          wrongIf: z.string().regex(/\d/),
        }),
      )
      .length(3),
    lenses: z.array(z.object({ id: z.string() }).passthrough()).length(6),
    thesisBreakers: z
      .array(z.object({ condition: z.string() }).passthrough())
      .min(2)
      .max(4),
    monitorPanel: z.object({
      schema_version: z.literal(1),
      monitors: z
        .array(
          reportMonitorSchema.extend({
            sourceIds: z.array(z.string()).optional(),
          }),
        )
        .min(3)
        .max(6),
    }),
    convictionTier: z.object({
      tier: z.enum(["S", "A", "B", "C", "D", "F"]),
      definition: z.string().min(1),
      why: z.string().min(1),
    }),
  })
  .passthrough();

const prohibitedOutputPattern =
  /\b(target price|price target|buy rating|sell rating|strong buy|strong sell|buy-hold-sell|position sizing|portfolio weights?|entry levels?|stop levels?)\b/i;

const parseGeneratedJson = (text: string) => {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("No JSON object found in model output.");
  }

  return JSON.parse(clean.slice(start, end + 1));
};

const validateGeneratedJson = (
  text: string,
  schema: z.ZodType,
  label: string,
) => {
  if (prohibitedOutputPattern.test(text)) {
    throw new Error(`${label} output crossed the compliance redline.`);
  }

  const parsed = parseGeneratedJson(text);
  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`${label} output schema failed: ${result.error.message}`);
  }
};

const generateValidatedJson = async ({
  model,
  system,
  prompt,
  temperature,
  maxOutputTokens,
  schema,
  label,
  fallbackText,
}: {
  model: ReturnType<typeof getReportModelConfig>;
  system: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  schema: z.ZodType;
  label: string;
  fallbackText: string;
}) => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await generateText({
      model,
      system,
      prompt:
        attempt === 0
          ? prompt
          : `${prompt}

The previous output failed validation. Return corrected strict JSON only. Keep schema_version = 1, include numeric top judgments, and remove any target-price, rating, sizing, entry-level, or stop-level language.`,
      temperature,
      maxOutputTokens,
    });

    try {
      validateGeneratedJson(result.text, schema, label);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  console.error(`[report] ${label} output validation failed`, lastError);

  return {
    text: fallbackText,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
  };
};

// ─── GET /api/report/financials/:ticker ──────────────────────────────────────
// Proxy Yahoo Finance data — keeps API calls server-side, hides user-agent tricks
reportRoute.get(
  "/financials/:ticker",
  zValidator("param", z.object({ ticker: z.string().min(1).max(10) })),
  async (c) => {
    const { ticker } = c.req.valid("param");

    try {
      const metrics = await cachedFetchYahooFinance(ticker.toUpperCase());
      return c.json({ ok: true, data: metrics });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ ok: false, error: message }, 422);
    }
  },
);

// ─── GET /api/report/resolve/:query ──────────────────────────────────────────
// Resolve user input to exactly one listed entity before any AI analysis runs.
reportRoute.get(
  "/resolve/:query",
  zValidator("param", z.object({ query: z.string().min(1).max(120) })),
  async (c) => {
    const { query } = c.req.valid("param");
    const resolution = await cachedResolveEntity(query);

    return c.json(resolution, resolution.ok ? 200 : 422);
  },
);

// ─── GET /api/report/technicals/:ticker ──────────────────────────────────────
// Deterministic technical indicators. AI may interpret these numbers, not make
// them up.
reportRoute.get(
  "/technicals/:ticker",
  zValidator("param", z.object({ ticker: z.string().min(1).max(15) })),
  async (c) => {
    const { ticker } = c.req.valid("param");
    const resolution = await cachedResolveEntity(ticker);

    if (!resolution.ok) {
      return c.json(
        {
          ok: false,
          error: resolution.message,
          resolution,
        },
        422,
      );
    }

    try {
      const metrics = await cachedFetchTechnicalMetrics(resolution.ticker);
      return c.json({ ok: true, entity: resolution, data: metrics });
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
  language: z.enum(["zh", "en"]).default("en"),
  mode: z
    .enum(["snapshot", "earnings", "competition", "risk", "poc"])
    .default("snapshot"),
});

reportRoute.post(
  "/finance/generate",
  zValidator("json", generateSchema),
  async (c) => {
    // Auth check: require login
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user ?? null;

    if (!user) {
      throw new HTTPException(401, { message: "Authentication required." });
    }

    // Subscription check: free users are limited to 3 reports/month
    let isPaidUser = false;
    try {
      const customers = await getCustomersWithPurchasesByReferenceId(user.id);
      for (const customer of customers) {
        for (const sub of customer.subscriptions) {
          if (
            ACTIVE_SUBSCRIPTION_STATUSES.includes(sub.status as never) &&
            PAID_VARIANTS.has(sub.variantId)
          ) {
            isPaidUser = true;
            break;
          }
        }
        if (isPaidUser) break;
      }
    } catch {
      // Treat as free on billing lookup failure
    }

    if (!isPaidUser) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      let reportCount: number | null = null;
      try {
        const countResult = await db
          .select({ value: count() })
          .from(aiUsageLog)
          .where(
            and(
              eq(aiUsageLog.userId, user.id),
              eq(aiUsageLog.feature, "report"),
              gte(aiUsageLog.createdAt, monthStart),
            ),
          );
        reportCount = countResult[0]?.value ?? 0;
      } catch {
        // Usage tracking activates after the ai_usage_log migration is applied.
      }

      if (reportCount !== null && reportCount >= FREE_REPORT_MONTHLY_LIMIT) {
        throw new HTTPException(429, {
          message: `Free plan limit reached (${FREE_REPORT_MONTHLY_LIMIT} reports/month). Upgrade to Pro for unlimited reports.`,
        });
      }
    }

    const { ticker, metrics: m, mode } = c.req.valid("json");
    const symbol = ticker.toUpperCase();
    const model = getReportModelConfig();
    const imaKnowledge = await searchImaKnowledge(symbol, {
      limit: 6,
      market: symbol.match(/^\d{6}$/) ? "a-stocks" : "us-stocks",
    });
    const imaKnowledgeContext = formatImaKnowledgeForPrompt(imaKnowledge);

    const hasFundamentals =
      m.revenue > 0 ||
      m.marketCap > 0 ||
      m.grossMargin > 0 ||
      m.eps !== 0 ||
      m.revenueHistory.length > 0;

    const systemPrompt = `You are a professional equity research analyst. Write institutional-quality research reports.
Style: data-driven (cite actual figures), balanced bull/bear, professional yet readable.
Use a solution-consulting workflow: decision brief first, then scenarios, role-based takeaways, monitorable metrics, and next actions.
Output strict JSON only — no markdown fences.`;

    const modeLabel = {
      snapshot:
        "Investment snapshot: decide in 3 minutes whether the stock deserves deeper work",
      earnings:
        "Earnings review: focus on growth quality, margins, cash flow, and execution",
      competition:
        "Competitive landscape: moat, substitution risk, pricing power, and industry position",
      risk: "Risk scan: valuation, balance sheet, cash flow, cyclicality, and crowded narrative risk",
      poc: "Tracking plan: convert the thesis into 30-90 day measurable validation points",
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

## Relevant ima Knowledge Base Evidence
Use these snippets as supporting context when relevant. Cite the Source path in catalysts, risks, or evidence fields when you use a claim.
${imaKnowledgeContext || "No matching ima knowledge excerpts found."}

Return ONLY this JSON structure (all text in English):
{
  "thesisQuality": {
    "tier": "S" | "A" | "B" | "C" | "D" | "F",
    "rationale": "<one sentence on evidence completeness and logical closure>",
    "disclaimer": "Thesis quality scores evidence completeness only; it is not transaction advice."
  },
  "topJudgments": [
    {
      "judgment": "<one falsifiable thesis sentence>",
      "keyNumber": "<numeric anchor>",
      "wrongIf": "<numeric condition that invalidates this judgment>"
    }
  ],
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
    "action": "<one clear action: start research / wait / defer / monitor>",
    "confidence": "Low" | "Medium" | "High",
    "timeHorizon": "<time horizon>",
    "keyQuestion": "<the one question that decides whether the thesis works>"
  },
  "scenarioMatrix": [
    {
      "scenario": "Bull",
      "probability": <number 0-100>,
      "keyMetric": "<numeric validation metric, not a price target>",
      "drivers": ["<driver 1>", "<driver 2>"]
    },
    {
      "scenario": "Base",
      "probability": <number 0-100>,
      "keyMetric": "<numeric validation metric, not a price target>",
      "drivers": ["<driver 1>", "<driver 2>"]
    },
    {
      "scenario": "Bear",
      "probability": <number 0-100>,
      "keyMetric": "<numeric validation metric, not a price target>",
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
  "monitorPanel": {
    "schema_version": 1,
    "monitors": [
      {
        "metric": "<metric to monitor>",
        "current": "<current value from data or N/A>",
        "trigger": "<numeric trigger line>",
        "tolerance": "<optional tolerance band or empty string>",
        "freq": "Daily" | "Weekly" | "Quarterly" | "Event-driven",
        "source": "<data source>"
      }
    ]
  },
  "nextSteps": ["<concrete next action 1>", "<concrete next action 2>", "<concrete next action 3>"],
  "evidenceNeeds": ["<source or evidence needed to verify claim 1>", "<source or evidence needed to verify claim 2>"]
}

Hard rules:
- Include exactly three topJudgments. Every judgment must have a numeric keyNumber and a numeric wrongIf condition.
- Include monitorPanel.schema_version = 1 and 3-6 monitorPanel.monitors rows. These rows are consumed by watchlist monitors and morning-brief checks.
- Do not output target prices, buy/sell ratings, entry levels, stop levels, portfolio weights, or position sizing.
- Conviction/thesis tier evaluates evidence quality only, not whether the user should transact.
`;

    const fallbackText = JSON.stringify({
      thesisQuality: {
        tier: "D",
        rationale:
          "The generated report failed the output contract, so only a degraded validation shell is shown.",
        disclaimer:
          "Thesis quality scores evidence completeness only; it is not transaction advice.",
      },
      topJudgments: [
        {
          judgment: "Full fundamentals were not safely validated for this run.",
          keyNumber: "1 validation failure",
          wrongIf: "0 validation failures on rerun",
        },
        {
          judgment:
            "The monitor panel was preserved as a minimal schema-v1 shell.",
          keyNumber: "schema_version 1",
          wrongIf: "schema_version differs from 1",
        },
        {
          judgment:
            "The report should be rerun before using this output for research workflow decisions.",
          keyNumber: "1 rerun required",
          wrongIf: "rerun returns 3 validated judgments",
        },
      ],
      investmentThesis:
        "This degraded report means the model output did not satisfy the report contract.",
      sections: {
        overview:
          "Rerun the report to obtain a fully validated evidence-backed analysis.",
        growthDrivers: "Unavailable in degraded mode.",
        profitability: "Unavailable in degraded mode.",
        risks: ["Model output failed validation."],
        valuation: "Unavailable in degraded mode.",
        catalysts: "Unavailable in degraded mode.",
      },
      decisionBrief: {
        action: "defer",
        confidence: "Low",
        timeHorizon: "Rerun required",
        keyQuestion: "Can the model produce a schema-valid report on retry?",
      },
      monitorPanel: {
        schema_version: 1,
        monitors: [
          {
            metric: "Report validation status",
            current: "Failed",
            trigger: "Pass",
            tolerance: "",
            freq: "Event-driven",
            source: "AIResearch output validator",
          },
          {
            metric: "Top judgment count",
            current: "0 validated",
            trigger: "3 validated",
            tolerance: "",
            freq: "Event-driven",
            source: "AIResearch output validator",
          },
          {
            metric: "Monitor schema version",
            current: "1",
            trigger: "1",
            tolerance: "exact",
            freq: "Event-driven",
            source: "AIResearch output validator",
          },
        ],
      },
      nextSteps: ["Rerun the report", "Check model logs"],
      evidenceNeeds: ["Validated model output"],
    });

    return stream(c, async (s) => {
      const result = await generateValidatedJson({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
        maxOutputTokens: REPORT_MAX_OUTPUT_TOKENS,
        schema: financeReportOutputSchema,
        label: "finance report",
        fallbackText,
      });

      await s.write(result.text);

      // Log usage after stream completes (best-effort)
      try {
        const usage = result.usage;
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;
        await db.insert(aiUsageLog).values({
          userId: user.id,
          feature: "report",
          model: getReportModelName(),
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        });
      } catch {
        // ignore logging failures
      }

      // ── L3 Ledger auto-insert: log topJudgments ──────────────────────
      const reportId1 = `rpt-${symbol}-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
      await autoInsertLedgerJudgments({
        userId: user.id,
        reportId: reportId1,
        ticker: symbol,
        companyName: m.companyName,
        rawJson: result.text,
      });
    });
  },
);

// ─── POST /api/report/committee/generate ────────────────────────────────────
// Runs six named analytical frameworks without impersonating real investors.
const committeeSchema = z.object({
  ticker: z.string().min(1).max(10),
  metrics: z.custom<FinancialMetrics>(),
});

reportRoute.post(
  "/committee/generate",
  zValidator("json", committeeSchema),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user ?? null;

    if (!user) {
      throw new HTTPException(401, { message: "Authentication required." });
    }

    let isPaidUser = false;
    try {
      const customers = await getCustomersWithPurchasesByReferenceId(user.id);
      for (const customer of customers) {
        for (const subscription of customer.subscriptions) {
          if (
            ACTIVE_SUBSCRIPTION_STATUSES.includes(
              subscription.status as never,
            ) &&
            PAID_VARIANTS.has(subscription.variantId)
          ) {
            isPaidUser = true;
            break;
          }
        }
        if (isPaidUser) break;
      }
    } catch {
      // Treat billing lookup failures as free access.
    }

    if (!isPaidUser) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      try {
        const countResult = await db
          .select({ value: count() })
          .from(aiUsageLog)
          .where(
            and(
              eq(aiUsageLog.userId, user.id),
              eq(aiUsageLog.feature, "report"),
              gte(aiUsageLog.createdAt, monthStart),
            ),
          );

        if ((countResult[0]?.value ?? 0) >= FREE_REPORT_MONTHLY_LIMIT) {
          throw new HTTPException(429, {
            message: `Free plan limit reached (${FREE_REPORT_MONTHLY_LIMIT} reports/month). Upgrade to Pro for unlimited reports.`,
          });
        }
      } catch (error) {
        if (error instanceof HTTPException) throw error;
        // Usage tracking activates after the migration is applied.
      }
    }

    const { ticker, metrics: m } = c.req.valid("json");
    const symbol = ticker.toUpperCase();
    const model = getReportModelConfig();
    const imaKnowledge = await searchImaKnowledge(symbol, {
      limit: 10,
      market: symbol.match(/^\d{6}$/) ? "a-stocks" : "us-stocks",
    });
    const sourceCatalog = [
      {
        id: "S1",
        title: `${m.companyName} market and financial data`,
        date: new Date().toISOString().slice(0, 10),
        publisher: "Yahoo Finance",
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`,
        excerpt: `Price ${fmt(m.currentPrice, 2)}; market cap ${fmtB(m.marketCap)}; revenue growth ${fmt(m.revenueGrowthYoy)}%; gross margin ${fmt(m.grossMargin)}%; free cash flow ${fmtB(m.freeCashFlow)}.`,
      },
      ...imaKnowledge.map((hit, index) => ({
        id: `S${index + 2}`,
        title: hit.title,
        date: hit.date ?? "unknown",
        publisher: `IMA ${hit.category}`,
        url: hit.sourceUrl,
        excerpt: hit.excerpt,
      })),
    ];

    const sourceContext = sourceCatalog
      .map(
        (source) =>
          `[${source.id}] ${source.title}\nDate: ${source.date}; Publisher: ${source.publisher}; URL: ${source.url ?? "local archive only"}\nExcerpt: ${source.excerpt}`,
      )
      .join("\n\n");

    const systemPrompt = `You are the chair of an evidence-led investment committee.
You do not impersonate investors or attribute claims to famous people. You apply six generic analytical frameworks: Value, Growth, Macro, Trend, Quant, and Skeptic.
Separate observed facts from inferences and opinions. Cite only source IDs supplied by the user. Never invent a URL, filing, metric, or quotation.
Return strict JSON only, with no markdown fences. This is decision support, not financial advice.`;

    const userPrompt = `Conduct an Investment Committee review of ${m.companyName} (${symbol}).

CURRENT DATA
- Price: $${fmt(m.currentPrice, 2)}; Market cap: ${fmtB(m.marketCap)}
- Revenue growth YoY: ${fmt(m.revenueGrowthYoy)}%; Gross margin: ${fmt(m.grossMargin)}%; Operating margin: ${fmt(m.operatingMargin)}%; Net margin: ${fmt(m.netMargin)}%
- EPS: $${fmt(m.eps, 2)}; Free cash flow: ${fmtB(m.freeCashFlow)}; FCF margin: ${fmt(m.fcfMargin)}%
- Cash: ${fmtB(m.totalCash)}; Debt: ${fmtB(m.totalDebt)}; Net cash: ${fmtB(m.netCash)}
- P/E: ${fmt(m.peRatio)}x; Forward P/E: ${fmt(m.forwardPE)}x; P/S: ${fmt(m.psRatio)}x; EV/EBITDA: ${fmt(m.evEbitda)}x
- Sector / Industry: ${m.sector || "N/A"} / ${m.industry || "N/A"}
- Company description: ${m.description?.slice(0, 500) || "N/A"}

SOURCE CATALOG
${sourceContext}

Return exactly this structure in English:
{
  "verdict": "Investigate" | "Watch" | "Avoid",
  "stance": "Bullish" | "Mixed" | "Bearish",
  "confidence": <number 0-100>,
  "dataAsOf": "<YYYY-MM-DD>",
  "oneLineDecision": "<direct decision statement>",
  "keyQuestion": "<single question that determines the thesis>",
  "topJudgments": [
    {
      "numeral": "I" | "II" | "III",
      "judgment": "<one falsifiable thesis sentence>",
      "keyNumber": "<the numeric value that anchors the judgment>",
      "evidence": "<short source-backed support>",
      "wrongIf": "<observable numeric condition that would invalidate this judgment>",
      "sourceIds": ["S1"]
    }
  ],
  "bullCase": ["<claim>", "<claim>", "<claim>"],
  "bearCase": ["<claim>", "<claim>", "<claim>"],
  "lenses": [
    {
      "id": "value" | "growth" | "macro" | "trend" | "quant" | "skeptic",
      "label": "Value" | "Growth" | "Macro" | "Trend" | "Quant" | "Skeptic",
      "stance": "Positive" | "Neutral" | "Negative",
      "confidence": <number 0-100>,
      "summary": "<framework conclusion>",
      "observations": [
        { "text": "<claim>", "kind": "Fact" | "Inference" | "View", "sourceIds": ["S1"] }
      ],
      "numericConclusion": "<one lens-level conclusion anchored to a number>",
      "howToReadThisNumber": "<source, measurement basis, timestamp, and known blind spot in one sentence>",
      "whatChangesTheView": "<specific falsifiable numeric condition>"
    }
  ],
  "consensus": ["<shared conclusion>"],
  "divergences": [
    { "topic": "<disputed issue>", "supportingLenses": ["Value"], "opposingLenses": ["Growth"], "why": "<reason for disagreement>" }
  ],
  "thesisBreakers": [
    { "condition": "<observable invalidation condition>", "metric": "<metric>", "threshold": "<threshold>", "sourceIds": ["S1"] }
  ],
  "monitorPanel": {
    "schema_version": 1,
    "monitors": [
      {
        "metric": "<metric to monitor>",
        "current": "<current value or N/A>",
        "trigger": "<numeric trigger line>",
        "tolerance": "<optional tolerance band or empty string>",
        "freq": "Daily" | "Weekly" | "Quarterly" | "Event-driven",
        "source": "<data source>",
        "sourceIds": ["S1"]
      }
    ]
  },
  "convictionTier": {
    "tier": "S" | "A" | "B" | "C" | "D" | "F",
    "definition": "Thesis quality score only — evidence completeness and logical closure, not a buy/sell/position-size recommendation.",
    "why": "<one sentence explaining the evidence quality>"
  },
  "investorFit": [
    { "profile": "<investor type>", "fit": "Good" | "Conditional" | "Poor", "reason": "<reason>" }
  ],
  "evidence": [
    { "id": "S1", "title": "<exact supplied title>", "publisher": "<publisher>", "date": "<date>", "url": "<exact supplied URL or empty string>", "supports": "<claim supported>", "quality": "Primary" | "Secondary" | "Archive" }
  ],
  "limitations": ["<missing data or analytical limitation>"]
}

Requirements:
- Include all six lenses exactly once.
- Include exactly three topJudgments. Every top judgment must contain a numeric keyNumber and numeric wrongIf condition. If no reliable number exists, do not include that judgment; replace it with a weaker but quantified judgment.
- Facts must cite at least one supplied source ID. Inferences and views may cite supporting IDs but must stay labeled.
- Evidence entries must reproduce only supplied source metadata and URLs.
- For every lens, include numericConclusion and howToReadThisNumber. The "how to read" sentence must name source, basis, timestamp/date, and known blind spot.
- Include 2-4 thesisBreakers. These replace any "avoid list" concept: they are invalidation conditions, not recommendations.
- Include monitorPanel.schema_version = 1 and 3-6 monitorPanel.monitors rows. Use this schema exactly because it will feed watchlist monitors and morning-brief checks.
- Trend and Quant must explicitly say when price history or statistical evidence is insufficient.
- Skeptic must present the strongest good-faith counterargument and a falsifiable condition.
- Conviction tier evaluates thesis quality only. It must never imply whether the user should buy, sell, hold, size, or allocate.
- Do not output target prices, buy/sell ratings, entry levels, stop levels, portfolio weights, or position sizing.
- Do not issue a personalized buy or sell instruction.`;

    const fallbackText = JSON.stringify({
      verdict: "Defer",
      stance: "Mixed",
      confidence: 0,
      dataAsOf: new Date().toISOString().slice(0, 10),
      oneLineDecision:
        "The generated Decision Lab report failed validation and should be rerun.",
      keyQuestion: "Can the report pass schema and compliance validation?",
      topJudgments: [
        {
          numeral: "I",
          judgment: "The Decision Lab output failed validation.",
          keyNumber: "1 validation failure",
          evidence: "Server-side output validator returned a failure.",
          wrongIf: "0 validation failures on rerun",
          sourceIds: ["S1"],
        },
        {
          numeral: "II",
          judgment: "The monitor panel remains on schema version 1.",
          keyNumber: "schema_version 1",
          evidence: "Fallback report emits a schema-v1 monitor panel.",
          wrongIf: "schema_version differs from 1",
          sourceIds: ["S1"],
        },
        {
          numeral: "III",
          judgment: "A full report requires all six lenses to validate.",
          keyNumber: "6 lenses required",
          evidence: "Decision Lab output contract requires six lenses.",
          wrongIf: "fewer than 6 lenses validate",
          sourceIds: ["S1"],
        },
      ],
      bullCase: ["Unavailable in degraded mode."],
      bearCase: ["Model output failed validation."],
      lenses: ["value", "growth", "macro", "trend", "quant", "skeptic"].map(
        (id) => ({
          id,
          label: id,
          stance: "Neutral",
          confidence: 0,
          summary: "Unavailable in degraded mode.",
          observations: [
            {
              text: "Model output failed validation.",
              kind: "Fact",
              sourceIds: ["S1"],
            },
          ],
          numericConclusion: "0 validated observations",
          howToReadThisNumber:
            "Source is the AIResearch output validator; basis is schema validation; timestamp is this request; blind spot is missing model reasoning.",
          whatChangesTheView: "Rerun produces schema-valid output.",
        }),
      ),
      consensus: ["Rerun required."],
      divergences: [],
      thesisBreakers: [
        {
          condition: "Output validator fails again.",
          metric: "Validation failures",
          threshold: "> 0",
          sourceIds: ["S1"],
        },
        {
          condition: "Monitor schema version changes.",
          metric: "schema_version",
          threshold: "not 1",
          sourceIds: ["S1"],
        },
      ],
      monitorPanel: {
        schema_version: 1,
        monitors: [
          {
            metric: "Decision Lab validation status",
            current: "Failed",
            trigger: "Pass",
            tolerance: "",
            freq: "Event-driven",
            source: "AIResearch output validator",
            sourceIds: ["S1"],
          },
          {
            metric: "Validated lens count",
            current: "0",
            trigger: "6",
            tolerance: "exact",
            freq: "Event-driven",
            source: "AIResearch output validator",
            sourceIds: ["S1"],
          },
          {
            metric: "Top judgment count",
            current: "0 validated",
            trigger: "3 validated",
            tolerance: "exact",
            freq: "Event-driven",
            source: "AIResearch output validator",
            sourceIds: ["S1"],
          },
        ],
      },
      convictionTier: {
        tier: "D",
        definition:
          "Thesis quality score only: evidence completeness and logical closure.",
        why: "The generated output did not satisfy the report contract.",
      },
      investorFit: [],
      evidence: [
        {
          id: "S1",
          title: "AIResearch output validator",
          publisher: "AIResearch",
          date: new Date().toISOString().slice(0, 10),
          url: "",
          supports: "The generated report failed validation.",
          quality: "Primary",
        },
      ],
      limitations: ["Degraded fallback report; rerun required."],
    });

    return stream(c, async (s) => {
      const result = await generateValidatedJson({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
        maxOutputTokens: COMMITTEE_MAX_OUTPUT_TOKENS,
        schema: committeeReportOutputSchema,
        label: "Decision Lab report",
        fallbackText,
      });

      await s.write(result.text);

      try {
        const usage = result.usage;
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;
        await db.insert(aiUsageLog).values({
          userId: user.id,
          feature: "report",
          model: getReportModelName(),
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        });
      } catch {
        // Ignore best-effort usage logging failures.
      }

      // ── L3 Ledger auto-insert: log topJudgments ──────────────────────
      const reportId2 = `rpt-${symbol}-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
      await autoInsertLedgerJudgments({
        userId: user.id,
        reportId: reportId2,
        ticker: symbol,
        companyName: m.companyName,
        rawJson: result.text,
      });
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
    const resolution = await cachedResolveEntity(ticker);
    if (!resolution.ok) return c.json({ valid: false });

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
      return c.json({
        valid: true,
        name: meta?.longName ?? meta?.shortName ?? resolution.companyName,
        price: meta?.regularMarketPrice ?? resolution.price,
      });
    } catch {
      return c.json({
        valid: true,
        name: resolution.companyName,
        price: resolution.price,
      });
    }
  },
);
