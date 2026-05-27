import { PaymentStatus, SubscriptionStatus } from "@workspace/billing";

export const toSubscriptionStatus = (status: string): SubscriptionStatus => {
  switch (status) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "on_trial":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "cancelled":
      return SubscriptionStatus.CANCELED;
    case "expired":
      return SubscriptionStatus.INCOMPLETE_EXPIRED;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "paused":
      return SubscriptionStatus.PAUSED;

    default:
      throw new Error(`Invalid subscription status: ${status}`);
  }
};

export const toPaymentStatus = (status: string): PaymentStatus => {
  switch (status) {
    case "paid":
      return PaymentStatus.SUCCEEDED;
    case "refunded":
      return PaymentStatus.FAILED;
    case "failed":
      return PaymentStatus.FAILED;
    case "pending":
      return PaymentStatus.PENDING;
    default:
      throw new Error(`Invalid payment status: ${status}`);
  }
};
