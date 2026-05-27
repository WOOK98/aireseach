"use client";

import { useEffect } from "react";

import { useTranslation } from "@workspace/i18n";
import { captureException } from "@workspace/monitoring-web";
import { Button, buttonVariants } from "@workspace/ui-web/button";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation("common");

  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-center text-4xl font-bold tracking-tighter">
          {t("error.general")}
        </h1>
        <p className="text-muted-foreground max-w-md text-center">
          {error.message || t("error.apologies")}
        </p>
        {error.message && (
          <code className="bg-muted text-muted-foreground inline-block rounded-sm px-1.5 py-0.5 text-center text-sm leading-tight text-pretty">
            {error.digest}
          </code>
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button onClick={reset}>{t("tryAgain")}</Button>

        <TurboLink
          href={pathsConfig.index}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("goBackHome")}
        </TurboLink>
      </div>
    </main>
  );
}
