import {
  BillingConfigVariant,
  BillingModel,
  BillingType,
  findVariantById,
} from "@workspace/billing";
import {
  getCustomerByExternalId,
  getOrganizationBillableSeatsCount,
  upsertOrder,
} from "@workspace/billing/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { logger } from "@workspace/shared/logger";
import { HttpException } from "@workspace/shared/utils";

import { CheckoutPayload } from "../../schema";
import { BillingProvider, BillingUser } from "../types";
import { createOrRetrieveCustomer } from "./customer";
import { toPaymentStatus } from "./mappers/to-billing-status";
import { dodoPayments } from "./sdk";
import { subscriptionStatusChangeHandler } from "./subscription";

const getCheckoutQuantity = async ({
  variant,
  referenceId,
}: {
  variant: BillingConfigVariant;
  referenceId: string;
}) => {
  if (variant.type === BillingType.PER_SEAT) {
    return await getOrganizationBillableSeatsCount(referenceId);
  }

  return 1;
};

const getSubscriptionData = (variant: BillingConfigVariant) => {
  if (variant.model !== BillingModel.RECURRING) {
    return null;
  }

  if (!("trialDays" in variant) || !variant.trialDays) {
    return null;
  }

  return {
    trial_period_days: variant.trialDays,
  };
};

export const checkoutStatusChangeHandler = async ({ id }: { id: string }) => {
  const payment = await dodoPayments().payments.retrieve(id);

  if (payment.subscription_id) {
    await subscriptionStatusChangeHandler({
      id: payment.subscription_id,
    });
    return;
  }

  const customer = await getCustomerByExternalId(payment.customer.customer_id);

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  const variantId = payment.product_cart?.[0]?.product_id;

  if (!variantId) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.variantNotFound",
    });
  }

  if (!payment.status) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.paymentStatusNotFound",
    });
  }

  const status = toPaymentStatus(payment.status);

  await upsertOrder({
    customerId: customer.id,
    externalId: payment.payment_id,
    status,
    variantId,
    store: BillingProvider.DODO_PAYMENTS,
  });

  logger.info(
    `✅ Payment ${payment.payment_id} status changed for customer ${customer.id} to ${status}`,
  );
};

export const checkout = async ({
  user,
  referenceId,
  variant: { id },
  discount,
  redirect,
}: CheckoutPayload & { user: BillingUser }) => {
  try {
    const variant = findVariantById(id);

    if (!variant) {
      throw new HttpException(HttpStatusCode.NOT_FOUND, {
        code: "billing:error.variantNotFound",
      });
    }

    const { customer, dodoCustomer } = await createOrRetrieveCustomer({
      referenceId,
      email: user.email,
    });
    const quantity = await getCheckoutQuantity({ variant, referenceId });
    const subscriptionData = getSubscriptionData(variant);

    const session = await dodoPayments().checkoutSessions.create({
      product_cart: [
        {
          product_id: variant.id,
          quantity,
        },
      ],
      customer: {
        customer_id: dodoCustomer.customer_id,
      },
      return_url: redirect.success,
      cancel_url: redirect.cancel,
      metadata: {
        customerId: customer.id,
        referenceId,
        userId: user.id,
      },
      ...(subscriptionData && {
        subscription_data: subscriptionData,
      }),
      ...(discount && {
        discount_code: discount.code,
      }),
    });

    return { url: session.checkout_url ?? null };
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.checkout",
    });
  }
};
