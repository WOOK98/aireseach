import { PostHog } from "posthog-node";

import { env } from "./env";

import type { MonitoringProviderServerStrategy } from "../types";

let posthogInstance: PostHog | null = null;

export function getPostHogServer() {
  posthogInstance ??= new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogInstance;
}

export const strategy = {
  captureException: (exception, extra) => {
    const posthog = getPostHogServer();

    const distinctId = typeof extra?.id === "string" ? extra.id : undefined;
    posthog.captureException(exception, distinctId, extra);
  },
  initialize: () => {
    getPostHogServer();
  },
  onRequestError: (error, request) => {
    /* eslint-disable-next-line turbo/no-undeclared-env-vars, no-restricted-properties */
    if (process.env.NEXT_RUNTIME !== "nodejs") {
      return;
    }

    const posthog = getPostHogServer();
    let distinctId: string | undefined;
    if (request.headers.cookie) {
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join("; ")
        : request.headers.cookie;

      const postHogCookieMatch = /ph_phc_.*?_posthog=([^;]+)/.exec(
        cookieString,
      );

      if (postHogCookieMatch?.[1]) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
          const data: unknown = JSON.parse(decodedCookie);

          if (
            typeof data === "object" &&
            data !== null &&
            "distinct_id" in data &&
            typeof data.distinct_id === "string"
          ) {
            distinctId = data.distinct_id;
          }
        } catch {
          /*  Ignore */
        }
      }
    }

    posthog.captureException(error, distinctId);
  },
} satisfies MonitoringProviderServerStrategy;
