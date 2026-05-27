import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { checkoutStatusChangeHandler } from "../checkout";
import { env } from "../env";
import { subscriptionStatusChangeHandler } from "../subscription";
import { LEMON_SQUEEZY_SIGNATURE_HEADER } from "./constants";
import { webhookHasData, webhookHasMeta } from "./type-guards";
import { verifySignature } from "./verify";

import type { WebhookCallbacks } from "../../types";

export const webhookHandler = async (
  req: Request,
  callbacks?: WebhookCallbacks,
): Promise<Response> => {
  const body = await req.text();
  const sig = req.headers.get(LEMON_SQUEEZY_SIGNATURE_HEADER);

  if (!sig) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.signatureNotFound",
    });
  }

  await verifySignature(sig, env.LEMON_SQUEEZY_SIGNING_SECRET, body);

  const data = JSON.parse(body);

  if (!webhookHasMeta(data)) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.metaInvalid",
    });
  }

  const type = data.meta.event_name;

  logger.info(`🔔  Webhook received: ${type}`);

  if (!webhookHasData(data)) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.dataInvalid",
    });
  }

  await callbacks?.onEvent?.(data);

  switch (type) {
    case "subscription_created":
      await callbacks?.onSubscriptionCreated?.(data.data.id);
      await subscriptionStatusChangeHandler({
        id: data.data.id,
        customerId: data.meta.custom_data.customer_id,
      });
      break;
    case "subscription_updated":
      await callbacks?.onSubscriptionUpdated?.(data.data.id);
      await subscriptionStatusChangeHandler({
        id: data.data.id,
        customerId: data.meta.custom_data.customer_id,
      });
      break;
    case "subscription_expired":
      await callbacks?.onSubscriptionDeleted?.(data.data.id);
      await subscriptionStatusChangeHandler({
        id: data.data.id,
        customerId: data.meta.custom_data.customer_id,
      });
      break;
    case "order_created":
      await callbacks?.onCheckoutSessionCompleted?.(data.data.id);
      await checkoutStatusChangeHandler({
        id: data.data.id,
        customerId: data.meta.custom_data.customer_id,
      });
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
