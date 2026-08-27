import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { getBillingSummaryResponseSchema } from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";
import { logger } from "@workspace/shared/logger";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { getSession } from "~/lib/auth/server";
import { getQueryClient } from "~/lib/query/server";
import { billing } from "~/modules/billing/lib/api";
import { WorkspaceSidebar } from "~/modules/workspace/workspace-sidebar";

export default async function WorkspaceLayout({
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
    logger.warn("billing prefetch failed:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex h-[calc(100svh-var(--banner-height,0px))]">
        <WorkspaceSidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </HydrationBoundary>
  );
}
