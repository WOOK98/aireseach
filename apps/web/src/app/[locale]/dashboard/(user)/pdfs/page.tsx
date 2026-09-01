import { redirect } from "next/navigation";

import { DASHBOARD_CONSOLIDATION_REDIRECTS } from "~/modules/workspace/workspace-nav";

/**
 * Legacy route (#197): the PDF library now lives in the workspace shell
 * at `/workspace/pdfs`. The reader (`/dashboard/pdfs/[id]`) remains a
 * working page.
 */
export default function DashboardPdfsRedirect() {
  redirect(DASHBOARD_CONSOLIDATION_REDIRECTS["/dashboard/pdfs"]);
}
