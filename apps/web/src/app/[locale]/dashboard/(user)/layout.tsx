import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";

import { getBillingSummaryResponseSchema } from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";
import { logger } from "@workspace/shared/logger";
import { Icons } from "@workspace/ui-web/icons";
import { SidebarInset, SidebarProvider } from "@workspace/ui-web/sidebar";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { getSession } from "~/lib/auth/server";
import { getQueryClient } from "~/lib/query/server";
import { billing } from "~/modules/billing/lib/api";
import { DashboardActionBar } from "~/modules/common/layout/dashboard/action-bar";
import { DashboardInset } from "~/modules/common/layout/dashboard/inset";
import { DashboardSidebar } from "~/modules/common/layout/dashboard/sidebar/index";

const menu = [
  {
    label: "platform",
    items: [
      {
        title: "Research",
        href: pathsConfig.dashboard.user.research,
        icon: <BarChart3 />,
      },
    ],
  },
  {
    label: "account",
    items: [
      {
        title: "settings",
        href: pathsConfig.dashboard.user.settings.index,
        icon: <Icons.Settings />,
        menu: [
          {
            items: [
              {
                title: "general",
                href: pathsConfig.dashboard.user.settings.index,
                icon: <Icons.Settings />,
              },
              {
                title: "security",
                href: pathsConfig.dashboard.user.settings.security,
                icon: <Icons.Lock />,
              },
              {
                title: "billing",
                href: pathsConfig.dashboard.user.settings.billing,
                icon: <Icons.CreditCard />,
              },
            ],
          },
        ],
      },
    ],
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  const queryClient = getQueryClient();
  try {
    await queryClient.prefetchQuery({
      ...billing.queries.summary.get(user.id),
      queryFn: () =>
        handle(api.billing.summary.$get, {
          schema: getBillingSummaryResponseSchema,
        })({
          query: {
            referenceId: user.id,
          },
        }),
    });
  } catch (error) {
    // Billing prefetch failed (e.g. stale session). Non-critical, skip.
    logger.warn("billing prefetch failed:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarProvider>
        <DashboardSidebar user={user} menu={menu} />
        <SidebarInset>
          <DashboardActionBar menu={menu} />
          <DashboardInset>{children}</DashboardInset>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  );
}
