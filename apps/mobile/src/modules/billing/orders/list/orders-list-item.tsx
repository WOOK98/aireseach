import { View } from "react-native";

import {
  findPlanByVariantId,
  MobileStore,
  PaymentStatus,
} from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from "@workspace/ui-mobile/card";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { FeaturesList } from "~/modules/billing/features-list";
import { NativePortalLink } from "~/modules/billing/portal/native-portal-link";
import { WebPortalLink } from "~/modules/billing/portal/web-portal-link";

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
    <Card>
      <CardHeader>
        <View className="flex-row items-center justify-start gap-2">
          {order.status === PaymentStatus.SUCCEEDED ? (
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
              order.status === PaymentStatus.SUCCEEDED
                ? "success"
                : order.status === PaymentStatus.FAILED
                  ? "destructive"
                  : "secondary"
            }
          >
            <Text>{t(`order.status.${order.status}`)}</Text>
          </Badge>
        </View>
        {description && (
          <CardDescription>
            {isKey(description, i18n, "billing") ? t(description) : description}
          </CardDescription>
        )}
      </CardHeader>

      {plan?.id && (
        <CardContent>
          <FeaturesList planId={plan.id} />
        </CardContent>
      )}

      <CardFooter className="flex-col gap-2">
        {Object.values(MobileStore).includes(order.store) ? (
          <NativePortalLink
            store={order.store}
            variantId={order.variantId}
            variant="outline"
            className="w-full gap-1"
          >
            <Text>{t("order.cta")}</Text>
            <Icons.ArrowUpRight className="text-foreground" size={18} />
          </NativePortalLink>
        ) : (
          <WebPortalLink
            variant="outline"
            className="w-full gap-1"
            referenceId={referenceId}
            referenceType={referenceType}
          >
            <Text>{t("order.cta")}</Text>
            <Icons.ArrowUpRight className="text-foreground" size={18} />
          </WebPortalLink>
        )}
      </CardFooter>
    </Card>
  );
};
