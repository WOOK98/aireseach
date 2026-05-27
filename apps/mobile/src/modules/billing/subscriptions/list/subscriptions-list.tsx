import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Text } from "@workspace/ui-mobile/text";

import { billing } from "~/modules/billing/lib/api";

import { SubscriptionsListItem } from "./subscriptions-list-item";

import type { BillingReference } from "@workspace/billing";

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
    <View className="gap-4">
      <View className="gap-1">
        <Text className="font-sans-semibold text-2xl tracking-tight">
          {t("subscriptions")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("settings.subscriptions.description")}
        </Text>
      </View>

      {subscriptions.map((subscription) => (
        <SubscriptionsListItem
          key={subscription.id}
          subscription={subscription}
          referenceId={referenceId}
          referenceType={referenceType}
        />
      ))}
    </View>
  );
};
