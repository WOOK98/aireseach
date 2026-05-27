/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import analytics from "@react-native-firebase/analytics";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect } from "react";

import { useTrackingPermissions } from "../../hooks";

import type { AnalyticsProviderClientStrategy } from "@workspace/analytics";

const setup = async () => {
  await analytics().setAnalyticsCollectionEnabled(true);
  await analytics().setConsent({
    analytics_storage: true,
    ad_storage: true,
    ad_user_data: true,
    ad_personalization: true,
  });
};

const useSetup = () => {
  const granted = useTrackingPermissions();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    if (!granted) {
      return;
    }

    void setup();
  }, [granted]);

  useEffect(() => {
    if (!granted) {
      return;
    }

    void analytics().logScreenView({
      screen_name: pathname,
      screen_class: pathname,
      params,
    });
  }, [pathname, params, granted]);
};

export const strategy = {
  Provider: ({ children }) => {
    useSetup();

    return children;
  },
  track: (name, params) => {
    void analytics().logEvent(name, params);
  },
  identify: (userId, traits) => {
    void analytics().setUserId(userId);

    if (traits) {
      void analytics().setUserProperties(traits);
    }
  },
  reset: () => {
    void analytics().setUserId(null);
    void analytics().setUserProperties({});
  },
} satisfies AnalyticsProviderClientStrategy;
