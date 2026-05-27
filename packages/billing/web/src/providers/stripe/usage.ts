import dayjs from "dayjs";

import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { stripe } from "./sdk";

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
    await stripe().billing.meterEvents.create({
      event_name: input.event,
      payload: {
        stripe_customer_id: input.externalId,
        value: input.quantity.toString(),
      },
      timestamp: dayjs(input.timestamp).unix(),
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

  const start = input.start ?? dayjs(1000).toDate();
  const end = input.end ?? dayjs().toDate();

  try {
    const summaries = await stripe().billing.meters.listEventSummaries(
      input.meterId,
      {
        customer: input.externalId,
        start_time: dayjs(start).unix(),
        end_time: dayjs(end).unix(),
      },
    );

    const usage = summaries.data.reduce((total, summary) => {
      return total + (summary.aggregated_value ?? 0);
    }, 0);

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
