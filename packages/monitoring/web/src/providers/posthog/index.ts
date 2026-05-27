import { posthog } from "posthog-js";

import { env } from "./env";

import type { MonitoringProviderClientStrategy } from "../types";

export const strategy = {
  captureException: (exception) => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY || !posthog.__loaded) {
      return;
    }

    posthog.captureException(exception);
  },
  identify: <T extends { id: string }>(user: T | null) => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY || !posthog.__loaded) {
      return;
    }

    if (user) {
      posthog.identify(user.id);
    } else {
      posthog.reset();
    }
  },
  initialize: () => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY || posthog.__loaded) {
      return;
    }

    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  },
  onRouterTransitionStart: () => {
    /* PostHog does not provide a way to capture router transitions yet */
  },
} satisfies MonitoringProviderClientStrategy;
