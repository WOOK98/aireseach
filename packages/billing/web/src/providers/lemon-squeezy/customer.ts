import { createCustomer, getCustomer } from "@lemonsqueezy/lemonsqueezy.js";

import {
  upsertCustomer,
  updateCustomer,
  getCustomersByReferenceId,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../types";
import { env } from "./env";

const getLemonSqueezyCustomerById = async (customerId: string) => {
  return getCustomer(customerId);
};

const createLemonSqueezyCustomer = async (email: string) => {
  const newCustomer = await createCustomer(env.LEMON_SQUEEZY_STORE_ID, {
    name: email.split("@")[0] ?? "",
    email: email,
  });

  return newCustomer.data?.data;
};

export const createOrRetrieveCustomer = async ({
  referenceId,
  email,
}: {
  referenceId: string;
  email: string;
}) => {
  const [existingCustomer] = await getCustomersByReferenceId(referenceId, {
    provider: BillingProvider.LEMON_SQUEEZY,
  });

  const lemonSqueezyCustomer = existingCustomer?.externalId
    ? (await getLemonSqueezyCustomerById(existingCustomer.externalId)).data
        ?.data
    : null;

  const lemonSqueezyCustomerToProcess =
    lemonSqueezyCustomer ?? (await createLemonSqueezyCustomer(email));

  if (!lemonSqueezyCustomerToProcess) {
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.customerCreation",
    });
  }

  if (existingCustomer) {
    if (existingCustomer.externalId !== lemonSqueezyCustomerToProcess.id) {
      await updateCustomer(existingCustomer.id, {
        externalId: lemonSqueezyCustomerToProcess.id,
      });
      logger.warn(
        `Customer ${existingCustomer.id} had a different externalId. Updated to ${lemonSqueezyCustomerToProcess.id}.`,
      );
    }

    return {
      customer: existingCustomer,
      lemonSqueezyCustomer: lemonSqueezyCustomerToProcess,
    };
  }

  const [newCustomer] = await upsertCustomer({
    referenceId,
    externalId: lemonSqueezyCustomerToProcess.id,
    provider: BillingProvider.LEMON_SQUEEZY,
  });

  return {
    customer: newCustomer,
    lemonSqueezyCustomer: lemonSqueezyCustomerToProcess,
  };
};
