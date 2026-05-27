import dayjs from "dayjs";

import { PaymentStatus, SubscriptionStatus } from "@workspace/billing";

import type {
  NonSubscriptionPurchase,
  Subscription,
} from "../schema/customer-info";

const isInPast = (value: string | null | undefined) => {
  return dayjs(value).isBefore(dayjs());
};

const isInFuture = (value: string | null | undefined) => {
  return dayjs(value).isAfter(dayjs());
};

export const toSubscriptionStatus = (
  subscription: Subscription,
): SubscriptionStatus => {
  if (subscription.refunded_at) {
    return SubscriptionStatus.CANCELED;
  }

  if (subscription.auto_resume_date) {
    return SubscriptionStatus.PAUSED;
  }

  if (subscription.billing_issues_detected_at) {
    if (isInFuture(subscription.grace_period_expires_date)) {
      return SubscriptionStatus.PAST_DUE;
    }

    return SubscriptionStatus.UNPAID;
  }

  if (subscription.expires_date && isInPast(subscription.expires_date)) {
    return SubscriptionStatus.CANCELED;
  }

  if (subscription.period_type === "trial") {
    return SubscriptionStatus.TRIALING;
  }

  if (!subscription.expires_date) {
    return SubscriptionStatus.INCOMPLETE;
  }

  return SubscriptionStatus.ACTIVE;
};

export const toPaymentStatus = (
  purchase: NonSubscriptionPurchase,
): PaymentStatus => {
  if (purchase.refunded_at) {
    return PaymentStatus.FAILED;
  }

  if (purchase.purchase_date) {
    return PaymentStatus.SUCCEEDED;
  }

  return PaymentStatus.PENDING;
};
