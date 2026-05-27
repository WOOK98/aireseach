import { oklch, formatHex } from "culori";
import { memo } from "react";
import { FlatList, View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { cn, ThemeColor, ThemeMode, themes } from "@workspace/ui";

import { Button } from "./button";
import { Icons } from "./icons";
import { Label } from "./label";
import { Text } from "./text";

import type { ThemeConfig } from "@workspace/ui";

interface ThemeCustomizerProps {
  readonly config: ThemeConfig;
  readonly onChange: (config: ThemeConfig) => void;
  readonly resolvedTheme: Exclude<ThemeMode, "system">;
}

export const MODE_ICONS = {
  [ThemeMode.LIGHT]: Icons.Sun,
  [ThemeMode.DARK]: Icons.Moon,
  [ThemeMode.SYSTEM]: Icons.SunMoon,
} as const;

export const ThemeCustomizer = memo<ThemeCustomizerProps>(
  ({ config, onChange, resolvedTheme }) => {
    const { t } = useTranslation("common");

    return (
      <View className="mt-2 flex-1 items-center gap-4">
        <View className="w-full gap-1.5">
          <Label nativeID="color" className="text-xs">
            {t("theme.color.label")}
          </Label>
          <FlatList
            bounces={false}
            showsVerticalScrollIndicator={false}
            numColumns={3}
            data={Object.values(ThemeColor)}
            columnWrapperClassName="gap-2"
            contentContainerClassName="gap-2"
            renderItem={({ item }) => {
              const [l, c, h, alpha] = themes[item][resolvedTheme].primary;
              return (
                <Button
                  variant="outline"
                  key={item}
                  onPress={() => onChange({ ...config, color: item })}
                  hitSlop={2}
                  className={cn(
                    "grow basis-24 flex-row justify-start gap-2.5 px-3",
                    config.color === item &&
                      "border-primary dark:border-primary border-2",
                  )}
                >
                  <View
                    className="flex size-4.5 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: formatHex(
                        oklch({
                          mode: "oklch",
                          l,
                          c,
                          h,
                          alpha,
                        }),
                      ),
                    }}
                  />
                  <Text className="capitalize">{t(`theme.color.${item}`)}</Text>
                </Button>
              );
            }}
          />
        </View>
        <View className="w-full gap-1.5">
          <Label nativeID="mode" className="text-xs">
            {t("theme.mode.label")}
          </Label>
          <FlatList
            bounces={false}
            showsVerticalScrollIndicator={false}
            numColumns={3}
            data={Object.values(ThemeMode)}
            columnWrapperClassName="gap-2"
            contentContainerClassName="gap-2"
            renderItem={({ item }) => {
              const isActive = config.mode === item;
              const Icon = MODE_ICONS[item];

              return (
                <Button
                  variant="outline"
                  key={item}
                  onPress={() => onChange({ ...config, mode: item })}
                  hitSlop={2}
                  className={cn(
                    "grow basis-24 flex-row justify-start gap-2 px-3 capitalize",
                    isActive && "border-primary dark:border-primary border-2",
                  )}
                >
                  <Icon
                    className="text-foreground shrink-0"
                    width={18}
                    height={18}
                  />
                  <Text className="text-sm capitalize">
                    {t(`theme.mode.${item}`)}
                  </Text>
                </Button>
              );
            }}
          />
        </View>
      </View>
    );
  },
);

ThemeCustomizer.displayName = "ThemeCustomizer";
