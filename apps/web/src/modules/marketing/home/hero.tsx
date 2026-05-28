import { getTranslation } from "@workspace/i18n/server";
import { buttonVariants } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import { CtaButton } from "~/modules/marketing/layout/cta-button";
import { Section, SectionBadge } from "~/modules/marketing/layout/section";

import { HeroSearchForm } from "./hero-search-form";

const exampleKeys = ["tesla", "coffee", "saas", "battery", "aiAgents"] as const;

export const Hero = async () => {
  const { t } = await getTranslation();

  return (
    <Section id="hero" className="gap-6 sm:gap-6 md:gap-6 lg:gap-6">
      <TurboLink
        href={pathsConfig.marketing.report}
        className="animate-fade-in -translate-y-4 opacity-0"
      >
        <SectionBadge>
          <div className="w-fit py-0.5 text-center text-xs sm:text-sm">
            {t("product.preview.badge")}
          </div>
          <div
            data-orientation="vertical"
            role="none"
            className="bg-border mx-2 h-full w-px shrink-0"
          ></div>
          {t("announcement")}

          <Icons.ChevronRight className="text-foreground ml-1.5 size-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </SectionBadge>
      </TurboLink>
      <h1 className="animate-fade-in mt-4 -translate-y-4 text-center text-5xl leading-[0.95] font-semibold tracking-tighter text-balance opacity-0 [--animation-delay:200ms] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
        {t("product.title")}
      </h1>
      <p className="animate-fade-in text-muted-foreground mx-auto mb-3 max-w-[680px] -translate-y-4 text-center text-lg leading-[26px] text-balance opacity-0 [--animation-delay:400ms] sm:text-xl">
        {t("product.description")}
      </p>
      <div className="animate-fade-in mx-auto flex w-full -translate-y-4 flex-col gap-2 opacity-0 ease-in-out [--animation-delay:600ms] sm:w-auto sm:flex-row sm:gap-3">
        <CtaButton />

        <TurboLink
          href={pathsConfig.marketing.pricing}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("cta.pricing")}
        </TurboLink>
      </div>

      <div className="animate-fade-up relative mt-6 w-full max-w-3xl -translate-y-4 opacity-0 [--animation-delay:700ms] md:mt-10">
        <HeroSearchForm
          placeholder={t("product.preview.placeholder")}
          action={t("product.preview.action")}
          examples={exampleKeys.map((key) =>
            t(`product.preview.examples.${key}`),
          )}
        />
      </div>
    </Section>
  );
};
