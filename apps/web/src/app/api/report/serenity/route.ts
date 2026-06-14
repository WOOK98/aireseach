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
