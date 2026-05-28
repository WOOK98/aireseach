"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getPathname, useTranslation } from "@workspace/i18n";
import { buttonVariants } from "@workspace/ui-web/button";

import { appConfig } from "~/config/app";
import { pathsConfig } from "~/config/paths";

interface HeroSearchFormProps {
  readonly placeholder: string;
  readonly action: string;
  readonly examples: readonly string[];
}

export const HeroSearchForm = ({
  placeholder,
  action,
  examples,
}: HeroSearchFormProps) => {
  const router = useRouter();
  const { i18n } = useTranslation("marketing");
  const [target, setTarget] = useState("");

  const openReport = (value: string) => {
    const trimmed = value.trim();
    const reportPath = getPathname({
      locale: i18n.language,
      path: pathsConfig.marketing.report,
      defaultLocale: appConfig.locale,
    });
    const params = new URLSearchParams();

    if (trimmed) {
      params.set("target", trimmed);
    }

    router.push(`${reportPath}${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <form
      className="border-border/70 bg-background overflow-hidden rounded-lg border shadow-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        openReport(target);
      }}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <Search className="text-muted-foreground size-5 shrink-0" />
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder={placeholder}
          className="placeholder:text-muted-foreground text-foreground min-w-0 flex-1 bg-transparent text-left text-sm outline-none sm:text-base"
        />
        <button type="submit" className={buttonVariants({ size: "sm" })}>
          {action}
        </button>
      </div>
      <div className="border-border/70 bg-muted/30 flex flex-wrap gap-2 border-t px-3 py-3 sm:px-4">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="bg-background text-muted-foreground hover:text-foreground rounded-md border px-2.5 py-1 text-xs transition-colors"
            onClick={() => {
              setTarget(example);
              openReport(example);
            }}
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  );
};
