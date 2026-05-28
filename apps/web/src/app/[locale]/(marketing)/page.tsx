import { Suspense } from "react";

import { withI18n } from "@workspace/i18n/with-i18n";

import { Pricing } from "~/modules/billing/pricing/pricing";
import { PricingSectionSkeleton } from "~/modules/billing/pricing/section";
import { Banner } from "~/modules/marketing/home/banner";
import { Faq } from "~/modules/marketing/home/faq";
import { Hero } from "~/modules/marketing/home/hero";

const HomePage = () => {
  return (
    <>
      <Hero />
      <Suspense fallback={<PricingSectionSkeleton />}>
        <Pricing />
      </Suspense>
      <Faq />
      <Banner />
    </>
  );
};

export default withI18n(HomePage);
