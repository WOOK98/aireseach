import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";

import { getBillingPeriod } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";

import type { Subscription } from "@workspace/billing";

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);

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
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm">
          {trial ? t("trial.label") : t("currentBillingCycle")}
        </span>
        <span className="text-muted-foreground text-xs sm:text-sm">
          {t("daysRemaining", { count: daysRemaining })}
        </span>
      </div>
      <div className="bg-primary/20 relative h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all duration-300 ease-in-out"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {dayjs(startsAt).format("Do MMM")}
        </span>
        <span className="text-muted-foreground text-xs">
          {dayjs(endsAt).format("Do MMM")}
        </span>
      </div>
    </div>
  );
};
