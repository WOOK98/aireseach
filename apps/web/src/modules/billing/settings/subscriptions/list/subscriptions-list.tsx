"use client";

import { useQuery } from "@tanstack/react-query";

import { BillingReference } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";

import { billing } from "~/modules/billing/lib/api";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
} from "~/modules/common/layout/dashboard/settings-card";

import { SubscriptionsListItem } from "./subscriptions-list-item";

export const SubscriptionsList = ({
  referenceId,
  referenceType,
}: {
  referenceId: string;
  referenceType: BillingReference;
}) => {
  const { t } = useTranslation(["common", "billing"]);

  const summary = useQuery(billing.queries.summary.get(referenceId));

  const subscriptions =
    summary.data?.flatMap((customer) => customer.subscriptions) ?? [];

  if (!subscriptions.length) {
    return null;
  }

  return (
    <SettingsCard>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("subscriptions")}</SettingsCardTitle>

        <SettingsCardDescription>
          {t("settings.subscriptions.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <div className="-mt-2 flex flex-col divide-y border-t">
        {subscriptions.map((subscription) => (
          <SubscriptionsListItem
            key={subscription.id}
            subscription={subscription}
            referenceId={referenceId}
            referenceType={referenceType}
          />
        ))}
      </div>
    </SettingsCard>
  );
};
