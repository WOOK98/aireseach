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

import { OrdersListItem } from "./orders-list-item";

export const OrdersList = ({
  referenceType,
  referenceId,
}: {
  referenceType: BillingReference;
  referenceId: string;
}) => {
  const { t } = useTranslation(["common", "billing"]);

  const summary = useQuery(billing.queries.summary.get(referenceId));

  const orders = summary.data?.flatMap((customer) => customer.orders) ?? [];

  if (!orders.length) {
    return null;
  }

  return (
    <SettingsCard>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("orders")}</SettingsCardTitle>

        <SettingsCardDescription>
          {t("settings.orders.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <div className="-mt-2 flex flex-col divide-y border-t">
        {orders.map((order) => (
          <OrdersListItem
            key={order.id}
            order={order}
            referenceType={referenceType}
            referenceId={referenceId}
          />
        ))}
      </div>
    </SettingsCard>
  );
};
