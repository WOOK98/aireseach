"use client";

import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui-mobile/avatar";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Skeleton } from "@workspace/ui-mobile/skeleton";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";

import { CreateOrganizationBottomSheet } from "./create-organization";
import { organization } from "./lib/api";

export const OrganizationPicker = () => {
  const { t } = useTranslation("organization");
  const { data: organizations, isPending } = authClient.useListOrganizations();
  const activeOrganization = authClient.useActiveOrganization();
  const activeMember = authClient.useActiveMember();

  const setActiveOrganization = useMutation({
    ...organization.mutations.setActive,
    onSuccess: async () => {
      await activeOrganization.refetch();
      await activeMember.refetch();
      router.replace(pathsConfig.dashboard.organization.index);
    },
  });

  return (
    <View className="w-full gap-4">
      {isPending &&
        Array.from({ length: 2 }).map((_, index) => (
          <Skeleton className="h-30" key={`skeleton-${index}`} />
        ))}

      {organizations?.map((organization) => (
        <Button
          variant="outline"
          key={organization.id}
          className="relative flex h-auto w-full items-center justify-between gap-3 px-5 py-4"
          onPress={() =>
            setActiveOrganization.mutate({
              organizationId: organization.id,
            })
          }
          disabled={setActiveOrganization.isPending}
        >
          <View className="w-full flex-row items-center justify-between gap-3">
            <View className="items-start gap-3">
              <Avatar alt={organization.name} className="size-16">
                <AvatarImage source={{ uri: organization.logo ?? undefined }} />
                <AvatarFallback>
                  <Text className="text-muted-foreground text-2xl">
                    {organization.name.charAt(0).toUpperCase()}
                  </Text>
                </AvatarFallback>
              </Avatar>
              <Text
                className="text-muted-foreground text-base"
                numberOfLines={1}
              >
                {organization.name}
              </Text>
            </View>

            <View className="mt-2 self-start">
              {setActiveOrganization.isPending &&
              setActiveOrganization.variables?.organizationId ===
                organization.id ? (
                <Spin>
                  <Icons.Loader2 className="text-muted-foreground" size={20} />
                </Spin>
              ) : (
                <Icons.ChevronRight
                  className="text-muted-foreground"
                  size={20}
                />
              )}
            </View>
          </View>
        </Button>
      ))}
      <CreateOrganizationBottomSheet>
        <Button
          disabled={setActiveOrganization.isPending}
          variant="outline"
          className="text-muted-foreground h-30 w-full flex-col gap-2 border-dashed"
        >
          <Icons.Plus
            className="text-muted-foreground"
            strokeWidth={1.5}
            size={28}
          />
          <Text className="text-muted-foreground text-base">
            {t("create.cta")}
          </Text>
        </Button>
      </CreateOrganizationBottomSheet>
    </View>
  );
};
