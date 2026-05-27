import { logger } from "@workspace/shared/logger";

import { env } from "./env";

import type { AnalyticsProviderServerStrategy } from "@workspace/analytics";

export const strategy = {
  track: (event, data) => {
    const url = typeof data?.url === "string" ? data.url : "app://server-side";
    const referrer =
      typeof data?.referrer === "string" ? data.referrer : undefined;
    const ip = typeof data?.ip === "string" ? data.ip : undefined;

    const props = data
      ? Object.fromEntries(
          Object.entries(data).filter(
            ([key]) => !["url", "referrer", "ip"].includes(key),
          ),
        )
      : undefined;

    void fetch(`${env.NEXT_PUBLIC_PLAUSIBLE_HOST}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TurboStarter-Server/1.0 (Server-side tracking)",
        ...(ip && { "X-Forwarded-For": ip }),
      },
      body: JSON.stringify({
        domain: env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
        name: event,
        url: url,
        ...(referrer && { referrer }),
        ...(props && Object.keys(props).length > 0 && { props }),
      }),
    }).then((res) => {
      if (!res.ok) {
        logger.error("Failed to post event to Plausible: ", res);
      }
      return;
    });
  },
} satisfies AnalyticsProviderServerStrategy;
