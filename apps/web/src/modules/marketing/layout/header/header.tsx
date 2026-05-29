"use client";

import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { I18nControls } from "~/modules/common/i18n/controls";
import { ThemeControls } from "~/modules/common/theme";
import { TurboLink } from "~/modules/common/turbo-link";
import { CtaButton } from "~/modules/marketing/layout/cta-button";

import { MobileNavigation } from "./navigation/mobile-navigation";
import { Navigation } from "./navigation/navigation";

const links = [
  {
    label: "product",
    items: [
      {
        title: "marketing:roadmap.title",
        description: "marketing:roadmap.description",
        href: pathsConfig.marketing.report,
        icon: Icons.BookOpen,
      },
      {
        title: "marketing:docs.title",
        description: "marketing:docs.description",
        href: pathsConfig.marketing.report,
        icon: Icons.ChartNoAxesGantt,
      },
    ],
  },
  {
    label: "billing:pricing.label",
    href: pathsConfig.marketing.pricing,
  },
  {
    label: "marketing:blog.label",
    href: pathsConfig.marketing.blog.index,
  },
] as const;

const BRAND_NAME = "Airesearch";

export const Header = () => {
  const { t } = useTranslation("common");
  return (
    <header className="bg-background/80 sticky inset-0 top-(--banner-height,0px) z-40 w-full py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 pr-4 sm:container">
        <TurboLink
          href={pathsConfig.index}
          className="flex shrink-0 items-center gap-3"
          aria-label={t("home")}
        >
          <Icons.Logo className="text-primary h-8" />
          <span className="text-foreground text-xl font-semibold tracking-tight">
            {BRAND_NAME}
          </span>
        </TurboLink>

        <Navigation links={links} />

        <div className="flex items-center justify-center lg:gap-2">
          <ThemeControls />
          <I18nControls variant="icon" />
          <CtaButton className="hidden lg:inline-flex" />
          <MobileNavigation links={links} />
        </div>
      </div>
    </header>
  );
};
