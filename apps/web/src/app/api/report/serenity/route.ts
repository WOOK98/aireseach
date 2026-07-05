import { NextResponse } from "next/server";

import { auth } from "@workspace/auth/server";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  BillingPlan,
  config as billingConfig,
} from "@workspace/billing";
import { getCustomersWithPurchasesByReferenceId } from "@workspace/billing/server";

const REPORT_AGENT_URL =
  process.env.REPORT_AGENT_URL || "http://localhost:8000";
const PLATFORM_API_KEY =
  process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || "";

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

const getErrorDetail = (data: unknown) => {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return null;
};

type EntityResolution =
  | {
      ok: true;
      ticker: string;
      companyName: string;
      exchange: string;
      entityLock: string;
    }
  | {
      ok: false;
      mode: "clarify" | "industry";
      message: string;
      candidates?: Array<{
        ticker: string;
        companyName: string;
        exchange: string;
        quoteType: string;
      }>;
    };

type TechnicalResponse =
  | {
      ok: true;
      data: {
        asOf: string;
        ticker: string;
        currency: string;
        close: number;
        sma20: number | null;
        sma50: number | null;
        sma200: number | null;
        rsi14: number | null;
        macd: {
          value: number | null;
          signal: number | null;
          histogram: number | null;
          trend: string;
        };
        levels: {
          support: number[];
          resistance: number[];
        };
        week52: {
          low: number;
          high: number;
          percentFromHigh: number;
        };
        volume: {
          latest: number;
          average20: number | null;
          ratio20: number | null;
        };
      };
    }
  | {
      ok: false;
      error: string;
    };

const formatNumber = (value: number | null | undefined) =>
  value == null ? "N/A" : String(value);

const formatTechnicalLock = (
  response: Extract<TechnicalResponse, { ok: true }>,
) => {
  const metrics = response.data;

  return [
    "TECHNICAL DATA LOCK",
    `As of: ${metrics.asOf}`,
    `Ticker: ${metrics.ticker}`,
    `Close: ${metrics.currency} ${formatNumber(metrics.close)}`,
    `SMA20/SMA50/SMA200: ${formatNumber(metrics.sma20)} / ${formatNumber(metrics.sma50)} / ${formatNumber(metrics.sma200)}`,
    `RSI14: ${formatNumber(metrics.rsi14)}`,
    `MACD: value ${formatNumber(metrics.macd.value)}, signal ${formatNumber(metrics.macd.signal)}, histogram ${formatNumber(metrics.macd.histogram)} (${metrics.macd.trend})`,
    `Support: ${metrics.levels.support.join(", ") || "N/A"}`,
    `Resistance: ${metrics.levels.resistance.join(", ") || "N/A"}`,
    `52-week range: ${formatNumber(metrics.week52.low)} - ${formatNumber(metrics.week52.high)} (${metrics.week52.percentFromHigh}% from high)`,
    `Volume: ${metrics.volume.latest}; 20-day average ${formatNumber(metrics.volume.average20)}; ratio ${formatNumber(metrics.volume.ratio20)}`,
    "Use only these technical numbers. Do not invent entry prices, stop losses, support/resistance, RSI, MACD, or chart patterns. If the supplied data is insufficient for a claim, say so.",
  ].join("\n");
};

const isTechnicalSkill = (body: Record<string, unknown>) => {
  const skillId = typeof body.skill_id === "string" ? body.skill_id : "";
  const prompt = typeof body.skill_prompt === "string" ? body.skill_prompt : "";

  return (
    skillId.toLowerCase() === "technical" ||
    /\b(RSI|MACD|support|resistance|technical analyst)\b/i.test(prompt)
  );
};

const fetchJson = async <T>(url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as T | null;

  return { response, data };
};

async function getUserPlan(
  headers: Headers,
): Promise<"free" | "pro" | "business"> {
  try {
    const session = await auth.api.getSession({ headers });
    if (!session?.user?.id) return "free";

    const customers = await getCustomersWithPurchasesByReferenceId(
      session.user.id,
    );

    for (const customer of customers) {
      for (const subscription of customer.subscriptions) {
        if (
          ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status as never) &&
          PAID_VARIANTS.has(subscription.variantId)
        ) {
          if (BUSINESS_PLAN_VARIANTS.includes(subscription.variantId)) {
            return "business";
          }
          if (PRO_PLAN_VARIANTS.includes(subscription.variantId)) return "pro";
        }
      }
    }
  } catch {
    return "free";
  }

  return "free";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const origin = new URL(request.url).origin;
    const input = typeof body.ticker === "string" ? body.ticker.trim() : "";

    if (!input) {
      return NextResponse.json(
        { detail: "Enter a listed ticker or a clear company name." },
        { status: 400 },
      );
    }

    const resolutionResult = await fetchJson<EntityResolution>(
      `${origin}/api/report/resolve/${encodeURIComponent(input)}`,
    );
    const resolution = resolutionResult.data;

    if (!resolutionResult.response.ok || !resolution?.ok) {
      const detail =
        resolution && !resolution.ok
          ? resolution.message
          : "Unable to resolve the requested ticker.";

      return NextResponse.json(
        {
          detail,
          resolution,
        },
        { status: 422 },
      );
    }

    body.ticker = resolution.ticker;
    body.company_name = resolution.companyName;
    body.entity_lock = resolution.entityLock;

    const promptLocks = [resolution.entityLock];

    if (isTechnicalSkill(body)) {
      const technicalResult = await fetchJson<TechnicalResponse>(
        `${origin}/api/report/technicals/${encodeURIComponent(resolution.ticker)}`,
      );
      const technical = technicalResult.data;

      if (!technicalResult.response.ok || !technical?.ok) {
        return NextResponse.json(
          {
            detail:
              technical && !technical.ok
                ? technical.error
                : "Technicals: insufficient data — section withheld.",
          },
          { status: 422 },
        );
      }

      promptLocks.push(formatTechnicalLock(technical));
    }

    if (typeof body.skill_prompt === "string") {
      body.skill_prompt = `${promptLocks.join("\n\n")}\n\n${body.skill_prompt}`;
    }

    const userPlan = await getUserPlan(request.headers);

    if (userPlan === "free" && !body.api_key) {
      return NextResponse.json(
        {
          detail:
            "No API key provided. Please enter your own key or upgrade to Pro.",
        },
        { status: 400 },
      );
    }

    if (userPlan !== "free" && !body.api_key) {
      if (!PLATFORM_API_KEY) {
        return NextResponse.json(
          {
            detail:
              "Hosted model key is not configured. Enter your own API key and try again.",
          },
          { status: 500 },
        );
      }

      body.api_key = PLATFORM_API_KEY;
      body.base_url = "https://api.deepseek.com/v1";
      body.model = "deepseek-chat";
    }

    const response = await fetch(`${REPORT_AGENT_URL}/api/analyze_serenity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        {
          detail:
            getErrorDetail(errorData) ||
            `Serenity analysis error: ${response.status}`,
        },
        { status: response.status },
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Serenity analysis error:", error);
    return NextResponse.json(
      {
        detail:
          "Unable to connect to the report agent. Check that the report-agent service is running.",
      },
      { status: 502 },
    );
  }
}
