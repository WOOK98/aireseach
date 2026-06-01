import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { buttonVariants } from "@workspace/ui-web/button";

import { TurboLink } from "~/modules/common/turbo-link";

export const BuyCta = ({
  className,
  ...props
}: Omit<React.ComponentProps<typeof TurboLink>, "href">) => {
  const { t } = useTranslation("marketing");
  return (
    <TurboLink
      href="/dashboard/report"
      className={cn(
        "relative m-1 overflow-hidden transition-[height] delay-200 duration-200 ease-out",
        "h-[160px]",
        "group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:delay-0",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "bg-accent absolute inset-x-0 top-0 flex flex-col gap-2 rounded-xl border p-4",
        )}
      >
        <span className="text-primary text-base leading-tight font-medium tracking-tight">
          {t("buyCta.title")}
        </span>
        <p className="text-sm">{t("buyCta.description")}</p>
        <div className={cn(buttonVariants({ variant: "outline" }), "mt-2")}>
          {t("buyCta.link")}
        </div>
      </div>
    </TurboLink>
  );
};
