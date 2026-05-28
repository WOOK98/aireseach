"use client";

import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
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
        title: "marketing:product.mobile.ios.title",
        description: "marketing:product.mobile.ios.description",
        href: pathsConfig.marketing.report,
        icon: Icons.BookOpen,
      },
      {
        title: "marketing:product.mobile.android.title",
        description: "marketing:product.mobile.android.description",
        href: pathsConfig.marketing.pricing,
        icon: Icons.Key,
      },
      {
        title: "marketing:product.extension.chrome.title",
        description: "marketing:product.extension.chrome.description",
        href: pathsConfig.dashboard.user.report,
        icon: Icons.Home,
      },
    ],
  },
  {
    label: "resources",
    items: [
      {
        title: "marketing:contact.label",
        description: "marketing:contact.description",
        href: pathsConfig.marketing.contact,
        icon: Icons.SendHorizontal,
      },
      {
        title: "marketing:roadmap.title",
        description: "marketing:roadmap.description",
        href: pathsConfig.marketing.report,
        icon: Icons.ChartNoAxesGantt,
      },
      {
        title: "marketing:docs.title",
        description: "marketing:docs.description",
        href: pathsConfig.marketing.report,
        icon: Icons.BookOpen,
      },
      {
        title: "marketing:api.title",
        description: "marketing:api.description",
        href: "#",
        icon: Icons.Webhook,
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

const BRAND_NAME = "Aireseach";

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
          <CtaButton className="hidden lg:inline-flex" />
          <MobileNavigation links={links} />
        </div>
      </div>
    </header>
  );
};
