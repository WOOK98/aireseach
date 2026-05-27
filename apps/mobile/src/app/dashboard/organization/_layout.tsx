import { Tabs } from "expo-router";
import { Easing } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Icons } from "@workspace/ui-mobile/icons";

import { UserHeader } from "~/modules/common/layout/header";
import { TabBarLabel } from "~/modules/common/styled";

export default function OrganizationLayout() {
  const { t } = useTranslation("common");

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarStyle: {
          paddingTop: 4,
        },
        animation: "fade",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 200,
            easing: Easing.inOut(Easing.ease),
          },
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          header: () => <UserHeader />,
          title: t("home"),
          tabBarIcon: ({ focused }) => (
            <Icons.House
              size={24}
              className={cn("text-muted-foreground", {
                "text-primary": focused,
              })}
            />
          ),
          tabBarLabel: TabBarLabel,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          headerShown: false,
          title: t("settings"),
          tabBarIcon: ({ focused }) => (
            <Icons.Settings
              size={24}
              className={cn("text-muted-foreground", {
                "text-primary": focused,
              })}
            />
          ),
          tabBarLabel: TabBarLabel,
        }}
      />

      <Tabs.Screen
        name="members"
        options={{
          headerShown: false,
          title: t("members"),
          tabBarIcon: ({ focused }) => (
            <Icons.UsersRound
              size={24}
              className={cn("text-muted-foreground", {
                "text-primary": focused,
              })}
            />
          ),
          tabBarLabel: TabBarLabel,
        }}
      />
    </Tabs>
  );
}
