import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Pressable, View } from "react-native";

import {
  getAllRolesAtOrBelow,
  MemberRole,
  toMemberRole,
} from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui-mobile/avatar";
import { Badge } from "@workspace/ui-mobile/badge";
import { useBottomSheet } from "@workspace/ui-mobile/bottom-sheet";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuItemTitle,
  ContextMenuItemIcon,
  ContextMenuContent,
  ContextMenuTrigger,
  ContextMenuGroup,
} from "@workspace/ui-mobile/context-menu";
import { Icons } from "@workspace/ui-mobile/icons";
import { Skeleton } from "@workspace/ui-mobile/skeleton";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { organization } from "~/modules/organization/lib/api";
import { UpdateMemberRoleBottomSheet } from "~/modules/organization/members/update-member-role";

import type { Member } from "@workspace/auth";

export const MembersListItem = ({ member }: { member: Member }) => {
  const { t } = useTranslation(["common", "auth", "organization"]);
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const organizations = authClient.useListOrganizations();
  const activeMember = authClient.useActiveMember();

  const updateMemberRoleSheet = useBottomSheet();

  const me = member.userId === session.data?.user.id;

  const { data: canLeave } = useQuery({
    ...organization.queries.canLeave({
      id: member.organizationId,
    }),
    enabled: me && member.role === MemberRole.OWNER,
  });

  const hasDeletePermission =
    authClient.organization.checkRolePermission({
      permissions: {
        member: ["delete"],
      },
      role: toMemberRole(activeMember.data?.role),
    }) &&
    getAllRolesAtOrBelow(toMemberRole(activeMember.data?.role)).includes(
      member.role,
    ) &&
    (!me || member.role !== MemberRole.OWNER || canLeave?.allowed === true);

  const hasUpdatePermission =
    authClient.organization.checkRolePermission({
      permissions: {
        member: ["update"],
      },
      role: toMemberRole(activeMember.data?.role),
    }) &&
    getAllRolesAtOrBelow(toMemberRole(activeMember.data?.role)).includes(
      member.role,
    ) &&
    (!me || member.role !== MemberRole.OWNER || canLeave?.allowed === true);

  const removeMember = useMutation({
    ...organization.mutations.members.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        organization.queries.members.getAll({
          id: member.organizationId,
        }),
      );
      Alert.alert(t("members.remove.success"));
    },
  });

  const leaveOrganization = useMutation({
    ...organization.mutations.leave,
    onSuccess: () => {
      void organizations.refetch();
      Alert.alert(t("leave.success"));
      router.replace(pathsConfig.dashboard.user.index);
    },
  });

  const isRemovePending =
    removeMember.isPending &&
    removeMember.variables.memberIdOrEmail === member.id &&
    removeMember.variables.organizationId === member.organizationId;

  const isLeavePending =
    leaveOrganization.isPending &&
    leaveOrganization.variables.organizationId === member.organizationId;

  const groups = [
    hasUpdatePermission
      ? [
          <ContextMenuItem
            key="update-role"
            textValue={t("updateRole")}
            onSelect={() => {
              updateMemberRoleSheet.open();
            }}
          >
            <ContextMenuItemIcon
              ios={{
                name: "person.badge.key",
              }}
              androidIconName="ic_menu_edit"
            />
            <ContextMenuItemTitle>
              <Text>{t("updateRole")}</Text>
            </ContextMenuItemTitle>
          </ContextMenuItem>,
        ]
      : null,
    [
      hasDeletePermission ? (
        me ? (
          <ContextMenuItem
            key={`leave-${member.id}`}
            textValue={t("common:leave")}
            destructive
            disabled={isLeavePending}
            onSelect={() => {
              leaveOrganization.mutate({
                organizationId: member.organizationId,
              });
            }}
          >
            <ContextMenuItemIcon
              ios={{
                name: "rectangle.portrait.and.arrow.right",
              }}
              androidIconName="ic_menu_close_clear_cancel"
            />
            <ContextMenuItemTitle>
              <Text>{t("common:leave")}</Text>
            </ContextMenuItemTitle>
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            key={`remove-${member.id}`}
            textValue={t("common:remove")}
            disabled={isRemovePending}
            destructive
            onSelect={() => {
              removeMember.mutate({
                memberIdOrEmail: member.id,
                organizationId: member.organizationId,
              });
            }}
          >
            <ContextMenuItemIcon
              ios={{
                name: "trash",
              }}
              androidIconName="ic_menu_delete"
            />
            <ContextMenuItemTitle>
              <Text>{t("common:remove")}</Text>
            </ContextMenuItemTitle>
          </ContextMenuItem>
        )
      ) : null,
    ],
  ].filter((group) => group?.filter(Boolean).length);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger disabled={isRemovePending || isLeavePending}>
          <Pressable
            className={cn(
              "active:bg-accent dark:active:bg-accent/50 bg-background flex-row items-center gap-3 px-4 py-3 disabled:opacity-50",
              {
                "opacity-50": isRemovePending || isLeavePending,
              },
            )}
            disabled={isRemovePending || isLeavePending}
          >
            <Avatar alt={member.user.name}>
              <AvatarImage source={{ uri: member.user.image }} />
              <AvatarFallback>
                <Icons.UserRound size={20} className="text-foreground" />
              </AvatarFallback>
            </Avatar>
            <View className="flex-1">
              <View className="flex-1 flex-row items-center gap-2">
                <Text
                  className="font-sans-medium shrink text-sm leading-tight"
                  numberOfLines={1}
                >
                  {member.user.name}
                </Text>
                {me && (
                  <Badge variant="outline">
                    <Text>{t("you")}</Text>
                  </Badge>
                )}
              </View>
              <Text className="text-muted-foreground text-sm" numberOfLines={1}>
                {member.user.email}
              </Text>
            </View>

            <Badge variant="outline" className="ml-auto">
              <Text>{t(member.role)}</Text>
            </Badge>
          </Pressable>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {groups.map((group, index) => (
            <ContextMenuGroup key={`group-${index}`}>
              {group?.flat()}
            </ContextMenuGroup>
          ))}
        </ContextMenuContent>
      </ContextMenu>
      <UpdateMemberRoleBottomSheet
        member={member}
        ref={updateMemberRoleSheet.ref}
      />
    </>
  );
};

export const MembersListItemSkeleton = () => {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Skeleton className="size-10 rounded-full" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full max-w-64" />
      </View>
      <Skeleton className="ml-auto h-5 w-12" />
    </View>
  );
};
