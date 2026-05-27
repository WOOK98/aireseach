import * as z from "zod";

export const getUsageSchema = z
  .object({
    referenceId: z.string(),
    meterId: z.string().optional(),
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
  })
  .refine(({ start, end }) => !start || !end || end >= start, {
    message: "End date cannot be before start date",
    path: ["end"],
  });

export type GetUsagePayload = z.infer<typeof getUsageSchema>;
