"use client";

import { useQuery } from "@tanstack/react-query";

import {
  BillingConfigVariant,
  BillingType,
  findPlanByVariantId,
  SubscriptionStatus,
  isSubscriptionActive,
} from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-web/badge";
import { Icons } from "@workspace/ui-web/icons";

import { FeaturesList } from "~/modules/billing/features-list";
import { billing } from "~/modules/billing/lib/api";
import { PortalLink } from "~/modules/billing/settings/portal/portal-link";
import { BillingPeriodProgress } from "~/modules/billing/subscriptions/billing-period-progress";

import type { BillingReference, Subscription } from "@workspace/billing";

const Usage = ({
  variant,
  subscription,
  referenceId,
}: {
  variant: Extract<BillingConfigVariant, { type: "metered" }>;
  subscription: Subscription;
  referenceId: string;
}) => {
  const { t, i18n } = useTranslation("common");
  const usage = useQuery(
    billing.queries.usage.getByMeterId(variant.meterId, {
      referenceId,
      start: new Date(
        subscription.trialStartsAt ?? subscription.periodStartsAt,
      ).toISOString(),
      end: new Date(
        subscription.trialEndsAt ?? subscription.periodEndsAt,
      ).toISOString(),
    }),
  );

  const unit = variant.unit;
  const total = usage.data?.usage ?? 0;

  const value = new Intl.NumberFormat(i18n.language, {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(total);

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-lg text-sm">
      <span>{t("usage")}</span>
      {usage.isLoading ? (
        <Icons.Loader2 className="size-4 animate-spin" />
      ) : (
        <span>
          {value}{" "}
          {isKey(unit, i18n, "common", { count: total })
            ? t(unit, { count: total })
            : unit}
        </span>
      )}
    </div>
  );
};

export const SubscriptionsListItem = ({
  subscription,
  referenceId,
  referenceType,
}: {
  subscription: Subscription;
  referenceId: string;
  referenceType: BillingReference;
}) => {
  const { t, i18n } = useTranslation(["common", "billing"]);

  const { plan, variant } = findPlanByVariantId(subscription.variantId);

  const name = plan?.name;
  const description = plan?.description;
  const statusKey = `subscription.status.${subscription.status
    .toLowerCase()
    .replaceAll(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col items-start justify-start gap-1">
        <div className="flex items-center justify-start gap-2">
          {isSubscriptionActive(subscription) ? (
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
              subscription.status === SubscriptionStatus.ACTIVE
                ? "success"
                : subscription.status === SubscriptionStatus.TRIALING
                  ? "secondary"
                  : "destructive"
            }
          >
            {isKey(statusKey, i18n, "billing") ? t(statusKey) : statusKey}
          </Badge>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm">
            {isKey(description, i18n, "billing") ? t(description) : description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {plan?.id && <FeaturesList planId={plan.id} />}

        {isSubscriptionActive(subscription) && (
          <BillingPeriodProgress subscription={subscription} />
        )}
      </div>

      <PortalLink
        store={subscription.store}
        variantId={subscription.variantId}
        className="w-full gap-1"
        variant="outline"
        referenceId={referenceId}
        referenceType={referenceType}
      >
        <span>{t("manage")}</span>
        <Icons.ArrowUpRight className="size-4" />
      </PortalLink>

      {variant?.type === BillingType.METERED && "meterId" in variant && (
        <Usage
          variant={variant}
          referenceId={referenceId}
          subscription={subscription}
        />
      )}
    </div>
  );
};
