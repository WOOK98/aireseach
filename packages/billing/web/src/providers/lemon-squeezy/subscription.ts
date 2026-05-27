import {
  getSubscription,
  listSubscriptionItems,
  updateSubscriptionItem,
} from "@lemonsqueezy/lemonsqueezy.js";
import dayjs from "dayjs";

import { isSubscriptionActive } from "@workspace/billing";
import {
  getCustomerById,
  getCustomerByExternalId,
  getSubscriptionsByCustomerId,
  upsertSubscription,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../types";
import { toSubscriptionStatus } from "./mappers/to-billing-status";

export const subscriptionStatusChangeHandler = async ({
  id,
  customerId,
}: {
  id: string;
  customerId?: string;
}) => {
  const { data } = await getSubscription(id);

  const subscription = data?.data;

  if (!subscription) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.subscriptionNotFound",
    });
  }

  const customer = customerId
    ? await getCustomerById(customerId)
    : await getCustomerByExternalId(
        subscription.attributes.customer_id.toString(),
      );

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  const status = toSubscriptionStatus(subscription.attributes.status);
  const periodStartsAt = dayjs(subscription.attributes.created_at).toDate();
  const periodEndsAt = dayjs(
    subscription.attributes.ends_at ?? subscription.attributes.renews_at,
  ).toDate();
  const trialEndsAt = subscription.attributes.trial_ends_at
    ? dayjs(subscription.attributes.trial_ends_at).toDate()
    : null;
  const trialStartsAt = trialEndsAt ? periodStartsAt : null;

  await upsertSubscription({
    customerId: customer.id,
    externalId: subscription.id,
    variantId: subscription.attributes.variant_id.toString(),
    status,
    store: BillingProvider.LEMON_SQUEEZY,
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

  const { data: itemsData } = await listSubscriptionItems({
    filter: {
      subscriptionId: id,
    },
    page: {
      size: 1,
    },
  });

  const item = itemsData?.data.at(0);

  if (!item) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.subscriptionItemNotFound",
    });
  }

  try {
    await updateSubscriptionItem(item.id, { quantity: data.quantity });
  } catch (error) {
    logger.error(error);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.subscriptionUpdate",
    });
  }
};

export const getSubscriptionItemIdByExternalId = async (externalId: string) => {
  const customer = await getCustomerByExternalId(externalId);

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  const subscriptions = await getSubscriptionsByCustomerId(customer.id);

  const subscription = subscriptions.find(
    (item) =>
      item.store === BillingProvider.LEMON_SQUEEZY &&
      isSubscriptionActive(item),
  );

  if (!subscription) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.subscriptionNotFound",
    });
  }

  const { data } = await listSubscriptionItems({
    filter: {
      subscriptionId: subscription.externalId,
    },
    page: {
      size: 1,
    },
  });

  const subscriptionItem = data?.data.at(0);

  if (!subscriptionItem) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.subscriptionItemNotFound",
    });
  }

  return subscriptionItem.id;
};
