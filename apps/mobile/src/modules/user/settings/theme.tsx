import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetOpenTrigger,
  BottomSheetView,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetHeader,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";
import { MODE_ICONS, ThemeCustomizer } from "@workspace/ui-mobile/theme";

import { appConfig } from "~/config/app";
import { useTheme } from "~/modules/common/hooks/use-theme";
import { SettingsTile } from "~/modules/common/settings-tile";

import type { ThemeConfig } from "@workspace/ui";

export const ThemeSettings = () => {
  const { t } = useTranslation("common");
  const { config, setConfig, resolvedTheme } = useTheme();

  const onChange = (config: ThemeConfig) => {
    setConfig(config);
  };

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <SettingsTile icon={MODE_ICONS[config.mode]}>
          <Text>{t("theme.title")}</Text>

          <View
            className={cn(
              "bg-primary flex size-4.5 shrink-0 items-center justify-center rounded-full",
            )}
          />
        </SettingsTile>
      </BottomSheetOpenTrigger>
      <BottomSheetContent name="theme-settings">
        <BottomSheetView>
          <View className="flex-row items-start">
            <BottomSheetHeader>
              <BottomSheetTitle>
                {t("theme.customization.title")}
              </BottomSheetTitle>
              <BottomSheetDescription>
                {t("theme.customization.description")}
              </BottomSheetDescription>
            </BottomSheetHeader>

            <Button
              variant="ghost"
              size="icon"
              className="ml-auto rounded-[0.5rem]"
              onPress={() => onChange(appConfig.theme)}
            >
              <Icons.Undo2 className="text-foreground" width={20} height={20} />
            </Button>
          </View>

          <ThemeCustomizer
            config={config}
            onChange={onChange}
            resolvedTheme={resolvedTheme}
          />

          <BottomSheetCloseTrigger asChild>
            <Button>
              <Text>{t("save")}</Text>
            </Button>
          </BottomSheetCloseTrigger>
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
};
