import { useQuery } from "@tanstack/react-query";
import { memo } from "react";

import {
  BillingModel,
  BillingReference,
  BillingType,
  calculateDiscount,
  calculateRecurringDiscount,
  formatPrice,
  getActivePlan,
  getLowerPlans,
  getVariantDiscount,
  getVariantInitialCost,
  isFree,
} from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Badge } from "@workspace/ui-web/badge";
import { Button, buttonVariants } from "@workspace/ui-web/button";
import { Card } from "@workspace/ui-web/card";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { billing } from "~/modules/billing/lib/api";
import { usePricingControls } from "~/modules/billing/pricing/controls";
import { TurboLink } from "~/modules/common/turbo-link";

import { usePlan } from "./hooks/use-plan";

import type { User } from "@workspace/auth";
import type {
  BillingConfigPlan,
  BillingConfigVariant,
  BillingConfigDiscount,
} from "@workspace/billing";

const Tiers = ({
  variant,
  discount,
}: {
  variant: BillingConfigVariant;
  discount?: BillingConfigDiscount;
}) => {
  const { t, i18n } = useTranslation(["billing", "common"]);
  const priceWithDiscount = discount
    ? calculateDiscount(variant, discount)
    : variant.model === BillingModel.RECURRING
      ? calculateRecurringDiscount(variant)
      : null;

  const discountedVariant = priceWithDiscount?.discounted;
  const tiers =
    discountedVariant && "tiers" in discountedVariant
      ? discountedVariant.tiers
      : "tiers" in variant
        ? variant.tiers
        : null;

  const unit =
    variant.type === BillingType.PER_SEAT
      ? "seat"
      : "unit" in variant
        ? variant.unit
        : null;

  if (!tiers || !unit) {
    return null;
  }

  const singleUnit = isKey(unit, i18n, "common", { count: 1 })
    ? (t(unit, { count: 1 }) as string)
    : unit;
  const pluralUnit = isKey(unit, i18n, "common", { count: tiers.length })
    ? (t(unit, { count: tiers.length }) as string)
    : unit;

  const formatThreshold = (threshold: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "decimal",
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(threshold);

  return (
    <div className="bg-accent -my-2 rounded-md px-4 py-3">
      <span className="text-sm font-medium">
        {t("additionalUsage", { unit: pluralUnit })}
      </span>
      <ul className="text-sm">
        {tiers.map((tier, index) => {
          const price = formatPrice({
            amount: tier.cost,
            ...("currency" in variant ? { currency: variant.currency } : {}),
          });

          const isInfiniteTier = !tier.upTo || tier.upTo === "infinite";
          const isFirstTier = index === 0;
          const previousThreshold = tiers
            .slice(0, index)
            .reduce(
              (threshold, currentTier) =>
                typeof currentTier.upTo === "number"
                  ? currentTier.upTo
                  : threshold,
              0,
            );

          const label = (() => {
            if (isInfiniteTier) {
              return `${price}/${singleUnit} ${t("infiniteUsage", {
                unit: pluralUnit,
                threshold: formatThreshold(previousThreshold),
              })}`;
            }

            if (typeof tier.upTo !== "number") {
              return null;
            }
            const upTo = formatThreshold(tier.upTo - previousThreshold);

            return isFirstTier && tier.cost === 0
              ? t("upToIncluded", { unit: pluralUnit, upTo })
              : isFirstTier
                ? `${price}/${singleUnit} ${t("forFirst", { unit: pluralUnit, upTo })}`
                : `${price}/${singleUnit} ${t("forNext", { unit: pluralUnit, upTo })}`;
          })();

          return <li key={tier.cost}>- {label}</li>;
        })}
      </ul>
    </div>
  );
};

const Price = ({
  variant,
  discount,
}: {
  variant: BillingConfigVariant;
  discount?: BillingConfigDiscount;
}) => {
  const { t, i18n } = useTranslation(["common", "billing"]);

  const priceWithDiscount = discount
    ? calculateDiscount(variant, discount)
    : variant.model === BillingModel.RECURRING
      ? calculateRecurringDiscount(variant)
      : null;

  const usageSuffix =
    variant.type === BillingType.PER_SEAT
      ? `/ ${t("seat")} `
      : variant.type === BillingType.METERED && "unit" in variant
        ? `/ ${isKey(variant.unit, i18n, "common") ? (t(variant.unit) as string) : variant.unit} `
        : "";

  const suffix = !variant.custom && (
    <span className="text-muted-foreground shrink-0 text-lg">
      {usageSuffix}/{" "}
      {variant.model === BillingModel.RECURRING
        ? t(variant.interval)
        : t("lifetime")}
    </span>
  );

  if (
    priceWithDiscount &&
    getVariantInitialCost(priceWithDiscount.original) !==
      getVariantInitialCost(priceWithDiscount.discounted)
  ) {
    return (
      <p className="relative flex w-fit items-end gap-1 py-2">
        <span className="text-muted-foreground mr-2 text-lg line-through md:text-xl">
          {formatPrice(
            {
              amount: getVariantInitialCost(priceWithDiscount.original),
              currency: priceWithDiscount.original.currency,
            },
            i18n.language,
          )}
        </span>
        <span className="text-4xl font-bold tracking-tighter md:text-5xl">
          {formatPrice(
            {
              amount: getVariantInitialCost(priceWithDiscount.discounted),
              currency: priceWithDiscount.discounted.currency,
            },
            i18n.language,
          )}
        </span>
        {suffix}
      </p>
    );
  }

  // Show compareAtPrice with strikethrough if present
  if (
    !variant.custom &&
    "compareAtPrice" in variant &&
    variant.compareAtPrice &&
    variant.compareAtPrice > 0
  ) {
    return (
      <p className="relative flex w-fit items-end gap-1 py-2">
        <span className="text-muted-foreground mr-2 text-lg line-through md:text-xl">
          {formatPrice(
            {
              amount: variant.compareAtPrice,
              currency: "currency" in variant ? variant.currency : "usd",
            },
            i18n.language,
          )}
        </span>
        <span className="text-4xl font-bold tracking-tighter md:text-5xl">
          {formatPrice(
            {
              amount: getVariantInitialCost(variant),
              currency: "currency" in variant ? variant.currency : "usd",
            },
            i18n.language,
          )}
        </span>
        {suffix}
      </p>
    );
  }

  return (
    <p className="relative flex items-end gap-1 py-2">
      <span className="text-4xl font-bold tracking-tighter md:text-5xl">
        {variant.custom
          ? isKey(variant.label, i18n, "billing")
            ? t(variant.label)
            : variant.label
          : formatPrice(
              {
                amount: getVariantInitialCost(variant),
                currency: variant.currency,
              },
              i18n.language,
            )}
      </span>
      {suffix}
    </p>
  );
};

interface PlanProps {
  readonly plan: BillingConfigPlan;
  readonly user: User | null;
}

export const Plan = memo<PlanProps>(({ plan, user }) => {
  const { t, i18n } = useTranslation(["common", "billing"]);
  const controls = usePricingControls((c) => c.controls);

  const summary = useQuery({
    ...billing.queries.summary.get(controls.referenceId ?? ""),
    enabled: !!controls.referenceId,
  });
  const activePlan = getActivePlan(summary.data);

  const {
    referenceOrganization,
    features,
    isPending,
    handleCheckout,
    handleOpenPortal,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
  } = usePlan({ plan, user });

  const hasPlan = !getLowerPlans(plan.id).some((p) => p.id === activePlan);

  return plan.variants.map((variant) => {
    const discount = getVariantDiscount(variant);

    return (
      <div
        className="max-w-[480px] grow basis-[350px] rounded-lg"
        key={variant.id}
      >
        <Card
          className={cn(
            "relative flex h-full flex-col gap-6 p-6 md:p-8",
            plan.badge && "border-primary",
          )}
        >
          {plan.badge && (
            <Badge className="hover:bg-primary absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 uppercase">
              {isKey(plan.badge, i18n, "billing") ? t(plan.badge) : plan.badge}
            </Badge>
          )}

          <div>
            <span className="text-lg font-semibold tracking-tight">
              {isKey(plan.name, i18n, "billing") ? t(plan.name) : plan.name}
            </span>

            <Price variant={variant} discount={discount} />

            <p className="text-sm">
              {isKey(plan.description, i18n, "billing")
                ? t(plan.description)
                : plan.description}
            </p>
          </div>

          <Tiers variant={variant} discount={discount} />

          <div className="flex flex-col gap-1">
            {features.map((feature) => (
              <div
                key={feature.id}
                className={cn("flex items-center gap-3 py-1", {
                  "opacity-50": !feature.available,
                })}
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    feature.available ? "bg-primary" : "border-primary border",
                  )}
                >
                  {feature.available ? (
                    <Icons.CheckIcon className="text-primary-foreground w-3" />
                  ) : (
                    <Icons.X className="text-primary w-3" />
                  )}
                </div>
                <span className="text-md">
                  {isKey(feature.key, i18n, "billing")
                    ? t(feature.key)
                    : feature.key}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {"trialDays" in variant && variant.trialDays && !hasPlan && (
              <Button
                variant="outline"
                onClick={() =>
                  handleCheckout({
                    variant: { id: variant.id },
                    ...(discount ? { discount: { code: discount.code } } : {}),
                  })
                }
                disabled={!canCreate || isPending}
              >
                {isPending ? (
                  <Icons.Loader2 className="animate-spin" />
                ) : (
                  t("trial.period", { period: variant.trialDays })
                )}
              </Button>
            )}

            {variant.custom ? (
              <TurboLink href={variant.href} className={buttonVariants()}>
                {hasPlan ? t("manage") : t("getStarted")}
              </TurboLink>
            ) : isFree(variant) ? (
              <TurboLink
                href={
                  user
                    ? controls.referenceType === BillingReference.USER
                      ? pathsConfig.dashboard.user.index
                      : pathsConfig.dashboard.organization(
                          referenceOrganization?.slug ?? "",
                        ).index
                    : pathsConfig.auth.login
                }
                className={buttonVariants({ variant: "outline" })}
              >
                {user ? t("goToDashboard") : t("trial.cta")}
              </TurboLink>
            ) : (
              <Button
                disabled={(() => {
                  const isPortalAction =
                    variant.model === BillingModel.RECURRING && hasPlan;
                  const canOpenPortal = canUpdate || canDelete;

                  return (
                    isPending ||
                    !canRead ||
                    (isPortalAction ? !canOpenPortal : !canCreate)
                  );
                })()}
                onClick={() =>
                  variant.model === BillingModel.RECURRING && hasPlan
                    ? handleOpenPortal()
                    : handleCheckout({
                        variant: { id: variant.id },
                        ...(discount
                          ? { discount: { code: discount.code } }
                          : {}),
                      })
                }
              >
                {isPending ? (
                  <Icons.Loader2 className="animate-spin" />
                ) : variant.model === BillingModel.RECURRING && hasPlan ? (
                  t("manage")
                ) : variant.model === BillingModel.RECURRING ? (
                  t("subscribe")
                ) : (
                  t("getLifetimeAccess")
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  });
});

Plan.displayName = "Plan";
