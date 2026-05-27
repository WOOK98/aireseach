import { posthog } from "posthog-js";

import { env } from "./env";

import type { MonitoringProviderClientStrategy } from "../types";

export const strategy = {
  captureException: (exception) => {
    posthog.captureException(exception);
  },
  identify: <T extends { id: string }>(user: T | null) => {
    if (user) {
      posthog.identify(user.id);
    } else {
      posthog.reset();
    }
  },
  initialize: () => {
    if (posthog.__loaded) {
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
