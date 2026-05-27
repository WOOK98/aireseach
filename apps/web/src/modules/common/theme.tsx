"use client";

import { useTheme } from "next-themes";

import { useTranslation } from "@workspace/i18n";
import { useBreakpoint } from "@workspace/ui-web";
import { Button } from "@workspace/ui-web/button";
import { Drawer, DrawerTrigger, DrawerContent } from "@workspace/ui-web/drawer";
import { Icons } from "@workspace/ui-web/icons";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui-web/popover";
import { ThemeCustomizer } from "@workspace/ui-web/theme";

import { appConfig } from "~/config/app";
import { useThemeConfig } from "~/lib/providers/theme";

import type { ThemeConfig, ThemeMode } from "@workspace/ui";

const Trigger = (props: React.ComponentProps<typeof Button>) => {
  const { t } = useTranslation("common");
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("theme.customization.label")}
      {...props}
    >
      <Icons.PaintBucket className="text-primary size-5" />
    </Button>
  );
};

const Customizer = () => {
  const { t } = useTranslation("common");
  const { config, setConfig } = useThemeConfig();
  const { setTheme: setMode, theme: mode } = useTheme();

  const onChange = (config: ThemeConfig) => {
    setConfig(config);
    setMode(config.mode);
  };

  return (
    <>
      <div className="flex items-start">
        <div className="space-y-1 pr-2">
          <div className="text-base leading-none font-semibold tracking-tight">
            {t("theme.customization.title")}
          </div>
          <div className="text-muted-foreground text-xs">
            {t("theme.customization.description")}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => {
            onChange(appConfig.theme);
          }}
        >
          <Icons.Undo2 className="size-4" />
          <span className="sr-only">{t("reset")}</span>
        </Button>
      </div>
      <ThemeCustomizer
        defaultConfig={appConfig.theme}
        config={{
          ...config,
          mode: (mode as ThemeMode | undefined) ?? appConfig.theme.mode,
        }}
        onChange={onChange}
      />
    </>
  );
};

const ThemeControlsProvider = ({ render }: { render: React.ReactElement }) => {
  const isDesktop = useBreakpoint("md");

  if (isDesktop) {
    return (
      <Popover>
        <PopoverTrigger render={render} />
        <PopoverContent align="start" className="w-88 rounded-lg p-6">
          <Customizer />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>{render}</DrawerTrigger>
      <DrawerContent className="p-6 pt-0">
        <div className="space-y-4 pt-4">
          <Customizer />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const ThemeControls = () => {
  return <ThemeControlsProvider render={<Trigger />} />;
};

export { ThemeControls, Customizer, ThemeControlsProvider };
