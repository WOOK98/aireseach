import {
  SuperwallError,
  SuperwallLoaded,
  SuperwallLoading,
  SuperwallProvider,
} from "expo-superwall";

import { env } from "./env";

export interface SuperwallProviderProps {
  children: React.ReactNode;
  loading?: React.ReactNode;
  error?: React.ReactNode;
  locale?: string;
}

export const Provider = ({
  children,
  loading,
  error,
  locale,
}: SuperwallProviderProps) => {
  return (
    <SuperwallProvider
      apiKeys={{
        ios: env.EXPO_PUBLIC_SUPERWALL_APPLE_API_KEY,
        android: env.EXPO_PUBLIC_SUPERWALL_GOOGLE_API_KEY,
      }}
      options={{
        localeIdentifier: locale,
        passIdentifiersToPlayStore: true,
      }}
    >
      {loading && <SuperwallLoading>{loading}</SuperwallLoading>}
      {error && <SuperwallError>{error}</SuperwallError>}
      {loading || error ? (
        <SuperwallLoaded>{children}</SuperwallLoaded>
      ) : (
        children
      )}
    </SuperwallProvider>
  );
};
