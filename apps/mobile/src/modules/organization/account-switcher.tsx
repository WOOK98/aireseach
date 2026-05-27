import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { getActivePlan } from "@workspace/billing";
import { useCustomer } from "@workspace/billing-mobile";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui-mobile/avatar";
import { useBottomSheet } from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui-mobile/dropdown-menu";
import { Icons } from "@workspace/ui-mobile/icons";
import { Skeleton } from "@workspace/ui-mobile/skeleton";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { billing } from "~/modules/billing/lib/api";
import { Spinner } from "~/modules/common/spinner";
import { organization } from "~/modules/organization/lib/api";

import { CreateOrganizationBottomSheet } from "./create-organization";

export const AccountSwitcher = () => {
  const { t } = useTranslation(["common", "auth", "billing", "organization"]);
  const [open, setOpen] = useState(false);

  const session = authClient.useSession();
  const organizations = authClient.useListOrganizations();
  const activeOrganization = authClient.useActiveOrganization();
  const activeMember = authClient.useActiveMember();

  const { entitlements } = useCustomer();
  const summary = useQuery(
    billing.queries.summary.get(
      activeOrganization.data?.id ?? session.data?.user.id,
    ),
  );
  const activePlan = getActivePlan(
    summary.data?.map((customer) => ({
      ...customer,
      entitlements,
    })),
  );

  const createOrganizationBottomSheet = useBottomSheet();
  const setActiveOrganization = useMutation({
    ...organization.mutations.setActive,
    onSuccess: async (_, variables) => {
      await activeOrganization.refetch();
      await activeMember.refetch();
      if (variables?.organizationId || variables?.organizationSlug) {
        router.replace(pathsConfig.dashboard.organization.index);
      } else {
        router.replace(pathsConfig.dashboard.user.index);
      }
    },
  });

  return (
    <>
      <DropdownMenu onOpenChange={setOpen} className="flex-1">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn("h-14 flex-row items-center gap-3 self-start px-2", {
              "bg-accent": open,
            })}
          >
            <Avatar
              alt={
                activeOrganization.data?.name ?? session.data?.user.name ?? ""
              }
            >
              {activeOrganization.data ? (
                <>
                  <AvatarImage
                    source={{ uri: activeOrganization.data.logo ?? undefined }}
                  />
                  <AvatarFallback>
                    <Text className="text-muted-foreground text-sm">
                      {activeOrganization.data.name.charAt(0).toUpperCase()}
                    </Text>
                  </AvatarFallback>
                </>
              ) : (
                <>
                  <AvatarImage
                    source={{ uri: session.data?.user.image ?? undefined }}
                  />
                  <AvatarFallback>
                    <Icons.UserRound
                      size={20}
                      className="text-muted-foreground"
                    />
                  </AvatarFallback>
                </>
              )}
            </Avatar>

            <View className="shrink">
              <Text
                className="font-sans-medium self-start text-base leading-tight"
                numberOfLines={1}
              >
                {activeOrganization.data
                  ? activeOrganization.data.name
                  : t("account.personal")}
              </Text>
              {summary.isPending ? (
                <Skeleton className="mt-1.5 h-3 w-20" />
              ) : (
                <Text className="text-muted-foreground font-sans leading-tight">
                  {t(`plan.${activePlan}.name`)}
                </Text>
              )}
            </View>

            <Icons.ChevronsUpDown
              width={16}
              height={16}
              className="text-muted-foreground ml-2"
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent sideOffset={4} align="start">
          <DropdownMenuItem
            onPress={() =>
              setActiveOrganization.mutate({ organizationId: null })
            }
          >
            <Avatar alt={session.data?.user.name ?? ""} className="size-6">
              <AvatarImage
                source={{ uri: session.data?.user.image ?? undefined }}
              />
              <AvatarFallback>
                <Icons.UserRound size={14} className="text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <Text>{t("account.personal")}</Text>

            {!activeOrganization.data ? (
              <Icons.Check
                className="text-muted-foreground ml-auto"
                size={16}
              />
            ) : (
              <View className="size-4" />
            )}
          </DropdownMenuItem>
          {!!organizations.data?.length && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground tracking-tight">{`${t("organizations")} (${organizations.data.length})`}</DropdownMenuLabel>
                {organizations.data.map((organization) => (
                  <DropdownMenuItem
                    key={organization.id}
                    onPress={() =>
                      setActiveOrganization.mutate({
                        organizationId: organization.id,
                      })
                    }
                  >
                    <Avatar className="size-6" alt={organization.name}>
                      <AvatarImage
                        source={{ uri: organization.logo ?? undefined }}
                      />
                      <AvatarFallback>
                        <Text className="text-muted-foreground text-sm">
                          {organization.name.charAt(0).toUpperCase()}
                        </Text>
                      </AvatarFallback>
                    </Avatar>
                    <Text numberOfLines={1}>{organization.name}</Text>

                    {activeOrganization.data?.id === organization.id ? (
                      <Icons.Check
                        className="text-muted-foreground ml-auto"
                        size={16}
                      />
                    ) : (
                      <View className="size-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onPress={createOrganizationBottomSheet.open}>
            <View className="border-border flex size-6 items-center justify-center rounded-md border bg-transparent">
              <Icons.Plus size={16} className="text-muted-foreground" />
            </View>
            <Text>{t("create.cta")}</Text>
            <View className="size-4" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationBottomSheet ref={createOrganizationBottomSheet.ref} />
      {setActiveOrganization.isPending && <Spinner />}
    </>
  );
};
