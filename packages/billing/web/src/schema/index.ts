import { z } from "zod";

export * from "./billing-portal";
export * from "./checkout";
export * from "./usage";

export const getSummarySchema = z.object({
  referenceId: z.string().optional(),
});

export type GetSummaryPayload = z.infer<typeof getSummarySchema>;
