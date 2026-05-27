import { isSubscriptionActive } from "@workspace/billing";
import {
  getCustomerByExternalId,
  getSubscriptionsByCustomerId,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { createIdGenerator, HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../types";
import { dodoPayments } from "./sdk";

const generateUsageEventId = createIdGenerator({
  prefix: "usage",
});

export const recordUsage = async (input: {
  event?: string;
  externalId: string;
  quantity: number;
  timestamp?: Date;
}) => {
  if (!input.event) {
    return { recorded: false };
  }

  try {
    await dodoPayments().usageEvents.ingest({
      events: [
        {
          customer_id: input.externalId,
          event_id: generateUsageEventId(),
          event_name: input.event,
          timestamp: input.timestamp?.toISOString(),

          metadata: {
            value: input.quantity,
          },
        },
      ],
    });

    return { recorded: true };
  } catch (error) {
    logger.error(error);
    return { recorded: false };
  }
};

export const getUsage = async (input: {
  meterId?: string;
  externalId: string;
  start?: Date;
  end?: Date;
}) => {
  if (!input.meterId) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.usageRetrieve",
    });
  }

  const start = input.start ?? new Date(0);
  const end = input.end ?? new Date();

  try {
    const customer = await getCustomerByExternalId(input.externalId);

    if (!customer) {
      throw new HttpException(HttpStatusCode.NOT_FOUND, {
        code: "billing:error.customerNotFound",
      });
    }

    const subscriptions = await getSubscriptionsByCustomerId(customer.id);
    const activeDodoSubscriptions = subscriptions.filter(
      (subscription) =>
        subscription.store === BillingProvider.DODO_PAYMENTS &&
        isSubscriptionActive(subscription),
    );

    let usage = 0;

    for (const subscription of activeDodoSubscriptions) {
      const usageHistory =
        await dodoPayments().subscriptions.retrieveUsageHistory(
          subscription.externalId,
          {
            meter_id: input.meterId,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
          },
        );

      for await (const period of usageHistory) {
        usage += period.meters.reduce((total, meter) => {
          return total + Number(meter.consumed_units);
        }, 0);
      }
    }

    return {
      usage,
      start,
      end,
    };
  } catch (error) {
    logger.error(error);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.usageRetrieve",
    });
  }
};
