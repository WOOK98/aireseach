import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { checkoutStatusChangeHandler } from "../checkout";
import { env } from "../env";
import { dodoPayments } from "../sdk";
import { subscriptionStatusChangeHandler } from "../subscription";

import type { WebhookCallbacks } from "../../types";
import type { DodoPayments } from "dodopayments";

const getHeaders = (req: Request) => Object.fromEntries(req.headers.entries());

const unwrapWebhook = ({
  body,
  headers,
}: {
  body: string;
  headers: Record<string, string>;
}) => {
  try {
    return dodoPayments().webhooks.unwrap(body, {
      headers,
      key: env.DODO_PAYMENTS_WEBHOOK_KEY,
    });
  } catch (error) {
    logger.error(error);
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.invalidSignature",
    });
  }
};

const getPaymentId = (
  event:
    | DodoPayments.PaymentCancelledWebhookEvent
    | DodoPayments.PaymentFailedWebhookEvent
    | DodoPayments.PaymentProcessingWebhookEvent
    | DodoPayments.PaymentSucceededWebhookEvent,
) => event.data.payment_id;

const getSubscriptionId = (
  event:
    | DodoPayments.SubscriptionActiveWebhookEvent
    | DodoPayments.SubscriptionCancelledWebhookEvent
    | DodoPayments.SubscriptionExpiredWebhookEvent
    | DodoPayments.SubscriptionFailedWebhookEvent
    | DodoPayments.SubscriptionOnHoldWebhookEvent
    | DodoPayments.SubscriptionPlanChangedWebhookEvent
    | DodoPayments.SubscriptionRenewedWebhookEvent
    | DodoPayments.SubscriptionUpdatedWebhookEvent,
) => event.data.subscription_id;

export const webhookHandler = async (
  req: Request,
  callbacks?: WebhookCallbacks,
): Promise<Response> => {
  const body = await req.text();
  const event = unwrapWebhook({
    body,
    headers: getHeaders(req),
  });
  const type = event.type;

  logger.info(`🔔  Webhook received: ${type}`);
  await callbacks?.onEvent?.(event);

  switch (type) {
    case "payment.succeeded":
    case "payment.failed":
    case "payment.cancelled":
    case "payment.processing": {
      const paymentId = getPaymentId(event);

      await callbacks?.onCheckoutSessionCompleted?.(paymentId);
      await checkoutStatusChangeHandler({
        id: paymentId,
      });
      break;
    }
    case "subscription.active": {
      const subscriptionId = getSubscriptionId(event);

      await callbacks?.onSubscriptionCreated?.(subscriptionId);
      await subscriptionStatusChangeHandler({
        id: subscriptionId,
      });
      break;
    }
    case "subscription.updated":
    case "subscription.on_hold":
    case "subscription.renewed":
    case "subscription.plan_changed":
    case "subscription.failed": {
      const subscriptionId = getSubscriptionId(event);

      await callbacks?.onSubscriptionUpdated?.(subscriptionId);
      await subscriptionStatusChangeHandler({
        id: subscriptionId,
      });
      break;
    }
    case "subscription.cancelled":
    case "subscription.expired": {
      const subscriptionId = getSubscriptionId(event);

      await callbacks?.onSubscriptionDeleted?.(subscriptionId);
      await subscriptionStatusChangeHandler({
        id: subscriptionId,
      });
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
