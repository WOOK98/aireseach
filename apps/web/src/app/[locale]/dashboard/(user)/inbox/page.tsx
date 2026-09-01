import { redirect } from "next/navigation";

import { DASHBOARD_CONSOLIDATION_REDIRECTS } from "~/modules/workspace/workspace-nav";

/**
 * Legacy route (#197): the evidence inbox now lives in the workspace
 * shell at `/workspace/inbox`.
 */
export default function DashboardInboxRedirect() {
  redirect(DASHBOARD_CONSOLIDATION_REDIRECTS["/dashboard/inbox"]);
}
