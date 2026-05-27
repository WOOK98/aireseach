import dayjs from "dayjs";

import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { polar } from "./sdk";

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
    await polar().events.ingest({
      events: [
        {
          name: input.event,
          customerId: input.externalId,
          timestamp: input.timestamp,
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

  const start = input.start ?? dayjs(0).toDate();
  const end = input.end ?? dayjs().toDate();

  try {
    const quantities = await polar().meters.quantities({
      id: input.meterId,
      startTimestamp: start,
      endTimestamp: end,
      interval: "day",
      customerId: input.externalId,
    });

    return {
      usage: quantities.total,
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
