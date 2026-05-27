import * as z from "zod";

export const webhookEventSchema = z.object({
  event: z.object({
    id: z.string(),
    app_id: z.string(),
    product_id: z.string(),
    environment: z.enum(["SANDBOX", "PRODUCTION"]),
    entitlement_ids: z.array(z.string()).nullish(),
    transaction_id: z.string(),
    app_user_id: z.string(),
    original_app_user_id: z.string(),
    type: z.enum([
      "TEST",
      "INITIAL_PURCHASE",
      "NON_RENEWING_PURCHASE",
      "RENEWAL",
      "PRODUCT_CHANGE",
      "CANCELLATION",
      "BILLING_ISSUE",
      "SUBSCRIBER_ALIAS",
      "SUBSCRIPTION_PAUSED",
      "UNCANCELLATION",
      "TRANSFER",
      "SUBSCRIPTION_EXTENDED",
      "EXPIRATION",
      "TEMPORARY_ENTITLEMENT_GRANT",
      "INVOICE_ISSUANCE",
      "VIRTUAL_CURRENCY_TRANSACTION",
      "EXPERIMENT_ENROLLMENT",
    ]),
  }),
});
