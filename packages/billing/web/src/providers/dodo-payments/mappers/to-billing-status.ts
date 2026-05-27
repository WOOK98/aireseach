import { PaymentStatus, SubscriptionStatus } from "@workspace/billing";

import type { DodoPayments } from "dodopayments";

export const toSubscriptionStatus = (
  status: DodoPayments.SubscriptionStatus,
): SubscriptionStatus => {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "pending":
      return SubscriptionStatus.INCOMPLETE;
    case "on_hold":
      return SubscriptionStatus.PAST_DUE;
    case "cancelled":
      return SubscriptionStatus.CANCELED;
    case "failed":
      return SubscriptionStatus.UNPAID;
    case "expired":
      return SubscriptionStatus.INCOMPLETE_EXPIRED;
    default:
      throw new Error("Invalid subscription status");
  }
};

export const toPaymentStatus = (
  status: DodoPayments.IntentStatus,
): PaymentStatus => {
  switch (status) {
    case "succeeded":
    case "partially_captured":
    case "partially_captured_and_capturable":
      return PaymentStatus.SUCCEEDED;
    case "failed":
    case "cancelled":
      return PaymentStatus.FAILED;
    case "processing":
    case "requires_customer_action":
    case "requires_merchant_action":
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_capture":
      return PaymentStatus.PENDING;
    default:
      throw new Error("Invalid payment status");
  }
};
