import { defineEnv } from "envin";
import * as z from "zod";

import { envConfig } from "@workspace/shared/constants";

import type { Preset } from "envin/types";

export const DODO_PAYMENTS_ENVIRONMENTS = {
  TEST_MODE: "test_mode",
  LIVE_MODE: "live_mode",
} as const;

export const preset = {
  id: "dodo-payments",
  server: {
    DODO_PAYMENTS_API_KEY: z.string(),
    DODO_PAYMENTS_WEBHOOK_KEY: z.string(),
    DODO_PAYMENTS_ENVIRONMENT: z
      .enum(DODO_PAYMENTS_ENVIRONMENTS)
      .default(DODO_PAYMENTS_ENVIRONMENTS.TEST_MODE),
  },
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
});
