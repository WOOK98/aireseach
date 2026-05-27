import DodoPayments from "dodopayments";

import { env } from "./env";

let dodoPaymentsInstance: DodoPayments | null = null;

export const dodoPayments = () => {
  dodoPaymentsInstance ??= new DodoPayments({
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
  });

  return dodoPaymentsInstance;
};
