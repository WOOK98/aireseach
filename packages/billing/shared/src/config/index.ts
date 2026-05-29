import {
  BillingModel,
  BillingPlan,
  RecurringInterval,
  SubscriptionStatus,
  MobileStore,
  BillingType,
} from "../types";
import { FEATURES } from "./features";
import { billingConfigSchema } from "./schema";

import type { BillingConfig } from "./schema";

export const config = billingConfigSchema.parse({
  plans: [
    {
      id: BillingPlan.FREE,
      name: "plan.free.name",
      description: "plan.free.description",
      features: Object.values(FEATURES[BillingPlan.FREE]),
      variants: [
        {
          id: "free-monthly",
          cost: 0,
          type: BillingType.FLAT,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH,
        },
        {
          id: "free-yearly",
          cost: 0,
          type: BillingType.FLAT,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.YEAR,
        },
      ],
    },
    {
      id: BillingPlan.PRO,
      name: "plan.pro.name",
      description: "plan.pro.description",
      badge: "plan.pro.badge",
      features: Object.values(FEATURES[BillingPlan.PRO]),
      variants: [
        {
          id: "price_1TcJTj9rITy4RArVzlsqcKWf",
          cost: 990,
          compareAtPrice: 1_900,
          type: BillingType.FLAT,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH,
        },
        {
          id: "price_1TcJTl9rITy4RArVLszmFENu",
          cost: 9_900,
          compareAtPrice: 19_000,
          type: BillingType.FLAT,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.YEAR,
        },
      ],
    },
    {
      id: BillingPlan.BUSINESS,
      name: "plan.business.name",
      description: "plan.business.description",
      badge: "plan.business.badge",
      features: Object.values(FEATURES[BillingPlan.BUSINESS]),
      variants: [
        {
          id: "price_1TcJTm9rITy4RArVaKJZofx6",
          cost: 2_990,
          compareAtPrice: 4_900,
          type: BillingType.FLAT,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH,
        },
        {
          id: "price_1TcJTo9rITy4RArVGlc5EWWT",
          cost: 29_900,
          compareAtPrice: 49_000,
          type: BillingType.FLAT,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.YEAR,
        },
      ],
    },
  ],
  discounts: [],
}) satisfies BillingConfig;

export * from "./features";
export * from "./schema";

export const ACTIVE_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

export const MOBILE_STORE_LINKS = {
  [MobileStore.APP_STORE]: "https://apps.apple.com/account/subscriptions",
  [MobileStore.PLAY_STORE]:
    "https://play.google.com/store/account/subscriptions",
} as const satisfies Record<MobileStore, string>;
