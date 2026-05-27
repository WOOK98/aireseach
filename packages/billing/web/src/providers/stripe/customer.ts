import {
  upsertCustomer,
  updateCustomer,
  getCustomersByReferenceId,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { GetBillingPortalPayload } from "../../schema";
import { BillingProvider, BillingUser } from "../types";
import { stripe } from "./sdk";

import type { Stripe } from "stripe";

const getStripeCustomerById = async (id: string) => {
  return stripe().customers.retrieve(id);
};

const createStripeCustomer = async (referenceId: string, email: string) => {
  const customerData = { metadata: { referenceId }, email };
  const newCustomer = await stripe().customers.create(customerData);

  return newCustomer;
};

export const createOrRetrieveCustomer = async ({
  referenceId,
  email,
}: {
  referenceId: string;
  email: string;
}) => {
  const [existingCustomer] = await getCustomersByReferenceId(referenceId, {
    provider: BillingProvider.STRIPE,
  });

  const stripeCustomer = existingCustomer?.externalId
    ? await getStripeCustomerById(existingCustomer.externalId)
    : null;

  const stripeCustomerToProcess =
    stripeCustomer ?? (await createStripeCustomer(referenceId, email));

  if (existingCustomer) {
    if (existingCustomer.externalId !== stripeCustomerToProcess.id) {
      await updateCustomer(existingCustomer.id, {
        externalId: stripeCustomerToProcess.id,
      });
      logger.warn(
        `Customer ${existingCustomer.id} had a different externalId. Updated to ${stripeCustomerToProcess.id}.`,
      );
    }

    return {
      customer: existingCustomer,
      stripeCustomer: stripeCustomerToProcess,
    };
  }

  const [newCustomer] = await upsertCustomer({
    referenceId,
    externalId: stripeCustomerToProcess.id,
    provider: BillingProvider.STRIPE,
  });

  return {
    customer: newCustomer,
    stripeCustomer: stripeCustomerToProcess,
  };
};

export const createBillingPortalSession = async (
  params: Stripe.BillingPortal.SessionCreateParams,
) => {
  try {
    return await stripe().billingPortal.sessions.create(params);
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.portal",
    });
  }
};

export const getBillingPortal = async ({
  redirectUrl,
  referenceId,
  user,
}: GetBillingPortalPayload & { user: BillingUser }) => {
  try {
    const { stripeCustomer } = await createOrRetrieveCustomer({
      referenceId,
      email: user.email,
    });

    const { url } = await createBillingPortalSession({
      customer: stripeCustomer.id,
      return_url: redirectUrl,
    });

    return { url };
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
};
