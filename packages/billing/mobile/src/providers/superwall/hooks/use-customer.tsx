import * as Linking from "expo-linking";
import { useUser } from "expo-superwall";
import { useMemo } from "react";

import { MOBILE_STORE_LINKS, MobileStore } from "@workspace/billing";

export const useCustomer = () => {
  const user = useUser();

  const entitlements = useMemo(() => {
    return "entitlements" in user.subscriptionStatus
      ? user.subscriptionStatus.entitlements.map((entitlement) => ({
          id: entitlement.id.toLowerCase(),
          active: user.subscriptionStatus.status === "ACTIVE",
        }))
      : [];
  }, [user.subscriptionStatus]);

  const identify = (userId: string, traits?: Record<string, string | null>) => {
    void user.identify(userId, traits);
  };

  const reset = () => {
    void user.signOut();
  };

  const linkToPortal = async ({
    store,
    variantId,
  }: {
    store: string;
    variantId?: string;
  }) => {
    if (!Object.values(MobileStore).includes(store)) {
      throw new Error(`Invalid store: ${store}`);
    }

    const url = MOBILE_STORE_LINKS[store as keyof typeof MOBILE_STORE_LINKS];

    if (store === MobileStore.PLAY_STORE && variantId) {
      await Linking.openURL(`${url}?sku=${encodeURIComponent(variantId)}`);
      return;
    }

    await Linking.openURL(url);
  };

  return {
    customer: user.user,
    entitlements,
    identify,
    reset,
    linkToPortal,
  };
};
