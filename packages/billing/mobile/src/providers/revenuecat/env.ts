import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "revenuecat",
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY: z.string(),
    EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY: z.string(),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY:
      process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
    EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY:
      process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
  },
});
