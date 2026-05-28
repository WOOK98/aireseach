import { Suspense } from "react";

import { withI18n } from "@workspace/i18n/with-i18n";

import { Pricing } from "~/modules/billing/pricing/pricing";
import { PricingSectionSkeleton } from "~/modules/billing/pricing/section";
import { Banner } from "~/modules/marketing/home/banner";
import { Comparison } from "~/modules/marketing/home/comparison";
import { Faq } from "~/modules/marketing/home/faq";
import { Hero } from "~/modules/marketing/home/hero";
import { UseCases } from "~/modules/marketing/home/use-cases";

const HomePage = () => {
  return (
    <>
      <Hero />
      <UseCases />
      <Suspense fallback={<PricingSectionSkeleton />}>
        <Pricing />
      </Suspense>
      <Comparison />
      <Faq />
      <Banner />
    </>
  );
};

export default withI18n(HomePage);
