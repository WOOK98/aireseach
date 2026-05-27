import { config } from "../config";
import {
  BillingPlan,
  BillingType,
  BillingReference,
  PaymentStatus,
} from "../types";
import { isSubscriptionActive } from "./subscription";

import type {
  BillingModel,
  RecurringInterval,
  SubscriptionStatus,
} from "../types";

export const findPlanByVariantId = (variantId: string) => {
  const plan = config.plans.find((plan) =>
    plan.variants.some((variant) => variant.id === variantId),
  );

  const variant = plan?.variants.find((variant) => variant.id === variantId);

  return {
    plan,
    variant,
  };
};

export const findPlanById = (id: string) => {
  return config.plans.find((plan) => plan.id === id);
};

export const findPlanIndexById = (id: string) => {
  return config.plans.findIndex((plan) => plan.id === id);
};

export const findVariantById = (id: string) => {
  return config.plans
    .flatMap((plan) => plan.variants)
    .find((variant) => variant.id === id);
};

export const getPlanFeatures = (id: string) => {
  const index = config.plans.findIndex((plan) => plan.id === id);
  if (index === -1) {
    return [];
  }
  return Array.from(
    new Set(config.plans.slice(0, index + 1).flatMap((p) => p.features)),
  );
};

export const getActivePlan = <
  Entitlement extends { id: string; active: boolean; variantId?: string },
  Subscription extends { status: SubscriptionStatus; variantId: string },
  Order extends { status: PaymentStatus; variantId: string },
  Summary extends {
    entitlements?: Entitlement[];
    subscriptions?: Subscription[];
    orders?: Order[];
  },
>(
  summary?: Summary | Summary[],
) => {
  const data = Array.isArray(summary) ? summary : [summary];

  const activeEntitlements = data
    .flatMap((customer) => customer?.entitlements)
    .filter((entitlement) => entitlement?.active)
    .map((entitlement) => ({
      id: entitlement?.id,
      variantId: entitlement?.variantId,
    }))
    .filter(Boolean);

  const activeSubscriptions = data
    .flatMap((customer) => customer?.subscriptions)
    .filter(
      (subscription) =>
        subscription?.status && isSubscriptionActive(subscription),
    )
    .map((subscription) => subscription?.variantId)
    .filter(Boolean);

  const succededOrders = data
    .flatMap((customer) => customer?.orders)
    .filter((order) => order?.status === PaymentStatus.SUCCEEDED)
    .map((order) => order?.variantId)
    .filter(Boolean);

  const availablePlans = [
    ...activeEntitlements.map((entitlement) =>
      entitlement.variantId
        ? findPlanByVariantId(entitlement.variantId).plan
        : entitlement.id
          ? findPlanById(entitlement.id)
          : null,
    ),
    ...activeSubscriptions.map((id) => findPlanByVariantId(id).plan),
    ...succededOrders.map((id) => findPlanByVariantId(id).plan),
  ].filter(Boolean);

  return (
    availablePlans
      .sort((a, b) => findPlanIndexById(a.id) - findPlanIndexById(b.id))
      .at(-1)?.id ?? BillingPlan.FREE
  );
};

export const getHigherPlans = (planId: BillingPlan) => {
  const idx = findPlanIndexById(planId);

  if (idx === -1) {
    return [];
  }

  return config.plans.slice(idx + 1);
};

export const getLowerPlans = (planId: BillingPlan) => {
  const idx = findPlanIndexById(planId);

  if (idx === -1) {
    return [];
  }

  return config.plans.slice(0, idx);
};

export const checkPlanLimit = ({
  id,
  key,
  currentUsage,
  increment = 1,
}: {
  id: string;
  key: string;
  currentUsage: number;
  increment?: number;
}) => {
  const plan = findPlanById(id);

  if (!plan) {
    return {
      allowed: false,
      limit: null,
      current: currentUsage,
      remaining: null,
    };
  }

  const limit = "limits" in plan ? plan.limits?.[key] : null;

  if (!limit) {
    return {
      allowed: true,
      limit: null,
      current: currentUsage,
      remaining: null,
    };
  }

  return {
    allowed: currentUsage + increment <= limit,
    limit,
    current: currentUsage,
    remaining: limit - currentUsage,
  };
};

type Filters = {
  referenceType?: BillingReference | null;
  type?: BillingType | null;
  model?: BillingModel | null;
  interval?: RecurringInterval | null;
  hidden?: boolean | null;
};

export const getFilteredPlans = (filters?: Filters) =>
  config.plans
    .map((plan) => {
      if (!filters) {
        return plan;
      }
      let variants = plan.variants;

      if (filters.model) {
        variants = variants.filter(
          (variant) => variant.model === filters.model,
        );
      }
      if (filters.interval) {
        variants = variants.filter(
          (variant) =>
            "interval" in variant && variant.interval === filters.interval,
        );
      }

      if (filters.type) {
        variants = variants.filter((variant) => variant.type === filters.type);
      }

      if (
        filters?.referenceType &&
        filters.referenceType !== BillingReference.ORGANIZATION
      ) {
        variants = variants.filter(
          (variant) => variant.type !== BillingType.PER_SEAT,
        );
      }

      if (typeof filters.hidden === "boolean") {
        variants = variants.filter(
          (variant) => variant.hidden === filters.hidden,
        );
      }

      return Object.assign({}, plan, { variants });
    })
    .filter((plan) => !!plan.variants.length);

export const getAvailableIntervals = (filters?: Filters) => {
  return [
    ...new Set(
      getFilteredPlans(filters).flatMap((plan) =>
        plan.variants.flatMap((variant) =>
          "interval" in variant ? variant.interval : null,
        ),
      ),
    ),
  ].filter(Boolean);
};

export const getAvailableModels = (filters?: Filters) => {
  return [
    ...new Set(
      getFilteredPlans(filters).flatMap((plan) =>
        plan.variants.flatMap((variant) =>
          "model" in variant ? variant.model : null,
        ),
      ),
    ),
  ].filter(Boolean);
};

export const getAvailableTypes = (filters?: Filters) => {
  return [
    ...new Set(
      getFilteredPlans(filters).flatMap((plan) =>
        plan.variants.flatMap((variant) =>
          "type" in variant ? variant.type : null,
        ),
      ),
    ),
  ].filter(Boolean);
};
