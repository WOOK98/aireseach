export const Locale = {
  EN: "en",
  ES: "es",
  ZH_TW: "zh-TW",
} as const;

export type Locale = (typeof Locale)[keyof typeof Locale];

export const LocaleLabel: Record<Locale, string> = {
  [Locale.EN]: "English",
  [Locale.ES]: "Español",
  [Locale.ZH_TW]: "繁體中文",
} as const;

export type { TFunction } from "i18next";
