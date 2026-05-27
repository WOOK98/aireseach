import * as z from "zod";

export const checkoutSchema = z.object({
  variant: z.object({
    id: z.string(),
  }),
  referenceId: z.string(),
  discount: z
    .object({
      code: z.string(),
    })
    .optional(),
  redirect: z.object({
    success: z.url(),
    cancel: z.url(),
  }),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;
