import { stripe } from "../sdk";

import type { Stripe } from "stripe";

export const constructEvent = (data: {
  payload: string;
  sig: string;
  secret: string;
}): Stripe.Event => {
  return stripe().webhooks.constructEvent(data.payload, data.sig, data.secret);
};
