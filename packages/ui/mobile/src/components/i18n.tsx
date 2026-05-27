"use client";

import { View } from "react-native";

import { config, LocaleLabel, useTranslation } from "@workspace/i18n";
import { Locale } from "@workspace/i18n";
import { cn } from "@workspace/ui";

import { Button } from "./button";
import { Icons } from "./icons";
import { Text } from "./text";

import type { Icon } from "./icons";

export const LocaleIcon: Record<Locale, Icon> = {
  [Locale.EN]: Icons.UnitedKingdom,
  [Locale.ES]: Icons.Spain,
} as const;

interface LocaleCustomizerProps {
  readonly onChange?: (lang: Locale) => Promise<void> | void;
}

export const LocaleCustomizer = ({ onChange }: LocaleCustomizerProps) => {
  const { i18n } = useTranslation("common");
  const lang = i18n.language as Locale;

  const handleLocaleChange = async (lang: Locale) => {
    await onChange?.(lang);
    await i18n.changeLanguage(lang);
  };

  return (
    <View className="mt-2 flex flex-1 flex-col items-center gap-4">
      <View className="flex-row flex-wrap gap-2">
        {config.locales.map((locale) => {
          const Icon = LocaleIcon[locale];

          return (
            <Button
              key={locale}
              variant="outline"
              onPress={() => handleLocaleChange(locale)}
              className={cn(
                "grow basis-24 flex-row justify-start gap-3 px-3",
                locale === lang &&
                  "border-primary dark:border-primary border-2",
              )}
            >
              <Icon className="size-5" />
              <Text className="text-sm capitalize">{LocaleLabel[locale]}</Text>
            </Button>
          );
        })}
      </View>
    </View>
  );
};
