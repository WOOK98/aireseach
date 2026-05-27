"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";

import { getActivePlan } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui-web/avatar";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui-web/command";
import { Icons } from "@workspace/ui-web/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui-web/popover";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui-web/sidebar";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { billing } from "~/modules/billing/lib/api";
import { TurboLink } from "~/modules/common/turbo-link";
import { CreateOrganizationModal } from "~/modules/organization/create-organization";

import { useActiveOrganization } from "./hooks/use-active-organization";

import type { User } from "@workspace/auth";

interface AccountSwitcherProps {
  readonly user: User;
}

export const AccountSwitcher = memo<AccountSwitcherProps>(({ user }) => {
  const { t } = useTranslation(["common", "auth", "billing", "organization"]);
  const { isMobile } = useSidebar();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [createOrganizationOpen, setCreateOrganizationOpen] = useState(false);

  const { data: organizations } = authClient.useListOrganizations();
  const { activeOrganization } = useActiveOrganization();

  const referenceId = activeOrganization?.id ?? user.id;
  const summary = useQuery(billing.queries.summary.get(referenceId));
  const activePlan = getActivePlan(summary.data);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen} modal>
          <PopoverTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8">
                  {activeOrganization ? (
                    <>
                      <AvatarImage
                        src={activeOrganization.logo ?? undefined}
                        alt={activeOrganization.name}
                      />
                      <AvatarFallback>
                        <span className="text-muted-foreground text-sm uppercase">
                          {activeOrganization.name.charAt(0)}
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

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeOrganization
                      ? activeOrganization.name
                      : t("account.personal")}
                  </span>
                  {summary.isPending ? (
                    <Skeleton className="mt-1 h-3 w-20" />
                  ) : (
                    <span className="text-muted-foreground truncate text-xs capitalize">
                      {t(`plan.${activePlan}.name`)}
                    </span>
                  )}
                </div>

                <Icons.ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            }
          />

          <PopoverContent
            className="w-60 rounded-lg p-0"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <Command
              defaultValue={activeOrganization?.slug ?? "personal-account"}
            >
              <CommandInput placeholder={t("search")} autoFocus />
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    asChild
                    value="personal-account"
                    className="p-2"
                    onSelect={() => {
                      setOpen(false);
                      router.replace(pathsConfig.dashboard.user.index);
                    }}
                  >
                    <TurboLink href={pathsConfig.dashboard.user.index}>
                      <Avatar className="size-6">
                        <AvatarImage
                          src={user.image ?? undefined}
                          alt={user.name}
                        />
                        <AvatarFallback>
                          <Icons.UserRound className="size-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      {t("account.personal")}
                      {!activeOrganization && (
                        <Icons.Check className="ml-auto" />
                      )}
                    </TurboLink>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                {organizations && organizations.length > 0 && (
                  <>
                    <CommandGroup
                      heading={`${t("organizations")} (${organizations.length})`}
                    >
                      {organizations.map((organization) => (
                        <CommandItem
                          asChild
                          value={organization.slug}
                          key={organization.id}
                          className="p-2"
                          onSelect={() => {
                            router.replace(
                              pathsConfig.dashboard.organization(
                                organization.slug,
                              ).index,
                            );
                          }}
                        >
                          <TurboLink
                            href={
                              pathsConfig.dashboard.organization(
                                organization.slug,
                              ).index
                            }
                            className="leading-tight"
                          >
                            <Avatar className="size-6">
                              <AvatarImage
                                src={organization.logo ?? undefined}
                                alt={organization.name}
                              />
                              <AvatarFallback>
                                <span className="text-muted-foreground text-sm uppercase">
                                  {organization.name.charAt(0)}
                                </span>
                              </AvatarFallback>
                            </Avatar>
                            {organization.name}

                            {activeOrganization?.slug === organization.slug && (
                              <Icons.Check className="ml-auto" />
                            )}
                          </TurboLink>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                <CommandGroup forceMount>
                  <CommandItem
                    className="p-2"
                    onSelect={() => setCreateOrganizationOpen(true)}
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                      <Icons.Plus className="size-4" />
                    </div>
                    {t("create.cta")}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <CreateOrganizationModal
          open={createOrganizationOpen}
          onOpenChange={setCreateOrganizationOpen}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
});

AccountSwitcher.displayName = "AccountSwitcher";
