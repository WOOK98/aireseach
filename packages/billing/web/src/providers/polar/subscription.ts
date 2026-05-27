import {
  getCustomerByExternalId,
  upsertSubscription,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../types";
import { toSubscriptionStatus } from "./mappers/to-billing-status";
import { polar } from "./sdk";

export const subscriptionStatusChangeHandler = async ({
  id,
}: {
  id: string;
}) => {
  const subscription = await polar().subscriptions.get({ id });

  const customer = await getCustomerByExternalId(subscription.customerId);

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  const status = toSubscriptionStatus(subscription.status);
  const periodStartsAt = subscription.currentPeriodStart;
  const periodEndsAt =
    subscription.currentPeriodEnd ??
    subscription.endsAt ??
    subscription.endedAt ??
    subscription.canceledAt ??
    new Date();
  const trialStartsAt = subscription.trialStart;
  const trialEndsAt = subscription.trialEnd;

  await upsertSubscription({
    customerId: customer.id,
    externalId: subscription.id,
    status,
    store: BillingProvider.POLAR,
    variantId: subscription.productId,
    periodStartsAt,
    periodEndsAt,
    trialStartsAt,
    trialEndsAt,
  });

  logger.info(
    `✅ Subscription ${subscription.id} status changed for customer ${customer.id} to ${status}`,
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

  try {
    await polar().subscriptions.update({
      id,
      subscriptionUpdate: {
        seats: data.quantity,
      },
    });
  } catch (error) {
    logger.error(error);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.subscriptionUpdate",
    });
  }
};
