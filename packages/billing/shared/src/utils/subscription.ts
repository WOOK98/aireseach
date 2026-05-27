import dayjs from "dayjs";

import { ACTIVE_SUBSCRIPTION_STATUSES } from "../config";
import { SubscriptionStatus } from "../types";

export const getBillingPeriod = <
  Subscription extends {
    status: SubscriptionStatus;
    periodStartsAt: Date;
    periodEndsAt: Date;
    trialStartsAt?: Date | null;
    trialEndsAt?: Date | null;
  },
>(
  subscription: Subscription,
) => {
  const now = dayjs();

  const { startsAt, endsAt } =
    subscription.status === SubscriptionStatus.TRIALING
      ? {
          startsAt: subscription.trialStartsAt,
          endsAt: subscription.trialEndsAt,
        }
      : {
          startsAt: subscription.periodStartsAt,
          endsAt: subscription.periodEndsAt,
        };

  const total = dayjs(endsAt).diff(dayjs(startsAt), "millisecond");
  const elapsed = now.diff(dayjs(startsAt), "millisecond");
  const progress = Math.max(
    0,
    Math.min(100, Math.round((elapsed / total) * 100)),
  );

  const daysRemaining = Math.max(0, dayjs(endsAt).diff(now, "day"));

  return {
    startsAt,
    endsAt,
    progress,
    daysRemaining,
    trial: subscription.status === SubscriptionStatus.TRIALING,
  };
};

export const isSubscriptionActive = <
  Subscription extends {
    status: SubscriptionStatus;
  },
>(
  subscription: Subscription,
) => {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status);
};
