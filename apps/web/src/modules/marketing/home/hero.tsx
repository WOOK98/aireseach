import { getTranslation } from "@workspace/i18n/server";
import { buttonVariants } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import { CtaButton } from "~/modules/marketing/layout/cta-button";
import { Section, SectionBadge } from "~/modules/marketing/layout/section";

const previewSources = [
  "10-K filings",
  "market research",
  "earnings calls",
  "industry news",
];

const previewMetrics = [
  { label: "Market share", value: "Needs verification" },
  { label: "Growth quality", value: "High variance" },
  { label: "Competitive pressure", value: "Rising" },
  { label: "Antifragility", value: "Mixed" },
];

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

      <div className="animate-fade-up relative mt-6 w-full max-w-6xl -translate-y-4 opacity-0 [--animation-delay:700ms] md:mt-10">
        <div className="border-border/70 bg-background overflow-hidden rounded-lg border shadow-2xl">
          <div className="border-border/70 bg-muted/40 flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="bg-primary size-2.5 rounded-full" />
              <span className="bg-secondary size-2.5 rounded-full" />
              <span className="bg-muted-foreground/40 size-2.5 rounded-full" />
            </div>
            <span className="text-muted-foreground text-xs font-medium">
              {t("product.preview.title")}
            </span>
          </div>

          <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
            <aside className="border-border/70 bg-muted/20 space-y-4 border-b p-5 lg:border-r lg:border-b-0">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {t("product.preview.provider")}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["OpenAI", "DeepSeek", "OpenRouter", "Perplexity"].map(
                    (provider) => (
                      <div
                        key={provider}
                        className="bg-background rounded-md border px-3 py-2 text-sm font-medium"
                      >
                        {provider}
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {t("product.preview.sources")}
                </p>
                <div className="mt-2 space-y-2">
                  {previewSources.map((source) => (
                    <div
                      key={source}
                      className="bg-background flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <Icons.Check className="text-primary size-4" />
                      {source}
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-5 p-5 md:p-6">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {t("product.preview.report")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {t("product.preview.reportTitle")}
                </h2>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                {previewMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="bg-muted/30 rounded-md border p-3"
                  >
                    <p className="text-muted-foreground text-xs">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{metric.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div className="bg-primary/20 h-3 w-2/3 rounded-full" />
                <div className="bg-muted h-3 w-full rounded-full" />
                <div className="bg-muted h-3 w-11/12 rounded-full" />
                <div className="bg-muted h-3 w-4/5 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};
