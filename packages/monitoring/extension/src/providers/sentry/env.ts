import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig, NodeEnv } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "sentry",
  clientPrefix: "VITE_",
  client: {
    VITE_SENTRY_DSN: z.string(),
    VITE_SENTRY_ENVIRONMENT: z
      .string()
      .default(process.env.NODE_ENV ?? NodeEnv.DEVELOPMENT),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_SENTRY_ENVIRONMENT: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  },
  skip:
    (!!import.meta.env.SKIP_ENV_VALIDATION &&
      ["1", "true"].includes(import.meta.env.SKIP_ENV_VALIDATION)) ||
    ["lint", "postinstall"].includes(import.meta.env.npm_lifecycle_event),
});
