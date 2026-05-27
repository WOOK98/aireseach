import { PostHog } from "posthog-node";

import { env } from "./env";

import type { AnalyticsProviderServerStrategy } from "@workspace/analytics";

let client: PostHog | null = null;

const getClient = () => {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  if (client) {
    return client;
  }

  client = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: env.NEXT_PUBLIC_POSTHOG_HOST,
  });

  return client;
};

export const strategy = {
  track: (event, data) => {
    const client = getClient();

    if (!client) {
      return;
    }

    client.capture({
      event,
      distinctId: typeof data?.distinctId === "string" ? data.distinctId : "",
      properties: data,
    });
  },
} satisfies AnalyticsProviderServerStrategy;
