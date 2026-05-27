"use client";

import { Fragment } from "react";

import { isKey, useTranslation } from "@workspace/i18n";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui-web/breadcrumb";
import { buttonVariants } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";
import { SidebarTrigger } from "@workspace/ui-web/sidebar";

import { TurboLink } from "~/modules/common/turbo-link";

import { useMenu } from "./sidebar/use-menu";

import type { Item, Menu } from "./sidebar/types";

const findActivePath = (
  menu: Menu,
  isActive: (item: Item) => boolean,
): Item[] | null => {
  for (const group of menu) {
    for (const item of group.items) {
      if (item.menu) {
        const activeChildPath = findActivePath(item.menu, isActive);
        if (activeChildPath) {
          const firstChildHref = item.menu[0]?.items[0]?.href;
          const activeChildHref = activeChildPath[0]?.href;

          if (
            firstChildHref &&
            activeChildHref === firstChildHref &&
            item.href === firstChildHref
          ) {
            return [item];
          }

          return [item, ...activeChildPath];
        }
      }

      if (isActive(item)) return [item];
    }
  }

  return null;
};

export const DashboardActionBar = ({ menu }: { menu: Menu }) => {
  const { t, i18n } = useTranslation("common");
  const { isActive } = useMenu(menu);

  const breadcrumbs = findActivePath(menu, isActive);

  const last = breadcrumbs?.at(-1);

  return (
    <header className="bg-background sticky top-(--banner-height,0px) z-10 flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear md:px-6 lg:px-7">
      <SidebarTrigger className="md:-ml-1" />
      <div className="absolute left-1/2 -translate-x-1/2">
        {breadcrumbs ? (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.length > 1 &&
                breadcrumbs.slice(0, -1).map((item, index, array) => (
                  <Fragment key={item.href}>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        render={
                          <TurboLink href={item.href}>
                            {isKey(item.title, i18n, "common")
                              ? t(item.title)
                              : item.title}
                          </TurboLink>
                        }
                      />
                    </BreadcrumbItem>
                    {index < array.length - 1 && <BreadcrumbSeparator />}
                  </Fragment>
                ))}

              {last && (
                <>
                  {breadcrumbs.length > 1 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {isKey(last.title, i18n, "common")
                        ? t(last.title)
                        : last.title}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
      </div>

      <a
        href="https://discord.gg/KjpK2uk3JP"
        rel="noopener noreferrer"
        target="_blank"
        className={buttonVariants({
          variant: "ghost",
          size: "icon",
          className: "text-muted-foreground",
        })}
      >
        <Icons.Discord className="size-4.5" />
      </a>
    </header>
  );
};
