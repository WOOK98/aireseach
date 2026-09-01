import { redirect } from "next/navigation";

import { DASHBOARD_CONSOLIDATION_REDIRECTS } from "~/modules/workspace/workspace-nav";

/**
 * Default logged-in route (#197): the workspace shell is the single
 * research surface; `/dashboard` no longer lands on a tool page.
 */
export default function UserPage() {
  redirect(DASHBOARD_CONSOLIDATION_REDIRECTS["/dashboard"]);
}
