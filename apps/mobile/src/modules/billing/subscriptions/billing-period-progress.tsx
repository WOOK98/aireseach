import dayjs from "dayjs";
import { View } from "react-native";

import { getBillingPeriod } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { Progress } from "@workspace/ui-mobile/progress";
import { Text } from "@workspace/ui-mobile/text";

import type { Subscription } from "@workspace/billing";

interface BillingPeriodProgressProps {
  subscription: Subscription;
}

export const BillingPeriodProgress = ({
  subscription,
}: BillingPeriodProgressProps) => {
  const { t } = useTranslation(["common", "billing"]);

  const { progress, daysRemaining, trial, startsAt, endsAt } =
    getBillingPeriod(subscription);

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-xs">
          {trial ? t("trial.label") : t("currentBillingCycle")}
        </Text>
        <Text className="text-muted-foreground text-xs">
          {t("daysRemaining", { count: daysRemaining })}
        </Text>
      </View>
      <Progress value={progress} />
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-muted-foreground text-xs">
          {dayjs(startsAt).format("Do MMM")}
        </Text>
        <Text className="text-muted-foreground text-xs">
          {dayjs(endsAt).format("Do MMM")}
        </Text>
      </View>
    </View>
  );
};
