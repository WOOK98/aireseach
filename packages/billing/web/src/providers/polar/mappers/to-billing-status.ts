import { PaymentStatus, SubscriptionStatus } from "@workspace/billing";

import type { OrderStatus } from "@polar-sh/sdk/models/components/orderstatus";
import type { SubscriptionStatus as PolarSubscriptionStatus } from "@polar-sh/sdk/models/components/subscriptionstatus";

export const toSubscriptionStatus = (
  status: PolarSubscriptionStatus,
): SubscriptionStatus => {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE_EXPIRED;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "incomplete":
      return SubscriptionStatus.INCOMPLETE;
    default:
      throw new Error(`Invalid subscription status: ${status}`);
  }
};

export const toPaymentStatus = (status: OrderStatus): PaymentStatus => {
  switch (status) {
    case "paid":
      return PaymentStatus.SUCCEEDED;
    case "refunded":
    case "partially_refunded":
      return PaymentStatus.FAILED;
    case "pending":
      return PaymentStatus.PENDING;
    default:
      throw new Error(`Invalid payment status: ${status}`);
  }
};
