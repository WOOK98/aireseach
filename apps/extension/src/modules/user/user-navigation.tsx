import { useQuery } from "@tanstack/react-query";
import { memo } from "react";

import { hasAdminPermission } from "@workspace/auth";
import { getActivePlan } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui-web/avatar";
import { buttonVariants } from "@workspace/ui-web/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@workspace/ui-web/dropdown-menu";
import { Icons } from "@workspace/ui-web/icons";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { appConfig } from "~/config/app";
import { billing } from "~/modules/billing/lib/api";

import { useElementById } from "../common/hooks/use-element-by-id";
import { Logout } from "./logout";

import type { Organization, User } from "@workspace/auth";

const AnonymousUser = () => {
  const { t } = useTranslation("auth");
  return (
    <a
      href={`${appConfig.url}/auth/login`}
      className={cn(
        buttonVariants({
          variant: "outline",
          size: "icon",
        }),
        "rounded-full",
      )}
      target="_blank"
    >
      <Icons.LogIn className="size-4" />
      <div className="sr-only">{t("login.cta")}</div>
    </a>
  );
};

const DashboardLink = ({ href }: { href: string }) => {
  const { t } = useTranslation("common");
  return (
    <DropdownMenuItem
      render={
        <a
          href={href}
          target="_blank"
          className="flex w-full cursor-pointer items-center gap-1.5"
        >
          <Icons.Home className="size-4" />
          {t("dashboard")}
        </a>
      }
    />
  );
};

const SettingsLink = ({ href }: { href: string }) => {
  const { t } = useTranslation("common");
  return (
    <DropdownMenuItem
      render={
        <a
          href={href}
          target="_blank"
          className="flex w-full cursor-pointer items-center gap-1.5"
        >
          <Icons.Settings className="size-4" />
          {t("settings")}
        </a>
      }
    />
  );
};

interface UserNavigationProps {
  readonly user: User | null;
  readonly organization: Organization | null;
}

export const UserNavigation = memo<UserNavigationProps>(
  ({ user, organization }) => {
    const { t } = useTranslation(["common", "auth", "billing"]);
    const container = useElementById("main");

    const summary = useQuery({
      ...billing.queries.summary.get(organization?.id ?? user?.id ?? ""),
      enabled: !!organization || !!user,
    });
    const activePlan = getActivePlan(summary.data);

    if (!user) {
      return <AnonymousUser />;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button className="relative flex items-center gap-4 rounded-md">
              <Avatar className="size-10">
                {organization ? (
                  <>
                    <AvatarImage
                      src={organization.logo ?? undefined}
                      alt={organization.name}
                    />
                    <AvatarFallback>
                      <span className="text-muted-foreground text-sm uppercase">
                        {organization.name.charAt(0)}
                      </span>
                    </AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage
                      src={user.image ?? undefined}
                      alt={user.name}
                    />
                    <AvatarFallback>
                      <Icons.UserRound className="w-5" />
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
            </button>
          }
        />
        <DropdownMenuContent
          className="w-56"
          align="end"
          portal={{ container }}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <Avatar className="size-8">
                {organization ? (
                  <>
                    <AvatarImage
                      src={organization.logo ?? undefined}
                      alt={organization.name}
                    />
                    <AvatarFallback>
                      <span className="text-muted-foreground text-sm uppercase">
                        {organization.name.charAt(0)}
                      </span>
                    </AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage
                      src={user.image ?? undefined}
                      alt={user.name}
                    />
                    <AvatarFallback>
                      <Icons.UserRound className="w-4" />
                    </AvatarFallback>
                  </>
                )}
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {organization ? organization.name : t("account.personal")}
                </span>
                {summary.isPending ? (
                  <Skeleton className="mt-1 h-3 w-20" />
                ) : (
                  <span className="text-muted-foreground truncate text-xs capitalize">
                    {t(`plan.${activePlan}.name`)}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            <DashboardLink
              href={
                organization
                  ? `${appConfig.url}/dashboard/${organization.slug}`
                  : `${appConfig.url}/dashboard`
              }
            />
            <SettingsLink
              href={
                organization
                  ? `${appConfig.url}/dashboard/${organization.slug}/settings`
                  : `${appConfig.url}/dashboard/settings`
              }
            />
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
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
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            <DashboardLink href={`${appConfig.url}/dashboard`} />
            <SettingsLink href={`${appConfig.url}/dashboard/settings`} />
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            {hasAdminPermission(user) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <a
                      href={`${appConfig.url}/admin`}
                      target="_blank"
                      className="flex w-full cursor-pointer items-center gap-1.5"
                    >
                      <Icons.ShieldUser className="size-4" />
                      {t("admin")}
                    </a>
                  }
                />
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              nativeButton
              render={<Logout />}
              className="cursor-pointer"
            />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
);

export const UserNavigationSkeleton = () => {
  return <Skeleton className="size-10 rounded-full" />;
};

UserNavigation.displayName = "UserNavigation";
