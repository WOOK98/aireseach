import { useReactNavigationDevTools } from "@dev-plugins/react-navigation";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from "@expo-google-fonts/geist";
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono";
import { router, Stack, useNavigationContainerRef } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Text } from "@workspace/ui-mobile/text";

import "~/assets/styles/globals.css";
import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import "~/lib/polyfills";
import { Providers } from "~/lib/providers/providers";
import { useTheme } from "~/modules/common/hooks/use-theme";
import { Updates } from "~/modules/common/updates";

import type { ErrorBoundaryProps } from "expo-router";

void SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

const RootNavigator = () => {
  const navigationRef = useNavigationContainerRef();
  useReactNavigationDevTools(
    navigationRef as Parameters<typeof useReactNavigationDevTools>[0],
  );

  return (
    <Providers>
      <Updates />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          animationDuration: 200,
        }}
      />
    </Providers>
  );
};

const useSetupAuth = () => {
  const session = authClient.useSession();
  const activeOrganization = authClient.useActiveOrganization();
  const activeMember = authClient.useActiveMember();

  if (session.isPending) {
    return false;
  }

  if (!session.data) {
    return true;
  }

  return !activeOrganization.isPending && !activeMember.isPending;
};

const RootLayout = () => {
  useTheme();
  const [fontsLoaded] = useFonts({
    GeistMono_400Regular,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  const authLoaded = useSetupAuth();

  const loaded = fontsLoaded && authLoaded;

  if (loaded) {
    SplashScreen.hide();
  }

  return <RootNavigator />;
};

export default RootLayout;

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation("common");

  return (
    <View className="bg-background flex-1 items-center justify-center gap-8 px-6">
      <View className="flex flex-col items-center justify-center gap-4">
        <Text className="font-sans-bold text-center text-4xl">
          {t("error.general")}
        </Text>
        <Text className="text-muted-foreground text-center">
          {error.message || t("error.apologies")}
        </Text>
      </View>

      <View className="flex-row items-center justify-center gap-4">
        <Button onPress={retry}>
          <Text>{t("tryAgain")}</Text>
        </Button>

        <Button
          onPress={() => router.replace(pathsConfig.index)}
          variant="outline"
        >
          <Text>{t("goBackHome")}</Text>
        </Button>
      </View>
    </View>
  );
}
