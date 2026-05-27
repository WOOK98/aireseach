import { PostHog } from "posthog-react-native";

import { env } from "./env";

import type { MonitoringProviderStrategy } from "@workspace/monitoring";

let client: PostHog | null = null;

const getClient = () => {
  client ??= new PostHog(env.EXPO_PUBLIC_POSTHOG_KEY, {
    host: env.EXPO_PUBLIC_POSTHOG_HOST,
    errorTracking: {
      autocapture: {
        uncaughtExceptions: true,
        unhandledRejections: true,
        console: ["error", "warn"],
      },
    },
  });
  return client;
};

export const strategy = {
  captureException: (exception) => {
    const posthog = getClient();
    posthog.captureException(exception);
  },
  identify: <T extends { id: string }>(user: T | null) => {
    const posthog = getClient();
    if (user) {
      posthog.identify(user.id);
    } else {
      posthog.reset();
    }
  },
  initialize: () => {
    /* PostHog is initialized in the app */
  },
} satisfies MonitoringProviderStrategy;
