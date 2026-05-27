import { track as trackEvent } from "@vercel/analytics";
import { Analytics } from "@vercel/analytics/react";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

export const strategy = {
  Provider: ({ children }) => {
    return (
      <>
        {children}
        <Analytics />
      </>
    );
  },
  track: trackEvent,
  identify: (_userId, _traits) => {
    // Vercel Web Analytics doesn't expose identify() on the client
  },
  reset: () => {
    // Vercel Web Analytics doesn't expose reset() on the client
  },
} satisfies AnalyticsProviderClientStrategy;
