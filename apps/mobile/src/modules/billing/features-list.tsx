import { View } from "react-native";

import { findPlanById } from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import type { BillingPlan } from "@workspace/billing";

export const FeaturesList = ({ planId }: { planId: BillingPlan }) => {
  const { t, i18n } = useTranslation("billing");

  const plan = findPlanById(planId);

  if (!plan) {
    return null;
  }

  return (
    <View className="gap-1.5">
      {plan.features.map((feature) => {
        const featureKey = `feature.${feature}`;
        return (
          <View
            key={feature}
            className="flex-row items-center justify-start gap-2"
          >
            <Icons.Check size={16} className="text-foreground" />
            <Text className="text-sm">
              {isKey(featureKey, i18n, "billing") ? t(featureKey) : featureKey}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
