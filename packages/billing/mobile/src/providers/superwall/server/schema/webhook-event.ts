import * as z from "zod";

const eventDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalAppUserId: z.string().nullish(),
  originalTransactionId: z.string().nullish(),
  transactionId: z.string().nullish(),
  productId: z.string().nullish(),
  periodType: z.enum(["TRIAL", "INTRO", "NORMAL"]).nullish(),
  cancelReason: z.string().nullish(),
  expirationAt: z.number().nullish(),
  purchasedAt: z.number().nullish(),
  environment: z.enum(["PRODUCTION", "SANDBOX"]).nullish(),
  userAttributes: z.record(z.string(), z.unknown()).nullish(),
  store: z.string(),
});

export const webhookEventSchema = z.object({
  object: z.literal("event"),
  type: z.string(),
  projectId: z.number(),
  applicationId: z.number(),
  timestamp: z.number(),
  data: eventDataSchema,
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
