export const Locale = {
  EN: "en",
  ES: "es",
} as const;

export type Locale = (typeof Locale)[keyof typeof Locale];

export const LocaleLabel: Record<Locale, string> = {
  [Locale.EN]: "English",
  [Locale.ES]: "Español",
} as const;

export type { TFunction } from "i18next";
