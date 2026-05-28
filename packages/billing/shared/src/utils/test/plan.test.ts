import { describe, expect, it, vi } from "vitest";

import {
  BillingModel,
  BillingPlan,
  PaymentStatus,
  RecurringInterval,
  SubscriptionStatus,
} from "../../types";
import {
  findPlanById,
  findPlanByVariantId,
  findPlanIndexById,
  getActivePlan,
  getFilteredPlans,
  checkPlanLimit,
  getHigherPlans,
  getLowerPlans,
  getPlanFeatures,
} from "../plan";

vi.mock("../../config", () => import("./__mocks__/config"));

describe("findPlanByVariantId", () => {
  it("should find plan and variant by variant ID", () => {
    const result = findPlanByVariantId("free-lifetime");

    expect(result.plan).toBeDefined();
    expect(result.variant).toBeDefined();
    expect(result.plan?.id).toBe(BillingPlan.FREE);
    expect(result.variant?.id).toBe("free-lifetime");
  });

  it("should find pro plan variant", () => {
    const result = findPlanByVariantId("pro-monthly");

    expect(result.plan).toBeDefined();
    expect(result.variant).toBeDefined();
    expect(result.plan?.id).toBe(BillingPlan.PRO);
    expect(result.variant?.id).toBe("pro-monthly");
  });

  it("should return undefined for non-existent variant ID", () => {
    const result = findPlanByVariantId("non-existent-variant");

    expect(result.plan).toBeUndefined();
    expect(result.variant).toBeUndefined();
  });

  it("should find hidden variants", () => {
    const result = findPlanByVariantId("pro-monthly-hidden");

    expect(result.plan).toBeDefined();
    expect(result.variant).toBeDefined();
    expect(result.variant?.hidden).toBe(true);
  });

  it("should find custom variants", () => {
    const result = findPlanByVariantId("business-lifetime");

    expect(result.plan).toBeDefined();
    expect(result.variant).toBeDefined();
    expect(result.variant?.custom).toBe(true);
  });
});

