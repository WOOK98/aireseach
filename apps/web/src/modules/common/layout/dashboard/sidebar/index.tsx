"use client";

import React, { memo } from "react";

import { isKey, useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Icons } from "@workspace/ui-web/icons";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@workspace/ui-web/sidebar";
import { SidebarMenu } from "@workspace/ui-web/sidebar";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui-web/sidebar";
import { Sidebar } from "@workspace/ui-web/sidebar";

import { pathsConfig } from "~/config/paths";
import { BuyCta } from "~/modules/common/layout/dashboard/buy-cta";
import { TurboLink } from "~/modules/common/turbo-link";
import { AccountSwitcher } from "~/modules/organization/account-switcher";
import { UserNavigation } from "~/modules/user/user-navigation";

import { ROOT_MENU_HREF } from "./types";
import { useMenu } from "./use-menu";

import type { Menu } from "./types";
import type { User } from "@workspace/auth";

interface DashboardSidebarProps {
  readonly header?: React.ReactNode;
  readonly user: User;
  readonly menu: Menu;
}

export const DashboardSidebar = memo<DashboardSidebarProps>(
  ({ header, user, menu }) => {
    const { t, i18n } = useTranslation("common");
    const { setOpenMobile } = useSidebar();
    const {
      history,
      onBack,
      onForward,
      currentHref,
      findItemByHref,
      findParentByHref,
      isActive,
    } = useMenu(menu);

    return (
      <Sidebar
        collapsible="icon"
        className="top-(--banner-height,0px) h-[calc(100svh-var(--banner-height,0px))]"
      >
        <SidebarHeader>
          {header ?? <AccountSwitcher user={user} />}
        </SidebarHeader>

        <div className="relative h-full overflow-clip">
          {Object.values(history)
            .filter(Boolean)
            .map((href, index) => {
              const item = findItemByHref(href);
              const parentHref = findParentByHref(href);

              const parentItem = parentHref ? findItemByHref(parentHref) : null;
              const currentMenu = item?.menu ?? parentItem?.menu ?? menu;

              return (
                <SidebarContent
                  key={href}
                  className={cn("h-full", {
                    "pointer-events-none absolute inset-x-0 top-0 opacity-0 blur-xs":
                      href !== currentHref,
                    "translate-x-4":
                      href !== currentHref && href === history.next,
                    "-translate-x-4":
                      href !== currentHref && href === history.previous,
                  })}
                  style={{
                    transition:
                      index === 0
                        ? "translate 0.2s ease, opacity 0.2s ease, filter 0.2s ease"
                        : "translate 0.2s, opacity 0.2s, filter 0.2s",
                  }}
                  inert={href !== currentHref}
                >
                  {parentHref &&
                    (() => {
                      const title =
                        item?.title && isKey(item.title, i18n, "common")
                          ? t(item.title)
                          : item?.title;

                      return (
                        <div className="px-2">
                          <SidebarMenuButton
                            onClick={onBack}
                            className="-mb-3 justify-between"
                            tooltip={title}
                          >
                            <Icons.ChevronLeft />
                            {title}
                            <div className="size-4 flex-none"></div>
                          </SidebarMenuButton>
                        </div>
                      );
                    })()}
                  {currentMenu.map((group, index) => (
                    <SidebarGroup key={index}>
                      {group.label && (
                        <SidebarGroupLabel className="uppercase">
                          {isKey(group.label, i18n, "common")
                            ? t(group.label)
                            : group.label}
                        </SidebarGroupLabel>
                      )}
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const title = isKey(item.title, i18n, "common")
                            ? t(item.title)
                            : item.title;

                          const active = isActive(item);

                          const props = {
                            tooltip: title,
                            onClick: (
                              e: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                              if (active) {
                                e.preventDefault();
                              } else {
                                setOpenMobile(false);
                              }

                              if (item.menu) {
                                onForward(item.href);
                              }
                            },
                            isActive: active,
                          };

                          return (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                {...props}
                                render={<TurboLink href={item.href} />}
                              >
                                {item.icon}
                                <span>{title}</span>
                                {item.menu && (
                                  <SidebarMenuAction>
                                    <Icons.ChevronRight />
                                  </SidebarMenuAction>
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroup>
                  ))}

                  {href === ROOT_MENU_HREF && (
                    <SidebarGroup className="mt-auto">
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              tooltip={t("support")}
                              onClick={() => setOpenMobile(false)}
                              render={
                                <TurboLink
                                  href={pathsConfig.marketing.contact}
                                />
                              }
                            >
                              <Icons.LifeBuoy />
                              <span>{t("support")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>

                          <SidebarMenuItem>
                            <SidebarMenuButton
                              tooltip={t("feedback")}
                              onClick={() => setOpenMobile(false)}
                              render={
                                <TurboLink
                                  href={pathsConfig.marketing.contact}
                                />
                              }
                            >
                              <Icons.MessageCircle />
                              <span>{t("feedback")}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  )}
                </SidebarContent>
              );
            })}
        </div>

        <SidebarFooter>
          <BuyCta className="mt-auto" />
          <SidebarMenu>
            <SidebarMenuItem>
              <UserNavigation user={user} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  },
);
