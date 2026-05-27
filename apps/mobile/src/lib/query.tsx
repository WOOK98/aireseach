import { useReactQueryDevTools } from "@dev-plugins/react-query";
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from "@tanstack/react-query";
import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useState } from "react";
import { Alert } from "react-native";

import { logger } from "@workspace/shared/logger";

import { useRefetchOnAppFocus } from "~/modules/common/hooks/use-refetch-on-app-focus";

onlineManager.setEventListener((setOnline) => {
  const eventSubscription = Network.addNetworkStateListener((state) => {
    setOnline(!!state.isConnected);
  });
  return () => eventSubscription.remove();
});

export function QueryClientProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: {
            onError: (error: Error | { error: Error }) => {
              if ("error" in error) {
                error = error.error;
              }

              logger.error(error);
              Alert.alert(error.message);
            },
          },
        },
      }),
  );

  useRefetchOnAppFocus();
  useReactQueryDevTools(queryClient);

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {props.children}
    </TanstackQueryClientProvider>
  );
}
