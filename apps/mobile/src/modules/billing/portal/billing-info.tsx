import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { View } from "react-native";

import { MOBILE_STORE_LINKS, MobileStore } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { buttonTextVariants } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { billing } from "~/modules/billing/lib/api";
import { NativePortalLink } from "~/modules/billing/portal/native-portal-link";
import { WebPortalLink } from "~/modules/billing/portal/web-portal-link";

import type { BillingReference } from "@workspace/billing";
import type { Icon } from "@workspace/ui-mobile/icons";

const MobileStoreIcon: Record<MobileStore, Icon> = {
  [MobileStore.APP_STORE]: Icons.AppleStroke,
  [MobileStore.PLAY_STORE]: Icons.AndroidStroke,
};

export const BillingInfo = ({
  referenceId,
  referenceType,
}: {
  referenceId: string;
  referenceType: BillingReference;
}) => {
  const { t } = useTranslation("billing");
  const summary = useQuery(billing.queries.summary.get(referenceId));

  const stores = useMemo(() => {
    if (!summary.data) return [];
    const allStores = summary.data.flatMap((customer) => [
      ...customer.subscriptions.map((s) => s.store),
      ...customer.orders.map((o) => o.store),
    ]);
    return Array.from(new Set(allStores));
  }, [summary.data]);

  if (!stores.length) {
    return null;
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="font-sans-semibold text-2xl tracking-tight">
          {t("settings.information.title")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("settings.information.description")}
        </Text>
      </View>

      <View className="gap-2">
        {stores.map((store, index) => {
          const variant = index === 0 ? "default" : "outline";

          return store in MOBILE_STORE_LINKS ? (
            (() => {
              const Icon =
                MobileStoreIcon[store as keyof typeof MobileStoreIcon];
              return (
                <NativePortalLink
                  key={store}
                  store={store}
                  size="lg"
                  variant={variant}
                >
                  <View className="size-5">
                    <Icon className={buttonTextVariants({ variant })} />
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Text>{t("settings.information.reviewInStore")}</Text>
                    <Icons.ArrowUpRight
                      className={buttonTextVariants({ variant })}
                      size={18}
                    />
                  </View>
                </NativePortalLink>
              );
            })()
          ) : (
            <WebPortalLink
              key={store}
              size="lg"
              variant={variant}
              className="gap-1.5"
              referenceId={referenceId}
              referenceType={referenceType}
            >
              <Text>{t("settings.information.visitPortal")}</Text>
              <Icons.ArrowUpRight
                className={buttonTextVariants({ variant })}
                size={18}
              />
            </WebPortalLink>
          );
        })}
      </View>
    </View>
  );
};
