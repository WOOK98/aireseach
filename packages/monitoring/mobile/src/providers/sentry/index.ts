import * as Sentry from "@sentry/react-native";

import { env } from "./env";

import type { MonitoringProviderStrategy } from "@workspace/monitoring";

export const strategy = {
  captureException: (exception) => {
    Sentry.captureException(exception);
  },
  identify: (user: Sentry.User | null) => {
    Sentry.setUser(user);
  },
  initialize: () => {
    const environment = env.EXPO_PUBLIC_SENTRY_ENVIRONMENT;

    Sentry.init({
      dsn: env.EXPO_PUBLIC_SENTRY_DSN,
      environment,
      // Replay may only be enabled for the client-side
      integrations: [
        // add your desired integrations here
        // https://docs.sentry.io/platforms/javascript/configuration/integrations/
      ],

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0,

      // Capture Replay for 10% of all sessions,
      // plus for 100% of sessions with an error
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Adds more context data to events (IP address, cookies, user, etc.)
      // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
      sendDefaultPii: true,

      // Note: if you want to override the automatic release value, do not set a
      // `release` value here - use the environment variable `SENTRY_RELEASE`, so
      // that it will also get attached to your source maps,
    });
  },
} satisfies MonitoringProviderStrategy;
