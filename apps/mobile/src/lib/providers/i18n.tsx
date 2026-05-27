import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { memo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { config, I18nProvider as I18nClientProvider } from "@workspace/i18n";

import { appConfig } from "~/config/app";

export const useI18nConfig = create<{
  config: {
    locale?: string;
  };
  setConfig: (config: { locale?: string }) => void;
}>()(
  persist(
    (set) => ({
      config: { locale: getLocales()[0].languageCode ?? config.defaultLocale },
      setConfig: (config) => set({ config }),
    }),
    {
      name: "i18n-config",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

interface I18nProviderProps {
  readonly children: React.ReactNode;
}

export const I18nProvider = memo<I18nProviderProps>(({ children }) => {
  const config = useI18nConfig((state) => state.config);

  return (
    <I18nClientProvider locale={config.locale} defaultLocale={appConfig.locale}>
      {children}
    </I18nClientProvider>
  );
});

I18nProvider.displayName = "I18nProvider";
