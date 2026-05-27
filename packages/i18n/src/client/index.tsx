"use client";

import dayjs from "dayjs";
import * as i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { useEffect, useState } from "react";
import {
  I18nextProvider,
  initReactI18next,
  useTranslation as useTranslationBase,
} from "react-i18next";
import * as z from "zod";

import { logger } from "@workspace/shared/logger";

import { getInitOptions, config } from "../config";
import { loadTranslation, makeZodI18nMap } from "../utils";

import type {
  i18n,
  FlatNamespace,
  Namespace,
  KeyPrefix,
  TFunction,
} from "i18next";
import type { FallbackNs, UseTranslationOptions } from "react-i18next";

let client: i18n | null = null;

let iteration = 0;
const MAX_ITERATIONS = 20;

export const initializeI18nClient = async ({
  locale,
  defaultLocale,
  ns,
}: {
  locale?: string;
  defaultLocale?: string;
  ns?: Namespace;
} = {}) => {
  if (client) {
    return client;
  }

  const loadedLanguages = new Set<string>();
  const loadedNamespaces = new Set<string>();
  const i18n = i18next.createInstance();

  await i18n
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        async (
          language: (typeof config.locales)[number],
          namespace: (typeof config.namespaces)[number],
          callback,
        ) => {
          const data = await loadTranslation(language, namespace);

          if (!loadedLanguages.has(language)) {
            loadedLanguages.add(language);
          }

          if (!loadedNamespaces.has(namespace)) {
            loadedNamespaces.add(namespace);
          }

          return callback(null, data);
        },
      ),
    )
    .use(LanguageDetector)
    .init(
      {
        ...getInitOptions({
          locale,
          defaultLocale,
          ns,
        }),
        detection: {
          order: ["htmlTag", "cookie", "navigator"],
          caches: ["cookie"],
          lookupCookie: config.cookie,
        },
      },
      (err) => {
        if (err) {
          logger.error("Error initializing i18n client", err);
        }
      },
    );

  if (iteration >= MAX_ITERATIONS) {
    logger.debug(`Max iterations reached: ${MAX_ITERATIONS}`);

    client = i18n;
    return client;
  }

  if (loadedLanguages.size === 0 || loadedNamespaces.size === 0) {
    iteration++;

    logger.debug(
      `Keeping component from rendering if no languages or namespaces are loaded. Iteration: ${iteration}. Will stop after ${MAX_ITERATIONS} iterations.`,
    );

    throw new Error("No languages or namespaces loaded");
  }

  client = i18n;
  return client;
};

export const useTranslation = <
  Ns extends FlatNamespace | FlatNamespace[] | undefined = undefined,
  KPrefix extends KeyPrefix<FallbackNs<Ns>> = undefined,
>(
  ns?: Ns,
  options?: UseTranslationOptions<KPrefix>,
) => useTranslationBase<Ns, KPrefix>(ns, options);

export const getI18n = async ({
  locale,
  defaultLocale,
  ns,
}: {
  locale?: string;
  defaultLocale?: string;
  ns?: Namespace;
}) => {
  if (!client) {
    return initializeI18nClient({ locale, defaultLocale, ns });
  }

  const t = client.getFixedT<Namespace>(client.language, ns);

  await client.changeLanguage(locale);
  dayjs.locale(locale);
  z.config({
    localeError: makeZodI18nMap({ t: t as TFunction }),
  });

  if (ns) {
    await client.loadNamespaces(ns);
  }
  return client;
};

export const I18nProvider = ({
  children,
  locale,
  defaultLocale,
  ns,
}: {
  children: React.ReactNode;
  locale?: string;
  defaultLocale?: string;
  ns?: Namespace;
}) => {
  const [i18nClient, setI18nClient] = useState<i18n | null>(client);

  useEffect(() => {
    void (async () => {
      if (!client) {
        setI18nClient(await getI18n({ locale, defaultLocale, ns }));
      }
    })();
  }, [client]);

  useEffect(() => {
    if (i18nClient) {
      void i18nClient.changeLanguage(locale);
    }
  }, [locale]);

  if (!i18nClient) {
    return null;
  }

  const t = i18nClient.getFixedT<Namespace>(i18nClient.language, ns);

  z.config({
    localeError: makeZodI18nMap({ t: t as TFunction }),
  });

  dayjs.locale(locale);

  return <I18nextProvider i18n={i18nClient}>{children}</I18nextProvider>;
};

export type { ParseKeys as TranslationKey } from "i18next";
