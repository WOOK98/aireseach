import { SubscriptionStatus } from "@workspace/billing";

export const toSubscriptionStatus = (
  eventType: string,
  periodType?: string | null,
): SubscriptionStatus => {
  if (eventType === "billing_issue") {
    return SubscriptionStatus.PAST_DUE;
  }

  if (eventType === "subscription_paused") {
    return SubscriptionStatus.PAUSED;
  }

  if (eventType === "cancellation" || eventType === "expiration") {
    return SubscriptionStatus.CANCELED;
  }

  if (periodType === "TRIAL") {
    return SubscriptionStatus.TRIALING;
  }

  return SubscriptionStatus.ACTIVE;
};
