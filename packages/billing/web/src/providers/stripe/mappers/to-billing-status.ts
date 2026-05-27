import { PaymentStatus, SubscriptionStatus } from "@workspace/billing";

import type { Stripe } from "stripe";

export const toSubscriptionStatus = (status: string): SubscriptionStatus => {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "incomplete":
      return SubscriptionStatus.INCOMPLETE;
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE_EXPIRED;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "paused":
      return SubscriptionStatus.PAUSED;

    default:
      throw new Error(`Invalid subscription status: ${status}`);
  }
};

export const toPaymentStatus = (
  status: Stripe.Checkout.Session["payment_status"],
): PaymentStatus => {
  switch (status) {
    case "paid":
      return PaymentStatus.SUCCEEDED;
    case "unpaid":
      return PaymentStatus.FAILED;
    case "no_payment_required":
      return PaymentStatus.SUCCEEDED;
    default:
      throw new Error("Invalid payment status");
  }
};
