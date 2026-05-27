import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "google-analytics",
  clientPrefix: "VITE_",
  client: {
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string(),
    VITE_GOOGLE_ANALYTICS_SECRET: z.string(),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: import.meta.env
      .VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID,
    VITE_GOOGLE_ANALYTICS_SECRET: import.meta.env.VITE_GOOGLE_ANALYTICS_SECRET,
  },
  skip:
    (!!import.meta.env.SKIP_ENV_VALIDATION &&
      ["1", "true"].includes(import.meta.env.SKIP_ENV_VALIDATION)) ||
    ["lint", "postinstall"].includes(import.meta.env.npm_lifecycle_event),
});
