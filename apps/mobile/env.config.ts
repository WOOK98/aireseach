import { defineEnv } from "envin";
import * as z from "zod";

import { preset as analytics } from "@workspace/analytics-mobile/env";
import { preset as billing } from "@workspace/billing-mobile/env";
import { preset as monitoring } from "@workspace/monitoring-mobile/env";
import { envConfig } from "@workspace/shared/constants";
import { castStringToBool } from "@workspace/shared/schema";
import { ThemeColor, ThemeMode } from "@workspace/ui";

export default defineEnv({
  ...envConfig,
  extends: [analytics, billing, monitoring],
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_AUTH_PASSWORD: castStringToBool.optional().default(true),
    EXPO_PUBLIC_AUTH_MAGIC_LINK: castStringToBool.optional().default(false),
    EXPO_PUBLIC_AUTH_EMAIL_OTP: castStringToBool.optional().default(false),
    EXPO_PUBLIC_AUTH_ANONYMOUS: castStringToBool.optional().default(true),
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional().default(""),

    EXPO_PUBLIC_SITE_URL: z.url(),
    EXPO_PUBLIC_DEFAULT_LOCALE: z.string().optional().default("en"),
    EXPO_PUBLIC_THEME_MODE: z
      .enum(ThemeMode)
      .optional()
      .default(ThemeMode.SYSTEM),
    EXPO_PUBLIC_THEME_COLOR: z
      .enum(ThemeColor)
      .optional()
      .default(ThemeColor.ORANGE),
  },
  env: {
    ...process.env,
    EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
    EXPO_PUBLIC_DEFAULT_LOCALE: process.env.EXPO_PUBLIC_DEFAULT_LOCALE,
    EXPO_PUBLIC_THEME_MODE: process.env.EXPO_PUBLIC_THEME_MODE,
    EXPO_PUBLIC_THEME_COLOR: process.env.EXPO_PUBLIC_THEME_COLOR,

    EXPO_PUBLIC_AUTH_PASSWORD: process.env.EXPO_PUBLIC_AUTH_PASSWORD,
    EXPO_PUBLIC_AUTH_MAGIC_LINK: process.env.EXPO_PUBLIC_AUTH_MAGIC_LINK,
    EXPO_PUBLIC_AUTH_EMAIL_OTP: process.env.EXPO_PUBLIC_AUTH_EMAIL_OTP,
    EXPO_PUBLIC_AUTH_ANONYMOUS: process.env.EXPO_PUBLIC_AUTH_ANONYMOUS,
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,

    EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY:
      process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
    EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY:
      process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
    EXPO_PUBLIC_SUPERWALL_APPLE_API_KEY:
      process.env.EXPO_PUBLIC_SUPERWALL_APPLE_API_KEY,
    EXPO_PUBLIC_SUPERWALL_GOOGLE_API_KEY:
      process.env.EXPO_PUBLIC_SUPERWALL_GOOGLE_API_KEY,

    EXPO_PUBLIC_MIXPANEL_TOKEN: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
    EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
  },
});
