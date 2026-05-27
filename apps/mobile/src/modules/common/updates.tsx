import { isLiquidGlassAvailable } from "expo-glass-effect";
import {
  useUpdates,
  reloadAsync,
  fetchUpdateAsync,
  checkForUpdateAsync,
} from "expo-updates";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Progress } from "@workspace/ui-mobile/progress";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { BlurView, GlassView } from "./styled";

import type { ViewProps } from "react-native";

const UpdatesContext = createContext<{
  visible: boolean;
  setVisible: (visible: boolean) => void;
}>({
  visible: false,
  setVisible: () => void 0,
});

const Wrapper = ({ className, style, ...props }: ViewProps) => {
  const insets = useSafeAreaInsets();
  const sharedClassName =
    "absolute left-0 mx-5 gap-3 overflow-hidden rounded-lg border-border border p-5";

  const offset = insets.top + (Platform.select({ ios: 4, android: 8 }) ?? 0);
  const sharedStyle = {
    top: offset,
  };

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        className={cn(sharedClassName, className)}
        style={[sharedStyle, style]}
        {...props}
      />
    );
  }

  return (
    <BlurView
      className={cn(sharedClassName, className)}
      style={[sharedStyle, style]}
      intensity={200}
      {...props}
    />
  );
};

const Available = () => {
  const { t } = useTranslation(["marketing", "common"]);
  const { isUpdatePending } = useUpdates();
  const { setVisible } = useContext(UpdatesContext);

  return (
    <>
      <View className="gap-0.5">
        <Text className="font-sans-medium text-lg leading-tight">
          {t("update.available.title")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("update.available.description")}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="grow"
          onPress={() => setVisible(false)}
        >
          <Text>{t("dismiss")}</Text>
        </Button>
        <Button
          size="sm"
          className="grow"
          onPress={() => {
            if (isUpdatePending) {
              return reloadAsync();
            }

            return fetchUpdateAsync();
          }}
        >
          <Text>{t("install")}</Text>
        </Button>
      </View>
    </>
  );
};

const Installing = () => {
  const { t } = useTranslation(["marketing", "common"]);
  const { downloadProgress, isUpdatePending } = useUpdates();

  useEffect(() => {
    if (isUpdatePending && (downloadProgress ?? 0) >= 1) {
      void reloadAsync();
    }
  }, [isUpdatePending, downloadProgress]);

  return (
    <>
      <View className="gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-sans-medium text-lg leading-tight">
            {t("update.installing.title")}
          </Text>
          <Spin>
            <Icons.Loader2 className="text-primary" size={16} />
          </Spin>
        </View>
        <Text className="text-muted-foreground text-sm">
          {t("update.installing.description")}
        </Text>
      </View>
      <Progress value={(downloadProgress ?? 0) * 100} />
    </>
  );
};

const DownloadError = () => {
  const { t } = useTranslation("common");
  const { isUpdatePending, downloadError } = useUpdates();
  const { setVisible } = useContext(UpdatesContext);

  if (!downloadError) {
    return null;
  }

  return (
    <>
      <View className="gap-0.5">
        <Text className="font-sans-medium text-lg leading-tight">
          {t("error.general")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {downloadError.message}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="grow"
          onPress={() => setVisible(false)}
        >
          <Text>{t("dismiss")}</Text>
        </Button>
        <Button
          size="sm"
          className="grow"
          onPress={() => {
            if (isUpdatePending) {
              return reloadAsync();
            }

            return fetchUpdateAsync();
          }}
        >
          <Text>{t("tryAgain")}</Text>
        </Button>
      </View>
    </>
  );
};

const Content = () => {
  const insets = useSafeAreaInsets();
  const { visible, setVisible } = useContext(UpdatesContext);
  const { isUpdateAvailable, isUpdatePending, isDownloading, downloadError } =
    useUpdates();

  const positionY = useSharedValue(-1000);
  const startY = useSharedValue(0);
  const height = useSharedValue(0);
  const offset = insets.top + (Platform.select({ ios: 4, android: 8 }) ?? 0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: withSpring(positionY.value) }],
    };
  });

  const pan = Gesture.Pan()
    .onBegin(() => {
      startY.value = positionY.value;
    })
    .onChange((event) => {
      const next = startY.value + event.translationY;
      positionY.value = Math.min(0, next);
    })
    .onFinalize((event) => {
      const threshold = Math.max(64, (height.value + offset) * 0.4);
      const shouldDismiss =
        positionY.value < -threshold || event.velocityY < -500;
      if (shouldDismiss) {
        positionY.value = withSpring(-(height.value + offset));
        scheduleOnRN(setVisible, false);
      } else {
        positionY.value = withSpring(0);
      }
    });

  useEffect(() => {
    if (visible) {
      positionY.value = withSpring(0);
    } else {
      positionY.value = withSpring(
        height.value > 0 ? -(height.value + offset) : -1000,
      );
    }
  }, [visible, positionY, offset, height]);

  if (!isUpdateAvailable || !isUpdatePending) {
    return null;
  }

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[animatedStyle, { zIndex: 50 }]}>
        <Wrapper
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            height.value = h;
            if (!visible) {
              positionY.value = -(h + offset);
            }
          }}
        >
          {isDownloading ? (
            <Installing />
          ) : downloadError ? (
            <DownloadError />
          ) : (
            <Available />
          )}
        </Wrapper>
      </Animated.View>
    </GestureDetector>
  );
};

export const Updates = () => {
  const { isUpdateAvailable, isUpdatePending } = useUpdates();
  const [visible, setVisible] = useState(isUpdateAvailable || isUpdatePending);

  useEffect(() => {
    if (isUpdateAvailable || isUpdatePending) {
      setVisible(true);
    }
  }, [isUpdateAvailable, isUpdatePending]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        return;
      }

      void checkForUpdateAsync()
        .then(({ isAvailable }) => {
          return setVisible(isAvailable);
        })
        .catch(() => {
          setVisible(false);
        });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => ({ visible, setVisible }), [visible, setVisible]);

  return (
    <UpdatesContext.Provider value={value}>
      <Content />
    </UpdatesContext.Provider>
  );
};
