import { useEffect } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import { env } from "./env";

export const Provider = ({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale?: string;
}) => {
  useEffect(() => {
    if (__DEV__) {
      void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey = Platform.select({
      ios: env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
      android: env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
    });

    if (!apiKey) {
      return;
    }

    Purchases.configure({ apiKey, preferredUILocaleOverride: locale });
  }, []);

  useEffect(() => {
    void Purchases.overridePreferredLocale(locale ?? null);
  }, [locale]);

  return children;
};
