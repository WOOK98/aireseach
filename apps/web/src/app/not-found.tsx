import { getTranslation } from "@workspace/i18n/server";
import { buttonVariants } from "@workspace/ui-web/button";

import { appConfig } from "~/config/app";
import { pathsConfig } from "~/config/paths";
import { Providers } from "~/lib/providers/providers";
import { BaseLayout } from "~/modules/common/layout/base";
import { TurboLink } from "~/modules/common/turbo-link";

export default async function NotFound() {
  const { t } = await getTranslation({ ns: "common" });

  return (
    <BaseLayout locale={appConfig.locale}>
      <Providers locale={appConfig.locale}>
        <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <h1 className="text-center text-4xl font-bold tracking-tighter">
              {t("error.notFound")}
            </h1>
            <p className="text-muted-foreground max-w-md text-center">
              {t("error.resourceDoesNotExist")}
            </p>
          </div>

          <TurboLink
            href={pathsConfig.index}
            className={buttonVariants({ variant: "outline" })}
          >
            {t("goBackHome")}
          </TurboLink>
        </main>
      </Providers>
    </BaseLayout>
  );
}
