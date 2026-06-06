import { defineEnv } from "envin";
import * as z from "zod";

import { preset as auth } from "@workspace/auth/env";
import { preset as billingMobile } from "@workspace/billing-mobile/server/env";
import { preset as billingWeb } from "@workspace/billing-web/env";
import { preset as db } from "@workspace/db/env";
import { preset as email } from "@workspace/email/env";
import { preset as monitoring } from "@workspace/monitoring-web/env";
import { envConfig } from "@workspace/shared/constants";
import { preset as storage } from "@workspace/storage/env";

import type { Preset } from "envin/types";

export const preset = {
  id: "api",
  server: {
    OPENAI_API_KEY: z.string().optional(), // change it to your provider API key (e.g. ANTHROPIC_API_KEY if you use Anthropic)
    DEEPSEEK_API_KEY: z.string().optional(),
    LLM_API_KEY: z.string().optional(),
  },
  extends: [auth, billingWeb, billingMobile, db, email, storage, monitoring],
} as const satisfies Preset;

export const env = defineEnv({
  ...envConfig,
  ...preset,
  env: {
    ...process.env,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,

    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
});
