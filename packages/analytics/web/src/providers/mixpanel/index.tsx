"use client";

import mixpanel from "mixpanel-browser";
import { useEffect } from "react";

import { NodeEnv } from "@workspace/shared/constants";

import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

const init = () => {
  mixpanel.init(env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
    debug: env.NODE_ENV === NodeEnv.DEVELOPMENT,
    autocapture: true,
    persistence: "localStorage",
  });
};

export const strategy = {
  Provider: ({ children }) => {
    useEffect(() => {
      init();
    }, []);
    return children;
  },
  track: (event, properties) => {
    if (typeof window === "undefined") {
      return;
    }

    mixpanel.track(event, properties);
  },
  identify: (userId, traits) => {
    if (typeof window === "undefined") {
      return;
    }

    mixpanel.identify(userId);
    if (traits) {
      mixpanel.people.set(traits);
    }
  },
  reset: () => {
    if (typeof window === "undefined") {
      return;
    }

    mixpanel.reset();
  },
} satisfies AnalyticsProviderClientStrategy;
