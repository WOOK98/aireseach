import { getTranslation } from "@workspace/i18n/server";
import { isExternal } from "@workspace/shared/utils";
import { BuiltWith } from "@workspace/ui-web/built-with";
import { Icons } from "@workspace/ui-web/icons";

import { appConfig } from "~/config/app";
import { pathsConfig } from "~/config/paths";
import { I18nControls } from "~/modules/common/i18n/controls";
import { TurboLink } from "~/modules/common/turbo-link";

const socials = [
  {
    id: "x",
    href: "#",
    icon: Icons.Twitter,
  },
  {
    id: "github",
    href: "https://github.com/WOOK98/aireseach",
    icon: Icons.Github,
  },

  {
    id: "facebook",
    href: "#",
    icon: Icons.Facebook,
  },
  {
    id: "linkedin",
    href: "#",
    icon: Icons.Linkedin,
  },
];

const links = [
  {
    label: "common:product",
    items: [
      {
        title: "marketing:report.title",
        href: pathsConfig.marketing.report,
      },
      {
        title: "billing:pricing.label",
        href: pathsConfig.marketing.pricing,
      },
      {
        title: "marketing:roadmap.title",
        href: pathsConfig.dashboard.user.report,
      },
    ],
  },
  {
    label: "resources",
    items: [
      {
        title: "marketing:contact.label",
        href: pathsConfig.marketing.contact,
      },
      {
        title: "marketing:roadmap.title",
        href: pathsConfig.marketing.report,
      },
      {
        title: "marketing:docs.title",
        href: pathsConfig.marketing.report,
      },
      {
        title: "marketing:api.title",
        href: "#",
      },
    ],
  },
  {
    label: "about",
    items: [
      {
        title: "billing:pricing.label",
        href: pathsConfig.marketing.pricing,
      },
      {
        title: "marketing:blog.label",
        href: pathsConfig.marketing.blog.index,
      },
    ],
  },
  {
    label: "legal.label",
    items: [
      {
        title: "legal.privacy",
        href: pathsConfig.marketing.legal("privacy-policy"),
      },
      {
        title: "legal.terms",
        href: pathsConfig.marketing.legal("terms-and-conditions"),
      },
    ],
  },
] as const;

const BRAND_NAME = "Aireseach";

export const Footer = async () => {
  const { t } = await getTranslation({
    ns: ["common", "marketing", "billing"],
  });

  return (
    <footer className="mt-auto w-full border-t px-6 pt-8 pb-6 sm:pt-10 sm:pb-8 md:pt-14 md:pb-10 lg:pt-16">
      <div className="sm:container">
        <div className="flex w-full flex-col items-start justify-between gap-10 md:gap-16 lg:flex-row lg:gap-24 xl:gap-32">
          <div className="flex flex-col items-start justify-center gap-2">
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

            <p className="text-muted-foreground text-sm text-pretty">
              {t("marketing:product.description")}
            </p>

            <I18nControls />

            <div className="mt-2 flex items-center gap-2.5">
              {socials.map((social) => (
                <a
                  key={social.id}
                  href={social.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.id}
                >
                  <social.icon className="size-7" />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-1 grid w-full max-w-200 grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
            {links.map((link) => (
              <div className="flex w-full flex-col gap-4" key={link.label}>
                <span className="text-foreground text-sm font-medium">
                  {t(link.label)}
                </span>
                <nav>
                  <ul className="flex flex-col gap-2">
                    {link.items.map((link) => (
                      <li key={link.title}>
                        <TurboLink
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground relative text-sm transition-colors"
                        >
                          {t(link.title)}
                          {isExternal(link.href) && (
                            <Icons.ArrowUpRight className="-mt-1 inline size-2.5" />
                          )}
                        </TurboLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-muted-foreground text-sm">
              {/* oxlint-disable-next-line i18next/no-literal-string */}
              &copy; {new Date().getFullYear()} {appConfig.name}.{" "}
              {t("legal.copyright")}.
            </p>

            <BuiltWith />
          </div>
        </div>
      </div>
    </footer>
  );
};
