import { NuqsAdapter } from "nuqs/adapters/next/app";
import { memo } from "react";

import { I18nProvider } from "@workspace/i18n";

import { appConfig } from "~/config/app";
import { QueryClientProvider } from "~/lib/query/client";

import { AnalyticsProvider } from "./analytics";
import { MonitoringProvider } from "./monitoring";
import { MotionProvider } from "./motion";
import { ThemeProvider } from "./theme";

interface ProvidersProps {
  readonly children: React.ReactNode;
  readonly locale: string;
}

export const Providers = memo<ProvidersProps>(({ children, locale }) => {
  return (
    <I18nProvider locale={locale} defaultLocale={appConfig.locale}>
      <QueryClientProvider>
        <NuqsAdapter>
          <AnalyticsProvider>
            <MonitoringProvider>
              <ThemeProvider>
                <MotionProvider>{children}</MotionProvider>
              </ThemeProvider>
            </MonitoringProvider>
          </AnalyticsProvider>
        </NuqsAdapter>
      </QueryClientProvider>
    </I18nProvider>
  );
});

Providers.displayName = "Providers";
