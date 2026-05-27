import * as Sentry from "@sentry/nextjs";

import { env } from "./env";

import type { MonitoringProviderServerStrategy } from "../types";

export const strategy = {
  captureException: (exception) => {
    Sentry.captureException(exception);
  },
  initialize: () => {
    const environment = env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;

    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      environment,

      // Adds more context data to events (IP address, cookies, user, etc.)
      // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
      sendDefaultPii: true,

      // Note: if you want to override the automatic release value, do not set a
      // `release` value here - use the environment variable `SENTRY_RELEASE`, so
      // that it will also get attached to your source maps,
    });
  },
  onRequestError: Sentry.captureRequestError,
} satisfies MonitoringProviderServerStrategy;
