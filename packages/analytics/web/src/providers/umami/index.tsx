import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
      identify: (
        userId?: string | Record<string, unknown>,
        traits?: Record<string, unknown>,
      ) => void;
    };
  }
}

export const strategy = {
  Provider: ({ children }) => {
    return (
      <>
        {children}
        <script
          async
          src={`${env.NEXT_PUBLIC_UMAMI_HOST}/script.js`}
          data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
        ></script>
      </>
    );
  },
  track: (event, data) => {
    if (typeof window === "undefined" || !window.umami) {
      return;
    }

    window.umami.track(event, data);
  },
  identify: (userId, traits) => {
    if (typeof window === "undefined" || !window.umami) {
      return;
    }

    window.umami.identify(userId, traits);
  },
  reset: () => {
    // Umami does not explicitly support resetting the session via the client-side API
  },
} satisfies AnalyticsProviderClientStrategy;
