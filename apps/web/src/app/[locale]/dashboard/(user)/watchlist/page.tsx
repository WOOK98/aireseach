import { redirect } from "next/navigation";

import { DASHBOARD_CONSOLIDATION_REDIRECTS } from "~/modules/workspace/workspace-nav";

/**
 * Legacy route (#197): the watchlist feed now lives in the workspace
 * shell at `/workspace/watchlist`.
 */
export default function DashboardWatchlistRedirect() {
  redirect(DASHBOARD_CONSOLIDATION_REDIRECTS["/dashboard/watchlist"]);
}
