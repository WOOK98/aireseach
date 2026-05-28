"use client";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { buttonVariants } from "@workspace/ui-web/button";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { TurboLink } from "~/modules/common/turbo-link";

export const CtaButton = (
  props: Omit<React.ComponentProps<typeof TurboLink>, "href">,
) => {
  const { t } = useTranslation(["common", "marketing"]);
  const { data } = authClient.useSession();

  return (
    <TurboLink
      {...props}
      href={
        data?.session
          ? pathsConfig.dashboard.user.report
          : pathsConfig.marketing.report
      }
      className={cn(buttonVariants(), props.className)}
    >
      {!data?.session ? t("cta.button") : t("dashboard")}
    </TurboLink>
  );
};
