import { router } from "expo-router";
import React from "react";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { SettingsTile } from "~/modules/common/settings-tile";
import { ScrollView } from "~/modules/common/styled";
import { DeleteAccount } from "~/modules/user/settings/account/delete-account";
import { Logout } from "~/modules/user/settings/account/logout";

const sections = [
  [
    () => {
      const { t } = useTranslation("common");

      return (
        <SettingsTile
          icon={Icons.IdCard}
          onPress={() =>
            router.navigate(pathsConfig.dashboard.user.settings.account.name)
          }
        >
          <Text>{t("name")}</Text>
        </SettingsTile>
      );
    },
    () => {
      const { t } = useTranslation("common");
      return (
        <SettingsTile
          icon={Icons.AtSign}
          onPress={() =>
            router.navigate(pathsConfig.dashboard.user.settings.account.email)
          }
        >
          <Text>{t("email")}</Text>
        </SettingsTile>
      );
    },
    () => {
      const { t } = useTranslation(["common", "auth"]);
      return (
        <SettingsTile
          icon={Icons.Workflow}
          onPress={() =>
            router.navigate(
              pathsConfig.dashboard.user.settings.account.accounts,
            )
          }
        >
          <Text>{t("account.accounts.title")}</Text>
        </SettingsTile>
      );
    },
    () => {
      const { t } = useTranslation("auth");
      return (
        <SettingsTile
          icon={Icons.Lock}
          onPress={() =>
            router.navigate(
              pathsConfig.dashboard.user.settings.account.password,
            )
          }
        >
          <Text>{t("password")}</Text>
        </SettingsTile>
      );
    },
    () => {
      const { t } = useTranslation("auth");
      return (
        <SettingsTile
          icon={Icons.ShieldCheck}
          onPress={() =>
            router.navigate(
              pathsConfig.dashboard.user.settings.account.twoFactor,
            )
          }
        >
          <Text>{t("account.twoFactor.title")}</Text>
        </SettingsTile>
      );
    },
  ],
  [
    () => {
      const { t } = useTranslation("auth");
      return (
        <SettingsTile
          icon={Icons.MonitorSmartphone}
          onPress={() =>
            router.navigate(
              pathsConfig.dashboard.user.settings.account.sessions,
            )
          }
        >
          <Text>{t("account.sessions.title")}</Text>
        </SettingsTile>
      );
    },
    Logout,
  ],
  [DeleteAccount],
];

export default function Account() {
  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="bg-background flex-1 py-2"
        contentContainerClassName="gap-8"
        bounces={false}
      >
        <View className="gap-6">
          {sections.map((section, index) => (
            <View key={index}>
              {section.map((item, index) => (
                <React.Fragment key={index}>{item()}</React.Fragment>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
