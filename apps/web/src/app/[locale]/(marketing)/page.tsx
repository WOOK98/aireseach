import { Suspense } from "react";

import { withI18n } from "@workspace/i18n/with-i18n";

import { Pricing } from "~/modules/billing/pricing/pricing";
import { PricingSectionSkeleton } from "~/modules/billing/pricing/section";
import { Banner } from "~/modules/marketing/home/banner";
import { Faq } from "~/modules/marketing/home/faq";
import { Features } from "~/modules/marketing/home/features";
import { Hero } from "~/modules/marketing/home/hero";
import { Testimonials } from "~/modules/marketing/home/testimonials";

const HomePage = () => {
  return (
    <>
      <Hero />
      <Features />
      <Testimonials />
      <Suspense fallback={<PricingSectionSkeleton />}>
        <Pricing />
      </Suspense>
      <Faq />
      <Banner />
    </>
  );
};

export default withI18n(HomePage);
