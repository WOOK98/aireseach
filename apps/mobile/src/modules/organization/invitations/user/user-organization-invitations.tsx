"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { memo } from "react";
import { Alert, Pressable, View } from "react-native";

import { handle } from "@workspace/api/utils";
import { InvitationStatus } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import {
  Alert as AlertBox,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui-mobile/alert";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetScrollView,
  BottomSheetTitle,
  useBottomSheet,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Skeleton } from "@workspace/ui-mobile/skeleton";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { api } from "~/lib/api";
import { authClient } from "~/lib/auth";
import { organization } from "~/modules/organization/lib/api";
import { user } from "~/modules/user/lib/api";

import { InvitationSummaryCard } from "../invitation-summary-card";

import type { Invitation } from "@workspace/auth";

export const UserOrganizationInvitationsBanner = memo(() => {
  const { t } = useTranslation(["organization", "common"]);

  const { data } = useQuery(user.queries.invitations.getAll);
  const pendingInvitations = data?.filter(
    (invitation) =>
      invitation.status === InvitationStatus.PENDING &&
      dayjs(invitation.expiresAt).isAfter(dayjs()),
  );

  if (!pendingInvitations?.length) {
    return null;
  }

  return (
    <UserOrganizationInvitationsListBottomSheet
      invitations={pendingInvitations}
    >
      <Pressable>
        <AlertBox variant="primary">
          <AlertTitle className="pl-0">
            {t("invitations.user.banner.title", {
              count: pendingInvitations.length,
            })}
          </AlertTitle>
          <AlertDescription className="pl-0">
            {t("invitations.user.banner.description")}
          </AlertDescription>
        </AlertBox>
      </Pressable>
    </UserOrganizationInvitationsListBottomSheet>
  );
});

const UserOrganizationInvitationsListModalItem = ({
  invitation,
  onSuccess,
}: {
  invitation: Invitation;
  onSuccess?: () => void;
}) => {
  const { t } = useTranslation(["common", "organization"]);
  const queryClient = useQueryClient();
  const { refetch } = authClient.useListOrganizations();

  const { data, isLoading } = useQuery({
    queryKey: organization.queries.get({ id: invitation.organizationId })
      .queryKey,
    queryFn: () =>
      handle(api.organizations[":id"].$get)({
        param: { id: invitation.organizationId },
      }),
  });

  const acceptInvitation = useMutation({
    ...organization.mutations.invitations.accept,
    onSuccess: async () => {
      Alert.alert(
        t("success"),
        t("invitations.accept.success", "", {
          organization: data?.organization?.name ?? "",
        }),
      );
      await queryClient.invalidateQueries(user.queries.invitations.getAll);
      await refetch();
      onSuccess?.();
    },
  });

  const rejectInvitation = useMutation({
    ...organization.mutations.invitations.reject,
    onSuccess: async () => {
      Alert.alert(
        t("success"),
        t("invitations.reject.success", "", {
          organization: data?.organization?.name ?? "",
        }),
      );
      await queryClient.invalidateQueries(user.queries.invitations.getAll);
      onSuccess?.();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-26 w-full" />;
  }

  if (!data?.organization) {
    return null;
  }

  return (
    <View className="gap-2">
      <InvitationSummaryCard
        invitation={invitation}
        organization={data.organization}
      />

      <View className="flex-row gap-1">
        <Button
          variant="outline"
          size="sm"
          onPress={() =>
            rejectInvitation.mutate({ invitationId: invitation.id })
          }
          disabled={rejectInvitation.isPending || acceptInvitation.isPending}
          className="grow"
        >
          {rejectInvitation.isPending ? (
            <Spin>
              <Icons.Loader2 className="text-foreground" size={16} />
            </Spin>
          ) : (
            <Icons.X size={16} className="text-foreground" />
          )}
          <Text>{t("reject")}</Text>
        </Button>

        <Button
          size="sm"
          onPress={() =>
            acceptInvitation.mutate({ invitationId: invitation.id })
          }
          disabled={rejectInvitation.isPending || acceptInvitation.isPending}
          className="grow"
        >
          {acceptInvitation.isPending ? (
            <Spin>
              <Icons.Loader2 className="text-primary-foreground" size={16} />
            </Spin>
          ) : (
            <Icons.Check size={16} className="text-primary-foreground" />
          )}
          <Text>{t("accept")}</Text>
        </Button>
      </View>
    </View>
  );
};

export const UserOrganizationInvitationsListBottomSheet = ({
  children,
  invitations,
}: {
  invitations: Invitation[];
  children: React.ReactNode;
}) => {
  const { t } = useTranslation("organization");

  const { ref, close } = useBottomSheet();

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>{children}</BottomSheetOpenTrigger>
      <BottomSheetContent ref={ref} name="user-organization-invitations">
        <BottomSheetScrollView>
          <BottomSheetHeader>
            <BottomSheetTitle>
              {t("invitations.user.list.title")}
            </BottomSheetTitle>
            <BottomSheetDescription>
              {t("invitations.user.list.description")}
            </BottomSheetDescription>
          </BottomSheetHeader>

          {invitations.map((invitation) => (
            <UserOrganizationInvitationsListModalItem
              key={invitation.id}
              invitation={invitation}
              {...(invitations.length === 1
                ? { onSuccess: () => close() }
                : {})}
            />
          ))}
        </BottomSheetScrollView>
      </BottomSheetContent>
    </BottomSheet>
  );
};
