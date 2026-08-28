import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";

export default function WorkspaceAtlasPage() {
  redirect(pathsConfig.dashboard.user.visuals);
}
