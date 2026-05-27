import { useEffect, useState } from "react";
import { storage as browserStorage } from "wxt/utils/storage";

import { appConfig } from "~/config/app";

import type { ThemeConfig } from "@workspace/ui";
import type { WxtStorageItem } from "wxt/utils/storage";

export const StorageKey = {
  THEME: "local:theme",
} as const;

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

const storage = {
  [StorageKey.THEME]: browserStorage.defineItem<ThemeConfig>(StorageKey.THEME, {
    fallback: appConfig.theme,
  }),
} as const;

type Value<T extends StorageKey> =
  (typeof storage)[T] extends WxtStorageItem<infer V, infer _> ? V : never;

export const getStorage = <K extends StorageKey>(key: K) => {
  return storage[key];
};

export const useStorage = <K extends StorageKey>(key: K) => {
  const item = storage[key] as WxtStorageItem<
    Value<K>,
    Record<string, unknown>
  >;
  const [value, setValue] = useState<Value<K> | null>(null);

  useEffect(() => {
    const unwatch = item.watch((value) => {
      setValue(value);
    });

    return () => {
      unwatch();
    };
  }, [item]);

  useEffect(() => {
    void (async () => {
      const value = await item.getValue();
      setValue(value);
    })();
  }, [item]);

  const remove = () => {
    void item.removeValue();
  };

  const set = (value: Value<K>) => {
    void item.setValue(value);
  };

  return { data: value ?? item.fallback, remove, set };
};
