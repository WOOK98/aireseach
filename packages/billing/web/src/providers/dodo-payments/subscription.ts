import {
  getCustomerByExternalId,
  upsertSubscription,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../types";
import { toSubscriptionStatus } from "./mappers/to-billing-status";
import { dodoPayments } from "./sdk";

import type { DodoPayments } from "dodopayments";

const getTrialDates = (subscription: DodoPayments.Subscription) => {
  if (!subscription.trial_period_days) {
    return {
      trialStartsAt: null,
      trialEndsAt: null,
    };
  }

  const trialStartsAt = new Date(subscription.created_at);
  const trialEndsAt = new Date(trialStartsAt);

  trialEndsAt.setDate(trialStartsAt.getDate() + subscription.trial_period_days);

  return {
    trialStartsAt,
    trialEndsAt,
  };
};

export const subscriptionStatusChangeHandler = async ({
  id,
}: {
  id: string;
}) => {
  const subscription = await dodoPayments().subscriptions.retrieve(id);

  const customer = await getCustomerByExternalId(
    subscription.customer.customer_id,
  );

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  const status = toSubscriptionStatus(subscription.status);
  const { trialStartsAt, trialEndsAt } = getTrialDates(subscription);

  await upsertSubscription({
    customerId: customer.id,
    externalId: subscription.subscription_id,
    variantId: subscription.product_id,
    status,
    store: BillingProvider.DODO_PAYMENTS,
    periodStartsAt: new Date(subscription.previous_billing_date),
    periodEndsAt: new Date(subscription.next_billing_date),
    trialStartsAt,
    trialEndsAt,
  });

  logger.info(
    `✅ Subscription ${subscription.subscription_id} status changed for customer ${customer.id} to ${subscription.status}`,
  );
};

export const updateSubscription = async (
  id: string,
  data: Partial<{
    quantity: number;
  }>,
) => {
  if (!data.quantity) {
    return;
  }

  const subscription = await dodoPayments().subscriptions.retrieve(id);

  if (!subscription) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.subscriptionNotFound",
    });
  }

  try {
    await dodoPayments().subscriptions.changePlan(id, {
      product_id: subscription.product_id,
      quantity: data.quantity,
      proration_billing_mode: "prorated_immediately",
    });
  } catch (error) {
    logger.error(error);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.subscriptionUpdate",
    });
  }
};
