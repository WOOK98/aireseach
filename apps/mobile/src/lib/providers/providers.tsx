import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PortalHost } from "@rn-primitives/portal";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import { memo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BillingProvider } from "~/lib/providers/billing";
import { I18nProvider } from "~/lib/providers/i18n";
import { ThemeProvider } from "~/lib/providers/theme";
import { QueryClientProvider } from "~/lib/query";
import { Verification } from "~/modules/auth/verification";

import { AnalyticsProvider } from "./analytics";
import { MonitoringProvider } from "./monitoring";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(advancedFormat);

interface ProvidersProps {
  readonly children: React.ReactNode;
}

export const Providers = memo<ProvidersProps>(({ children }) => {
  return (
    <GestureHandlerRootView>
      <QueryClientProvider>
        <I18nProvider>
          <SafeAreaProvider>
            <ThemeProvider>
              <KeyboardProvider>
                <BottomSheetModalProvider>
                  <MonitoringProvider>
                    <AnalyticsProvider>
                      <BillingProvider>
                        {children}
                        <Verification />
                        <PortalHost />
                      </BillingProvider>
                    </AnalyticsProvider>
                  </MonitoringProvider>
                </BottomSheetModalProvider>
              </KeyboardProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </I18nProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
});

Providers.displayName = "Providers";
