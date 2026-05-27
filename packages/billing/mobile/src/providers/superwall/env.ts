import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "superwall",
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SUPERWALL_APPLE_API_KEY: z.string(),
    EXPO_PUBLIC_SUPERWALL_GOOGLE_API_KEY: z.string(),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    EXPO_PUBLIC_SUPERWALL_APPLE_API_KEY:
      process.env.EXPO_PUBLIC_SUPERWALL_APPLE_API_KEY,
    EXPO_PUBLIC_SUPERWALL_GOOGLE_API_KEY:
      process.env.EXPO_PUBLIC_SUPERWALL_GOOGLE_API_KEY,
  },
});
