"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { memo } from "react";

import { hasAdminPermission } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui-web/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@workspace/ui-web/dropdown-menu";
import { Icons } from "@workspace/ui-web/icons";
import { SidebarMenuButton, useSidebar } from "@workspace/ui-web/sidebar";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { auth } from "~/modules/auth/lib/api";
import { Customizer } from "~/modules/common/theme";
import { TurboLink } from "~/modules/common/turbo-link";

import type { User } from "@workspace/auth";

interface UserNavigationProps {
  readonly user: User;
}

export const UserNavigation = memo<UserNavigationProps>(({ user }) => {
  const { t } = useTranslation(["common", "auth"]);
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { refetch } = authClient.useListOrganizations();

  const signOut = useMutation({
    ...auth.mutations.signOut,
    onSuccess: async () => {
      router.replace(pathsConfig.index);
      router.refresh();
      await refetch();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar className="size-8">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>
                <Icons.UserRound className="w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="grid flex-1 text-left text-sm leading-tight">
              {user.name && (
                <span className="truncate font-medium">{user.name}</span>
              )}
              {user.email && (
                <span className="truncate text-xs">{user.email}</span>
              )}
            </div>
            <Icons.EllipsisVertical className="ml-auto size-4" />
          </SidebarMenuButton>
        }
      />

      <DropdownMenuContent
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
        className="w-60"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 font-normal">
            <Avatar className="size-8">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>
                <Icons.UserRound className="w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="flex w-full min-w-0 flex-col space-y-1">
              {user.name && (
                <p className="truncate text-sm leading-none font-medium">
                  {user.name}
                </p>
              )}
              {user.email && (
                <p className="text-muted-foreground truncate text-xs leading-none">
                  {user.email}
                </p>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={
              <TurboLink
                href={pathsConfig.dashboard.user.index}
                className="flex w-full cursor-pointer items-center gap-1.5"
                onClick={() => setOpenMobile(false)}
              >
                <Icons.Home className="size-4" />
                {t("dashboard")}
              </TurboLink>
            }
          />

          <DropdownMenuItem
            render={
              <TurboLink
                href={pathsConfig.dashboard.user.settings.index}
                className="flex w-full cursor-pointer items-center gap-1.5"
                onClick={() => setOpenMobile(false)}
              >
                <Icons.Settings className="size-4" />
                {t("settings")}
              </TurboLink>
            }
          />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="[&_svg]:last:hidden">
              <Icons.Sun className="text-muted-foreground size-4 dark:hidden" />
              <Icons.Moon className="text-muted-foreground hidden size-4 dark:block" />
              {t("theme.title")}
              <div className="bg-primary text-muted-foreground ml-auto size-3 rounded-full"></div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="space-y-4 p-6">
              <Customizer />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        {hasAdminPermission(user) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <TurboLink
                  href={pathsConfig.admin.index}
                  className="flex w-full cursor-pointer items-center gap-1.5"
                >
                  <Icons.ShieldUser className="size-4" />
                  {t("common:admin")}
                </TurboLink>
              }
            />
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex w-full cursor-pointer items-center gap-1.5"
          onClick={() => signOut.mutate(undefined)}
        >
          <Icons.LogOut className="size-4" />
          {t("logout.cta")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export const UserNavigationSkeleton = () => {
  return <Skeleton className="size-10 rounded-full" />;
};

UserNavigation.displayName = "UserNavigation";
