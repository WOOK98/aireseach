import { VemetricScript, vemetric } from "@vemetric/react";

import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

export const strategy = {
  Provider: ({ children }) => {
    return (
      <>
        <VemetricScript
          token={env.NEXT_PUBLIC_VEMETRIC_PROJECT_TOKEN}
          trackPageViews
          trackOutboundLinks
          trackDataAttributes
        />
        {children}
      </>
    );
  },
  track: (event, data) => {
    if (typeof window === "undefined") {
      return;
    }

    void vemetric.trackEvent(event, {
      eventData: data,
    });
  },
  identify: (userId, traits) => {
    if (typeof window === "undefined") {
      return;
    }

    void vemetric.identify({
      identifier: userId,
      data: {
        set: traits,
      },
    });
  },
  reset: () => {
    if (typeof window === "undefined") {
      return;
    }

    void vemetric.resetUser();
  },
} satisfies AnalyticsProviderClientStrategy;
