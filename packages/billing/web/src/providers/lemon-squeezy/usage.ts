import {
  createUsageRecord,
  getSubscriptionItemCurrentUsage,
} from "@lemonsqueezy/lemonsqueezy.js";
import dayjs from "dayjs";

import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { getSubscriptionItemIdByExternalId } from "./subscription";

export const recordUsage = async (input: {
  externalId: string;
  quantity: number;
}) => {
  try {
    const subscriptionItemId = await getSubscriptionItemIdByExternalId(
      input.externalId,
    );

    await createUsageRecord({
      subscriptionItemId,
      quantity: input.quantity,
      action: "increment",
    });

    return { recorded: true };
  } catch (error) {
    logger.error(error);
    return { recorded: false };
  }
};

export const getUsage = async (input: {
  externalId: string;
  start?: Date;
  end?: Date;
}) => {
  const defaultStart = input.start ?? dayjs(0).toDate();
  const defaultEnd = input.end ?? dayjs().toDate();

  try {
    const subscriptionItemId = await getSubscriptionItemIdByExternalId(
      input.externalId,
    );

    const { data } = await getSubscriptionItemCurrentUsage(subscriptionItemId);

    const usage = data?.meta?.quantity ?? 0;
    const start = data?.meta?.period_start
      ? dayjs(data.meta.period_start).toDate()
      : defaultStart;
    const end = data?.meta?.period_end
      ? dayjs(data.meta.period_end).toDate()
      : defaultEnd;

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
