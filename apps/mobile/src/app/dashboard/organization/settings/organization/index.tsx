import { router } from "expo-router";
import { View } from "react-native";

import { toMemberRole } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { SettingsTile } from "~/modules/common/settings-tile";
import { DeleteOrganization } from "~/modules/organization/settings/delete-organization";
import { LeaveOrganization } from "~/modules/organization/settings/leave-organization";

export default function Organization() {
  const { t } = useTranslation("common");
  const { data: activeMember } = authClient.useActiveMember();

  const hasUpdatePermission = authClient.organization.checkRolePermission({
    permissions: {
      organization: ["update"],
    },
    role: toMemberRole(activeMember?.role),
  });

  const hasBillingReadPermission = authClient.organization.checkRolePermission({
    permissions: {
      billing: ["read"],
    },
    role: toMemberRole(activeMember?.role),
  });

  return (
    <View className="bg-background flex-1 gap-6 py-2">
      <View>
        {hasUpdatePermission && (
          <SettingsTile
            icon={Icons.IdCard}
            onPress={() =>
              router.navigate(
                pathsConfig.dashboard.organization.settings.organization.name,
              )
            }
          >
            <Text>{t("name")}</Text>
          </SettingsTile>
        )}
        {hasBillingReadPermission && (
          <SettingsTile
            icon={Icons.Wallet}
            onPress={() =>
              router.navigate(
                pathsConfig.dashboard.organization.settings.organization
                  .billing,
              )
            }
          >
            <Text>{t("billing")}</Text>
          </SettingsTile>
        )}
      </View>
      <View>
        <LeaveOrganization />
        <DeleteOrganization />
      </View>
    </View>
  );
}
