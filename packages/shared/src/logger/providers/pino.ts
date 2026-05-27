import pino from "pino";

import type { Logger } from "../types";

export const logger: Logger = pino({
  browser: {
    asObject: true,
  },
  level: "debug",
  base: {
    env: process.env.NODE_ENV,
  },
  errorKey: "error",
});
