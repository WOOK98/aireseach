import {
  BillingConfigVariant,
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

import { BillingProvider } from "../types";
import { createOrRetrieveCustomer } from "./customer";
import { toPaymentStatus } from "./mappers/to-billing-status";
import { toCheckoutMode } from "./mappers/to-checkout-mode";
import { stripe } from "./sdk";
import {
  getPromotionCode,
  subscriptionStatusChangeHandler,
} from "./subscription";

import type { CheckoutPayload } from "../../schema";
import type { BillingUser } from "../types";
import type { Stripe } from "stripe";

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
  if (variant.type === BillingType.METERED) {
    return null;
  }
  return 1;
};

const createCheckoutSession = async (
  params: Stripe.Checkout.SessionCreateParams,
) => {
  try {
    return await stripe().checkout.sessions.create(params);
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.checkout",
    });
  }
};

const getCheckoutSession = async (sessionId: string) => {
  try {
    return await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: "billing:error.checkoutRetrieve",
    });
  }
};

export const checkoutStatusChangeHandler = async (
  session: Stripe.Checkout.Session,
) => {
  const customerId = session.customer as string | null;

  if (!customerId) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  if (session.mode === "subscription") {
    await subscriptionStatusChangeHandler({
      id: session.subscription as string,
      customerId,
    });
    return;
  }

  const customer = await getCustomerByExternalId(customerId);

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.customerNotFound",
    });
  }

  const checkoutSession = await getCheckoutSession(session.id);
  const variantId = checkoutSession.line_items?.data[0]?.price?.id;

  if (!variantId) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: "billing:error.variantNotFound",
    });
  }

  const status = toPaymentStatus(checkoutSession.payment_status);

  await upsertOrder({
    customerId: customer.id,
    externalId: checkoutSession.id,
    status,
    variantId,
    store: BillingProvider.STRIPE,
  });

  logger.info(
    `✅ Checkout ${checkoutSession.id} status changed for customer ${customer.id} to ${status}`,
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

    const { stripeCustomer } = await createOrRetrieveCustomer({
      referenceId,
      email: user.email,
    });

    const code = discount?.code ? await getPromotionCode(discount.code) : null;
    const quantity = await getCheckoutQuantity({ variant, referenceId });

    const session = await createCheckoutSession({
      mode: toCheckoutMode(variant.model),
      billing_address_collection: "required",
      customer: stripeCustomer.id,
      customer_update: {
        address: "auto",
      },
      line_items: [
        {
          price: variant.id,
          ...(quantity ? { quantity } : {}),
        },
      ],
      success_url: redirect.success,
      cancel_url: redirect.cancel,
      ...("trialDays" in variant && variant.trialDays
        ? {
            subscription_data: {
              trial_period_days: variant.trialDays,
            },
          }
        : {}),
      ...(code && {
        discounts: [
          {
            promotion_code: code.id,
          },
        ],
      }),
    });

    return { url: session.url };
  } catch (e) {
    logger.error(e);
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR);
  }
};
