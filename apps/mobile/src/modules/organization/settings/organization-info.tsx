import { useMutation } from "@tanstack/react-query";
import { View } from "react-native";

import { toMemberRole } from "@workspace/auth";
import { isKey, useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
import { Skeleton } from "@workspace/ui-mobile/skeleton";
import { Text } from "@workspace/ui-mobile/text";

import { authClient } from "~/lib/auth";
import {
  AvatarForm,
  AvatarFormRemoveButton,
  AvatarFormUploadButton,
  AvatarFormPreview,
} from "~/modules/common/avatar-form";
import { organization } from "~/modules/organization/lib/api";

const OrganizationInfoSkeleton = () => {
  return (
    <View className="items-center">
      <Skeleton className="mb-4 size-28 rounded-full" />
      <Skeleton className="mb-3 h-5 w-40" />
      <Skeleton className="h-5 w-20" />
    </View>
  );
};

export const OrganizationInfo = () => {
  const { t, i18n } = useTranslation("common");

  const activeOrganization = authClient.useActiveOrganization();
  const activeMember = authClient.useActiveMember();

  const updateOrganization = useMutation(organization.mutations.update);

  if (
    activeOrganization.isPending ||
    !activeOrganization.data ||
    activeMember.isPending ||
    !activeMember.data
  ) {
    return <OrganizationInfoSkeleton />;
  }

  const role = activeMember.data.role;

  const hasUpdatePermission = authClient.organization.checkRolePermission({
    permissions: {
      organization: ["update"],
    },
    role: toMemberRole(role),
  });

  return (
    <View className="items-center gap-4">
      <AvatarForm
        key={activeOrganization.data.id}
        id={activeOrganization.data.id}
        image={activeOrganization.data.logo}
        update={(image) =>
          updateOrganization.mutateAsync({
            data: {
              logo: image ?? "",
            },
            organizationId: activeOrganization.data?.id ?? "",
          })
        }
      >
        <View className="relative">
          <AvatarFormPreview
            alt={activeOrganization.data.name}
            fallback={
              <Text className="text-muted-foreground text-4xl leading-none">
                {activeOrganization.data.name.charAt(0).toUpperCase()}
              </Text>
            }
          />
          {hasUpdatePermission && (
            <AvatarFormUploadButton onUpload={activeOrganization.refetch} />
          )}
          {hasUpdatePermission && (
            <AvatarFormRemoveButton onRemove={activeOrganization.refetch} />
          )}
        </View>
      </AvatarForm>
      <View className="items-center gap-2.5">
        <Text className="font-sans-semibold text-xl">
          {activeOrganization.data.name}
        </Text>

        {role && (
          <Badge variant="outline">
            <Text>{isKey(role, i18n, "common") ? t(role) : role}</Text>
          </Badge>
        )}
      </View>
    </View>
  );
};
