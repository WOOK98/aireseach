"use client";

import { findPlanByVariantId, PaymentStatus } from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-web/badge";
import { Icons } from "@workspace/ui-web/icons";

import { FeaturesList } from "~/modules/billing/features-list";
import { PortalLink } from "~/modules/billing/settings/portal/portal-link";

import type { BillingReference, Order } from "@workspace/billing";

export const OrdersListItem = ({
  order,
  referenceId,
  referenceType,
}: {
  order: Order;
  referenceId: string;
  referenceType: BillingReference;
}) => {
  const { t, i18n } = useTranslation(["common", "billing"]);
  const { plan } = findPlanByVariantId(order.variantId);

  const name = plan?.name;
  const description = plan?.description;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col items-start justify-start gap-1">
        <div className="flex items-center justify-start gap-2">
          {order.status === PaymentStatus.SUCCEEDED ? (
            <Icons.BadgeCheck className="size-5" />
          ) : (
            <Icons.BadgeX className="size-5" />
          )}
          {name && (
            <span className="text-lg font-medium capitalize">
              {isKey(name, i18n, "billing") ? t(name) : name}
            </span>
          )}
          <Badge
            variant={
              order.status === PaymentStatus.SUCCEEDED
                ? "success"
                : order.status === PaymentStatus.FAILED
                  ? "destructive"
                  : "secondary"
            }
          >
            {t(`order.status.${order.status}`)}
          </Badge>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm">
            {isKey(description, i18n, "billing") ? t(description) : description}
          </p>
        )}
      </div>

      {plan?.id && (
        <div className="flex flex-col gap-4">
          <FeaturesList planId={plan.id} />
        </div>
      )}

      <PortalLink
        store={order.store}
        variantId={order.variantId}
        className="w-full gap-1"
        variant="outline"
        referenceId={referenceId}
        referenceType={referenceType}
      >
        <span>{t("order.cta")}</span>
        <Icons.ArrowUpRight className="size-4" />
      </PortalLink>
    </div>
  );
};
