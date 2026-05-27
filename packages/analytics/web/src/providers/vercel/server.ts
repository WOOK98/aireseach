import { track as vercelTrack } from "@vercel/analytics/server";

import type { AnalyticsProviderServerStrategy } from "@workspace/analytics";

export const strategy = {
  track: (event, data) => {
    void vercelTrack(event, data);
  },
} satisfies AnalyticsProviderServerStrategy;
