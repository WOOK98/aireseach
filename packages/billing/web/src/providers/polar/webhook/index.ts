import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";

import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { checkoutStatusChangeHandler } from "../checkout";
import { env } from "../env";
import { subscriptionStatusChangeHandler } from "../subscription";

import type { WebhookCallbacks } from "../../types";

export const webhookHandler = async (
  req: Request,
  callbacks?: WebhookCallbacks,
): Promise<Response> => {
  try {
    const raw = await req.text();

    const event = validateEvent(
      raw,
      Object.fromEntries(req.headers.entries()),
      env.POLAR_WEBHOOK_SECRET,
    );

    const type = event.type;

    logger.info(`🔔  Webhook received: ${type}`);
    await callbacks?.onEvent?.(event);

    switch (type) {
      case "subscription.created":
        await callbacks?.onSubscriptionCreated?.(event.data.id);
        await subscriptionStatusChangeHandler({
          id: event.data.id,
        });
        break;
      case "subscription.updated":
        await callbacks?.onSubscriptionUpdated?.(event.data.id);
        await subscriptionStatusChangeHandler({
          id: event.data.id,
        });
        break;
      case "subscription.canceled":
      case "subscription.revoked":
        await callbacks?.onSubscriptionDeleted?.(event.data.id);
        await subscriptionStatusChangeHandler({
          id: event.data.id,
        });
        break;
      case "order.created":
        await callbacks?.onCheckoutSessionCompleted?.(event.data.id);
        await checkoutStatusChangeHandler({
          id: event.data.id,
        });
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      throw new HttpException(HttpStatusCode.BAD_REQUEST, {
        code: "billing:error.webhook.invalidSignature",
      });
    }
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
};
