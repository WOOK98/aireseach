import * as z from "zod";

import { handle } from "@workspace/api/utils";
import { getTranslation } from "@workspace/i18n/server";
import { cn } from "@workspace/ui";
import { buttonVariants } from "@workspace/ui-web/button";
import {
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui-web/card";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { getMetadata } from "~/lib/metadata";
import { TurboLink } from "~/modules/common/turbo-link";

export const generateMetadata = getMetadata({
  title: "admin:home.header.title",
  description: "admin:home.header.description",
});

export default async function AdminPage() {
  const { t, i18n } = await getTranslation({ ns: ["common", "admin"] });

  const adminSummarySchema = z.object({
    users: z.number(),
    organizations: z.number(),
    customers: z.number(),
  });

  const data = await handle(api.admin.summary.$get, {
    schema: adminSummarySchema,
  })();

  const cards = ["users", "organizations", "customers"] as const;

  return (
    <nav className="@container/stats w-full">
      <ul className="grid grid-cols-1 gap-4 @lg/stats:grid-cols-2 @2xl/stats:grid-cols-3">
        {cards.map((key) => (
          <li key={key}>
            <TurboLink
              href={pathsConfig.admin[key].index}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "text-muted-foreground h-full w-full flex-col items-start justify-between gap-3 p-0",
              )}
            >
              <CardHeader className="w-full">
                <div className="flex w-full items-center justify-between gap-3">
                  <CardTitle className="text-foreground truncate">
                    {t(`common:${key}`)}
                  </CardTitle>
                  <Icons.ChevronRight className="mt-0.5 size-4" />
                </div>
                <CardDescription className="whitespace-normal">
                  {t(`home.summary.${key}`)}
                </CardDescription>
              </CardHeader>

              <CardFooter>
                <span className="text-foreground font-mono text-4xl font-bold tracking-tight">
                  {new Intl.NumberFormat(i18n.language).format(data[key])}
                </span>
              </CardFooter>
            </TurboLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
