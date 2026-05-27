import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const preset = {
  id: "lemon-squeezy",
  server: {
    LEMON_SQUEEZY_API_KEY: z.string(),
    LEMON_SQUEEZY_SIGNING_SECRET: z.string(),
    LEMON_SQUEEZY_STORE_ID: z.string(),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
});
