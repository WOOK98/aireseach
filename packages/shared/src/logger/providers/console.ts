import type { Logger } from "../types";

export const logger: Logger = {
  info: console.info,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};
