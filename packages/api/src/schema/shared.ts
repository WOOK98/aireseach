import * as z from "zod";

import { sortSchema } from "@workspace/shared/schema";

export const multiValueQuerySchema = <T extends z.ZodType>(value: T) =>
  z.union([value.transform((val) => [val]), z.array(value)]);

export const sortQuerySchema = z
  .string()
  .transform((val) =>
    z.array(sortSchema).parse(JSON.parse(decodeURIComponent(val))),
  );

export const rangeQuerySchema = z.tuple([z.coerce.number(), z.coerce.number()]);
