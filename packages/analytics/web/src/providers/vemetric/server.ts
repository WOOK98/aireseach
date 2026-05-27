import { Vemetric } from "@vemetric/node";

import { env } from "./env";

import type { AnalyticsProviderServerStrategy } from "@workspace/analytics";

let client: Vemetric | null = null;

const getClient = () => {
  if (client) {
    return client;
  }

  client = new Vemetric({
    token: env.NEXT_PUBLIC_VEMETRIC_PROJECT_TOKEN,
  });

  return client;
};

export const strategy = {
  track: (event, data) => {
    const client = getClient();

    void client.trackEvent(event, {
      userIdentifier: data?.distinctId?.toString() ?? "anonymous",
      eventData: data,
    });
  },
} satisfies AnalyticsProviderServerStrategy;
