import { Hono } from "hono";

import { validate } from "../../../middleware";
import { getCustomersInputSchema } from "../../../schema";
import { getCustomers } from "./queries";

export const customersRouter = new Hono().get(
  "/",
  validate("query", getCustomersInputSchema),
  async (c) => c.json(await getCustomers(c.req.valid("query"))),
);
