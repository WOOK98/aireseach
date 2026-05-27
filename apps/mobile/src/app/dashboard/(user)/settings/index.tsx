import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as StoreReview from "expo-store-review";
import { Share, View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { appConfig } from "~/config/app";
import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { SettingsTile } from "~/modules/common/settings-tile";
import { SafeAreaView, ScrollView } from "~/modules/common/styled";
import { AccountInfo } from "~/modules/user/settings/account/account-info";

import type { Session } from "@workspace/auth";

const getSections = (session?: Session | null) =>
  [
    [
      {
        title: "general",
        icon: Icons.Settings,
        onPress: () =>
          router.navigate(pathsConfig.dashboard.user.settings.general.index),
        visible: true,
      },
      {
        title: "account",
        icon: Icons.UserRound,
        onPress: () =>
          router.navigate(pathsConfig.dashboard.user.settings.account.index),
        visible: !!session?.session,
      },
      {
        title: "billing",
        icon: Icons.Wallet,
        onPress: () =>
          router.navigate(pathsConfig.dashboard.user.settings.billing),
        visible: !!session?.session,
      },
    ],
    [
      {
        title: "rate",
        icon: Icons.ThumbsUp,
        onPress: async () => {
          const available = await StoreReview.hasAction();

          if (available) {
            return await StoreReview.requestReview();
          }

          return Share.share({
            title: Constants.expoConfig?.name,
            message: appConfig.url,
          });
        },
        visible: true,
      },
      {
        title: "share",
        icon: Icons.Share2,
        onPress: () =>
          Share.share({
            title: Constants.expoConfig?.name,
            message: appConfig.url,
          }),
        visible: true,
      },
      {
        title: "privacy",
        icon: Icons.Lock,
        onPress: () => Linking.openURL(`${appConfig.url}/legal/privacy-policy`),
        visible: true,
      },
      {
        title: "sourceCode",
        icon: Icons.Code,
        onPress: () =>
          Linking.openURL(
            "https://turbostarter.lemonsqueezy.com/buy/b4a3d6cd-bf86-4cf0-af3f-78fa10f9636c?enabled=542201",
          ),
        visible: true,
      },
    ],
  ] as const;

export default function Settings() {
  const session = authClient.useSession();
  const { t } = useTranslation("common");

  const sections = getSections(session.data);

  return (
    <SafeAreaView className="bg-background flex-1">
      <ScrollView
        className="bg-background flex-1"
        contentContainerClassName="gap-8 py-6"
        bounces={false}
      >
        <AccountInfo />

        <View className="gap-6">
          {sections.map((section, index) => (
            <View key={index}>
              {section
                .filter((item) => item.visible)
                .map((item) => (
                  <SettingsTile {...item} key={item.title}>
                    <Text>{t(item.title)}</Text>
                  </SettingsTile>
                ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
