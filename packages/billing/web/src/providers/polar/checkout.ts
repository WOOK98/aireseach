import { BillingType, config } from "@workspace/billing";
import {
  getCustomerByExternalId,
  getCustomersByReferenceId,
  getOrganizationBillableSeatsCount,
  upsertOrder,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { BillingProvider } from "../types";
import { createOrRetrieveCustomer } from "./customer";
import { env } from "./env";
import { toPaymentStatus } from "./mappers/to-billing-status";
import { polar } from "./sdk";
import { subscriptionStatusChangeHandler } from "./subscription";

import type { CheckoutPayload, GetBillingPortalPayload } from "../../schema";
import type { BillingUser } from "../types";

const getDiscountByCode = async (code: string) => {
  const discounts = await polar().discounts.list({
    query: code,
  });

  return discounts.result.items[0];
};

export const checkout = async ({
  user,
  referenceId,
  variant: { id },
  discount,
  redirect,
}: CheckoutPayload & { user: BillingUser }) => {
  try {
    const variant = config.plans
      .find((plan) => plan.variants.some((v) => v.id === id))
      ?.variants.find((v) => v.id === id);

    if (!variant) {
      throw new HttpException(HttpStatusCode.NOT_FOUND, {
        code: "billing:error.variantNotFound",
      });
    }

    const { polarCustomer } = await createOrRetrieveCustomer({
      referenceId,
      email: user.email,
    });

    const polarDiscount = discount?.code
      ? await getDiscountByCode(discount.code)
      : null;
    const quantity =
      variant.type === BillingType.PER_SEAT
        ? await getOrganizationBillableSeatsCount(referenceId)
        : null;

    const checkout = await polar().checkouts.create({
      products: [variant.id],
      successUrl: redirect.success,
      customerId: polarCustomer.id,
      ...(quantity ? { seats: quantity } : {}),
      ...(polarDiscount && { discountId: polarDiscount.id }),
    });

    return { url: checkout.url };
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.checkout",
    });
  }
};

export const getBillingPortal = async ({
  referenceId,
}: GetBillingPortalPayload & { user: BillingUser }) => {
  const defaultUrl = `https://polar.sh/${env.POLAR_ORGANIZATION_SLUG}/portal`;

  try {
    const [customer] = await getCustomersByReferenceId(referenceId, {
      provider: BillingProvider.POLAR,
    });

    if (!customer) {
      return {
        url: defaultUrl,
      };
    }

    const customerSession = await polar().customerSessions.create({
      customerId: customer.externalId,
    });

    return { url: customerSession.customerPortalUrl || defaultUrl };
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.portal",
    });
  }
};

export const checkoutStatusChangeHandler = async ({ id }: { id: string }) => {
  const order = await polar().orders.get({ id });

  const customer = await getCustomerByExternalId(order.customerId);

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  if (order.subscription) {
    await subscriptionStatusChangeHandler({
      id: order.subscription.id,
    });
    return;
  }

  const status = toPaymentStatus(order.status);

  if (!order.productId) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.variantNotFound",
    });
  }

  await upsertOrder({
    customerId: customer.id,
    externalId: order.id,
    variantId: order.productId,
    status,
    store: BillingProvider.POLAR,
  });

  logger.info(
    `✅ Order ${order.id} status changed for customer ${customer.id} to ${status}`,
  );
};
