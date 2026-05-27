/* eslint-disable @typescript-eslint/no-require-imports */
import { Image } from "expo-image";
import { router } from "expo-router";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import {
  Slider,
  SliderList,
  SliderListItem,
  SliderPaginationDots,
  SliderPaginationDot,
} from "@workspace/ui-mobile/slider";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { useTheme } from "~/modules/common/hooks/use-theme";
import { SafeAreaView } from "~/modules/common/styled";
import { WIDTH } from "~/utils/device";

import type { ImageSource } from "expo-image";

const images = [
  {
    light: require("../../../public/images/setup/1/light.png") as ImageSource,
    dark: require("../../../public/images/setup/1/dark.png") as ImageSource,
  },
  {
    light: require("../../../public/images/setup/2/light.png") as ImageSource,
    dark: require("../../../public/images/setup/2/dark.png") as ImageSource,
  },
  {
    light: require("../../../public/images/setup/3/light.png") as ImageSource,
    dark: require("../../../public/images/setup/3/dark.png") as ImageSource,
  },
];

const ITEM_WIDTH = WIDTH - 48;

const WelcomePage = () => {
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation(["common", "marketing", "auth"]);

  return (
    <View className="bg-background flex-1 px-6 pt-2 pb-4">
      <SafeAreaView className="bg-background flex-1 gap-12">
        <View className="flex-1 gap-8 pt-2">
          <Slider threshold={ITEM_WIDTH}>
            <SliderList
              data={images}
              renderItem={({ item, index }) => (
                <SliderListItem
                  className="flex-1 items-center justify-center"
                  style={{ width: ITEM_WIDTH }}
                  index={index}
                >
                  <Image
                    source={item[resolvedTheme]}
                    contentFit="contain"
                    style={{ flex: 1, width: "100%" }}
                  />
                </SliderListItem>
              )}
            />
            <SliderPaginationDots>
              {images.map((_, index) => (
                <SliderPaginationDot key={index} index={index} />
              ))}
            </SliderPaginationDots>
          </Slider>

          <View className="mx-auto mt-auto max-w-xl gap-3">
            <Text className="font-sans-bold text-center text-3xl tracking-tighter sm:text-4xl">
              {t("product.title")}
            </Text>

            <Text className="text-muted-foreground px-6 text-center text-base leading-snug sm:text-lg">
              {t("product.description")}
            </Text>
          </View>
        </View>

        <View className="mt-auto gap-3">
          <Button
            size="lg"
            onPress={() => router.navigate(pathsConfig.setup.auth.register)}
          >
            <Text>{t("getStarted")}</Text>
          </Button>

          <Button
            variant="outline"
            size="lg"
            onPress={() => router.navigate(pathsConfig.setup.auth.login)}
          >
            <Text>
              {t("register.alreadyHaveAccount")} {t("login.cta")}
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default WelcomePage;
