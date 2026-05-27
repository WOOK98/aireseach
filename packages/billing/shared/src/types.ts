import {
  subscriptionStatusEnum,
  paymentStatusEnum,
} from "@workspace/db/schema";

import type { EnumToConstant } from "@workspace/shared/types";

export const SubscriptionStatus = Object.fromEntries(
  Object.values(subscriptionStatusEnum.enumValues).map((status) => [
    status.toUpperCase(),
    status,
  ]),
) as EnumToConstant<typeof subscriptionStatusEnum.enumValues>;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PaymentStatus = Object.fromEntries(
  Object.values(paymentStatusEnum.enumValues).map((status) => [
    status.toUpperCase(),
    status,
  ]),
) as EnumToConstant<typeof paymentStatusEnum.enumValues>;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const BillingPlan = {
  FREE: "free",
  PREMIUM: "premium",
  ENTERPRISE: "enterprise",
} as const;
export type BillingPlan = (typeof BillingPlan)[keyof typeof BillingPlan];

export const BillingModel = {
  ONE_TIME: "one-time",
  RECURRING: "recurring",
} as const;

export const BillingReference = {
  USER: "user",
  ORGANIZATION: "organization",
} as const;

export type BillingReference =
  (typeof BillingReference)[keyof typeof BillingReference];

export const RecurringInterval = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
} as const;

export const BillingType = {
  FLAT: "flat",
  METERED: "metered",
  PER_SEAT: "per-seat",
} as const;

export const BillingDiscountType = {
  PERCENT: "percent",
  AMOUNT: "amount",
} as const;

export const MobileStore = {
  APP_STORE: "app_store",
  PLAY_STORE: "play_store",
} as const;

export type MobileStore = (typeof MobileStore)[keyof typeof MobileStore];
export type BillingModel = (typeof BillingModel)[keyof typeof BillingModel];
export type RecurringInterval =
  (typeof RecurringInterval)[keyof typeof RecurringInterval];
export type BillingType = (typeof BillingType)[keyof typeof BillingType];
export type BillingDiscountType =
  (typeof BillingDiscountType)[keyof typeof BillingDiscountType];

export type {
  SelectCustomer as Customer,
  SelectSubscription as Subscription,
  SelectOrder as Order,
} from "@workspace/db/schema";