describe("findPlanById", () => {
  it.each([BillingPlan.FREE, BillingPlan.PRO, BillingPlan.BUSINESS])(
    "should find %s plan by ID",
    (id) => {
      const result = findPlanById(id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    },
  );

  it("should return undefined for non-existent plan ID", () => {
    const result = findPlanById("non-existent-plan" as BillingPlan);

    expect(result).toBeUndefined();
  });
});

describe("findPlanIndexById", () => {
  it.each([
    [BillingPlan.FREE, 0],
    [BillingPlan.PRO, 1],
    [BillingPlan.BUSINESS, 2],
  ])("should return correct index for %s plan", (id, index) => {
    const result = findPlanIndexById(id);

    expect(result).toBe(index);
  });

  it("should return -1 for non-existent plan ID", () => {
    const result = findPlanIndexById("non-existent-plan" as BillingPlan);

    expect(result).toBe(-1);
  });
});

describe("getPlanFeatures", () => {
  it.each([
    [BillingPlan.FREE, ["FEATURE_1", "FEATURE_2"]],
    [BillingPlan.PRO, ["FEATURE_1", "FEATURE_2", "FEATURE_3", "FEATURE_4"]],
    [
      BillingPlan.BUSINESS,
      ["FEATURE_1", "FEATURE_2", "FEATURE_3", "FEATURE_4", "FEATURE_5"],
    ],
  ])("should return features for %s plan", (id, features) => {
    const result = getPlanFeatures(id);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    features.forEach((feature) => {
      expect(result).toContain(feature);
    });
  });

  it("should return empty array for non-existent plan", () => {
    const result = getPlanFeatures("non-existent-plan" as BillingPlan);

    expect(result).toEqual([]);
  });

  it("should return unique features (no duplicates)", () => {
    const result = getPlanFeatures(BillingPlan.BUSINESS);

    const uniqueFeatures = new Set(result);
    expect(result.length).toBe(uniqueFeatures.size);
  });
});

describe("getActivePlan", () => {
  it("should return free plan when no summary provided", () => {
    const result = getActivePlan();

    expect(result).toBe(BillingPlan.FREE);
  });

  it("should return free plan when summary is undefined", () => {
    const result = getActivePlan(undefined);

    expect(result).toBe(BillingPlan.FREE);
  });

  it("should return plan from active entitlement", () => {
    const summary = {
      entitlements: [
        {
          id: "ent-1",
          active: true,
          variantId: "free-lifetime",
        },
      ],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.FREE);
  });

  it.each([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING])(
    "should return plan from %s subscription",
    (status) => {
      const summary = {
        subscriptions: [
          {
            id: "sub-1",
            status: status,
            variantId: "pro-monthly",
          },
        ],
      };

      const result = getActivePlan(summary);

      expect(result).toBe(BillingPlan.PRO);
    },
  );

  it("should return plan from succeeded order", () => {
    const summary = {
      orders: [
        {
          id: "order-1",
          status: PaymentStatus.SUCCEEDED,
          variantId: "pro-one-time",
        },
      ],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.PRO);
  });

  it("should ignore inactive entitlements", () => {
    const summary = {
      entitlements: [
        {
          id: "ent-1",
          active: false,
          variantId: "free-lifetime",
        },
      ],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.FREE);
  });

  it("should ignore non-active subscription statuses", () => {
    const summary = {
      subscriptions: [
        {
          id: "sub-1",
          status: SubscriptionStatus.CANCELED,
          variantId: "pro-monthly",
        },
      ],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.FREE);
  });

  it("should ignore non-succeeded orders", () => {
    const summary = {
      orders: [
        {
          id: "order-1",
          status: PaymentStatus.PENDING,
          variantId: "pro-one-time",
        },
      ],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.FREE);
  });

  it("should return highest plan when multiple active plans exist", () => {
    const summary = {
      entitlements: [
        {
          id: "ent-1",
          active: true,
          variantId: "free-lifetime",
        },
      ],
      subscriptions: [
        {
          id: "sub-1",
          status: SubscriptionStatus.ACTIVE,
          variantId: "pro-monthly",
        },
      ],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.PRO);
  });

  it("should handle array of summaries", () => {
    const summaries = [
      {
        entitlements: [
          {
            id: "ent-1",
            active: true,
            variantId: "free-lifetime",
          },
        ],
      },
      {
        subscriptions: [
          {
            id: "sub-1",
            status: SubscriptionStatus.ACTIVE,
            variantId: "pro-monthly",
          },
        ],
      },
    ];

    const result = getActivePlan(summaries);

    expect(result).toBe(BillingPlan.PRO);
  });

  it("should handle entitlement with only id (no variantId)", () => {
    const summary = {
      entitlements: [
        {
          id: BillingPlan.PRO,
          active: true,
        },
      ],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.PRO);
  });

  it("should handle missing optional fields", () => {
    const summary = {
      entitlements: [],
      subscriptions: [],
      orders: [],
    };

    const result = getActivePlan(summary);

    expect(result).toBe(BillingPlan.FREE);
  });
});

describe("getHigherPlans", () => {
  it.each([
    [BillingPlan.FREE, [BillingPlan.PRO, BillingPlan.BUSINESS]],
    [BillingPlan.PRO, [BillingPlan.BUSINESS]],
    [BillingPlan.BUSINESS, []],
  ])("should return higher plans for %s plan", (id, plans) => {
    const result = getHigherPlans(id);

    expect(result.map((p) => p.id)).toEqual(plans);
  });

  it("should return empty array for non-existent plan", () => {
    const result = getHigherPlans("non-existent-plan" as BillingPlan);

    expect(result).toEqual([]);
  });
});

describe("getLowerPlans", () => {
  it.each([
    [BillingPlan.FREE, []],
    [BillingPlan.PRO, [BillingPlan.FREE]],
    [BillingPlan.BUSINESS, [BillingPlan.FREE, BillingPlan.PRO]],
  ])("should return lower plans for %s plan", (id, plans) => {
    const result = getLowerPlans(id);

    expect(result.map((p) => p.id)).toEqual(plans);
  });

  it("should return empty array for non-existent plan", () => {
    const result = getLowerPlans("non-existent-plan" as BillingPlan);

    expect(result).toEqual([]);
  });
});

describe("checkPlanLimit", () => {
  it("should deny when plan does not exist", () => {
    const result = checkPlanLimit({
      id: "non-existent-plan",
      key: "projects",
      currentUsage: 0,
    });

    expect(result).toEqual({
      allowed: false,
      limit: null,
      current: 0,
      remaining: null,
    });
  });

  it("should allow when plan has no limits configured", () => {
    const result = checkPlanLimit({
      id: BillingPlan.BUSINESS,
      key: "projects",
      currentUsage: 100,
    });

    expect(result).toEqual({
      allowed: true,
      limit: null,
      current: 100,
      remaining: null,
    });
  });

  it("should allow when limit key is not defined on plan", () => {
    const result = checkPlanLimit({
      id: BillingPlan.FREE,
      key: "unknown",
      currentUsage: 100,
    });

    expect(result).toEqual({
      allowed: true,
      limit: null,
      current: 100,
      remaining: null,
    });
  });

  it("should allow when limit value is null (unlimited)", () => {
    const result = checkPlanLimit({
      id: BillingPlan.FREE,
      key: "storage",
      currentUsage: 999,
      increment: 100,
    });

    expect(result).toEqual({
      allowed: true,
      limit: null,
      current: 999,
      remaining: null,
    });
  });

  it("should allow when usage is within limit", () => {
    const result = checkPlanLimit({
      id: BillingPlan.FREE,
      key: "projects",
      currentUsage: 1,
    });

    expect(result).toEqual({
      allowed: true,
      limit: 3,
      current: 1,
      remaining: 2,
    });
  });

  it("should allow when usage exactly reaches limit", () => {
    const result = checkPlanLimit({
      id: BillingPlan.FREE,
      key: "projects",
      currentUsage: 2,
    });

    expect(result).toEqual({
      allowed: true,
      limit: 3,
      current: 2,
      remaining: 1,
    });
  });

  it("should deny when usage exceeds limit", () => {
    const result = checkPlanLimit({
      id: BillingPlan.FREE,
      key: "projects",
      currentUsage: 3,
    });

    expect(result).toEqual({
      allowed: false,
      limit: 3,
      current: 3,
      remaining: 0,
    });
  });

  it("should respect custom value when checking limit", () => {
    const result = checkPlanLimit({
      id: BillingPlan.PRO,
      key: "members",
      currentUsage: 2,
      increment: 2,
    });

    expect(result).toEqual({
      allowed: true,
      limit: 5,
      current: 2,
      remaining: 3,
    });
  });

  it("should deny when custom value pushes usage over limit", () => {
    const result = checkPlanLimit({
      id: BillingPlan.PRO,
      key: "members",
      currentUsage: 3,
      increment: 4,
    });

    expect(result).toEqual({
      allowed: false,
      limit: 5,
      current: 3,
      remaining: 2,
    });
  });
});

describe("getFilteredPlans", () => {
  it("should return all plans when no filters provided", () => {
    const result = getFilteredPlans();

    expect(result.length).toBe(3);
  });

  it.each([BillingModel.ONE_TIME, BillingModel.RECURRING])(
    "should filter by billing model (%s)",
    (model) => {
      const result = getFilteredPlans({ model });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((plan) => {
        expect(plan.variants.length).toBeGreaterThan(0);
        plan.variants.forEach((variant) => {
          expect(variant.model).toBe(model);
        });
      });
    },
  );

  it.each([RecurringInterval.MONTH, RecurringInterval.YEAR])(
    "should filter by interval (%s)",
    (interval) => {
      const result = getFilteredPlans({ interval });

      expect(result.length).toBeGreaterThan(0);
      result.forEach((plan) => {
        expect(plan.variants.length).toBeGreaterThan(0);
        plan.variants.forEach((variant) => {
          if (
            variant.model === BillingModel.RECURRING &&
            "interval" in variant
          ) {
            expect(variant.interval).toBe(interval);
          }
        });
      });
    },
  );

  it.each([false, true])("should filter by hidden (%s)", (hidden) => {
    const result = getFilteredPlans({ hidden });

    expect(result.length).toBeGreaterThan(0);
    result.forEach((plan) => {
      expect(plan.variants.length).toBeGreaterThan(0);
      plan.variants.forEach((variant) => {
        expect(variant.hidden).toBe(hidden);
      });
    });
  });

  it("should filter by multiple criteria", () => {
    const result = getFilteredPlans({
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH,
      hidden: false,
    });

    expect(result.length).toBeGreaterThan(0);
    result.forEach((plan) => {
      expect(plan.variants.length).toBeGreaterThan(0);
      plan.variants.forEach((variant) => {
        expect(variant.model).toBe(BillingModel.RECURRING);
        if ("interval" in variant) {
          expect(variant.interval).toBe(RecurringInterval.MONTH);
        }
        expect(variant.hidden).toBe(false);
      });
    });
  });

  it("should exclude plans with no matching variants", () => {
    const result = getFilteredPlans({
      model: BillingModel.ONE_TIME,
      interval: RecurringInterval.MONTH,
    });

    result.forEach((plan) => {
      expect(plan.variants.length).toBe(0);
    });
  });

  it("should handle empty result when no plans match", () => {
    const result = getFilteredPlans({
      model: BillingModel.RECURRING,
      interval: RecurringInterval.DAY,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
