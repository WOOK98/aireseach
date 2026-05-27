import * as Linking from "expo-linking";
import { Pressable } from "react-native";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Text } from "@workspace/ui-mobile/text";

export default function Notifications() {
  const { t } = useTranslation(["common", "marketing"]);

  return (
    <View className="bg-background flex flex-1 items-center justify-center px-6">
      <View className="items-center gap-6 text-center">
        <Text className="font-sans-bold mt-4 text-3xl tracking-tight">
          {t("workInProgress.title")}
        </Text>
        <Text className="text-muted-foreground text-center text-pretty">
          {t("workInProgress.description", { feature: t("notifications") })}
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL("https://github.com/orgs/turbostarter/projects/1")
          }
          className="mt-6"
        >
          <Text className="text-primary underline">{t("seeRoadmap")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
