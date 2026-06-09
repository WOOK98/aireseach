import { Hono } from "hono";

import * as web from "@workspace/billing-web/server";

export const webhooksRouter = new Hono().post("/stripe", (c) =>
  web.webhookHandler(c.req.raw),
);
