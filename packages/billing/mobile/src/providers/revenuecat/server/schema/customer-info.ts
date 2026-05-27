import * as z from "zod";

export const periodTypeSchema = z.enum(["intro", "normal", "trial"]);
export type PeriodType = z.infer<typeof periodTypeSchema>;

export const subscriptionSchema = z.object({
  expires_date: z.string().nullish(),
  period_type: periodTypeSchema.nullish(),
  refunded_at: z.string().nullish(),
  billing_issues_detected_at: z.string().nullish(),
  grace_period_expires_date: z.string().nullish(),
  auto_resume_date: z.string().nullish(),
  original_transaction_id: z.string().nullish(),
  store_transaction_id: z.string().nullish(),
  original_purchase_date: z.string().nullish(),
  purchase_date: z.string().nullish(),
  unsubscribe_detected_at: z.string().nullish(),
  store: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export const entitlementSchema = z.object({
  expires_date: z.string().nullish(),
  product_identifier: z.string().nullish(),
  purchase_date: z.string().nullish(),
});

export type Entitlement = z.infer<typeof entitlementSchema>;

export const nonSubscriptionPurchaseSchema = z.object({
  id: z.string().nullish(),
  purchase_date: z.string().nullish(),
  original_purchase_date: z.string().nullish(),
  original_transaction_id: z.string().nullish(),
  store_transaction_id: z.string().nullish(),
  expires_date: z.string().nullish(),
  refunded_at: z.string().nullish(),
  store: z.string(),
});

export type NonSubscriptionPurchase = z.infer<
  typeof nonSubscriptionPurchaseSchema
>;

export const customerInfoSchema = z.object({
  subscriber: z.object({
    entitlements: z.record(z.string(), entitlementSchema).nullish(),
    subscriptions: z.record(z.string(), subscriptionSchema).nullish(),
    non_subscriptions: z
      .record(z.string(), z.array(nonSubscriptionPurchaseSchema))
      .nullish(),
  }),
});

export type CustomerInfo = z.infer<typeof customerInfoSchema>;
