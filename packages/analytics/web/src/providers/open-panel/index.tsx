import { OpenPanelComponent } from "@openpanel/nextjs";

import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

export const strategy = {
  Provider: ({ children }) => {
    return (
      <>
        {children}
        <OpenPanelComponent
          clientId={env.NEXT_PUBLIC_OPEN_PANEL_CLIENT_ID}
          trackScreenViews
          trackAttributes
          trackOutgoingLinks
        />
      </>
    );
  },
  track: (event, data) => {
    if (typeof window === "undefined") {
      return;
    }

    window.op("track", event, data);
  },
  identify: (userId, traits) => {
    if (typeof window === "undefined") {
      return;
    }

    window.op("identify", {
      profileId: userId,
      ...traits,
    });
  },
  reset: () => {
    if (typeof window === "undefined") {
      return;
    }

    window.op("clear");
  },
} satisfies AnalyticsProviderClientStrategy;
