"use client";

import { memo } from "react";

import { getFilteredPlans } from "@workspace/billing";
import { Trans } from "@workspace/i18n";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { usePricingControls } from "~/modules/billing/pricing/controls";
import { TurboLink } from "~/modules/common/turbo-link";
import { Section, SectionHeader } from "~/modules/marketing/layout/section";

import { PricingHeader } from "./layout/header";
import { Plans, PlansSkeleton } from "./plans/plans";

import type { User } from "@workspace/auth";

interface PricingSectionProps {
  readonly user: User | null;
}

export const PricingSection = memo<PricingSectionProps>(({ user }) => {
  const controls = usePricingControls((c) => c.controls);

  const filters = {
    ...controls,
    hidden: false,
  };
  const filteredPlans = getFilteredPlans(filters);

  return (
    <Section id="pricing" className="gap-10 sm:gap-12 md:gap-16 lg:gap-20">
      <PricingHeader user={user} />
      <Plans plans={filteredPlans} user={user} />

      <p className="text-muted-foreground max-w-md text-center text-sm">
        <Trans
          i18nKey="pricing.disclaimer"
          ns="billing"
          components={{
            reference: (
              <TurboLink
                href="https://turbostarter.dev/docs/web/billing/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:no-underline"
              />
            ),
          }}
        />
      </p>
    </Section>
  );
});

export const PricingSectionSkeleton = () => {
  return (
    <Section id="pricing" className="gap-10 sm:gap-12 md:gap-16 lg:gap-20">
      <SectionHeader className="flex flex-col items-center justify-center gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-4 h-12 w-72" />
        <Skeleton className="h-8 w-96" />
      </SectionHeader>
      <PlansSkeleton />
    </Section>
  );
};

PricingSection.displayName = "PricingSection";
