"use client";

import { BillingPlan, SubscriptionStatus } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Badge } from "@workspace/ui-web/badge";
import { buttonVariants } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { FeaturesList } from "~/modules/billing/features-list";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
} from "~/modules/common/layout/dashboard/settings-card";
import { TurboLink } from "~/modules/common/turbo-link";

/**
 * When there is no billing information available, we show an empty state
 * that treats the user as a free user with an option to upgrade.
 */
export const BillingEmpty = () => {
  const { t } = useTranslation(["common", "billing"]);

  return (
    <SettingsCard>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("settings.yourPlan.title")}</SettingsCardTitle>

        <SettingsCardDescription>
          {t("settings.yourPlan.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <div className="-mt-2 flex flex-col gap-4 border-t p-6">
        <div className="flex flex-col items-start justify-start gap-1">
          <div className="flex items-center justify-start gap-2">
            <Icons.BadgeCheck className="size-5" />
            <span className="text-lg font-medium capitalize">
              {t(`plan.${BillingPlan.FREE}.name`)}
            </span>

            <Badge variant="success" className="capitalize">
              {t(`subscription.status.${SubscriptionStatus.ACTIVE}`)}
            </Badge>
          </div>

          <p className="text-muted-foreground text-sm">
            {t(`plan.${BillingPlan.FREE}.description`)}
          </p>
        </div>

        <FeaturesList planId={BillingPlan.FREE} />

        <TurboLink
          href={pathsConfig.marketing.pricing}
          className={cn(buttonVariants())}
        >
          {t("upgrade")}
          <Icons.ArrowUpRight className="size-4" />
        </TurboLink>
      </div>
    </SettingsCard>
  );
};
