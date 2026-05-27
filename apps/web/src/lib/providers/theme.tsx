"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { memo, useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { appConfig } from "~/config/app";

import type { ThemeConfig } from "@workspace/ui";

export const useThemeConfig = create<{
  config: Omit<ThemeConfig, "mode">;
  setConfig: (config: Omit<ThemeConfig, "mode">) => void;
}>()(
  persist(
    (set) => ({
      config: appConfig.theme,
      setConfig: (config) => set({ config }),
    }),
    {
      name: "theme-config",
    },
  ),
);

interface ThemeProviderProps {
  readonly children: React.ReactNode;
}

export const ThemeProvider = memo<ThemeProviderProps>(({ children }) => {
  const config = useThemeConfig((s) => s.config);

  useEffect(() => {
    document.body.dataset.theme = config.color;
  }, [config.color]);

  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme={appConfig.theme.mode}
      enableSystem
      disableTransitionOnChange
      scriptProps={
        typeof window === "undefined"
          ? undefined
          : ({ type: "application/json" } as const)
      }
    >
      {children}
    </NextThemeProvider>
  );
});

ThemeProvider.displayName = "ThemeProvider";
