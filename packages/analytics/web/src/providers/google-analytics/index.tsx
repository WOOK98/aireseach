import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  window.dataLayer?.push(args);
}

export const strategy = {
  Provider: ({ children }) => {
    return (
      <>
        {children}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID}`}
          onLoad={() => {
            if (typeof window === "undefined") {
              return;
            }

            window.dataLayer = window.dataLayer ?? [];

            window.gtag = gtag;

            window.gtag("js", new Date());
            window.gtag(
              "config",
              env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID,
            );
          }}
        />
      </>
    );
  },
  track: (event, data) => {
    if (typeof window === "undefined" || !window.gtag) {
      return;
    }

    window.gtag("event", event, data);
  },
  identify: (userId, traits) => {
    if (typeof window === "undefined" || !window.gtag) {
      return;
    }

    window.gtag("config", env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID, {
      user_id: userId,
      ...traits,
    });
  },
  reset: () => {
    if (typeof window === "undefined" || !window.gtag) {
      return;
    }

    window.gtag("config", env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID, {
      user_id: null,
    });
  },
} satisfies AnalyticsProviderClientStrategy;
