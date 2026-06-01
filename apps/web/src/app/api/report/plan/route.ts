import { NextResponse } from "next/server";

import { auth } from "@workspace/auth/server";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  BillingPlan,
  config as billingConfig,
} from "@workspace/billing";
import { getCustomersWithPurchasesByReferenceId } from "@workspace/billing/server";

const PRO_VARIANTS: string[] =
  billingConfig.plans
    .find((p: { id: string }) => p.id === BillingPlan.PRO)
    ?.variants.map((v: { id: string }) => v.id) ?? [];

const BUSINESS_VARIANTS: string[] =
  billingConfig.plans
    .find((p: { id: string }) => p.id === BillingPlan.BUSINESS)
    ?.variants.map((v: { id: string }) => v.id) ?? [];

const PAID_VARIANTS = new Set([...PRO_VARIANTS, ...BUSINESS_VARIANTS]);

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ plan: "free" });
    }

    const customers = await getCustomersWithPurchasesByReferenceId(
      session.user.id,
    );

    for (const c of customers) {
      for (const sub of c.subscriptions) {
        if (
          ACTIVE_SUBSCRIPTION_STATUSES.includes(sub.status as any) &&
          PAID_VARIANTS.has(sub.variantId)
        ) {
          const plan = BUSINESS_VARIANTS.includes(sub.variantId)
            ? "business"
            : "pro";
          return NextResponse.json({ plan });
        }
      }
    }

    return NextResponse.json({ plan: "free" });
  } catch {
    return NextResponse.json({ plan: "free" });
  }
}
