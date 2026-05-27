import { router } from "expo-router";
import { checkForUpdateAsync, useUpdates } from "expo-updates";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { SettingsTile } from "~/modules/common/settings-tile";
import { I18nSettings } from "~/modules/user/settings/i18n";
import { ThemeSettings } from "~/modules/user/settings/theme";

const CheckForUpdates = () => {
  const { t } = useTranslation("common");
  const { isChecking } = useUpdates();

  return (
    <SettingsTile
      icon={Icons.RefreshCw}
      onPress={checkForUpdateAsync}
      loading={isChecking}
      disabled={isChecking}
    >
      <Text className="mr-auto">{t("checkForUpdates")}</Text>
    </SettingsTile>
  );
};

export default function General() {
  const { t } = useTranslation("common");

  return (
    <View className="bg-background flex-1 py-2">
      <CheckForUpdates />
      <SettingsTile
        icon={Icons.Bell}
        onPress={() =>
          router.navigate(
            pathsConfig.dashboard.user.settings.general.notifications,
          )
        }
      >
        <Text className="mr-auto">{t("notifications")}</Text>
      </SettingsTile>
      <ThemeSettings />
      <I18nSettings />
    </View>
  );
}
