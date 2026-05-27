import { View } from "react-native";

import { toMemberRole } from "@workspace/auth";
import {
  BillingPlan,
  BillingReference,
  SubscriptionStatus,
  findPlanById,
} from "@workspace/billing";
import { usePaywall } from "@workspace/billing-mobile";
import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
import { Button } from "@workspace/ui-mobile/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@workspace/ui-mobile/card";
import { Icons } from "@workspace/ui-mobile/icons";
import { Skeleton } from "@workspace/ui-mobile/skeleton";
import { Text } from "@workspace/ui-mobile/text";

import { authClient } from "~/lib/auth";
import { FeaturesList } from "~/modules/billing/features-list";

export const BillingLoading = () => {
  return (
    <View className="bg-background flex-1 gap-4 px-6 py-4">
      <View className="gap-2">
        <Skeleton className="h-9 w-44" style={{ width: 176 }} />
        <Skeleton className="h-6 w-56" style={{ width: 224, height: 24 }} />
      </View>

      <Skeleton className="h-30" />
      <Skeleton className="h-30" />
    </View>
  );
};

/**
 * When there is no billing information available, we show an empty state
 * that treats the user as a free user with an option to upgrade.
 */
export const BillingEmpty = ({
  referenceType,
}: {
  referenceType?: BillingReference;
}) => {
  const { t } = useTranslation(["common", "billing"]);
  const activeMember = authClient.useActiveMember();

  const { present } = usePaywall();

  const plan = findPlanById(BillingPlan.FREE);
  const canUpgrade =
    referenceType === BillingReference.USER ||
    authClient.organization.checkRolePermission({
      permissions: {
        billing: ["update", "delete"],
      },
      role: toMemberRole(activeMember.data?.role),
    });

  if (!plan) {
    return null;
  }

  return (
    <View className="bg-background flex-1 gap-4 px-6 py-4">
      <View className="gap-1">
        <Text className="font-sans-semibold text-2xl tracking-tight">
          {t("settings.yourPlan.title")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("settings.yourPlan.description")}
        </Text>
      </View>

      <Card>
        <CardHeader>
          <View className="flex-row items-center justify-start gap-2">
            <Icons.BadgeCheck size={20} />
            <CardTitle>{t(`plan.${BillingPlan.FREE}.name`)}</CardTitle>
            <Badge variant="success" className="ml-1 capitalize">
              <Text className="text-success">
                {t(`subscription.status.${SubscriptionStatus.ACTIVE}`)}
              </Text>
            </Badge>
          </View>

          <CardDescription>
            {t(`plan.${BillingPlan.FREE}.description`)}
          </CardDescription>
        </CardHeader>

        <CardContent className="gap-1">
          <FeaturesList planId={BillingPlan.FREE} />
        </CardContent>

        <CardFooter>
          <Button
            className="w-full"
            disabled={!canUpgrade}
            onPress={() =>
              present({
                trigger: "billing",
              })
            }
          >
            <Text>{t("upgrade")}</Text>
          </Button>
        </CardFooter>
      </Card>
    </View>
  );
};
