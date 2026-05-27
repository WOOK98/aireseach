import PostHog, { PostHogProvider } from "posthog-react-native";
import { useEffect } from "react";

import { useTrackingPermissions } from "../../hooks";
import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

let client: PostHog | null = null;

const getClient = () => {
  if (client) {
    return client;
  }

  client = new PostHog(env.EXPO_PUBLIC_POSTHOG_KEY, {
    host: env.EXPO_PUBLIC_POSTHOG_HOST,
    defaultOptIn: false,
  });

  return client;
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = getClient();

  return (
    <PostHogProvider client={client} autocapture>
      {children}
    </PostHogProvider>
  );
};

const Setup = () => {
  const client = getClient();
  const granted = useTrackingPermissions();

  useEffect(() => {
    if (granted) {
      void client.optIn();
    } else {
      void client.optOut();
    }
  }, [granted, client]);

  return null;
};

const ProviderComponent = ({ children }: { children: React.ReactNode }) => {
  return (
    <Wrapper>
      <Setup />
      {children}
    </Wrapper>
  );
};

export const strategy = {
  Provider: ProviderComponent,
  track: (name, params) => {
    const client = getClient();
    client.capture(name, params);
  },
  identify: (userId, traits) => {
    const client = getClient();
    client.identify(userId, traits);
  },
  reset: () => {
    const client = getClient();
    client.reset();
  },
} satisfies AnalyticsProviderClientStrategy;
