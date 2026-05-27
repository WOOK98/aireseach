import { useQuery, useQueryClient } from "@tanstack/react-query";
import { browser } from "wxt/browser";

import { config } from "@workspace/i18n";

import { appConfig } from "~/config/app";

const QUERY_KEY = "locale";

export const getLocale = async () => {
  const cookieLang = await browser.cookies.get({
    url: appConfig.url,
    name: config.cookie,
  });

  const preferencesLang = browser.i18n.getUILanguage();

  return cookieLang?.value ?? (preferencesLang || appConfig.locale);
};

const setLocaleCookie = async (locale: string) =>
  browser.cookies.set({
    url: appConfig.url,
    name: config.cookie,
    value: locale,
  });

export const useLocale = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: getLocale,
  });

  const change = async (locale: string) => {
    await setLocaleCookie(locale);
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  return { data, isLoading, change };
};
