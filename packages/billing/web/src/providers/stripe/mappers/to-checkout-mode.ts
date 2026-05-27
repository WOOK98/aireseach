import { Stripe } from "stripe";

import { BillingModel } from "@workspace/billing";

export const toCheckoutMode = (
  model: BillingModel,
): Stripe.Checkout.SessionCreateParams["mode"] => {
  switch (model) {
    case BillingModel.ONE_TIME:
      return "payment";
    case BillingModel.RECURRING:
      return "subscription";
    default:
      throw new Error("Invalid billing model");
  }
};
