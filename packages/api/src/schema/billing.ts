import * as z from "zod";

import {
  selectCustomerSchema,
  selectOrderSchema,
  selectSubscriptionSchema,
} from "@workspace/db/schema";

export const getBillingSummaryResponseSchema = z.array(
  selectCustomerSchema.extend({
    subscriptions: z.array(selectSubscriptionSchema),
    orders: z.array(selectOrderSchema),
  }),
);
