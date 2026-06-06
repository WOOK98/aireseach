"use client";

import { lazy, Suspense, useState } from "react";

import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

const I18nControls = lazy(() =>
  import("./controls").then((m) => ({ default: m.I18nControls })),
);

export function I18nControlsLazy() {
  const [clicked, setClicked] = useState(false);

  if (!clicked) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Change language"
        onClick={() => setClicked(true)}
      >
        <Icons.Globe2 className="size-5" />
      </Button>
    );
  }

  return (
    <Suspense
      fallback={
        <Button variant="ghost" size="icon" disabled>
          <Icons.Globe2 className="size-5 animate-pulse" />
        </Button>
      }
    >
      <I18nControls />
    </Suspense>
  );
}
