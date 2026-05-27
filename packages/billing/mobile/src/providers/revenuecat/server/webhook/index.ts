import dayjs from "dayjs";

import {
  upsertCustomer,
  upsertOrders,
  upsertSubscriptions,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../../../types";
import { env } from "../env";
import {
  toPaymentStatus,
  toSubscriptionStatus,
} from "../mappers/to-billing-status";
import { customerInfoSchema } from "../schema/customer-info";
import { webhookEventSchema } from "../schema/webhook-event";
import { revenuecat } from "../sdk";
import { RELEVANT_EVENTS } from "./constants";

import type { WebhookCallbacks } from "../../../types";

export const webhookHandler = async (
  req: Request,
  callbacks?: WebhookCallbacks,
) => {
  const body = await req.text();
  const authorization = req.headers.get("Authorization");

  if (authorization !== env.REVENUECAT_WEBHOOK_SECRET) {
    throw new HttpException(HttpStatusCode.UNAUTHORIZED, {
      code: "billing:error.webhook.unauthorized",
    });
  }

  await callbacks?.onEvent?.(JSON.parse(body));
  const { event } = webhookEventSchema.parse(JSON.parse(body));

  if (!RELEVANT_EVENTS.has(event.type)) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.invalidEvent",
    });
  }

  logger.info(`🔔  Webhook received: ${event.type}`);

  const { subscriber } = await revenuecat("/subscribers/:app_user_id", {
    params: {
      app_user_id: event.app_user_id,
    },
    output: customerInfoSchema,
  });

  const [customer] = await upsertCustomer({
    referenceId: event.app_user_id,
    externalId: event.app_user_id,
    provider: BillingProvider.REVENUECAT,
  });

  if (!customer) {
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.customerNotFound",
    });
  }

  const subscriptions = Object.entries(subscriber.subscriptions ?? {})
    .map(([variantId, subscription]) => {
      const transactionId =
        subscription.original_transaction_id ??
        subscription.store_transaction_id;

      if (!transactionId) {
        return null;
      }

      const periodStartsAt = dayjs(subscription.purchase_date).toDate();
      const periodEndsAt = dayjs(subscription.expires_date).toDate();

      return Object.assign(
        {
          customerId: customer.id,
          externalId: transactionId,
          variantId,
          status: toSubscriptionStatus(subscription),
          store: subscription.store,
          periodStartsAt,
          periodEndsAt,
        },
        subscription.period_type === `trial`
          ? {
              trialStartsAt: subscription.original_purchase_date
                ? dayjs(subscription.original_purchase_date).toDate()
                : null,
              trialEndsAt: subscription.expires_date
                ? dayjs(subscription.expires_date).toDate()
                : null,
            }
          : {},
      );
    })
    .filter(Boolean);

  const orders = Object.entries(subscriber.non_subscriptions ?? {}).flatMap(
    ([variantId, purchases]) =>
      purchases
        .map((purchase) => {
          const transactionId =
            purchase.original_transaction_id ?? purchase.store_transaction_id;

          if (!transactionId) {
            return null;
          }

          return {
            customerId: customer.id,
            externalId: transactionId,
            variantId,
            status: toPaymentStatus(purchase),
            store: purchase.store,
          };
        })
        .filter(Boolean),
  );

  const getSubscriptionId = () => {
    const subscription = subscriber.subscriptions?.[event.product_id];
    const transactionId =
      subscription?.original_transaction_id ??
      subscription?.store_transaction_id ??
      event.transaction_id;

    return transactionId;
  };

  const getOneTimePurchaseId = () => {
    const purchases = subscriber.non_subscriptions?.[event.product_id];
    const matching = purchases?.find(
      (purchase) =>
        purchase.original_transaction_id === event.transaction_id ||
        purchase.store_transaction_id === event.transaction_id,
    );
    const transactionId =
      matching?.original_transaction_id ??
      matching?.store_transaction_id ??
      event.transaction_id;

    return transactionId;
  };

  if (subscriptions.length > 0) {
    await upsertSubscriptions(subscriptions);
    logger.info(
      `✅ ${subscriptions.length} subscriptions upserted for customer ${customer.id}`,
    );
  }

  if (orders.length > 0) {
    await upsertOrders(orders);
    logger.info(
      `✅ ${orders.length} orders upserted for customer ${customer.id}`,
    );
  }

  if (event.type === "INITIAL_PURCHASE") {
    const subscriptionId = getSubscriptionId();
    if (subscriptionId) {
      await callbacks?.onSubscriptionCreated?.(subscriptionId);
    }
  } else if (event.type === "CANCELLATION" || event.type === "EXPIRATION") {
    const subscriptionId = getSubscriptionId();
    if (subscriptionId) {
      await callbacks?.onSubscriptionDeleted?.(subscriptionId);
    }
  } else if (event.type === "NON_RENEWING_PURCHASE") {
    const orderId = getOneTimePurchaseId();
    if (orderId) {
      await callbacks?.onOneTimePurchaseSucceeded?.(orderId);
    }
  } else {
    const subscriptionId = getSubscriptionId();
    if (subscriptionId) {
      await callbacks?.onSubscriptionUpdated?.(subscriptionId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
