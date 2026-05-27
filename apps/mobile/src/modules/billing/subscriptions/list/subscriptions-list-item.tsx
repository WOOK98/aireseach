import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";

import {
  BillingType,
  findPlanByVariantId,
  MobileStore,
  SubscriptionStatus,
  isSubscriptionActive,
} from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui-mobile/card";
import { Icons } from "@workspace/ui-mobile/icons";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { FeaturesList } from "~/modules/billing/features-list";
import { billing } from "~/modules/billing/lib/api";
import { NativePortalLink } from "~/modules/billing/portal/native-portal-link";
import { WebPortalLink } from "~/modules/billing/portal/web-portal-link";

import { BillingPeriodProgress } from "../billing-period-progress";

import type {
  BillingConfigVariant,
  BillingReference,
  Subscription,
} from "@workspace/billing";

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
    <View className="w-full flex-row items-center justify-between gap-2 rounded-lg">
      <Text className="text-sm">{t("usage")}</Text>
      {usage.isLoading ? (
        <Spin>
          <Icons.Loader2 size={16} className="text-foreground" />
        </Spin>
      ) : (
        <Text className="text-sm">
          {value}{" "}
          {isKey(unit, i18n, "common", { count: total })
            ? t(unit, { count: total })
            : unit}
        </Text>
      )}
    </View>
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
    .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-center justify-start gap-2">
          {isSubscriptionActive(subscription) ? (
            <Icons.BadgeCheck size={20} className="text-foreground" />
          ) : (
            <Icons.BadgeX size={20} className="text-foreground" />
          )}
          {name && (
            <CardTitle>
              {isKey(name, i18n, "billing") ? t(name) : name}
            </CardTitle>
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
            <Text>
              {isKey(statusKey, i18n, "billing") ? t(statusKey) : statusKey}
            </Text>
          </Badge>
        </View>
        {description && (
          <CardDescription>
            {isKey(description, i18n, "billing") ? t(description) : description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="gap-5">
        {plan?.id && <FeaturesList planId={plan.id} />}
        {isSubscriptionActive(subscription) && (
          <BillingPeriodProgress subscription={subscription} />
        )}
      </CardContent>

      <CardFooter className="flex-col gap-2">
        {Object.values(MobileStore).includes(subscription.store) ? (
          <NativePortalLink
            store={subscription.store}
            variantId={subscription.variantId}
            variant="outline"
            className="w-full gap-1"
          >
            <Text>{t("manage")}</Text>
            <Icons.ArrowUpRight className="text-foreground" size={18} />
          </NativePortalLink>
        ) : (
          <WebPortalLink
            variant="outline"
            className="w-full gap-1"
            referenceId={referenceId}
            referenceType={referenceType}
          >
            <Text>{t("manage")}</Text>
            <Icons.ArrowUpRight className="text-foreground" size={18} />
          </WebPortalLink>
        )}

        {referenceId &&
          variant?.type === BillingType.METERED &&
          "meterId" in variant && (
            <Usage
              variant={variant}
              referenceId={referenceId}
              subscription={subscription}
            />
          )}
      </CardFooter>
    </Card>
  );
};
