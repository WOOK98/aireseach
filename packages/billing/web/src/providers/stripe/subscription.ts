import dayjs from "dayjs";

import {
  getCustomerByExternalId,
  upsertSubscription,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../types";
import { toSubscriptionStatus } from "./mappers/to-billing-status";
import { stripe } from "./sdk";

import type { Stripe } from "stripe";

const getSubscription = async (subscriptionId: string) => {
  return stripe().subscriptions.retrieve(subscriptionId);
};

const getPeriodStartsAt = (subscription: Stripe.Subscription) => {
  // for retro-compatibility, we need to check if the subscription has a period

  // if it does, we use the period start, otherwise we use the subscription start
  // (Stripe 17 and below)
  if ("current_period_start" in subscription) {
    return dayjs(subscription.current_period_start as number).toDate();
  }

  // if it doesn't, we use the subscription item start (Stripe 18+)
  return dayjs(subscription.items.data[0]!.current_period_start).toDate();
};

const getPeriodEndsAt = (subscription: Stripe.Subscription) => {
  // for retro-compatibility, we need to check if the subscription has a period

  // if it does, we use the period end, otherwise we use the subscription end
  // (Stripe 17 and below)
  if ("current_period_end" in subscription) {
    return dayjs(subscription.current_period_end as number).toDate();
  }

  // if it doesn't, we use the subscription item end (Stripe 18+)
  return dayjs(subscription.items.data[0]!.current_period_end).toDate();
};

export const getPromotionCode = async (code: string) => {
  try {
    const { data } = await stripe().promotionCodes.list({
      code,
    });

    return data[0];
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.promotionCodeRetrieve",
    });
  }
};

export const subscriptionStatusChangeHandler = async ({
  id,
  customerId,
}: {
  id: string;
  customerId: string;
}) => {
  const customer = await getCustomerByExternalId(customerId);

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  const subscription = await getSubscription(id);

  const variantId = subscription.items.data[0]?.price.id;

  if (!variantId) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.variantNotFound",
    });
  }

  const status = toSubscriptionStatus(subscription.status);

  const periodStartsAt = getPeriodStartsAt(subscription);
  const periodEndsAt = getPeriodEndsAt(subscription);
  const trialStartsAt = subscription.trial_start
    ? dayjs.unix(subscription.trial_start).toDate()
    : null;
  const trialEndsAt = subscription.trial_end
    ? dayjs(subscription.trial_end).toDate()
    : null;

  await upsertSubscription({
    customerId: customer.id,
    externalId: id,
    status,
    store: BillingProvider.STRIPE,
    variantId,
    periodStartsAt,
    periodEndsAt,
    trialStartsAt,
    trialEndsAt,
  });

  logger.info(
    `✅ Subscription ${id} status changed for customer ${customer.id} to ${subscription.status}`,
  );
};

export const updateSubscription = async (
  id: string,
  data: Partial<{
    quantity: number;
  }>,
) => {
  const subscription = await getSubscription(id);

  if (!subscription) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.subscriptionNotFound",
    });
  }

  await stripe().subscriptions.update(id, {
    items: [
      {
        id: subscription.items.data[0]?.id,
        quantity: data.quantity,
      },
    ],
  });
};
