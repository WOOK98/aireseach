"use client";

import { config, Locale, LocaleLabel, useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";

import { Icons } from "#components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/select";

import type { Icon } from "#components/icons";

export const LocaleIcon: Record<Locale, Icon> = {
  [Locale.EN]: Icons.UnitedKingdom,
} as const;

interface LocaleCustomizerProps {
  readonly onChange?: (lang: Locale) => Promise<void>;
  readonly variant?: "default" | "icon";
  readonly container?: HTMLElement | null;
}

export const LocaleCustomizer = ({
  onChange,
  variant = "default",
  container,
}: LocaleCustomizerProps) => {
  const { i18n, t } = useTranslation("common");
  const locale = i18n.language as Locale;

  const handleLocaleChange = async (locale: Locale | null) => {
    if (!locale) return;
    await onChange?.(locale);
    await i18n.changeLanguage(locale);
  };

  const Icon = LocaleIcon[locale];

  const items = config.locales.map((lang) => ({
    label: (() => {
      const Icon = LocaleIcon[lang];

      return (
        <span className="flex items-center gap-2">
          <Icon className="size-4" />
          {LocaleLabel[lang]}
        </span>
      );
    })(),
    value: lang,
  }));

  return (
    <Select value={locale} onValueChange={handleLocaleChange} items={items}>
      <SelectTrigger
        className={cn({
          "w-full": variant === "default",
          "hover:bg-accent hover:text-accent-foreground flex size-10 items-center justify-center rounded-full border-none p-0 text-lg transition-colors [&>*:nth-child(2)]:hidden":
            variant === "icon",
        })}
        aria-label={t("language.change")}
      >
        {variant === "default" ? (
          <SelectValue aria-label={LocaleLabel[locale]} />
        ) : (
          <SelectValue aria-label={LocaleLabel[locale]}>
            <Icon className="size-10" />
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent align="end" portal={{ container }}>
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="cursor-pointer"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
