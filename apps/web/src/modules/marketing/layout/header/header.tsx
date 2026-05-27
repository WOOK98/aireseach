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
        href: "https://apps.apple.com/app/id6754278899",
        icon: Icons.AppleStroke,
      },
      {
        title: "marketing:product.mobile.android.title",
        description: "marketing:product.mobile.android.description",
        href: "https://play.google.com/store/apps/details?id=com.turbostarter.core",
        icon: Icons.AndroidStroke,
      },
      {
        title: "marketing:product.extension.chrome.title",
        description: "marketing:product.extension.chrome.description",
        href: "https://chromewebstore.google.com/detail/bcjmonmlfbnngpkllpnpmnjajaciaboo",
        icon: Icons.ChromeStroke,
      },
      {
        title: "marketing:product.extension.firefox.title",
        description: "marketing:product.extension.firefox.description",
        href: "https://addons.mozilla.org/addon/turbostarter_",
        icon: Icons.FirefoxStroke,
      },
      {
        title: "marketing:product.extension.edge.title",
        description: "marketing:product.extension.edge.description",
        href: "https://microsoftedge.microsoft.com/addons/detail/turbostarter/ianbflanmmoeleokihabnmmcahhfijig",
        icon: Icons.EdgeStroke,
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
        href: "https://github.com/orgs/turbostarter/projects/1",
        icon: Icons.ChartNoAxesGantt,
      },
      {
        title: "marketing:docs.title",
        description: "marketing:docs.description",
        href: "https://turbostarter.dev/docs/web",
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
          <Icons.LogoText className="text-foreground h-4" />
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
