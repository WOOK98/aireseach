"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { BillingReference, MobileStore } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-web/icons";

import { billing } from "~/modules/billing/lib/api";
import { PortalLink } from "~/modules/billing/settings/portal/portal-link";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
  SettingsCardContent,
} from "~/modules/common/layout/dashboard/settings-card";

import type { Icon } from "@workspace/ui-web/icons";

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
    <SettingsCard>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("settings.information.title")}</SettingsCardTitle>
        <SettingsCardDescription>
          {t("settings.information.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <SettingsCardContent className="flex flex-wrap items-center gap-2">
        {stores.map((store, index) => {
          const isMobileStore = Object.values(MobileStore).includes(store);
          const Icon = isMobileStore
            ? MobileStoreIcon[store as keyof typeof MobileStoreIcon]
            : null;

          return (
            <PortalLink
              key={store}
              store={store}
              className="w-full sm:w-fit"
              referenceId={referenceId}
              referenceType={referenceType}
              {...(index > 0 && { variant: "outline" })}
            >
              {Icon && <Icon className="size-4" />}
              {isMobileStore
                ? t("settings.information.reviewInStore")
                : t("settings.information.visitPortal")}
              <Icons.ArrowUpRight className="size-4" />
            </PortalLink>
          );
        })}
      </SettingsCardContent>
    </SettingsCard>
  );
};
