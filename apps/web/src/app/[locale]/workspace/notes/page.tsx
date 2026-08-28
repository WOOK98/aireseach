import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";

export default function WorkspaceNotesPage() {
  redirect(pathsConfig.dashboard.user.notes);
}
