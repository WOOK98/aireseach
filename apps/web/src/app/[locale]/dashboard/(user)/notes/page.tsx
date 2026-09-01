import { redirect } from "next/navigation";

import { DASHBOARD_CONSOLIDATION_REDIRECTS } from "~/modules/workspace/workspace-nav";

/**
 * Legacy route (#197): the notes object list now lives in the workspace
 * shell at `/workspace/notes`. Note detail (`/dashboard/notes/[id]`)
 * remains a working page.
 */
export default function DashboardNotesRedirect() {
  redirect(DASHBOARD_CONSOLIDATION_REDIRECTS["/dashboard/notes"]);
}
