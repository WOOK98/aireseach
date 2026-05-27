import * as z from "zod";

import {
  BillingDiscountType,
  BillingModel,
  BillingPlan,
  BillingType,
  RecurringInterval,
} from "../types";

export const discountSchema = z.object({
  code: z.string(),
  type: z.enum(BillingDiscountType),
  off: z.number(),
  appliesTo: z.array(z.string()),
});

const tierSchema = z.object({
  cost: z.number(),
  upTo: z
    .union([z.literal("infinite"), z.number()])
    .optional()
    .default("infinite"),
});

const variantModelSchema = z.discriminatedUnion("model", [
  z.object({
    model: z.literal(BillingModel.ONE_TIME),
  }),
  z.object({
    model: z.literal(BillingModel.RECURRING),
    interval: z.enum(RecurringInterval),
    trialDays: z.number().positive().optional(),
  }),
]);

const variantCostSchema = z.union([
  z.object({
    type: z.literal(BillingType.FLAT),
    cost: z.number(),
  }),
  z
    .object({
      type: z.literal(BillingType.METERED),
      unit: z.string(),
      meterId: z.string(),
    })
    .and(
      z.union([
        z.object({
          cost: z.number(),
        }),
        z.object({
          tiers: z.array(tierSchema),
        }),
      ]),
    ),
  z
    .object({
      type: z.literal(BillingType.PER_SEAT),
    })
    .and(
      z.union([
        z.object({
          cost: z.number(),
        }),
        z.object({
          tiers: z.array(tierSchema),
        }),
      ]),
    ),
]);

const customVariantSchema = z.union([
  z.object({
    type: z.enum(BillingType).optional().default(BillingType.FLAT),
    custom: z.literal(true),
    label: z.string(),
    href: z.string(),
  }),
  z.intersection(
    z.object({
      custom: z.literal(false).optional().default(false),
      currency: z.string().optional().default("usd"),
    }),
    variantCostSchema,
  ),
]);

const sharedVariantSchema = z.intersection(
  customVariantSchema,
  z.object({
    id: z.string(),
    hidden: z.boolean().optional().default(false),
  }),
);

export const variantSchema = z
  .intersection(sharedVariantSchema, variantModelSchema)
  .superRefine((variant, ctx) => {
    if (
      variant.model === BillingModel.ONE_TIME &&
      variant.type === BillingType.METERED
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Metered variants cannot use one-time billing model.",
        path: ["model"],
      });
    }

    if (
      variant.model === BillingModel.ONE_TIME &&
      variant.type === BillingType.PER_SEAT &&
      "tiers" in variant
    ) {
      ctx.addIssue({
        code: "custom",
        message: "One-time per-seat variants cannot use tiered pricing.",
        path: ["tiers"],
      });
    }
  });

export const planSchema = z.object({
  id: z.enum(BillingPlan),
  name: z.string(),
  description: z.string(),
  badge: z.string().nullish().default(null),
  features: z.array(z.string()),
  limits: z.record(z.string(), z.union([z.number(), z.null()])).optional(),
  variants: z.array(variantSchema),
});

export const billingConfigSchema = z.object({
  plans: z.array(planSchema).refine(
    (plans) => {
      const types = new Set(plans.map((plan) => plan.id));
      return types.size === plans.length;
    },
    {
      message: "You can't have two plans with the same id!",
    },
  ),
  discounts: z.array(discountSchema).optional().default([]),
});

export type BillingConfig = z.infer<typeof billingConfigSchema>;
export type BillingConfigPlan = z.infer<typeof planSchema>;
export type BillingConfigVariant = z.infer<typeof variantSchema>;
export type BillingConfigDiscount = z.infer<typeof discountSchema>;
export type BillingConfigTier = z.infer<typeof tierSchema>;
