import { Mixpanel } from "mixpanel-react-native";
import { useEffect } from "react";

import { useTrackingPermissions } from "../../hooks";
import { env } from "./env";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

const optOutTracking = true;
const trackAutomaticEvents = false;
const mixpanel = new Mixpanel(
  env.EXPO_PUBLIC_MIXPANEL_TOKEN,
  trackAutomaticEvents,
  optOutTracking,
);

void mixpanel.init();

export const strategy = {
  Provider: ({ children }) => {
    const granted = useTrackingPermissions();

    useEffect(() => {
      void (async () => {
        const optedOut = await mixpanel.hasOptedOutTracking();
        if (granted && optedOut) {
          mixpanel.optInTracking();
        }
      })();
    }, [granted]);

    return <>{children}</>;
  },
  track: (name, params) => {
    mixpanel.track(name, params);
  },
  identify: (userId, traits) => {
    void mixpanel.identify(userId);
    if (traits) {
      mixpanel.getPeople().set(traits);
    }
  },
  reset: () => {
    mixpanel.reset();
  },
} satisfies AnalyticsProviderClientStrategy;
