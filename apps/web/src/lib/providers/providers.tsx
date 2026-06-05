import { NuqsAdapter } from "nuqs/adapters/next/app";
import { lazy, memo, Suspense } from "react";

import { I18nProvider } from "@workspace/i18n";

import { appConfig } from "~/config/app";
import { QueryClientProvider } from "~/lib/query/client";

import { ThemeProvider } from "./theme";

// Lazy-load non-critical providers to reduce initial JS bundle
const LazyAnalyticsProvider = lazy(() =>
  import("./analytics").then((m) => ({ default: m.AnalyticsProvider })),
);
const LazyMonitoringProvider = lazy(() =>
  import("./monitoring").then((m) => ({ default: m.MonitoringProvider })),
);
const LazyMotionProvider = lazy(() =>
  import("./motion").then((m) => ({ default: m.MotionProvider })),
);

interface ProvidersProps {
  readonly children: React.ReactNode;
  readonly locale: string;
}

export const Providers = memo<ProvidersProps>(({ children, locale }) => {
  return (
    <I18nProvider locale={locale} defaultLocale={appConfig.locale}>
      <QueryClientProvider>
        <ThemeProvider>
          <Suspense fallback={null}>
            <NuqsAdapter>
              <LazyAnalyticsProvider>
                <LazyMonitoringProvider>
                  <LazyMotionProvider>{children}</LazyMotionProvider>
                </LazyMonitoringProvider>
              </LazyAnalyticsProvider>
            </NuqsAdapter>
          </Suspense>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
});

Providers.displayName = "Providers";
