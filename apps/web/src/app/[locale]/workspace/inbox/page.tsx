import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";

export default function WorkspaceInboxPage() {
  redirect(pathsConfig.dashboard.user.inbox);
}
