"use client";

import { lazy, Suspense, useState } from "react";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

const ThemeControls = lazy(() =>
  import("./theme").then((m) => ({ default: m.ThemeControls })),
);

export function ThemeControlsLazy() {
  const [clicked, setClicked] = useState(false);
  const { t } = useTranslation("common");

  if (!clicked) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("theme.customization.label")}
        onClick={() => setClicked(true)}
      >
        <Icons.PaintBucket className="text-primary size-5" />
      </Button>
    );
  }

  return (
    <Suspense
      fallback={
        <Button variant="ghost" size="icon" disabled>
          <Icons.PaintBucket className="text-primary size-5 animate-pulse" />
        </Button>
      }
    >
      <ThemeControls />
    </Suspense>
  );
}
