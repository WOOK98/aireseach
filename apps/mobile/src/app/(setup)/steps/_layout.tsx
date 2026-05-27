import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, Slot, usePathname } from "expo-router";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { cn } from "@workspace/ui";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";

import { pathsConfig } from "~/config/paths";
import { SafeAreaView } from "~/modules/common/styled";

const steps = [
  pathsConfig.setup.steps.start,
  pathsConfig.setup.steps.required,
  pathsConfig.setup.steps.paywall,
] as const;

const useSetupStepsStore = create<{
  current: number;
  setCurrent: (current: number) => void;
}>()(
  persist(
    (set) => ({
      current: 0,
      setCurrent: (current) => set({ current }),
    }),
    {
      name: "setup-steps",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useSetupSteps = () => {
  const pathname = usePathname();
  const { current, setCurrent } = useSetupStepsStore();

  const step = steps[current];

  useEffect(() => {
    const index = steps.findIndex((step) => pathname.startsWith(step));

    if (index != -1) {
      setCurrent(index);
    }
  }, [pathname, setCurrent]);

  const goNext = () => {
    const next = steps[current + 1];

    if (!next) {
      setCurrent(-1);
      return;
    }
    router.navigate(next);
  };

  const goBack = () => {
    const previous = steps[current - 1];

    if (!previous) {
      setCurrent(-1);
      return;
    }

    router.navigate(previous);
  };

  const reset = () => {
    setCurrent(0);
  };

  return {
    current,
    steps,
    step,
    goNext,
    goBack,
    setCurrent,
    reset,
  };
};

export default function StepsLayout() {
  const { current, goBack, reset } = useSetupSteps();

  return (
    <SafeAreaView
      className="bg-background flex-1 pb-4"
      style={{
        paddingTop: Platform.select({
          ios: 8,
          android: 16,
        }),
      }}
    >
      <View className="flex-1 gap-2 px-6">
        <View className="w-full flex-row items-center justify-between">
          <Button
            size="icon"
            variant="outline"
            onPress={() =>
              current > 0 ? goBack() : router.replace(pathsConfig.setup.welcome)
            }
          >
            <Icons.ChevronLeft
              width={22}
              height={22}
              className="text-muted-foreground"
            />
          </Button>

          <View className="flex-row gap-1.5">
            {steps.map((_, index) => (
              <View
                key={index}
                className={cn("bg-muted h-2 w-7 rounded-full", {
                  "bg-primary": index <= current,
                })}
              />
            ))}
          </View>

          <Button
            size="icon"
            variant="outline"
            onPress={() => {
              reset();
              router.replace(pathsConfig.setup.welcome);
            }}
          >
            <Icons.X width={20} height={20} className="text-muted-foreground" />
          </Button>
        </View>
        <Slot />
      </View>
    </SafeAreaView>
  );
}
