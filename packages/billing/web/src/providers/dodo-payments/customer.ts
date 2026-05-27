import {
  getCustomersByReferenceId,
  updateCustomer,
  upsertCustomer,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { GetBillingPortalPayload } from "../../schema";
import { BillingProvider, BillingUser } from "../types";
import { dodoPayments } from "./sdk";

const getDodoCustomerById = async (customerId: string) => {
  return dodoPayments().customers.retrieve(customerId);
};

const createDodoCustomer = async ({
  referenceId,
  email,
}: {
  referenceId: string;
  email: string;
}) => {
  return dodoPayments().customers.create({
    email,
    name: email.split("@")[0] ?? email,
    metadata: {
      referenceId,
    },
  });
};

export const createOrRetrieveCustomer = async ({
  referenceId,
  email,
}: {
  referenceId: string;
  email: string;
}) => {
  const [existingCustomer] = await getCustomersByReferenceId(referenceId, {
    provider: BillingProvider.DODO_PAYMENTS,
  });

  const dodoCustomer = existingCustomer?.externalId
    ? await getDodoCustomerById(existingCustomer.externalId)
    : null;

  const dodoCustomerToProcess =
    dodoCustomer ?? (await createDodoCustomer({ referenceId, email }));

  if (existingCustomer) {
    if (existingCustomer.externalId !== dodoCustomerToProcess.customer_id) {
      await updateCustomer(existingCustomer.id, {
        externalId: dodoCustomerToProcess.customer_id,
      });
      logger.warn(
        `Customer ${existingCustomer.id} had a different externalId. Updated to ${dodoCustomerToProcess.customer_id}.`,
      );
    }

    return {
      customer: existingCustomer,
      dodoCustomer: dodoCustomerToProcess,
    };
  }

  const [newCustomer] = await upsertCustomer({
    referenceId,
    externalId: dodoCustomerToProcess.customer_id,
    provider: BillingProvider.DODO_PAYMENTS,
  });

  if (!newCustomer) {
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.customerCreation",
    });
  }

  return {
    customer: newCustomer,
    dodoCustomer: dodoCustomerToProcess,
  };
};

export const getBillingPortal = async ({
  redirectUrl,
  referenceId,
  user,
}: GetBillingPortalPayload & { user: BillingUser }) => {
  try {
    const { dodoCustomer } = await createOrRetrieveCustomer({
      referenceId,
      email: user.email,
    });

    const session = await dodoPayments().customers.customerPortal.create(
      dodoCustomer.customer_id,
      {
        return_url: redirectUrl,
        send_email: false,
      },
    );

    return { url: session.link };
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.portal",
    });
  }
};
