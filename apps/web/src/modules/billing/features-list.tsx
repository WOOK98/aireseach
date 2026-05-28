import { findPlanById } from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-web/icons";

import type { BillingPlan } from "@workspace/billing";

export const FeaturesList = ({ planId }: { planId: BillingPlan }) => {
  const { t, i18n } = useTranslation("billing");

  const plan = findPlanById(planId);

  if (!plan) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {plan.features.map((feature) => {
        const featureKey = `feature.${feature}`;
        return (
          <div key={feature} className="flex items-center justify-start gap-2">
            <Icons.Check className="size-4.5 shrink-0" />
            <span className="truncate text-sm">
              {isKey(featureKey, i18n, "billing") ? t(featureKey) : featureKey}
            </span>
          </div>
        );
      })}
    </div>
  );
};
