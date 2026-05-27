import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig, NodeEnv } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "sentry",
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SENTRY_DSN: z.string(),
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: z
      .string()
      .default(process.env.APP_ENV ?? NodeEnv.DEVELOPMENT),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    ...process.env,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
  },
});
