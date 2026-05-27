import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Text } from "@workspace/ui-mobile/text";

import { billing } from "~/modules/billing/lib/api";

import { OrdersListItem } from "./orders-list-item";

import type { BillingReference } from "@workspace/billing";

export const OrdersList = ({
  referenceId,
  referenceType,
}: {
  referenceId: string;
  referenceType: BillingReference;
}) => {
  const { t } = useTranslation(["common", "billing"]);
  const summary = useQuery(billing.queries.summary.get(referenceId));

  const orders = summary.data?.flatMap((customer) => customer.orders) ?? [];

  if (!orders.length) {
    return null;
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="font-sans-semibold text-2xl tracking-tight">
          {t("orders")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("settings.orders.description")}
        </Text>
      </View>

      {orders.map((order) => (
        <OrdersListItem
          key={order.id}
          order={order}
          referenceId={referenceId}
          referenceType={referenceType}
        />
      ))}
    </View>
  );
};
